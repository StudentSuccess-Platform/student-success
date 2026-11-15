import mongoose from "mongoose";
import { AiAuditLog, RemediationPlan, RemediationItem, Section } from "../../models/index.js";
import { getAssignedStudent, requireStudentSection } from "../access/teacherAccess.js";
import { httpError } from "../../utils/httpError.js";

// Teacher remediation workflow (SCRUM-127..132, 134). Plans move draft/pending_review -> approved ->
// published, and may be rejected before publishing. Every function resolves the student through
// getAssignedStudent first, so a plan is only ever reached through an assigned student.

const EDITABLE = ["draft", "pending_review"];
const APPROVABLE = ["draft", "pending_review"];
const REJECTABLE = ["draft", "pending_review", "approved"];

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
  if (!mongoose.isValidObjectId(planId)) throw httpError(404, "Plan not found");
  const plan = await RemediationPlan.findOne({ _id: planId, student: access.student._id });
  if (!plan) throw httpError(404, "Plan not found");
  return plan;
}

// Validates a create or edit body. Returns { data, fields }; data holds only the values to apply.
function parsePlanInput(body, { create }) {
  const fields = {};
  const data = {};

  if (create || body.title !== undefined) {
    if (!isText(body.title) || !body.title.trim()) fields.title = "Required";
    else data.title = body.title.trim();
  }

  if (body.rationale !== undefined && body.rationale !== null) {
    if (isText(body.rationale)) data.rationale = body.rationale.trim();
    else fields.rationale = "Must be text";
  }

  if (body.items !== undefined) {
    if (!Array.isArray(body.items)) {
      fields.items = "Must be a list";
    } else {
      data.items = [];
      body.items.forEach((raw, i) => {
        const item = raw && typeof raw === "object" ? raw : {};
        if (!isText(item.title) || !item.title.trim()) fields[`items.${i}.title`] = "Required";
        if (item.description !== undefined && item.description !== null && !isText(item.description)) {
          fields[`items.${i}.description`] = "Must be text";
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

  if (data.items) await replaceItems(plan._id, data.items);
  if (data.title !== undefined) plan.title = data.title;
  if (data.rationale !== undefined) plan.rationale = data.rationale || undefined;
  await plan.save();

  await recordAuditReview(plan, access.teacher._id, new Date(), () => "edited");
  return presentPlan(plan);
}

export async function approvePlan(userId, studentId, planId) {
  const access = await getAssignedStudent(userId, studentId);
  const plan = await findPlan(access, planId);
  if (!APPROVABLE.includes(plan.status)) throw httpError(409, "Only a draft or pending plan can be approved");

  const reviewedAt = new Date();
  plan.status = "approved";
  plan.reviewedBy = access.teacher._id;
  plan.reviewedAt = reviewedAt;
  await plan.save();

  // Keep "edited" when the teacher changed the AI text before approving it.
  await recordAuditReview(plan, access.teacher._id, reviewedAt, (outcome) =>
    outcome === "edited" ? "edited" : "approved",
  );
  return presentPlan(plan);
}

export async function rejectPlan(userId, studentId, planId) {
  const access = await getAssignedStudent(userId, studentId);
  const plan = await findPlan(access, planId);
  if (!REJECTABLE.includes(plan.status)) throw httpError(409, "Plan can no longer be rejected");

  const reviewedAt = new Date();
  plan.status = "rejected";
  plan.reviewedBy = access.teacher._id;
  plan.reviewedAt = reviewedAt;
  await plan.save();

  await recordAuditReview(plan, access.teacher._id, reviewedAt, () => "rejected");
  return presentPlan(plan);
}

export async function publishPlan(userId, studentId, planId) {
  const access = await getAssignedStudent(userId, studentId);
  const plan = await findPlan(access, planId);
  if (plan.status !== "approved") throw httpError(409, "Approve the plan before publishing");

  plan.status = "published";
  plan.publishedAt = new Date();
  await plan.save();
  return presentPlan(plan);
}
