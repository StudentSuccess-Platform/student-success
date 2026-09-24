import { addDays, clamp, idBySection, round1 } from "../context.js";

// Assignment-level grades for every enrollment, shaped by each student's hidden ability.
// Also records each enrollment's average for the modules that follow.
export default {
  name: "grades",
  models: ["Grade"],
  run(ctx) {
    const { faker, data, id } = ctx;
    const assignmentsBySection = idBySection(data.Assignment);

    data.Enrollment.forEach((enrollment) => {
      const base = ctx.ability.get(String(enrollment.student));
      let earned = 0;
      let possible = 0;

      (assignmentsBySection.get(String(enrollment.section)) ?? []).forEach((assignment) => {
        const roll = faker.number.float({ min: 0, max: 1 });
        const grade = { _id: id(), assignment: assignment._id, student: enrollment.student, status: "graded" };

        if (roll < 0.05) {
          grade.status = "missing";
        } else {
          const noise = faker.number.float({ min: -0.12, max: 0.12 });
          grade.pointsEarned = round1(assignment.pointsPossible * clamp(base + noise, 0.2, 1));
          grade.submittedAt = assignment.dueDate;
          if (roll < 0.1) {
            grade.status = "late";
            grade.submittedAt = addDays(assignment.dueDate, 2);
          }
          earned += grade.pointsEarned;
          possible += assignment.pointsPossible;
        }
        data.Grade.push(grade);
      });

      ctx.averageOf.set(String(enrollment._id), possible ? earned / possible : 0);
    });
  },
};
