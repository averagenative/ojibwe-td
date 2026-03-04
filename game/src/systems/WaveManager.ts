import Phaser from 'phaser';
import { Creep } from '../entities/Creep';
import type { CreepConfig, CreepType, BossKilledData } from '../entities/Creep';
import { calculateWaveBonus } from './EconomyManager';
import { BOSS_DEFS, computeWaaboozSplitConfig } from '../data/bossDefs';
import type { BossDef } from '../data/bossDefs';
import type { RegionDifficulty } from '../data/regionDifficulty';

interface Waypoint { x: number; y: number; }

interface CreepTypeDef {
  key:    string;
  type:   CreepType;
  hp:     number;
  speed:  number;
  reward: number;
}

/** Maps creep-type keys (from creep-types.json) to sprite texture keys. */
export const CREEP_SPRITE_KEYS: Record<string, string> = {
  grunt:  'creep-normal',
  runner: 'creep-fast',
  brute:  'creep-armored',
  swarm:  'creep-normal',
  // Air creeps now have distinct sprites per subtype.
  scout:  'creep-air-scout',   // hawk/falcon silhouette — swift air unit
  flier:  'creep-air-basic',   // generic bird silhouette — basic air unit
};

interface WaveDef {
  count:      number;
  intervalMs: number;
  hpMult:     number;
  speedMult:  number;
  pool:       string[];
  /** Present on boss waves (waves 5, 10, 15, 20). Value is the boss key. */
  boss?:      string;
  /** Optional escort pack — spawned alongside the boss. */
  escorts?: {
    /** How many escort creeps to spawn. */
    count:      number;
    /** Creep-type pool keys to draw from uniformly (e.g. 'grunt', 'runner', 'brute'). */
    types:      string[];
    /** Spawn interval between escorts in ms. */
    intervalMs: number;
    /** Delay before the first escort spawns in ms (default 1200). */
    delayMs?:   number;
  };
}

/**
 * Structured summary of an upcoming wave — produced by getWaveAnnouncementInfo()
 * and consumed by WaveBanner and BetweenWaveScene.
 */
export interface WaveAnnouncementInfo {
  waveNumber:  number;
  /** Inferred from creep pool composition or 'boss' for boss waves. */
  waveType:    'ground' | 'air' | 'mixed' | 'boss';
  /** Human-readable trait strings, e.g. ['Armoured', 'Fast', 'Regenerating']. */
  traits:      string[];
  /** Number of normal creeps in the wave (escorts not included for boss waves). */
  creepCount:  number;
  isBoss:      boolean;
  /** Ojibwe animal name for the boss (e.g. 'Makwa'). */
  bossName?:   string;
  /** Boss key for cutscene lookups (e.g. 'makwa'). */
  bossKey?:    string;
  /** Boss mechanic identifier (e.g. 'armored', 'split', 'regen'). */
  bossAbility?: string;
  /** Escort count for boss waves (0 if none). */
  escortCount?: number;
}

/** Data emitted on scene.events when a creep is killed by a tower. */
export interface CreepKilledData {
  reward: number;
  /** World X position of the creep at death (used by Chain Reaction, Afterburn). */
  x:      number;
  /** World Y position of the creep at death. */
  y:      number;
  /** Whether the killed creep was an air-type (used for air-kill achievement tracking). */
  creepType: 'ground' | 'air';
}

/**
 * Manages wave spawning and completion detection.
 *
 * Emits:
 *  - 'wave-complete' (waveNumber: number) — all creeps from this wave have died or escaped
 *
 * Also emits on scene.events:
 *  - 'creep-killed'     (CreepKilledData)        — creep killed by a tower
 *  - 'creep-escaped'    ({ liveCost, reward })   — creep reached exit
 *  - 'wave-bonus'       (gold: number)           — wave completion bonus
 *  - 'boss-wave-start'  ({ bossKey, bossName })  — fired when a boss wave begins
 *  - 'boss-killed'      (BossKilledData)         — fired when a boss creep is killed
 */
/** Boss rotation for endless waves (cycled from wave 25 onward). */
const ENDLESS_BOSS_ROTATION = ['makwa', 'migizi', 'waabooz', 'animikiins'] as const;

