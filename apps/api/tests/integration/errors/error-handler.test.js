import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "../../helpers/server.js";
import { errorHandler } from "../../../src/app.js";
import { httpError } from "../../../src/utils/httpError.js";

// Fake Express response that records the status and JSON body the handler sends.
function fakeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

// Runs fn while capturing console.error, so the handler's logging does not clutter test output.
function captureErrors(fn) {
  const original = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args);
  try {
    fn();
  } finally {
    console.error = original;
  }
  return logged;
}

describe("global error handler", () => {
  let ctx;

  before(async () => {
    ctx = await startTestServer();
  });

  after(async () => {
    await ctx.close();
  });

  test("an error without an explicit status becomes a generic 500 and the real error is logged", () => {
    const res = fakeResponse();
    const logged = captureErrors(() => {
      errorHandler(new Error("SECRET-DB-DETAIL: connection string"), {}, res, () => {});
    });
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: "Internal server error" });
    assert.equal(logged.length, 1);
    assert.match(String(logged[0][0].message), /SECRET-DB-DETAIL/);
  });

  test("an httpError keeps its status, message and extra", () => {
    const res = fakeResponse();
    captureErrors(() => {
      errorHandler(httpError(409, "Plan can no longer be edited", { code: "PLAN_LOCKED" }), {}, res, () => {});
    });
    assert.equal(res.statusCode, 409);
    assert.deepEqual(res.body, { code: "PLAN_LOCKED", error: "Plan can no longer be edited" });
  });

  test("a body-parser 400 keeps its message over HTTP", async () => {
    const original = console.error;
    console.error = () => {};
    try {
      const res = await fetch(`${ctx.baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(typeof body.error, "string");
      assert.notEqual(body.error, "Internal server error");
    } finally {
      console.error = original;
    }
  });

  test("login returns a database-unavailable response instead of timing out when MongoDB is not configured", async () => {
    const originalUri = process.env.MONGODB_URI;
    const originalError = console.error;
    const originalInfo = console.info;
    const logged = [];
    process.env.MONGODB_URI = "";
    console.error = () => {};
    console.info = (line) => logged.push(line);
    try {
      const res = await fetch(`${ctx.baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "student@example.test", password: "password123" }),
      });
      assert.equal(res.status, 503);
      assert.deepEqual(await res.json(), {
        code: "DATABASE_UNAVAILABLE",
        error: "Database is unavailable",
      });
      assert.ok(logged.some((line) => String(line).includes('"event":"auth.login.complete"')));
      assert.ok(logged.every((line) => !String(line).includes("student@example.test")));
    } finally {
      if (originalUri === undefined) delete process.env.MONGODB_URI;
      else process.env.MONGODB_URI = originalUri;
      console.error = originalError;
      console.info = originalInfo;
    }
  });
});
