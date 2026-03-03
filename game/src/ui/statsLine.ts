/**
 * Pure, Phaser-free helper that builds the one-line stat summary shown in the
 * UpgradePanel header.  Extracted here so it can be imported by unit tests
 * without pulling in the Phaser WebGL renderer.
 */
import type { TowerUpgradeStats } from '../data/towerDefs';

/**
 * Returns a one-line stat summary tailored to each tower type so players can
 * see the effect of special upgrades at a glance.
 */
export function buildStatsLine(
  towerKey: string,
  isAura: boolean,
  us: TowerUpgradeStats,
  spdStr: string,
): string {
  const rng = Math.round(us.range);

  if (isAura) {
    // Show the actual aura multipliers so players can see what they are buying.
    const spdPct = Math.round((1 - us.auraIntervalMult) * 100);
    const dmgPct = Math.round((us.auraDamageMult - 1) * 100);
    const rngPct = Math.round(us.auraRangePct * 100);
    return `RNG: ${rng}  ·  spd +${spdPct}%  ·  dmg +${dmgPct}%  ·  rng +${rngPct}%`;
  }

  switch (towerKey) {
    case 'frost': {
      const sf  = us.slowFactor;
      const sds = (us.slowDurationMs / 1000).toFixed(1);
      return `DMG: ${us.damage}  ·  RNG: ${rng}  ·  slow ×${sf.toFixed(2)}/${sds}s  ·  ${spdStr}s atk`;
    }

    case 'poison': {
      const dotTotal = us.dotDamageBase + us.dotDamageBonus;
      const stacks   = us.maxDotStacks;
      const spread   = us.dotSpreadOnDeath ? '  ·  spread' : '';
      return `DoT: ${dotTotal}/tick×8  ·  ${stacks} stacks  ·  RNG: ${rng}${spread}  ·  ${spdStr}s atk`;
    }

    case 'tesla': {
      const chains = us.chainCount;
      const ratio  = us.chainDamageRatio.toFixed(2);
      return `DMG: ${us.damage}  ·  chains: ${chains}(×${ratio})  ·  RNG: ${rng}  ·  ${spdStr}s atk`;
    }

    case 'arrow': {
      const shots = 1 + us.multiShotCount;
      const slowStr = us.arrowSlowFactor > 0
        ? `  ·  slow ${Math.round((1 - us.arrowSlowFactor) * 100)}%`
        : '';
      return `DMG: ${us.damage}  ·  shots: ${shots}  ·  RNG: ${rng}${slowStr}  ·  ${spdStr}s atk`;
    }

    case 'rock-hurler': {
      const shred   = us.armorShredPct > 0 ? `  ·  shred ${Math.round(us.armorShredPct * 100)}%` : '';
      const cluster = us.clusterCount > 0  ? `  ·  clusters: ${us.clusterCount}` : '';
      return `DMG: ${us.damage}+splash  ·  RNG: ${rng}${shred}${cluster}  ·  ${spdStr}s atk`;
    }

    default:
      return `DMG: ${us.damage}  ·  RNG: ${rng}  ·  ${spdStr}s atk`;
  }
}
