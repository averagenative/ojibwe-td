/**
 * AudioManager — procedural WebAudio sound effects and background music,
 * with optional file-based audio layer that is preferred when available.
 *
 * Singleton. Degrades gracefully when AudioContext is unavailable (old browsers,
 * server-side test environments). All audio is generated procedurally via
 * OscillatorNode + GainNode + BiquadFilterNode chains — no audio files required.
 *
 * File-based audio layer (Phase 3):
 *   Call `registerBuffer(key, arrayBuffer)` to pre-decode an audio file. Once
 *   registered, play methods automatically prefer the decoded buffer over
 *   procedural synthesis. Missing buffers → transparent procedural fallback.
 *
 * Music tracks:
 *   `startMusicTrack(key, fadeMs?)` — start a named file-based track with
 *   optional crossfade. `startMusic()` tries 'music-gameplay' buffer first,
 *   then falls back to the procedural arpeggio.
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

// Default crossfade duration for music track transitions
const CROSSFADE_MS    = 800;

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

  // Per-channel mute state (independent of master mute).
  private _musicMuted = false;
  private _sfxMuted   = false;

  // Background music scheduler state (procedural arpeggio).
  private _musicRunning    = false;
  private _musicNextNoteT  = 0;
  private _musicNoteIdx    = 0;
  private _musicTimerId:     ReturnType<typeof setTimeout> | null = null;

  // ── File-based audio ──────────────────────────────────────────────────────

  /** Pre-decoded AudioBuffers keyed by 'sfx-*' / 'music-*'. */
  private _buffers: Map<string, AudioBuffer> = new Map();

  /** Currently playing file-based music source (null if using procedural). */
  private _fileMusicSource: AudioBufferSourceNode | null = null;

  /**
   * Per-track gain node used for crossfade (0 → 1 on start, 1 → 0 on stop).
   * Connects to `musicGain` so that `setMusicVolume()` still applies.
   */
  private _fileMusicGain: GainNode | null = null;

  /** Key of the currently playing file-based music track. */
  private _fileMusicKey: string | null = null;

  /**
   * Track queued to start once the AudioContext transitions to 'running'.
   * Set by startMusicTrack() when the context is suspended, cleared by
   * _onContextResumed() once playback begins or by destroy().
   */
  private _pendingTrack: { key: string; fadeMs: number } | null = null;

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
    //             [proc. music] → musicGain ─┤→ masterGain → destination
    //             [file music] → _fileMusicGain → musicGain ─┘
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
    this._musicMuted   = saved.musicMuted;
    this._sfxMuted     = saved.sfxMuted;

    this.masterGain.gain.value = this._muted      ? 0 : this._masterVolume ** 3;
    this.sfxGain.gain.value    = this._sfxMuted   ? 0 : this._sfxVolume ** 3;
    this.musicGain.gain.value  = this._musicMuted ? 0 : this._musicVolume ** 3;

    // Resume AudioContext on any user interaction. Keep listening until
    // the context is actually running (not just once).
    //
    // iOS WebKit policy: AudioContext.resume() MUST be called synchronously
    // within a native user-gesture handler (touchstart/click). Calling it from
    // Phaser's synthetic event loop (requestAnimationFrame) does NOT satisfy
    // iOS's user-activation requirement. This native document listener
    // guarantees resume() fires in the right call stack.
    const resumeCtx = (): void => {
      if (!this.ctx) return;

      if (this.ctx.state === 'running') {
        // Already running — remove listeners and flush any pending track.
        for (const evt of ['pointerdown', 'click', 'keydown', 'touchstart'] as const) {
          document.removeEventListener(evt, resumeCtx);
        }
        this._onContextResumed();
        return;
      }

      if (this.ctx.state === 'suspended') {
        // Call resume() synchronously here (satisfies iOS user-activation policy).
        // Chain _onContextResumed so any pending track starts once running.
        this.ctx.resume().then(() => {
          for (const evt of ['pointerdown', 'click', 'keydown', 'touchstart'] as const) {
            document.removeEventListener(evt, resumeCtx);
          }
          this._onContextResumed();
        }).catch(() => { /* ignore — will retry on next gesture */ });
      }
    };
    for (const evt of ['pointerdown', 'click', 'keydown', 'touchstart'] as const) {
      document.addEventListener(evt, resumeCtx);
    }

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
    this._applyGain(this.sfxGain, this._sfxMuted ? 0 : this._sfxVolume);
    this._persist();
  }

  /** Set music volume (0–1). Persisted to SaveManager. */
  setMusicVolume(v: number): void {
    this._musicVolume = clamp01(v);
    this._applyGain(this.musicGain, this._musicMuted ? 0 : this._musicVolume);
    this._persist();
  }

  getMasterVolume(): number { return this._masterVolume; }
  getSfxVolume():    number { return this._sfxVolume; }
  getMusicVolume():  number { return this._musicVolume; }

  isMuted():      boolean { return this._muted; }
  isMusicMuted(): boolean { return this._musicMuted; }
  isSfxMuted():   boolean { return this._sfxMuted; }

  /**
   * Mute or unmute music independently of SFX.
   * Does not affect the master mute state. Persisted to SaveManager.
   */
  setMusicMuted(muted: boolean): void {
    this._musicMuted = muted;
    this._applyGain(this.musicGain, muted ? 0 : this._musicVolume);
    this._persist();
  }

  /**
   * Mute or unmute SFX independently of music.
   * Does not affect the master mute state. Persisted to SaveManager.
   */
  setSfxMuted(muted: boolean): void {
    this._sfxMuted = muted;
    this._applyGain(this.sfxGain, muted ? 0 : this._sfxVolume);
    this._persist();
  }

  /**
   * Toggle master mute. Stores the current master volume and sets gain to 0
   * (mute), or restores it (unmute). Persisted to SaveManager.
   */
  toggleMute(): void {
    this._muted = !this._muted;
    this._applyGain(this.masterGain, this._muted ? 0 : this._masterVolume);
    this._persist();
  }

  // ── File-based audio registration ─────────────────────────────────────────

  /**
   * Decode and register an audio file buffer.
   *
   * Call once per audio key (typically from BootScene after Phaser loads the
   * file). Decoding is async; once resolved, the buffer is available for all
   * play methods which will prefer it over procedural synthesis.
   *
   * @param key        AudioManager key, e.g. 'sfx-rock-hurler', 'music-gameplay'
   * @param arrayBuffer Raw audio data (e.g. from Phaser's audio cache)
   */
  async registerBuffer(key: string, arrayBuffer: ArrayBuffer): Promise<void> {
    if (!this.ctx) return;
    try {
      // .slice(0) copies the buffer — some implementations detach the original
      const decoded = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
      this._buffers.set(key, decoded);
    } catch {
      // Decode failed (unsupported codec, corrupt file, etc.) — procedural
      // fallback remains active for this key.
    }
  }

  /**
   * Register an already-decoded AudioBuffer directly.
   * Phaser's WebAudio cache may store decoded AudioBuffers rather than raw
   * ArrayBuffers, so this method accepts them without re-decoding.
   */
  registerDecodedBuffer(key: string, audioBuffer: AudioBuffer): void {
    this._buffers.set(key, audioBuffer);
  }

  /**
   * Start a named file-based music track with an optional crossfade.
   *
   * If no buffer is registered for `key`, this is a no-op (silent — does NOT
   * fall back to procedural arpeggio). Use `startMusic()` for the gameplay
   * track with procedural fallback.
   *
   * If the same key is already playing, this is a no-op.
   *
   * @param key    AudioManager music key, e.g. 'music-menu', 'music-gameplay'
   * @param fadeMs Crossfade duration in milliseconds (default 800 ms)
   */
  startMusicTrack(key: string, fadeMs = CROSSFADE_MS): void {
    const buf = this._buffers.get(key);
    if (!buf || !this.ctx || !this.musicGain) return;

    // Same track already playing — no-op.
    if (this._fileMusicKey === key && this._fileMusicSource) return;

    // Stop procedural arpeggio if running.
    this._stopMusic();

    if (this.ctx.state === 'suspended') {
      // iOS/WebKit policy: AudioContext.resume() must be called synchronously
      // within a native user-gesture handler (touchstart/click). We call it
      // here synchronously — if this method is on the native event stack this
      // satisfies iOS. If it's called from Phaser's rAF loop (not a native
      // gesture), iOS will reject it, but the native document listener in
      // _initAudioContext will also call resume() on the next gesture and
      // trigger _onContextResumed() to start this queued track.
      //
      // We do NOT call _crossfadeToTrack() immediately because src.start()
      // silently fails on a suspended AudioContext on iOS.
      this._pendingTrack = { key, fadeMs };
      this.ctx.resume().then(() => { this._onContextResumed(); }).catch(() => { /* ignored */ });
      return;
    }

    this._crossfadeToTrack(buf, key, fadeMs);
  }

  // ── Sound effects ─────────────────────────────────────────────────────────

  /** Short woody "thunk" — played when a non-aura tower is placed. */
  playTowerPlaced(): void {
    if (this._playBufferSfx('sfx-tower-place')) return;
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
      case 'arrow':       if (this._playBufferSfx('sfx-arrow-fire'))       return; break;
      case 'rock-hurler': if (this._playBufferSfx('sfx-rock-hurler-fire')) return; this._sfxRockHurler(); break;
      case 'frost':       if (this._playBufferSfx('sfx-frost-fire'))       return; this._sfxFrost();  break;
      case 'tesla':       if (this._playBufferSfx('sfx-tesla-fire'))       return; this._sfxTesla();  break;
      case 'poison':      if (this._playBufferSfx('sfx-poison-fire'))      return; this._sfxPoison(); break;
      case 'aura':        if (this._playBufferSfx('sfx-aura'))             return; this._sfxAura();   break;
      default: break;
    }
  }

  /** Per-tower-type projectile impact sound. Falls back silently if no buffer loaded. */
  playProjectileHit(towerKey: string): void {
    switch (towerKey) {
      case 'arrow':       this._playBufferSfx('sfx-arrow-hit');       break;
      case 'rock-hurler': this._playBufferSfx('sfx-rock-hurler-hit'); break;
      case 'frost':       this._playBufferSfx('sfx-frost-hit');       break;
      case 'tesla':       this._playBufferSfx('sfx-tesla-hit');       break;
      case 'poison':      this._playBufferSfx('sfx-poison-hit');      break;
      default: break;
    }
  }

  /** Creep killed — brief creature yelp, randomly selects from 3 variants. */
  playCreepKilled(): void {
    const sfxKeys = ['sfx-creep-death-01', 'sfx-creep-death-02', 'sfx-creep-death-03'];
    const pick = sfxKeys[Math.floor(Math.random() * sfxKeys.length)];
    if (this._playBufferSfx(pick)) return;

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
    if (this._playBufferSfx('sfx-creep-escape')) return;
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
    if (this._playBufferSfx('sfx-wave-complete')) return;
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
    if (this._playBufferSfx('sfx-boss-death')) return;
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
    if (this._playBufferSfx('sfx-victory')) return;
    // Skip procedural fanfare when a generated victory music track exists —
    // GameOverScene will start 'music-victory' moments later.
    if (this._buffers.has('music-victory')) return;
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
    if (this._playBufferSfx('sfx-game-over')) return;
    if (this._buffers.has('music-gameover')) return;
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

  /**
   * Wave-incoming cue — played when the wave announcement banner appears.
   *
   * Per wave type:
   *  - ground: low percussive drum hit
   *  - air:    wind/swoosh sweep
   *  - mixed:  drum + wind layered
   *  - boss:   deep horn with sub-bass rumble
   */
  playWaveIncoming(waveType: 'ground' | 'air' | 'mixed' | 'boss'): void {
    switch (waveType) {
      case 'ground': this._sfxWaveDrum();                       break;
      case 'air':    this._sfxWaveWind();                       break;
      case 'mixed':  this._sfxWaveDrum(); this._sfxWaveWind();  break;
      case 'boss':   this._sfxWaveBossHorn();                   break;
    }
  }

  /** UI click — crisp high-frequency tick for buttons and tower selection. */
  playUiClick(): void {
    if (this._playBufferSfx('sfx-ui-click')) return;
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

  /**
   * Play a pre-decoded audio buffer as a one-shot SFX through the sfxGain bus.
   * Returns `true` if the buffer was found and playback was started.
   * Returns `false` if the buffer is not registered (caller should use
   * procedural fallback).
   */
  private _playBufferSfx(key: string): boolean {
    const buf = this._buffers.get(key);
    if (!buf || !this.ctx || !this.sfxGain) return false;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    // Attenuate file-based SFX to match procedural SFX levels (~0.2–0.4).
    // Without this, MP3 samples at full gain drown out music.
    const g = this.ctx.createGain();
    g.gain.value = 0.3;
    src.connect(g);
    g.connect(this.sfxGain);
    src.start();
    src.onended = () => { src.disconnect(); g.disconnect(); };
    return true;
  }

  /** Low percussive drum hit — ground-wave incoming cue. */
  private _sfxWaveDrum(): void {
    const { ctx, sfxGain } = this;
    if (!ctx || !sfxGain) return;
    const t = ctx.currentTime;

    // Sub-bass thump
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.18);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.38, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    // Snare noise burst
    const bufLen = Math.floor(ctx.sampleRate * 0.08);
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.25));
    }
    const src  = ctx.createBufferSource();
    src.buffer = buf;
    const gN   = ctx.createGain();
    gN.gain.setValueAtTime(0.18, t);
    gN.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(g);   g.connect(sfxGain);
    src.connect(gN); gN.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.25);
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
    src.start(t);
    src.onended = () => { src.disconnect(); gN.disconnect(); };
  }

  /** Swept high-pass noise — air-wave incoming cue. */
  private _sfxWaveWind(): void {
    const { ctx, sfxGain } = this;
    if (!ctx || !sfxGain) return;
    const t = ctx.currentTime;

    const bufLen = Math.floor(ctx.sampleRate * 0.38);
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const flt = ctx.createBiquadFilter();
    flt.type = 'highpass';
    flt.frequency.setValueAtTime(600,  t);
    flt.frequency.linearRampToValueAtTime(4200, t + 0.18);
    flt.frequency.linearRampToValueAtTime(1200, t + 0.38);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.09);
    g.gain.linearRampToValueAtTime(0,    t + 0.38);

    src.connect(flt); flt.connect(g); g.connect(sfxGain);
    src.start(t);
    src.onended = () => { src.disconnect(); flt.disconnect(); g.disconnect(); };
  }

  /** Deep horn + sub-bass rumble — boss-wave incoming cue. */
  private _sfxWaveBossHorn(): void {
    const { ctx, sfxGain } = this;
    if (!ctx || !sfxGain) return;
    const t = ctx.currentTime;

    // Horn: sawtooth through low-pass
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, t);
    osc.frequency.setValueAtTime(65, t + 0.28);

    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 320;
    flt.Q.value = 2.5;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0,    t);
    g.gain.linearRampToValueAtTime(0.42, t + 0.14);
    g.gain.setValueAtTime(0.42, t + 0.52);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    // Sub-bass rumble
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(38, t);
    osc2.frequency.exponentialRampToValueAtTime(18, t + 0.5);

    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.28, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(flt); flt.connect(g);   g.connect(sfxGain);
    osc2.connect(g2); g2.connect(sfxGain);
    osc.start(t);  osc.stop(t + 1.0);
    osc2.start(t); osc2.stop(t + 0.65);
    osc.onended  = () => { osc.disconnect();  flt.disconnect();  g.disconnect(); };
    osc2.onended = () => { osc2.disconnect(); g2.disconnect(); };
  }

  private _sfxRockHurler(): void {
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

    // ── Wind layer: bandpass-filtered noise — soft cold whoosh ───────────────
    const bufLen = Math.floor(ctx.sampleRate * 0.16);
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    // Bandpass sweeps 1400 → 650 Hz: cold exhale character; Q=1.5 (gentle resonance)
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.setValueAtTime(1400, t);
    bpf.frequency.linearRampToValueAtTime(650, t + 0.13);
    bpf.Q.value = 1.5;

    // Soft envelope: 8 ms attack, decays to silence; peak well below rock-hurler (0.4) / tesla (0.2)
    const gWind = ctx.createGain();
    gWind.gain.setValueAtTime(0, t);
    gWind.gain.linearRampToValueAtTime(0.085, t + 0.008);
    gWind.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    src.connect(bpf); bpf.connect(gWind); gWind.connect(sfxGain);
    src.start(t);
    src.onended = () => { src.disconnect(); bpf.disconnect(); gWind.disconnect(); };

    // ── Tone layer: faint sine for a hint of crystalline cold ────────────────
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(680, t);
    osc.frequency.linearRampToValueAtTime(420, t + 0.11);

    const gTone = ctx.createGain();
    gTone.gain.setValueAtTime(0, t);
    gTone.gain.linearRampToValueAtTime(0.020, t + 0.008);
    gTone.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gTone); gTone.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.13);
    osc.onended = () => { osc.disconnect(); gTone.disconnect(); };
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

  // ── Background music (procedural arpeggio) ────────────────────────────────

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

  // ── File-based music helpers ───────────────────────────────────────────────

  /**
   * Internal: crossfade from the current file track to a new one.
   * Fades out the old source over `fadeMs / 2` ms, then starts the new one
   * with a fade-in over `fadeMs` ms.
   */
  private _crossfadeToTrack(
    buf: AudioBuffer,
    key: string,
    fadeMs: number,
  ): void {
    if (!this.ctx || !this.musicGain) return;

    const t     = this.ctx.currentTime;
    const fadeS = Math.max(fadeMs / 1000, 0.01);

    // Fade out the currently playing file track (if any).
    if (this._fileMusicSource && this._fileMusicGain) {
      const oldSrc  = this._fileMusicSource;
      const oldGain = this._fileMusicGain;
      const fadeOutS = fadeS * 0.5;
      oldGain.gain.setValueAtTime(oldGain.gain.value, t);
      oldGain.gain.linearRampToValueAtTime(0, t + fadeOutS);
      oldSrc.stop(t + fadeOutS);
      oldSrc.onended = () => { oldSrc.disconnect(); oldGain.disconnect(); };
      // Clear references so stop/destroy don't double-stop.
      this._fileMusicSource = null;
      this._fileMusicGain   = null;
      this._fileMusicKey    = null;
    }

    // Start the new track with a fade-in.
    const src  = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop   = true;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + fadeS);

    // Route: src → gain (crossfade) → musicGain (volume) → masterGain
    src.connect(gain);
    gain.connect(this.musicGain);
    src.start();

    this._fileMusicSource = src;
    this._fileMusicGain   = gain;
    this._fileMusicKey    = key;
  }

  /**
   * Stop the currently playing file-based music track with an optional fade.
   * @param fadeMs Fade-out duration in ms (0 = immediate stop)
   */
  private _stopFileMusicTrack(fadeMs = CROSSFADE_MS): void {
    if (!this._fileMusicSource || !this._fileMusicGain || !this.ctx) return;

    const src   = this._fileMusicSource;
    const gain  = this._fileMusicGain;
    const fadeS = Math.max(fadeMs / 1000, 0);
    const t     = this.ctx.currentTime;

    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + fadeS);
    src.stop(t + fadeS);
    src.onended = () => { src.disconnect(); gain.disconnect(); };

    this._fileMusicSource = null;
    this._fileMusicGain   = null;
    this._fileMusicKey    = null;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Explicitly resume the AudioContext.
   *
   * Call this synchronously inside a native user-gesture handler (touchstart,
   * click, keydown) to satisfy iOS WebKit's user-activation policy. The
   * BootScene document-level listeners call this automatically, but callers
   * may invoke it directly for maximum reliability.
   */
  resumeContext(): void {
    if (this.ctx?.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  /**
   * Called once the AudioContext transitions to 'running' — either from the
   * native gesture listener or from the .then() chain in startMusicTrack().
   * Starts any track that was queued while the context was suspended.
   */
  private _onContextResumed(): void {
    if (!this._pendingTrack) return;
    const { key, fadeMs } = this._pendingTrack;
    this._pendingTrack = null;
    const buf = this._buffers.get(key);
    if (buf && this.musicGain) {
      this._crossfadeToTrack(buf, key, fadeMs);
    }
  }

  /**
   * Stop background music (both procedural and file-based).
   * Called when leaving a scene. The AudioContext remains open; music restarts
   * on the next `startMusic()` call when the scene is re-entered.
   */
  destroy(): void {
    this._stopMusic();
    this._stopFileMusicTrack(0);
    this._pendingTrack = null;
  }

  /**
   * Restart background music. Call from GameScene.create() after destroy().
   *
   * Prefers the 'music-gameplay' file buffer if registered; otherwise falls
   * back to the procedural A2-minor-pentatonic arpeggio. Safe to call multiple
   * times (no-op if the correct music is already running).
   */
  startMusic(): void {
    if (this._buffers.has('music-gameplay')) {
      this.startMusicTrack('music-gameplay');
    } else {
      this._startMusic();
    }
  }

  /**
   * Start a file-based music track with a procedural arpeggio fallback.
   *
   * Unlike `startMusicTrack()` — which is a silent no-op when the buffer is
   * absent — this method restarts the procedural arpeggio when the requested
   * key has not been registered. Use it for screens that always need music
   * (victory screen, game-over screen).
   *
   * @param key    AudioManager music key, e.g. 'music-victory'
   * @param fadeMs Crossfade duration in milliseconds (default 800 ms)
   */
  startMusicTrackWithFallback(key: string, fadeMs = CROSSFADE_MS): void {
    if (this._buffers.has(key)) {
      this.startMusicTrack(key, fadeMs);
    } else {
      this._startMusic();
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Apply a perceptual (exponential) volume curve so the slider feels natural.
   * Linear gain doesn't match human hearing — this maps 0–1 to an x³ curve
   * so that midpoint (~0.5) sounds roughly "half as loud".
   */
  private _applyGain(node: GainNode | null, value: number): void {
    if (node) node.gain.value = value * value * value;
  }

  private _persist(): void {
    SaveManager.getInstance().setAudioSettings(
      this._masterVolume,
      this._sfxVolume,
      this._musicVolume,
      this._muted,
      this._musicMuted,
      this._sfxMuted,
    );
  }
}
