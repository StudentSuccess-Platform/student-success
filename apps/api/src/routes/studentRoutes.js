import express from "express";
import {
  dashboard,
  getStudentAttendance,
  getStudentGrades,
  getStudentProfile,
  supportPlans,
} from "../controllers/studentController.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";

const router = express.Router();

router.use(requireAuth, requireRole("student"));
router.get("/profile", getStudentProfile);
router.get("/grades", getStudentGrades);
router.get("/attendance", getStudentAttendance);
router.get("/dashboard", dashboard);
router.get("/support-plans", supportPlans);
router.get("/me/dashboard", dashboard);

export default router;
