# Teacher portal MVP: design and contracts

Source: Jira SCRUM-95/96/97, 127-140 and acceptance criteria AC-TEA-01..15 (SCRUM-35). Goal: Teacher -> AI/manual
remediation -> Student/Parent workflow works end to end. Read `AGENTS.md` first. Student and parent screens belong to
Deandra and Novoa; this design only adds teacher features and the backend they need.

## Ground rules for every workstream
1. Work only in your own files (table below). Do NOT edit shared files: `app.js`, `teacherRoutes.js`, `App.jsx`,
   `tests/helpers/fixtures.js`, any `docs/` file, `package*.json`, workflows. Need a shared change? Say so in your report.
2. Never push, never open a PR. Commit inside your worktree: `git add -A && git commit -m "SCRUM-<n> <what>"`.
3. Tests go in `apps/<app>/tests/<unit|integration|e2e>/<module>/` (`teacher` module). Never loose files.
   API helper reuse: `tests/helpers/fixtures.js` (`createSchool`, `signIn`, `PASSWORD`, `addPlan`). Put your own fixture
   additions in a NEW file `tests/helpers/<yourFeature>Fixtures.js`.
4. Setup in a fresh worktree: `npm install` at the worktree root. API tests need MongoDB at `mongodb://localhost:27017`:
   `cd apps/api && MONGODB_URI=mongodb://localhost:27017 npm test` (each test file uses its own throwaway DB).
   Web: `cd apps/web && npm run test:run && npm run lint`. API: `npm run lint`. Both must be clean.
5. Repo-relative paths only. Double quotes + semicolons in apps/api; single quotes, no semicolons in apps/web.
6. Security: every endpoint with `:studentId` starts with `getAssignedStudent(req.user.id, req.params.studentId)` from
   `services/access/teacherAccess.js`. Never trust client-sent ids for ownership. Never return `TeacherNote`.
7. Errors: throw `httpError(status, message, extra)` from `utils/httpError.js`; the global handler returns
   `{ error, ...extra }`. Express 5 forwards async errors; no try/catch needed in handlers.
8. Validation failures are 400 with `fields`: `{ "error": "Please fix the highlighted fields", "fields": { "pointsEarned": "Required" } }`.

## Verified facts and shared pieces already in place (read before coding)
- Already done by the architect, do not redo: `services/access/teacherAccess.js`, `utils/httpError.js` (+ handler passes `extra`),
  web `services/http.js` now throws `ApiError` (`message`, `status`, `fields`, `code`, `fallback`), `hooks/useApiResource.js` returns
  `{ data, isLoading, error, reload }` (parameterized fetchers must be stable: wrap in `useCallback`), shared stylesheet
  `styles/teacher-shared.css` (classes `teacher-section`, `teacher-section-title`, `teacher-table`, `teacher-form`, `teacher-field`,
  `teacher-field-error`, `teacher-form-error`, `teacher-form-success`, `teacher-form-actions`, `teacher-button[--primary|--danger]`,
  `teacher-badge[--warning|--success|--danger]`, `teacher-muted`, `teacher-link`) already loaded by `DashboardLayout`. Reuse these;
  put only page-specific rules in your own css file and import it from your component. Use `PageHeader` for page titles and
  `DashboardCard` / `PerformanceTrendChart` / `StatCard` from `components/common` where they fit.
- IDs: `:studentId` is a **StudentProfile** id everywhere (Goal.student, TeacherFeedback.student, RemediationPlan.student, AiAuditLog.student).
  `RemediationPlan.teacher/reviewedBy` and `AiAuditLog.reviewedBy` are **TeacherProfile** ids (`access.teacher._id`);
  `AiAuditLog.requestedBy` and `GoalUpdate.author` are **User** ids (`req.user.id`).
- Mongoose errors (ValidationError, CastError, duplicate key E11000) carry no `.status` and would become 500. Validate first and throw
  `httpError(400, ..., { fields })`; use `findOneAndUpdate(..., { upsert: true, new: true, runValidators: true })` for Grade
  (unique assignment+student) and Attendance (unique section+student+date).
- Class/section display name is `section.course.title` (populate `course`). A section's term/period/room are on Section.
- Goal has no progress/updates fields: `progress` = latest `GoalUpdate.progressPercent` (default 0); `updates` = `GoalUpdate.find({ goal }).sort({ createdAt: 1 })`
  (never return `author`). RemediationPlan has no items field: items are `RemediationItem` rows (`find({ plan }).sort({ createdAt: 1 })`;
  replacing items = `deleteMany({ plan })` then `insertMany`). Map model `aiAudit` -> `aiAuditId`, Grade `assignment` -> `assignmentId`, TeacherFeedback `section` -> `sectionId`.