/**
 * Per-wave tracking record used to support multiple concurrent active waves.
 * Each call to startWave() creates one ActiveWave pushed onto _activeWaves[].
 */
interface ActiveWave {
  waveNumber:        number;
  totalToSpawn:      number;
  spawned:           number;
  settled:           number;
  /** Alternates between ground paths for multi-path maps. Starts at 0 each wave. */
  spawnPathIndex:    number;
  spawnQueue:        CreepConfig[];
  spawnTimer?:       Phaser.Time.TimerEvent;
  escortDelayTimer?: Phaser.Time.TimerEvent;
  escortTimer?:      Phaser.Time.TimerEvent;
  /** Set by cleanup() to prevent settled creeps from completing a cancelled wave. */
  cancelled:         boolean;
}

export class WaveManager extends Phaser.Events.EventEmitter {
  private scene:        Phaser.Scene;
  /** Primary ground path (path A / path index 0). Used by Waabooz split and single-path maps. */
  private waypoints:    Waypoint[];
  /** All ground paths — length 1 for single-path maps, 2+ for multi-path maps. */
  private waypointPaths: Waypoint[][];
  /** Simplified route for air creeps (spawn → exit or custom air lane). */
  private airWaypoints: Waypoint[];
  private activeCreeps: Set<Creep>;

  private creepTypeDefs: CreepTypeDef[] = [];
  private waveDefs:      WaveDef[]      = [];

  /** All currently-running waves. Supports concurrent wave stacking via rush. */
  private _activeWaves: ActiveWave[] = [];

  /** When true, waves beyond waveDefs.length are generated procedurally. */
  private isEndless = false;
  /** Scaled boss defs generated for endless boss waves, keyed by their unique key. */
  private endlessBossOverrides: Map<string, BossDef> = new Map();

  /** Per-region difficulty config (null = baseline / Region 1). */
  private regionDifficulty: RegionDifficulty | null = null;

  // ── Ascension modifiers ────────────────────────────────────────────────────
  /** Additional HP multiplier from the Ascension system (1 = no change). */
  private ascensionHpMult    = 1;
  /** Whether armoured creeps appear earlier due to Ascension 3 (waves earlier count). */
  private ascensionArmoredEarly = 0;
  /** Per-second regen fraction for normal creeps (Ascension 4). */
  private ascensionRegenPerSec = 0;
  /** Whether immune creeps should have both immunities (Ascension 5). */
  private ascensionImmuneCombo = false;

  constructor(
    scene:        Phaser.Scene,
    /**
     * Ground waypoints — either a flat single-path array (`Waypoint[]`) for
     * backward compatibility, or a multi-path array (`Waypoint[][]`).
     * Single-path arrays are normalised to `[[...waypoints]]` internally.
     */
    waypoints:    Waypoint[] | Waypoint[][],
    activeCreeps: Set<Creep>,
    creepTypeDefs: CreepTypeDef[],
    waveDefs:      WaveDef[],
    airWaypoints?: Waypoint[],
    regionDifficulty?: RegionDifficulty,
    ascensionConfig?: {
      hpMult:       number;
      armoredEarly: number;
      regenPerSec:  number;
      immuneCombo:  boolean;
    },
  ) {
    super();
    this.scene            = scene;
    this.activeCreeps     = activeCreeps;
    this.creepTypeDefs    = creepTypeDefs;
    this.waveDefs         = waveDefs;
    this.regionDifficulty = regionDifficulty ?? null;

    if (ascensionConfig) {
      this.ascensionHpMult     = ascensionConfig.hpMult;
      this.ascensionArmoredEarly = ascensionConfig.armoredEarly;
      this.ascensionRegenPerSec = ascensionConfig.regenPerSec;
      this.ascensionImmuneCombo = ascensionConfig.immuneCombo;
    }

    // Normalise waypoints to array-of-paths.
    if (waypoints.length > 0 && Array.isArray(waypoints[0])) {
      this.waypointPaths = waypoints as Waypoint[][];
    } else {
      this.waypointPaths = [waypoints as Waypoint[]];
    }
    this.waypoints = this.waypointPaths[0] ?? [];

    // Default air path: direct line from spawn to exit of path A.
    // A custom air lane can be supplied via the optional parameter (from map JSON).
    this.airWaypoints = (airWaypoints && airWaypoints.length >= 2)
      ? airWaypoints
      : [this.waypoints[0], this.waypoints[this.waypoints.length - 1]];
  }

