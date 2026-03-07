#!/usr/bin/env bash
# orchestrator.sh
#
# Autonomous 3-agent pipeline for Ojibwe TD:
#   Agent 1 — Implement    : claims next pending task, implements all criteria
#   Agent 2 — Review/Test  : reviews code, writes tests, fixes issues
#   Agent 3 — Ship         : moves task to done, commits, pushes to GitHub
#
# Re-runs an agent automatically when a context/rate limit is detected,
# using "check state and continue" semantics so work is never lost.
#
# Persists a checkpoint after each stage so the pipeline can be resumed
# if the process is killed (Ctrl-C, terminal close, quota exhaustion, etc.).
#
# Usage:
#   ./orchestrator.sh                      # pick next pending task
#   ./orchestrator.sh --task path/to.md    # run a specific task file
#   ./orchestrator.sh --resume             # resume from last checkpoint

set -euo pipefail

# ── Platform detection ────────────────────────────────────────────────────────

IS_MACOS=false
[[ "$(uname)" == "Darwin" ]] && IS_MACOS=true

# ── Configuration ─────────────────────────────────────────────────────────────

if $IS_MACOS; then
  REPO_DIR="/Users/dmichael/projects/ojibwe-td"
else
  REPO_DIR="/home/dmichael/projects/greentd"
fi
GAME_DIR="$REPO_DIR/game"
TASKS_DIR="$REPO_DIR/tasks"

DEFAULT_MODEL="sonnet"  # used unless task_model() selects opus
MAX_RETRIES=8           # max attempts per agent before giving up
RETRY_DELAY=90          # seconds to wait after a transient rate/context limit
QUOTA_WAIT=1800         # seconds to wait after quota/billing exhaustion (30 min)
QUOTA_MAX_WAIT=48       # max quota-wait cycles before giving up (~24 h)
BASELINE_TEST_FAILURES=0   # known pre-existing test failures (update when fixing old tests)

CHECKPOINT_FILE="$REPO_DIR/.orch_checkpoint"

# ── Logging ───────────────────────────────────────────────────────────────────

log()  { echo "[orch $(date +%H:%M:%S)] $*"; }
die()  { log "ERROR: $*"; exit 1; }
hr()   { echo ""; log "────────────────────────────────────────"; }

# ── Checkpoint helpers ────────────────────────────────────────────────────────
#
# Checkpoint file is a sourceable bash snippet:
#   CKPT_TASK=/path/to/task.md
#   CKPT_STAGE=implement     # last COMPLETED stage: none|implement|review|ship

save_checkpoint() {
  local stage="$1" task="$2"
  printf 'CKPT_TASK=%s\nCKPT_STAGE=%s\n' "$task" "$stage" > "$CHECKPOINT_FILE"
  log "Checkpoint saved (stage=$stage) → $CHECKPOINT_FILE"
}

clear_checkpoint() {
  rm -f "$CHECKPOINT_FILE"
  log "Checkpoint cleared."
}

load_checkpoint() {
  [ -f "$CHECKPOINT_FILE" ] || return 1
  # shellcheck source=/dev/null
  source "$CHECKPOINT_FILE"
  return 0
}

# ── Signal handling ────────────────────────────────────────────────────────────
#
# On SIGINT / SIGTERM, save whatever stage we reached so --resume can pick up.
# CURRENT_TASK_FILE and CURRENT_STAGE are set in main() before each stage starts.

CURRENT_TASK_FILE=""
CURRENT_STAGE="none"

on_interrupt() {
  echo ""
  if [ -n "$CURRENT_TASK_FILE" ]; then
    save_checkpoint "$CURRENT_STAGE" "$CURRENT_TASK_FILE"
    log "Pipeline interrupted — resume with:  ./orchestrator.sh --resume"
  else
    log "Pipeline interrupted before any stage completed — no checkpoint written."
  fi
  exit 130
}

trap on_interrupt SIGINT SIGTERM

# ── Model selection ────────────────────────────────────────────────────────────
#
# Story, narrative, lore, and character-design tasks use Claude Opus for richer
# creative output.  All other tasks (systems, UI, tests, balance) use the default
# model (Sonnet).

