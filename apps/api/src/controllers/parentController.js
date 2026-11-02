import { StudentProfile } from "../models/index.js";
import { linkedStudentIds, requireLinkedStudent } from "../services/access/profiles.js";
import { getStudentDashboard } from "../services/students/studentViews.js";

export async function children(req, res) {
  const ids = await linkedStudentIds(req.user.id);
  const profiles = await StudentProfile.find({ _id: { $in: ids } })
    .populate("user", "firstName lastName")
    .lean();
  res.status(200).json({
    children: profiles
      .map((p) => ({
        id: String(p._id),
        name: `${p.user.firstName} ${p.user.lastName}`,
        gradeLevel: p.gradeLevel,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  });
}

export async function childDashboard(req, res) {
  const student = await requireLinkedStudent(req.user.id, req.params.studentId);
  res.status(200).json(await getStudentDashboard(student));
}