  /** Returns true if one or more waves are currently active (creeps spawning or alive). */
  isActive(): boolean { return this._activeWaves.length > 0; }

  /**
   * Returns true if the wave at `waveNum` contains any air-type creeps.
   * Used by GameScene to show an "Air wave incoming" HUD warning before the wave.
   */
  hasAirCreepsInWave(waveNum: number): boolean {
    const waveDef = this.waveDefs[waveNum - 1]
      ?? (this.isEndless ? this.generateEndlessWave(waveNum) : undefined);
    if (!waveDef) return false;

    // Check pool for any air-type creep key.
    const hasAirInPool = waveDef.pool.some(typeKey => {
      const def = this.creepTypeDefs.find(t => t.key === typeKey);
      return def?.type === 'air';
    });
    if (hasAirInPool) return true;

    // Check boss type.
    if (waveDef.boss) {
      const bossDef = this.endlessBossOverrides.get(waveDef.boss) ?? BOSS_DEFS[waveDef.boss];
      if (bossDef?.type === 'air') return true;
    }

    return false;
  }

  /**
   * Enable endless mode.  Once enabled, calling startWave() with a wave number
   * beyond the loaded waveDefs array generates procedural waves instead of
   * returning immediately.  Call this before the first wave.
   */
  enableEndless(): void {
    this.isEndless = true;
  }

  /**
   * Generate a procedural WaveDef for endless wave `n` (n > 20).
   *
   * Scaling formula applied on top of wave-20 base stats:
   *   HP    = wave20.hpMult    × (1 + 0.12 × (n − 20))
   *   Speed = wave20.speedMult × (1 + 0.03 × (n − 20))
   *
   * Boss waves occur at every 5th wave (25, 30, 35 …), cycling through the
   * four existing boss archetypes with stats scaled by the same formula.
   */
  generateEndlessWave(n: number): WaveDef {
    const overflow   = n - 20;
    const base       = this.waveDefs[19]; // wave 20 is the baseline
    const hpMult     = base.hpMult    * (1 + 0.12 * overflow);
    const speedMult  = base.speedMult * (1 + 0.03 * overflow);
    const isBossWave = n % 5 === 0;

    if (isBossWave) {
      // Cycle through the boss rotation starting at wave 25.
      const rotIdx    = Math.floor((n - 25) / 5) % ENDLESS_BOSS_ROTATION.length;
      const bossKey   = ENDLESS_BOSS_ROTATION[(rotIdx + ENDLESS_BOSS_ROTATION.length) % ENDLESS_BOSS_ROTATION.length];
      const baseBoss  = BOSS_DEFS[bossKey];
      const endlessKey = `${bossKey}-ew${n}`;

      this.endlessBossOverrides.set(endlessKey, {
        ...baseBoss,
        key:   endlessKey,
        hp:    Math.round(baseBoss.hp    * (1 + 0.12 * overflow)),
        speed: Math.round(baseBoss.speed * (1 + 0.03 * overflow)),
      });

      return {
        count:      base.count,
        intervalMs: base.intervalMs,
        hpMult,
        speedMult,
        pool:       base.pool,
        boss:       endlessKey,
        escorts: {
          count:      4 + Math.floor((n - 25) / 5),
          types:      ['runner', 'brute'],
          intervalMs: 1000,
        },
      };
    }

    return {
      count:      base.count,
      intervalMs: base.intervalMs,
      hpMult,
      speedMult,
      pool:       base.pool,
    };
  }

