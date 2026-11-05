import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  gradePercent,
  attendancePercent,
  monthlyTrend,
  interventionFor,
  mean,
} from "../../../src/services/grades/gradeMath.js";

describe("gradePercent", () => {
  test("totals earned over possible points", () => {
    assert.equal(
      gradePercent([
        { pointsEarned: 18, pointsPossible: 20, status: "graded" },
        { pointsEarned: 72, pointsPossible: 80, status: "graded" },
      ]),
      90,
    );
  });

  test("counts missing work as zero and ignores excused work", () => {
    assert.equal(
      gradePercent([
        { pointsEarned: 10, pointsPossible: 10, status: "graded" },
        { pointsPossible: 10, status: "missing" },
        { pointsPossible: 50, status: "excused" },
      ]),
      50,
    );
  });

  test("returns null when nothing is gradable", () => {
    assert.equal(gradePercent([]), null);
    assert.equal(gradePercent([{ pointsPossible: 10, status: "excused" }]), null);
  });
});

describe("attendancePercent", () => {
  test("present and tardy count as attended, excused days are left out", () => {
    const records = [{ status: "present" }, { status: "tardy" }, { status: "absent" }, { status: "excused" }];
    assert.equal(attendancePercent(records), 67);
  });

  test("returns null with no countable days", () => {
    assert.equal(attendancePercent([]), null);
    assert.equal(attendancePercent([{ status: "excused" }]), null);
  });
});

describe("monthlyTrend", () => {
  const row = (date, earned) => ({ date, pointsEarned: earned, pointsPossible: 100, status: "graded" });

  test("groups by month in calendar order", () => {
    const trend = monthlyTrend([row("2025-10-05", 70), row("2025-09-10", 80), row("2025-10-20", 90)]);
    assert.deepEqual(trend, [
      { label: "Sep", value: 80 },
      { label: "Oct", value: 80 },
    ]);
  });

  test("keeps only the most recent months", () => {
    const rows = ["01", "02", "03", "04", "05", "06", "07"].map((m) => row(`2025-${m}-15`, 80));
    assert.equal(monthlyTrend(rows, 3).length, 3);
    assert.equal(monthlyTrend(rows, 3).at(-1).label, "Jul");
  });
});

describe("interventionFor", () => {
  test("returns null for a student on track", () => {
    assert.equal(interventionFor({ average: 88, attendance: 97 }), null);
    assert.equal(interventionFor({ average: null, attendance: null }), null);
  });

  test("flags low grades and low attendance with a severity", () => {
    assert.deepEqual(interventionFor({ average: 65, attendance: 95 }), { reason: "Average grade 65%", severity: "medium" });
    assert.equal(interventionFor({ average: 55, attendance: 95 }).severity, "high");
    assert.equal(interventionFor({ average: 80, attendance: 70 }).reason, "Attendance 70%");
  });
});

describe("mean", () => {
  test("averages numbers and skips nulls", () => {
    assert.equal(mean([80, null, 90]), 85);
    assert.equal(mean([null]), null);
  });
});
