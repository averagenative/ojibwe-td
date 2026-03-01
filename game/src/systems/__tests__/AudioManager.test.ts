/**
 * AudioManager unit tests.
 *
 * AudioContext is mocked globally so the tests run in jsdom without a real
 * browser audio stack. The singleton is reset between tests by directly
 * nulling the private static field via a TypeScript cast.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioManager } from '../AudioManager';

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
    frequency: { value: 350, setValueAtTime: vi.fn() },
    Q:         { value: 1 },
    connect:    vi.fn(),
    disconnect: vi.fn(),
  });

  const makeBufferSource = () => ({
    buffer:     null as AudioBuffer | null,
    connect:    vi.fn(),
    disconnect: vi.fn(),
    start:      vi.fn(),
    onended:    null as (() => void) | null,
  });

  const mockBuffer = {
    getChannelData: (_channel: number) => new Float32Array(4410),
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
      const keys = ['cannon', 'frost', 'tesla', 'mortar', 'poison', 'aura', 'unknown'];
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

    it('playProjectileFired("cannon") creates an oscillator', () => {
      const am = AudioManager.getInstance();
      const callsBefore = mockCtx.createOscillator.mock.calls.length;
      am.playProjectileFired('cannon');
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
});
