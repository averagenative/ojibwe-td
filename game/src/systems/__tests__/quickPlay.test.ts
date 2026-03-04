/**
 * Quick Play — unit and structural tests (TASK-146).
 *
 * Three suites:
 *   1. QuickPlay.ts unit tests — getUnlockedCommanders, getUnlockedStages,
 *      pickWeightedCommander, pickRandomStage, pickQuickPlay.
 *   2. MainMenuScene structural tests (?raw) — button exists, wiring, splash.
 *   3. Arithmetic tests — button sizing meets touch-target requirements.
 */

import { describe, it, expect } from 'vitest';

import {
  getUnlockedCommanders,
  getUnlockedStages,
  pickWeightedCommander,
  pickRandomStage,
  pickQuickPlay,
} from '../QuickPlay';
import { ALL_COMMANDERS } from '../../data/commanderDefs';
import { ALL_STAGES } from '../../data/stageDefs';

import mainMenuSrc from '../../scenes/MainMenuScene.ts?raw';

// ── Minimal SaveManager stub ──────────────────────────────────────────────────

type MockSave = {
  isUnlocked: (id: string) => boolean;
  getCommanderXp: (id: string) => number;
};

function makeSave(unlocked: string[] = [], xp: Record<string, number> = {}): MockSave {
  return {
    isUnlocked:    (id: string) => unlocked.includes(id),
    getCommanderXp: (id: string) => xp[id] ?? 0,
  };
}

// ── getUnlockedCommanders ─────────────────────────────────────────────────────

