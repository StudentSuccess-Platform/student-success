import { Assignment, Attendance, Goal, GoalUpdate, Grade, TeacherFeedback } from "../../models/index.js";
import { getAssignedStudent, requireStudentSection } from "../access/teacherAccess.js";
import { httpError } from "../../utils/httpError.js";
import {
  dateAtNoon,
  isObjectIdString,
  validateAttendance,
  validateFeedback,
  validateFeedbackBody,
  validateGoal,
  validateGoalPatch,
  validateGoalUpdate,
  validateGrade,
} from "../../validators/recordValidators.js";

// Teacher record entry (AC-TEA-03, 04, 05, 08). Every function starts with getAssignedStudent so a
// teacher can only write records for students they teach, and every id from the body is checked
// against that student's own sections, goals or feedback.

const toIso = (value) => (value ? new Date(value).toISOString() : null);

// Upsert that survives a race. Two identical first writes can both insert and one hits the unique
// index (E11000). The loser retries once: the row now exists, so the retry is a plain update.
async function upsertOnce(Model, filter, update, options) {
  const run = () => Model.findOneAndUpdate(filter, update, options).lean();
  try {
    return await run();
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return run();
  }
}

export async function saveGrade(userId, studentId, payload) {
  const access = await getAssignedStudent(userId, studentId);
  const input = validateGrade(payload);

  const assignment = await Assignment.findById(input.assignmentId).lean();
  const inStudentClass = assignment && access.sectionIds.some((id) => String(id) === String(assignment.section));
  if (!inStudentClass) {
    throw httpError(400, "Please fix the highlighted fields", {
      fields: { assignmentId: "Choose an assignment from this student's classes" },
    });
  }
  if (input.pointsEarned !== null && input.pointsEarned > assignment.pointsPossible) {
    throw httpError(400, "Please fix the highlighted fields", {
      fields: { pointsEarned: `Cannot be more than ${assignment.pointsPossible} points` },
    });
  }

  // Missing and excused grades carry no score, so any earlier score is removed.
  const update = { $set: { status: input.status } };
  if (input.pointsEarned === null) update.$unset = { pointsEarned: "" };
  else update.$set.pointsEarned = input.pointsEarned;

  const grade = await upsertOnce(
    Grade,
    { assignment: assignment._id, student: access.student._id },
    update,
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  return {
    grade: {
      assignmentId: String(assignment._id),
      pointsEarned: grade.pointsEarned ?? null,
      status: grade.status,
    },
  };
}

export async function saveAttendance(userId, studentId, payload) {
  const access = await getAssignedStudent(userId, studentId);
  const input = validateAttendance(payload);
  const sectionId = requireStudentSection(access, input.sectionId);
  const date = dateAtNoon(input.date);

  // One row per student, class and day: a second entry for the same day replaces the first.
  const record = await upsertOnce(
    Attendance,
    { section: sectionId, student: access.student._id, date },
    { $set: { status: input.status } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  return {
    attendance: {
      id: String(record._id),
      sectionId: String(record.section),
      date: toIso(record.date),
      status: record.status,
    },
  };
}

// Goal view shared by the goal endpoints. `progress` is the latest update's percent (0 when none).
async function goalView(goal) {
  const updates = await GoalUpdate.find({ goal: goal._id }).sort({ createdAt: 1 }).lean();
  return {
    id: String(goal._id),
    title: goal.title,
    description: goal.description || null,
    targetDate: toIso(goal.targetDate),
    status: goal.status,
    progress: updates.length ? updates[updates.length - 1].progressPercent : 0,
    updates: updates.map((u) => ({
      id: String(u._id),
      note: u.note,
      progressPercent: u.progressPercent,
      createdAt: toIso(u.createdAt),
    })),
  };
}

// Loads a goal that belongs to this student. Malformed or foreign ids are a 404.
async function findStudentGoal(studentId, goalId) {
  if (!isObjectIdString(goalId)) throw httpError(404, "Goal not found");
  const goal = await Goal.findOne({ _id: goalId, student: studentId });
  if (!goal) throw httpError(404, "Goal not found");
  return goal;
}

export async function createGoal(userId, studentId, payload) {
  const access = await getAssignedStudent(userId, studentId);
  const input = validateGoal(payload);
  const section = input.sectionId ? requireStudentSection(access, input.sectionId) : undefined;

  const goal = await Goal.create({
    student: access.student._id,
    section,
    title: input.title,
    description: input.description,
    targetDate: input.targetDate ? dateAtNoon(input.targetDate) : undefined,
  });
  return { goal: await goalView(goal) };
}

export async function updateGoal(userId, studentId, goalId, payload) {
  const access = await getAssignedStudent(userId, studentId);
  const goal = await findStudentGoal(access.student._id, goalId);
  const patch = validateGoalPatch(payload);

  const set = {};
  const unset = {};
  for (const [key, value] of Object.entries(patch)) {
    if (key === "targetDate") {
      if (value === null) unset.targetDate = "";
      else if (value !== undefined) set.targetDate = dateAtNoon(value);
    } else if (value !== undefined) {
      set[key] = value;
    }
  }
  const update = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(unset).length) update.$unset = unset;

  const updated = Object.keys(update).length
    ? await Goal.findByIdAndUpdate(goal._id, update, { new: true, runValidators: true })
    : goal;
  return { goal: await goalView(updated) };
}

export async function addGoalUpdate(userId, studentId, goalId, payload) {
  const access = await getAssignedStudent(userId, studentId);
  const goal = await findStudentGoal(access.student._id, goalId);
  const input = validateGoalUpdate(payload);

  const update = await GoalUpdate.create({
    goal: goal._id,
    author: userId,
    note: input.note,
    progressPercent: input.progressPercent,
  });
  return {
    update: {
      id: String(update._id),
      note: update.note,
      progressPercent: update.progressPercent,
      createdAt: toIso(update.createdAt),
    },
  };
}

const feedbackView = (feedback) => ({
  id: String(feedback._id),
  sectionId: String(feedback.section),
  body: feedback.body,
  createdAt: toIso(feedback.createdAt),
  updatedAt: toIso(feedback.updatedAt),
});

export async function createFeedback(userId, studentId, payload) {
  const access = await getAssignedStudent(userId, studentId);
  const input = validateFeedback(payload);
  const sectionId = requireStudentSection(access, input.sectionId);

  if (input.assignmentId) {
    const assignment = await Assignment.findById(input.assignmentId).lean();
    if (!assignment || String(assignment.section) !== String(sectionId)) {
      throw httpError(400, "Please fix the highlighted fields", {
        fields: { assignmentId: "Choose an assignment from the selected class" },
      });
    }
  }

  const feedback = await TeacherFeedback.create({
    student: access.student._id,
    teacher: access.teacher._id,
    section: sectionId,
    assignment: input.assignmentId ?? undefined,
    body: input.body,
  });
  return { feedback: feedbackView(feedback) };
}

// Only the teacher who wrote the feedback may edit it. Anyone else gets the same 404 as a missing id.
export async function updateFeedback(userId, studentId, feedbackId, payload) {
  const access = await getAssignedStudent(userId, studentId);
  if (!isObjectIdString(feedbackId)) throw httpError(404, "Feedback not found");
  const feedback = await TeacherFeedback.findOne({
    _id: feedbackId,
    student: access.student._id,
    teacher: access.teacher._id,
  });
  if (!feedback) throw httpError(404, "Feedback not found");

  const input = validateFeedbackBody(payload);
  feedback.body = input.body;
  await feedback.save();
  return { feedback: feedbackView(feedback) };
}
