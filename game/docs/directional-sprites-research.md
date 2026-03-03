# Directional Creep Sprites — Research & Implementation Options

**Status:** Research complete — no implementation yet
**Date:** 2026-03-03
**Related task:** TASK-118

---

## 1. Current State

### How creep direction tracking works

`Creep.ts` tracks a `direction: CreepDirection` field ('left' | 'right' | 'up' | 'down'). This is computed every frame by `computeDirection(dx, dy)` from `src/data/pathing.ts` and updated via `updateDirectionalVisual()` on each direction change.

### `updateDirectionalVisual()` — sprite path

When `config.spriteKey` is present and the texture exists, Phaser creates a `Phaser.GameObjects.Image` (`bodyImage`). The current directional transform applies:

```
// LEFT:  flipX = true,  rotation = 0
// RIGHT: flipX = false, rotation = 0
// DOWN:  flipX = false, rotation = +π/2  (90° clockwise)
// UP:    flipX = false, rotation = -π/2  (90° counter-clockwise)

bodyImage.setDisplaySize(BODY_HORIZ_W, BODY_HORIZ_H);  // always horizontal dims
// → BODY_HORIZ_W = 30px,  BODY_HORIZ_H = 18px
```

The `setDisplaySize` always uses horizontal proportions. The 90° rotation then causes the width/height to swap visually, producing a taller silhouette for vertical movement.

### The visual problem

The sprite is designed as a **side-view** animal (left/right facing). When the creep moves up or down, the same side-view sprite is rotated 90°:

- Moving **down**: the sprite appears to lie on its right side — the animal's head points left and its belly faces the player, like a toppled figurine.
- Moving **up**: same asset, but the animal's head points right.

This looks unnatural because the art was composed for a horizontal silhouette. Players can see this especially clearly on maps with long vertical path segments.

### Rectangle fallback

When no sprite texture is available, `bodyRect` (a `Phaser.GameObjects.Rectangle`) is resized:

```
Horizontal: 30×18 px  →  BODY_HORIZ_W × BODY_HORIZ_H
Vertical:   18×30 px  →  BODY_VERT_W  × BODY_VERT_H
```

The rectangle path already handles vertical correctly (taller shape, no rotation). No fix needed here.

### Current sprite inventory

16 sprite files exist in `public/assets/sprites/` (13 are preloaded in BootScene; `creep-boss`, `creep-boss-mini`, and `creep-flying` exist on disk but are not registered as texture keys):

| Key | Type | Notes |
|-----|------|-------|
| `creep-normal` | ground | standard |
| `creep-fast` | ground | fast |
| `creep-armored` | ground | armored |
| `creep-immune` | ground | immune |
| `creep-regen` | ground | regen |
| `creep-boss` | ground | generic boss |
| `creep-boss-mini` | ground | generic mini boss |
| `creep-flying` | air | generic air |
| `creep-air-basic` | air | basic |
| `creep-air-scout` | air | scout |
| `creep-air-armored` | air | armored |
| `boss-makwa` | ground | named boss |
| `boss-migizi` | air | named boss |
| `boss-waabooz` | ground | named boss |
| `boss-animikiins` | ground | named boss |
| `boss-waabooz-mini` | ground | split fragment |

---

## 2. Option A — 2-Frame Approach (side + front/back)

### Concept

Keep the existing side-view sprite for left/right movement. Add one new **vertical sprite** per creep type, used for both up and down movement. Optionally flip it vertically (`flipY`) to distinguish approaching vs receding.

```
direction = 'left'   → texture: '{key}',      flipX: true,  flipY: false, rotation: 0
direction = 'right'  → texture: '{key}',      flipX: false, flipY: false, rotation: 0
direction = 'down'   → texture: '{key}-vert', flipX: false, flipY: false, rotation: 0
direction = 'up'     → texture: '{key}-vert', flipX: false, flipY: true,  rotation: 0
```

If a `{key}-vert` texture is absent, fall back to the current rotation behaviour (graceful degradation).

### Asset requirements

- **13 new PNGs** (one `-vert` variant per preloaded sprite key; the 3 unused sprites on disk can be skipped)
- Recommended size: 18×30 px (matching `BODY_VERT_W × BODY_VERT_H`) for standard creeps; 36×56 px for bosses (matching `BOSS_VERT_W × BOSS_VERT_H`)
- Design: a **top-down or isometric front/back** view of the animal — e.g. the back of a deer's haunches when walking away, or the face/chest when approaching
- Air creeps are already viewed from above conceptually, so a vert sprite can be largely symmetric; it may look reasonable using the same sprite with a Y-flip if top-down silhouette is circular
- Boss variants (4) need careful art since they are large and detailed

### Code changes required

