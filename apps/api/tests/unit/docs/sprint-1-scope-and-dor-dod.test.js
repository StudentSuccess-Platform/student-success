import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT, readDoc, backtickRepoPaths, assertPathsExist } from "../../helpers/docs.js";

const docRelPath = "docs/sdlc/sprint-1-scope-and-dor-dod.md";
const docPath = path.resolve(REPO_ROOT, docRelPath);

// Backtick-quoted spans that look like real repo paths: either rooted under one of
// the repo's known top-level directories, or a small set of known root-level files
// (the doc's own example of a "root file" is README.md; .env.example is the other
// bare filename it references in backticks).
const REPO_PATH_PATTERN =
  /`((?:apps|docs|\.github|packages|infrastructure|scripts)\/[^`\s]+|README\.md|\.env\.example|LICENSE|package\.json|package-lock\.json)`/g;

// Paths the doc references in backticks that are *intentionally* not present yet.
// SCRUM-6's doc explicitly documents this as a Sprint 1 "out of scope" gate: Web CI
// stays dormant "until apps/web/package-lock.json is present, i.e. until the frontend
// is scaffolded". So this is not a broken reference to fix — it's a true statement
// about current repo state that would need revisiting once the frontend is scaffolded.
const KNOWN_NOT_YET_PRESENT = ["apps/web/package-lock.json"];

const doc = readDoc(docRelPath);

describe("docs/sdlc/sprint-1-scope-and-dor-dod.md", () => {
  test("doc file exists and is non-empty", () => {
    assert.ok(existsSync(docPath), `expected doc at ${docPath}`);
    assert.ok(doc.length > 0, "doc should not be empty");
  });

  test("has a top-level heading", () => {
    assert.match(doc, /^# Sprint 1 Technical Scope, Definition of Ready, and Definition of Done/m);
  });

  test("has a Definition of Ready section", () => {
    assert.match(doc, /^## Definition of Ready \(DoR\)/m);
  });

  test("has a Definition of Done section", () => {
    assert.match(doc, /^## Definition of Done \(DoD\)/m);
  });

  test("has a Defect / rework flow subsection under DoD", () => {
    assert.match(doc, /^### Defect \/ rework flow/m);
  });

  test("has a Sprint 1 technical scope section", () => {
    assert.match(doc, /^## Sprint 1 technical scope/m);
  });

  test("has an explicitly out of scope subsection", () => {
    assert.match(doc, /^### Explicitly out of scope for the first two weeks/m);
  });

  test("has a References section", () => {
    assert.match(doc, /^## References$/m);
  });

  test("Sprint 1 scope table references the expected Jira tickets", () => {
    for (const ticket of ["SCRUM-10", "SCRUM-11", "SCRUM-12", "SCRUM-13"]) {
      assert.ok(doc.includes(`**${ticket}**`), `expected the scope table to list ${ticket}`);
    }
  });

  test("extracts backtick-quoted repo paths from the doc", () => {
    const found = backtickRepoPaths(doc, REPO_PATH_PATTERN);
    // Sanity check: this doc is known to reference at least these paths in backticks.
    // If this fails, the doc's own path references changed and the extraction/assertions
    // below need to be revisited alongside it.
    assert.ok(found.includes("apps/api"), "expected doc to reference `apps/api` in backticks");
    assert.ok(
      found.includes(".github/pull_request_template.md"),
      "expected doc to reference `.github/pull_request_template.md` in backticks",
    );
    assert.ok(found.includes(".env.example"), "expected doc to reference `.env.example` in backticks");

    assertPathsExist(found, { allowMissing: KNOWN_NOT_YET_PRESENT });
  });

  test("paths documented as not-yet-present are indeed still absent", () => {
    for (const referenced of KNOWN_NOT_YET_PRESENT) {
      const absolute = path.resolve(REPO_ROOT, referenced);
      assert.ok(
        !existsSync(absolute),
        `doc says \`${referenced}\` is not yet present, but it now exists at ${absolute} — ` +
          "the Sprint 1 scope doc's Web CI gating note may need to be updated",
      );
    }
  });

  test("linked markdown references resolve to existing files", () => {
    // README.md and docs/sdlc/ci-cd.md are referenced as markdown links, not backticks,
    // but they are load-bearing cross-references for this doc, so verify them too.
    assert.ok(existsSync(path.resolve(REPO_ROOT, "README.md")));
    assert.ok(existsSync(path.resolve(REPO_ROOT, "docs/sdlc/ci-cd.md")));
    assert.ok(existsSync(path.resolve(REPO_ROOT, ".github/pull_request_template.md")));
  });
});
