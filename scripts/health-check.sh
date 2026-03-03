#!/usr/bin/env bash
# scripts/health-check.sh
#
# Scans Ojibwe TD source for stubs, fake implementations, broken integrations,
# and unimplemented TODOs. Creates task files for each finding and updates ROADMAP.md.
#
# Designed to be safe to run as a cron job (idempotent, lock-protected, logged).
#
# Usage:
#   ./scripts/health-check.sh              # full scan, create tasks
#   ./scripts/health-check.sh --dry-run    # print findings only, no task files written
#
# Cron example (nightly at 2 am):
#   0 2 * * * /home/dmichael/projects/greentd/scripts/health-check.sh \
#             >> /home/dmichael/projects/greentd/logs/health-check.log 2>&1

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────────

REPO_DIR="/home/dmichael/projects/greentd"
GAME_SRC="$REPO_DIR/game/src"
TASKS_OUT="$REPO_DIR/tasks/health/pending"
ROADMAP="$REPO_DIR/docs/ROADMAP.md"
LOG_DIR="$REPO_DIR/logs"
LOCK_FILE="/tmp/greentd-health.lock"
MODEL="sonnet"   # Sonnet is sufficient for pattern-finding; Opus is ~5× more expensive

DRY_RUN=false
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$LOG_DIR/health-$TIMESTAMP.log"

# ── Helpers ────────────────────────────────────────────────────────────────────

log()  { echo "[health $(date +%H:%M:%S)] $*" | tee -a "$LOG_FILE"; }
die()  { log "ERROR: $*"; exit 2; }
hr()   { echo "" | tee -a "$LOG_FILE"; log "────────────────────────────────────────"; }

# ── Args ───────────────────────────────────────────────────────────────────────

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    *) die "Unknown argument: $arg" ;;
  esac
done

# ── Lock ───────────────────────────────────────────────────────────────────────

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[health] Another health-check is already running — exiting." >&2
  exit 0
fi
trap 'flock -u 9; rm -f "$LOCK_FILE"' EXIT

# ── Setup ──────────────────────────────────────────────────────────────────────

mkdir -p "$LOG_DIR" "$TASKS_OUT"
hr
log "=== Ojibwe TD Health Check — $TIMESTAMP ==="
$DRY_RUN && log "(DRY RUN — no task files will be written)"
hr

# ── Phase 1: Fast grep pass ────────────────────────────────────────────────────
#
# Collect obvious markers from source files without needing Claude.
# Output: TSV lines of  TYPE<TAB>FILE:LINE<TAB>SNIPPET

GREP_FINDINGS_FILE=$(mktemp /tmp/health_grep_XXXXXX.tsv)

log "Phase 1: grep scan for markers…"

grep_find() {
  local type="$1" pattern="$2"
  grep -rn --include="*.ts" -E "$pattern" "$GAME_SRC" 2>/dev/null \
    | while IFS=: read -r file line content; do
        printf '%s\t%s:%s\t%s\n' "$type" "$file" "$line" "$(echo "$content" | xargs)"
      done || true
}

{
  grep_find "TODO"      "//\s*(TODO|FIXME|HACK|STUB|XXX)[:\s]"
  grep_find "THROW_NI"  "throw new Error\(['\"]not implemented"
  grep_find "EMPTY_FN"  "^\s*[a-zA-Z_]+\s*\([^)]*\)\s*\{\s*\}\s*$"
  grep_find "FAKE_RET"  "return\s+(null|undefined|\[\]|\{\}|0|false|'');\s*(\/\/\s*(stub|fake|placeholder|todo))?"
  grep_find "ANY_TYPE"  ":\s*any(\b|;|,|\))"
  grep_find "AS_CAST"   "\)\s+as\s+[A-Z]"
} >> "$GREP_FINDINGS_FILE"

GREP_COUNT=$(wc -l < "$GREP_FINDINGS_FILE" | tr -d ' ')
log "Phase 1 complete — $GREP_COUNT grep findings."

# ── Phase 2: Claude semantic analysis ─────────────────────────────────────────
#
# Claude reads the source and identifies issues that regex can't catch:
# - Functions that look implemented but return hardcoded/wrong values
# - Systems instantiated but never wired into the scene
# - Events emitted with no subscriber (or subscribed with no emitter)
# - Missing destroy() / cleanup for new systems
# - Integration seams that are stubbed in one layer but real in another