task_model() {
  local task_file="$1"
  local base
  base=$(basename "$task_file" .md)
  local title
  title=$(grep "^title:" "$task_file" 2>/dev/null | sed 's/^title:[[:space:]]*//' | head -1 || true)
  local combined="${base} ${title}"

  if echo "$combined" | grep -qiE \
    'story|lore|vignette|narrative|commander|character|codex|act[- ][0-9]|region|cultural'; then
    echo "opus"
  else
    echo "$DEFAULT_MODEL"
  fi
}

# ── Core: run a claude agent with retry on limits ─────────────────────────────
#
# run_agent <label> <prompt> [working-dir] [model]
#
# Streams agent output to the terminal in real time (via cat).
# On exit-code non-zero, inspects the captured output for limit keywords;
# if found, waits RETRY_DELAY seconds then retries with a continuation prefix.
# Any other error is treated as fatal.

run_agent() {
  local label="$1"
  local base_prompt="$2"
  local work_dir="${3:-$REPO_DIR}"
  local model="${4:-$DEFAULT_MODEL}"
  local attempt=0
  local quota_waits=0
  local prompt="$base_prompt"

  log "$label — model: $model"

  while [ $attempt -lt "$MAX_RETRIES" ]; do
    attempt=$(( attempt + 1 ))
    log "$label — attempt $attempt / $MAX_RETRIES  (dir: $work_dir)"

    local tmp
    tmp=$(mktemp /tmp/orch_XXXXXX.log)

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

    cat "$tmp"

    if [ $claude_exit -eq 0 ]; then
      rm -f "$tmp"
      log "$label — completed ✓"
      return 0
    fi

    # ── Tier 1: Quota / billing exhaustion — save state, wait 30 min ───────
    # These are not transient; retrying immediately wastes quota on errors.
    # Save a checkpoint so --resume can pick up after tokens replenish.
    if grep -qiE \
      "credit.*balance|billing|monthly.*limit|usage.*limit|quota.*exceeded|402 |payment.required" \
      "$tmp" 2>/dev/null
    then
      rm -f "$tmp"
      quota_waits=$(( quota_waits + 1 ))
      attempt=$(( attempt - 1 ))  # don't consume a regular retry slot

      save_checkpoint "$CURRENT_STAGE" "$CURRENT_TASK_FILE"
      log "$label — QUOTA EXHAUSTED (wait $quota_waits/$QUOTA_MAX_WAIT) —"
      log "  Checkpoint saved. Resume with:  ./orchestrator.sh --resume"
      log "  Waiting ${QUOTA_WAIT}s (~$(( QUOTA_WAIT / 60 )) min) before retry…"

      if [ "$quota_waits" -ge "$QUOTA_MAX_WAIT" ]; then
        log "$label — quota still exhausted after $QUOTA_MAX_WAIT waits (~24 h) — aborting"
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
      log "$label — transient limit; waiting ${RETRY_DELAY}s before retry…"
      rm -f "$tmp"
      sleep "$RETRY_DELAY"

      prompt="$(printf '%s\n\n%s' \
        "[RESUME] A previous attempt was interrupted by a context, rate, or quota limit.
Inspect the current state of the work (git -C $REPO_DIR status, git -C $REPO_DIR diff,
existing source files) and continue exactly where it left off.
Do NOT redo work that is already done.

--- Original instructions follow ---" \
        "$base_prompt")"
      continue
    fi

    # ── Non-limit failure ──────────────────────────────────────────────────
    rm -f "$tmp"
    log "$label — failed (exit $claude_exit) — aborting pipeline"
    return "$claude_exit"
  done

  log "$label — max retries ($MAX_RETRIES) exhausted"
  return 1
}

# ── Remote sync ───────────────────────────────────────────────────────────────
#
# Pull collaborator commits before picking up any work.
# Non-fatal: if the pull fails (network down, merge conflict), we log and
# continue with local state rather than aborting the pipeline entirely.

