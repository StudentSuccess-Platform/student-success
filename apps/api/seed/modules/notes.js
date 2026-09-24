import { idBySection, indexBy } from "../context.js";

const PRAISE = [
  "Excellent effort and clear understanding of the material.",
  "Consistently strong work; keep it up.",
  "Great improvement and participation this period.",
];
const SUPPORT = [
  "Struggling with recent material; extra practice would help.",
  "Work is often incomplete; please review the missing assignments.",
  "Understands the basics but needs help applying concepts.",
];
const PRIVATE_NOTES = [
  "Seems distracted in class; monitor and check in privately.",
  "Parent contact recommended about missing work.",
  "Responds better to one-on-one help than group work.",
  "Possible confidence issue after the last test; be encouraging.",
];

// Shareable teacher feedback and private (teacher-only) notes, kept in separate collections.
export default {
  name: "notes",
  models: ["TeacherFeedback", "TeacherNote"],
  run(ctx) {
    const { faker, data, id } = ctx;
    const sections = indexBy(data.Section);
    const assignmentsBySection = idBySection(data.Assignment);

    data.Enrollment.forEach((enrollment) => {
      const section = sections.get(String(enrollment.section));
      const average = ctx.averageOf.get(String(enrollment._id));
      const assignment = faker.helpers.arrayElement(assignmentsBySection.get(String(section._id)));

      data.TeacherFeedback.push({
        _id: id(),
        student: enrollment.student,
        teacher: section.teacher,
        section: section._id,
        assignment: assignment._id,
        body: faker.helpers.arrayElement(average >= 0.85 ? PRAISE : SUPPORT),
        visibility: "shared",
      });

      if (average < 0.8 || faker.datatype.boolean(0.15)) {
        data.TeacherNote.push({
          _id: id(),
          student: enrollment.student,
          teacher: section.teacher,
          section: section._id,
          body: faker.helpers.arrayElement(PRIVATE_NOTES),
          visibility: "teacher_only",
        });
      }
    });
  },
};
