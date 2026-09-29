import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// This test file lives at apps/api/tests/unit/docs/system-architecture.test.js,
// five directories below the repo root.
const repoRoot = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..", "..", "..", "..");
const docPath = path.join(repoRoot, "docs", "architecture", "system-architecture.md");

function readDoc() {
  return readFileSync(docPath, "utf8");
}

// Backtick-quoted strings that look like real repo paths, e.g. `apps/api/src/app.js`,
// `docs/database/data-model.md`, `.github/workflows/api-ci.yml`, `README.md`.
const REPO_PATH_PATTERN =
  /`((?:apps|docs|\.github|packages|infrastructure|scripts)\/[^`\s]+|[A-Za-z0-9_.-]+\.md)`/g;

// Some backtick paths use shell brace-expansion shorthand, e.g.
// `apps/api/src/services/{grades,reports,students}`, to refer to several sibling
// paths at once. Expand those into their individual real paths before checking disk.
function expandBraces(repoPath) {
  const match = repoPath.match(/^(.*)\{([^{}]+)\}(.*)$/);
  if (!match) return [repoPath];
  const [, prefix, options, suffix] = match;
  return options.split(",").map((opt) => `${prefix}${opt}${suffix}`);
}

function extractRepoPaths(doc) {
  const paths = new Set();
  for (const match of doc.matchAll(REPO_PATH_PATTERN)) {
    for (const expanded of expandBraces(match[1])) {
      paths.add(expanded);
    }
  }
  return [...paths];
}

describe("docs/architecture/system-architecture.md", () => {
  test("exists and is non-empty", () => {
    assert.ok(existsSync(docPath), `expected doc at ${docPath}`);
    const stats = statSync(docPath);
    assert.ok(stats.size > 0, "doc file should not be empty");
  });

  test("has a top-level heading and the expected sections", () => {
    const doc = readDoc();
    assert.match(doc, /^# StudentSuccess System Architecture/m);
    assert.match(doc, /^## 1\. System overview/m);
    assert.match(doc, /^## 2\. Component responsibilities/m);
    assert.match(doc, /^## 3\. Data flow/m);
    assert.match(doc, /^## 4\. Monorepo layout/m);
    assert.match(doc, /^## 5\. Tech stack and rationale/m);
    assert.match(doc, /^## 6\. REST API conventions/m);
    assert.match(doc, /^## 7\. Environments and deployment/m);
    assert.match(doc, /^## 8\. Architecture decisions \(summary\)/m);
    assert.match(doc, /^## 9\. Where to look next/m);
  });

  test("component responsibility table marks status as Implemented or Planned", () => {
    const doc = readDoc();
    assert.match(doc, /\| Component \| Responsibility \| Status \|/);
    assert.match(doc, /Implemented/);
    assert.match(doc, /Planned/);
  });

  test("every backtick-quoted repo path referenced in the doc exists on disk", () => {
    const doc = readDoc();
    const repoPaths = extractRepoPaths(doc);

    // Sanity check: the extraction itself should find a meaningful number of paths,
    // otherwise the regex has silently stopped matching anything.
    assert.ok(repoPaths.length > 5, `expected several repo paths, found ${repoPaths.length}`);

    const missing = repoPaths.filter((p) => !existsSync(path.join(repoRoot, p)));
    assert.deepEqual(missing, [], `these paths referenced in the doc do not exist: ${missing.join(", ")}`);
  });

  test("spot-check: files the doc marks 'Implemented' actually exist", () => {
    // These are pulled directly from the "Implemented" rows of the component table
    // in docs/architecture/system-architecture.md §2. If any of these go missing,
    // the doc's implementation-status claims have gone stale.
    const implementedPaths = [
      "apps/api/src/app.js",
      "apps/api/src/server.js",
      "apps/api/src/models",
      "apps/api/seed",
      "docs/database/data-model.md",
      "docs/database/local-database.md",
      "docs/setup/local-development.md",
      "docs/sdlc/ci-cd.md",
    ];

    for (const relPath of implementedPaths) {
      assert.ok(
        existsSync(path.join(repoRoot, relPath)),
        `doc marks this as Implemented but it is missing: ${relPath}`,
      );
    }
  });

  test("scaffolded/placeholder directories referenced by the doc still exist", () => {
    const scaffoldedPaths = [
      "apps/api/src/routes",
      "apps/api/src/services/grades",
      "apps/api/src/services/reports",
      "apps/api/src/services/students",
      "apps/api/src/services/ai",
      "packages/shared",
      "infrastructure",
      "scripts",
    ];

    for (const relPath of scaffoldedPaths) {
      assert.ok(existsSync(path.join(repoRoot, relPath)), `expected scaffolded path to exist: ${relPath}`);
    }
  });
});
