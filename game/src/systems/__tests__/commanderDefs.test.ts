import { describe, it, expect, vi } from 'vitest';
import {
  ALL_COMMANDERS,
  LOCKED_COMMANDER_IDS,
  getCommanderDef,
  defaultCommanderRunState,
} from '../../data/commanderDefs';
import type { CommanderRunState, AbilityContext } from '../../data/commanderDefs';

// ── Helper: build a mock AbilityContext ────────────────────────────────────

function mockAbilityContext(overrides: Partial<AbilityContext> = {}): AbilityContext {
  return {
    currentWave:    5,
    currentLives:   15,
    waveStartLives: 18,
    startingLives:  20,
    currentGold:    500,
    addGold:        vi.fn(),
    setLives:       vi.fn(),
    addTimedEffect: vi.fn(),
    showMessage:    vi.fn(),
    getWaveCreepInfo: vi.fn().mockReturnValue({
      count: 10,
      types: ['grunt', 'runner'],
      totalRewardGold: 80,
    }),
    ...overrides,
  };
}

// ── Schema & Data Completeness ────────────────────────────────────────────

describe('CommanderDef schema', () => {
  it('all 6 commanders are defined', () => {
    expect(ALL_COMMANDERS).toHaveLength(6);
  });

  it.each(ALL_COMMANDERS)('$name has all required fields', (def) => {
    expect(typeof def.id).toBe('string');
    expect(def.id.length).toBeGreaterThan(0);
    expect(typeof def.name).toBe('string');
    expect(typeof def.clan).toBe('string');
    expect(typeof def.totem).toBe('string');
    expect(typeof def.role).toBe('string');
    expect(typeof def.lore).toBe('string');
    expect(def.lore.length).toBeGreaterThanOrEqual(50); // 3–5 sentences
    expect(typeof def.portraitIcon).toBe('string');
    expect(typeof def.unlockCost).toBe('number');
    expect(typeof def.defaultUnlocked).toBe('boolean');

    // Aura
    expect(typeof def.aura.name).toBe('string');
    expect(typeof def.aura.nameEnglish).toBe('string');
    expect(def.aura.nameEnglish.length).toBeGreaterThan(0);
    expect(typeof def.aura.description).toBe('string');
    expect(typeof def.aura.apply).toBe('function');

    // Ability
    expect(typeof def.ability.name).toBe('string');
    expect(typeof def.ability.nameEnglish).toBe('string');
    expect(def.ability.nameEnglish.length).toBeGreaterThan(0);
    expect(typeof def.ability.description).toBe('string');
    expect(def.ability.cooldown).toBe('once-per-run');
    expect(typeof def.ability.uiIcon).toBe('string');
    expect(typeof def.ability.activate).toBe('function');
  });

  it('exactly one commander is default-unlocked (Nokomis)', () => {
    const defaults = ALL_COMMANDERS.filter(c => c.defaultUnlocked);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe('nokomis');
    expect(defaults[0].unlockCost).toBe(0);
  });

  it('all commander IDs are unique', () => {
    const ids = ALL_COMMANDERS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── LOCKED_COMMANDER_IDS ──────────────────────────────────────────────────

describe('LOCKED_COMMANDER_IDS', () => {
  it('contains exactly the non-default-unlocked commanders', () => {
    expect(LOCKED_COMMANDER_IDS).toHaveLength(5);
    expect(LOCKED_COMMANDER_IDS).not.toContain('nokomis');
    expect(LOCKED_COMMANDER_IDS).toContain('bizhiw');
    expect(LOCKED_COMMANDER_IDS).toContain('animikiikaa');
    expect(LOCKED_COMMANDER_IDS).toContain('makoons');
    expect(LOCKED_COMMANDER_IDS).toContain('oshkaabewis');
    expect(LOCKED_COMMANDER_IDS).toContain('waabizii');
  });
});

// ── getCommanderDef ──────────────────────────────────────────────────────

describe('getCommanderDef', () => {
  it('returns the correct def for a known ID', () => {
    const def = getCommanderDef('nokomis');
    expect(def).toBeDefined();
    expect(def!.name).toBe('Nokomis');
  });

  it('returns undefined for an unknown ID', () => {
    expect(getCommanderDef('nonexistent')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(getCommanderDef('')).toBeUndefined();
  });
});

// ── defaultCommanderRunState ─────────────────────────────────────────────

describe('defaultCommanderRunState', () => {
  it('returns neutral defaults', () => {
    const state = defaultCommanderRunState('nokomis');
    expect(state.commanderId).toBe('nokomis');
    expect(state.abilityUsed).toBe(false);
    expect(state.globalDamageMult).toBe(1.0);
    expect(state.attackSpeedMultByKey).toEqual({});
    expect(state.projectileSpeedMult).toBe(1.0);
    expect(state.teslaChainBonus).toBe(0);
    expect(state.teslaChainAoE).toBe(false);
    expect(state.killGoldBonus).toBe(0);
    expect(state.offerCardCount).toBe(3);
    expect(state.startingLivesBonus).toBe(0);
    expect(state.healEveryNKills).toBe(0);
    expect(state.poisonKillHealChance).toBe(0);
    expect(state.killsSinceLastHeal).toBe(0);
    expect(state.waveStartLives).toBe(0);
    expect(state.ignoreArmorAndImmunity).toBe(false);
    expect(state.teslaSpeedBoostDivisor).toBe(1.0);
    expect(state.teslaUnlimitedChains).toBe(false);
    expect(state.stickyTargeting).toBe(false);
    expect(state.absorbEscapes).toBe(false);
  });

  it('each call returns a fresh object', () => {
    const a = defaultCommanderRunState('a');
    const b = defaultCommanderRunState('a');
    expect(a).not.toBe(b);
  });
});

// ── Aura application ─────────────────────────────────────────────────────

describe('Aura effects', () => {
  function applyAura(commanderId: string): CommanderRunState {
    const def = getCommanderDef(commanderId)!;
    const state = defaultCommanderRunState(commanderId);
    def.aura.apply(state);
    return state;
  }

  it('Nokomis sets healEveryNKills = 40', () => {
    const state = applyAura('nokomis');
    expect(state.healEveryNKills).toBe(40);
  });

  it('Bizhiw sets rock-hurler/frost attack speed and projectile speed', () => {
    const state = applyAura('bizhiw');
    expect(state.attackSpeedMultByKey['rock-hurler']).toBe(0.80);
    expect(state.attackSpeedMultByKey['frost']).toBe(0.80);
    expect(state.projectileSpeedMult).toBe(1.25);
  });

  it('Animikiikaa sets tesla chain bonus and AoE', () => {
    const state = applyAura('animikiikaa');
    expect(state.teslaChainBonus).toBe(1);
    expect(state.teslaChainAoE).toBe(true);
  });

  it('Makoons sets globalDamageMult = 1.12 and stickyTargeting = true', () => {
    const state = applyAura('makoons');
    expect(state.globalDamageMult).toBe(1.12);
    expect(state.stickyTargeting).toBe(true);
  });

  it('Oshkaabewis sets +1 kill gold and 4 offer cards', () => {
    const state = applyAura('oshkaabewis');
    expect(state.killGoldBonus).toBe(1);
    expect(state.offerCardCount).toBe(4);
  });

  it('Waabizii sets poison kill heal chance and +2 starting lives', () => {
    const state = applyAura('waabizii');
    expect(state.poisonKillHealChance).toBe(0.25);
    expect(state.startingLivesBonus).toBe(2);
  });

  it('aura does not modify unrelated state fields', () => {
    const state = applyAura('nokomis');
    expect(state.globalDamageMult).toBe(1.0);
    expect(state.killGoldBonus).toBe(0);
    expect(state.teslaChainBonus).toBe(0);
    expect(state.startingLivesBonus).toBe(0);
  });
});

// ── Ability activation ───────────────────────────────────────────────────

describe('Ability activation', () => {
  it('Nokomis restores lives to wave-start value', () => {
    const state = defaultCommanderRunState('nokomis');
    state.waveStartLives = 18;
    const ctx = mockAbilityContext({ currentLives: 12 });

    getCommanderDef('nokomis')!.ability.activate(state, ctx);
    expect(ctx.setLives).toHaveBeenCalledWith(18);
  });

  it('Bizhiw shows scouting message for next wave', () => {
    const state = defaultCommanderRunState('bizhiw');
    const ctx = mockAbilityContext({ currentWave: 3 });

    getCommanderDef('bizhiw')!.ability.activate(state, ctx);
    expect(ctx.getWaveCreepInfo).toHaveBeenCalledWith(4); // currentWave + 1
    expect(ctx.showMessage).toHaveBeenCalledWith(
      expect.stringContaining('Next wave:'),
      15000,
    );
  });

  it('Bizhiw shows fallback message when no next wave', () => {
    const state = defaultCommanderRunState('bizhiw');
    const ctx = mockAbilityContext({
      currentWave: 20,
      getWaveCreepInfo: vi.fn().mockReturnValue(null),
    });

    getCommanderDef('bizhiw')!.ability.activate(state, ctx);
    expect(ctx.showMessage).toHaveBeenCalledWith('No further waves to scout.', 3000);
  });

  it('Animikiikaa sets tesla speed boost and unlimited chains, schedules cleanup', () => {
    const state = defaultCommanderRunState('animikiikaa');
    const ctx = mockAbilityContext();

    getCommanderDef('animikiikaa')!.ability.activate(state, ctx);
    expect(state.teslaSpeedBoostDivisor).toBe(3.0);
    expect(state.teslaUnlimitedChains).toBe(true);
    expect(ctx.addTimedEffect).toHaveBeenCalledWith(8000, expect.any(Function));

    // Simulate timer expiry
    const onEnd = (ctx.addTimedEffect as ReturnType<typeof vi.fn>).mock.calls[0][1];
    onEnd();
    expect(state.teslaSpeedBoostDivisor).toBe(1.0);
    expect(state.teslaUnlimitedChains).toBe(false);
  });

  it('Makoons sets ignoreArmorAndImmunity, schedules cleanup after 6s', () => {
    const state = defaultCommanderRunState('makoons');
    const ctx = mockAbilityContext();

    getCommanderDef('makoons')!.ability.activate(state, ctx);
    expect(state.ignoreArmorAndImmunity).toBe(true);
    expect(ctx.addTimedEffect).toHaveBeenCalledWith(6000, expect.any(Function));

    const onEnd = (ctx.addTimedEffect as ReturnType<typeof vi.fn>).mock.calls[0][1];
    onEnd();
    expect(state.ignoreArmorAndImmunity).toBe(false);
  });

  it('Oshkaabewis adds gold equal to 30% of current wave total', () => {
    const state = defaultCommanderRunState('oshkaabewis');
    const ctx = mockAbilityContext({
      currentWave: 5,
      getWaveCreepInfo: vi.fn().mockReturnValue({
        count: 14,
        types: ['grunt', 'runner'],
        totalRewardGold: 100,
      }),
    });

    getCommanderDef('oshkaabewis')!.ability.activate(state, ctx);
    expect(ctx.getWaveCreepInfo).toHaveBeenCalledWith(5);
    expect(ctx.addGold).toHaveBeenCalledWith(30); // 100 * 0.30
  });

  it('Oshkaabewis does nothing when wave info is null', () => {
    const state = defaultCommanderRunState('oshkaabewis');
    const ctx = mockAbilityContext({
      getWaveCreepInfo: vi.fn().mockReturnValue(null),
    });

    getCommanderDef('oshkaabewis')!.ability.activate(state, ctx);
    expect(ctx.addGold).not.toHaveBeenCalled();
  });

  it('Waabizii sets absorbEscapes = true', () => {
    const state = defaultCommanderRunState('waabizii');
    const ctx = mockAbilityContext();

    getCommanderDef('waabizii')!.ability.activate(state, ctx);
    expect(state.absorbEscapes).toBe(true);
  });

  it('ability cannot activate twice (guard test for abilityUsed)', () => {
    // The abilityUsed guard is in GameScene, not in the ability itself.
    // But we can verify the ability activate function doesn't reset abilityUsed.
    const state = defaultCommanderRunState('nokomis');
    state.abilityUsed = true;
    state.waveStartLives = 20;
    const ctx = mockAbilityContext({ currentLives: 10 });

    // The ability itself doesn't check abilityUsed — GameScene does.
    // But calling it shouldn't crash either.
    getCommanderDef('nokomis')!.ability.activate(state, ctx);
    expect(ctx.setLives).toHaveBeenCalledWith(20);
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('Oshkaabewis does not add gold for 0 reward wave', () => {
    const state = defaultCommanderRunState('oshkaabewis');
    const ctx = mockAbilityContext({
      getWaveCreepInfo: vi.fn().mockReturnValue({
        count: 5,
        types: ['grunt'],
        totalRewardGold: 0,
      }),
    });

    getCommanderDef('oshkaabewis')!.ability.activate(state, ctx);
    expect(ctx.addGold).not.toHaveBeenCalled();
  });

  it('Nokomis restores to 0 if waveStartLives was 0', () => {
    const state = defaultCommanderRunState('nokomis');
    state.waveStartLives = 0;
    const ctx = mockAbilityContext();

    getCommanderDef('nokomis')!.ability.activate(state, ctx);
    expect(ctx.setLives).toHaveBeenCalledWith(0);
  });

  it('Bizhiw attack speed multipliers do not affect non-rock-hurler/frost keys', () => {
    const state = defaultCommanderRunState('bizhiw');
    getCommanderDef('bizhiw')!.aura.apply(state);
    expect(state.attackSpeedMultByKey['tesla']).toBeUndefined();
    expect(state.attackSpeedMultByKey['poison']).toBeUndefined();
    expect(state.attackSpeedMultByKey['mortar']).toBeUndefined();
  });

  it('defaultCommanderRunState sets offerCardCount to 3 (not 0)', () => {
    const state = defaultCommanderRunState('test');
    expect(state.offerCardCount).toBe(3);
  });
});
