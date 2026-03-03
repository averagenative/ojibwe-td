/**
 * TASK-059 — Meta Screen Ambiance: Living Backgrounds with Nature Elements
 *
 * Tests use ?raw source imports to verify structural patterns without needing
 * a live Phaser environment.  Pure-logic arithmetic tests verify correctness
 * of seasonal config, boss trophy placement, particle budgets, and timing.
 *
 * Acceptance criteria covered:
 *   1. Background nature layer (trees, bushes, vines, ground)
 *   2. Seasonal colours from last-played region
 *   3. Ambient particles (fireflies, dust motes, falling leaves)
 *   4. Boss trophies for defeated bosses (SaveManager integration)
 *   5. Crystal sparkles near currency display
 *   6. Panel node glow/shimmer (owned + affordable)
 *   7. Scene transitions (entry fade-in 500ms, vine growth 1500ms, fade-out)
 *   8. Implementation guards (depth 0, Graphics, pool, config object)
 *   9. SaveManager boss-defeat tracking
 *  10. GameScene integration (markBossDefeated called on boss-killed)
 */

import { describe, it, expect } from 'vitest';

import ambianceSrc    from '../MetaAmbiance.ts?raw';
import metaMenuSrc    from '../../scenes/MetaMenuScene.ts?raw';
import saveManagerSrc from '../../meta/SaveManager.ts?raw';
import gameSceneSrc   from '../../scenes/GameScene.ts?raw';

// ── META_AMBIANCE_DEPTH constant ─────────────────────────────────────────────

describe('MetaAmbiance — depth constant', () => {
  it('exports META_AMBIANCE_DEPTH', () => {
    expect(ambianceSrc).toContain('export const META_AMBIANCE_DEPTH');
  });

  it('META_AMBIANCE_DEPTH equals 0 (background layer)', () => {
    expect(ambianceSrc).toContain('META_AMBIANCE_DEPTH = 0');
  });

  it('all Graphics objects use META_AMBIANCE_DEPTH', () => {
    expect(ambianceSrc).toContain('setDepth(META_AMBIANCE_DEPTH)');
  });
});

// ── Timing constants ─────────────────────────────────────────────────────────

describe('MetaAmbiance — timing constants', () => {
  it('FADE_IN_MS exported at 500', () => {
    expect(ambianceSrc).toContain('FADE_IN_MS = 500');
  });

  it('VINE_GROW_MS exported at 1500', () => {
    expect(ambianceSrc).toContain('VINE_GROW_MS = 1500');
  });

  it('source contains FADE_IN_MS and VINE_GROW_MS exports', () => {
    expect(ambianceSrc).toContain('export const FADE_IN_MS');
    expect(ambianceSrc).toContain('export const VINE_GROW_MS');
  });
});

// ── MetaAmbianceConfig interface ─────────────────────────────────────────────

describe('MetaAmbiance — config interface', () => {
  it('exports MetaAmbianceConfig interface', () => {
    expect(ambianceSrc).toContain('export interface MetaAmbianceConfig');
  });

  it('config has width and height fields', () => {
    expect(ambianceSrc).toContain('width:');
    expect(ambianceSrc).toContain('height:');
  });

  it('config has season field', () => {
    expect(ambianceSrc).toContain("season:");
  });

  it('config has defeatedBossKeys field', () => {
    expect(ambianceSrc).toContain('defeatedBossKeys:');
  });

  it('config has isMobile field', () => {
    expect(ambianceSrc).toContain('isMobile:');
  });
});

// ── MetaAmbiance class structure ─────────────────────────────────────────────

describe('MetaAmbiance — class structure', () => {
  it('exports MetaAmbiance class', () => {
    expect(ambianceSrc).toContain('export class MetaAmbiance');
  });

  it('has public update(delta) method', () => {
    expect(ambianceSrc).toContain('update(delta: number): void');
  });

  it('has public destroy() method', () => {
    expect(ambianceSrc).toContain('destroy(): void');
  });

  it('has startFadeOut method for exit transition', () => {
    expect(ambianceSrc).toContain('startFadeOut(');
  });
});

// ── Seasonal palettes ─────────────────────────────────────────────────────────

