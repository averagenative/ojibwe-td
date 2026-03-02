---
id: TASK-077
title: Mobile Session Persistence — Auto-Save & Restore Game State on Tab Switch
status: pending
priority: high
phase: bugfix
---

# Mobile Session Persistence — Auto-Save & Restore Game State on Tab Switch

## Problem

On mobile browsers (especially iOS Safari and Chrome Android), switching away
from the game tab for more than a few seconds causes the browser to evict the
page from memory. When the player switches back, the page reloads from scratch
and they lose their entire run — towers, upgrades, wave progress, everything.

The Vite HMR timeout was increased to 5 minutes (mitigates brief switches in
dev) but this doesn't help when the browser kills the page outright, which is
the common case on mobile.

## Goal

Implement periodic auto-save of in-game state to sessionStorage so that a
mid-run page reload (from browser eviction, accidental refresh, or HMR) can
be detected and the player is offered "Resume your run?" instead of starting
from scratch.

## Investigation

- [ ] Confirm root cause: is it Vite HMR reconnect reload, browser page
  eviction, or WebGL context loss? Add a `sessionStorage.setItem('__debug_reload', Date.now())`
  on page load and check it on next load to distinguish fresh load vs reload.
- [ ] Check if `beforeunload` / `pagehide` events fire reliably on mobile
  browsers (they often don't — which is why periodic save is needed)
- [ ] Check if WebGL context loss is involved (`webglcontextlost` event) —
  if so, handle it gracefully (pause game, show "tap to resume" overlay)

## Acceptance Criteria

### Auto-Save System
- [ ] Save game state to `sessionStorage` (key: `ojibwe-td-autosave`) at
  these checkpoints:
  - End of each wave (most important — clean state, no mid-wave chaos)
  - On `visibilitychange` when `document.hidden` becomes true (last chance
    before browser might kill the page)
  - On `pagehide` event (backup for iOS Safari)
- [ ] Saved state includes at minimum:
  ```typescript
  interface AutoSave {
    version: number;
    timestamp: number;
    mapId: string;
    stageId: string;
    commanderId: string;
    currentWave: number;
    gold: number;
    lives: number;
    totalKills: number;
    goldEarned: number;
    towers: Array<{
      key: string;        // tower def key
      col: number;        // grid column
      row: number;        // grid row
      upgrades: Record<string, number>;  // path -> tier
      totalSpent: number;
    }>;
    offers: string[];     // IDs of taken offers (for OfferManager restore)
    metaStatBonuses: object;  // pre-computed stat bonuses snapshot
  }
  ```
- [ ] Auto-save is compact — strip unnecessary data, keep under 10KB

### Restore Flow
- [ ] On `GameScene.create()` (or `MainMenuScene`), check for auto-save in
  sessionStorage
- [ ] If auto-save exists and is < 30 minutes old, show a prompt:
  "Resume from Wave X?" with YES / NO buttons
- [ ] YES: restore all state — place towers at saved positions, set
  gold/lives/wave, restore upgrades via UpgradeManager, restore offer state
- [ ] NO: clear the auto-save and start fresh
- [ ] Auto-save is cleared on:
  - Game over (victory or defeat)
  - Player explicitly returns to main menu
  - Player starts a new run
  - Auto-save is older than 30 minutes

### Tower Restoration
- [ ] Re-create Tower objects at saved grid positions
- [ ] Re-apply upgrades tier by tier using UpgradeManager.buyUpgrade()
  (ensures path locks and stat calculations are correct)
- [ ] Tower gold cost is NOT re-deducted (gold was saved post-purchase)
- [ ] Verify tower interactivity works after restore (pointerup select, etc.)

### Offer Restoration
- [ ] OfferManager needs a `restoreFromIds(ids: string[])` method or similar
  that re-activates persistent offers without showing the selection UI
- [ ] One-time offers (salvage, etc.) that were already consumed should NOT
  be re-granted

### WebGL Context Loss Handling
- [ ] Add `webglcontextlost` event listener on the canvas element
- [ ] On context loss: pause the game, show a dark overlay with
  "Game paused — tap to resume"
- [ ] On `webglcontextrestored`: attempt to resume, or reload the scene
  from auto-save if rendering is broken

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes — add tests for save/restore serialization
- [ ] Desktop behavior unchanged (auto-save still works but rarely triggers)
- [ ] Auto-save does NOT save sensitive data (no localStorage keys, no meta
  progression — that's already handled by SaveManager)
- [ ] Restored game is playable end-to-end (can complete remaining waves)
- [ ] Performance: serialization takes < 5ms (don't block the game loop)

## Notes

- sessionStorage (not localStorage) is intentional — it clears when the
  browser tab is closed, so stale saves don't linger across sessions. The
  meta-progression save in localStorage (SaveManager) is separate.
- The 30-minute expiry prevents bizarre state if the player comes back
  hours later — better to start fresh than resume a stale wave 3 with a
  forgotten tower layout.
- Tower upgrade restoration by replaying buyUpgrade() calls is safer than
  directly setting internal state — it goes through the same validation
  and stat-application code path.
- This is a common pattern in mobile web games. The key insight: you can't
  prevent the browser from killing your page, but you can save fast enough
  to survive it.
- The `visibilitychange` save is the most important checkpoint — it fires
  just before the browser might kill the page. The wave-end save is the
  backup for cases where visibility change doesn't fire.
