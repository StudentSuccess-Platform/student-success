import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { User } from "../../../src/models/index.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";

// Reference pattern for any database test file: own throwaway database, dropped afterwards.
// Test files run in parallel processes; this one would see extra users if it shared a
// database with seed.test.js.
const uri = createTestDatabaseUri();

describe("test database isolation", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  before(async () => {
    assert.equal(await connectDatabase({ uri, retries: 3, retryDelayMs: 1000 }), true);
  });

  after(async () => {
    await dropTestDatabase();
    await disconnectDatabase();
  });

  test("starts empty and only sees its own data", async () => {
    assert.equal(await User.countDocuments(), 0);
    await User.create({ email: "only@example.test", firstName: "Only", lastName: "One", roles: ["teacher"] });
    assert.equal(await User.countDocuments(), 1);
  });
});
