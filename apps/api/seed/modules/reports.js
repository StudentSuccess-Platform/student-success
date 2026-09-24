import { REF_DATE, addDays, indexBy } from "../context.js";

// One progress report per student. Published reports carry a teacher review.
export default {
  name: "reports",
  models: ["ProgressReport"],
  run(ctx) {
    const { faker, data, id } = ctx;
    const sections = indexBy(data.Section);

    data.StudentProfile.forEach((student) => {
      const mine = data.Enrollment.filter((e) => String(e.student) === String(student._id));
      const overall = mine.reduce((sum, e) => sum + ctx.averageOf.get(String(e._id)), 0) / mine.length;
      const status = faker.helpers.weightedArrayElement([
        { weight: 30, value: "draft" },
        { weight: 20, value: "pending_review" },
        { weight: 50, value: "published" },
      ]);
      const report = {
        _id: id(),
        student: student._id,
        periodStart: addDays(REF_DATE, -70),
        periodEnd: addDays(REF_DATE, -1),
        summary: `Overall average of ${Math.round(overall * 100)}% across ${mine.length} classes this term.`,
        status,
        source: "teacher",
      };
      if (status === "published") {
        report.reviewedBy = sections.get(String(mine[0].section)).teacher;
        report.reviewedAt = addDays(REF_DATE, -2);
        report.publishedAt = addDays(REF_DATE, -1);
      }
      data.ProgressReport.push(report);
    });
  },
};
