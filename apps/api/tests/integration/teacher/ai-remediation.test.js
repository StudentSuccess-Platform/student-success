import { describe, test, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "../../helpers/server.js";
import { connectDatabase, disconnectDatabase } from "../../../src/config/database.js";
import { createTestDatabaseUri, dropTestDatabase } from "../../helpers/database.js";
import { createSchool, addPlan, signIn } from "../../helpers/fixtures.js";
import { AI_OUTPUT, addEarlierClass, addForeignClass } from "../../helpers/aiFixtures.js";
import { setAiGenerator } from "../../../src/services/ai/aiClient.js";
import { AiUnavailableError } from "../../../src/services/ai/aiErrors.js";
import { getAssignedStudent } from "../../../src/services/access/teacherAccess.js";
import { buildAiInput } from "../../../src/services/ai/buildAiInput.js";
import {
  User,
  TeacherProfile,
  AiAuditLog,
  RemediationPlan,
  RemediationItem,
  Goal,
  GoalUpdate,
  Course,
  Section,
  Enrollment,
} from "../../../src/models/index.js";

const uri = createTestDatabaseUri();

describe("AI remediation", { skip: uri ? false : "set MONGODB_URI to a MongoDB server" }, () => {
  let ctx;
  let school;
  let teacherUser;
  let teacher;
  let otherTeacher;
  let adaToken;
  let ada;

  const post = (path, body, headers = {}) =>
    fetch(`${ctx.baseUrl}/api/v1/teacher${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const aiPath = (studentId = school.adaProfile._id) => `/students/${studentId}/remediation/ai`;
  const counts = async () => ({
    audits: await AiAuditLog.countDocuments(),
    plans: await RemediationPlan.countDocuments(),
    items: await RemediationItem.countDocuments(),
  });

  before(async () => {
    process.env.JWT_SECRET = "test-secret-key";
    assert.equal(await connectDatabase({ uri, retries: 3, retryDelayMs: 1000 }), true);
    ctx = await startTestServer();
    school = await createSchool();
    teacherUser = await User.findOne({ email: "teacher@example.test" }).lean();
    ada = await User.findOne({ email: "ada@example.test" }).lean();
    teacher = await signIn(ctx.baseUrl, "teacher@example.test");
    otherTeacher = await signIn(ctx.baseUrl, "other.teacher@example.test");
    adaToken = await signIn(ctx.baseUrl, "ada@example.test");
  });

  afterEach(() => setAiGenerator(null));

  after(async () => {
    setAiGenerator(null);
    await ctx.close();
    await dropTestDatabase();
    await disconnectDatabase();
  });

  describe("POST /students/:studentId/remediation/ai: success", () => {
    test("creates one pending_review AI plan, its audit and items", async () => {
      setAiGenerator(async () => AI_OUTPUT);
      const before = await counts();
      const res = await post(aiPath(), {}, teacher);
      assert.equal(res.status, 201);
      const { plan } = await res.json();

      assert.equal(plan.studentId, String(school.adaProfile._id));
      assert.equal(plan.sectionId, String(school.section._id));
      assert.equal(plan.className, "Algebra I");
      assert.equal(plan.title, AI_OUTPUT.goal);
      assert.equal(plan.rationale, AI_OUTPUT.guidance);
      assert.equal(plan.status, "pending_review");
      assert.equal(plan.source, "ai");
      assert.equal(plan.reviewedAt, null);
      assert.equal(plan.publishedAt, null);
      assert.deepEqual(
        plan.items.map((i) => i.title),
        ["Redo the missed unit test problems.", "Practice five equations each day.", "Ask for feedback after each quiz."],
      );
      assert.ok(plan.id && plan.aiAuditId);

      const after = await counts();
      assert.deepEqual(
        { audits: after.audits - before.audits, plans: after.plans - before.plans, items: after.items - before.items },
        { audits: 1, plans: 1, items: 3 },
      );

      const audit = await AiAuditLog.findById(plan.aiAuditId).lean();
      assert.equal(audit.purpose, "remediation_plan");
      assert.equal(audit.provider, "test");
      assert.equal(audit.model, "test-1");
      assert.equal(audit.promptVersion, "v1");
      assert.equal(String(audit.student), String(school.adaProfile._id));
      assert.equal(String(audit.requestedBy), String(teacherUser._id));
      assert.equal(audit.reviewOutcome, "pending");
      assert.equal(String(audit.outputRef.id), plan.id);
    });

    test("the AI plan is not visible to the student until it is published", async () => {
      setAiGenerator(async () => ({ ...AI_OUTPUT, goal: "Unpublished goal XYZ" }));
      const res = await post(aiPath(), {}, teacher);
      assert.equal(res.status, 201);
      const dashboard = await fetch(`${ctx.baseUrl}/api/v1/student/dashboard`, { headers: adaToken });
      assert.equal(dashboard.status, 200);
      assert.doesNotMatch(await dashboard.text(), /Unpublished goal XYZ/);
    });

    test("uses the lowest-period class when sectionId is omitted, and the given class when it is provided", async () => {
      const geometry = await addEarlierClass(school);
      setAiGenerator(async () => AI_OUTPUT);

      const defaulted = (await (await post(aiPath(), {}, teacher)).json()).plan;
      assert.equal(defaulted.className, "Geometry");
      assert.equal(defaulted.sectionId, String(geometry._id));

      const explicit = await post(aiPath(), { sectionId: String(school.section._id) }, teacher);
      assert.equal(explicit.status, 201);
      assert.equal((await explicit.json()).plan.className, "Algebra I");
    });

    test("the prompt holds no names, emails, ids or teacher notes, and ignores client goal and progress", async () => {
      let prompt;
      setAiGenerator(async (p) => {
        prompt = p;
        return AI_OUTPUT;
      });
      const goal = await Goal.findOne({ student: school.adaProfile._id }).lean();
      const body = { sectionId: String(school.section._id), goal: "CLIENT-SENT-GOAL", progress: 3 };
      const res = await post(aiPath(), body, teacher);
      assert.equal(res.status, 201);

      const sent = `${prompt.instructions}\n${prompt.input}`;
      for (const secret of [
        "Ada",
        "Strong",
        "ada@example.test",
        "PRIVATE-NOTE",
        String(school.adaProfile._id),
        String(school.section._id),
        String(school.adaProfile.user),
        String(goal._id),
        "CLIENT-SENT-GOAL",
      ]) {
        assert.equal(sent.includes(secret), false, `prompt must not contain ${secret}`);
      }
      assert.match(prompt.input, /Unit Test/);
      assert.match(prompt.input, /Keep an A/);
    });
  });

  describe("buildAiInput", () => {
    test("returns grades, attendance counts, the active goal and latest progress, without ids or names", async () => {
      const access = await getAssignedStudent(teacherUser._id, school.adaProfile._id);
      const input = await buildAiInput(access, school.section._id);
      assert.deepEqual(input.grades, [
        { title: "Unit Test", category: "test", pointsEarned: 95, pointsPossible: 100, status: "graded" },
      ]);
      assert.deepEqual(input.attendance, { present: 1, absent: 0, tardy: 0, excused: 0 });
      assert.equal(input.goal, "Keep an A");
      assert.equal(input.progress, 80);

      const text = JSON.stringify(input);
      assert.doesNotMatch(text, /[0-9a-f]{24}/);
      assert.doesNotMatch(text, /Ada|Strong|@|PRIVATE-NOTE|Going well/);
    });

    test("uses the latest goal update and null when a student has no active goal", async () => {
      const access = await getAssignedStudent(teacherUser._id, school.adaProfile._id);
      const goal = await Goal.findOne({ student: school.adaProfile._id }).lean();
      await GoalUpdate.create({ goal: goal._id, author: ada._id, note: "Later", progressPercent: 90 });
      assert.equal((await buildAiInput(access, school.section._id)).progress, 90);
      await GoalUpdate.deleteMany({ goal: goal._id, progressPercent: 90 });

      const benAccess = await getAssignedStudent(teacherUser._id, school.benProfile._id);
      const benInput = await buildAiInput(benAccess, school.section._id);
      assert.equal(benInput.goal, null);
      assert.equal(benInput.progress, null);
    });
  });

  describe("POST /students/:studentId/remediation/ai: failures", () => {
    test("AI unavailable -> 503 with code and fallback, writes nothing, keeps stored plans", async () => {
      const published = await addPlan({ school, student: school.adaProfile, status: "published", title: "Existing published plan" });
      const beforeRows = await counts();
      const beforePlan = await RemediationPlan.findById(published._id).lean();

      setAiGenerator(async () => {
        throw new AiUnavailableError("The AI service is unavailable. You can create a plan manually.");
      });
      const res = await post(aiPath(), {}, teacher);
      assert.equal(res.status, 503);
      assert.deepEqual(await res.json(), {
        error: "The AI service is unavailable. You can create a plan manually.",
        code: "AI_UNAVAILABLE",
        fallback: "manual",
      });

      assert.deepEqual(await counts(), beforeRows);
      assert.deepEqual(await RemediationPlan.findById(published._id).lean(), beforePlan);
    });

    test("not configured -> 503 with the configuration message", async () => {
      setAiGenerator(async () => {
        throw new AiUnavailableError("The AI service is not configured");
      });
      const res = await post(aiPath(), {}, teacher);
      assert.equal(res.status, 503);
      assert.equal((await res.json()).error, "The AI service is not configured");
    });

    test("malformed or schema-invalid AI output -> 502 AI_INVALID_RESPONSE and no rows", async () => {
      const beforeRows = await counts();
      setAiGenerator(async () => ({ guidance: "Only guidance" }));
      const res = await post(aiPath(), {}, teacher);
      assert.equal(res.status, 502);
      const body = await res.json();
      assert.equal(body.code, "AI_INVALID_RESPONSE");
      assert.equal(body.fallback, "manual");
      assert.equal(typeof body.error, "string");
      assert.deepEqual(await counts(), beforeRows);
    });

    test("a student not assigned to this teacher -> 404", async () => {
      setAiGenerator(async () => AI_OUTPUT);
      assert.equal((await post(aiPath(), {}, otherTeacher)).status, 404);
    });

    test("a malformed student id -> 404", async () => {
      setAiGenerator(async () => AI_OUTPUT);
      assert.equal((await post(aiPath("not-an-id"), {}, teacher)).status, 404);
    });

    test("a 12-character non-hex student id is 404, not treated as an ObjectId", async () => {
      let called = false;
      setAiGenerator(async () => {
        called = true;
        return AI_OUTPUT;
      });
      assert.equal((await post(aiPath("abcdefghijkl"), {}, teacher)).status, 404);
      assert.equal(called, false);
    });

    test("a model answer whose nextSteps yields no items -> 502 with code and fallback, and writes nothing", async () => {
      const beforeRows = await counts();
      setAiGenerator(async () => ({ guidance: "x", goal: "y", nextSteps: ";" }));
      const res = await post(aiPath(), {}, teacher);
      assert.equal(res.status, 502);
      assert.deepEqual(await res.json(), {
        error: "The AI returned an unusable response. You can create a plan manually.",
        code: "AI_INVALID_RESPONSE",
        fallback: "manual",
      });
      assert.deepEqual(await counts(), beforeRows);
    });

    test("a student role -> 403 and no call to the AI", async () => {
      let called = false;
      setAiGenerator(async () => {
        called = true;
        return AI_OUTPUT;
      });
      assert.equal((await post(aiPath(), {}, adaToken)).status, 403);
      assert.equal(called, false);
    });

    test("no token -> 401", async () => {
      assert.equal((await post(aiPath(), {})).status, 401);
    });

    test("an invalid sectionId -> 400 with field errors and no AI call", async () => {
      let called = false;
      setAiGenerator(async () => {
        called = true;
        return AI_OUTPUT;
      });
      const res = await post(aiPath(), { sectionId: "nope" }, teacher);
      assert.equal(res.status, 400);
      assert.deepEqual(await res.json(), {
        error: "Please choose one of this student's classes",
        fields: { sectionId: "Invalid class" },
      });
      assert.equal(called, false);
    });

    test("a class of another teacher, even with the student enrolled, -> 400", async () => {
      const otherProfile = await TeacherProfile.findOne({ user: (await User.findOne({ email: "other.teacher@example.test" }).lean())._id }).lean();
      const foreign = await addForeignClass(school, otherProfile);
      setAiGenerator(async () => AI_OUTPUT);
      const res = await post(aiPath(), { sectionId: String(foreign._id) }, teacher);
      assert.equal(res.status, 400);
    });
  });

  describe("legacy POST /teacher/recommendations", () => {
    const legacyBody = () => ({ studentId: String(school.adaProfile._id), sectionId: String(school.section._id) });

    test("returns 200 with a recommendation through the hardened service, and persists nothing", async () => {
      setAiGenerator(async () => AI_OUTPUT);
      const beforeRows = await counts();
      const res = await post("/recommendations", legacyBody(), teacher);
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { recommendation: AI_OUTPUT });
      assert.deepEqual(await counts(), beforeRows);
    });

    test("uses the lowest-period class when sectionId is omitted", async () => {
      // A period-1 class with no assignments. Algebra (period 2) has the unit test, so if it were chosen
      // the prompt would contain grade rows. Ties at period 1 are broken by id; both candidates are empty.
      const course = await Course.create({ code: "MAT0", title: "Math Lab", subject: "Mathematics", gradeLevel: 9 });
      const lab = await Section.create({ course: course._id, teacher: school.teacher._id, term: "2025-Fall", period: 1 });
      await Enrollment.create({ section: lab._id, student: school.adaProfile._id });
      let prompt;
      setAiGenerator(async (p) => {
        prompt = p;
        return AI_OUTPUT;
      });
      const res = await post("/recommendations", { studentId: String(school.adaProfile._id) }, teacher);
      assert.equal(res.status, 200);
      assert.ok(prompt, "the generator was called");
      assert.match(prompt.input, /Grades:\s+\[\]/);
      assert.doesNotMatch(prompt.input, /Unit Test/);
    });

    test("ignores client-sent grades, attendance, goal and progress; the prompt is built from the database", async () => {
      let prompt;
      setAiGenerator(async (p) => {
        prompt = p;
        return AI_OUTPUT;
      });
      const res = await post(
        "/recommendations",
        {
          ...legacyBody(),
          grades: [{ title: "CLIENT-GRADE-XYZ", pointsEarned: 0, pointsPossible: 100 }],
          attendance: { present: 999, absent: 0 },
          goal: "CLIENT-GOAL-XYZ",
          progress: 3,
        },
        teacher,
      );
      assert.equal(res.status, 200);
      const sent = `${prompt.instructions}\n${prompt.input}`;
      for (const secret of ["CLIENT-GRADE-XYZ", "CLIENT-GOAL-XYZ", "999"]) {
        assert.equal(sent.includes(secret), false, `prompt must not contain ${secret}`);
      }
      assert.match(prompt.input, /Unit Test/);
      assert.match(prompt.input, /Keep an A/);
      assert.match(prompt.input, /"present":1/);
    });

    test("a missing studentId -> 400 naming the field, and no AI call", async () => {
      let called = false;
      setAiGenerator(async () => {
        called = true;
        return AI_OUTPUT;
      });
      const res = await post("/recommendations", { grades: [] }, teacher);
      assert.equal(res.status, 400);
      assert.deepEqual(await res.json(), { error: "Please fix the highlighted fields", fields: { studentId: "Required" } });
      assert.equal(called, false);
    });

    test("a student not assigned to this teacher -> 404 and no AI call", async () => {
      let called = false;
      setAiGenerator(async () => {
        called = true;
        return AI_OUTPUT;
      });
      // Ben is taught only by this teacher. (Ada is enrolled in a class of the other teacher by an earlier test.)
      const benBody = { studentId: String(school.benProfile._id), sectionId: String(school.section._id) };
      assert.equal((await post("/recommendations", benBody, otherTeacher)).status, 404);
      assert.equal(called, false);
    });

    test("returns 503 with the controlled body when the AI is unavailable", async () => {
      setAiGenerator(async () => {
        throw new AiUnavailableError();
      });
      const res = await post("/recommendations", legacyBody(), teacher);
      assert.equal(res.status, 503);
      const body = await res.json();
      assert.equal(body.code, "AI_UNAVAILABLE");
      assert.equal(body.fallback, "manual");
    });

    test("returns 502 AI_INVALID_RESPONSE for schema-invalid model output", async () => {
      setAiGenerator(async () => ({ guidance: "Only guidance" }));
      const res = await post("/recommendations", legacyBody(), teacher);
      assert.equal(res.status, 502);
      const body = await res.json();
      assert.equal(body.code, "AI_INVALID_RESPONSE");
      assert.equal(body.fallback, "manual");
    });
  });
});
