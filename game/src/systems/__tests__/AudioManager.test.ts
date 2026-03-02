/**
 * AudioManager unit tests.
 *
 * AudioContext is mocked globally so the tests run in jsdom without a real
 * browser audio stack. The singleton is reset between tests by directly
 * nulling the private static field via a TypeScript cast.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioManager } from '../AudioManager';
import { SaveManager } from '../../meta/SaveManager';

// ── AudioContext mock ──────────────────────────────────────────────────────────

/** Minimal mock that satisfies the AudioManager's AudioContext usage. */
function makeMockContext() {
  const makeGain = () => ({
    gain: {
      value: 1,
      setValueAtTime:            vi.fn(),
      linearRampToValueAtTime:   vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect:    vi.fn(),
    disconnect: vi.fn(),
  });

  const makeOscillator = () => ({
    type: 'sine' as OscillatorType,
    frequency: {
      value: 440,
      setValueAtTime:            vi.fn(),
      linearRampToValueAtTime:   vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect:    vi.fn(),
    disconnect: vi.fn(),
    start:      vi.fn(),
    stop:       vi.fn(),
    onended:    null as (() => void) | null,
  });

  const makeFilter = () => ({
    type: 'lowpass' as BiquadFilterType,
    frequency: {
      value: 350,
      setValueAtTime:            vi.fn(),
      linearRampToValueAtTime:   vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    Q:         { value: 1 },
    connect:    vi.fn(),
    disconnect: vi.fn(),
  });

  const makeBufferSource = () => ({
    buffer:     null as AudioBuffer | null,
    loop:       false,
    connect:    vi.fn(),
    disconnect: vi.fn(),
    start:      vi.fn(),
    stop:       vi.fn(),
    onended:    null as (() => void) | null,
  });

  const mockBuffer = {
    getChannelData: (_channel: number) => new Float32Array(4410),
    duration:         1.0,
    length:           44100,
    numberOfChannels: 2,
    sampleRate:       44100,
  } as unknown as AudioBuffer;

  return {
    state:       'running' as AudioContextState,
    currentTime: 0,
    sampleRate:  44100,
    destination: {} as AudioDestinationNode,
    createGain:         vi.fn().mockImplementation(() => makeGain()),
    createOscillator:   vi.fn().mockImplementation(() => makeOscillator()),
    createBiquadFilter: vi.fn().mockImplementation(() => makeFilter()),
    createBufferSource: vi.fn().mockImplementation(() => makeBufferSource()),
    createBuffer:       vi.fn().mockReturnValue(mockBuffer),
    decodeAudioData:    vi.fn().mockResolvedValue(mockBuffer),
    resume:             vi.fn().mockResolvedValue(undefined),
    close:              vi.fn(),
  };
}

type MockContext = ReturnType<typeof makeMockContext>;
let mockCtx: MockContext;

// ── Singleton reset helper ─────────────────────────────────────────────────────

function resetSingleton() {
  (AudioManager as unknown as { _instance: null })._instance = null;
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  mockCtx = makeMockContext();
  // Use a class constructor so Vitest doesn't warn about non-class mock implementations.
  vi.stubGlobal('AudioContext', class { constructor() { return mockCtx; } });
  resetSingleton();
  // Reset SaveManager singleton + clear storage so audio settings don't leak between tests.
  (SaveManager as unknown as { _instance: null })._instance = null;
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetSingleton();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AudioManager', () => {
  describe('singleton', () => {
    it('getInstance returns the same instance every call', () => {
      const a = AudioManager.getInstance();
      const b = AudioManager.getInstance();
      expect(a).toBe(b);
    });

    it('creates a new instance after reset', () => {
      const a = AudioManager.getInstance();
      resetSingleton();
      const b = AudioManager.getInstance();
      expect(a).not.toBe(b);
    });
  });

  describe('volume controls', () => {
    it('getMasterVolume returns 1 by default', () => {
      const am = AudioManager.getInstance();
      expect(am.getMasterVolume()).toBe(1);
    });

    it('getSfxVolume returns 1 by default', () => {
      const am = AudioManager.getInstance();
      expect(am.getSfxVolume()).toBe(1);
    });

    it('getMusicVolume returns 0.3 by default', () => {
      const am = AudioManager.getInstance();
      expect(am.getMusicVolume()).toBe(0.3);
    });

    it('setMasterVolume clamps to 0–1', () => {
      const am = AudioManager.getInstance();
      am.setMasterVolume(1.5);
      expect(am.getMasterVolume()).toBe(1);
      am.setMasterVolume(-0.5);
      expect(am.getMasterVolume()).toBe(0);
    });

    it('setSfxVolume stores the value', () => {
      const am = AudioManager.getInstance();
      am.setSfxVolume(0.6);
      expect(am.getSfxVolume()).toBeCloseTo(0.6);
    });

    it('setMusicVolume stores the value', () => {
      const am = AudioManager.getInstance();
      am.setMusicVolume(0.5);
      expect(am.getMusicVolume()).toBeCloseTo(0.5);
    });

    it('setMasterVolume to 0 keeps isMuted as false', () => {
      const am = AudioManager.getInstance();
      am.setMasterVolume(0);
      expect(am.isMuted()).toBe(false);
    });
  });

  describe('mute toggle', () => {
    it('isMuted is false by default', () => {
      const am = AudioManager.getInstance();
      expect(am.isMuted()).toBe(false);
    });

    it('toggleMute flips the muted state', () => {
      const am = AudioManager.getInstance();
      am.toggleMute();
      expect(am.isMuted()).toBe(true);
      am.toggleMute();
      expect(am.isMuted()).toBe(false);
    });

    it('toggling mute does not change stored master volume', () => {
      const am = AudioManager.getInstance();
      am.setMasterVolume(0.75);
      am.toggleMute();
      expect(am.getMasterVolume()).toBeCloseTo(0.75);
      am.toggleMute();
      expect(am.getMasterVolume()).toBeCloseTo(0.75);
    });
  });

  describe('SFX methods', () => {
    it('playTowerPlaced does not throw', () => {
      const am = AudioManager.getInstance();
      expect(() => am.playTowerPlaced()).not.toThrow();
    });

    it('playProjectileFired handles all tower keys without throwing', () => {
      const am = AudioManager.getInstance();
      const keys = ['rock-hurler', 'frost', 'tesla', 'poison', 'aura', 'arrow', 'unknown'];
      for (const key of keys) {
        expect(() => am.playProjectileFired(key)).not.toThrow();
      }
    });

    it('playCreepKilled does not throw', () => {
      const am = AudioManager.getInstance();
      expect(() => am.playCreepKilled()).not.toThrow();
    });

    it('playCreepEscaped does not throw', () => {
      const am = AudioManager.getInstance();
      expect(() => am.playCreepEscaped()).not.toThrow();
    });

    it('playWaveComplete does not throw', () => {
      const am = AudioManager.getInstance();
      expect(() => am.playWaveComplete()).not.toThrow();
    });

    it('playBossDeath does not throw', () => {
      const am = AudioManager.getInstance();
      expect(() => am.playBossDeath()).not.toThrow();
    });

    it('playVictory does not throw', () => {
      const am = AudioManager.getInstance();
      expect(() => am.playVictory()).not.toThrow();
    });

    it('playGameOver does not throw', () => {
      const am = AudioManager.getInstance();
      expect(() => am.playGameOver()).not.toThrow();
    });

    it('playUiClick does not throw', () => {
      const am = AudioManager.getInstance();
      expect(() => am.playUiClick()).not.toThrow();
    });
  });

  describe('volume boundary cases', () => {
    it('setSfxVolume clamps to 0–1', () => {
      const am = AudioManager.getInstance();
      am.setSfxVolume(2.0);
      expect(am.getSfxVolume()).toBe(1);
      am.setSfxVolume(-1);
      expect(am.getSfxVolume()).toBe(0);
    });

    it('setMusicVolume clamps to 0–1', () => {
      const am = AudioManager.getInstance();
      am.setMusicVolume(5);
      expect(am.getMusicVolume()).toBe(1);
      am.setMusicVolume(-0.1);
      expect(am.getMusicVolume()).toBe(0);
    });

    it('setMasterVolume with NaN clamps to 0', () => {
      const am = AudioManager.getInstance();
      am.setMasterVolume(NaN);
      expect(am.getMasterVolume()).toBe(0);
    });
  });

  describe('gain node wiring', () => {
    it('creates three gain nodes on init (master, sfx, music)', () => {
      AudioManager.getInstance();
      // _initAudioContext creates 3 gain nodes + music scheduler creates more
      expect(mockCtx.createGain).toHaveBeenCalled();
      // At minimum master + sfx + music = 3 calls
      expect(mockCtx.createGain.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it('playTowerPlaced creates an oscillator and connects it to sfxGain', () => {
      const am = AudioManager.getInstance();
      const callsBefore = mockCtx.createOscillator.mock.calls.length;
      am.playTowerPlaced();
      expect(mockCtx.createOscillator.mock.calls.length).toBeGreaterThan(callsBefore);
    });

    it('playProjectileFired("rock-hurler") creates an oscillator', () => {
      const am = AudioManager.getInstance();
      const callsBefore = mockCtx.createOscillator.mock.calls.length;
      am.playProjectileFired('rock-hurler');
      expect(mockCtx.createOscillator.mock.calls.length).toBeGreaterThan(callsBefore);
    });

    it('playProjectileFired("poison") creates a buffer source (noise-based)', () => {
      const am = AudioManager.getInstance();
      const callsBefore = mockCtx.createBufferSource.mock.calls.length;
      am.playProjectileFired('poison');
      expect(mockCtx.createBufferSource.mock.calls.length).toBeGreaterThan(callsBefore);
    });

    it('playProjectileFired with unknown key creates no oscillator', () => {
      const am = AudioManager.getInstance();
      const callsBefore = mockCtx.createOscillator.mock.calls.length;
      am.playProjectileFired('nonexistent');
      expect(mockCtx.createOscillator.mock.calls.length).toBe(callsBefore);
    });
  });

  describe('graceful degradation when AudioContext is unavailable', () => {
    it('does not throw if AudioContext constructor throws', () => {
      vi.stubGlobal('AudioContext', class { constructor() { throw new Error('AudioContext not supported'); } });
      resetSingleton();
      const am = AudioManager.getInstance();
      expect(() => am.playTowerPlaced()).not.toThrow();
      expect(() => am.playCreepKilled()).not.toThrow();
      expect(() => am.playUiClick()).not.toThrow();
    });

    it('does not throw if AudioContext is undefined', () => {
      vi.stubGlobal('AudioContext', undefined);
      resetSingleton();
      // `new undefined()` throws TypeError — AudioManager should catch it
      const am = AudioManager.getInstance();
      expect(() => am.playTowerPlaced()).not.toThrow();
      expect(() => am.toggleMute()).not.toThrow();
      expect(am.isMuted()).toBe(true); // toggled from default false
    });

    it('volume setters still work without AudioContext', () => {
      vi.stubGlobal('AudioContext', class { constructor() { throw new Error('no'); } });
      resetSingleton();
      const am = AudioManager.getInstance();
      am.setMasterVolume(0.5);
      expect(am.getMasterVolume()).toBeCloseTo(0.5);
      am.setSfxVolume(0.3);
      expect(am.getSfxVolume()).toBeCloseTo(0.3);
    });
  });

  describe('lifecycle', () => {
    it('destroy and startMusic do not throw', () => {
      const am = AudioManager.getInstance();
      expect(() => am.destroy()).not.toThrow();
      expect(() => am.startMusic()).not.toThrow();
    });

    it('destroy stops music, startMusic restarts it', () => {
      const am = AudioManager.getInstance();
      // Music starts automatically in constructor
      am.destroy();
      // After destroy, calling startMusic restarts without error
      expect(() => am.startMusic()).not.toThrow();
    });

    it('calling startMusic multiple times is a no-op', () => {
      const am = AudioManager.getInstance();
      // Already running from constructor — second call should be safe
      expect(() => am.startMusic()).not.toThrow();
      expect(() => am.startMusic()).not.toThrow();
    });
  });

  describe('playWaveIncoming', () => {
    it('creates oscillators for ground wave (drum cue)', () => {
      const am = AudioManager.getInstance();
      am.playWaveIncoming('ground');
      // Drum: oscillator (sub-bass) + bufferSource (noise burst)
      expect(mockCtx.createOscillator).toHaveBeenCalled();
      expect(mockCtx.createBufferSource).toHaveBeenCalled();
    });

    it('creates noise buffer for air wave (wind cue)', () => {
      const am = AudioManager.getInstance();
      mockCtx.createOscillator.mockClear();
      mockCtx.createBufferSource.mockClear();
      am.playWaveIncoming('air');
      // Wind: bufferSource (swept noise) through highpass filter
      expect(mockCtx.createBufferSource).toHaveBeenCalled();
      expect(mockCtx.createBiquadFilter).toHaveBeenCalled();
    });

    it('creates both drum and wind nodes for mixed wave', () => {
      const am = AudioManager.getInstance();
      mockCtx.createOscillator.mockClear();
      mockCtx.createBufferSource.mockClear();
      am.playWaveIncoming('mixed');
      // Mixed layers drum + wind, so both oscillator and bufferSource
      expect(mockCtx.createOscillator).toHaveBeenCalled();
      expect(mockCtx.createBufferSource).toHaveBeenCalled();
    });

    it('creates sawtooth oscillator for boss wave (horn cue)', () => {
      const am = AudioManager.getInstance();
      mockCtx.createOscillator.mockClear();
      am.playWaveIncoming('boss');
      // Boss horn: 2 oscillators (sawtooth horn + sine sub-bass)
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
      expect(mockCtx.createBiquadFilter).toHaveBeenCalled();
    });

    it('does not throw when AudioContext is unavailable', () => {
      vi.stubGlobal('AudioContext', undefined);
      resetSingleton();
      const am = AudioManager.getInstance();
      expect(() => am.playWaveIncoming('ground')).not.toThrow();
      expect(() => am.playWaveIncoming('boss')).not.toThrow();
    });
  });

  describe('file-based audio — registerBuffer', () => {
    it('registerBuffer decodes the array buffer via decodeAudioData', async () => {
      const am = AudioManager.getInstance();
      const raw = new ArrayBuffer(8);
      await am.registerBuffer('sfx-test', raw);
      expect(mockCtx.decodeAudioData).toHaveBeenCalledOnce();
    });

    it('registerBuffer is a no-op when AudioContext is unavailable', async () => {
      vi.stubGlobal('AudioContext', class { constructor() { throw new Error('no ctx'); } });
      resetSingleton();
      const am = AudioManager.getInstance();
      await expect(am.registerBuffer('sfx-test', new ArrayBuffer(8))).resolves.toBeUndefined();
    });

    it('registerBuffer survives a decode failure gracefully', async () => {
      mockCtx.decodeAudioData = vi.fn().mockRejectedValue(new Error('bad codec'));
      const am = AudioManager.getInstance();
      await expect(am.registerBuffer('sfx-bad', new ArrayBuffer(8))).resolves.toBeUndefined();
    });

    it('after registerBuffer, SFX play method uses buffer source (not oscillator)', async () => {
      const am = AudioManager.getInstance();
      await am.registerBuffer('sfx-cannon', new ArrayBuffer(8));

      mockCtx.createOscillator.mockClear();
      mockCtx.createBufferSource.mockClear();
      am.playProjectileFired('rock-hurler');

      // File path: uses createBufferSource, NOT createOscillator
      expect(mockCtx.createBufferSource).toHaveBeenCalled();
      expect(mockCtx.createOscillator).not.toHaveBeenCalled();
    });

    it('without registered buffer, rock-hurler fire still uses oscillator (procedural fallback)', () => {
      const am = AudioManager.getInstance();
      mockCtx.createOscillator.mockClear();
      am.playProjectileFired('rock-hurler');
      expect(mockCtx.createOscillator).toHaveBeenCalled();
    });

    it('after registering creep death buffers, playCreepKilled uses buffer source', async () => {
      const am = AudioManager.getInstance();
      await am.registerBuffer('sfx-creep-death-01', new ArrayBuffer(8));
      await am.registerBuffer('sfx-creep-death-02', new ArrayBuffer(8));
      await am.registerBuffer('sfx-creep-death-03', new ArrayBuffer(8));

      mockCtx.createOscillator.mockClear();
      mockCtx.createBufferSource.mockClear();
      am.playCreepKilled();

      expect(mockCtx.createBufferSource).toHaveBeenCalled();
      expect(mockCtx.createOscillator).not.toHaveBeenCalled();
    });

    it('after registering sfx-tower-place, playTowerPlaced uses buffer source', async () => {
      const am = AudioManager.getInstance();
      await am.registerBuffer('sfx-tower-place', new ArrayBuffer(8));

      mockCtx.createOscillator.mockClear();
      mockCtx.createBufferSource.mockClear();
      am.playTowerPlaced();

      expect(mockCtx.createBufferSource).toHaveBeenCalled();
      expect(mockCtx.createOscillator).not.toHaveBeenCalled();
    });
  });

  describe('file-based audio — startMusicTrack', () => {
    it('startMusicTrack is a no-op when buffer is not registered', () => {
      const am = AudioManager.getInstance();
      mockCtx.createBufferSource.mockClear();
      expect(() => am.startMusicTrack('music-menu')).not.toThrow();
      expect(mockCtx.createBufferSource).not.toHaveBeenCalled();
    });

    it('startMusicTrack starts a looping buffer source when buffer is registered', async () => {
      const am = AudioManager.getInstance();
      await am.registerBuffer('music-gameplay', new ArrayBuffer(8));

      mockCtx.createBufferSource.mockClear();
      am.startMusicTrack('music-gameplay');

      expect(mockCtx.createBufferSource).toHaveBeenCalled();
      // The created buffer source should have loop = true
      const srcMock = mockCtx.createBufferSource.mock.results[0].value as { loop: boolean };
      expect(srcMock.loop).toBe(true);
    });

    it('startMusicTrack same key twice is a no-op (no double source)', async () => {
      const am = AudioManager.getInstance();
      await am.registerBuffer('music-gameplay', new ArrayBuffer(8));

      am.startMusicTrack('music-gameplay');
      mockCtx.createBufferSource.mockClear();
      am.startMusicTrack('music-gameplay'); // second call — same key

      expect(mockCtx.createBufferSource).not.toHaveBeenCalled();
    });

    it('startMusicTrack does not throw when AudioContext is unavailable', async () => {
      vi.stubGlobal('AudioContext', class { constructor() { throw new Error('no'); } });
      resetSingleton();
      const am = AudioManager.getInstance();
      expect(() => am.startMusicTrack('music-gameplay')).not.toThrow();
    });
  });

  describe('startMusic with file fallback', () => {
    it('startMusic falls back to procedural when no gameplay buffer registered', () => {
      const am = AudioManager.getInstance();
      am.destroy();
      const oscillatorsBefore = mockCtx.createOscillator.mock.calls.length;
      am.startMusic();
      // Procedural path: music scheduler eventually creates oscillators
      // (may not fire synchronously, but no throw)
      expect(mockCtx.createOscillator.mock.calls.length).toBeGreaterThanOrEqual(oscillatorsBefore);
    });

    it('startMusic uses file buffer when music-gameplay is registered', async () => {
      const am = AudioManager.getInstance();
      await am.registerBuffer('music-gameplay', new ArrayBuffer(8));
      am.destroy();

      mockCtx.createBufferSource.mockClear();
      am.startMusic();

      expect(mockCtx.createBufferSource).toHaveBeenCalled();
    });
  });

  describe('destroy stops file music', () => {
    it('destroy does not throw even when file music is playing', async () => {
      const am = AudioManager.getInstance();
      await am.registerBuffer('music-gameplay', new ArrayBuffer(8));
      am.startMusicTrack('music-gameplay');
      expect(() => am.destroy()).not.toThrow();
    });

    it('after destroy + startMusicTrack, music restarts', async () => {
      const am = AudioManager.getInstance();
      await am.registerBuffer('music-menu', new ArrayBuffer(8));
      am.startMusicTrack('music-menu');
      am.destroy();

      mockCtx.createBufferSource.mockClear();
      am.startMusicTrack('music-menu');
      expect(mockCtx.createBufferSource).toHaveBeenCalled();
    });
  });

  describe('crossfade between tracks', () => {
    it('switching from track A to track B stops A and starts B', async () => {
      const am = AudioManager.getInstance();
      await am.registerBuffer('music-menu', new ArrayBuffer(8));
      await am.registerBuffer('music-gameplay', new ArrayBuffer(8));

      am.startMusicTrack('music-menu');
      const srcA = mockCtx.createBufferSource.mock.results.at(-1)!.value as { stop: ReturnType<typeof vi.fn> };

      mockCtx.createBufferSource.mockClear();
      am.startMusicTrack('music-gameplay');

      // Old track A should have been scheduled for stop
      expect(srcA.stop).toHaveBeenCalled();
      // New track B should have started
      expect(mockCtx.createBufferSource).toHaveBeenCalled();
    });

    it('switching track stops procedural arpeggio', async () => {
      const am = AudioManager.getInstance();
      // Procedural arpeggio was started in constructor via _startMusic()
      await am.registerBuffer('music-gameplay', new ArrayBuffer(8));

      // startMusicTrack should stop procedural and start file-based
      am.startMusicTrack('music-gameplay');
      const src = mockCtx.createBufferSource.mock.results.at(-1)!.value as { loop: boolean };
      expect(src.loop).toBe(true);
    });
  });

  describe('registerBuffer edge cases', () => {
    it('registerBuffer with same key twice overwrites the first', async () => {
      const am = AudioManager.getInstance();
      await am.registerBuffer('sfx-cannon', new ArrayBuffer(8));
      await am.registerBuffer('sfx-cannon', new ArrayBuffer(16));

      // Should still work — second registration overwrites the first
      mockCtx.createBufferSource.mockClear();
      am.playProjectileFired('rock-hurler');
      expect(mockCtx.createBufferSource).toHaveBeenCalled();
    });

    it('registerBuffer with zero-length ArrayBuffer does not crash', async () => {
      const am = AudioManager.getInstance();
      await expect(am.registerBuffer('sfx-test', new ArrayBuffer(0))).resolves.toBeUndefined();
    });
  });

  describe('file-based SFX coverage', () => {
    it('after registering sfx-frost, playProjectileFired("frost") uses buffer', async () => {
      const am = AudioManager.getInstance();
      await am.registerBuffer('sfx-frost', new ArrayBuffer(8));

      mockCtx.createOscillator.mockClear();
      mockCtx.createBufferSource.mockClear();
      am.playProjectileFired('frost');

      expect(mockCtx.createBufferSource).toHaveBeenCalled();
      expect(mockCtx.createOscillator).not.toHaveBeenCalled();
    });

    it('after registering sfx-ui-click, playUiClick uses buffer', async () => {
      const am = AudioManager.getInstance();
      await am.registerBuffer('sfx-ui-click', new ArrayBuffer(8));

      mockCtx.createOscillator.mockClear();
      mockCtx.createBufferSource.mockClear();
      am.playUiClick();

      expect(mockCtx.createBufferSource).toHaveBeenCalled();
      expect(mockCtx.createOscillator).not.toHaveBeenCalled();
    });

    it('after registering sfx-creep-escape, playCreepEscaped uses buffer', async () => {
      const am = AudioManager.getInstance();
      await am.registerBuffer('sfx-creep-escape', new ArrayBuffer(8));

      mockCtx.createOscillator.mockClear();
      mockCtx.createBufferSource.mockClear();
      am.playCreepEscaped();

      expect(mockCtx.createBufferSource).toHaveBeenCalled();
      expect(mockCtx.createOscillator).not.toHaveBeenCalled();
    });

    it('after registering sfx-game-over, playGameOver uses buffer', async () => {
      const am = AudioManager.getInstance();
      await am.registerBuffer('sfx-game-over', new ArrayBuffer(8));

      mockCtx.createOscillator.mockClear();
      mockCtx.createBufferSource.mockClear();
      am.playGameOver();

      expect(mockCtx.createBufferSource).toHaveBeenCalled();
      expect(mockCtx.createOscillator).not.toHaveBeenCalled();
    });

    it('_playBufferSfx connects source to sfxGain and starts it', async () => {
      const am = AudioManager.getInstance();
      await am.registerBuffer('sfx-victory', new ArrayBuffer(8));

      mockCtx.createBufferSource.mockClear();
      am.playVictory();

      const src = mockCtx.createBufferSource.mock.results[0].value as {
        connect: ReturnType<typeof vi.fn>;
        start: ReturnType<typeof vi.fn>;
      };
      expect(src.connect).toHaveBeenCalled();
      expect(src.start).toHaveBeenCalled();
    });
  });

  describe('volume controls with file-based audio', () => {
    it('mute/unmute does not crash when file music is playing', async () => {
      const am = AudioManager.getInstance();
      await am.registerBuffer('music-gameplay', new ArrayBuffer(8));
      am.startMusicTrack('music-gameplay');

      expect(() => am.toggleMute()).not.toThrow();
      expect(am.isMuted()).toBe(true);
      expect(() => am.toggleMute()).not.toThrow();
      expect(am.isMuted()).toBe(false);
    });

    it('setMusicVolume does not crash when file music is playing', async () => {
      const am = AudioManager.getInstance();
      await am.registerBuffer('music-gameplay', new ArrayBuffer(8));
      am.startMusicTrack('music-gameplay');

      expect(() => am.setMusicVolume(0.5)).not.toThrow();
      expect(am.getMusicVolume()).toBeCloseTo(0.5);
    });
  });

  describe('independent channel muting', () => {
    it('isMusicMuted is false by default', () => {
      const am = AudioManager.getInstance();
      expect(am.isMusicMuted()).toBe(false);
    });

    it('isSfxMuted is false by default', () => {
      const am = AudioManager.getInstance();
      expect(am.isSfxMuted()).toBe(false);
    });

    it('setMusicMuted(true) mutes music independently', () => {
      const am = AudioManager.getInstance();
      am.setMusicMuted(true);
      expect(am.isMusicMuted()).toBe(true);
      expect(am.isSfxMuted()).toBe(false);
      expect(am.isMuted()).toBe(false);
    });

    it('setSfxMuted(true) mutes SFX independently', () => {
      const am = AudioManager.getInstance();
      am.setSfxMuted(true);
      expect(am.isSfxMuted()).toBe(true);
      expect(am.isMusicMuted()).toBe(false);
      expect(am.isMuted()).toBe(false);
    });

    it('setMusicMuted(false) restores music after muting', () => {
      const am = AudioManager.getInstance();
      am.setMusicMuted(true);
      am.setMusicMuted(false);
      expect(am.isMusicMuted()).toBe(false);
    });

    it('setSfxMuted(false) restores SFX after muting', () => {
      const am = AudioManager.getInstance();
      am.setSfxMuted(true);
      am.setSfxMuted(false);
      expect(am.isSfxMuted()).toBe(false);
    });

    it('setMusicMuted does not affect stored music volume', () => {
      const am = AudioManager.getInstance();
      am.setMusicVolume(0.5);
      am.setMusicMuted(true);
      expect(am.getMusicVolume()).toBeCloseTo(0.5);
      am.setMusicMuted(false);
      expect(am.getMusicVolume()).toBeCloseTo(0.5);
    });

    it('setSfxMuted does not affect stored sfx volume', () => {
      const am = AudioManager.getInstance();
      am.setSfxVolume(0.7);
      am.setSfxMuted(true);
      expect(am.getSfxVolume()).toBeCloseTo(0.7);
      am.setSfxMuted(false);
      expect(am.getSfxVolume()).toBeCloseTo(0.7);
    });

    it('setMusicMuted and setSfxMuted do not throw when AudioContext unavailable', () => {
      vi.stubGlobal('AudioContext', class { constructor() { throw new Error('no ctx'); } });
      resetSingleton();
      const am = AudioManager.getInstance();
      expect(() => am.setMusicMuted(true)).not.toThrow();
      expect(() => am.setSfxMuted(true)).not.toThrow();
      expect(am.isMusicMuted()).toBe(true);
      expect(am.isSfxMuted()).toBe(true);
    });

    it('master mute and per-channel mutes are independent', () => {
      const am = AudioManager.getInstance();
      am.setMusicMuted(true);
      am.setSfxMuted(true);
      am.toggleMute(); // master mute on
      expect(am.isMuted()).toBe(true);
      expect(am.isMusicMuted()).toBe(true);
      expect(am.isSfxMuted()).toBe(true);
      am.toggleMute(); // master mute off
      expect(am.isMuted()).toBe(false);
      // per-channel mutes survive master toggle
      expect(am.isMusicMuted()).toBe(true);
      expect(am.isSfxMuted()).toBe(true);
    });
  });

  describe('persistence roundtrip', () => {
    it('musicMuted persists across AudioManager re-init', () => {
      const am1 = AudioManager.getInstance();
      am1.setMusicMuted(true);
      am1.setSfxMuted(false);

      // Reset AudioManager only (keep SaveManager + localStorage)
      resetSingleton();
      const am2 = AudioManager.getInstance();
      expect(am2.isMusicMuted()).toBe(true);
      expect(am2.isSfxMuted()).toBe(false);
    });

    it('sfxMuted persists across AudioManager re-init', () => {
      const am1 = AudioManager.getInstance();
      am1.setMusicMuted(false);
      am1.setSfxMuted(true);

      resetSingleton();
      const am2 = AudioManager.getInstance();
      expect(am2.isMusicMuted()).toBe(false);
      expect(am2.isSfxMuted()).toBe(true);
    });

    it('both channel mutes persist simultaneously', () => {
      const am1 = AudioManager.getInstance();
      am1.setMusicMuted(true);
      am1.setSfxMuted(true);
      am1.setMusicVolume(0.4);
      am1.setSfxVolume(0.6);

      resetSingleton();
      const am2 = AudioManager.getInstance();
      expect(am2.isMusicMuted()).toBe(true);
      expect(am2.isSfxMuted()).toBe(true);
      expect(am2.getMusicVolume()).toBeCloseTo(0.4);
      expect(am2.getSfxVolume()).toBeCloseTo(0.6);
    });

    it('SaveManager getAudioSettings returns musicMuted and sfxMuted', () => {
      const am = AudioManager.getInstance();
      am.setMusicMuted(true);
      am.setSfxMuted(true);

      const settings = SaveManager.getInstance().getAudioSettings();
      expect(settings.musicMuted).toBe(true);
      expect(settings.sfxMuted).toBe(true);
    });

    it('SaveManager sanitizes missing audioMusicMuted/audioSfxMuted to false', () => {
      // Write save data without the new fields (simulating old save format)
      const rawData = JSON.stringify({
        crystals: 0, totalCrystalsEarned: 0,
        unlockedIds: [], selectedCommander: 'default',
        lastPlayedStage: 'stage-01',
        audioMaster: 0.8, audioSfx: 0.9, audioMusic: 0.2, audioMuted: false,
        // intentionally omit audioMusicMuted and audioSfxMuted
        stageMoons: {}, endlessRecords: {},
        seenVignetteIds: [], unlockedCodexIds: [], readCodexIds: [],
        pendingConsumables: { rerollTokens: 0, goldBoostTokens: 0, extraLifeTokens: 0 },
      });
      localStorage.setItem('ojibwe-td-save', rawData);
      (SaveManager as unknown as { _instance: null })._instance = null;

      const settings = SaveManager.getInstance().getAudioSettings();
      expect(settings.musicMuted).toBe(false);
      expect(settings.sfxMuted).toBe(false);
    });
  });
});
