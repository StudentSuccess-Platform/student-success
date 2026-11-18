import { Attendance, Grade, StudentProfile } from "../models/index.js";
import { requireStudentProfile } from "../services/access/profiles.js";
import { getStudentDashboard } from "../services/students/studentViews.js";
import { listPublishedPlans } from "../services/students/supportPlans.js";

async function findStudentProfile(userId) {
  return StudentProfile.findOne({ user: userId }).populate("user", "firstName lastName email");
}

function sendMissingProfile(res) {
  return res.status(404).json({ error: "Student profile not found" });
}

export async function dashboard(req, res) {
  const student = await requireStudentProfile(req.user.id);
  return res.status(200).json(await getStudentDashboard(student));
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

export async function supportPlans(req, res) {
  const student = await requireStudentProfile(req.user.id);
  return res.status(200).json(await listPublishedPlans(student._id));
}
