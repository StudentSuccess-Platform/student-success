import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { generateSeedData, MODEL_NAMES, MODULE_NAMES, selectModules } from "../../../seed/registry.js";
import { validateSeedData } from "../../../seed/validate.js";

describe("seed generation", () => {
  const data = generateSeedData();

  test("is deterministic for the same seed and differs for another", () => {
    assert.equal(JSON.stringify(generateSeedData()), JSON.stringify(data));
    assert.notEqual(JSON.stringify(generateSeedData({ seed: 7 })), JSON.stringify(data));
  });

  test("covers every model with representative records", () => {
    MODEL_NAMES.forEach((name) => assert.ok(data[name].length > 0, `${name} is empty`));
  });

  test("uses only synthetic identities", () => {
    assert.ok(data.User.every((u) => u.isSynthetic && u.email.endsWith("@example.test")));
  });

  test("generates assignment-level grades and teacher-only notes", () => {
    assert.ok(data.Grade.length > data.Enrollment.length);
    assert.ok(data.TeacherNote.every((n) => n.visibility === "teacher_only"));
  });

  test("passes the consistency check", () => {
    assert.deepEqual(validateSeedData(data), []);
  });
});

describe("seed consistency check detects problems", () => {
  const fresh = () => JSON.parse(JSON.stringify(generateSeedData()));

  test("dangling reference", () => {
    const d = fresh();
    d.Grade[0].student = "ffffffffffffffffffffffff";
    assert.ok(validateSeedData(d).some((p) => p.includes("Grade") && p.includes("missing StudentProfile")));
  });

  test("attendance for a student who is not enrolled", () => {
    const d = fresh();
    const { section, student } = d.Attendance[0];
    d.Enrollment = d.Enrollment.filter((e) => !(e.section === section && e.student === student));
    assert.ok(validateSeedData(d).some((p) => p.includes("Attendance") && p.includes("not enrolled")));
  });

  test("published plan without teacher review", () => {
    const d = fresh();
    delete d.RemediationPlan.find((p) => p.status === "published").reviewedBy;
    assert.ok(validateSeedData(d).some((p) => p.includes("without teacher review")));
  });

  test("private note exposed as shared", () => {
    const d = fresh();
    d.TeacherNote[0].visibility = "shared";
    assert.ok(validateSeedData(d).some((p) => p.includes("must be teacher_only")));
  });
});

describe("seed modules", () => {
  test("can be selected individually and unknown names are rejected", () => {
    assert.deepEqual(
      selectModules(["grades"]).map((m) => m.name),
      ["grades"],
    );
    assert.equal(selectModules().length, MODULE_NAMES.length);
    assert.throws(() => selectModules(["nope"]), /Unknown seed module/);
  });
});
