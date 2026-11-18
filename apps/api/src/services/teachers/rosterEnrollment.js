import mongoose from "mongoose";
import { Section, Enrollment, StudentProfile, User } from "../../models/index.js";
import { requireTeacherProfile } from "../access/profiles.js";
import { httpError } from "../../utils/httpError.js";
import { validateNewRosterStudent } from "../../validators/rosterValidators.js";

// Adds a student to one of the teacher's classes (roster). Creates the User (no email or password required:
// status "invited", it cannot sign in until an activation flow exists), the StudentProfile and the Enrollment,
// or enrols an existing student the teacher confirms is the same person.
//
// Duplicate guard: a student with the same first name, last name (case-insensitive) and grade level blocks
// the request with 409 POSSIBLE_DUPLICATE and the matches. The caller then either sends existingStudentId
// (one of those matches) to enrol that student, or allowDuplicate: true when it really is a different child.
// MongoDB here is standalone (no transactions), so created documents are removed if a later write fails.

const NAME_COLLATION = { locale: "en", strength: 2 };

async function requireOwnSection(userId, classId) {
  const teacher = await requireTeacherProfile(userId);
  if (!teacher || !mongoose.isObjectIdOrHexString(classId)) throw httpError(404, "Class not found");
  const section = await Section.findOne({ _id: classId, teacher: teacher._id }).populate("course", "title").lean();
  if (!section) throw httpError(404, "Class not found");
  return section;
}

async function findSameNameAndGrade({ firstName, lastName, gradeLevel }) {
  const users = await User.find({ firstName, lastName, roles: "student" }).collation(NAME_COLLATION).select("firstName lastName").lean();
  if (users.length === 0) return [];
  return StudentProfile.find({ user: { $in: users.map((u) => u._id) }, gradeLevel }).populate("user", "firstName lastName").lean();
}

async function nextStudentNumber() {
  const [last] = await StudentProfile.find({ studentNumber: /^S\d+$/ }).sort({ studentNumber: -1 }).limit(1).select("studentNumber").lean();
  const n = last ? Number(last.studentNumber.slice(1)) + 1 : 100000;
  return `S${n}`;
}

const nameOf = (profile) => `${profile.user.firstName} ${profile.user.lastName}`;

function studentJson(profile, email = null, status = "active") {
  return { id: String(profile._id), name: nameOf(profile), gradeLevel: profile.gradeLevel, studentNumber: profile.studentNumber, hasEmail: Boolean(email), accountStatus: status };
}

async function createNewStudent({ firstName, lastName, gradeLevel, email }) {
  if (email && (await User.exists({ email }))) {
    throw httpError(409, "That email address is already in use", { fields: { email: "Already in use" } });
  }
  const user = await User.create({ firstName, lastName, roles: ["student"], status: "invited", ...(email ? { email } : {}) });
  try {
    for (let attempt = 0; ; attempt += 1) {
      try {
        const profile = await StudentProfile.create({ user: user._id, studentNumber: await nextStudentNumber(), gradeLevel });
        return { user, profile };
      } catch (error) {
        if (error?.code === 11000 && attempt < 4) continue; // another request took that student number
        throw error;
      }
    }
  } catch (error) {
    await User.deleteOne({ _id: user._id });
    throw error;
  }
}

export async function addStudentToClass(userId, classId, body) {
  const section = await requireOwnSection(userId, classId);
  const input = validateNewRosterStudent(body);
  const classJson = { id: String(section._id), name: section.course?.title ?? "" };

  const matches = await findSameNameAndGrade(input);
  const matchIds = new Set(matches.map((m) => String(m._id)));

  if (input.existingStudentId) {
    if (!matchIds.has(input.existingStudentId)) {
      throw httpError(400, "Please fix the highlighted fields", { fields: { existingStudentId: "Not the same name and grade" } });
    }
    const profile = matches.find((m) => String(m._id) === input.existingStudentId);
    const enrollment = await Enrollment.findOne({ section: section._id, student: profile._id });
    if (enrollment?.status === "active") throw httpError(409, "That student is already in this class", { code: "ALREADY_ENROLLED" });
    const saved = enrollment
      ? await Enrollment.findOneAndUpdate({ _id: enrollment._id }, { status: "active" }, { new: true }).lean()
      : (await Enrollment.create({ section: section._id, student: profile._id })).toObject();
    return { status: 200, body: { created: false, student: studentJson(profile), class: classJson, enrollmentId: String(saved._id) } };
  }

  if (matches.length > 0 && !input.allowDuplicate) {
    const inClass = new Set((await Enrollment.find({ section: section._id, student: { $in: [...matchIds] }, status: "active" }).select("student").lean()).map((e) => String(e.student)));
    throw httpError(409, "A student with this name and grade level already exists", {
      code: "POSSIBLE_DUPLICATE",
      matches: matches.map((m) => ({ ...studentJson(m), alreadyInClass: inClass.has(String(m._id)) })),
    });
  }

  const { user, profile } = await createNewStudent(input);
  try {
    const enrollment = await Enrollment.create({ section: section._id, student: profile._id });
    return { status: 201, body: { created: true, student: studentJson({ _id: profile._id, user, gradeLevel: profile.gradeLevel, studentNumber: profile.studentNumber }, user.email, user.status), class: classJson, enrollmentId: String(enrollment._id) } };
  } catch (error) {
    await StudentProfile.deleteOne({ _id: profile._id });
    await User.deleteOne({ _id: user._id });
    throw error;
  }
}
