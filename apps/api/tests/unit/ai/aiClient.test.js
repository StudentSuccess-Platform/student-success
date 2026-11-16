import { describe, test, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  createAiClient,
  generateRecommendation,
  RECOMMENDATION_SCHEMA,
  setAiGenerator,
  validateRecommendation,
} from "../../../src/services/ai/aiClient.js";
import { AiUnavailableError, AiInvalidResponseError } from "../../../src/services/ai/aiErrors.js";

const prompt = { instructions: "Be brief.", input: "Grades: []" };
const good = { guidance: "Review fractions.", goal: "Pass the quiz.", nextSteps: "1. Practice\n2. Review" };
const ollamaEnv = { LLM_PROVIDER: "ollama", LLM_MODEL: "llama-test", LLM_BASE_URL: "http://ollama.test:11434/" };

// A fetch stub that answers with a fixed status and body (string or object) and records calls.
function fakeFetch(status, body) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    const text = typeof body === "string" ? body : JSON.stringify(body);
    return new Response(text, { status });
  };
  fn.calls = calls;
  return fn;
}

async function rejectsWith(promise, ErrorType) {
  await assert.rejects(promise, (error) => error instanceof ErrorType);
}

describe("createAiClient", () => {
  afterEach(() => setAiGenerator(null));

  test("mock provider is deterministic and needs no network", async () => {
    const client = createAiClient({ env: { LLM_PROVIDER: "mock" }, fetchImpl: () => assert.fail("no network") });
    assert.equal(client.provider, "mock");
    assert.equal(client.model, "mock-1");
    const first = await client.generate(prompt);
    const second = await client.generate(prompt);
    assert.deepEqual(first, second);
    assert.deepEqual(validateRecommendation(first), first);
  });

  test("unset provider is unavailable with a clear message", async () => {
    const client = createAiClient({ env: {} });
    assert.equal(client.provider, null);
    await assert.rejects(client.generate(prompt), { name: "AiUnavailableError", message: "The AI service is not configured" });
  });

  test("unknown provider is unavailable", async () => {
    await rejectsWith(createAiClient({ env: { LLM_PROVIDER: "gemini" } }).generate(prompt), AiUnavailableError);
  });

  test("openai without a key is unavailable and never builds a client", async () => {
    let built = false;
    const client = createAiClient({
      env: { LLM_PROVIDER: "openai", LLM_MODEL: "gpt-test" },
      openaiFactory: () => {
        built = true;
      },
    });
    await rejectsWith(client.generate(prompt), AiUnavailableError);
    assert.equal(built, false);
  });

  test("openai without a model is unavailable", async () => {
    const client = createAiClient({
      env: { LLM_PROVIDER: "openai", OPENAI_API_KEY: "test-key" },
      openaiFactory: () => assert.fail("no client"),
    });
    await rejectsWith(client.generate(prompt), AiUnavailableError);
  });

  test("openai success uses the key and model from env and returns parsed output", async () => {
    const seen = {};
    const client = createAiClient({
      env: { LLM_PROVIDER: "openai", LLM_MODEL: "gpt-test", OPENAI_API_KEY: "test-key" },
      openaiFactory: (options) => {
        seen.options = options;
        return {
          responses: {
            create: async (params) => {
              seen.params = params;
              return { output_text: JSON.stringify(good) };
            },
          },
        };
      },
    });
    assert.deepEqual(await client.generate(prompt), good);
    assert.equal(seen.options.apiKey, "test-key");
    assert.equal(seen.params.model, "gpt-test");
    assert.equal(seen.params.instructions, "Be brief.");
    assert.equal(seen.params.text.format.strict, true);
  });

  test("openai output missing required keys is an invalid response", async () => {
    const client = createAiClient({
      env: { LLM_PROVIDER: "openai", LLM_MODEL: "gpt-test", OPENAI_API_KEY: "test-key" },
      openaiFactory: () => ({ responses: { create: async () => ({ output_text: JSON.stringify({ guidance: "Only this" }) }) } }),
    });
    await rejectsWith(client.generate(prompt), AiInvalidResponseError);
  });

  test("openai non-JSON output is an invalid response", async () => {
    const client = createAiClient({
      env: { LLM_PROVIDER: "openai", LLM_MODEL: "gpt-test", OPENAI_API_KEY: "test-key" },
      openaiFactory: () => ({ responses: { create: async () => ({ output_text: "not json" }) } }),
    });
    await rejectsWith(client.generate(prompt), AiInvalidResponseError);
  });

  test("openai provider errors are unavailable", async () => {
    const client = createAiClient({
      env: { LLM_PROVIDER: "openai", LLM_MODEL: "gpt-test", OPENAI_API_KEY: "test-key" },
      openaiFactory: () => ({
        responses: {
          create: async () => {
            throw new Error("upstream 500");
          },
        },
      }),
    });
    await rejectsWith(client.generate(prompt), AiUnavailableError);
  });

  test("ollama posts to /api/chat with the JSON schema as its format and no streaming", async () => {
    const fetchImpl = fakeFetch(200, { message: { role: "assistant", content: JSON.stringify(good) } });
    const client = createAiClient({ env: ollamaEnv, fetchImpl });
    assert.deepEqual(await client.generate(prompt), good);
    assert.equal(fetchImpl.calls.length, 1);
    const { url, init } = fetchImpl.calls[0];
    assert.equal(url, "http://ollama.test:11434/api/chat");
    assert.equal(init.method, "POST");
    const body = JSON.parse(init.body);
    assert.equal(body.model, "llama-test");
    assert.deepEqual(body.format, RECOMMENDATION_SCHEMA);
    assert.equal(body.stream, false);
    assert.deepEqual(body.options, { temperature: 0.2 });
    assert.deepEqual(body.messages, [
      { role: "system", content: "Be brief." },
      { role: "user", content: "Grades: []" },
    ]);
  });

  test("ollama without a model is unavailable and makes no request", async () => {
    const fetchImpl = fakeFetch(200, {});
    await rejectsWith(createAiClient({ env: { LLM_PROVIDER: "ollama" }, fetchImpl }).generate(prompt), AiUnavailableError);
    assert.equal(fetchImpl.calls.length, 0);
  });

  test("ollama 500 is unavailable", async () => {
    const client = createAiClient({ env: ollamaEnv, fetchImpl: fakeFetch(500, { error: "boom" }) });
    await rejectsWith(client.generate(prompt), AiUnavailableError);
  });

  test("ollama malformed envelope is an invalid response", async () => {
    const client = createAiClient({ env: ollamaEnv, fetchImpl: fakeFetch(200, "<html>") });
    await rejectsWith(client.generate(prompt), AiInvalidResponseError);
  });

  test("ollama malformed model JSON is an invalid response", async () => {
    const client = createAiClient({ env: ollamaEnv, fetchImpl: fakeFetch(200, { message: { content: "{oops" } }) });
    await rejectsWith(client.generate(prompt), AiInvalidResponseError);
  });

  test("ollama network rejection is unavailable", async () => {
    const client = createAiClient({
      env: ollamaEnv,
      fetchImpl: async () => {
        throw new TypeError("fetch failed");
      },
    });
    await rejectsWith(client.generate(prompt), AiUnavailableError);
  });

  test("openai timeout (AI_TIMEOUT_MS) aborts a call that never resolves and is unavailable", async () => {
    // Like the real SDK, the fake create() rejects when the request signal aborts and never resolves otherwise.
    let receivedSignal;
    const client = createAiClient({
      env: { LLM_PROVIDER: "openai", LLM_MODEL: "gpt-test", OPENAI_API_KEY: "test-key", AI_TIMEOUT_MS: "20" },
      openaiFactory: () => ({
        responses: {
          create: (params, options) => {
            receivedSignal = options.signal;
            return new Promise((_resolve, reject) => {
              options.signal.addEventListener("abort", () => reject(options.signal.reason));
            });
          },
        },
      }),
    });
    // The abort timer is unref'd, so keep the event loop alive until the request settles.
    const keepAlive = setTimeout(() => {}, 2000);
    try {
      await assert.rejects(client.generate(prompt), (error) => {
        assert.ok(error instanceof AiUnavailableError);
        assert.equal(error.code, "AI_UNAVAILABLE");
        return true;
      });
      assert.equal(receivedSignal.aborted, true, "the request signal was aborted by the timeout");
    } finally {
      clearTimeout(keepAlive);
    }
  });

  test("ollama timeout (AI_TIMEOUT_MS) aborts the request and is unavailable", async () => {
    const fetchImpl = (url, { signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason));
      });
    const client = createAiClient({ env: { ...ollamaEnv, AI_TIMEOUT_MS: "20" }, fetchImpl });
    // The abort timer is unref'd, so keep the event loop alive until the request settles.
    const keepAlive = setTimeout(() => {}, 2000);
    try {
      await rejectsWith(client.generate(prompt), AiUnavailableError);
    } finally {
      clearTimeout(keepAlive);
    }
  });
});

