import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "../../helpers/server.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";
import { createSchool, signIn, PASSWORD } from "../../helpers/fixtures.js";
import { Course, Section, Enrollment, StudentProfile, User } from "../../../src/models/index.js";

const uri = createTestDatabaseUri();

describe("POST /teacher/classes/:classId/students (add a student to a class)", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  let ctx;
  let school;
  let teacher;
  let otherTeacher;
  let student;
  let secondSection;

  const url = (classId = school.section._id) => `${ctx.baseUrl}/api/v1/teacher/classes/${classId}/students`;
  const add = (body, { headers = teacher, classId } = {}) =>
    fetch(url(classId), { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const get = (path, headers = teacher) => fetch(`${ctx.baseUrl}/api/v1/teacher${path}`, { headers });
  const kid = (extra = {}) => ({ firstName: "Mia", lastName: "Rivera", gradeLevel: 9, ...extra });

  before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    assert.equal(await connectDatabase({ uri, retries: 3, retryDelayMs: 1000 }), true);
    ctx = await startTestServer();
    school = await createSchool();
    const course = await Course.create({ code: "GEO", title: "Geometry", subject: "Mathematics", gradeLevel: 9 });
    secondSection = await Section.create({ course: course._id, teacher: school.teacher._id, term: "2025-Fall", period: 3 });
    teacher = await signIn(ctx.baseUrl, "teacher@example.test");
    otherTeacher = await signIn(ctx.baseUrl, "other.teacher@example.test");
    student = await signIn(ctx.baseUrl, "ada@example.test");
  });

  after(async () => {
    await ctx.close();
    await dropTestDatabase();
    await disconnectDatabase();
  });

  describe("access control", () => {
    test("needs a token and the teacher role", async () => {
      assert.equal((await add(kid(), { headers: {} })).status, 401);
      assert.equal((await add(kid(), { headers: student })).status, 403);
    });

    test("another teacher's class, a malformed id and an unknown id are all 404", async () => {
      assert.equal((await add(kid(), { headers: otherTeacher })).status, 404);
      assert.equal((await add(kid(), { classId: "not-an-id" })).status, 404);
      assert.equal((await add(kid(), { classId: "0".repeat(24) })).status, 404);
    });
  });

  describe("validation", () => {
    test("reports every invalid field and creates nothing", async () => {
      const before = await User.countDocuments();
      const res = await add({ firstName: " ", gradeLevel: 13, email: "nope", allowDuplicate: "yes" });
      assert.equal(res.status, 400);
      const { fields } = await res.json();
      assert.deepEqual(Object.keys(fields).sort(), ["allowDuplicate", "email", "firstName", "gradeLevel", "lastName"]);
      assert.equal(await User.countDocuments(), before);
    });

    test("grade level must be a whole number from 1 to 12 (numeric strings are accepted)", async () => {
      for (const gradeLevel of [0, 1.5, "abc", null]) {
        assert.equal((await add(kid({ gradeLevel }))).status, 400, String(gradeLevel));
      }
      const ok = await add(kid({ firstName: "Grade", lastName: "String", gradeLevel: "10" }));
      assert.equal(ok.status, 201);
      assert.equal((await ok.json()).student.gradeLevel, 10);
    });
  });

  describe("creating a student", () => {
    test("creates an invited student with no email and enrols them", async () => {
      const res = await add(kid({ firstName: "  Noah ", lastName: "Okafor" }));
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.created, true);
      assert.equal(body.student.name, "Noah Okafor");
      assert.equal(body.student.hasEmail, false);
      assert.equal(body.student.accountStatus, "invited");
      assert.deepEqual(body.class, { id: String(school.section._id), name: "Algebra I" });
      assert.match(body.student.studentNumber, /^S\d+$/);

      const profile = await StudentProfile.findById(body.student.id).lean();
      const user = await User.findById(profile.user).select("+passwordHash").lean();
      assert.equal(user.email, undefined);
      assert.equal(user.status, "invited");
      assert.equal(user.passwordHash, undefined);
      assert.deepEqual(user.roles, ["student"]);
      const enrollment = await Enrollment.findById(body.enrollmentId).lean();
      assert.equal(String(enrollment.section), String(school.section._id));
      assert.equal(enrollment.status, "active");
    });

    test("any number of students can have no email (the unique email index only applies when set)", async () => {
      for (const lastName of ["Alpha", "Beta", "Gamma"]) {
        assert.equal((await add(kid({ firstName: "Blank", lastName }))).status, 201);
      }
    });

    test("student numbers are unique and increase", async () => {
      const a = await (await add(kid({ firstName: "Num", lastName: "One" }))).json();
      const b = await (await add(kid({ firstName: "Num", lastName: "Two" }))).json();
      assert.notEqual(a.student.studentNumber, b.student.studentNumber);
      assert.ok(Number(b.student.studentNumber.slice(1)) > Number(a.student.studentNumber.slice(1)));
    });

    test("an optional email is stored lower-cased, and a taken email is a 409 field error", async () => {
      const res = await add(kid({ firstName: "Mail", lastName: "Person", email: " Mail.Person@Example.Test " }));
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.student.hasEmail, true);
      const profile = await StudentProfile.findById(body.student.id).lean();
      assert.equal((await User.findById(profile.user).lean()).email, "mail.person@example.test");

      const again = await add(kid({ firstName: "Other", lastName: "Person", email: "mail.person@example.test" }));
      assert.equal(again.status, 409);
      assert.deepEqual((await again.json()).fields, { email: "Already in use" });
      assert.equal((await add(kid({ firstName: "Clash", lastName: "Ada", email: "ada@example.test" }))).status, 409);
      assert.equal(await User.countDocuments({ firstName: "Other", lastName: "Person" }), 0, "no half-created user is left behind");
    });

    test("the new student shows in the roster, the class, and opens as a profile", async () => {
      const body = await (await add(kid({ firstName: "Roster", lastName: "Visible" }))).json();
      const list = await (await get("/students")).json();
      const row = list.students.find((s) => s.id === body.student.id);
      assert.ok(row);
      assert.deepEqual(row.classNames, ["Algebra I"]);
      assert.equal(row.averageGrade, null);
      const detail = await get(`/classes/${school.section._id}`);
      assert.equal(detail.status, 200);
      assert.match(await detail.text(), /Roster Visible/);
      const profile = await get(`/students/${body.student.id}`);
      assert.equal(profile.status, 200);
      assert.equal((await profile.json()).student.name, "Roster Visible");
    });

    test("the other teacher cannot see the new student", async () => {
      const body = await (await add(kid({ firstName: "Private", lastName: "Kid" }))).json();
      assert.equal((await get(`/students/${body.student.id}`, otherTeacher)).status, 404);
      const list = await (await get("/students", otherTeacher)).json();
      assert.equal(list.students.length, 0);
    });

    test("an invited student cannot sign in, and a password reset finds nobody", async () => {
      const body = await (await add(kid({ firstName: "Invited", lastName: "Only", email: "invited.only@example.test" }))).json();
      assert.ok(body.student.id);
      const login = await fetch(`${ctx.baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "invited.only@example.test", password: PASSWORD }),
      });
      assert.equal(login.status, 401);
      const user = await User.findOne({ email: "invited.only@example.test" }).lean();
      await fetch(`${ctx.baseUrl}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "invited.only@example.test" }),
      });
      assert.equal((await User.findById(user._id).select("+passwordResetHash").lean()).passwordResetHash, undefined);
    });
  });

  describe("duplicate guard (same first name, last name and grade level)", () => {
    test("blocks with the matches, ignoring case, and creates nothing", async () => {
      const before = await StudentProfile.countDocuments();
      const res = await add({ firstName: "ADA", lastName: "strong", gradeLevel: 9 });
      assert.equal(res.status, 409);
      const body = await res.json();
      assert.equal(body.code, "POSSIBLE_DUPLICATE");
      assert.equal(body.matches.length, 1);
      assert.equal(body.matches[0].id, String(school.adaProfile._id));
      assert.equal(body.matches[0].alreadyInClass, true);
      assert.equal(await StudentProfile.countDocuments(), before);
    });

    test("the same name in a different grade is not a duplicate", async () => {
      assert.equal((await add({ firstName: "Ada", lastName: "Strong", gradeLevel: 10 })).status, 201);
    });

    test("allowDuplicate creates a second student with that name", async () => {
      const res = await add({ firstName: "Ada", lastName: "Strong", gradeLevel: 9, allowDuplicate: true });
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.notEqual(body.student.id, String(school.adaProfile._id));
    });

    test("existingStudentId enrols the matched student in another class instead of duplicating", async () => {
      const before = await StudentProfile.countDocuments();
      const res = await add(
        { firstName: "Ben", lastName: "Behind", gradeLevel: 9, existingStudentId: String(school.benProfile._id) },
        { classId: secondSection._id },
      );
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.created, false);
      assert.equal(body.student.id, String(school.benProfile._id));
      assert.equal(await StudentProfile.countDocuments(), before);
      assert.equal(await Enrollment.countDocuments({ section: secondSection._id, student: school.benProfile._id, status: "active" }), 1);
    });

    test("enrolling a student who is already in the class is a 409 ALREADY_ENROLLED", async () => {
      const res = await add({ firstName: "Ada", lastName: "Strong", gradeLevel: 9, existingStudentId: String(school.adaProfile._id) });
      assert.equal(res.status, 409);
      assert.equal((await res.json()).code, "ALREADY_ENROLLED");
    });

    test("a dropped enrolment is reactivated", async () => {
      await Enrollment.updateOne({ section: school.section._id, student: school.benProfile._id }, { status: "dropped" });
      const res = await add({ firstName: "Ben", lastName: "Behind", gradeLevel: 9, existingStudentId: String(school.benProfile._id) });
      assert.equal(res.status, 200);
      assert.equal((await Enrollment.findOne({ section: school.section._id, student: school.benProfile._id }).lean()).status, "active");
    });

    test("existingStudentId must be one of the matches: other students cannot be enrolled by id", async () => {
      const res = await add({ firstName: "Someone", lastName: "Else", gradeLevel: 9, existingStudentId: String(school.adaProfile._id) });
      assert.equal(res.status, 400);
      assert.deepEqual((await res.json()).fields, { existingStudentId: "Not the same name and grade" });
      assert.equal((await add(kid({ existingStudentId: "bad" }))).status, 400);
    });

    test("existingStudentId and allowDuplicate together are rejected", async () => {
      const res = await add({ firstName: "Ada", lastName: "Strong", gradeLevel: 9, existingStudentId: String(school.adaProfile._id), allowDuplicate: true });
      assert.equal(res.status, 400);
    });
  });
});
