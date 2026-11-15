import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "../../helpers/server.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";
import { createSchool, signIn } from "../../helpers/fixtures.js";
import { addRecordFixtures } from "../../helpers/recordsFixtures.js";
import {
  Attendance,
  Goal,
  GoalUpdate,
  Grade,
  TeacherFeedback,
  TeacherProfile,
  User,
} from "../../../src/models/index.js";

const uri = createTestDatabaseUri();
const MISSING_ID = "64b0000000000000000000ff";

describe("teacher record entry", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  let ctx;
  let school;
  let fx;
  let teacher;
  let otherTeacher;
  let coTeacher;
  let student;
  let adaId;
  let teacherUserId;
  let teacherProfileId;

  // Sends a request as a signed-in user (default: Tess, the teacher). Pass `as: null` for no token.
  async function call(method, path, { as = teacher, body } = {}) {
    const headers = { ...(as ?? {}) };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(`${ctx.baseUrl}/api/v1/teacher${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  const gradeRow = (assignment) => Grade.findOne({ assignment: assignment._id, student: adaId }).lean();
  const attendanceRows = (date) =>
    Attendance.find({ section: school.section._id, student: adaId, date: new Date(`${date}T12:00:00.000Z`) }).lean();

  before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    assert.equal(await connectDatabase({ uri, retries: 3, retryDelayMs: 1000 }), true);
    ctx = await startTestServer();
    school = await createSchool();
    fx = await addRecordFixtures(school);
    adaId = String(school.adaProfile._id);
    teacher = await signIn(ctx.baseUrl, "teacher@example.test");
    otherTeacher = await signIn(ctx.baseUrl, "other.teacher@example.test");
    coTeacher = await signIn(ctx.baseUrl, fx.coTeacherEmail);
    student = await signIn(ctx.baseUrl, "ada@example.test");
    teacherUserId = (await User.findOne({ email: "teacher@example.test" }).lean())._id;
    teacherProfileId = (await TeacherProfile.findOne({ user: teacherUserId }).lean())._id;
  });

  after(async () => {
    await ctx.close();
    await dropTestDatabase();
    await disconnectDatabase();
  });

  // Shared rules every write endpoint must follow: auth, role, unknown and malformed students.
  function guardsFor(method, getPath, getBody = () => ({})) {
    describe("access rules", () => {
      test("requires a token", async () => {
        assert.equal((await call(method, getPath(), { as: null, body: getBody() })).status, 401);
      });

      test("forbids students", async () => {
        assert.equal((await call(method, getPath(), { as: student, body: getBody() })).status, 403);
      });

      test("hides students this teacher does not teach behind a 404", async () => {
        const res = await call(method, getPath().replace(adaId, String(fx.outsider._id)), { body: getBody() });
        assert.equal(res.status, 404);
      });

      test("hides a student from another teacher behind a 404", async () => {
        assert.equal((await call(method, getPath(), { as: otherTeacher, body: getBody() })).status, 404);
      });

      test("returns 404, not 500, for a malformed student id", async () => {
        assert.equal((await call(method, getPath().replace(adaId, "not-an-id"), { body: getBody() })).status, 404);
      });
    });
  }

  describe("PUT /students/:studentId/grades", () => {
    const path = () => `/students/${adaId}/grades`;

    test("saves a new grade and persists it", async () => {
      const res = await call("PUT", path(), { body: { assignmentId: String(fx.homework._id), pointsEarned: 15 } });
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, {
        grade: { assignmentId: String(fx.homework._id), pointsEarned: 15, status: "graded" },
      });
      const row = await gradeRow(fx.homework);
      assert.equal(row.pointsEarned, 15);
      assert.equal(row.status, "graded");
    });

    test("overwrites an existing grade instead of adding a second one", async () => {
      const res = await call("PUT", path(), { body: { assignmentId: String(fx.unitTest._id), pointsEarned: 88 } });
      assert.equal(res.status, 200);
      assert.equal(res.body.grade.pointsEarned, 88);
      assert.equal(await Grade.countDocuments({ assignment: fx.unitTest._id, student: adaId }), 1);
      assert.equal((await gradeRow(fx.unitTest)).pointsEarned, 88);
    });

    test("saves a late grade with points", async () => {
      const res = await call("PUT", path(), {
        body: { assignmentId: String(fx.homework._id), pointsEarned: 12, status: "late" },
      });
      assert.deepEqual(res.body.grade, { assignmentId: String(fx.homework._id), pointsEarned: 12, status: "late" });
    });

    test("removes the score for a missing grade and returns null points", async () => {
      const res = await call("PUT", path(), {
        body: { assignmentId: String(fx.homework._id), status: "missing", pointsEarned: 9 },
      });
      assert.deepEqual(res.body.grade, { assignmentId: String(fx.homework._id), pointsEarned: null, status: "missing" });
      const row = await gradeRow(fx.homework);
      assert.equal(row.pointsEarned, undefined);
      assert.equal(row.status, "missing");
    });

    test("removes the score for an excused grade", async () => {
      const res = await call("PUT", path(), { body: { assignmentId: String(fx.homework._id), status: "excused" } });
      assert.equal(res.body.grade.status, "excused");
      assert.equal(res.body.grade.pointsEarned, null);
    });

    test("requires points for a graded entry and names the field", async () => {
      const res = await call("PUT", path(), { body: { assignmentId: String(fx.homework._id) } });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Please fix the highlighted fields");
      assert.deepEqual(res.body.fields, { pointsEarned: "Required" });
    });

    test("requires an assignment id", async () => {
      const res = await call("PUT", path(), { body: { pointsEarned: 5 } });
      assert.equal(res.status, 400);
      assert.deepEqual(res.body.fields, { assignmentId: "Required" });
    });

    test("rejects points above the assignment's possible points and keeps the old grade", async () => {
      const res = await call("PUT", path(), { body: { assignmentId: String(fx.unitTest._id), pointsEarned: 101 } });
      assert.equal(res.status, 400);
      assert.deepEqual(res.body.fields, { pointsEarned: "Cannot be more than 100 points" });
      assert.equal((await gradeRow(fx.unitTest)).pointsEarned, 88);
    });

    test("rejects an assignment from another class", async () => {
      for (const assignment of [fx.geometryQuiz, fx.ottoQuiz]) {
        const res = await call("PUT", path(), { body: { assignmentId: String(assignment._id), pointsEarned: 5 } });
        assert.equal(res.status, 400);
        assert.deepEqual(Object.keys(res.body.fields), ["assignmentId"]);
        assert.equal(await Grade.countDocuments({ assignment: assignment._id, student: adaId }), 0);
      }
    });

    test("returns 400 for a malformed or unknown assignment id, never 500", async () => {
      const malformed = await call("PUT", path(), { body: { assignmentId: "not-an-id", pointsEarned: 5 } });
      assert.equal(malformed.status, 400);
      assert.deepEqual(malformed.body.fields, { assignmentId: "Invalid assignment" });

      const unknown = await call("PUT", path(), { body: { assignmentId: MISSING_ID, pointsEarned: 5 } });
      assert.equal(unknown.status, 400);
      assert.deepEqual(Object.keys(unknown.body.fields), ["assignmentId"]);
    });

    guardsFor("PUT", () => path(), () => ({ assignmentId: String(fx.homework._id), pointsEarned: 5 }));
  });

  describe("POST /students/:studentId/attendance", () => {
    const path = () => `/students/${adaId}/attendance`;
    const sectionId = () => String(school.section._id);
    let firstRecordId;

    test("records attendance at noon UTC for the day and persists it", async () => {
      const res = await call("POST", path(), { body: { sectionId: sectionId(), date: "2025-10-02", status: "tardy" } });
      assert.equal(res.status, 200);
      assert.equal(res.body.attendance.sectionId, sectionId());
      assert.equal(res.body.attendance.date, "2025-10-02T12:00:00.000Z");
      assert.equal(res.body.attendance.status, "tardy");
      firstRecordId = res.body.attendance.id;

      const rows = await attendanceRows("2025-10-02");
      assert.equal(rows.length, 1);
      assert.equal(rows[0].status, "tardy");
    });

    test("a second entry for the same class and day updates the one row", async () => {
      const res = await call("POST", path(), { body: { sectionId: sectionId(), date: "2025-10-02", status: "present" } });
      assert.equal(res.status, 200);
      assert.equal(res.body.attendance.id, firstRecordId);
      assert.equal(res.body.attendance.status, "present");
      const rows = await attendanceRows("2025-10-02");
      assert.equal(rows.length, 1);
      assert.equal(rows[0].status, "present");
    });

    test("names every missing field", async () => {
      const res = await call("POST", path(), { body: {} });
      assert.equal(res.status, 400);
      assert.deepEqual(Object.keys(res.body.fields).sort(), ["date", "sectionId", "status"]);
    });

    test("rejects a date that is not a real calendar day", async () => {
      const res = await call("POST", path(), { body: { sectionId: sectionId(), date: "2025-02-30", status: "present" } });
      assert.equal(res.status, 400);
      assert.deepEqual(Object.keys(res.body.fields), ["date"]);
    });

    test("rejects a class the student is not in", async () => {
      const res = await call("POST", path(), {
        body: { sectionId: String(fx.geometry._id), date: "2025-10-02", status: "absent" },
      });
      assert.equal(res.status, 400);
      assert.deepEqual(res.body.fields, { sectionId: "Invalid class" });
      assert.equal(await Attendance.countDocuments({ section: fx.geometry._id }), 0);
    });

    test("returns 400 for a malformed class id", async () => {
      const res = await call("POST", path(), { body: { sectionId: "bad", date: "2025-10-02", status: "present" } });
      assert.equal(res.status, 400);
      assert.deepEqual(res.body.fields, { sectionId: "Invalid class" });
    });

    guardsFor("POST", () => path(), () => ({ sectionId: sectionId(), date: "2025-10-03", status: "present" }));
  });

  describe("POST /students/:studentId/goals", () => {
    const path = () => `/students/${adaId}/goals`;

    test("creates a goal with the optional fields and returns it", async () => {
      const res = await call("POST", path(), {
        body: { title: "  Read daily ", description: "Twenty minutes", targetDate: "2026-03-31", sectionId: String(school.section._id) },
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.goal.title, "Read daily");
      assert.equal(res.body.goal.description, "Twenty minutes");
      assert.equal(res.body.goal.targetDate, "2026-03-31T12:00:00.000Z");
      assert.equal(res.body.goal.status, "active");
      assert.equal(res.body.goal.progress, 0);
      assert.deepEqual(res.body.goal.updates, []);

      const saved = await Goal.findById(res.body.goal.id).lean();
      assert.equal(String(saved.student), adaId);
      assert.equal(String(saved.section), String(school.section._id));
    });

    test("creates a goal with only a title", async () => {
      const res = await call("POST", path(), { body: { title: "Show up" } });
      assert.equal(res.status, 201);
      assert.equal(res.body.goal.description, null);
      assert.equal(res.body.goal.targetDate, null);
    });

    test("requires a title", async () => {
      const res = await call("POST", path(), { body: { description: "no title" } });
      assert.equal(res.status, 400);
      assert.deepEqual(res.body.fields, { title: "Required" });
    });

    test("rejects an invalid target date", async () => {
      const res = await call("POST", path(), { body: { title: "Pass", targetDate: "soon" } });
      assert.equal(res.status, 400);
      assert.deepEqual(Object.keys(res.body.fields), ["targetDate"]);
    });

    test("rejects a class the student is not in", async () => {
      const res = await call("POST", path(), { body: { title: "Pass", sectionId: String(fx.geometry._id) } });
      assert.equal(res.status, 400);
      assert.deepEqual(res.body.fields, { sectionId: "Invalid class" });
    });

    guardsFor("POST", () => path(), () => ({ title: "Pass" }));
  });

  describe("PUT /students/:studentId/goals/:goalId", () => {
    let goalId;
    const path = () => `/students/${adaId}/goals/${goalId}`;

    before(async () => {
      goalId = String((await Goal.findOne({ student: school.adaProfile._id }).lean())._id);
    });

    test("edits the title, status and clears the target date", async () => {
      const res = await call("PUT", path(), { body: { title: "Keep an A+", status: "achieved", targetDate: null } });
      assert.equal(res.status, 200);
      assert.equal(res.body.goal.title, "Keep an A+");
      assert.equal(res.body.goal.status, "achieved");
      assert.equal(res.body.goal.targetDate, null);
      assert.equal(res.body.goal.progress, 80);
      assert.equal(res.body.goal.updates[0].note, "Going well");

      const saved = await Goal.findById(goalId).lean();
      assert.equal(saved.title, "Keep an A+");
      assert.equal(saved.targetDate, undefined);
    });

    test("an empty edit returns the goal unchanged", async () => {
      const res = await call("PUT", path(), { body: {} });
      assert.equal(res.status, 200);
      assert.equal(res.body.goal.title, "Keep an A+");
    });

    test("rejects an empty title and an unknown status", async () => {
      const res = await call("PUT", path(), { body: { title: " ", status: "done" } });
      assert.equal(res.status, 400);
      assert.deepEqual(Object.keys(res.body.fields).sort(), ["status", "title"]);
      assert.equal((await Goal.findById(goalId).lean()).title, "Keep an A+");
    });

    test("returns 404 for a goal that belongs to another student", async () => {
      const res = await call("PUT", `/students/${adaId}/goals/${fx.benGoal._id}`, { body: { status: "abandoned" } });
      assert.equal(res.status, 404);
      assert.equal((await Goal.findById(fx.benGoal._id).lean()).status, "active");
    });

    test("returns 404 for malformed and unknown goal ids", async () => {
      assert.equal((await call("PUT", `/students/${adaId}/goals/not-an-id`, { body: { title: "x" } })).status, 404);
      assert.equal((await call("PUT", `/students/${adaId}/goals/${MISSING_ID}`, { body: { title: "x" } })).status, 404);
    });

    guardsFor("PUT", () => path(), () => ({ title: "Keep an A+" }));
  });

  describe("POST /students/:studentId/goals/:goalId/updates", () => {
    let goalId;
    const path = () => `/students/${adaId}/goals/${goalId}/updates`;

    before(async () => {
      goalId = String((await Goal.findOne({ student: school.adaProfile._id }).lean())._id);
    });

    test("adds a progress update authored by the signed-in user", async () => {
      const res = await call("POST", path(), { body: { note: " Solid week ", progressPercent: 65 } });
      assert.equal(res.status, 201);
      assert.equal(res.body.update.note, "Solid week");
      assert.equal(res.body.update.progressPercent, 65);
      assert.ok(res.body.update.id);
      assert.ok(res.body.update.createdAt);

      const saved = await GoalUpdate.findById(res.body.update.id).lean();
      assert.equal(String(saved.goal), goalId);
      assert.equal(String(saved.author), String(teacherUserId));
    });

    test("the goal's progress is now the latest update", async () => {
      const res = await call("PUT", `/students/${adaId}/goals/${goalId}`, { body: {} });
      assert.equal(res.body.goal.progress, 65);
      assert.equal(res.body.goal.updates.length, 2);
    });

    test("accepts 0 and 100 as progress bounds", async () => {
      assert.equal((await call("POST", path(), { body: { note: "Start", progressPercent: 0 } })).status, 201);
      assert.equal((await call("POST", path(), { body: { note: "Finish", progressPercent: 100 } })).status, 201);
    });

    test("requires a note and a whole-number progress from 0 to 100", async () => {
      assert.deepEqual((await call("POST", path(), { body: { progressPercent: 10 } })).body.fields, { note: "Required" });
      assert.deepEqual((await call("POST", path(), { body: { note: "x" } })).body.fields, { progressPercent: "Required" });
      assert.deepEqual((await call("POST", path(), { body: { note: "x", progressPercent: 101 } })).body.fields, {
        progressPercent: "Use a whole number from 0 to 100",
      });
    });

    test("returns 404 for another student's goal and malformed goal ids", async () => {
      const benGoal = `/students/${adaId}/goals/${fx.benGoal._id}/updates`;
      assert.equal((await call("POST", benGoal, { body: { note: "x", progressPercent: 5 } })).status, 404);
      const malformed = `/students/${adaId}/goals/not-an-id/updates`;
      assert.equal((await call("POST", malformed, { body: { note: "x", progressPercent: 5 } })).status, 404);
    });

    guardsFor("POST", () => path(), () => ({ note: "x", progressPercent: 5 }));
  });

  describe("POST /students/:studentId/feedback", () => {
    const path = () => `/students/${adaId}/feedback`;
    let createdId;

    test("creates shared feedback for a class and returns it", async () => {
      const res = await call("POST", path(), { body: { sectionId: String(school.section._id), body: " Keep it up " } });
      assert.equal(res.status, 201);
      assert.equal(res.body.feedback.sectionId, String(school.section._id));
      assert.equal(res.body.feedback.body, "Keep it up");
      assert.ok(res.body.feedback.createdAt);
      assert.ok(res.body.feedback.updatedAt);
      createdId = res.body.feedback.id;

      const saved = await TeacherFeedback.findById(createdId).lean();
      assert.equal(String(saved.teacher), String(teacherProfileId));
      assert.equal(saved.visibility, "shared");
    });

    test("accepts an assignment from the same class", async () => {
      const res = await call("POST", path(), {
        body: { sectionId: String(school.section._id), body: "On the homework", assignmentId: String(fx.homework._id) },
      });
      assert.equal(res.status, 201);
      assert.equal((await TeacherFeedback.findById(res.body.feedback.id).lean()).assignment.toString(), String(fx.homework._id));
    });

    test("rejects an assignment from a different class", async () => {
      const res = await call("POST", path(), {
        body: { sectionId: String(school.section._id), body: "Wrong class", assignmentId: String(fx.geometryQuiz._id) },
      });
      assert.equal(res.status, 400);
      assert.deepEqual(Object.keys(res.body.fields), ["assignmentId"]);
    });

    test("requires a class and a body, and names both", async () => {
      const res = await call("POST", path(), { body: {} });
      assert.equal(res.status, 400);
      assert.deepEqual(Object.keys(res.body.fields).sort(), ["body", "sectionId"]);
    });

    test("rejects a class the student is not in", async () => {
      const res = await call("POST", path(), { body: { sectionId: String(fx.geometry._id), body: "Nope" } });
      assert.equal(res.status, 400);
      assert.deepEqual(res.body.fields, { sectionId: "Invalid class" });
    });

    guardsFor("POST", () => path(), () => ({ sectionId: String(school.section._id), body: "Hi" }));

    test("the created feedback exists for the student", async () => {
      assert.ok(createdId);
      assert.equal(await TeacherFeedback.countDocuments({ _id: createdId, student: adaId }), 1);
    });
  });

  describe("PUT /students/:studentId/feedback/:feedbackId", () => {
    let feedbackId;
    const path = (id = feedbackId) => `/students/${adaId}/feedback/${id}`;

    before(async () => {
      feedbackId = String((await TeacherFeedback.findOne({ body: "Great work" }).lean())._id);
    });

    test("the author teacher edits her own feedback", async () => {
      const res = await call("PUT", path(), { body: { body: " Great work, keep going " } });
      assert.equal(res.status, 200);
      assert.equal(res.body.feedback.id, feedbackId);
      assert.equal(res.body.feedback.body, "Great work, keep going");
      assert.equal((await TeacherFeedback.findById(feedbackId).lean()).body, "Great work, keep going");
    });

    test("requires a non-empty body", async () => {
      const res = await call("PUT", path(), { body: { body: "   " } });
      assert.equal(res.status, 400);
      assert.deepEqual(res.body.fields, { body: "Required" });
    });

    test("hides feedback written by another teacher behind a 404", async () => {
      const res = await call("PUT", path(), { as: coTeacher, body: { body: "Hijacked" } });
      assert.equal(res.status, 404);
      assert.equal((await TeacherFeedback.findById(feedbackId).lean()).body, "Great work, keep going");
    });

    test("hides feedback that belongs to a different student", async () => {
      const benFeedback = await TeacherFeedback.create({
        student: school.benProfile._id,
        teacher: teacherProfileId,
        section: school.section._id,
        body: "Ben only",
      });
      const res = await call("PUT", path(String(benFeedback._id)), { body: { body: "Moved" } });
      assert.equal(res.status, 404);
      assert.equal((await TeacherFeedback.findById(benFeedback._id).lean()).body, "Ben only");
    });

    test("returns 404 for malformed and unknown feedback ids", async () => {
      assert.equal((await call("PUT", path("not-an-id"), { body: { body: "x" } })).status, 404);
      assert.equal((await call("PUT", path(MISSING_ID), { body: { body: "x" } })).status, 404);
    });

    guardsFor("PUT", () => path(), () => ({ body: "x" }));
  });

});
