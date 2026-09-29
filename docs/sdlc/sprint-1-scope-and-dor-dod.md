# Sprint 1 Technical Scope, Definition of Ready, and Definition of Done

Source ticket: **SCRUM-6 — Establish Sprint 1 Technical Scope and Software Development Lifecycle.**

This doc closes the part of the SDLC that wasn't written down yet: a Definition of Ready, a
Definition of Done, and a single compiled list of the Sprint 1 technical tickets and what each
one is actually for. It does not repeat the Jira workflow, branch/commit/PR conventions, or CI
gates — those are already documented in [README.md](../../README.md) (Development Methodology,
Git Development Workflow, CI/CD sections) and [docs/sdlc/ci-cd.md](ci-cd.md), and this doc
references them rather than restating them.

Jira workflow in use (see README.md "Jira Workflow"):

```text
Backlog -> To Do -> In Progress -> Review/Test -> Done
```

---

## Definition of Ready (DoR)

A ticket may move from **Backlog/To Do into In Progress** once all of the following are true:

- [ ] The Jira description states the user story (As a / I want / so that) and includes
      acceptance criteria, not just a title.
- [ ] Scope/implementation details are specific enough to start work without needing a
      design discussion mid-task (this is why stories like SCRUM-9, SCRUM-11, SCRUM-12 carry
      detailed "Scope / Implementation Details" sections in Jira).
- [ ] The ticket has an assignee.
- [ ] The ticket has a priority set.
- [ ] Any blocking dependency called out in the ticket's "Dependencies / Notes" is resolved
      or explicitly waived (e.g. SCRUM-11's data model depends on the architecture decisions
      from SCRUM-9; SCRUM-13's CI validation depends on the backend scaffold from SCRUM-10).
- [ ] The work is sized to fit inside a two-week sprint window — if it isn't, it gets split
      into subtasks (as SCRUM-15 was split into SCRUM-21 through SCRUM-25) before it's picked up.
- [ ] The target branch name and commit-key convention are known (`SCRUM-<n>-<kebab-title>` /
      `SCRUM-<n> Short title`, per README.md "Git Development Workflow") — nothing new to define
      here, just confirming the ticket has a key to branch from.

A ticket that fails any of these stays in **To Do**, or moves to **Backlog** if it needs more
definition than a quick edit can fix.

---

## Definition of Done (DoD)

A ticket may move from **Review/Test into Done** once all of the following are true:

- [ ] Every item in the ticket's Jira "Acceptance Criteria" is satisfied — not just "code was
      written." Writing code is not itself completion (this is called out explicitly in SCRUM-6's
      own acceptance criteria).
- [ ] A feature branch was used (`SCRUM-<n>-<kebab-title>`), not direct commits to `main`.
- [ ] Commits reference the Jira key (`SCRUM-<n> Short title`).
- [ ] A pull request was opened using `.github/pull_request_template.md`, with its checklist
      completed:
      - Branch and commits reference the Jira key
      - `API CI` / `Web CI` checks pass
      - Tests added or updated
      - No secrets or real student data committed
      - Docs updated if setup, env vars, or workflow changed
- [ ] Required CI checks are green on the PR (`API CI` and, once active, `Web CI` — see
      docs/sdlc/ci-cd.md "Required checks before merge"). A ticket is not Done with a red or
      pending check.
- [ ] At least one other team member reviewed the PR (code review), and any Review/Test
      feedback was addressed — see "Defect / rework flow" below.
- [ ] Relevant documentation was updated in the same PR (README, docs/, `.env.example`, etc.)
      rather than deferred — per README.md "Documentation should evolve with the implementation
      rather than being deferred until the end of the project."
- [ ] The PR is merged to `main`.
- [ ] The Jira ticket's status is updated to Done (and linked GitHub activity — branch, commits,
      PR — is visible from the Jira issue per the SCRUM-8 integration).

### Defect / rework flow

If a defect is found during Review/Test (failing CI, failed manual test, or a reviewer requesting
changes):

1. The PR stays open / unmerged; the Jira ticket stays in **Review/Test**, it does not move to
   Done.
2. Fixes are pushed as additional commits on the same feature branch (still referencing the
   Jira key), which re-triggers CI on the PR.
3. If the defect turns out to be larger than a quick fix, the ticket moves back to **In Progress**
   so the rework is visibly tracked, rather than silently patched inside Review/Test.
