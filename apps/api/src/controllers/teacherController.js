import { getAssignedStudent, chooseStudentSection } from "../services/access/teacherAccess.js";
import { buildAiInput } from "../services/ai/buildAiInput.js";
import { buildPrompt } from "../services/ai/recommendation.js";
import { generateRecommendation } from "../services/ai/aiClient.js";
import { AiUnavailableError, AiInvalidResponseError } from "../services/ai/aiErrors.js";
import { httpError } from "../utils/httpError.js";

// Legacy POST /teacher/recommendations. It goes through the same governance as the remediation AI
// endpoint: the student must be assigned to the signed-in teacher, and the AI input is gathered from
// the database (buildAiInput). Client-sent grades, attendance, goal and progress are ignored.
// Nothing is persisted: this returns the recommendation only (no plan, no audit record).
export async function generateRecommendations(req, res) {
  const body = req.body ?? {};
  if (body.studentId === undefined || body.studentId === null || body.studentId === "") {
    throw httpError(400, "Please fix the highlighted fields", { fields: { studentId: "Required" } });
  }

  const access = await getAssignedStudent(req.user.id, String(body.studentId));
  const sectionId = await chooseStudentSection(access, body.sectionId);
  const aiInput = await buildAiInput(access, sectionId);

  let recommendation;
  try {
    ({ recommendation } = await generateRecommendation(buildPrompt(aiInput)));
  } catch (error) {
    if (error instanceof AiUnavailableError || error instanceof AiInvalidResponseError) {
      throw httpError(error.status, error.message, { code: error.code, fallback: "manual" });
    }
    throw error;
  }

  return res.status(200).json({ recommendation });
}
