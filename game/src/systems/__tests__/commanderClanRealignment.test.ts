import { describe, it, expect } from 'vitest';
import { ALL_COMMANDERS, getCommanderDef, defaultCommanderRunState } from '../../data/commanderDefs';
import type { CommanderRunState } from '../../data/commanderDefs';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Clan assignments ────────────────────────────────────────────────────────

describe('Commander clan realignment', () => {
  const EXPECTED_CLANS: Record<string, string> = {
    nokomis:     'Crane Clan',
    bizhiw:      'Marten Clan',
    animikiikaa: 'Bird Clan',
    makoons:     'Bear Clan',
    oshkaabewis: 'Deer Clan',
    waabizii:    'Loon Clan',
  };

  it.each(Object.entries(EXPECTED_CLANS))(
    '%s belongs to %s',
    (id, expectedClan) => {
      const def = getCommanderDef(id);
      expect(def).toBeDefined();
      expect(def!.clan).toBe(expectedClan);
    },
  );

  it('all 6 commanders have distinct clans', () => {
    const clans = ALL_COMMANDERS.map(c => c.clan);
    expect(new Set(clans).size).toBe(6);
  });

  it('no commander uses the retired "Eagle Clan" name', () => {
    for (const c of ALL_COMMANDERS) {
      expect(c.clan).not.toBe('Eagle Clan');
    }
  });

  it('no commander uses the retired "Fish Clan" name', () => {
    for (const c of ALL_COMMANDERS) {
      expect(c.clan).not.toBe('Fish Clan');
    }
  });
});

// ── Totem updates ───────────────────────────────────────────────────────────

describe('Commander totems', () => {
  const EXPECTED_TOTEMS: Record<string, string> = {
    nokomis:     'Turtle',
    bizhiw:      'Lynx',
    animikiikaa: 'Thunderbird',
    makoons:     'Bear',
    oshkaabewis: 'Deer',
    waabizii:    'Swan',
  };

  it.each(Object.entries(EXPECTED_TOTEMS))(
    '%s carries the %s totem',
    (id, expectedTotem) => {
      const def = getCommanderDef(id);
      expect(def!.totem).toBe(expectedTotem);
    },
  );
});

// ── Aura name thematic alignment ────────────────────────────────────────────

describe('Aura names after realignment', () => {
  it('Bizhiw aura is "Giiyosewin" (The Hunt) — fits Marten Clan hunter role', () => {
    const def = getCommanderDef('bizhiw')!;
    expect(def.aura.name).toBe('Giiyosewin');
    expect(def.aura.nameEnglish).toBe('The Hunt');
  });

  it('Oshkaabewis aura is "Adaawewin" (The Trade) — fits Deer Clan diplomacy/trade', () => {
    const def = getCommanderDef('oshkaabewis')!;
    expect(def.aura.name).toBe('Adaawewin');
    expect(def.aura.nameEnglish).toBe('The Trade');
  });

  it('Waabizii aura unchanged — "Zaagi\'idiwin" fits Loon Clan caretaking', () => {
    const def = getCommanderDef('waabizii')!;
    expect(def.aura.name).toBe("Zaagi'idiwin");
    expect(def.aura.nameEnglish).toBe('Unconditional Love');
  });

  it('Nokomis aura unchanged — "Gitigaan" (Garden)', () => {
    const def = getCommanderDef('nokomis')!;
    expect(def.aura.name).toBe('Gitigaan');
    expect(def.aura.nameEnglish).toBe('Garden');
  });

  it('Animikiikaa aura unchanged — "Animiki-bimaadiziwin" (Thunder Life)', () => {
    const def = getCommanderDef('animikiikaa')!;
    expect(def.aura.name).toBe('Animiki-bimaadiziwin');
    expect(def.aura.nameEnglish).toBe('Thunder Life');
  });

  it("Makoons aura unchanged — \"Makwa-zoongide'e\" (Bear Courage)", () => {
    const def = getCommanderDef('makoons')!;
    expect(def.aura.name).toBe("Makwa-zoongide'e");
    expect(def.aura.nameEnglish).toBe('Bear Courage');
  });
});