sync_with_remote() {
  log "Syncing with remote…"
  local out
  if ! out=$(git -C "$REPO_DIR" fetch origin 2>&1); then
    log "WARNING: git fetch failed — working with local state."
    return 0
  fi

  local behind ahead
  behind=$(git -C "$REPO_DIR" rev-list HEAD..origin/main --count 2>/dev/null || echo 0)
  ahead=$(git -C "$REPO_DIR" rev-list origin/main..HEAD --count 2>/dev/null || echo 0)

  if [ "$behind" -eq 0 ] && [ "$ahead" -eq 0 ]; then
    log "Remote: already up to date."
    return 0
  fi

  [ "$ahead" -gt 0 ] && log "Remote: $ahead local commit(s) not yet pushed."

  if [ "$behind" -gt 0 ]; then
    log "Remote: $behind new commit(s) available."

    # Interactive prompt if running in a terminal
    if [ -t 0 ]; then
      printf "[orch] Pull latest before proceeding? [Y/n] "
      read -r answer
      case "$answer" in
        n|N|no|No) log "Skipping pull — working with local state."; return 0 ;;
      esac
    fi

    log "Pulling $behind commit(s)…"
    if ! out=$(git -C "$REPO_DIR" pull --rebase origin main 2>&1); then
      log "WARNING: git pull --rebase failed — manual rebase may be needed."
      log "$out"
      return 0
    fi
    echo "$out" | sed 's/^/  /'
    log "Remote: sync complete."
  fi
}

# ── Preflight: verify baseline builds before starting any work ────────────────
#
# Catches the case where the repo is already broken before we touch it.
# Runs typecheck + tests; if either fails, warns and prompts (interactive)
# or aborts (headless).

preflight_check() {
  log "Preflight: checking baseline build health…"

  local dirty
  dirty=$(git -C "$REPO_DIR" diff --name-only HEAD 2>/dev/null | wc -l | tr -d ' ')
  if [ "$dirty" -gt 0 ]; then
    log "WARNING: $dirty uncommitted file(s) in working tree."
    if [ -t 0 ]; then
      printf "[orch] Continue with dirty working tree? [y/N] "
      read -r answer
      case "$answer" in
        y|Y|yes|Yes) ;;
        *) die "Aborting — commit or stash changes first." ;;
      esac
    fi
  fi

  local tc_out
  tc_out=$(cd "$GAME_DIR" && npm run typecheck 2>&1) || {
    log "WARNING: Baseline typecheck FAILS before any task work."
    echo "$tc_out" | tail -10 | sed 's/^/  /'
    if [ -t 0 ]; then
      printf "[orch] Proceed anyway? [y/N] "
      read -r answer
      case "$answer" in
        y|Y|yes|Yes) return 0 ;;
        *) die "Fix typecheck errors before running orchestrator." ;;
      esac
    else
      die "Baseline typecheck fails — fix before running orchestrator."
    fi
  }
  log "Preflight: typecheck passed ✓"

  local test_out
  test_out=$(cd "$GAME_DIR" && npm run test 2>&1) || {
    local fail_count
    fail_count=$(echo "$test_out" | sed 's/\x1b\[[0-9;]*m//g' | grep -oE '[0-9]+ failed' | head -1 | awk '{print $1}')
    fail_count=${fail_count:-0}
    if [ "$fail_count" -le "$BASELINE_TEST_FAILURES" ]; then
      log "Preflight: $fail_count test failure(s) ≤ baseline ($BASELINE_TEST_FAILURES) — OK"
    else
      log "WARNING: Baseline tests FAIL ($fail_count) — exceeds baseline ($BASELINE_TEST_FAILURES)."
      if [ -t 0 ]; then
        printf "[orch] Proceed anyway? [y/N] "
        read -r answer
        case "$answer" in
          y|Y|yes|Yes) ;;
          *) die "Fix test failures before running orchestrator." ;;
        esac
      else
        die "Baseline tests fail ($fail_count > $BASELINE_TEST_FAILURES) — fix before running orchestrator."
      fi
    fi
  }
  log "Preflight: tests passed ✓"
  log "Preflight: baseline is clean — safe to proceed."
}

# ── Task helpers ──────────────────────────────────────────────────────────────

find_next_task() {
  local dirs=(
    "$TASKS_DIR/backend/pending"
    "$TASKS_DIR/frontend/pending"
  )
  local tmp_ranked
  tmp_ranked=$(mktemp /tmp/orch_rank_XXXXXX)

  for dir in "${dirs[@]}"; do
    [ -d "$dir" ] || continue
    while IFS= read -r -d '' f; do
      if grep -q "^status: pending$" "$f" 2>/dev/null; then
        local pri rank
        pri=$(grep "^priority:" "$f" 2>/dev/null | head -1 | awk '{print $2}') || pri=""
        rank=4
        [ "$pri" = "critical" ] && rank=0
        [ "$pri" = "high" ]     && rank=1
        [ "$pri" = "medium" ]   && rank=2
        [ "$pri" = "low" ]      && rank=3
        echo "${rank}|${f}" >> "$tmp_ranked"
      fi
    done < <(find "$dir" -maxdepth 1 -name "*.md" -print0)
  done

  local best=""
  if [ -s "$tmp_ranked" ]; then
    best=$(sort "$tmp_ranked" | head -1 | cut -d'|' -f2-)
  fi
  rm -f "$tmp_ranked"
  echo "$best"
}

