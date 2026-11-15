import { AiInvalidResponseError } from "./aiErrors.js";

// Maps validated AI output { guidance, goal, nextSteps } to a remediation plan draft.
// nextSteps is split into one item per line, numbered or bulleted step, or semicolon-separated step.

const MAX_ITEMS = 6;
const LEADING_MARKER = /^\s*(?:[-*•]|\d+[.)]|\(\d+\))\s*/;

export function splitSteps(text) {
  return String(text)
    .split(/\r?\n|;/)
    .map((line) => line.replace(LEADING_MARKER, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, MAX_ITEMS);
}

export function planFromAi({ guidance, goal, nextSteps }) {
  const items = splitSteps(nextSteps).map((title) => ({ title }));
  if (items.length === 0) {
    throw new AiInvalidResponseError();
  }
  return { title: goal.trim(), rationale: guidance.trim(), items };
}
