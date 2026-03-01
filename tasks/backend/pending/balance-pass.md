---
id: TASK-031
title: Balance Pass — DPS Curves & Economy Tuning
status: pending
category: backend
phase: 13
openspec_ref: ""
depends_on: ["TASK-030"]
created: 2026-03-01
---

## Description

Run the balance analysis script, audit DPS curves and creep HP scaling, and tune values
so the game feels fair and progressively challenging across all 20 waves and into endless
mode. Focus on: towers feeling meaningfully different, upgrade paths having clear payoff,
and waves 15–20 being genuinely hard without being impossible.

## Acceptance Criteria

- [ ] Run `npm run balance` in `game/` — review output for obvious outliers (towers with
  0 DPS improvement across a path, creeps that die in < 1 second with 2 basic towers, etc.).
- [ ] **Tower DPS balance**:
  - Each tower type has at least one upgrade path that meaningfully improves kill time
    (≥ 30% DPS increase from tier 1 → tier 3).
  - Tesla path B (Arc Damage) issue fixed: `chainDamageRatio` upgrade now also increases
    single-target base damage slightly so the balance table shows improvement on path B.
    (See ROADMAP — "Balance Calc review").
- [ ] **Wave HP scaling**: verify creep HP values form a smooth curve wave 1→20; no wave
  should feel like a sudden difficulty spike compared to the previous. Adjust `waves.json`
  HP multipliers if needed.
- [ ] **Economy**: tower costs vs gold earned per wave reviewed. A player with average
  placement should be able to afford tier-1 upgrades by wave 5 and tier-3 by wave 15.
  Adjust starting gold, wave kill rewards, or tower costs if the economy is too tight/loose.
- [ ] **Endless mode scaling**: verify the formula `HP × (1 + 0.12 × (n-20))` doesn't make
  wave 30+ impossible with a fully upgraded board. Target: skilled player can reach wave 30,
  exceptional play can reach wave 40+.
- [ ] Updated values committed to `game/src/data/waves.json`, `towers.json`, and any
  relevant system files.
- [ ] Balance analysis table (`npm run balance` output) appended to `docs/ROADMAP.md`
  under a new "Balance Report" section.
- [ ] `npm run typecheck` clean; `npm run test` passes.

## Notes

- The balance script is at `game/scripts/balance.ts` — run via `npm run balance`.
- Don't over-tune in one pass. The goal is "no obvious broken outliers", not perfect balance.
  Real balance comes from playtesting.
- Document any intentional asymmetries (e.g. "Aura tower has low DPS by design — its
  value is the buff to adjacent towers") in the balance report.
- `esbuild` dependency issue (ROADMAP: "esbuild not in explicit devDependencies") — fix
  this as part of this task: add `esbuild` to `devDependencies` in `package.json`.
