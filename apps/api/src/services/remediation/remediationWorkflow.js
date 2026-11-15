import mongoose from "mongoose";
import { AiAuditLog, RemediationPlan, RemediationItem, Section } from "../../models/index.js";
import { getAssignedStudent, requireStudentSection } from "../access/teacherAccess.js";
import { httpError } from "../../utils/httpError.js";
import { LIMITS, isTooLong, lengthMessage } from "../../validators/recordValidators.js";

// Teacher remediation workflow (SCRUM-127..132, 134). Plans move draft/pending_review -> approved ->
// published, and may be rejected before publishing. Every function resolves the student through
// getAssignedStudent first, so a plan is only ever reached through an assigned student.
//
// Every status change is ONE conditional update (transitionPlan): the filter names the allowed source
// states and the owning student, so two racing requests cannot both pass the state machine.

const EDITABLE = ["draft", "pending_review"];
const APPROVABLE = ["draft", "pending_review"];
const REJECTABLE = ["draft", "pending_review", "approved"];
const PUBLISHABLE = ["approved"];

const iso = (value) => (value ? new Date(value).toISOString() : null);
const isText = (value) => typeof value === "string";

// Plan JSON used by every remediation endpoint. `section` is a Section with `course` populated.
export function toPlanJson(plan, items, section) {
  return {
    id: String(plan._id),
    studentId: String(plan.student),
    sectionId: String(plan.section),
    className: section?.course?.title ?? "",
    title: plan.title,
    rationale: plan.rationale ?? null,
    status: plan.status,
    source: plan.source,
    items: items.map((item) => ({
      id: String(item._id),
      title: item.title,
      description: item.description ?? null,
    })),
    aiAuditId: plan.aiAudit ? String(plan.aiAudit) : null,
    createdAt: iso(plan.createdAt),
    updatedAt: iso(plan.updatedAt),
    reviewedAt: iso(plan.reviewedAt),
    publishedAt: iso(plan.publishedAt),
  };
}

// Loads items and sections for a batch of plans in two queries and maps them to plan JSON.
async function presentPlans(plans) {
  if (plans.length === 0) return [];
  const [items, sections] = await Promise.all([
    RemediationItem.find({ plan: { $in: plans.map((p) => p._id) } })
      .sort({ createdAt: 1, _id: 1 })
      .lean(),
    Section.find({ _id: { $in: plans.map((p) => p.section) } })
      .populate("course", "title")
      .lean(),
  ]);
  return plans.map((plan) =>
    toPlanJson(
      plan,
      items.filter((item) => String(item.plan) === String(plan._id)),
      sections.find((s) => String(s._id) === String(plan.section)),
    ),
  );
}

async function presentPlan(plan) {
  return (await presentPlans([plan]))[0];
}

// A plan must belong to the assigned student. Malformed or foreign ids are 404, never 500.
async function findPlan(access, planId) {
  if (!mongoose.isObjectIdOrHexString(planId)) throw httpError(404, "Plan not found");
  const plan = await RemediationPlan.findOne({ _id: planId, student: access.student._id });
  if (!plan) throw httpError(404, "Plan not found");
  return plan;
}

// One conditional write. The plan must still be in an allowed source state and still belong to the
// student; if a racing request changed it first the update matches nothing and the caller gets 409.
async function transitionPlan(access, planId, fromStatuses, update, conflictMessage) {
  const plan = await RemediationPlan.findOneAndUpdate(
    { _id: planId, student: access.student._id, status: { $in: fromStatuses } },
    update,
    { new: true, runValidators: true },
  );
  if (!plan) throw httpError(409, conflictMessage);
  return plan;
}

// Validates a create or edit body. Returns { data, fields }; data holds only the values to apply.
function parsePlanInput(body, { create }) {
  const fields = {};
  const data = {};

  if (create || body.title !== undefined) {
    if (!isText(body.title) || !body.title.trim()) fields.title = "Required";
    else if (isTooLong(body.title, LIMITS.title)) fields.title = lengthMessage(LIMITS.title);
    else data.title = body.title.trim();
  }

  if (body.rationale !== undefined && body.rationale !== null) {
    if (!isText(body.rationale)) fields.rationale = "Must be text";
    else if (isTooLong(body.rationale, LIMITS.text)) fields.rationale = lengthMessage(LIMITS.text);
    else data.rationale = body.rationale.trim();
  }

  if (body.items !== undefined) {
    if (!Array.isArray(body.items)) {
      fields.items = "Must be a list";
    } else {
      if (body.items.length > LIMITS.items) fields.items = `Must be ${LIMITS.items} items or fewer`;
      data.items = [];
      body.items.forEach((raw, i) => {
        const item = raw && typeof raw === "object" ? raw : {};
        if (!isText(item.title) || !item.title.trim()) fields[`items.${i}.title`] = "Required";
        else if (isTooLong(item.title, LIMITS.title)) fields[`items.${i}.title`] = lengthMessage(LIMITS.title);
        if (item.description !== undefined && item.description !== null) {
          if (!isText(item.description)) fields[`items.${i}.description`] = "Must be text";
          else if (isTooLong(item.description, LIMITS.text)) fields[`items.${i}.description`] = lengthMessage(LIMITS.text);
        }
        data.items.push({
          title: isText(item.title) ? item.title.trim() : "",
          description: isText(item.description) && item.description.trim() ? item.description.trim() : undefined,
        });
      });
    }
  }

  if (create) {
    if (!body.sectionId) fields.sectionId = "Required";
    if (!data.items) data.items = [];
  }

  return { data, fields };
}

function assertValid(fields) {
  if (Object.keys(fields).length > 0) {
    throw httpError(400, "Please fix the highlighted fields", { fields });
  }
}

