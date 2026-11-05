import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "../../helpers/server.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";
import { addPlan, createSchool, signIn, PRIVATE_NOTE } from "../../helpers/fixtures.js";

const uri = createTestDatabaseUri();

describe("student and parent views", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  let ctx;
  let school;
  let ada;
  let ben;
  let teacher;
  let parent;

  const api = (path, headers = {}) => fetch(`${ctx.baseUrl}/api/v1${path}`, { headers });

  before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    assert.equal(await connectDatabase({ uri, retries: 3, retryDelayMs: 1000 }), true);
    ctx = await startTestServer();
    school = await createSchool();
    ada = await signIn(ctx.baseUrl, "ada@example.test");
    ben = await signIn(ctx.baseUrl, "ben@example.test");
    teacher = await signIn(ctx.baseUrl, "teacher@example.test");
    parent = await signIn(ctx.baseUrl, "parent@example.test");
  });

  after(async () => {
    await ctx.close();
    await dropTestDatabase();
    await disconnectDatabase();
  });

  describe("GET /student/dashboard", () => {
    test("requires a student", async () => {
      assert.equal((await api("/student/dashboard")).status, 401);
      assert.equal((await api("/student/dashboard", teacher)).status, 403);
      assert.equal((await api("/student/dashboard", parent)).status, 403);
    });

    test("returns only the signed-in student's own data", async () => {
      const body = await (await api("/student/dashboard", ada)).json();
      assert.equal(body.student.firstName, "Ada");
      assert.equal(body.summary.currentGrade, 95);
      assert.equal(body.summary.attendance, 100);
      assert.deepEqual(body.grades, [{ id: String(school.section._id), subject: "Algebra I", grade: 95 }]);
      assert.deepEqual(body.goals.map((g) => [g.title, g.progress, g.status]), [["Keep an A", 80, "on-track"]]);
      assert.equal(body.teacherFeedback.message, "Great work");

      const other = await (await api("/student/dashboard", ben)).json();
      assert.equal(other.student.firstName, "Ben");
      assert.equal(other.summary.currentGrade, 50);
      assert.deepEqual(other.goals, []);
    });

    test("never exposes private teacher notes", async () => {
      const text = await (await api("/student/dashboard", ada)).text();
      assert.ok(!text.includes(PRIVATE_NOTE));
    });

    test("shows a remediation plan only after the teacher publishes it", async () => {
      await addPlan({ school, student: school.adaProfile, status: "pending_review", title: "Draft focus" });
      await addPlan({ school, student: school.adaProfile, status: "approved", title: "Reviewed, not shared" });
      let body = await (await api("/student/dashboard", ada)).json();
      assert.equal(body.supportPlan, null);

      await addPlan({ school, student: school.adaProfile, status: "published", title: "Strengthen fractions" });
      body = await (await api("/student/dashboard", ada)).json();
      assert.equal(body.supportPlan.focus, "Strengthen fractions");
      assert.equal(body.supportPlan.status, "approved");
      assert.equal(body.supportPlan.teacher, "Tess Teacher");
      assert.deepEqual(body.supportPlan.activities.map((a) => [a.title, a.schedule]), [["Practice fractions", "15 minutes daily"]]);
    });
  });

  describe("parent endpoints", () => {
    test("require a parent", async () => {
      assert.equal((await api("/parent/children")).status, 401);
      assert.equal((await api("/parent/children", ada)).status, 403);
    });

    test("list only linked children", async () => {
      const body = await (await api("/parent/children", parent)).json();
      assert.deepEqual(body.children, [{ id: String(school.adaProfile._id), name: "Ada Strong", gradeLevel: 9 }]);
    });

    test("show a linked child's dashboard without private notes", async () => {
      const res = await api(`/parent/children/${school.adaProfile._id}/dashboard`, parent);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.equal(JSON.parse(text).student.firstName, "Ada");
      assert.ok(!text.includes(PRIVATE_NOTE));
    });

    test("return 404 for an unlinked child or a malformed id", async () => {
      assert.equal((await api(`/parent/children/${school.benProfile._id}/dashboard`, parent)).status, 404);
      assert.equal((await api("/parent/children/not-an-id/dashboard", parent)).status, 404);
    });
  });
});
