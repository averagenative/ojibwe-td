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
      // Must match: elder-<word>  OR  elder-<word>-<word>
      expect(key).toMatch(/^elder-[a-z]+(-[a-z]+)?$/);
    }
  });
});

// ── 2. Vignette portrait keys reference valid elder keys ──────────────────────

describe('vignette portrait key validity', () => {
  const elderKeySet = new Set<string>(ELDER_PORTRAIT_KEYS);

  const vignettesWithPortrait = ALL_VIGNETTES.filter(v => v.portrait);

  it('at least 8 vignettes have a portrait set', () => {
    expect(vignettesWithPortrait.length).toBeGreaterThanOrEqual(8);
  });

  it('all vignette portrait values reference known elder keys', () => {
    for (const v of vignettesWithPortrait) {
      expect(elderKeySet.has(v.portrait!)).toBe(true);
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

  it('no vignette uses generic "Elder" speaker name (replaced by named elders)', () => {
    const generic = ALL_VIGNETTES.filter(v => v.speaker === 'Elder');
    expect(generic).toHaveLength(0);
  });

  it('Scout vignettes have no portrait (field narrator, not an elder)', () => {
    const scoutVig = ALL_VIGNETTES.filter(v => v.speaker === 'Scout');
    expect(scoutVig.length).toBeGreaterThan(0);
    for (const v of scoutVig) {
      expect(v.portrait).toBeUndefined();
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
});

// ── 7. getVignettesForTrigger still works with new portrait fields ─────────────

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
});
