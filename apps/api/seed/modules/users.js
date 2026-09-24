import { slug } from "../context.js";

// Users, role profiles and the parent/guardian-to-student relationships.
export default {
  name: "users",
  models: ["User", "TeacherProfile", "StudentProfile", "GuardianProfile", "GuardianStudentLink"],
  run(ctx) {
    const { faker, data, id, counts } = ctx;

    const makeUser = (roles) => {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const user = {
        _id: id(),
        email: `${slug(firstName)}.${slug(lastName)}.${data.User.length + 1}@example.test`,
        firstName,
        lastName,
        roles,
        isSynthetic: true,
      };
      data.User.push(user);
      return user;
    };

    makeUser(["admin"]);

    const departments = ["Mathematics", "English", "Science", "Social Studies"];
    for (let i = 0; i < counts.teachers; i += 1) {
      const user = makeUser(["teacher"]);
      data.TeacherProfile.push({
        _id: id(),
        user: user._id,
        department: departments[i % departments.length],
        title: "Teacher",
      });
    }

    for (let i = 0; i < counts.students; i += 1) {
      const user = makeUser(["student"]);
      const profile = {
        _id: id(),
        user: user._id,
        studentNumber: `S${100000 + i}`,
        gradeLevel: 9 + (i % 4),
      };
      data.StudentProfile.push(profile);
      ctx.ability.set(String(profile._id), faker.number.float({ min: 0.5, max: 1, fractionDigits: 2 }));
    }

    // Guardians are shared between siblings; some students have two guardians.
    const guardianCount = Math.ceil(counts.students * 0.75);
    for (let i = 0; i < guardianCount; i += 1) {
      const user = makeUser(["parent"]);
      data.GuardianProfile.push({
        _id: id(),
        user: user._id,
        phone: `555-01${String(i % 100).padStart(2, "0")}`,
      });
    }
    data.StudentProfile.forEach((student, i) => {
      const chosen = [data.GuardianProfile[i % guardianCount]];
      if (faker.datatype.boolean(0.25) && guardianCount > 1) {
        const second = data.GuardianProfile[(i + 1) % guardianCount];
        if (second !== chosen[0]) chosen.push(second);
      }
      chosen.forEach((guardian, k) =>
        data.GuardianStudentLink.push({
          _id: id(),
          guardian: guardian._id,
          student: student._id,
          relationship: k === 0 ? "parent" : "guardian",
          active: true,
        }),
      );
    });
  },
};