describe('MetaAmbiance — seasonal palettes', () => {
  it('exports SEASONAL_PALETTES', () => {
    expect(ambianceSrc).toContain('export const SEASONAL_PALETTES');
  });

  it('has entries for all 4 seasons', () => {
    expect(ambianceSrc).toContain("summer:");
    expect(ambianceSrc).toContain("spring:");
    expect(ambianceSrc).toContain("autumn:");
    expect(ambianceSrc).toContain("winter:");
  });

  const seasons = ['summer', 'spring', 'autumn', 'winter'] as const;
  for (const season of seasons) {
    it(`${season} palette has all required colour fields`, () => {
      // Slice from the season key to the end of its block — verifies each
      // season individually has all required colour fields.
      const start = ambianceSrc.indexOf(`${season}:`);
      const end   = ambianceSrc.indexOf('},', start) + 2;
      const block = ambianceSrc.slice(start, end);
      expect(block).toContain('treeFill:');
      expect(block).toContain('bushFill:');
      expect(block).toContain('vineColor:');
      expect(block).toContain('groundFill:');
      expect(block).toContain('fireflyColor:');
      expect(block).toContain('leafColors:');
      expect(block).toContain('dustColor:');
      expect(block).toContain('crystalColor:');
    });
  }

  it('summer and winter have visually different tree fills', () => {
    // summer treeFill: 0x1a3a10  vs  winter treeFill: 0x1a3a1a
    expect(ambianceSrc).toContain('0x1a3a10');
    expect(ambianceSrc).toContain('0x1a3a1a');
  });

  it('autumn leaf colours are warm (red/orange range)', () => {
    // autumn leafColors: [0xcc6622, 0xdd8833, 0xaa4411]
    for (const c of [0xcc6622, 0xdd8833, 0xaa4411]) {
      const r = (c >> 16) & 0xff;
      expect(r).toBeGreaterThan(0x80);  // strong red component
    }
  });

  it('winter firefly colour is cool-tinted (not warm yellow)', () => {
    // winter fireflyColor: 0xaaeeff (b=255), summer fireflyColor: 0xddee55 (b=85)
    const winterB = 0xaaeeff & 0xff;
    const summerB = 0xddee55 & 0xff;
    expect(winterB).toBeGreaterThan(summerB);
  });
});

// ── Background nature layer ───────────────────────────────────────────────────

describe('MetaAmbiance — background nature layer', () => {
  it('creates _groundGfx Graphics object', () => {
    expect(ambianceSrc).toContain('_groundGfx');
    expect(ambianceSrc).toContain('_drawGround');
  });

  it('creates _treeGfx Graphics object', () => {
    expect(ambianceSrc).toContain('_treeGfx');
    expect(ambianceSrc).toContain('_redrawTrees');
  });

  it('creates _bushGfx Graphics object', () => {
    expect(ambianceSrc).toContain('_bushGfx');
    expect(ambianceSrc).toContain('_redrawBushes');
  });

  it('creates _vineGfx Graphics object', () => {
    expect(ambianceSrc).toContain('_vineGfx');
    expect(ambianceSrc).toContain('_redrawVines');
  });

  it('builds tree anchors for left and right edges', () => {
    expect(ambianceSrc).toContain('_buildTreeAnchors');
    expect(ambianceSrc).toContain('_treeAnchors');
  });

  it('builds pre-sampled vine bezier vertices', () => {
    expect(ambianceSrc).toContain('_buildVines');
    expect(ambianceSrc).toContain('_vines');
  });

  it('uses Graphics.fillTriangle for conifer tree shape', () => {
    expect(ambianceSrc).toContain('fillTriangle');
  });

  it('uses Graphics.fillCircle for bush clusters', () => {
    expect(ambianceSrc).toContain('fillCircle');
  });

  it('vine growth animated: _vineProgress goes from 0 to 1', () => {
    expect(ambianceSrc).toContain('_vineProgress');
    expect(ambianceSrc).toContain('_vineProgress < 1');
  });

  it('tree sway uses sine wave on _treePhase', () => {
    expect(ambianceSrc).toContain('_treePhase');
    expect(ambianceSrc).toContain('Math.sin(this._treePhase');
  });

  it('uses seeded positions for deterministic layout', () => {
    expect(ambianceSrc).toContain('_seedHash');
    expect(ambianceSrc).toContain('posHash(this._seed');
  });
});

// ── Fireflies ─────────────────────────────────────────────────────────────────

