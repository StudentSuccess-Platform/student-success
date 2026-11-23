import mongoose from "mongoose";
import { ProgressReport, Section, StudentProfile, Assignment, Grade, Attendance, Goal, GoalUpdate } from "../../models/index.js";
import { requireTeacherProfile } from "../access/profiles.js";
import { getAssignedStudent, requireStudentSection } from "../access/teacherAccess.js";
import { attendancePercent, gradePercent } from "../grades/gradeMath.js";
import { httpError } from "../../utils/httpError.js";
import {
  validateNewReport,
  validateReportEdit,
  validateStatusFilter,
  validateSuggestionQuery,
} from "../../validators/reportValidators.js";
import { buildSummary } from "./summaryBuilder.js";

// Teacher progress reports (draft or pending review -> published). A teacher only ever reaches their own
// reports (the `teacher` field) and only for students assigned to them, and a report reaches students and
// parents only once the teacher publishes it. Every change is ONE conditional update that names the allowed
// states, so a published report can never be edited, deleted or published twice by racing requests.

const EDITABLE = ["draft", "pending_review"];
const day = (value) => (value ? new Date(value).toISOString().slice(0, 10) : null);
const iso = (value) => (value ? new Date(value).toISOString() : null);
const fullName = (profile) => [profile?.user?.firstName, profile?.user?.lastName].filter(Boolean).join(" ") || "Unknown student";

export function toReportJson(report, studentName, className) {
  return {
    id: String(report._id),
    studentId: String(report.student),
    studentName,
    sectionId: report.section ? String(report.section) : null,
    className,
    periodStart: day(report.periodStart),
    periodEnd: day(report.periodEnd),
    summary: report.summary,
    status: report.status,
    source: report.source,
    createdAt: iso(report.createdAt),
    updatedAt: iso(report.updatedAt),
    publishedAt: iso(report.publishedAt),
  };
}

// Student names and class titles for a batch of reports in two queries.
async function presentReports(reports) {
  if (reports.length === 0) return [];
  const [students, sections] = await Promise.all([
    StudentProfile.find({ _id: { $in: reports.map((r) => r.student) } }).populate("user", "firstName lastName").lean(),
    Section.find({ _id: { $in: reports.map((r) => r.section).filter(Boolean) } }).populate("course", "title").lean(),
  ]);
  const studentById = new Map(students.map((s) => [String(s._id), s]));
  const sectionById = new Map(sections.map((s) => [String(s._id), s]));
  return reports.map((r) =>
    toReportJson(r, fullName(studentById.get(String(r.student))), sectionById.get(String(r.section))?.course?.title ?? ""),
  );
}