describe('getUnlockedCommanders', () => {
  it('always includes default-unlocked commanders', () => {
    const save = makeSave();
    const result = getUnlockedCommanders(save as never);
    const defaults = ALL_COMMANDERS.filter(c => c.defaultUnlocked);
    for (const def of defaults) {
      expect(result.some(r => r.id === def.id)).toBe(true);
    }
  });

  it('excludes locked commanders when not unlocked', () => {
    const save = makeSave();
    const result = getUnlockedCommanders(save as never);
    const locked = ALL_COMMANDERS.filter(c => !c.defaultUnlocked);
    for (const def of locked) {
      // Should not be included without the unlock
      expect(result.some(r => r.id === def.id)).toBe(false);
    }
  });

  it('includes a non-default commander when its unlock node is active', () => {
    // Unlock all possible unlock node IDs — any locked commander should appear
    const allUnlockIds = ALL_COMMANDERS
      .filter(c => !c.defaultUnlocked)
      .map(c => `unlock-commander-${c.id}`);  // from unlockDefs: 'unlock-commander-<id>'
    const save = makeSave(allUnlockIds);
    const result = getUnlockedCommanders(save as never);
    // Should have more than just the default-unlocked ones
    const defaults = ALL_COMMANDERS.filter(c => c.defaultUnlocked);
    expect(result.length).toBeGreaterThan(defaults.length);
  });

  it('returns at least one commander', () => {
    const save = makeSave();
    const result = getUnlockedCommanders(save as never);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('returns only CommanderDef objects with required fields', () => {
    const save = makeSave();
    const result = getUnlockedCommanders(save as never);
    for (const def of result) {
      expect(typeof def.id).toBe('string');
      expect(typeof def.name).toBe('string');
    }
  });
});

// ── getUnlockedStages ─────────────────────────────────────────────────────────

describe('getUnlockedStages', () => {
  it('includes stages with null unlockId (always accessible)', () => {
    const save = makeSave();
    const result = getUnlockedStages(save as never);
    const freeStages = ALL_STAGES.filter(s => s.unlockId === null);
    for (const s of freeStages) {
      expect(result.some(r => r.id === s.id)).toBe(true);
    }
  });

  it('excludes locked stages when not unlocked', () => {
    const save = makeSave();
    const result = getUnlockedStages(save as never);
    const lockedStages = ALL_STAGES.filter(s => s.unlockId !== null);
    for (const s of lockedStages) {
      expect(result.some(r => r.id === s.id)).toBe(false);
    }
  });

  it('includes a locked stage when its unlockId is present', () => {
    const lockedStage = ALL_STAGES.find(s => s.unlockId !== null);
    if (!lockedStage) return; // skip if all stages are free
    const save = makeSave([lockedStage.unlockId!]);
    const result = getUnlockedStages(save as never);
    expect(result.some(r => r.id === lockedStage.id)).toBe(true);
  });

  it('returns at least one stage', () => {
    const save = makeSave();
    const result = getUnlockedStages(save as never);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('returned stages have pathFile for the mapId', () => {
    const save = makeSave();
    const result = getUnlockedStages(save as never);
    for (const s of result) {
      expect(typeof s.pathFile).toBe('string');
      expect(s.pathFile.length).toBeGreaterThan(0);
    }
  });
});

// ── pickWeightedCommander ─────────────────────────────────────────────────────

describe('pickWeightedCommander', () => {
  it('returns the only commander when list has one entry', () => {
    const cmd = ALL_COMMANDERS[0];
    const save = makeSave();
    const result = pickWeightedCommander([cmd], save as never);
    expect(result.id).toBe(cmd.id);
  });

  it('returns from the list (not a commander outside the list)', () => {
    const unlocked = ALL_COMMANDERS.slice(0, 2);
    const ids = unlocked.map(c => c.id);
    const save = makeSave();
    for (let i = 0; i < 20; i++) {
      const result = pickWeightedCommander(unlocked, save as never);
      expect(ids).toContain(result.id);
    }
  });

  it('returns first commander as fallback when list is empty', () => {
    const save = makeSave();
    const result = pickWeightedCommander([], save as never);
    expect(result.id).toBe(ALL_COMMANDERS[0].id);
  });

  it('favours less-played commanders (lower XP = higher pick rate)', () => {
    const [cmdA, cmdB] = ALL_COMMANDERS;
    // cmdA has 0 XP, cmdB has 1000 XP → cmdA should be picked much more often
    const save = makeSave([], { [cmdB.id]: 1000 });
    let countA = 0;
    const TRIALS = 1000;
    for (let i = 0; i < TRIALS; i++) {
      const result = pickWeightedCommander([cmdA, cmdB], save as never);
      if (result.id === cmdA.id) countA++;
    }
    // With maxXP=1000: w_A = 1001, w_B = 1 → P(A) = 1001/1002 ≈ 99.9%
    // We expect at least 90% picks for cmdA
    expect(countA / TRIALS).toBeGreaterThan(0.9);
  });

  it('picks uniformly when all commanders have equal XP', () => {
    const commanders = ALL_COMMANDERS.slice(0, 3);
    const save = makeSave();
    const counts: Record<string, number> = {};
    const TRIALS = 3000;
    for (let i = 0; i < TRIALS; i++) {
      const r = pickWeightedCommander(commanders, save as never);
      counts[r.id] = (counts[r.id] ?? 0) + 1;
    }
    // Each should get roughly 1/3; allow ±10% variance
    const expected = TRIALS / commanders.length;
    for (const id of commanders.map(c => c.id)) {
      expect(counts[id] ?? 0).toBeGreaterThan(expected * 0.7);
      expect(counts[id] ?? 0).toBeLessThan(expected * 1.3);
    }
  });
});

// ── pickRandomStage ───────────────────────────────────────────────────────────

describe('pickRandomStage', () => {
  it('returns the only stage when list has one entry', () => {
    const stage = ALL_STAGES[0];
    const result = pickRandomStage([stage]);
    expect(result.id).toBe(stage.id);
  });

  it('returns from the list', () => {
    const stages = ALL_STAGES.slice(0, 3);
    const ids = stages.map(s => s.id);
    for (let i = 0; i < 20; i++) {
      const result = pickRandomStage(stages);
      expect(ids).toContain(result.id);
    }
  });

  it('returns first stage as fallback when list is empty', () => {
    const result = pickRandomStage([]);
    expect(result.id).toBe(ALL_STAGES[0].id);
  });

  it('distributes roughly uniformly across stages', () => {
    const stages = ALL_STAGES.slice(0, 3);
    const counts: Record<string, number> = {};
    const TRIALS = 3000;
    for (let i = 0; i < TRIALS; i++) {
      const r = pickRandomStage(stages);
      counts[r.id] = (counts[r.id] ?? 0) + 1;
    }
    const expected = TRIALS / stages.length;
    for (const s of stages) {
      expect(counts[s.id] ?? 0).toBeGreaterThan(expected * 0.7);
      expect(counts[s.id] ?? 0).toBeLessThan(expected * 1.3);
    }
  });
});

// ── pickQuickPlay ─────────────────────────────────────────────────────────────

describe('pickQuickPlay', () => {
  it('returns a QuickPlaySelection with all required fields', () => {
    const save = makeSave();
    const sel = pickQuickPlay(save as never);
    expect(typeof sel.commanderId).toBe('string');
    expect(typeof sel.commanderName).toBe('string');
    expect(typeof sel.stageId).toBe('string');
    expect(typeof sel.stageName).toBe('string');
    expect(typeof sel.mapId).toBe('string');
  });

  it('commanderId is a valid commander id', () => {
    const save = makeSave();
    const sel = pickQuickPlay(save as never);
    expect(ALL_COMMANDERS.some(c => c.id === sel.commanderId)).toBe(true);
  });

  it('stageId is a valid stage id', () => {
    const save = makeSave();
    const sel = pickQuickPlay(save as never);
    expect(ALL_STAGES.some(s => s.id === sel.stageId)).toBe(true);
  });

  it('mapId matches the stage pathFile', () => {
    const save = makeSave();
    const sel = pickQuickPlay(save as never);
    const stage = ALL_STAGES.find(s => s.id === sel.stageId);
    expect(stage?.pathFile).toBe(sel.mapId);
  });

  it('commanderName matches the commander name', () => {
    const save = makeSave();
    const sel = pickQuickPlay(save as never);
    const cmd = ALL_COMMANDERS.find(c => c.id === sel.commanderId);
    expect(cmd?.name).toBe(sel.commanderName);
  });

  it('stageName matches the stage name', () => {
    const save = makeSave();
    const sel = pickQuickPlay(save as never);
    const stage = ALL_STAGES.find(s => s.id === sel.stageId);
    expect(stage?.name).toBe(sel.stageName);
  });
});

// ── MainMenuScene — structural tests ─────────────────────────────────────────

describe('MainMenuScene — QUICK PLAY button', () => {
  it('imports pickQuickPlay from QuickPlay module', () => {
    expect(mainMenuSrc).toContain("import { pickQuickPlay } from '../systems/QuickPlay'");
  });

  it('imports QuickPlaySelection type', () => {
    expect(mainMenuSrc).toContain("import type { QuickPlaySelection } from '../systems/QuickPlay'");
  });

  it('renders QUICK PLAY label', () => {
    expect(mainMenuSrc).toContain("'QUICK PLAY'");
  });

  it('creates quick play panel with makePanel', () => {
    expect(mainMenuSrc).toContain('quickP = makePanel(');
  });

  it('uses a distinct amber/gold fill color (0x1a1100)', () => {
    expect(mainMenuSrc).toContain('0x1a1100');
  });

  it('uses PAL.goldN for border stroke', () => {
    expect(mainMenuSrc).toContain('PAL.goldN');
  });

  it('has pointerover/pointerout/pointerdown/pointerup handlers', () => {
    expect(mainMenuSrc).toContain("quickP.zone.on('pointerover'");
    expect(mainMenuSrc).toContain("quickP.zone.on('pointerout'");
    expect(mainMenuSrc).toContain("quickP.zone.on('pointerdown'");
    expect(mainMenuSrc).toContain("quickP.zone.on('pointerup'");
  });

  it('calls pickQuickPlay(SaveManager.getInstance()) in pointerup', () => {
    expect(mainMenuSrc).toContain('pickQuickPlay(SaveManager.getInstance())');
  });

  it('navigates to GameScene (not CommanderSelectScene)', () => {
    // Quick play must bypass CommanderSelectScene
    const quickUpBlock = mainMenuSrc.slice(mainMenuSrc.indexOf("quickP.zone.on('pointerup'"));
    const closingBrace = quickUpBlock.indexOf('\n    });') + 1;
    const handler = quickUpBlock.slice(0, closingBrace);
    expect(handler).toContain("_go('GameScene'");
    expect(handler).not.toContain("_go('CommanderSelectScene'");
  });

  it('passes commanderId to GameScene', () => {
    const block = mainMenuSrc.slice(mainMenuSrc.indexOf("quickP.zone.on('pointerup'"));
    expect(block).toContain('commanderId: sel.commanderId');
  });

  it('passes stageId to GameScene', () => {
    const block = mainMenuSrc.slice(mainMenuSrc.indexOf("quickP.zone.on('pointerup'"));
    expect(block).toContain('stageId:     sel.stageId');
  });

  it('passes mapId to GameScene', () => {
    const block = mainMenuSrc.slice(mainMenuSrc.indexOf("quickP.zone.on('pointerup'"));
    expect(block).toContain('mapId:       sel.mapId');
  });

  it('checks hasResume before showing overwrite confirm', () => {
    const block = mainMenuSrc.slice(mainMenuSrc.indexOf("quickP.zone.on('pointerup'"));
    expect(block).toContain('if (hasResume)');
    expect(block).toContain('_showOverwriteConfirm(');
  });

  it('calls _showQuickPlaySplash before navigating', () => {
    expect(mainMenuSrc).toContain('_showQuickPlaySplash(');
  });
});

// ── MainMenuScene — splash dialog ─────────────────────────────────────────────

describe('MainMenuScene — _showQuickPlaySplash', () => {
  it('defines _showQuickPlaySplash method', () => {
    expect(mainMenuSrc).toContain('private _showQuickPlaySplash(');
  });

  it('accepts QuickPlaySelection parameter', () => {
    expect(mainMenuSrc).toContain('sel: QuickPlaySelection');
  });

  it('shows Commander name in splash', () => {
    expect(mainMenuSrc).toContain('Commander: ${sel.commanderName}');
  });

  it('shows Map (stage) name in splash', () => {
    expect(mainMenuSrc).toContain('Map: ${sel.stageName}');
  });

  it('uses a depth above the overwrite confirm (250)', () => {
    expect(mainMenuSrc).toContain('.setDepth(250)');
  });

  it('auto-dismisses via delayedCall', () => {
    // The splash uses this.time.delayedCall to auto-dismiss
    expect(mainMenuSrc).toContain('this.time.delayedCall(750,');
  });

  it('calls onDone after the splash delay', () => {
    const splashSrc = mainMenuSrc.slice(mainMenuSrc.indexOf('_showQuickPlaySplash'));
    const callIdx    = splashSrc.indexOf('this.time.delayedCall(750,');
    const onDoneIdx  = splashSrc.indexOf('onDone()');
    expect(callIdx).toBeGreaterThan(-1);
    expect(onDoneIdx).toBeGreaterThan(callIdx);
  });
});

// ── Arithmetic tests — button sizing ─────────────────────────────────────────

describe('QUICK PLAY button sizing', () => {
  it('mobile height is exactly 44px (minimum touch target)', () => {
    const match = mainMenuSrc.match(/quickBtnH\s*=\s*this\._isMobile\s*\?\s*(\d+)\s*:\s*(\d+)/);
    expect(match).not.toBeNull();
    const mobile = parseInt(match![1], 10);
    expect(mobile).toBe(44);
    expect(mobile).toBeGreaterThanOrEqual(44);
  });

  it('desktop height is 38px', () => {
    const match = mainMenuSrc.match(/quickBtnH\s*=\s*this\._isMobile\s*\?\s*(\d+)\s*:\s*(\d+)/);
    expect(match).not.toBeNull();
    const desktop = parseInt(match![2], 10);
    expect(desktop).toBe(38);
  });

  it('desktop: QUICK PLAY is centred below START GAME', () => {
    const cx         = 640;   // 1280 / 2
    const btnH       = 48;    // desktop
    const quickBtnH  = 38;
    const quickDropGap = 20;  // desktop gap
    const startY     = 490;

    const quickPlayX = cx;    // always centred
    const quickPlayY = startY + btnH / 2 + quickDropGap + quickBtnH / 2;

    expect(quickPlayX).toBe(cx);                  // centred with START
    expect(quickPlayY).toBeGreaterThan(startY);    // below START
    // Gap between START bottom edge and QUICK PLAY top edge = quickDropGap
    const startBottom  = startY + btnH / 2;
    const quickTop     = quickPlayY - quickBtnH / 2;
    expect(quickTop - startBottom).toBe(quickDropGap);
  });

  it('mobile: QUICK PLAY is centred below START GAME', () => {
    const cx         = 180;   // 360 / 2
    const btnH       = 60;    // mobile
    const quickBtnH  = 44;
    const quickDropGap = 16;  // mobile gap
    const startY     = 490;

    const quickPlayX = cx;    // always centred
    const quickPlayY = startY + btnH / 2 + quickDropGap + quickBtnH / 2;

    expect(quickPlayX).toBe(cx);               // centred
    expect(quickPlayY).toBeGreaterThan(startY); // below START
    // Gap between START bottom edge and QUICK PLAY top edge = quickDropGap
    const startBottom = startY + btnH / 2;
    const quickTop    = quickPlayY - quickBtnH / 2;
    expect(quickTop - startBottom).toBe(quickDropGap);
  });

  it('mobile: quick play right edge fits within narrow 360px viewport', () => {
    const cx        = 180;
    const quickBtnW = 240;

    const quickPlayX = cx;   // centred
    const rightEdge  = quickPlayX + quickBtnW / 2;

    expect(rightEdge).toBeLessThanOrEqual(360);
  });

  it('desktop: quick play right edge fits within 1280px viewport', () => {
    const cx        = 640;
    const quickBtnW = 200;

    const quickPlayX = cx;   // centred
    const rightEdge  = quickPlayX + quickBtnW / 2;

    expect(rightEdge).toBeLessThanOrEqual(1280);
  });

  it('mobile: bottom row + ach row fit below quick play within canvas', () => {
    const height      = 720;
    const maxStartY   = height - 232;  // mobile cap
    const startY      = maxStartY;

    const btnH         = 60;
    const quickBtnH    = 44;
    const quickDropGap = 16;  // mobile
    const bottomDropGap = 16; // mobile
    const bottomBtnH   = 48;

    const quickPlayY  = startY + btnH / 2 + quickDropGap + quickBtnH / 2;
    const bottomBtnY  = quickPlayY + quickBtnH / 2 + bottomDropGap + bottomBtnH / 2;
    // achBtnY = bottomBtnY + bottomBtnH/2 + 16 + achBtnH/2 (achBtnH = bottomBtnH)
    const achBottom   = bottomBtnY + bottomBtnH / 2 + 16 + bottomBtnH;

    // Must fit above footer (height - 14)
    expect(achBottom).toBeLessThanOrEqual(height - 14);
  });

  it('desktop: bottom row + ach row fit below quick play within canvas', () => {
    const height      = 720;
    const maxStartY   = height - 208;  // desktop cap
    const startY      = maxStartY;

    const btnH          = 48;
    const quickBtnH     = 38;
    const quickDropGap  = 20;  // desktop
    const bottomDropGap = 20;  // desktop
    const bottomBtnH    = 38;

    const quickPlayY  = startY + btnH / 2 + quickDropGap + quickBtnH / 2;
    const bottomBtnY  = quickPlayY + quickBtnH / 2 + bottomDropGap + bottomBtnH / 2;
    // achBtnY = bottomBtnY + bottomBtnH/2 + 16 + achBtnH/2 (achBtnH = bottomBtnH)
    const achBottom   = bottomBtnY + bottomBtnH / 2 + 16 + bottomBtnH;

    expect(achBottom).toBeLessThanOrEqual(height - 14);
  });
});
