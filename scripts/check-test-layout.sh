#!/usr/bin/env sh
# Fails if any tracked test file is outside apps/<app>/tests/<unit|integration|e2e>/<module>/.
# Used by Web CI on every PR. Run locally from anywhere: sh scripts/check-test-layout.sh
# Rules: docs/sdlc/testing-guidelines.md
set -eu
cd "$(dirname "$0")/.."

bad=$(git ls-files 'apps' |
  grep -E '\.(test|spec)\.[jt]sx?$' |
  grep -Ev '^apps/[^/]+/tests/(unit|integration|e2e)/[^/]+/[^/]+$' || true)

if [ -n "$bad" ]; then
  echo "Test files must live in apps/<app>/tests/<unit|integration|e2e>/<module>/:" >&2
  echo "$bad" | sed 's/^/  /' >&2
  echo "See docs/sdlc/testing-guidelines.md." >&2
  exit 1
fi
echo "Test layout OK: $(git ls-files 'apps' | grep -cE '\.(test|spec)\.[jt]sx?$') test files, all in tests/<level>/<module>/."
