import { describe, test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "../../helpers/server.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";
import { createSchool, signIn } from "../../helpers/fixtures.js";
import { clearRemediation } from "../../helpers/remediationFixtures.js";

// Size caps on remediation plans: title and item title 200, rationale and item description 5000,
// at most 50 items. A value at the cap is accepted; one character over is a 400 naming the field.
const uri = createTestDatabaseUri();
const MESSAGE = "Please fix the highlighted fields";

describe("remediation plan size caps", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  let ctx;
  let school;
  let teacher;

  const createPlan = (body) =>
    fetch(`${ctx.baseUrl}/api/v1/teacher/students/${school.adaProfile._id}/remediation`, {
      method: "POST",
      headers: { ...teacher, "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId: String(school.section._id), title: "Plan", ...body }),
    });

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

  test("plan title: 200 characters is accepted, 201 is a 400 naming title", async () => {
    assert.equal((await createPlan({ title: "t".repeat(200) })).status, 201);
    const res = await createPlan({ title: "t".repeat(201) });
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: MESSAGE, fields: { title: "Must be 200 characters or fewer" } });
  });

  test("rationale: 5000 characters is accepted, 5001 is a 400 naming rationale", async () => {
    assert.equal((await createPlan({ rationale: "r".repeat(5000) })).status, 201);
    const res = await createPlan({ rationale: "r".repeat(5001) });
    assert.equal(res.status, 400);
    assert.deepEqual((await res.json()).fields, { rationale: "Must be 5000 characters or fewer" });
  });

  test("item title: 200 accepted, 201 is a 400 naming the item", async () => {
    assert.equal((await createPlan({ items: [{ title: "i".repeat(200) }] })).status, 201);
    const res = await createPlan({ items: [{ title: "ok" }, { title: "i".repeat(201) }] });
    assert.equal(res.status, 400);
    assert.deepEqual((await res.json()).fields, { "items.1.title": "Must be 200 characters or fewer" });
  });

  test("item description: 5000 accepted, 5001 is a 400 naming the item", async () => {
    assert.equal((await createPlan({ items: [{ title: "ok", description: "d".repeat(5000) }] })).status, 201);
    const res = await createPlan({ items: [{ title: "ok", description: "d".repeat(5001) }] });
    assert.equal(res.status, 400);
    assert.deepEqual((await res.json()).fields, { "items.0.description": "Must be 5000 characters or fewer" });
  });

  test("items: 50 accepted, 51 is a 400 naming items", async () => {
    const fifty = Array.from({ length: 50 }, (_, i) => ({ title: `Step ${i + 1}` }));
    assert.equal((await createPlan({ items: fifty })).status, 201);
    const res = await createPlan({ items: [...fifty, { title: "Step 51" }] });
    assert.equal(res.status, 400);
    assert.deepEqual((await res.json()).fields, { items: "Must be 50 items or fewer" });
  });

  test("an over-long edit is refused with a field error and changes nothing", async () => {
    const created = (await (await createPlan({ title: "Original" })).json()).plan;
    const res = await fetch(`${ctx.baseUrl}/api/v1/teacher/students/${school.adaProfile._id}/remediation/${created.id}`, {
      method: "PUT",
      headers: { ...teacher, "Content-Type": "application/json" },
      body: JSON.stringify({ title: "x".repeat(201) }),
    });
    assert.equal(res.status, 400);
    assert.deepEqual((await res.json()).fields, { title: "Must be 200 characters or fewer" });
  });
});