`updateDirectionalVisual()` in `Creep.ts`:
1. Determine `textureKey` based on `isHoriz`: `config.spriteKey` (horiz) or `${config.spriteKey}-vert` (vert)
2. Check if texture exists: `this.scene.textures.exists(textureKey)`
3. If vert texture exists: swap to it, no rotation, optionally `flipY` for up/down distinction
4. If missing: fall back to current rotation behaviour (unchanged)
5. `setDisplaySize` uses horiz or vert constants depending on direction

`BootScene.ts`:
- Preload all `-vert` variants with `this.load.image('{key}-vert', 'assets/sprites/{key}-vert.png')` — add to `_loadAssets()`

### Effort: **Small–Medium**

- Art: 13 new PNG renders (~1–2 hours per sprite if hand-drawn; faster with procedural generation script)
- Code: ~30 lines in `updateDirectionalVisual()` + 13 preload calls in BootScene
- Tests: ~10 structural tests verifying texture fallback and flip logic
- No changes to animation system, effect overlays, or overlay geometry (they already use `_getBodyGeometry()` which could be updated to skip rotation for vert)

---

## 3. Option B — 4-Direction Spritesheets

### Concept

Replace each creep's single PNG with a spritesheet containing 4 rows (or frames), one per direction: right, down, up, (left = flip of right). Phaser's animation system plays the correct row as the creep moves.

```
Row 0: right  (frames 0–N)
Row 1: down   (frames 0–N)
Row 2: up     (frames 0–N)
Row 3: left   (= right row, flipX: true — no separate art needed)
```

Alternatively, use 4 separate PNG atlas frames without animation (single-frame per direction), keeping the existing procedural squash-stretch system.

### Variants

**B1 — Static per-direction frames** (simplest spritesheet approach):
Each spritesheet has 4 frames (right, down, up, left). Phaser uses `setFrame()` on direction change. The existing procedural walk-animation system handles squash-stretch on top. This is additive to the current system.

**B2 — Animated spritesheets**:
Each row is a walk-cycle (e.g. 4–8 frames). Phaser plays `anim-{key}-right`, `anim-{key}-down`, etc. This replaces the procedural squash-stretch for sprite-path creeps.

### Asset requirements (B1 — static frames)

- **13 spritesheets** replacing existing single-frame PNGs (one per preloaded sprite key)
- Each spritesheet: 3 unique views (right, down, up; left is mirrored) × 1 frame each
- Effective new art: ~26 new views (13 side views already exist; 13 down + 13 up = 26 new)
- Spritesheet layout: `(3 × frame_width) × frame_height` or atlas JSON

### Asset requirements (B2 — animated walk-cycles)

- ~42+ new frames per creep type (3 unique directions × 4–8 frames each)
- Full rework of BootScene loading and animation registration
- Largest art scope in this research

### Code changes required (B1)

1. Convert each PNG to a 3-frame spritesheet in BootScene (`this.load.spritesheet(...)`)
2. `buildVisuals()`: create `Phaser.GameObjects.Sprite` instead of `Phaser.GameObjects.Image`
3. `updateDirectionalVisual()`: call `bodySprite.setFrame(FRAME_BY_DIR[direction])` + flipX for left; no rotation
4. `_getBodyGeometry()`: return correct dimensions per direction without rotation offset
5. Effect overlays: no rotation needed — use per-direction dimensions only

### Effort: **Large** (B2) / **Medium-Large** (B1)

- B1 art: ~26 new directional views across all creep types
- B1 code: moderate — changes in buildVisuals, updateDirectionalVisual, BootScene, geometry
- B2 art: full walk-cycle animation for all creep types — very large scope
- Both options require significant BootScene loading refactor and geometry system updates
- B2 also requires reworking the entire procedural walk-anim system for sprite creeps

---

## 4. Option C — Procedural Rotation / Skew

### Concept

Instead of art changes, alter the visual representation of the existing single side-view sprite when moving vertically, using scale transforms to simulate depth.

**Sub-option C1 — Narrow silhouette (X-compression)**:
When moving up/down, squash the sprite on X (e.g. `scaleX *= 0.4`) to make it appear thin, as if you're looking at the animal head-on or from behind. The sprite still shows the side-view art, but compressed, which reads as a "thinner silhouette."

```
// Current:  rotation ±π/2 (full 90° — shows belly or back rotated)
// Proposed: rotation 0,  scaleX *= 0.35,  scaleY unchanged
```

**Sub-option C2 — Angled tilt**:
Apply a small rotation (e.g. ±15°) plus Y-offset bobbing with slightly different amplitude for vertical movement. This gives a subtle sense of movement direction without a full 90° rotation. Still the side-view art.

**Sub-option C3 — Perspective Y-scale**:
When moving up: compress Y slightly (e.g. `scaleY = 0.85`) to suggest the animal is farther away. When moving down: expand Y slightly (e.g. `scaleY = 1.1`). No rotation. No new assets.

### Assessment

