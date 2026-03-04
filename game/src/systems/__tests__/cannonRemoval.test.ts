/**
 * TASK-161 — Remove Cannon References
 *
 * Validates that all cannon tower references have been remapped to rock-hurler,
 * legacy save migration is preserved, and no dead cannon code paths remain.
 */
import { describe, it, expect } from 'vitest';

// ── Source under test (imported as raw text for structural assertions) ─────────
import offerMgrRaw from '../OfferManager.ts?raw';
import achieveMgrRaw from '../AchievementManager.ts?raw';
import audioMgrRaw from '../AudioManager.ts?raw';
import sessionMgrRaw from '../SessionManager.ts?raw';
import bootSceneRaw from '../../scenes/BootScene.ts?raw';

// ── Runtime imports ───────────────────────────────────────────────────────────
import { ALL_OFFERS } from '../../data/offerDefs';
import { OfferManager, TOWER_TARGET_DOMAIN } from '../OfferManager';
import { ALL_GEAR_DEFS } from '../../data/gearDefs';
import { PROJECTILE_VISUAL_CONFIGS } from '../../data/projectileVisualDefs';
import { getTowerAnimDef } from '../../data/towerAnimDefs';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Offer definitions — descriptions reference rock-hurler, not cannon tower
// ═══════════════════════════════════════════════════════════════════════════════
describe('TASK-161 — offer descriptions remapped to rock-hurler', () => {
  const glassCannon = ALL_OFFERS.find(o => o.id === 'glass-cannon')!;
  const siegeMode = ALL_OFFERS.find(o => o.id === 'siege-mode')!;
  const cryoCannon = ALL_OFFERS.find(o => o.id === 'cryo-cannon')!;

  it('glass-cannon description mentions Rock Hurler, not Cannon tower', () => {
    expect(glassCannon.description).toMatch(/Rock Hurler/i);
    expect(glassCannon.description).not.toMatch(/Cannon tower/i);
  });

  it('siege-mode description mentions Rock Hurler, not Cannon tower', () => {
    expect(siegeMode.description).toMatch(/Rock Hurler/i);
    expect(siegeMode.description).not.toMatch(/Cannon tower/i);
  });

  it('siege-mode synergyRequires uses rock-hurler, not cannon', () => {
    expect(siegeMode.synergyRequires).toContain('rock-hurler');
    expect(siegeMode.synergyRequires).not.toContain('cannon');
  });

  it('cryo-cannon still targets rock-hurler (already correct)', () => {
    expect(cryoCannon.synergyRequires).toContain('rock-hurler');
    expect(cryoCannon.synergyRequires).not.toContain('cannon');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. OfferManager methods check for rock-hurler
// ═══════════════════════════════════════════════════════════════════════════════
describe('TASK-161 — OfferManager methods target rock-hurler', () => {
  it('getGlassCannonDamageMult checks rock-hurler', () => {
    const om = new OfferManager();
    om.applyOffer('glass-cannon');
    expect(om.getGlassCannonDamageMult('rock-hurler')).toBe(2.0);
    expect(om.getGlassCannonDamageMult('cannon')).toBe(1.0);
  });

  it('getGlassCannonRangeMult checks rock-hurler', () => {
    const om = new OfferManager();
    om.applyOffer('glass-cannon');
    expect(om.getGlassCannonRangeMult('rock-hurler')).toBe(0.5);
    expect(om.getGlassCannonRangeMult('cannon')).toBe(1.0);
  });

  it('getSiegeModeModifiers checks rock-hurler', () => {
    const om = new OfferManager();
    om.applyOffer('siege-mode');
    const active = om.getSiegeModeModifiers('rock-hurler', true);
    expect(active.damageMult).toBe(3.0);
    expect(active.intervalMult).toBe(2.0);

    const dead = om.getSiegeModeModifiers('cannon', true);
    expect(dead.damageMult).toBe(1.0);
    expect(dead.intervalMult).toBe(1.0);
  });

  it('TOWER_TARGET_DOMAIN has no cannon entry', () => {
    expect(TOWER_TARGET_DOMAIN).not.toHaveProperty('cannon');
    expect(TOWER_TARGET_DOMAIN).toHaveProperty('rock-hurler');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Gear defs — cannon-chill → hurler-chill
// ═══════════════════════════════════════════════════════════════════════════════
describe('TASK-161 — gear special effect remapped', () => {
  it('no gear uses cannon-chill effect id', () => {
    const cannonChillGear = ALL_GEAR_DEFS.filter(
      g => g.specialEffect?.id === 'cannon-chill',
    );
    expect(cannonChillGear).toHaveLength(0);
  });

  it('frozen lakebed barrel uses hurler-chill effect id', () => {
    const barrel = ALL_GEAR_DEFS.find(g => g.id === 'barrel-frozen-lakebed')!;
    expect(barrel.specialEffect!.id).toBe('hurler-chill');
    expect(barrel.specialEffect!.description).toMatch(/Rock Hurler/i);
    expect(barrel.specialEffect!.description).not.toMatch(/Cannon/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. AchievementManager — cannon removed from tower type arrays
// ═══════════════════════════════════════════════════════════════════════════════
describe('TASK-161 — AchievementManager tower list updated', () => {
  it('allTowerTypes array in source does not include cannon', () => {
    expect(achieveMgrRaw).toContain("'rock-hurler'");
    // The allTowerTypes array should have 7 entries, not 8
    expect(achieveMgrRaw).toMatch(/total >= 7\) this\._unlock\('max-upgrade-every-type'\)/);
  });

  it('onTowerPathMaxed source comment says 7 tower types', () => {
    expect(achieveMgrRaw).toMatch(/\/\/ 7 tower types/);
    expect(achieveMgrRaw).not.toMatch(/\/\/ 8 tower types/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. AudioManager — _sfxCannon renamed to _sfxRockHurler
// ═══════════════════════════════════════════════════════════════════════════════
describe('TASK-161 — AudioManager cannon → rock-hurler', () => {
  it('_sfxRockHurler method exists in source', () => {
    expect(audioMgrRaw).toContain('_sfxRockHurler');
  });

  it('_sfxCannon method no longer exists', () => {
    expect(audioMgrRaw).not.toContain('_sfxCannon');
  });

  it('playProjectileFired rock-hurler case uses sfx-rock-hurler buffer key', () => {
    expect(audioMgrRaw).toContain("'sfx-rock-hurler'");
    expect(audioMgrRaw).not.toContain("'sfx-cannon'");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. SessionManager — cannon→rock-hurler migration PRESERVED
// ═══════════════════════════════════════════════════════════════════════════════
describe('TASK-161 — SessionManager cannon migration preserved', () => {
  it('still checks for cannon key in migration code', () => {
    expect(sessionMgrRaw).toContain("t.key === 'cannon'");
  });

  it('migration comment mentions cannon→rock-hurler', () => {
    expect(sessionMgrRaw).toMatch(/cannon.*rock-hurler/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. BootScene — sfx-cannon preload removed
// ═══════════════════════════════════════════════════════════════════════════════
describe('TASK-161 — BootScene preload keys updated', () => {
  it('commented preload uses sfx-rock-hurler, not sfx-cannon', () => {
    expect(bootSceneRaw).toContain('sfx-rock-hurler');
    expect(bootSceneRaw).not.toContain('sfx-cannon');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. No dead code paths checking towerKey === 'cannon' in OfferManager
// ═══════════════════════════════════════════════════════════════════════════════
describe('TASK-161 — no dead cannon code paths in OfferManager', () => {
  it('OfferManager source has no towerKey comparisons to cannon', () => {
    // Should not have === 'cannon' or !== 'cannon' in logic (method body)
    // Allow the word "cannon" only in offer IDs like 'glass-cannon' or 'cryo-cannon'
    const lines = offerMgrRaw.split('\n');
    const cannonComparisonLines = lines.filter(
      l => /=== ['"]cannon['"]/.test(l) || /!== ['"]cannon['"]/.test(l),
    );
    expect(cannonComparisonLines).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. Legacy defs (projectile, anim) preserved with @deprecated
// ═══════════════════════════════════════════════════════════════════════════════
describe('TASK-161 — legacy cannon defs kept with @deprecated tag', () => {
  it('projectile visual configs still has cannon entry (legacy)', () => {
    expect(PROJECTILE_VISUAL_CONFIGS).toHaveProperty('cannon');
    expect(PROJECTILE_VISUAL_CONFIGS.cannon.shape).toBe('none');
  });

  it('tower anim defs still has cannon entry (legacy)', () => {
    const def = getTowerAnimDef('cannon');
    expect(def.idleType).toBe('sweep');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. Edge cases
// ═══════════════════════════════════════════════════════════════════════════════
describe('TASK-161 — edge cases', () => {
  it('glass-cannon + siege-mode can both be active on same rock-hurler', () => {
    const om = new OfferManager();
    om.applyOffer('glass-cannon');
    om.applyOffer('siege-mode');
    expect(om.getGlassCannonDamageMult('rock-hurler')).toBe(2.0);
    const siege = om.getSiegeModeModifiers('rock-hurler', true);
    expect(siege.damageMult).toBe(3.0);
  });

  it('glass-cannon returns 1.0 for unknown tower key', () => {
    const om = new OfferManager();
    om.applyOffer('glass-cannon');
    expect(om.getGlassCannonDamageMult('nonexistent')).toBe(1.0);
    expect(om.getGlassCannonRangeMult('nonexistent')).toBe(1.0);
  });

  it('siege-mode returns no-op for cannon key (dead tower)', () => {
    const om = new OfferManager();
    om.applyOffer('siege-mode');
    const r = om.getSiegeModeModifiers('cannon', true);
    expect(r.intervalMult).toBe(1.0);
    expect(r.damageMult).toBe(1.0);
  });
});
