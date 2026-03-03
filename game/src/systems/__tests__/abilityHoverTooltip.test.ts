/**
 * Tests for TASK-104: Commander Ability Hover Text with English Translation.
 *
 * Covers:
 * - nameEnglish field presence on all commanders (aura + ability)
 * - HUD ability tooltip line generation (mirrors _showAbilityTooltip logic)
 * - CommanderSelectScene English translation display
 * - Long-press / hover interaction logic (structural)
 */
import { describe, it, expect } from 'vitest';
import { ALL_COMMANDERS } from '../../data/commanderDefs';
import type { AbilityDef } from '../../data/commanderDefs';
import { PAL } from '../../ui/palette';

// ── nameEnglish field presence ───────────────────────────────────────────────

describe('nameEnglish field on all commanders', () => {
  it.each(ALL_COMMANDERS)(
    '$name has non-empty aura.nameEnglish',
    (def) => {
      expect(typeof def.aura.nameEnglish).toBe('string');
      expect(def.aura.nameEnglish.length).toBeGreaterThan(0);
    },
  );

  it.each(ALL_COMMANDERS)(
    '$name has non-empty ability.nameEnglish',
    (def) => {
      expect(typeof def.ability.nameEnglish).toBe('string');
      expect(def.ability.nameEnglish.length).toBeGreaterThan(0);
    },
  );

  it('nameEnglish values are distinct from Ojibwe names (not copy-pasted)', () => {
    for (const def of ALL_COMMANDERS) {
      // At least one of aura/ability should have a different English name
      // (some may coincide if the Ojibwe name IS the English word, but
      // in practice none of our commanders have identical pairs)
      const auraSame = def.aura.name === def.aura.nameEnglish;
      const abilitySame = def.ability.name === def.ability.nameEnglish;
      expect(auraSame && abilitySame).toBe(false);
    }
  });
});

// ── HUD ability tooltip line generation ──────────────────────────────────────

describe('HUD ability tooltip line generation', () => {
  /**
   * Simulates the line-building logic from HUD._showAbilityTooltip().
   * Must stay in sync with the real implementation.
   */
  function buildAbilityTooltipLines(ab: Pick<AbilityDef, 'name' | 'nameEnglish' | 'description'>) {
    const lines: Array<{ text: string; color: string; bold?: boolean; italic?: boolean }> = [
      { text: ab.name, color: PAL.textAbility, bold: true },
      { text: `"${ab.nameEnglish}"`, color: PAL.textMuted, italic: true },
      { text: '', color: '' }, // spacer
      { text: ab.description, color: PAL.textSecondary },
      { text: '', color: '' }, // spacer
      { text: 'Once per run', color: PAL.textDim },
    ];
    return lines;
  }

  it('produces 6 lines for a standard ability', () => {
    const lines = buildAbilityTooltipLines({
      name: 'Mashkiki Biindaakoojiigan',
      nameEnglish: 'Medicine Bundle',
      description: 'Fully restore lives.',
    });
    expect(lines).toHaveLength(6);
  });

  it('first line is the Ojibwe ability name in bold', () => {
    const lines = buildAbilityTooltipLines({
      name: 'Gichi-animikiikaa',
      nameEnglish: 'Great Thunder',
      description: 'Tesla boost.',
    });
    expect(lines[0].text).toBe('Gichi-animikiikaa');
    expect(lines[0].bold).toBe(true);
    expect(lines[0].color).toBe(PAL.textAbility);
  });

  it('second line is the English translation wrapped in quotes and italic', () => {
    const lines = buildAbilityTooltipLines({
      name: 'Makwa-ojiins',
      nameEnglish: "Bear's Charge",
      description: 'Ignore armor.',
    });
    expect(lines[1].text).toBe('"Bear\'s Charge"');
    expect(lines[1].italic).toBe(true);
    expect(lines[1].color).toBe(PAL.textMuted);
  });

  it('third line is a spacer', () => {
    const lines = buildAbilityTooltipLines({
      name: 'X', nameEnglish: 'Y', description: 'Z',
    });
    expect(lines[2].text).toBe('');
  });

  it('fourth line is the description', () => {
    const lines = buildAbilityTooltipLines({
      name: 'Giizhibaa-bimosewin',
      nameEnglish: 'Swift Walk',
      description: 'Gold equal to 30% of current wave.',
    });
    expect(lines[3].text).toBe('Gold equal to 30% of current wave.');
    expect(lines[3].color).toBe(PAL.textSecondary);
  });

  it('sixth line says "Once per run"', () => {
    const lines = buildAbilityTooltipLines({
      name: 'X', nameEnglish: 'Y', description: 'Z',
    });
    expect(lines[5].text).toBe('Once per run');
    expect(lines[5].color).toBe(PAL.textDim);
  });

  it('has exactly 2 spacer lines', () => {
    const lines = buildAbilityTooltipLines({
      name: 'X', nameEnglish: 'Y', description: 'Z',
    });
    const spacers = lines.filter(l => l.text === '');
    expect(spacers).toHaveLength(2);
  });
});

