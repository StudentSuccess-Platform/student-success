import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { startTestServer } from "../../helpers/server.js";

describe("student endpoint authorization", () => {
  let ctx;

  before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    ctx = await startTestServer();
  });

  after(() => ctx.close());

  test("requires authentication", async () => {
    const response = await fetch(`${ctx.baseUrl}/api/student/profile`);
    assert.equal(response.status, 401);
  });

  test("requires the student role", async () => {
    const token = jwt.sign({ roles: ["teacher"] }, process.env.JWT_SECRET, { subject: "teacher-id" });
    const response = await fetch(`${ctx.baseUrl}/api/student/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 403);
  });
});
