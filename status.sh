#!/usr/bin/env bash
# status.sh — quick orchestrator + task status check
# Usage: ./status.sh

set -euo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"
TASKS="$REPO/tasks"
WORKTREES="$REPO/.worktrees"
STATE_FILE="$REPO/.orch_parallel_state"

BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
CYAN='\033[36m'
RESET='\033[0m'

sep() { printf "${DIM}────────────────────────────────────────${RESET}\n"; }

# ── Orchestrator processes ───────────────────────────────────────────────────
sep
printf "${BOLD}Orchestrator processes${RESET}\n"
sep

SINGLE_PIDS=$(pgrep -f "orchestrator\.sh" 2>/dev/null | while read p; do
  # Exclude parallel-orchestrator and our own pgrep
  cmd=$(ps -p "$p" -o args= 2>/dev/null || true)
  echo "$cmd" | grep -q "parallel" && continue
  echo "$cmd" | grep -q "pgrep" && continue
  echo "$p"
done || true)
PARALLEL_PIDS=$(pgrep -f "parallel-orchestrator\.sh" 2>/dev/null | while read p; do
  cmd=$(ps -p "$p" -o args= 2>/dev/null || true)
  echo "$cmd" | grep -q "pgrep" && continue
  echo "$p"
done || true)
CLAUDE_PIDS=$(pgrep -af "claude.*--dangerously-skip" 2>/dev/null | grep -v "^$$" || true)

if [ -n "$SINGLE_PIDS" ]; then
  printf "  ${GREEN}✓${RESET} Single orchestrator running  (PIDs: %s)\n" "$(echo "$SINGLE_PIDS" | tr '\n' ' ')"
else
  printf "  ${DIM}  Single orchestrator — not running${RESET}\n"
fi

if [ -n "$PARALLEL_PIDS" ]; then
  printf "  ${GREEN}✓${RESET} Parallel orchestrator running (PIDs: %s)\n" "$(echo "$PARALLEL_PIDS" | tr '\n' ' ')"
else
  printf "  ${DIM}  Parallel orchestrator — not running${RESET}\n"
fi

if [ -n "$CLAUDE_PIDS" ]; then
  printf "  ${GREEN}✓${RESET} Claude agent(s) running:\n"
  while IFS= read -r line; do
    # Truncate long command lines
    printf "      ${DIM}%s${RESET}\n" "$(echo "$line" | cut -c1-120)"
  done <<< "$CLAUDE_PIDS"
else
  printf "  ${DIM}  No Claude agents running${RESET}\n"
fi

# ── In-progress tasks ────────────────────────────────────────────────────────
sep
printf "${BOLD}In-progress tasks${RESET}\n"
sep

IN_PROGRESS=$(find "$TASKS" -name "*.md" -not -path "*/done/*" \
  -exec grep -l "^status: in-progress$" {} \; 2>/dev/null | sort || true)

if [ -n "$IN_PROGRESS" ]; then
  while IFS= read -r f; do
    id=$(grep "^id:" "$f" 2>/dev/null | head -1 | awk '{print $2}' || echo "?")
    title=$(grep "^title:" "$f" 2>/dev/null | head -1 | sed 's/^title: //' || echo "?")
    pri=$(grep "^priority:" "$f" 2>/dev/null | head -1 | awk '{print $2}' || echo "")
    printf "  ${YELLOW}◉${RESET}  ${BOLD}%-10s${RESET}  ${CYAN}%-8s${RESET}  %s\n" "$id" "$pri" "$title"
  done <<< "$IN_PROGRESS"
else
  printf "  ${DIM}  none${RESET}\n"
fi

# ── Parallel state ───────────────────────────────────────────────────────────
if [ -f "$STATE_FILE" ]; then
  sep
  printf "${BOLD}Parallel worker state${RESET}\n"
  sep
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    task_file=$(echo "$line" | cut -d'|' -f1)
    stage=$(echo "$line" | cut -d'|' -f2)
    worktree=$(echo "$line" | cut -d'|' -f3)
    task_name=$(basename "$task_file" .md)
    case "$stage" in
      claimed)       icon="${YELLOW}⏳${RESET}"; label="implementing (sonnet)" ;;
      implement_done) icon="${CYAN}🔍${RESET}"; label="reviewing (opus)" ;;
      review_done)   icon="${GREEN}🚢${RESET}"; label="ready to ship" ;;
      shipped)       icon="${GREEN}✓${RESET}";  label="shipped" ;;
      failed)        icon="${RED}✗${RESET}";    label="FAILED" ;;
      *)             icon="${DIM}?${RESET}";    label="$stage" ;;
    esac

    # Show elapsed time since worktree was created
    elapsed=""
    if [ -d "$worktree" ]; then
      wt_created=$(stat -c %Y "$worktree" 2>/dev/null || echo "")
      if [ -n "$wt_created" ]; then
        now=$(date +%s)
        diff_s=$((now - wt_created))
        diff_m=$((diff_s / 60))
        diff_s_rem=$((diff_s % 60))
        elapsed="  ${DIM}(${diff_m}m ${diff_s_rem}s)${RESET}"
      fi
    fi

    printf "  %b  ${BOLD}%-35s${RESET}  %s%b\n" "$icon" "$task_name" "$label" "$elapsed"

    # Show changed files in this worktree
    if [ -d "$worktree" ]; then
      changed=$(git -C "$worktree" diff --name-only HEAD 2>/dev/null | head -10)
      untracked=$(git -C "$worktree" ls-files --others --exclude-standard 2>/dev/null | head -5)
      all_files=$(printf "%s\n%s" "$changed" "$untracked" | grep -v "^$" | sort -u | head -10)
      if [ -n "$all_files" ]; then
        file_count=$(echo "$all_files" | wc -l | tr -d ' ')
        printf "      ${DIM}%s file(s) changed:${RESET}\n" "$file_count"
        while IFS= read -r cf; do
          printf "      ${DIM}  %s${RESET}\n" "$cf"
        done <<< "$all_files"
      fi
    fi
  done < "$STATE_FILE"
