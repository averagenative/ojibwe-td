#!/usr/bin/env bash
# status.sh — quick orchestrator + task status check (two-column layout)
# Usage: ./status.sh

set -uo pipefail

IS_MACOS=false
[[ "$(uname)" == "Darwin" ]] && IS_MACOS=true

REPO="$(cd "$(dirname "$0")" && pwd)"
TASKS="$REPO/tasks"
STATE_FILE="$REPO/.orch_parallel_state"

BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
CYAN='\033[36m'
RESET='\033[0m'

# ── Column width ────────────────────────────────────────────────────────────
# Detect terminal width; default 120 if not a tty
TERM_W=$(tput cols 2>/dev/null || echo 120)
COL_W=$(( (TERM_W - 3) / 2 ))  # 3 for " │ " divider
[ "$COL_W" -lt 40 ] && COL_W=40

sep_l() { printf "${DIM}%*s${RESET}\n" "$COL_W" "" | tr ' ' '─'; }
sep_full() { printf "${DIM}%*s${RESET}\n" "$TERM_W" "" | tr ' ' '─'; }

# ── Collect left column into array ──────────────────────────────────────────
LEFT=()
_L() { LEFT+=("$1"); }

_L "$(printf "${BOLD}Orchestrator processes${RESET}")"
_L "$(sep_l)"

if $IS_MACOS; then
  SINGLE_PIDS=$(ps -eo pid,args 2>/dev/null | grep "[o]rchestrator\.sh" | grep -v "parallel" | awk '{print $1}' || true)
  PARALLEL_PIDS=$(ps -eo pid,args 2>/dev/null | grep "[p]arallel-orchestrator" | awk '{print $1}' || true)
  CLAUDE_PIDS=$(ps -eo pid,args 2>/dev/null | grep "[c]laude.*--dangerously-skip" | grep -v "grep" || true)
else
  SINGLE_PIDS=$(pgrep -f "[^-][o]rchestrator\.sh" 2>/dev/null || true)
  PARALLEL_PIDS=$(pgrep -f "[p]arallel-orchestrator\.sh" 2>/dev/null || true)
  CLAUDE_PIDS=$(pgrep -af "claude.*--dangerously-skip.*-p " 2>/dev/null | { grep -v "^$$" || true; })
fi

if [ -n "$SINGLE_PIDS" ]; then
  _L "$(printf "  ${GREEN}✓${RESET} Single orch  (PIDs: %s)" "$(echo "$SINGLE_PIDS" | tr '\n' ' ')")"
else
  _L "$(printf "  ${DIM}  Single orchestrator — not running${RESET}")"
fi
if [ -n "$PARALLEL_PIDS" ]; then
  _L "$(printf "  ${GREEN}✓${RESET} Parallel orch (PIDs: %s)" "$(echo "$PARALLEL_PIDS" | tr '\n' ' ')")"
else
  _L "$(printf "  ${DIM}  Parallel orchestrator — not running${RESET}")"
fi
if [ -n "$CLAUDE_PIDS" ]; then
  _L "$(printf "  ${GREEN}✓${RESET} Claude agent(s):")"
  while IFS= read -r line; do
    _L "$(printf "    ${DIM}%s${RESET}" "$(echo "$line" | cut -c1-$((COL_W - 6)))")"
  done <<< "$CLAUDE_PIDS"
else
  _L "$(printf "  ${DIM}  No Claude agents running${RESET}")"
fi

_L ""

# ── In-progress tasks ──────────────────────────────────────────────────────
_L "$(printf "${BOLD}In-progress tasks${RESET}")"
_L "$(sep_l)"

IN_PROGRESS=$(find "$TASKS" -name "*.md" -not -path "*/done/*" -not -path "*/health/*" \
  -exec grep -l "^status: in-progress$" {} \; 2>/dev/null | sort) || true

# Read checkpoint for stage info
CKPT_FILE="$REPO/.orch_checkpoint"
CKPT_TASK="" CKPT_STAGE=""
if [ -f "$CKPT_FILE" ]; then
  CKPT_STAGE=$(grep "^CKPT_STAGE=" "$CKPT_FILE" 2>/dev/null | head -1 | cut -d= -f2-)
  CKPT_TASK=$(grep "^CKPT_TASK=" "$CKPT_FILE" 2>/dev/null | head -1 | cut -d= -f2-)
