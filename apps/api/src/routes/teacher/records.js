import express from "express";
import {
  putGrade,
  postAttendance,
  postGoal,
  putGoal,
  postGoalUpdate,
  postFeedback,
  putFeedback,
} from "../../controllers/teacherRecordsController.js";

// Workstream B2 grades, attendance, goals, feedback entry.
// Mounted by routes/teacherRoutes.js, which already applies requireAuth + requireRole("teacher").
const router = express.Router();

router.put("/students/:studentId/grades", putGrade);
router.post("/students/:studentId/attendance", postAttendance);
router.post("/students/:studentId/goals", postGoal);
router.put("/students/:studentId/goals/:goalId", putGoal);
router.post("/students/:studentId/goals/:goalId/updates", postGoalUpdate);
router.post("/students/:studentId/feedback", postFeedback);
router.put("/students/:studentId/feedback/:feedbackId", putFeedback);

export default router;
