# Parent portal requirements

**Jira:** SCRUM-15 — Define Parent Portal Requirements
**Subtasks:** SCRUM-21 (identify parent-facing features), SCRUM-22 (child-to-parent relationship requirements), SCRUM-23 (privacy/access restrictions), SCRUM-24 (what data parents can view), SCRUM-25 (parent workflow)
**Status:** Requirements documented below; several are already satisfied by the current data model and README authorization design (noted inline). Remaining item: team review and sign-off.

This document is the standalone parent-portal requirements record the SCRUM-15 acceptance criteria call for. It does not introduce new rules — it collects and formalizes the parent-related decisions already made in `README.md`, `docs/database/data-model.md`, and `docs/database/local-database.md`, and states them as requirements a parent-facing implementation must meet.

## 1. Problem statement (user story)

> As a parent, I want to view my child's grades, attendance, goals, progress, and teacher feedback so that I can monitor their academic progress.

A parent/guardian is one of the three primary StudentSuccess users, alongside Teacher and Student (`README.md`, "User Roles"). Today the platform has no parent-facing UI; this document defines what that portal must do before it is built, so implementation, API design, and QA/UAT (Deandra's acceptance-criteria and testing work) share one source of truth.

## 2. Scope

### 2.1 In scope for Version 1

Per the README's "Version 1 Scope" section, the following are in scope and apply directly to the parent portal:

- Authentication, with Parent as one of the supported roles (Teacher, Student, Parent)
- Parent access to their linked student(s)' academic data
- Grades and attendance
- Teacher feedback (shared)
- Academic goals and progress tracking
- Progress reports
- Remediation plans, once teacher-approved/published
- AI-assisted remediation recommendations are visible to parents only after teacher review (never as raw/unreviewed AI output)

### 2.2 Out of scope for Version 1

Not called for by the README's Version 1 list or the current data model, and therefore excluded unless a later story adds them:

- Parent ability to create, edit, or dispute grades, attendance, feedback, goals, or remediation plans — the model defines these as teacher/student-authored records; parents are read-only consumers of academic data
- Parent visibility into `TeacherNote` (private teacher notes) — see §5
- Parent-initiated messaging/communication beyond what a future `Message`/`Notification` feature explicitly authorizes (the `Message`/`Notification` collections exist in the data model but a parent-facing messaging workflow is not yet specified)
- Multi-parent household administration (e.g., a parent inviting another guardian, transferring guardianship) — `GuardianStudentLink` supports multiple guardians per student, but no self-service management workflow is defined
- Admin-role capabilities (user/role management) — Admin is a separate, still-tentative role per the README

## 3. Parent role and relationships (SCRUM-22)

The parent role is `PARENT`, one of the four role constants (`TEACHER`, `STUDENT`, `PARENT`, `ADMIN`) intended for `packages/shared/` (`README.md`, "Shared Code"). A parent is represented by a `GuardianProfile` linked to a `User` with that role.

Child-to-parent access is **relationship-based, not just role-based** — holding the Parent role alone grants no student data. Per `docs/database/data-model.md`:

- `GuardianStudentLink` is the join entity: `guardian`, `student`, `relationship`, `active`, with a unique `(guardian, student)` pair.
- A guardian may access **exactly the students with an active `GuardianStudentLink`** to them — no more, no fewer.
- The link supports multiple guardians per student (e.g., two parents, or a parent plus another authorized guardian) and multiple students per guardian (siblings), since the uniqueness constraint is per pair, not per student or per guardian alone.
- `active: false` revokes access without deleting history — a link can be deactivated (e.g., custody change) rather than destroyed.
- The seed/consistency check (`npm run db:check`, `docs/database/local-database.md`) already enforces "every student has an active guardian link," so this relationship is exercised in synthetic data today.

**Requirement:** every API endpoint that returns student data to a Parent-role user must resolve the caller's active `GuardianStudentLink` set first and scope the response to that set. This is a backend/relationship-based-authorization responsibility (README, "Authorization"), not a UI-level filter.

## 4. Functional requirements — what a parent can do (SCRUM-21, SCRUM-24)

A parent, once authenticated and linked to a student, must be able to view the following for each linked student:

| # | Requirement | Backing entity | Notes |
|---|---|---|---|
| FR-1 | View the student's assignment-level grades | `Grade` (via `Assignment`, `Enrollment`, `Section`) | Model supports assignment-level grades, not just a single course grade |
| FR-2 | View the student's attendance history | `Attendance` | Per student, per section, per day |
| FR-3 | View shared teacher feedback | `TeacherFeedback` (`visibility: shared`) | Never `TeacherNote` — see §5 |
| FR-4 | View the student's academic goals and progress updates | `Goal`, `GoalUpdate` | |
| FR-5 | View published progress reports | `ProgressReport` (`status: published`) | Draft/pending-review reports are not parent-visible (§5) |
| FR-6 | View approved/published remediation plans and their items | `RemediationPlan`, `RemediationItem` (`status: approved` or `published`) | Draft/pending-review plans are not parent-visible |
| FR-7 | View which of their own children/wards are linked to their account | `GuardianStudentLink` | Supports the multi-child case |
| FR-8 | See academic trends derived from the above (grades/attendance over time) | Derived from `Grade`, `Attendance` | README project goal: "Allow parents to monitor academic progress"; no separate trend entity exists yet — this is a reporting/aggregation requirement over existing data, not a new collection |

A parent must **not** be able to:
- Modify any of the above records (read-only role for academic data)
- View another student's data, even a sibling's, without an active link to that specific student
- View unreviewed AI-generated content (draft remediation suggestions, unapproved report summaries) — see §5

## 5. Privacy and access requirements (SCRUM-23)

These are non-functional/security requirements. The authoritative rules already exist in `docs/database/data-model.md` ("Data-visibility design") and the README ("Authorization"); this section restates them from the parent's point of view and must not be treated as a separate or divergent rule set.

- **Teacher-only notes are never parent-visible.** `TeacherNote` carries an immutable `teacher_only` classification and is a separate collection from `TeacherFeedback` (`shared`). Parent-facing queries must never read `TeacherNote`; this is a query-shape guarantee (private notes live in a collection parent endpoints don't touch), not a per-field filter that could be bypassed.
- **Teacher review gates AI-assisted output before parent visibility.** `RemediationPlan` and `ProgressReport` require `reviewedBy`/`reviewedAt` before reaching `approved`/`published` state (enforced by Mongoose `pre("validate")` hooks per the data model). A parent must only ever see plans/reports in a post-review state. AI output is advisory until a teacher approves it — this satisfies the README's "AI-generated remediation recommendations will be reviewed by teachers before being shared with... parents."
- **Access is scoped to linked students only**, enforced server-side via `GuardianStudentLink` (§3), not by hiding UI elements. Per the README: "Authorization must be enforced by the backend API and not only through hidden frontend elements." Unauthorized requests must return an appropriate HTTP response (e.g., 403/404) without leaking whether the requested student exists.
- **No direct access to `AiAuditLog` internals.** The audit log stores provider/model/prompt-version/reviewer metadata for compliance, not for parent consumption; a parent-facing view may show that content was reviewed, but not raw audit/provider details.
- **Synthetic data only in development.** Parent-portal development and testing use synthetic seed data (Faker-generated, `@example.test` emails) per `docs/database/local-database.md` — no real student PII is required or permitted pre-production.
- **Authentication is a prerequisite**, not yet finalized. The README lists authentication as in-scope for Version 1 and as a dependency of role/relationship enforcement; the specific auth mechanism (session/token strategy) is tracked separately (SCRUM-12, "Define Authentication and Role-Based/Relationship-Based Access Architecture") and this document assumes that story's output rather than redefining it.

## 6. Parent workflow (SCRUM-25)

Expected end-to-end flow for a parent user:

1. **Authenticate** as a Parent-role user (mechanism defined by the auth/authorization story, SCRUM-12).
2. **Land on a linked-children view** if more than one active `GuardianStudentLink` exists; otherwise go directly to that student's overview (FR-7).
3. **Select a student** (when more than one child is linked) to view that student's data — grades, attendance, goals, feedback, reports, and remediation plans (FR-1–FR-6), each scoped by the backend to that guardian-student pair.
4. **Drill into a category** (e.g., grades) for assignment-level or date-level detail rather than a single aggregate figure, consistent with the data model's assignment-level `Grade` design.
5. **View trend/summary information** (FR-8) drawn from the same underlying records, for at-a-glance monitoring.
6. **Receive/read notifications** tied to their linked student once publish events occur (e.g., a new published progress report or approved remediation plan) — this depends on the `Notification` collection and is a candidate for a follow-up story if not already covered by an existing one.

No step in this workflow requires or exposes write access, teacher-only notes, or unreviewed AI content, per §4–§5.

## 7. Acceptance criteria traceability

Mapping this document back to the SCRUM-15 acceptance criteria:

| Acceptance criterion | Satisfied by |
|---|---|
| Parent portal requirements documented | This document (§4, §6) |
| Parent access rules documented | §5, backed by `docs/database/data-model.md` "Data-visibility design" and README "Authorization" |
| Parent/student relationship requirements documented | §3, backed by `GuardianStudentLink` in `docs/database/data-model.md` |
| Team reviews and approves scope | Open — this document is the artifact for that review; status should move to Done only after review |

## 8. References

- `README.md` — Project Goals, User Roles, Authorization, Version 1 Scope
- `docs/database/data-model.md` — entities/relationships, Data-visibility design, status flows
- `docs/database/local-database.md` — seed data, consistency rules (`npm run db:check`) that already exercise guardian-student links and visibility rules
- Related Jira: SCRUM-9 (system architecture), SCRUM-11 (database architecture and seed data), SCRUM-12 (authentication/authorization architecture)
