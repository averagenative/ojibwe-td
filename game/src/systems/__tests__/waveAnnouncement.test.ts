/**
 * Unit tests for WaveManager.getWaveAnnouncementInfo()
 *
 * Verifies that the method correctly infers wave type (ground / air / mixed /
 * boss) and trait strings from the wave definition and creep-type registry,
 * without any Phaser dependency.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { WaveManager } from '../WaveManager';

// ── Phaser mock ──────────────────────────────────────────────────────────────
// WaveManager extends Phaser.Events.EventEmitter — mock the minimum required.
vi.mock('phaser', () => {
  class EventEmitter {
    on():   this { return this; }
    once(): this { return this; }
    off():  this { return this; }
    emit(): boolean { return false; }
    removeAllListeners(): this { return this; }
  }
  return { default: { Events: { EventEmitter } } };
});

// ── Creep mock ───────────────────────────────────────────────────────────────
// WaveManager imports Creep only for instantiation — not needed here since
// getWaveAnnouncementInfo() never spawns creeps.
vi.mock('../../entities/Creep', () => ({ Creep: class {} }));

// ── BOSS_DEFS — use real module (pure data, no Phaser) ───────────────────────
// bossDefs.ts is Phaser-free so it can be imported directly.

// ── Fixture data ─────────────────────────────────────────────────────────────

const CREEP_TYPE_DEFS = [
  { key: 'grunt',  type: 'ground' as const, hp: 80,  speed: 75,  reward: 8  },
  { key: 'runner', type: 'ground' as const, hp: 50,  speed: 120, reward: 6  },
  { key: 'brute',  type: 'ground' as const, hp: 220, speed: 52,  reward: 16 },
  { key: 'swarm',  type: 'ground' as const, hp: 30,  speed: 100, reward: 4  },
  { key: 'scout',  type: 'air'    as const, hp: 65,  speed: 115, reward: 10 },
  { key: 'flier',  type: 'air'    as const, hp: 130, speed: 82,  reward: 13 },
];

/** Minimal wave defs covering ground-only, air-only, mixed, and boss waves. */
const WAVE_DEFS = [
  // 1 — ground only
  { count: 8,  intervalMs: 1200, hpMult: 1.0, speedMult: 1.0, pool: ['grunt'] },
  // 2 — ground, fast
  { count: 10, intervalMs: 1100, hpMult: 1.1, speedMult: 1.0, pool: ['grunt', 'runner'] },
  // 3 — ground, armoured
  { count: 12, intervalMs: 1000, hpMult: 1.2, speedMult: 1.0, pool: ['grunt', 'brute'] },
  // 4 — ground, swarming
  { count: 12, intervalMs: 950,  hpMult: 1.3, speedMult: 1.0, pool: ['swarm'] },
  // 5 — boss (makwa — armoured)
  {
    count: 14, intervalMs: 900, hpMult: 1.4, speedMult: 1.1,
    pool: ['grunt', 'runner'],
    boss: 'makwa',
    escorts: { count: 6, types: ['grunt'], intervalMs: 1400 },
  },
  // 6 — air only
  { count: 14, intervalMs: 850, hpMult: 1.55, speedMult: 1.12, pool: ['scout', 'flier'] },
  // 7 — mixed ground + air
  { count: 16, intervalMs: 800, hpMult: 1.7, speedMult: 1.15, pool: ['grunt', 'scout'] },
  // 8 — boss (migizi — slow-immune)
  {
    count: 18, intervalMs: 750, hpMult: 2.0, speedMult: 1.25,
    pool: ['grunt', 'runner'],
    boss: 'migizi',
    escorts: { count: 8, types: ['runner'], intervalMs: 1000 },
  },
  // 9 — boss (waabooz — splits on death)
  {
    count: 22, intervalMs: 600, hpMult: 3.5, speedMult: 1.42,
    pool: ['grunt', 'runner'],
    boss: 'waabooz',
    escorts: { count: 10, types: ['brute', 'grunt'], intervalMs: 1200 },
  },
  // 10 — boss (animikiins — regenerates, poison-immune)
  {
    count: 30, intervalMs: 450, hpMult: 6.0, speedMult: 1.7,
    pool: ['grunt', 'runner'],
    boss: 'animikiins',
    escorts: { count: 8, types: ['scout', 'runner'], intervalMs: 1000 },
  },
];

