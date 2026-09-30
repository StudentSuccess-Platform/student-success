import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

// apps/api/tests/unit/docs/ -> repo root is 5 levels up.
const repoRoot = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..", "..", "..", "..");
const docPath = path.join(repoRoot, "docs", "sdlc", "jira-github-traceability.md");

describe("docs/sdlc/jira-github-traceability.md", () => {
  test("doc file exists and is non-empty", () => {
    assert.ok(existsSync(docPath), `expected ${docPath} to exist`);
    const stats = statSync(docPath);
    assert.ok(stats.isFile());
    assert.ok(stats.size > 0, "doc file should not be empty");
  });

  const contents = readFileSync(docPath, "utf8");

  test("has a top-level heading", () => {
    assert.match(contents, /^# .+/m);
  });

  test("documents the naming-convention decision", () => {
    assert.match(contents, /## Decision: naming-convention traceability/);
  });

  test("documents the branch/commit/PR naming convention table", () => {
    assert.match(contents, /## The convention/);
    assert.match(contents, /SCRUM-<n>-<kebab-title>/);
    assert.match(contents, /SCRUM-<n> Short title/);
  });

  test("documents PR template enforcement", () => {
    assert.match(contents, /### PR template enforcement/);
    assert.match(contents, /pull_request_template\.md/);
  });

  test("documents what traceability does and doesn't give you", () => {
    assert.match(contents, /## What this does and doesn't give you/);
  });

  test("documents how to trace a ticket in both directions", () => {
    assert.match(contents, /## How to trace a ticket/);
    assert.match(contents, /From a Jira key to its GitHub activity/);
    assert.match(contents, /From a branch\/commit\/PR to its Jira ticket/);
  });

  test("lists related docs", () => {
    assert.match(contents, /## Related docs/);
  });

  test("every backtick-quoted repo path referenced in the doc exists on disk", () => {
    const pathPattern = /`((?:apps|docs|\.github|packages|infrastructure|scripts)\/[^`]+|README\.md)`/g;
    const referencedPaths = [...contents.matchAll(pathPattern)].map((m) => m[1]);

    // Sanity check: the doc should actually reference at least one real repo path
    // (currently the PR template), otherwise this test would pass vacuously.
    assert.ok(referencedPaths.length > 0, "expected to find at least one backtick-quoted repo path in the doc");

    for (const referencedPath of referencedPaths) {
      const resolved = path.join(repoRoot, referencedPath);
      assert.ok(existsSync(resolved), `referenced path "${referencedPath}" does not exist at ${resolved}`);
    }
  });

  test("the SCRUM-<n> commit convention the doc describes is actually being followed", () => {
    const log = execSync("git log --oneline -5", { cwd: repoRoot, encoding: "utf8" });
    const lines = log.trim().split("\n");
    assert.ok(lines.length > 0, "expected at least one commit in git log");
    const hasConventionCommit = lines.some((line) => {
      const message = line.replace(/^[0-9a-f]+\s+/, "");
      return /^SCRUM-\d+/.test(message);
    });
    assert.ok(hasConventionCommit, `expected at least one of the last 5 commits to match /^SCRUM-\\d+/, got:\n${log}`);
  });
});
