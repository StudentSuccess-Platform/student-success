import { AiAuditLog, RemediationPlan, RemediationItem } from "../../src/models/index.js";

// Remediation fixtures for every workflow status (the shared addPlan cannot make rejected plans).
// Reviewed states (approved, published, rejected) get a reviewer and a time, as the model requires.

export async function addRemediationPlan({
  school,
  student = school.adaProfile,
  status = "draft",
  title = "Strengthen fractions",
  source = "teacher",
  aiAudit,
  section = school.section,
  publishedAt = new Date(),
  items = [{ title: "Practice fractions", description: "15 minutes daily" }],
}) {
  const reviewed = ["approved", "published", "rejected"].includes(status);
  const plan = await RemediationPlan.create({
    student: student._id,
    section: section._id,
    teacher: school.teacher._id,
    title,
    rationale: "Use regular guided practice to strengthen this skill.",
    status,
    source,
    ...(aiAudit ? { aiAudit: aiAudit._id } : {}),
    ...(reviewed ? { reviewedBy: school.teacher._id, reviewedAt: new Date() } : {}),
    ...(status === "published" ? { publishedAt } : {}),
  });
  if (items.length > 0) {
    await RemediationItem.insertMany(items.map((item) => ({ plan: plan._id, ...item })));
  }
  return plan;
}

// An AI audit record as the AI generation endpoint writes it (pending until a teacher reviews it).
export async function addAiAuditLog({ school, outcome = "pending" }) {
  return AiAuditLog.create({
    purpose: "remediation_plan",
    provider: "mock",
    model: "mock-1",
    promptVersion: "v1",
    student: school.adaProfile._id,
    requestedBy: school.teacher.user,
    reviewOutcome: outcome,
  });
}

export async function clearRemediation() {
  await Promise.all([RemediationPlan.deleteMany({}), RemediationItem.deleteMany({}), AiAuditLog.deleteMany({})]);
}
