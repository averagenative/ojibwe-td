---
id: TASK-035
title: Expanded Roguelike Offer Pool
status: pending
priority: high
category: frontend
phase: 14
openspec_ref: ""
depends_on: ["TASK-07"]
created: 2026-03-01
---

## Description

The current offer pool is likely heavy on stat buffs (+X% damage, +Y% range). Expand it
to 60+ total offers, with at least 20 "build-defining" offers that change *how towers
function* rather than just making them numerically stronger. These are the offers that
create the Binding of Isaac moment — "I've never tried this combination before."

## Acceptance Criteria

### New Offer Definitions
- [ ] `src/data/offerDefs.ts` (or equivalent) expanded with at minimum 30 new offers
  across these categories:

  **Mechanic-changing offers (at least 12):**
  - "Ricochet Shot" — Cannon projectiles bounce to a second nearest creep (50% damage on bounce)
  - "Flash Freeze" — Frost towers no longer slow; instead frozen creeps take 2× damage from all sources for 3s
  - "Chain Reactor" — Tesla kills cause a small explosion (20% of creep's max HP) to adjacent creeps
  - "Plague Doctor" — Poison DoT stacks up to 5× on the same creep instead of refreshing
  - "Aftershock" — Mortar shells leave a 2s lingering fire zone that damages creeps passing through
  - "Aura Leech" — Aura tower also drains 5% of buffed towers' damage and adds it to the next wave's gold reward
  - "Glass Cannon" — Cannon towers have +100% damage but -50% range
  - "Permafrost" — Frost towers slow permanently (creep never recovers speed), but frost slow magnitude is halved
  - "Living Poison" — Poison clouds move slowly along the path in the direction of creep travel
  - "Overkill Transfer" — Excess damage from killing a creep carries over to the next creep in line
  - "Shared Pain" — When one tower attacks a creep, all towers within 2 tiles also deal 25% of their normal damage to it
  - "Tower Tax" — Each tower placed costs 20% more, but deals 15% more damage per tower already placed

  **Synergy offers (at least 8) — only powerful with specific combos:**
  - "Shatter" — Frozen creeps (from Frost) take triple damage from Mortar AoE
  - "Conductor" — Poison-debuffed creeps take +50% Tesla chain damage
  - "Siege Mode" — Cannon towers near an Aura tower have their attack speed halved but damage tripled
  - "Arctic Shrapnel" — Mortar hits apply Frost slow for 1s
  - "Voltaic Venom" — Tesla kills spread Poison DoT to nearby creeps
  - "Stone Skin" — Armoured creeps that survive a Mortar hit become immune to Mortar for 3s (negative synergy — challenge offer)
  - "Blood Price" — Selling a tower grants its sell value in gold AND heals 1 life
  - "Crowded House" — Towers deal +5% damage for each other tower within 2 tiles (up to +35%)

  **Economy/build offers (at least 10):**
  - "Salvage Rights" — Sell value increased to 90% for this run
  - "Bulk Discount" — Each tower of the same type costs 5% less (stacks per additional tower)
  - "War Chest" — Start each wave with +15 gold but earn 20% less gold from kills
  - "Interest" — Earn 2% of your current gold as bonus gold at wave end (min 5g)
  - "Gambler" — Every 5 waves, gain a random free upgrade on a random tower
  - "Recycler" — Selling a tower refunds its upgrade costs at 50%
  - "Headstart" — Place one free tower of your choice before wave 1
  - "Bounty" — The first creep to escape each wave drops triple gold on the next kill
  - "Insurance" — If you lose 2+ lives in a wave, get 20 gold compensation
  - "Last Stand" — When below 3 lives, all towers deal +25% damage

- [ ] Each offer has: `id`, `title`, `description`, `rarity` (common/rare/epic), `category`,
  and `effect` implementation.
- [ ] Rarity distribution in the offer pool: ~50% common, ~35% rare, ~15% epic.
  Epic offers are build-defining; rare offers are significant; common offers are solid but not run-shaping.
- [ ] Build-defining / mechanic-changing offers are `rarity: 'epic'` and appear at most
  once per run (no duplicates).

### Pool Management
- [ ] `OfferManager` updated to draw from the full expanded pool, weighted by rarity.
- [ ] Anti-duplication: the same offer cannot appear twice in the same run.
- [ ] Synergy offers only appear if the player has the relevant tower types placed
  (e.g. "Shatter" only offered if both Frost and Mortar towers are placed).
- [ ] Negative/challenge offers ("Stone Skin", "Tower Tax") flagged clearly in the UI with
  a distinct visual treatment (red border, warning icon).

### UI
- [ ] Offer cards show rarity via border colour: grey (common), blue (rare), gold (epic).
- [ ] Offer description card large enough to read the full effect before choosing.
- [ ] Active offers visible somewhere in HUD or accessible via a small "offers" button
  (no visual indicator currently exists per ROADMAP).

### Tests & Quality
- [ ] Unit tests for `OfferManager`: verify rarity weighting, no-duplicate enforcement,
  synergy gating.
- [ ] `npm run typecheck` clean; `npm run test` passes.

## Notes

- The "build-defining" offers should feel like they redefine your strategy for the rest
  of the run. When a player takes "Flash Freeze", they should immediately start thinking
  about Mortar + Cannon differently. That cognitive shift is the design goal.
- Negative offers ("Tower Tax", "Stone Skin") create interesting decisions — is the
  downside worth the implied challenge? Keep them rare and never force them; they should
  always be one of three choices.
- ROADMAP noted "No visual indicator for active offers" — the HUD offer list addresses this.
- The synergy-gating logic is important: surfacing "Voltaic Venom" when the player has
  no Tesla or Poison towers is noise. Only offer synergy items when relevant.