fi

# ── Active Claude agents (live details) ───────────────────────────────────────
if [ -n "$CLAUDE_PIDS" ]; then
  sep
  printf "${BOLD}Active Claude agents${RESET}\n"
  sep
  while IFS= read -r line; do
    pid=$(echo "$line" | awk '{print $1}')
    cmd=$(echo "$line" | cut -d' ' -f2-)
    # Extract model name
    model=$(echo "$cmd" | grep -oP '(?<=--model )\S+' || echo "default")
    # Check which porch log this agent writes to
    log_file=$(ls -la /proc/"$pid"/fd/1 2>/dev/null | grep -oP '/tmp/porch_\S+' || echo "")
    log_size=""
    if [ -n "$log_file" ] && [ -f "$log_file" ]; then
      sz=$(stat -c %s "$log_file" 2>/dev/null || echo 0)
      if [ "$sz" -gt 0 ]; then
        log_size="  ${DIM}(${sz} bytes output)${RESET}"
      fi
    fi
    # Elapsed time since process started
    start_time=$(stat -c %Y /proc/"$pid" 2>/dev/null || echo "")
    elapsed=""
    if [ -n "$start_time" ]; then
      now=$(date +%s)
      diff_s=$((now - start_time))
      diff_m=$((diff_s / 60))
      diff_h=$((diff_m / 60))
      diff_m_rem=$((diff_m % 60))
      if [ "$diff_h" -gt 0 ]; then
        elapsed="${diff_h}h ${diff_m_rem}m"
      else
        elapsed="${diff_m}m $((diff_s % 60))s"
      fi
    fi
    printf "  ${GREEN}●${RESET}  PID %-6s  ${CYAN}%-8s${RESET}  ${DIM}running %s${RESET}%b\n" \
      "$pid" "$model" "$elapsed" "$log_size"
  done <<< "$CLAUDE_PIDS"
fi

# ── Pending task queue ───────────────────────────────────────────────────────
sep
printf "${BOLD}Pending task queue${RESET} (by priority)\n"
sep

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
} | sort | while IFS='|' read -r rank id pri title; do
  case "$pri" in
    critical) col="${RED}" ;;
    high)     col="${YELLOW}" ;;
    medium)   col="${CYAN}" ;;
    *)        col="${DIM}" ;;
  esac
  printf "  ${col}%-10s${RESET}  %-8s  %s\n" "$id" "$pri" "$title"
done

TOTAL=$(find "$TASKS" -name "*.md" -not -path "*/done/*" \
  -exec grep -l "^status: pending$" {} \; 2>/dev/null | wc -l | tr -d ' ')
printf "\n  ${DIM}%s pending total${RESET}\n" "$TOTAL"

# ── Completed tasks (done/) ───────────────────────────────────────────────────
sep
DONE_COUNT=$(find "$TASKS" -path "*/done/*.md" 2>/dev/null | wc -l | tr -d ' ')
IN_PROGRESS_COUNT=$(find "$TASKS" -name "*.md" -not -path "*/done/*" \
  -exec grep -l "^status: in-progress$" {} \; 2>/dev/null | wc -l | tr -d ' ')
ALL_TASKS=$((DONE_COUNT + IN_PROGRESS_COUNT + TOTAL))
printf "${BOLD}Progress${RESET}  ${GREEN}%s done${RESET}  ${YELLOW}%s active${RESET}  ${DIM}%s pending${RESET}  ${DIM}(%s total)${RESET}\n" \
  "$DONE_COUNT" "$IN_PROGRESS_COUNT" "$TOTAL" "$ALL_TASKS"
sep

# ── Recent commits ───────────────────────────────────────────────────────────
sep
printf "${BOLD}Recent commits${RESET}\n"
sep
git -C "$REPO" log --oneline -8 2>/dev/null | while IFS= read -r line; do
  printf "  ${DIM}%s${RESET}\n" "$line"
done

# ── Dev server ──────────────────────────────────────────────────────────────
sep
printf "${BOLD}Dev server${RESET}\n"
sep
DEV_PORT=3000
DEV_PID=$(ss -tlnp 2>/dev/null | awk -v p=":$DEV_PORT " '$0 ~ p {match($NF, /pid=([0-9]+)/, a); print a[1]}')
if [ -n "$DEV_PID" ]; then
  printf "  ${GREEN}✓${RESET}  http://localhost:%s  (PID %s)\n" "$DEV_PORT" "$DEV_PID"
else
  printf "  ${RED}✗${RESET}  Nothing on port %s — run: ${DIM}cd game && npm run dev${RESET}\n" "$DEV_PORT"
fi

# ── Last watchdog heartbeat ──────────────────────────────────────────────────
WLOG="$REPO/logs/watchdog.log"
if [ -f "$WLOG" ]; then
  sep
  printf "${BOLD}Last watchdog check${RESET}\n"
  sep
  tail -8 "$WLOG" | grep -v "^$" | while IFS= read -r line; do
    printf "  ${DIM}%s${RESET}\n" "$line"
  done
fi

sep
printf "  ${DIM}%s${RESET}\n\n" "$(date '+%Y-%m-%d %H:%M:%S %Z')"
