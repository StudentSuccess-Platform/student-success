import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "../../helpers/server.js";

describe("auth validation (smoke)", () => {
  let ctx;
  let baseUrl;

  before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    ctx = await startTestServer();
    ({ baseUrl } = ctx);
  });

  after(() => ctx.close());

  test("POST /api/auth/register rejects bad body with 400", async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "invalid",
        password: "short",
        role: "invalid",
      }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert(data.error);
  });

  test("POST /api/auth/login rejects bad body with 400", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "invalid",
      }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert(data.error);
  });

  test("GET /api/auth/me returns 401 without token", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      method: "GET",
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert(data.error);
  });
});
