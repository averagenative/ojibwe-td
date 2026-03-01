#!/usr/bin/env bash
# check.sh — run the full quality gate manually
# Same as what pre-commit runs. Use before committing or starting a session.

set -euo pipefail

cd "$(dirname "$0")"

echo "── Ojibwe TD Quality Gate ─────────────────"

echo "▶ typecheck..."
npm run typecheck && echo "  ✔ typecheck"

echo "▶ lint..."
npm run lint && echo "  ✔ lint"

echo "▶ tests..."
npm run test && echo "  ✔ tests"

echo "── All passed ✔ ───────────────────────────"
