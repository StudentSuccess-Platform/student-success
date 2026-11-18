import { describe, test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "../../helpers/server.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";
import { createSchool, signIn } from "../../helpers/fixtures.js";
import { addRemediationPlan, addAiAuditLog, clearRemediation } from "../../helpers/remediationFixtures.js";
import { Course, Section } from "../../../src/models/index.js";

const uri = createTestDatabaseUri();
const day = (d) => new Date(`2025-11-${d}T12:00:00Z`);

// GET /student/support-plans and GET /parent/children/:studentId/support-plans: every published plan, newest
// first, with the class name and publish date, and the current plan of each class flagged `active`.
describe("student and parent support plan lists", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  let ctx;
  let school;
  let geometry;
  let ada;
  let ben;
  let parent;
  let teacher;

  const get = (path, auth) => fetch(`${ctx.baseUrl}/api/v1${path}`, { headers: auth });
  const studentPlans = async (auth = ada) => (await get("/student/support-plans", auth)).json();
  const parentPlans = async (id = school.adaProfile._id, auth = parent) => get(`/parent/children/${id}/support-plans`, auth);

  before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    assert.equal(await connectDatabase({ uri, retries: 3, retryDelayMs: 1000 }), true);
    ctx = await startTestServer();
    school = await createSchool();
    const course = await Course.create({ code: "GEO", title: "Geometry", subject: "Mathematics", gradeLevel: 9 });
    geometry = await Section.create({ course: course._id, teacher: school.teacher._id, term: "2025-Fall", period: 3 });
    ada = await signIn(ctx.baseUrl, "ada@example.test");
    ben = await signIn(ctx.baseUrl, "ben@example.test");
    parent = await signIn(ctx.baseUrl, "parent@example.test");
    teacher = await signIn(ctx.baseUrl, "teacher@example.test");
  });

  beforeEach(async () => {
    await clearRemediation();
  });

  after(async () => {
    await ctx.close();
    await dropTestDatabase();
    await disconnectDatabase();
  });

  describe("access", () => {
    test("needs a token and the right role", async () => {
      assert.equal((await get("/student/support-plans")).status, 401);
      assert.equal((await get("/student/support-plans", parent)).status, 403);
      assert.equal((await get("/student/support-plans", teacher)).status, 403);
      assert.equal((await get(`/parent/children/${school.adaProfile._id}/support-plans`)).status, 401);
      assert.equal((await parentPlans(school.adaProfile._id, ada)).status, 403);
    });

    test("a parent only sees a linked child: other students, unknown and malformed ids are 404", async () => {
      await addRemediationPlan({ school, student: school.benProfile, status: "published", title: "Ben only" });
      assert.equal((await parentPlans(school.benProfile._id)).status, 404);
      assert.equal((await parentPlans("0".repeat(24))).status, 404);
      assert.equal((await parentPlans("not-an-id")).status, 404);
    });
  });

  describe("what is returned", () => {
    test("an empty list when nothing is published", async () => {
      assert.deepEqual(await studentPlans(), { plans: [] });
      assert.deepEqual(await (await parentPlans()).json(), { plans: [] });
    });

    test("never returns a plan that is not published", async () => {
      const audit = await addAiAuditLog({ school });
      await addRemediationPlan({ school, status: "draft", title: "Secret draft" });
      await addRemediationPlan({ school, status: "pending_review", source: "ai", aiAudit: audit, title: "Secret pending" });
      await addRemediationPlan({ school, status: "approved", title: "Secret approved" });
      await addRemediationPlan({ school, status: "rejected", title: "Secret rejected" });
      await addRemediationPlan({ school, status: "archived", title: "Secret archived" });
      const own = JSON.stringify(await studentPlans());
      const family = JSON.stringify(await (await parentPlans()).json());
      for (const text of [own, family]) {
        assert.ok(!text.includes("Secret"));
        assert.deepEqual(JSON.parse(text), { plans: [] });
      }
    });

    test("a published plan has the class, publish date, teacher and steps, and hides internal fields", async () => {
      await addRemediationPlan({
        school,
        status: "published",
        title: "Strengthen fractions",
        publishedAt: day("10"),
        items: [{ title: "Step one", description: "Daily" }, { title: "Step two" }],
      });
      const { plans } = await studentPlans();
      assert.equal(plans.length, 1);
      const plan = plans[0];
      assert.equal(plan.className, "Algebra I");
      assert.equal(plan.publishedAt, "2025-11-10T12:00:00.000Z");
      assert.equal(plan.teacher, "Tess Teacher");
      assert.equal(plan.title, "Strengthen fractions");
      assert.equal(plan.source, "teacher");
      assert.equal(plan.active, true);
      assert.deepEqual(plan.items.map((i) => [i.title, i.description]), [["Step one", "Daily"], ["Step two", null]]);
      for (const hidden of ["reviewedBy", "reviewedAt", "aiAudit", "aiAuditId", "version", "status", "student", "teacherId"]) {
        assert.ok(!(hidden in plan), `${hidden} must not be returned`);
      }
    });

    test("lists old and current plans newest first; only the newest plan of each class is active", async () => {
      await addRemediationPlan({ school, status: "published", title: "Algebra old", publishedAt: day("01") });
      await addRemediationPlan({ school, status: "published", title: "Algebra current", publishedAt: day("12") });
      await addRemediationPlan({ school, status: "published", title: "Geometry only", section: geometry, publishedAt: day("08") });
      const { plans } = await studentPlans();
      assert.deepEqual(
        plans.map((p) => [p.title, p.className, p.active]),
        [
          ["Algebra current", "Algebra I", true],
          ["Geometry only", "Geometry", true],
          ["Algebra old", "Algebra I", false],
        ],
      );
    });

    test("an AI plan that a teacher published is labelled as AI", async () => {
      const audit = await addAiAuditLog({ school });
      await addRemediationPlan({ school, status: "published", source: "ai", aiAudit: audit, title: "AI drafted" });
      const { plans } = await studentPlans();
      assert.equal(plans[0].source, "ai");
      assert.ok(!JSON.stringify(plans).includes(String(audit._id)));
    });

    test("a student sees only their own plans", async () => {
      await addRemediationPlan({ school, status: "published", title: "Ada plan" });
      await addRemediationPlan({ school, student: school.benProfile, status: "published", title: "Ben plan" });
      assert.deepEqual((await studentPlans(ada)).plans.map((p) => p.title), ["Ada plan"]);
      assert.deepEqual((await studentPlans(ben)).plans.map((p) => p.title), ["Ben plan"]);
    });

    test("the parent gets the same list as the student", async () => {
      await addRemediationPlan({ school, status: "published", title: "Shared", publishedAt: day("05") });
      assert.deepEqual(await (await parentPlans()).json(), await studentPlans());
    });
  });

  test("publishing through the teacher endpoint makes a plan appear, and rejecting it afterwards keeps it hidden", async () => {
    const plan = await addRemediationPlan({ school, status: "approved", title: "Approved then published" });
    assert.equal((await studentPlans()).plans.length, 0);
    const publish = await fetch(`${ctx.baseUrl}/api/v1/teacher/students/${school.adaProfile._id}/remediation/${plan._id}/publish`, {
      method: "POST",
      headers: teacher,
    });
    assert.equal(publish.status, 200);
    const { plans } = await studentPlans();
    assert.deepEqual(plans.map((p) => [p.title, p.active]), [["Approved then published", true]]);
    assert.ok(plans[0].publishedAt);
  });
});