  /**
   * Returns a summary of a wave's creep composition for commander ability previews.
   * Returns null if the wave number is out of range.
   */
  getWaveInfo(waveNum: number): { count: number; types: string[]; totalRewardGold: number } | null {
    const waveDef = this.waveDefs[waveNum - 1];
    if (!waveDef) return null;

    const types = [...new Set(waveDef.pool)];
    const avgReward = waveDef.pool.reduce((sum, key) => {
      const def = this.creepTypeDefs.find(d => d.key === key);
      return sum + (def?.reward ?? 0);
    }, 0) / waveDef.pool.length;

    return {
      count:           waveDef.count,
      types,
      totalRewardGold: Math.round(avgReward * waveDef.count),
    };
  }

  /**
   * Returns a WaveAnnouncementInfo for the given wave number, inferring wave
   * type and traits from the wave definition and creep-type registry.
   * Returns null if the wave is out of range (and endless mode is not enabled).
   */
  getWaveAnnouncementInfo(waveNum: number): WaveAnnouncementInfo | null {
    const waveDef: WaveDef | undefined = this.waveDefs[waveNum - 1]
      ?? (this.isEndless ? this.generateEndlessWave(waveNum) : undefined);
    if (!waveDef) return null;

    // ── Boss wave ────────────────────────────────────────────────────────────
    if (waveDef.boss) {
      const rawBoss = this.endlessBossOverrides.get(waveDef.boss) ?? BOSS_DEFS[waveDef.boss];
      const bossDef = rawBoss ? this.resolveBossDef(rawBoss) : undefined;
      const traits: string[] = [];
      if (bossDef) {
        if (bossDef.physicalResistPct > 0)       traits.push('Armoured');
        if (bossDef.isSlowImmune)                traits.push('Immune to Slow');
        if (bossDef.isPoisonImmune)              traits.push('Poison Immune');
        if (bossDef.regenPercentPerSec > 0)      traits.push('Regenerating');
        if (bossDef.bossAbility === 'split')     traits.push('Splits on Death');
      }
      return {
        waveNumber:  waveNum,
        waveType:    'boss',
        traits,
        creepCount:  1,
        isBoss:      true,
        bossName:    bossDef?.name,
        bossKey:     bossDef?.key,
        bossAbility: bossDef?.bossAbility,
        escortCount: waveDef.escorts?.count ?? 0,
      };
    }

    // ── Normal wave — infer type from pool ───────────────────────────────────
    const AIR_KEYS   = new Set(['scout', 'flier']);
    const poolSet    = new Set(waveDef.pool);

    let hasAir    = false;
    let hasGround = false;
    for (const key of waveDef.pool) {
      const def = this.creepTypeDefs.find(d => d.key === key);
      const t   = def?.type ?? (AIR_KEYS.has(key) ? 'air' : 'ground');
      if (t === 'air') hasAir = true; else hasGround = true;
    }

    let waveType: 'ground' | 'air' | 'mixed';
    if (hasAir && hasGround) waveType = 'mixed';
    else if (hasAir)         waveType = 'air';
    else                     waveType = 'ground';

    // ── Infer traits from creep pool ─────────────────────────────────────────
    const traits: string[] = [];
    if (poolSet.has('brute'))  traits.push('Armoured');
    if (poolSet.has('runner')) traits.push('Fast');
    if (poolSet.has('swarm'))  traits.push('Swarming');

    return {
      waveNumber: waveNum,
      waveType,
      traits,
      creepCount: waveDef.count,
      isBoss:     false,
    };
  }

