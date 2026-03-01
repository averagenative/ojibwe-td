/**
 * AudioManager — procedural WebAudio sound effects and background music.
 *
 * Singleton. Degrades gracefully when AudioContext is unavailable (old browsers,
 * server-side test environments). All audio is generated procedurally via
 * OscillatorNode + GainNode + BiquadFilterNode chains — no audio files required.
 *
 * Phaser-free — can be accessed from any scene or system.
 */

import type Phaser from 'phaser';
import { SaveManager } from '../meta/SaveManager';

// ── Music scheduler constants ─────────────────────────────────────────────────
const LOOK_AHEAD_S    = 0.2;  // schedule this far ahead (seconds)
const SCHEDULE_MS     = 100;  // scheduler interval (ms)

// A2 minor pentatonic arpeggio: A2, C3, E3, G3, A3, G3, E3, C3
const MUSIC_FREQS     = [110, 130.81, 164.81, 196, 220, 196, 164.81, 130.81] as const;
const NOTE_DUR_S      = (60 / 72) / 2; // 8th note at 72 BPM ≈ 0.4167 s

// Three yelp variants [base, peak, tail] Hz — picked randomly on creep kill
const YELP_VARIANTS   = [
  [320, 620, 260],
  [420, 720, 340],
  [260, 500, 210],
] as const;

// ── Helper ────────────────────────────────────────────────────────────────────
function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

// ── AudioManager class ────────────────────────────────────────────────────────

export class AudioManager {
  private static _instance: AudioManager | null = null;

  private ctx:        AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain:    GainNode | null = null;
  private musicGain:  GainNode | null = null;

  // Desired volume levels (independent of mute state).
  private _masterVolume = 1;
  private _sfxVolume    = 1;
  private _musicVolume  = 0.3;
  private _muted        = false;

  // Background music scheduler state.
  private _musicRunning    = false;
  private _musicNextNoteT  = 0;
  private _musicNoteIdx    = 0;
  private _musicTimerId:     ReturnType<typeof setTimeout> | null = null;

  private constructor() {
    this._initAudioContext();
  }

