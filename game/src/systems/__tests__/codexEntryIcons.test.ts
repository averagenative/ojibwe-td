/**
 * TASK-101: Codex — Icons for Beings, Places, Commanders
 *
 * Data integrity tests for codexDefs icon fields, plus structural source-pattern
 * tests (`?raw` import) verifying CodexScene renders icons with proper guards
 * and fallbacks.
 */

import { describe, it, expect } from 'vitest';

import codexSceneRaw from '../../scenes/CodexScene.ts?raw';
import bootSceneRaw from '../../scenes/BootScene.ts?raw';
import {
  ALL_CODEX_ENTRIES,
  CODEX_SECTIONS,
  CODEX_SECTION_ICONS,
} from '../../data/codexDefs';

// ── Helpers ──────────────────────────────────────────────────────────────────

function createTabsBody(): string {
  const start = codexSceneRaw.indexOf('private createTabs(');
  const end = codexSceneRaw.indexOf('private highlightTab(');
  return codexSceneRaw.slice(start, end);
}

function buildEntryTileBody(): string {
  const start = codexSceneRaw.indexOf('private buildEntryTile(');
  const end = codexSceneRaw.indexOf('// ── Detail View');
  return codexSceneRaw.slice(start, end);
}

function showDetailBody(): string {
  const start = codexSceneRaw.indexOf('private showDetail(');
  const end = codexSceneRaw.indexOf('private clearDetail(');
  return codexSceneRaw.slice(start, end);
}

function desktopDetailBranch(): string {
  const body = showDetailBody();
  const idx = body.indexOf('// ── Desktop: side panel');
  return body.slice(idx);
}

function mobileDetailBranch(): string {
  const body = showDetailBody();
  const end = body.indexOf('// ── Desktop: side panel');
  return body.slice(0, end);
}

/** Extract all texture keys loaded via this.load.image('key', ...) in BootScene. */
function bootSceneTextureKeys(): Set<string> {
  const re = /this\.load\.image\(\s*'([^']+)'/g;
  const keys = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = re.exec(bootSceneRaw)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data integrity — codexDefs.ts
// ─────────────────────────────────────────────────────────────────────────────

