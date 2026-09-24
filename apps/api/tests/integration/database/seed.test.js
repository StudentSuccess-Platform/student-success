import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import * as models from "../../../src/models/index.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { generateSeedData, MODEL_NAMES } from "../../../seed/registry.js";
import { validateSeedData, loadSeedDataFromDatabase } from "../../../seed/validate.js";
import { startTestServer } from "../../helpers/server.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";

// Needs a MongoDB server (MONGODB_URI). Uses its own throwaway database, dropped afterwards.
const uri = createTestDatabaseUri();

describe("database and seed", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  let server;

  before(async () => {
    assert.equal(await connectDatabase({ uri, retries: 3, retryDelayMs: 1000 }), true);
    const data = generateSeedData();
    for (const name of MODEL_NAMES) {
      await models[name].init();
      await models[name].insertMany(data[name]);
    }
    server = await startTestServer();
  });

  after(async () => {
    await server?.close();
    await dropTestDatabase();
    await disconnectDatabase();
  });

  test("seeded data passes the referential and logical consistency check", async () => {
    assert.deepEqual(validateSeedData(await loadSeedDataFromDatabase()), []);
  });

  test("health reports the database as connected", async () => {
    const body = await (await fetch(`${server.baseUrl}/api/v1/health`)).json();
    assert.equal(body.status, "healthy");
    assert.equal(body.database, "connected");
  });

  test("unique constraints reject a duplicate enrollment", async () => {
    const existing = await models.Enrollment.findOne().lean();
    await assert.rejects(models.Enrollment.create({ section: existing.section, student: existing.student }));
  });

  test("a parent can be limited to their linked students", async () => {
    const link = await models.GuardianStudentLink.findOne().lean();
    const visible = await models.GuardianStudentLink.find({ guardian: link.guardian, active: true }).lean();
    assert.ok(visible.some((l) => String(l.student) === String(link.student)));
    assert.ok(visible.length < (await models.StudentProfile.countDocuments()));
  });
});