  /**
   * Returns the singleton AudioManager.
   * The optional `scene` parameter is accepted for API compatibility
   * (e.g. future per-scene wiring) but not required for basic use.
   */
  static getInstance(_scene?: Phaser.Scene): AudioManager {
    if (!AudioManager._instance) {
      AudioManager._instance = new AudioManager();
    }
    return AudioManager._instance;
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  private _initAudioContext(): void {
    try {
      this.ctx = new AudioContext();
    } catch {
      // AudioContext unavailable (old browser / SSR / test without mock)
      return;
    }

    if (!this.ctx) return;

    // Gain chain: [sfx nodes] → sfxGain ─┐
    //             [music nodes] → musicGain ─┤→ masterGain → destination
    this.masterGain = this.ctx.createGain();
    this.sfxGain    = this.ctx.createGain();
    this.musicGain  = this.ctx.createGain();

    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Load persisted settings.
    const saved = SaveManager.getInstance().getAudioSettings();
    this._masterVolume = saved.master;
    this._sfxVolume    = saved.sfx;
    this._musicVolume  = saved.music;
    this._muted        = saved.muted;

    this.masterGain.gain.value = this._muted ? 0 : this._masterVolume;
    this.sfxGain.gain.value    = this._sfxVolume;
    this.musicGain.gain.value  = this._musicVolume;

    // Mobile: AudioContext must be resumed after a user gesture.
    document.addEventListener(
      'pointerdown',
      () => { if (this.ctx?.state === 'suspended') void this.ctx.resume(); },
      { once: true },
    );

    this._startMusic();
  }

  // ── Volume controls ───────────────────────────────────────────────────────

  /** Set master volume (0–1). Persisted to SaveManager. */
  setMasterVolume(v: number): void {
    this._masterVolume = clamp01(v);
    if (!this._muted) this._applyGain(this.masterGain, this._masterVolume);
    this._persist();
  }

  /** Set SFX volume (0–1). Persisted to SaveManager. */
  setSfxVolume(v: number): void {
    this._sfxVolume = clamp01(v);
    this._applyGain(this.sfxGain, this._sfxVolume);
    this._persist();
  }

  /** Set music volume (0–1). Persisted to SaveManager. */
  setMusicVolume(v: number): void {
    this._musicVolume = clamp01(v);
    this._applyGain(this.musicGain, this._musicVolume);
    this._persist();
  }

  getMasterVolume(): number { return this._masterVolume; }
  getSfxVolume():    number { return this._sfxVolume; }
  getMusicVolume():  number { return this._musicVolume; }

  isMuted(): boolean { return this._muted; }

  /**
   * Toggle master mute. Stores the current master volume and sets gain to 0
   * (mute), or restores it (unmute). Persisted to SaveManager.
   */
  toggleMute(): void {
    this._muted = !this._muted;
    this._applyGain(this.masterGain, this._muted ? 0 : this._masterVolume);
    this._persist();
  }

  // ── Sound effects ─────────────────────────────────────────────────────────

  /** Short woody "thunk" — played when a non-aura tower is placed. */
  playTowerPlaced(): void {
    const { ctx, sfxGain } = this;
    if (!ctx || !sfxGain) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.09);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.12);
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
  }

  /**
   * Per-tower-type fire sound.
   * For aura towers pass `'aura'` — plays a soft hum on placement/activation.
   */
  playProjectileFired(towerKey: string): void {
    switch (towerKey) {
      case 'cannon': this._sfxCannon(); break;
      case 'frost':  this._sfxFrost();  break;
      case 'tesla':  this._sfxTesla();  break;
      case 'mortar': this._sfxMortar(); break;
      case 'poison': this._sfxPoison(); break;
      case 'aura':   this._sfxAura();   break;
      default: break;
    }
  }

  /** Creep killed — brief creature yelp, randomly selects from 3 variants. */
  playCreepKilled(): void {
    const { ctx, sfxGain } = this;
    if (!ctx || !sfxGain) return;
    const t = ctx.currentTime;

    const v = YELP_VARIANTS[Math.floor(Math.random() * YELP_VARIANTS.length)];
    const [f1, fPeak, f2] = v;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f1, t);
    osc.frequency.linearRampToValueAtTime(fPeak, t + 0.04);
    osc.frequency.exponentialRampToValueAtTime(f2, t + 0.12);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.16);
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
  }

  /** Creep escaped — low descending negative tone. */
  playCreepEscaped(): void {
    const { ctx, sfxGain } = this;
    if (!ctx || !sfxGain) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.45);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.55);
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
  }

  /** Wave complete — short 3-note ascending sting. */
  playWaveComplete(): void {
    const { ctx, sfxGain } = this;
    if (!ctx || !sfxGain) return;

    const notes: Array<[number, number]> = [
      [523.25, 0   ],  // C5
      [659.25, 0.12],  // E5
      [783.99, 0.24],  // G5
    ];
    const dur = 0.22;

    for (const [freq, off] of notes) {
      const t = ctx.currentTime + off;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(g); g.connect(sfxGain);
      osc.start(t); osc.stop(t + dur + 0.02);
      osc.onended = () => { osc.disconnect(); g.disconnect(); };
    }
  }

  /** Boss death — low impact with decaying echoes. */
  playBossDeath(): void {
    const { ctx, sfxGain } = this;
    if (!ctx || !sfxGain) return;

    // [time offset, base freq, peak gain]
    const hits: Array<[number, number, number]> = [
      [0,    65, 0.50],
      [0.2,  80, 0.28],
      [0.55, 60, 0.14],
      [0.9,  55, 0.07],
    ];

    const now = ctx.currentTime;
    for (const [tOff, freq, peak] of hits) {
      const t   = now + tOff;
      const dur = 0.38;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + dur);

      const g = ctx.createGain();
      g.gain.setValueAtTime(peak, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(g); g.connect(sfxGain);
      osc.start(t); osc.stop(t + dur + 0.05);
      osc.onended = () => { osc.disconnect(); g.disconnect(); };
    }
  }

  /** Victory — ~3-second ascending fanfare sting. */
  playVictory(): void {
    const { ctx, sfxGain } = this;
    if (!ctx || !sfxGain) return;

    // [freq Hz, time offset s, duration s]
    const notes: Array<[number, number, number]> = [
      [523.25, 0.00, 0.35],  // C5
      [659.25, 0.35, 0.35],  // E5
      [783.99, 0.70, 0.35],  // G5
      [1046.5, 1.05, 0.35],  // C6
      [1046.5, 1.40, 1.50],  // C6 held
    ];

    const now = ctx.currentTime;
    for (const [freq, tOff, dur] of notes) {
      const t = now + tOff;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.02);
      g.gain.setValueAtTime(0.2, t + dur - 0.05);
      g.gain.linearRampToValueAtTime(0, t + dur);

      osc.connect(g); g.connect(sfxGain);
      osc.start(t); osc.stop(t + dur + 0.02);
      osc.onended = () => { osc.disconnect(); g.disconnect(); };
    }
  }

  /** Game over — descending minor line. */
  playGameOver(): void {
    const { ctx, sfxGain } = this;
    if (!ctx || !sfxGain) return;

    const notes: Array<[number, number]> = [
      [392.00, 0.00],  // G4
      [349.23, 0.45],  // F4
      [311.13, 0.90],  // Eb4
      [261.63, 1.35],  // C4
    ];
    const dur = 0.42;
    const now = ctx.currentTime;

    for (const [freq, tOff] of notes) {
      const t = now + tOff;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(g); g.connect(sfxGain);
      osc.start(t); osc.stop(t + dur + 0.05);
      osc.onended = () => { osc.disconnect(); g.disconnect(); };
    }
  }

  /** UI click — crisp high-frequency tick for buttons and tower selection. */
  playUiClick(): void {
    const { ctx, sfxGain } = this;
    if (!ctx || !sfxGain) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 4800;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.04, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.03);
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
  }

  // ── Private SFX helpers ───────────────────────────────────────────────────

  private _sfxCannon(): void {
    const { ctx, sfxGain } = this;
    if (!ctx || !sfxGain) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.18);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.22);
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
  }

  private _sfxFrost(): void {
    const { ctx, sfxGain } = this;
    if (!ctx || !sfxGain) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(3200, t);
    osc.frequency.linearRampToValueAtTime(2400, t + 0.14);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.2);
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
  }

  private _sfxTesla(): void {
    const { ctx, sfxGain } = this;
    if (!ctx || !sfxGain) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.07);

    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.value = 800;
    flt.Q.value = 3;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(flt); flt.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.12);
    osc.onended = () => { osc.disconnect(); flt.disconnect(); g.disconnect(); };
  }

  private _sfxMortar(): void {
    const { ctx, sfxGain } = this;
    if (!ctx || !sfxGain) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(75, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.22);

    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 250;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(flt); flt.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.28);
    osc.onended = () => { osc.disconnect(); flt.disconnect(); g.disconnect(); };
  }

  private _sfxPoison(): void {
    const { ctx, sfxGain } = this;
    if (!ctx || !sfxGain) return;
    const t = ctx.currentTime;

    const bufLength = Math.floor(ctx.sampleRate * 0.07);
    const buffer    = ctx.createBuffer(1, bufLength, ctx.sampleRate);
    const data      = buffer.getChannelData(0);
    for (let i = 0; i < bufLength; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.25;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.value = 700;
    flt.Q.value = 1.5;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    src.connect(flt); flt.connect(g); g.connect(sfxGain);
    src.start(t);
    src.onended = () => { src.disconnect(); flt.disconnect(); g.disconnect(); };
  }

  private _sfxAura(): void {
    const { ctx, sfxGain } = this;
    if (!ctx || !sfxGain) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 180;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.1);
    g.gain.linearRampToValueAtTime(0.07, t + 0.35);
    g.gain.linearRampToValueAtTime(0, t + 0.5);

    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.55);
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
  }

  // ── Background music ──────────────────────────────────────────────────────

  private _startMusic(): void {
    if (!this.ctx || this._musicRunning) return;
    this._musicRunning   = true;
    this._musicNextNoteT = this.ctx.currentTime + 0.5; // brief startup delay
    this._musicNoteIdx   = 0;
    this._scheduleMusic();
  }

  private _stopMusic(): void {
    this._musicRunning = false;
    if (this._musicTimerId !== null) {
      clearTimeout(this._musicTimerId);
      this._musicTimerId = null;
    }
  }

  private _scheduleMusic(): void {
    if (!this.ctx || !this._musicRunning || !this.musicGain) return;

    while (this._musicNextNoteT < this.ctx.currentTime + LOOK_AHEAD_S) {
      this._scheduleMusicNote(this._musicNextNoteT, this._musicNoteIdx);
      this._musicNextNoteT += NOTE_DUR_S;
      this._musicNoteIdx = (this._musicNoteIdx + 1) % MUSIC_FREQS.length;
    }

    this._musicTimerId = setTimeout(() => this._scheduleMusic(), SCHEDULE_MS);
  }

  private _scheduleMusicNote(t: number, noteIdx: number): void {
    if (!this.ctx || !this.musicGain) return;

    const freq = MUSIC_FREQS[noteIdx];
    const dur  = NOTE_DUR_S * 0.75; // slight articulation gap

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.03);
    g.gain.setValueAtTime(0.05, t + dur * 0.5);
    g.gain.linearRampToValueAtTime(0, t + dur);

    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Stop background music. Called when leaving a scene.
   * The AudioContext remains open; music restarts on the next getInstance() call
   * once the scene is re-entered.
   */
  destroy(): void {
    this._stopMusic();
  }

  /**
   * Restart background music. Call after destroy() when re-entering a scene.
   * Safe to call multiple times (no-op if already running).
   */
  startMusic(): void {
    this._startMusic();
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _applyGain(node: GainNode | null, value: number): void {
    if (node) node.gain.value = value;
  }

  private _persist(): void {
    SaveManager.getInstance().setAudioSettings(
      this._masterVolume,
      this._sfxVolume,
      this._musicVolume,
      this._muted,
    );
  }
}
