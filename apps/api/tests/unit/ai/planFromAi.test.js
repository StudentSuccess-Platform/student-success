import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { planFromAi, splitSteps } from "../../../src/services/ai/planFromAi.js";
import { AiInvalidResponseError } from "../../../src/services/ai/aiErrors.js";

const base = { guidance: "  Focus on fractions.  ", goal: " Score 80% on the next quiz ", nextSteps: "" };

describe("planFromAi", () => {
  test("maps guidance and goal to rationale and title, trimmed", () => {
    const plan = planFromAi({ ...base, nextSteps: "Practice daily" });
    assert.equal(plan.title, "Score 80% on the next quiz");
    assert.equal(plan.rationale, "Focus on fractions.");
    assert.deepEqual(plan.items, [{ title: "Practice daily" }]);
  });

  test("strips numbering from numbered steps", () => {
    const plan = planFromAi({ ...base, nextSteps: "1. Review notes\n2) Do ten problems\n3. Ask a question" });
    assert.deepEqual(plan.items.map((i) => i.title), ["Review notes", "Do ten problems", "Ask a question"]);
  });

  test("strips bullets from bulleted steps", () => {
    const plan = planFromAi({ ...base, nextSteps: "- Review notes\n* Do ten problems\n• Ask a question" });
    assert.deepEqual(plan.items.map((i) => i.title), ["Review notes", "Do ten problems", "Ask a question"]);
  });

  test("keeps a single sentence as one item", () => {
    assert.deepEqual(splitSteps("Practice fractions for 15 minutes each day."), ["Practice fractions for 15 minutes each day."]);
  });

  test("splits semicolon-separated steps and drops blank lines", () => {
    assert.deepEqual(splitSteps("Read; Practice;\n\n  \nAsk"), ["Read", "Practice", "Ask"]);
  });

  test("keeps at most six items", () => {
    const steps = Array.from({ length: 9 }, (_, i) => `Step ${i + 1}`).join("\n");
    assert.equal(planFromAi({ ...base, nextSteps: steps }).items.length, 6);
  });

  test("rejects steps that split into nothing", () => {
    assert.throws(() => planFromAi({ ...base, nextSteps: " ;  \n - " }), AiInvalidResponseError);
  });
});