claim_task() {
  # sed is a no-op if already in-progress (idempotent for resume)
  if $IS_MACOS; then
    sed -i '' 's/^status: pending$/status: in-progress/' "$1"
  else
    sed -i 's/^status: pending$/status: in-progress/' "$1"
  fi
  log "Claimed: $1"
}

get_title() {
  grep "^title:" "$1" | sed 's/^title:[[:space:]]*//' | head -1
}

done_path_for() {
  echo "$1" | sed 's|/pending/|/done/|'
}

# ── Pre-validate: bash gates before expensive Opus review ─────────────────────
#
# Gate 1: `npm run typecheck` — catches compilation errors.
# Gate 2: `npm run test`      — catches test regressions.
# Returns 0 on success, 1 on failure.  Saves ~60–120 K Opus tokens per
# broken implementation by short-circuiting before the review agent is invoked.

pre_validate() {
  # Gate 1: TypeScript compilation
  log "Pre-validate: running typecheck (bash gate — no LLM)…"
  local out
  out=$(cd "$GAME_DIR" && npm run typecheck 2>&1) || {
    echo "$out" | sed 's/^/[typecheck] /'
    log "Pre-validate: typecheck FAILED — skipping Opus review to save tokens"
    log "  Fix TypeScript errors in implement agent, then re-run with --resume"
    return 1
  }
  log "Pre-validate: typecheck passed ✓"

  # Gate 2: Test suite — compare against baseline failure count (not zero)
  # Pre-existing test failures shouldn't block new work.
  log "Pre-validate: running test suite (bash gate — no LLM)…"
  out=$(cd "$GAME_DIR" && npm run test 2>&1)
  local test_exit=$?

  # Extract failure count from vitest output
  local fail_count
  fail_count=$(echo "$out" | sed 's/\x1b\[[0-9;]*m//g' | grep -E "Tests .* failed" | grep -oE '[0-9]+ failed' | head -1 | awk '{print $1}')
  fail_count=${fail_count:-0}

  # Baseline: known pre-existing failures (update when fixing old tests)
  local baseline_failures=${BASELINE_TEST_FAILURES:-27}

  if [ "$test_exit" -eq 0 ]; then
    log "Pre-validate: tests passed ✓  (Opus review will proceed)"
    return 0
  elif [ "$fail_count" -le "$baseline_failures" ]; then
    log "Pre-validate: tests have $fail_count failure(s) ≤ baseline ($baseline_failures) — PASS ✓"
    log "  (Pre-existing failures — not caused by this implementation)"
    return 0
  else
    local new_failures=$((fail_count - baseline_failures))
    echo "$out" | sed 's/^/[test] /'
    log "Pre-validate: $fail_count failure(s), $new_failures NEW above baseline ($baseline_failures)"
    log "  Fix test regressions, then re-run with --resume"
    return 1
  fi
}

# ── Pipeline ──────────────────────────────────────────────────────────────────

main() {
  local task_file=""
  local resume=false
  local resume_from="none"   # last completed stage from checkpoint

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --task)   task_file="$2"; shift 2 ;;
      --resume) resume=true; shift ;;
      *)        die "Unknown arg: $1" ;;
    esac
  done

  hr
  log "=== Orchestrator starting ==="
  hr

  # ── 0. Resolve task (from checkpoint, explicit flag, or auto-pick) ───────

  if $resume; then
    if ! load_checkpoint; then
      die "No checkpoint found at $CHECKPOINT_FILE — nothing to resume."
    fi
    task_file="$CKPT_TASK"
    resume_from="$CKPT_STAGE"
    log "Resuming from checkpoint  (last completed stage: $resume_from)"
    log "Task : $task_file"
  fi

  if [ -z "$task_file" ]; then
    task_file=$(find_next_task)
  fi

  # Pull any collaborator commits before touching the repo
  sync_with_remote

  # Verify baseline build health (skip on --resume since we already have in-flight work)
  if ! $resume; then
    preflight_check
  fi

  [ -n "$task_file" ] || { log "No pending tasks — nothing to do."; exit 0; }
  [ -f "$task_file"  ] || die "Task file not found: $task_file"

  local title done_path mdl
  title=$(get_title "$task_file")
  done_path=$(done_path_for "$task_file")
  mdl=$(task_model "$task_file")

  log "Task  : $title"
  log "File  : $task_file"
  log "Done→ : $done_path"
  log "Model : $mdl"

  # Export so the interrupt handler can reference them
  CURRENT_TASK_FILE="$task_file"
  CURRENT_STAGE="$resume_from"

  claim_task "$task_file"

  # On fresh start, write an initial checkpoint (stage=none) so an interrupt
  # during Agent 1 can still identify the task file on --resume.
  if ! $resume; then
    save_checkpoint "none" "$task_file"
  fi

  # ── Agent 1: Implement ──────────────────────────────────────────────────
  if [[ "$resume_from" == "none" ]]; then
    hr
    log "=== AGENT 1 — Implement ==="
    hr

    CURRENT_STAGE="none"
    run_agent "implement" \
