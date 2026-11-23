import { describe, test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "../../helpers/server.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";
import { createSchool, signIn } from "../../helpers/fixtures.js";
import { ProgressReport } from "../../../src/models/index.js";

const uri = createTestDatabaseUri();
const day = (d) => new Date(`2025-${d}T12:00:00Z`);

// GET /student/reports and GET /parent/children/:studentId/reports: only published progress reports, newest
// period first, with the class, teacher and dates, and nothing internal.
describe("student and parent progress reports", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  let ctx;
  let school;
  let ada;
  let ben;
  let parent;
  let teacher;

  const get = (path, auth) => fetch(`${ctx.baseUrl}/api/v1${path}`, { headers: auth });
  const own = async (auth = ada) => (await get("/student/reports", auth)).json();
  const family = (id = school.adaProfile._id, auth = parent) => get(`/parent/children/${id}/reports`, auth);
  const addReport = ({ student = school.adaProfile, status = "published", summary = "Doing well.", start = "09-01", end = "10-31" } = {}) =>
    ProgressReport.create({
      student: student._id,
      section: school.section._id,
      teacher: school.teacher._id,
      periodStart: day(start),
      periodEnd: day(end),
      summary,
      status,
      source: "teacher",
      ...(status === "published" ? { reviewedBy: school.teacher._id, reviewedAt: new Date(), publishedAt: new Date() } : {}),
    });

  before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    assert.equal(await connectDatabase({ uri, retries: 3, retryDelayMs: 1000 }), true);
    ctx = await startTestServer();
    school = await createSchool();
    ada = await signIn(ctx.baseUrl, "ada@example.test");
    ben = await signIn(ctx.baseUrl, "ben@example.test");
    parent = await signIn(ctx.baseUrl, "parent@example.test");
    teacher = await signIn(ctx.baseUrl, "teacher@example.test");
  });

  beforeEach(async () => {
    await ProgressReport.deleteMany({});
  });

  after(async () => {
    await ctx.close();
    await dropTestDatabase();
    await disconnectDatabase();
  });

  test("needs a token and the right role", async () => {
    assert.equal((await get("/student/reports")).status, 401);
    assert.equal((await get("/student/reports", parent)).status, 403);
    assert.equal((await get("/student/reports", teacher)).status, 403);
    assert.equal((await get(`/parent/children/${school.adaProfile._id}/reports`)).status, 401);
    assert.equal((await family(school.adaProfile._id, ada)).status, 403);
  });

  test("a parent only reaches a linked child: another student, an unknown id and a malformed id are 404", async () => {
    await addReport({ student: school.benProfile, summary: "Ben only" });
    assert.equal((await family(school.benProfile._id)).status, 404);
    assert.equal((await family("0".repeat(24))).status, 404);
    assert.equal((await family("not-an-id")).status, 404);
  });

  test("an empty list when nothing is published", async () => {
    assert.deepEqual(await own(), { reports: [] });
    assert.deepEqual(await (await family()).json(), { reports: [] });
  });

  test("never returns a draft or a pending-review report", async () => {
    await addReport({ status: "draft", summary: "Secret draft" });
    await addReport({ status: "pending_review", summary: "Secret pending" });
    const mine = JSON.stringify(await own());
    const theirs = JSON.stringify(await (await family()).json());
    for (const text of [mine, theirs]) {
      assert.ok(!text.includes("Secret"));
      assert.deepEqual(JSON.parse(text), { reports: [] });
    }
  });

  test("a published report shows the class, teacher, period and summary, and hides internal fields", async () => {
    await addReport({ summary: "Strong term.", start: "09-01", end: "10-31" });
    const { reports } = await own();
    assert.equal(reports.length, 1);
    const report = reports[0];
    assert.equal(report.className, "Algebra I");
    assert.equal(report.teacher, "Tess Teacher");
    assert.equal(report.periodStart, "2025-09-01");
    assert.equal(report.periodEnd, "2025-10-31");
    assert.equal(report.summary, "Strong term.");
    assert.ok(report.publishedAt);
    for (const hidden of ["status", "source", "reviewedBy", "reviewedAt", "aiAudit", "student", "studentId", "teacherId"]) {
      assert.ok(!(hidden in report), `${hidden} must not be returned`);
    }
  });

  test("lists the newest period first", async () => {
    await addReport({ summary: "Early", start: "01-01", end: "03-31" });
    await addReport({ summary: "Late", start: "09-01", end: "10-31" });
    await addReport({ summary: "Middle", start: "04-01", end: "06-30" });
    assert.deepEqual((await own()).reports.map((r) => r.summary), ["Late", "Middle", "Early"]);
  });

  test("a student sees only their own reports", async () => {
    await addReport({ summary: "Ada report" });
    await addReport({ student: school.benProfile, summary: "Ben report" });
    assert.deepEqual((await own(ada)).reports.map((r) => r.summary), ["Ada report"]);
    assert.deepEqual((await own(ben)).reports.map((r) => r.summary), ["Ben report"]);
  });

  test("the parent gets the same list as the student", async () => {
    await addReport({ summary: "Shared" });
    assert.deepEqual(await (await family()).json(), await own());
  });

  test("publishing through the teacher endpoint makes a report appear", async () => {
    const created = await fetch(`${ctx.baseUrl}/api/v1/teacher/students/${school.adaProfile._id}/reports`, {
      method: "POST",
      headers: { ...teacher, "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId: String(school.section._id), periodStart: "2025-10-01", periodEnd: "2025-10-31", summary: "Via the API." }),
    });
    const { report } = await created.json();
    assert.deepEqual((await own()).reports, [], "hidden while it is a draft");
    const publish = await fetch(`${ctx.baseUrl}/api/v1/teacher/students/${school.adaProfile._id}/reports/${report.id}/publish`, {
      method: "POST",
      headers: teacher,
    });
    assert.equal(publish.status, 200);
    assert.deepEqual((await own()).reports.map((r) => r.summary), ["Via the API."]);
    assert.deepEqual((await (await family()).json()).reports.map((r) => r.summary), ["Via the API."]);
  });
});
