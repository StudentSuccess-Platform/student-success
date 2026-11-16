import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "../../helpers/server.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";
import { createSchool, signIn } from "../../helpers/fixtures.js";
import { Assignment, Grade } from "../../../src/models/index.js";

// Identical first writes that race must all succeed and leave exactly one row (the upsert retry).
const uri = createTestDatabaseUri();

describe("concurrent first record writes", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  let ctx;
  let school;
  let teacher;

  before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    assert.equal(await connectDatabase({ uri, retries: 3, retryDelayMs: 1000 }), true);
    ctx = await startTestServer();
    school = await createSchool();
    teacher = await signIn(ctx.baseUrl, "teacher@example.test");
  });

  after(async () => {
    await ctx.close();
    await dropTestDatabase();
    await disconnectDatabase();
  });

  test("five identical PUT grades for an ungraded assignment all return 200 and create one Grade row", async () => {
    const assignment = await Assignment.create({
      section: school.section._id,
      title: "Quiz 2",
      category: "quiz",
      pointsPossible: 20,
      dueDate: new Date("2025-10-20T12:00:00Z"),
    });
    const url = `${ctx.baseUrl}/api/v1/teacher/students/${school.benProfile._id}/grades`;
    const body = JSON.stringify({ assignmentId: String(assignment._id), pointsEarned: 15 });
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        fetch(url, { method: "PUT", headers: { ...teacher, "Content-Type": "application/json" }, body }),
      ),
    );
    assert.deepEqual(responses.map((r) => r.status), [200, 200, 200, 200, 200]);
    const rows = await Grade.countDocuments({ assignment: assignment._id, student: school.benProfile._id });
    assert.equal(rows, 1);
  });
});