  /**
   * Start spawning wave `waveNumber`.  Can be called while other waves are still
   * active — each call creates an independent ActiveWave tracked in _activeWaves[].
   * wave-complete fires per wave when ALL its creeps have died or escaped.
   */
  startWave(waveNumber: number): void {
    const waveDef: WaveDef | undefined = this.waveDefs[waveNumber - 1]
      ?? (this.isEndless ? this.generateEndlessWave(waveNumber) : undefined);
    if (!waveDef) return;

    const wave: ActiveWave = {
      waveNumber,
      totalToSpawn:   0,
      spawned:        0,
      settled:        0,
      spawnPathIndex: 0,
      spawnQueue:     [],
      cancelled:      false,
    };
    this._activeWaves.push(wave);

    if (waveDef.boss) {
      // ── Boss wave ────────────────────────────────────────────────────────
      // Check endless overrides first (scaled versions), then global registry.
      // Apply region-specific boss overrides (extra armor, immunities, etc.).
      const rawBossDef = this.endlessBossOverrides.get(waveDef.boss) ?? BOSS_DEFS[waveDef.boss];
      const bossDef    = rawBossDef ? this.resolveBossDef(rawBossDef) : undefined;
      if (!bossDef) {
        console.warn(`[WaveManager] Unknown boss key: "${waveDef.boss}"`);
        this._activeWaves.pop();
        return;
      }

      // Build escort queue using this wave's scaling (may be empty).
      const escortQueue = waveDef.escorts
        ? this.buildEscortQueue(waveDef, waveDef.escorts, waveNumber)
        : [];

      wave.totalToSpawn = 1 + escortQueue.length;

      // Announce the boss wave immediately.
      this.scene.events.emit('boss-wave-start', {
        bossKey:  bossDef.key,
        bossName: bossDef.name,
      });

      // Spawn the boss after a short dramatic delay.
      this.scene.time.addEvent({
        delay:    800,
        callback: () => {
          if (wave.cancelled) return;
          this._spawnBossForWave(bossDef, wave);
        },
      });

      // Spawn escorts (if any): first after delayMs, then every intervalMs.
      if (escortQueue.length > 0) {
        const delayMs    = waveDef.escorts!.delayMs ?? 1200;
        const intervalMs = waveDef.escorts!.intervalMs;
        let   escortIdx  = 0;

        const spawnNextEscort = (): void => {
          if (wave.cancelled || escortIdx >= escortQueue.length) return;
          this._spawnOneForWave(escortQueue[escortIdx++], wave);
        };

        wave.escortDelayTimer = this.scene.time.addEvent({
          delay:    delayMs,
          callback: () => {
            spawnNextEscort(); // First escort
            const remaining = escortQueue.length - 1;
            if (remaining > 0) {
              wave.escortTimer = this.scene.time.addEvent({
                delay:    intervalMs,
                callback: spawnNextEscort,
                repeat:   remaining - 1, // fires `remaining` times total
              });
            }
          },
        });
      }

    } else {
      // ── Normal wave ──────────────────────────────────────────────────────
      wave.totalToSpawn = waveDef.count;
      wave.spawnQueue   = this.buildSpawnQueue(waveDef, waveNumber);

      wave.spawnTimer = this.scene.time.addEvent({
        delay:    waveDef.intervalMs,
        callback: () => this._spawnNextForWave(wave),
        repeat:   waveDef.count - 1,
      });
    }
  }

  /**
   * Cancel all active waves and destroy their spawn timers.
   * Called when the scene shuts down or game over occurs.
   */
  cleanup(): void {
    for (const wave of this._activeWaves) {
      wave.cancelled = true;
      wave.spawnTimer?.destroy();
      wave.escortTimer?.destroy();
      wave.escortDelayTimer?.destroy();
    }
    this._activeWaves = [];
  }

  // ── private ───────────────────────────────────────────────────────────────

  /**
   * Apply per-creep regional traits (armor, slow/poison immunity) to a
   * freshly-built CreepConfig.  Uses random rolls against the region's
   * configured fractions.  Skips bosses and already-armored brutes.
   */
  private applyRegionTraits(config: CreepConfig, typeKey: string): void {
    const rd = this.regionDifficulty;
    if (!rd) return;

    // Armor: apply to non-brute ground creeps that aren't already armored.
    if (!config.isArmored && config.type === 'ground' && typeKey !== 'brute') {
      if (rd.armoredFraction > 0 && Math.random() < rd.armoredFraction) {
        config.isArmored        = true;
        config.physicalResistPct = rd.armorResistPct;
      }
    }

    // Slow immunity.
    if (rd.slowImmuneFraction > 0 && Math.random() < rd.slowImmuneFraction) {
      config.isSlowImmune = true;
    }

    // Poison immunity.
    if (rd.poisonImmuneFraction > 0 && Math.random() < rd.poisonImmuneFraction) {
      config.isPoisonImmune = true;
    }
  }

