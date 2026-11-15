import mongoose from "mongoose";
import { Section, Enrollment, StudentProfile } from "../../models/index.js";
import { requireTeacherProfile } from "./profiles.js";
import { httpError } from "../../utils/httpError.js";

// Assigned-student access control (AC-TEA-01, AC-TEA-15). EVERY teacher endpoint that takes a
// studentId must call getAssignedStudent first. A student is "assigned" to a teacher when the
// student has an active enrollment in a section that teacher teaches.
//
// Returns { teacher, student, sectionIds }:
//   teacher    TeacherProfile (lean)
//   student    StudentProfile (lean) with user populated { firstName, lastName }
//   sectionIds ObjectIds of this teacher's sections the student is actively enrolled in
// Throws 404 "Student not found" for: no teacher profile, malformed id, unknown student, or a
// student who is not assigned to this teacher. 404 (not 403) so other students' ids cannot be probed.
export async function getAssignedStudent(userId, studentId) {
  const teacher = await requireTeacherProfile(userId);
  if (!teacher || !mongoose.isValidObjectId(studentId)) throw httpError(404, "Student not found");

  const sections = await Section.find({ teacher: teacher._id }).select("_id").lean();
  const enrollments = await Enrollment.find({
    student: studentId,
    section: { $in: sections.map((s) => s._id) },
    status: "active",
  }).lean();
  if (enrollments.length === 0) throw httpError(404, "Student not found");

  const student = await StudentProfile.findById(studentId).populate("user", "firstName lastName").lean();
  if (!student) throw httpError(404, "Student not found");

  return { teacher, student, sectionIds: enrollments.map((e) => e.section) };
}

// Confirms a sectionId from a request body is one of the sections returned by getAssignedStudent.
// Returns the section id as an ObjectId, or throws 400 with a field error.
export function requireStudentSection(access, sectionId, field = "sectionId") {
  const match = access.sectionIds.find((id) => String(id) === String(sectionId));
  if (!match) {
    throw httpError(400, "Please choose one of this student's classes", { fields: { [field]: "Invalid class" } });
  }
  return match;
}
