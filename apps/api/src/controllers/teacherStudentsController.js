import { listAssignedStudents, getStudentProfile } from "../services/teachers/studentRoster.js";

export async function list(req, res) {
  res.status(200).json(await listAssignedStudents(req.user.id));
}

export async function profile(req, res) {
  res.status(200).json(await getStudentProfile(req.user.id, req.params.studentId));
}
