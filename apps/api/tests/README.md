# API test suite

Built on the Node.js built-in runner (`node --test`), no extra dependencies.
`tests/run.js` selects which files run. This layout is the model for the app's test suites.

```
tests/
  run.js                                  selector (type / module / suite)
  helpers/                                shared utilities, not run as tests
  unit/<module>/<name>.test.js            pure logic, no server or DB
  integration/<module>/<name>.test.js     HTTP against the Express app (ephemeral port)
  e2e/<module>/<name>.test.js             full-stack flows (future, needs web + DB)
```

Three axes:
- **Level** (folder): unit, integration, e2e.
- **Module** (sub-folder): a feature area (`system`, `errors`, later `auth`, `students`, ...). Keep a module's unit and integration tests in same-named folders.
- **Suite** (file suffix): `*.smoke.test.js` marks the fast critical-path subset.

| Goal | Command |
|---|---|
| Full suite / full regression (every test, run in CI and before release) | `npm test` |
| Smoke (fast critical path only) | `npm run test:smoke` |
| One level | `npm run test:unit` / `test:integration` / `test:e2e` |
| One module (related features/logic) | `npm run test:module -- errors` |
| Combine | `node tests/run.js --type integration --module system --suite smoke` |

Conventions: one file per feature or route group, named `<feature>.test.js` (add `.smoke` only for critical-path tests); use `describe` per feature; new modules just add a folder, and no runner change is needed. Regression is the full suite: every bug fix adds a test in its module.

Database tests (`integration/database`) need a MongoDB server via `MONGODB_URI`. Each test file gets its own throwaway database (`helpers/database.js`: `createTestDatabaseUri` and `dropTestDatabase`), so files run in parallel without touching dev data; see `isolation.test.js` for the pattern to copy. Without `MONGODB_URI` they are skipped. CI provides a MongoDB service.
Current modules: `system`, `errors`, `config`, `models`, `seed`, `database`, `auth`, `student`.
