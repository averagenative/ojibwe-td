---
id: TASK-101
title: Codex — Icons for Beings, Places, Commanders
status: done
category: frontend
priority: medium
depends_on: []
created: 2026-03-02
---

## Description

The codex entries for beings, places, commanders, and other categories need icons/thumbnails.
Currently entries are text-only with no visual identifier. Adding small icons makes the codex
more engaging and easier to scan.

## Acceptance Criteria

- [ ] Each codex category has a representative icon/symbol
- [ ] Individual codex entries have a small thumbnail or icon where appropriate
- [ ] Commanders reuse their existing portrait assets
- [ ] Beings/creatures can use the existing creep/boss sprites where applicable
- [ ] Places/locations get simple symbolic icons (tree, mountain, water, etc.)
- [ ] Icons display at a consistent size in the codex list view
- [ ] `npm run typecheck` clean

## Notes

- Existing assets: commander portraits (`portrait-*.png`), boss sprites (`boss-*.png`), creep sprites
- May need new simple icons for places/concepts — can use the gen_icons.py pipeline
- CodexScene.ts handles the codex UI — check how entries are rendered
- Keep icons small (32×32 or 24×24) to not overwhelm the text
