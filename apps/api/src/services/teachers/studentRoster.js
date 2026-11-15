import { Section, Enrollment, Assignment, Grade, Attendance, Goal, GoalUpdate, TeacherFeedback, StudentProfile } from "../../models/index.js";
import { requireTeacherProfile } from "../access/profiles.js";
import { getAssignedStudent } from "../access/teacherAccess.js";
import { attendancePercent, gradePercent, interventionFor, monthlyTrend } from "../grades/gradeMath.js";

// Assigned-student roster and profile (AC-TEA-01, 02, 06, 07, 15). Every query is batched by
// section or student ids so the cost does not grow with a per-student loop.

const fullName = (profile) => `${profile.user.firstName} ${profile.user.lastName}`;
const sectionName = (section) => section?.course?.title ?? "";
const periodLabel = (section) => (section.period ? `Period ${section.period}` : "");
const iso = (date) => (date ? new Date(date).toISOString() : null);

const byKey = (items, key) =>
  items.reduce((acc, item) => {
    const k = String(item[key]);
    (acc[k] ??= []).push(item);
    return acc;
  }, {});

// This teacher's sections, ordered by period, with the course populated for class names.
async function loadTeacherSections(teacherId) {
  return Section.find({ teacher: teacherId }).populate("course", "title").sort({ period: 1 }).lean();
}

export async function listAssignedStudents(userId) {
  const teacher = await requireTeacherProfile(userId);
  if (!teacher) return { students: [] };

  const sections = await loadTeacherSections(teacher._id);
  const sectionIds = sections.map((s) => s._id);
  const enrollments = await Enrollment.find({ section: { $in: sectionIds }, status: "active" }).lean();
  if (enrollments.length === 0) return { students: [] };

  const studentIds = [...new Set(enrollments.map((e) => String(e.student)))];
  const [profiles, assignments, attendance] = await Promise.all([
    StudentProfile.find({ _id: { $in: studentIds } }).populate("user", "firstName lastName").lean(),
    Assignment.find({ section: { $in: sectionIds } }).lean(),
    Attendance.find({ section: { $in: sectionIds }, student: { $in: studentIds } }).lean(),
  ]);
  const grades = await Grade.find({
    student: { $in: studentIds },
    assignment: { $in: assignments.map((a) => a._id) },
  }).lean();

  const pointsById = new Map(assignments.map((a) => [String(a._id), a.pointsPossible]));
  const gradeRowsByStudent = byKey(
    grades.map((g) => ({
      student: g.student,
      pointsEarned: g.pointsEarned,
      pointsPossible: pointsById.get(String(g.assignment)) ?? 0,
      status: g.status,
    })),
    "student",
  );
  const attendanceByStudent = byKey(attendance, "student");

  // Enrollments in section order so classNames follow period order.
  const sectionOrder = new Map(sections.map((s, i) => [String(s._id), i]));
  const sectionById = new Map(sections.map((s) => [String(s._id), s]));
  const classNamesByStudent = {};
  for (const e of [...enrollments].sort((a, b) => sectionOrder.get(String(a.section)) - sectionOrder.get(String(b.section)))) {
    const names = (classNamesByStudent[String(e.student)] ??= []);
    const name = sectionName(sectionById.get(String(e.section)));
    if (!names.includes(name)) names.push(name);
  }

  const students = profiles.map((profile) => {
    const id = String(profile._id);
    const averageGrade = gradePercent(gradeRowsByStudent[id] ?? []);
    const attendanceRate = attendancePercent(attendanceByStudent[id] ?? []);
    return {
      id,
      name: fullName(profile),
      gradeLevel: profile.gradeLevel,
      classNames: classNamesByStudent[id] ?? [],
      averageGrade,
      attendanceRate,
      needsIntervention: interventionFor({ average: averageGrade, attendance: attendanceRate }) !== null,
    };
  });
  students.sort((a, b) => a.name.localeCompare(b.name));
  return { students };
}

