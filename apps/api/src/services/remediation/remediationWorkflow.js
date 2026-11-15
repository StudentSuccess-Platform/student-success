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
    version: plan.version ?? 0,
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

// One conditional write. The plan must still be in an allowed source state, still belong to the
// student and, when `version` is given, still be at that version; if a racing request changed it first
// the update matches nothing and the caller gets 409. Every success increments the version.
async function transitionPlan(access, planId, fromStatuses, update, conflictMessage, version) {
  const filter = { _id: planId, student: access.student._id, status: { $in: fromStatuses } };
  // Plans saved before the field existed have no version, which counts as 0 (null also matches a missing field).
  if (version !== undefined) filter.version = version === 0 ? { $in: [0, null] } : version;
  const plan = await RemediationPlan.findOneAndUpdate(
    filter,
    { ...update, $inc: { version: 1 } },
    { new: true, runValidators: true },
  );
  if (!plan) throw httpError(409, conflictMessage);
  return plan;
}

// A client may send the version it last saw. A different value means someone else changed the plan.
function clientVersion(body) {
  const raw = body?.version;
  if (raw === undefined || raw === null) return undefined;
  if (!Number.isInteger(raw) || raw < 0) {
    throw httpError(400, "Please fix the highlighted fields", { fields: { version: "Must be a whole number" } });
  }
  return raw;
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

// Stages replacement items: inserts the new rows next to the old ones. Nothing is removed yet, so a
// failed insert leaves the plan untouched. Returns the new ids for commit/rollback below.
async function stageItems(planId, items) {
  const docs = itemDocs(planId, items);
  const newIds = docs.map((doc) => doc._id);
  try {
    if (docs.length > 0) await RemediationItem.insertMany(docs);
  } catch (error) {
    await RemediationItem.deleteMany({ plan: planId, _id: { $in: newIds } });
    throw error;
  }
  return newIds;
}

const rollbackItems = (planId, newIds) => RemediationItem.deleteMany({ plan: planId, _id: { $in: newIds } });
const commitItems = (planId, newIds) => RemediationItem.deleteMany({ plan: planId, _id: { $nin: newIds } });

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

  // Optimistic concurrency, no transaction needed:
  //  1. stage the new items beside the old ones (nothing visible is removed),
  //  2. commit with ONE conditional write on status AND version (the version the client saw, else the
  //     one just read). A concurrent edit, approve, reject or publish bumps the version or status, so
  //     this matches nothing,
  //  3. on conflict delete the staged rows and answer 409; on success delete the old rows.
  const expected = clientVersion(input) ?? plan.version ?? 0;
  const staged = data.items ? await stageItems(plan._id, data.items) : null;
  let updated;
  try {
    updated = await transitionPlan(
      access,
      plan._id,
      EDITABLE,
      update,
      "Plan was changed by someone else or can no longer be edited. Reload and try again",
      expected,
    );
  } catch (error) {
    if (staged) await rollbackItems(plan._id, staged);
    throw error;
  }
  if (staged) await commitItems(plan._id, staged);

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