export async function listTeacherReports(userId, query) {
  const status = validateStatusFilter(query);
  const teacher = await requireTeacherProfile(userId);
  const empty = { reports: [], counts: { draft: 0, pending_review: 0, published: 0 } };
  if (!teacher) return empty;

  const [reports, grouped] = await Promise.all([
    ProgressReport.find({ teacher: teacher._id, ...(status ? { status } : {}) }).sort({ updatedAt: -1, _id: -1 }).lean(),
    ProgressReport.aggregate([{ $match: { teacher: teacher._id } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  const counts = { ...empty.counts };
  for (const row of grouped) counts[row._id] = row.n;
  return { reports: await presentReports(reports), counts };
}

// A factual summary the teacher can start from, built from the grades, attendance and goals of the period.
export async function suggestSummary(userId, studentId, query) {
  const access = await getAssignedStudent(userId, studentId); // first: an unassigned student is a 404 whatever the request holds
  const input = validateSuggestionQuery(query);
  const sectionId = requireStudentSection(access, input.sectionId);
  const from = new Date(`${input.periodStart}T00:00:00.000Z`);
  const to = new Date(`${input.periodEnd}T23:59:59.999Z`);

  const [section, assignments, attendance, goals] = await Promise.all([
    Section.findById(sectionId).populate("course", "title").lean(),
    Assignment.find({ section: sectionId, dueDate: { $gte: from, $lte: to } }).lean(),
    Attendance.find({ student: access.student._id, section: sectionId, date: { $gte: from, $lte: to } }).lean(),
    Goal.find({ student: access.student._id, status: "active" }).sort({ createdAt: 1 }).lean(),
  ]);
  const [grades, updates] = await Promise.all([
    Grade.find({ student: access.student._id, assignment: { $in: assignments.map((a) => a._id) } }).lean(),
    GoalUpdate.find({ goal: { $in: goals.map((g) => g._id) } }).sort({ createdAt: 1 }).lean(),
  ]);

  const gradeByAssignment = new Map(grades.map((g) => [String(g.assignment), g]));
  const rows = assignments.map((a) => {
    const grade = gradeByAssignment.get(String(a._id));
    return { pointsEarned: grade?.pointsEarned ?? null, pointsPossible: a.pointsPossible, status: grade?.status ?? null };
  });
  const latestProgress = new Map();
  for (const update of updates) latestProgress.set(String(update.goal), update.progressPercent);

  return {
    summary: buildSummary({
      firstName: access.student.user?.firstName ?? "The student",
      className: section?.course?.title ?? "This class",
      periodStart: from,
      periodEnd: to,
      averageGrade: gradePercent(rows),
      grades: rows,
      attendanceRate: attendancePercent(attendance),
      attendance,
      goals: goals.map((g) => ({ title: g.title, progress: latestProgress.get(String(g._id)) ?? 0 })),
    }),
  };
}

export async function createReport(userId, studentId, body) {
  const access = await getAssignedStudent(userId, studentId);
  const input = validateNewReport(body);
  const sectionId = requireStudentSection(access, input.sectionId);
  const report = await ProgressReport.create({
    student: access.student._id,
    section: sectionId,
    teacher: access.teacher._id,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    summary: input.summary,
    status: "draft",
    source: "teacher",
  });
  return (await presentReports([report.toObject()]))[0];
}

// Tells "no such report for this teacher" (404) apart from "it is already published" (409) after a
// conditional write matched nothing.
async function explainNoMatch(access, reportId, action) {
  const exists = await ProgressReport.exists({ _id: reportId, student: access.student._id, teacher: access.teacher._id });
  if (!exists) throw httpError(404, "Report not found");
  throw httpError(409, `A published report cannot be ${action}`);
}

export async function editReport(userId, studentId, reportId, body) {
  const access = await getAssignedStudent(userId, studentId);
  if (!mongoose.isObjectIdOrHexString(reportId)) throw httpError(404, "Report not found");
  const input = validateReportEdit(body);
  const report = await ProgressReport.findOneAndUpdate(
    { _id: reportId, student: access.student._id, teacher: access.teacher._id, status: { $in: EDITABLE } },
    { $set: { periodStart: input.periodStart, periodEnd: input.periodEnd, summary: input.summary } },
    { new: true },
  ).lean();
  if (!report) return explainNoMatch(access, reportId, "changed");
  return (await presentReports([report]))[0];
}

export async function publishReport(userId, studentId, reportId) {
  const access = await getAssignedStudent(userId, studentId);
  if (!mongoose.isObjectIdOrHexString(reportId)) throw httpError(404, "Report not found");
  const now = new Date();
  const report = await ProgressReport.findOneAndUpdate(
    { _id: reportId, student: access.student._id, teacher: access.teacher._id, status: { $in: EDITABLE } },
    { $set: { status: "published", reviewedBy: access.teacher._id, reviewedAt: now, publishedAt: now } },
    { new: true },
  ).lean();
  if (!report) return explainNoMatch(access, reportId, "published again");
  return (await presentReports([report]))[0];
}

export async function deleteReport(userId, studentId, reportId) {
  const access = await getAssignedStudent(userId, studentId);
  if (!mongoose.isObjectIdOrHexString(reportId)) throw httpError(404, "Report not found");
  const report = await ProgressReport.findOneAndDelete({
    _id: reportId,
    student: access.student._id,
    teacher: access.teacher._id,
    status: { $in: EDITABLE },
  }).lean();
  if (!report) return explainNoMatch(access, reportId, "deleted");
  return { deleted: true, id: String(report._id) };
}
