import { describe, test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "../../helpers/server.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";
import { createSchool, signIn } from "../../helpers/fixtures.js";
import { ProgressReport, TeacherProfile, User } from "../../../src/models/index.js";

const uri = createTestDatabaseUri();
const PERIOD = { periodStart: "2025-10-01", periodEnd: "2025-10-31" };

// Teacher progress reports: create, edit, publish and delete a draft; a suggested summary from the data; and
// the rules around them (own reports only, assigned students only, a published report never changes).
describe("teacher progress reports", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  let ctx;
  let school;
  let teacher;
  let otherTeacher;
  let student;
  let parent;
  let otherProfile;

  const call = (method, path, { headers = teacher, body } = {}) =>
    fetch(`${ctx.baseUrl}/api/v1/teacher${path}`, {
      method,
      headers: { ...headers, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const adaPath = (suffix = "") => `/students/${school.adaProfile._id}/reports${suffix}`;
  const newBody = (extra = {}) => ({ sectionId: String(school.section._id), ...PERIOD, summary: "Ada is doing well.", ...extra });
  const create = async (extra = {}) => (await (await call("POST", adaPath(), { body: newBody(extra) })).json()).report;

  before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    assert.equal(await connectDatabase({ uri, retries: 3, retryDelayMs: 1000 }), true);
    ctx = await startTestServer();
    school = await createSchool();
    teacher = await signIn(ctx.baseUrl, "teacher@example.test");
    otherTeacher = await signIn(ctx.baseUrl, "other.teacher@example.test");
    student = await signIn(ctx.baseUrl, "ada@example.test");
    parent = await signIn(ctx.baseUrl, "parent@example.test");
    const otherUser = await User.findOne({ email: "other.teacher@example.test" });
    otherProfile = await TeacherProfile.findOne({ user: otherUser._id });
  });

  beforeEach(async () => {
    await ProgressReport.deleteMany({});
  });

  after(async () => {
    await ctx.close();
    await dropTestDatabase();
    await disconnectDatabase();
  });

  describe("access control", () => {
    test("every route needs a token and the teacher role", async () => {
      const routes = [
        ["GET", "/reports"],
        ["GET", adaPath(`/suggestion?sectionId=${school.section._id}&periodStart=2025-10-01&periodEnd=2025-10-31`)],
        ["POST", adaPath()],
        ["PUT", adaPath(`/${school.adaProfile._id}`)],
        ["POST", adaPath(`/${school.adaProfile._id}/publish`)],
        ["DELETE", adaPath(`/${school.adaProfile._id}`)],
      ];
      for (const [method, path] of routes) {
        assert.equal((await call(method, path, { headers: {} })).status, 401, `${method} ${path} without a token`);
        assert.equal((await call(method, path, { headers: student })).status, 403, `${method} ${path} as a student`);
        assert.equal((await call(method, path, { headers: parent })).status, 403, `${method} ${path} as a parent`);
      }
    });

    test("a student who is not assigned to the teacher, or a malformed id, is a 404 everywhere", async () => {
      assert.equal((await call("POST", adaPath(), { headers: otherTeacher, body: newBody() })).status, 404);
      assert.equal((await call("GET", adaPath("/suggestion?sectionId=x"), { headers: otherTeacher })).status, 404);
      assert.equal((await call("POST", "/students/not-an-id/reports", { body: newBody() })).status, 404);
    });
  });

  describe("creating a report", () => {
    test("creates a draft owned by the teacher, with the class, period and summary", async () => {
      const res = await call("POST", adaPath(), { body: newBody({ summary: "  Great progress.  " }) });
      assert.equal(res.status, 201);
      const { report } = await res.json();
      assert.equal(report.status, "draft");
      assert.equal(report.studentName, "Ada Strong");
      assert.equal(report.className, "Algebra I");
      assert.equal(report.periodStart, "2025-10-01");
      assert.equal(report.periodEnd, "2025-10-31");
      assert.equal(report.summary, "Great progress.");
      assert.equal(report.publishedAt, null);
      const stored = await ProgressReport.findById(report.id).lean();
      assert.equal(String(stored.teacher), String(school.teacher._id));
      assert.equal(stored.source, "teacher");
    });

    test("reports every invalid field at once and saves nothing", async () => {
      const res = await call("POST", adaPath(), { body: { periodStart: "2025-13-45", periodEnd: "", summary: "   " } });
      assert.equal(res.status, 400);
      const { fields } = await res.json();
      assert.deepEqual(Object.keys(fields).sort(), ["periodEnd", "periodStart", "sectionId", "summary"]);
      assert.equal(await ProgressReport.countDocuments(), 0);
    });

    test("the end date cannot be before the start date, and the summary has a length limit", async () => {
      const early = await call("POST", adaPath(), { body: newBody({ periodStart: "2025-10-31", periodEnd: "2025-10-01" }) });
      assert.equal(early.status, 400);
      assert.deepEqual(Object.keys((await early.json()).fields), ["periodEnd"]);
      const long = await call("POST", adaPath(), { body: newBody({ summary: "x".repeat(5001) }) });
      assert.equal(long.status, 400);
      assert.deepEqual(Object.keys((await long.json()).fields), ["summary"]);
    });

    test("the class must be one of the student's classes with this teacher", async () => {
      const res = await call("POST", adaPath(), { body: newBody({ sectionId: "0".repeat(24) }) });
      assert.equal(res.status, 400);
      assert.deepEqual((await res.json()).fields, { sectionId: "Invalid class" });
    });
  });

  describe("suggested summary", () => {
    const suggestion = (query) => call("GET", adaPath(`/suggestion?${new URLSearchParams(query)}`));

    test("is built from the grades, attendance and goals of the period", async () => {
      const res = await suggestion({ sectionId: String(school.section._id), ...PERIOD });
      assert.equal(res.status, 200);
      const { summary } = await res.json();
      assert.match(summary, /^Algebra I, Oct 1, 2025 to Oct 31, 2025\./);
      assert.match(summary, /Ada's average grade is 95% across 1 graded assignment\./);
      assert.match(summary, /Attendance is 100% \(0 absences, 0 tardies\)\./);
      assert.match(summary, /Active goals: Keep an A \(80% complete\)\./);
    });

    test("says so when the period has no graded work or attendance", async () => {
      const res = await suggestion({ sectionId: String(school.section._id), periodStart: "2024-01-01", periodEnd: "2024-01-31" });
      const { summary } = await res.json();
      assert.match(summary, /No graded work was recorded in this period\./);
      assert.match(summary, /No attendance was recorded in this period\./);
    });

    test("a student with a failing grade gets that stated plainly, with no invented causes", async () => {
      const res = await call("GET", `/students/${school.benProfile._id}/reports/suggestion?${new URLSearchParams({ sectionId: String(school.section._id), ...PERIOD })}`);
      const { summary } = await res.json();
      assert.match(summary, /Ben's average grade is 50%/);
      assert.match(summary, /Attendance is 0% \(1 absence, 0 tardies\)\./);
    });

    test("validates the query", async () => {
      const res = await suggestion({ periodStart: "nope" });
      assert.equal(res.status, 400);
      assert.deepEqual(Object.keys((await res.json()).fields).sort(), ["periodEnd", "periodStart", "sectionId"]);
    });
  });

  describe("listing", () => {
    test("is empty at first, then lists the teacher's reports with counts, and filters by status", async () => {
      const empty = await (await call("GET", "/reports")).json();
      assert.deepEqual(empty, { reports: [], counts: { draft: 0, pending_review: 0, published: 0 } });

      const a = await create({ summary: "First" });
      await create({ summary: "Second" });
      await call("POST", adaPath(`/${a.id}/publish`));

      const all = await (await call("GET", "/reports")).json();
      assert.equal(all.reports.length, 2);
      assert.deepEqual(all.counts, { draft: 1, pending_review: 0, published: 1 });
      assert.equal(all.reports[0].studentName, "Ada Strong");

      const drafts = await (await call("GET", "/reports?status=draft")).json();
      assert.deepEqual(drafts.reports.map((r) => r.summary), ["Second"]);
      assert.deepEqual(drafts.counts, { draft: 1, pending_review: 0, published: 1 }, "counts ignore the filter");
    });

    test("a bad status filter is a 400", async () => {
      const res = await call("GET", "/reports?status=archived");
      assert.equal(res.status, 400);
      assert.deepEqual((await res.json()).fields, { status: "Use draft, pending_review or published" });
    });

    test("never lists another teacher's reports, and a teacher with none sees none", async () => {
      await ProgressReport.create({
        student: school.adaProfile._id,
        section: school.section._id,
        teacher: otherProfile._id,
        periodStart: new Date("2025-10-01T12:00:00Z"),
        periodEnd: new Date("2025-10-31T12:00:00Z"),
        summary: "Another teacher's report",
        status: "draft",
      });
      assert.equal((await (await call("GET", "/reports")).json()).reports.length, 0);
      const theirs = await (await call("GET", "/reports", { headers: otherTeacher })).json();
      assert.deepEqual(theirs.reports.map((r) => r.summary), ["Another teacher's report"]);
    });
  });

  describe("editing, publishing and deleting", () => {
    test("a draft can be edited", async () => {
      const report = await create();
      const res = await call("PUT", adaPath(`/${report.id}`), { body: { periodStart: "2025-09-01", periodEnd: "2025-09-30", summary: "Revised." } });
      assert.equal(res.status, 200);
      const edited = (await res.json()).report;
      assert.deepEqual([edited.periodStart, edited.periodEnd, edited.summary, edited.status], ["2025-09-01", "2025-09-30", "Revised.", "draft"]);
    });

    test("editing validates and a bad edit changes nothing", async () => {
      const report = await create();
      const res = await call("PUT", adaPath(`/${report.id}`), { body: { periodStart: "2025-10-01", periodEnd: "2025-09-01", summary: "" } });
      assert.equal(res.status, 400);
      assert.equal((await ProgressReport.findById(report.id).lean()).summary, "Ada is doing well.");
    });

    test("publishing records the review and the time, and the report can then never change", async () => {
      const report = await create();
      const res = await call("POST", adaPath(`/${report.id}/publish`));
      assert.equal(res.status, 200);
      const published = (await res.json()).report;
      assert.equal(published.status, "published");
      assert.ok(published.publishedAt);
      const stored = await ProgressReport.findById(report.id).lean();
      assert.ok(stored.reviewedBy && stored.reviewedAt && stored.publishedAt);

      const body = { periodStart: "2025-10-01", periodEnd: "2025-10-31", summary: "Changed after publishing" };
      assert.equal((await call("PUT", adaPath(`/${report.id}`), { body })).status, 409);
      assert.equal((await call("POST", adaPath(`/${report.id}/publish`))).status, 409);
      assert.equal((await call("DELETE", adaPath(`/${report.id}`))).status, 409);
      assert.equal((await ProgressReport.findById(report.id).lean()).summary, "Ada is doing well.");
    });

    test("two simultaneous publishes: exactly one wins", async () => {
      const report = await create();
      const results = await Promise.all([1, 2, 3].map(() => call("POST", adaPath(`/${report.id}/publish`))));
      const statuses = results.map((r) => r.status).sort();
      assert.deepEqual(statuses, [200, 409, 409]);
    });

    test("a draft can be deleted, and then it is gone", async () => {
      const report = await create();
      const res = await call("DELETE", adaPath(`/${report.id}`));
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { deleted: true, id: report.id });
      assert.equal(await ProgressReport.countDocuments(), 0);
      assert.equal((await call("DELETE", adaPath(`/${report.id}`))).status, 404);
    });

    test("another teacher's report, an unknown id, a malformed id and another student's report are all 404", async () => {
      const foreign = await ProgressReport.create({
        student: school.adaProfile._id,
        section: school.section._id,
        teacher: otherProfile._id,
        periodStart: new Date("2025-10-01T12:00:00Z"),
        periodEnd: new Date("2025-10-31T12:00:00Z"),
        summary: "Not yours",
        status: "draft",
      });
      const mine = await create();
      const body = { periodStart: "2025-10-01", periodEnd: "2025-10-31", summary: "Hijack" };
      assert.equal((await call("PUT", adaPath(`/${foreign._id}`), { body })).status, 404);
      assert.equal((await call("POST", adaPath(`/${foreign._id}/publish`))).status, 404);
      assert.equal((await call("DELETE", adaPath(`/${foreign._id}`))).status, 404);
      assert.equal((await call("POST", adaPath(`/${"0".repeat(24)}/publish`))).status, 404);
      assert.equal((await call("PUT", adaPath("/not-an-id"), { body })).status, 404);
      // Ben's path with Ada's report id must not reach it.
      assert.equal((await call("POST", `/students/${school.benProfile._id}/reports/${mine.id}/publish`)).status, 404);
      assert.equal((await ProgressReport.findById(foreign._id).lean()).status, "draft");
      assert.equal((await ProgressReport.findById(mine.id).lean()).status, "draft");
    });
  });
});