fi

if [ -n "$IN_PROGRESS" ]; then
  while IFS= read -r f; do
    id=$(grep "^id:" "$f" 2>/dev/null | head -1 | awk '{print $2}' || echo "?")
    title=$(grep "^title:" "$f" 2>/dev/null | head -1 | sed 's/^title: //' || echo "?")
    pri=$(grep "^priority:" "$f" 2>/dev/null | head -1 | awk '{print $2}' || echo "")

    # Show pipeline stage from checkpoint if this is the active task
    stage_label=""
    if [ -n "$CKPT_TASK" ] && echo "$f" | grep -q "$(basename "$CKPT_TASK" .md)"; then
      case "$CKPT_STAGE" in
        none)       stage_label="${YELLOW}implementing${RESET}" ;;
        implement)  stage_label="${CYAN}reviewing${RESET}" ;;
        review)     stage_label="${GREEN}shipping${RESET}" ;;
        *)          stage_label="${DIM}${CKPT_STAGE}${RESET}" ;;
      esac
      # Elapsed time from checkpoint file mtime
      if $IS_MACOS; then
        ckpt_mtime=$(stat -f %m "$CKPT_FILE" 2>/dev/null || echo "")
      else
        ckpt_mtime=$(stat -c %Y "$CKPT_FILE" 2>/dev/null || echo "")
      fi
      elapsed=""
      if [ -n "$ckpt_mtime" ]; then
        now=$(date +%s)
        diff_s=$((now - ckpt_mtime))
        diff_m=$((diff_s / 60))
        diff_s_rem=$((diff_s % 60))
        elapsed=" ${DIM}(${diff_m}m${diff_s_rem}s in stage)${RESET}"
      fi
      stage_label=" → ${stage_label}${elapsed}"
    fi

    # Truncate title to fit column
    max_title=$((COL_W - 22))
    short_title="$title"
    [ ${#short_title} -gt "$max_title" ] && short_title="${short_title:0:$((max_title-1))}…"
    _L "$(printf "  ${YELLOW}◉${RESET} ${BOLD}%-9s${RESET} %s%b" "$id" "$short_title" "$stage_label")"
  done <<< "$IN_PROGRESS"
else
  _L "$(printf "  ${DIM}none${RESET}")"
fi

_L ""

# ── Parallel state ────────────────────────────────────────────────────────
if [ -f "$STATE_FILE" ]; then
  _L "$(printf "${BOLD}Parallel worker state${RESET}")"
  _L "$(sep_l)"
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    task_file=$(echo "$line" | cut -d'|' -f1)
    stage=$(echo "$line" | cut -d'|' -f2)
    worktree=$(echo "$line" | cut -d'|' -f3)
    task_name=$(basename "$task_file" .md)
    case "$stage" in
      claimed)        icon="${YELLOW}⏳${RESET}"; label="implementing" ;;
      implement_done) icon="${CYAN}🔍${RESET}"; label="reviewing" ;;
      review_done)    icon="${GREEN}🚢${RESET}"; label="ready to ship" ;;
      shipped)        icon="${GREEN}✓${RESET}";  label="shipped" ;;
      failed)         icon="${RED}✗${RESET}";    label="FAILED" ;;
      *)              icon="${DIM}?${RESET}";    label="$stage" ;;
    esac
    elapsed=""
    if [ -d "$worktree" ]; then
      if $IS_MACOS; then
        wt_created=$(stat -f %m "$worktree" 2>/dev/null || echo "")
      else
        wt_created=$(stat -c %Y "$worktree" 2>/dev/null || echo "")
      fi
      if [ -n "$wt_created" ]; then
        now=$(date +%s)
        diff_s=$((now - wt_created))
        diff_m=$((diff_s / 60))
        diff_s_rem=$((diff_s % 60))
        elapsed=" ${DIM}(${diff_m}m${diff_s_rem}s)${RESET}"
      fi
    fi
    _L "$(printf "  %b %-30s %s%b" "$icon" "$task_name" "$label" "$elapsed")"

    if [ -d "$worktree" ]; then
      changed=$(git -C "$worktree" diff --name-only HEAD 2>/dev/null | head -5)
      untracked=$(git -C "$worktree" ls-files --others --exclude-standard 2>/dev/null | head -3)
      all_files=$(printf "%s\n%s" "$changed" "$untracked" | { grep -v "^$" || true; } | sort -u | head -5)
      if [ -n "$all_files" ]; then
        file_count=$(echo "$all_files" | wc -l | tr -d ' ')
        _L "$(printf "    ${DIM}%s file(s) changed${RESET}" "$file_count")"
      fi
    fi
  done < "$STATE_FILE"
  _L ""
