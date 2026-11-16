import { httpError } from "../utils/httpError.js";
import { isObjectIdString, isTooLong, lengthMessage } from "./recordValidators.js";

// Validates the body of POST /teacher/classes/:classId/students. Collects every invalid field into one
// 400 with `fields`. Returns normalized values: names trimmed, gradeLevel a number, email lower-cased or null.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX = 80;
const EMAIL_MAX = 254;

function nameField(fields, key, value) {
  if (typeof value !== "string" || value.trim() === "") {
    fields[key] = "Required";
    return null;
  }
  if (isTooLong(value, NAME_MAX)) {
    fields[key] = lengthMessage(NAME_MAX);
    return null;
  }
  return value.trim().replace(/\s+/g, " ");
}

export function validateNewRosterStudent(body = {}) {
  const fields = {};
  const firstName = nameField(fields, "firstName", body.firstName);
  const lastName = nameField(fields, "lastName", body.lastName);

  const rawGrade = typeof body.gradeLevel === "string" && body.gradeLevel.trim() !== "" ? Number(body.gradeLevel) : body.gradeLevel;
  let gradeLevel = null;
  if (rawGrade === undefined || rawGrade === null || rawGrade === "") fields.gradeLevel = "Required";
  else if (!Number.isInteger(rawGrade) || rawGrade < 1 || rawGrade > 12) fields.gradeLevel = "Must be a whole number from 1 to 12";
  else gradeLevel = rawGrade;

  let email = null;
  if (body.email !== undefined && body.email !== null && String(body.email).trim() !== "") {
    const value = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!EMAIL.test(value) || value.length > EMAIL_MAX) fields.email = "Enter a valid email address";
    else email = value;
  }

  let existingStudentId = null;
  if (body.existingStudentId !== undefined && body.existingStudentId !== null && body.existingStudentId !== "") {
    if (isObjectIdString(body.existingStudentId)) existingStudentId = body.existingStudentId;
    else fields.existingStudentId = "Invalid student";
  }
  if (body.allowDuplicate !== undefined && typeof body.allowDuplicate !== "boolean") fields.allowDuplicate = "Must be true or false";
  if (existingStudentId && body.allowDuplicate === true) fields.allowDuplicate = "Cannot create a new student and enrol an existing one";

  if (Object.keys(fields).length > 0) throw httpError(400, "Please fix the highlighted fields", { fields });
  return { firstName, lastName, gradeLevel, email, existingStudentId, allowDuplicate: body.allowDuplicate === true };
}