// ── Portrait icon keys ──────────────────────────────────────────────────────

describe('Portrait icon keys use portrait- prefix', () => {
  it.each(ALL_COMMANDERS.map(c => [c.id, c.portraitIcon]))(
    '%s has portraitIcon "%s"',
    (id, icon) => {
      expect(icon).toBe(`portrait-${id}`);
    },
  );

  it('no commander uses the old "commander-" prefix', () => {
    for (const c of ALL_COMMANDERS) {
      expect(c.portraitIcon).not.toMatch(/^commander-/);
    }
  });
});

// ── Codex consistency ───────────────────────────────────────────────────────

describe('Codex entries match new clans', () => {
  const codexSrc = readFileSync(
    resolve(__dirname, '../../data/codexDefs.ts'),
    'utf-8',
  );

  it('Nokomis codex says "Crane Clan"', () => {
    expect(codexSrc).toContain('Nokomis of the Crane Clan');
  });

  it('Bizhiw codex says "Marten Clan"', () => {
    expect(codexSrc).toContain('Bizhiw of the Marten Clan');
  });

  it('Animikiikaa codex says "Bird Clan"', () => {
    expect(codexSrc).toContain('Animikiikaa of the Bird Clan');
  });

  it('Makoons codex says "Bear Clan"', () => {
    expect(codexSrc).toContain('Makoons of the Bear Clan');
  });

  it('Oshkaabewis codex says "Deer Clan"', () => {
    expect(codexSrc).toContain('Oshkaabewis of the Deer Clan');
  });

  it('Waabizii codex says "Loon Clan"', () => {
    expect(codexSrc).toContain('Waabizii of the Loon Clan');
  });

  it('Animikiikaa codex references "thunderbird" totem (not eagle)', () => {
    expect(codexSrc).toContain('carries the thunderbird totem');
    expect(codexSrc).not.toContain('carries the eagle totem');
  });

  it('no codex entry references retired clan names', () => {
    // Only check commander codex lines for old clan names
    expect(codexSrc).not.toMatch(/of the Eagle Clan/);
    expect(codexSrc).not.toMatch(/of the Fish Clan/);
  });
});

// ── No mechanical changes ───────────────────────────────────────────────────

describe('Mechanical effects unchanged after realignment', () => {
  it('Bizhiw aura still sets rock-hurler/frost speed +20%, projectile +25%', () => {
    const def = getCommanderDef('bizhiw')!;
    const state: CommanderRunState = defaultCommanderRunState('bizhiw');
    state.attackSpeedMultByKey = {} as Record<string, number>;
    state.projectileSpeedMult = 1.0;
    def.aura.apply(state);
    expect(state.attackSpeedMultByKey['rock-hurler']).toBe(0.80);
    expect(state.attackSpeedMultByKey['frost']).toBe(0.80);
    expect(state.projectileSpeedMult).toBe(1.25);
  });

  it('Oshkaabewis aura still sets +1 kill gold and 4 offer cards', () => {
    const def = getCommanderDef('oshkaabewis')!;
    const state: CommanderRunState = defaultCommanderRunState('oshkaabewis');
    def.aura.apply(state);
    expect(state.killGoldBonus).toBe(1);
    expect(state.offerCardCount).toBe(4);
  });

  it('all commander roles are unchanged', () => {
    const expectedRoles: Record<string, string> = {
      nokomis: 'Sustain',
      bizhiw: 'Precision',
      animikiikaa: 'Burst',
      makoons: 'Damage',
      oshkaabewis: 'Economy',
      waabizii: 'Resilience',
    };
    for (const [id, role] of Object.entries(expectedRoles)) {
      expect(getCommanderDef(id)!.role).toBe(role);
    }
  });
});