  /**
   * Apply per-creep Ascension modifiers to a freshly-built CreepConfig.
   * Called after applyRegionTraits(), so it can build on top of regional traits.
   */
  private applyAscensionTraits(config: CreepConfig, _typeKey: string): void {
    // Skip boss creeps — their stats are set directly from BossDef.
    if (config.isBoss) return;

    // Level 3: armored creeps appear earlier — force armor on ground creeps with 40% chance.
    if (this.ascensionArmoredEarly > 0 && !config.isArmored && config.type === 'ground') {
      if (Math.random() < 0.40) {
        config.isArmored        = true;
        config.physicalResistPct = 0.25; // same as region armor resist
      }
    }

    // Level 4: all non-boss creeps regenerate HP.
    if (this.ascensionRegenPerSec > 0) {
      config.regenPercentPerSec = this.ascensionRegenPerSec;
    }

    // Level 5: immune creeps get both slow AND poison immunity.
    if (this.ascensionImmuneCombo) {
      if (config.isSlowImmune || config.isPoisonImmune) {
        config.isSlowImmune   = true;
        config.isPoisonImmune = true;
      }
    }
  }

  /**
   * Resolve a BossDef with regional overrides applied.
   * Returns a new object — does NOT mutate the original.
   */
  private resolveBossDef(baseDef: BossDef): BossDef {
    const rd = this.regionDifficulty;
    if (!rd) return baseDef;

    // Strip endless-wave suffix (e.g. 'makwa-ew25' → 'makwa') to match override keys.
    const baseKey  = baseDef.key.replace(/-ew\d+$/, '');
    const override = rd.bossOverrides[baseKey];
    if (!override) return baseDef;

    return {
      ...baseDef,
      hp:                 Math.round(baseDef.hp    * (override.hpMult    ?? 1)),
      speed:              Math.round(baseDef.speed  * (override.speedMult ?? 1)),
      physicalResistPct:  override.physicalResistPct  ?? baseDef.physicalResistPct,
      isSlowImmune:       override.isSlowImmune       ?? baseDef.isSlowImmune,
      isPoisonImmune:     override.isPoisonImmune     ?? baseDef.isPoisonImmune,
      regenPercentPerSec: override.regenPercentPerSec ?? baseDef.regenPercentPerSec,
      splitCount:         override.splitCount          ?? baseDef.splitCount,
    };
  }

  private buildSpawnQueue(waveDef: WaveDef, waveNumber: number): CreepConfig[] {
    const queue: CreepConfig[] = [];

    for (let i = 0; i < waveDef.count; i++) {
      const typeKey = waveDef.pool[Math.floor(Math.random() * waveDef.pool.length)];
      const base    = this.creepTypeDefs.find(t => t.key === typeKey);
      if (!base) continue;

      const cfg: CreepConfig = {
        hp:         Math.round(base.hp     * waveDef.hpMult * this.ascensionHpMult),
        speed:      Math.round(base.speed  * waveDef.speedMult),
        type:       base.type,
        reward:     base.reward,
        isArmored:  typeKey === 'brute',
        spriteKey:  CREEP_SPRITE_KEYS[base.key],
        waveNumber,
      };
      this.applyRegionTraits(cfg, typeKey);
      this.applyAscensionTraits(cfg, typeKey);
      queue.push(cfg);
    }

    return queue;
  }

  /**
   * Build a CreepConfig array for the escort pack on a boss wave.
   * Applies the same HP/speed scaling as the boss wave's normal creeps.
   * Silently skips any type keys not found in creepTypeDefs.
   */
  private buildEscortQueue(
    waveDef: WaveDef,
    escorts: NonNullable<WaveDef['escorts']>,
    waveNumber: number,
  ): CreepConfig[] {
    const queue: CreepConfig[] = [];

    for (let i = 0; i < escorts.count; i++) {
      const typeKey = escorts.types[Math.floor(Math.random() * escorts.types.length)];
      const base    = this.creepTypeDefs.find(t => t.key === typeKey);
      if (!base) continue;

      const cfg: CreepConfig = {
        hp:         Math.round(base.hp    * waveDef.hpMult * this.ascensionHpMult),
        speed:      Math.round(base.speed * waveDef.speedMult),
        type:       base.type,
        reward:     base.reward,
        isArmored:  typeKey === 'brute',
        spriteKey:  CREEP_SPRITE_KEYS[base.key],
        waveNumber,
      };
      this.applyRegionTraits(cfg, typeKey);
      this.applyAscensionTraits(cfg, typeKey);
      queue.push(cfg);
    }

    return queue;
  }

