import { ProgressReport } from "../../models/index.js";

// Published progress reports for one student, newest period first, for the student and the linked parent.
// Only status "published" is ever returned. Internal fields (reviewer, source, AI audit) are left out.

const day = (value) => (value ? new Date(value).toISOString().slice(0, 10) : null);

export async function listPublishedReports(studentId) {
  const reports = await ProgressReport.find({ student: studentId, status: "published" })
    .sort({ periodEnd: -1, publishedAt: -1, _id: -1 })
    .populate({ path: "teacher", populate: { path: "user", select: "firstName lastName" } })
    .populate({ path: "section", select: "course", populate: { path: "course", select: "title" } })
    .lean();
  return {
    reports: reports.map((r) => ({
      id: String(r._id),
      className: r.section?.course?.title ?? "",
      teacher: [r.teacher?.user?.firstName, r.teacher?.user?.lastName].filter(Boolean).join(" "),
      periodStart: day(r.periodStart),
      periodEnd: day(r.periodEnd),
      summary: r.summary,
      publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : null,
    })),
  };
}
