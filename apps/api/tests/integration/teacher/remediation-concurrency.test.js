import { describe, test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "../../helpers/server.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";
import { createSchool, signIn } from "../../helpers/fixtures.js";
import { addRemediationPlan, clearRemediation } from "../../helpers/remediationFixtures.js";
import { RemediationPlan } from "../../../src/models/index.js";

// Racing requests on one plan must never break the state machine: each transition is a single
// conditional update, so exactly one of two conflicting transitions wins and the rest get 409.

const uri = createTestDatabaseUri();

describe("remediation transitions under concurrency", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  let ctx;
  let school;
  let teacher;

  const call = (method, path, body) =>
    fetch(`${ctx.baseUrl}/api/v1/teacher${path}`, {
      method,
      headers: { ...teacher, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  const planPath = (planId, action = "") =>
    `/students/${school.adaProfile._id}/remediation/${planId}${action ? `/${action}` : ""}`;
  const dbPlan = (id) => RemediationPlan.findById(id).lean();

  before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    assert.equal(await connectDatabase({ uri, retries: 3, retryDelayMs: 1000 }), true);
    ctx = await startTestServer();
    school = await createSchool();
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

  test("approve, reject and publish fired together on an approved plan leave one consistent end state", async () => {
    for (let round = 0; round < 5; round += 1) {
      await clearRemediation();
      const plan = await addRemediationPlan({ school, status: "approved" });
      const [approve, reject, publish] = await Promise.all([
        call("POST", planPath(plan._id, "approve")),
        call("POST", planPath(plan._id, "reject"), {}),
        call("POST", planPath(plan._id, "publish")),
      ]);
      const statuses = [approve.status, reject.status, publish.status];
      assert.equal(approve.status, 409, "approve is never allowed from approved");
      assert.equal(
        [reject.status, publish.status].filter((s) => s === 200).length,
        1,
        `exactly one of reject/publish wins, got ${statuses}`,
      );

      const stored = await dbPlan(plan._id);
      if (stored.status === "published") {
        assert.ok(stored.publishedAt, "a published plan has publishedAt");
        assert.equal(reject.status, 409);
      } else {
        assert.equal(stored.status, "rejected");
        assert.equal(stored.publishedAt ?? null, null, "a rejected plan never gets publishedAt");
        assert.equal(publish.status, 409);
      }
    }
  });

  test("edit racing an approve never returns 500 and always leaves a consistent status", async () => {
    for (let round = 0; round < 5; round += 1) {
      await clearRemediation();
      const plan = await addRemediationPlan({ school, status: "draft", title: "Original title" });
      const [edit, approve] = await Promise.all([
        call("PUT", planPath(plan._id), { title: "Edited title", items: [{ title: "Step A" }] }),
        call("POST", planPath(plan._id, "approve")),
      ]);
      assert.ok(edit.status < 500, `edit must not fail with ${edit.status}`);
      assert.equal(approve.status, 200, "approve from draft always succeeds (edit never changes status)");

      const stored = await dbPlan(plan._id);
      assert.equal(stored.status, "approved");
      assert.ok(stored.reviewedAt, "approval is recorded");
      if (edit.status === 200) {
        assert.equal(stored.title, "Edited title");
      } else {
        assert.equal(edit.status, 409);
        assert.equal(stored.title, "Original title", "a refused edit changes nothing");
      }
    }
  });

  test("two publishes of the same approved plan give one 200 and one 409", async () => {
    const plan = await addRemediationPlan({ school, status: "approved" });
    const [first, second] = await Promise.all([
      call("POST", planPath(plan._id, "publish")),
      call("POST", planPath(plan._id, "publish")),
    ]);
    assert.deepEqual([first.status, second.status].sort(), [200, 409]);
    const stored = await dbPlan(plan._id);
    assert.equal(stored.status, "published");
    assert.ok(stored.publishedAt);
  });
});
