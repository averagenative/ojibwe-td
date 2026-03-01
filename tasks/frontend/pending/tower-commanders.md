---
id: TASK-018
title: Tower Commanders (Character System)
status: in-progress
category: frontend
phase: 12
openspec_ref: "Phase 12"
depends_on: ["TASK-09"]
created: 2026-02-28
---

## Description

Add an unlockable **Commander** system: before starting a run the player chooses one Commander who accompanies them. Each Commander is a named Ojibwe cultural figure with a character sheet, a passive global aura affecting all towers, and a unique personal ability usable once per run. Commanders are unlocked through the meta-progression system (TASK-09) and add a strategic pre-run decision that compounds with roguelike offers and tower upgrades.

Commanders are not on the map — they are an off-screen presence whose influence is felt through mechanical bonuses and voiced through story vignettes (TASK-017). They are not stereotypes; they are specific people with specific skills.

## Acceptance Criteria

### Commander Data Schema
- [ ] Define `CommanderDef` schema: `id`, `name`, `clan`, `totem`, `role`, `lore: string` (3–5 sentences), `portraitIcon: string`, `aura: AuraDef`, `ability: AbilityDef`, `unlockCost: number`, `defaultUnlocked: boolean`
- [ ] `AuraDef`: `description: string`, `apply(scene: GameScene): void` — called once on run start; mutates tower stats or registers scene-level listeners
- [ ] `AbilityDef`: `name`, `description`, `cooldown: "once-per-run"`, `activate(scene: GameScene): void`, `uiIcon: string`
- [ ] Commander data lives in `src/data/commanderDefs.ts`; no code changes needed to add new commanders

### Starter Commander (default-unlocked)
- [ ] **Nokomis** (Grandmother): available from the first run, no unlock cost
  - Lore: A keeper of medicine knowledge and oral tradition. She knows the land and what grows where.
  - Aura — *Gitigaan* (Garden): all towers regenerate 1 life collectively per 40 creep kills (kills across all towers count together)
  - Ability — *Mashkiki Biindaakoojiigan* (Medicine Bundle): once per run, fully restore lives to their wave-start value (can be saved for boss wave)
  - Stat card: Role = Sustain, Totem = Turtle, Clan = Marten Clan

### Unlock-Gated Commanders (5 additional)
- [ ] **Bizhiw** (Lynx — Hunter)
  - Aura — *Bimaadiziwin* (Living Well): Cannon and Frost tower attack speed +20%; projectile travel speed +25%
  - Ability — *Wiigiwaam Wiindamaagewin* (Scout's Eye): reveals the next wave's creep composition and count 15 seconds early
  - Stat card: Role = Precision, Totem = Lynx, Clan = Crane Clan

- [ ] **Animikiikaa** (Thunder-Being — Stormcaller)
  - Aura — *Animiki-bimaadiziwin* (Thunder Life): Tesla chain count +1 globally; chain jumps emit a 1-tile AoE on impact
  - Ability — *Gichi-animikiikaa* (Great Thunder): for 8 seconds all Tesla towers fire at 3× speed and chains ignore target limits
  - Stat card: Role = Burst, Totem = Eagle, Clan = Eagle Clan

- [ ] **Makoons** (Bear Cub — Warrior)
  - Aura — *Makwa-zoongide'e* (Bear Heart): all tower base damage +12%; towers do not lose target on creep speed burst
  - Ability — *Makwa-ojiins* (Bear's Charge): for 6 seconds all towers ignore armor and immunity flags (hits Migizi, penetrates Makwa armor)
  - Stat card: Role = Damage, Totem = Bear, Clan = Bear Clan

- [ ] **Oshkaabewis** (Messenger — Scout)
  - Aura — *Bimosewin* (The Walk): +1 gold per creep kill (stacks with base kill gold); between-wave offer draws show 4 cards instead of 3
  - Ability — *Giizhibaa-bimosewin* (Swift Walk): immediately receive gold equal to 30% of current wave's total creep kill gold (pre-paid)
  - Stat card: Role = Economy, Totem = Deer, Clan = Loon Clan

- [ ] **Waabizii** (Swan — Healer)
  - Aura — *Zaagi'idiwin* (Unconditional Love): Poison DoT stacks that fully consume on a kill have a 25% chance to heal 1 life; starting life count +2
  - Ability — *Wiisagenimad* (Tenderness): for the next wave, any creep that escapes costs 0 lives (absorbs one full wave of escapes)
  - Stat card: Role = Resilience, Totem = Swan, Clan = Fish Clan

### Commander Selection UI
- [ ] Add Commander selection screen between MainMenu and run start (or as a tab in the run-start modal)
- [ ] Each commander shows: portrait icon, name, clan, totem, role tag, aura description, ability name + description
- [ ] Locked commanders show name and role tag, but lore and abilities are hidden ("??? — unlock in the Meta Tree")
- [ ] Selected commander is highlighted; confirm starts the run with that commander active
- [ ] Default commander (Nokomis) is pre-selected on first play

### Character Sheet
- [ ] A full character sheet is accessible from the commander selection screen (tap/click for details)
- [ ] Sheet shows: full lore text, clan/totem illustration placeholder, aura description with mechanical detail, ability with timing/cooldown note, codex link (TASK-017 Commanders section)
- [ ] Character sheets are also viewable from the Codex without being in a run

### In-Run Integration
- [ ] Active commander's aura is applied in `GameScene.create()` before the first wave starts
- [ ] Ability button renders in the HUD (beside pause/speed controls); greys out after activation
- [ ] Commander name and portrait icon appear in the HUD as a passive reminder of the active aura
- [ ] Aura effects survive a wave restart (retry) — they are re-applied each run start
- [ ] If a commander's aura modifies tower stats, those modifications are visible in the tower's stat tooltip

### Correctness
- [ ] A run started with commander X uses only commander X's aura and ability for its entirety
- [ ] Oshkaabewis's +1 gold/kill stacks correctly with Scavenger roguelike offer (both apply additively)
- [ ] Makoons's ability correctly strips Migizi's slow-immunity and Makwa's armor for its 6-second window
- [ ] Waabizii's ability (absorbs escapes) does NOT prevent the `creep-escaped` event — it intercepts the life-decrement only
- [ ] Unit tests: aura application (stat delta per commander), ability activation guard (can't activate twice), Waabizii life-intercept

## Notes

Commander names and clan/totem affiliations should be reviewed by the creator before ship. Clan affiliations in Ojibwe culture carry real social meaning — the choices here are intentional but should be verified for appropriateness.

The "once per run" ability cooldown is intentional: it creates a tension about *when* to use it (save for a boss wave vs. spend mid-run for relief). A future TASK could introduce upgrade paths for commanders (e.g. recharge ability once per act) but that is out of scope here.

Commanders are the primary vehicle for player self-expression and identity in the game — they should feel distinct enough that players develop favourites.
