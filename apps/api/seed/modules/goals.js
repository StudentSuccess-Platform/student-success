import { REF_DATE, addDays } from "../context.js";

const GOAL_TITLES = [
  "Raise my grade by one letter",
  "Improve my attendance",
  "Turn in all homework on time",
];

// Student goals and their progress updates (authored by the student).
export default {
  name: "goals",
  models: ["Goal", "GoalUpdate"],
  run(ctx) {
    const { faker, data, id } = ctx;

    data.StudentProfile.forEach((student) => {
      const goalCount = faker.number.int({ min: 1, max: 2 });
      for (let g = 0; g < goalCount; g += 1) {
        const goal = {
          _id: id(),
          student: student._id,
          title: GOAL_TITLES[(data.Goal.length + g) % GOAL_TITLES.length],
          description: "Student-set goal for the fall term.",
          targetDate: addDays(REF_DATE, 45),
          status: "active",
        };
        data.Goal.push(goal);

        const steps = [25, 50, 75].slice(0, faker.number.int({ min: 2, max: 3 }));
        steps.forEach((progressPercent) =>
          data.GoalUpdate.push({
            _id: id(),
            goal: goal._id,
            author: student.user,
            note: "Working on it.",
            progressPercent,
          }),
        );
      }
    });
  },
};
