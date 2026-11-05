import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "../../helpers/server.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";
import { createSchool, signIn } from "../../helpers/fixtures.js";

const uri = createTestDatabaseUri();

describe("teacher views", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  let ctx;
  let school;
  let teacher;
  let otherTeacher;
  let student;

  const get = (path, headers = {}) => fetch(`${ctx.baseUrl}/api/v1/teacher${path}`, { headers });

  before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    assert.equal(await connectDatabase({ uri, retries: 3, retryDelayMs: 1000 }), true);
    ctx = await startTestServer();
    school = await createSchool();
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
      assert.equal((await get("/dashboard")).status, 401);
    });

    test("rejects non-teachers", async () => {
      assert.equal((await get("/dashboard", student)).status, 403);
      assert.equal((await get("/classes", student)).status, 403);
    });

    test("protects the recommendations endpoint", async () => {
      const res = await fetch(`${ctx.baseUrl}/api/v1/teacher/recommendations`, { method: "POST" });
      assert.equal(res.status, 401);
    });

    test("keeps the unversioned alias working", async () => {
      const res = await fetch(`${ctx.baseUrl}/api/teacher/classes`, { headers: teacher });
      assert.equal(res.status, 200);
    });
  });

  describe("GET /dashboard", () => {
    test("returns the contract the frontend expects, computed from the data", async () => {
      const res = await get("/dashboard", teacher);
      assert.equal(res.status, 200);
      const body = await res.json();

      assert.deepEqual(Object.keys(body).sort(), [
        "attendanceOverview",
        "interventions",
        "performanceTrend",
        "recentActivity",
        "summary",
      ]);
      assert.deepEqual(body.summary, {
        totalClasses: 1,
        totalStudents: 2,
        studentsNeedingIntervention: 1,
        averageAttendance: 50,
      });
      assert.deepEqual(body.performanceTrend, [{ label: "Oct", value: 73 }]);
      assert.deepEqual(body.attendanceOverview, { overallRate: 50, classes: [{ name: "Algebra I", rate: 50 }] });
      assert.equal(body.interventions.length, 1);
      assert.equal(body.interventions[0].name, "Ben Behind");
      assert.equal(body.interventions[0].className, "Algebra I");
      assert.match(body.interventions[0].reason, /Average grade 50%/);
      assert.equal(body.interventions[0].severity, "high");
      assert.match(body.recentActivity[0].description, /Unit Test/);
    });

    test("returns an empty dashboard for a teacher with no classes", async () => {
      const body = await (await get("/dashboard", otherTeacher)).json();
      assert.equal(body.summary.totalClasses, 0);
      assert.deepEqual(body.interventions, []);
    });
  });

  describe("GET /classes", () => {
    test("lists only this teacher's classes", async () => {
      const body = await (await get("/classes", teacher)).json();
      assert.deepEqual(body, {
        classes: [{ id: String(school.section._id), name: "Algebra I", period: "Period 2", room: "Room 12", studentCount: 2 }],
      });
      assert.deepEqual(await (await get("/classes", otherTeacher)).json(), { classes: [] });
    });
  });

  describe("GET /classes/:classId", () => {
    test("returns the roster with grades and attendance", async () => {
      const res = await get(`/classes/${school.section._id}`, teacher);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.class.name, "Algebra I");
      assert.deepEqual(
        body.students.map((s) => [s.name, s.averageGrade, s.attendanceRate]),
        [
          ["Ada Strong", 95, 100],
          ["Ben Behind", 50, 0],
        ],
      );
      assert.equal(body.classAverage, 73);
    });

    test("hides other teachers' classes and bad ids behind a 404", async () => {
      assert.equal((await get(`/classes/${school.section._id}`, otherTeacher)).status, 404);
      assert.equal((await get("/classes/not-an-id", teacher)).status, 404);
    });
  });
});