- Attendance dates are stored at noon UTC (`new Date(\`${date}T12:00:00.000Z\`)`, same as the seed and fixtures) so one calendar day maps to one row.
- `interventionFor` returns `{ reason, severity } | null`: `needsIntervention = flag !== null`, `summary.reason = flag?.reason ?? null`.
- Seeded data uses term `2025-Fall`, REF_DATE 2025-11-14; each seeded teacher has 1-2 sections of about 16 students.
- Tests that need a rejected plan or other states: create them in your own `tests/helpers/<feature>Fixtures.js` (the shared `addPlan` cannot make `rejected`).

## Workstreams and file ownership
| Id | Owner files | Jira |
|---|---|---|
| B1 | `routes/teacher/students.js`, `controllers/teacherStudentsController.js`, `services/teachers/studentRoster.js`, tests `integration/teacher/students.test.js` | SCRUM-95, 96 |
| B2 | `routes/teacher/records.js`, `controllers/teacherRecordsController.js`, `services/teachers/recordEntry.js`, `validators/recordValidators.js`, tests `integration/teacher/records.test.js`, `unit/teacher/recordValidators.test.js` | SCRUM-96 |
| B3 | `routes/teacher/remediation.js`, `controllers/teacherRemediationController.js`, `services/remediation/remediationWorkflow.js`, `models/RemediationPlan.js` (add `rejected`), tests `integration/teacher/remediation.test.js`, `unit/models/*` update | SCRUM-127..132, 134 |
| B4 | `routes/teacher/aiRemediation.js`, `controllers/teacherAiController.js`, `services/ai/*` (rewrite `recommendation.js`, add `aiClient.js`, `aiErrors.js`, `buildAiInput.js`, `planFromAi.js`), `docs/ai/ai-request-fields.md`, tests `unit/ai/*`, `integration/teacher/ai-remediation.test.js` | SCRUM-123, 126, 135..138, 140 |
| W1 | `pages/teacher/Students*.jsx`, `StudentProfile*.jsx`, `useTeacherStudentsData.js`, `useTeacherStudentProfile.js`, `services/teacherStudentsApi.js`, `styles/teacher-students.css`, unit tests in `tests/unit/teacher/` (`useApiResource` is already done: do not edit it) | SCRUM-95 |
| W2 | `components/teacher/records/*`, `services/teacherRecordsApi.js`, `styles/teacher-records.css`, unit tests `tests/unit/teacher/` | SCRUM-96 |
| W3 | `components/teacher/remediation/*`, `services/teacherRemediationApi.js`, `styles/teacher-remediation.css`, unit tests `tests/unit/teacher/` | SCRUM-97, 128..132, 139 |
Placeholders already exist for the shared seams: the routers, `Students.jsx`, `StudentProfile.jsx`,
`RemediationPanel.jsx` (W1 imports and renders both panels on the profile page; do not change their props).

## API contracts (base `/api/v1/teacher`, role teacher; ids are strings)
### B1 roster and profile (AC-01, 02, 06, 07, 15)
- `GET /students` -> `{ students: [{ id, name, gradeLevel, classNames: [string], averageGrade: int|null, attendanceRate: int|null, needsIntervention: bool }] }`,
  only students with an active enrollment in this teacher's sections, sorted by name. `needsIntervention` uses
  `interventionFor` in `services/grades/gradeMath.js`. A teacher with no profile gets `{ students: [] }`.
- `GET /students/:studentId` -> 404 unless assigned. Body:
  `{ student: { id, name, gradeLevel, studentNumber }, classes: [{ id, name, period, room }] (this teacher's sections for the student),`
  `summary: { averageGrade, attendanceRate, needsIntervention, reason: string|null },`
  `grades: [{ assignmentId, sectionId, className, title, category, pointsPossible, pointsEarned: number|null, status: "graded"|"missing"|"late"|"excused"|null, dueDate (ISO) }]` one row per assignment in those sections, graded or not, by dueDate desc,
  `attendance: { rate, records: [{ id, sectionId, className, date (ISO), status }] }` newest 30,
  `goals: [{ id, title, description, targetDate, status, progress: int, updates: [{ id, note, progressPercent, createdAt }] }]`,
  `feedback: [{ id, sectionId, className, body, createdAt, updatedAt }]` shared feedback by this teacher for the student,
  `performanceTrend: [{ label, value }] }` (use `monthlyTrend`).
