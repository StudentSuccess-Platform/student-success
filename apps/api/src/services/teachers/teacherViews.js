import mongoose from "mongoose";
import { Section, Enrollment, Assignment, Grade, Attendance, StudentProfile } from "../../models/index.js";
import { requireTeacherProfile } from "../access/profiles.js";
import { attendancePercent, gradePercent, interventionFor, mean, monthlyTrend } from "../grades/gradeMath.js";

const httpError = (status, message) => Object.assign(new Error(message), { status });

const EMPTY_DASHBOARD = {
  summary: { totalClasses: 0, totalStudents: 0, studentsNeedingIntervention: 0, averageAttendance: 0 },
  performanceTrend: [],
  attendanceOverview: { overallRate: 0, classes: [] },
  interventions: [],
  recentActivity: [],
};

// A profile whose User document is gone still renders (with a placeholder name) instead of a 500.
const fullName = (profile) => [profile.user?.firstName, profile.user?.lastName].filter(Boolean).join(" ") || "Unknown student";
const sectionName = (section) => section.course.title;

// Loads everything one teacher's sections need, in a handful of queries.
async function loadTeacherData(teacherProfileId, sectionFilter = {}) {
  const sections = await Section.find({ teacher: teacherProfileId, ...sectionFilter })
    .populate("course", "title")
    .sort({ period: 1 })
    .lean();
  const sectionIds = sections.map((s) => s._id);

  const [enrollments, assignments, attendance] = await Promise.all([
    Enrollment.find({ section: { $in: sectionIds }, status: "active" }).lean(),
    Assignment.find({ section: { $in: sectionIds } }).lean(),
    Attendance.find({ section: { $in: sectionIds } }).lean(),
  ]);
  const grades = await Grade.find({ assignment: { $in: assignments.map((a) => a._id) } }).lean();

  const assignmentById = new Map(assignments.map((a) => [String(a._id), a]));
  // A grade row joined with its assignment so the math helpers see points and dates.
  const gradeRows = grades
    .map((g) => ({ ...g, assignment: assignmentById.get(String(g.assignment)) }))
    .filter((g) => g.assignment)
    .map((g) => ({
      student: String(g.student),
      section: String(g.assignment.section),
      assignmentId: String(g.assignment._id),
      assignmentTitle: g.assignment.title,
      date: g.assignment.dueDate,
      pointsEarned: g.pointsEarned,
      pointsPossible: g.assignment.pointsPossible,
      status: g.status,
      updatedAt: g.updatedAt,
    }));

  return { sections, enrollments, attendance, gradeRows };
}

const byKey = (items, key) =>
  items.reduce((acc, item) => {
    const k = String(item[key]);
    (acc[k] ??= []).push(item);
    return acc;
  }, {});

export async function getTeacherDashboard(userId) {
  const teacher = await requireTeacherProfile(userId);
  if (!teacher) return EMPTY_DASHBOARD;

  const { sections, enrollments, attendance, gradeRows } = await loadTeacherData(teacher._id);
  const studentIds = [...new Set(enrollments.map((e) => String(e.student)))];
  const profiles = await StudentProfile.find({ _id: { $in: studentIds } })
    .populate("user", "firstName lastName")
    .lean();

  const gradesByStudent = byKey(gradeRows, "student");
  const attendanceByStudent = byKey(attendance, "student");
  const attendanceBySection = byKey(attendance, "section");

  const interventions = [];
  for (const profile of profiles) {
    const id = String(profile._id);
    const flag = interventionFor({
      average: gradePercent(gradesByStudent[id] ?? []),
      attendance: attendancePercent(attendanceByStudent[id] ?? []),
    });
    if (!flag) continue;
    const firstSection = sections.find((s) => enrollments.some((e) => String(e.section) === String(s._id) && String(e.student) === id));
    interventions.push({
      id,
      name: fullName(profile),
      className: firstSection ? sectionName(firstSection) : "",
      ...flag,
    });
  }
  interventions.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));

  const latestBySection = {};
  for (const row of gradeRows) {
    const current = latestBySection[row.assignmentId];
    if (!current || row.updatedAt > current.updatedAt) latestBySection[row.assignmentId] = row;
  }
  const sectionById = new Map(sections.map((s) => [String(s._id), s]));
  const recentActivity = Object.values(latestBySection)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5)
    .map((row) => ({
      id: row.assignmentId,
      description: `Grades posted for ${row.assignmentTitle} (${sectionName(sectionById.get(row.section))})`,
      timestamp: new Date(row.updatedAt).toISOString(),
    }));

  return {
    summary: {
      totalClasses: sections.length,
      totalStudents: profiles.length,
      studentsNeedingIntervention: interventions.length,
      averageAttendance: attendancePercent(attendance) ?? 0,
    },
    performanceTrend: monthlyTrend(gradeRows),
    attendanceOverview: {
      overallRate: attendancePercent(attendance) ?? 0,
      classes: sections.map((s) => ({
        name: sectionName(s),
        rate: attendancePercent(attendanceBySection[String(s._id)] ?? []) ?? 0,
      })),
    },
    interventions: interventions.slice(0, 5),
    recentActivity,
  };
}

export async function getTeacherClasses(userId) {
  const teacher = await requireTeacherProfile(userId);
  if (!teacher) return { classes: [] };
  const sections = await Section.find({ teacher: teacher._id }).populate("course", "title").sort({ period: 1 }).lean();
  const counts = await Enrollment.aggregate([
    { $match: { section: { $in: sections.map((s) => s._id) }, status: "active" } },
    { $group: { _id: "$section", count: { $sum: 1 } } },
  ]);
  const countBySection = new Map(counts.map((c) => [String(c._id), c.count]));
  return {
    classes: sections.map((s) => ({
      id: String(s._id),
      name: sectionName(s),
      period: s.period ? `Period ${s.period}` : "",
      room: s.room ?? "",
      studentCount: countBySection.get(String(s._id)) ?? 0,
    })),
  };
}

// One class with its roster. Returns 404 for a class that is not this teacher's, so other
// teachers' classes cannot be probed.
export async function getTeacherClassDetail(userId, classId) {
  const teacher = await requireTeacherProfile(userId);
  if (!teacher || !mongoose.isObjectIdOrHexString(classId)) throw httpError(404, "Class not found");
  const { sections, enrollments, attendance, gradeRows } = await loadTeacherData(teacher._id, { _id: classId });
  const section = sections[0];
  if (!section) throw httpError(404, "Class not found");

  const profiles = await StudentProfile.find({ _id: { $in: enrollments.map((e) => e.student) } })
    .populate("user", "firstName lastName")
    .lean();
  const gradesByStudent = byKey(gradeRows, "student");
  const attendanceByStudent = byKey(attendance, "student");

  return {
    class: { id: String(section._id), name: sectionName(section), period: section.period ? `Period ${section.period}` : "", room: section.room ?? "" },
    students: profiles
      .map((p) => ({
        id: String(p._id),
        name: fullName(p),
        averageGrade: gradePercent(gradesByStudent[String(p._id)] ?? []),
        attendanceRate: attendancePercent(attendanceByStudent[String(p._id)] ?? []),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    classAverage: mean(Object.values(gradesByStudent).map((rows) => gradePercent(rows))),
  };
}
