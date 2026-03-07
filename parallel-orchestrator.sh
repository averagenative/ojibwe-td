#!/usr/bin/env bash
# parallel-orchestrator.sh
#
# Runs multiple tasks through the implement → review pipeline simultaneously,
# each in an isolated git worktree. Ship (commit + push) is serialised to
# avoid merge conflicts on main.
#
# Usage:
#   ./parallel-orchestrator.sh                        # auto-pick next N pending tasks, loop until queue empty
#   ./parallel-orchestrator.sh -n 3                   # run 3 tasks in parallel (default: 2)
#   ./parallel-orchestrator.sh -t task1.md -t task2.md  # run specific tasks (first batch only, then auto-pick)
#   ./parallel-orchestrator.sh --resume               # clean up stale worktrees and re-run stuck tasks
#
# Control (while running):
#   touch .orch_pause                                 # pause after current batch finishes
#   rm .orch_pause                                    # resume from pause
#   touch .orch_stop                                  # stop after current batch (clean exit)
#   Ctrl+C / SIGTERM                                  # graceful shutdown after current batch
#
# Requirements:
#   • git worktree support (git ≥ 2.5)
#   • claude CLI on PATH

set -euo pipefail

# ── Platform detection ────────────────────────────────────────────────────────

IS_MACOS=false
[[ "$(uname)" == "Darwin" ]] && IS_MACOS=true

# ── Configuration ──────────────────────────────────────────────────────────────

if $IS_MACOS; then
  REPO_DIR="/Users/dmichael/projects/ojibwe-td"
else
  REPO_DIR="/home/dmichael/projects/greentd"
fi
GAME_DIR="$REPO_DIR/game"
TASKS_DIR="$REPO_DIR/tasks"
WORKTREES_DIR="$REPO_DIR/.worktrees"

DEFAULT_MODEL="sonnet"
REVIEW_MODEL="opus"
MAX_RETRIES=8
RETRY_DELAY=90
QUOTA_WAIT=1800         # seconds to wait after quota/billing exhaustion (30 min)
QUOTA_MAX_WAIT=48       # max quota-wait cycles before giving up (~24 h)
PARALLEL_LIMIT=2         # max simultaneous implement+review workers
API_COOLDOWN=300           # seconds to wait when API appears down (5 min)
MAX_CONSECUTIVE_FAILS=3    # all-fail batches before entering cooldown
BASELINE_TEST_FAILURES=0   # known pre-existing test failures (update when fixing old tests)

PARALLEL_STATE_FILE="$REPO_DIR/.orch_parallel_state"
PAUSE_FILE="$REPO_DIR/.orch_pause"
STOP_FILE="$REPO_DIR/.orch_stop"

# ── Graceful shutdown ─────────────────────────────────────────────────────────
# SIGINT/SIGTERM: finish the current batch, then stop after shipping.
SHUTDOWN_REQUESTED=false

# Cleanup on exit: reset in-progress tasks and remove stale worktrees/branches
_cleanup_on_exit() {
  # Reset in-progress tasks to pending
  local count=0
  while IFS= read -r f; do
    if $IS_MACOS; then
      sed -i '' 's/^status: in-progress$/status: pending/' "$f"
    else
      sed -i 's/^status: in-progress$/status: pending/' "$f"
    fi
    count=$((count + 1))
  done < <(find "$REPO_DIR/tasks" -name "*.md" -not -path "*/done/*" -not -path "*/health/*" \
    -exec grep -l "^status: in-progress$" {} \; 2>/dev/null)
  [ "$count" -gt 0 ] && log "Reset $count stale in-progress task(s) to pending on exit."

  # Remove worktrees created by this orchestrator run
  local wt_count=0
  while IFS= read -r wt; do
    git worktree remove --force "$wt" 2>/dev/null && wt_count=$((wt_count + 1))
  done < <(git worktree list --porcelain 2>/dev/null | grep "^worktree " | grep "\.worktrees/" | sed 's/^worktree //')
  git worktree prune 2>/dev/null
  [ "$wt_count" -gt 0 ] && log "Cleaned up $wt_count stale worktree(s) on exit."
}

trap 'SHUTDOWN_REQUESTED=true; log "Shutdown requested — finishing current batch…"' INT TERM
trap '_cleanup_on_exit' EXIT

# ── Logging ────────────────────────────────────────────────────────────────────

log()    { echo "[porch $(date +%H:%M:%S)] $*"; }
log_w()  { echo "[porch $(date +%H:%M:%S)] [$1] $*" | sed "s/\[$1\] \[$1\]/[$1]/"; }
die()    { log "ERROR: $*"; exit 1; }
hr()     { echo ""; log "────────────────────────────────────────"; }

# ── Model selection ────────────────────────────────────────────────────────────

task_model() {
  local task_file="$1"
  local combined
  combined="$(basename "$task_file" .md) $(grep "^title:" "$task_file" 2>/dev/null | head -1 || true) $(grep "^creative:" "$task_file" 2>/dev/null | head -1 || true)"
  if echo "$combined" | grep -qiE 'story|lore|vignette|narrative|commander|character|codex|act[- ][0-9]|region|cultural|creative:\s*true|terrain|landscape'; then
    echo "opus"
  else
    echo "$DEFAULT_MODEL"
  fi
}

