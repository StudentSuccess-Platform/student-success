import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { startTestServer } from "../../helpers/server.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";
import {
  Assignment,
  Attendance,
  Course,
  Enrollment,
  Goal,
  GoalUpdate,
  Grade,
  RemediationItem,
  RemediationPlan,
  Section,
  StudentProfile,
  TeacherFeedback,
  TeacherProfile,
  User,
} from "../../../src/models/index.js";

const uri = createTestDatabaseUri();

describe("student endpoints", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  let ctx;
  let student;
  let token;

  before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    assert.equal(await connectDatabase({ uri, retries: 3, retryDelayMs: 1000 }), true);
    ctx = await startTestServer();

    const user = await User.create({
      email: "student@example.com",
      firstName: "Sam",
      lastName: "Student",
      roles: ["student"],
    });
    student = await StudentProfile.create({ user: user._id, studentNumber: "S-100", gradeLevel: 10 });
    token = jwt.sign({ roles: ["student"] }, process.env.JWT_SECRET, { subject: String(user._id) });

    const otherUser = await User.create({
      email: "other-student@example.com",
      firstName: "Other",
      lastName: "Student",
      roles: ["student"],
    });
    const otherStudent = await StudentProfile.create({
      user: otherUser._id,
      studentNumber: "S-200",
      gradeLevel: 9,
    });

    const teacherUser = await User.create({
      email: "teacher@example.com",
      firstName: "Taylor",
      lastName: "Teacher",
      roles: ["teacher"],
    });
    const teacher = await TeacherProfile.create({ user: teacherUser._id });
    const course = await Course.create({ code: "MATH-10", title: "Algebra", subject: "Math", gradeLevel: 10 });
    const section = await Section.create({ course: course._id, teacher: teacher._id, term: "Fall 2026" });
    await Enrollment.create({ section: section._id, student: student._id, status: "active" });
    await Enrollment.create({ section: section._id, student: otherStudent._id, status: "active" });
    const assignment = await Assignment.create({
      section: section._id,
      title: "Chapter 1 Quiz",
      category: "quiz",
      pointsPossible: 20,
      dueDate: new Date("2026-09-10"),
    });
    await Grade.create({ assignment: assignment._id, student: student._id, pointsEarned: 18 });
    await Grade.create({ assignment: assignment._id, student: otherStudent._id, pointsEarned: 10 });
    await Attendance.create({
      section: section._id,
      student: student._id,
      date: new Date("2026-09-11"),
      status: "present",
    });
    await Attendance.create({
      section: section._id,
      student: otherStudent._id,
      date: new Date("2026-09-11"),
      status: "absent",
    });

    const goal = await Goal.create({
      student: student._id,
      title: "Complete every assignment",
      status: "active",
    });
    await GoalUpdate.create({
      goal: goal._id,
      author: user._id,
      note: "Making progress",
      progressPercent: 75,
    });
    await TeacherFeedback.create({
      student: student._id,
      teacher: teacher._id,
      section: section._id,
      body: "Good work on the quiz.",
    });
    const plan = await RemediationPlan.create({
      student: student._id,
      section: section._id,
      teacher: teacher._id,
      title: "Algebra support",
      status: "published",
      reviewedBy: teacher._id,
      reviewedAt: new Date("2026-09-12"),
      publishedAt: new Date("2026-09-13"),
    });
    await RemediationItem.create({
      plan: plan._id,
      title: "Practice equations",
      status: "todo",
    });
  });

  after(async () => {
    await ctx?.close();
    await dropTestDatabase();
    await disconnectDatabase();
  });

  test("returns the authenticated student's profile", async () => {
    const response = await fetch(`${ctx.baseUrl}/api/student/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(response.status, 200);
    const { profile } = await response.json();
    assert.equal(profile.studentNumber, "S-100");
    assert.equal(profile.user.firstName, "Sam");
    assert.equal(profile.user.email, "student@example.com");
  });

  test("returns only the authenticated student's populated grades", async () => {
    const response = await fetch(`${ctx.baseUrl}/api/student/grades`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(response.status, 200);
    const { grades } = await response.json();
    assert.equal(grades.length, 1);
    assert.equal(grades[0].pointsEarned, 18);
    assert.equal(grades[0].assignment.title, "Chapter 1 Quiz");
    assert.equal(grades[0].assignment.section.course.title, "Algebra");
  });

  test("returns only the authenticated student's populated attendance", async () => {
    const response = await fetch(`${ctx.baseUrl}/api/student/attendance`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(response.status, 200);
    const { attendance } = await response.json();
    assert.equal(attendance.length, 1);
    assert.equal(attendance[0].status, "present");
    assert.equal(attendance[0].section.course.title, "Algebra");
  });

  test("returns dashboard data assembled from the authenticated student's records", async () => {
    const response = await fetch(`${ctx.baseUrl}/api/student/me/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(response.status, 200);
    const dashboard = await response.json();
    assert.equal(dashboard.student.firstName, "Sam");
    assert.equal(dashboard.student.term, "Fall 2026");
    assert.equal(dashboard.summary.currentGrade, 90);
    assert.equal(dashboard.summary.attendance, 100);
    assert.equal(dashboard.grades.length, 1);
    assert.equal(dashboard.grades[0].subject, "Algebra");
    assert.equal(dashboard.grades[0].grade, 90);
    assert.equal(dashboard.performanceTrend.length, 1);
    assert.equal(dashboard.performanceTrend[0].value, 90);
    assert.equal(dashboard.goals[0].progress, 75);
    assert.equal(dashboard.teacherFeedback.message, "Good work on the quiz.");
    assert.equal(dashboard.teacherFeedback.teacher, "Taylor Teacher");
    assert.equal(dashboard.supportPlan.status, "approved");
    assert.equal(dashboard.supportPlan.activities[0].title, "Practice equations");
  });
});
