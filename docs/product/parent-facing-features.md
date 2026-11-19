# Parent-facing features (SCRUM-21)

Jira ticket SCRUM-21 ("Identify parent-facing features," Subtask, Sprint 0, marked **Done**) has no Description field in the Jira export — only the Summary title. This document is the feature specification that ticket was meant to produce: the explicit, numbered list of parent-facing features StudentSuccess supports, with the data each one is backed by and its current implementation status.

It was derived from:
- `README.md` → "Project Goals" ("Allow parents to monitor academic progress and approved support plans") and "Version 1 Scope" (Grades, Attendance, Academic trends, Teacher feedback, Progress reports, Remediation plans, Parent access).
- `docs/database/data-model.md` → the entities and data-visibility rules listed below.

## Status legend
- **Data model only** — a Mongoose model/relationship exists in `apps/api/src/models/`, but there is no API route/controller and no frontend view yet.
- **Partially implemented** — the API and parent dashboard show some of the feature, but the complete experience described here is not available yet.

The parent dashboard is partially implemented. `GET /api/v1/parent/children` lists linked students, and `GET /api/v1/parent/children/:studentId/dashboard` returns a linked student's dashboard data. The UI currently shows the first linked child only; a child selector and several other parent features remain unimplemented.

## Features

1. **View child's grades by course**
   Data: `Grade` (assignment-level, per student, via `Assignment` → `Section` → `Enrollment`), rolled up per `Course`/`Section`.
   Access rule: a guardian may view grades only for students they have an active `GuardianStudentLink` to.
   Status: partially implemented — the dashboard shows current grades by subject, but parents cannot select among multiple linked children yet.

2. **View attendance history**
   Data: `Attendance` (per student, per section, per date).
   Access rule: scoped by `GuardianStudentLink`, same as grades.
   Status: partially implemented — the dashboard shows an attendance percentage, not attendance history.

3. **View academic trend over time**
   Data: derived from `Grade` and `Attendance` history over time, and `GoalUpdate.progressPercent` history. No dedicated "trend" collection exists; trends are computed from the underlying records rather than stored directly.
   Status: partially implemented — the dashboard displays a performance-trend chart derived from grade history.

4. **View teacher feedback (shared, not private notes)**
   Data: `TeacherFeedback` (`visibility = "shared"`), a collection kept separate from `TeacherNote` (`visibility = "teacher_only"`). Per `docs/database/data-model.md`, student and parent queries never read `TeacherNote`, so private notes cannot leak through a shared query.
   Status: implemented in the dashboard — shared feedback history is displayed; private `TeacherNote` records are not returned.

5. **View goals and progress**
   Data: `Goal` and `GoalUpdate` (`progressPercent`, author) for the linked student.
   Status: implemented in the dashboard — active goals and their latest progress are displayed.

6. **View remediation plans (teacher-approved)**
   Data: `RemediationPlan` / `RemediationItem`. Plans follow a status flow (`draft` → `pending_review` → `approved` → `published`, or `archived`) and require `reviewedBy`/`reviewedAt` before publication, enforced by a `pre("validate")` hook. AI-sourced plans additionally carry an `AiAuditLog` reference. Parents only see plans in a published state — AI output is advisory until a teacher approves it.
   Status: partially implemented — the dashboard displays the latest published plan; it does not yet list all published plans.

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
Per `docs/database/data-model.md`: "a guardian can access exactly the students with an active `GuardianStudentLink`." Parent API routes require authentication and the parent role, then verify the relationship before returning a linked student's data. Dashboard queries use shared feedback and published support plans; they do not return private teacher notes.

## Gap this document closes
SCRUM-21 was marked Done without a dedicated feature specification; the feature list was only inferable from README's Version 1 Scope bullets and the data-model entity table. This document makes that inference explicit and numbered, and records the implemented parent dashboard alongside features that remain data-model-only.
