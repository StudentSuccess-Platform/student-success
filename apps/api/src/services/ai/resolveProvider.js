// Startup provider selection. Runs once from server.js (never from app.js, so tests are unaffected).
//   openai with a key and model that answer a quick check -> keep openai
//   openai that is not configured or cannot be reached     -> fall back to ollama
//   unset or unknown provider                              -> ollama (the default)
//   mock / ollama                                          -> unchanged
// The result is written to `env` (process.env in the server), so createAiClient() picks it up.

const OPENAI_MODELS_URL = "https://api.openai.com/v1/models";
const PROBE_TIMEOUT_MS = 5000;
export const DEFAULT_OLLAMA_URL = "http://localhost:11434";
export const DEFAULT_OLLAMA_MODEL = "llama3.2";

async function openAiReachable(env, fetchImpl) {
  try {
    const res = await fetchImpl(OPENAI_MODELS_URL, {
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function ollamaReachable(env, fetchImpl) {
  try {
    const res = await fetchImpl(`${env.LLM_BASE_URL.replace(/\/+$/, "")}/api/tags`, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function useOllama(env, { resetModel }) {
  env.LLM_PROVIDER = "ollama";
  env.LLM_BASE_URL = env.LLM_BASE_URL || DEFAULT_OLLAMA_URL;
  // A cloud model name (for example gpt-*) means nothing to Ollama, so it is replaced when falling back.
  if (resetModel || !env.LLM_MODEL) env.LLM_MODEL = env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
}

// Returns { provider, fellBackFrom, reason, ready }. `ready` is whether the chosen provider answered.
export async function resolveLlmProvider({ env = process.env, fetchImpl = fetch } = {}) {
  const requested = (env.LLM_PROVIDER ?? "").trim().toLowerCase();

  if (requested === "mock") return { provider: "mock", fellBackFrom: null, reason: null, ready: true };

  if (requested === "openai") {
    let reason = null;
    if (!env.OPENAI_API_KEY || !env.LLM_MODEL) reason = "OPENAI_API_KEY or LLM_MODEL is not set";
    else if (!(await openAiReachable(env, fetchImpl))) reason = "OpenAI could not be reached with the configured key";
    if (!reason) return { provider: "openai", fellBackFrom: null, reason: null, ready: true };
    useOllama(env, { resetModel: true });
    return { provider: "ollama", fellBackFrom: "openai", reason, ready: await ollamaReachable(env, fetchImpl) };
  }

  const fellBackFrom = requested && requested !== "ollama" ? requested : null;
  useOllama(env, { resetModel: false });
  return {
    provider: "ollama",
    fellBackFrom,
    reason: fellBackFrom ? `Unknown LLM_PROVIDER "${fellBackFrom}"` : null,
    ready: await ollamaReachable(env, fetchImpl),
  };
}

export function describeResolution(result, env = process.env) {
  const parts = [`AI provider: ${result.provider}`];
  if (result.provider !== "mock") parts[0] += ` (model ${env.LLM_MODEL})`;
  if (result.fellBackFrom) parts.push(`fell back from ${result.fellBackFrom}: ${result.reason}`);
  if (!result.ready) parts.push("not reachable yet, so AI requests will offer the manual plan until it is");
  return parts.join(" - ");
}
