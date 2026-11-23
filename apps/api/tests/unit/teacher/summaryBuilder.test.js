import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildSummary } from "../../../src/services/reports/summaryBuilder.js";

const base = {
  firstName: "Ada",
  className: "Algebra I",
  periodStart: "2025-09-01T00:00:00.000Z",
  periodEnd: "2025-10-31T23:59:59.999Z",
  averageGrade: 75,
  grades: [
    { status: "graded", pointsEarned: 15, pointsPossible: 20 },
    { status: "late", pointsEarned: 15, pointsPossible: 20 },
    { status: "missing", pointsEarned: null, pointsPossible: 20 },
    { status: null, pointsEarned: null, pointsPossible: 20 },
  ],
  attendanceRate: 87,
  attendance: [{ status: "present" }, { status: "absent" }, { status: "tardy" }, { status: "tardy" }],
  goals: [
    { title: "Raise my grade", progress: 75 },
    { title: "Turn in homework", progress: 40 },
  ],
};

describe("buildSummary", () => {
  test("states the class and period, the grade, the attendance and the goals", () => {
    assert.equal(
      buildSummary(base),
      "Algebra I, Sep 1, 2025 to Oct 31, 2025. Ada's average grade is 75% across 2 graded assignments, with 1 missing assignment. " +
        "Attendance is 87% (1 absence, 2 tardies). Active goals: Raise my grade (75% complete), Turn in homework (40% complete).",
    );
  });

  test("counts only graded and late work as graded, and ignores ungraded assignments", () => {
    assert.match(buildSummary(base), /across 2 graded assignments/);
  });

  test("uses singular wording for one of each", () => {
    const text = buildSummary({
      ...base,
      grades: [{ status: "graded", pointsEarned: 9, pointsPossible: 10 }, { status: "missing", pointsEarned: null, pointsPossible: 10 }],
      attendance: [{ status: "absent" }, { status: "tardy" }],
    });
    assert.match(text, /across 1 graded assignment, with 1 missing assignment\./);
    assert.match(text, /\(1 absence, 1 tardy\)/);
  });

  test("leaves the missing-work note out when nothing is missing", () => {
    const text = buildSummary({ ...base, grades: [{ status: "graded", pointsEarned: 9, pointsPossible: 10 }] });
    assert.doesNotMatch(text, /missing/);
  });

  test("says so when there is no graded work or no attendance, and omits goals when there are none", () => {
    const text = buildSummary({ ...base, averageGrade: null, grades: [], attendanceRate: null, attendance: [], goals: [] });
    assert.equal(
      text,
      "Algebra I, Sep 1, 2025 to Oct 31, 2025. No graded work was recorded in this period. No attendance was recorded in this period.",
    );
  });

  test("states only facts from the data: no reasons or judgments are added", () => {
    const text = buildSummary({ ...base, averageGrade: 40, attendanceRate: 50 });
    assert.doesNotMatch(text, /because|due to|struggl|lazy|behav|should/i);
  });
});
