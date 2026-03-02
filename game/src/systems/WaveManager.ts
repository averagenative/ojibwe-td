import Phaser from 'phaser';
import { Creep } from '../entities/Creep';
import type { CreepConfig, CreepType, BossKilledData } from '../entities/Creep';
import { calculateWaveBonus } from './EconomyManager';
import { BOSS_DEFS, computeWaaboozSplitConfig } from '../data/bossDefs';
import type { BossDef } from '../data/bossDefs';

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
  scout:  'creep-flying',
  flier:  'creep-flying',
};

interface WaveDef {
  count:      number;
  intervalMs: number;
  hpMult:     number;
  speedMult:  number;
  pool:       string[];
  /** Present on boss waves (waves 5, 10, 15, 20). Value is the boss key. */
  boss?:      string;
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
  private scene:       Phaser.Scene;
  private waypoints:   Waypoint[];
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

  /** When true, waves beyond waveDefs.length are generated procedurally. */
  private isEndless = false;
  /** Scaled boss defs generated for endless boss waves, keyed by their unique key. */
  private endlessBossOverrides: Map<string, BossDef> = new Map();

  constructor(
    scene:        Phaser.Scene,
    waypoints:    Waypoint[],
    activeCreeps: Set<Creep>,
    creepTypeDefs: CreepTypeDef[],
    waveDefs:      WaveDef[],
  ) {
    super();
    this.scene         = scene;
    this.waypoints     = waypoints;
    this.activeCreeps  = activeCreeps;
    this.creepTypeDefs = creepTypeDefs;
    this.waveDefs      = waveDefs;
  }

  isActive():      boolean { return this.waveActive; }
  getWaveNumber(): number  { return this.currentWave; }

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

  startWave(waveNumber: number): void {
    const waveDef: WaveDef | undefined = this.waveDefs[waveNumber - 1]
      ?? (this.isEndless ? this.generateEndlessWave(waveNumber) : undefined);
    if (!waveDef) return;

    this.currentWave  = waveNumber;
    this.spawned      = 0;
    this.settled      = 0;
    this.waveActive   = true;

    if (waveDef.boss) {
      // ── Boss wave ────────────────────────────────────────────────────────
      // Check endless overrides first (scaled versions), then global registry.
      const bossDef = this.endlessBossOverrides.get(waveDef.boss) ?? BOSS_DEFS[waveDef.boss];
      if (!bossDef) {
        console.warn(`[WaveManager] Unknown boss key: "${waveDef.boss}"`);
        this.waveActive = false;
        return;
      }
      this.totalToSpawn = 1;

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
  }

  // ── private ───────────────────────────────────────────────────────────────

  private buildSpawnQueue(waveDef: WaveDef): CreepConfig[] {
    const queue: CreepConfig[] = [];

    for (let i = 0; i < waveDef.count; i++) {
      const typeKey = waveDef.pool[Math.floor(Math.random() * waveDef.pool.length)];
      const base    = this.creepTypeDefs.find(t => t.key === typeKey);
      if (!base) continue;

      queue.push({
        hp:        Math.round(base.hp     * waveDef.hpMult),
        speed:     Math.round(base.speed  * waveDef.speedMult),
        type:      base.type,
        reward:    base.reward,
        spriteKey: CREEP_SPRITE_KEYS[base.key],
      });
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
      spriteKey:          'creep-boss',
    };

    const creep = new Creep(this.scene, this.waypoints, config);
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
          spriteKey: 'creep-boss-mini',
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
    const creep = new Creep(this.scene, this.waypoints, config);
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
