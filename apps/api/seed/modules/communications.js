import { indexBy } from "../context.js";

// Notifications and messages derived from what has been published to students/guardians.
export default {
  name: "communications",
  models: ["Notification", "Message"],
  run(ctx) {
    const { data, id } = ctx;
    const students = indexBy(data.StudentProfile);
    const sections = indexBy(data.Section);
    const courses = indexBy(data.Course);
    const teachers = indexBy(data.TeacherProfile);
    const guardians = indexBy(data.GuardianProfile);

    // Users who see a student's published items: the student and linked guardians.
    const audience = (studentId) => {
      const links = data.GuardianStudentLink.filter((l) => String(l.student) === String(studentId));
      const guardianUsers = links.map((l) => guardians.get(String(l.guardian)).user);
      return { student: students.get(String(studentId)).user, guardians: guardianUsers };
    };
    const notify = (recipient, type, title) =>
      data.Notification.push({ _id: id(), recipient, type, title, body: title });

    data.StudentProfile.forEach((student) => notify(student.user, "grade_posted", "New grades were posted"));

    data.RemediationPlan.filter((plan) => plan.status === "published").forEach((plan) => {
      const { student, guardians: guardianUsers } = audience(plan.student);
      const course = courses.get(String(sections.get(String(plan.section)).course));
      [student, ...guardianUsers].forEach((user) =>
        notify(user, "plan_published", `New support plan: ${course.title}`),
      );
      if (guardianUsers.length > 0) {
        data.Message.push({
          _id: id(),
          sender: teachers.get(String(plan.teacher)).user,
          recipient: guardianUsers[0],
          student: plan.student,
          subject: `Support plan for a ${course.title} student`,
          body: "A support plan has been shared. Please review it together.",
        });
      }
    });

    data.ProgressReport.filter((report) => report.status === "published").forEach((report) => {
      const { student, guardians: guardianUsers } = audience(report.student);
      [student, ...guardianUsers].forEach((user) =>
        notify(user, "report_published", "A progress report is available"),
      );
    });
  },
};
