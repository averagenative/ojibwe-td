import { describe, expect, it } from 'vitest';
import {
  matchesGearInventoryFilter,
  resolveGearDisplayTowerKey,
  UNIVERSAL_GEAR_FILTER,
} from '../../ui/gearTowerAssociation';

describe('gearTowerAssociation', () => {
  it('keeps unequipped universal gear visible under any tower filter', () => {
    expect(matchesGearInventoryFilter('frost', null, null)).toBe(true);
    expect(matchesGearInventoryFilter('arrow', null, null)).toBe(true);
  });

  it('shows equipped universal gear only under its owning tower filter', () => {
    expect(matchesGearInventoryFilter('frost', null, 'frost')).toBe(true);
    expect(matchesGearInventoryFilter('arrow', null, 'frost')).toBe(false);
  });

  it('keeps the universal tab based on gear type rather than current owner', () => {
    expect(matchesGearInventoryFilter(UNIVERSAL_GEAR_FILTER, null, 'frost')).toBe(true);
    expect(matchesGearInventoryFilter(UNIVERSAL_GEAR_FILTER, 'arrow', 'arrow')).toBe(false);
  });

  it('does not change typed gear ownership when filtering', () => {
    expect(matchesGearInventoryFilter('frost', 'frost', 'frost')).toBe(true);
    expect(matchesGearInventoryFilter('arrow', 'frost', 'frost')).toBe(false);
  });

  it('prefers the equipped tower when resolving display association', () => {
    expect(resolveGearDisplayTowerKey(null, 'frost')).toBe('frost');
    expect(resolveGearDisplayTowerKey('arrow', null)).toBe('arrow');
    expect(resolveGearDisplayTowerKey(null, null)).toBeNull();
  });
});
