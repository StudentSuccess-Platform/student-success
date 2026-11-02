import { TeacherProfile, StudentProfile, GuardianProfile, GuardianStudentLink } from "../../models/index.js";

const httpError = (status, message) => Object.assign(new Error(message), { status });

// Resolves the signed-in user to their role profile. The profile id (not the user id) is what the
// academic collections reference, so every view starts here.

export async function requireTeacherProfile(userId) {
  return TeacherProfile.findOne({ user: userId }).lean();
}

export async function requireStudentProfile(userId) {
  const profile = await StudentProfile.findOne({ user: userId }).lean();
  if (!profile) throw httpError(404, "Student profile not found");
  return profile;
}

// Relationship-based access: a guardian may only see students linked to them through an active link.
export async function linkedStudentIds(userId) {
  const guardian = await GuardianProfile.findOne({ user: userId }).lean();
  if (!guardian) return [];
  const links = await GuardianStudentLink.find({ guardian: guardian._id, active: true }).lean();
  return links.map((l) => l.student);
}

export async function requireLinkedStudent(userId, studentId) {
  const ids = (await linkedStudentIds(userId)).map(String);
  if (!ids.includes(String(studentId))) throw httpError(404, "Student not found");
  return StudentProfile.findById(studentId).lean();
}
