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
| POST `/teacher/recommendations` | AI remediation draft (advisory; teacher review required) |

**Known gaps for the Class Roster tab (SCRUM-144):** `students[]` has no displayable Student ID (`StudentProfile.studentNumber` exists but isn't selected into this response) and no status classification (e.g. Excelled/Stable/Attention). The frontend omits both rather than inventing them. There is also no enrollment-creation route yet, so Add Student (separate story) can't persist anything server-side.

## Student (`/student`, role student)
| Method and path | Result |
|---|---|
| GET `/student/dashboard` | The signed-in student only (identity comes from the token, never the URL): `{ student, summary, grades, performanceTrend, goals, teacherFeedback, supportPlan }`. `supportPlan` is null until a teacher publishes one (reported with `status: "approved"`). `summary.termGoal` is null until goal targets exist. |

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
