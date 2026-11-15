import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { AiUnavailableError, AiInvalidResponseError } from "../../../src/services/ai/aiErrors.js";

describe("AI errors", () => {
  test("AiUnavailableError is a 503 with the AI_UNAVAILABLE code", () => {
    const error = new AiUnavailableError();
    assert.ok(error instanceof Error);
    assert.equal(error.status, 503);
    assert.equal(error.code, "AI_UNAVAILABLE");
    assert.match(error.message, /create a plan manually/);
  });

  test("AiInvalidResponseError is a 502 with the AI_INVALID_RESPONSE code", () => {
    const error = new AiInvalidResponseError();
    assert.ok(error instanceof Error);
    assert.equal(error.status, 502);
    assert.equal(error.code, "AI_INVALID_RESPONSE");
  });

  test("custom messages are kept", () => {
    assert.equal(new AiUnavailableError("The AI service is not configured").message, "The AI service is not configured");
  });
});