log "Phase 2: Claude semantic analysis (model: $MODEL)…"

CLAUDE_FINDINGS_FILE=$(mktemp /tmp/health_claude_XXXXXX.json)

ANALYSIS_PROMPT="You are a senior code auditor for Ojibwe TD — a Phaser 3 + TypeScript browser tower-defense game.

REPO ROOT : $REPO_DIR
GAME SRC  : $GAME_SRC

Your job: find real problems, not style nits. Look for:

1. STUB / FAKE IMPLEMENTATION
   Functions or methods whose body doesn't match the intent implied by their name/signature.
   E.g. getUpgradeCost() always returns 100, hasPoisonSpread() always returns false.

2. UNWIRED INTEGRATION
   A class or system that exists but is never instantiated or connected in GameScene or any scene.
   Events emitted by a system that no scene listener ever subscribes to.
   Event names subscribed to that are never emitted anywhere.

3. MISSING DESTROY / CLEANUP
   Systems or UI panels that register Phaser event listeners but have no destroy() that removes them.
   Timers (setInterval/setTimeout) started without cleanup.

4. TODO / DEFERRED LOGIC
   Code paths that skip real work with a comment or early return, where the task required real work.

5. TYPE SAFETY HOLES
   Places where \`any\` or unsafe \`as\` casts could hide runtime errors.

Steps:
1. Read all TypeScript files under $GAME_SRC recursively.
2. For each finding, output a JSON object on its own line (NDJSON):
   {
     \"category\": \"STUB|UNWIRED|MISSING_CLEANUP|TODO|TYPE_HOLE\",
     \"file\": \"relative/path/from/game/src\",
     \"line\": 42,
     \"title\": \"One-line summary (≤ 80 chars)\",
     \"detail\": \"Two to four sentences explaining why this is a problem and what the fix is.\",
     \"severity\": \"high|medium|low\"
   }
3. Output ONLY the NDJSON lines — no preamble, no summary, no markdown.
4. If you find zero issues, output exactly: {\"category\":\"NONE\",\"title\":\"No issues found\"}
5. Limit to 20 findings maximum — prioritise by severity."

(
  cd "$REPO_DIR"
  unset CLAUDECODE
  claude \
    --dangerously-skip-permissions \
    -p \
    --model "$MODEL" \
    "$ANALYSIS_PROMPT"
) > "$CLAUDE_FINDINGS_FILE" 2>&1 || {
  log "WARNING: Claude analysis failed — continuing with grep findings only."
  echo '{"category":"NONE","title":"Claude analysis unavailable"}' > "$CLAUDE_FINDINGS_FILE"
}

CLAUDE_COUNT=$(grep -c '"category"' "$CLAUDE_FINDINGS_FILE" 2>/dev/null || echo 0)
log "Phase 2 complete — $CLAUDE_COUNT Claude findings."

# ── Phase 3: Create task files ─────────────────────────────────────────────────
#
# Merge grep + Claude findings into task files.
# Task filenames are derived from a short hash of the finding title so re-runs
# don't create duplicate files.

issues_created=0
issues_skipped=0

create_task() {
  local category="$1" title="$2" detail="$3" location="$4" severity="$5"

  # Derive a stable short ID from the title
  local slug
  slug=$(echo "$title" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | cut -c1-50)
  local hash
  hash=$(echo "$title$location" | md5sum | cut -c1-8)
  local filename="health-${hash}-${slug}.md"
  local filepath="$TASKS_OUT/$filename"

  # Skip if already exists (idempotent)
  if [ -f "$filepath" ]; then
    issues_skipped=$(( issues_skipped + 1 ))
    return
  fi

  if $DRY_RUN; then
    log "  [DRY RUN] Would create: $filename"
    log "    $category ($severity): $title"
    log "    Location: $location"
    return
  fi

  cat > "$filepath" <<TASKEOF
---
id: HEALTH-$hash
title: "$title"
status: pending
category: health
severity: $severity
source: health-check
location: $location
created: $(date +%Y-%m-%d)
---

## Finding

**Category:** $category
**Severity:** $severity
**Location:** \`$location\`

$detail

## Acceptance Criteria

- [ ] Investigate the reported location and confirm whether the issue is real
- [ ] If real: implement the correct behaviour / cleanup / wiring
- [ ] If false positive: add a comment explaining why and close this task
- [ ] Run \`cd $REPO_DIR/game && npm run check\` — must exit 0
- [ ] Verify fix is covered by an existing or new unit test

## Notes

Auto-generated by \`scripts/health-check.sh\` on $(date +%Y-%m-%d).
If this is a false positive, delete this file.
TASKEOF

  issues_created=$(( issues_created + 1 ))
  log "  Created: $filename"
}

log "Phase 3: creating task files…"

# Process grep findings
while IFS=$'\t' read -r type location snippet; do
  [ -z "$type" ] && continue
  case "$type" in
    TODO)      create_task "TODO"          "Unresolved TODO/FIXME marker"              "Marker found in new code: $snippet" "$location" "medium" ;;
    THROW_NI)  create_task "STUB"          "Not-implemented stub still present"        "'throw new Error(not implemented)' found — replace with real logic." "$location" "high" ;;
    EMPTY_FN)  create_task "STUB"          "Empty function body"                       "Function has an empty body {}. Either implement it or remove it." "$location" "medium" ;;
    FAKE_RET)  create_task "STUB"          "Suspicious placeholder return value"       "Returns a trivial value (null/[]/{}). Verify this is intentional." "$location" "low" ;;
    ANY_TYPE)  create_task "TYPE_HOLE"     "Use of 'any' type"                        "Replace 'any' with a proper type or 'unknown' + narrowing." "$location" "medium" ;;
    AS_CAST)   create_task "TYPE_HOLE"     "Unsafe 'as' type cast"                    "Type assertion hides a potential mismatch. Use a type guard instead." "$location" "low" ;;
  esac
done < "$GREP_FINDINGS_FILE"

# Process Claude findings (NDJSON)
while IFS= read -r line; do
  [ -z "$line" ] && continue
  category=$(echo "$line" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('category','NONE'))" 2>/dev/null || echo "NONE")
  [ "$category" = "NONE" ] && continue

  title=$(echo "$line"    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('title',''))"    2>/dev/null || echo "")
  detail=$(echo "$line"   | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('detail',''))"   2>/dev/null || echo "")
  file=$(echo "$line"     | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file',''))"     2>/dev/null || echo "")
  linenum=$(echo "$line"  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('line',''))"     2>/dev/null || echo "")
  severity=$(echo "$line" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('severity','medium'))" 2>/dev/null || echo "medium")

  [ -z "$title" ] && continue
  location="${file}:${linenum}"
  create_task "$category" "$title" "$detail" "$location" "$severity"
done < "$CLAUDE_FINDINGS_FILE"

# ── Phase 4: Update ROADMAP.md health section ──────────────────────────────────

log "Phase 4: updating ROADMAP.md…"

TOTAL=$(( issues_created + issues_skipped ))

if ! $DRY_RUN && [ -f "$ROADMAP" ]; then
  HEALTH_BLOCK="<!-- HEALTH_CHECK_START -->
Last run: $(date '+%Y-%m-%d %H:%M:%S')
Findings: $TOTAL total ($issues_created new task files created, $issues_skipped already tracked)
Task files: $TASKS_OUT/
<!-- HEALTH_CHECK_END -->"

  # Replace between the sentinel comments
  python3 - <<PYEOF
import re, pathlib
path = pathlib.Path("$ROADMAP")
content = path.read_text()
block = """$HEALTH_BLOCK"""
updated = re.sub(
    r'<!-- HEALTH_CHECK_START -->.*?<!-- HEALTH_CHECK_END -->',
    block,
    content,
    flags=re.DOTALL
)
path.write_text(updated)
PYEOF
  log "ROADMAP.md updated."
fi

# ── Summary ────────────────────────────────────────────────────────────────────

hr
log "=== Health check complete ==="
log "  Grep findings   : $GREP_COUNT"
log "  Claude findings : $CLAUDE_COUNT"
log "  Tasks created   : $issues_created"
log "  Tasks skipped   : $issues_skipped (already tracked)"
log "  Log             : $LOG_FILE"
$DRY_RUN && log "  (DRY RUN — no files written)"
hr

# Cleanup temp files
rm -f "$GREP_FINDINGS_FILE" "$CLAUDE_FINDINGS_FILE"

# Exit 1 if any new issues were found (useful for CI)
[ "$issues_created" -gt 0 ] && exit 1
exit 0
