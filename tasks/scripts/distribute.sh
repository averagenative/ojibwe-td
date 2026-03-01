#!/usr/bin/env bash
# distribute.sh
# Parses openspec/changes/greentd-project/tasks.md and creates one task file
# per phase in the correct category folder (infrastructure/backend/frontend).
#
# Usage:
#   ./tasks/scripts/distribute.sh              # distribute all phases
#   ./tasks/scripts/distribute.sh --phase 1   # distribute a single phase

set -euo pipefail

TASKS_MD="openspec/changes/greentd-project/tasks.md"
TASKS_DIR="tasks"
DATE=$(date +%Y-%m-%d)
SINGLE_PHASE=""

# Parse flags
while [[ $# -gt 0 ]]; do
  case $1 in
    --phase) SINGLE_PHASE="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# Phase → category mapping
category_for_phase() {
  case $1 in
    1)           echo "infrastructure" ;;
    2|3|4|5|6)  echo "backend" ;;
    7|8|9|10|11) echo "frontend" ;;
    *)           echo "backend" ;;
  esac
}

# Phase → slug mapping
slug_for_phase() {
  case $1 in
    1)  echo "project-scaffold" ;;
    2)  echo "walking-skeleton" ;;
    3)  echo "core-td-loop" ;;
    4)  echo "tower-archetypes" ;;
    5)  echo "wave-system" ;;
    6)  echo "tower-upgrades" ;;
    7)  echo "roguelike-offers" ;;
    8)  echo "run-loop-game-states" ;;
    9)  echo "meta-progression" ;;
    10) echo "second-map" ;;
    11) echo "polish-balance" ;;
    *)  echo "phase-$1" ;;
  esac
}

current_phase=0
current_title=""
task_lines=()

flush_phase() {
  [[ $current_phase -eq 0 ]] && return
  [[ -n "$SINGLE_PHASE" && "$current_phase" != "$SINGLE_PHASE" ]] && return
  [[ ${#task_lines[@]} -eq 0 ]] && return

  local category slug outfile
  category=$(category_for_phase "$current_phase")
  slug=$(slug_for_phase "$current_phase")
  outfile="$TASKS_DIR/$category/pending/phase-${current_phase}-${slug}.md"

  # Build acceptance criteria block from task lines
  local criteria=""
  for line in "${task_lines[@]}"; do
    # Strip the "- [ ] N.M " prefix, keep the description
    local desc
    desc=$(echo "$line" | sed 's/^- \[ \] [0-9]*\.[0-9]* //')
    criteria+="- [ ] ${desc}"$'\n'
  done

  cat > "$outfile" <<EOF
---
id: TASK-$(printf "%02d" "$current_phase")
title: ${current_title}
status: pending
category: ${category}
phase: ${current_phase}
openspec_ref: "Phase ${current_phase}"
depends_on: []
created: ${DATE}
---

## Description

Phase ${current_phase} of the GreenTD implementation. See proposal.md for full context.

## Acceptance Criteria

${criteria}
## Notes

See openspec/changes/greentd-project/tasks.md Phase ${current_phase} for the full task list.
EOF

  echo "  ✔ Created: $outfile (${#task_lines[@]} tasks)"
}

echo "Distributing tasks from $TASKS_MD..."
echo ""

while IFS= read -r line; do
  # Detect phase header: ## N. Phase Name
  if [[ "$line" =~ ^##\ ([0-9]+)\.\ (.+)$ ]]; then
    flush_phase
    current_phase="${BASH_REMATCH[1]}"
    current_title="${BASH_REMATCH[2]}"
    task_lines=()
  # Collect task lines: - [ ] N.M Description
  elif [[ "$line" =~ ^-\ \[.?\]\ [0-9]+\.[0-9]+\  ]]; then
    task_lines+=("$line")
  fi
done < "$TASKS_MD"

# Flush the last phase
flush_phase

echo ""
echo "Done. Run 'find tasks -name \"*.md\" | grep -v _template | sort' to see all task files."
