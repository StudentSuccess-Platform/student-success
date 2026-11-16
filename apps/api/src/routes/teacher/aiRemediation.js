import express from "express";
import { createAiRemediationPlan } from "../../controllers/teacherAiController.js";

// Workstream B4 AI-generated remediation plan request.
// Mounted by routes/teacherRoutes.js, which already applies requireAuth + requireRole("teacher").
const router = express.Router();

router.post("/students/:studentId/remediation/ai", createAiRemediationPlan);

export default router;