  private _spawnNextForWave(wave: ActiveWave): void {
    const config = wave.spawnQueue[wave.spawned];
    if (!config) return;
    this._spawnOneForWave(config, wave);
  }

  /**
   * Spawn the boss creep for a boss wave.
   * Sets up a special 'died' handler that emits 'boss-killed' and — for
   * Waabooz — handles the split-on-death mechanic before calling _onSettledForWave().
   */
  private _spawnBossForWave(bossDef: BossDef, wave: ActiveWave): void {
    wave.spawned++;

    const config: CreepConfig = {
      hp:                 Math.round(bossDef.hp * this.ascensionHpMult),
      speed:              bossDef.speed,
      type:               bossDef.type,
      reward:             bossDef.reward,
      isBoss:             true,
      bossAbility:        bossDef.bossAbility,
      physicalResistPct:  bossDef.physicalResistPct,
      isSlowImmune:       bossDef.isSlowImmune,
      isPoisonImmune:     bossDef.isPoisonImmune,
      regenPercentPerSec: bossDef.regenPercentPerSec,
      tint:               bossDef.tint,
      bossRewardGold:     bossDef.rewardGold,
      bossRewardOffer:    bossDef.rewardOffer,
      bossKey:            bossDef.key,
      bossName:           bossDef.name,
      // Use the boss-specific sprite (e.g. 'boss-makwa') if defined,
      // falling back to the derived convention 'boss-{key}'.
      spriteKey:          bossDef.spriteKey ?? `boss-${bossDef.key}`,
      waveNumber:         wave.waveNumber,
    };

    const bossWp = config.type === 'air' ? this.airWaypoints : this.waypoints;
    const creep = new Creep(this.scene, bossWp, config);
    this.activeCreeps.add(creep);

    creep.once('reached-exit', () => {
      this.activeCreeps.delete(creep);
      // Boss escape costs 3 lives; reward passed for Tax Collector.
      this.scene.events.emit('creep-escaped', { liveCost: 3, reward: creep.reward });
      this._onSettledForWave(wave);
    });

    if (bossDef.bossAbility === 'split') {
      // ── Waabooz split mechanic ───────────────────────────────────────────
      creep.once('died', () => {
        this.activeCreeps.delete(creep);
        this.scene.events.emit('creep-killed', { reward: creep.reward, x: creep.x, y: creep.y, creepType: creep.creepType });

        const bossKilledData: BossKilledData = {
          bossKey:    bossDef.key,
          bossName:   bossDef.name,
          rewardGold: bossDef.rewardGold,
          rewardOffer: bossDef.rewardOffer,
          tint:        bossDef.tint,
          x:           creep.x,
          y:           creep.y,
        };
        this.scene.events.emit('boss-killed', bossKilledData);

        // Compute mini-copy stats.
        const splitCfg  = computeWaaboozSplitConfig(bossDef);
        const splitCount = splitCfg.count;

        // Pre-account for split copies BEFORE calling _onSettledForWave, so the
        // wave-complete check doesn't fire prematurely.
        wave.totalToSpawn += splitCount;
        wave.spawned      += splitCount;

        // Build waypoints starting at the boss's current position.
        const parentWpIdx  = creep.getCurrentWaypointIndex();
        const remainingWps = [
          { x: creep.x, y: creep.y },
          ...this.waypoints.slice(parentWpIdx),
        ];

        const miniConfig: CreepConfig = {
          hp:        splitCfg.hp,
          speed:     splitCfg.speed,
          type:      'ground',
          reward:    splitCfg.reward,
          // Mini-copies are NOT bosses — they cost 1 life on escape.
          isBoss:    false,
          // Recognisable baby-hare sprite (distinct from generic mini-boss).
          spriteKey: 'boss-waabooz-mini',
        };

        for (let i = 0; i < splitCount; i++) {
          this._spawnMiniForWave(miniConfig, remainingWps, wave);
        }

        // Now settle the boss itself (settled goes from 0 → 1, but
        // totalToSpawn is now 1 + splitCount, so wave won't complete yet).
        this._onSettledForWave(wave);
      });

    } else {
      // ── All other boss types ─────────────────────────────────────────────
      creep.once('died', () => {
        this.activeCreeps.delete(creep);
        this.scene.events.emit('creep-killed', { reward: creep.reward, x: creep.x, y: creep.y, creepType: creep.creepType });

        const bossKilledData: BossKilledData = {
          bossKey:    bossDef.key,
          bossName:   bossDef.name,
          rewardGold: bossDef.rewardGold,
          rewardOffer: bossDef.rewardOffer,
          tint:        bossDef.tint,
          x:           creep.x,
          y:           creep.y,
        };
        this.scene.events.emit('boss-killed', bossKilledData);

        this._onSettledForWave(wave);
      });
    }
  }

