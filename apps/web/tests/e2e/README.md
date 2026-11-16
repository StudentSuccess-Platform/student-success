# Browser (end-to-end) tests

Playwright drives a real browser against the real web app, API and database.
Layout follows `docs/sdlc/testing-guidelines.md`: `tests/e2e/<module>/<name>.spec.js`, shared helpers in `tests/e2e/helpers/` (`auth.js`: seeded account logins, `signIn`, `signOut`; `api.js`: API login and unique titles; `teacher.js`: teacher UI navigation).
Modules: `auth`, `teacher`, `student`, `access`. Unit tests (Vitest) live in `tests/unit/` and never run these files.

## Run
1. `docker compose up -d mongo`, then `cd apps/api && npm run db:reset` (the specs rely on the seeded accounts).
2. Start the API (`cd apps/api && npm run dev`, port 3000) and the web app (`cd apps/web && npm run dev`, port 5173).
3. `cd apps/web && npm run test:e2e` (or `npm run test:e2e -- tests/e2e/auth` for one module).

The browser is your installed Edge. Use Chrome with `PLAYWRIGHT_CHANNEL=chrome`, or a downloaded Chromium with
`npx playwright install chromium` and `PLAYWRIGHT_CHANNEL=` (empty). Other URLs: `E2E_BASE_URL`, `E2E_API_URL`.

Notes: the register test creates one `e2e.parent.<time>@example.test` user per run in the dev database
(`npm run db:reset` clears them). The `Browser E2E` job in `.github/workflows/web-ci.yml` runs them on every PR; locally they need a seeded database and both servers.
Failures keep a trace and screenshot in `test-results/` (git-ignored).

Data rule: `student-portal.spec.js` reads Judson Greenfelder's own numbers and expects no approved support plan, so specs that write records or publish plans use Blake Rowe (login derived in `helpers/api.js`). A database that already has Judson's writes needs `npm run db:reset` before that spec passes.
Roster tests: Carley and Sammie share the same 24 students (different classes); Cheyenne (`cheyenne.gutmann.5`) teaches one class, so the 'cannot open a student not on their roster' test uses her.