describe('codexDefs — icon data integrity (TASK-101)', () => {

  it('CODEX_SECTION_ICONS has a key for every section', () => {
    for (const section of CODEX_SECTIONS) {
      expect(CODEX_SECTION_ICONS[section]).toBeDefined();
      expect(typeof CODEX_SECTION_ICONS[section]).toBe('string');
      expect(CODEX_SECTION_ICONS[section].length).toBeGreaterThan(0);
    }
  });

  it('iconKey is optional — some entries may omit it', () => {
    const withIcon = ALL_CODEX_ENTRIES.filter(e => e.iconKey);
    const withoutIcon = ALL_CODEX_ENTRIES.filter(e => !e.iconKey);
    expect(withIcon.length).toBeGreaterThan(0);
    expect(withoutIcon.length).toBeGreaterThan(0);
  });

  it('commander entries with iconKey reference portrait-* keys', () => {
    const commanders = ALL_CODEX_ENTRIES.filter(
      e => e.section === 'commanders' && e.iconKey,
    );
    expect(commanders.length).toBeGreaterThan(0);
    for (const cmd of commanders) {
      expect(cmd.iconKey).toMatch(/^portrait-/);
    }
  });

  it('boss entries reference boss-* texture keys', () => {
    const bosses = ALL_CODEX_ENTRIES.filter(
      e => e.section === 'beings' && e.iconKey?.startsWith('boss-'),
    );
    expect(bosses.length).toBeGreaterThan(0);
    for (const b of bosses) {
      expect(b.iconKey).toMatch(/^boss-/);
    }
  });

  it('place entries with iconKey reference tile-* keys', () => {
    const places = ALL_CODEX_ENTRIES.filter(
      e => e.section === 'places' && e.iconKey,
    );
    expect(places.length).toBeGreaterThan(0);
    for (const p of places) {
      expect(p.iconKey).toMatch(/^tile-/);
    }
  });

  it('all iconKey values are non-empty strings', () => {
    const withIcon = ALL_CODEX_ENTRIES.filter(e => e.iconKey);
    for (const entry of withIcon) {
      expect(typeof entry.iconKey).toBe('string');
      expect(entry.iconKey!.length).toBeGreaterThan(0);
    }
  });

  it('entries without iconKey still have a valid tileColor fallback', () => {
    const withoutIcon = ALL_CODEX_ENTRIES.filter(e => !e.iconKey);
    for (const entry of withoutIcon) {
      expect(typeof entry.tileColor).toBe('number');
      expect(entry.tileColor).toBeGreaterThanOrEqual(0);
    }
  });

  it('every iconKey value is loaded in BootScene', () => {
    const loadedKeys = bootSceneTextureKeys();
    const entriesWithIcons = ALL_CODEX_ENTRIES.filter(e => e.iconKey);
    for (const entry of entriesWithIcons) {
      expect(loadedKeys.has(entry.iconKey!),
        `iconKey "${entry.iconKey}" for "${entry.title}" not found in BootScene`,
      ).toBe(true);
    }
  });

  it('every CODEX_SECTION_ICONS value is loaded in BootScene', () => {
    const loadedKeys = bootSceneTextureKeys();
    for (const section of CODEX_SECTIONS) {
      const key = CODEX_SECTION_ICONS[section];
      expect(loadedKeys.has(key),
        `section icon "${key}" for "${section}" not found in BootScene`,
      ).toBe(true);
    }
  });

  it('no duplicate iconKeys within the same section', () => {
    for (const section of CODEX_SECTIONS) {
      const sectionKeys = ALL_CODEX_ENTRIES
        .filter(e => e.section === section && e.iconKey)
        .map(e => e.iconKey!);
      expect(sectionKeys.length).toBe(new Set(sectionKeys).size);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CodexScene — section tab icons
// ─────────────────────────────────────────────────────────────────────────────

describe('CodexScene — section tab icons (TASK-101)', () => {

  it('imports CODEX_SECTION_ICONS from codexDefs', () => {
    expect(codexSceneRaw).toContain('CODEX_SECTION_ICONS');
  });

  it('looks up section icon key from CODEX_SECTION_ICONS', () => {
    const tabs = createTabsBody();
    expect(tabs).toContain('CODEX_SECTION_ICONS[section]');
  });

  it('guards icon display with textures.exists check', () => {
    const tabs = createTabsBody();
    expect(tabs).toContain('this.textures.exists(sectionIconKey)');
  });

  it('creates icon image with setDisplaySize for consistent sizing', () => {
    const tabs = createTabsBody();
    expect(tabs).toMatch(/add\.image\(iconX,\s*tabY,\s*sectionIconKey\)/);
    expect(tabs).toContain('.setDisplaySize(iconSz, iconSz)');
  });

  it('uses 20px icons on mobile, 16px on desktop', () => {
    const tabs = createTabsBody();
    expect(tabs).toMatch(/iconSz\s*=\s*this\._isMobile\s*\?\s*20\s*:\s*16/);
  });

  it('repositions label to the right of the icon', () => {
    const tabs = createTabsBody();
    expect(tabs).toContain('label.setX(labelX)');
  });

  it('does not shadow outer totalW variable', () => {
    const tabs = createTabsBody();
    // Should use iconLabelW, not totalW, for the icon+label width calculation
    expect(tabs).toContain('iconLabelW');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CodexScene — entry list icons
// ─────────────────────────────────────────────────────────────────────────────

describe('CodexScene — entry list icons (TASK-101)', () => {

  it('checks isUnlocked AND iconKey AND textures.exists before showing icon', () => {
    const body = buildEntryTileBody();
    expect(body).toContain('isUnlocked && entry.iconKey && this.textures.exists(entry.iconKey)');
  });

  it('falls back to coloured rectangle when icon is unavailable', () => {
    const body = buildEntryTileBody();
    expect(body).toMatch(/add\.rectangle\(tileX,\s*tileY,\s*tileSize,\s*tileSize,\s*tileColor\)/);
  });

  it('uses consistent 28px tile size for icons', () => {
    const body = buildEntryTileBody();
    expect(body).toContain('tileSize = 28');
  });

  it('adds icon to created[] array for cleanup', () => {
    const body = buildEntryTileBody();
    expect(body).toContain('created.push(icon)');
  });

  it('locked entries show dark tile regardless of iconKey', () => {
    const body = buildEntryTileBody();
    expect(body).toContain('isUnlocked ? entry.tileColor : 0x222222');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CodexScene — detail view icons
// ─────────────────────────────────────────────────────────────────────────────

describe('CodexScene — detail view icons (TASK-101)', () => {

  describe('mobile detail', () => {
    it('uses iconKey with textures.exists guard', () => {
      const mobile = mobileDetailBranch();
      expect(mobile).toContain('entry.iconKey && this.textures.exists(entry.iconKey)');
    });

    it('shows icon image with 48px display size', () => {
      const mobile = mobileDetailBranch();
      expect(mobile).toContain('illusSize = 48');
      expect(mobile).toContain('.setDisplaySize(illusSize, illusSize)');
    });

    it('falls back to tile + first letter when no icon', () => {
      const mobile = mobileDetailBranch();
      expect(mobile).toContain('entry.tileColor');
      expect(mobile).toContain('entry.title[0]');
    });

    it('adds icon to detailObjects for cleanup', () => {
      const mobile = mobileDetailBranch();
      expect(mobile).toContain('this.detailObjects.push(illusIcon)');
    });
  });

  describe('desktop detail', () => {
    it('uses iconKey with textures.exists guard', () => {
      const desktop = desktopDetailBranch();
      expect(desktop).toContain('entry.iconKey && this.textures.exists(entry.iconKey)');
    });

    it('shows icon image with 56px display size', () => {
      const desktop = desktopDetailBranch();
      expect(desktop).toContain('illusSize = 56');
      expect(desktop).toContain('.setDisplaySize(illusSize, illusSize)');
    });

    it('falls back to tile + first letter when no icon', () => {
      const desktop = desktopDetailBranch();
      expect(desktop).toContain('entry.tileColor');
      expect(desktop).toContain('entry.title[0]');
    });

    it('adds icon to detailObjects for cleanup', () => {
      const desktop = desktopDetailBranch();
      expect(desktop).toContain('this.detailObjects.push(illusIcon)');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge cases & code quality
// ─────────────────────────────────────────────────────────────────────────────

describe('CodexScene — icon edge cases & code quality (TASK-101)', () => {

  it('does not contain TODO/FIXME/HACK/STUB in icon-related code', () => {
    const tabs = createTabsBody();
    const tile = buildEntryTileBody();
    const detail = showDetailBody();
    const combined = tabs + tile + detail;
    expect(combined).not.toMatch(/\/\/\s*(TODO|FIXME|HACK|STUB)/i);
  });

  it('does not use `any` type in icon-related code', () => {
    const tabs = createTabsBody();
    const tile = buildEntryTileBody();
    expect(tabs).not.toMatch(/:\s*any\b/);
    expect(tile).not.toMatch(/:\s*any\b/);
  });

  it('icon sizes are consistent: 28 list, 48 mobile detail, 56 desktop detail', () => {
    const tile = buildEntryTileBody();
    const mobile = mobileDetailBranch();
    const desktop = desktopDetailBranch();
    expect(tile).toContain('tileSize = 28');
    expect(mobile).toContain('illusSize = 48');
    expect(desktop).toContain('illusSize = 56');
  });

  it('all icon images use setDisplaySize (not setScale) for consistent rendering', () => {
    // setDisplaySize is preferred over setScale for pixel-exact control
    const scene = codexSceneRaw;
    const iconImages = scene.match(/add\.image\([^)]+\)\s*\n?\s*\.setDisplaySize/g) || [];
    expect(iconImages.length).toBeGreaterThanOrEqual(3); // tabs, mobile detail, desktop detail
  });
});