fi

# ── Active agent output (orchestrator logs) ──────────────────────────────
# Pick the most recent non-empty orchestrator log (porch_* or orch-*)
PORCH_LOGS=""
for _plog in $(ls -t /tmp/porch_*.log /tmp/orch-*.log 2>/dev/null); do
  [ -s "$_plog" ] && { PORCH_LOGS="$_plog"; break; }
done

if [ -n "$PORCH_LOGS" ] && [ -s "$PORCH_LOGS" ]; then
  _L "$(printf "${BOLD}Agent output${RESET} ${DIM}(%s)${RESET}" "$(basename "$PORCH_LOGS")")"
  _L "$(sep_l)"
  while IFS= read -r line; do
    _L "$(printf "  ${DIM}%s${RESET}" "$(echo "$line" | cut -c1-$((COL_W - 4)))")"
  done < <(tail -5 "$PORCH_LOGS")
fi

# ── Collect right column into array ─────────────────────────────────────────
RIGHT=()
_R() { RIGHT+=("$1"); }

_R "$(printf "${BOLD}Recent commits${RESET}")"
_R "$(sep_l)"
while IFS= read -r line; do
  _R "$(printf "  ${DIM}%s${RESET}" "$(echo "$line" | cut -c1-$((COL_W - 4)))")"
done < <(git -C "$REPO" log --oneline -8 2>/dev/null)

_R ""

# ── Dev server ──────────────────────────────────────────────────────────
_R "$(printf "${BOLD}Dev server${RESET}")"
_R "$(sep_l)"
if $IS_MACOS; then
  VITE_PID=$(lsof -iTCP:5173 -sTCP:LISTEN -t 2>/dev/null | head -1)
else
  VITE_LINE=$(ss -tlnp 2>/dev/null | grep -E '"node"' | grep -oP ':\K(300[0-9]|301[0-9])(?= .*pid=)|pid=\K[0-9]+' | head -2)
  VITE_PID=$(echo "$VITE_LINE" | sed -n '2p')
fi
if [ -n "${VITE_PID:-}" ]; then
  _R "$(printf "  ${GREEN}✓${RESET}  http://localhost:5173  (PID %s)" "$VITE_PID")"
else
  _R "$(printf "  ${RED}✗${RESET}  No Vite — run: ${DIM}cd game && npx vite --host${RESET}")"
fi

_R ""

# ── Last watchdog ───────────────────────────────────────────────────────
WLOG="$REPO/logs/watchdog.log"
if [ -f "$WLOG" ]; then
  _R "$(printf "${BOLD}Last watchdog check${RESET}")"
  _R "$(sep_l)"
  while IFS= read -r line; do
    # Strip the "[watchdog YYYY-MM-DD HH:MM:SS] " prefix for brevity
    short=$(echo "$line" | sed 's/\[watchdog [0-9-]* [0-9:]*\] //')
    _R "$(printf "  ${DIM}%s${RESET}" "$(echo "$short" | cut -c1-$((COL_W - 4)))")"
  done < <(tail -8 "$WLOG" | grep -v "^$" | grep -v "────")
fi

_R ""

# ── Blocked tasks ──────────────────────────────────────────────────────
_R "$(printf "${BOLD}Blocked tasks${RESET}")"
_R "$(sep_l)"

BLOCKED=$(find "$TASKS" -name "*.md" -not -path "*/done/*" -not -path "*/health/*" \
  -exec grep -l "^status: blocked$" {} \; 2>/dev/null | sort) || true

