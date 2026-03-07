# Mobile UI Audit — Screenshot Evaluation Guide

## Prerequisites (Xcode Setup)

1. Install **Xcode** from the Mac App Store (~12GB)
2. After install:
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   sudo xcodebuild -license accept
   ```
3. Build & sync:
   ```bash
   cd ~/projects/ojibwe-td/game
   npm run build:ios
   ```
4. Open in Xcode:
   ```bash
   npx cap open ios
   ```
5. In Xcode: select your iPhone, set Signing Team (target > Signing & Capabilities > your Apple ID), hit Cmd+R

---

## How the Layout System Works

- **Fixed logical canvas**: 720px height, width expands to match device aspect ratio on mobile
- **Scale mode**: `Phaser.Scale.FIT` + `CENTER_BOTH` — canvas scales uniformly to fill viewport
- **Mobile detection**: `MobileManager.isMobile()` — binary toggle (`innerWidth <= 768 || ontouchstart`)
- **Font scaling**: `mfs(basePx)` scales fonts 1.7x on mobile
- **Tap targets**: `minTapTarget()` ensures >= 44 physical px
- **No percentage-based layout** — all positioning is absolute pixel coords in the 1280x720+ logical space
- **Binary mobile/desktop fork** — hardcoded `isMobile ? X : Y` values per component

### Key Risk Areas
- iPhone aspect ratio is ~19.5:9 vs desktop 16:9, so `GAME_W` grows from 1280 to ~1560
- Hardcoded X positions (e.g. `x = 640` for "center") will be off-center on wider canvases
- Elements anchored to edges with fixed offsets may land in notch/Dynamic Island area
- The 1.7x font scale can cause text overflow in tight containers

---

## Screens to Screenshot & Evaluate

For each screen, take a screenshot and note issues.

### 1. Main Menu
- **File**: `src/scenes/MainMenuScene.ts`
- **Check**: Logo placement, button sizing/spacing, safe area at top/bottom edges

### 2. Commander Select
- **File**: `src/scenes/CommanderSelectScene.ts`
- **Check**: Card layout, text readability, centering on wide aspect ratio

### 3. Map / Challenge Select
- **Files**: `src/scenes/MainMenuScene.ts`, `src/scenes/ChallengeSelectScene.ts`
- **Check**: Grid layout, touch targets, horizontal spacing on wide screen

### 4. In-Game HUD
- **Files**: `src/ui/HUD.ts`, `src/scenes/GameScene.ts`
- **Check**: Lives/gold/wave counters, tower build buttons, safe area offsets (top + bottom), map centering

### 5. Tower Upgrade Panel
- **Files**: `src/ui/TowerUpgradePanel.ts` (or similar)
- **Check**: Path buttons, tier text, sell/upgrade button sizes, bottom safe area

### 6. Between-Wave Offers
- **File**: `src/scenes/BetweenWaveScene.ts`
- **Check**: Card sizing, text overflow from 1.7x scaling, scroll behavior, card spacing

### 7. Game Over
- **File**: `src/scenes/GameOverScene.ts`
- **Check**: Stats layout, button placement, centering

### 8. Meta Menu (Unlock Tree)
- **File**: `src/scenes/MetaMenuScene.ts`
- **Check**: Node sizing, scroll/pan, text readability, edge clipping

### 9. Codex
- **File**: `src/scenes/CodexScene.ts`
- **Check**: Tab sizing (44px touch targets?), entry list, detail panel text

### 10. Achievements
- **File**: `src/scenes/AchievementsScene.ts`
- **Check**: Grid layout, badge sizing, tab touch targets

### 11. Inventory / Gear Equip
- **Files**: `src/scenes/InventoryScene.ts`, `src/scenes/TowerEquipScene.ts`
- **Check**: Slot sizing, drag targets, text overflow

### 12. Settings / Audio Panel
- **File**: `src/ui/AudioSettingsPanel.ts`
- **Check**: Slider sizing, toggle touch targets, panel positioning

---

## What to Check Per Screen

| Issue Type | What to Look For |
|---|---|
| Safe area clipping | Elements hidden behind notch, Dynamic Island, or home indicator |
| Tap targets | Buttons/controls < 44px physical (use `minTapTarget()` check) |
| Text overflow | 1.7x font scaling causing text to escape containers |
| Off-center elements | Hardcoded X positions wrong on 19.5:9 (should use `scale.width / 2`) |
| Edge anchoring | Fixed-offset elements landing in wrong spot on wider canvas |
| Spacing breakage | `isMobile ? N : M` values that don't account for varying screen sizes |
| Readability | Text too small even with 1.7x, or contrast issues |

---

## Issue Log

Use this section to record findings per screen.

### Main Menu
- [ ] _screenshot pending_
- Issues:

### Commander Select
- [ ] _screenshot pending_
- Issues:

### Map Select
- [ ] _screenshot pending_
- Issues:

### In-Game HUD
- [ ] _screenshot pending_
- Issues:

### Tower Upgrade Panel
- [ ] _screenshot pending_
- Issues:

### Between-Wave Offers
- [ ] _screenshot pending_
- Issues:

### Game Over
- [ ] _screenshot pending_
- Issues:

### Meta Menu
- [ ] _screenshot pending_
- Issues:

### Codex
- [ ] _screenshot pending_
- Issues:

### Achievements
- [ ] _screenshot pending_
- Issues:

### Inventory / Gear Equip
- [ ] _screenshot pending_
- Issues:

### Settings / Audio
- [ ] _screenshot pending_
- Issues:

---

## Code-Level Audit Results

### Scenes

| Component | File | Category | Issues |
|-----------|------|----------|--------|
| BootScene | `scenes/BootScene.ts` | Mixed | Uses `scale.width/2` for centering. Has `isMobile` ternary with hardcoded offsets (logoY, titleOffset, btnW, btnH). No `minTapTarget()`. |
| MainMenuScene | `scenes/MainMenuScene.ts` | Mixed | Has `_isMobile` detection. Uses grid overlay + some relative positioning. Needs deeper screenshot validation. |
| CommanderSelectScene | `scenes/CommanderSelectScene.ts` | Mixed | Uses `scale.width/2` + `_fs()`. **Back button x=80 HARDCODED** (line ~230). Button Y: `height - (isMobile ? 64 : 60)` hardcoded offset. |
| GameScene | `scenes/GameScene.ts` | Relative | Uses `getHudHeight()` helper, `scale.width/2`, `MAP_OFFSET_X` for safe area. Good. |
| BetweenWaveScene | `scenes/BetweenWaveScene.ts` | ? | Needs screenshot validation — card sizing with 1.7x text is main concern. |
| GameOverScene | `scenes/GameOverScene.ts` | Mixed | Uses hardcoded `y: 100` patterns. Needs review. |
| MetaMenuScene | `scenes/MetaMenuScene.ts` | Relative | Uses `scale.width/2`. Tabs at hardcoded offsets (cx-200, cx, cx+200). Scrollable container with masking. Good overall. |
| CodexScene | `scenes/CodexScene.ts` | Relative | Uses `scale.width/2` + `_fs()`. Tab layout computed. Good. |
| AchievementsScene | `scenes/AchievementsScene.ts` | Relative | Uses `scale.width/2` + `_fs()`. Flow layout with constants. Good. |
| ChallengeSelectScene | `scenes/ChallengeSelectScene.ts` | Mixed | Uses `scale.width/2`. **No font scaling** — hardcoded '30px'. `CARD_TOP=110` hardcoded. No `minTapTarget()`. |
| InventoryScene | `scenes/InventoryScene.ts` | **Hardcoded** | **`GRID_LEFT=40`, `GRID_TOP=140` hardcoded. No `_isMobile`. No `_fs()` or `mfs()`. All font sizes hardcoded ('30px', '18px', '14px', etc). No `minTapTarget()`.** |
| TowerEquipScene | `scenes/TowerEquipScene.ts` | ? | Needs review. |
| CutsceneScene | `scenes/CutsceneScene.ts` | Mixed | Has `_isMobile`. Skip button dimensions hardcoded (90x44 mobile). Portrait slide offset 100px hardcoded. No `minTapTarget()`. |

### UI Components

| Component | File | Category | Issues |
|-----------|------|----------|--------|
| HUD | `ui/HUD.ts` | **Excellent** | Flow-layout cursor pattern (`_leftCursorX`, `_rightCursorX`). Uses `mfs()`, `SAFE_INSET`. No hardcoded positions. Best practice. |
| TowerPanel | `ui/TowerPanel.ts` | Good | Uses `mfs()`. BTN_SIZE: 84 mobile / 52 desktop. LEFT_INSET=24 for safe area. Good. |
| UpgradePanel | `ui/UpgradePanel.ts` | Good | Uses `mfs()` + `SAFE_INSET`. Column widths: `Math.floor(width/3)`. Good. |
| BehaviorPanel | `ui/BehaviorPanel.ts` | Good | Uses `mfs()` + `SAFE_INSET`. Button widths computed. Good. |
| AudioSettingsPanel | `ui/AudioSettingsPanel.ts` | Good | Uses `mfs()`. PANEL_W: 500 mobile / 360 desktop. Buttons 44px mobile. Good. |
| CommanderPortrait | `ui/CommanderPortrait.ts` | Good | Size: 64 mobile / 48 desktop. Tooltip clamped to screen edges. Good. |
| WaveBanner | `ui/WaveBanner.ts` | Good | Position relative to HUD_HEIGHT. Uses `scale.width/2`. Good. |
| MultiTowerPanel | `ui/MultiTowerPanel.ts` | Good | Uses `scene.scale.width/2`. Column widths computed. Good. |
| MoonRatingDisplay | `ui/MoonRatingDisplay.ts` | **Excellent** | Fully procedural, zero hardcoded positions. Best practice. |
| VignetteOverlay | `ui/VignetteOverlay.ts` | Mixed | **No `mfs()`** — text sizes hardcoded ('28px', '18px', '16px'). Portrait size 64px hardcoded. |
| BossOfferPanel | `ui/BossOfferPanel.ts` | Mixed | Card width responsive: `Math.min(680, width-48)`. **Text sizes hardcoded** ('16px', '17px', '13px') — no `mfs()`. |

### Font Scaling Inconsistency

Two different scaling helpers are in use:
- `mfs()` in `MobileManager.ts` — **1.7x** on mobile (used by HUD, TowerPanel, UpgradePanel, BehaviorPanel, AudioSettingsPanel)
- `_fs()` local helper in scenes — **1.35x** on mobile (used by AchievementsScene, MetaMenuScene, CommanderSelectScene, CodexScene, CutsceneScene)

Consider standardizing on one multiplier.

---

## Prioritized Fix List (from code audit)

### HIGH — Mobile-Breaking
1. **InventoryScene**: Entirely hardcoded layout, no font scaling, no mobile awareness
2. **ChallengeSelectScene**: No font scaling, hardcoded layout constants

### MEDIUM — Fragile / Inconsistent
3. **CommanderSelectScene**: Back button x=80 hardcoded (off-center on wide screens)
4. **VignetteOverlay**: No `mfs()` — text won't scale on mobile
5. **BossOfferPanel**: Text sizes hardcoded, no `mfs()`
6. **CutsceneScene**: Skip button sizes hardcoded, no `minTapTarget()`
7. **Font scale inconsistency**: 1.35x vs 1.7x across codebase

### LOW — Polish
8. **No component uses `minTapTarget()`** — button sizes are manually set to 44+px but not computed
9. **SAFE_INSET not used universally** — only HUD and in-game panels respect it
10. **GameOverScene**: Likely has hardcoded Y positions, needs review

---

## Next Steps

After filling in the issue log with screenshots:
1. Prioritize by severity (blocking > annoying > cosmetic)
2. Group related fixes (e.g. all "needs scale.width/2 centering" fixes together)
3. Break into implementation tasks
4. Consider introducing a layout helper system to replace scattered `isMobile ? X : Y` branches
