import { requireStudentProfile } from "../services/access/profiles.js";
import { getStudentDashboard } from "../services/students/studentViews.js";

export async function dashboard(req, res) {
  const student = await requireStudentProfile(req.user.id);
  res.status(200).json(await getStudentDashboard(student));
}
