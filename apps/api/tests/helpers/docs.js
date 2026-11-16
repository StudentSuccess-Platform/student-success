import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

// Shared by tests/unit/docs/*. The repo root is four directories above this helper
// (apps/api/tests/helpers -> apps/api/tests -> apps/api -> apps -> repo root).
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

// Reads a doc by repo-relative path. A missing file reads as "" so each test reports the failure itself.
export function readDoc(relPath) {
  const abs = path.join(REPO_ROOT, relPath);
  return existsSync(abs) ? readFileSync(abs, "utf8") : "";
}

// Unique repo-relative paths quoted in backticks. The caller passes a global regex whose group 1
// is the path, because each doc has its own notion of what counts as a repo path.
export function backtickRepoPaths(text, pattern) {
  return [...new Set([...text.matchAll(pattern)].map((m) => m[1]))];
}

// Asserts every listed path exists under the repo root. `allowMissing` names paths the doc
// knowingly describes as not yet present.
export function assertPathsExist(paths, { allowMissing = [] } = {}) {
  const skip = new Set(allowMissing);
  const missing = paths.filter((p) => !skip.has(p) && !existsSync(path.resolve(REPO_ROOT, p)));
  assert.deepEqual(missing, [], `referenced paths do not exist: ${missing.join(", ")}`);
}