if [ -n "$BLOCKED" ]; then
  while IFS= read -r f; do
    id=$(grep "^id:" "$f" 2>/dev/null | head -1 | awk '{print $2}' || echo "?")
    title=$(grep "^title:" "$f" 2>/dev/null | head -1 | sed 's/^title: //' || echo "?")
    reason=$(grep "^blocked_reason:" "$f" 2>/dev/null | head -1 | sed 's/^blocked_reason: //' || echo "")
    max_title=$((COL_W - 16))
    short_title="$title"
    [ ${#short_title} -gt "$max_title" ] && short_title="${short_title:0:$((max_title-1))}…"
    _R "$(printf "  ${RED}⊘${RESET} ${BOLD}%-9s${RESET} %s" "$id" "$short_title")"
    if [ -n "$reason" ]; then
      max_reason=$((COL_W - 6))
      short_reason="$reason"
      [ ${#short_reason} -gt "$max_reason" ] && short_reason="${short_reason:0:$((max_reason-1))}…"
      _R "$(printf "    ${DIM}%s${RESET}" "$short_reason")"
    fi
  done <<< "$BLOCKED"
else
  _R "$(printf "  ${DIM}none${RESET}")"
fi

_R ""
_R "$(printf "  ${DIM}%s${RESET}" "$(date '+%Y-%m-%d %H:%M:%S %Z')")"

# ── Render two columns side by side ─────────────────────────────────────────

# Strip ANSI for measuring visible width
strip_ansi() { echo -e "$1" | sed 's/\x1b\[[0-9;]*m//g'; }

# Pad a string (with ANSI) to a visible width
pad_to() {
  local str="$1" target="$2"
  local visible
  visible=$(strip_ansi "$str")
  local vlen=${#visible}
  local pad=$((target - vlen))
  [ "$pad" -lt 0 ] && pad=0
  printf "%s%*s" "$str" "$pad" ""
}

MAX_LINES=${#LEFT[@]}
[ ${#RIGHT[@]} -gt "$MAX_LINES" ] && MAX_LINES=${#RIGHT[@]}

sep_full
for (( i=0; i<MAX_LINES; i++ )); do
  l="${LEFT[$i]:-}"
  r="${RIGHT[$i]:-}"
  printf "%s ${DIM}│${RESET} %s\n" "$(pad_to "$l" "$COL_W")" "$r"
done
sep_full

# ── Pending task queue (full width, bottom) ─────────────────────────────────
printf "${BOLD}Pending task queue${RESET} ${DIM}(by priority)${RESET}\n"
sep_full

{
  for dir in "$TASKS/backend/pending" "$TASKS/frontend/pending"; do
    [ -d "$dir" ] || continue
    while IFS= read -r -d '' f; do
      if grep -q "^status: pending$" "$f" 2>/dev/null; then
        pri=$(grep "^priority:" "$f" 2>/dev/null | head -1 | awk '{print $2}') || pri=""
        case "$pri" in
          critical) rank=0 ;; high) rank=1 ;; medium) rank=2 ;; low) rank=3 ;; *) rank=4 ;;
        esac
        id=$(grep "^id:" "$f" 2>/dev/null | head -1 | awk '{print $2}') || id="?"
        title=$(grep "^title:" "$f" 2>/dev/null | head -1 | sed 's/^title: //') || title="?"
        printf "%d|%-10s|%-8s|%s\n" "$rank" "$id" "$pri" "$title"
      fi
    done < <(find "$dir" -maxdepth 1 -name "*.md" -print0)
  done
} | sort -t'|' -k1,1n | while IFS='|' read -r rank id pri title; do
  case "$pri" in
    critical) col="${RED}" ;;
    high)     col="${YELLOW}" ;;
    medium)   col="${CYAN}" ;;
    *)        col="${DIM}" ;;
  esac
  printf "  ${col}%-10s${RESET}  %-8s  %s\n" "$id" "$pri" "$title"
done

TOTAL=$(find "$TASKS" -name "*.md" -not -path "*/done/*" -not -path "*/health/*" \
  -not -name "_template.md" \
  -exec grep -l "^status: pending$" {} \; 2>/dev/null | wc -l | tr -d ' ') || true
printf "\n  ${DIM}%s pending total${RESET}\n" "$TOTAL"
sep_full
