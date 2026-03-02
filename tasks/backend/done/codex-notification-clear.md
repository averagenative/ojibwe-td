---
id: TASK-087
title: Codex Notification Badge — Clear on View
status: done
priority: high
phase: bugfix
---

# Codex Notification Badge — Clear on View

## Problem

The Codex button shows a notification badge with a number (indicating new/unread
entries), but there is no way to clear it. Viewing the entries in the Codex does
not mark them as read, so the badge number persists forever and becomes noise.

## Goal

Mark codex entries as "read" when the player views them, and clear the notification
badge count accordingly.

## Acceptance Criteria

- [ ] Opening a codex entry marks it as "read"
- [ ] The notification badge count reflects only unread entries
- [ ] Badge disappears entirely when all entries are read (count = 0)
- [ ] Read/unread state persists across sessions (saved via SaveManager)
- [ ] Newly unlocked codex entries start as "unread" and increment the badge
- [ ] Optional: visual distinction between read and unread entries in the list
  (e.g., bold title for unread, normal weight for read)
- [ ] Optional: "Mark all as read" button in the Codex scene
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes

## Implementation Hints

- Check `src/scenes/CodexScene.ts` for current codex entry rendering
- SaveManager needs a new field: `readCodexEntries: string[]` (array of entry IDs)
- The badge is likely rendered in `MainMenuScene.ts` — find where the count is
  calculated and filter out read entries
- When a codex entry is selected/opened in CodexScene, add its ID to the read list
  and persist via SaveManager
