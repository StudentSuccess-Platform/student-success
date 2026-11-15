import express from "express";

// Workstream B2 grades, attendance, goals, feedback entry.
// Mounted by routes/teacherRoutes.js, which already applies requireAuth + requireRole("teacher").
// Declare full paths here (for example "/students/:studentId/...").
const router = express.Router();

export default router;
