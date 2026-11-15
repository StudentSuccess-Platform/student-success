import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  validateGoal,
  validateGoalPatch,
  validateGoalUpdate,
  validateFeedback,
  validateFeedbackBody,
} from "../../../src/validators/recordValidators.js";

// Size caps for goal, goal update and feedback text: title 200, description, note and feedback body 5000.
const OBJ = "64b000000000000000000001";

// Returns the fields a validator rejects with, or fails the test if it accepts the input.
function fieldsOf(fn, body) {
  try {
    fn(body);
  } catch (error) {
    assert.equal(error.status, 400);
    return error.extra.fields;
  }
  assert.fail("expected a validation error");
}

describe("record size caps", () => {
  test("goal title: 200 accepted, 201 rejected", () => {
    assert.equal(validateGoal({ title: "g".repeat(200) }).title, "g".repeat(200));
    assert.deepEqual(fieldsOf(validateGoal, { title: "g".repeat(201) }), { title: "Must be 200 characters or fewer" });
  });

  test("goal description: 5000 accepted, 5001 rejected", () => {
    assert.equal(validateGoal({ title: "x", description: "d".repeat(5000) }).description, "d".repeat(5000));
    assert.deepEqual(fieldsOf(validateGoal, { title: "x", description: "d".repeat(5001) }), {
      description: "Must be 5000 characters or fewer",
    });
  });

  test("goal patch title and description use the same caps", () => {
    assert.equal(validateGoalPatch({ title: "t".repeat(200) }).title, "t".repeat(200));
    assert.deepEqual(fieldsOf(validateGoalPatch, { title: "t".repeat(201) }), { title: "Must be 200 characters or fewer" });
    assert.deepEqual(fieldsOf(validateGoalPatch, { description: "d".repeat(5001) }), {
      description: "Must be 5000 characters or fewer",
    });
  });

  test("goal update note: 5000 accepted, 5001 rejected", () => {
    assert.equal(validateGoalUpdate({ note: "n".repeat(5000), progressPercent: 10 }).note, "n".repeat(5000));
    assert.deepEqual(fieldsOf(validateGoalUpdate, { note: "n".repeat(5001), progressPercent: 10 }), {
      note: "Must be 5000 characters or fewer",
    });
  });

  test("feedback body: 5000 accepted, 5001 rejected, on create and on edit", () => {
    const create = { sectionId: OBJ, body: "b".repeat(5000) };
    assert.equal(validateFeedback(create).body, "b".repeat(5000));
    assert.deepEqual(fieldsOf(validateFeedback, { sectionId: OBJ, body: "b".repeat(5001) }), {
      body: "Must be 5000 characters or fewer",
    });
    assert.equal(validateFeedbackBody({ body: "b".repeat(5000) }).body, "b".repeat(5000));
    assert.deepEqual(fieldsOf(validateFeedbackBody, { body: "b".repeat(5001) }), {
      body: "Must be 5000 characters or fewer",
    });
  });

  test("the length is counted after trimming, so padding does not count", () => {
    assert.equal(validateGoal({ title: `  ${"g".repeat(200)}  ` }).title, "g".repeat(200));
  });
});
