/**
 * MoonRatingDisplay — procedural Phaser graphics for moon-phase rating rows.
 *
 * Renders 5 moon icons where each EARNED slot shows a distinct lunar phase
 * (crescent → quarter → half → gibbous → full), reinforcing the Ojibwe
 * "dibiki-giizis" (night sun / moon) theme.
 *
 * Unearned slots are shown as dark empty circles with a faint outline.
 *
 * This module requires Phaser. For the pure data functions
 * (calculateMoons, moonRatingLabel, moonSymbol) see ../systems/MoonRating.
 */
import Phaser from 'phaser';

// ── Colour constants ──────────────────────────────────────────────────────────

/** Silvery white-blue: the lit face of the moon. */
const COLOR_LIT     = 0xdde8f0;
/** Dark blue-grey: the shadow face of the moon. */
const COLOR_SHADOW  = 0x162535;
/** Dark blue-grey fill for unearned slots. */
const COLOR_EMPTY   = 0x1e2c3c;
/** Faint outline for unearned slots. */
const OUTLINE_EMPTY = 0x334455;
/** Blue-grey outline for earned slots. */
const OUTLINE_EARNED = 0x6699cc;
/** Warm white-gold for the full moon disc. */
const COLOR_FULL    = 0xfff8e0;

// ── Public types ──────────────────────────────────────────────────────────────

