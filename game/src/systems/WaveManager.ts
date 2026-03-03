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

  private currentWave  = 0;
  private totalToSpawn = 0;
  private spawned      = 0;
  private settled      = 0;
  private waveActive   = false;
  private spawnQueue:  CreepConfig[] = [];
  private spawnTimer?: Phaser.Time.TimerEvent;
  /** Increments with each ground/air creep spawned; used to alternate between paths. */
  private spawnPathIndex = 0;
  /** Timer for the initial delay before escort spawning begins. */
  private escortDelayTimer?: Phaser.Time.TimerEvent;
  /** Timer for the repeat-interval escort spawning after the first escort. */
  private escortTimer?: Phaser.Time.TimerEvent;

  /** When true, waves beyond waveDefs.length are generated procedurally. */
  private isEndless = false;
  /** Scaled boss defs generated for endless boss waves, keyed by their unique key. */
  private endlessBossOverrides: Map<string, BossDef> = new Map();

  /** Per-region difficulty config (null = baseline / Region 1). */
  private regionDifficulty: RegionDifficulty | null = null;

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
  ) {
    super();
    this.scene            = scene;
    this.activeCreeps     = activeCreeps;
    this.creepTypeDefs    = creepTypeDefs;
    this.waveDefs         = waveDefs;
    this.regionDifficulty = regionDifficulty ?? null;

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

  isActive():      boolean { return this.waveActive; }
  getWaveNumber(): number  { return this.currentWave; }

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

  startWave(waveNumber: number): void {
    const waveDef: WaveDef | undefined = this.waveDefs[waveNumber - 1]
      ?? (this.isEndless ? this.generateEndlessWave(waveNumber) : undefined);
    if (!waveDef) return;

    this.currentWave   = waveNumber;
    this.spawned       = 0;
    this.settled       = 0;
    this.waveActive    = true;
    this.spawnPathIndex = 0; // reset alternation each wave

    if (waveDef.boss) {
      // ── Boss wave ────────────────────────────────────────────────────────
      // Check endless overrides first (scaled versions), then global registry.
      // Apply region-specific boss overrides (extra armor, immunities, etc.).
      const rawBossDef = this.endlessBossOverrides.get(waveDef.boss) ?? BOSS_DEFS[waveDef.boss];
      const bossDef    = rawBossDef ? this.resolveBossDef(rawBossDef) : undefined;
      if (!bossDef) {
        console.warn(`[WaveManager] Unknown boss key: "${waveDef.boss}"`);
        this.waveActive = false;
        return;
      }

      // Build escort queue using this wave's scaling (may be empty).
      const escortQueue = waveDef.escorts
        ? this.buildEscortQueue(waveDef, waveDef.escorts)
        : [];

      this.totalToSpawn = 1 + escortQueue.length;

      // Announce the boss wave immediately.
      this.scene.events.emit('boss-wave-start', {
        bossKey:  bossDef.key,
        bossName: bossDef.name,
      });

      // Spawn the boss after a short dramatic delay.
      this.scene.time.addEvent({
        delay:    800,
        callback: () => {
          if (!this.waveActive) return;
          this.spawnBoss(bossDef);
        },
      });

      // Spawn escorts (if any): first after delayMs, then every intervalMs.
      if (escortQueue.length > 0) {
        const delayMs    = waveDef.escorts!.delayMs ?? 1200;
        const intervalMs = waveDef.escorts!.intervalMs;
        let   escortIdx  = 0;

        const spawnNextEscort = (): void => {
          if (!this.waveActive || escortIdx >= escortQueue.length) return;
          this.spawnOne(escortQueue[escortIdx++]);
        };

        this.escortDelayTimer = this.scene.time.addEvent({
          delay:    delayMs,
          callback: () => {
            spawnNextEscort(); // First escort
            const remaining = escortQueue.length - 1;
            if (remaining > 0) {
              this.escortTimer = this.scene.time.addEvent({
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
      this.totalToSpawn = waveDef.count;
      this.spawnQueue   = this.buildSpawnQueue(waveDef);

      this.spawnTimer = this.scene.time.addEvent({
        delay:         waveDef.intervalMs,
        callback:      this.spawnNext,
        callbackScope: this,
        repeat:        waveDef.count - 1,
      });
    }
  }

  cleanup(): void {
    this.spawnTimer?.destroy();
    this.escortTimer?.destroy();
    this.escortDelayTimer?.destroy();
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

  private buildSpawnQueue(waveDef: WaveDef): CreepConfig[] {
    const queue: CreepConfig[] = [];

    for (let i = 0; i < waveDef.count; i++) {
      const typeKey = waveDef.pool[Math.floor(Math.random() * waveDef.pool.length)];
      const base    = this.creepTypeDefs.find(t => t.key === typeKey);
      if (!base) continue;

      const cfg: CreepConfig = {
        hp:        Math.round(base.hp     * waveDef.hpMult),
        speed:     Math.round(base.speed  * waveDef.speedMult),
        type:      base.type,
        reward:    base.reward,
        isArmored: typeKey === 'brute',
        spriteKey: CREEP_SPRITE_KEYS[base.key],
      };
      this.applyRegionTraits(cfg, typeKey);
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
  ): CreepConfig[] {
    const queue: CreepConfig[] = [];

    for (let i = 0; i < escorts.count; i++) {
      const typeKey = escorts.types[Math.floor(Math.random() * escorts.types.length)];
      const base    = this.creepTypeDefs.find(t => t.key === typeKey);
      if (!base) continue;

      const cfg: CreepConfig = {
        hp:        Math.round(base.hp    * waveDef.hpMult),
        speed:     Math.round(base.speed * waveDef.speedMult),
        type:      base.type,
        reward:    base.reward,
        isArmored: typeKey === 'brute',
        spriteKey: CREEP_SPRITE_KEYS[base.key],
      };
      this.applyRegionTraits(cfg, typeKey);
      queue.push(cfg);
    }

    return queue;
  }

  private spawnNext(): void {
    const config = this.spawnQueue[this.spawned];
    if (!config) return;
    this.spawnOne(config);
  }

  /**
   * Spawn the boss creep for a boss wave.
   * Sets up a special 'died' handler that emits 'boss-killed' and — for
   * Waabooz — handles the split-on-death mechanic before calling onSettled().
   */
  private spawnBoss(bossDef: BossDef): void {
    this.spawned++;

    const config: CreepConfig = {
      hp:                 bossDef.hp,
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
    };

    const bossWp = config.type === 'air' ? this.airWaypoints : this.waypoints;
    const creep = new Creep(this.scene, bossWp, config);
    this.activeCreeps.add(creep);

    creep.once('reached-exit', () => {
      this.activeCreeps.delete(creep);
      // Boss escape costs 3 lives; reward passed for Tax Collector.
      this.scene.events.emit('creep-escaped', { liveCost: 3, reward: creep.reward });
      this.onSettled();
    });

    if (bossDef.bossAbility === 'split') {
      // ── Waabooz split mechanic ───────────────────────────────────────────
      creep.once('died', () => {
        this.activeCreeps.delete(creep);
        this.scene.events.emit('creep-killed', { reward: creep.reward, x: creep.x, y: creep.y });

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

        // Pre-account for split copies BEFORE calling onSettled, so the
        // wave-complete check doesn't fire prematurely.
        this.totalToSpawn += splitCount;
        this.spawned      += splitCount;

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
          this.spawnMini(miniConfig, remainingWps);
        }

        // Now settle the boss itself (settled goes from 0 → 1, but
        // totalToSpawn is now 1 + splitCount, so wave won't complete yet).
        this.onSettled();
      });

    } else {
      // ── All other boss types ─────────────────────────────────────────────
      creep.once('died', () => {
        this.activeCreeps.delete(creep);
        this.scene.events.emit('creep-killed', { reward: creep.reward, x: creep.x, y: creep.y });

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

        this.onSettled();
      });
    }
  }

  private spawnOne(config: CreepConfig): void {
    this.spawned++;
    // Air creeps fly a simplified direct route (always path A for single or multi-path).
    // Ground creeps alternate between paths on multi-path maps.
    let wp: Waypoint[];
    if (config.type === 'air') {
      wp = this.airWaypoints;
    } else if (this.waypointPaths.length > 1) {
      wp = this.waypointPaths[this.spawnPathIndex % this.waypointPaths.length];
      this.spawnPathIndex++;
    } else {
      wp = this.waypoints;
    }
    const creep = new Creep(this.scene, wp, config);
    this.activeCreeps.add(creep);

    creep.once('reached-exit', () => {
      this.activeCreeps.delete(creep);
      // Normal creeps cost 1 life on escape; also pass reward for Tax Collector.
      this.scene.events.emit('creep-escaped', { liveCost: 1, reward: creep.reward });
      this.onSettled();
    });

    creep.once('died', () => {
      this.activeCreeps.delete(creep);
      this.scene.events.emit('creep-killed', { reward: creep.reward, x: creep.x, y: creep.y });
      this.onSettled();
    });
  }

  /**
   * Spawn a mini-Waabooz copy at a specific position along the path.
   * Does NOT increment `spawned` — the caller pre-accounts for split copies.
   * Mini-copies cost only 1 life on escape (they are not bosses).
   */
  private spawnMini(config: CreepConfig, waypoints: Waypoint[]): void {
    const creep = new Creep(this.scene, waypoints, config);
    this.activeCreeps.add(creep);

    creep.once('reached-exit', () => {
      this.activeCreeps.delete(creep);
      this.scene.events.emit('creep-escaped', { liveCost: 1, reward: creep.reward });
      this.onSettled();
    });

    creep.once('died', () => {
      this.activeCreeps.delete(creep);
      this.scene.events.emit('creep-killed', { reward: creep.reward, x: creep.x, y: creep.y });
      this.onSettled();
    });
  }

  private onSettled(): void {
    this.settled++;
    if (
      this.waveActive &&
      this.spawned  >= this.totalToSpawn &&
      this.settled  >= this.totalToSpawn
    ) {
      this.waveActive = false;
      const bonus = calculateWaveBonus(this.currentWave);
      this.scene.events.emit('wave-bonus', bonus);
      this.emit('wave-complete', this.currentWave);
    }
  }
}