4. Once CI is green and the reviewer approves, the normal DoD checklist above applies.

---

## Sprint 1 technical scope

Compiled from the Jira export (`Sprint 0 and 1-v1.csv`): the two stories explicitly tagged
**SCRUM Sprint 1**, plus SCRUM-11 and SCRUM-12, which carry no sprint tag in the export but are
To Do backend/architecture tickets that depend on SCRUM-9 (Sprint 0) and feed directly into
SCRUM-10/SCRUM-13 — i.e. the same wave of foundational technical work.

| Ticket | Title | Status (export) | Intent |
|---|---|---|---|
| **SCRUM-10** | Establish Node.js and Express Backend Foundation | In Progress | Stand up a runnable `apps/api` Express service with a real project structure (config/routes/controllers/services/middleware/models/validators/utils), a versioned base path (`/api/v1`), centralized error handling, env-driven config with `.env.example`, and health/readiness endpoints with initial automated tests — the base every feature endpoint will build on. |
| **SCRUM-11** | Establish Database Architecture, Local MongoDB, and Synthetic Seed Data | To Do | Get a repeatable local MongoDB setup connected to the API, design the initial Mongoose data model (User, Teacher/Student/Parent profiles, Course, Enrollment, Grade, Attendance, Teacher Feedback vs. private Teacher Notes, Goals, Remediation Plans, Reports, Notifications), and build a Faker.js-based seed script so the team can develop against realistic, non-identifiable data. Explicitly separates shareable teacher feedback from teacher-only notes. |
| **SCRUM-12** | Define Authentication and Role-Based/Relationship-Based Access Architecture | To Do | Define (not yet fully implement) how auth will work — password/session/token approach, initial roles (Teacher/Student/Parent, Admin TBD) — and the authorization rules: role-based (what a role can do) plus relationship-based (which specific student a Parent or Teacher may access). States authorization must be enforced server-side, never by hiding UI, and that AI-generated remediation content stays teacher-gated before Student/Parent visibility. |
| **SCRUM-13** | Establish CI/CD and Local Development Infrastructure | In Progress | The CI/CD and local-dev foundation this doc's own ticket (SCRUM-6) depends on: GitHub Actions workflows for API (and later Web) CI on every PR to `main`, monorepo path-based relevance detection, a required-checks expectation before merge, a documented local startup path (clone -> branch -> install -> env -> DB -> seed -> start API -> tests), and a CD implementation plan even though a deploy target isn't finalized. Current implementation state is tracked in [docs/sdlc/ci-cd.md](ci-cd.md) (API CI implemented, Web CI dormant pending the frontend scaffold, deploy workflow a no-op skeleton). |

### Explicitly out of scope for the first two weeks

Per SCRUM-6's own acceptance criteria ("identify technical items that are explicitly out of scope
for the first two weeks"), the following are deliberately deferred past Sprint 1 rather than
missing by accident:

- **Web CI enforcement** — the `web-ci.yml` workflow exists but stays dormant until
  `apps/web/package-lock.json` is present, i.e. until the frontend is scaffolded (docs/sdlc/ci-cd.md).
- **Real deployment** — `deploy.yml` is a placeholder/no-op; hosting target for
  test/demo/production is an open team decision (docs/sdlc/ci-cd.md "CD status").
- **Full authentication implementation** — SCRUM-12 defines the auth/authorization
  architecture only; implementing it through middleware/services is deferred to a later story per
  SCRUM-12's own "Dependencies / Notes."
- **Feature-level API endpoints** (grades, attendance, goals, remediation plans, AI service
  calls) — these sit on top of the SCRUM-10/SCRUM-11/SCRUM-12 foundation and are not part of the
  foundation work itself.
- **Branch-protection enforcement** — the "Pre merge verification" ruleset is configured but
  GitHub does not enforce rulesets on private repos without a paid plan; until then it's followed
  by convention only (docs/sdlc/ci-cd.md).

---

## References

- Jira workflow, team roles, branch/commit/PR naming, tech stack: [README.md](../../README.md)
- CI/CD workflows, required checks, path strategy, CD status: [docs/sdlc/ci-cd.md](ci-cd.md)
- PR checklist: [.github/pull_request_template.md](../../.github/pull_request_template.md)
- Source ticket and acceptance criteria: Jira SCRUM-6
