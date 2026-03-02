---
id: TASK-051
title: Air & Ground Combat System — Flying Creeps, Tower Targeting Domains
status: done
priority: medium
phase: gameplay
depends_on: ["TASK-049", "TASK-050"]
---

# Air & Ground Combat System — Flying Creeps, Tower Targeting Domains

## Problem

All creeps are ground-based and all towers hit everything. This limits strategic
depth — there's no reason to diversify tower composition beyond DPS optimization.
Classic TD games use flying creeps to force players into specific tower choices
and create moments of panic when air waves arrive.

## Goal

Introduce a targeting domain system: creeps are either **ground** or **air**,
and towers have a targeting domain that determines what they can hit. Some towers
hit ground only, some hit air only, and a few hit both. This creates meaningful
build decisions — you can't just stack one tower type and win.

## Design — Tower Targeting Domains

Each tower archetype should map to a domain that makes intuitive sense:

| Tower | Domain | Rationale |
|-------|--------|-----------|
| **Cannon** | Ground only | Cannons fire heavy shells — can't track fast-moving flyers |
| **Mortar** | Ground only | Lobbed explosives land on the ground — no air tracking |
| **Frost** | Both (ground + air) | Cold winds affect everything — blizzards hit the sky too |
| **Poison** | Ground only | Poison clouds hug the ground, toxic puddles |
| **Tesla** | Air only | Lightning arcs upward naturally, chain lightning jumps through the sky |
| **Aura** | Both (ground + air) | Aura field radiates in all directions, buffing nearby towers regardless |

This creates a natural tension:
- **Ground-heavy waves**: Cannon/Mortar/Poison excel
- **Air waves**: Must have Tesla + Frost coverage or you leak
- **Mixed waves**: Need balanced builds — the intended late-game challenge

### Alternative: New Tower Archetype
If Tesla being air-only feels too restrictive, consider:
- Tesla → Both (ground + air), but reduced damage to ground targets
- Add a new **Wind/Eagle tower** archetype that is air-only specialist
- The new tower could use the Ojibwe eagle/thunderbird theme (fits the aesthetic)

## Acceptance Criteria

### Creep Domain
- [ ] `Creep.ts` gets a `domain: 'ground' | 'air'` property (default: 'ground')
- [ ] Air creeps have distinct visual treatment:
  - Rendered slightly above ground (offset Y by -8 to -12px, or shadow underneath)
  - Wings or translucent overlay to indicate flight
  - No path-following constraint — air creeps fly in a straight(ish) line from
    spawn to exit, ignoring the path (or follow a simplified air route)
- [ ] Air creeps don't block ground creep movement

### Tower Targeting Domain
- [ ] `TowerDef` gets a `targetDomain: 'ground' | 'air' | 'both'` property
- [ ] `Tower.findTarget()` filters candidates by domain:
  - `ground`: only targets creeps with `domain === 'ground'`
  - `air`: only targets creeps with `domain === 'air'`
  - `both`: targets all creeps
- [ ] Tower tooltip and panel show the targeting domain (small icon or text)
- [ ] Aura tower buff applies regardless of domain (it buffs towers, not creeps)

### Wave Integration
- [ ] Wave definitions can specify `domain: 'air'` for flying waves
- [ ] Air waves introduced gradually — first appearance around wave 8-10
- [ ] Mixed waves (ground + air simultaneously) appear in later waves
- [ ] Boss creeps can be ground or air (air bosses are particularly threatening)
- [ ] HUD shows a warning indicator before an air wave ("Incoming air wave!")

### Air Creep Pathing
- [ ] Air creeps follow a simplified path: spawn → exit in a more direct route
- [ ] Air path can optionally have waypoints (for map designers) but defaults
  to a gentle curve from spawn to exit
- [ ] On dual-entrance maps (TASK-050), air creeps use one designated air lane
  or fly over the map center

### Map Generation Consideration
- [ ] Map JSON format supports optional `airWaypoints` array for custom air routes
- [ ] If no `airWaypoints` defined, air creeps interpolate a direct spawn→exit path
- [ ] Future map generator should consider air paths when placing terrain features

### Balance
- [ ] Air creeps have ~70% of ground creep HP (compensates for shorter path)
- [ ] Air creeps move ~20% faster than equivalent ground creeps
- [ ] Tesla damage balanced for its air-only role (may need +15-20% damage to
  compensate for not hitting ground)
- [ ] Frost slow works on air creeps but at 50% effectiveness (wind resistance)

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Existing ground-only gameplay unaffected — all current waves remain ground
- [ ] Tower targeting domain filter has unit tests
- [ ] Performance: air creeps don't create additional pathfinding overhead

## Notes

- The Ojibwe word for eagle is "migizi" — could name air creep variants after
  birds (migizi, ajijaak/crane, zhiishiib/duck for different air creep tiers)
- Flying creeps add urgency to tower composition — players who neglect Tesla/Frost
  will get punished on air waves, creating a natural difficulty curve
- This system lays groundwork for more complex map designs where air paths cross
  over obstacles (lakes, mountains) that ground creeps must path around
- Consider an upgrade path for Cannon that adds anti-air capability ("Flak Cannon")
  so players aren't locked out if they invested heavily in Cannon early
