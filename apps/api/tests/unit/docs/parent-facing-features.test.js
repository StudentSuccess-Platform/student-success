import { describe, test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import { REPO_ROOT, readDoc, assertPathsExist } from "../../helpers/docs.js";

const docPath = path.join(REPO_ROOT, "docs", "product", "parent-facing-features.md");

// Backtick-quoted tokens that look like repo paths (directories/files under known
// top-level roots, or well-known root files like README.md) as opposed to model
// names, field names, or status-flow tokens that are also backtick-quoted in prose.
const PATH_PREFIX_RE = /^(apps\/|docs\/|\.github\/|packages\/|infrastructure\/|scripts\/)/;
const ROOT_FILE_RE = /^[A-Za-z0-9_-]+\.(md|json|yml|yaml)$/;

function extractDocPaths(text) {
  const tokens = [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  const paths = tokens.filter((t) => PATH_PREFIX_RE.test(t) || ROOT_FILE_RE.test(t));
  return [...new Set(paths)];
}

// Mongoose models the doc names as backing a parent-facing feature. Kept as an
// explicit list (rather than parsed from backticks) since the doc also backtick-quotes
// field names and status tokens (e.g. `progressPercent`, `published`) that are not models.
const DOC_MODEL_NAMES = [
  "Grade",
  "Assignment",
  "Section",
  "Enrollment",
  "Course",
  "GuardianStudentLink",
  "Attendance",
  "TeacherFeedback",
  "TeacherNote",
  "Goal",
  "GoalUpdate",
  "RemediationPlan",
  "RemediationItem",
  "AiAuditLog",
  "ProgressReport",
  "Notification",
  "Message",
];

describe("docs/product/parent-facing-features.md", () => {
  test("doc file exists and is non-empty", () => {
    assert.ok(fs.existsSync(docPath), `expected doc at ${docPath}`);
    const stat = fs.statSync(docPath);
    assert.ok(stat.size > 0, "doc file is empty");
  });

  const content = readDoc("docs/product/parent-facing-features.md");

  test("has a top-level heading", () => {
    assert.match(content, /^# .+/m);
  });

  test("has a numbered feature list section", () => {
    assert.match(content, /^## Features\s*$/m);
    // At least the nine numbered features called out in the spec.
    for (let n = 1; n <= 9; n += 1) {
      assert.match(
        content,
        new RegExp(`^${n}\\. \\*\\*`, "m"),
        `expected numbered feature item ${n}`,
      );
    }
  });

  test("every backtick-quoted repo path in the doc exists on disk", () => {
    const docPaths = extractDocPaths(content);
    assert.ok(docPaths.length > 0, "expected to find at least one repo path in the doc");
    assertPathsExist(docPaths);
  });

  test("every Mongoose model the doc names as backing a feature exists under apps/api/src/models/", () => {
    const modelsDir = path.join(REPO_ROOT, "apps", "api", "src", "models");
    const modelFiles = fs.readdirSync(modelsDir);

    for (const modelName of DOC_MODEL_NAMES) {
      const needle = modelName.toLowerCase();
      const match = modelFiles.some((file) => file.toLowerCase().includes(needle));
      assert.ok(
        match,
        `doc names model "${modelName}" but no matching file was found in ${modelsDir} (files: ${modelFiles.join(", ")})`,
      );
    }
  });

  test("apps/web/src/pages/parent and apps/web/src/components/parent are still UI-pending (only .gitkeep/empty)", () => {
    const parentDirs = [
      path.join(REPO_ROOT, "apps", "web", "src", "pages", "parent"),
      path.join(REPO_ROOT, "apps", "web", "src", "components", "parent"),
    ];

    for (const dir of parentDirs) {
      assert.ok(fs.existsSync(dir), `expected directory ${dir} to exist`);
      const entries = fs.readdirSync(dir).filter((name) => name !== ".gitkeep");
      assert.equal(
        entries.length,
        0,
        `expected ${dir} to contain no real files yet (only .gitkeep), but found: ${entries.join(", ")}. ` +
          "If parent UI has been built, update docs/product/parent-facing-features.md's status " +
          "from 'UI pending' before updating this test.",
      );
    }
  });
});
