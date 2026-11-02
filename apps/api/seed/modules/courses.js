import { REF_DATE, addDays } from "../context.js";

const COURSES = [
  { code: "MATH101", title: "Algebra I", subject: "Mathematics", gradeLevel: 9 },
  { code: "ENG101", title: "English 9", subject: "English", gradeLevel: 9 },
  { code: "BIO101", title: "Biology", subject: "Science", gradeLevel: 10 },
  { code: "HIS101", title: "World History", subject: "Social Studies", gradeLevel: 10 },
  { code: "MATH201", title: "Geometry", subject: "Mathematics", gradeLevel: 10 },
  { code: "CHEM101", title: "Chemistry", subject: "Science", gradeLevel: 11 },
];
const CATEGORIES = ["homework", "homework", "quiz", "homework", "test", "project", "quiz", "test"];
const POINTS = { homework: 20, quiz: 30, test: 100, project: 50, participation: 10 };

// Courses, sections (one teacher each), enrollments (each student takes four sections)
// and assignments.
export default {
  name: "courses",
  models: ["Course", "Section", "Enrollment", "Assignment"],
  run(ctx) {
    const { data, id } = ctx;

    COURSES.forEach((course, i) => {
      const courseDoc = { _id: id(), ...course };
      data.Course.push(courseDoc);
      data.Section.push({
        _id: id(),
        course: courseDoc._id,
        teacher: data.TeacherProfile[i % data.TeacherProfile.length]._id,
        term: "2025-Fall",
        period: i + 1,
        room: `Room ${101 + i}`,
      });
    });

    data.StudentProfile.forEach((student, i) => {
      for (let k = 0; k < 4; k += 1) {
        data.Enrollment.push({
          _id: id(),
          section: data.Section[(i + k) % data.Section.length]._id,
          student: student._id,
          status: "active",
        });
      }
    });

    data.Section.forEach((section) => {
      CATEGORIES.forEach((category, k) =>
        data.Assignment.push({
          _id: id(),
          section: section._id,
          title: `${category[0].toUpperCase()}${category.slice(1)} ${k + 1}`,
          category,
          pointsPossible: POINTS[category],
          dueDate: addDays(REF_DATE, -70 + k * 8),
        }),
      );
    });
  },
};
