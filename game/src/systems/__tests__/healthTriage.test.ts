/**
 * TASK-032 — Health Check Triage
 *
 * Structural ?raw tests verifying all fixes from the health triage pass:
 *
 * 1. Creep.clearDoTs() is called in destroy() (was orphaned)
 * 2. Tower.getSellValue() removed (dead code contradicting sell logic)
 * 3. WaveManager.cleanup() called on victory path in GameScene
 * 4. WaveManager.getWaveNumber() removed (dead method)
 * 5. MapData.tiles uses TILE union type instead of bare number[][]
 * 6. UpgradePanel setVisible has runtime guard for missing method
 * 7. UpgradePanel getBottomUIHeight removed (dead export)
 * 8. Creep.isSlowed() is NOT dead — verified still wired into Tower damage calcs
 * 9. GameScene.init() resets gameState, currentWave, speedMultiplier
 */
import { describe, it, expect } from 'vitest';

import creepSrc       from '../../entities/Creep.ts?raw';
import towerSrc       from '../../entities/towers/Tower.ts?raw';
import gameSceneSrc   from '../../scenes/GameScene.ts?raw';
import waveManagerSrc from '../../systems/WaveManager.ts?raw';
import mapDataSrc     from '../../types/MapData.ts?raw';
import upgradePanelSrc from '../../ui/UpgradePanel.ts?raw';

// ── 1. Creep.clearDoTs() called in destroy() ─────────────────────────────────

describe('Creep — clearDoTs() wired into destroy()', () => {
  it('destroy() calls this.clearDoTs()', () => {
    // Extract the destroy method body
    const destroyStart = creepSrc.indexOf('destroy(fromScene');
    expect(destroyStart).toBeGreaterThan(-1);
    const destroyBody = creepSrc.slice(destroyStart, destroyStart + 600);
    expect(destroyBody).toContain('this.clearDoTs()');
  });

  it('destroy() does NOT inline dotTimers loop (uses clearDoTs instead)', () => {
    const destroyStart = creepSrc.indexOf('destroy(fromScene');
    const destroyBody = creepSrc.slice(destroyStart, destroyStart + 600);
    // The old pattern was: for (const t of this.dotTimers) t.destroy(); this.dotTimers = [];
    expect(destroyBody).not.toContain('this.dotTimers = []');
  });

  it('clearDoTs() resets dotStacks to 0', () => {
    const clearStart = creepSrc.indexOf('clearDoTs(): void');
    expect(clearStart).toBeGreaterThan(-1);
    const clearBody = creepSrc.slice(clearStart, clearStart + 200);
    expect(clearBody).toContain('this.dotStacks = 0');
  });

  it('clearDoTs() calls refreshStatusVisual()', () => {
    const clearStart = creepSrc.indexOf('clearDoTs(): void');
    const clearBody = creepSrc.slice(clearStart, clearStart + 200);
    expect(clearBody).toContain('this.refreshStatusVisual()');
  });
});

// ── 2. Tower.getSellValue() removed ──────────────────────────────────────────

describe('Tower — getSellValue() removed', () => {
  it('does not contain getSellValue method', () => {
    expect(towerSrc).not.toContain('getSellValue');
  });

  it('still has sell() method', () => {
    expect(towerSrc).toContain('sell(): void');
  });
});

// ── 3. WaveManager.cleanup() called on victory path ──────────────────────────

describe('GameScene — WaveManager.cleanup() on victory', () => {
  it('calls waveManager.cleanup() in onWaveComplete victory branch', () => {
    // The victory branch starts with the final-wave check
    const victoryIdx = gameSceneSrc.indexOf('waveNum >= this.totalWaves && !this.isEndlessMode');
    expect(victoryIdx).toBeGreaterThan(-1);

    // cleanup() should appear within ~500 chars after the victory guard
    const victorySlice = gameSceneSrc.slice(victoryIdx, victoryIdx + 500);
    expect(victorySlice).toContain('this.waveManager.cleanup()');
  });

  it('cleanup is called before SessionManager.clear()', () => {
    const cleanupIdx = gameSceneSrc.indexOf('this.waveManager.cleanup()');
    const sessionClearIdx = gameSceneSrc.indexOf(
      'SessionManager.getInstance().clear()',
      cleanupIdx,
    );
    expect(cleanupIdx).toBeGreaterThan(-1);
    expect(sessionClearIdx).toBeGreaterThan(cleanupIdx);
  });
});

