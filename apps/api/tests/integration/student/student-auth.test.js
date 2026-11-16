import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { startTestServer } from "../../helpers/server.js";

// Access rules for every student endpoint. These fail before any database lookup, so this file
// needs no MongoDB. Data behaviour is covered in student.test.js and student-views.test.js.
const STUDENT_ENDPOINTS = ["/profile", "/grades", "/attendance", "/dashboard", "/me/dashboard"];

describe("student endpoint authorization", () => {
  let ctx;

  const get = (path, headers = {}) => fetch(`${ctx.baseUrl}/api/v1/student${path}`, { headers });
  const as = (role) => ({
    Authorization: `Bearer ${jwt.sign({ roles: [role] }, process.env.JWT_SECRET, { subject: `${role}-id` })}`,
  });

  before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    ctx = await startTestServer();
  });

  after(() => ctx.close());

  for (const path of STUDENT_ENDPOINTS) {
    test(`${path} requires authentication`, async () => {
      assert.equal((await get(path)).status, 401);
    });

    test(`${path} requires the student role`, async () => {
      assert.equal((await get(path, as("teacher"))).status, 403);
      assert.equal((await get(path, as("parent"))).status, 403);
    });
  }
});