# ── Remote sync ────────────────────────────────────────────────────────────────
#
# Pull collaborator commits before creating worktrees.  Worktrees branch from
# HEAD, so syncing here means every worker starts from the latest shared state.
# Non-fatal: logs and continues with local state if the pull fails.

sync_with_remote() {
  log "Syncing with remote…"
  local out
  if ! out=$(git -C "$REPO_DIR" fetch origin 2>&1); then
    log "WARNING: git fetch failed — working with local state."
    return 0
  fi

  local behind
  behind=$(git -C "$REPO_DIR" rev-list HEAD..origin/main --count 2>/dev/null || echo 0)

  if [ "$behind" -eq 0 ]; then
    log "Remote: already up to date."
    return 0
  fi

  log "Remote: $behind new commit(s) — pulling…"
  if ! out=$(git -C "$REPO_DIR" pull --rebase origin main 2>&1); then
    log "WARNING: git pull --rebase failed — manual rebase may be needed."
    log "$out"
    return 0
  fi
  echo "$out" | sed 's/^/  /'
  log "Remote: sync complete."
}

# ── Task helpers ───────────────────────────────────────────────────────────────

find_pending_tasks() {
  local limit="$1"
  local count=0
  local dirs=("$TASKS_DIR/backend/pending" "$TASKS_DIR/frontend/pending")
  # Sort by priority: critical(0) > high(1) > medium(2) > low(3) > unset(4)
  local tmp_ranked
  tmp_ranked=$(mktemp)
  for dir in "${dirs[@]}"; do
    [ -d "$dir" ] || continue
    while IFS= read -r -d '' f; do
      if grep -q "^status: pending$" "$f" 2>/dev/null; then
        pri=$(grep "^priority:" "$f" 2>/dev/null | head -1 | awk '{print $2}') || pri=""
        local rank=4
        if   [ "$pri" = "critical" ]; then rank=0
        elif [ "$pri" = "high" ];     then rank=1
        elif [ "$pri" = "medium" ];   then rank=2
        elif [ "$pri" = "low" ];      then rank=3
        fi
        echo "${rank}|${f}" >> "$tmp_ranked"
      fi
    done < <(find "$dir" -maxdepth 1 -name "*.md" -print0)
  done
  while IFS='|' read -r _rank f; do
    echo "$f"
    count=$(( count + 1 ))
    [ "$count" -ge "$limit" ] && break
  done < <(sort "$tmp_ranked")
  rm -f "$tmp_ranked"
}

claim_task() {
  if $IS_MACOS; then
    sed -i '' 's/^status: pending$/status: in-progress/' "$1"
  else
    sed -i 's/^status: pending$/status: in-progress/' "$1"
  fi
}

get_title() {
  grep "^title:" "$1" | sed 's/^title:[[:space:]]*//' | head -1
}

done_path_for() {
  echo "$1" | sed 's|/pending/|/done/|'
}

# ── run_agent (worktree-aware) ─────────────────────────────────────────────────

run_agent() {
  local label="$1"
  local base_prompt="$2"
  local work_dir="$3"
  local model="$4"
  local log_prefix="$5"   # e.g. "task-slug" for per-worker log lines
  local attempt=0
  local quota_waits=0
  local prompt="$base_prompt"

  while [ $attempt -lt "$MAX_RETRIES" ]; do
    attempt=$(( attempt + 1 ))
    log "[$log_prefix] $label — attempt $attempt/$MAX_RETRIES (model: $model)"

    local tmp
    tmp=$(mktemp /tmp/porch_XXXXXX.log)
    local claude_exit=0

    (
      cd "$work_dir"
      unset CLAUDECODE
      claude \
        --dangerously-skip-permissions \
        -p \
        --model "$model" \
        "$prompt"
    ) > "$tmp" 2>&1 || claude_exit=$?

    # Prefix every output line with the worker label
    sed "s/^/[$log_prefix] /" "$tmp"

    if [ $claude_exit -eq 0 ]; then
      rm -f "$tmp"
      log "[$log_prefix] $label — done ✓"
      return 0
    fi

    # ── Tier 1: Quota / billing exhaustion — save state, wait 30 min ───────
    if grep -qiE \
      "credit.*balance|billing|monthly.*limit|usage.*limit|quota.*exceeded|402 |payment.required" \
      "$tmp" 2>/dev/null
    then
      rm -f "$tmp"
      quota_waits=$(( quota_waits + 1 ))
      attempt=$(( attempt - 1 ))  # don't consume a regular retry slot

      log "[$log_prefix] $label — QUOTA EXHAUSTED (wait $quota_waits/$QUOTA_MAX_WAIT)"
      log "[$log_prefix]   State preserved. Resume with:  ./parallel-orchestrator.sh --resume"
      log "[$log_prefix]   Waiting ${QUOTA_WAIT}s (~$(( QUOTA_WAIT / 60 )) min) before retry…"

      if [ "$quota_waits" -ge "$QUOTA_MAX_WAIT" ]; then
        log "[$log_prefix] $label — quota still exhausted after $QUOTA_MAX_WAIT waits — aborting"
        return 1
      fi

      sleep "$QUOTA_WAIT"
      continue
    fi

    # ── Tier 2: Transient rate / context / overload — wait 90 s ────────────
    if grep -qiE \
      "context.*(length|window|limit|exceeded)|too many tokens|token.*limit|rate.limit|overloaded|529|request.*too large|maximum.*context|prompt.*too long" \
      "$tmp" 2>/dev/null
    then
      log "[$log_prefix] $label — transient limit; waiting ${RETRY_DELAY}s…"
      rm -f "$tmp"
      sleep "$RETRY_DELAY"
      prompt="$(printf '[RESUME] Previous attempt hit a limit. Check current state and continue.\n\n%s' "$base_prompt")"
      continue
    fi

    # ── Tier 3: API connectivity / server errors — wait and retry ──────────
    if grep -qiE \
      "ECONNREFUSED|ECONNRESET|ETIMEDOUT|EHOSTUNREACH|ENOTFOUND|socket hang up|fetch failed|network error|500 |502 |503 |504 |internal server error|service unavailable|bad gateway|gateway timeout|api.*error|connection.*refused|connection.*reset|unable to connect" \
      "$tmp" 2>/dev/null
    then
      log "[$log_prefix] $label — API connectivity error; waiting ${RETRY_DELAY}s…"
      rm -f "$tmp"
      sleep "$RETRY_DELAY"
      prompt="$(printf '[RESUME] Previous attempt hit an API error. Check current state and continue.\n\n%s' "$base_prompt")"
      continue
    fi

    rm -f "$tmp"
    log "[$log_prefix] $label — FAILED (exit $claude_exit)"
    return "$claude_exit"
  done

  log "[$log_prefix] $label — max retries exhausted"
  return 1
}

