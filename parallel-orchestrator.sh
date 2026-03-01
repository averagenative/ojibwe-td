#!/usr/bin/env bash
# parallel-orchestrator.sh
#
# Runs multiple tasks through the implement → review pipeline simultaneously,
# each in an isolated git worktree. Ship (commit + push) is serialised to
# avoid merge conflicts on main.
#
# Usage:
#   ./parallel-orchestrator.sh                        # auto-pick next N pending tasks
#   ./parallel-orchestrator.sh -n 3                   # run 3 tasks in parallel (default: 2)
#   ./parallel-orchestrator.sh -t task1.md -t task2.md  # run specific tasks
#   ./parallel-orchestrator.sh --resume               # clean up stale worktrees and re-run stuck tasks
#
# Requirements:
#   • git worktree support (git ≥ 2.5)
#   • claude CLI on PATH

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────────

REPO_DIR="/home/dmichael/projects/greentd"
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

PARALLEL_STATE_FILE="$REPO_DIR/.orch_parallel_state"

# ── Logging ────────────────────────────────────────────────────────────────────

log()    { echo "[porch $(date +%H:%M:%S)] $*"; }
log_w()  { echo "[porch $(date +%H:%M:%S)] [$1] $*" | sed "s/\[$1\] \[$1\]/[$1]/"; }
die()    { log "ERROR: $*"; exit 1; }
hr()     { echo ""; log "────────────────────────────────────────"; }

# ── Model selection ────────────────────────────────────────────────────────────

task_model() {
  local task_file="$1"
  local combined
  combined="$(basename "$task_file" .md) $(grep "^title:" "$task_file" 2>/dev/null | head -1 || true)"
  if echo "$combined" | grep -qiE 'story|lore|vignette|narrative|commander|character|codex|act[- ][0-9]|region|cultural'; then
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
  while IFS='|' read -r _rank f; do
    echo "$f"
    count=$(( count + 1 ))
    [ "$count" -ge "$limit" ] && break
  done < <(
    for dir in "${dirs[@]}"; do
      [ -d "$dir" ] || continue
      while IFS= read -r -d '' f; do
        if grep -q "^status: pending$" "$f" 2>/dev/null; then
          pri=$(grep "^priority:" "$f" 2>/dev/null | head -1 | awk '{print $2}')
          case "$pri" in
            critical) rank=0 ;; high) rank=1 ;; medium) rank=2 ;; low) rank=3 ;; *) rank=4 ;;
          esac
          echo "${rank}|${f}"
        fi
      done < <(find "$dir" -maxdepth 1 -name "*.md" -print0)
    done | sort
  )
}

claim_task() {
  sed -i 's/^status: pending$/status: in-progress/' "$1"
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

    rm -f "$tmp"
    log "[$log_prefix] $label — FAILED (exit $claude_exit)"
    return "$claude_exit"
  done

  log "[$log_prefix] $label — max retries exhausted"
  return 1
}

# ── Worker: implement + review in an isolated worktree ────────────────────────
#
# Called once per task in a subshell (background &).
# Writes its result to a status file so the main process can collect it.

worker() {
  local task_file="$1"
  local status_file="$2"   # parent reads this to know success/failure

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

  # Create isolated worktree on a fresh branch
  git -C "$REPO_DIR" worktree add -b "$branch" "$wt_path" HEAD \
    2>&1 | sed "s/^/[$slug] /"

  # Copy node_modules symlink so npm commands work without reinstalling
  if [ -d "$GAME_DIR/node_modules" ]; then
    ln -sfn "$GAME_DIR/node_modules" "$wt_game/node_modules"
  fi

  state_write "$task_file" "claimed" "$wt_path" "$branch"

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

  # Signal success — main process will handle ship
  echo "OK:$wt_path:$branch:$task_file" > "$status_file"
  log "[$slug] implement+review complete — ready to ship"
}

cleanup_worker() {
  local wt_path="$1" branch="$2"
  git -C "$REPO_DIR" worktree remove --force "$wt_path" 2>/dev/null || true
  git -C "$REPO_DIR" branch -D "$branch" 2>/dev/null || true
}

# ── Ship: serialised merge + commit + push ─────────────────────────────────────

