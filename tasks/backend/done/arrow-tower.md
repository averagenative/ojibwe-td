---
id: TASK-082
title: Arrow Tower -- Cheap Air+Ground Tower with Damage Cap
status: done
priority: critical
phase: feature
category: backend
depends_on: []
created: 2026-03-02
---

## Problem

Currently only Tesla can hit air units. Players need a cheaper option for air defense that doesn't require unlocking Tesla through the meta-progression.

## Goal

Add an Arrow tower -- a low-cost tower that can target both ground and air creeps, with a damage cap that limits its late-game effectiveness. It's a tower you can spam-place early but has diminishing returns as the game progresses.

## Design

- **Cost**: ~15-20 gold (cheapest tower in the game)
- **Damage**: Low base damage (~8-12), fast attack speed
- **Range**: Medium (similar to cannon)
- **Targeting**: Both air and ground creeps
- **Damage Cap**: Hard cap on maximum damage per hit that upgrade paths can't exceed (e.g., max 40-50 damage). This means upgrade paths improve it but it plateaus.
- **Theme**: Ojibwe bow/arrow aesthetic
- **Unlock**: Available from the start (no meta-progression unlock needed)
- **Default Priority**: FIRST (like cannon)

## Implementation Plan

### 1. Tower definition

Add `ARROW_DEF` to `src/data/towerDefs.ts`:
- Key: `'arrow'`
- Low cost, fast attack speed, medium range
- `canTargetAir: true`, `canTargetGround: true`
- New field: `damageCap: number` on TowerDef (or TowerUpgradeStats)

### 2. Upgrade tree

Add arrow upgrade paths to `src/data/upgradeDefs.ts` (3 paths x 5 tiers):
- **Path A**: Attack speed focus (rapid fire archer) -- faster cooldown, slight damage bumps (still capped)
- **Path B**: Multi-shot / pierce (hit multiple targets) -- projectile passes through or splits
- **Path C**: Utility (slow on hit, reveal stealth, range boost) -- damage cap still enforced

### 3. Damage cap enforcement

In `Tower.fireAt()` or damage application, clamp final damage to `damageCap`:
```typescript
const finalDamage = Math.min(calculatedDamage, this.def.damageCap ?? Infinity);
```

### 4. Projectile visual

Arrow projectile should be visually distinct from cannon:
- Faster travel speed
- Thinner/smaller visual (straight line or slight arc)
- Different color from cannon projectiles

### 5. Tower panel integration

Arrow tower appears in TowerPanel alongside existing towers. Available from the start (not in LOCKED_TOWER_IDS).

## Acceptance Criteria

- [ ] New `ARROW_DEF` in `src/data/towerDefs.ts` with appropriate stats
- [ ] Arrow tower appears in TowerPanel, placeable on ground tiles
- [ ] Fires projectiles at both ground and air creeps
- [ ] Upgrade tree with 3 paths (A/B/C) x 5 tiers in `upgradeDefs.ts`
- [ ] Damage cap enforced -- upgrades cannot exceed the defined maximum damage
- [ ] Arrow projectile visual distinct from cannon (faster, thinner arc or straight line)
- [ ] Wave data may need adjustment if arrow tower changes early-game balance
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Unit tests for damage cap enforcement

## Notes

- Follow existing TowerDef pattern in `src/data/towerDefs.ts` -- the Arrow def should be a const like CANNON_DEF, FROST_DEF, etc.
- The damage cap is the key balancing lever -- it makes the tower useful early but prevents it from scaling into late-game dominance
- Consider whether the damage cap should apply before or after global damage multipliers (iron-barrage offer, stat bonuses)
- Path B multi-shot needs careful implementation: could be projectile pierce (passes through first target) or split (fires at N targets per attack)
