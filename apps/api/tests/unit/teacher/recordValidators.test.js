import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  validateGrade,
  validateAttendance,
  validateGoal,
  validateGoalPatch,
  validateGoalUpdate,
  validateFeedback,
  validateFeedbackBody,
  dateAtNoon,
} from "../../../src/validators/recordValidators.js";

const OBJ = "64b000000000000000000001";
const OBJ2 = "64b000000000000000000002";

// Returns the 400 body fields a validator throws, or fails the test if it does not throw.
function fieldsOf(fn, body) {
  try {
    fn(body);
  } catch (error) {
    assert.equal(error.status, 400);
    assert.equal(error.message, "Please fix the highlighted fields");
    return error.extra.fields;
  }
  assert.fail("expected a validation error");
}

describe("record validators", () => {
  describe("validateGrade", () => {
    test("accepts a graded score and trims nothing else", () => {
      assert.deepEqual(validateGrade({ assignmentId: OBJ, pointsEarned: 42, status: "graded" }), {
        assignmentId: OBJ,
        status: "graded",
        pointsEarned: 42,
      });
    });

    test("defaults status to graded and accepts numeric strings from forms", () => {
      assert.deepEqual(validateGrade({ assignmentId: OBJ, pointsEarned: "7.5" }), {
        assignmentId: OBJ,
        status: "graded",
        pointsEarned: 7.5,
      });
    });

    test("requires pointsEarned for graded and late, and names it", () => {
      assert.deepEqual(fieldsOf(validateGrade, { assignmentId: OBJ }), { pointsEarned: "Required" });
      assert.deepEqual(fieldsOf(validateGrade, { assignmentId: OBJ, status: "late", pointsEarned: "" }), {
        pointsEarned: "Required",
      });
      assert.equal(validateGrade({ assignmentId: OBJ, status: "late", pointsEarned: 0 }).pointsEarned, 0);
    });

    test("ignores pointsEarned for missing and excused, returning null", () => {
      assert.deepEqual(validateGrade({ assignmentId: OBJ, status: "missing", pointsEarned: 99 }), {
        assignmentId: OBJ,
        status: "missing",
        pointsEarned: null,
      });
      assert.equal(validateGrade({ assignmentId: OBJ, status: "excused" }).pointsEarned, null);
    });

    test("rejects negative, non-numeric and infinite points", () => {
      for (const pointsEarned of [-1, "abc", Infinity, true]) {
        assert.deepEqual(fieldsOf(validateGrade, { assignmentId: OBJ, pointsEarned }), {
          pointsEarned: "Must be a number of 0 or more",
        });
      }
    });

    test("rejects a missing, malformed or unknown status", () => {
      assert.deepEqual(fieldsOf(validateGrade, { assignmentId: OBJ, pointsEarned: 1, status: "passed" }), {
        status: "Choose one of: graded, missing, late, excused",
      });
    });

    test("requires a valid assignmentId", () => {
      assert.deepEqual(fieldsOf(validateGrade, { pointsEarned: 1 }), { assignmentId: "Required" });
      assert.deepEqual(fieldsOf(validateGrade, { assignmentId: "not-an-id", pointsEarned: 1 }), {
        assignmentId: "Invalid assignment",
      });
    });

    test("lists every invalid field at once", () => {
      assert.deepEqual(fieldsOf(validateGrade, { status: "late", pointsEarned: -5 }), {
        assignmentId: "Required",
        pointsEarned: "Must be a number of 0 or more",
      });
      assert.deepEqual(fieldsOf(validateGrade, { status: "bogus", pointsEarned: -5 }), {
        assignmentId: "Required",
        status: "Choose one of: graded, missing, late, excused",
      });
    });

    test("accepts an empty body as a validation failure, not a crash", () => {
      assert.ok(fieldsOf(validateGrade, undefined).assignmentId);
    });
  });

  describe("validateAttendance", () => {
    test("accepts a class, a real date and a status", () => {
      assert.deepEqual(validateAttendance({ sectionId: OBJ, date: "2025-10-01", status: "tardy" }), {
        sectionId: OBJ,
        date: "2025-10-01",
        status: "tardy",
      });
    });

    test("requires sectionId, date and status", () => {
      assert.deepEqual(fieldsOf(validateAttendance, {}), {
        sectionId: "Required",
        date: "Required",
        status: "Choose one of: present, absent, tardy, excused",
      });
    });

    test("rejects a malformed section id", () => {
      assert.deepEqual(fieldsOf(validateAttendance, { sectionId: "x", date: "2025-10-01", status: "present" }), {
        sectionId: "Invalid class",
      });
    });

    test("rejects dates that are not YYYY-MM-DD or not real days", () => {
      for (const date of ["10/01/2025", "2025-1-1", "2025-02-30", "2025-13-01", "2025-10-01T12:00:00Z"]) {
        assert.deepEqual(fieldsOf(validateAttendance, { sectionId: OBJ, date, status: "present" }), {
          date: "Use a real date like 2025-10-01",
        });
      }
    });

    test("accepts a leap day", () => {
      assert.equal(validateAttendance({ sectionId: OBJ, date: "2028-02-29", status: "present" }).date, "2028-02-29");
    });

    test("rejects an unknown status", () => {
      assert.deepEqual(fieldsOf(validateAttendance, { sectionId: OBJ, date: "2025-10-01", status: "here" }), {
        status: "Choose one of: present, absent, tardy, excused",
      });
    });
  });

  describe("validateGoal", () => {
    test("accepts a title with optional fields and trims text", () => {
      assert.deepEqual(
        validateGoal({ title: "  Read daily ", description: " twenty minutes ", targetDate: "2026-03-31", sectionId: OBJ }),
        { title: "Read daily", description: "twenty minutes", targetDate: "2026-03-31", sectionId: OBJ },
      );
    });

    test("treats missing optional fields as absent", () => {
      assert.deepEqual(validateGoal({ title: "Pass" }), {
        title: "Pass",
        description: undefined,
        targetDate: null,
        sectionId: null,
      });
    });

    test("requires a non-empty title", () => {
      assert.deepEqual(fieldsOf(validateGoal, {}), { title: "Required" });
      assert.deepEqual(fieldsOf(validateGoal, { title: "   " }), { title: "Required" });
      assert.deepEqual(fieldsOf(validateGoal, { title: 12 }), { title: "Must be text" });
    });

    test("rejects an invalid target date", () => {
      assert.deepEqual(fieldsOf(validateGoal, { title: "Pass", targetDate: "next week" }), {
        targetDate: "Use a real date like 2026-03-31",
      });
      assert.deepEqual(fieldsOf(validateGoal, { title: "Pass", targetDate: "2026-02-30" }), {
        targetDate: "Use a real date like 2026-03-31",
      });
    });

    test("rejects a malformed sectionId and non-text description", () => {
      assert.deepEqual(fieldsOf(validateGoal, { title: "Pass", sectionId: "bad", description: 5 }), {
        description: "Must be text",
        sectionId: "Invalid class",
      });
    });
  });

  describe("validateGoalPatch", () => {
    test("returns only the fields that were sent", () => {
      assert.deepEqual(validateGoalPatch({ status: "achieved" }), { status: "achieved" });
      assert.deepEqual(validateGoalPatch({}), {});
    });

    test("allows clearing the target date with null", () => {
      assert.deepEqual(validateGoalPatch({ targetDate: null }), { targetDate: null });
    });

    test("rejects an empty title and an unknown status", () => {
      assert.deepEqual(fieldsOf(validateGoalPatch, { title: " ", status: "done" }), {
        title: "Required",
        status: "Choose one of: active, achieved, abandoned",
      });
    });

    test("rejects an invalid target date", () => {
      assert.deepEqual(fieldsOf(validateGoalPatch, { targetDate: "2026-04-31" }), {
        targetDate: "Use a real date like 2026-03-31",
      });
    });
  });

  describe("validateGoalUpdate", () => {
    test("accepts a note and a whole-number progress from 0 to 100", () => {
      assert.deepEqual(validateGoalUpdate({ note: " On track ", progressPercent: 0 }), {
        note: "On track",
        progressPercent: 0,
      });
      assert.equal(validateGoalUpdate({ note: "Done", progressPercent: "100" }).progressPercent, 100);
    });

    test("requires a note", () => {
      assert.deepEqual(fieldsOf(validateGoalUpdate, { progressPercent: 10 }), { note: "Required" });
    });

    test("requires progress, and rejects fractions and out-of-range values", () => {
      assert.deepEqual(fieldsOf(validateGoalUpdate, { note: "x" }), { progressPercent: "Required" });
      for (const progressPercent of [-1, 101, 50.5, "half", NaN]) {
        assert.deepEqual(fieldsOf(validateGoalUpdate, { note: "x", progressPercent }), {
          progressPercent: "Use a whole number from 0 to 100",
        });
      }
    });
  });

  describe("validateFeedback", () => {
    test("accepts a class and body, with an optional assignment", () => {
      assert.deepEqual(validateFeedback({ sectionId: OBJ, body: " Great work ", assignmentId: OBJ2 }), {
        sectionId: OBJ,
        body: "Great work",
        assignmentId: OBJ2,
      });
      assert.equal(validateFeedback({ sectionId: OBJ, body: "Ok" }).assignmentId, null);
    });

    test("requires sectionId and a non-empty body", () => {
      assert.deepEqual(fieldsOf(validateFeedback, { body: "  " }), { sectionId: "Required", body: "Required" });
    });

    test("rejects malformed class and assignment ids", () => {
      assert.deepEqual(fieldsOf(validateFeedback, { sectionId: OBJ, body: "x", assignmentId: "nope" }), {
        assignmentId: "Invalid assignment",
      });
    });
  });

  describe("validateFeedbackBody", () => {
    test("accepts a trimmed body", () => {
      assert.deepEqual(validateFeedbackBody({ body: " Better " }), { body: "Better" });
    });

    test("requires a non-empty body", () => {
      assert.deepEqual(fieldsOf(validateFeedbackBody, { body: "" }), { body: "Required" });
    });
  });

  test("dateAtNoon stores the calendar day at noon UTC", () => {
    assert.equal(dateAtNoon("2025-10-01").toISOString(), "2025-10-01T12:00:00.000Z");
  });
});
