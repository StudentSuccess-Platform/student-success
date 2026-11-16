import {
  saveGrade,
  saveAttendance,
  createGoal,
  updateGoal,
  addGoalUpdate,
  createFeedback,
  updateFeedback,
} from "../services/teachers/recordEntry.js";

// Thin HTTP adapters: the service owns access checks, validation and persistence.

export async function putGrade(req, res) {
  res.status(200).json(await saveGrade(req.user.id, req.params.studentId, req.body));
}

export async function postAttendance(req, res) {
  res.status(200).json(await saveAttendance(req.user.id, req.params.studentId, req.body));
}

export async function postGoal(req, res) {
  res.status(201).json(await createGoal(req.user.id, req.params.studentId, req.body));
}

export async function putGoal(req, res) {
  res.status(200).json(await updateGoal(req.user.id, req.params.studentId, req.params.goalId, req.body));
}

export async function postGoalUpdate(req, res) {
  res.status(201).json(await addGoalUpdate(req.user.id, req.params.studentId, req.params.goalId, req.body));
}

export async function postFeedback(req, res) {
  res.status(201).json(await createFeedback(req.user.id, req.params.studentId, req.body));
}

export async function putFeedback(req, res) {
  res.status(200).json(await updateFeedback(req.user.id, req.params.studentId, req.params.feedbackId, req.body));
}