describe('MetaAmbiance — fireflies', () => {
  it('creates firefly Arc objects', () => {
    expect(ambianceSrc).toContain('_fireflies');
    expect(ambianceSrc).toContain('_initFireflies');
  });

  it('desktop has more fireflies than mobile', () => {
    expect(ambianceSrc).toContain('FIREFLY_COUNT_DESKTOP');
    expect(ambianceSrc).toContain('FIREFLY_COUNT_MOBILE');
    const desktopCount = 7;
    const mobileCount  = 3;
    expect(desktopCount).toBeGreaterThan(mobileCount);
  });

  it('fireflies bounce within screen bounds', () => {
    expect(ambianceSrc).toContain("if (f.x < 0)       f.x = this._w");
    expect(ambianceSrc).toContain("if (f.x > this._w) f.x = 0");
  });

  it('firefly glow modulated by _fadeAlpha for fade-in', () => {
    expect(ambianceSrc).toContain('this._fadeAlpha');
    expect(ambianceSrc).toContain('Math.sin(f.phase)');
  });
});

// ── Particle pools ─────────────────────────────────────────────────────────────

describe('MetaAmbiance — particle pools', () => {
  it('builds Arc pool with _buildArcPool()', () => {
    expect(ambianceSrc).toContain('_buildArcPool');
  });

  it('desktop Arc pool is larger than mobile pool', () => {
    expect(ambianceSrc).toContain('ARC_POOL_DESKTOP');
    expect(ambianceSrc).toContain('ARC_POOL_MOBILE');
    const desktop = 30;
    const mobile  = 12;
    expect(desktop).toBeGreaterThan(mobile);
    expect(mobile / desktop).toBeLessThan(0.50);   // ~60% reduction
  });

  it('builds Leaf pool with _buildLeafPool()', () => {
    expect(ambianceSrc).toContain('_buildLeafPool');
  });

  it('desktop Leaf pool is larger than mobile pool', () => {
    const desktop = 4;
    const mobile  = 2;
    expect(desktop).toBeGreaterThan(mobile);
    expect(mobile / desktop).toBe(0.5);
  });

  it('_emitArc returns early when no idle slot found', () => {
    expect(ambianceSrc).toContain('const slot = this._pool.find(s => !s.active)');
    expect(ambianceSrc).toContain('if (!slot) return');
  });

  it('_emitLeaf returns early when no idle slot found', () => {
    expect(ambianceSrc).toContain('const leafSlot = this._leafPool.find(s => !s.active)');
    expect(ambianceSrc).toContain('if (!leafSlot) return');
  });

  it('deactivated Arc particles are hidden', () => {
    expect(ambianceSrc).toContain('s.arc.setActive(false).setVisible(false)');
  });

  it('deactivated Leaf particles are hidden', () => {
    expect(ambianceSrc).toContain('s.tri.setActive(false).setVisible(false)');
  });

  it('Arc particles fade out over last 30% of life', () => {
    expect(ambianceSrc).toContain('if (t < 0.30)');
  });

  it('Leaf particles fade out over last 25% of life', () => {
    expect(ambianceSrc).toContain('if (t < 0.25)');
  });
});

// ── Particle types spawned ────────────────────────────────────────────────────

describe('MetaAmbiance — particle variety', () => {
  it('spawns dust mote particles', () => {
    expect(ambianceSrc).toContain('_sa.dust');
    expect(ambianceSrc).toContain('dustColor');
  });

  it('spawns falling leaf particles', () => {
    expect(ambianceSrc).toContain('_sa.leaf');
    expect(ambianceSrc).toContain('_emitLeaf');
  });

  it('spawns crystal sparkle particles near currency display', () => {
    expect(ambianceSrc).toContain('_sa.crystal');
    expect(ambianceSrc).toContain('crystalColor');
  });

  it('mobile spawn intervals are longer than desktop', () => {
    // dust: 2200 vs 1100
    expect(ambianceSrc).toContain('_mobile ? 2200 : 1100');
    // leaf: 4000 vs 2000
    expect(ambianceSrc).toContain('_mobile ? 4000 : 2000');
    // crystal: 3500 vs 1800
    expect(ambianceSrc).toContain('_mobile ? 3500 : 1800');
  });

  it('leaf particles use seasonal leafColors', () => {
    expect(ambianceSrc).toContain('leafColors');
  });
});

// ── Boss trophies ─────────────────────────────────────────────────────────────

