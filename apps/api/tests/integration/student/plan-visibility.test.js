import { describe, test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "../../helpers/server.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";
import { createSchool, signIn } from "../../helpers/fixtures.js";
import { addRemediationPlan, addAiAuditLog, clearRemediation } from "../../helpers/remediationFixtures.js";

const uri = createTestDatabaseUri();

// Only a published remediation plan may reach a student or a linked parent (AC-12, AC-14).
describe("remediation plan visibility to students and parents", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  let ctx;
  let school;
  let ada;
  let parent;
  let teacher;

  const get = (path, auth) => fetch(`${ctx.baseUrl}/api/v1${path}`, { headers: auth });
  const studentDashboard = async () => (await get("/student/dashboard", ada)).json();
  const parentDashboard = async () =>
    (await get(`/parent/children/${school.adaProfile._id}/dashboard`, parent)).json();

  before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    assert.equal(await connectDatabase({ uri, retries: 3, retryDelayMs: 1000 }), true);
    ctx = await startTestServer();
    school = await createSchool();
    ada = await signIn(ctx.baseUrl, "ada@example.test");
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

  test("draft, pending review, approved, rejected and archived plans are hidden from both dashboards", async () => {
    const audit = await addAiAuditLog({ school });
    await addRemediationPlan({ school, status: "draft", title: "Secret draft" });
    await addRemediationPlan({ school, status: "pending_review", source: "ai", aiAudit: audit, title: "Secret pending" });
    await addRemediationPlan({ school, status: "approved", title: "Secret approved" });
    await addRemediationPlan({ school, status: "rejected", title: "Secret rejected" });
    await addRemediationPlan({ school, status: "archived", title: "Secret archived" });

    const student = await studentDashboard();
    const family = await parentDashboard();
    assert.equal(student.supportPlan, null);
    assert.equal(family.supportPlan, null);

    assert.ok(!JSON.stringify(student).includes("Secret"));
    assert.ok(!JSON.stringify(family).includes("Secret"));
  });

  test("a published plan appears on both dashboards", async () => {
    await addRemediationPlan({ school, status: "published", title: "Strengthen fractions" });

    assert.equal((await studentDashboard()).supportPlan.focus, "Strengthen fractions");
    assert.equal((await parentDashboard()).supportPlan.focus, "Strengthen fractions");
  });

  test("publishing through the teacher endpoint makes an approved plan visible", async () => {
    const plan = await addRemediationPlan({ school, status: "approved", title: "Approved then published" });
    assert.equal((await studentDashboard()).supportPlan, null);
    assert.equal((await parentDashboard()).supportPlan, null);

    const res = await fetch(
      `${ctx.baseUrl}/api/v1/teacher/students/${school.adaProfile._id}/remediation/${plan._id}/publish`,
      { method: "POST", headers: teacher },
    );
    assert.equal(res.status, 200);

    const student = await studentDashboard();
    assert.equal(student.supportPlan.focus, "Approved then published");
    assert.equal(student.supportPlan.status, "approved");
    assert.equal((await parentDashboard()).supportPlan.focus, "Approved then published");
  });

  test("a newer rejected plan never replaces the published plan on the dashboards", async () => {
    await addRemediationPlan({ school, status: "published", title: "Older published" });
    await addRemediationPlan({ school, status: "rejected", title: "Newer rejected" });
    assert.equal((await studentDashboard()).supportPlan.focus, "Older published");
    assert.equal((await parentDashboard()).supportPlan.focus, "Older published");
  });
});
