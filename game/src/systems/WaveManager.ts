import Phaser from 'phaser';
import { Creep } from '../entities/Creep';
import type { CreepConfig, CreepType } from '../entities/Creep';
import { calculateWaveBonus } from './EconomyManager';

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
}

/**
 * Manages wave spawning and completion detection.
 *
 * Emits:
 *  - 'wave-complete' (waveNumber: number) — all creeps from this wave have died or escaped
 *
 * Also emits on scene.events:
 *  - 'creep-killed'  (reward: number)  — creep killed by a tower
 *  - 'creep-escaped'                   — creep reached the exit
 *  - 'wave-bonus'    (gold: number)    — wave completion bonus (listen in GameScene)
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
    this.totalToSpawn = waveDef.count;
    this.spawned      = 0;
    this.settled      = 0;
    this.waveActive   = true;

    // Build randomised spawn queue for this wave
    this.spawnQueue = this.buildSpawnQueue(waveDef);

    this.spawnTimer = this.scene.time.addEvent({
      delay:         waveDef.intervalMs,
      callback:      this.spawnNext,
      callbackScope: this,
      repeat:        waveDef.count - 1,
    });
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

  private spawnOne(config: CreepConfig): void {
    this.spawned++;
    const creep = new Creep(this.scene, this.waypoints, config);
    this.activeCreeps.add(creep);

    creep.once('reached-exit', () => {
      this.activeCreeps.delete(creep);
      this.scene.events.emit('creep-escaped');
      this.onSettled();
    });

    creep.once('died', () => {
      this.activeCreeps.delete(creep);
      this.scene.events.emit('creep-killed', creep.reward);
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
