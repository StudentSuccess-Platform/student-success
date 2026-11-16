import { AiInvalidResponseError } from "./aiErrors.js";

// Maps validated AI output { guidance, goal, nextSteps } to a remediation plan draft.
// nextSteps is split into one item per line, numbered or bulleted step, or semicolon-separated step.
// Small models sometimes leak JSON punctuation into the text or run the steps together as sentences,
// so debris is cut off and a single run-on block is split into sentences.

const MAX_ITEMS = 6;
const LEADING_MARKER = /^\s*(?:[-*•]|\d+[.)]|\(\d+\))\s*/;
const JSON_DEBRIS = /"\s*[}\]]|[{[]\s*"/; // a closing quote followed by } or ], or an opening { or [ before a quote

function clean(line) {
  return line
    .replace(LEADING_MARKER, "")
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .trim();
}

export function splitSteps(text) {
  let source = String(text);
  const debris = source.search(JSON_DEBRIS);
  if (debris >= 0) source = source.slice(0, debris + (source[debris] === '"' ? 1 : 0));
  let lines = source
    .split(/\r?\n|;/)
    .map(clean)
    .filter((line) => /[\p{L}\p{N}]/u.test(line));
  if (lines.length === 1) {
    const sentences = lines[0].split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map(clean).filter(Boolean);
    if (sentences.length > 1) lines = sentences;
  }
  return lines.slice(0, MAX_ITEMS);
}

export function planFromAi({ guidance, goal, nextSteps }) {
  const items = splitSteps(nextSteps).map((title) => ({ title }));
  if (items.length === 0) {
    throw new AiInvalidResponseError();
  }
  return { title: goal.trim(), rationale: guidance.trim(), items };
}
