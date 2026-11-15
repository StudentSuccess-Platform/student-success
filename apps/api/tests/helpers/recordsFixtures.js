import bcrypt from "bcryptjs";
import {
  User,
  TeacherProfile,
  StudentProfile,
  Section,
  Enrollment,
  Assignment,
  Goal,
} from "../../src/models/index.js";
import { PASSWORD } from "./fixtures.js";

// Extra records for the record-entry tests, on top of createSchool():
//   - a second class of Tess's that Ada is NOT in (its assignment must be rejected for Ada)
//   - a class taught by Otto (the other teacher) with Ben in it, Ada not
//   - a co-teacher, Cora, who also teaches Ada (she can see Ada but did not write Tess's feedback)
//   - an outsider student with no classes at all
export async function addRecordFixtures(school) {
  const { teacher, section, adaProfile, benProfile } = school;
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  const dueDate = new Date("2025-10-20T12:00:00Z");

  const otherUser = await User.findOne({ email: "other.teacher@example.test" }).lean();
  const otherTeacher = await TeacherProfile.findOne({ user: otherUser._id }).lean();

  const course = (await Section.findById(section._id).lean()).course;
  const geometry = await Section.create({ course, teacher: teacher._id, term: "2025-Fall", period: 4, room: "Room 3" });
  const geometryQuiz = await Assignment.create({
    section: geometry._id,
    title: "Geometry Quiz",
    category: "quiz",
    pointsPossible: 10,
    dueDate,
  });
  const homework = await Assignment.create({
    section: section._id,
    title: "Homework 1",
    category: "homework",
    pointsPossible: 20,
    dueDate,
  });

  const ottoSection = await Section.create({ course, teacher: otherTeacher._id, term: "2025-Fall", period: 5 });
  await Enrollment.create({ section: ottoSection._id, student: benProfile._id });
  const ottoQuiz = await Assignment.create({
    section: ottoSection._id,
    title: "Otto Quiz",
    category: "quiz",
    pointsPossible: 10,
    dueDate,
  });

  const coUser = await User.create({
    email: "co.teacher@example.test",
    firstName: "Cora",
    lastName: "Cowriter",
    roles: ["teacher"],
    passwordHash,
  });
  const coTeacher = await TeacherProfile.create({ user: coUser._id });
  const coSection = await Section.create({ course, teacher: coTeacher._id, term: "2025-Fall", period: 6 });
  await Enrollment.create({ section: coSection._id, student: adaProfile._id });

  const outsiderUser = await User.create({
    email: "outsider@example.test",
    firstName: "Olly",
    lastName: "Outsider",
    roles: ["student"],
    passwordHash,
  });
  const outsider = await StudentProfile.create({ user: outsiderUser._id, studentNumber: "S-9", gradeLevel: 9 });

  const benGoal = await Goal.create({ student: benProfile._id, title: "Ben's own goal" });
  const unitTest = await Assignment.findOne({ title: "Unit Test", section: section._id }).lean();

  return {
    otherTeacher,
    geometry,
    geometryQuiz,
    homework,
    unitTest,
    ottoSection,
    ottoQuiz,
    outsider,
    benGoal,
    coTeacherEmail: "co.teacher@example.test",
  };
}