// Minimal Phaser scene mock — getWaveAnnouncementInfo() doesn't use it.
const mockScene = {} as import('phaser').Scene;
const mockWaypoints  = [{ x: 0, y: 0 }];
const mockActiveCreeps = new Set<import('../../entities/Creep').Creep>();

// ── Tests ────────────────────────────────────────────────────────────────────

describe('WaveManager.getWaveAnnouncementInfo()', () => {
  let wm: WaveManager;

  beforeEach(() => {
    wm = new WaveManager(
      mockScene,
      mockWaypoints,
      mockActiveCreeps,
      CREEP_TYPE_DEFS,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      WAVE_DEFS as any,
    );
  });

  // ── Out of range ─────────────────────────────────────────────────────────

  it('returns null for wave 0', () => {
    expect(wm.getWaveAnnouncementInfo(0)).toBeNull();
  });

  it('returns null for a wave beyond the defined count (no endless)', () => {
    expect(wm.getWaveAnnouncementInfo(999)).toBeNull();
  });

  // ── Wave type inference ──────────────────────────────────────────────────

  it('identifies a ground-only wave', () => {
    const info = wm.getWaveAnnouncementInfo(1); // grunt only
    expect(info?.waveType).toBe('ground');
    expect(info?.isBoss).toBe(false);
  });

  it('identifies an air-only wave', () => {
    const info = wm.getWaveAnnouncementInfo(6); // scout + flier
    expect(info?.waveType).toBe('air');
    expect(info?.isBoss).toBe(false);
  });

  it('identifies a mixed wave', () => {
    const info = wm.getWaveAnnouncementInfo(7); // grunt + scout
    expect(info?.waveType).toBe('mixed');
    expect(info?.isBoss).toBe(false);
  });

  it('marks boss waves as waveType boss', () => {
    const info = wm.getWaveAnnouncementInfo(5); // makwa
    expect(info?.waveType).toBe('boss');
    expect(info?.isBoss).toBe(true);
  });

  // ── Trait inference ──────────────────────────────────────────────────────

  it('includes Armoured trait when brute is in pool', () => {
    const info = wm.getWaveAnnouncementInfo(3); // grunt + brute
    expect(info?.traits).toContain('Armoured');
  });

  it('includes Fast trait when runner is in pool', () => {
    const info = wm.getWaveAnnouncementInfo(2); // grunt + runner
    expect(info?.traits).toContain('Fast');
  });

  it('includes Swarming trait when swarm is in pool', () => {
    const info = wm.getWaveAnnouncementInfo(4); // swarm only
    expect(info?.traits).toContain('Swarming');
  });

  it('has no traits for a grunt-only wave', () => {
    const info = wm.getWaveAnnouncementInfo(1); // grunt only
    expect(info?.traits).toEqual([]);
  });

  // ── Creep count ──────────────────────────────────────────────────────────

  it('reports the creep count for normal waves', () => {
    const info = wm.getWaveAnnouncementInfo(1);
    expect(info?.creepCount).toBe(8);
  });

  it('reports creepCount 1 for boss waves', () => {
    const info = wm.getWaveAnnouncementInfo(5);
    expect(info?.creepCount).toBe(1);
  });

  // ── Boss metadata ────────────────────────────────────────────────────────

  it('includes bossName for known bosses', () => {
    expect(wm.getWaveAnnouncementInfo(5)?.bossName).toBe('Makwa');
    expect(wm.getWaveAnnouncementInfo(8)?.bossName).toBe('Migizi');
  });

  it('includes escortCount for boss waves with escorts', () => {
    expect(wm.getWaveAnnouncementInfo(5)?.escortCount).toBe(6);
    expect(wm.getWaveAnnouncementInfo(8)?.escortCount).toBe(8);
  });

  it('includes Armoured trait for Makwa (physicalResistPct > 0)', () => {
    const info = wm.getWaveAnnouncementInfo(5); // makwa
    expect(info?.traits).toContain('Armoured');
  });

  it('includes Immune to Slow trait for Migizi', () => {
    const info = wm.getWaveAnnouncementInfo(8); // migizi
    expect(info?.traits).toContain('Immune to Slow');
  });

  it('includes Splits on Death trait for Waabooz', () => {
    const info = wm.getWaveAnnouncementInfo(9); // waabooz
    expect(info?.traits).toContain('Splits on Death');
  });

  it('includes Regenerating + Poison Immune traits for Animikiins', () => {
    const info = wm.getWaveAnnouncementInfo(10); // animikiins
    expect(info?.traits).toContain('Regenerating');
    expect(info?.traits).toContain('Poison Immune');
  });

  // ── waveNumber passthrough ────────────────────────────────────────────────

  it('includes the correct wave number', () => {
    expect(wm.getWaveAnnouncementInfo(6)?.waveNumber).toBe(6);
  });

  // ── Negative wave number ──────────────────────────────────────────────────

  it('returns null for negative wave numbers', () => {
    expect(wm.getWaveAnnouncementInfo(-1)).toBeNull();
  });

  // ── Boss without escorts ──────────────────────────────────────────────────

  it('returns escortCount 0 for a boss wave with no escorts', () => {
    const WAVE_NO_ESCORTS = [
      {
        count: 14, intervalMs: 900, hpMult: 1.4, speedMult: 1.1,
        pool: ['grunt'],
        boss: 'makwa',
        // no escorts field
      },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wm2 = new WaveManager(mockScene, mockWaypoints, mockActiveCreeps, CREEP_TYPE_DEFS, WAVE_NO_ESCORTS as any);
    const info = wm2.getWaveAnnouncementInfo(1);
    expect(info?.escortCount).toBe(0);
  });

  // ── Unknown creep type falls back to ground ───────────────────────────────

  it('defaults unknown creep types to ground', () => {
    const WAVE_UNKNOWN = [
      { count: 5, intervalMs: 1000, hpMult: 1.0, speedMult: 1.0, pool: ['mystery'] },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wm2 = new WaveManager(mockScene, mockWaypoints, mockActiveCreeps, CREEP_TYPE_DEFS, WAVE_UNKNOWN as any);
    const info = wm2.getWaveAnnouncementInfo(1);
    expect(info?.waveType).toBe('ground');
    expect(info?.traits).toEqual([]);
  });

  // ── Unknown air-named creep type uses AIR_KEYS fallback ───────────────────

  it('infers air type for unknown creep keys matching AIR_KEYS (scout/flier)', () => {
    // 'scout' not in CREEP_TYPE_DEFS of this WaveManager — falls back to AIR_KEYS set
    const WAVE_AIR_UNKNOWN = [
      { count: 5, intervalMs: 1000, hpMult: 1.0, speedMult: 1.0, pool: ['scout'] },
    ];
    // Use empty creepTypeDefs so 'scout' isn't found — falls back to AIR_KEYS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wm2 = new WaveManager(mockScene, mockWaypoints, mockActiveCreeps, [], WAVE_AIR_UNKNOWN as any);
    const info = wm2.getWaveAnnouncementInfo(1);
    expect(info?.waveType).toBe('air');
  });

  // ── Boss bossAbility passthrough ──────────────────────────────────────────

  it('includes bossAbility for known bosses', () => {
    expect(wm.getWaveAnnouncementInfo(5)?.bossAbility).toBe('armored');
    expect(wm.getWaveAnnouncementInfo(9)?.bossAbility).toBe('split');
    expect(wm.getWaveAnnouncementInfo(10)?.bossAbility).toBe('regen');
  });

  // ── Multiple traits on the same wave ──────────────────────────────────────

  it('can produce multiple traits for a wave with brute + runner', () => {
    const WAVE_MULTI_TRAIT = [
      { count: 10, intervalMs: 800, hpMult: 1.0, speedMult: 1.0, pool: ['brute', 'runner'] },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wm2 = new WaveManager(mockScene, mockWaypoints, mockActiveCreeps, CREEP_TYPE_DEFS, WAVE_MULTI_TRAIT as any);
    const info = wm2.getWaveAnnouncementInfo(1);
    expect(info?.traits).toContain('Armoured');
    expect(info?.traits).toContain('Fast');
  });
});
