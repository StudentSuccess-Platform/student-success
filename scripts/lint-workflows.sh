#!/usr/bin/env sh
# Lints .github/workflows/*.yml with actionlint (syntax, expressions, shellcheck).
# Uses Docker, so nothing needs installing. Run from anywhere: sh scripts/lint-workflows.sh
set -eu
root="$(cd "$(dirname "$0")/.." && pwd)"
# pwd -W gives a Windows path under Git Bash; plain pwd elsewhere.
mount="$(cd "$root" && (pwd -W 2>/dev/null || pwd))"
MSYS_NO_PATHCONV=1 docker run --rm -v "$mount:/repo" -w /repo rhysd/actionlint:latest -color "$@"
