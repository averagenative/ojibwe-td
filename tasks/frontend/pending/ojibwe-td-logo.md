---
id: TASK-040
title: Generate & Integrate Ojibwe TD Logo
status: pending
priority: low
phase: polish
---

# Generate & Integrate Ojibwe TD Logo

## Goal

Create a proper logo for Ojibwe TD and wire it into the main menu and any
future loading screens.

## Logo Generation (automated — run the script, then pick one)

A dedicated script generates all three variants in one go:

```bash
node scripts/generate-logo.js
```

Output lands in `game/public/assets/logo-review/`:
- `logo-v1-text.png` — text-forward (square, 1024×1024)
- `logo-v2-emblem.png` — circular badge with thunderbird (square, 1024×1024)
- `logo-v3-banner.png` — horizontal panel, bird left / text right (1792×1024)

Review the three images, pick one, then:

```bash
# Copy the winner
cp game/public/assets/logo-review/logo-vN-*.png game/public/assets/ui/logo.png

# Optional: strip white background
node scripts/remove-backgrounds.js --only ui
```

## Integration Acceptance Criteria

- [ ] `game/public/assets/ui/logo.png` exists (1:2 ratio, e.g. 512×256)
- [ ] `BootScene.preload()` loads it as texture key `logo`
- [ ] `MainMenuScene` displays the logo image at the top-centre of the screen
  replacing or complementing the current text title
- [ ] The existing text title ("OJIBWE TD") is hidden or used as a fallback if
  the texture is missing
- [ ] Logo scales correctly on mobile (375 px wide) — use
  `setDisplaySize` with `Math.min(width * 0.7, 512)` or similar

## Notes

- The `game/public/assets/ui/` directory may need to be created
- Logo does not need to match a specific pixel dimension — adjust MainMenuScene
  layout to fit whatever looks good
- If the DALL-E output doesn't look right, iterate on the prompt in ChatGPT
  before committing the image; this task only needs ONE good logo
