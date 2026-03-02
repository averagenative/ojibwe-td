#!/usr/bin/env bash
# run-queue.sh — Run the parallel orchestrator in a loop until no pending tasks remain.
# Usage: ./run-queue.sh [-n WORKERS] [--max-batches N]
#
# Picks 2 tasks per batch (by priority), runs implement→review→ship,
# then loops. Stops when no pending tasks are left or max batches reached.

set -euo pipefail
REPO="$(cd "$(dirname "$0")" && pwd)"
WORKERS=2
MAX_BATCHES=6  # safety cap — don't burn unlimited tokens overnight

while [[ $# -gt 0 ]]; do
  case "$1" in
    -n) WORKERS="$2"; shift 2 ;;
    --max-batches) MAX_BATCHES="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

batch=0
while (( batch < MAX_BATCHES )); do
  # Count remaining non-health pending tasks
  remaining=$(find "$REPO/tasks/backend/pending" "$REPO/tasks/frontend/pending" \
    -name "*.md" -exec grep -l "^status: pending$" {} \; 2>/dev/null | wc -l)

  if (( remaining == 0 )); then
    echo "[queue $(date +%H:%M:%S)] No pending tasks remaining. Done!"
    break
  fi

  batch=$((batch + 1))
  echo ""
  echo "[queue $(date +%H:%M:%S)] ══════════════════════════════════════"
  echo "[queue $(date +%H:%M:%S)] Batch $batch/$MAX_BATCHES — $remaining tasks remaining"
  echo "[queue $(date +%H:%M:%S)] ══════════════════════════════════════"
  echo ""

  bash "$REPO/parallel-orchestrator.sh" -n "$WORKERS"
  exit_code=$?

  if (( exit_code != 0 )); then
    echo "[queue $(date +%H:%M:%S)] Orchestrator exited with code $exit_code — stopping queue."
    exit $exit_code
  fi

  # Brief pause between batches to let git settle
  sleep 5
done

echo ""
echo "[queue $(date +%H:%M:%S)] ══════════════════════════════════════"
echo "[queue $(date +%H:%M:%S)] Queue complete. $batch batch(es) ran."
echo "[queue $(date +%H:%M:%S)] ══════════════════════════════════════"