All C variants are low-cost but **don't solve the core visual problem**: players still see a side-view animal when the creep walks toward or away from them. The narrow silhouette (C1) is the most legible of the three, and may be acceptable at small sprite sizes (30×18 px), but it won't read as a "front/back view" — it reads as "a thin version of the side sprite."

For the current game's art style (pixel-art animals, 30px wide), C1 may be more than good enough at fast scroll distances. It's worth considering as a zero-asset "good enough" improvement over the current 90° rotation.

### Code changes required (C1)

In `updateDirectionalVisual()`:
```ts
if (!isHoriz && this.bodyImage) {
  this.bodyImage.setRotation(0);
  this.bodyImage.setDisplaySize(
    (this.isBossCreep ? BOSS_HORIZ_W : BODY_HORIZ_W) * 0.35,
    this.isBossCreep ? BOSS_HORIZ_H * 1.2 : BODY_HORIZ_H * 1.2,
  );
  // Flip direction to indicate up vs. down (subtle: opposite head tilt)
  this.bodyImage.flipY = this.direction === 'up';
}
```

### Effort: **Small** (zero art / ~20 lines of code)

---

## 5. Asset Pipeline Changes

### Current pipeline

- Sprites are hand-crafted PNGs stored in `public/assets/sprites/`
- BootScene loads them with `this.load.image(key, path)` in `_loadAssets()`
- No build-time processing; assets are shipped as-is

### Changes required per option

| Option | Pipeline additions |
|--------|--------------------|
| A | 13 new PNGs → preload 13 new `image()` calls in BootScene |
| B1 | 13 spritesheets → convert load calls to `spritesheet()` with frame config |
| B2 | 13 animated spritesheets + JSON atlases → full animation registration in BootScene |
| C | Zero — no new assets |

### Generation script considerations (Options A and B)

If sprites are generated programmatically (Python PIL / Pillow, similar to `scripts/gen_icons.py`):
- Option A: `gen_creep_vert.py` — render each creep type from a front/back isometric view at 18×30 px; export `{key}-vert.png`
- Option B1: `gen_creep_spritesheet.py` — pack right + down + up frames into a 3-column spritesheet PNG per creep; output frame dimensions in `vite.config.ts` or a JSON manifest

For boss sprites (hand-drawn PNGs like `boss-makwa.png`): vertical variants would need manual art or AI-assisted generation to match the existing style.

### How many new PNGs

| Option | New PNGs |
|--------|----------|
| A | 13 (one `-vert` per preloaded sprite key) |
| B1 | 13 spritesheets (replace existing 13 preloaded PNGs) |
| B2 | 13 spritesheets with ~12–32 frames each |
| C | 0 |

---

## 6. Effort Estimates

| Option | Art | Code | Tests | Total |
|--------|-----|------|-------|-------|
| A (2-frame, vert sprite) | Medium — 13 new PNGs, top-down/isometric views | Small — ~50 lines, BootScene preloads | Small — ~12 tests | **Small–Medium** |
| B1 (static per-dir frames) | Medium-Large — 26 new directional views | Medium — buildVisuals, geometry, BootScene refactor | Medium — ~25 tests | **Medium-Large** |
| B2 (animated spritesheets) | Large — full walk-cycles, 4 directions, all types | Large — anim system rework | Large | **Large** |
| C (procedural skew, no art) | None | Tiny — ~20 lines | Tiny — ~5 tests | **Small** |

---

## 7. Recommendation

**Short-term: Option C (procedural narrow silhouette)**
Apply a 0.35× X-compression when moving vertically, with `flipY` to distinguish up vs. down. Zero new art required. This is an immediate improvement over the current 90° rotation — the animal no longer appears to be lying on its side. Suitable to ship as a quick fix. Estimated: 1 hour total including tests.

**Medium-term: Option A (2-frame with `-vert` sprites)**
Add one front/back-view sprite per creep type. This fully solves the visual problem — players see a recognisable animal silhouette from all four cardinal directions. The `-vert` sprites can be generated procedurally for standard creeps (similar style to existing sprites) and done manually for the 4 named bosses. Graceful fallback to Option C behaviour when a `-vert` texture is absent allows incremental rollout per creep type.

**Do not pursue Option B2** unless a dedicated artist joins the project. Full walk-cycle spritesheets for 13+ creep types is a large scope that would block gameplay improvements for several sprints.

**Option B1** is a reasonable future follow-up after Option A — once `-vert` art exists, converting to spritesheets adds frame-based direction switching at no extra art cost. Code refactor is moderate.

### Recommended implementation order

1. Ship **Option C** as a fast patch (no-art improvement, single PR)
2. Generate `-vert` PNGs for 5 standard ground creeps + 1 air creep as a **partial Option A** pilot
3. Based on visual result, decide whether to extend Option A to remaining 7 sprites
4. Evaluate **Option B1** migration only after all `-vert` sprites are complete
