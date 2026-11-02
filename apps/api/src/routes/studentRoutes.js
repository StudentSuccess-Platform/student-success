import express from "express";
import { dashboard } from "../controllers/studentController.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";

const router = express.Router();

// A student only ever sees their own record: the profile comes from the token, never from the URL.
router.use(requireAuth, requireRole("student"));

router.get("/dashboard", dashboard);

export default router;
