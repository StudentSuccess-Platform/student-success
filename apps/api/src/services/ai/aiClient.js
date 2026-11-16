import OpenAI from "openai";
import { AiUnavailableError, AiInvalidResponseError } from "./aiErrors.js";

// Provider abstraction. Every provider returns the parsed model output; generateRecommendation
// validates its shape. Env is read at call time so tests can pass their own.
//   LLM_PROVIDER=openai  OPENAI_API_KEY + LLM_MODEL
//   LLM_PROVIDER=ollama  LLM_BASE_URL (default http://127.0.0.1:11434) + LLM_MODEL
//   LLM_PROVIDER=mock    deterministic, no network (tests, CI, demo)
//   AI_TIMEOUT_MS        per-request timeout, default 15000

export const PROMPT_VERSION = "v1";
const DEFAULT_TIMEOUT_MS = 15000;
export const OLLAMA_TEMPERATURE = 0.2; // the value used when benchmarking local models (2026-11-16)

export const RECOMMENDATION_SCHEMA = {
  type: "object",
  properties: {
    guidance: { type: "string" },
    goal: { type: "string" },
    nextSteps: { type: "string" },
  },
  required: ["guidance", "goal", "nextSteps"],
  additionalProperties: false,
};

const KEYS = ["guidance", "goal", "nextSteps"];

export function timeoutMs(env) {
  const value = Number(env.AI_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

const STEP_KEYS = ["action", "step", "description", "text", "title"];

// Small local models often return a list (of strings or small objects) where a string is asked for.
// A list of text is turned into numbered lines; anything else that is not text is rejected.
function toText(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    const lines = value.map(toStepText).filter(Boolean);
    if (lines.length === 0) return "";
    return lines.length === 1 ? lines[0] : lines.map((line, i) => `${i + 1}. ${line}`).join("\n");
  }
  return "";
}

function toStepText(item) {
  if (typeof item === "string") return item.trim();
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const key = STEP_KEYS.find((k) => typeof item[k] === "string" && item[k].trim() !== "");
    return key ? item[key].trim() : "";
  }
  return "";
}

// Accepts { guidance, goal, nextSteps } as non-empty text (or a list of text). Extra keys are dropped.
export function validateRecommendation(output) {
  if (output === null || typeof output !== "object" || Array.isArray(output)) throw new AiInvalidResponseError();
  const result = Object.fromEntries(KEYS.map((key) => [key, toText(output[key])]));
  if (KEYS.some((key) => result[key] === "")) throw new AiInvalidResponseError();
  return result;
}

// Parses model text and checks its shape, so every provider fails the same way on bad output.
function parseModelJson(text) {
  if (typeof text !== "string") throw new AiInvalidResponseError();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AiInvalidResponseError();
  }
  return validateRecommendation(parsed);
}

// Deterministic output for tests, CI and demos. It never touches the network.
const MOCK_OUTPUT = {
  guidance: "Review the assignments where points were lost and ask your teacher what to practice first.",
  goal: "Improve the next graded assignment by a measurable amount.",
  nextSteps: "1. Review each missed assignment with your teacher.\n2. Practice ten problems in the weakest category each day.\n3. Check the portal for feedback after each graded task.",
};

function createMockClient() {
  return {
    provider: "mock",
    model: "mock-1",
    async generate() {
      return validateRecommendation(MOCK_OUTPUT);
    },
  };
}

function createOpenAiClient({ env, openaiFactory }) {
  const model = env.LLM_MODEL;
  return {
    provider: "openai",
    model,
    async generate({ instructions, input }) {
      const apiKey = env.OPENAI_API_KEY;
      if (!apiKey || !model) throw new AiUnavailableError("The AI service is not configured");
      // Created per call so a missing key is an "unavailable" result, not a startup crash.
      const client = openaiFactory({ apiKey, maxRetries: 0 });
      let response;
      try {
        response = await client.responses.create(
          {
            model,
            instructions,
            input,
            text: {
              format: {
                type: "json_schema",
                name: "student_remediation_recommendation",
                strict: true,
                schema: RECOMMENDATION_SCHEMA,
              },
            },
          },
          { signal: AbortSignal.timeout(timeoutMs(env)) },
        );
      } catch {
        throw new AiUnavailableError();
      }
      return parseModelJson(response?.output_text);
    },
  };
}

function createOllamaClient({ env, fetchImpl }) {
  const model = env.LLM_MODEL;
  const baseUrl = (env.LLM_BASE_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
  return {
    provider: "ollama",
    model,
    async generate({ instructions, input }) {
      if (!model) throw new AiUnavailableError("The AI service is not configured");
      let text;
      try {
        const res = await fetchImpl(`${baseUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            stream: false,
            options: { temperature: OLLAMA_TEMPERATURE }, // low and steady: advice should not vary wildly between runs
            format: RECOMMENDATION_SCHEMA, // Ollama accepts a JSON schema here, which keeps small models on shape
            messages: [
              { role: "system", content: instructions },
              { role: "user", content: input },
            ],
          }),
          signal: AbortSignal.timeout(timeoutMs(env)),
        });
        if (!res.ok) throw new AiUnavailableError();
        text = await res.text();
      } catch (error) {
        if (error instanceof AiUnavailableError) throw error;
        throw new AiUnavailableError(); // network error, timeout or abort
      }
      let envelope;
      try {
        envelope = JSON.parse(text);
      } catch {
        throw new AiInvalidResponseError();
      }
      return parseModelJson(envelope?.message?.content);
    },
  };
}

// Returns { provider, model, generate }. A missing or unknown provider does not throw here;
// generate() throws AiUnavailableError, so callers handle every failure the same way.
export function createAiClient({ env = process.env, fetchImpl = fetch, openaiFactory = (opts) => new OpenAI(opts) } = {}) {
  const provider = (env.LLM_PROVIDER ?? "").trim().toLowerCase();
  if (provider === "mock") return createMockClient();
  if (provider === "openai") return createOpenAiClient({ env, openaiFactory });
  if (provider === "ollama") return createOllamaClient({ env, fetchImpl });
  return {
    provider: null,
    model: null,
    async generate() {
      throw new AiUnavailableError("The AI service is not configured");
    },
  };
}

// Test seam: when set, its return value (raw model output) replaces the provider.
let override = null;
export function setAiGenerator(fn) {
  override = typeof fn === "function" ? fn : null;
}

// Single entry point. prompt = { instructions, input }. Returns { recommendation, provider, model }.
export async function generateRecommendation(prompt, { client } = {}) {
  if (override) {
    const recommendation = validateRecommendation(await override(prompt));
    return { recommendation, provider: "test", model: "test-1" };
  }
  const ai = client ?? createAiClient();
  const recommendation = validateRecommendation(await ai.generate(prompt));
  return { recommendation, provider: ai.provider, model: ai.model };
}