describe("generateRecommendation", () => {
  afterEach(() => setAiGenerator(null));

  test("uses the injected client and returns the recommendation with provider and model", async () => {
    const client = { provider: "ollama", model: "llama-test", generate: async () => good };
    const result = await generateRecommendation(prompt, { client });
    assert.deepEqual(result, { recommendation: good, provider: "ollama", model: "llama-test" });
  });

  test("schema-invalid output is rejected even from a client", async () => {
    const client = { provider: "mock", model: "mock-1", generate: async () => ({ guidance: "", goal: "x", nextSteps: "y" }) };
    await rejectsWith(generateRecommendation(prompt, { client }), AiInvalidResponseError);
  });

  test("setAiGenerator replaces the provider and setAiGenerator(null) restores it", async () => {
    setAiGenerator(async () => good);
    const result = await generateRecommendation(prompt);
    assert.equal(result.recommendation.goal, "Pass the quiz.");
    assert.equal(result.provider, "test");
    setAiGenerator(null);
    await rejectsWith(generateRecommendation(prompt, { client: createAiClient({ env: {} }) }), AiUnavailableError);
  });
});

describe("validateRecommendation", () => {
  test("keeps only the three keys, trimmed", () => {
    assert.deepEqual(validateRecommendation({ ...good, guidance: " Hi ", extra: 1 }), { ...good, guidance: "Hi" });
  });

  test("turns a list of steps from a small model into numbered text", () => {
    const fromStrings = validateRecommendation({ ...good, nextSteps: [" Practice daily ", "Ask for help"] });
    assert.equal(fromStrings.nextSteps, "1. Practice daily\n2. Ask for help");
    const fromObjects = validateRecommendation({ ...good, nextSteps: [{ action: "Do homework", reason: "x" }] });
    assert.equal(fromObjects.nextSteps, "Do homework");
  });

  test("rejects lists with no usable text and nested junk", () => {
    for (const nextSteps of [[], [""], [{ reason: "no action" }], [[["deep"]]], [3], {}]) {
      assert.throws(() => validateRecommendation({ ...good, nextSteps }), AiInvalidResponseError);
    }
  });

  test("rejects non-objects, arrays, missing and empty fields", () => {
    const bad = [null, "text", ["a"], { ...good, goal: undefined }, { ...good, nextSteps: "   " }, { ...good, guidance: 3 }];
    for (const value of bad) {
      assert.throws(() => validateRecommendation(value), AiInvalidResponseError);
    }
  });
});
