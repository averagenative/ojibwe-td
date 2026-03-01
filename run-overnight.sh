#!/usr/bin/env bash
# run-overnight.sh
#
# Runs all pending tasks continuously through the night.
# Waits for each batch to finish, checks which tasks are newly unblocked,
# then launches the next parallel batch. Stops when nothing is left to run.
#
# Usage:
#   ./run-overnight.sh          # start immediately (waits for any running orchestrator first)
#   ./run-overnight.sh -n 3     # use 3 parallel workers per batch (default: 2)

set -euo pipefail

REPO_DIR="/home/dmichael/projects/greentd"
TASKS_DIR="$REPO_DIR/tasks"
LOG_DIR="$REPO_DIR/logs"
OVERNIGHT_LOG="$LOG_DIR/overnight-$(date +%Y%m%d-%H%M%S).log"
WORKERS=2
POLL_INTERVAL=30   # seconds between "waiting for orchestrator" checks
LOCK_FILE="/tmp/greentd-overnight.lock"

# ── Args ───────────────────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case "$1" in
    -n) WORKERS="$2"; shift 2 ;;
    *)  echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# ── Lock: only one overnight runner at a time ──────────────────────────────────

exec 9>"$LOCK_FILE"
flock -n 9 || { echo "[overnight] Already running — exiting."; exit 0; }
trap 'flock -u 9; rm -f "$LOCK_FILE"' EXIT

# ── Logging ────────────────────────────────────────────────────────────────────

mkdir -p "$LOG_DIR"
# log() writes to the log file and stdout — do NOT launch with >> redirect or lines double up
log() { local msg="[overnight $(date '+%H:%M:%S')] $*"; echo "$msg"; echo "$msg" >> "$OVERNIGHT_LOG"; }
hr()  { echo "" >> "$OVERNIGHT_LOG"; echo ""; log "────────────────────────────────────────"; }

hr
log "=== Overnight runner starting (workers: $WORKERS) ==="
log "Log: $OVERNIGHT_LOG"
hr

# ── Dependency checker ─────────────────────────────────────────────────────────
# Returns 0 if all depends_on tasks are in a done/ folder, 1 otherwise.

deps_met() {
  local task_file="$1"
  local deps_line
  deps_line=$(grep "^depends_on:" "$task_file" 2>/dev/null || echo "depends_on: []")

  # Extract IDs: depends_on: ["TASK-06", "TASK-07"] → TASK-06 TASK-07
  local dep_ids
  dep_ids=$(echo "$deps_line" \
    | sed 's/depends_on:[[:space:]]*//' \
    | tr -d '[]"'"'" \
    | tr ',' '\n' \
    | xargs)

  [ -z "$dep_ids" ] && return 0

  for dep in $dep_ids; do
    # Check if a done task file has this id
    if ! find "$TASKS_DIR" -path "*/done/*.md" \
         | xargs grep -lF "id: $dep" 2>/dev/null \
         | grep -q .; then
      echo "[overnight] blocked: $(basename "$task_file") waiting on $dep" >&2
      return 1
    fi
  done
  return 0
}

# ── Find tasks that are pending AND have deps met ─────────────────────────────

find_ready() {
  local dirs=("$TASKS_DIR/backend/pending" "$TASKS_DIR/frontend/pending")
  for dir in "${dirs[@]}"; do
    [ -d "$dir" ] || continue
    while IFS= read -r -d '' f; do
      if grep -q "^status: pending$" "$f" 2>/dev/null && deps_met "$f"; then
        echo "$f"
      fi
    done < <(find "$dir" -maxdepth 1 -name "*.md" -print0 | sort -z)
  done
}

# ── Wait for all orchestrators to finish ───────────────────────────────────────

wait_for_orchestrators() {
  while pgrep -f "orchestrator.sh" > /dev/null 2>&1; do
    log "Orchestrator running — waiting ${POLL_INTERVAL}s…"
    sleep "$POLL_INTERVAL"
  done
}

# ── Main loop ──────────────────────────────────────────────────────────────────

batch=0

while true; do
  # Wait for any currently running orchestrator/parallel run to finish
  wait_for_orchestrators

  # Collect ready tasks
  ready=()
  while IFS= read -r t; do
    ready+=("$t")
  done < <(find_ready)

  if [ ${#ready[@]} -eq 0 ]; then
    # Check if anything is still in-progress (might unblock more later)
    in_progress=$(find "$TASKS_DIR" -name "*.md" -not -path "*/done/*" \
      | xargs grep -l "^status: in-progress" 2>/dev/null | wc -l)

    if [ "$in_progress" -gt 0 ]; then
      log "No ready tasks right now but $in_progress still in-progress — waiting…"
      sleep "$POLL_INTERVAL"
      continue
    fi

    hr
    log "=== All tasks complete or blocked — overnight run finished ==="
    log "Check docs/ROADMAP.md and tasks/health/pending/ for any follow-up items."
    hr
    break
  fi

  batch=$(( batch + 1 ))
  hr
  log "=== Batch $batch — ${#ready[@]} task(s) ready ==="
  for t in "${ready[@]}"; do
    log "  • $(grep "^title:" "$t" | sed 's/title:[[:space:]]*//')  [$(basename "$t")]"
  done
  hr

  # Build -t args for up to WORKERS tasks
  args=()
  count=0
  for t in "${ready[@]}"; do
    [ "$count" -ge "$WORKERS" ] && break
    args+=("-t" "$t")
    count=$(( count + 1 ))
  done

  log "Launching parallel orchestrator ($count workers)…"
  # Run inline (blocking) so we wait for the batch to finish before checking next
  bash "$REPO_DIR/parallel-orchestrator.sh" "${args[@]}" 2>&1 | tee -a "$OVERNIGHT_LOG"

  log "Batch $batch complete."
  sleep 5  # brief pause before checking for next batch
done

log "=== Overnight runner exiting ==="
