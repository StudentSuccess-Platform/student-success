import { describe, test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "../../helpers/server.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";
import { createSchool, signIn } from "../../helpers/fixtures.js";
import { addRemediationPlan, clearRemediation } from "../../helpers/remediationFixtures.js";
import { RemediationItem, RemediationPlan } from "../../../src/models/index.js";

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

  const itemTitles = async (id) => (await RemediationItem.find({ plan: id }).lean()).map((i) => i.title).sort();

  test("every edit and status change bumps the plan version", async () => {
    const plan = await addRemediationPlan({ school, status: "draft" });
    const edit = await (await call("PUT", planPath(plan._id), { title: "v1" })).json();
    assert.equal(edit.plan.version, 1);
    const approved = await (await call("POST", planPath(plan._id, "approve"))).json();
    assert.equal(approved.plan.version, 2);
    const published = await (await call("POST", planPath(plan._id, "publish"))).json();
    assert.equal(published.plan.version, 3);
  });

  test("an edit that names a stale version is refused and changes nothing", async () => {
    const plan = await addRemediationPlan({ school, status: "draft", title: "Original title" });
    const first = await call("PUT", planPath(plan._id), { version: 0, title: "First", items: [{ title: "A" }] });
    assert.equal(first.status, 200);

    const stale = await call("PUT", planPath(plan._id), { version: 0, title: "Stale", items: [{ title: "B" }] });
    assert.equal(stale.status, 409);
    const stored = await dbPlan(plan._id);
    assert.equal(stored.title, "First");
    assert.equal(stored.version, 1);
    assert.deepEqual(await itemTitles(plan._id), ["A"], "refused edit leaves no staged items behind");

    const fresh = await call("PUT", planPath(plan._id), { version: 1, items: [{ title: "C" }] });
    assert.equal(fresh.status, 200);
    assert.deepEqual(await itemTitles(plan._id), ["C"]);
  });

  test("a malformed version is a 400", async () => {
    const plan = await addRemediationPlan({ school, status: "draft" });
    for (const version of ["1", -1, 1.5]) {
      const res = await call("PUT", planPath(plan._id), { version, title: "x" });
      assert.equal(res.status, 400, `version ${JSON.stringify(version)}`);
    }
  });

  test("two edits racing on one plan: exactly one wins and its items are the only ones left", async () => {
    for (let round = 0; round < 5; round += 1) {
      await clearRemediation();
      const plan = await addRemediationPlan({ school, status: "draft" });
      const [a, b] = await Promise.all([
        call("PUT", planPath(plan._id), { version: 0, title: "A", items: [{ title: "A1" }, { title: "A2" }] }),
        call("PUT", planPath(plan._id), { version: 0, title: "B", items: [{ title: "B1" }] }),
      ]);
      assert.deepEqual([a.status, b.status].sort(), [200, 409]);
      const stored = await dbPlan(plan._id);
      assert.equal(stored.version, 1);
      const expected = a.status === 200 ? ["A1", "A2"] : ["B1"];
      assert.equal(stored.title, a.status === 200 ? "A" : "B");
      assert.deepEqual(await itemTitles(plan._id), expected);
    }
  });

  test("an edit racing an approve never alters the items of an approved plan", async () => {
    for (let round = 0; round < 5; round += 1) {
      await clearRemediation();
      const plan = await addRemediationPlan({ school, status: "draft" });
      await call("PUT", planPath(plan._id), { items: [{ title: "Original" }] });
      const [edit, approve] = await Promise.all([
        call("PUT", planPath(plan._id), { items: [{ title: "Changed" }] }),
        call("POST", planPath(plan._id, "approve")),
      ]);
      assert.equal(approve.status, 200);
      assert.ok([200, 409].includes(edit.status));
      // Whatever won, the stored items match the edit outcome exactly: all old or all new, never a mix.
      assert.deepEqual(await itemTitles(plan._id), edit.status === 200 ? ["Changed"] : ["Original"]);
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
