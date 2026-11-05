import { getTeacherDashboard, getTeacherClasses, getTeacherClassDetail } from "../services/teachers/teacherViews.js";

export async function dashboard(req, res) {
  res.status(200).json(await getTeacherDashboard(req.user.id));
}

export async function classes(req, res) {
  res.status(200).json(await getTeacherClasses(req.user.id));
}

export async function classDetail(req, res) {
  res.status(200).json(await getTeacherClassDetail(req.user.id, req.params.classId));
}
