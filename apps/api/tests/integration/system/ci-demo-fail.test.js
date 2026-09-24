import { test } from "node:test";
import assert from "node:assert/strict";

// Deliberate failure to demonstrate CI failing on a PR (SCRUM-13). Reverted right after.
test("intentional CI failure", () => {
  assert.equal(1, 2);
});
