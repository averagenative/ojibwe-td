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

  startWave(waveNumber: number): void {
    const waveDef = this.waveDefs[waveNumber - 1];
    if (!waveDef) return;

    this.currentWave  = waveNumber;
    this.spawned      = 0;
    this.settled      = 0;
    this.waveActive   = true;

    if (waveDef.boss) {
      // ── Boss wave ────────────────────────────────────────────────────────
      const bossDef = BOSS_DEFS[waveDef.boss];
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
        hp:     Math.round(base.hp     * waveDef.hpMult),
        speed:  Math.round(base.speed  * waveDef.speedMult),
        type:   base.type,
        reward: base.reward,
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
          hp:     splitCfg.hp,
          speed:  splitCfg.speed,
          type:   'ground',
          reward: splitCfg.reward,
          // Mini-copies are NOT bosses — they cost 1 life on escape.
          isBoss: false,
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