export async function getStudentProfile(userId, studentId) {
  // Throws 404 unless this student is actively enrolled in one of this teacher's sections.
  const { teacher, student, sectionIds } = await getAssignedStudent(userId, studentId);
  const sectionKeys = new Set(sectionIds.map(String));

  const teacherSections = await loadTeacherSections(teacher._id);
  const sectionById = new Map(teacherSections.map((s) => [String(s._id), s]));
  const classSections = teacherSections.filter((s) => sectionKeys.has(String(s._id)));
  const classIds = classSections.map((s) => s._id);

  const [assignments, attendance, goals, feedback] = await Promise.all([
    Assignment.find({ section: { $in: classIds } }).sort({ dueDate: -1 }).lean(),
    Attendance.find({ student: student._id, section: { $in: classIds } }).sort({ date: -1 }).lean(),
    Goal.find({ student: student._id }).sort({ createdAt: 1 }).lean(),
    TeacherFeedback.find({ student: student._id, teacher: teacher._id }).sort({ createdAt: -1 }).lean(),
  ]);
  const [grades, updates] = await Promise.all([
    Grade.find({ student: student._id, assignment: { $in: assignments.map((a) => a._id) } }).lean(),
    GoalUpdate.find({ goal: { $in: goals.map((g) => g._id) } }).sort({ createdAt: 1 }).lean(),
  ]);

  // One row per assignment in this teacher's classes for the student, graded or not.
  const gradeByAssignment = new Map(grades.map((g) => [String(g.assignment), g]));
  const gradeRows = assignments.map((a) => {
    const grade = gradeByAssignment.get(String(a._id));
    return {
      assignmentId: String(a._id),
      sectionId: String(a.section),
      className: sectionName(sectionById.get(String(a.section))),
      title: a.title,
      category: a.category,
      pointsPossible: a.pointsPossible,
      pointsEarned: grade?.pointsEarned ?? null,
      status: grade?.status ?? null,
      dueDate: iso(a.dueDate),
    };
  });
  // Math view of the same rows: monthlyTrend and gradePercent read date, points and status.
  const scoring = assignments.map((a) => {
    const grade = gradeByAssignment.get(String(a._id));
    return {
      date: a.dueDate,
      pointsEarned: grade?.pointsEarned ?? null,
      pointsPossible: a.pointsPossible,
      status: grade?.status ?? null,
    };
  });

  const attendanceRate = attendancePercent(attendance);
  const average = gradePercent(scoring);
  const flag = interventionFor({ average, attendance: attendanceRate });

  const updatesByGoal = byKey(updates, "goal");
  const goalRows = goals.map((goal) => {
    const goalUpdates = updatesByGoal[String(goal._id)] ?? [];
    return {
      id: String(goal._id),
      title: goal.title,
      description: goal.description ?? "",
      targetDate: iso(goal.targetDate),
      status: goal.status,
      progress: goalUpdates.at(-1)?.progressPercent ?? 0,
      updates: goalUpdates.map((u) => ({
        id: String(u._id),
        note: u.note,
        progressPercent: u.progressPercent,
        createdAt: iso(u.createdAt),
      })),
    };
  });

  return {
    student: {
      id: String(student._id),
      name: fullName(student),
      gradeLevel: student.gradeLevel,
      studentNumber: student.studentNumber,
    },
    classes: classSections.map((s) => ({
      id: String(s._id),
      name: sectionName(s),
      period: periodLabel(s),
      room: s.room ?? "",
    })),
    summary: {
      averageGrade: average,
      attendanceRate,
      needsIntervention: flag !== null,
      reason: flag?.reason ?? null,
    },
    grades: gradeRows,
    attendance: {
      rate: attendanceRate,
      records: attendance.slice(0, 30).map((r) => ({
        id: String(r._id),
        sectionId: String(r.section),
        className: sectionName(sectionById.get(String(r.section))),
        date: iso(r.date),
        status: r.status,
      })),
    },
    goals: goalRows,
    feedback: feedback.map((f) => ({
      id: String(f._id),
      sectionId: String(f.section),
      className: sectionName(sectionById.get(String(f.section))),
      body: f.body,
      createdAt: iso(f.createdAt),
      updatedAt: iso(f.updatedAt),
    })),
    performanceTrend: monthlyTrend(scoring),
  };
}