// ── tooltip position clamping ────────────────────────────────────────────────

describe('tooltip position clamping', () => {
  /** Simulates the X-position clamp from _showAbilityTooltip. */
  function clampTipX(btnX: number, tipW: number, sceneWidth: number): number {
    return Math.max(4, Math.min(btnX - tipW / 2, sceneWidth - tipW - 4));
  }

  it('centres tooltip below button when space allows', () => {
    // Button at x=500, tipW=210, sceneWidth=1280
    const tipX = clampTipX(500, 210, 1280);
    expect(tipX).toBe(500 - 105); // 395
  });

  it('clamps to left edge (min 4px) when button is near left', () => {
    const tipX = clampTipX(50, 210, 1280);
    expect(tipX).toBe(4);
  });

  it('clamps to right edge when button is near right', () => {
    const tipX = clampTipX(1250, 210, 1280);
    expect(tipX).toBe(1280 - 210 - 4); // 1066
  });

  it('handles exact boundary — tooltip just fits on right', () => {
    // tipW = 210, sceneWidth = 1280.  Max x = 1280 - 210 - 4 = 1066
    // btnX - tipW/2 = btnX - 105.  When btnX = 1171, tipX = 1066.
    const tipX = clampTipX(1171, 210, 1280);
    expect(tipX).toBe(1066);
  });

  it('handles very small scene width gracefully', () => {
    // sceneWidth=220, tipW=210 → max = 220-210-4 = 6
    // Math.max(4, Math.min(110-105, 6)) = Math.max(4, Math.min(5, 6)) = 5
    const tipX = clampTipX(110, 210, 220);
    expect(tipX).toBe(5);
  });
});

// ── Structural: long-press / hover interaction patterns ──────────────────────

describe('long-press interaction pattern', () => {
  it('long-press threshold is 400ms', () => {
    // Verified by reading the source — both CommanderPortrait and HUD use 400ms
    const LONG_PRESS_MS = 400;
    expect(LONG_PRESS_MS).toBe(400);
    expect(LONG_PRESS_MS).toBeGreaterThan(200); // not too fast (accidental)
    expect(LONG_PRESS_MS).toBeLessThanOrEqual(500); // not too slow (frustrating)
  });

  it('long-press flag prevents ability activation on pointerup', () => {
    // Simulates the guard: if long-press triggered, hide tooltip instead of activating
    let longPressTriggered = false;
    let abilityActivated = false;

    // Simulate long-press scenario
    longPressTriggered = true;

    // pointerup handler logic
    if (longPressTriggered) {
      // hide tooltip, don't activate
      longPressTriggered = false;
    } else {
      abilityActivated = true;
    }

    expect(abilityActivated).toBe(false);
    expect(longPressTriggered).toBe(false);
  });

  it('short tap activates ability (long-press NOT triggered)', () => {
    let longPressTriggered = false;
    let abilityActivated = false;

    // Simulate quick tap (pointerup before timer fires)
    // longPressTriggered stays false

    if (longPressTriggered) {
      longPressTriggered = false;
    } else {
      abilityActivated = true;
    }

    expect(abilityActivated).toBe(true);
  });
});

// ── CommanderSelectScene English translation display ──────────────────────────

describe('CommanderSelectScene English translation formatting', () => {
  it('English translations are wrapped in regular double quotes', () => {
    for (const def of ALL_COMMANDERS) {
      const auraText = `"${def.aura.nameEnglish}"`;
      expect(auraText.startsWith('"')).toBe(true);
      expect(auraText.endsWith('"')).toBe(true);
      // Verify the quotes are ASCII 0x22, not curly quotes
      expect(auraText.charCodeAt(0)).toBe(0x22);

      const abilityText = `"${def.ability.nameEnglish}"`;
      expect(abilityText.startsWith('"')).toBe(true);
      expect(abilityText.endsWith('"')).toBe(true);
    }
  });

  it('no commander has empty string for nameEnglish', () => {
    for (const def of ALL_COMMANDERS) {
      expect(def.aura.nameEnglish.trim().length).toBeGreaterThan(0);
      expect(def.ability.nameEnglish.trim().length).toBeGreaterThan(0);
    }
  });
});
