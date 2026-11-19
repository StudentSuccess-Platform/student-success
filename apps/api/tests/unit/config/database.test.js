import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  redactCredentials,
  describeMongoUri,
  getDatabaseStatus,
  connectDatabase,
} from "../../../src/config/database.js";

describe("database config", () => {
  test("redactCredentials hides user and password in connection strings", () => {
    const text = "failed for mongodb://admin:hunter2@db.host:27017/app and mongodb+srv://u:p@cluster.x/y";
    const out = redactCredentials(text);
    assert.ok(!out.includes("hunter2"));
    assert.ok(!out.includes("admin:"));
    assert.match(out, /mongodb:\/\/\*\*\*@db\.host/);
    assert.match(out, /mongodb\+srv:\/\/\*\*\*@cluster/);
  });

  test("redactCredentials leaves text without credentials unchanged", () => {
    assert.equal(redactCredentials("mongodb://localhost:27017/app"), "mongodb://localhost:27017/app");
  });

  test("describeMongoUri reports connection target without exposing credentials", () => {
    const config = describeMongoUri("mongodb+srv://db-user:secret@cluster.example.mongodb.net/studentsuccess?retryWrites=true");
    assert.deepEqual(config, {
      configured: true,
      scheme: "mongodb+srv",
      host: "cluster.example.mongodb.net",
      database: "studentsuccess",
      hasCredentials: true,
    });
    assert.equal(JSON.stringify(config).includes("secret"), false);
  });

  test("getDatabaseStatus reports disconnected when never connected", () => {
    assert.equal(getDatabaseStatus(), "disconnected");
  });

  test("connectDatabase returns false without a URI and does not throw", async () => {
    const warnings = [];
    const ok = await connectDatabase({ uri: "", logger: { warn: (m) => warnings.push(m), log() {}, error() {} } });
    assert.equal(ok, false);
    assert.equal(warnings.length, 1);
  });

  test("connectDatabase failure is safe: returns false and never logs credentials", async () => {
    const errors = [];
    const ok = await connectDatabase({
      uri: "mongodb://admin:hunter2@127.0.0.1:1/x",
      retries: 1,
      logger: { warn() {}, log() {}, error: (m) => errors.push(m) },
    });
    assert.equal(ok, false);
    assert.ok(errors.length >= 1);
    assert.ok(errors.every((m) => !m.includes("hunter2")));
  });
});
