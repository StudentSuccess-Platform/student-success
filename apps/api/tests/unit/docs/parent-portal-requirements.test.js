import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// This file lives at apps/api/tests/unit/docs/, five directories below the
// repo root, so five ".." hops get back to the repo root.
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..", "..");
const docPath = path.resolve(repoRoot, "docs/product/parent-portal-requirements.md");

const doc = existsSync(docPath) ? readFileSync(docPath, "utf8") : "";

describe("docs/product/parent-portal-requirements.md", () => {
  test("doc file exists and is non-empty", () => {
    assert.ok(existsSync(docPath), `expected doc to exist at ${docPath}`);
    assert.ok(doc.trim().length > 0, "expected doc to have content");
  });

  test("doc has a top-level heading", () => {
    assert.match(doc, /^# Parent portal requirements/m);
  });

  test("doc contains the expected sections", () => {
    const expectedSections = [
      "## 1. Problem statement (user story)",
      "## 2. Scope",
      "## 3. Parent role and relationships (SCRUM-22)",
      "## 4. Functional requirements — what a parent can do (SCRUM-21, SCRUM-24)",
      "## 5. Privacy and access requirements (SCRUM-23)",
      "## 6. Parent workflow (SCRUM-25)",
      "## 7. Acceptance criteria traceability",
      "## 8. References",
    ];
    for (const heading of expectedSections) {
      assert.ok(doc.includes(heading), `expected doc to contain heading: ${heading}`);
    }
  });

  test("doc includes an acceptance-criteria traceability table", () => {
    assert.match(doc, /\| Acceptance criterion \| Satisfied by \|/);
    assert.ok(doc.includes("Parent portal requirements documented"));
    assert.ok(doc.includes("Parent access rules documented"));
    assert.ok(doc.includes("Parent/student relationship requirements documented"));
    assert.ok(doc.includes("Team reviews and approves scope"));
  });

  test("doc references the GuardianStudentLink entity and data-visibility rules", () => {
    assert.ok(doc.includes("GuardianStudentLink"));
    assert.ok(doc.includes("docs/database/data-model.md"));
    assert.ok(doc.includes("Data-visibility design"));
  });

  test("every backtick-quoted repo path in the doc exists on disk", () => {
    const backticked = [...doc.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    const pathLike = backticked.filter((s) =>
      /^(apps\/|docs\/|\.github\/|packages\/|infrastructure\/|scripts\/|README\.md)/.test(s),
    );

    // Sanity check: the doc should actually reference at least one path from
    // each family of root files/dirs we know it uses, so this test would
    // fail loudly if the doc's cross-references were gutted.
    assert.ok(pathLike.length > 0, "expected to find backtick-quoted repo paths in the doc");

    const uniquePaths = [...new Set(pathLike)];
    for (const rawPath of uniquePaths) {
      const normalized = rawPath.endsWith("/") ? rawPath.slice(0, -1) : rawPath;
      const resolved = path.resolve(repoRoot, normalized);
      assert.ok(existsSync(resolved), `expected path referenced in doc to exist: ${rawPath} (resolved: ${resolved})`);
    }
  });

  test("the doc's core factual claim (GuardianStudentLink model) is backed by real code", () => {
    const modelsDir = path.resolve(repoRoot, "apps/api/src/models");
    assert.ok(existsSync(modelsDir), `expected models directory to exist at ${modelsDir}`);

    const modelFiles = readdirSync(modelsDir).filter((f) => statSync(path.join(modelsDir, f)).isFile());
    const guardianLinkModel = modelFiles.find((f) => f.toLowerCase() === "guardianstudentlink.js");

    assert.ok(
      guardianLinkModel,
      `expected a GuardianStudentLink model file in ${modelsDir}, found: ${modelFiles.join(", ")}`,
    );
    assert.ok(existsSync(path.join(modelsDir, guardianLinkModel)));
  });
});
