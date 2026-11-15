import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";
import { createSchool } from "../../helpers/fixtures.js";
import { getAssignedStudent, requireStudentSection } from "../../../src/services/access/teacherAccess.js";
import { Enrollment, StudentProfile, User } from "../../../src/models/index.js";

const uri = createTestDatabaseUri();

describe("assigned-student access", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  let school;
  let outsider;
  let otherTeacherUser;

  before(async () => {
    assert.equal(await connectDatabase({ uri, retries: 3, retryDelayMs: 1000 }), true);
    school = await createSchool();
    otherTeacherUser = await User.findOne({ email: "other.teacher@example.test" });
    const user = await User.create({ email: "outsider@example.test", firstName: "Olly", lastName: "Outsider", roles: ["student"] });
    outsider = await StudentProfile.create({ user: user._id, studentNumber: "S-9", gradeLevel: 9 });
  });

  after(async () => {
    await dropTestDatabase();
    await disconnectDatabase();
  });

  const teacherUserId = () => school.teacher.user;

  test("returns the student, teacher and sections for an assigned student", async () => {
    const access = await getAssignedStudent(teacherUserId(), school.adaProfile._id);
    assert.equal(String(access.student._id), String(school.adaProfile._id));
    assert.equal(access.student.user.firstName, "Ada");
    assert.deepEqual(access.sectionIds.map(String), [String(school.section._id)]);
  });

  test("denies a student who is not enrolled with this teacher", async () => {
    await assert.rejects(getAssignedStudent(teacherUserId(), outsider._id), { status: 404 });
  });

  test("denies another teacher, a malformed id, and a teacher with no profile", async () => {
    await assert.rejects(getAssignedStudent(otherTeacherUser._id, school.adaProfile._id), { status: 404 });
    await assert.rejects(getAssignedStudent(teacherUserId(), "not-an-id"), { status: 404 });
    await assert.rejects(getAssignedStudent(school.ada._id, school.adaProfile._id), { status: 404 });
  });

  test("ignores dropped enrollments", async () => {
    await Enrollment.updateOne({ student: school.benProfile._id }, { status: "dropped" });
    await assert.rejects(getAssignedStudent(teacherUserId(), school.benProfile._id), { status: 404 });
    await Enrollment.updateOne({ student: school.benProfile._id }, { status: "active" });
  });

  test("requireStudentSection accepts the student's section and rejects others with field errors", async () => {
    const access = await getAssignedStudent(teacherUserId(), school.adaProfile._id);
    assert.equal(String(requireStudentSection(access, String(school.section._id))), String(school.section._id));
    assert.throws(() => requireStudentSection(access, String(outsider._id)), (err) => {
      assert.equal(err.status, 400);
      assert.deepEqual(err.extra, { fields: { sectionId: "Invalid class" } });
      return true;
    });
  });
});
