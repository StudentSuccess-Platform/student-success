# StudentSuccess System Architecture

Jira: SCRUM-9 — *Define StudentSuccess System, Backend, and Infrastructure Architecture*.

This document is the entry point for the StudentSuccess technical architecture. It ties together
facts that already exist across several documents and the codebase — [README.md](../../README.md),
[docs/architecture/environments.md](environments.md), [docs/database/data-model.md](../database/data-model.md),
[docs/database/local-database.md](../database/local-database.md), [docs/sdlc/ci-cd.md](../sdlc/ci-cd.md), and
[docs/setup/local-development.md](../setup/local-development.md) — into one coherent reference. It does not
duplicate those documents' full content; it links out to them for detail and states each fact once here.

It distinguishes **implemented** from **planned** so the document stays honest about what exists today
versus what the architecture reserves room for.

---

## 1. System overview

StudentSuccess is a web-based academic performance monitoring and early-intervention platform connecting
Teachers, Students, and Parents/Guardians around a student's grades, attendance, goals, progress, and
teacher feedback. Teachers can request AI-assisted remediation suggestions, academic goal suggestions,
progress summaries, and trend explanations; AI output is advisory and requires teacher review before it is
visible to a student or parent.

The system is a **monorepo** with a clear boundary: a web UI talks only to a versioned REST API, which is
the sole boundary between the UI and protected application/data services. The API enforces authentication,
role-based authorization, and relationship-based authorization (which student a given user may see) —
authorization is a server responsibility, never enforced only by hiding UI elements.

## 2. Component responsibilities

| Component | Responsibility | Status |
|---|---|---|
| Web/UI (`apps/web`) | Teacher, Student, and Parent-facing views; calls the REST API; no direct database or AI access | Planned — not yet scaffolded (React, per the tech stack below) |
| REST API (`apps/api`) | Node.js/Express application; the only boundary between UI and protected services; versioned under `/api/v1` | Implemented (scaffold): `app.js`/`server.js`, `/api/v1` root, `/api/v1/health`, security/parsing middleware (`helmet`, `cors`, `morgan`, JSON body parsing); feature routes not yet built (`src/routes/` is a placeholder) |
| Authentication / authorization | Enforces who a user is (auth) and which students/records they may touch (RBAC + relationship-based rules: student→self, parent→linked students via `GuardianStudentLink`, teacher→students in their `Section`) | Data model supports it (see §5); middleware not yet implemented (SCRUM-12) |
| MongoDB data layer (`apps/api/src/models`) | Mongoose models for every core entity (User, profiles, Course/Section/Enrollment, Grade, Attendance, TeacherFeedback/TeacherNote, Goal, RemediationPlan, ProgressReport, Notification, Message, AiAuditLog) | Implemented — see [data-model.md](../database/data-model.md) |
| Synthetic seed data (`apps/api/seed/`) | Deterministic Faker-based seed script, run in dependency order (users → courses → grades → attendance → notes → goals → remediation → reports → communications); `npm run db:check` verifies referential/visibility consistency | Implemented — see [local-database.md](../database/local-database.md) |
| Reporting / trend services (`apps/api/src/services/{grades,reports,students}`) | Business logic behind grade, attendance, and progress-report views | Directory scaffolded; feature logic not yet implemented |
| AI/LLM integration (`apps/api/src/services/ai`) | Provider-neutral LLM abstraction behind `LLM_PROVIDER` so features never hard-code a vendor; produces remediation/goal/summary/trend content that is advisory until a teacher approves it (tracked via `AiAuditLog`) | Directory scaffolded; env contract exists (`LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_MODEL`, optional `OPENAI_API_KEY`/`GEMINI_API_KEY`/`ANTHROPIC_API_KEY`); provider code not yet implemented |
| Local development infrastructure | Docker Compose for MongoDB and (optionally) Ollama; API runs with `npm run dev` against either | Implemented — see [local-development.md](../../docs/setup/local-development.md) |
| CI/CD | GitHub Actions workflows for API and Web, plus a deploy skeleton | Implemented for API; Web CI dormant; deploy is a no-op placeholder — see [ci-cd.md](../sdlc/ci-cd.md) |

## 3. Data flow

Two flows exist, matching the SCRUM-9 initial high-level flow:

**Request path (UI → data):**

```
Teacher / Student / Parent (Web UI)
        |
        v
StudentSuccess REST API  (/api/v1, Express)
        |
        v
Authentication / Authorization  (role-based + relationship-based)
        |
        v
Application services (grades, students, reports, remediation)
        |
        v
MongoDB (Mongoose models)
```

**AI-assisted path (advisory, teacher-gated):**

```
StudentSuccess API
        |
        v
LLM provider abstraction  (LLM_PROVIDER env-selected)
        |
        +--> Local model provider (Ollama, in Docker or on host)
        |
        +--> External foundation-model provider (OpenAI / Gemini / Anthropic API key)
        |
        v
AiAuditLog (provider, model, prompt version, reviewer, outcome)
        |
        v
Teacher review/approval  --->  RemediationPlan / ProgressReport becomes visible to Student/Parent
```

Nothing generated by the LLM path reaches a Student or Parent view directly: `RemediationPlan` and
`ProgressReport` both require a `reviewedBy`/`reviewedAt` teacher approval (enforced by a Mongoose
`pre("validate")` hook) before their status can move to `approved`/`published`. This is the mechanism
behind the SCRUM-9 requirement that "AI output remains teacher-reviewed before being shared with students
or parents."

