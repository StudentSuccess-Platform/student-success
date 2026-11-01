# CI/CD

## Flow
Jira story -> branch `SCRUM-<n>-title` -> commits `SCRUM-<n> Short title` -> push -> PR to `main` -> CI -> review -> merge.

## Workflows
GitHub calls a pipeline a *workflow*, defined in `.github/workflows/`. Mapping from GitLab: `.gitlab-ci.yml` -> workflow files,
pipeline -> workflow run, merge request -> pull request, CI/CD variables -> Secrets and Variables, runners -> runners.

| Workflow | File | Trigger | Runs |
|---|---|---|---|
| API CI (check name `API CI`) | `.github/workflows/api-ci.yml` | every PR to `main` | install, lint, tests (with a MongoDB service), seed and consistency check, server smoke test that requires a database connection |
| Web CI (check name `Web CI`) | `.github/workflows/web-ci.yml` | every PR to `main` | install, lint, test, build; dormant until `apps/web/package-lock.json` exists |
| Deploy | `.github/workflows/deploy.yml` | manual (`workflow_dispatch`) | placeholder, no-op |

### Path strategy
Both CI workflows trigger on every PR and detect relevant changes inside the job.
Native `paths:` filters are avoided: a workflow skipped by `paths:` never reports
its check, so a required check would stay pending and block merging.

- API CI is relevant for changes in `apps/api/`, `packages/shared/`, `infrastructure/`, `docker-compose.yml`, root `package*.json`, and its own workflow.
- Web CI is relevant for `apps/web/`, `packages/shared/`, root `package*.json`, and its own workflow.
- Shared/root changes therefore trigger both.

## Validating workflows locally
Run `sh scripts/lint-workflows.sh` before pushing any change to `.github/workflows/`.
It runs actionlint (syntax, expressions, embedded shell via shellcheck) in Docker, so nothing needs installing.
Use it to verify workflow edits and to debug a failing or misbehaving workflow before a push. It does not execute
the jobs; a real run on a PR is still the final proof.

## Required checks before merge
Configured in GitHub as the ruleset "Pre merge verification" (Settings -> Rules). It targets the default branch (`main`)
and enforces: a pull request is required, `API CI` and `Web CI` must pass, the branch must be up to date with `main`
before merging, and `main` cannot be deleted or force-pushed. There is no bypass list, so it applies to admins too.
Required approvals are currently 0 (authors review and test their own work while the backlog is large); raise
`required_approving_review_count` to 1 once the backlog is down. Failures show on the PR checks tab.

The org is on the GitHub Team plan, so the ruleset is enforced on this private repo. Rules live in repo settings and
cannot be set from code. Check them with `gh api repos/StudentSuccess-Platform/student-success/rulesets`.

Optional local guard: `npm install` points git at `.githooks/`, whose `pre-push` hook blocks pushing a branch that is
behind `origin/main` (bypass once with `git push --no-verify`).

## Secrets
Never committed. `.env` files are gitignored; only `.env.example` is tracked.
Deployment secrets live in GitHub Environments and are referenced only as `secrets.*`.

## CD status
| Item | Status |
|---|---|
| CI for API | Implemented |
| CI for Web | Implemented |
| Deploy workflow | Skeleton only |
| Hosting target for test/demo/production | Undecided (team decision) |
| Branch protection / required checks | Ruleset active on `main` (PR, `API CI`, `Web CI`, up to date; 0 approvals for now) |
| Test PR demonstrating CI | Done: passed (`fb35f07`), failed on an intentional failing test (`4da3215`), passed after revert (`11d4087`) |
| Ruleset enforcement proof | PR #18 (2026-11-01): `API CI` and `Web CI` both passed under the active "Pre merge verification" ruleset before merge to `main` |
