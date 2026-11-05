import express from "express";
import { generateRecommendations } from "../controllers/teacherController.js";
import { dashboard, classes, classDetail } from "../controllers/teacherViewsController.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";

const router = express.Router();

// Everything under /teacher needs a signed-in teacher.
router.use(requireAuth, requireRole("teacher"));

router.get("/dashboard", dashboard);
router.get("/classes", classes);
router.get("/classes/:classId", classDetail);
router.post("/recommendations", generateRecommendations);

export default router;
