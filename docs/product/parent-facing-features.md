# Parent-facing features (SCRUM-21)

Jira ticket SCRUM-21 ("Identify parent-facing features," Subtask, Sprint 0, marked **Done**) has no Description field in the Jira export — only the Summary title. This document is the feature specification that ticket was meant to produce: the explicit, numbered list of parent-facing features StudentSuccess supports, with the data each one is backed by and its current implementation status.

It was derived from:
- `README.md` → "Project Goals" ("Allow parents to monitor academic progress and approved support plans") and "Version 1 Scope" (Grades, Attendance, Academic trends, Teacher feedback, Progress reports, Remediation plans, Parent access).
- `docs/database/data-model.md` → the entities and data-visibility rules listed below.

## Status legend
- **Data model only** — a Mongoose model/relationship exists in `apps/api/src/models/`, but there is no API route/controller and no frontend view yet.
- **UI pending** — `apps/web` exists as a scaffold, but `apps/web/src/pages/parent/` and `apps/web/src/components/parent/` currently contain only `.gitkeep` placeholders; no parent screens have been built.

As of this writing, every feature below is **data model only, UI pending** — the backend data model supports the feature, but no API endpoint and no frontend view have been implemented yet.

## Features

1. **View child's grades by course**
   Data: `Grade` (assignment-level, per student, via `Assignment` → `Section` → `Enrollment`), rolled up per `Course`/`Section`.
   Access rule: a guardian may view grades only for students they have an active `GuardianStudentLink` to.
   Status: data model only, UI pending.

2. **View attendance history**
   Data: `Attendance` (per student, per section, per date).
   Access rule: scoped by `GuardianStudentLink`, same as grades.
   Status: data model only, UI pending.

3. **View academic trend over time**
   Data: derived from `Grade` and `Attendance` history over time, and `GoalUpdate.progressPercent` history. No dedicated "trend" collection exists; trends are computed from the underlying records rather than stored directly.
   Status: data model only, UI pending. (Also depends on a reporting/trend service, which is not yet implemented — see SCRUM-9's "Reporting/trend services" architecture item.)

4. **View teacher feedback (shared, not private notes)**
   Data: `TeacherFeedback` (`visibility = "shared"`), a collection kept separate from `TeacherNote` (`visibility = "teacher_only"`). Per `docs/database/data-model.md`, student and parent queries never read `TeacherNote`, so private notes cannot leak through a shared query.
   Status: data model only, UI pending.

5. **View goals and progress**
   Data: `Goal` and `GoalUpdate` (`progressPercent`, author) for the linked student.
   Status: data model only, UI pending.

6. **View remediation plans (teacher-approved)**
   Data: `RemediationPlan` / `RemediationItem`. Plans follow a status flow (`draft` → `pending_review` → `approved` → `published`, or `archived`) and require `reviewedBy`/`reviewedAt` before publication, enforced by a `pre("validate")` hook. AI-sourced plans additionally carry an `AiAuditLog` reference. Parents only see plans in a published state — AI output is advisory until a teacher approves it.
   Status: data model only, UI pending.

7. **View published progress reports**
   Data: `ProgressReport` (`period`, `summary`, `status`). Follows `draft` → `pending_review` → `published`; requires `reviewedBy` before publication, same as remediation plans.
   Status: data model only, UI pending.

8. **Receive notifications about a linked student**
   Data: `Notification` (recipient, type, `readAt`).
   Status: data model only, UI pending.

9. **Message a teacher about a linked student**
   Data: `Message` (sender, recipient, optional `student` reference). README's Version 1 Scope does not explicitly list messaging, but the data model and `docs/database/data-model.md` include it as a cross-cutting communication feature.
   Status: data model only, UI pending.

## Access control (applies to all features above)
Per `docs/database/data-model.md`: "a guardian can access exactly the students with an active `GuardianStudentLink`." This relationship-based rule, plus the shared/private split for teacher notes vs. feedback, is what makes every feature above safe to expose to a parent once the API and UI are built. Enforcement is the responsibility of the authentication/authorization work (SCRUM-12) and has not yet been implemented at the API layer — `apps/api/src/routes/` and `apps/api/src/controllers/` currently contain only `.gitkeep` placeholders.

## Gap this document closes
SCRUM-21 was marked Done without a dedicated feature specification; the feature list was only inferable from README's Version 1 Scope bullets and the data-model entity table. This document makes that inference explicit and numbered, and records that the backend data model (not the API or UI) is the only layer currently implemented for any parent-facing feature.