ship_task() {
  local wt_path="$1"
  local branch="$2"
  local task_file="$3"
  local title done_path

  title=$(get_title "$task_file")
  done_path=$(done_path_for "$task_file")

  hr
  log "=== SHIP: $title ==="
  hr

  run_agent "ship" \
"You are finalising and shipping a completed feature for Ojibwe TD.

MAIN REPO  : $REPO_DIR
WORKTREE   : $wt_path
BRANCH     : $branch
TASK FILE  : $task_file  (status: in-progress)
TASK TITLE : $title
DONE PATH  : $done_path

Steps
─────
1. Verify quality gate:
     cd $wt_path/game && npm run check
   Fix anything that fails.

2. Mark task done and move file:
     a. Edit $task_file → change 'in-progress' to 'done'
     b. mkdir -p $(dirname $done_path)
     c. mv $task_file $done_path

3. Update $REPO_DIR/docs/JOURNEY.md — append a paragraph on what was built.

4. Merge worktree branch into main:
     git -C $REPO_DIR fetch origin main
     git -C $REPO_DIR checkout main
     git -C $REPO_DIR pull --rebase origin main
     git -C $REPO_DIR merge --no-ff $branch -m 'merge: $branch'

5. Commit all remaining changes:
     git -C $REPO_DIR add -A
     git -C $REPO_DIR commit -m \"\$(cat <<'EOF'
feat: $title

<paragraph describing what was implemented and why>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)\"

6. Push:
     git -C $REPO_DIR push origin main

7. Remove worktree and branch:
     git -C $REPO_DIR worktree remove --force $wt_path
     git -C $REPO_DIR branch -D $branch" \
  "$REPO_DIR" "$DEFAULT_MODEL" "ship-$(basename "$task_file" .md | cut -c1-15)"

  state_write "$task_file" "shipped" "" ""
}

# ── State file helpers ────────────────────────────────────────────────────────
# Records per-task progress so the watchdog and --resume can pick up mid-run.
# Format: one line per task — "task_file|stage|worktree|branch"
# stage: claimed | implement_done | review_done | shipped | failed

state_write() {
  local task_file="$1" stage="$2" wt="${3:-}" branch="${4:-}"
  # Update or insert the line for this task
  local tmp
  tmp=$(mktemp)
  grep -v "^${task_file}|" "$PARALLEL_STATE_FILE" 2>/dev/null > "$tmp" || true
  echo "${task_file}|${stage}|${wt}|${branch}" >> "$tmp"
  mv "$tmp" "$PARALLEL_STATE_FILE"
}

state_clear() {
  rm -f "$PARALLEL_STATE_FILE"
  log "Parallel state cleared."
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
    sed -i 's/^status: in-progress$/status: pending/' "$t"
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

  # Pull collaborator commits before branching worktrees
  sync_with_remote

  # Resolve task list
  local tasks=()
  if [ ${#explicit_tasks[@]} -gt 0 ]; then
    tasks=("${explicit_tasks[@]}")
  else
    while IFS= read -r t; do
      tasks+=("$t")
    done < <(find_pending_tasks "$parallel")
  fi

  [ ${#tasks[@]} -gt 0 ] || { log "No pending tasks — nothing to do."; exit 0; }

  log "Tasks to run (${#tasks[@]}):"
  for t in "${tasks[@]}"; do
    log "  • $(get_title "$t")  [$t]"
    claim_task "$t"
  done

  # ── Launch workers in parallel ─────────────────────────────────────────────

  local status_files=()
  local pids=()

  for task_file in "${tasks[@]}"; do
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

  # ── Serialised ship phase ──────────────────────────────────────────────────

  hr
  log "=== All workers done — beginning serialised ship phase ==="
  hr

  for i in "${!status_files[@]}"; do
    local sf="${status_files[$i]}"
    local result
    result=$(cat "$sf" 2>/dev/null || echo "FAIL")
    rm -f "$sf"

    if [[ "$result" == FAIL* ]]; then
      log "Skipping ship for task $i — worker reported failure."
      continue
    fi

    # Parse "OK:wt_path:branch:task_file"
    local wt_path branch task_file
    wt_path=$(echo "$result"  | cut -d: -f2)
    branch=$(echo "$result"   | cut -d: -f3)
    task_file=$(echo "$result" | cut -d: -f4)

    ship_task "$wt_path" "$branch" "$task_file" || {
      log "Ship failed for $task_file — manual intervention needed."
      log "Worktree preserved at: $wt_path (branch: $branch)"
      all_ok=false
    }
  done

  hr
  if $all_ok; then
    log "=== Parallel pipeline complete — all tasks shipped ==="
    state_clear
  else
    log "=== Parallel pipeline done with errors — check logs above ==="
    log "State file preserved at $PARALLEL_STATE_FILE for watchdog/resume."
  fi
  hr
}

main "$@"
