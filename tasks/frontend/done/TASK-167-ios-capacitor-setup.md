---
id: TASK-167
title: iOS App — Capacitor Setup & First Xcode Build
status: done
priority: high
blocked_reason: Requires macOS + Xcode — must be run on a Mac (brother's machine)
phase: release
---

# iOS App — Capacitor Setup & First Xcode Build

Get Ojibwe TD running as a native iOS app via Capacitor. This task is designed
to be executed by **Claude CLI on a Mac with Xcode**. The operator has TestFlight
set up and iPhones available for testing.

---

## Context for Claude CLI

- The game lives in `game/` — it's a Vite + Phaser 3 + TypeScript browser game
- The game is already mobile-responsive (TASK-068) with iOS audio fixes (TASK-092)
- Save data uses `localStorage` (works in WKWebView)
- All game logic is client-side, no server calls — fully offline capable
- The game should be **landscape-only**
- Target iOS 15+ for modern WKWebView support
- See TASK-065 / `docs/MOBILE-PUBLISHING.md` for full publishing plan context

---

## Step 1 — Install Dependencies & Build the Web App

```bash
cd game
npm install
npx vite build
```

Produces `game/dist/`. Verify with `npx vite preview` if needed.

---

## Step 2 — Initialize Capacitor

From `game/`:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Ojibwe TD" com.ojibwetd.app --web-dir dist
```

Edit the generated `capacitor.config.ts`:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ojibwetd.app',
  appName: 'Ojibwe TD',
  webDir: 'dist',
  ios: {
    preferredContentMode: 'mobile',
  },
};

export default config;
```

---

## Step 3 — Add iOS Platform + Plugins

```bash
npm install @capacitor/ios
npx cap add ios

# Plugins for native features (helps avoid Apple 4.2 rejection)
npm install @capacitor/status-bar @capacitor/haptics @capacitor/splash-screen
npx cap sync ios
```

This creates `game/ios/` with a full Xcode project.

---

## Step 4 — iOS Configuration

### 4a. Lock to Landscape

Edit `ios/App/App/Info.plist` — set landscape-only orientations:

```xml
<key>UISupportedInterfaceOrientations</key>
<array>
  <string>UIInterfaceOrientationLandscapeLeft</string>
  <string>UIInterfaceOrientationLandscapeRight</string>
</array>
<key>UISupportedInterfaceOrientations~ipad</key>
<array>
  <string>UIInterfaceOrientationLandscapeLeft</string>
  <string>UIInterfaceOrientationLandscapeRight</string>
</array>
```

### 4b. Safe Areas (Notch / Dynamic Island)

In `game/index.html`, update the viewport meta tag:

```html
<meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

Add safe area padding in `game/index.html` `<style>` block:

```css
body {
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}
```

> **Test note**: Run on a notched simulator (iPhone 15/16). If HUD elements
> are clipped, the game's `HUD.ts` and `MobileManager.ts` have margin
> constants that can be adjusted.

### 4c. Status Bar + Haptics Integration

Create `game/src/capacitor-init.ts`:

```typescript
/**
 * Capacitor native API initialization — only runs when inside the native
 * iOS/Android shell, no-ops in browser.
 */
export async function initCapacitorNative(): Promise<void> {
  if (!(window as any).Capacitor) return;

  const { StatusBar, Style } = await import('@capacitor/status-bar');
  await StatusBar.setStyle({ style: Style.Dark });
  await StatusBar.hide();
}

/**
 * Trigger haptic feedback on tower placement / button press.
 * Call from GameScene.tryPlaceTower() and HUD button handlers.
 */
export async function hapticLight(): Promise<void> {
  if (!(window as any).Capacitor) return;
  const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
  await Haptics.impact({ style: ImpactStyle.Light });
}
```

Call `initCapacitorNative()` from `game/src/main.ts` at startup (before Phaser
game config). Call `hapticLight()` from `GameScene.tryPlaceTower()` on
successful placement — this adds a native feel and helps avoid Apple's 4.2
"minimum functionality" rejection.

### 4d. Prevent Sleep

```bash
npm install @capacitor-community/keep-awake
npx cap sync ios
```

Add to `capacitor-init.ts`:

```typescript
export async function keepScreenAwake(): Promise<void> {
  if (!(window as any).Capacitor) return;
  const { KeepAwake } = await import('@capacitor-community/keep-awake');
  await KeepAwake.keepAwake();
}
```

Call from `GameScene.create()`.

---

## Step 5 — App Icons & Launch Screen

### App Icon

Need 1024×1024 PNG — no transparency, no rounded corners (Apple adds them).
Use the logo at `game/public/assets/ui/logo.png` as the source. Resize to
1024×1024 and place at:

```
ios/App/App/Assets.xcassets/AppIcon.appiconset/
```

Update the corresponding `Contents.json` to reference the new file.

### Launch Screen

Edit `ios/App/App/Base.lproj/LaunchScreen.storyboard`:
- Set background color to `#0a0e0a` (matches the game's dark forest bg)
- Center the app icon or "OJIBWE TD" text

---

## Step 6 — Build & Sync

```bash
cd game
npx vite build && npx cap sync ios
```

Then open Xcode:
```bash
npx cap open ios
```

In Xcode:
1. Set **Team** under Signing & Capabilities (Apple Developer account)
2. Verify **Bundle Identifier** is `com.ojibwetd.app`
3. Select a connected iPhone or Simulator
4. **Cmd+R** to build and run

---

## Step 7 — TestFlight Build

TestFlight is already set up. To push a new build:

1. Xcode → Product → Archive
2. Window → Organizer → select archive → Distribute App → App Store Connect
3. Build appears in TestFlight within ~15 minutes after processing
4. Test on physical iPhones

---

## Testing Checklist

- [ ] Game loads and shows main menu
- [ ] Touch controls work (tower placement, drag, tap)
- [ ] Audio plays after first tap (iOS audio unlock)
- [ ] No content clipped by notch/Dynamic Island
- [ ] Landscape orientation locked (no portrait rotation)
- [ ] Save/load works across app restarts
- [ ] Performance smooth on target devices
- [ ] Haptic feedback fires on tower placement
- [ ] Status bar hidden during gameplay
- [ ] Screen doesn't sleep during a run
- [ ] Give Up dialog displays correctly with forfeit warning
- [ ] All modals/panels (upgrade, offer, boss loot) display correctly

---

## Apple Guideline 4.2 Mitigation

Apple rejects WebView-only apps for "minimum functionality." The native
features above (haptics, status bar, keep-awake) help. If Apple still pushes
back, also add:

- **Local notifications** (`@capacitor/local-notifications`): "Your daily
  challenge is ready" reminder
- **Native share** (`@capacitor/share`): share run results / screenshots
- **App Tracking Transparency** (`@capacitor/app`): shows Apple you're using
  native frameworks even if you don't track

---

## Quick Reference

```bash
cd game

# Full rebuild + sync:
npx vite build && npx cap sync ios

# Open Xcode:
npx cap open ios

# Live reload (dev — set server.url in capacitor.config.ts first):
npx vite --host
npx cap sync ios
# Then run from Xcode — game hot-reloads

# Update plugins:
npm update @capacitor/core @capacitor/ios
npx cap sync ios
```

---

## Files Created/Modified

- `game/capacitor.config.ts` — Capacitor config
- `game/ios/` — Xcode project (generated by Capacitor)
- `game/src/capacitor-init.ts` — native API wrappers (status bar, haptics, keep-awake)
- `game/src/main.ts` — import and call `initCapacitorNative()`
- `game/index.html` — viewport-fit=cover, safe area CSS
- `game/package.json` — Capacitor dependencies added

## Notes

- Android builds can be done on Linux/WSL — separate task
- `localStorage` works in WKWebView but iOS may purge in extreme low-storage
  situations. If save loss becomes an issue, migrate to `@capacitor/preferences`.
- The `ios/` folder can be committed to git or regenerated from `npx cap add ios`
