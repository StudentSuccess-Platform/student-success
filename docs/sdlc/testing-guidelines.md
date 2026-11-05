# Testing guidelines

Goal: one predictable place for every test so the suite stays manageable (Deandra owns the suite).
Never put test files loose in a folder or next to source files.

## Where tests go
```
apps/<app>/tests/
  unit/<module>/<Name>.test.<js|jsx>          pure logic or a single component, no server or DB
  integration/<module>/<name>.test.js         API over HTTP, or components + routing/state together
  e2e/<module>/<name>.test.js                 full flows (web + API + DB)
  helpers/                                    shared utilities, not tests
```
- `<module>` is a feature area: API `auth`, `system`, `errors`, `models`, `seed`, `database`, `config`, `docs`;
  web `auth`, `teacher`, `student`, `parent`, `common`, `utils`.
- File name = what it tests: `Login.test.jsx`, `auth.test.js`. Fast critical-path API tests end in `.smoke.test.js`.
- API reference: `apps/api/tests/README.md`. Web tests import source with `../../../src/...` from `tests/unit/<module>/`.
- Existing flat files in `apps/web/tests/unit/` are legacy. Move them into module folders when you touch them.

## Rules for every change
1. Add or update tests in the same PR. A bug fix adds a regression test in its module.
2. Unit tests mock the network and clock; integration tests use the helpers in `tests/helpers/`
   (`startTestServer`, throwaway test database; always close servers in `after`).
3. Use synthetic data only. Never real student data or real secrets.
4. Keep tests independent and deterministic: no order dependence, no sleeping, clean up `localStorage`/DB.

## Commands
| App | All | Level / module | Lint |
|---|---|---|---|
| api | `npm test` | `npm run test:unit`, `npm run test:module -- auth`, `npm run test:smoke` | `npm run lint` |
| web | `npm run test:run` | `npx vitest run tests/unit/auth` | `npm run lint` |
| web browser (Playwright) | `npm run test:e2e` | `npm run test:e2e -- tests/e2e/auth` | `npm run lint` |
Browser tests (`apps/web/tests/e2e/<module>/*.spec.js`) need MongoDB seeded, the API and the web app running; see `apps/web/tests/e2e/README.md`.
Database tests need `MONGODB_URI` (for example `mongodb://localhost:27017`) and Docker mongo running; they skip otherwise.

## Push requirements (enforced by `.githooks/pre-push`, installed by `npm install`)
- Your branch must contain the latest `origin/main`. If blocked: `git fetch origin && git merge origin/main`,
  resolve conflicts, re-run tests, push again. Re-merge whenever main moves.
- Test files you add must match `apps/<app>/tests/<unit|integration|e2e>/<module>/<file>`, and no test file may live
  outside a `tests/` folder.
- Run lint and the app's tests before pushing. CI (`API CI`, `Web CI`) must pass and the branch must be up to date to merge.
- Emergency bypass: `git push --no-verify` (use rarely; CI still enforces checks).
