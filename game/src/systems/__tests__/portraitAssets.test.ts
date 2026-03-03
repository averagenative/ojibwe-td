/**
 * Tests for TASK-114: Dialog Character Portraits — Quality Pass & Missing Assets
 *
 * Structural ?raw tests verifying:
 *  - BootScene loads all expected portrait texture keys
 *  - Every commander has a corresponding portrait-${id} load call
 *  - Every elder portrait key referenced in vignettes is loaded
 *  - Every portrait key referenced in cutscenes is loaded
 *  - Codex commander entries have an iconKey set to their portrait
 *  - No duplicate portrait load calls in BootScene
 */

import { describe, it, expect } from 'vitest';

import bootSceneSrc from '../../scenes/BootScene.ts?raw';
import cutsceneDefsSrc from '../../data/cutsceneDefs.ts?raw';
import vignetteSrc from '../../data/vignetteDefs.ts?raw';

import { ALL_COMMANDERS } from '../../data/commanderDefs';
import { ELDER_PORTRAIT_KEYS } from '../../data/vignetteDefs';
import { ALL_CODEX_ENTRIES } from '../../data/codexDefs';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract all texture keys from this.load.image('key', ...) calls in source. */
function extractLoadImageKeys(src: string): string[] {
  const re = /this\.load\.image\(\s*'([^']+)'/g;
  const keys: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) keys.push(m[1]);
  return keys;
}

/** Extract all portrait: 'key' values from source. */
function extractPortraitRefs(src: string): string[] {
  const re = /portrait:\s*'([^']+)'/g;
  const keys: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) keys.push(m[1]);
  return keys;
}

const allBootKeys = extractLoadImageKeys(bootSceneSrc);
const portraitBootKeys = allBootKeys.filter(k => k.startsWith('portrait-'));
const elderBootKeys = allBootKeys.filter(k => k.startsWith('elder-'));

// ── 1. Commander portrait coverage ──────────────────────────────────────────

describe('commander portrait assets', () => {
  it('BootScene loads a portrait-${id} key for every commander', () => {
    for (const cmd of ALL_COMMANDERS) {
      const expected = `portrait-${cmd.id}`;
      expect(portraitBootKeys).toContain(expected);
    }
  });

  it('loads exactly one portrait per commander (no duplicates)', () => {
    for (const cmd of ALL_COMMANDERS) {
      const key = `portrait-${cmd.id}`;
      const count = portraitBootKeys.filter(k => k === key).length;
      expect(count).toBe(1);
    }
  });

  it('portrait count matches commander count', () => {
    expect(portraitBootKeys).toHaveLength(ALL_COMMANDERS.length);
  });

  it('all commander portrait keys follow portrait-{lowercase} naming', () => {
    for (const key of portraitBootKeys) {
      expect(key).toMatch(/^portrait-[a-z]+$/);
    }
  });

  it('load paths point to assets/portraits/ directory', () => {
    for (const cmd of ALL_COMMANDERS) {
      const pathPattern = `portrait-${cmd.id}.png`;
      expect(bootSceneSrc).toContain(`assets/portraits/${pathPattern}`);
    }
  });
});

// ── 2. Elder portrait coverage ──────────────────────────────────────────────

describe('elder portrait assets', () => {
  it('BootScene loads every elder portrait key from ELDER_PORTRAIT_KEYS', () => {
    for (const key of ELDER_PORTRAIT_KEYS) {
      expect(elderBootKeys).toContain(key);
    }
  });

  it('loads exactly 6 elder portrait keys (3 elders × 2 expressions)', () => {
    expect(elderBootKeys).toHaveLength(6);
  });

  it('no duplicate elder portrait load calls', () => {
    const unique = new Set(elderBootKeys);
    expect(unique.size).toBe(elderBootKeys.length);
  });

  it('each elder has a base and an expression variant', () => {
    const elderNames = ['mishoomis', 'nokomis', 'ogichidaa'];
    for (const name of elderNames) {
      const base = `elder-${name}`;
      expect(elderBootKeys).toContain(base);
      // Each elder has exactly one variant (expression) key
      const variants = elderBootKeys.filter(k => k.startsWith(base) && k !== base);
      expect(variants.length).toBe(1);
    }
  });

  it('elder load paths point to assets/portraits/ directory', () => {
    for (const key of ELDER_PORTRAIT_KEYS) {
      expect(bootSceneSrc).toContain(`assets/portraits/${key}.png`);
    }
  });
});

