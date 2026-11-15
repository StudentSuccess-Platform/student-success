import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { startTestServer } from "../../helpers/server.js";

// Access rules for every teacher endpoint. These fail before any database lookup, so this file
// needs no MongoDB. Data behaviour is covered in teacher-views.test.js and teacher-access.test.js.
const NO_SUCH_CLASS = "000000000000000000000000";
const TEACHER_ENDPOINTS = [
  { method: "GET", path: "/dashboard" },
  { method: "GET", path: "/classes" },
  { method: "GET", path: `/classes/${NO_SUCH_CLASS}` },
  { method: "POST", path: "/recommendations" },
];

describe("teacher endpoint authorization", () => {
  let ctx;

  const call = (method, path, headers = {}) =>
    fetch(`${ctx.baseUrl}/api/v1/teacher${path}`, { method, headers });
  const as = (role) => ({
    Authorization: `Bearer ${jwt.sign({ roles: [role] }, process.env.JWT_SECRET, { subject: `${role}-id` })}`,
  });

  before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    ctx = await startTestServer();
  });

  after(() => ctx.close());

  for (const { method, path } of TEACHER_ENDPOINTS) {
    test(`${method} ${path} requires authentication`, async () => {
      assert.equal((await call(method, path)).status, 401);
    });

    test(`${method} ${path} requires the teacher role`, async () => {
      assert.equal((await call(method, path, as("student"))).status, 403);
      assert.equal((await call(method, path, as("parent"))).status, 403);
    });
  }
});
