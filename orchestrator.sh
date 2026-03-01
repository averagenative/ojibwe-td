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

# ── Configuration ─────────────────────────────────────────────────────────────

REPO_DIR="/home/dmichael/projects/greentd"
GAME_DIR="$REPO_DIR/game"
TASKS_DIR="$REPO_DIR/tasks"

DEFAULT_MODEL="sonnet"  # used unless task_model() selects opus
MAX_RETRIES=8           # max attempts per agent before giving up
RETRY_DELAY=90          # seconds to wait after a context/rate-limit hit

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

    # ── Detect context / rate / overload / quota limits ────────────────────
    if grep -qiE \
      "context.*(length|window|limit|exceeded)|too many tokens|token.*limit|rate.limit|overloaded|529|request.*too large|maximum.*context|prompt.*too long|quota.*exceeded|billing|credit" \
      "$tmp" 2>/dev/null
    then
      log "$label — limit detected; waiting ${RETRY_DELAY}s before retry…"
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

# ── Task helpers ──────────────────────────────────────────────────────────────

find_next_task() {
  local dirs=(
    "$TASKS_DIR/backend/pending"
    "$TASKS_DIR/frontend/pending"
  )
  for dir in "${dirs[@]}"; do
    [ -d "$dir" ] || continue
    while IFS= read -r -d '' f; do
      if grep -q "^status: pending$" "$f" 2>/dev/null; then
        echo "$f"
        return
      fi
    done < <(find "$dir" -maxdepth 1 -name "*.md" -print0 | sort -z)
  done
}

claim_task() {
  # sed is a no-op if already in-progress (idempotent for resume)
  sed -i 's/^status: pending$/status: in-progress/' "$1"
  log "Claimed: $1"
}

get_title() {
  grep "^title:" "$1" | sed 's/^title:[[:space:]]*//' | head -1
}

done_path_for() {
  echo "$1" | sed 's|/pending/|/done/|'
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
