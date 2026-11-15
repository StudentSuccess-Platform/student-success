import mongoose from "mongoose";
import { AiAuditLog, RemediationPlan, RemediationItem, Section } from "../models/index.js";
import { getAssignedStudent, requireStudentSection } from "../services/access/teacherAccess.js";
import { buildAiInput } from "../services/ai/buildAiInput.js";
import { buildPrompt } from "../services/ai/recommendation.js";
import { generateRecommendation, PROMPT_VERSION } from "../services/ai/aiClient.js";
import { AiUnavailableError, AiInvalidResponseError } from "../services/ai/aiErrors.js";
import { planFromAi } from "../services/ai/planFromAi.js";
import { httpError } from "../utils/httpError.js";

// Default class: the student's section with the lowest period (ties by id). Null periods sort last.
async function chooseSection(access, sectionId) {
  if (sectionId !== undefined && sectionId !== null && sectionId !== "") {
    return requireStudentSection(access, sectionId);
  }
  const sections = await Section.find({ _id: { $in: access.sectionIds } }).select("period").lean();
  const rank = (s) => s.period ?? Number.MAX_SAFE_INTEGER;
  sections.sort((a, b) => rank(a) - rank(b) || String(a._id).localeCompare(String(b._id)));
  if (sections.length === 0) throw httpError(404, "Student not found");
  return sections[0]._id;
}

function planJson(plan, { studentId, className }, items) {
  return {
    id: String(plan._id),
    studentId: String(studentId),
    sectionId: String(plan.section),
    className,
    title: plan.title,
    rationale: plan.rationale ?? null,
    status: plan.status,
    source: plan.source,
    items: items.map((item) => ({ id: String(item._id), title: item.title, description: item.description ?? null })),
    aiAuditId: plan.aiAudit ? String(plan.aiAudit) : null,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    reviewedAt: plan.reviewedAt ?? null,
    publishedAt: plan.publishedAt ?? null,
  };
}

// POST /students/:studentId/remediation/ai. Client-sent goal/progress are ignored: the server
// gathers the AI input itself (buildAiInput). On AI failure nothing is written.
export async function createAiRemediationPlan(req, res) {
  const access = await getAssignedStudent(req.user.id, req.params.studentId);
  const sectionId = await chooseSection(access, (req.body ?? {}).sectionId);
  const section = await Section.findById(sectionId).populate("course", "title").lean();

  const aiInput = await buildAiInput(access, sectionId);
  let generated;
  try {
    generated = await generateRecommendation(buildPrompt(aiInput));
  } catch (error) {
    if (error instanceof AiUnavailableError || error instanceof AiInvalidResponseError) {
      throw httpError(error.status, error.message, { code: error.code, fallback: "manual" });
    }
    throw error;
  }

  const draft = planFromAi(generated.recommendation);
  const planId = new mongoose.Types.ObjectId();
  const created = { audit: null, items: [] };
  try {
    created.audit = await AiAuditLog.create({
      purpose: "remediation_plan",
      provider: generated.provider,
      model: generated.model,
      promptVersion: PROMPT_VERSION,
      student: access.student._id,
      requestedBy: req.user.id,
      outputRef: { kind: "RemediationPlan", id: planId },
      reviewOutcome: "pending",
    });
    const plan = await RemediationPlan.create({
      _id: planId,
      student: access.student._id,
      section: sectionId,
      teacher: access.teacher._id,
      title: draft.title,
      rationale: draft.rationale,
      status: "pending_review",
      source: "ai",
      aiAudit: created.audit._id,
    });
    created.items = await RemediationItem.insertMany(draft.items.map((item) => ({ plan: plan._id, title: item.title })));
    const className = section?.course?.title ?? null;
    return res.status(201).json({
      plan: planJson(plan, { studentId: access.student._id, className }, created.items),
    });
  } catch (error) {
    // Best-effort rollback so a failed write does not leave a half-built plan behind.
    await RemediationItem.deleteMany({ plan: planId });
    await RemediationPlan.deleteOne({ _id: planId });
    if (created.audit) await AiAuditLog.deleteOne({ _id: created.audit._id });
    throw error;
  }
}