export interface MoonRatingOpts {
  /** Radius of each moon disc in pixels (default 8). */
  radius?: number;
  /** Gap between moon centres in pixels (default radius × 2.8). */
  gap?: number;
  /**
   * When true, earned moons gently pulse in alpha (shimmer).
   * If stagger is also true, the pulse starts after the stagger completes.
   */
  animate?: boolean;
  /**
   * When true, moons fill in one by one with a 200 ms stagger.
   * Intended for the GameOverScene victory reveal.
   */
  stagger?: boolean;
  /** Depth to assign to the returned Container. */
  depth?: number;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Render 5 moon phase icons in a row using procedural Phaser Graphics.
 *
 * Phase progression per earned slot index:
 *   0 → thin crescent
 *   1 → quarter moon (waxing)
 *   2 → half moon
 *   3 → waxing gibbous (nearly full)
 *   4 → full moon with warm glow
 *
 * Unearned slots render as dark empty circles with a faint outline.
 *
 * @param scene   The Phaser Scene to add objects to.
 * @param x       World X of the container centre.
 * @param y       World Y of the container centre.
 * @param earned  Number of earned moons (0–5).
 * @param total   Total slots displayed (default 5).
 * @param opts    Optional visual / animation configuration.
 * @returns       The created Container holding all moon Graphics children.
 */
export function renderMoonRating(
  scene:   Phaser.Scene,
  x:       number,
  y:       number,
  earned:  number,
  total  = 5,
  opts:    MoonRatingOpts = {},
): Phaser.GameObjects.Container {
  const r       = opts.radius  ?? 8;
  const gap     = opts.gap     ?? Math.round(r * 2.8);
  const animate = opts.animate ?? false;
  const stagger = opts.stagger ?? false;

  const totalW = (total - 1) * gap;
  const startX = -totalW / 2;

  const container = scene.add.container(x, y);
  if (opts.depth !== undefined) container.setDepth(opts.depth);

  // Full-moon ambient glow (inserted behind all children)
  if (earned >= 5) {
    const fullCx = startX + 4 * gap;
    const glow   = scene.add.graphics();
    glow.fillStyle(0xfff4cc, 0.18);
    glow.fillCircle(fullCx, 0, r + Math.round(r * 0.6));
    container.add(glow);
  }

  const litGraphics: Phaser.GameObjects.Graphics[] = [];

  for (let i = 0; i < total; i++) {
    const cx       = startX + i * gap;
    const isEarned = i < earned;

    // Dark base circle — always shown (the "empty" shadow)
    const base = scene.add.graphics();
    _drawEmpty(base, cx, 0, r);
    container.add(base);

    if (isEarned) {
      const lit = scene.add.graphics();
      _drawPhase(lit, cx, 0, r, i);
      lit.setAlpha(stagger ? 0 : 1);
      container.add(lit);
      litGraphics.push(lit);
    }
  }

  // ── Stagger-fill reveal animation ─────────────────────────────────────────
  if (stagger && litGraphics.length > 0) {
    litGraphics.forEach((gfx, idx) => {
      scene.tweens.add({
        targets:  gfx,
        alpha:    1,
        duration: 250,
        delay:    400 + idx * 200,
        ease:     'Quad.easeOut',
      });
    });
  }

  // ── Gentle shimmer pulse on earned moons ──────────────────────────────────
  if (animate && litGraphics.length > 0) {
    // If stagger is on, let the reveal finish before starting the pulse
    const pulseDelay = stagger ? 400 + litGraphics.length * 200 + 300 : 0;
    litGraphics.forEach((gfx, idx) => {
      scene.tweens.add({
        targets:  gfx,
        alpha:    { from: 0.75, to: 1.0 },
        duration: 2200,
        delay:    pulseDelay + idx * 160,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut',
      });
    });
  }

  return container;
}

// ── Private drawing helpers ───────────────────────────────────────────────────

/**
 * Draw the dark empty-moon disc (for unearned slots).
 * Dark fill + faint outline, no phase detail.
 */
function _drawEmpty(
  gfx: Phaser.GameObjects.Graphics,
  cx: number, cy: number, r: number,
): void {
  gfx.fillStyle(COLOR_EMPTY, 1);
  gfx.fillCircle(cx, cy, r);
  gfx.lineStyle(1, OUTLINE_EMPTY, 0.5);
  gfx.strokeCircle(cx, cy, r);
}

/**
 * Draw a lit earned-moon phase.
 *
 * Technique: draw the shadow disc first (dark blue-grey), then overlay the
 * lit region (silvery white) on top.  Both fills are fully opaque, so the
 * result is background-agnostic — no colour bleeding onto card backgrounds.
 *
 * @param phaseIndex  0 = crescent  1 = quarter  2 = half  3 = gibbous  4 = full
 */
function _drawPhase(
  gfx: Phaser.GameObjects.Graphics,
  cx: number, cy: number, r: number,
  phaseIndex: number,
): void {
  if (phaseIndex === 4) {
    // Full moon — warm white disc with blue-grey outline ring
    gfx.fillStyle(COLOR_FULL, 1);
    gfx.fillCircle(cx, cy, r);
    gfx.lineStyle(1, OUTLINE_EARNED, 0.8);
    gfx.strokeCircle(cx, cy, r);
    return;
  }

  // Shadow base disc
  gfx.fillStyle(COLOR_SHADOW, 1);
  gfx.fillCircle(cx, cy, r);

  // Lit region overlay
  gfx.fillStyle(COLOR_LIT, 1);
  switch (phaseIndex) {
    case 0:
      // Thin crescent — narrow ellipse hugging the left limb.
      // Ellipse is tightly inscribed in the circle, so minimal colour bleed.
      gfx.fillEllipse(cx - r * 0.32, cy, r * 0.68, r * 2);
      break;

    case 1:
      // Quarter moon — wider ellipse covering ~40 % from the left limb.
      gfx.fillEllipse(cx - r * 0.1, cy, r * 1.4, r * 2);
      break;

    case 2:
      // Half moon — exact left semicircle.
      // Arc from 270° (top) to 90° (bottom) counterclockwise traces the left half.
      gfx.beginPath();
      gfx.arc(cx, cy, r, Math.PI * 1.5, Math.PI * 0.5, true);
      gfx.closePath();
      gfx.fillPath();
      break;

    case 3:
      // Gibbous — full disc with a small shadow strip on the right.
      gfx.fillCircle(cx, cy, r);
      gfx.fillStyle(COLOR_SHADOW, 1);
      gfx.fillEllipse(cx + r * 0.62, cy, r * 0.76, r * 2);
      break;
  }

  gfx.lineStyle(1, OUTLINE_EARNED, 0.6);
  gfx.strokeCircle(cx, cy, r);
}
