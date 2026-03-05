/**
 * TASK-108: Hunter's Edge — Unclear Description & Range Upgrade Only Works on First Rank
 *
 * Tests for:
 *  - UpgradePathDef.description field exists on the interface and on Hunter's Edge
 *  - Hunter's Edge range accumulation is correct at all 5 tiers
 *  - Hunter's Edge arrowSlowFactor is correct at tiers 2–5
 *  - UpgradePanel shows stats display (statsTxt) after upgrade
 *  - BehaviorPanel hardcoded height matches UpgradePanel export
 */

import { describe, it, expect } from 'vitest';
import { UpgradeManager } from '../UpgradeManager';
import { ARROW_DEF, defaultUpgradeStats } from '../../data/towerDefs';
import type { TowerDef, TowerUpgradeStats } from '../../data/towerDefs';
import type { Tower } from '../../entities/towers/Tower';
import { ALL_UPGRADE_DEFS } from '../../data/upgradeDefs';
import type { UpgradePathDef } from '../../data/upgradeDefs';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Mock Tower factory ────────────────────────────────────────────────────────

function makeMockTower(def: TowerDef = ARROW_DEF): Tower {
  const mock = {
    def,
    upgStats: defaultUpgradeStats(def),
    applyUpgradeStats(s: TowerUpgradeStats): void { mock.upgStats = s; },
    setAnimTier(_t: number): void { /* no-op */ },
    onChainFired: undefined as ((pos: Array<{ x: number; y: number }>) => void) | undefined,
  };
  return mock as unknown as Tower;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build UpgradeManager with Arrow tower registered. */
function makeManager(): { manager: UpgradeManager; tower: Tower } {
  const towers: Tower[] = [];
  const manager = new UpgradeManager(() => towers, () => new Set());
  const tower = makeMockTower(ARROW_DEF);
  towers.push(tower);
  manager.registerTower(tower);
  return { manager, tower };
}

/** Buy N tiers on path C of Arrow tower. */
function buyC(manager: UpgradeManager, tower: Tower, count: number): void {
  for (let i = 0; i < count; i++) {
    manager.buyUpgrade(tower, 'C');
  }
}

// Locate the Arrow upgrade def
const arrowUpgradeDef = ALL_UPGRADE_DEFS.find(d => d.towerKey === 'arrow')!;
const pathC: UpgradePathDef = arrowUpgradeDef.paths.C;

// ── 1. UpgradePathDef.description field ──────────────────────────────────────

describe("UpgradePathDef description field", () => {
  it("Hunter's Edge path C has a description string", () => {
    expect(pathC.description).toBeDefined();
    expect(typeof pathC.description).toBe('string');
    expect(pathC.description!.length).toBeGreaterThan(10);
  });

  it("Hunter's Edge description mentions range", () => {
    expect(pathC.description!.toLowerCase()).toContain('range');
  });

  it("Hunter's Edge description mentions slow", () => {
    expect(pathC.description!.toLowerCase()).toMatch(/slow/);
  });

  it("Hunter's Edge path name is unchanged", () => {
    expect(pathC.name).toBe("Hunter's Edge");
  });
});

// ── 2. Range accumulation at all tiers ───────────────────────────────────────

describe("Hunter's Edge range accumulation", () => {
  const BASE_RANGE = ARROW_DEF.range;  // 180

  it("base range before any C upgrades equals ARROW_DEF.range", () => {
    const { manager, tower } = makeManager();
    expect(tower.upgStats.range).toBe(BASE_RANGE);
    void manager;
  });

  it("tier C=1 (Track I): +20 range", () => {
    const { manager, tower } = makeManager();
    buyC(manager, tower, 1);
    expect(tower.upgStats.range).toBe(BASE_RANGE + 20);
  });

  it("tier C=2 (Track II): same range as C=1 (slow tier, no rangeDelta)", () => {
    const { manager, tower } = makeManager();
    buyC(manager, tower, 2);
    // Track II adds slow only — range stays at +20
    expect(tower.upgStats.range).toBe(BASE_RANGE + 20);
  });

  it("tier C=3 (Track III): same range as C=2 (slow tier, no rangeDelta)", () => {
    const { manager, tower } = makeManager();
    buyC(manager, tower, 3);
    // Track III adds slow only — range stays at +20
    expect(tower.upgStats.range).toBe(BASE_RANGE + 20);
  });

  it("tier C=4 (Track IV): +10 more range (total +30)", () => {
    const { manager, tower } = makeManager();
    // Buying C=4 first requires locking A (path lock happens at C>=3).
    // We need to buy A out of the way — but C lock on A is at lockThreshold=3.
    // Actually, buying 4 C tiers: first 3 locks A but C can still be purchased.
    buyC(manager, tower, 4);
    expect(tower.upgStats.range).toBe(BASE_RANGE + 20 + 10);
  });

  it("tier C=5 (Track V): +15 more range (total +45)", () => {
    const { manager, tower } = makeManager();
    buyC(manager, tower, 5);
    expect(tower.upgStats.range).toBe(BASE_RANGE + 20 + 10 + 15);
  });

  it("C=5 total range increase is +45", () => {
    const { manager, tower } = makeManager();
    buyC(manager, tower, 5);
    expect(tower.upgStats.range - BASE_RANGE).toBe(45);
  });
});

// ── 3. arrowSlowFactor at each tier ──────────────────────────────────────────

describe("Hunter's Edge slow factor", () => {
  it("tier C=0: no slow (factor=0)", () => {
    const { manager, tower } = makeManager();
    void manager;
    expect(tower.upgStats.arrowSlowFactor).toBe(0);
    expect(tower.upgStats.arrowSlowDurationMs).toBe(0);
  });

  it("tier C=1: still no slow (Track I only gives range)", () => {
    const { manager, tower } = makeManager();
    buyC(manager, tower, 1);
    expect(tower.upgStats.arrowSlowFactor).toBe(0);
  });

  it("tier C=2: slow factor 0.85 (15% slow), duration 1500ms", () => {
    const { manager, tower } = makeManager();
    buyC(manager, tower, 2);
    expect(tower.upgStats.arrowSlowFactor).toBeCloseTo(0.85);
    expect(tower.upgStats.arrowSlowDurationMs).toBe(1500);
  });

  it("tier C=3: slow factor 0.80 (20% slow), duration 2000ms", () => {
    const { manager, tower } = makeManager();
    buyC(manager, tower, 3);
    expect(tower.upgStats.arrowSlowFactor).toBeCloseTo(0.80);
    expect(tower.upgStats.arrowSlowDurationMs).toBe(2000);
  });

  it("tier C=4: slow factor 0.75 (25% slow), duration 2500ms", () => {
    const { manager, tower } = makeManager();
    buyC(manager, tower, 4);
    expect(tower.upgStats.arrowSlowFactor).toBeCloseTo(0.75);
    expect(tower.upgStats.arrowSlowDurationMs).toBe(2500);
  });

  it("tier C=5: slow factor 0.70 (30% slow), duration 3000ms", () => {
    const { manager, tower } = makeManager();
    buyC(manager, tower, 5);
    expect(tower.upgStats.arrowSlowFactor).toBeCloseTo(0.70);
    expect(tower.upgStats.arrowSlowDurationMs).toBe(3000);
  });

  it("slow factor is strictly decreasing from tier 2 to 5 (stronger slow each tier)", () => {
    const factors: number[] = [];
    for (let tiers = 2; tiers <= 5; tiers++) {
      const { manager, tower } = makeManager();
      buyC(manager, tower, tiers);
      factors.push(tower.upgStats.arrowSlowFactor);
    }
    for (let i = 1; i < factors.length; i++) {
      expect(factors[i]).toBeLessThan(factors[i - 1]);
    }
  });
});

// ── 4. Tier costs are defined at all 5 tiers ─────────────────────────────────

describe("Hunter's Edge tier cost integrity", () => {
  it("all 5 tiers have positive cost", () => {
    for (const tier of pathC.tiers) {
      expect(tier.cost).toBeGreaterThan(0);
    }
  });

  it("tier costs are strictly increasing", () => {
    for (let i = 1; i < pathC.tiers.length; i++) {
      expect(pathC.tiers[i].cost).toBeGreaterThan(pathC.tiers[i - 1].cost);
    }
  });
});

// ── 5. Structural: UpgradePanel has stats display and description row ─────────

describe("UpgradePanel source structure (TASK-108)", () => {
  const panelSrc = readFileSync(
    resolve(__dirname, '../../ui/UpgradePanel.ts'),
    'utf8',
  );

  it("exports UPGRADE_PANEL_HEIGHT", () => {
    expect(panelSrc).toContain('UPGRADE_PANEL_HEIGHT');
  });

  it("defines COL_DESC_ROW_H constant", () => {
    expect(panelSrc).toContain('COL_DESC_ROW_H');
  });

  it("PathColumnUI interface has descText field", () => {
    expect(panelSrc).toContain('descText');
  });

  it("UpgradePanel class has statsTxt field", () => {
    expect(panelSrc).toContain('statsTxt');
  });

  it("refresh() delegates stats display to buildStatsLine", () => {
    expect(panelSrc).toContain('statsTxt.setText');
    expect(panelSrc).toContain('buildStatsLine');
  });

  it("refresh() updates descText from pathDef.description", () => {
    expect(panelSrc).toContain('descText.setText');
    expect(panelSrc).toContain('pathDef.description');
  });

  it("aura stats handled by buildStatsLine (imported from statsLine.ts)", () => {
    expect(panelSrc).toContain("from './statsLine'");
    // Verify statsLine.ts has aura-specific display logic
    const statsLineSrc = readFileSync(
      resolve(__dirname, '../../ui/statsLine.ts'),
      'utf8',
    );
    expect(statsLineSrc).toContain('isAura');
    expect(statsLineSrc).toContain('auraIntervalMult');
    expect(statsLineSrc).toContain('auraDamageMult');
    expect(statsLineSrc).toContain('auraRangePct');
  });
});

// ── 6. Structural: BehaviorPanel hardcoded height matches ─────────────────────

describe("BehaviorPanel height constant (TASK-108)", () => {
  const behaviorSrc = readFileSync(
    resolve(__dirname, '../../ui/BehaviorPanel.ts'),
    'utf8',
  );

  it("BehaviorPanel imports UPGRADE_PANEL_HEIGHT from UpgradePanel", () => {
    expect(behaviorSrc).toContain('UPGRADE_PANEL_HEIGHT');
  });
});

// ── 7. Arithmetic: range values at each tier ──────────────────────────────────

describe("Hunter's Edge range arithmetic", () => {
  it("Track I rangeDelta is 20", () => {
    expect(pathC.tiers[0].statDelta?.rangeDelta).toBe(20);
  });

  it("Track II has no rangeDelta (slow-only tier)", () => {
    expect(pathC.tiers[1].statDelta?.rangeDelta).toBeUndefined();
  });

  it("Track III has no rangeDelta (slow-only tier)", () => {
    expect(pathC.tiers[2].statDelta?.rangeDelta).toBeUndefined();
  });

  it("Track IV rangeDelta is 10", () => {
    expect(pathC.tiers[3].statDelta?.rangeDelta).toBe(10);
  });

  it("Track V rangeDelta is 15", () => {
    expect(pathC.tiers[4].statDelta?.rangeDelta).toBe(15);
  });

  it("total accumulated rangeDelta across all 5 tiers is 45", () => {
    const total = pathC.tiers.reduce((acc, t) => acc + (t.statDelta?.rangeDelta ?? 0), 0);
    expect(total).toBe(45);
  });
});
