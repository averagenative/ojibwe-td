---
id: TASK-173
title: "Codex: palette update, touch scroll, description tap fix"
status: pending
category: frontend
phase: release
priority: medium
depends_on: []
created: 2025-03-07
---

## Description

The Codex scene (`CodexScene.ts`) has several mobile UX issues:

1. **Hacker green palette** — needs the same palette update as Meta Upgrades. Match the main menu's earthy color scheme.
2. **Description panel closes on tap** — when viewing a codex entry (e.g. Nokomis), tapping inside the description text area to scroll closes the panel. Taps within the description area should NOT close it; only a dedicated close/back button should.
3. **Teachings list not scrollable** — the left-side list of teachings (and other categories) can't be scrolled with finger drag on mobile, so locked entries below the fold are inaccessible.

## Screenshots

- See `troubleshoot/8F4856C4-0BFB-49D3-B1E7-B85646D019F8.png` — Codex Beings tab
- See `troubleshoot/D362E5CC-43C0-42EC-8957-982793C17BF4.png` — Codex Teachings tab (can't scroll to see all)

## Acceptance Criteria

- [ ] Color palette updated to match MainMenuScene
- [ ] Tapping inside a codex entry's description area does NOT close the entry
- [ ] Description text area is scrollable with finger drag
- [ ] Left-side entry list (Beings, Teachings, etc.) scrollable via touch drag
- [ ] All locked entries reachable by scrolling
