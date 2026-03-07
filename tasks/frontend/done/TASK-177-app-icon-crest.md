---
id: TASK-177
title: "iOS App Icon: use Ojibwe TD crest"
status: done
priority: critical
category: frontend
phase: release
depends_on: []
created: 2025-03-07
---

## Description

The iOS app icon is currently a solid near-black square (`#0a0e0a`). It needs to display the Ojibwe TD thunderbird crest from the splash screen.

The source crest is at `public/assets/ui/logo.png` (661×377, non-square with transparent/dark background). Need to generate a proper 1024×1024 app icon:

- Dark forest background matching the game's palette (`#0a0e0a` or similar)
- Crest centered and scaled to fill most of the square, with some padding
- No transparency (Apple requirement)
- No rounded corners (Apple adds them automatically)

## Files to Update

- `ios/App/App/Assets.xcassets/AppIcon.appiconset/app-icon-1024.png` — 1024×1024
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` — 1024×1024 (same)
- Verify `Contents.json` references are correct

## Acceptance Criteria

- [ ] App icon shows the thunderbird crest on dark background
- [ ] Icon is 1024×1024 PNG, no transparency, no rounded corners
- [ ] Icon visible and recognizable on the iPhone home screen
- [ ] Both `app-icon-1024.png` and `AppIcon-512@2x.png` updated
- [ ] `npx cap sync ios` run after update

## Notes

- Can use `sips` or ImageMagick to composite: create 1024×1024 dark bg, overlay scaled crest centered.
- The crest is wider than tall — scale to fit width with vertical centering, or consider a slight zoom/crop to fill more of the square.
