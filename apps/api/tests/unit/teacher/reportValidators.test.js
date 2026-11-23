import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  validateNewReport,
  validateReportEdit,
  validateStatusFilter,
  validateSuggestionQuery,
} from "../../../src/validators/reportValidators.js";

const SECTION = "a".repeat(24);
const good = { sectionId: SECTION, periodStart: "2025-10-01", periodEnd: "2025-10-31", summary: "  Doing well.  " };

const fieldsOf = (fn) => {
  try {
    fn();
  } catch (error) {
    assert.equal(error.status, 400);
    return error.extra.fields;
  }
  return assert.fail("expected a 400");
};

describe("validateNewReport", () => {
  test("normalizes a valid body: summary trimmed, dates at noon UTC", () => {
    const result = validateNewReport(good);
    assert.equal(result.summary, "Doing well.");
    assert.equal(result.sectionId, SECTION);
    assert.equal(result.periodStart.toISOString(), "2025-10-01T12:00:00.000Z");
    assert.equal(result.periodEnd.toISOString(), "2025-10-31T12:00:00.000Z");
  });

  test("accepts a one-day period", () => {
    assert.doesNotThrow(() => validateNewReport({ ...good, periodStart: "2025-10-05", periodEnd: "2025-10-05" }));
  });

  test("reports every missing field", () => {
    assert.deepEqual(fieldsOf(() => validateNewReport({})), {
      sectionId: "Required",
      periodStart: "Required",
      periodEnd: "Required",
      summary: "Required",
    });
    assert.deepEqual(fieldsOf(() => validateNewReport()), {
      sectionId: "Required",
      periodStart: "Required",
      periodEnd: "Required",
      summary: "Required",
    });
  });

  test("rejects malformed and impossible dates", () => {
    for (const bad of ["2025-10-1", "10/01/2025", "2025-02-30", "2025-13-01", "tomorrow", 20251001]) {
      assert.equal(fieldsOf(() => validateNewReport({ ...good, periodStart: bad })).periodStart, "Use a real date (YYYY-MM-DD)", String(bad));
    }
  });

  test("the end must not be before the start", () => {
    assert.deepEqual(fieldsOf(() => validateNewReport({ ...good, periodStart: "2025-10-31", periodEnd: "2025-10-01" })), {
      periodEnd: "Must not be before the start date",
    });
  });

  test("rejects a bad class id, blank or non-text summaries, and an over-long summary", () => {
    assert.equal(fieldsOf(() => validateNewReport({ ...good, sectionId: "nope" })).sectionId, "Invalid class");
    assert.equal(fieldsOf(() => validateNewReport({ ...good, summary: "   " })).summary, "Required");
    assert.equal(fieldsOf(() => validateNewReport({ ...good, summary: 42 })).summary, "Must be text");
    assert.equal(fieldsOf(() => validateNewReport({ ...good, summary: "x".repeat(5001) })).summary, "Must be 5000 characters or fewer");
    assert.doesNotThrow(() => validateNewReport({ ...good, summary: "x".repeat(5000) }));
  });
});

describe("validateReportEdit", () => {
  test("needs the period and the summary, and ignores a class id", () => {
    const result = validateReportEdit({ ...good, sectionId: "ignored" });
    assert.deepEqual(Object.keys(result).sort(), ["periodEnd", "periodStart", "summary"]);
    assert.deepEqual(fieldsOf(() => validateReportEdit({})), { periodStart: "Required", periodEnd: "Required", summary: "Required" });
  });
});

describe("validateSuggestionQuery", () => {
  test("keeps the class and the period as given", () => {
    assert.deepEqual(validateSuggestionQuery({ sectionId: SECTION, periodStart: "2025-10-01", periodEnd: "2025-10-31" }), {
      sectionId: SECTION,
      periodStart: "2025-10-01",
      periodEnd: "2025-10-31",
    });
  });

  test("reports every missing value", () => {
    assert.deepEqual(Object.keys(fieldsOf(() => validateSuggestionQuery({}))).sort(), ["periodEnd", "periodStart", "sectionId"]);
  });
});

describe("validateStatusFilter", () => {
  test("no filter, or a known status, is accepted", () => {
    assert.equal(validateStatusFilter({}), null);
    assert.equal(validateStatusFilter({ status: "" }), null);
    for (const status of ["draft", "pending_review", "published"]) assert.equal(validateStatusFilter({ status }), status);
  });

  test("an unknown status is a 400", () => {
    assert.deepEqual(fieldsOf(() => validateStatusFilter({ status: "archived" })), { status: "Use draft, pending_review or published" });
  });
});
