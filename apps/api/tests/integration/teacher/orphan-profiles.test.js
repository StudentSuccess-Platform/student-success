import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "../../helpers/server.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";
import { createSchool, signIn } from "../../helpers/fixtures.js";
import { User } from "../../../src/models/index.js";

// A student profile whose User document was removed must not take the roster or the dashboard down.
const uri = createTestDatabaseUri();

describe("orphaned student profiles", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  let ctx;
  let school;
  let teacher;

  const get = (path) => fetch(`${ctx.baseUrl}/api/v1/teacher${path}`, { headers: teacher });

  before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    assert.equal(await connectDatabase({ uri, retries: 3, retryDelayMs: 1000 }), true);
    ctx = await startTestServer();
    school = await createSchool();
    teacher = await signIn(ctx.baseUrl, "teacher@example.test");
    await User.deleteOne({ email: "ben@example.test" });
  });

  after(async () => {
    await ctx.close();
    await dropTestDatabase();
    await disconnectDatabase();
  });

  test("the roster still returns 200 and names the orphaned student as Unknown student", async () => {
    const res = await get("/students");
    assert.equal(res.status, 200);
    const { students } = await res.json();
    const names = students.map((s) => s.name);
    assert.ok(names.includes("Ada Strong"));
    assert.ok(names.includes("Unknown student"));
  });

  test("the orphaned student's profile page returns 200 with the placeholder name", async () => {
    const res = await get(`/students/${school.benProfile._id}`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).student.name, "Unknown student");
  });

  test("the class roster and dashboard still return 200", async () => {
    assert.equal((await get(`/classes/${school.section._id}`)).status, 200);
    assert.equal((await get("/dashboard")).status, 200);
  });
});
