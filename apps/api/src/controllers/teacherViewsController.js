import { getTeacherDashboard, getTeacherClasses, getTeacherClassDetail } from "../services/teachers/teacherViews.js";
import { addStudentToClass } from "../services/teachers/rosterEnrollment.js";

export async function dashboard(req, res) {
  res.status(200).json(await getTeacherDashboard(req.user.id));
}

export async function classes(req, res) {
  res.status(200).json(await getTeacherClasses(req.user.id));
}

export async function classDetail(req, res) {
  res.status(200).json(await getTeacherClassDetail(req.user.id, req.params.classId));
}

export async function addClassStudent(req, res) {
  const { status, body } = await addStudentToClass(req.user.id, req.params.classId, req.body);
  res.status(status).json(body);
}