function itemDocs(planId, items) {
  return items.map((item) => ({
    _id: new mongoose.Types.ObjectId(),
    plan: planId,
    title: item.title,
    description: item.description,
  }));
}

// Replaces a plan's items. New rows are inserted first, so a failed insert leaves the old items
// in place; only then are the old rows removed.
async function replaceItems(planId, items) {
  const docs = itemDocs(planId, items);
  const newIds = docs.map((doc) => doc._id);
  try {
    if (docs.length > 0) await RemediationItem.insertMany(docs);
  } catch (error) {
    await RemediationItem.deleteMany({ plan: planId, _id: { $in: newIds } });
    throw error;
  }
  await RemediationItem.deleteMany({ plan: planId, _id: { $nin: newIds } });
}

// Records the teacher's review on the AI audit log of an AI-sourced plan. `nextOutcome` receives the
// current outcome and returns the new one.
async function recordAuditReview(plan, teacherId, reviewedAt, nextOutcome) {
  if (plan.source !== "ai" || !plan.aiAudit) return;
  const audit = await AiAuditLog.findById(plan.aiAudit);
  if (!audit) return;
  audit.reviewOutcome = nextOutcome(audit.reviewOutcome);
  audit.reviewedBy = teacherId;
  audit.reviewedAt = reviewedAt;
  await audit.save();
}

export async function listPlans(userId, studentId) {
  const access = await getAssignedStudent(userId, studentId);
  const plans = await RemediationPlan.find({ student: access.student._id })
    .sort({ createdAt: -1, _id: -1 })
    .lean();
  return presentPlans(plans);
}

// Manual entry: a teacher writes the plan. It starts as a draft and is not visible to the family.
export async function createManualPlan(userId, studentId, input) {
  const access = await getAssignedStudent(userId, studentId);
  const body = input ?? {};
  const { data, fields } = parsePlanInput(body, { create: true });
  assertValid(fields);
  const sectionId = requireStudentSection(access, body.sectionId);

  const plan = new RemediationPlan({
    student: access.student._id,
    section: sectionId,
    teacher: access.teacher._id,
    title: data.title,
    rationale: data.rationale || undefined,
    status: "draft",
    source: "teacher",
  });
  await plan.save();

  try {
    if (data.items.length > 0) await RemediationItem.insertMany(itemDocs(plan._id, data.items));
  } catch (error) {
    // Never leave a plan without its items: remove everything written so far, then report the error.
    await RemediationItem.deleteMany({ plan: plan._id });
    await RemediationPlan.deleteOne({ _id: plan._id });
    throw error;
  }
  return presentPlan(plan);
}

export async function editPlan(userId, studentId, planId, input) {
  const access = await getAssignedStudent(userId, studentId);
  const plan = await findPlan(access, planId);
  if (!EDITABLE.includes(plan.status)) throw httpError(409, "Plan can no longer be edited");
  const { data, fields } = parsePlanInput(input ?? {}, { create: false });
  assertValid(fields);

  const set = {};
  const unset = {};
  if (data.title !== undefined) set.title = data.title;
  if (data.rationale !== undefined) {
    if (data.rationale) set.rationale = data.rationale;
    else unset.rationale = "";
  }
  const update = { $set: set };
  if (Object.keys(unset).length > 0) update.$unset = unset;

  // Title and rationale go first, as one conditional write. If the plan was approved or rejected in
  // the meantime, this matches nothing, returns 409, and the items below are never touched.
  const updated = await transitionPlan(access, plan._id, EDITABLE, update, "Plan can no longer be edited");

  // Known residual window: between the write above and the item replacement below, a concurrent
  // approve/reject/publish can land, so the items of an already-reviewed plan may still be replaced.
  // Two concurrent item replacements on the same plan can also remove each other's new rows.
  // Closing this needs a transaction (replica set) or a version field on the plan; both are out of
  // scope for the MVP. The status guard above keeps every status change itself consistent.
  if (data.items) await replaceItems(plan._id, data.items);

  await recordAuditReview(updated, access.teacher._id, new Date(), () => "edited");
  return presentPlan(updated);
}

export async function approvePlan(userId, studentId, planId) {
  const access = await getAssignedStudent(userId, studentId);
  const plan = await findPlan(access, planId);

  const reviewedAt = new Date();
  const updated = await transitionPlan(
    access,
    plan._id,
    APPROVABLE,
    { $set: { status: "approved", reviewedBy: access.teacher._id, reviewedAt } },
    "Only a draft or pending plan can be approved",
  );

  // Keep "edited" when the teacher changed the AI text before approving it.
  await recordAuditReview(updated, access.teacher._id, reviewedAt, (outcome) =>
    outcome === "edited" ? "edited" : "approved",
  );
  return presentPlan(updated);
}

export async function rejectPlan(userId, studentId, planId) {
  const access = await getAssignedStudent(userId, studentId);
  const plan = await findPlan(access, planId);

  const reviewedAt = new Date();
  const updated = await transitionPlan(
    access,
    plan._id,
    REJECTABLE,
    { $set: { status: "rejected", reviewedBy: access.teacher._id, reviewedAt } },
    "Plan can no longer be rejected",
  );

  await recordAuditReview(updated, access.teacher._id, reviewedAt, () => "rejected");
  return presentPlan(updated);
}

export async function publishPlan(userId, studentId, planId) {
  const access = await getAssignedStudent(userId, studentId);
  const plan = await findPlan(access, planId);

  const updated = await transitionPlan(
    access,
    plan._id,
    PUBLISHABLE,
    { $set: { status: "published", publishedAt: new Date() } },
    "Approve the plan before publishing",
  );
  return presentPlan(updated);
}
