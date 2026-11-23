# Project memory (shared, keep under 100 lines)
Short durable facts for humans and AI agents. Update in the same PR as the change (protocol: AGENTS.md).
Remove entries that stop being true.
Last updated: 2026-11-24.

## Product
- StudentSuccess: academic monitoring and early-intervention web app for teachers, students, parents.
- AI remediation output is advisory; a teacher reviews it before students or parents see it.
- Authorization is role-based and relationship-based, enforced in the API (not just hidden UI).
- Teacher-only notes must never be returned to students or parents.
- MVP1 goal: Teacher -> AI/remediation -> Student/Parent workflow works end to end.

## Team and ownership
- Antwain Sparks: backend, infra, CI/CD, GitHub (apps/api, workflows, seed). GitHub: AntwainSparks.
- Novoa Champion: product owner + frontend (apps/web). GitHub: novoachampion.
- Deandra Harvin: QA, UAT, owns the test suite, AI/remediation and student/parent requirements. GitHub: dehar42-ops.

## Stack and ports
- Node 22.13+, Express 5, Mongoose 9, MongoDB 7 (Docker), React 19, Vite, Vitest, Playwright.
- API 3000, Web 5173 (Vite dev) or 8080 (Docker/nginx), MongoDB 27017, Ollama 11434 (optional). API base: /api/v1 (unversioned /api/... kept as alias).
- 2026-11-19: Vercel services use api (public /api/*) and web (public catch-all); no service binding is needed because web calls the public API from the browser.
- Repo: github.com/StudentSuccess-Platform/student-success (private, org on GitHub Team plan).

## Built (API: docs/api/endpoints.md)
- Auth: /auth/register|login|me|forgot-password|reset-password; bcrypt + JWT (JWT_SECRET required).
  Public signup roles: teacher, student, parent (never admin). Seeded users: password Password123!.
- Teacher: /teacher/dashboard|classes|classes/:id (+ POST classes/:id/students), /students[/:id], grades/attendance/goals/feedback entry,
  /reports + /students/:id/reports (progress reports: suggestion, create, edit, publish, delete a draft),
  /students/:id/remediation (+ /ai, approve|reject|publish); all need role teacher and enforce assigned-student access
  (services/access/teacherAccess.js: 404 for unassigned students).
- Student: /student/profile|grades|attendance|dashboard|support-plans|reports|me/dashboard (web calls /api/student/me/dashboard; keep alias).
- Parent: /parent/children[/:id/dashboard|support-plans|reports]; linked students only (relationship check in services/access).
- Web: login/register/forgot, role redirects (AuthContext, ProtectedRoute); teacher dashboard + My Classes use the API
  (hooks/useApiResource); student portal (dashboard, progress, support plan) uses the API; parent portal (2026-11-23):
  linked-child selector, Overview, Academic Progress and Support Plan pages (SCRUM-146..153); roster rows link to profiles (SCRUM-152).
- Web teacher class overview (SCRUM-143) uses the real class list but DEMO data (banner shown; classOverviewMockData.js); the class
  Roster tab is real, the Assignments & Grades and Attendance tabs are disabled placeholders. Dates in feedback use utils/formatDate.
- Not built: teacher Settings, Add Student form (API exists), live Class Overview data, reset-password page,
  real email (utils/mailer.js only logs).

## Workflow and rules
- Jira keys SCRUM-<n>; branch SCRUM-<n>-kebab-title; PR to main. Ruleset "Pre merge verification" is active:
  PR required, API CI + Web CI required, branch up to date, no force-push/delete, 0 approvals, no bypass.
- Agents never push or open/merge PRs until the human says so ("push on my command"); humans coordinate pushes.
- Naming: commit/PR "SCRUM-<n> Short title" (not "Scrum 21", not "(In-Progress)"); all paths repo-relative.
- Reviews: authors review and test their own work for now; raise approvals to 1 when the backlog shrinks.
- Tests live in apps/<app>/tests/<unit|integration|e2e>/<module>/ (docs/sdlc/testing-guidelines.md). Web unit modules:
  app, auth, common, student, teacher, utils (organized 2026-11-15). CI step scripts/check-test-layout.sh fails any
  PR with a misplaced test; .githooks/pre-push (npm install) also blocks a branch behind main.
- Browser tests: Playwright in apps/web/tests/e2e/{auth,teacher,student,access}; CI job "Browser E2E" (not required yet).
- Test status 2026-11-24 (with teacher Reports): API 482 tests (113 suites), web 449 (74 files), Playwright 55; all green. Vitest must run from PowerShell on Windows.
- Browser E2E local/CI Vite start must set `VITE_API_URL=http://localhost:3000`; Playwright defaults to installed Chromium unless a browser channel is selected.
- API DB-backed routes check a shared MongoDB connection after request validation and authorization; unavailable DB returns 503, and connection/login logs omit credentials and submitted login values.
- Deploy workflow is a manual no-op; Vercel config for API and web merged (SCRUM-150); live URL not confirmed.

## Open work (MVP1 gaps, from Deandra's 2026-11-14 UI review)
- Teacher portal MVP is BUILT (2026-11-15, branch SCRUM-96-teacher-portal-mvp, design: docs/design/teacher-portal-mvp.md):
  students list + tabbed profile (Overview, Grades, Attendance, Goals & Feedback, Support Plans; ?tab= in the URL),
  grade/attendance/goal/feedback entry, AI + manual remediation with edit/approve/reject/publish.
  Roster: POST /teacher/classes/:classId/students (2026-11-16) adds a student with no email/login (User.status "invited", email optional,
  partial unique index email_unique_when_set; run User.syncIndexes() on old DBs); blocks same name+grade (409 POSSIBLE_DUPLICATE).
  Activation/invite flow for those students is not built. Seed: last 3 students are invited (no email).
  Remaining: teacher notes UI, edit/delete of past attendance, Add Student form, real-provider AI check.
- Student portal: support plan shows only published (teacher-approved) plans; all read-only; own data only.
  2026-11-17: GET /student/support-plans and GET /parent/children/:id/support-plans list every published plan (class name,
  publishedAt, `active` = newest per class); the student page shows active plans and hides earlier ones behind a button.
- Parent portal (merged 2026-11-23): Overview, Academic Progress and Support Plan pages with a linked-child selector; the API
  checks parent role and relationship. Each parent page starts on the first linked child (the selection is not shared across
  pages). Reports, notifications and messaging remain open.
- AI: provider abstraction done (services/ai/aiClient.js; LLM_PROVIDER openai|ollama|mock, LLM_MODEL, LLM_BASE_URL,
  OPENAI_API_KEY, OLLAMA_MODEL, AI_TIMEOUT_MS). 2026-11-15: server.js calls services/ai/resolveProvider.js at startup:
  openai without key/model or unreachable -> ollama; unset/unknown -> ollama; mock untouched. AI down -> manual fallback.
  2026-11-16: default Ollama model gemma3:1b (benchmark of 9 models; upgrade qwen3:1.7b), temperature 0.2 sent to Ollama.
  Use LLM_PROVIDER=mock for demos/e2e/CI. Still unverified against a real provider. Fields sent: docs/ai/ai-request-fields.md.
- Remediation plans carry `version` (+1 per edit/status change); PUT accepts `version` and answers 409 if stale (2026-11-15).
- Student/parent dashboards return `feedbackHistory` (all shared feedback, newest first) plus latest `teacherFeedback`.
- Misc: teacher-to-student check on legacy /teacher/recommendations; summary.termGoal is null; CORS_ORIGIN not enforced.
- Docker (2026-11-17): `docker compose up -d --build` runs mongo, seed (--if-empty, never wipes), api, web (nginx, http://localhost:8080), ~1.6 GB.
  Compose API `MONGODB_URI` can be overridden from a gitignored root `.env` or shell; seed still targets local Compose Mongo.
  Ollama is NOT bundled (image ~8 GB): use Ollama on the host (api reaches host.docker.internal:11434) or add docker-compose.ai.yml.
  Images build from the repo root (apps/api/package-lock.json is stale; root lock is used). Ports bind to 127.0.0.1 (BIND_ADDRESS)
  because Docker Desktop on Windows hangs on IPv6 localhost.
- Local gotcha: if Docker Mongo times out on "localhost", use MONGODB_URI=mongodb://127.0.0.1:27017 (IPv6 forwarding).

## Decisions log
- 2026-10: monorepo; MongoDB; JWT auth; seed data is synthetic (Faker).
- 2026-11-01: ruleset repaired to target main; required checks added; agents update this file in the same PR.
- 2026-11-15: web unit tests moved into module folders; CI enforces test layout; student API auth tests consolidated.
- 2026-11-16: local AI default is Ollama gemma3:1b (9 models benchmarked); User.email optional, teacher-added students are "invited".
- 2026-11-17: Docker stack is lean (no bundled Ollama); students and parents list every published plan (class, date, active).
- 2026-11-23: parent portal merged (SCRUM-146..153); feedback dates shown as readable dates.
- 2026-11-24: teacher Reports = progress reports (draft -> published by the teacher, who owns them via ProgressReport.teacher); students and
  parents see only published ones (/student/reports, /parent/children/:id/reports). The suggested summary is deterministic, no AI.
