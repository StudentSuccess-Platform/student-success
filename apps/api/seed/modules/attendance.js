import { REF_DATE, addDays } from "../context.js";

function recentWeekdays(count) {
  const days = [];
  let day = addDays(REF_DATE, -1);
  while (days.length < count) {
    if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6) days.push(new Date(day));
    day = addDays(day, -1);
  }
  return days.reverse();
}

// Attendance for the last 15 school days, per enrollment.
export default {
  name: "attendance",
  models: ["Attendance"],
  run(ctx) {
    const { faker, data, id } = ctx;
    const schoolDays = recentWeekdays(15);

    data.Enrollment.forEach((enrollment) => {
      schoolDays.forEach((date) => {
        data.Attendance.push({
          _id: id(),
          section: enrollment.section,
          student: enrollment.student,
          date,
          status: faker.helpers.weightedArrayElement([
            { weight: 88, value: "present" },
            { weight: 5, value: "tardy" },
            { weight: 5, value: "absent" },
            { weight: 2, value: "excused" },
          ]),
        });
      });
    });
  },
};
