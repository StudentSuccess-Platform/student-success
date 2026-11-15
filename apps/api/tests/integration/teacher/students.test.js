import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "../../helpers/server.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";
import { createSchool, signIn, PRIVATE_NOTE } from "../../helpers/fixtures.js";
import { addUngradedAssignment, addUnassignedStudents } from "../../helpers/studentsFixtures.js";

const uri = createTestDatabaseUri();

describe("teacher students", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  let ctx;
  let school;
  let teacher;
  let otherTeacher;
  let student;
  let unassigned;

  const get = (path, headers = {}) => fetch(`${ctx.baseUrl}/api/v1/teacher${path}`, { headers });

  before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    assert.equal(await connectDatabase({ uri, retries: 3, retryDelayMs: 1000 }), true);
    ctx = await startTestServer();
    school = await createSchool();
    await addUngradedAssignment(school);
    unassigned = await addUnassignedStudents(school);
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
    test("requires a token", async () => {
      assert.equal((await get("/students")).status, 401);
      assert.equal((await get(`/students/${school.adaProfile._id}`)).status, 401);
    });

    test("rejects students", async () => {
      assert.equal((await get("/students", student)).status, 403);
      assert.equal((await get(`/students/${school.adaProfile._id}`, student)).status, 403);
    });
  });

  describe("GET /students", () => {
    test("lists only assigned students, sorted by name, with summary fields", async () => {
      const res = await get("/students", teacher);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.doesNotMatch(text, new RegExp(PRIVATE_NOTE));
      const body = JSON.parse(text);

      assert.deepEqual(body, {
        students: [
          {
            id: String(school.adaProfile._id),
            name: "Ada Strong",
            gradeLevel: 9,
            classNames: ["Algebra I"],
            averageGrade: 95,
            attendanceRate: 100,
            needsIntervention: false,
          },
          {
            id: String(school.benProfile._id),
            name: "Ben Behind",
            gradeLevel: 9,
            classNames: ["Algebra I"],
            averageGrade: 50,
            attendanceRate: 0,
            needsIntervention: true,
          },
        ],
      });
    });

    test("excludes dropped and unenrolled students", async () => {
      const ids = (await (await get("/students", teacher)).json()).students.map((s) => s.id);
      assert.equal(ids.includes(String(unassigned.dropped._id)), false);
      assert.equal(ids.includes(String(unassigned.unenrolled._id)), false);
    });

    test("returns an empty list for a teacher with no classes", async () => {
      const res = await get("/students", otherTeacher);
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { students: [] });
    });
  });

  describe("GET /students/:studentId", () => {
    test("returns the profile for an assigned student", async () => {
      const res = await get(`/students/${school.adaProfile._id}`, teacher);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.doesNotMatch(text, new RegExp(PRIVATE_NOTE));
      // The signed-in user id must never leak (GoalUpdate.author is a User id).
      assert.equal(text.includes(String(school.ada._id)), false);
      const body = JSON.parse(text);

      assert.deepEqual(Object.keys(body).sort(), [
        "attendance",
        "classes",
        "feedback",
        "goals",
        "grades",
        "performanceTrend",
        "student",
        "summary",
      ]);
      assert.deepEqual(body.student, {
        id: String(school.adaProfile._id),
        name: "Ada Strong",
        gradeLevel: 9,
        studentNumber: "S-1",
      });
      assert.deepEqual(body.classes, [
        { id: String(school.section._id), name: "Algebra I", period: "Period 2", room: "Room 12" },
      ]);
      assert.deepEqual(body.summary, {
        averageGrade: 95,
        attendanceRate: 100,
        needsIntervention: false,
        reason: null,
      });
      assert.deepEqual(body.performanceTrend, [{ label: "Oct", value: 95 }]);
    });

    test("lists every assignment, newest due date first, with ungraded rows empty", async () => {
      const body = await (await get(`/students/${school.adaProfile._id}`, teacher)).json();
      assert.deepEqual(
        body.grades.map((g) => [g.title, g.pointsEarned, g.status, g.pointsPossible, g.category]),
        [
          ["Quiz 2", null, null, 20, "quiz"],
          ["Unit Test", 95, "graded", 100, "test"],
        ],
      );
      assert.equal(body.grades[0].className, "Algebra I");
      assert.equal(body.grades[0].sectionId, String(school.section._id));
      assert.equal(body.grades[0].dueDate, "2025-11-01T12:00:00.000Z");
    });

    test("returns attendance records, goals with progress and updates, and feedback", async () => {
      const body = await (await get(`/students/${school.adaProfile._id}`, teacher)).json();

      assert.deepEqual(body.attendance.rate, 100);
      assert.deepEqual(body.attendance.records.map((r) => [r.date, r.status, r.className]), [
        ["2025-10-01T12:00:00.000Z", "present", "Algebra I"],
      ]);

      assert.equal(body.goals.length, 1);
      const [goal] = body.goals;
      assert.equal(goal.title, "Keep an A");
      assert.equal(goal.status, "active");
      assert.equal(goal.progress, 80);
      assert.deepEqual(goal.updates.map((u) => [u.note, u.progressPercent]), [["Going well", 80]]);
      assert.equal("author" in goal.updates[0], false);

      assert.deepEqual(body.feedback.map((f) => [f.body, f.className, f.sectionId]), [
        ["Great work", "Algebra I", String(school.section._id)],
      ]);
    });

    test("hides students who are not assigned to this teacher behind a 404", async () => {
      const cases = [
        [`/students/${unassigned.dropped._id}`, teacher],
        [`/students/${unassigned.unenrolled._id}`, teacher],
        [`/students/${school.adaProfile._id}`, otherTeacher],
        ["/students/not-an-id", teacher],
      ];
      for (const [path, headers] of cases) {
        const res = await get(path, headers);
        assert.equal(res.status, 404, path);
        assert.deepEqual(await res.json(), { error: "Student not found" });
      }
    });
  });
});
