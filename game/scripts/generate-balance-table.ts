/**
 * Balance Table Generator
 *
 * Generates src/data/balance-table.json — a human-readable kill-time table.
 *
 * Rows  = waves 1–20
 * Columns = tower type × upgrade tier (0–5 on the highest-DPS path per tower)
 * Values  = kill-time in seconds against a standard grunt creep
 *
 * Run via:
 *   npm run balance
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { creepEffectiveHP, towerEffectiveDPS } from '../src/systems/BalanceCalc';
import { ALL_TOWER_DEFS } from '../src/data/towerDefs';
import type { TowerUpgradeState } from '../src/systems/UpgradeManager';

// ── Config ────────────────────────────────────────────────────────────────────

/**
 * The upgrade path that most directly increases raw DPS for each tower.
 * Tier 0-5 on this path are used as the column set in the table.
 */
const DPS_PATH: Record<string, 'A' | 'B' | 'C'> = {
  cannon: 'B',   // Execute + raw damage bonuses
  frost:  'C',   // Shatter + direct damage bonuses
  mortar: 'B',   // Raw damage bonuses
  poison: 'A',   // DoT damage bonus per tick
  tesla:  'B',   // Chain damage ratio (best measurable single-path improvement)
  aura:   'B',   // Damage aura (buffs others, no self-DPS)
};

const MAX_WAVE  = 20;
const TIER_MAX  = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeState(path: 'A' | 'B' | 'C', tiers: number): TowerUpgradeState {
  return {
    tiers:      { A: 0, B: 0, C: 0, [path]: tiers },
    locked:     new Set(),
    totalSpent: 0,
  };
}

function fmt(n: number): number {
  if (!isFinite(n)) return -1; // sentinel for "cannot kill" (Aura)
  return parseFloat(n.toFixed(2));
}

// ── Build table ───────────────────────────────────────────────────────────────

type WaveRow = {
  wave:    number;
  gruntHp: number;
  [key: string]: number;
};

const rows: WaveRow[] = [];

for (let wave = 1; wave <= MAX_WAVE; wave++) {
  const gruntHp = creepEffectiveHP(wave, 'grunt');
  const row: WaveRow = { wave, gruntHp };

  for (const def of ALL_TOWER_DEFS) {
    const path = DPS_PATH[def.key] ?? 'B';

    for (let tier = 0; tier <= TIER_MAX; tier++) {
      const state = makeState(path, tier);
      const dps   = towerEffectiveDPS(def, state, wave);
      const killTimeSec = dps > 0 ? gruntHp / dps : Infinity;
      row[`${def.key}_t${tier}`] = fmt(killTimeSec);
    }
  }

  rows.push(row);
}

// ── Write output ──────────────────────────────────────────────────────────────

const output = {
  _generated: new Date().toISOString().slice(0, 10),
  _script:    'scripts/generate-balance-table.ts',
  _note:      [
    'Kill-time in seconds (lower = faster kill; -1 = no damage).',
    'Reference creep: grunt. Upgrade tiers are on the highest-DPS path per tower.',
    `DPS paths: ${JSON.stringify(DPS_PATH)}`,
  ].join(' '),
  _paths: DPS_PATH,
  table:  rows,
};

const outPath = resolve(process.cwd(), 'src/data/balance-table.json');
writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');
console.log(`Balance table written → ${outPath}`);