// ── 3. Cutscene portrait references ─────────────────────────────────────────

describe('cutscene portrait references', () => {
  const cutscenePortraitKeys = extractPortraitRefs(cutsceneDefsSrc);

  it('has at least one portrait reference in cutscene definitions', () => {
    expect(cutscenePortraitKeys.length).toBeGreaterThan(0);
  });

  it('every portrait key referenced in cutscenes is loaded in BootScene', () => {
    for (const key of cutscenePortraitKeys) {
      expect(allBootKeys).toContain(key);
    }
  });

  it('cutscene portraits use either portrait-* or elder-* prefix', () => {
    for (const key of cutscenePortraitKeys) {
      const valid = key.startsWith('portrait-') || key.startsWith('elder-');
      expect(valid).toBe(true);
    }
  });
});

// ── 4. Vignette portrait references ─────────────────────────────────────────

describe('vignette portrait references', () => {
  const vignettePortraitKeys = extractPortraitRefs(vignetteSrc);

  it('has at least one portrait reference in vignette definitions', () => {
    expect(vignettePortraitKeys.length).toBeGreaterThan(0);
  });

  it('every portrait key referenced in vignettes is loaded in BootScene', () => {
    for (const key of vignettePortraitKeys) {
      expect(allBootKeys).toContain(key);
    }
  });

  it('vignette portraits are all elder-* keys', () => {
    for (const key of vignettePortraitKeys) {
      expect(key).toMatch(/^elder-/);
    }
  });
});

// ── 5. Codex commander entries ──────────────────────────────────────────────

describe('codex commander portrait iconKeys', () => {
  const commanderCodexEntries = ALL_CODEX_ENTRIES.filter(e =>
    e.id.startsWith('codex-commander-'),
  );

  it('every commander codex entry has an iconKey', () => {
    for (const entry of commanderCodexEntries) {
      expect(entry.iconKey).toBeDefined();
      expect(typeof entry.iconKey).toBe('string');
      expect(entry.iconKey!.length).toBeGreaterThan(0);
    }
  });

  it('every commander codex iconKey follows portrait-{id} pattern', () => {
    for (const entry of commanderCodexEntries) {
      expect(entry.iconKey).toMatch(/^portrait-[a-z]+$/);
    }
  });

  it('every commander codex iconKey is loaded in BootScene', () => {
    for (const entry of commanderCodexEntries) {
      expect(allBootKeys).toContain(entry.iconKey);
    }
  });

  it('codex commander count matches ALL_COMMANDERS count', () => {
    expect(commanderCodexEntries).toHaveLength(ALL_COMMANDERS.length);
  });

  it('codex iconKey matches portrait-${commanderId} for each commander', () => {
    for (const cmd of ALL_COMMANDERS) {
      const codexEntry = commanderCodexEntries.find(e =>
        e.id === `codex-commander-${cmd.id}`,
      );
      expect(codexEntry).toBeDefined();
      expect(codexEntry!.iconKey).toBe(`portrait-${cmd.id}`);
    }
  });
});

// ── 6. No orphaned portrait loads ───────────────────────────────────────────

describe('no orphaned portrait loads', () => {
  it('every loaded commander portrait key maps to a valid commander ID', () => {
    const cmdIds = new Set(ALL_COMMANDERS.map(c => c.id));
    for (const key of portraitBootKeys) {
      const id = key.replace('portrait-', '');
      expect(cmdIds.has(id)).toBe(true);
    }
  });

  it('every loaded elder portrait key is in ELDER_PORTRAIT_KEYS', () => {
    for (const key of elderBootKeys) {
      expect(ELDER_PORTRAIT_KEYS as readonly string[]).toContain(key);
    }
  });
});

// ── 7. BootScene structural checks ──────────────────────────────────────────

describe('BootScene portrait load structure', () => {
  it('commander portraits section has a "96x96" comment', () => {
    expect(bootSceneSrc).toContain('Commander portraits (96x96)');
  });

  it('elder portraits section has a "96x96" comment', () => {
    expect(bootSceneSrc).toContain('Elder portraits (96x96)');
  });

  it('total portrait + elder load calls equals commanders + 6 elders', () => {
    const totalPortraits = portraitBootKeys.length + elderBootKeys.length;
    expect(totalPortraits).toBe(ALL_COMMANDERS.length + 6);
  });
});
