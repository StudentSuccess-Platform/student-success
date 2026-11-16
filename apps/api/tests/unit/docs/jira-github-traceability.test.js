import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { REPO_ROOT, readDoc, backtickRepoPaths, assertPathsExist } from "../../helpers/docs.js";

const docPath = path.join(REPO_ROOT, "docs", "sdlc", "jira-github-traceability.md");

describe("docs/sdlc/jira-github-traceability.md", () => {
  test("doc file exists and is non-empty", () => {
    assert.ok(existsSync(docPath), `expected ${docPath} to exist`);
    const stats = statSync(docPath);
    assert.ok(stats.isFile());
    assert.ok(stats.size > 0, "doc file should not be empty");
  });

  const contents = readDoc("docs/sdlc/jira-github-traceability.md");

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
    const referencedPaths = backtickRepoPaths(contents, /`((?:apps|docs|\.github|packages|infrastructure|scripts)\/[^`]+|README\.md)`/g);

    // Sanity check: the doc should actually reference at least one real repo path
    // (currently the PR template), otherwise this test would pass vacuously.
    assert.ok(referencedPaths.length > 0, "expected to find at least one backtick-quoted repo path in the doc");

    assertPathsExist(referencedPaths);
  });

  test("the SCRUM-<n> ticket-key convention the doc describes is actually being followed", () => {
    // A wide window and a case/format-tolerant pattern: GitHub's default squash-merge
    // title turns "SCRUM-15-..." into "Scrum 15 ... (#9)" (space, title case), and an
    // unrelated run of merge commits can push a real ticket-key commit out of a short
    // window. Checking the last 5 commits with a strict /^SCRUM-\d+/ anchor broke this
    // test on every PR merged after the first few, even though the convention itself
    // (README.md, PR template) was still being followed.
    const log = execSync("git log --oneline -n 30", { cwd: REPO_ROOT, encoding: "utf8" });
    const lines = log.trim().split("\n").filter(Boolean);
    assert.ok(lines.length > 0, "expected at least one commit in git log");
    const hasConventionCommit = lines.some((line) => /scrum[-\s]\d+/i.test(line));
    assert.ok(
      hasConventionCommit,
      `expected at least one of the last 30 commits to reference a SCRUM ticket key (e.g. "SCRUM-8" or "Scrum 8"), got:\n${log}`,
    );
  });
});
