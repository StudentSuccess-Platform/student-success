import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "../../helpers/server.js";

describe("health endpoints", () => {
  let ctx;
  before(async () => {
    ctx = await startTestServer();
  });
  after(() => ctx.close());

  test("GET /api/v1/health reports healthy", async () => {
    const res = await fetch(`${ctx.baseUrl}/api/v1/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "healthy");
    assert.equal(body.service, "student-success-api");
    assert.ok(["connected", "disconnected", "connecting", "disconnecting"].includes(body.database));
    assert.ok(!Number.isNaN(Date.parse(body.timestamp)));
  });

  test("GET /api/v1 reports the API is running", async () => {
    const res = await fetch(`${ctx.baseUrl}/api/v1`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, "running");
  });
});