# ── Pre-validate: bash gates before expensive Opus review ─────────────────────
#
# Gate 1: `npm run typecheck` — catches compilation errors.
# Gate 2: `npm run test`      — catches test regressions.
# Returns 0 on success, 1 on failure.  Saves ~60–120 K Opus tokens per
# broken implementation by short-circuiting before the review agent is invoked.

pre_validate() {
  local wt_game="$1"
  local slug="$2"

  # Gate 1: TypeScript compilation
  log "[$slug] Pre-validate: running typecheck (bash gate — no LLM)…"
  local out
  out=$(cd "$wt_game" && npm run typecheck 2>&1) || {
    echo "$out" | sed "s/^/[$slug] [typecheck] /"
    log "[$slug] Pre-validate: typecheck FAILED — skipping Opus review to save tokens"
    log "[$slug]   Fix TypeScript errors in the implement agent before re-running."
    return 1
  }
  log "[$slug] Pre-validate: typecheck passed ✓"

  # Gate 2: Test suite — compare against baseline failure count (not zero)
  log "[$slug] Pre-validate: running test suite (bash gate — no LLM)…"
  out=$(cd "$wt_game" && npm run test 2>&1)
  local test_exit=$?

  local fail_count
  fail_count=$(echo "$out" | sed 's/\x1b\[[0-9;]*m//g' | grep -oE '[0-9]+ failed' | head -1 | awk '{print $1}')
  fail_count=${fail_count:-0}

  local baseline_failures=${BASELINE_TEST_FAILURES:-0}

  if [ "$test_exit" -eq 0 ]; then
    log "[$slug] Pre-validate: tests passed ✓  (Opus review will proceed)"
    return 0
  elif [ "$fail_count" -le "$baseline_failures" ]; then
    log "[$slug] Pre-validate: $fail_count failure(s) ≤ baseline ($baseline_failures) — PASS ✓"
    return 0
  else
    local new_failures=$((fail_count - baseline_failures))
    echo "$out" | sed "s/^/[$slug] [test] /"
    log "[$slug] Pre-validate: $fail_count failure(s), $new_failures NEW above baseline ($baseline_failures)"
    return 1
  fi
}

# ── Worker: implement + review in an isolated worktree ────────────────────────
#
# Called once per task in a subshell (background &).
# Writes its result to a status file so the main process can collect it.

