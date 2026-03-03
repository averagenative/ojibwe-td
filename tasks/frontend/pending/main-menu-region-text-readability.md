---
id: TASK-093
title: Main Menu Region Text Readability
status: in-progress
category: frontend
priority: high
depends_on: []
created: 2026-03-02
---

## Description

The text under region names on the main menu screen is hard to read. Likely too dim,
too small, or insufficient contrast against the background. Improve readability.

## Acceptance Criteria

- [ ] Region names and descriptions are clearly legible on the main menu
- [ ] Text has sufficient contrast against the background (WCAG AA minimum)
- [ ] Font size is adequate for both desktop and mobile
- [ ] Consistent with overall game palette (don't just make everything white)
- [ ] `npm run typecheck` clean

## Notes

- Check `MainMenuScene.ts` for the region label text styling
- May need brighter color, larger font, text shadow/outline, or a semi-transparent backdrop
- Playtest feedback: "still hard to read under regions"
