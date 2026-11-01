import express from "express";
import { register, login, me, forgotPassword, resetPasswordHandler } from "../controllers/authController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPasswordHandler);
router.get("/me", requireAuth, me);

export default router;
