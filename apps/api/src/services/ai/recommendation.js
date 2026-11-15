import { generateRecommendation } from "./aiClient.js";

// Prompt text for remediation guidance. Provider calls go through services/ai/aiClient.js.
const INSTRUCTIONS = `
  You are an academic guidance assistant helping a teacher create a short remediation or academic support plan for a student.
  Use only the student data provided. Do not invent causes, behaviors, diagnoses, or personal circumstances that are not supported by the data.
  The student and parent can already see grades, attendance, and academic data in the portal, so do not repeat those values unless necessary for context.
  Create a student- and parent-friendly response with the following structure:
  Guidance: Write 1-2 short sentences explaining what the student should focus on academically. Use supportive, plain language. Do not restate grades or attendance. Do not use labels such as “area of concern” or “observed pattern.”
  Goal: Provide one realistic, measurable short-term goal based on the available data.
  Next Steps: Provide 2-4 specific actions the student can take. Each action should be clear, practical, and easy for a student and parent to understand.
  If the student is performing well and no remediation is needed, provide a maintenance goal and simple actions to continue current success.
  Keep the full response concise, approximately 60-100 words.
  The recommendation is advisory and must be reviewed by a teacher before becoming official guidance.
  Make sure the response is returned as a json object with the following keys: guidance, goal, nextSteps. Each key should have a string value. Do not include any additional text or explanation outside of the JSON object.
  `;

// Builds the { instructions, input } pair sent to the provider.
export function buildPrompt({ grades, attendance, goal, progress }) {
  return {
    instructions: INSTRUCTIONS,
    input: `
    Grades:
    ${JSON.stringify(grades)}

    Attendance:
    ${JSON.stringify(attendance)}

    Current goal:
    ${goal ?? "Not provided"}

    Progress:
    ${progress ?? "Not provided"}
    `,
  };
}

// Legacy entry point (POST /teacher/recommendations). Returns { guidance, goal, nextSteps }.
export async function generateAIRecommendation({ grades, attendance, goal, progress }) {
  const { recommendation } = await generateRecommendation(buildPrompt({ grades, attendance, goal, progress }));
  return recommendation;
}
