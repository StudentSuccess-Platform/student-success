import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { startTestServer } from "../../helpers/server.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";

const uri = createTestDatabaseUri();

describe("health endpoints", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  let ctx;

  before(async () => {
    process.env.MONGODB_URI = uri;
    ctx = await startTestServer();
  });

  after(async () => {
    await ctx.close();
    process.env.MONGODB_URI = uri;
    delete process.env.DB_CONNECT_RETRIES;
    await connectDatabase().catch(() => {});
    if (mongoose.connection.readyState === 1) await dropTestDatabase();
    await disconnectDatabase();
  });

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

  test("reports \"connected\" once a real database is reachable (successful connection)", async () => {
    const res = await fetch(`${ctx.baseUrl}/api/v1/health`);
    const body = await res.json();
    assert.equal(body.database, "connected");
    assert.equal(mongoose.connection.readyState, 1);
  });

  test("reconnects and reports \"connected\" after a cold invocation, instead of a stale disconnected read", async () => {
    // Simulates the module state right after a Vercel cold start: mongoose's readyState
    // resets to 0 even though the database itself is fine. Before this fix, the health
    // route only read that stale state and never tried to reconnect.
    await disconnectDatabase();
    assert.equal(mongoose.connection.readyState, 0);

    const res = await fetch(`${ctx.baseUrl}/api/v1/health`);
    const body = await res.json();
    assert.equal(body.database, "connected");
  });

  test("reports \"disconnected\" without leaking credentials when the database is genuinely unreachable", async () => {
    await disconnectDatabase();
    process.env.MONGODB_URI = "mongodb://admin:hunter2@127.0.0.1:1/unreachable";
    process.env.DB_CONNECT_RETRIES = "1"; // keep the test fast; production already uses 1 retry on Vercel

    const res = await fetch(`${ctx.baseUrl}/api/v1/health`);
    const text = await res.text();

    assert.equal(res.status, 200); // the API process itself is still up even though the database isn't
    assert.ok(!text.includes("hunter2"));
    assert.ok(!text.includes("127.0.0.1"));
    const body = JSON.parse(text);
    assert.equal(body.status, "healthy");
    assert.equal(body.database, "disconnected");
  });
});
