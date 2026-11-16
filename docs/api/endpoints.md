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

**Known gaps for the Class Roster tab (SCRUM-144):** `students[]` has no displayable Student ID (`StudentProfile.studentNumber` exists but isn't selected into this response) and no status classification (e.g. Excelled/Stable/Attention). The frontend omits both rather than inventing them. There is also no enrollment-creation route yet, so Add Student (separate story) can't persist anything server-side.

## Student (`/student`, role student)
| Method and path | Result |
|---|---|
| GET `/student/dashboard` | The signed-in student only (identity comes from the token, never the URL): `{ student, summary, grades, performanceTrend, goals, teacherFeedback, feedbackHistory, supportPlan }`. `feedbackHistory` is every shared feedback note, newest first (`{ id, teacher, date, message }`); `teacherFeedback` is the latest one. `supportPlan` is null until a teacher publishes one (reported with `status: "approved"`). `summary.termGoal` is null until goal targets exist. |

## Parent (`/parent`, role parent)
| Method and path | Result |
|---|---|
| GET `/parent/children` | `{ children: [{ id, name, gradeLevel }] }`, linked students only |
| GET `/parent/children/:studentId/dashboard` | Same shape as the student dashboard; 404 if the student is not actively linked |

## Rules enforced here
- Role checks run first (403), then relationship checks (404, so ids cannot be probed).
- Private teacher notes (`TeacherNote`) are never read by student or parent endpoints.
- Grades: missing work counts as 0, excused is ignored. Attendance: present and tardy count, excused is ignored.
  Needs intervention: grade under 70 or attendance under 85 (`apps/api/src/services/grades/gradeMath.js`).
- Tests: `apps/api/tests/integration/{teacher,student,auth}/`, helpers in `tests/helpers/fixtures.js`.