// ── 4. WaveManager.getWaveNumber() removed ───────────────────────────────────

describe('WaveManager — dead methods removed', () => {
  it('does not contain getWaveNumber method', () => {
    expect(waveManagerSrc).not.toContain('getWaveNumber');
  });

  it('still exposes isActive() (used by tests)', () => {
    expect(waveManagerSrc).toContain('isActive(): boolean');
  });

  it('isActive() returns waveActive', () => {
    expect(waveManagerSrc).toContain('return this.waveActive');
  });
});

// ── 5. MapData.tiles uses TILE union type ────────────────────────────────────

describe('MapData — tiles typed with TILE union', () => {
  it('tiles field uses typeof TILE union type', () => {
    expect(mapDataSrc).toContain('tiles: (typeof TILE[keyof typeof TILE])[][]');
  });

  it('does NOT use bare number[][] for tiles', () => {
    // Ensure the old type is gone — but only for the tiles field
    const tilesLine = mapDataSrc
      .split('\n')
      .find(l => l.includes('tiles:'));
    expect(tilesLine).toBeDefined();
    expect(tilesLine).not.toContain('number[][]');
  });

  it('TILE constant has BUILDABLE, PATH, and SCENERY members', () => {
    expect(mapDataSrc).toContain('BUILDABLE: 0');
    expect(mapDataSrc).toContain('PATH: 1');
    expect(mapDataSrc).toContain('SCENERY: 2');
  });

  it('TILE is declared as const', () => {
    expect(mapDataSrc).toContain('as const');
  });
});

// ── 6. UpgradePanel setVisible guard ─────────────────────────────────────────

describe('UpgradePanel — setVisible runtime guard', () => {
  it('checks for setVisible existence before calling it', () => {
    const setVisIdx = upgradePanelSrc.indexOf("private setVisible(visible: boolean)");
    expect(setVisIdx).toBeGreaterThan(-1);

    const methodBody = upgradePanelSrc.slice(setVisIdx, setVisIdx + 300);
    expect(methodBody).toContain("'setVisible' in obj");
  });

  it('does not call setVisible without the guard', () => {
    const setVisIdx = upgradePanelSrc.indexOf("private setVisible(visible: boolean)");
    const methodBody = upgradePanelSrc.slice(setVisIdx, setVisIdx + 300);

    // The cast should only appear inside the guarded if-block
    const guardIdx = methodBody.indexOf("'setVisible' in obj");
    const castIdx = methodBody.indexOf('as unknown as Phaser.GameObjects.Components.Visible');
    expect(castIdx).toBeGreaterThan(guardIdx);
  });
});

// ── 7. UpgradePanel getBottomUIHeight removed ────────────────────────────────

describe('UpgradePanel — getBottomUIHeight removed', () => {
  it('does not export getBottomUIHeight', () => {
    expect(upgradePanelSrc).not.toContain('getBottomUIHeight');
  });
});

// ── 8. Creep.isSlowed() is NOT dead — still wired ────────────────────────────

describe('Creep.isSlowed() — confirmed alive (false positive)', () => {
  it('isSlowed() is defined on Creep', () => {
    expect(creepSrc).toContain('isSlowed(): boolean');
  });

  it('isSlowed() is called by getBuffCount()', () => {
    const buffCountIdx = creepSrc.indexOf('getBuffCount(): number');
    expect(buffCountIdx).toBeGreaterThan(-1);
    const body = creepSrc.slice(buffCountIdx, buffCountIdx + 200);
    expect(body).toContain('this.isSlowed()');
  });

  it('isSlowed() is referenced in Tower attack logic', () => {
    // Tower.ts uses isSlowed() for offer multiplier calculations
    expect(towerSrc).toContain('.isSlowed()');
  });
});

// ── 9. GameScene.init() resets mutable state ─────────────────────────────────

describe('GameScene.init() — state resets on restart', () => {
  // Find the actual init method (not field declarations)
  const initIdx = gameSceneSrc.indexOf('init(data?:');
  const initBody = gameSceneSrc.slice(initIdx, initIdx + 3000);

  it('resets currentWave to 0', () => {
    expect(initBody).toMatch(/this\.currentWave\s+=\s+0/);
  });

  it('resets gameState to pregame', () => {
    expect(initBody).toMatch(/this\.gameState\s+=\s+'pregame'/);
  });

  it('resets speedMultiplier to 1', () => {
    expect(initBody).toMatch(/this\.speedMultiplier\s+=\s+1/);
  });
});