"You are implementing a feature for Ojibwe TD — a Phaser 3 + TypeScript browser tower-defense game.

REPO ROOT : $REPO_DIR
GAME SRC  : $GAME_DIR/src
TASK FILE : $task_file

Steps
─────
1. Read the full task file at $task_file.
2. Read existing source files in $GAME_DIR/src/ to understand current patterns,
   naming conventions, and architecture before writing anything new.
3. Implement EVERY acceptance criterion in the task file, in full.
   Do not skip or defer any criterion.
4. After implementing, run:
     cd $GAME_DIR && npm run typecheck
   Fix ALL TypeScript errors before finishing.
5. Do NOT run tests. Do NOT commit. Implementation only.

Be thorough — the next agent will verify every criterion against the task file." \
    "$GAME_DIR" "$mdl"

    CURRENT_STAGE="implement"
    save_checkpoint "implement" "$task_file"
  else
    log "=== AGENT 1 — Implement  [SKIPPED — already completed] ==="
  fi

  # ── Bash gate: typecheck + tests before invoking Opus ─────────────────────────
  # If pre-validate fails, run a fix-up agent to repair the issues, then re-check.
  # Up to 3 fix-up attempts before giving up.
  local fix_attempts=0
  local max_fix=3
  while ! pre_validate; do
    fix_attempts=$(( fix_attempts + 1 ))
    if [ "$fix_attempts" -gt "$max_fix" ]; then
      log "Pre-validate still failing after $max_fix fix-up attempts — aborting."
      log "Checkpoint preserved at 'implement' stage — resume with: ./orchestrator.sh --resume"
      return 1
    fi

    hr
    log "=== FIX-UP AGENT (attempt $fix_attempts/$max_fix) ==="
    hr

    local fix_errors
    fix_errors=$(cd "$GAME_DIR" && npm run typecheck 2>&1 | sed 's/\x1b\[[0-9;]*m//g' || true)
    local test_errors
    test_errors=$(cd "$GAME_DIR" && npm run test 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tail -60 || true)

    # Count new failures above baseline for the prompt
    local current_fails
    current_fails=$(echo "$test_errors" | grep -oE '[0-9]+ failed' | head -1 | awk '{print $1}')
    current_fails=${current_fails:-0}
    local new_above=$((current_fails - BASELINE_TEST_FAILURES))
    [ "$new_above" -lt 0 ] && new_above=0

    run_agent "fix-up" \
"You are fixing broken tests/types in Ojibwe TD after a feature implementation.

REPO ROOT : $REPO_DIR
GAME SRC  : $GAME_DIR/src
TASK FILE : $task_file

The implementation for this task is done, but typecheck or tests are failing.
IMPORTANT: There are $BASELINE_TEST_FAILURES known pre-existing test failures in the codebase.
You need to fix the $new_above NEW failure(s) introduced by this implementation.
Focus on regressions — do NOT try to fix unrelated pre-existing failures.

TypeScript errors (if any):
$fix_errors

Test failures (last 60 lines):
$test_errors

Steps
─────
1. Read the task file to understand what was implemented.
2. Examine the current git diff to see what changed:
     git -C $REPO_DIR diff
3. Fix typecheck errors and NEW test regressions caused by this implementation.
   - If tests broke because the implementation changed APIs, update the tests.
   - If tests broke because of bugs in the implementation, fix the implementation.
   - Do NOT delete or skip existing tests — fix them.
   - Pre-existing failures (≤$BASELINE_TEST_FAILURES) are acceptable — don't waste time on them.
