#!/usr/bin/env bash
# new-task.sh
# Manually create a new task file from the template.
#
# Usage:
#   ./tasks/scripts/new-task.sh --title "Implement X" --category backend --phase 3
#   ./tasks/scripts/new-task.sh --title "Add HUD timer" --category frontend

set -euo pipefail

TASKS_DIR="tasks"
DATE=$(date +%Y-%m-%d)

TITLE=""
CATEGORY=""
PHASE="0"

while [[ $# -gt 0 ]]; do
  case $1 in
    --title)    TITLE="$2";    shift 2 ;;
    --category) CATEGORY="$2"; shift 2 ;;
    --phase)    PHASE="$2";    shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# Validate
if [[ -z "$TITLE" || -z "$CATEGORY" ]]; then
  echo "Usage: $0 --title \"Task title\" --category backend|frontend|infrastructure [--phase N]"
  exit 1
fi

if [[ ! "$CATEGORY" =~ ^(backend|frontend|infrastructure)$ ]]; then
  echo "Error: --category must be one of: backend, frontend, infrastructure"
  exit 1
fi

# Generate ID from existing file count + 1
existing=$(find "$TASKS_DIR" -name "*.md" ! -name "_template.md" | wc -l | tr -d ' ')
id_num=$(( existing + 1 ))
ID=$(printf "TASK-%03d" "$id_num")

# Slugify title
slug=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
outfile="$TASKS_DIR/$CATEGORY/pending/${slug}.md"

cat > "$outfile" <<EOF
---
id: ${ID}
title: ${TITLE}
status: pending
category: ${CATEGORY}
phase: ${PHASE}
openspec_ref: ""
depends_on: []
created: ${DATE}
---

## Description

<!-- Describe what needs to be built and why. -->

## Acceptance Criteria

- [ ]

## Notes

<!-- Any blockers, links, or context. -->
EOF

echo "✔ Created: $outfile"
echo "  ID:       $ID"
echo "  Category: $CATEGORY"
echo "  Edit the file to fill in description and acceptance criteria."
