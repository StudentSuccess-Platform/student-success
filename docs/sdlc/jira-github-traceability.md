# Jira <-> GitHub Traceability

Tracks SCRUM-8, "Integrate Jira with GitHub for Development Traceability."

## Decision: naming-convention traceability, not the Jira Cloud GitHub App

StudentSuccess links Jira work to GitHub activity through a **naming convention**
(Jira key in branch names, commit messages, and PR titles), not through Atlassian's
Jira Cloud GitHub App / smart commits.

This is a deliberate choice, not a gap:

- The Jira Cloud GitHub App requires connecting a paid Jira Cloud site to the
  repository and granting it GitHub access; this project runs on a free Jira
  plan and a small private repo, so that integration is out of reach.
- A convention needs no third-party app, no OAuth grant, and no ongoing
  administration - it works identically whether the repo is public or private
  and regardless of Jira plan tier.
- It gives the same practical outcome the story asks for (trace a Jira item to
  its branch, commits, and PR) using tools every contributor already has:
  `git log`, GitHub search, and the PR template.

If the team later moves to a paid Jira Cloud plan, the GitHub App can be layered
on top of this convention without changing it - branch/commit/PR names already
carry the Jira key the app would index.

## The convention

| Artifact | Format | Example |
|---|---|---|
| Branch | `SCRUM-<n>-<kebab-title>` | `SCRUM-10-establish-node-js-and-express-backend-foundation` |
| Commit message | `SCRUM-<n> Short title` | `SCRUM-10 Establish Node.js and Express Backend Foundation` |
| Pull request title | `SCRUM-<n> Short title` | same pattern as commits |

This is already in active use - not aspirational. From `git log --oneline`:

```
8ac21e9 SCRUM-10 Establish Node.js and Express Backend Foundation
f3b6b69 SCRUM-13 Establish CI/CD and local development infrastructure
4e73e47 Scrum 11 database architecture and seed data (#3)
```

and from the branch list:

```
SCRUM-11-database-architecture-and-seed-data
SCRUM-13-establish-ci-cd-and-local-development-infrastructure (origin)
SCRUM-62-set-up-backend-automated-testing-and-code-coverage
SCRUM-99-begin-login-and-authentication-interface
SCRUM-100-build-forgot-password-page
```

### PR template enforcement

`.github/pull_request_template.md` requires the Jira key up front and makes
the convention a reviewable checklist item rather than an unenforced habit:

```markdown
## Jira
SCRUM-

## Checklist
- [ ] Branch and commits reference the Jira key
- [ ] `API CI` / `Web CI` checks pass
- [ ] Tests added or updated
- [ ] No secrets or real student data committed
- [ ] Docs updated if setup, env vars or workflow changed
```

A reviewer can reject a PR that leaves `## Jira` blank or whose branch/commits
don't carry a Jira key, the same way a missing test or an unreviewed CI
failure would block merge.

## What this does and doesn't give you

Given:

- A Jira issue can be traced to its branch, commits, and pull request by key.
- Traceability works without any GitHub App install, without a paid Jira
  plan, and without per-repository OAuth configuration.
- The convention is documented (README "Git Development Workflow" section,
  the PR template, and this file) so it's understood as intentional rather
  than discovered by accident.

Not given (out of scope while on the free Jira plan):

- Jira does not automatically display linked commits/branches/PRs on the
  issue itself (that view is what the paid GitHub App provides).
- No automatic Jira status transitions from commit/PR/merge events (smart
  commits are also part of the paid integration).

Tracing stays a one-directional lookup - GitHub to Jira key, or Jira key to
GitHub - performed manually with the tools below, rather than a live link
surfaced inside the Jira UI.

## How to trace a ticket

**From a Jira key to its GitHub activity:**

```bash
# All commits referencing SCRUM-10, across all branches
git log --all --oneline --grep="SCRUM-10"
```

Or in the GitHub UI: search the repository for `SCRUM-10` (Code or Commits
search) to find matching branches, commits, and pull requests, or filter the
branch list for `SCRUM-10-*`.

**From a branch/commit/PR to its Jira ticket:**

The Jira key is the leading token, e.g. branch `SCRUM-13-establish-ci-cd-and-local-development-infrastructure`
or commit `SCRUM-13 Establish CI/CD and local development infrastructure` both
point to `SCRUM-13` in Jira - open `https://<your-site>.atlassian.net/browse/SCRUM-13`
directly, or check the PR's `## Jira` field, which the template requires to be
filled in before merge.

## Related docs

- [README.md](../../README.md) - "Git Development Workflow" section defines
  the same branch/commit/PR conventions at a project-overview level.
- [docs/sdlc/ci-cd.md](ci-cd.md) - CI/CD pipeline that runs against every PR,
  including PRs opened under this convention.