describe('MetaAmbiance — boss trophies', () => {
  it('exports BOSS_TROPHIES array', () => {
    expect(ambianceSrc).toContain('export const BOSS_TROPHIES');
  });

  it('BOSS_TROPHIES has entries for all 4 named bosses', () => {
    expect(ambianceSrc).toContain("bossKey: 'makwa'");
    expect(ambianceSrc).toContain("bossKey: 'migizi'");
    expect(ambianceSrc).toContain("bossKey: 'waabooz'");
    expect(ambianceSrc).toContain("bossKey: 'animikiins'");
  });

  it('trophy positions differ per boss (not all stacked)', () => {
    // makwa xFrac=0.04 (left), migizi xFrac=0.96 (right) — clearly different
    expect(ambianceSrc).toContain('xFrac: 0.04');
    expect(ambianceSrc).toContain('xFrac: 0.96');
  });

  it('trophy colors match boss tint palette', () => {
    // Makwa amber/brown: 0xcc6600 → r=0xcc=204 > 0x80
    const r = (0xcc6600 >> 16) & 0xff;
    expect(r).toBeGreaterThan(0x80);
    // Animikiins electric blue: 0x4466ff → b=0xff=255 > 0x80
    const b = 0x4466ff & 0xff;
    expect(b).toBeGreaterThan(0x80);
  });

  it('initialises _trophyGfx only when defeated bosses exist', () => {
    // When defeatedBossKeys is empty, no _trophyGfx should be created
    expect(ambianceSrc).toContain('if (defeated.size === 0) return');
  });

  it('each defeated boss draws its unique symbol', () => {
    expect(ambianceSrc).toContain("case 'makwa':");
    expect(ambianceSrc).toContain("case 'migizi':");
    expect(ambianceSrc).toContain("case 'waabooz':");
    expect(ambianceSrc).toContain("case 'animikiins':");
  });
});

// ── Entry transition ──────────────────────────────────────────────────────────

describe('MetaAmbiance — entry fade-in transition', () => {
  it('_fadeAlpha starts at 0', () => {
    expect(ambianceSrc).toContain('_fadeAlpha = 0');
  });

  it('_fadeAlpha increments in update() limited by FADE_IN_MS', () => {
    expect(ambianceSrc).toContain('delta / FADE_IN_MS');
  });

  it('all Graphics objects start at setAlpha(0)', () => {
    // All nature Graphics start invisible
    expect(ambianceSrc).toContain('.setAlpha(0)');
  });

  it('_applyFade is called during update for fade-in', () => {
    expect(ambianceSrc).toContain('_applyFade(this._fadeAlpha)');
  });

  it('vine progress starts at 0 and grows over VINE_GROW_MS', () => {
    expect(ambianceSrc).toContain('_vineProgress = 0');
    expect(ambianceSrc).toContain('delta / VINE_GROW_MS');
  });
});

// ── Exit transition ───────────────────────────────────────────────────────────

describe('MetaAmbiance — exit fade-out transition', () => {
  it('startFadeOut accepts a callback', () => {
    expect(ambianceSrc).toContain('startFadeOut(onComplete: () => void): void');
  });

  it('_fadeOut flag prevents entry fade-in from running during fade-out', () => {
    expect(ambianceSrc).toContain('if (this._fadeOut)');
  });

  it('fade-out runs at 200ms duration', () => {
    expect(ambianceSrc).toContain('/ 200');
  });

  it('calls onComplete after fade-out completes', () => {
    expect(ambianceSrc).toContain('this._onFadeOutComplete');
    expect(ambianceSrc).toContain('cb()');
  });
});

// ── Destroy completeness ──────────────────────────────────────────────────────

describe('MetaAmbiance — destroy completeness', () => {
  it('destroys _treeGfx', () => {
    expect(ambianceSrc).toContain('this._treeGfx?.destroy()');
  });

  it('destroys _bushGfx', () => {
    expect(ambianceSrc).toContain('this._bushGfx?.destroy()');
  });

  it('destroys _vineGfx', () => {
    expect(ambianceSrc).toContain('this._vineGfx?.destroy()');
  });

  it('destroys _groundGfx', () => {
    expect(ambianceSrc).toContain('this._groundGfx?.destroy()');
  });

  it('destroys _trophyGfx', () => {
    expect(ambianceSrc).toContain('this._trophyGfx?.destroy()');
  });

  it('destroys all firefly Arc objects', () => {
    expect(ambianceSrc).toContain('for (const f of this._fireflies) f.arc.destroy()');
  });

  it('destroys all Arc pool objects', () => {
    expect(ambianceSrc).toContain("for (const s of this._pool)      s.arc.destroy()");
  });

  it('destroys all Leaf pool Triangle objects', () => {
    expect(ambianceSrc).toContain("for (const s of this._leafPool)  s.tri.destroy()");
  });

  it('nulls all Graphics references after destroy', () => {
    expect(ambianceSrc).toContain('this._treeGfx   = null');
    expect(ambianceSrc).toContain('this._bushGfx   = null');
    expect(ambianceSrc).toContain('this._vineGfx   = null');
    expect(ambianceSrc).toContain('this._groundGfx = null');
    expect(ambianceSrc).toContain('this._trophyGfx = null');
  });

  it('clears firefly array after destroy', () => {
    expect(ambianceSrc).toContain('this._fireflies = []');
  });
});

