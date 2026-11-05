import bcrypt from "bcryptjs";
import {
  User,
  TeacherProfile,
  StudentProfile,
  GuardianProfile,
  GuardianStudentLink,
  Course,
  Section,
  Enrollment,
  Assignment,
  Grade,
  Attendance,
  Goal,
  GoalUpdate,
  TeacherFeedback,
  TeacherNote,
  RemediationPlan,
  RemediationItem,
} from "../../src/models/index.js";

export const PASSWORD = "Password123!";
export const PRIVATE_NOTE = "PRIVATE-NOTE-never-share-with-families";

// A tiny school for integration tests: one teacher with one class, two enrolled students (one of
// them struggling), a parent linked only to the first student, and a second teacher with no classes.
// Users get real bcrypt hashes (cost 4, fast) so tests sign in through the login endpoint.
export async function createSchool() {
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  const user = (email, firstName, lastName, role) =>
    User.create({ email, firstName, lastName, roles: [role], passwordHash });

  const teacherUser = await user("teacher@example.test", "Tess", "Teacher", "teacher");
  const otherTeacherUser = await user("other.teacher@example.test", "Otto", "Other", "teacher");
  const ada = await user("ada@example.test", "Ada", "Strong", "student");
  const ben = await user("ben@example.test", "Ben", "Behind", "student");
  const parentUser = await user("parent@example.test", "Pat", "Parent", "parent");

  const teacher = await TeacherProfile.create({ user: teacherUser._id });
  await TeacherProfile.create({ user: otherTeacherUser._id });
  const adaProfile = await StudentProfile.create({ user: ada._id, studentNumber: "S-1", gradeLevel: 9 });
  const benProfile = await StudentProfile.create({ user: ben._id, studentNumber: "S-2", gradeLevel: 9 });
  const guardian = await GuardianProfile.create({ user: parentUser._id });
  await GuardianStudentLink.create({ guardian: guardian._id, student: adaProfile._id });

  const course = await Course.create({ code: "ALG1", title: "Algebra I", subject: "Mathematics", gradeLevel: 9 });
  const section = await Section.create({ course: course._id, teacher: teacher._id, term: "2025-Fall", period: 2, room: "Room 12" });
  for (const student of [adaProfile, benProfile]) {
    await Enrollment.create({ section: section._id, student: student._id });
  }

  const test = await Assignment.create({
    section: section._id,
    title: "Unit Test",
    category: "test",
    pointsPossible: 100,
    dueDate: new Date("2025-10-10T12:00:00Z"),
  });
  await Grade.create({ assignment: test._id, student: adaProfile._id, pointsEarned: 95 });
  await Grade.create({ assignment: test._id, student: benProfile._id, pointsEarned: 50 });

  const day = (d) => new Date(`2025-10-${d}T12:00:00Z`);
  await Attendance.create({ section: section._id, student: adaProfile._id, date: day("01"), status: "present" });
  await Attendance.create({ section: section._id, student: benProfile._id, date: day("01"), status: "absent" });

  const goal = await Goal.create({ student: adaProfile._id, title: "Keep an A", status: "active" });
  await GoalUpdate.create({ goal: goal._id, author: ada._id, note: "Going well", progressPercent: 80 });
  await TeacherFeedback.create({ student: adaProfile._id, teacher: teacher._id, section: section._id, body: "Great work" });
  await TeacherNote.create({ student: adaProfile._id, teacher: teacher._id, body: PRIVATE_NOTE });

  return { teacher, section, adaProfile, benProfile, ada, ben, parentUser };
}

// Adds a remediation plan for a student. Only a published plan may be visible to families.
export async function addPlan({ school, student, status, title }) {
  const reviewed = status === "published" || status === "approved";
  const plan = await RemediationPlan.create({
    student: student._id,
    section: school.section._id,
    teacher: school.teacher._id,
    title,
    status,
    ...(reviewed ? { reviewedBy: school.teacher._id, reviewedAt: new Date() } : {}),
    ...(status === "published" ? { publishedAt: new Date() } : {}),
  });
  await RemediationItem.create({ plan: plan._id, title: "Practice fractions", description: "15 minutes daily" });
  return plan;
}

export async function signIn(baseUrl, email) {
  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const { token } = await res.json();
  return { Authorization: `Bearer ${token}` };
}
