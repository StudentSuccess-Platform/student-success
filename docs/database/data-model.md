# Data model

Mongoose models live in `apps/api/src/models/`, one file per collection, exported from `index.js`. The model is the initial design for the Teacher, Student and Parent portals. Authentication and authorization enforcement come in later stories; this design makes them possible.

## Entities and relationships

```
User (roles: teacher | student | parent | admin)
 ├─ TeacherProfile ──< Section >── Course
 ├─ StudentProfile ──< Enrollment >── Section ──< Assignment ──< Grade (per student)
 │       │                                  └──< Attendance (per student, per date)
 │       ├──< GuardianStudentLink >── GuardianProfile ── User
 │       ├──< TeacherFeedback (shared)   ├──< TeacherNote (teacher only)
 │       ├──< Goal ──< GoalUpdate        ├──< RemediationPlan ──< RemediationItem
 │       └──< ProgressReport             └──< AiAuditLog
 └─ Notification, Message (between users, about a student)
```

| Collection | Purpose | Key fields and references |
|---|---|---|
| User | identity and role assignment | email (optional; unique when set), `roles[]`, status (`active`, `disabled`, `invited` = added by a teacher, no login yet), `passwordHash` (reserved for auth, `select: false`), isSynthetic |
| TeacherProfile | teacher details | user, department, title |
| StudentProfile | student details | user, studentNumber (unique, synthetic), gradeLevel |
| GuardianProfile | parent/guardian details | user, phone |
| GuardianStudentLink | which students a guardian may access | guardian, student, relationship, active; unique pair |
| Course | catalog entry | code (unique), title, subject |
| Section | a class: course + teacher + term | course, teacher, term, period, room |
| Enrollment | student in a section | section, student, status; unique pair |
| Assignment | graded item | section, category, pointsPossible, dueDate |
| Grade | assignment-level grade | assignment, student, pointsEarned, status; unique pair |
| Attendance | per student per section per day | section, student, date, status; unique triple |
| TeacherFeedback | teacher comments meant to be shared | student, teacher, section, assignment?, visibility = `shared` |
| TeacherNote | private teacher notes | student, teacher, section?, visibility = `teacher_only` |
| Goal / GoalUpdate | student goals and progress | student; goal, author, progressPercent |
| RemediationPlan / RemediationItem | plans and their activities | student, section, teacher, status, source, reviewedBy, aiAudit |
| ProgressReport | academic report for a period | student, period, summary, status, reviewedBy |
| Notification | in-app notification | recipient, type, readAt |
| Message | communication between users | sender, recipient, student? |
| AiAuditLog | audit trail for AI generation | purpose, provider, model, promptVersion, requestedBy, reviewedBy, reviewOutcome |

## Data-visibility design
- **Private vs shared:** private teacher notes are a separate collection (`TeacherNote`) with an immutable `teacher_only` classification, and shareable feedback is `TeacherFeedback` with an immutable `shared` classification. Student and parent queries never read `TeacherNote`, so a private note cannot leak through a shared query.
- **Parent access:** a guardian can access exactly the students with an active `GuardianStudentLink`.
- **Teacher access:** a teacher can access students enrolled in a section where `Section.teacher` is that teacher.
- **Student access:** a student accesses their own records through `StudentProfile.user`.
- **Teacher review before publication:** `RemediationPlan` (`approved`, `published`) and `ProgressReport` (`published`) require `reviewedBy` and `reviewedAt`. This is enforced by `pre("validate")` hooks. AI output is advisory until a teacher approves it.
- **AI audit:** AI-sourced plans and reports must reference an `AiAuditLog` (provider, model, prompt version, reviewer, outcome). It stores references and versions, not raw student data.

Enforcing who may call what (RBAC and relationship checks) is the API's job in the authentication/authorization stories; these models supply the relationships those checks need.

## Status flows
- RemediationPlan: `draft` -> `pending_review` -> `approved` -> `published` (or `archived`).
- ProgressReport: `draft` -> `pending_review` -> `published`.

## Conventions
- Every collection has `createdAt`/`updatedAt` (Mongoose timestamps).
- Indexes support the main lookups (by student, by section, by recipient) and enforce uniqueness where duplicates are wrong.
- Models are ES modules registered once (`mongoose.models.X ?? mongoose.model(...)`).

## Seed data and consistency
See `local-database.md`. The seed generates the entities above and `npm run db:check` verifies the relationships described here.
