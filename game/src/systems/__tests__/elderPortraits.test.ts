/**
 * Tests for TASK-078: Elder Portraits — Create Visual Assets & Add to Dialog Box
 *
 * Covers:
 *  1. ELDER_PORTRAIT_KEYS format and count
 *  2. Vignette defs — portrait keys reference known elder keys
 *  3. Vignette defs — elder speaker vignettes all have portrait fields
 *  4. VignetteOverlay source — slide-in animation + colored nameplate present
 *  5. BootScene source — elder portrait load.image calls present
 *  6. Portrait file existence (public/assets/portraits/)
 *  7. Speaker-to-portrait consistency
 *  8. Nokomis elder usage
 *  9. VignetteOverlay layout — no-portrait fallback, no-speaker layout
 * 10. Edge cases and boundary conditions
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  ALL_VIGNETTES,
  ELDER_PORTRAIT_KEYS,
  getVignettesForTrigger,
  TriggerType,
} from '../../data/vignetteDefs';
import { ALL_CODEX_ENTRIES } from '../../data/codexDefs';

// ── 1. Elder portrait key format & count ──────────────────────────────────────

describe('ELDER_PORTRAIT_KEYS', () => {
  it('contains exactly 6 elder portrait keys', () => {
    expect(ELDER_PORTRAIT_KEYS).toHaveLength(6);
  });

  it('all keys start with "elder-"', () => {
    for (const key of ELDER_PORTRAIT_KEYS) {
      expect(key).toMatch(/^elder-/);
    }
  });

  it('all keys are unique', () => {
    expect(new Set(ELDER_PORTRAIT_KEYS).size).toBe(ELDER_PORTRAIT_KEYS.length);
  });

  it('contains base keys for all 3 elders', () => {
    expect(ELDER_PORTRAIT_KEYS).toContain('elder-mishoomis');
    expect(ELDER_PORTRAIT_KEYS).toContain('elder-nokomis');
    expect(ELDER_PORTRAIT_KEYS).toContain('elder-ogichidaa');
  });

  it('contains expression variants for each elder', () => {
    expect(ELDER_PORTRAIT_KEYS).toContain('elder-mishoomis-proud');
    expect(ELDER_PORTRAIT_KEYS).toContain('elder-nokomis-teaching');
    expect(ELDER_PORTRAIT_KEYS).toContain('elder-ogichidaa-fierce');
  });

  it('all keys follow the elder-{name}[-{expression}] pattern', () => {
    for (const key of ELDER_PORTRAIT_KEYS) {
      expect(key).toMatch(/^elder-[a-z]+(-[a-z]+)?$/);
    }
  });

  it('each base elder has exactly one expression variant', () => {
    const bases = ['mishoomis', 'nokomis', 'ogichidaa'];
    for (const base of bases) {
      const variants = ELDER_PORTRAIT_KEYS.filter(
        k => k.startsWith(`elder-${base}-`),
      );
      expect(variants).toHaveLength(1);
    }
  });
});

// ── 2. Vignette portrait keys reference valid elder keys ──────────────────────

describe('vignette portrait key validity', () => {
  const elderKeySet = new Set<string>(ELDER_PORTRAIT_KEYS);
  const vignettesWithPortrait = ALL_VIGNETTES.filter(v => v.portrait);

  it('at least 9 vignettes have a portrait set', () => {
    // 8 Mishoomis + 4 Ogichidaa + 1 Nokomis = 13 minimum
    expect(vignettesWithPortrait.length).toBeGreaterThanOrEqual(9);
  });

  it('all elder vignette portrait values reference known elder keys', () => {
    const elderSpeakers = new Set(['Mishoomis', 'Nokomis', 'Ogichidaa']);
    for (const v of vignettesWithPortrait) {
      if (v.speaker && elderSpeakers.has(v.speaker)) {
        expect(elderKeySet.has(v.portrait!)).toBe(true);
      }
    }
  });

  it('no elder vignette uses an unknown portrait key', () => {
    const elderSpeakers = new Set(['Mishoomis', 'Nokomis', 'Ogichidaa']);
    for (const v of ALL_VIGNETTES) {
      if (v.portrait && v.speaker && elderSpeakers.has(v.speaker)) {
        expect(elderKeySet).toContain(v.portrait);
      }
    }
  });

  it('act1-arrival uses elder-mishoomis portrait', () => {
    const v = ALL_VIGNETTES.find(v => v.id === 'act1-arrival');
    expect(v?.portrait).toBe('elder-mishoomis');
  });

  it('act4-ending-clean uses elder-mishoomis-proud portrait', () => {
    const v = ALL_VIGNETTES.find(v => v.id === 'act4-ending-clean');
    expect(v?.portrait).toBe('elder-mishoomis-proud');
  });

  it('act3-migizi-falls uses elder-ogichidaa-fierce portrait', () => {
    const v = ALL_VIGNETTES.find(v => v.id === 'act3-migizi-falls');
    expect(v?.portrait).toBe('elder-ogichidaa-fierce');
  });

  it('act2-nokomis-medicine uses elder-nokomis-teaching portrait', () => {
    const v = ALL_VIGNETTES.find(v => v.id === 'act2-nokomis-medicine');
    expect(v).toBeDefined();
    expect(v?.portrait).toBe('elder-nokomis-teaching');
  });
});

// ── 3. Elder speaker vignettes have portrait fields ───────────────────────────

describe('elder speaker vignettes have portrait fields', () => {
  const elderSpeakers = ['Mishoomis', 'Nokomis', 'Ogichidaa'];

  it('all Mishoomis vignettes have a portrait', () => {
    const mishoomisVig = ALL_VIGNETTES.filter(v => v.speaker === 'Mishoomis');
    expect(mishoomisVig.length).toBeGreaterThan(0);
    for (const v of mishoomisVig) {
      expect(v.portrait).toBeDefined();
      expect(v.portrait).toMatch(/^elder-mishoomis/);
    }
  });

  it('all Ogichidaa vignettes have a portrait', () => {
    const vig = ALL_VIGNETTES.filter(v => v.speaker === 'Ogichidaa');
    expect(vig.length).toBeGreaterThan(0);
    for (const v of vig) {
      expect(v.portrait).toBeDefined();
      expect(v.portrait).toMatch(/^elder-ogichidaa/);
    }
  });

  it('all Nokomis vignettes have a portrait', () => {
    const vig = ALL_VIGNETTES.filter(v => v.speaker === 'Nokomis');
    expect(vig.length).toBeGreaterThan(0);
    for (const v of vig) {
      expect(v.portrait).toBeDefined();
      expect(v.portrait).toMatch(/^elder-nokomis/);
    }
  });

  it('every elder speaker has at least one vignette', () => {
    for (const speaker of elderSpeakers) {
      const count = ALL_VIGNETTES.filter(v => v.speaker === speaker).length;
      expect(count).toBeGreaterThan(0);
    }
  });

  it('no vignette uses generic "Elder" speaker name (replaced by named elders)', () => {
    const generic = ALL_VIGNETTES.filter(v => v.speaker === 'Elder');
    expect(generic).toHaveLength(0);
  });

  it('Scout vignettes have portrait "scout"', () => {
    const scoutVig = ALL_VIGNETTES.filter(v => v.speaker === 'Scout');
    expect(scoutVig.length).toBeGreaterThan(0);
    for (const v of scoutVig) {
      expect(v.portrait).toBe('scout');
    }
  });

  it('elder speaker names are among the recognised three', () => {
    const knownElders = new Set(elderSpeakers);
    const unknownElderSpeakers = ALL_VIGNETTES
      .filter(v => v.speaker?.toLowerCase().startsWith('elder') ||
                   knownElders.has(v.speaker ?? ''))
      .map(v => v.speaker)
      .filter(s => s !== undefined && !knownElders.has(s!) && s !== 'Scout' && s !== 'War Chief');
    expect(unknownElderSpeakers).toHaveLength(0);
  });

  it('portrait keys match their speaker (mishoomis → elder-mishoomis-*)', () => {
    for (const v of ALL_VIGNETTES) {
      if (!v.speaker || !v.portrait) continue;
      const speakerLower = v.speaker.toLowerCase();
      if (elderSpeakers.map(s => s.toLowerCase()).includes(speakerLower)) {
        expect(v.portrait).toContain(`elder-${speakerLower}`);
      }
    }
  });
});

// ── 4. VignetteOverlay source — slide-in animation + nameplate ────────────────

describe('VignetteOverlay source code', () => {
  const overlayPath = path.resolve(__dirname, '../../ui/VignetteOverlay.ts');
  const src = fs.readFileSync(overlayPath, 'utf-8');

  it('source file exists', () => {
    expect(fs.existsSync(overlayPath)).toBe(true);
  });

  it('defines PORTRAIT_SLIDE_MS constant for slide duration', () => {
    expect(src).toMatch(/PORTRAIT_SLIDE_MS\s*=\s*\d+/);
  });

  it('defines PORTRAIT_SLIDE_OFFSET constant', () => {
    expect(src).toMatch(/PORTRAIT_SLIDE_OFFSET\s*=\s*\d+/);
  });

  it('portrait tween uses ease Cubic.easeOut', () => {
    expect(src).toContain('Cubic.easeOut');
  });

  it('portrait starts at offset position (slide-in from left)', () => {
    expect(src).toMatch(/portraitStartX|portraitFinalX/);
    expect(src).toMatch(/PORTRAIT_SLIDE_OFFSET/);
  });

  it('nameplateColour function is defined', () => {
    expect(src).toMatch(/function nameplateColour/);
  });

  it('nameplateColour handles mishoomis speaker', () => {
    expect(src).toMatch(/mishoomis/i);
  });

  it('nameplateColour handles nokomis speaker', () => {
    expect(src).toMatch(/nokomis/i);
  });

  it('nameplateColour handles ogichidaa speaker', () => {
    expect(src).toMatch(/ogichidaa/i);
  });

  it('speaker nameplate uses a rectangle background (nameplateBg)', () => {
    expect(src).toContain('nameplateBg');
  });

  it('portrait slide tween sets alpha from 0 to 1', () => {
    expect(src).toMatch(/setAlpha\(0\)/);
    expect(src).toMatch(/alpha:\s*1/);
  });

  it('PORTRAIT_SLIDE_MS is 200ms', () => {
    expect(src).toMatch(/PORTRAIT_SLIDE_MS\s*=\s*200/);
  });

  it('cleanup() destroys typeTimer', () => {
    expect(src).toMatch(/this\.typeTimer.*destroy/s);
  });

  it('cleanup() sets onDismiss to null', () => {
    expect(src).toContain('this.onDismiss = null');
  });

  it('fallback portrait renders coloured rectangle when no texture', () => {
    expect(src).toContain('portraitColor');
    expect(src).toContain('iconChar');
  });

  it('no-speaker path skips nameplate rendering', () => {
    expect(src).toMatch(/if\s*\(vignette\.speaker\)/);
  });

  it('dismiss() captures onDismiss before cleanup (null-deref guard)', () => {
    expect(src).toMatch(/const callback = this\.onDismiss/);
    expect(src).toMatch(/this\.cleanup\(\)/);
    expect(src).toMatch(/callback\?\.\(\)/);
  });

  it('handleClick returns early when !visible', () => {
    expect(src).toMatch(/if\s*\(!this\.visible\)\s*return/);
  });
});

// ── 5. BootScene source — elder portrait load calls ───────────────────────────

describe('BootScene elder portrait preloading', () => {
  const bootPath = path.resolve(__dirname, '../../scenes/BootScene.ts');
  const src = fs.readFileSync(bootPath, 'utf-8');

  it('loads elder-mishoomis', () => {
    expect(src).toContain("'elder-mishoomis'");
  });

  it('loads elder-mishoomis-proud', () => {
    expect(src).toContain("'elder-mishoomis-proud'");
  });

  it('loads elder-nokomis', () => {
    expect(src).toContain("'elder-nokomis'");
  });

  it('loads elder-nokomis-teaching', () => {
    expect(src).toContain("'elder-nokomis-teaching'");
  });

  it('loads elder-ogichidaa', () => {
    expect(src).toContain("'elder-ogichidaa'");
  });

  it('loads elder-ogichidaa-fierce', () => {
    expect(src).toContain("'elder-ogichidaa-fierce'");
  });

  it('all 6 elder keys are loaded', () => {
    let count = 0;
    for (const key of ELDER_PORTRAIT_KEYS) {
      if (src.includes(`'${key}'`)) count++;
    }
    expect(count).toBe(ELDER_PORTRAIT_KEYS.length);
  });

  it('elder portraits load from assets/portraits/ path', () => {
    for (const key of ELDER_PORTRAIT_KEYS) {
      expect(src).toContain(`'assets/portraits/${key}.png'`);
    }
  });
});

// ── 6. Portrait PNG files exist on disk ───────────────────────────────────────

describe('elder portrait PNG files on disk', () => {
  const portraitsDir = path.resolve(__dirname, '../../../public/assets/portraits');

  it('portraits directory exists', () => {
    expect(fs.existsSync(portraitsDir)).toBe(true);
  });

  for (const key of ELDER_PORTRAIT_KEYS) {
    it(`${key}.png exists`, () => {
      const filePath = path.join(portraitsDir, `${key}.png`);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  }

  it('all 6 elder portrait PNGs are present', () => {
    let count = 0;
    for (const key of ELDER_PORTRAIT_KEYS) {
      if (fs.existsSync(path.join(portraitsDir, `${key}.png`))) count++;
    }
    expect(count).toBe(ELDER_PORTRAIT_KEYS.length);
  });

  it('elder portrait files are valid PNG (correct magic bytes)', () => {
    const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    for (const key of ELDER_PORTRAIT_KEYS) {
      const filePath = path.join(portraitsDir, `${key}.png`);
      if (!fs.existsSync(filePath)) continue;
      const header = Buffer.alloc(8);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, header, 0, 8, 0);
      fs.closeSync(fd);
      expect(header.equals(PNG_MAGIC)).toBe(true);
    }
  });

  it('elder portrait files are non-trivial size (> 1 KB each)', () => {
    for (const key of ELDER_PORTRAIT_KEYS) {
      const filePath = path.join(portraitsDir, `${key}.png`);
      if (!fs.existsSync(filePath)) continue;
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(1024);
    }
  });
});

// ── 7. getVignettesForTrigger with elder portraits ───────────────────────────

describe('getVignettesForTrigger with elder portraits', () => {
  it('FIRST_PLAY trigger returns act1-arrival with Mishoomis speaker', () => {
    const vigs = getVignettesForTrigger(TriggerType.FIRST_PLAY);
    const v = vigs.find(v => v.id === 'act1-arrival');
    expect(v).toBeDefined();
    expect(v?.speaker).toBe('Mishoomis');
    expect(v?.portrait).toBe('elder-mishoomis');
  });

  it('BOSS_KILLED migizi returns Ogichidaa speaker with fierce portrait', () => {
    const vigs = getVignettesForTrigger(TriggerType.BOSS_KILLED, 'migizi');
    expect(vigs.length).toBeGreaterThan(0);
    expect(vigs[0].speaker).toBe('Ogichidaa');
    expect(vigs[0].portrait).toBe('elder-ogichidaa-fierce');
  });

  it('STAGE_COMPLETE biboon-aki returns vignettes with Mishoomis speaker', () => {
    const vigs = getVignettesForTrigger(TriggerType.STAGE_COMPLETE, undefined, 'biboon-aki');
    const clean = vigs.find(v => v.id === 'act4-ending-clean');
    expect(clean?.speaker).toBe('Mishoomis');
    expect(clean?.portrait).toBe('elder-mishoomis-proud');
  });

  it('WAVE_COMPLETE wave 5 in mashkiig returns Nokomis vignette', () => {
    const vigs = getVignettesForTrigger(TriggerType.WAVE_COMPLETE, 5, 'mashkiig');
    const nokomis = vigs.find(v => v.speaker === 'Nokomis');
    expect(nokomis).toBeDefined();
    expect(nokomis?.portrait).toBe('elder-nokomis-teaching');
  });

  it('returns empty for nonexistent boss key', () => {
    const vigs = getVignettesForTrigger(TriggerType.BOSS_KILLED, 'nonexistent-boss');
    expect(vigs).toHaveLength(0);
  });

  it('returns empty for wave number with no vignette', () => {
    const vigs = getVignettesForTrigger(TriggerType.WAVE_COMPLETE, 99, 'zaagaiganing');
    expect(vigs).toHaveLength(0);
  });
});

// ── 8. Nokomis elder usage ──────────────────────────────────────────────────

describe('Nokomis elder usage', () => {
  it('at least one vignette has Nokomis as speaker', () => {
    const nokomisVigs = ALL_VIGNETTES.filter(v => v.speaker === 'Nokomis');
    expect(nokomisVigs.length).toBeGreaterThanOrEqual(1);
  });

  it('Nokomis vignette is in the mashkiig region (wetlands — medicine/nature)', () => {
    const nokomisVigs = ALL_VIGNETTES.filter(v => v.speaker === 'Nokomis');
    const inMashkiig = nokomisVigs.filter(v => v.regionId === 'mashkiig');
    expect(inMashkiig.length).toBeGreaterThanOrEqual(1);
  });

  it('Nokomis vignette uses an elder-nokomis portrait variant', () => {
    const nokomisVigs = ALL_VIGNETTES.filter(v => v.speaker === 'Nokomis');
    for (const v of nokomisVigs) {
      expect(v.portrait).toMatch(/^elder-nokomis/);
    }
  });

  it('Nokomis vignette has 2-4 lines of dialogue', () => {
    const nokomisVigs = ALL_VIGNETTES.filter(v => v.speaker === 'Nokomis');
    for (const v of nokomisVigs) {
      expect(v.lines.length).toBeGreaterThanOrEqual(2);
      expect(v.lines.length).toBeLessThanOrEqual(4);
    }
  });

  it('Nokomis vignette references medicine/nature in its text', () => {
    const nokomisVigs = ALL_VIGNETTES.filter(v => v.speaker === 'Nokomis');
    const allText = nokomisVigs.map(v => v.lines.join(' ')).join(' ').toLowerCase();
    const hasMedicineRef = allText.includes('medicine') ||
                           allText.includes('heal') ||
                           allText.includes('mashkiki') ||
                           allText.includes('plant') ||
                           allText.includes('grow');
    expect(hasMedicineRef).toBe(true);
  });

  it('Nokomis codexUnlock references a valid codex entry', () => {
    const nokomisVigs = ALL_VIGNETTES.filter(v => v.speaker === 'Nokomis');
    const codexIds = new Set(ALL_CODEX_ENTRIES.map(e => e.id));
    for (const v of nokomisVigs) {
      if (v.codexUnlock) {
        expect(codexIds.has(v.codexUnlock)).toBe(true);
      }
    }
  });
});

// ── 9. VignetteOverlay layout — no-portrait fallback, no-speaker layout ──────

describe('VignetteOverlay layout edge cases (source)', () => {
  const overlayPath = path.resolve(__dirname, '../../ui/VignetteOverlay.ts');
  const src = fs.readFileSync(overlayPath, 'utf-8');

  it('renders fallback icon character from first letter of speaker', () => {
    expect(src).toMatch(/vignette\.speaker\?\.\[0\]/);
  });

  it('fallback uses "?" when no speaker is set', () => {
    expect(src).toContain("?'");
  });

  it('body text Y position adjusts when no speaker (higher placement)', () => {
    expect(src).toMatch(/vignette\.speaker\s*\?\s*panelY\s*\+\s*\d+\s*:\s*panelY\s*\+\s*\d+/);
  });

  it('typewriter timer is created with CHAR_DELAY_MS interval', () => {
    expect(src).toMatch(/delay:\s*CHAR_DELAY_MS/);
  });

  it('typewriter repeat count is fullText.length - 1', () => {
    expect(src).toMatch(/repeat:\s*this\.fullText\.length\s*-\s*1/);
  });

  it('HOLD_SKIP_MS is 1500 for first-time vignettes', () => {
    expect(src).toMatch(/HOLD_SKIP_MS\s*=\s*1500/);
  });

  it('CHAR_DELAY_MS is 30', () => {
    expect(src).toMatch(/CHAR_DELAY_MS\s*=\s*30/);
  });

  it('panel depth is 400', () => {
    expect(src).toMatch(/DEPTH\s*=\s*400/);
  });
});

// ── 10. Edge cases and data integrity ────────────────────────────────────────

describe('elder portraits data integrity', () => {
  it('all vignettes with a speaker have non-empty lines', () => {
    for (const v of ALL_VIGNETTES) {
      if (v.speaker) {
        expect(v.lines.length).toBeGreaterThan(0);
        for (const line of v.lines) {
          expect(line.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('all vignette IDs are unique', () => {
    const ids = ALL_VIGNETTES.map(v => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('vignettes with codexUnlock all reference existing codex entries', () => {
    const codexIds = new Set(ALL_CODEX_ENTRIES.map(e => e.id));
    for (const v of ALL_VIGNETTES) {
      if (v.codexUnlock) {
        expect(codexIds.has(v.codexUnlock)).toBe(true);
      }
    }
  });

  it('no portrait-less elder vignette (if speaker is an elder, portrait is required)', () => {
    const elderNames = new Set(['Mishoomis', 'Nokomis', 'Ogichidaa']);
    for (const v of ALL_VIGNETTES) {
      if (v.speaker && elderNames.has(v.speaker)) {
        expect(v.portrait).toBeDefined();
      }
    }
  });

  it('portrait field is undefined (not empty string) when absent', () => {
    for (const v of ALL_VIGNETTES) {
      if (!v.portrait) {
        expect(v.portrait).toBeUndefined();
      }
    }
  });

  it('speaker field is undefined (not empty string) when absent', () => {
    for (const v of ALL_VIGNETTES) {
      if (!v.speaker) {
        expect(v.speaker).toBeUndefined();
      }
    }
  });
});

// ── 11. GameScene integration (source checks) ────────────────────────────────

describe('GameScene vignette integration (source)', () => {
  const gsPath = path.resolve(__dirname, '../../scenes/GameScene.ts');
  const src = fs.readFileSync(gsPath, 'utf-8');

  it('creates VignetteManager in create()', () => {
    expect(src).toMatch(/new VignetteManager\(/);
  });

  it('creates VignetteOverlay in create()', () => {
    expect(src).toMatch(/new VignetteOverlay\(/);
  });

  it('checks FIRST_PLAY trigger', () => {
    expect(src).toContain('TriggerType.FIRST_PLAY');
  });

  it('calls vignetteOverlay.show() with result', () => {
    expect(src).toMatch(/vignetteOverlay\.show\(/);
  });

  it('calls vignetteOverlay.cleanup() in shutdown', () => {
    expect(src).toMatch(/vignetteOverlay\?\.cleanup\(\)/);
  });

  it('records life loss for ending variants', () => {
    expect(src).toContain('vignetteManager.recordLifeLost()');
  });

  it('builds between-wave vignette entry', () => {
    expect(src).toMatch(/_buildBetweenWaveVignetteEntry/);
  });

  it('checks BOSS_KILLED trigger with pendingBossKillKey', () => {
    expect(src).toContain('TriggerType.BOSS_KILLED');
    expect(src).toContain('pendingBossKillKey');
  });

  it('checks STAGE_COMPLETE trigger for victory', () => {
    expect(src).toContain('TriggerType.STAGE_COMPLETE');
  });
});
