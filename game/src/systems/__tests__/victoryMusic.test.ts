/**
 * Structural tests for TASK-100: Victory Music Not Playing.
 *
 * GameOverScene and BootScene depend on Phaser and cannot be instantiated in
 * vitest's jsdom environment.  These tests use ?raw source imports to verify
 * the critical structural patterns that ensure victory music plays correctly.
 *
 * Acceptance criteria verified:
 *   1. BootScene MUSIC_VARIANT_DEFS includes 'music-victory'
 *   2. BootScene _bridgeAudioToManager handles AudioBuffer (registerDecodedBuffer)
 *   3. BootScene _bridgeAudioToManager handles ArrayBuffer (registerBuffer)
 *   4. BootScene bridge includes MUSIC_VARIANT_DEFS keys in the registration loop
 *   5. GameOverScene calls startMusicTrackWithFallback (not startMusicTrack)
 *   6. GameOverScene passes 'music-victory' on won=true path
 *   7. GameOverScene passes 'music-gameover' on won=false path
 *   8. AudioManager exposes startMusicTrackWithFallback as a public method
 */

import { describe, it, expect } from 'vitest';

import bootSceneSrc    from '../../scenes/BootScene.ts?raw';
import gameOverSrc     from '../../scenes/GameOverScene.ts?raw';
import audioManagerSrc from '../AudioManager.ts?raw';

// ── 1–4. BootScene bridge ────────────────────────────────────────────────────

describe('BootScene — MUSIC_VARIANT_DEFS includes music-victory', () => {
  it('defines music-victory key in MUSIC_VARIANT_DEFS', () => {
    expect(bootSceneSrc).toContain("'music-victory'");
  });

  it('points music-victory to victory audio file path', () => {
    expect(bootSceneSrc).toContain("'assets/audio/music/victory'");
  });

  it('defines music-gameover key in MUSIC_VARIANT_DEFS', () => {
    expect(bootSceneSrc).toContain("'music-gameover'");
  });
});

describe('BootScene — _bridgeAudioToManager registration', () => {
  it('bridge method is defined', () => {
    expect(bootSceneSrc).toContain('_bridgeAudioToManager');
  });

  it('bridge includes MUSIC_VARIANT_DEFS keys in the registration loop', () => {
    expect(bootSceneSrc).toContain('MUSIC_VARIANT_DEFS.map(([key]) => key)');
  });

  it('bridge handles AudioBuffer via registerDecodedBuffer (sync path)', () => {
    expect(bootSceneSrc).toContain('instanceof AudioBuffer');
    expect(bootSceneSrc).toContain('registerDecodedBuffer');
  });

  it('bridge handles ArrayBuffer via registerBuffer (async decode path)', () => {
    expect(bootSceneSrc).toContain('instanceof ArrayBuffer');
    expect(bootSceneSrc).toContain('registerBuffer');
  });

  it('bridge includes duck-type fallback for AudioBuffer-shaped objects', () => {
    expect(bootSceneSrc).toContain("typeof duck['duration'] === 'number'");
    expect(bootSceneSrc).toContain("typeof duck['getChannelData'] === 'function'");
  });
});

// ── 5–7. GameOverScene music call site ───────────────────────────────────────

describe('GameOverScene — uses startMusicTrackWithFallback', () => {
  it('calls startMusicTrackWithFallback instead of startMusicTrack', () => {
    expect(gameOverSrc).toContain('startMusicTrackWithFallback');
  });

  it('does NOT call bare startMusicTrack for the end-state music', () => {
    // startMusicTrack must not appear as the end-state music call
    // (the only valid call is the new fallback method)
    const lines = gameOverSrc.split('\n');
    const directCalls = lines.filter(
      l => l.includes('startMusicTrack(') && !l.includes('startMusicTrackWithFallback'),
    );
    expect(directCalls.length).toBe(0);
  });

  it("passes 'music-victory' when won is true", () => {
    expect(gameOverSrc).toContain("'music-victory'");
  });

  it("passes 'music-gameover' when won is false", () => {
    expect(gameOverSrc).toContain("'music-gameover'");
  });

  it('selects key based on won flag (ternary pattern)', () => {
    // e.g. won ? 'music-victory' : 'music-gameover'
    expect(gameOverSrc).toMatch(/won\s*\?\s*['"]music-victory['"]\s*:\s*['"]music-gameover['"]/);
  });
});

// ── 8. AudioManager public API ───────────────────────────────────────────────

describe('AudioManager — startMusicTrackWithFallback is implemented', () => {
  it('declares startMusicTrackWithFallback as a public method', () => {
    expect(audioManagerSrc).toContain('startMusicTrackWithFallback(');
  });

  it('calls _startMusic() as fallback when buffer is absent', () => {
    // Must contain the else branch that starts procedural music
    expect(audioManagerSrc).toMatch(/startMusicTrackWithFallback[\s\S]{0,400}_startMusic\(\)/);
  });

  it('calls startMusicTrack() when buffer is present', () => {
    expect(audioManagerSrc).toMatch(/startMusicTrackWithFallback[\s\S]{0,400}startMusicTrack\(key/);
  });

  it('checks _buffers.has(key) to decide which path to take', () => {
    expect(audioManagerSrc).toMatch(/startMusicTrackWithFallback[\s\S]{0,400}_buffers\.has\(key\)/);
  });
});