worker() {
  local task_file="$1"
  local status_file="$2"   # parent reads this to know success/failure

  # Workers run in a subshell (via &) and inherit the parent's EXIT/ERR traps.
  # Clear them so worker exit doesn't reset other workers' tasks or remove their worktrees.
  trap - EXIT
  trap 'log "[worker] ERR at line $LINENO (exit $?): $(sed -n "${LINENO}p" "$0" 2>/dev/null || echo "?")"' ERR

  # Disable strict mode inside workers — the parent already handles PENDING status
  # files as failures, so we don't need set -eu to guard against bugs here.
  set +eu

  local slug
  slug=$(basename "$task_file" .md | cut -c1-20)
  local title
  title=$(get_title "$task_file")
  local mdl
  mdl=$(task_model "$task_file")
  local branch="orch/$slug-$$"
  local wt_path="$WORKTREES_DIR/$slug-$$"
  local wt_game="$wt_path/game"

  log "[$slug] Starting  task: $title"
  log "[$slug] Branch   : $branch"
  log "[$slug] Worktree : $wt_path"

  # Clean up stale branch/worktree from a previous failed run
  if git -C "$REPO_DIR" rev-parse --verify "$branch" &>/dev/null; then
    git -C "$REPO_DIR" worktree remove --force "$wt_path" 2>/dev/null || true
    git -C "$REPO_DIR" worktree prune 2>/dev/null
    git -C "$REPO_DIR" branch -D "$branch" 2>/dev/null || true
  fi

  # Create isolated worktree on a fresh branch
  git -C "$REPO_DIR" worktree add -b "$branch" "$wt_path" HEAD \
    2>&1 | sed "s/^/[$slug] /"

  # Copy node_modules symlink so npm commands work without reinstalling
  if [ -d "$GAME_DIR/node_modules" ]; then
    ln -sfn "$GAME_DIR/node_modules" "$wt_game/node_modules"
  fi

  state_write "$task_file" "claimed" "$wt_path" "$branch"
  state_write "$task_file" "implementing" "$wt_path" "$branch"
  show_worker_status

  # ── Agent 1: Implement ──────────────────────────────────────────────────────
  run_agent "implement" \
"You are implementing a feature for Ojibwe TD — a Phaser 3 + TypeScript tower-defense game.

REPO ROOT : $wt_path
GAME SRC  : $wt_game/src
TASK FILE : $task_file

NOTE: You are working in an ISOLATED git worktree ($wt_path).
The main branch is unaffected. Edit files freely.

Steps
─────
1. Read $task_file — understand every acceptance criterion.
2. Read existing source files in $wt_game/src/ to understand patterns.
3. Implement EVERY criterion. Do not skip or defer any.
4. Run: cd $wt_game && npm run typecheck — fix ALL errors.
5. Do NOT commit. Implementation only." \
    "$wt_game" "$mdl" "$slug" || { state_write "$task_file" "failed" "$wt_path" "$branch"; echo "FAIL" > "$status_file"; cleanup_worker "$wt_path" "$branch"; return 1; }

  state_write "$task_file" "implement_done" "$wt_path" "$branch"
  show_worker_status

  # ── Bash gate: typecheck + tests before invoking Opus ────────────────────────
  # If pre-validate fails, run a fix-up agent to repair, then re-check.
  # Up to 3 fix-up attempts before giving up.
  local fix_attempts=0
  local max_fix=3
  while ! pre_validate "$wt_game" "$slug"; do
    fix_attempts=$(( fix_attempts + 1 ))
    if [ "$fix_attempts" -gt "$max_fix" ]; then
      log "[$slug] Pre-validate still failing after $max_fix fix-up attempts — giving up."
      state_write "$task_file" "failed" "$wt_path" "$branch"
      echo "FAIL" > "$status_file"
      cleanup_worker "$wt_path" "$branch"
      return 1
    fi

    log "[$slug] === FIX-UP AGENT (attempt $fix_attempts/$max_fix) ==="

    local fix_errors
    fix_errors=$(cd "$wt_game" && npm run typecheck 2>&1 | sed 's/\x1b\[[0-9;]*m//g' || true)
    local test_errors
    test_errors=$(cd "$wt_game" && npm run test 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tail -60 || true)

    local current_fails
    current_fails=$(echo "$test_errors" | grep -oE '[0-9]+ failed' | head -1 | awk '{print $1}')
    current_fails=${current_fails:-0}
    local new_above=$((current_fails - BASELINE_TEST_FAILURES))
    [ "$new_above" -lt 0 ] && new_above=0

    run_agent "fix-up" \
"You are fixing broken tests/types in Ojibwe TD after a feature implementation.

REPO ROOT : $wt_path
GAME SRC  : $wt_game/src
TASK FILE : $task_file

The implementation is done, but typecheck or tests are failing.
IMPORTANT: There are $BASELINE_TEST_FAILURES known pre-existing test failures.
You need to fix the $new_above NEW failure(s) introduced by this implementation.

TypeScript errors (if any):
$fix_errors

Test failures (last 60 lines):
$test_errors

Steps
─────
1. Read the task file to understand what was implemented.
2. Examine the current git diff: git -C $wt_path diff
3. Fix typecheck errors and NEW test regressions.
   - Do NOT delete or skip existing tests — fix them.
   - Pre-existing failures (≤$BASELINE_TEST_FAILURES) are acceptable.
4. Run: cd $wt_game && npm run typecheck   — must exit 0
5. Run: cd $wt_game && npm run test        — aim for ≤$BASELINE_TEST_FAILURES failures
6. Do NOT commit anything." \
      "$wt_game" "$mdl" "$slug" || true
  done

  state_write "$task_file" "reviewing" "$wt_path" "$branch"

  # ── Agent 2: Review (Opus) ──────────────────────────────────────────────────
  run_agent "review" \
"You are a senior code reviewer for Ojibwe TD (Phaser 3 + TypeScript).
You are running as the Opus model and are the final quality gate before merge.

REPO ROOT       : $wt_path
GAME SRC        : $wt_game/src
TASK FILE       : $task_file
REVIEW CHECKLIST: $REPO_DIR/docs/review-checklist.md
ROADMAP         : $REPO_DIR/docs/ROADMAP.md

Steps
─────
1. Read $task_file — every acceptance criterion.
2. Read $REPO_DIR/docs/review-checklist.md.
3. git -C $wt_path diff   — examine every changed file.
4. Work through EVERY checklist section. Fix failures. Mark each section resolved.
5. Write Vitest unit tests in $wt_game/src/systems/__tests__/ — happy path, boundaries, errors.
6. cd $wt_game && npm run typecheck   — must exit 0.
7. cd $wt_game && npm run test        — fix ALL failures.
8. Append non-blocking findings to $REPO_DIR/docs/ROADMAP.md.
9. Do NOT commit." \
    "$wt_game" "$REVIEW_MODEL" "$slug" || { state_write "$task_file" "failed" "$wt_path" "$branch"; echo "FAIL" > "$status_file"; cleanup_worker "$wt_path" "$branch"; return 1; }

  state_write "$task_file" "review_done" "$wt_path" "$branch"
  show_worker_status

  # Signal success — main process will handle ship
  echo "OK:${wt_path}:${branch}:${task_file}" > "$status_file"
  log "[$slug] implement+review complete — ready to ship"
}

