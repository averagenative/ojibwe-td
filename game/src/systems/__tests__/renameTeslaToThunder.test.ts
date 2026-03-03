/**
 * TASK-094: Rename Tesla Tower → Thunder Tower
 *
 * Verifies:
 *  1. Display name is "Thunder" everywhere in-game
 *  2. Internal key remains "tesla" for backward compatibility
 *  3. All user-facing offer/commander/enhancement descriptions say "Thunder"
 *  4. UI strings (wave banner, air alert, inventory filter) updated
 *  5. No user-visible string anywhere contains the word "Tesla"
 */
import { describe, it, expect } from 'vitest';

// ── Data imports ─────────────────────────────────────────────────────────────
import { TESLA_DEF, ALL_TOWER_DEFS } from '../../data/towerDefs';
import { ALL_OFFERS } from '../../data/offerDefs';
import { ALL_ENHANCEMENTS } from '../../data/enhancementDefs';
import { ALL_COMMANDERS } from '../../data/commanderDefs';

// ── Raw source imports for structural assertions ─────────────────────────────
import waveBannerSrc    from '../../ui/WaveBanner.ts?raw';
import gameSceneSrc     from '../../scenes/GameScene.ts?raw';
import inventorySceneSrc from '../../scenes/InventoryScene.ts?raw';

// ═════════════════════════════════════════════════════════════════════════════
// 1. TowerDef name field
// ═════════════════════════════════════════════════════════════════════════════

describe('TESLA_DEF display name', () => {
  it('name is "Thunder"', () => {
    expect(TESLA_DEF.name).toBe('Thunder');
  });

  it('internal key remains "tesla" for backward compatibility', () => {
    expect(TESLA_DEF.key).toBe('tesla');
  });

  it('is present in ALL_TOWER_DEFS', () => {
    const found = ALL_TOWER_DEFS.find(d => d.key === 'tesla');
    expect(found).toBeDefined();
    expect(found!.name).toBe('Thunder');
  });

  it('description does not mention "Tesla"', () => {
    expect(TESLA_DEF.description).not.toMatch(/Tesla/i);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. Offer descriptions
// ═════════════════════════════════════════════════════════════════════════════

describe('Offer descriptions — no "Tesla"', () => {
  const THUNDER_OFFERS = [
    'static-field',
    'grounded',
    'lightning-rod',
    'overcharge',
    'voltaic-slime',
    'thunder-quake',
  ];

  for (const id of THUNDER_OFFERS) {
    it(`offer "${id}" description says "Thunder" not "Tesla"`, () => {
      const offer = ALL_OFFERS.find(o => o.id === id);
      expect(offer).toBeDefined();
      expect(offer!.description).toMatch(/Thunder/);
      expect(offer!.description).not.toMatch(/Tesla/i);
    });
  }

  it('no offer description anywhere mentions "Tesla"', () => {
    for (const offer of ALL_OFFERS) {
      expect(offer.description).not.toMatch(
        /\bTesla\b/i,
      );
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. Enhancement descriptions
// ═════════════════════════════════════════════════════════════════════════════

describe('Enhancement descriptions — no "Tesla"', () => {
  it('Thunder Focus says "Thunder" not "Tesla"', () => {
    const enh = ALL_ENHANCEMENTS.find(e => e.id === 'enh-thunder-focus');
    expect(enh).toBeDefined();
    expect(enh!.description).toMatch(/Thunder/);
    expect(enh!.description).not.toMatch(/Tesla/i);
  });

  it('no enhancement description mentions "Tesla"', () => {
    for (const enh of ALL_ENHANCEMENTS) {
      expect(enh.description).not.toMatch(/\bTesla\b/i);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. Commander descriptions
// ═════════════════════════════════════════════════════════════════════════════

describe('Commander descriptions — no "Tesla"', () => {
  const animikiikaa = ALL_COMMANDERS.find(c => c.id === 'animikiikaa');

  it('Animikiikaa aura description says "Thunder"', () => {
    expect(animikiikaa).toBeDefined();
    expect(animikiikaa!.aura.description).toMatch(/Thunder/);
    expect(animikiikaa!.aura.description).not.toMatch(/Tesla/i);
  });

  it('Animikiikaa ability description says "Thunder"', () => {
    expect(animikiikaa!.ability.description).toMatch(/Thunder/);
    expect(animikiikaa!.ability.description).not.toMatch(/Tesla/i);
  });

  it('no commander has "Tesla" in any user-visible text', () => {
    for (const cmd of ALL_COMMANDERS) {
      expect(cmd.aura.description).not.toMatch(/\bTesla\b/i);
      expect(cmd.ability.description).not.toMatch(/\bTesla\b/i);
      if (cmd.lore) expect(cmd.lore).not.toMatch(/\bTesla\b/i);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. WaveBanner — structural
// ═════════════════════════════════════════════════════════════════════════════

describe('WaveBanner UI strings', () => {
  it('air hint says "Thunder & Frost effective"', () => {
    expect(waveBannerSrc).toContain("'Thunder & Frost effective'");
  });

  it('first-air-wave sub-line says "Thunder & Frost only!"', () => {
    expect(waveBannerSrc).toContain('Thunder & Frost only!');
  });

  it('does not contain "Tesla" in any string literal', () => {
    // Match 'Tesla' or "Tesla" (inside string literals)
    expect(waveBannerSrc).not.toMatch(/['"].*Tesla.*['"]/i);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. GameScene air wave alert — structural
// ═════════════════════════════════════════════════════════════════════════════

describe('GameScene air wave alert', () => {
  it('says "Deploy Thunder/Frost!"', () => {
    expect(gameSceneSrc).toContain('Deploy Thunder/Frost!');
  });

  it('does not say "Deploy Tesla/Frost!"', () => {
    expect(gameSceneSrc).not.toContain('Deploy Tesla/Frost!');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. InventoryScene filter label — structural
// ═════════════════════════════════════════════════════════════════════════════

describe('InventoryScene filter label', () => {
  it('filter label is "Thunder" with towerKey "tesla"', () => {
    // Matches: { label: 'Thunder', ... towerKey: 'tesla' }
    expect(inventorySceneSrc).toMatch(/label:\s*'Thunder'/);
    expect(inventorySceneSrc).not.toMatch(/label:\s*'Tesla'/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. Exhaustive guard — no user-visible "Tesla" in data defs
// ═════════════════════════════════════════════════════════════════════════════

describe('exhaustive: no user-visible "Tesla" in any tower def', () => {
  it('no tower name is "Tesla"', () => {
    for (const def of ALL_TOWER_DEFS) {
      expect(def.name).not.toBe('Tesla');
    }
  });
});
