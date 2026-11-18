import express from "express";
import { children, childDashboard, childSupportPlans } from "../controllers/parentController.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";

const router = express.Router();

// A parent only sees students linked to them (relationship-based access, checked in the service).
router.use(requireAuth, requireRole("parent"));

router.get("/children", children);
router.get("/children/:studentId/dashboard", childDashboard);
router.get("/children/:studentId/support-plans", childSupportPlans);

export default router;