cleanup_worker() {
  local wt_path="$1" branch="$2"
  git -C "$REPO_DIR" worktree remove --force "$wt_path" 2>/dev/null || true
  git -C "$REPO_DIR" branch -D "$branch" 2>/dev/null || true
}

# ── Ship: serialised merge + commit + push ─────────────────────────────────────
# Pure bash — no AI agent needed. Deterministic git operations only.

ship_task() {
  local wt_path="$1"
  local branch="$2"
  local task_file="$3"
  local title done_path slug

  title=$(get_title "$task_file")
  done_path=$(done_path_for "$task_file")
  slug="ship-$(basename "$task_file" .md | cut -c1-15)"

  hr
  log "=== SHIP: $title ==="
  hr

  state_write "$task_file" "shipping" "$wt_path" "$branch"
  show_worker_status

  # 1. Commit all implementation changes in the worktree
  log "[$slug] Committing worktree changes…"
  git -C "$wt_path" add -A
  if ! git -C "$wt_path" diff --cached --quiet; then
    git -C "$wt_path" commit -m "$(cat <<EOF
feat: $title

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
    log "[$slug] Worktree committed ✓"
  else
    log "[$slug] No changes to commit in worktree (unexpected)"
  fi

  # 2. Merge worktree branch into main (before moving task file,
  #    so a merge conflict doesn't leave the file in the wrong place)
  log "[$slug] Merging $branch into main…"
  git -C "$REPO_DIR" checkout main 2>&1 | sed "s/^/[$slug] /"
  git -C "$REPO_DIR" merge --no-ff "$branch" -m "Merge branch '$branch'" \
    2>&1 | sed "s/^/[$slug] /"

  # Handle merge conflicts — abort and preserve worktree for manual resolution
  if [ $? -ne 0 ]; then
    log "[$slug] MERGE CONFLICT — aborting merge, preserving worktree for manual fix"
    git -C "$REPO_DIR" merge --abort 2>/dev/null || true
    return 1
  fi
  log "[$slug] Merge complete ✓"

  # 3. Mark task done and move file (only after successful merge)
  log "[$slug] Moving task to done…"
  if $IS_MACOS; then
    sed -i '' 's/^status: in-progress$/status: done/' "$task_file"
  else
    sed -i 's/^status: in-progress$/status: done/' "$task_file"
  fi
  mkdir -p "$(dirname "$done_path")"
  mv "$task_file" "$done_path"
  log "[$slug] Task marked done ✓"

  # 4. Commit metadata (task file move) on main
  git -C "$REPO_DIR" add -A
  if ! git -C "$REPO_DIR" diff --cached --quiet; then
    git -C "$REPO_DIR" commit -m "chore: ship metadata for $title"
    log "[$slug] Metadata committed ✓"
  fi

  # 5. Push
  log "[$slug] Pushing to origin…"
  if git -C "$REPO_DIR" push origin main 2>&1 | sed "s/^/[$slug] /"; then
    log "[$slug] Push complete ✓"
  else
    log "[$slug] Push failed — may need manual push"
  fi

  # 6. Clean up worktree and branch
  git -C "$REPO_DIR" worktree remove --force "$wt_path" 2>/dev/null || true
  git -C "$REPO_DIR" branch -D "$branch" 2>/dev/null || true
  log "[$slug] Worktree cleaned up ✓"

  state_write "$task_file" "shipped" "" ""
  show_worker_status

  log "[$slug] === SHIPPED: $title ==="
}

# ── State file helpers ────────────────────────────────────────────────────────
# Records per-task progress so the watchdog and --resume can pick up mid-run.
# Format: one line per task — "task_file|stage|worktree|branch|task_start|phase_start"
# stage: claimed | implementing | implement_done | reviewing | review_done | shipping | shipped | failed
# task_start: epoch when task was first claimed
# phase_start: epoch when current phase began

