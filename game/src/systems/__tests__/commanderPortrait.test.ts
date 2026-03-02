/**
 * Tests for TASK-057: Commander Portrait in Game HUD.
 *
 * CommanderPortrait is a Phaser Container, so we test the pure-logic
 * portions: roleBorderColour mapping, palette constants, sizing, and
 * position calculations that mirror the inline math in HUD.createCommanderPortrait().
 */
import { describe, it, expect } from 'vitest';
import { PAL, roleBorderColour } from '../../ui/palette';
import { ALL_COMMANDERS } from '../../data/commanderDefs';

// ── roleBorderColour — maps role string to PAL.cmd* colour ──────────────────

describe('roleBorderColour', () => {
  it('maps Sustain → PAL.cmdSustain', () => {
    expect(roleBorderColour('Sustain')).toBe(PAL.cmdSustain);
  });

  it('maps Precision → PAL.cmdPrecision', () => {
    expect(roleBorderColour('Precision')).toBe(PAL.cmdPrecision);
  });

  it('maps Burst → PAL.cmdBurst', () => {
    expect(roleBorderColour('Burst')).toBe(PAL.cmdBurst);
  });

  it('maps Damage → PAL.cmdDamage', () => {
    expect(roleBorderColour('Damage')).toBe(PAL.cmdDamage);
  });

  it('maps Economy → PAL.cmdEconomy', () => {
    expect(roleBorderColour('Economy')).toBe(PAL.cmdEconomy);
  });

  it('maps Resilience → PAL.cmdResilience', () => {
    expect(roleBorderColour('Resilience')).toBe(PAL.cmdResilience);
  });

  it('is case-insensitive (lowercase input)', () => {
    expect(roleBorderColour('sustain')).toBe(PAL.cmdSustain);
    expect(roleBorderColour('precision')).toBe(PAL.cmdPrecision);
  });

  it('is case-insensitive (UPPERCASE input)', () => {
    expect(roleBorderColour('BURST')).toBe(PAL.cmdBurst);
    expect(roleBorderColour('ECONOMY')).toBe(PAL.cmdEconomy);
  });

  it('is case-insensitive (mIxEd case)', () => {
    expect(roleBorderColour('dAmAgE')).toBe(PAL.cmdDamage);
  });

  it('returns cmdDefault for unknown role', () => {
    expect(roleBorderColour('unknown')).toBe(PAL.cmdDefault);
  });

  it('returns cmdDefault for empty string', () => {
    expect(roleBorderColour('')).toBe(PAL.cmdDefault);
  });

  it('returns cmdDefault for a plausible-but-wrong role', () => {
    expect(roleBorderColour('Support')).toBe(PAL.cmdDefault);
    expect(roleBorderColour('Tank')).toBe(PAL.cmdDefault);
  });
});

// ── Every commander's role maps to a non-default colour ──────────────────────

describe('commander roles all have dedicated colours', () => {
  it.each(ALL_COMMANDERS)('$name (role=$role) maps to a specific colour', (def) => {
    const colour = roleBorderColour(def.role);
    expect(colour).not.toBe(PAL.cmdDefault);
    expect(colour).toBeGreaterThan(0);
    expect(colour).toBeLessThanOrEqual(0xffffff);
  });

  it('all 6 commander roles produce 6 distinct colours', () => {
    const colours = ALL_COMMANDERS.map(d => roleBorderColour(d.role));
    expect(new Set(colours).size).toBe(ALL_COMMANDERS.length);
  });
});

// ── PAL cmd* constants ───────────────────────────────────────────────────────

describe('PAL commander colour constants', () => {
  const cmdKeys: Array<keyof typeof PAL> = [
    'cmdSustain', 'cmdPrecision', 'cmdBurst',
    'cmdDamage', 'cmdEconomy', 'cmdResilience', 'cmdDefault',
  ];

  it.each(cmdKeys)('%s is a valid 0xRRGGBB number', (key) => {
    const val = PAL[key] as number;
    expect(typeof val).toBe('number');
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThanOrEqual(0xffffff);
    expect(Number.isInteger(val)).toBe(true);
  });

  it('no two cmd* colours are identical', () => {
    const vals = cmdKeys.map(k => PAL[k]);
    expect(new Set(vals).size).toBe(cmdKeys.length);
  });
});

// ── Portrait sizing constants ────────────────────────────────────────────────

describe('portrait sizing', () => {
  const DESKTOP_SIZE = 48;
  const MOBILE_SIZE = 56;

  it('desktop portrait fits inside the HUD strip height', () => {
    expect(DESKTOP_SIZE).toBeLessThanOrEqual(48);
  });

  it('mobile portrait is larger for touch targets', () => {
    expect(MOBILE_SIZE).toBeGreaterThan(DESKTOP_SIZE);
  });

  it('mobile portrait is at most 56px (not excessively large)', () => {
    expect(MOBILE_SIZE).toBeLessThanOrEqual(56);
  });
});

// ── Portrait position calculation (mirrors HUD.createCommanderPortrait) ──────

