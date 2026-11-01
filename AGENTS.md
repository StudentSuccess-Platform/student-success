# AGENTS.md - StudentSuccess local setup and contributor guide

Read this first. Keep answers short. Project memory: `docs/ai/project-memory.md`. Prompt config: `docs/ai/setup-agent.yaml`.
You are helping a human set up and run StudentSuccess on their own machine. Run commands for them when you can;
when software is missing, tell the human exactly what to download and wait.

> **DO NOT PUSH!! PUSH ON MY COMMAND!!**
> Never run `git push` (or open, merge or update a PR) unless the human explicitly tells you to in this session.
> Commit locally, say what is ready, and wait. The human coordinates when pushes happen so teammates do not collide.
> A past "ok" does not carry over: ask again for each push.

## 1. Check prerequisites (stop and tell the human if any is missing)
| Tool | Need | Check | Download |
|---|---|---|---|
| Git | any | `git --version` | https://git-scm.com/downloads |
| Node.js | 22.13+ (npm 10+) | `node -v` | https://nodejs.org |
| Docker Desktop | running | `docker info` | https://www.docker.com/products/docker-desktop |
| GitHub CLI (optional) | any | `gh --version` | https://cli.github.com |
Windows: if Docker says access denied, add the user to the `docker-users` group, sign out and back in.
If PowerShell blocks npm scripts: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## 2. Get the code
`git clone https://github.com/StudentSuccess-Platform/student-success.git` then `cd student-success`.
"Repository not found" or 403: wrong cached GitHub login. Clear `git:https://github.com` in Windows Credential Manager, retry.

## 3. Configure
```
npm install
cp apps/api/.env.example apps/api/.env      # works as-is for local dev; never commit .env
cp apps/web/.env.example apps/web/.env      # VITE_API_URL=http://localhost:3000
```
`JWT_SECRET` in `apps/api/.env` must be non-empty (login fails without it).

## 4. Database
`docker compose up -d mongo`, then `cd apps/api && npm run db:reset` (seeds synthetic data, wipes local seed data).
Seeded users all use password `Password123!`, e.g. teacher `carley.beer.2@example.test`,
student `judson.greenfelder.6@example.test`, parent `lorena.schneider.30@example.test`.

## 5. Run (two terminals)
- API: `cd apps/api && npm run dev` -> http://localhost:3000 (`/api/v1/health` should say `database: connected`)
- Web: `cd apps/web && npm run dev` -> http://localhost:5173

## 6. Verify
`cd apps/api && npm test` and `npm run lint`; `cd apps/web && npm run test:run` and `npm run lint`.

## Troubleshooting
- `database: disconnected`: Docker not running, or mongo not started; restart the API after mongo is healthy.
- Port in use (3000, 5173, 27017): stop the other process.
- `EACCES`/`EPERM` on install: clone into your own user folder, not Program Files or a synced folder.
- Login fails with 500: `JWT_SECRET` empty. Login says invalid: DB not seeded.

## Repo rules
- Branch `SCRUM-<n>-short-title`, commits `SCRUM-<n> Message`, open a PR to `main`. No direct pushes to `main`
  (ruleset requires a PR, `API CI`, `Web CI`, and an up-to-date branch).
- `npm install` enables `.githooks/pre-push`: it blocks pushing a branch that is behind `origin/main` or that adds
  a test file in the wrong place. Merge `origin/main` into your branch, re-test, push.
- Layout: `apps/api` (Express, Mongoose), `apps/web` (React, Vite), `docs/`, `packages/shared`.
- Tests: follow `docs/sdlc/testing-guidelines.md` (tests/<level>/<module>/, never loose in a folder). Add tests with every change.
- Never commit secrets or real student data. Authorization is enforced by the API, not the UI.
- Keep project memory current: follow the protocol below. Keep every file here under 100 lines.

## Paths and naming (so everything works on every teammate's machine)
- Use repo-relative paths with forward slashes everywhere: code, docs, tests, configs, memory
  (`apps/api/src/app.js`, `docs/ai/project-memory.md`). Never a drive or user path (`C:`, `/Users/...`, `/home/...`, `~`).
- Scripts and tests locate files from the repo root (`import.meta.url`, `git rev-parse --show-toplevel`), never a fixed path.
- Branch: `SCRUM-<n>-kebab-title` (lowercase, key from Jira). Commit and PR title: `SCRUM-<n> Short title`
  (uppercase `SCRUM-` and a hyphen: `Scrum 21` or `(In-Progress)` breaks the Jira link). No Jira key yet? Ask the human.

## Project memory protocol (required for every agent)
Memory file: `docs/ai/project-memory.md`. It is the shared source of truth for requirements, decisions and status,
so every teammate's agent stays aligned on functionality and implementation.
1. Read it before starting work, and again before opening a PR (other PRs may have changed it).
2. Update it in the SAME PR as the change when you: add/change/remove an endpoint, route, role, data model or env var;
   make a decision or change a requirement; change a convention, port, tool or workflow; finish or discover open work.
3. Format: one short line per fact under the right section, with an ISO date for decisions. Name endpoints and files.
   Edit or delete stale lines instead of appending contradictions. Move finished items out of "Open work".
4. Budget: the file stays under 100 lines. If it is full, merge or drop the least useful lines first.
5. Never store secrets, tokens, real student data or personal details. Seeded demo accounts are fine.
6. Merge conflicts: keep both teammates' facts, prefer the newer date, remove true duplicates.
7. Tell the human what you changed in memory (one line in the PR description under "Memory").
