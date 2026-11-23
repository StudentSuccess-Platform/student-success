# API endpoints

Base path `/api/v1` (the unversioned `/api/...` paths are kept as aliases). JSON in and out. Errors are
`{ "error": "message" }` with 400, 401, 403, 404 or 409. Send `Authorization: Bearer <token>` on everything except
register, login, forgot-password and reset-password. Source of truth: `apps/api/src/routes/`.

## Auth (`/auth`)
| Method and path | Body | Result |
|---|---|---|
| POST `/auth/register` | `email, password (8+), role (teacher/student/parent), firstName, lastName` | 201 `{ token, user }` |
| POST `/auth/login` | `email, password` | 200 `{ token, user }`; same 401 for unknown email and wrong password |
| GET `/auth/me` | none | 200 `{ user }` |
| POST `/auth/forgot-password` | `email` | 200 generic message, whether or not the email exists. Emails the link (logged in dev). |
| POST `/auth/reset-password` | `token, password (8+)` | 200, or 400 for an invalid, used or expired token (1 hour) |

`user` is `{ id, email, firstName, lastName, roles }`.

## Teacher (`/teacher`, role teacher)
| Method and path | Result |
|---|---|
| GET `/teacher/dashboard` | `{ summary, performanceTrend, attendanceOverview, interventions, recentActivity }` (shape in `apps/web/src/pages/teacher/dashboardMockData.js`) |
| GET `/teacher/classes` | `{ classes: [{ id, name, period, room, studentCount }] }` |
| POST `/teacher/classes/:classId/students` | Body `{ firstName, lastName, gradeLevel (1-12), email? }`. Creates a student with no login (User status `invited`, email optional) and enrols them: `201 { created: true, student: { id, name, gradeLevel, studentNumber, hasEmail, accountStatus }, class, enrollmentId }`. 400 `fields`; 404 not your class; 409 `fields.email` when the email is taken. Same first name + last name (case-insensitive) + grade level as an existing student: 409 `code: POSSIBLE_DUPLICATE` with `matches: [{ id, name, gradeLevel, studentNumber, alreadyInClass }]`; resend with `existingStudentId` (one of the matches) to enrol that student (200, `created: false`; 409 `ALREADY_ENROLLED`) or `allowDuplicate: true` to create a different child with the same name |
| GET `/teacher/reports` | The signed-in teacher's own progress reports, most recently changed first: `{ reports: [{ id, studentId, studentName, sectionId, className, periodStart, periodEnd (YYYY-MM-DD), summary, status (draft, pending_review, published), source, createdAt, updatedAt, publishedAt }], counts: { draft, pending_review, published } }`. Optional `?status=`; `counts` ignore the filter. Other teachers' reports are never listed |
| GET `/teacher/students/:studentId/reports/suggestion?sectionId&periodStart&periodEnd` | `{ summary }`: a factual starting text built from that class's grades, attendance and active goals in the period (no AI, no invented causes). 400 `fields`; 404 for an unassigned student |
| POST `/teacher/students/:studentId/reports` | Body `{ sectionId, periodStart, periodEnd, summary }` creates a `draft` owned by the teacher -> 201 `{ report }`. `sectionId` must be one of the student's classes with this teacher (400 `fields.sectionId`); the end date may not be before the start; `summary` is required, 5000 characters at most |
| PUT `/teacher/students/:studentId/reports/:reportId` | Body `{ periodStart, periodEnd, summary }` -> `{ report }`. 404 for a report that is not yours; 409 once published |
| POST `/teacher/students/:studentId/reports/:reportId/publish` | `draft` or `pending_review` -> `published` (records reviewer and time) -> `{ report }`; 409 if already published. Racing requests: exactly one wins |
| DELETE `/teacher/students/:studentId/reports/:reportId` | Deletes an unpublished report -> `{ deleted: true, id }`; 409 once published |
| GET `/teacher/classes/:classId` | `{ class, students: [{ id, name, averageGrade, attendanceRate }], classAverage }`; 404 for another teacher's class |
| POST `/teacher/recommendations` | AI remediation draft (advisory; teacher review required). 503 `AI_UNAVAILABLE` / 502 `AI_INVALID_RESPONSE` with `fallback: "manual"` |
| GET `/teacher/students` | Assigned students only: `{ students: [{ id, name, gradeLevel, classNames, averageGrade, attendanceRate, needsIntervention }] }` |
| GET `/teacher/students/:studentId` | Profile: `{ student, classes, summary, grades, attendance, goals, feedback, performanceTrend }`; 404 for any student not assigned to the teacher (also malformed ids). `grades` has one row per assignment, ungraded rows have `pointsEarned: null` |
| PUT `/teacher/students/:studentId/grades` | `{ assignmentId, pointsEarned?, status? }` upsert -> `{ grade }`; points must be 0..pointsPossible |
| POST `/teacher/students/:studentId/attendance` | `{ sectionId, date: "YYYY-MM-DD", status }` upsert (one row per class and day) -> `{ attendance }` |
| POST/PUT `/teacher/students/:studentId/goals[/:goalId]` | create / edit a goal -> `{ goal }`; POST `.../goals/:goalId/updates` `{ note, progressPercent }` -> `{ update }` |
| POST/PUT `/teacher/students/:studentId/feedback[/:feedbackId]` | `{ sectionId, body }` / `{ body }` -> `{ feedback }`; only the author can edit |
| GET/POST `/teacher/students/:studentId/remediation` | list all plans (newest first) / create a manual plan (`draft`) |
| PUT `/teacher/students/:studentId/remediation/:planId` | edit title, rationale, items while `draft` or `pending_review` (else 409). Send `version` (from the plan JSON) to refuse the edit with 409 if the plan changed since you loaded it; every edit and status change adds 1 |
| POST `.../remediation/:planId/approve` · `/reject` · `/publish` | approve (draft or pending_review) · reject (draft, pending_review or approved) · publish (approved only; else 409). Only `published` plans reach students and parents |
| POST `/teacher/students/:studentId/remediation/ai` | `{ sectionId? }` server gathers grades, attendance and goal; 201 `{ plan }` as `pending_review`, source `ai`. 503 `AI_UNAVAILABLE` or 502 `AI_INVALID_RESPONSE` (`fallback: "manual"`, nothing written). What is sent to the AI: `docs/ai/ai-request-fields.md` |