STATE_LOCKFILE="${PARALLEL_STATE_FILE}.lock"

_state_write_inner() {
  local task_file="$1" stage="$2" wt="${3:-}" branch="${4:-}"
  local now
  now=$(date +%s)

  # Preserve task_start from existing entry, or use now if new
  local task_start="$now"
  if [ -f "$PARALLEL_STATE_FILE" ]; then
    local existing_start
    existing_start=$(grep "^${task_file}|" "$PARALLEL_STATE_FILE" 2>/dev/null | head -1 | cut -d'|' -f5)
    [ -n "$existing_start" ] && task_start="$existing_start"
  fi

  local tmp
  tmp=$(mktemp)
  grep -v "^${task_file}|" "$PARALLEL_STATE_FILE" 2>/dev/null > "$tmp" || true
  echo "${task_file}|${stage}|${wt}|${branch}|${task_start}|${now}" >> "$tmp"
  mv "$tmp" "$PARALLEL_STATE_FILE"
}

state_write() {
  local attempt max_attempts=10 delay=0.2

  if $IS_MACOS; then
    # macOS lacks flock — use mkdir as an atomic lock
    for (( attempt=1; attempt<=max_attempts; attempt++ )); do
      if mkdir "$STATE_LOCKFILE" 2>/dev/null; then
        _state_write_inner "$@"
        rmdir "$STATE_LOCKFILE" 2>/dev/null
        return 0
      fi
      sleep "$delay"
    done
  else
    for (( attempt=1; attempt<=max_attempts; attempt++ )); do
      if ( flock -n 9 || exit 1
        _state_write_inner "$@"
      ) 9>"$STATE_LOCKFILE"; then
        return 0
      fi
      sleep "$delay"
    done
  fi

  # All retries exhausted — force-write as last resort
  log "WARNING: state_write lock contention after $max_attempts attempts, forcing write"
  _state_write_inner "$@"
  $IS_MACOS && rmdir "$STATE_LOCKFILE" 2>/dev/null || true
}

state_clear() {
  rm -f "$PARALLEL_STATE_FILE"
  log "Parallel state cleared."
}

# ── Status display ───────────────────────────────────────────────────────────
# Pretty-prints the current worker state with timestamps.

fmt_elapsed() {
  local secs="$1"
  if [ "$secs" -ge 3600 ]; then
    printf "%dh %02dm %02ds" $(( secs / 3600 )) $(( (secs % 3600) / 60 )) $(( secs % 60 ))
  elif [ "$secs" -ge 60 ]; then
    printf "%dm %02ds" $(( secs / 60 )) $(( secs % 60 ))
  else
    printf "%ds" "$secs"
  fi
}

stage_emoji() {
  case "$1" in
    claimed)         echo "📋" ;;
    implementing)    echo "🔨" ;;
    implement_done)  echo "✅" ;;
    reviewing)       echo "🔍" ;;
    review_done)     echo "🚢" ;;
    shipping)        echo "📦" ;;
    shipped)         echo "🎉" ;;
    failed)          echo "❌" ;;
    *)               echo "❓" ;;
  esac
}

stage_label() {
  case "$1" in
    claimed)         echo "claimed" ;;
    implementing)    echo "implementing" ;;
    implement_done)  echo "implemented" ;;
    reviewing)       echo "reviewing" ;;
    review_done)     echo "ready to ship" ;;
    shipping)        echo "shipping" ;;
    shipped)         echo "shipped" ;;
    failed)          echo "failed" ;;
    *)               echo "$1" ;;
  esac
}

show_worker_status() {
  [ -f "$PARALLEL_STATE_FILE" ] || return 0
  local now
  now=$(date +%s)

  echo ""
  log "────────────────────────────────────────"
  log "Parallel worker state  $(date '+%Y-%m-%d %H:%M:%S')"
  log "────────────────────────────────────────"

  # IMPORTANT: declare loop variables local so they don't clobber the caller's
  # locals (bash uses dynamic scoping — read without local overwrites caller vars)
  local _sw_task _sw_stage _sw_wt _sw_branch _sw_task_start _sw_phase_start
  while IFS='|' read -r _sw_task _sw_stage _sw_wt _sw_branch _sw_task_start _sw_phase_start; do
    [ -z "$_sw_task" ] && continue
    local slug
    slug=$(basename "$_sw_task" .md)
    local emoji
    emoji=$(stage_emoji "$_sw_stage")
    local label
    label=$(stage_label "$_sw_stage")

    local total_elapsed=0 phase_elapsed=0
    [ -n "$_sw_task_start" ] && [ "$_sw_task_start" -gt 0 ] 2>/dev/null && total_elapsed=$(( now - _sw_task_start ))
    [ -n "$_sw_phase_start" ] && [ "$_sw_phase_start" -gt 0 ] 2>/dev/null && phase_elapsed=$(( now - _sw_phase_start ))

    printf "[porch %s]   %s  %-38s %-16s (total: %s | phase: %s)\n" \
      "$(date +%H:%M:%S)" \
      "$emoji" "$slug" "$label" \
      "$(fmt_elapsed $total_elapsed)" \
      "$(fmt_elapsed $phase_elapsed)"

    # Show changed files if worktree exists
    if [ -n "$_sw_wt" ] && [ -d "$_sw_wt" ]; then
      local file_count changed_files
      changed_files=$(git -C "$_sw_wt" diff --name-only HEAD 2>/dev/null || true)
      if [ -n "$changed_files" ]; then
        file_count=$(echo "$changed_files" | wc -l)
        printf "[porch %s]       %d file(s) changed:\n" "$(date +%H:%M:%S)" "$file_count"
        echo "$changed_files" | while read -r f; do
          printf "[porch %s]         %s\n" "$(date +%H:%M:%S)" "$f"
        done
      fi
    fi
  done < "$PARALLEL_STATE_FILE"
  log "────────────────────────────────────────"
  echo ""
}

