# AI remediation: what is sent to the AI

Covers `POST /api/v1/teacher/students/:studentId/remediation/ai` (SCRUM-123, 126, 135..138, 140) and the legacy
`POST /api/v1/teacher/recommendations`. Code: `apps/api/src/services/ai/`.

## Sent to the AI (built on the server by `buildAiInput.js`)
- Grades: for each assignment in the chosen class that has a grade row for the student: `title`, `category`,
  `pointsEarned` (or null), `pointsPossible`, `status` (graded, missing, late or excused).
- Attendance: counts per status for that class: `present`, `absent`, `tardy`, `excused`.
- Goal: the title of the student's latest active goal (or null).
- Progress: the percent from the goal's latest progress update (or null).
- Plus the fixed instructions text (`recommendation.js`, prompt version `v1`).

## Never sent
- Names, emails, user ids, student profile ids, section ids, assignment ids or any other id.
- Teacher notes (`TeacherNote`), feedback, goal update notes, or the student's class period and room.
- Client-supplied grades, attendance, goal or progress: the endpoint ignores them and reads the database.

## Output the AI must return
A JSON object with non-empty strings `guidance`, `goal`, `nextSteps`. `nextSteps` is split into 1 to 6 plan items.
Anything else is rejected (see failures). The output is advisory: a teacher reviews it before it is visible to families.

## Providers and environment variables
| Variable | Purpose |
|---|---|
| `LLM_PROVIDER` | `openai`, `ollama` or `mock`. Unset or any other value means unavailable. |
| `LLM_MODEL` | Model name. Required for `openai` and `ollama`. |
| `LLM_BASE_URL` | Ollama server, default `http://localhost:11434`. |
| `OPENAI_API_KEY` | Required for `openai`. Read at request time, never logged or stored. |
| `AI_TIMEOUT_MS` | Per-request timeout in milliseconds, default 15000. |

`mock` returns fixed output with no network call (provider `mock`, model `mock-1`); use it for tests, CI and demos.

## Failure behavior
Failures never change existing data: no plan, audit or item rows are written, and stored plans stay as they are.
- Not configured, timeout, network error or provider error: `503`
  `{ "error": "...", "code": "AI_UNAVAILABLE", "fallback": "manual" }`.
- Malformed or schema-invalid output: `502`
  `{ "error": "...", "code": "AI_INVALID_RESPONSE", "fallback": "manual" }`.
- The UI then offers manual plan creation.

## Success
`201 { "plan": { ... } }`: status `pending_review`, source `ai`, linked to an `AiAuditLog`
(`purpose: "remediation_plan"`, `promptVersion: "v1"`, `reviewOutcome: "pending"`). Students and parents do not see it until approved and published.
