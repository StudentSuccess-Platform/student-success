import { REF_DATE, addDays, indexBy } from "../context.js";

const ITEM_TITLES = [
  "Complete missing assignments",
  "Attend tutoring session",
  "Redo the last quiz",
  "Practice problems set",
];

// Remediation plans for struggling enrollments. Approved and published plans carry a
// teacher review; AI-sourced plans carry an audit record. Nothing is published unreviewed.
export default {
  name: "remediation",
  models: ["AiAuditLog", "RemediationPlan", "RemediationItem"],
  run(ctx) {
    const { faker, data, id } = ctx;
    const sections = indexBy(data.Section);
    const courses = indexBy(data.Course);
    const teachers = indexBy(data.TeacherProfile);

    data.Enrollment.forEach((enrollment) => {
      if (ctx.averageOf.get(String(enrollment._id)) >= 0.75) return;

      const section = sections.get(String(enrollment.section));
      const course = courses.get(String(section.course));
      const status = faker.helpers.weightedArrayElement([
        { weight: 25, value: "draft" },
        { weight: 25, value: "pending_review" },
        { weight: 20, value: "approved" },
        { weight: 30, value: "published" },
      ]);
      const reviewed = status === "approved" || status === "published";
      const plan = {
        _id: id(),
        student: enrollment.student,
        section: section._id,
        teacher: section.teacher,
        title: `Support plan: ${course.title}`,
        rationale: "Recent assignment results are below the expected level.",
        status,
        source: faker.datatype.boolean(0.5) ? "ai" : "teacher",
      };
      if (reviewed) {
        plan.reviewedBy = section.teacher;
        plan.reviewedAt = addDays(REF_DATE, -3);
      }
      if (status === "published") plan.publishedAt = addDays(REF_DATE, -2);

      if (plan.source === "ai") {
        const audit = {
          _id: id(),
          purpose: "remediation_plan",
          provider: "synthetic",
          model: "seed-data",
          promptVersion: "seed-v1",
          student: enrollment.student,
          requestedBy: teachers.get(String(section.teacher)).user,
          outputRef: { kind: "RemediationPlan", id: plan._id },
          reviewOutcome: reviewed ? "approved" : "pending",
        };
        if (reviewed) {
          audit.reviewedBy = section.teacher;
          audit.reviewedAt = plan.reviewedAt;
        }
        data.AiAuditLog.push(audit);
        plan.aiAudit = audit._id;
      }
      data.RemediationPlan.push(plan);

      const count = faker.number.int({ min: 2, max: 4 });
      faker.helpers.arrayElements(ITEM_TITLES, count).forEach((title) =>
        data.RemediationItem.push({ _id: id(), plan: plan._id, title, status: "todo" }),
      );
    });
  },
};