Validation errors are 400 `{ error, fields: { <name>: "<message>" } }`. Plan JSON: `{ id, studentId, sectionId, className, title, rationale, status, source, version, items: [{ id, title, description }], aiAuditId, createdAt, updatedAt, reviewedAt, publishedAt }`.
Design and contracts: `docs/design/teacher-portal-mvp.md`.

**Known gaps for the Class Roster tab (SCRUM-144):** `students[]` has no displayable Student ID (`StudentProfile.studentNumber` exists but isn't selected into this response) and no status classification (e.g. Excelled/Stable/Attention). The frontend omits both rather than inventing them. Add Student can now persist through `POST /teacher/classes/:classId/students` (below).

## Student (`/student`, role student)
| Method and path | Result |
|---|---|
| GET `/student/dashboard` | The signed-in student only (identity comes from the token, never the URL): `{ student, summary, grades, performanceTrend, goals, teacherFeedback, feedbackHistory, supportPlan }`. `feedbackHistory` is every shared feedback note, newest first (`{ id, teacher, date, message }`); `teacherFeedback` is the latest one. `supportPlan` is null until a teacher publishes one (reported with `status: "approved"`). `summary.termGoal` is null until goal targets exist. |
| GET `/student/reports` | The signed-in student's published progress reports only, newest period first: `{ reports: [{ id, className, teacher, periodStart, periodEnd, summary, publishedAt }] }`. Drafts and pending reports are never returned; status, source and reviewer are not included |
| GET `/student/support-plans` | The signed-in student's published plans only, newest first: `{ plans: [{ id, classId, className, title, rationale, source ("teacher" or "ai"), teacher, publishedAt, active, items: [{ id, title, description, status, dueDate }] }] }`. `active` is true for the newest plan of each class; the rest are earlier plans (clients show active ones first). Drafts, pending, approved, rejected and archived plans are never returned; reviewer, AI audit id and `version` are not included |

## Parent (`/parent`, role parent)
| Method and path | Result |
|---|---|
| GET `/parent/children` | `{ children: [{ id, name, gradeLevel }] }`, linked students only |
| GET `/parent/children/:studentId/reports` | Same list and shape as `/student/reports` for one linked child; 404 if the student is not actively linked |
| GET `/parent/children/:studentId/support-plans` | Same list and shape as `/student/support-plans` for one linked child; 404 if the student is not actively linked |
| GET `/parent/children/:studentId/dashboard` | Same shape as the student dashboard; 404 if the student is not actively linked |

## Rules enforced here
- Role checks run first (403), then relationship checks (404, so ids cannot be probed).
- Private teacher notes (`TeacherNote`) are never read by student or parent endpoints.
- Grades: missing work counts as 0, excused is ignored. Attendance: present and tardy count, excused is ignored.
  Needs intervention: grade under 70 or attendance under 85 (`apps/api/src/services/grades/gradeMath.js`).
- Tests: `apps/api/tests/integration/{teacher,student,auth}/`, helpers in `tests/helpers/fixtures.js`.
