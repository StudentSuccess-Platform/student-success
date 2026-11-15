import { httpError } from "../utils/httpError.js";

// Pure validators for teacher record entry (grades, attendance, goals, feedback). Each one collects
// every invalid field and throws a single 400 with `fields`, so the form can highlight all of them.
// Returns normalized values (strings trimmed, numbers parsed) for the service layer to store.

export const GRADE_STATUSES = ["graded", "missing", "late", "excused"];
export const ATTENDANCE_STATUSES = ["present", "absent", "tardy", "excused"];
export const GOAL_STATUSES = ["active", "achieved", "abandoned"];

const MESSAGE = "Please fix the highlighted fields";
const OBJECT_ID = /^[a-f\d]{24}$/i;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function isObjectIdString(value) {
  return typeof value === "string" && OBJECT_ID.test(value);
}

// Attendance and goal target dates are stored at noon UTC so one calendar day maps to one value.
export function dateAtNoon(ymd) {
  return new Date(`${ymd}T12:00:00.000Z`);
}

const isBlank = (value) => value === undefined || value === null || (typeof value === "string" && value.trim() === "");

const trimmed = (value) => (typeof value === "string" ? value.trim() : value);

// Accepts numbers and numeric strings (form inputs send strings). Returns NaN when not numeric.
function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
}

// YYYY-MM-DD and a real calendar date (rejects 2025-02-30).
function isRealDate(value) {
  if (typeof value !== "string" || !DATE_ONLY.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function fail(fields) {
  if (Object.keys(fields).length > 0) throw httpError(400, MESSAGE, { fields });
}

// Required text: a non-empty string after trimming.
function requiredText(fields, name, value) {
  if (isBlank(value)) {
    fields[name] = "Required";
    return null;
  }
  if (typeof value !== "string") {
    fields[name] = "Must be text";
    return null;
  }
  return value.trim();
}

function objectIdField(fields, name, value, message) {
  if (isBlank(value)) {
    fields[name] = "Required";
    return null;
  }
  if (!isObjectIdString(trimmed(value))) {
    fields[name] = message;
    return null;
  }
  return trimmed(value);
}

function dateField(fields, name, value) {
  if (isBlank(value)) {
    fields[name] = "Required";
    return null;
  }
  if (!isRealDate(trimmed(value))) {
    fields[name] = "Use a real date like 2025-10-01";
    return null;
  }
  return trimmed(value);
}

// Optional target date: null or "" clears it; anything else must be a real YYYY-MM-DD date.
function optionalTargetDate(fields, value) {
  if (isBlank(value)) return null;
  if (!isRealDate(trimmed(value))) {
    fields.targetDate = "Use a real date like 2026-03-31";
    return undefined;
  }
  return trimmed(value);
}

function enumField(fields, name, value, allowed) {
  if (!allowed.includes(value)) {
    fields[name] = `Choose one of: ${allowed.join(", ")}`;
    return null;
  }
  return value;
}

// PUT /grades. `status` defaults to graded. pointsEarned is returned as null when the status does
// not use points (missing, excused); the service then removes any stored score.
export function validateGrade(body = {}) {
  const fields = {};
  const assignmentId = objectIdField(fields, "assignmentId", body.assignmentId, "Invalid assignment");
  const status = enumField(fields, "status", body.status ?? "graded", GRADE_STATUSES);

  let pointsEarned = null;
  if (status === "graded" || status === "late") {
    if (isBlank(body.pointsEarned)) {
      fields.pointsEarned = "Required";
    } else {
      const points = toNumber(body.pointsEarned);
      if (!Number.isFinite(points) || points < 0) fields.pointsEarned = "Must be a number of 0 or more";
      else pointsEarned = points;
    }
  }

  fail(fields);
  return { assignmentId, status, pointsEarned };
}

// POST /attendance. The date is a calendar day (YYYY-MM-DD).
export function validateAttendance(body = {}) {
  const fields = {};
  const sectionId = objectIdField(fields, "sectionId", body.sectionId, "Invalid class");
  const date = dateField(fields, "date", body.date);
  const status = enumField(fields, "status", body.status, ATTENDANCE_STATUSES);

  fail(fields);
  return { sectionId, date, status };
}

// POST /goals. sectionId is optional (a goal may be tied to one class).
export function validateGoal(body = {}) {
  const fields = {};
  const title = requiredText(fields, "title", body.title);
  const description = optionalText(fields, "description", body.description);
  const targetDate = optionalTargetDate(fields, body.targetDate);
  const sectionId = isBlank(body.sectionId) ? null : objectIdField(fields, "sectionId", body.sectionId, "Invalid class");

  fail(fields);
  return { title, description, targetDate, sectionId };
}

// PUT /goals/:goalId. Every field is optional; only the fields sent are returned.
export function validateGoalPatch(body = {}) {
  const fields = {};
  const patch = {};
  if (body.title !== undefined) patch.title = requiredText(fields, "title", body.title);
  if (body.description !== undefined) patch.description = optionalText(fields, "description", body.description);
  if (body.targetDate !== undefined) patch.targetDate = optionalTargetDate(fields, body.targetDate);
  if (body.status !== undefined) patch.status = enumField(fields, "status", body.status, GOAL_STATUSES);

  fail(fields);
  return patch;
}

// POST /goals/:goalId/updates. progressPercent is a whole number from 0 to 100.
export function validateGoalUpdate(body = {}) {
  const fields = {};
  const note = requiredText(fields, "note", body.note);

  let progressPercent = null;
  if (isBlank(body.progressPercent)) {
    fields.progressPercent = "Required";
  } else {
    const value = toNumber(body.progressPercent);
    if (!Number.isInteger(value) || value < 0 || value > 100) fields.progressPercent = "Use a whole number from 0 to 100";
    else progressPercent = value;
  }

  fail(fields);
  return { note, progressPercent };
}

// POST /feedback. sectionId and body are required; assignmentId optionally ties feedback to work.
export function validateFeedback(body = {}) {
  const fields = {};
  const sectionId = objectIdField(fields, "sectionId", body.sectionId, "Invalid class");
  const feedbackBody = requiredText(fields, "body", body.body);
  const assignmentId = isBlank(body.assignmentId) ? null : objectIdField(fields, "assignmentId", body.assignmentId, "Invalid assignment");

  fail(fields);
  return { sectionId, body: feedbackBody, assignmentId };
}

// PUT /feedback/:feedbackId. Only the text can change.
export function validateFeedbackBody(body = {}) {
  const fields = {};
  const feedbackBody = requiredText(fields, "body", body.body);

  fail(fields);
  return { body: feedbackBody };
}

// Optional text: absent or null becomes undefined; any other value must be a string (trimmed, may be empty).
function optionalText(fields, name, value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    fields[name] = "Must be text";
    return undefined;
  }
  return value.trim();
}
