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

## Logo Generation (manual step — do via ChatGPT/DALL-E)

Generate the logo image manually via ChatGPT with DALL-E, then save it to
`game/public/assets/ui/logo.png`.

**Suggested prompt:**

> Ojibwe TD — game logo, Anishinaabe Woodland art style, bold geometric flat
> illustration, clean thick black outlines, limited palette of 4 colours:
> forest green #2D5016, marsh green #6B8F3E, lake blue #4A7FA5, warm cream
> #e8dcc8. The words "Ojibwe TD" in large stylised text with Woodland-art
> decorative elements — feathers, birchbark scroll border, medicine wheel
> motif, or eagle silhouette. Pure white background or transparent.
> No photorealism, no gradients, no drop shadows. Square format 1024×1024.

**Variants to try:**
1. Text-forward: large "OJIBWE TD" lettering with small decorative border
2. Emblem: circular badge design with text + central icon (eagle or thunderbird)
3. Horizontal banner: text left, icon right — suitable for a header

**Post-processing:**
- Strip background via `node scripts/remove-backgrounds.js` (or remove.bg web)
- Resize to 512×256 (or whatever fits the main menu layout) via
  `scripts/resize-assets.js` with a custom size entry
- Save final to `game/public/assets/ui/logo.png`

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
