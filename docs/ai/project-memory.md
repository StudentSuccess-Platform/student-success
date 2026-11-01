# Project memory (shared, keep under 100 lines)
Short durable facts for humans and AI agents. Update in the same PR as the change (protocol: AGENTS.md).
Remove entries that stop being true.
Last updated: 2026-11-01.

## Product
- StudentSuccess: academic monitoring and early-intervention web app for teachers, students, parents.
- AI remediation output is advisory; a teacher reviews it before students or parents see it.
- Authorization is role-based and relationship-based, enforced in the API (not just hidden UI).
- Teacher-only notes must never be returned to students or parents.

## Team and ownership
- Antwain Sparks: backend, infra, CI/CD, GitHub (apps/api, workflows, seed). GitHub: AntwainSparks.
- Novoa Champion: product owner + frontend (apps/web). GitHub: novoachampion.
- Deandra Harvin: QA, UAT, owns the test suite, AI/remediation and student/parent requirements. GitHub: dehar42-ops.

## Stack and ports
- Node 22.13+, Express 5, Mongoose 9, MongoDB 7 (Docker), React 19, Vite, Vitest.
- API 3000, Web 5173, MongoDB 27017, Ollama 11434 (optional). API base: /api/v1; auth: /api/auth.
- Repo: github.com/StudentSuccess-Platform/student-success (private, org on GitHub Team plan).

## Auth (built 2026-10)
- POST /api/auth/register|login, GET /api/auth/me; bcrypt + JWT (JWT_SECRET required).
- Public signup roles: teacher, student, parent (never admin). Web: AuthContext, ProtectedRoute, role redirects.
- Seeded users: password Password123! (e.g. carley.beer.2@example.test teacher).
- Student/parent portals are placeholders; teacher dashboard still uses mock data.

## Workflow and rules
- Jira keys SCRUM-<n>; branch SCRUM-<n>-title; PR to main. Ruleset "Pre merge verification" is active:
  PR required, API CI + Web CI required, branch up to date, no force-push/delete, 0 approvals, no bypass.
- Reviews: authors review and test their own work for now; raise approvals to 1 when the backlog shrinks.
- .githooks/pre-push (enabled by npm install): blocks a branch behind origin/main and misplaced new test files.
- Tests live in tests/<unit|integration|e2e>/<module>/ (docs/sdlc/testing-guidelines.md). Existing web tests in
  apps/web/tests/unit are still flat; migrate them into module folders (open item).
- Deploy workflow is a manual no-op; hosting target undecided.

## Open work
- Relationship-based access checks; hide teacher notes from students/parents.
- Real teacher/student/parent endpoints replacing frontend mock data.
- Forgot/reset password endpoints. Protect POST /api/teacher/recommendations (needs auth + teacher role).
- AI client bug: services/ai/recommendation.js passes the literal string "process.env.OPENAI_API_KEY";
  needs a provider abstraction (LLM_PROVIDER, LLM_BASE_URL, LLM_MODEL).
- CORS_ORIGIN is defined but not enforced.

## Decisions log
- 2026-10: monorepo; MongoDB; JWT auth; seed data is synthetic (Faker).
- 2026-11-01: ruleset repaired to target main; required checks added; test structure enforced by hook (PR #18 CI green).
- 2026-11-01: agents must update this file in the same PR as any requirement/implementation change.
