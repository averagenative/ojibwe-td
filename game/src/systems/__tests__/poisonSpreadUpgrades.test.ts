/**
 * Unit tests for Poison C (Plague) spread upgrade tiers.
 *
 * Verifies each tier's effect on spread radius, stack count, and domain coverage.
 * Uses minimal mock objects — no Phaser dependency.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpgradeManager, BASE_DOT_SPREAD_RADIUS } from '../UpgradeManager';
import { POISON_DEF, defaultUpgradeStats } from '../../data/towerDefs';
import type { TowerDef, TowerUpgradeStats } from '../../data/towerDefs';
import type { Tower } from '../../entities/towers/Tower';
import type { Creep } from '../../entities/Creep';

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeMockTower(def: TowerDef = POISON_DEF): Tower {
  const mock = {
    def,
    upgStats: defaultUpgradeStats(def),
    applyUpgradeStats(s: TowerUpgradeStats): void { mock.upgStats = s; },
    onChainFired: undefined as unknown,
    x: 0,
    y: 0,
  };
  return mock as unknown as Tower;
}

/** Create a minimal mock Creep at (x, y) with the given domain. */
function makeMockCreep(x: number, y: number, domain: 'ground' | 'air' = 'ground'): Creep {
  const mock = {
    active: true,
    domain,
    x,
    y,
    applyDot: vi.fn(),
  };
  return mock as unknown as Creep;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Poison Plague spread tiers (Option A implementation)', () => {
  let towers: Tower[];
  let creeps: Set<Creep>;
  let manager: UpgradeManager;
  let tower: Tower;

  // Ground creep at origin (should always receive spread at Plague I+)
  let nearGround: Creep;
  // Air creep at origin (should only receive spread at Plague V)
  let nearAir: Creep;
  // Ground creep just beyond Plague I radius but within Plague II radius
  let edgeGround: Creep;

  beforeEach(() => {
    towers = [];
    creeps = new Set();
    manager = new UpgradeManager(() => towers, () => creeps);

    tower = makeMockTower(POISON_DEF);
    towers.push(tower);
    manager.registerTower(tower);

    nearGround  = makeMockCreep(BASE_DOT_SPREAD_RADIUS - 5, 0, 'ground'); // 75px — inside base radius
    nearAir     = makeMockCreep(BASE_DOT_SPREAD_RADIUS - 5, 0, 'air');    // 75px — inside base radius
    edgeGround  = makeMockCreep(BASE_DOT_SPREAD_RADIUS + 5, 0, 'ground'); // 85px — outside base, inside +10px

    creeps.add(nearGround);
    creeps.add(nearAir);
    creeps.add(edgeGround);
  });

  // ── Plague I ─────────────────────────────────────────────────────────────

  it('Plague I: enables spread; applies 1 stack to nearby ground creep', () => {
    manager.buyUpgrade(tower, 'C'); // Plague I

    manager.spreadDot(0, 0, 6, 500, 8);

    expect(nearGround.applyDot).toHaveBeenCalledTimes(1);
    expect(nearGround.applyDot).toHaveBeenCalledWith(6, 500, 8);
  });

  it('Plague I: does NOT spread to air creeps', () => {
    manager.buyUpgrade(tower, 'C'); // Plague I

    manager.spreadDot(0, 0, 6, 500, 8);

    expect(nearAir.applyDot).not.toHaveBeenCalled();
  });

  it('Plague I: does NOT spread to ground creep outside base 80px radius', () => {
    manager.buyUpgrade(tower, 'C'); // Plague I

    manager.spreadDot(0, 0, 6, 500, 8);

    expect(edgeGround.applyDot).not.toHaveBeenCalled();
  });

  // ── Plague II ────────────────────────────────────────────────────────────

  it('Plague II: spread radius increases from 80 to 90px (statDelta.spreadRadiusDelta = 10)', () => {
    expect(tower.upgStats.dotSpreadRadiusDelta).toBe(0);

    manager.buyUpgrade(tower, 'C'); // Plague I
    manager.buyUpgrade(tower, 'C'); // Plague II

    expect(tower.upgStats.dotSpreadRadiusDelta).toBe(10);
  });

  it('Plague II: spreads to ground creep at 85px (inside 90px radius)', () => {
    manager.buyUpgrade(tower, 'C'); // Plague I
    manager.buyUpgrade(tower, 'C'); // Plague II

    manager.spreadDot(0, 0, 6, 500, 8);

    expect(edgeGround.applyDot).toHaveBeenCalledTimes(1);
  });

  it('Plague II: still does NOT spread to air creeps', () => {
    manager.buyUpgrade(tower, 'C'); // Plague I
    manager.buyUpgrade(tower, 'C'); // Plague II

    manager.spreadDot(0, 0, 6, 500, 8);

    expect(nearAir.applyDot).not.toHaveBeenCalled();
  });

  // ── Plague III ───────────────────────────────────────────────────────────

  it('Plague III: dotSpreadStackCount is 2', () => {
    manager.buyUpgrade(tower, 'C'); // Plague I
    manager.buyUpgrade(tower, 'C'); // Plague II
    manager.buyUpgrade(tower, 'C'); // Plague III

    expect(tower.upgStats.dotSpreadStackCount).toBe(2);
  });

  it('Plague III: applies 2 DoT stacks to nearby ground creep', () => {
    manager.buyUpgrade(tower, 'C'); // Plague I
    manager.buyUpgrade(tower, 'C'); // Plague II
    manager.buyUpgrade(tower, 'C'); // Plague III

    manager.spreadDot(0, 0, 6, 500, 8);

    expect(nearGround.applyDot).toHaveBeenCalledTimes(2);
  });

  // ── Plague IV ────────────────────────────────────────────────────────────

  it('Plague IV: dotSpreadStackCount is 3', () => {
    manager.buyUpgrade(tower, 'C'); // Plague I
    manager.buyUpgrade(tower, 'C'); // Plague II
    manager.buyUpgrade(tower, 'C'); // Plague III — locks path A (lockThreshold=3)
    manager.buyUpgrade(tower, 'C'); // Plague IV

    expect(tower.upgStats.dotSpreadStackCount).toBe(3);
  });

  it('Plague IV: applies 3 DoT stacks to nearby ground creep', () => {
    manager.buyUpgrade(tower, 'C'); // I
    manager.buyUpgrade(tower, 'C'); // II
    manager.buyUpgrade(tower, 'C'); // III
    manager.buyUpgrade(tower, 'C'); // IV

    manager.spreadDot(0, 0, 6, 500, 8);

    expect(nearGround.applyDot).toHaveBeenCalledTimes(3);
  });

  it('Plague IV: still does NOT spread to air creeps', () => {
    manager.buyUpgrade(tower, 'C'); // I
    manager.buyUpgrade(tower, 'C'); // II
    manager.buyUpgrade(tower, 'C'); // III
    manager.buyUpgrade(tower, 'C'); // IV

    manager.spreadDot(0, 0, 6, 500, 8);

    expect(nearAir.applyDot).not.toHaveBeenCalled();
  });

  // ── Plague V ─────────────────────────────────────────────────────────────

  it('Plague V: dotSpreadHitsAir is true', () => {
    for (let i = 0; i < 5; i++) manager.buyUpgrade(tower, 'C');
    expect(tower.upgStats.dotSpreadHitsAir).toBe(true);
  });

  it('Plague V: spreads to air creep within radius', () => {
    for (let i = 0; i < 5; i++) manager.buyUpgrade(tower, 'C');

    manager.spreadDot(0, 0, 6, 500, 8);

    expect(nearAir.applyDot).toHaveBeenCalled();
  });

  it('Plague V: still applies 3 stacks (from Plague IV) to ground creep', () => {
    for (let i = 0; i < 5; i++) manager.buyUpgrade(tower, 'C');

    manager.spreadDot(0, 0, 6, 500, 8);

    expect(nearGround.applyDot).toHaveBeenCalledTimes(3);
  });

  // ── No spread without Plague C upgrade ───────────────────────────────────

  it('spreadDot with no Poison C upgrade: applies 1 stack to ground creep (hasPoisonSpread guard is upstream)', () => {
    // spreadDot() itself doesn't guard — GameScene does via hasPoisonSpread().
    // Without dotSpreadOnDeath, getTowers() loop finds no tower → uses defaults.
    // Default: BASE radius, 1 stack, ground only — but no tower in range loop.
    // Result: ground creep at 75px will receive 1 stack (base radius 80px ≥ 75px).
    manager.spreadDot(0, 0, 6, 500, 8);

    // Without any Poison C tower, getTowers loop finds nothing → defaults apply.
    // nearGround (75px) is inside 80px base radius → gets 1 stack.
    expect(nearGround.applyDot).toHaveBeenCalledTimes(1);
  });

  // ── Radius constant export ────────────────────────────────────────────────

  it('BASE_DOT_SPREAD_RADIUS is 80', () => {
    expect(BASE_DOT_SPREAD_RADIUS).toBe(80);
  });

  // ── Edge cases ──────────────────────────────────────────────────────────

  it('inactive creep is skipped even when within radius', () => {
    manager.buyUpgrade(tower, 'C'); // Plague I
    nearGround.active = false;

    manager.spreadDot(0, 0, 6, 500, 8);

    expect(nearGround.applyDot).not.toHaveBeenCalled();
  });

  it('creep at exact boundary distance (dist === radius) receives spread', () => {
    manager.buyUpgrade(tower, 'C'); // Plague I
    const exactEdge = makeMockCreep(BASE_DOT_SPREAD_RADIUS, 0, 'ground'); // exactly 80px
    creeps.add(exactEdge);

    manager.spreadDot(0, 0, 6, 500, 8);

    expect(exactEdge.applyDot).toHaveBeenCalledTimes(1);
  });

  it('multiple poison towers: best spread params across all towers are used', () => {
    // tower already has Plague I (1 stack, base radius, no air)
    manager.buyUpgrade(tower, 'C'); // Plague I

    // Second poison tower upgraded to Plague V (3 stacks, +10px, hits air)
    const tower2 = makeMockTower(POISON_DEF);
    towers.push(tower2);
    manager.registerTower(tower2);
    for (let i = 0; i < 5; i++) manager.buyUpgrade(tower2, 'C');

    manager.spreadDot(0, 0, 6, 500, 8);

    // Best params: 3 stacks (from Plague IV), hitsAir (Plague V), 90px radius (Plague II)
    expect(nearGround.applyDot).toHaveBeenCalledTimes(3);
    expect(nearAir.applyDot).toHaveBeenCalledTimes(3);
    expect(edgeGround.applyDot).toHaveBeenCalledTimes(3); // 85px < 90px
  });
});
