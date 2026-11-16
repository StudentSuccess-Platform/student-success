import * as models from "../src/models/index.js";
import { MODEL_NAMES } from "./registry.js";
import { idKey, indexBy } from "./context.js";

// Checks referential and logical consistency of seed data. Works on generated in-memory data
// and on data loaded back from the database. Returns a list of problem descriptions.
export function validateSeedData(data) {
  const problems = [];
  const ids = Object.fromEntries(MODEL_NAMES.map((name) => [name, new Set((data[name] ?? []).map((d) => idKey(d._id)))]));

  // 1. Every reference points to an existing document (derived from the schemas).
  MODEL_NAMES.forEach((name) => {
    models[name].schema.eachPath((path, type) => {
      const target = type.options?.ref;
      if (!target) return;
      (data[name] ?? []).forEach((doc) => {
        const value = doc[path];
        if (value != null && !ids[target].has(idKey(value))) {
          problems.push(`${name}(${idKey(doc._id)}).${path} -> missing ${target} ${idKey(value)}`);
        }
      });
    });
  });

  const sections = indexBy(data.Section ?? []);
  const assignments = indexBy(data.Assignment ?? []);
  const teachers = indexBy(data.TeacherProfile ?? []);
  const enrolled = new Set((data.Enrollment ?? []).map((e) => `${idKey(e.section)}:${idKey(e.student)}`));
  const isEnrolled = (section, student) => enrolled.has(`${idKey(section)}:${idKey(student)}`);

  // 2. Student-linked records match real enrollments and the right teacher.
  (data.Grade ?? []).forEach((g) => {
    const a = assignments.get(idKey(g.assignment));
    if (a && !isEnrolled(a.section, g.student)) problems.push(`Grade ${idKey(g._id)}: student not enrolled in the assignment's section`);
    if (a && g.pointsEarned > a.pointsPossible) problems.push(`Grade ${idKey(g._id)}: pointsEarned exceeds pointsPossible`);
  });
  (data.Attendance ?? []).forEach((a) => {
    if (!isEnrolled(a.section, a.student)) problems.push(`Attendance ${idKey(a._id)}: student not enrolled in the section`);
  });
  ["TeacherFeedback", "TeacherNote", "RemediationPlan"].forEach((name) => {
    (data[name] ?? []).forEach((doc) => {
      const section = sections.get(idKey(doc.section));
      if (!section) return;
      if (idKey(section.teacher) !== idKey(doc.teacher)) problems.push(`${name} ${idKey(doc._id)}: teacher does not teach the section`);
      if (!isEnrolled(doc.section, doc.student)) problems.push(`${name} ${idKey(doc._id)}: student not enrolled in the section`);
    });
  });

  // 3. Visibility and review rules.
  (data.TeacherNote ?? []).forEach((n) => {
    if (n.visibility !== "teacher_only") problems.push(`TeacherNote ${idKey(n._id)}: must be teacher_only`);
  });
  (data.TeacherFeedback ?? []).forEach((f) => {
    if (f.visibility !== "shared") problems.push(`TeacherFeedback ${idKey(f._id)}: must be shared`);
  });
  [["RemediationPlan", ["approved", "published"]], ["ProgressReport", ["published"]]].forEach(([name, statuses]) => {
    (data[name] ?? []).forEach((doc) => {
      if (statuses.includes(doc.status) && (!doc.reviewedBy || !doc.reviewedAt)) {
        problems.push(`${name} ${idKey(doc._id)}: ${doc.status} without teacher review`);
      }
      if (doc.source === "ai" && !doc.aiAudit) problems.push(`${name} ${idKey(doc._id)}: AI-sourced without audit record`);
    });
  });
  (data.ProgressReport ?? []).forEach((r) => {
    if (r.reviewedBy && !teachers.has(idKey(r.reviewedBy))) problems.push(`ProgressReport ${idKey(r._id)}: reviewer is not a teacher`);
  });

  // 4. Every student has at least one active guardian link; identities are unique and synthetic.
  const linked = new Set((data.GuardianStudentLink ?? []).filter((l) => l.active).map((l) => idKey(l.student)));
  (data.StudentProfile ?? []).forEach((s) => {
    if (!linked.has(idKey(s._id))) problems.push(`StudentProfile ${idKey(s._id)}: no active guardian link`);
  });
  const emails = new Set();
  (data.User ?? []).forEach((u) => {
    if (u.email) {
      if (emails.has(u.email)) problems.push(`User ${idKey(u._id)}: duplicate email ${u.email}`);
      emails.add(u.email);
    } else if (u.status !== "invited" || !u.roles.includes("student")) {
      problems.push(`User ${idKey(u._id)}: only an invited student may have no email`);
    }
    if (u.status === "invited" && u.passwordHash) problems.push(`User ${idKey(u._id)}: an invited user must not have a password`);
    if ((u.email && !u.email.endsWith("@example.test")) || u.isSynthetic !== true) problems.push(`User ${idKey(u._id)}: not marked synthetic`);
  });

  return problems;
}

export async function loadSeedDataFromDatabase() {
  const entries = await Promise.all(MODEL_NAMES.map(async (name) => [name, await models[name].find().lean()]));
  return Object.fromEntries(entries);
}
