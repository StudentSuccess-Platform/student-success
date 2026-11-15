import mongoose from "mongoose";
import { AiAuditLog, RemediationPlan, RemediationItem, Section } from "../models/index.js";
import { getAssignedStudent, chooseStudentSection } from "../services/access/teacherAccess.js";
import { buildAiInput } from "../services/ai/buildAiInput.js";
import { buildPrompt } from "../services/ai/recommendation.js";
import { generateRecommendation, PROMPT_VERSION } from "../services/ai/aiClient.js";
import { AiUnavailableError, AiInvalidResponseError } from "../services/ai/aiErrors.js";
import { planFromAi } from "../services/ai/planFromAi.js";
import { httpError } from "../utils/httpError.js";

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
  const sectionId = await chooseStudentSection(access, (req.body ?? {}).sectionId);
  const section = await Section.findById(sectionId).populate("course", "title").lean();

  // Everything that can fail on the AI side (provider call, output mapping) runs inside the mapping,
  // so every bad answer returns the same controlled 502/503 body. Nothing is written before this block ends.
  const aiInput = await buildAiInput(access, sectionId);
  let generated;
  let draft;
  try {
    generated = await generateRecommendation(buildPrompt(aiInput));
    draft = planFromAi(generated.recommendation);
  } catch (error) {
    if (error instanceof AiUnavailableError || error instanceof AiInvalidResponseError) {
      throw httpError(error.status, error.message, { code: error.code, fallback: "manual" });
    }
    throw error;
  }

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
