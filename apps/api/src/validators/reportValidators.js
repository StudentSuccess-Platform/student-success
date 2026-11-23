import { httpError } from "../utils/httpError.js";
import { LIMITS, dateAtNoon, isObjectIdString, isTooLong, lengthMessage } from "./recordValidators.js";

// Pure validators for teacher progress reports. Each collects every invalid field and throws one 400 with
// `fields`, like the record validators. Dates are YYYY-MM-DD calendar days, stored at noon UTC.

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
export const REPORT_STATUS_FILTERS = ["draft", "pending_review", "published"];

function isRealDate(value) {
  if (typeof value !== "string" || !DATE_ONLY.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function periodFields(fields, body) {
  const { periodStart, periodEnd } = body;
  let startOk = false;
  let endOk = false;
  if (periodStart === undefined || periodStart === null || periodStart === "") fields.periodStart = "Required";
  else if (!isRealDate(periodStart)) fields.periodStart = "Use a real date (YYYY-MM-DD)";
  else startOk = true;
  if (periodEnd === undefined || periodEnd === null || periodEnd === "") fields.periodEnd = "Required";
  else if (!isRealDate(periodEnd)) fields.periodEnd = "Use a real date (YYYY-MM-DD)";
  else endOk = true;
  if (startOk && endOk && periodEnd < periodStart) fields.periodEnd = "Must not be before the start date";
}

function summaryField(fields, value) {
  if (typeof value !== "string" || value.trim() === "") {
    fields.summary = typeof value === "string" || value === undefined || value === null ? "Required" : "Must be text";
    return null;
  }
  if (isTooLong(value, LIMITS.text)) {
    fields.summary = lengthMessage(LIMITS.text);
    return null;
  }
  return value.trim();
}

function fail(fields) {
  if (Object.keys(fields).length > 0) throw httpError(400, "Please fix the highlighted fields", { fields });
}

// POST body: { sectionId, periodStart, periodEnd, summary }
export function validateNewReport(body = {}) {
  const fields = {};
  if (!isObjectIdString(body.sectionId)) fields.sectionId = body.sectionId ? "Invalid class" : "Required";
  periodFields(fields, body);
  const summary = summaryField(fields, body.summary);
  fail(fields);
  return {
    sectionId: body.sectionId,
    periodStart: dateAtNoon(body.periodStart),
    periodEnd: dateAtNoon(body.periodEnd),
    summary,
  };
}

// PUT body: { periodStart, periodEnd, summary } (the class of a report cannot change)
export function validateReportEdit(body = {}) {
  const fields = {};
  periodFields(fields, body);
  const summary = summaryField(fields, body.summary);
  fail(fields);
  return { periodStart: dateAtNoon(body.periodStart), periodEnd: dateAtNoon(body.periodEnd), summary };
}

// GET suggestion query: ?sectionId&periodStart&periodEnd
export function validateSuggestionQuery(query = {}) {
  const fields = {};
  if (!isObjectIdString(query.sectionId)) fields.sectionId = query.sectionId ? "Invalid class" : "Required";
  periodFields(fields, query);
  fail(fields);
  return { sectionId: query.sectionId, periodStart: query.periodStart, periodEnd: query.periodEnd };
}

// GET list filter: ?status=draft|pending_review|published (optional)
export function validateStatusFilter(query = {}) {
  if (query.status === undefined || query.status === "") return null;
  if (!REPORT_STATUS_FILTERS.includes(query.status)) {
    throw httpError(400, "Please fix the highlighted fields", { fields: { status: "Use draft, pending_review or published" } });
  }
  return query.status;
}
