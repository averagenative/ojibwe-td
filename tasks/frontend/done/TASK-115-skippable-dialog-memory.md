---
id: TASK-115
title: Skippable Mishoomis Dialog & Story Memory on Resume
priority: high
status: done
type: feature
creative: true
---

# Skippable Mishoomis Dialog & Story Memory on Resume

## Problem
1. Mishoomis dialog/cutscenes cannot be skipped — players who have seen them before are forced to watch again.
2. When resuming a run (session persistence), previously-seen dialogs replay, breaking immersion and wasting time.

## Goal
Make all story dialog skippable and track which dialogs have been seen so they don't replay on resume.

## Requirements
- **Skip button** — add a "Skip" or ">>>" button to all story cutscene/dialog sequences; clicking it immediately closes the dialog and proceeds to the next game phase
- **Seen-dialog memory** — track which dialog IDs have been displayed during a run (store in autosave state via SessionManager)
- **On resume** — check seen-dialog set; do not replay any dialog that was already shown in the current run
- **First play** — dialogs still play normally on first encounter
- Skip button should be visible but not intrusive (bottom-right corner, small text like "Skip ▶")
- Mobile: skip button must meet 44px touch target minimum
