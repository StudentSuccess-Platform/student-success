import {
  Section,
  Enrollment,
  Assignment,
  Grade,
  Attendance,
  Goal,
  GoalUpdate,
  TeacherFeedback,
  RemediationPlan,
  RemediationItem,
  User,
} from "../../models/index.js";
import { attendancePercent, gradePercent, mean, monthlyTrend } from "../grades/gradeMath.js";

// Builds the student dashboard for one StudentProfile. Used for the student themself and, after a
// relationship check, for a linked parent. It only reads shared data: TeacherNote (private notes)
// is never queried here, and a remediation plan is returned only once the teacher has published it.

const fullName = (user) => `${user.firstName} ${user.lastName}`;

export async function getStudentDashboard(student) {
  const user = await User.findById(student.user, "firstName lastName").lean();
  const enrollments = await Enrollment.find({ student: student._id, status: "active" }).lean();
  const sections = await Section.find({ _id: { $in: enrollments.map((e) => e.section) } })
    .populate("course", "title")
    .lean();
  const assignments = await Assignment.find({ section: { $in: sections.map((s) => s._id) } }).lean();
  const [grades, attendance] = await Promise.all([
    Grade.find({ student: student._id, assignment: { $in: assignments.map((a) => a._id) } }).lean(),
    Attendance.find({ student: student._id }).lean(),
  ]);

  const assignmentById = new Map(assignments.map((a) => [String(a._id), a]));
  const rows = grades
    .map((g) => ({ g, a: assignmentById.get(String(g.assignment)) }))
    .filter(({ a }) => a)
    .map(({ g, a }) => ({
      section: String(a.section),
      date: a.dueDate,
      pointsEarned: g.pointsEarned,
      pointsPossible: a.pointsPossible,
      status: g.status,
    }));

  const subjectGrades = sections
    .map((s) => ({
      id: String(s._id),
      subject: s.course.title,
      grade: gradePercent(rows.filter((r) => r.section === String(s._id))),
    }))
    .filter((g) => g.grade !== null);

  const [goals, feedback, plan] = await Promise.all([
    loadGoals(student._id),
    loadFeedback(student._id),
    loadPublishedPlan(student._id),
  ]);

  return {
    student: { id: String(student._id), firstName: user.firstName, term: sections[0]?.term ?? "" },
    summary: {
      currentGrade: mean(subjectGrades.map((g) => g.grade)),
      attendance: attendancePercent(attendance),
      // No goal target is modelled yet; the UI shows its own empty state for null.
      termGoal: null,
    },
    grades: subjectGrades,
    performanceTrend: monthlyTrend(rows),
    goals,
    teacherFeedback: feedback,
    supportPlan: plan,
  };
}

async function loadGoals(studentId) {
  const goals = await Goal.find({ student: studentId, status: { $in: ["active", "achieved"] } }).lean();
  const updates = await GoalUpdate.find({ goal: { $in: goals.map((g) => g._id) } })
    .sort({ createdAt: -1 })
    .lean();
  const latest = new Map();
  for (const u of updates) if (!latest.has(String(u.goal))) latest.set(String(u.goal), u.progressPercent);
  return goals.map((g) => {
    const progress = latest.get(String(g._id)) ?? 0;
    return {
      id: String(g._id),
      title: g.title,
      progress,
      status: g.status === "achieved" ? "achieved" : progress >= 75 ? "on-track" : "in-progress",
    };
  });
}

async function loadFeedback(studentId) {
  const feedback = await TeacherFeedback.findOne({ student: studentId })
    .sort({ createdAt: -1 })
    .populate({ path: "teacher", populate: { path: "user", select: "firstName lastName" } })
    .lean();
  if (!feedback) return null;
  return {
    teacher: fullName(feedback.teacher.user),
    date: new Date(feedback.createdAt).toISOString(),
    message: feedback.body,
  };
}

// Students and parents see only published plans. The API reports them as status "approved",
// the word the student UI already checks for.
async function loadPublishedPlan(studentId) {
  const plan = await RemediationPlan.findOne({ student: studentId, status: "published" })
    .sort({ publishedAt: -1 })
    .populate({ path: "teacher", populate: { path: "user", select: "firstName lastName" } })
    .lean();
  if (!plan) return null;
  const items = await RemediationItem.find({ plan: plan._id }).sort({ createdAt: 1 }).lean();
  return {
    status: "approved",
    teacher: fullName(plan.teacher.user),
    focus: plan.title,
    activities: items.map((i) => ({ id: String(i._id), title: i.title, schedule: i.description ?? "" })),
  };
}
