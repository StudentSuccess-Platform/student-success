import express from "express";
import { generateRecommendations } from "../controllers/teacherController.js";
import { dashboard, classes, classDetail, addClassStudent } from "../controllers/teacherViewsController.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";
import { requireDatabase } from "../middleware/requireDatabase.js";
import studentsRouter from "./teacher/students.js";
import recordsRouter from "./teacher/records.js";
import remediationRouter from "./teacher/remediation.js";
import aiRemediationRouter from "./teacher/aiRemediation.js";
import reportsRouter from "./teacher/reports.js";

const router = express.Router();

// Everything under /teacher needs a signed-in teacher.
router.use(requireAuth, requireRole("teacher"), requireDatabase);

router.get("/dashboard", dashboard);
router.get("/classes", classes);
router.get("/classes/:classId", classDetail);
router.post("/classes/:classId/students", addClassStudent);
router.post("/recommendations", generateRecommendations);

// Student-scoped features. Each router file is owned by one workstream (see docs/design/teacher-portal-mvp.md).
router.use(studentsRouter);
router.use(recordsRouter);
router.use(remediationRouter);
router.use(aiRemediationRouter);
router.use(reportsRouter);

export default router;
