import express from "express";
import { list, profile } from "../../controllers/teacherStudentsController.js";

// Workstream B1 assigned-student list and profile.
// Mounted by routes/teacherRoutes.js, which already applies requireAuth + requireRole("teacher").
const router = express.Router();

router.get("/students", list);
router.get("/students/:studentId", profile);

export default router;
