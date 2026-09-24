import { describe, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { User, TeacherNote, TeacherFeedback, RemediationPlan, ProgressReport } from "../../../src/models/index.js";

const oid = () => new mongoose.Types.ObjectId();
// Async validate() runs the pre("validate") hooks that hold the review rules; validateSync() does not.
const errorsOf = async (doc) => {
  try {
    await doc.validate();
    return [];
  } catch (error) {
    return Object.keys(error.errors ?? {});
  }
};

describe("private notes vs shared feedback", () => {
  const base = { student: oid(), teacher: oid(), body: "text" };

  test("teacher notes are always teacher_only", async () => {
    assert.equal(new TeacherNote(base).visibility, "teacher_only");
    assert.deepEqual(await errorsOf(new TeacherNote(base)), []);
    assert.ok((await errorsOf(new TeacherNote({ ...base, visibility: "shared" }))).includes("visibility"));
  });

  test("feedback is shared and cannot be marked private", async () => {
    const fb = { ...base, section: oid() };
    assert.equal(new TeacherFeedback(fb).visibility, "shared");
    assert.ok((await errorsOf(new TeacherFeedback({ ...fb, visibility: "teacher_only" }))).includes("visibility"));
  });
});

describe("teacher review before sharing", () => {
  const plan = { student: oid(), section: oid(), teacher: oid(), title: "Plan" };

  test("draft plans need no reviewer", async () => {
    assert.deepEqual(await errorsOf(new RemediationPlan(plan)), []);
  });

  test("approved or published plans require a teacher review", async () => {
    assert.ok((await errorsOf(new RemediationPlan({ ...plan, status: "approved" }))).includes("reviewedBy"));
    assert.ok(
      (await errorsOf(new RemediationPlan({ ...plan, status: "published", publishedAt: new Date() }))).includes("reviewedBy"),
    );
  });

  test("a reviewed, published plan is valid", async () => {
    const ok = { ...plan, status: "published", reviewedBy: oid(), reviewedAt: new Date(), publishedAt: new Date() };
    assert.deepEqual(await errorsOf(new RemediationPlan(ok)), []);
  });

  test("AI-sourced plans require an audit record", async () => {
    assert.ok((await errorsOf(new RemediationPlan({ ...plan, source: "ai" }))).includes("aiAudit"));
  });

  test("published reports require a teacher review", async () => {
    const report = {
      student: oid(),
      periodStart: new Date("2025-09-01"),
      periodEnd: new Date("2025-11-01"),
      summary: "s",
    };
    assert.deepEqual(await errorsOf(new ProgressReport(report)), []);
    assert.ok((await errorsOf(new ProgressReport({ ...report, status: "published" }))).includes("reviewedBy"));
  });
});

describe("user identity", () => {
  test("a user needs at least one valid role", async () => {
    const user = { email: "a@example.test", firstName: "A", lastName: "B" };
    assert.ok((await errorsOf(new User({ ...user, roles: [] }))).includes("roles"));
    assert.ok((await errorsOf(new User({ ...user, roles: ["hacker"] }))).length > 0);
    assert.deepEqual(await errorsOf(new User({ ...user, roles: ["teacher"] })), []);
  });

  test("passwordHash is not selected by default", async () => {
    assert.equal(User.schema.path("passwordHash").options.select, false);
  });
});