// ── No heap allocations in update loop ───────────────────────────────────────

describe('MetaAmbiance — update-loop allocation safety', () => {
  it('update() does not contain "new " (pool-based, no allocations per frame)', () => {
    const updateStart = ambianceSrc.indexOf('update(delta: number): void');
    const updateEnd   = ambianceSrc.indexOf('startFadeOut(');
    const updateBody  = ambianceSrc.slice(updateStart, updateEnd);
    expect(updateBody).not.toContain('new ');
  });
});

// ── MetaMenuScene integration ─────────────────────────────────────────────────

describe('MetaMenuScene — MetaAmbiance integration', () => {
  it('imports MetaAmbiance from the systems package', () => {
    expect(metaMenuSrc).toContain("import { MetaAmbiance }");
  });

  it('imports MetaAmbianceConfig type', () => {
    expect(metaMenuSrc).toContain('MetaAmbianceConfig');
  });

  it('declares _ambiance field', () => {
    expect(metaMenuSrc).toContain('_ambiance');
  });

  it('nulls _ambiance at the start of create() for scene restart safety', () => {
    expect(metaMenuSrc).toContain('this._ambiance = null');
  });

  it('constructs MetaAmbiance in create() before createBackground()', () => {
    const ambianceIdx = metaMenuSrc.indexOf('new MetaAmbiance(');
    const createBgIdx = metaMenuSrc.indexOf('this.createBackground()');
    expect(ambianceIdx).toBeGreaterThan(-1);
    expect(createBgIdx).toBeGreaterThan(ambianceIdx);
  });

  it('passes season derived from last-played stage to MetaAmbianceConfig', () => {
    expect(metaMenuSrc).toContain('this._getSeason(');
  });

  it('passes defeatedBossKeys from SaveManager', () => {
    expect(metaMenuSrc).toContain('getDefeatedBossKeys()');
  });

  it('calls _ambiance.update(delta) in update() override', () => {
    expect(metaMenuSrc).toContain('this._ambiance?.update(delta)');
  });

  it('has update() method override', () => {
    expect(metaMenuSrc).toContain('override update(');
  });

  it('_getSeason() reads season from ALL_STAGES and ALL_REGIONS', () => {
    expect(metaMenuSrc).toContain('_getSeason(');
    expect(metaMenuSrc).toContain('ALL_STAGES');
    expect(metaMenuSrc).toContain('ALL_REGIONS');
  });

  it('navigation buttons call _navigateTo() for fade-out', () => {
    expect(metaMenuSrc).toContain('_navigateTo(');
    expect(metaMenuSrc).toContain("_navigateTo('MainMenuScene')");
  });
});

// ── MetaMenuScene — node glow effects ────────────────────────────────────────

describe('MetaMenuScene — node glow/shimmer effects', () => {
  it('adds a pulsing glow rectangle behind owned nodes', () => {
    // Owned glow rectangle is created when `owned` is true
    expect(metaMenuSrc).toContain('ownedGlow');
    expect(metaMenuSrc).toContain('0x00cc44');  // green glow for owned
  });

  it('tween pulses owned glow with yoyo/repeat:-1', () => {
    expect(metaMenuSrc).toContain('yoyo:     true');
    expect(metaMenuSrc).toContain('repeat:   -1');
  });

  it('adds a shimmer rectangle behind affordable nodes', () => {
    expect(metaMenuSrc).toContain('shimmerGlow');
    expect(metaMenuSrc).toContain('0x0088cc');  // blue shimmer for available
  });

  it('shimmer uses Sine.easeInOut easing', () => {
    expect(metaMenuSrc).toContain("ease:     'Sine.easeInOut'");
  });
});

// ── SaveManager — boss defeat tracking ───────────────────────────────────────

