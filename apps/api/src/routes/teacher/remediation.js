import express from "express";

// Workstream B3 remediation plan workflow (create, edit, approve, reject, publish).
// Mounted by routes/teacherRoutes.js, which already applies requireAuth + requireRole("teacher").
// Declare full paths here (for example "/students/:studentId/...").
const router = express.Router();

export default router;