### B2 entry (AC-03, 04, 05, 08). All return the saved record; section/assignment must belong to the assigned student.
- `PUT /students/:studentId/grades` `{ assignmentId, pointsEarned?, status? }` upsert -> 200 `{ grade: { assignmentId, pointsEarned, status } }`.
  Rules: `assignmentId` required and in one of the student's sections; `status` default `graded`, one of graded|missing|late|excused;
  `pointsEarned` required (number, 0..pointsPossible) when status is graded or late; ignored for missing/excused.
- `POST /students/:studentId/attendance` `{ sectionId, date: "YYYY-MM-DD", status: present|absent|tardy|excused }` upsert on (section, student, date) -> 200 `{ attendance: { id, sectionId, date, status } }`.
- `POST /students/:studentId/goals` `{ title, description?, targetDate?, sectionId? }` -> 201 `{ goal }`; `PUT .../goals/:goalId` `{ title?, description?, targetDate?, status?: active|achieved|abandoned }` -> 200 `{ goal }`;
  `POST .../goals/:goalId/updates` `{ note, progressPercent 0..100 }` -> 201 `{ update }` (author = signed-in user). Goal must belong to that student.
- `POST /students/:studentId/feedback` `{ sectionId, body, assignmentId? }` -> 201 `{ feedback: { id, sectionId, body, createdAt, updatedAt } }`; `PUT .../feedback/:feedbackId` `{ body }` -> 200, only the author teacher.
- Missing required values -> 400 with `fields` naming each field (AC-04). Unknown/foreign ids -> 404 or 400 as noted.
### B3 plan workflow (AC-10, 11, 12, 13, 14). Plan JSON everywhere:
`{ id, studentId, sectionId, className, title, rationale, status, source: "teacher"|"ai", items: [{ id, title, description }], aiAuditId|null, createdAt, updatedAt, reviewedAt|null, publishedAt|null }`
- `GET /students/:studentId/remediation` -> `{ plans: [plan] }` all statuses, newest first.
- `POST /students/:studentId/remediation` `{ sectionId, title, rationale?, items?: [{ title, description? }] }` -> 201 `{ plan }` status `draft`, source `teacher` (manual entry).
- `PUT .../remediation/:planId` `{ title?, rationale?, items? }` only while `draft` or `pending_review` (else 409 "Plan can no longer be edited"); `items` replaces all items; for an AI plan set its AiAuditLog `reviewOutcome: "edited"` -> 200 `{ plan }`.
- `POST .../:planId/approve` from draft|pending_review -> `approved`, sets `reviewedBy` (teacher profile) and `reviewedAt`; AI audit `approved` (or keep `edited`) -> 200 `{ plan }`; else 409.
- `POST .../:planId/reject` `{ reason? }` from draft|pending_review|approved -> `rejected` -> 200; else 409. Add `rejected` to `PLAN_STATUSES` AND to the `pre("validate")` status list in `models/RemediationPlan.js` (so it requires reviewedBy/reviewedAt like approved), update `tests/unit/models/visibility-and-review.test.js`; set audit `rejected`. Rejected is never visible to students/parents.
- `reviewedBy` = `access.teacher._id`. `reason` is accepted but not stored (no field yet).
- `POST .../:planId/publish` only from `approved` -> `published` with `publishedAt` -> 200; else 409 "Approve the plan before publishing".
- A plan must belong to the assigned student, otherwise 404. Students/parents already see only `published` (`services/students/studentViews.js`): add integration tests proving draft, pending_review, approved and rejected plans never appear in `/student/dashboard` or `/parent/children/:id/dashboard`.
### B4 AI generation (AC-09; SCRUM-58 fallback)
- `POST /students/:studentId/remediation/ai` `{ sectionId?, goal?, progress? }` (default section: the first of the student's sections with this teacher).
  The SERVER gathers grades/attendance/goals from the database (`buildAiInput`); client data is never sent to the AI. Success -> 201 `{ plan }`
  status `pending_review`, source `ai`, with an `AiAuditLog` (`purpose: "remediation_plan"`, provider, model, `promptVersion: "v1"`, student, requestedBy, `reviewOutcome: "pending"`) linked as `aiAudit`.
  AI output `{ guidance, goal, nextSteps }` maps to plan `rationale = guidance`, `title = goal`, items = nextSteps split into one item per line/number/bullet (`planFromAi.js`, 2..4 items max 6, strip numbering).
- Failures never change existing data and return a controlled body `{ error, code, fallback: "manual" }`:
  timeout/network/not configured/5xx -> 503 `AI_UNAVAILABLE` ("The AI service is unavailable. You can create a plan manually."); malformed or schema-invalid output -> 502 `AI_INVALID_RESPONSE`.
- Provider abstraction (`aiClient.js`): `LLM_PROVIDER` = `openai` (uses `OPENAI_API_KEY`, `LLM_MODEL` required) | `ollama` (POST `${LLM_BASE_URL}/api/chat` with `format` set to the recommendation JSON schema, `stream: false`, `LLM_MODEL` required; unit-test it with a fake `fetch`) | `mock` (deterministic, no network, returns provider "mock" and model "mock-1" for the AiAuditLog, for tests/CI/demo) | unset or missing config -> unavailable.
  Default section when `sectionId` is omitted: the student's section with the lowest `period` among `access.sectionIds`.
  `AI_TIMEOUT_MS` default 15000 enforced with `AbortSignal.timeout`. Fix the old bug (`apiKey` was the literal string "process.env.OPENAI_API_KEY"). Tests inject a fake generator via `setAiGenerator(fn)` (exported from `services/ai/aiClient.js`); never call the network in tests.
- Keep `POST /teacher/recommendations` working through the same hardened service.
- Document exactly which fields are sent to the AI in `docs/ai/ai-request-fields.md` (SCRUM-126).

## Web contracts
API clients use `request(path, { method, body, token })` from `services/http.js`; the token is `localStorage.authToken` (see `hooks/useApiResource.js`).
Every async view has loading, error and empty states. Forms validate on the client first and also show server `fields`/`error`.
### W1 students list + profile
- `/teacher/students`: heading `Students`, search box labelled `Search students` (filters by name), a link per student (accessible name = student name) showing classes, average, attendance and an `Needs intervention` badge.
- `/teacher/students/:studentId`: heading = student name and the three summary cards, then a tab list (`?tab=` in the URL, default Overview): Overview (`Performance Trend`, `At a glance`), Grades, Attendance, Goals & Feedback (`Goals and Progress`, `Teacher Feedback`), Support Plans (`Remediation Plans`, `<RemediationPanel>`). Only the open tab renders. Each tab holds its records and the matching entry forms (`components/teacher/profile/*Tab.jsx`); a pencil or double-click on a grade row loads it into the grade form.
  A 404 shows "Student not found" with a link back. `useTeacherStudentProfile` returns `{ data, isLoading, error, reload }` (add `reload` to `useApiResource` without breaking existing callers/tests).
### W2 record entry (forms in `components/teacher/records/`, shown inside the profile tabs)
Forms (all labelled inputs, `role="alert"` messages, button disabled while saving, call `onSaved()` on success):
`Save grade` (fields `Assignment` select from `student.grades`, `Points earned`, `Status`), `Save attendance` (`Class`, `Date`, `Status`),
`Add goal` (`Goal title`, `Description`, `Target date`), `Save goal progress` (`Goal`, `Progress (%)`, `Note`), `Save feedback` (`Class`, `Feedback`) plus `Edit` on existing feedback.
Required-field messages name the field (AC-04).
### W3 remediation (`RemediationPanel`, props `{ studentId, classes }`)
Loads plans; buttons `Generate AI recommendation` and `Create plan manually`. Plan card shows title, rationale, items, a status badge (`Draft`, `Pending review`, `Approved`, `Published`, `Rejected`) and for AI plans awaiting review the label `AI draft (advisory, not yet approved)`.
Actions by status: draft/pending_review -> `Edit` (inline fields + `Save changes`), `Approve`, `Reject`; approved -> `Publish`, `Reject`; published/rejected -> read only.
On AI failure show the server message plus "You can create a plan manually" and open the manual form (SCRUM-58); existing plans stay visible. Manual form: `Plan title`, `Rationale`, step fields, `Save plan`.

## Acceptance mapping
01,15 -> B1 + access tests; 02,06,07 -> B1/W1; 03,04,05 -> B2/W2; 08 -> B2/W2; 09 -> B4/W3; 10 -> B3/W3; 11,13 -> B3/W3; 12,14 -> B3 (+ student/parent visibility tests).

## Definition of done (each workstream)
Lint clean; new tests in the right folders and passing; edge cases (empty, error, unauthorized, malformed ids) covered;
committed in the worktree; final report lists files, commit hash, branch name, test commands with results, and any shared change you need.
