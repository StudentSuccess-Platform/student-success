import {
  Attendance,
  Enrollment,
  Goal,
  GoalUpdate,
  Grade,
  RemediationItem,
  RemediationPlan,
  StudentProfile,
  TeacherFeedback,
} from "../models/index.js";

async function findStudentProfile(userId) {
  return StudentProfile.findOne({ user: userId }).populate("user", "firstName lastName email");
}

function roundPercent(value) {
  return Math.round(value * 10) / 10;
}

function percentage(earned, possible) {
  return possible > 0 ? roundPercent((earned / possible) * 100) : null;
}

function displayDate(date) {
  return date
    ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";
}

function sendMissingProfile(res) {
  return res.status(404).json({ error: "Student profile not found" });
}

export async function getStudentDashboard(req, res) {
  const profile = await findStudentProfile(req.user.id);
  if (!profile) return sendMissingProfile(res);

  const studentId = profile._id;
  const [grades, attendance, enrollments, goals, feedback, supportPlan] = await Promise.all([
    Grade.find({ student: studentId })
      .populate({
        path: "assignment",
        select: "title pointsPossible dueDate section",
        populate: {
          path: "section",
          select: "course term",
          populate: { path: "course", select: "title subject" },
        },
      })
      .sort({ createdAt: 1 })
      .lean(),
    Attendance.find({ student: studentId }).lean(),
    Enrollment.find({ student: studentId, status: "active" })
      .populate({ path: "section", select: "term" })
      .sort({ createdAt: -1 })
      .lean(),
    Goal.find({ student: studentId, status: "active" }).sort({ createdAt: -1 }).lean(),
    TeacherFeedback.findOne({ student: studentId, visibility: "shared" })
      .populate({
        path: "teacher",
        select: "user",
        populate: { path: "user", select: "firstName lastName" },
      })
      .sort({ createdAt: -1 })
      .lean(),
    RemediationPlan.findOne({
      student: studentId,
      status: { $in: ["approved", "published"] },
    })
      .sort({ updatedAt: -1 })
      .lean(),
  ]);

  const gradeTotals = new Map();
  const trendTotals = new Map();
  let totalEarned = 0;
  let totalPossible = 0;

  for (const grade of grades) {
    const assignment = grade.assignment;
    if (!assignment || !assignment.section?.course) continue;

    const possible = assignment.pointsPossible;
    const earned = grade.pointsEarned;
    if (
      !Number.isFinite(possible)
      || possible <= 0
      || !Number.isFinite(earned)
      || !["graded", "late"].includes(grade.status)
    ) {
      continue;
    }

    const course = assignment.section.course;
    const courseKey = String(course._id);
    const totals = gradeTotals.get(courseKey) ?? {
      subject: course.subject || course.title,
      earned: 0,
      possible: 0,
    };
    totals.earned += earned;
    totals.possible += possible;
    gradeTotals.set(courseKey, totals);
    totalEarned += earned;
    totalPossible += possible;

    const date = assignment.dueDate ? new Date(assignment.dueDate) : new Date(grade.createdAt);
    const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
    const quarterKey = `${date.getUTCFullYear()}-Q${quarter}`;
    const quarterTotals = trendTotals.get(quarterKey) ?? {
      label: `Q${quarter} ${date.getUTCFullYear()}`,
      earned: 0,
      possible: 0,
    };
    quarterTotals.earned += earned;
    quarterTotals.possible += possible;
    trendTotals.set(quarterKey, quarterTotals);
  }

  const attendanceRecords = attendance.filter((record) => record.status !== "excused");
  const attendedCount = attendanceRecords.filter(
    (record) => record.status === "present" || record.status === "tardy",
  ).length;

  const goalUpdates = goals.length
    ? await GoalUpdate.find({ goal: { $in: goals.map((goal) => goal._id) } })
      .sort({ createdAt: -1 })
      .lean()
    : [];
  const latestProgress = new Map();
  for (const update of goalUpdates) {
    const goalId = String(update.goal);
    if (!latestProgress.has(goalId)) latestProgress.set(goalId, update.progressPercent);
  }

  const supportPlanItems = supportPlan
    ? await RemediationItem.find({ plan: supportPlan._id }).sort({ createdAt: 1 }).lean()
    : [];

  const displayName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const trend = [...trendTotals.entries()]
    .sort(([quarterA], [quarterB]) => quarterA.localeCompare(quarterB))
    .map(([, { label, earned, possible }]) => ({ label, value: percentage(earned, possible) }))
    .slice(-4);

  return res.status(200).json({
    student: {
      id: String(profile._id),
      firstName: profile.user.firstName,
      term: enrollments[0]?.section?.term ?? null,
    },
    summary: {
      currentGrade: percentage(totalEarned, totalPossible),
      attendance: percentage(attendedCount, attendanceRecords.length),
    },
    grades: [...gradeTotals.entries()].map(([id, totals]) => ({
      id,
      subject: totals.subject,
      grade: percentage(totals.earned, totals.possible),
    })),
    performanceTrend: trend,
    goals: goals.map((goal) => ({
      id: String(goal._id),
      title: goal.title,
      progress: latestProgress.get(String(goal._id)) ?? 0,
      status: goal.status,
    })),
    teacherFeedback: feedback
      ? {
        teacher: displayName(feedback.teacher?.user),
        date: displayDate(feedback.createdAt),
        message: feedback.body,
      }
      : null,
    supportPlan: supportPlan
      ? {
        status: supportPlan.status,
        activities: supportPlanItems.map((item) => ({
          id: String(item._id),
          title: item.title,
          schedule: item.dueDate ? `Due ${displayDate(item.dueDate)}` : item.status.replace("_", " "),
        })),
      }
      : { status: null, activities: [] },
  });
}

export async function getStudentProfile(req, res) {
  const profile = await findStudentProfile(req.user.id);
  if (!profile) return sendMissingProfile(res);

  return res.status(200).json({ profile });
}

export async function getStudentGrades(req, res) {
  const profile = await StudentProfile.findOne({ user: req.user.id }).select("_id");
  if (!profile) return sendMissingProfile(res);

  const grades = await Grade.find({ student: profile._id })
    .populate({
      path: "assignment",
      select: "title category pointsPossible dueDate section",
      populate: {
        path: "section",
        select: "course term period",
        populate: { path: "course", select: "code title subject" },
      },
    })
    .sort({ createdAt: -1 });

  return res.status(200).json({ grades });
}

export async function getStudentAttendance(req, res) {
  const profile = await StudentProfile.findOne({ user: req.user.id }).select("_id");
  if (!profile) return sendMissingProfile(res);

  const attendance = await Attendance.find({ student: profile._id })
    .populate({
      path: "section",
      select: "course term period",
      populate: { path: "course", select: "code title subject" },
    })
    .sort({ date: -1 });

  return res.status(200).json({ attendance });
}
import { requireStudentProfile } from "../services/access/profiles.js";
import { getStudentDashboard } from "../services/students/studentViews.js";

export async function dashboard(req, res) {
  const student = await requireStudentProfile(req.user.id);
  res.status(200).json(await getStudentDashboard(student));
}
