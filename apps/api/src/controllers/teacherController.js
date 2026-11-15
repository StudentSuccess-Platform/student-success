import {
  generateAIRecommendation,
} from "../services/ai/recommendation.js";
import { AiUnavailableError, AiInvalidResponseError } from "../services/ai/aiErrors.js";

export async function generateRecommendations(req, res) {
  try {
    const {
      studentId,
      grades,
      attendance,
      goal,
      progress,
    } = req.body;

    if (!studentId || !grades) {
      return res.status(400).json({
        error: "Missing required student academic data",
      });
    }

    const recommendation =
      await generateAIRecommendation({
        studentId,
        grades,
        attendance,
        goal,
        progress,
      });

    return res.status(200).json({
      recommendation,
    });
  } catch (error) {
    if (error instanceof AiUnavailableError || error instanceof AiInvalidResponseError) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code,
        fallback: "manual",
      });
    }

    console.error(
      "Error generating AI recommendation:",
      error
    );

    return res.status(503).json({
      error:
        "AI recommendation service is currently unavailable",
    });
  }
}