4. Run: cd $GAME_DIR && npm run typecheck   — must exit 0
5. Run: cd $GAME_DIR && npm run test        — aim for ≤$BASELINE_TEST_FAILURES failures
6. Do NOT commit anything." \
    "$GAME_DIR" "$mdl"
  done

  # ── Agent 2: Review & Tests ─────────────────────────────────────────────
  if [[ "$resume_from" == "none" || "$resume_from" == "implement" ]]; then
    hr
    log "=== AGENT 2 — Review & Tests ==="
    hr

    CURRENT_STAGE="implement"
    run_agent "review" \
"You are a senior code reviewer for Ojibwe TD — a Phaser 3 + TypeScript browser tower-defense game.
You are running as the Opus model and are responsible for the highest-quality review gate.

REPO ROOT      : $REPO_DIR
GAME SRC       : $GAME_DIR/src
TASK FILE      : $task_file
REVIEW CHECKLIST: $REPO_DIR/docs/review-checklist.md
ROADMAP        : $REPO_DIR/docs/ROADMAP.md

Steps
─────
1. Read the task file ($task_file) to understand every acceptance criterion.
2. Read the full review checklist at $REPO_DIR/docs/review-checklist.md.
3. Examine every changed/added file:
     git -C $REPO_DIR diff
4. Work through EVERY section of the review checklist systematically.
   For each checklist item: verify it, fix any failure you find, then mark it resolved in your output.
   Do not skip sections. Do not mark an item resolved without verifying it.
5. Write unit tests for all new logic. Follow the existing test pattern in
   $GAME_DIR/src/systems/__tests__/ (Vitest + jsdom).
   Test at minimum: happy path, boundary conditions, and error/edge cases.
6. Run: cd $GAME_DIR && npm run typecheck   — must exit 0
7. Run: cd $GAME_DIR && npm run test        — fix ALL failures
8. If you find architectural concerns, UX observations, or technical debt NOT
   blocking this task, append them under the appropriate section in $REPO_DIR/docs/ROADMAP.md
   (under 'Code Review Recommendations' or 'Known Technical Debt').
9. Do NOT commit anything." \
    "$GAME_DIR" "opus"

    CURRENT_STAGE="review"
    save_checkpoint "review" "$task_file"
  else
    log "=== AGENT 2 — Review & Tests  [SKIPPED — already completed] ==="
  fi

  # ── Agent 3: Ship ───────────────────────────────────────────────────────
  if [[ "$resume_from" != "ship" ]]; then
    hr
    log "=== AGENT 3 — Ship ==="
    hr

    CURRENT_STAGE="review"
    run_agent "ship" \
"You are finalising and shipping a completed feature for Ojibwe TD.

REPO ROOT  : $REPO_DIR
TASK FILE  : $task_file   (currently status: in-progress)
TASK TITLE : $title
DONE PATH  : $done_path

Steps
─────
1. Verify the work is sound:
     cd $GAME_DIR && npm run check
   (runs typecheck + lint + tests). Fix anything that fails.

2. Move the task file from pending → done and mark it complete:
     a. Edit $task_file  →  change 'status: in-progress'  to  'status: done'
     b. Create the done dir if needed: mkdir -p $(dirname $done_path)
     c. Move: mv $task_file $done_path

3. Update $REPO_DIR/docs/JOURNEY.md — append a brief paragraph describing
   what was built in this phase and any notable design decisions.

4. Stage all changes:
     git -C $REPO_DIR add -A

5. Commit with a descriptive multi-line message using a HEREDOC, e.g.:
     git -C $REPO_DIR commit -m \"\$(cat <<'EOF'
     feat: <concise title>

     <paragraph describing what was implemented and why>

     Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
     EOF
     )\"

6. Push to GitHub:
     git -C $REPO_DIR push origin main" \
    "$REPO_DIR" "$DEFAULT_MODEL"   # ship agent always uses default model

    CURRENT_STAGE="ship"
  else
    log "=== AGENT 3 — Ship  [SKIPPED — already completed] ==="
  fi

  # ── All stages done — clean up ───────────────────────────────────────────
  clear_checkpoint
  CURRENT_TASK_FILE=""

  hr
  log "=== Pipeline complete: $title ==="
  hr
}

main "$@"
