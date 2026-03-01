/**
 * evaluate-map — automated map evaluation rubric runner.
 *
 * Checks a stage definition + its path JSON against the criteria in
 * docs/map-evaluation-rubric.md and prints a pass/fail report.
 *
 * Usage (from game/ directory):
 *   npm run evaluate-map -- --stage zaagaiganing-01
 *
 * Checks performed:
 *   1. Path validity       — all waypoint segments traced without gaps
 *   2. Tower affinity spread — at least 3 tower types declared
 *   3. Chokepoint count    — 1–4 natural chokepoints on the path
 *   4. Creep variety       — at least 3 creep types declared (incl. ≥1 boss)
 *   Criteria 2 (difficulty band) and 5 (boss wave fit) require a simulation
 *   runtime and are flagged as manual-review-required.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Stage defs import ─────────────────────────────────────────────────────────
// We need to reach into src/data/stageDefs.ts. Since this script is bundled
// by esbuild with --bundle, we can use a relative import.
import { ALL_STAGES, ALL_REGIONS, getStageDef, getRegionDef } from '../src/data/stageDefs';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Use cwd() — npm run always executes from the package.json directory (game/)
const gameRoot = process.cwd();

function log(status: 'PASS' | 'FAIL' | 'NOTE', message: string): void {
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '·';
  const color = status === 'PASS' ? '\x1b[32m' : status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
  console.log(`  ${color}[${status}]\x1b[0m ${message}`);
}

// ── Arg parsing ───────────────────────────────────────────────────────────────

const args  = process.argv.slice(2);
const stIdx = args.indexOf('--stage');
if (stIdx === -1 || !args[stIdx + 1]) {
  console.error('Usage: npm run evaluate-map -- --stage <stageId>');
  console.error('Available stages:');
  for (const s of ALL_STAGES) {
    console.error(`  ${s.id}  (${s.name})`);
  }
  process.exit(1);
}
const stageId = args[stIdx + 1];

// ── Load stage def ────────────────────────────────────────────────────────────

const stage = getStageDef(stageId);
if (!stage) {
  console.error(`\x1b[31mError: unknown stageId "${stageId}"\x1b[0m`);
  console.error('Known stages: ' + ALL_STAGES.map(s => s.id).join(', '));
  process.exit(1);
}
const region = getRegionDef(stage.regionId);

// ── Load map JSON ─────────────────────────────────────────────────────────────

const mapPath = resolve(gameRoot, 'public', 'data', 'maps', `${stage.pathFile}.json`);
let mapJson: {
  id: string; name: string; cols: number; rows: number; tileSize: number;
  tiles: number[][];
  waypoints: Array<{ col: number; row: number }>;
};
try {
  mapJson = JSON.parse(readFileSync(mapPath, 'utf-8'));
} catch (e) {
  console.error(`\x1b[31mError: could not load map file "${mapPath}"\x1b[0m`);
  process.exit(1);
}

const { cols, rows, tiles, waypoints } = mapJson;
const STARS = '★'.repeat(stage.difficulty) + '☆'.repeat(5 - stage.difficulty);

console.log('');
console.log(`\x1b[1m=== Map Evaluation: ${stage.id} (${stage.name}) ===\x1b[0m`);
console.log(`  Region    : ${region?.name ?? stage.regionId} (${region?.nameEn ?? ''})`);
console.log(`  Difficulty: ${STARS}`);
console.log(`  Path file : ${stage.pathFile}`);
console.log('');

let passed = 0;
let failed = 0;
let total  = 0;

function check(name: string, fn: () => { ok: boolean; detail: string }): void {
  total++;
  const { ok, detail } = fn();
  if (ok) { passed++; log('PASS', `${name} — ${detail}`); }
  else    { failed++; log('FAIL', `${name} — ${detail}`); }
}

function note(name: string, detail: string): void {
  log('NOTE', `${name} — ${detail}`);
}

// ── Check 1: Path validity ────────────────────────────────────────────────────

check('Path validity', () => {
  const issues: string[] = [];

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    // Allow exit waypoint 1 tile off right edge
    if (wp.col < 0 || wp.col > cols || wp.row < 0 || wp.row >= rows) {
      if (!(i === waypoints.length - 1 && wp.col === cols + 1)) {
        issues.push(`waypoint[${i}] out of bounds (col=${wp.col}, row=${wp.row})`);
      }
    }
  }

  for (let i = 0; i < waypoints.length - 1; i++) {
    const a   = waypoints[i];
    const b   = waypoints[i + 1];
    const dr  = b.row - a.row;
    const dc  = b.col - a.col;
    const inh = dr === 0 && dc !== 0; // horizontal segment
    const inv = dc === 0 && dr !== 0; // vertical segment
    if (!inh && !inv) {
      issues.push(`segment[${i}→${i+1}] is diagonal (not axis-aligned)`);
      continue;
    }
    // Trace all tiles between the two waypoints
    if (inh) {
      const minC = Math.min(a.col, b.col);
      const maxC = Math.max(a.col, b.col);
      for (let c = minC; c <= Math.min(maxC, cols - 1); c++) {
        if (tiles[a.row][c] !== 1) {
          issues.push(`path gap at (row=${a.row}, col=${c}) in segment ${i}→${i+1}`);
          if (issues.length > 3) break; // cap output
        }
      }
    } else {
      const minR = Math.min(a.row, b.row);
      const maxR = Math.max(a.row, b.row);
      for (let r = minR; r <= Math.min(maxR, rows - 1); r++) {
        if (tiles[r][a.col] !== 1) {
          issues.push(`path gap at (row=${r}, col=${a.col}) in segment ${i}→${i+1}`);
          if (issues.length > 3) break;
        }
      }
    }
  }

  if (issues.length === 0) {
    return { ok: true, detail: `${waypoints.length} waypoints, all segments valid` };
  }
  return { ok: false, detail: issues.slice(0, 3).join('; ') + (issues.length > 3 ? ` (+${issues.length - 3} more)` : '') };
});

// ── Check 2: Tower affinity spread ────────────────────────────────────────────

check('Tower affinity spread', () => {
  const count = stage.towerAffinities.length;
  const list  = stage.towerAffinities.join(', ');
  if (count >= 3) return { ok: true, detail: `${count} affinities declared (${list})` };
  return { ok: false, detail: `only ${count} affinities declared (${list}), need ≥ 3` };
});

// ── Check 3: Chokepoint count ─────────────────────────────────────────────────

check('Chokepoint count', () => {
  // A path tile is a chokepoint if it has exactly 1 or 2 orthogonal path-tile neighbours.
  const isPath = (r: number, c: number) =>
    r >= 0 && r < rows && c >= 0 && c < cols && tiles[r][c] === 1;

  const pathTiles: Array<[number, number]> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (tiles[r][c] === 1) pathTiles.push([r, c]);
    }
  }

  // Exclude first and last columns (entry/exit edges)
  const interior = pathTiles.filter(([, c]) => c > 0 && c < cols - 1);

  let chokes = 0;
  for (const [r, c] of interior) {
    const neighbours = [
      isPath(r - 1, c), isPath(r + 1, c),
      isPath(r, c - 1), isPath(r, c + 1),
    ].filter(Boolean).length;
    if (neighbours <= 2) chokes++;
  }

  // Count vertical segments (dc === 0) — each is a natural flanking / chokepoint zone.
  // Horizontal segments are long open runs; vertical segments force creeps through a
  // narrow column where towers on both sides can fire.
  let vertSegs = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    if (waypoints[i].col === waypoints[i + 1].col) vertSegs++;
  }

  if (vertSegs >= 1 && vertSegs <= 4) {
    return { ok: true, detail: `${vertSegs} vertical segment${vertSegs === 1 ? '' : 's'} (${chokes} chokepoint tiles)` };
  }
  if (vertSegs < 1) {
    return { ok: false, detail: `${vertSegs} vertical segments — no chokepoints (need 1–4)` };
  }
  return { ok: false, detail: `${vertSegs} vertical segments — too many chokepoints (need 1–4)` };
});

// ── Check 4: Creep variety ────────────────────────────────────────────────────

check('Creep variety', () => {
  const roster = stage.creepRoster;
  const hasBoss = roster.includes('boss');
  const hasNonBoss = roster.some(t => t !== 'boss');
  const list = roster.join(', ');

  if (roster.length >= 3 && hasBoss && hasNonBoss) {
    return { ok: true, detail: `${roster.length} types declared (${list})` };
  }
  const missing: string[] = [];
  if (roster.length < 3) missing.push(`need ≥ 3 types (have ${roster.length})`);
  if (!hasBoss)   missing.push('no boss type');
  if (!hasNonBoss) missing.push('no non-boss types');
  return { ok: false, detail: missing.join(', ') + ` — roster: ${list}` };
});

// ── Manual-review notes ───────────────────────────────────────────────────────

note('Difficulty band (TTK)', 'manual review required — use BalanceCalc.towerEffectiveDPS + creepEffectiveHP');
note('Boss wave fit',         'manual review required — simulate boss path progress with tower placement');

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('');
if (failed === 0) {
  console.log(`\x1b[32mStatus: ${passed}/${total} automated checks PASSED ✓\x1b[0m`);
  if (stage.status !== 'ready') {
    console.log('\x1b[33mNote: stage.status is not "ready" — update stageDefs.ts after manual review.\x1b[0m');
  }
} else {
  console.log(`\x1b[31mStatus: ${failed}/${total} automated checks FAILED — stage not ready\x1b[0m`);
  process.exit(1);
}
