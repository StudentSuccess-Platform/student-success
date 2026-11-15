import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { resolveLlmProvider, describeResolution, DEFAULT_OLLAMA_MODEL, DEFAULT_OLLAMA_URL } from "../../../src/services/ai/resolveProvider.js";

// fake fetch: answers by host so each provider can be up or down
const fakeFetch = ({ openai = true, ollama = true } = {}) => async (url) => {
  const up = String(url).includes("api.openai.com") ? openai : ollama;
  if (!up) throw new Error("connection refused");
  return { ok: true };
};

describe("resolveLlmProvider", () => {
  test("keeps openai when the key, model and connection are good", async () => {
    const env = { LLM_PROVIDER: "openai", OPENAI_API_KEY: "k", LLM_MODEL: "gpt-test" };
    const result = await resolveLlmProvider({ env, fetchImpl: fakeFetch() });
    assert.deepEqual([result.provider, result.fellBackFrom, result.ready], ["openai", null, true]);
    assert.equal(env.LLM_PROVIDER, "openai");
    assert.equal(env.LLM_MODEL, "gpt-test");
  });

  test("falls back to ollama when openai has no key", async () => {
    const env = { LLM_PROVIDER: "openai", LLM_MODEL: "gpt-test" };
    const result = await resolveLlmProvider({ env, fetchImpl: fakeFetch() });
    assert.equal(result.provider, "ollama");
    assert.equal(result.fellBackFrom, "openai");
    assert.equal(env.LLM_PROVIDER, "ollama");
    assert.equal(env.LLM_BASE_URL, DEFAULT_OLLAMA_URL);
    assert.equal(env.LLM_MODEL, DEFAULT_OLLAMA_MODEL, "a cloud model name is not reused for ollama");
  });

  test("falls back to ollama when openai cannot be reached", async () => {
    const env = { LLM_PROVIDER: "openai", OPENAI_API_KEY: "k", LLM_MODEL: "gpt-test", OLLAMA_MODEL: "mistral" };
    const result = await resolveLlmProvider({ env, fetchImpl: fakeFetch({ openai: false }) });
    assert.equal(result.provider, "ollama");
    assert.match(result.reason, /could not be reached/);
    assert.equal(env.LLM_MODEL, "mistral");
    assert.equal(result.ready, true);
  });

  test("falls back when openai rejects the key", async () => {
    const env = { LLM_PROVIDER: "openai", OPENAI_API_KEY: "bad", LLM_MODEL: "gpt-test" };
    const fetchImpl = async (url) => ({ ok: !String(url).includes("api.openai.com") });
    assert.equal((await resolveLlmProvider({ env, fetchImpl })).provider, "ollama");
  });

  test("unset or unknown provider defaults to ollama and keeps a configured model", async () => {
    const unset = { LLM_MODEL: "llama-x", LLM_BASE_URL: "http://ollama.test:11434/" };
    assert.equal((await resolveLlmProvider({ env: unset, fetchImpl: fakeFetch() })).provider, "ollama");
    assert.equal(unset.LLM_MODEL, "llama-x");
    assert.equal(unset.LLM_BASE_URL, "http://ollama.test:11434/");

    const unknown = { LLM_PROVIDER: "gemini" };
    const result = await resolveLlmProvider({ env: unknown, fetchImpl: fakeFetch() });
    assert.equal(result.provider, "ollama");
    assert.equal(result.fellBackFrom, "gemini");
  });

  test("mock is left alone and never touches the network", async () => {
    const env = { LLM_PROVIDER: "mock" };
    const fetchImpl = () => assert.fail("no network");
    assert.equal((await resolveLlmProvider({ env, fetchImpl })).provider, "mock");
    assert.equal(env.LLM_PROVIDER, "mock");
  });

  test("an unreachable ollama is reported, not thrown", async () => {
    const env = { LLM_PROVIDER: "ollama", LLM_MODEL: "m" };
    const result = await resolveLlmProvider({ env, fetchImpl: fakeFetch({ ollama: false }) });
    assert.equal(result.ready, false);
    assert.match(describeResolution(result, env), /not reachable/);
  });
});
