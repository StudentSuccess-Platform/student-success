import { Course, Section, Enrollment } from "../../src/models/index.js";

// Synthetic-data helpers for the AI remediation tests. They build on createSchool() in fixtures.js.

// Canned model output that passes validation and maps to three plan items.
export const AI_OUTPUT = {
  guidance: "Focus on solving equations step by step and checking each answer.",
  goal: "Score at least 80% on the next algebra quiz.",
  nextSteps: "1. Redo the missed unit test problems.\n2. Practice five equations each day.\n3. Ask for feedback after each quiz.",
};

// Adds a second class for Ada with period 1, so the default class (lowest period) is not Algebra I.
export async function addEarlierClass(school) {
  const course = await Course.create({ code: "GEO1", title: "Geometry", subject: "Mathematics", gradeLevel: 9 });
  const section = await Section.create({ course: course._id, teacher: school.teacher._id, term: "2025-Fall", period: 1, room: "Room 3" });
  await Enrollment.create({ section: section._id, student: school.adaProfile._id });
  return section;
}

// A section taught by the other teacher, with Ada enrolled, to test that foreign sections are rejected.
export async function addForeignClass(school, otherTeacher) {
  const course = await Course.create({ code: "BIO1", title: "Biology", subject: "Science", gradeLevel: 9 });
  const section = await Section.create({ course: course._id, teacher: otherTeacher._id, term: "2025-Fall", period: 3 });
  await Enrollment.create({ section: section._id, student: school.adaProfile._id });
  return section;
}