# ── Resume: clean up stale worktrees and re-run stuck tasks ──────────────────

do_resume() {
  log "=== Parallel Orchestrator --resume ==="

  # Find tasks stuck in-progress with no running parallel orchestrator
  local stuck=()
  while IFS= read -r f; do
    stuck+=("$f")
  done < <(find "$TASKS_DIR" -name "*.md" -not -path "*/done/*" \
           | xargs grep -l "^status: in-progress" 2>/dev/null || true)

  if [ ${#stuck[@]} -eq 0 ]; then
    log "No stuck tasks found — nothing to resume."
    state_clear
    return
  fi

  log "Found ${#stuck[@]} stuck task(s) — resetting to pending and cleaning worktrees:"
  for t in "${stuck[@]}"; do
    log "  • $t"
    if $IS_MACOS; then
      sed -i '' 's/^status: in-progress$/status: pending/' "$t"
    else
      sed -i 's/^status: in-progress$/status: pending/' "$t"
    fi
  done

  # Clean up any orphaned worktrees
  if [ -d "$WORKTREES_DIR" ]; then
    find "$WORKTREES_DIR" -mindepth 1 -maxdepth 1 -type d | while read -r wt; do
      log "  Removing orphaned worktree: $wt"
      git -C "$REPO_DIR" worktree remove --force "$wt" 2>/dev/null || true
    done
  fi
  git -C "$REPO_DIR" worktree prune 2>/dev/null || true

  # Clean up branches from state file
  if [ -f "$PARALLEL_STATE_FILE" ]; then
    while IFS='|' read -r _task _stage _wt branch; do
      [ -n "$branch" ] && git -C "$REPO_DIR" branch -D "$branch" 2>/dev/null || true
    done < "$PARALLEL_STATE_FILE"
  fi
  state_clear

  log "Reset complete — re-running with ${#stuck[@]} task(s)"
  # Re-run with the stuck tasks as explicit targets
  local args=()
  for t in "${stuck[@]}"; do args+=("-t" "$t"); done
  main "${args[@]}"
}

# ── Main ───────────────────────────────────────────────────────────────────────

main() {
  local parallel=$PARALLEL_LIMIT
  local explicit_tasks=()
  local resume=false

  while [[ $# -gt 0 ]]; do
    case "$1" in
      -n)          parallel="$2"; shift 2 ;;
      -t|--task)   explicit_tasks+=("$2"); shift 2 ;;
      --resume)    resume=true; shift ;;
      *)           die "Unknown arg: $1" ;;
    esac
  done

  if $resume; then
    do_resume
    return
  fi

  hr
  log "=== Parallel Orchestrator starting (workers: $parallel) ==="
  hr

  mkdir -p "$WORKTREES_DIR"

  # ── Continuous loop: keep picking batches until the queue is empty ────────
  local batch_num=0
  local consecutive_fail_batches=0

  while true; do
    batch_num=$(( batch_num + 1 ))

    # Pull collaborator commits before branching worktrees
    sync_with_remote

    # Resolve task list
    local tasks=()
    if [ ${#explicit_tasks[@]} -gt 0 ] && [ "$batch_num" -eq 1 ]; then
      # Explicit tasks only run in the first batch
      tasks=("${explicit_tasks[@]}")
    else
      while IFS= read -r t; do
        tasks+=("$t")
      done < <(find_pending_tasks "$parallel")
    fi

    [ ${#tasks[@]} -gt 0 ] || { log "No pending tasks — queue empty. Done!"; break; }

    hr
    log "=== Batch $batch_num — ${#tasks[@]} task(s) ==="
    hr

    log "Tasks to run (${#tasks[@]}):"
    for t in "${tasks[@]}"; do
      log "  • $(get_title "$t")  [$t]"
    done

    # ── Launch workers in parallel ───────────────────────────────────────────

    local status_files=()
    local pids=()

    for task_file in "${tasks[@]}"; do
      claim_task "$task_file"
      local sf
      sf=$(mktemp /tmp/porch_status_XXXXXX)
      echo "PENDING" > "$sf"
      status_files+=("$sf")

      worker "$task_file" "$sf" &
      pids+=("$!")
      log "Worker PID $! launched for: $(get_title "$task_file")"
    done

    hr
    log "All workers launched — waiting for implement+review to complete…"
    show_worker_status
    hr

    # Wait for all workers
    local all_ok=true
    for i in "${!pids[@]}"; do
      local pid="${pids[$i]}"
      local sf="${status_files[$i]}"
      if wait "$pid"; then
        log "Worker $pid finished."
      else
        log "Worker $pid exited with error."
        all_ok=false
      fi
      cat "$sf" 2>/dev/null || true
    done

    # ── Serialised ship phase ────────────────────────────────────────────────

    hr
    log "=== Batch $batch_num — beginning serialised ship phase ==="
    hr

    for i in "${!status_files[@]}"; do
      local sf="${status_files[$i]}"
      local result
      result=$(cat "$sf" 2>/dev/null || echo "FAIL")
      rm -f "$sf"

      if [[ "$result" != OK:* ]]; then
        log "Skipping ship for task $i — worker reported: $result"
        # Reset the task back to pending so it can be retried
        local failed_task="${tasks[$i]}"
        if [ -f "$failed_task" ]; then
          if $IS_MACOS; then
            sed -i '' 's/^status: in-progress$/status: pending/' "$failed_task"
          else
            sed -i 's/^status: in-progress$/status: pending/' "$failed_task"
          fi
          log "Reset $failed_task to pending for retry."
        fi
        continue
      fi

      # Parse "OK:wt_path:branch:task_file"
      local wt_path branch task_file
      wt_path=$(echo "$result"  | cut -d: -f2)
      branch=$(echo "$result"   | cut -d: -f3)
      task_file=$(echo "$result" | cut -d: -f4)

      ship_task "$wt_path" "$branch" "$task_file" || {
        log "Ship failed for $task_file — resetting to pending."
        if $IS_MACOS; then
          sed -i '' 's/^status: in-progress$/status: pending/' "$task_file" 2>/dev/null
        else
          sed -i 's/^status: in-progress$/status: pending/' "$task_file" 2>/dev/null
        fi
        all_ok=false
      }
    done

    hr
    if $all_ok; then
      log "=== Batch $batch_num complete — all tasks shipped ==="
      state_clear
      consecutive_fail_batches=0
    else
      log "=== Batch $batch_num done with errors — check logs above ==="
      log "Continuing to next batch…"
      state_clear

      # Check if ANY task shipped this batch
      local any_shipped=false
      for task_file in "${tasks[@]}"; do
        local dp
        dp=$(done_path_for "$task_file")
        if [ -f "$dp" ]; then
          any_shipped=true
          break
        fi
      done

      if ! $any_shipped; then
        consecutive_fail_batches=$(( consecutive_fail_batches + 1 ))
        log "WARNING: No tasks shipped in batch $batch_num (consecutive failures: $consecutive_fail_batches/$MAX_CONSECUTIVE_FAILS)"

        if [ "$consecutive_fail_batches" -ge "$MAX_CONSECUTIVE_FAILS" ]; then
          log "=== API appears down — entering cooldown (${API_COOLDOWN}s / $(( API_COOLDOWN / 60 )) min) ==="
          log "Tasks have been reset to pending. Will auto-retry after cooldown."
          log "To stop: touch .orch_stop or Ctrl+C"

          local cooldown_end=$(( $(date +%s) + API_COOLDOWN ))
          while [ "$(date +%s)" -lt "$cooldown_end" ]; do
            if [ -f "$STOP_FILE" ]; then
              rm -f "$STOP_FILE"
              log "Stop file detected during cooldown — exiting."
              break 2  # break out of both loops
            fi
            if $SHUTDOWN_REQUESTED; then
              log "Shutdown during cooldown — exiting."
              break 2
            fi
            sleep 10
          done
          log "Cooldown complete — retrying…"
          # Don't reset consecutive_fail_batches — it will reset on first successful batch
        fi
      else
        consecutive_fail_batches=0
      fi
    fi

    # ── Check for stop/pause/shutdown between batches ───────────────────────

    if $SHUTDOWN_REQUESTED; then
      hr
      log "=== Shutdown requested — stopping after batch $batch_num ==="
      hr
      break
    fi

    if [ -f "$STOP_FILE" ]; then
      rm -f "$STOP_FILE"
      hr
      log "=== Stop file detected — stopping after batch $batch_num ==="
      hr
      break
    fi

    if [ -f "$PAUSE_FILE" ]; then
      hr
      log "=== Paused (touch .orch_pause detected) ==="
      log "Remove .orch_pause to resume, or touch .orch_stop to quit."
      while [ -f "$PAUSE_FILE" ]; do
        # Also check for stop while paused
        if [ -f "$STOP_FILE" ]; then
          rm -f "$STOP_FILE" "$PAUSE_FILE"
          log "Stop file detected while paused — exiting."
          break 2
        fi
        if $SHUTDOWN_REQUESTED; then
          rm -f "$PAUSE_FILE"
          log "Shutdown signal while paused — exiting."
          break 2
        fi
        sleep 10
      done
      log "=== Resumed ==="
      hr
    fi

    # Brief pause between batches to avoid hammering
    sleep 5
  done

  hr
  log "=== Parallel Orchestrator finished ==="
  state_clear
  hr
}

main "$@"