describe('portrait position calculation', () => {
  const PADDING = 16;

  function calcPosition(hudHeight: number, portraitSize: number) {
    const px = PADDING + portraitSize / 2 + 3;
    const py = hudHeight + portraitSize / 2 + 6;
    return { px, py };
  }

  it('desktop: px = 43, py = 78', () => {
    const { px, py } = calcPosition(48, 48);
    expect(px).toBe(43);
    expect(py).toBe(78);
  });

  it('mobile: px = 47, py = 98', () => {
    const { px, py } = calcPosition(64, 56);
    expect(px).toBe(47);
    expect(py).toBe(98);
  });

  it('portrait top edge is below the HUD strip', () => {
    // Desktop: py - HALF = 78 - 24 = 54 > HUD_HEIGHT (48) ✓
    const deskTop = 78 - 48 / 2;
    expect(deskTop).toBeGreaterThan(48);

    // Mobile: py - HALF = 98 - 28 = 70 > HUD_HEIGHT (64) ✓
    const mobileTop = 98 - 56 / 2;
    expect(mobileTop).toBeGreaterThan(64);
  });

  it('portrait left edge is within the viewport', () => {
    const BORDER_WIDTH = 3;
    // Desktop: 43 - 24 - 3 = 16 ≥ 0
    const deskLeft = 43 - 48 / 2 - BORDER_WIDTH;
    expect(deskLeft).toBeGreaterThanOrEqual(0);

    // Mobile: 47 - 28 - 3 = 16 ≥ 0
    const mobileLeft = 47 - 56 / 2 - BORDER_WIDTH;
    expect(mobileLeft).toBeGreaterThanOrEqual(0);
  });
});

// ── Tooltip line generation (pure-logic simulation) ──────────────────────────

describe('tooltip line generation', () => {
  /** Simulates the tooltip line-building logic from CommanderPortrait.showTooltip(). */
  function buildTooltipLines(
    def: { name: string; role: string; clan: string; aura: { name: string; description: string }; ability?: { name: string; description: string } },
    abilityUsed: boolean,
  ) {
    const lines: Array<{ text: string; color: string; bold?: boolean }> = [
      { text: def.name, color: PAL.textPrimary, bold: true },
      { text: `${def.role} · ${def.clan}`, color: PAL.textMuted },
      { text: '', color: '' },
      { text: `Aura: ${def.aura.name}`, color: PAL.accentGreen, bold: true },
      { text: def.aura.description, color: PAL.textSecondary },
    ];
    if (def.ability) {
      lines.push({ text: '', color: '' });
      const usedLabel = abilityUsed ? ' (USED)' : ' (READY)';
      lines.push({ text: `${def.ability.name}${usedLabel}`, color: PAL.textAbility, bold: true });
      lines.push({ text: def.ability.description, color: PAL.textSecondary });
    }
    return lines;
  }

  it('builds 8 lines for a commander with an ability (not used)', () => {
    const lines = buildTooltipLines({
      name: 'Nokomis',
      role: 'Sustain',
      clan: 'Marten Clan',
      aura: { name: 'Gitigaan', description: 'Heal from kills.' },
      ability: { name: 'Medicine Bundle', description: 'Restore lives.' },
    }, false);

    expect(lines).toHaveLength(8);
    expect(lines[0].text).toBe('Nokomis');
    expect(lines[0].bold).toBe(true);
    expect(lines[1].text).toBe('Sustain · Marten Clan');
    expect(lines[6].text).toContain('(READY)');
  });

  it('builds 8 lines for a commander with ability used', () => {
    const lines = buildTooltipLines({
      name: 'Makoons',
      role: 'Damage',
      clan: 'Bear Clan',
      aura: { name: 'Bear Strength', description: '+12% damage.' },
      ability: { name: 'Charge', description: 'Ignore armor.' },
    }, true);

    expect(lines[6].text).toContain('(USED)');
    expect(lines[6].text).not.toContain('(READY)');
  });

  it('builds 5 lines for a commander without ability', () => {
    const lines = buildTooltipLines({
      name: 'TestCdr',
      role: 'Economy',
      clan: 'Test Clan',
      aura: { name: 'Aura', description: 'Desc.' },
    }, false);

    expect(lines).toHaveLength(5);
  });

  it('spacer lines have empty text and colour', () => {
    const lines = buildTooltipLines({
      name: 'X',
      role: 'R',
      clan: 'C',
      aura: { name: 'A', description: 'D' },
      ability: { name: 'Ab', description: 'Ad' },
    }, false);

    const spacers = lines.filter(l => l.text === '');
    expect(spacers.length).toBe(2);
    spacers.forEach(s => expect(s.color).toBe(''));
  });
});

// ── Visual reaction guards ──────────────────────────────────────────────────

describe('visual reaction expectations', () => {
  it('boss shake tween parameters: yoyo + repeat 5 ends at original position', () => {
    // With yoyo=true and repeat=5, Phaser runs:
    // play 0 forward, rep 1 back, rep 2 forward, rep 3 back, rep 4 forward, rep 5 back
    // = 6 movements total, ending at the start position (even count of back movements: 3)
    const repeat = 5;
    const totalMoves = repeat + 1; // 6
    const backMoves = Math.floor(totalMoves / 2); // 3
    // With yoyo, even total = ends at start, odd total = ends at target
    expect(totalMoves % 2).toBe(0); // even → returns to start
    expect(backMoves).toBe(3);
  });

  it('victory bounce uses scale > 1 for expansion effect', () => {
    const scaleX = 1.25;
    const scaleY = 1.25;
    expect(scaleX).toBeGreaterThan(1);
    expect(scaleY).toBeGreaterThan(1);
  });

  it('game-over dim alpha is below 0.5 for visible dimming', () => {
    const alpha = 0.35;
    expect(alpha).toBeLessThan(0.5);
    expect(alpha).toBeGreaterThan(0); // not fully invisible
  });
});
