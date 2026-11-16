import bcrypt from "bcryptjs";
import { Assignment, Enrollment, StudentProfile, User } from "../../src/models/index.js";
import { PASSWORD } from "./fixtures.js";

// Extra data for the B1 roster and profile tests, on top of createSchool().

// An assignment with no grades yet, due after the seeded unit test.
export async function addUngradedAssignment(school) {
  return Assignment.create({
    section: school.section._id,
    title: "Quiz 2",
    category: "quiz",
    pointsPossible: 20,
    dueDate: new Date("2025-11-01T12:00:00Z"),
  });
}

// Two students this teacher must not see: one whose only enrollment in the class was dropped,
// and one with no enrollment at all.
export async function addUnassignedStudents(school) {
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  const makeStudent = async (email, firstName, lastName, studentNumber) => {
    const user = await User.create({ email, firstName, lastName, roles: ["student"], passwordHash });
    return StudentProfile.create({ user: user._id, studentNumber, gradeLevel: 9 });
  };
  const dropped = await makeStudent("dana@example.test", "Dana", "Dropped", "S-3");
  await Enrollment.create({ section: school.section._id, student: dropped._id, status: "dropped" });
  const unenrolled = await makeStudent("cy@example.test", "Cy", "Loner", "S-4");
  return { dropped, unenrolled };
}
