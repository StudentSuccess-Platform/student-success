import { describe, test, before, after } from "node:test";
import bcrypt from "bcryptjs";
import assert from "node:assert/strict";
import { startTestServer } from "../../helpers/server.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";
import { User } from "../../../src/models/index.js";

const uri = createTestDatabaseUri();

describe("auth endpoints", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  let ctx;
  let baseUrl;

  before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    assert.equal(await connectDatabase({ uri, retries: 3, retryDelayMs: 1000 }), true);
    ctx = await startTestServer();
    ({ baseUrl } = ctx);
  });

  after(async () => {
    await ctx.close();
    await dropTestDatabase();
    await disconnectDatabase();
  });

  describe("POST /api/auth/register", () => {
    test("registers a new user successfully", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "newuser@example.com",
          password: "Password123!",
          role: "teacher",
          firstName: "Jane",
          lastName: "Doe",
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert(data.token);
      assert(data.user);
      assert.equal(data.user.email, "newuser@example.com");
      assert.equal(data.user.firstName, "Jane");
      assert.equal(data.user.lastName, "Doe");
      assert.deepEqual(data.user.roles, ["teacher"]);
    });

    test("rejects duplicate email with 409", async () => {
      await User.create({
        email: "existing@example.com",
        firstName: "Existing",
        lastName: "User",
        roles: ["student"],
        passwordHash: "hash",
      });

      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "existing@example.com",
          password: "Password123!",
          role: "teacher",
          firstName: "Jane",
          lastName: "Doe",
        }),
      });

      assert.equal(res.status, 409);
      const data = await res.json();
      assert(data.error);
    });

    test("rejects invalid email with 400", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "not-an-email",
          password: "Password123!",
          role: "teacher",
          firstName: "Jane",
          lastName: "Doe",
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert(data.error);
    });

    test("rejects admin role with 400", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@example.com",
          password: "Password123!",
          role: "admin",
          firstName: "Jane",
          lastName: "Doe",
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert(data.error);
    });
  });

  describe("POST /api/auth/login", () => {
    test("logs in a user successfully", async () => {
      await User.create({
        email: "login@example.com",
        firstName: "Login",
        lastName: "User",
        roles: ["student"],
        passwordHash: await bcrypt.hash("Password123!", 4),
      });

      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "login@example.com",
          password: "Password123!",
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert(data.token);
      assert(data.user);
      assert.equal(data.user.email, "login@example.com");
    });

    test("rejects wrong password with 401", async () => {
      await User.create({
        email: "wrongpass@example.com",
        firstName: "Wrong",
        lastName: "Pass",
        roles: ["student"],
        passwordHash: await bcrypt.hash("Password123!", 4),
      });

      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "wrongpass@example.com",
          password: "WrongPassword123!",
        }),
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /email or password/i);
    });

    test("rejects unknown email with 401", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "unknown@example.com",
          password: "Password123!",
        }),
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /email or password/i);
    });
  });

  describe("GET /api/auth/me", () => {
    test("returns user info with valid token", async () => {
      const user = await User.create({
        email: "me@example.com",
        firstName: "Me",
        lastName: "User",
        roles: ["teacher"],
        passwordHash: await bcrypt.hash("Password123!", 4),
      });

      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "me@example.com",
          password: "Password123!",
        }),
      });

      const { token } = await loginRes.json();

      const res = await fetch(`${baseUrl}/api/auth/me`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert(data.user);
      assert.equal(data.user.id, String(user._id));
      assert.equal(data.user.email, "me@example.com");
    });

    test("returns 401 without token", async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        method: "GET",
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert(data.error);
    });

    test("returns 401 with invalid token", async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        method: "GET",
        headers: { Authorization: "Bearer invalid-token" },
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert(data.error);
    });
  });
});