Private data never crosses the visibility boundary at the model level: `TeacherNote` is a separate
collection carrying an immutable `teacher_only` classification, and Student/Parent-facing queries only ever
read `TeacherFeedback` (`shared`). See [data-model.md](../database/data-model.md) for the full entity list
and visibility rules.

## 4. Monorepo layout

```
StudentSuccess/
├── apps/
│   ├── api/            # Node.js/Express backend (implemented scaffold + models + seed)
│   └── web/             # Frontend (planned; not yet scaffolded)
├── packages/
│   └── shared/          # Shared types/schemas/validation for API + UI (planned)
├── infrastructure/       # docker/, database/, deployment/ placeholders
├── scripts/              # seed/ and setup/ (e.g. ollama-up.sh)
├── docs/                 # architecture/, api/, database/, diagrams/, sdlc/, setup/
├── .github/workflows/    # api-ci.yml, web-ci.yml, deploy.yml
└── docker-compose.yml    # mongo, api, ollama (profile "ai")
```

`apps/api` and `apps/web` are developed independently against the shared REST contract; `packages/shared`
holds cross-cutting definitions (role constants, schemas) so both applications reference the same source of
truth instead of duplicating it. Full ownership and folder-by-folder detail: [README.md](../../README.md#repository-architecture).

## 5. Tech stack and rationale

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React, JavaScript, HTML/CSS | Team-familiar SPA stack; consumes the REST API only, no direct DB/AI access |
| Backend | Node.js, Express.js | Matches the original project proposal; small team, fast to scaffold, wide middleware ecosystem (`helmet`, `cors`, `morgan`) |
| API style | REST, versioned at `/api/v1` | Established convention so breaking changes can version-bump without an immediate UI break |
| Database | MongoDB + Mongoose | Specified in the original proposal; document model fits the varied per-student record shapes (grades, attendance, notes, plans). A future database change is an explicit architecture decision, not a silent implementation change, per the SCRUM-9 dependency note |
| AI/LLM | Provider abstraction behind `LLM_PROVIDER` (Ollama locally, OpenAI/Gemini/Anthropic optionally) | SCRUM-9 explicitly requires the app not be hard-coded to one LLM vendor, and to support both locally hosted and external foundation models |
| Local infrastructure | Docker Compose (`mongo`, `api`, optional `ollama` profile) | Repeatable local environment; no production service required for any local-dev step |
| CI/CD | GitHub Actions | Free for the private repo's CI needs, integrates with the PR-gated workflow already defined in the SDLC |
| Dev tooling | VS Code, Git, GitHub, Jira, Postman | Team-standard tooling already in use |

## 6. REST API conventions

- All application routes are versioned under `/api/v1` (e.g. `/api/v1/health`).
- `/api/v1/health` reports API status plus current database connection state (`connected` / `connecting` /
  `disconnected`); the API starts and keeps serving even if MongoDB is unavailable, so health-checking
  never depends on the database being up.
- Authentication/authorization will be enforced as Express middleware (not yet implemented — SCRUM-12);
  unauthorized requests must return an appropriate HTTP status without leaking protected data.

## 7. Environments and deployment

Four environments are defined: Local, CI, Test/Demo, and Production. Local development (Docker Compose for
MongoDB and, optionally, Ollama) has no dependency on any hosted service. CI runs on GitHub Actions runners
with no real secrets. **Hosting for Test/Demo and Production is an open team decision** — GitHub Pages
cannot run the API/MongoDB/Ollama, and no external host has been selected yet; the `deploy.yml` workflow is
a placeholder (`workflow_dispatch`, no-op) until that decision is made. Configuration contract, secrets
handling, and the LLM engine/acceleration options are documented in full in
[environments.md](environments.md); do not duplicate them here.

## 8. Architecture decisions (summary)

Full rationale lives in the linked docs; the load-bearing decisions are:

- **Monorepo, not multi-repo** — `apps/api` and `apps/web` share one repository so infra, CI, and shared
  contracts stay in one place while the two apps are still developed and tested independently
  (README §Repository Architecture).
- **API as the sole UI/data boundary** — the web app never talks to MongoDB or the LLM provider directly.
- **Server-enforced authorization** — role-based and relationship-based checks live in the API, never only
  in UI visibility.
- **MongoDB is a recorded choice, not a permanent one** — changing it later must be an explicit,
  documented architecture decision (SCRUM-9 dependency note).
- **LLM provider-neutral by design** — `LLM_PROVIDER`/`LLM_BASE_URL`/`LLM_MODEL` env contract exists so a
  feature is never coded against one vendor; local (Ollama) and external (OpenAI/Gemini/Anthropic) providers
  are both first-class.
- **AI output is always advisory** — `RemediationPlan`/`ProgressReport` publication requires a recorded
  teacher review (`reviewedBy`/`reviewedAt`), and AI-sourced content must reference an `AiAuditLog` entry.
- **Path-based, always-reporting CI** — both CI workflows run on every PR and self-filter by changed paths
  inside the job (rather than `paths:` at the workflow level) so a required check is never left permanently
  pending. Detail: [ci-cd.md](../sdlc/ci-cd.md).

## 9. Where to look next

- Data model, entities, and visibility rules: [docs/database/data-model.md](../database/data-model.md)
- MongoDB lifecycle, seed data, and consistency checks: [docs/database/local-database.md](../database/local-database.md)
- CI/CD workflows, required checks, and CD status: [docs/sdlc/ci-cd.md](../sdlc/ci-cd.md)
- Environment matrix, configuration contract, and hosting constraints: [docs/architecture/environments.md](environments.md)
- Local onboarding and startup steps: [docs/setup/local-development.md](../setup/local-development.md)
- Team ownership, SDLC, and full tech-stack listing: [README.md](../../README.md)
