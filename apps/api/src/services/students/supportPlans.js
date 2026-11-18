import { RemediationPlan, RemediationItem } from "../../models/index.js";

// Every published remediation plan for one student, newest first, for the student and the linked parent.
// Only status "published" is ever returned (draft, pending review, approved, rejected and archived plans are
// internal). Fields a family should not see (reviewer, AI audit record, version) are left out.
//
// `active` marks the plan currently in effect: the most recently published plan of each class. Older published
// plans of the same class are history (active: false). Clients show the active plans first and offer the rest.

const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(" ");

export async function listPublishedPlans(studentId) {
  const plans = await RemediationPlan.find({ student: studentId, status: "published" })
    .sort({ publishedAt: -1, _id: -1 })
    .populate({ path: "teacher", populate: { path: "user", select: "firstName lastName" } })
    .populate({ path: "section", select: "course", populate: { path: "course", select: "title" } })
    .lean();
  if (plans.length === 0) return { plans: [] };

  const items = await RemediationItem.find({ plan: { $in: plans.map((p) => p._id) } })
    .sort({ createdAt: 1, _id: 1 })
    .lean();
  const itemsByPlan = new Map();
  for (const item of items) {
    const key = String(item.plan);
    if (!itemsByPlan.has(key)) itemsByPlan.set(key, []);
    itemsByPlan.get(key).push({
      id: String(item._id),
      title: item.title,
      description: item.description ?? null,
      status: item.status,
      dueDate: item.dueDate ?? null,
    });
  }

  const seenClasses = new Set();
  return {
    plans: plans.map((plan) => {
      const classKey = String(plan.section?._id ?? plan.section);
      const active = !seenClasses.has(classKey); // newest first, so the first plan seen per class is the active one
      seenClasses.add(classKey);
      return {
        id: String(plan._id),
        classId: classKey,
        className: plan.section?.course?.title ?? "",
        title: plan.title,
        rationale: plan.rationale ?? "",
        source: plan.source,
        teacher: fullName(plan.teacher?.user),
        publishedAt: plan.publishedAt ? new Date(plan.publishedAt).toISOString() : null,
        active,
        items: itemsByPlan.get(String(plan._id)) ?? [],
      };
    }),
  };
}
