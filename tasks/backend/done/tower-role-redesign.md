---
id: TASK-098
title: Tower Role Redesign — Rock Hurler Merger & Armor Effectiveness
status: done
category: backend
priority: critical
depends_on: []
created: 2026-03-02
---

## Description

Currently there is no reason to prefer any tower over Arrow towers. We need meaningful tower
role differentiation, especially around armor mechanics.

**Key changes:**
1. **Merge Cannon + Mortar into "Rock Hurler"**: A single rock-throwing tower that has both
   direct-hit damage AND AoE splash from rock fragments on impact. Spiritual successor to both
   cannon and mortar. Keeps the tower count manageable while giving one tower two roles.
2. **Armor effectiveness**: Armored creeps (like turtle) should be heavily resistant to Arrow
   damage but vulnerable to Rock Hurler (physical impact bypasses/reduces armor). This creates
   a hard requirement for tower diversity.
3. **Tower role clarity**: Each tower should have a clear niche:
   - Arrow: cheap, fast, good vs unarmored — falls off vs armor
   - Rock Hurler: anti-armor + AoE splash, slower rate
   - Frost: slow/control
   - Thunder (Tesla): chain lightning, anti-group
   - Poison: DoT, anti-regen
   - Aura: buff/support

## Acceptance Criteria

- [ ] Cannon and Mortar merged into a single "Rock Hurler" tower
- [ ] Rock Hurler has direct-hit damage + AoE splash on impact (fragments)
- [ ] Arrow tower damage is significantly reduced vs armored creeps (damage reduction or armor mechanic)
- [ ] Rock Hurler damage is effective or bonus vs armored creeps
- [ ] Each tower type has a clear reason to exist — no tower is strictly dominated by another
- [ ] Upgrade trees adapted for Rock Hurler (merge best paths from cannon + mortar trees)
- [ ] All tower icon/asset references updated
- [ ] Save data migration if tower keys change
- [ ] `npm run typecheck` clean; `npm run test` passes
- [ ] Playtested: later waves require tower diversity to survive

## Notes

- This is a major gameplay change — consider doing it in phases
- The mortar's cluster bomb mechanic could become a Rock Hurler upgrade path
- Cannon's armor-focus targeting toggle should transfer to Rock Hurler
- May need to update wave definitions to ensure armor types appear at the right frequency
- All offers referencing cannon/mortar need updating (concussion-shell, iron-barrage, etc.)
- Consider: does Arrow need a "light armor" damage type vs Rock Hurler "heavy/siege" type?
