import express from "express";
import {
  getStudentAttendance,
  getStudentDashboard,
  getStudentGrades,
  getStudentProfile,
} from "../controllers/studentController.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";

const router = express.Router();

router.use(requireAuth, requireRole("student"));
router.get("/profile", getStudentProfile);
router.get("/grades", getStudentGrades);
router.get("/attendance", getStudentAttendance);
router.get("/me/dashboard", getStudentDashboard);

export default router;