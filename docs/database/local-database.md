# Local database: MongoDB lifecycle and seed data

MongoDB is the project database (see the architecture story). Everything below runs locally; no production service is needed and no real student data is used anywhere.

## Configuration
The API reads `MONGODB_URI` (see `apps/api/.env.example`). Credentials and local secrets stay in `.env`, which is gitignored.

| Where the API runs | `MONGODB_URI` |
|---|---|
| On your machine (`npm run dev`) | `mongodb://localhost:27017/studentsuccess` |
| Inside Docker Compose | `mongodb://mongo:27017/studentsuccess` (set by `docker-compose.yml`) |

`DB_CONNECT_RETRIES` (default 5) sets how many times the API tries to connect at startup.

### Connection behavior
- The API starts even if MongoDB is missing or down, so `/api/v1/health` stays reachable. Health reports `"database": "connected" | "connecting" | "disconnected"`.
- Connection failures are logged with credentials redacted (`mongodb://***@host`). A connection string is never logged in full.
- With no `MONGODB_URI` the API logs a warning and runs without a database.

## Lifecycle commands
From the repo root:

| Task | Command |
|---|---|
| Start MongoDB | `docker compose up -d mongo` |
| Stop (data kept in the `mongo-data` volume) | `docker compose stop mongo` |
| Stop and remove containers (data kept) | `docker compose down` |
| Wipe all database data | `docker compose down -v` |
| Check it is healthy | `docker compose ps mongo` |
| Open a shell | `docker compose exec mongo mongosh studentsuccess` |

From `apps/api` (set `MONGODB_URI` in `.env` first):

| Task | Command |
|---|---|
| Seed synthetic data (refuses if data exists) | `npm run db:seed` |
| Wipe the seeded collections and reseed | `npm run db:reset` |
| Seed only some modules | `npm run db:seed -- --only grades,attendance` |
| Check consistency of what is in the database | `npm run db:check` |
| Different data set (any number) | `npm run db:reset -- --seed 7` |

## Seed data
Seeds are **synthetic and deterministic**: Faker generates names and text, emails use the reserved `@example.test` domain, and a fixed seed produces identical records and ids on every run. Nothing depends on real student information.

The seed is split into modules in `apps/api/seed/modules/`, outside `src/` so it is not part of the production image, run in this order:

| Module | Creates |
|---|---|
| `users` | admin, teachers, students, guardians, profiles, guardian-to-student links |
| `courses` | courses, sections, enrollments, assignments |
| `grades` | assignment-level grades (with missing/late work) |
| `attendance` | 15 school days per enrollment |
| `notes` | shareable teacher feedback and private teacher-only notes |
| `goals` | student goals and progress updates |
| `remediation` | AI-audit records, remediation plans and their items (review states) |
| `reports` | progress reports |
| `communications` | notifications and messages for what has been published |

Default size: 4 teachers, 24 students, 18 guardians, 6 sections, 96 enrollments, 768 grades, 1,440 attendance records. Every module is generated in memory in the same order, so `--only <module>` inserts just that module's records and they still line up with data from the other modules.

To add a module: create `apps/api/seed/modules/<name>.js` (export `name`, `models`, `run(ctx)`) and list it in `apps/api/seed/registry.js`.

### Safety
- Seeding refuses `NODE_ENV=production` and any non-local database host (`ALLOW_REMOTE_SEED=1` overrides the host check).
- `db:seed` never overwrites: it stops if the target collections already contain data. Use `db:reset` to wipe and reseed.
- After seeding, the runner validates consistency and exits non-zero on any problem.

### Consistency rules (`npm run db:check`)
- Every reference points to an existing document.
- Grades and attendance belong to a student enrolled in that section.
- Feedback, notes and plans are written by the teacher who teaches the section, for an enrolled student.
- Private notes are `teacher_only`; feedback is `shared`.
- Approved/published plans and published reports have a teacher review; AI-sourced items have an audit record.
- Every student has an active guardian link; emails are unique and synthetic.

## Reset workflow
1. `docker compose up -d mongo`
2. `cd apps/api && npm run db:reset`
3. `npm run db:check` (already run by step 2)

To start completely fresh: `docker compose down -v`, then repeat from step 1.

## Tests that use the database
The database tests (`npm run test:module -- database`) need a MongoDB server: set `MONGODB_URI` to it (for example `mongodb://localhost:27017/studentsuccess`). Each test file creates its own throwaway database (`ss_<random>_test`) on that server and drops it afterwards, so tests run in parallel and never touch your dev data. Without `MONGODB_URI` they are skipped. CI provides a MongoDB service and runs them on every API change.