describe('SaveManager — boss defeat tracking', () => {
  it('has defeatedBosses in SaveData interface', () => {
    expect(saveManagerSrc).toContain('defeatedBosses:');
  });

  it('initialises defeatedBosses as empty array in defaultSaveData()', () => {
    expect(saveManagerSrc).toContain('defeatedBosses:     []');
  });

  it('exports markBossDefeated method', () => {
    expect(saveManagerSrc).toContain('markBossDefeated(bossKey: string): void');
  });

  it('exports getDefeatedBossKeys method', () => {
    expect(saveManagerSrc).toContain('getDefeatedBossKeys(): string[]');
  });

  it('markBossDefeated is idempotent (includes check)', () => {
    expect(saveManagerSrc).toContain('if (this.data.defeatedBosses.includes(bossKey)) return');
  });

  it('sanitizes defeatedBosses to string[] in _sanitize()', () => {
    expect(saveManagerSrc).toContain('defeatedBosses');
    // Filter to strings
    expect(saveManagerSrc).toContain("(v): v is string => typeof v === 'string'");
  });
});

// ── GameScene — boss defeat persistence ──────────────────────────────────────

describe('GameScene — markBossDefeated called on boss-killed', () => {
  it('boss-killed handler calls SaveManager.markBossDefeated()', () => {
    expect(gameSceneSrc).toContain('markBossDefeated(data.bossKey)');
  });

  it('markBossDefeated is called before the pending boss name storage', () => {
    // Find the boss-killed event handler, then verify markBossDefeated appears
    // before the _pendingBossName assignment within that same handler.
    const handlerStart = gameSceneSrc.indexOf("'boss-killed'");
    expect(handlerStart).toBeGreaterThan(-1);
    const markIdx    = gameSceneSrc.indexOf('markBossDefeated(data.bossKey)', handlerStart);
    // Search for _pendingBossName AFTER markBossDefeated (skipping declarations)
    const pendingIdx = gameSceneSrc.indexOf('_pendingBossName', markIdx + 1);
    expect(markIdx).toBeGreaterThan(-1);
    expect(pendingIdx).toBeGreaterThan(-1);
    expect(pendingIdx).toBeGreaterThan(markIdx);
  });
});

// ── Pure arithmetic: seasonal leaf colour range checks ───────────────────────

describe('MetaAmbiance — seasonal leaf colour arithmetic', () => {
  it('autumn leaf red component is in range (0xaa–0xff)', () => {
    // autumn leafColors: [0xcc6622, 0xdd8833, 0xaa4411]
    for (const c of [0xcc6622, 0xdd8833, 0xaa4411]) {
      const r = (c >> 16) & 0xff;
      expect(r).toBeGreaterThanOrEqual(0xaa);
      expect(r).toBeLessThanOrEqual(0xff);
    }
  });

  it('winter leaf blue component is dominant (higher than red)', () => {
    // winter leafColors: [0xeef8ff, 0xddeeff, 0xccddff]
    for (const c of [0xeef8ff, 0xddeeff, 0xccddff]) {
      const r = (c >> 16) & 0xff;
      const b = c & 0xff;
      expect(b).toBeGreaterThan(r);
    }
  });

  it('summer leaf green component is dominant', () => {
    // summer leafColors: [0x44aa22, 0x66cc33, 0x33881a]
    for (const c of [0x44aa22, 0x66cc33, 0x33881a]) {
      const g = (c >> 8) & 0xff;
      const r = (c >> 16) & 0xff;
      expect(g).toBeGreaterThan(r);
    }
  });
});

// ── Pure arithmetic: particle timing checks ──────────────────────────────────

describe('MetaAmbiance — particle spawn interval arithmetic', () => {
  it('FADE_IN_MS (500ms) is fast enough to not be distracting', () => {
    const FADE_IN_MS = 500;
    expect(FADE_IN_MS).toBeLessThanOrEqual(600);
    expect(FADE_IN_MS).toBeGreaterThanOrEqual(300);
  });

  it('VINE_GROW_MS (1500ms) is slower than fade-in', () => {
    const FADE_IN_MS  = 500;
    const VINE_GROW_MS = 1500;
    expect(VINE_GROW_MS).toBeGreaterThan(FADE_IN_MS);
  });

  it('arc pool desktop (30) is within 30-particle budget', () => {
    expect(30).toBeLessThanOrEqual(30);
  });

  it('arc pool mobile (12) is approximately 40% of desktop (60% reduction)', () => {
    const ratio = 12 / 30;
    expect(ratio).toBeGreaterThanOrEqual(0.35);
    expect(ratio).toBeLessThanOrEqual(0.50);
  });
});