  private _spawnOneForWave(config: CreepConfig, wave: ActiveWave): void {
    wave.spawned++;
    // Air creeps fly a simplified direct route (always path A for single or multi-path).
    // Ground creeps alternate between paths on multi-path maps.
    let wp: Waypoint[];
    if (config.type === 'air') {
      wp = this.airWaypoints;
    } else if (this.waypointPaths.length > 1) {
      wp = this.waypointPaths[wave.spawnPathIndex % this.waypointPaths.length];
      wave.spawnPathIndex++;
    } else {
      wp = this.waypoints;
    }
    const creep = new Creep(this.scene, wp, config);
    this.activeCreeps.add(creep);

    creep.once('reached-exit', () => {
      this.activeCreeps.delete(creep);
      // Normal creeps cost 1 life on escape; also pass reward for Tax Collector.
      this.scene.events.emit('creep-escaped', { liveCost: 1, reward: creep.reward });
      this._onSettledForWave(wave);
    });

    creep.once('died', () => {
      this.activeCreeps.delete(creep);
      this.scene.events.emit('creep-killed', { reward: creep.reward, x: creep.x, y: creep.y, creepType: creep.creepType });
      this._onSettledForWave(wave);
    });
  }

  /**
   * Spawn a mini-Waabooz copy at a specific position along the path.
   * Does NOT increment `wave.spawned` — the caller pre-accounts for split copies.
   * Mini-copies cost only 1 life on escape (they are not bosses).
   */
  private _spawnMiniForWave(config: CreepConfig, waypoints: Waypoint[], wave: ActiveWave): void {
    const creep = new Creep(this.scene, waypoints, config);
    this.activeCreeps.add(creep);

    creep.once('reached-exit', () => {
      this.activeCreeps.delete(creep);
      this.scene.events.emit('creep-escaped', { liveCost: 1, reward: creep.reward });
      this._onSettledForWave(wave);
    });

    creep.once('died', () => {
      this.activeCreeps.delete(creep);
      this.scene.events.emit('creep-killed', { reward: creep.reward, x: creep.x, y: creep.y, creepType: creep.creepType });
      this._onSettledForWave(wave);
    });
  }

  /**
   * Called when a single creep from `wave` dies or escapes.
   * Removes the wave from _activeWaves and fires wave-bonus + wave-complete
   * once all of that wave's creeps have settled.
   */
  private _onSettledForWave(wave: ActiveWave): void {
    wave.settled++;
    if (
      !wave.cancelled &&
      wave.spawned  >= wave.totalToSpawn &&
      wave.settled  >= wave.totalToSpawn
    ) {
      const idx = this._activeWaves.indexOf(wave);
      if (idx !== -1) this._activeWaves.splice(idx, 1);
      const bonus = calculateWaveBonus(wave.waveNumber);
      this.scene.events.emit('wave-bonus', bonus);
      this.emit('wave-complete', wave.waveNumber);
    }
  }
}
