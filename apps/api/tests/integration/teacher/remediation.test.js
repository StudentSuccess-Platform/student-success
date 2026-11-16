import { describe, test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { startTestServer } from "../../helpers/server.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";
import { createSchool, signIn } from "../../helpers/fixtures.js";
import { addRemediationPlan, addAiAuditLog, clearRemediation } from "../../helpers/remediationFixtures.js";
import { RemediationPlan, RemediationItem, AiAuditLog } from "../../../src/models/index.js";

const uri = createTestDatabaseUri();

describe("teacher remediation workflow", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  let ctx;
  let school;
  let teacher;
  let otherTeacher;
  let student;

  const call = (method, path, auth, body) =>
    fetch(`${ctx.baseUrl}/api/v1/teacher${path}`, {
      method,
      headers: { ...auth, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  const planPath = (planId, action = "") =>
    `/students/${school.adaProfile._id}/remediation/${planId}${action ? `/${action}` : ""}`;
  const listPath = () => `/students/${school.adaProfile._id}/remediation`;
  const dbPlan = (id) => RemediationPlan.findById(id).lean();

  before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    assert.equal(await connectDatabase({ uri, retries: 3, retryDelayMs: 1000 }), true);
    ctx = await startTestServer();
    school = await createSchool();
    teacher = await signIn(ctx.baseUrl, "teacher@example.test");
    otherTeacher = await signIn(ctx.baseUrl, "other.teacher@example.test");
    student = await signIn(ctx.baseUrl, "ada@example.test");
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
    test("requires a signed-in teacher", async () => {
      assert.equal((await call("GET", listPath())).status, 401);
      assert.equal((await call("POST", listPath(), {}, { title: "x" })).status, 401);
      assert.equal((await call("GET", listPath(), student)).status, 403);
    });

    test("another student's plan is 404 through this student's path", async () => {
      const benPlan = await addRemediationPlan({ school, student: school.benProfile, title: "Ben only" });
      assert.equal((await call("PUT", planPath(benPlan._id), teacher, { title: "Hijacked" })).status, 404);
      assert.equal((await call("POST", planPath(benPlan._id, "approve"), teacher)).status, 404);
      assert.equal((await call("POST", planPath(benPlan._id, "publish"), teacher)).status, 404);
      const unchanged = await dbPlan(benPlan._id);
      assert.equal(unchanged.title, "Ben only");
      assert.equal(unchanged.status, "draft");

      const adaList = await (await call("GET", listPath(), teacher)).json();
      assert.deepEqual(adaList.plans, []);
    });

    test("a teacher not assigned to the student gets 404 on every endpoint", async () => {
      const plan = await addRemediationPlan({ school });
      assert.equal((await call("GET", listPath(), otherTeacher)).status, 404);
      assert.equal((await call("POST", listPath(), otherTeacher, { sectionId: String(school.section._id), title: "x" })).status, 404);
      assert.equal((await call("PUT", planPath(plan._id), otherTeacher, { title: "x" })).status, 404);
      assert.equal((await call("POST", planPath(plan._id, "approve"), otherTeacher)).status, 404);
      assert.equal((await call("POST", planPath(plan._id, "reject"), otherTeacher, {})).status, 404);
      assert.equal((await call("POST", planPath(plan._id, "publish"), otherTeacher)).status, 404);
      assert.equal((await dbPlan(plan._id)).status, "draft");
    });

    test("malformed ids never produce a server error", async () => {
      assert.equal((await call("GET", "/students/not-an-id/remediation", teacher)).status, 404);
      assert.equal((await call("PUT", planPath("not-an-id"), teacher, { title: "x" })).status, 404);
      assert.equal((await call("POST", planPath("123", "approve"), teacher)).status, 404);
      assert.equal((await call("POST", planPath("zzzzzzzzzzzzzzzzzzzzzzzz", "publish"), teacher)).status, 404);
    });
  });

  describe("manual create", () => {
    test("creates a draft teacher plan with items", async () => {
      const res = await call("POST", listPath(), teacher, {
        sectionId: String(school.section._id),
        title: "  Strengthen fractions  ",
        rationale: "Practice equivalent fractions.",
        items: [{ title: "Practice fractions", description: "15 minutes daily" }, { title: "Quiz on Friday" }],
      });
      assert.equal(res.status, 201);
      const { plan } = await res.json();
      assert.equal(plan.title, "Strengthen fractions");
      assert.equal(plan.status, "draft");
      assert.equal(plan.source, "teacher");
      assert.equal(plan.studentId, String(school.adaProfile._id));
      assert.equal(plan.sectionId, String(school.section._id));
      assert.equal(plan.className, "Algebra I");
      assert.equal(plan.aiAuditId, null);
      assert.equal(plan.reviewedAt, null);
      assert.equal(plan.publishedAt, null);
      assert.deepEqual(plan.items.map((i) => [i.title, i.description]), [
        ["Practice fractions", "15 minutes daily"],
        ["Quiz on Friday", null],
      ]);
      assert.ok(plan.items.every((i) => typeof i.id === "string"));

      const stored = await dbPlan(plan.id);
      assert.equal(String(stored.teacher), String(school.teacher._id));
      assert.equal(await RemediationItem.countDocuments({ plan: plan.id }), 2);
    });

    test("creates a plan with no items", async () => {
      const res = await call("POST", listPath(), teacher, { sectionId: String(school.section._id), title: "Plan" });
      assert.equal(res.status, 201);
      assert.deepEqual((await res.json()).plan.items, []);
    });

    test("names each missing or invalid field with a 400", async () => {
      const sectionId = String(school.section._id);
      const cases = [
        [{ sectionId }, { title: "Required" }],
        [{ sectionId, title: "   " }, { title: "Required" }],
        [{ title: "Plan" }, { sectionId: "Required" }],
        [{ sectionId, title: "Plan", items: "one" }, { items: "Must be a list" }],
        [{ sectionId, title: "Plan", items: [{ description: "no title" }] }, { "items.0.title": "Required" }],
      ];
      for (const [body, fields] of cases) {
        const res = await call("POST", listPath(), teacher, body);
        assert.equal(res.status, 400, JSON.stringify(body));
        const json = await res.json();
        assert.equal(json.error, "Please fix the highlighted fields");
        assert.deepEqual(json.fields, fields);
      }
      assert.equal(await RemediationPlan.countDocuments({}), 0);
    });

    test("rejects a class the student is not enrolled in", async () => {
      const res = await call("POST", listPath(), teacher, {
        sectionId: String(new mongoose.Types.ObjectId()),
        title: "Plan",
      });
      assert.equal(res.status, 400);
      assert.deepEqual((await res.json()).fields, { sectionId: "Invalid class" });
    });

    test("a malformed JSON body is a 400, not a 500", async () => {
      const res = await fetch(`${ctx.baseUrl}/api/v1/teacher${listPath()}`, {
        method: "POST",
        headers: { ...teacher, "Content-Type": "application/json" },
        body: "{not json",
      });
      assert.equal(res.status, 400);
    });
  });

  describe("list and edit", () => {
    test("lists every status, newest first", async () => {
      await addRemediationPlan({ school, title: "First" });
      await addRemediationPlan({ school, title: "Second", status: "rejected" });
      await addRemediationPlan({ school, title: "Third", status: "published" });
      const { plans } = await (await call("GET", listPath(), teacher)).json();
      assert.deepEqual(plans.map((p) => [p.title, p.status]), [
        ["Third", "published"],
        ["Second", "rejected"],
        ["First", "draft"],
      ]);
      assert.deepEqual(plans[0].items.map((i) => i.title), ["Practice fractions"]);
    });

    test("editing a draft replaces its items", async () => {
      const plan = await addRemediationPlan({ school });
      const res = await call("PUT", planPath(plan._id), teacher, {
        title: "Revised",
        rationale: "New reasoning.",
        items: [{ title: "Only step", description: "Ten problems" }],
      });
      assert.equal(res.status, 200);
      const { plan: updated } = await res.json();
      assert.equal(updated.title, "Revised");
      assert.equal(updated.rationale, "New reasoning.");
      assert.equal(updated.status, "draft");
      assert.deepEqual(updated.items.map((i) => [i.title, i.description]), [["Only step", "Ten problems"]]);
      assert.equal(await RemediationItem.countDocuments({ plan: plan._id }), 1);
    });

    test("editing without items keeps the existing items", async () => {
      const plan = await addRemediationPlan({ school });
      const res = await call("PUT", planPath(plan._id), teacher, { title: "Only title" });
      assert.equal(res.status, 200);
      assert.equal((await res.json()).plan.items.length, 1);
    });

    test("editing a pending AI plan keeps it pending review and marks the audit edited", async () => {
      const audit = await addAiAuditLog({ school });
      const plan = await addRemediationPlan({ school, status: "pending_review", source: "ai", aiAudit: audit });
      const res = await call("PUT", planPath(plan._id), teacher, { title: "Teacher wording" });
      assert.equal(res.status, 200);
      assert.equal((await res.json()).plan.status, "pending_review");
      const stored = await AiAuditLog.findById(audit._id).lean();
      assert.equal(stored.reviewOutcome, "edited");
      assert.equal(String(stored.reviewedBy), String(school.teacher._id));
      assert.ok(stored.reviewedAt);
    });

    test("editing validates the body and names the field", async () => {
      const plan = await addRemediationPlan({ school });
      const res = await call("PUT", planPath(plan._id), teacher, { title: "", items: [{ title: "ok" }, {}] });
      assert.equal(res.status, 400);
      assert.deepEqual((await res.json()).fields, { title: "Required", "items.1.title": "Required" });
      assert.equal((await dbPlan(plan._id)).title, "Strengthen fractions");
    });

    test("editing after approval is refused and changes nothing", async () => {
      const plan = await addRemediationPlan({ school, status: "approved" });
      const res = await call("PUT", planPath(plan._id), teacher, { title: "Too late" });
      assert.equal(res.status, 409);
      assert.equal((await res.json()).error, "Plan can no longer be edited");
      assert.equal((await dbPlan(plan._id)).title, "Strengthen fractions");
    });
  });

  describe("approve, reject and publish", () => {
    test("approve sets the reviewer and the review time", async () => {
      const plan = await addRemediationPlan({ school });
      const before = Date.now();
      const res = await call("POST", planPath(plan._id, "approve"), teacher);
      assert.equal(res.status, 200);
      const { plan: approved } = await res.json();
      assert.equal(approved.status, "approved");
      assert.ok(approved.reviewedAt);
      assert.ok(Date.parse(approved.reviewedAt) >= before - 1000);
      const stored = await dbPlan(plan._id);
      assert.equal(String(stored.reviewedBy), String(school.teacher._id));
      assert.ok(stored.reviewedAt instanceof Date);
    });

    test("approve works from pending_review and is refused from other statuses", async () => {
      const pending = await addRemediationPlan({ school, status: "pending_review" });
      assert.equal((await call("POST", planPath(pending._id, "approve"), teacher)).status, 200);
      for (const status of ["approved", "published", "rejected"]) {
        const plan = await addRemediationPlan({ school, status });
        const res = await call("POST", planPath(plan._id, "approve"), teacher);
        assert.equal(res.status, 409, status);
        assert.equal((await dbPlan(plan._id)).status, status);
      }
    });

    test("reject works from draft, pending_review and approved", async () => {
      for (const status of ["draft", "pending_review", "approved"]) {
        const plan = await addRemediationPlan({ school, status });
        const res = await call("POST", planPath(plan._id, "reject"), teacher, { reason: "Not a fit" });
        assert.equal(res.status, 200, status);
        const { plan: rejected } = await res.json();
        assert.equal(rejected.status, "rejected");
        assert.ok(rejected.reviewedAt);
        assert.equal(String((await dbPlan(plan._id)).reviewedBy), String(school.teacher._id));
      }
    });

    test("reject is refused from published and rejected", async () => {
      for (const status of ["published", "rejected"]) {
        const plan = await addRemediationPlan({ school, status });
        assert.equal((await call("POST", planPath(plan._id, "reject"), teacher, {})).status, 409, status);
        assert.equal((await dbPlan(plan._id)).status, status);
      }
    });

    test("publish is refused until the plan is approved", async () => {
      for (const status of ["draft", "pending_review", "rejected", "published"]) {
        const plan = await addRemediationPlan({ school, status });
        const res = await call("POST", planPath(plan._id, "publish"), teacher);
        assert.equal(res.status, 409, status);
        assert.equal((await res.json()).error, "Approve the plan before publishing");
      }
    });

    test("publish sets publishedAt on an approved plan", async () => {
      const plan = await addRemediationPlan({ school, status: "approved" });
      const res = await call("POST", planPath(plan._id, "publish"), teacher);
      assert.equal(res.status, 200);
      const { plan: published } = await res.json();
      assert.equal(published.status, "published");
      assert.ok(published.publishedAt);
      assert.ok((await dbPlan(plan._id)).publishedAt instanceof Date);
    });

    test("full happy path: draft, edit, approve, publish", async () => {
      const created = await (
        await call("POST", listPath(), teacher, {
          sectionId: String(school.section._id),
          title: "Happy path",
          items: [{ title: "Step one" }],
        })
      ).json();
      const id = created.plan.id;

      const edited = await (await call("PUT", planPath(id), teacher, { items: [{ title: "Step one, revised" }] })).json();
      assert.deepEqual(edited.plan.items.map((i) => i.title), ["Step one, revised"]);

      const approved = await (await call("POST", planPath(id, "approve"), teacher)).json();
      assert.equal(approved.plan.status, "approved");

      const published = await (await call("POST", planPath(id, "publish"), teacher)).json();
      assert.equal(published.plan.status, "published");
      assert.ok(published.plan.publishedAt);
      assert.equal(published.plan.reviewedAt, approved.plan.reviewedAt);

      const { plans } = await (await call("GET", listPath(), teacher)).json();
      assert.equal(plans.find((p) => p.id === id).status, "published");
    });
  });

  describe("AI-sourced plans", () => {
    test("approving an AI plan records the approval on its audit", async () => {
      const audit = await addAiAuditLog({ school });
      const plan = await addRemediationPlan({ school, status: "pending_review", source: "ai", aiAudit: audit });
      const res = await call("POST", planPath(plan._id, "approve"), teacher);
      assert.equal(res.status, 200);
      assert.equal((await res.json()).plan.aiAuditId, String(audit._id));
      const stored = await AiAuditLog.findById(audit._id).lean();
      assert.equal(stored.reviewOutcome, "approved");
      assert.equal(String(stored.reviewedBy), String(school.teacher._id));
      assert.ok(stored.reviewedAt);
    });

    test("an edited AI plan keeps the edited outcome when approved", async () => {
      const audit = await addAiAuditLog({ school });
      const plan = await addRemediationPlan({ school, status: "pending_review", source: "ai", aiAudit: audit });
      await call("PUT", planPath(plan._id), teacher, { title: "Edited first" });
      assert.equal((await call("POST", planPath(plan._id, "approve"), teacher)).status, 200);
      assert.equal((await AiAuditLog.findById(audit._id).lean()).reviewOutcome, "edited");
    });

    test("rejecting an AI plan records the rejection on its audit", async () => {
      const audit = await addAiAuditLog({ school });
      const plan = await addRemediationPlan({ school, status: "pending_review", source: "ai", aiAudit: audit });
      assert.equal((await call("POST", planPath(plan._id, "reject"), teacher, {})).status, 200);
      assert.equal((await AiAuditLog.findById(audit._id).lean()).reviewOutcome, "rejected");
    });

    test("an AI plan can be created with its audit and then published", async () => {
      const audit = await addAiAuditLog({ school });
      const plan = await addRemediationPlan({ school, status: "draft", source: "ai", aiAudit: audit });
      assert.equal((await call("POST", planPath(plan._id, "publish"), teacher)).status, 409);
      await call("POST", planPath(plan._id, "approve"), teacher);
      const res = await call("POST", planPath(plan._id, "publish"), teacher);
      assert.equal(res.status, 200);
      assert.equal((await res.json()).plan.source, "ai");
    });

    test("no audit record is written for manual plans", async () => {
      await call("POST", listPath(), teacher, { sectionId: String(school.section._id), title: "Manual" });
      assert.equal(await AiAuditLog.countDocuments({}), 0);
    });
  });
});
