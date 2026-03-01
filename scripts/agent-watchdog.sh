#!/usr/bin/env bash
# scripts/agent-watchdog.sh
#
# Monitors orchestrator agents for stale/crashed runs and restarts them.
# Designed to run every 5 minutes via cron.
#
# Detects:
#   • Single orchestrator: stale .orch_checkpoint with no running process
#   • Parallel orchestrator: stale .orch_parallel_state with no running process
#   • Tasks stuck in-progress with no orchestrator running at all
#
# Restarts:
#   • Single:   ./orchestrator.sh --resume
#   • Parallel: ./parallel-orchestrator.sh --resume
#
# Cron (every 5 min):
#   */5 * * * * /home/dmichael/projects/greentd/scripts/agent-watchdog.sh \
#               >> /home/dmichael/projects/greentd/logs/watchdog.log 2>&1

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────────

REPO_DIR="/home/dmichael/projects/greentd"
LOG_DIR="$REPO_DIR/logs"
LOCK_FILE="/tmp/greentd-watchdog.lock"

SINGLE_CKPT="$REPO_DIR/.orch_checkpoint"
PARALLEL_STATE="$REPO_DIR/.orch_parallel_state"

# How old a checkpoint must be (seconds) before we consider it stale.
# Generous threshold — Claude API calls can take a while.
STALE_THRESHOLD=900   # 15 minutes

# ── Helpers ────────────────────────────────────────────────────────────────────

log() { echo "[watchdog $(date '+%Y-%m-%d %H:%M:%S')] $*"; }
hr()  { echo ""; log "────────────────────────────────────────"; }

file_age_seconds() {
  local f="$1"
  echo $(( $(date +%s) - $(stat -c %Y "$f") ))
}

is_running() {
  local pattern="$1"
  pgrep -f "$pattern" > /dev/null 2>&1
}

# ── Lock ───────────────────────────────────────────────────────────────────────

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Another watchdog instance is running — exiting."
  exit 0
fi
trap 'flock -u 9; rm -f "$LOCK_FILE"' EXIT

mkdir -p "$LOG_DIR"

hr
log "=== Agent Watchdog ==="
hr

any_action=false

# ── Check 1: Single orchestrator ───────────────────────────────────────────────

if [ -f "$SINGLE_CKPT" ]; then
  if is_running "orchestrator.sh"; then
    log "Single orchestrator: running normally — OK"
  else
    age=$(file_age_seconds "$SINGLE_CKPT")
    log "Single orchestrator: checkpoint found, no process running (age: ${age}s)"

    if [ "$age" -ge "$STALE_THRESHOLD" ]; then
      log "STALE — restarting single orchestrator with --resume"
      bash "$REPO_DIR/orchestrator.sh" --resume >> "$LOG_DIR/orchestrator-watchdog-restart-$(date +%Y%m%d-%H%M%S).log" 2>&1 &
      log "Restart launched (PID $!)"
      any_action=true
    else
      log "Within grace period (${age}s < ${STALE_THRESHOLD}s) — waiting"
    fi
  fi
else
  log "Single orchestrator: no checkpoint — not running"
fi

# ── Check 2: Parallel orchestrator ─────────────────────────────────────────────

if [ -f "$PARALLEL_STATE" ]; then
  if is_running "parallel-orchestrator.sh"; then
    log "Parallel orchestrator: running normally — OK"
  else
    age=$(file_age_seconds "$PARALLEL_STATE")
    log "Parallel orchestrator: state file found, no process running (age: ${age}s)"

    if [ "$age" -ge "$STALE_THRESHOLD" ]; then
      log "STALE — restarting parallel orchestrator with --resume"
      bash "$REPO_DIR/parallel-orchestrator.sh" --resume >> "$LOG_DIR/parallel-watchdog-restart-$(date +%Y%m%d-%H%M%S).log" 2>&1 &
      log "Restart launched (PID $!)"
      any_action=true
    else
      log "Within grace period (${age}s < ${STALE_THRESHOLD}s) — waiting"
    fi
  fi
else
  log "Parallel orchestrator: no state file — not running"
fi

# ── Check 3: Tasks stuck in-progress with no orchestrator ──────────────────────

stuck_tasks=()
while IFS= read -r f; do
  stuck_tasks+=("$f")
done < <(find "$REPO_DIR/tasks" -name "*.md" \
         -not -path "*/done/*" \
         -not -path "*/health/*" \
         | xargs grep -l "^status: in-progress" 2>/dev/null || true)

if [ ${#stuck_tasks[@]} -gt 0 ]; then
  if is_running "orchestrator.sh" || is_running "parallel-orchestrator.sh"; then
    log "Stuck tasks: ${#stuck_tasks[@]} in-progress — orchestrator IS running, likely mid-flight — OK"
  else
    log "WARNING: ${#stuck_tasks[@]} task(s) stuck in-progress with no orchestrator running:"
    for t in "${stuck_tasks[@]}"; do
      log "  • $t"
    done

    # Only auto-restart if we didn't already restart above
    if ! $any_action; then
      # If single checkpoint exists (even if not stale yet) use --resume
      if [ -f "$SINGLE_CKPT" ]; then
        log "Single checkpoint present — restarting with --resume"
        bash "$REPO_DIR/orchestrator.sh" --resume >> "$LOG_DIR/orchestrator-watchdog-restart-$(date +%Y%m%d-%H%M%S).log" 2>&1 &
        log "Restart launched (PID $!)"
        any_action=true
      elif [ -f "$PARALLEL_STATE" ]; then
        log "Parallel state present — restarting with --resume"
        bash "$REPO_DIR/parallel-orchestrator.sh" --resume >> "$LOG_DIR/parallel-watchdog-restart-$(date +%Y%m%d-%H%M%S).log" 2>&1 &
        log "Restart launched (PID $!)"
        any_action=true
      else
        log "No checkpoint to resume from — manual intervention needed."
        log "To reset stuck tasks to pending, run:"
        for t in "${stuck_tasks[@]}"; do
          log "  sed -i 's/^status: in-progress\$/status: pending/' $t"
        done
      fi
    fi
  fi
else
  log "Stuck tasks: none — OK"
fi

# ── Check 4: Orphaned worktrees ────────────────────────────────────────────────

if [ -d "$REPO_DIR/.worktrees" ]; then
  wt_count=$(find "$REPO_DIR/.worktrees" -mindepth 1 -maxdepth 1 -type d | wc -l)
  if [ "$wt_count" -gt 0 ]; then
    if is_running "parallel-orchestrator.sh"; then
      log "Worktrees: $wt_count found — parallel orchestrator running, they're active — OK"
    else
      log "WARNING: $wt_count orphaned worktree(s) with no parallel orchestrator running:"
      find "$REPO_DIR/.worktrees" -mindepth 1 -maxdepth 1 -type d | while read -r wt; do
        log "  • $wt"
      done
      log "Run './parallel-orchestrator.sh --resume' to clean up and retry, or:"
      log "  git -C $REPO_DIR worktree prune"
    fi
  else
    log "Worktrees: none — OK"
  fi
fi

hr
if $any_action; then
  log "=== Watchdog: action taken — check restart logs in $LOG_DIR ==="
else
  log "=== Watchdog: all clear ==="
fi
hr
