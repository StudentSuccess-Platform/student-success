import express from "express";
import { generateRecommendations } from "../controllers/teacherController.js";
const router = express.Router();

router.post(
  "/recommendations",
  generateRecommendations
);


export default router;