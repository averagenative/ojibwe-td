/**
 * Map Evaluation Script
 *
 * Runs the automated rubric checks from docs/map-evaluation-rubric.md
 * against a given stage and prints a pass/fail report.
 *
 * Usage:
 *   npm run evaluate-map -- --stage <stageId>
 *
 * Example:
 *   npm run evaluate-map -- --stage zaagaiganing-01
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALL_STAGES, getStageDef } from '../src/data/stageDefs';
import { creepEffectiveHP, towerEffectiveDPS } from '../src/systems/BalanceCalc';
import { ROCK_HURLER_DEF } from '../src/data/towerDefs';
import { WAVE_SPEED_MULTS, CREEP_BASE_SPEED } from '../src/data/scalingConfig';

// ── Types from MapData (duplicated to avoid Phaser import) ────────────────────

interface MapWaypoint { col: number; row: number; }
interface MapData {
  id: string; name: string; tileSize: number;
  cols: number; rows: number; tiles: number[][];
  waypoints: MapWaypoint[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

interface CheckResult {
  name:    string;
  passed:  boolean;
  message: string;
}

function pass(name: string, msg: string): CheckResult {
  return { name, passed: true,  message: msg };
}

function fail(name: string, msg: string): CheckResult {
  return { name, passed: false, message: msg };
}

/** Compute total path length in pixels from tile waypoints. */
function computePathLengthPx(waypoints: MapWaypoint[], tileSize: number): number {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const dx = (waypoints[i].col - waypoints[i - 1].col) * tileSize;
    const dy = (waypoints[i].row - waypoints[i - 1].row) * tileSize;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

/** Count axis-aligned turns (direction changes) in the waypoint path. */
function countTurns(waypoints: MapWaypoint[]): number {
  if (waypoints.length < 3) return 0;
  let turns = 0;
  for (let i = 1; i < waypoints.length - 1; i++) {
    const prevDx = waypoints[i].col - waypoints[i - 1].col;
    const prevDy = waypoints[i].row - waypoints[i - 1].row;
    const nextDx = waypoints[i + 1].col - waypoints[i].col;
    const nextDy = waypoints[i + 1].row - waypoints[i].row;
    const prevDir = prevDx !== 0 ? 'horizontal' : 'vertical';
    const nextDir = nextDx !== 0 ? 'horizontal' : 'vertical';
    if (prevDir !== nextDir) turns++;
  }
  return turns;
}

// ── Rubric checks ─────────────────────────────────────────────────────────────

function checkPathValidity(map: MapData): CheckResult {
  const name = 'Path validity';
  const wps  = map.waypoints;

  if (wps.length < 2) {
    return fail(name, `Only ${wps.length} waypoint(s) — need at least 2 (spawn + exit).`);
  }

  // Verify each waypoint is within bounds (or at most 1 tile off edge for exit)
  for (let i = 0; i < wps.length; i++) {
    const wp = wps[i];
    const isLast = i === wps.length - 1;
    const colOk = wp.col >= 0 && (wp.col < map.cols || (isLast && wp.col <= map.cols + 2));
    const rowOk = wp.row >= 0 && wp.row < map.rows;
    if (!colOk || !rowOk) {
      return fail(name, `Waypoint ${i} (col=${wp.col}, row=${wp.row}) is out of bounds.`);
    }
  }

  // Verify path tiles are marked where expected (spot-check first segment)
  const first = wps[0];
  const tileVal = first.row < map.tiles.length && first.col < (map.tiles[first.row]?.length ?? 0)
    ? map.tiles[first.row][first.col]
    : -1;
  if (tileVal !== 1) {
    return fail(name, `Spawn waypoint tile (row=${first.row}, col=${first.col}) is not marked as PATH (got ${tileVal}).`);
  }

  return pass(name, `${wps.length} waypoints, all in bounds, spawn tile marked PATH.`);
}

function checkDifficultyBand(stageId: string, map: MapData, waveCount: number): CheckResult {
  const name = 'Difficulty band (wave-1 TTK)';

  const pathLengthPx = computePathLengthPx(map.waypoints, map.tileSize);
  const hurlerDPS    = towerEffectiveDPS(ROCK_HURLER_DEF, { tiers: { A: 0, B: 0, C: 0 }, totalSpent: 0, pathLocked: null }, 1);
  const wave1GruntHP = creepEffectiveHP(1, 'grunt');
  const ttk          = hurlerDPS > 0 ? wave1GruntHP / hurlerDPS : Infinity;

  const gruntSpeed   = CREEP_BASE_SPEED['grunt'] * (WAVE_SPEED_MULTS[0] ?? 1);
  const traversalSec = pathLengthPx / gruntSpeed;

  // Kill-potential: how many times could a single rock hurler kill the creep before it exits?
  const killPotential = traversalSec / ttk;

  // Target band: [1.5, 30] — must be possible to kill (> 1) but not trivial (< 30)
  const MIN_KP = 1.5;
  const MAX_KP = 30;

  if (killPotential < MIN_KP) {
    return fail(name,
      `Kill potential ${killPotential.toFixed(2)} is below min (${MIN_KP}). Creeps may survive with 1 tower.`);
  }
  if (killPotential > MAX_KP) {
    return fail(name,
      `Kill potential ${killPotential.toFixed(2)} exceeds max (${MAX_KP}). Wave 1 may be trivially easy.`);
  }
  return pass(name,
    `Kill potential: ${killPotential.toFixed(2)} (path ${pathLengthPx.toFixed(0)}px, TTK ${ttk.toFixed(2)}s, traversal ${traversalSec.toFixed(1)}s).`);
}

function checkTowerAffinitySpread(towerAffinities: string[]): CheckResult {
  const name = 'Tower affinity spread';
  const MIN  = 3;
  const count = towerAffinities.length;
  if (count < MIN) {
    return fail(name, `Only ${count} tower affinity/affinities — need at least ${MIN}.`);
  }
  return pass(name, `${count} tower affinities: [${towerAffinities.join(', ')}].`);
}

function checkChokepoints(map: MapData): CheckResult {
  const name   = 'Strategic chokepoint count';
  const turns  = countTurns(map.waypoints);
  const MIN    = 1;
  const MAX    = 8;
  if (turns < MIN) {
    return fail(name, `${turns} turn(s) — too few natural chokepoints (need ${MIN}–${MAX}).`);
  }
  if (turns > MAX) {
    return fail(name, `${turns} turns — too many chokepoints (need ${MIN}–${MAX}). May be trivially easy.`);
  }
  return pass(name, `${turns} natural chokepoint(s) from path turns (target ${MIN}–${MAX}).`);
}

function checkBossWaveFit(map: MapData): CheckResult {
  const name       = 'Boss wave fit (wave 5)';
  const pathPx     = computePathLengthPx(map.waypoints, map.tileSize);
  const targetPct  = 0.6;
  const target60Px = pathPx * targetPct;

  // Boss HP at wave 5: grunt base × hpMult(wave5) × 8× boss multiplier
  const BOSS_HP_MULT = 8;
  const bossHP       = creepEffectiveHP(5, 'grunt') * BOSS_HP_MULT;

  // Rock Hurler DPS (unupgraded) at wave 5
  const hurlerDPS = towerEffectiveDPS(ROCK_HURLER_DEF, { tiers: { A: 0, B: 0, C: 0 }, totalSpent: 0, pathLocked: null }, 5);
  if (hurlerDPS <= 0) return fail(name, 'Rock Hurler DPS is 0, cannot evaluate.');

  const ttkSeconds = bossHP / hurlerDPS;

  // Boss speed at wave 5 (grunt speed × wave-5 speed mult)
  const GRUNT_SPEED_BASE = CREEP_BASE_SPEED['grunt'] ?? 75;
  const wave5SpeedMult   = WAVE_SPEED_MULTS[4] ?? 1.10;
  const bossSpeed        = GRUNT_SPEED_BASE * wave5SpeedMult * 0.5; // boss 50% of normal speed
  const distanceTraveled = bossSpeed * ttkSeconds;

  if (distanceTraveled < target60Px) {
    return fail(name,
      `Boss covers only ${distanceTraveled.toFixed(0)}px (${(distanceTraveled / pathPx * 100).toFixed(1)}%) ` +
      `before dying vs target ≥60% (${target60Px.toFixed(0)}px). Path may be too long or boss HP too low.`);
  }
  return pass(name,
    `Boss reaches ${(distanceTraveled / pathPx * 100).toFixed(1)}% of path (${distanceTraveled.toFixed(0)}px) before dying in un-upgraded run.`);
}

function checkCreepVariety(creepRoster: string[]): CheckResult {
  const name = 'Creep variety';
  const MIN  = 3;
  if (creepRoster.length < MIN) {
    return fail(name, `Only ${creepRoster.length} creep type(s) — need at least ${MIN}.`);
  }
  return pass(name, `${creepRoster.length} creep types: [${creepRoster.join(', ')}].`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

function parseArgs(): { stageId: string | null; list: boolean } {
  const args = process.argv.slice(2);
  let stageId: string | null = null;
  let list = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--stage' && args[i + 1]) { stageId = args[i + 1]; i++; }
    if (args[i] === '--list') list = true;
  }
  return { stageId, list };
}

function loadMapJson(pathFile: string): MapData {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname  = dirname(__filename);
  // Script is in dist/, map files are in public/data/maps/
  const mapPath = resolve(__dirname, '..', 'public', 'data', 'maps', `${pathFile}.json`);
  const raw = readFileSync(mapPath, 'utf-8');
  return JSON.parse(raw) as MapData;
}

function runEvaluation(stageId: string): void {
  const stage = getStageDef(stageId);
  if (!stage) {
    console.error(`\nUnknown stage: "${stageId}"`);
    console.error(`Available stages: ${ALL_STAGES.map(s => s.id).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  MAP EVALUATION: ${stage.name}  (${stage.id})`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Region   : ${stage.regionId}`);
  console.log(`  Path     : ${stage.pathFile}.json`);
  console.log(`  Waves    : ${stage.waveCount}`);
  console.log(`  Difficulty: ${'★'.repeat(stage.difficulty)}${'☆'.repeat(5 - stage.difficulty)}`);
  console.log(`${'─'.repeat(60)}`);

  let map: MapData;
  try {
    map = loadMapJson(stage.pathFile);
  } catch (err) {
    console.error(`  ERROR: Could not load map file "${stage.pathFile}.json": ${String(err)}`);
    process.exit(1);
  }

  const checks: CheckResult[] = [
    checkPathValidity(map),
    checkDifficultyBand(stageId, map, stage.waveCount),
    checkTowerAffinitySpread(stage.towerAffinities),
    checkChokepoints(map),
    checkBossWaveFit(map),
    checkCreepVariety(stage.creepRoster),
  ];

  let passed = 0;
  let failed = 0;

  for (const check of checks) {
    const icon = check.passed ? '✓' : '✗';
    const label = check.passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
    console.log(`  ${icon} [${label}] ${check.name}`);
    console.log(`       ${check.message}`);
    if (check.passed) passed++; else failed++;
  }

  console.log(`${'─'.repeat(60)}`);
  const status = failed === 0 ? '\x1b[32mALL CHECKS PASSED\x1b[0m' : `\x1b[31m${failed} CHECK(S) FAILED\x1b[0m`;
  console.log(`  Result: ${status}  (${passed}/${checks.length})`);
  console.log(`${'═'.repeat(60)}\n`);

  if (failed > 0) process.exit(1);
}

// ── Entry point ────────────────────────────────────────────────────────────────

const { stageId, list } = parseArgs();

if (list) {
  console.log('\nAvailable stages:');
  for (const s of ALL_STAGES) {
    console.log(`  ${s.id.padEnd(28)} ${s.name}  (difficulty ${'★'.repeat(s.difficulty)}${' + unlockCost ' + s.unlockCost})`);
  }
  console.log('');
  process.exit(0);
}

if (!stageId) {
  console.error('\nUsage: npm run evaluate-map -- --stage <stageId>');
  console.error('       npm run evaluate-map -- --list\n');
  process.exit(1);
}

runEvaluation(stageId);
