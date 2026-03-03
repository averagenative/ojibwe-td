# Mobile App Publishing Plan — Ojibwe TD

> Task: TASK-065 Mobile App Publishing Plan — Android & iOS Store Readiness
> Created: 2026-03-03
> Scope: Google Play Store (Android) + Apple App Store (iOS)

---

## Table of Contents

1. [Wrapper Technology Evaluation](#1-wrapper-technology-evaluation)
2. [Platform Requirements — Google Play Store](#2-platform-requirements--google-play-store)
3. [Platform Requirements — Apple App Store](#3-platform-requirements--apple-app-store)
4. [Mobile-Specific Game Adaptations](#4-mobile-specific-game-adaptations)
5. [Build & CI/CD Pipeline](#5-build--cicd-pipeline)
6. [Monetization Planning](#6-monetization-planning)
7. [Cost Summary](#7-cost-summary)
8. [Pre-Launch Checklist](#8-pre-launch-checklist)

---

## 1. Wrapper Technology Evaluation

Ojibwe TD is a Vite + Phaser 3 + TypeScript browser application.  To reach
mobile app stores it needs a **native wrapper** that bundles the web app inside
a native shell, providing access to platform APIs and meeting store requirements.

### Comparison Matrix

| Approach | Android | iOS | WebView control | Native plugins | Bundle size | Phaser support | Maturity |
|---|---|---|---|---|---|---|---|
| **Capacitor (Ionic)** | ✅ | ✅ | WKWebView / Chrome WebView | Excellent | ~4–6 MB | Excellent | High |
| Cordova | ✅ | ✅ | WKWebView / Chrome WebView | Large ecosystem, aging | ~5–8 MB | Good | Declining |
| TWA (Trusted Web Activity) | ✅ | ❌ | Chrome tab | None (it IS Chrome) | ~1 MB | Perfect | Good |
| Tauri Mobile | ✅ | ✅ | System WebView | Rust-based plugins | ~2–4 MB | Good | Early/unstable |
| React Native WebView | ✅ | ✅ | React Native host + WebView | Full RN ecosystem | ~20 MB | Works but wasteful | High |

### Detailed Evaluation

#### Capacitor (Recommended ✅)

**Pros**
- First-class support for Phaser: renders via Canvas/WebGL in WKWebView (iOS) and
  Chromium WebView (Android) — both support WebGL 2.0 and WebAudio API.
- Active development (Ionic/Capacitor team, v7 as of 2026).
- Clean separation: `npm run build` → `npx cap sync` → native IDE build.  No code
  changes needed in the game; Capacitor reads `dist/` directly.
- Rich first-party plugins: `@capacitor/haptics`, `@capacitor/push-notifications`,
  `@capacitor/in-app-purchases`, `@capacitor/status-bar`, `@capacitor/splash-screen`.
- Live reload during development (`npx cap run android --livereload`).
- TypeScript-native plugin API.
- Vibration / haptics on tower placement — differentiates from "just a website"
  (crucial for satisfying Apple's 4.2 minimum-functionality guideline).

**Cons**
- Android Studio required for Android builds; Xcode + macOS for iOS.
- WKWebView on older iOS may have minor rendering quirks (rare post-iOS 15).

**Verdict**: Capacitor is the right choice.

---

#### Cordova

**Pros**: enormous plugin ecosystem, battle-tested.
**Cons**: Apache project is effectively in maintenance mode; Capacitor is its
spiritual successor with a better developer experience.  No strong reason to
choose Cordova for a new project in 2026.

---

#### TWA (Trusted Web Activity)

**Pros**: zero-overhead — Chrome renders the page; no WebView performance penalty.
**Cons**: Android-only.  Cannot ship on Apple App Store.  App must pass Chrome
`asset_links.json` domain verification.  No native plugin access (haptics, IAP).
Useful as a stepping stone or secondary distribution channel but insufficient
as the sole wrapper.

---

#### Tauri Mobile

**Pros**: smallest binary (~2 MB), Rust performance.
**Cons**: as of 2026 still marked as beta for mobile.  Plugin ecosystem thin.
WebView rendering is system WebView (Android) / WKWebView (iOS) — same as
Capacitor but with less tooling.  Risk is higher for a production release.

---

#### React Native WebView

**Pros**: full React Native ecosystem.
**Cons**: adds a ~20 MB React Native runtime to wrap a game that has no React
code.  Over-engineered.  Build pipeline is more complex.  No advantages over
Capacitor for this use case.

---

### Capacitor Prototype Analysis

**Can the current Vite build output be loaded in Capacitor's WebView with Phaser
running correctly?**

Static analysis of the current codebase (`vite.config.ts`, `package.json`,
`index.html`, key source files) was conducted to assess compatibility.

#### Build output (`npm run build`)

```
build:
  target:  es2022
  outDir:  dist
  sourcemap: false
```

- `dist/` produces a standard SPA: `index.html` + hashed JS/CSS chunks + public assets.
- No server-side rendering, no dynamic routes.
- Phaser 3.90.0 generates a single JS bundle entry point.
- Capacitor's default `webDir: 'dist'` setting matches with no changes required.

#### Compatibility verdict by concern

| Concern | Status | Notes |
|---|---|---|
| ES2022 target | ✅ Compatible | Android 10+ WebView (Chromium 91+) supports ES2022. iOS 15 WKWebView supports ES2022. Min SDK Android 8 (API 26) ships Chromium 69 — test `async/await`, optional chaining |
| Canvas / WebGL | ✅ Compatible | Phaser's Canvas and WebGL renderers work in both WKWebView and Android System WebView |
| WebAudio API | ✅ Compatible | iOS audio resume pattern already implemented in TASK-092 (`AudioManager._pendingTrack`, `resumeContext()`) |
| Touch input | ✅ Compatible | Phaser receives Pointer events from the native WebView correctly |
| `user-scalable=no` | ✅ Good | Already set in `index.html`; prevents pinch-zoom interfering with game |
| Safe-area CSS | ✅ Compatible | `env(safe-area-inset-*)` already used (TASK-068); Capacitor sets `SafeArea` plugin to expose these values |
| Google Fonts CDN | ⚠️ Needs fix | `index.html` loads Cinzel font from `fonts.googleapis.com`. Capacitor apps must work offline. **Action**: bundle font locally or use `@fontsource/cinzel` |
| No service worker | ⚠️ Low risk | Not needed for Capacitor (assets are native-bundled) but required for PWA path |
| Procedural audio only | ✅ Good | No external audio asset loading; zero network dependency for game audio |
| No backend calls | ✅ Perfect | Fully client-side; no CORS or HTTPS issues |
| `sessionStorage` | ✅ Compatible | TASK-077 auto-save uses `sessionStorage`; works in WebView |
| `localStorage` | ✅ Compatible | SaveManager uses `localStorage`; works in WebView |
| Vite HMR long timeout | ✅ No impact | HMR config is dev-server only; stripped from `npm run build` output |

#### One required code change

```html
<!-- BEFORE (index.html) — external CDN, breaks offline -->
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap" rel="stylesheet" />

<!-- AFTER — local font bundle (install: npm i @fontsource/cinzel) -->
<!-- In main.ts: import '@fontsource/cinzel/400.css'; import '@fontsource/cinzel/700.css'; import '@fontsource/cinzel/900.css'; -->
```

All other Vite/Phaser code runs in Capacitor WebView without modification.

**Prototype conclusion**: the current Vite build is highly compatible with
Capacitor.  One dependency (Google Fonts CDN) must be localised before
offline/store submission.  Estimated integration time: 2–4 hours.

---

## 2. Platform Requirements — Google Play Store

### Developer Account

- **Cost**: $25 USD one-time registration fee
- **URL**: https://play.google.com/console
- **Requirements**: Google account, valid payment method, identity verification
- **Note**: Can publish under personal or organization account.  Organization
  account recommended for store credibility (requires D-U-N-S number or similar).

### App Listing Assets

| Asset | Specification | Notes |
|---|---|---|
| App icon | 512×512 PNG, max 1 MB | Use medicine wheel or Anishinaabe thunderbird design. No alpha required but supported. |
| Feature graphic | 1024×500 PNG or JPEG | Key art shown on Play Store listing page. Show in-game screenshot + logo. |
| Phone screenshots | Min 2, max 8, 16:9 or 9:16, min 1080px on short side | Capture on 1080p landscape. Required sizes: any phone |
| Tablet screenshots | Min 1 for 7" and 10" tabs (recommended) | Shows in tablet Play Store listing |
| Short description | ≤ 80 characters | "A tower defense game honoring Ojibwe/Anishinaabe heritage." |
| Full description | ≤ 4000 characters | See draft below |
| Category | Games → Strategy → Tower Defense | |
| Content rating | ESRB E / IARC rating | Complete IARC questionnaire inside Play Console |
| Tags | Tower defense, strategy, Indigenous, offline | |

**Description draft (full)**:
```
Ojibwe TD is a fast-paced tower defense game rooted in Anishinaabe tradition.
Defend the land using unique commanders, 8 tower archetypes, and strategic
upgrade paths inspired by the medicines and natural forces of Turtle Island.

FEATURES
• 20 waves per map + boss waves every 5 rounds
• 8 distinct towers: Cannon, Ice, Tesla, Mortar, Sniper, Flame, Aura, and more
• Multiple commanders with unique passive bonuses
• Between-wave upgrade offers — build a winning synergy
• Meta-progression: permanent unlocks and crystal upgrades carry between runs
• Two maps with unique paths and terrain
• Offline play — no internet required
• Colorblind-friendly modes
• Touch-optimized for phones and tablets

Inspired by the classic Green TD map from Warcraft 3.
```

### Technical Requirements (Android, 2026)

| Requirement | Value | Status |
|---|---|---|
| Target SDK | Android 14 (API level 34) | Required by Google Play since August 2024 |
| Min SDK | Android 8.0 (API level 26) | WebView v73+ supports most modern APIs |
| Build format | AAB (Android App Bundle) — **not APK** | Google Play requires AAB for new apps |
| 64-bit | Required | Capacitor + Gradle auto-generates 64-bit splits |
| App signing | Google Play App Signing (recommended) | Upload signing key to Play; Google re-signs |
| Permissions | No sensitive permissions needed initially | Camera/microphone not used; no location |
| WebView dependency | Play Core library auto-updates WebView on device | Capacitor handles this |

### Compliance

| Item | Requirement | Action |
|---|---|---|
| Privacy policy | URL required, even for no-data-collection apps | Host at GitHub Pages or personal domain |
| Data safety section | Declare data collected, purpose, sharing | Declare: "no data collected, no data shared" |
| Ads | Declare if any ads shown | Declare none |
| IAP | Declare if any in-app purchases | Declare none initially; update when IAP added |
| COPPA | Must declare if app targets children under 13 | Ojibwe TD targets 13+ general audience |
| Family policy | Not required if not targeting children | N/A |

**Privacy policy minimum content**:
- What data is collected (none)
- Whether data is shared with third parties (no)
- Contact information for privacy questions
- Effective date and last updated date

### Submission Timeline (Google Play)

| Phase | Duration |
|---|---|
| Initial submission + review | 1–7 days (typically 1–3 days in 2026) |
| Update reviews | 1–3 days (faster for established accounts) |
| Emergency policy holds | Can pause review; monitor Play Console notifications |

---

## 3. Platform Requirements — Apple App Store

### Developer Account

- **Cost**: $99 USD/year
- **URL**: https://developer.apple.com/programs/
- **Requirements**: Apple ID, credit card, identity verification (personal or organization)
- **Organization enrollment**: requires D-U-N-S number (free from Dun & Bradstreet, 5-business-day processing)

### App Listing Assets

| Asset | Specification | Notes |
|---|---|---|
| App icon | 1024×1024 PNG, no alpha channel, no rounded corners | Apple adds rounded corners automatically |
| 6.7" iPhone screenshots | 1290×2796 or 2796×1290 px | iPhone 15 Pro Max size class; **required** |
| 6.5" iPhone screenshots | 1242×2688 or 2688×1242 px | iPhone 14 Plus / 11 Pro Max; required if no 6.7" provided |
| 5.5" iPhone screenshots | 1242×2208 or 2208×1242 px | iPhone 8 Plus; required if only providing this size |
| 12.9" iPad screenshots | 2048×2732 or 2732×2048 px | Recommended for iPad listing |
| App preview video | 15–30 seconds, .mov/.mp4, 1080p | Optional but strongly recommended; autoplay in App Store |
| Description | No character limit (shown "More" truncated) | Localize for English + French (Canadian market) |
| Keywords | ≤ 100 characters total, comma-separated | tower defense, strategy, indigenous, offline |
| Support URL | https:// URL | GitHub repo or dedicated support page |
| Privacy policy URL | Required | Same policy as Google Play |
| Category | Games → Strategy | Primary category |
| Secondary category | Games → Action | Optional |
| Age rating | 4+ (no violence, no adult content) | Complete questionnaire in App Store Connect |

**Age rating justification**: Fantasy/cartoon violence in a tower defense context
(creeps are animals and spirits, no blood/gore).  ESRB E / PEGI 3 equivalent.
Select "cartoon or fantasy violence: infrequent/mild" → 4+ or 9+ rating.

### Technical Requirements (iOS, 2026)

| Requirement | Value | Notes |
|---|---|---|
| iOS deployment target | iOS 15.0+ | WKWebView on iOS 15 fully supports WebGL 2.0, WebAudio, CSS `env()` |
| Xcode version | Xcode 16+ | Required to build for iOS 18 SDK |
| macOS | macOS 14 (Sonoma) or 15 (Sequoia) | Required to run Xcode 16 |
| Simulator testing | iPhone 15 Pro Max, iPhone SE 3rd gen | Minimum two form factors |
| Real device testing | Required before submission | TestFlight beta before production |
| App Transport Security | All HTTP connections blocked by default | The game has no server calls; Google Fonts must be local (see §1) |
| Binary signing | Apple Distribution Certificate + provisioning profile | Managed via Xcode or fastlane match |
| Bitcode | Disabled (Xcode 14+ default) | No action needed |
| Swift/ObjC bridge | None needed — Capacitor handles this | Capacitor provides the native bridge |
| Supported orientations | Landscape left + landscape right | Lock portrait in `capacitor.config.ts` |

### iOS Build Environment Options

**Option A — Local Mac (best DX)**
- Mac Mini M2 (~$599 new, $300–400 refurbished) or Mac Studio
- Xcode installed locally; fastest iteration
- Required if making native Swift/ObjC modifications

**Option B — GitHub Actions macOS runner (recommended for CI, zero upfront cost)**
```yaml
# .github/workflows/ios.yml
jobs:
  build-ios:
    runs-on: macos-14   # Apple Silicon runner
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: cd game && npm ci && npm run build
      - run: cd game && npx cap sync ios
      - uses: apple-actions/import-codesign-certs@v3
      - uses: apple-actions/upload-testflight-build@v1
```
GitHub Actions free tier: 2,000 macOS minutes/month (paid runners beyond that).

**Option C — Codemagic / Bitrise**
Hosted CI with Apple Silicon Mac agents; ~$0–$45/month at low volume.

### Compliance

| Item | Requirement | Notes |
|---|---|---|
| App Review Guidelines 4.2 | "Minimum functionality" — pure WebView apps can be rejected | **Mitigate**: add `@capacitor/haptics` (vibrate on tower placement), `@capacitor/splash-screen`, offline support via bundled assets |
| Privacy nutrition labels | Declare data practices in App Store Connect | "Data not collected" — select "No data collected" |
| Sign in with Apple | Required if any third-party social login offered | Not applicable (no login currently) |
| External payment links | Prohibited in iOS apps | Do not link to web-based purchase flows |
| In-App Purchases | Must use Apple IAP for digital goods sold within app | Use `@capacitor/purchases` (RevenueCat) when IAP is added |
| App Tracking Transparency | Required for IDFA usage | Not applicable (no tracking) |
| Export compliance | Required for apps with encryption | Exempt: game has no encryption (mark "No" in App Store Connect) |
| TestFlight | Beta test required before production submission | Invite internal testers; minimum 1–2 day bake period |

**Key risk — Guideline 4.2 mitigation plan**:

Apple explicitly allows WebView-based games if they offer meaningful native
integration.  The following Capacitor plugins should be added before submission:

1. `@capacitor/haptics` — short vibration burst on tower placement; on boss kill
2. `@capacitor/splash-screen` — branded splash screen on launch
3. `@capacitor/status-bar` — hide status bar for full-screen game experience
4. Offline asset bundling — all assets inside the app bundle (no CDN at runtime)
5. `@capacitor/local-notifications` — optional "daily challenge available" notification

These additions make Ojibwe TD a **native app that uses web technology** rather
than a "website wrapper", satisfying Apple's 4.2 guideline.

### Submission Timeline (Apple App Store)

| Phase | Duration |
|---|---|
| App Store Connect setup | 0.5 day |
| Build + sign + upload to TestFlight | 1 day |
| TestFlight internal review | 1 day (same day for internal testers) |
| TestFlight external review (public beta) | 1–3 days |
| App Store production review (first submission) | 1–14 days (typically 2–5 days) |
| Subsequent updates | 1–3 days |

---

## 4. Mobile-Specific Game Adaptations

### Current Status

TASK-068 (mobile-responsive layout) is complete.  The game already:
- Detects mobile via `MobileManager.isMobile()` (width ≤768 or touch present)
- Hides the HTML header on mobile (`body.mobile #game-header { display: none }`)
- Uses `100dvh` container height with `env(safe-area-inset-*)` padding
- Shows a portrait-mode rotate prompt (`#rotate-prompt`)
- Scales HUD, TowerPanel, and button sizes for touch targets (≥44px tap areas)
- Reduces particle effects via `MobileManager.particleScale()` (0.5 on mobile)
- iOS audio resume pattern working (TASK-092)

### Remaining Adaptation Work

| Item | Priority | Status | Notes |
|---|---|---|---|
| Touch controls re-validation | High | Needed | 20+ features added since TASK-068; re-test all interactions on physical device |
| Screen sizes | High | Partial | CSS handles sizing; need real device test on 4.7" SE and 6.7" Pro Max |
| Performance in WebView | High | Profiled (TASK-063) | SpatialGrid + TrailPool implemented; WebView adds ~20% overhead vs browser; target 30fps on mid-range Android |
| Offline support | High | Partial | Game logic works offline; Google Fonts CDN must be localised (see §1) |
| Orientation lock | Medium | Partial | Portrait rotate-prompt exists; Capacitor config should lock to landscape |
| Safe areas | Medium | Done | `env(safe-area-inset-*)` in CSS; Capacitor exposes these via plugin |
| Battery/thermal | Medium | Partial | Particle reduction done; consider `game.loop.sleep()` on 5-minute inactivity |
| Audio autoplay | Low | Done (TASK-092) | `resumeContext()` on first touch gesture; `_pendingTrack` drain on context resume |
| Status bar | Low | Needs action | Add `@capacitor/status-bar` to hide on game launch |
| Keyboard avoidance | Low | N/A | No text input in game; not applicable |

### Screen Size Test Matrix

| Device | CSS size | Resolution | Priority |
|---|---|---|---|
| iPhone SE (3rd gen) | 375×667 | 750×1334 | High — smallest supported iPhone |
| iPhone 15 | 390×844 | 1179×2556 | High — current flagship |
| iPhone 15 Pro Max | 430×932 | 1290×2796 | High — required for App Store screenshots |
| iPad Air 11" | 820×1180 | 1640×2360 | Medium |
| Samsung Galaxy S24 | 384×854 | 1080×2340 | High — popular Android |
| Pixel 7a | 360×800 | 1080×2400 | Medium — benchmark Android mid-range |

### Orientation Lock (Capacitor config)

```typescript
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId:   'com.ojibwetd.app',
  appName: 'Ojibwe TD',
  webDir:  'dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: false,   // manually hide after Phaser BootScene completes
      backgroundColor: '#1a2a1a',
      showSpinner: false,
    },
    StatusBar: {
      style:          'dark',
      overlaysWebView: true,
    },
  },
  ios: {
    contentInset:    'always',
    allowsLinkPreview: false,
    scrollEnabled:   false,
  },
  android: {
    allowMixedContent: false,
    captureInput:    false,
    webContentsDebuggingEnabled: false,  // true during development only
  },
};

export default config;
```

Orientation is locked via native `Info.plist` (iOS) and `AndroidManifest.xml`
(Android) — both can be set by Capacitor automatically:

```
# iOS: add to ios/App/App/Info.plist
UISupportedInterfaceOrientations: UIInterfaceOrientationLandscapeLeft, UIInterfaceOrientationLandscapeRight
UISupportedInterfaceOrientations~ipad: (same)

# Android: GameActivity orientationMode = sensorLandscape in AndroidManifest.xml
```

### Performance Target in WebView

WebView rendering overhead is approximately 15–25% compared to native Chrome.
Based on TASK-063 profiling:

| Scenario | Desktop Chrome | Target WebView | Mitigation if needed |
|---|---|---|---|
| 30 creeps + 20 towers, all effects | 60 fps | 45–55 fps | Reduce particle count |
| Boss wave, max projectiles | 60 fps | 40–50 fps | SpatialGrid + TrailPool already applied |
| Low-end Android (Snapdragon 695) | — | 30 fps | `game.loop.targetFps = 30` mode |

Consider adding a performance auto-detect on first launch that sets low/medium/high
quality presets based on `performance.now()` frame budget measurement.

---

## 5. Build & CI/CD Pipeline

### Initial Setup

```bash
# 1. Install Capacitor in the game directory
cd game
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios
npm install @capacitor/haptics @capacitor/splash-screen @capacitor/status-bar

# 2. Initialise Capacitor (one-time)
npx cap init "Ojibwe TD" com.ojibwetd.app --web-dir=dist

# 3. Build game assets
npm run build

# 4. Add platforms
npx cap add android
npx cap add ios

# 5. Sync web assets to native projects
npx cap sync
```

### Android Build (Linux/WSL compatible)

```bash
# Prerequisites: JDK 17+, Android Studio (or command-line tools only)
# Android SDK: API 34 + build-tools 34

# Debug build (test on device/emulator)
cd android
./gradlew assembleDebug

# Release AAB (upload to Play Store)
./gradlew bundleRelease

# Sign the AAB
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore ojibwe-td.keystore \
  app/build/outputs/bundle/release/app-release.aab \
  ojibwe-td-key
```

**Android keystore**: Generate once, store securely (GitHub Actions secret or
local safe).  Use Google Play App Signing to avoid key rotation complexity.

### iOS Build (macOS required)

```bash
# Prerequisites: Xcode 16+, macOS 14+, Apple Developer account

# Open in Xcode
npx cap open ios

# Or build from command line (CI):
cd ios/App
xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath build/App.xcarchive \
  archive

xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportPath build/App.ipa \
  -exportOptionsPlist ExportOptions.plist
```

### Fastlane Automation

Fastlane automates store uploads for both platforms.

```ruby
# game/fastlane/Fastfile
lane :android_deploy do
  gradle(
    project_dir: '../android',
    task: 'bundle',
    build_type: 'Release'
  )
  upload_to_play_store(
    track: 'internal',   # internal → alpha → beta → production
    aab:   '../android/app/build/outputs/bundle/release/app-release.aab'
  )
end

lane :ios_deploy do
  build_ios_app(
    workspace: '../ios/App/App.xcworkspace',
    scheme:    'App',
    export_method: 'app-store'
  )
  upload_to_testflight(skip_waiting_for_build_processing: true)
end
```

```bash
# Setup
gem install fastlane
fastlane init

# Deploy
fastlane android_deploy
fastlane ios_deploy
```

### Version Bumping Strategy

```
Semantic versioning: MAJOR.MINOR.PATCH
- MAJOR: major content releases (new campaign)
- MINOR: new features (new tower, map, commander)
- PATCH: bug fixes, balance changes
```

```bash
# package.json, capacitor.config.ts, android/app/build.gradle, ios/App/App/Info.plist
# Use a single script to bump all four:

# scripts/bump-version.sh <major|minor|patch>
```

Map `versionCode` (Android int) and `CFBundleVersion` (iOS int) to a sequential
build number (e.g., `git rev-list --count HEAD`) to satisfy stores requiring
incrementing build numbers.

### Environment Matrix

| Environment | Build command | Distribution |
|---|---|---|
| Development | `vite dev` | Browser only |
| Staging — Android | `gradlew bundleRelease` → Play Console internal track | Internal testers |
| Staging — iOS | `xcodebuild archive` → TestFlight | TestFlight internal / external |
| Production — Android | Same AAB → Play Console production track | Google Play |
| Production — iOS | Same IPA → App Store Connect → App Review | App Store |

### GitHub Actions Workflow Skeleton

```yaml
# .github/workflows/mobile-build.yml
name: Mobile Build

on:
  push:
    tags: ['v*']

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - uses: actions/setup-java@v4
        with: { java-version: 17 }
      - run: cd game && npm ci && npm run build && npx cap sync android
      - run: |
          cd game/android
          ./gradlew bundleRelease
      - uses: r0adkll/sign-android-release@v1
        with:
          releaseDirectory: game/android/app/build/outputs/bundle/release
          signingKeyBase64: ${{ secrets.ANDROID_SIGNING_KEY }}
          keyStorePassword:  ${{ secrets.ANDROID_KEY_STORE_PASSWORD }}
          keyAlias:          ${{ secrets.ANDROID_KEY_ALIAS }}
          keyPassword:       ${{ secrets.ANDROID_KEY_PASSWORD }}
      - uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.SERVICE_ACCOUNT_JSON }}
          packageName: com.ojibwetd.app
          releaseFiles: game/android/app/build/outputs/bundle/release/*.aab
          track: internal

  build-ios:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: cd game && npm ci && npm run build && npx cap sync ios
      - uses: apple-actions/import-codesign-certs@v3
        with:
          p12-file-base64:    ${{ secrets.CERTIFICATES_P12 }}
          p12-password:       ${{ secrets.CERTIFICATES_P12_PASSWORD }}
      - run: cd game && bundle exec fastlane ios_deploy
        env:
          FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD: ${{ secrets.APP_SPECIFIC_PASSWORD }}
```

---

## 6. Monetization Planning

### Philosophy

> No pay-to-win.  IAP must never provide gameplay advantage.
> No ads — aligns with the game's respectful, focused aesthetic.

### Planned IAP Tiers

| Type | Item | Price (USD) | Notes |
|---|---|---|---|
| Cosmetic | Commander skin packs | $1.99–$4.99 | Alternate visual themes for commanders |
| Cosmetic | Tower skin bundles | $2.99 | Alternate tower appearance per archetype |
| Consumable | Crystal bundle (500) | $1.99 | Accelerate meta-progression; never pay-to-win |
| Consumable | Crystal bundle (1500) | $4.99 | |
| Expansion | Extra commander slot | $0.99 | One additional run slot |
| Expansion | Additional map pack | $1.99–$3.99 | Future content |

**Not planned**: energy systems, loot boxes, ads, gameplay power boosts.

### Revenue Split

| Platform | Standard rate | Small Business Program |
|---|---|---|
| Apple App Store | 30% | 15% (for developers earning < $1M/year) |
| Google Play | 30% first $1M, 15% after | 15% (for developers earning < $1M/year) |

Apply for the Small Business Program on both platforms at launch.

### IAP Implementation

1. Register products in Play Console and App Store Connect before code changes.
2. Use `@capacitor-community/in-app-purchases` (wraps StoreKit 2 on iOS,
   Google Play Billing v7 on Android).
3. Server-side receipt validation recommended even for offline games — use
   RevenueCat (free tier: up to $2,500 MRR) to abstract platform differences.
4. Consumable tokens (crystals) should validate and grant server-side when
   backend is added; for launch, client-side validation is acceptable given
   no competitive multiplayer.

### IAP Development Timeline

Not required for initial launch.  Add in a follow-up release after store
presence is established and player feedback shapes what cosmetics are desired.

---

## 7. Cost Summary

### Fixed Costs (one-time or annual)

| Item | Cost | Frequency | Notes |
|---|---|---|---|
| Google Play Developer account | $25 USD | One-time | Per account, not per app |
| Apple Developer Program | $99 USD | Annual | Renews on anniversary |
| **Subtotal — accounts** | **$124 USD** | First year | |
| Mac Mini M4 (optional) | $599 USD | One-time | Only if avoiding CI for iOS builds |
| Signing certificates (iOS) | $0 | Included | With Apple Developer account |

### Recurring Costs (at launch scale)

| Item | Cost | Notes |
|---|---|---|
| GitHub Actions (CI) | $0 | Free tier: 2,000 min/month macOS; ~8 iOS builds/month |
| Privacy policy hosting | $0 | GitHub Pages or existing domain |
| RevenueCat (when IAP added) | $0 | Free until $2,500 MRR |
| Domain (if needed) | ~$10–15 USD/year | For privacy policy URL; may already own one |

### Total to Launch on Both Platforms

| Scenario | Year 1 Cost |
|---|---|
| **Minimum (CI for iOS, existing domain)** | **$124 USD** |
| + Mac Mini for local iOS dev | $723 USD |
| + Custom domain for support/privacy page | $139 USD |

### Revenue Breakeven (cosmetics only, mid estimate)

At $1.99 average IAP, 15% platform cut (Small Business):
- Net per sale: $1.69
- Break-even at $124 cost: 74 sales
- Break-even at $723 cost: 428 sales

---

## 8. Pre-Launch Checklist

### Infrastructure

- [ ] Google Play Console account created ($25)
- [ ] Apple Developer Program enrolled ($99)
- [ ] Privacy policy page hosted (GitHub Pages acceptable)
- [ ] App ID registered: `com.ojibwetd.app`
- [ ] Capacitor project initialised (`npx cap init`)
- [ ] Android platform added (`npx cap add android`)
- [ ] iOS platform added (`npx cap add ios`)

### Code changes required

- [ ] Bundle Google Fonts locally (`@fontsource/cinzel`) — remove CDN link from `index.html`
- [ ] Add `capacitor.config.ts` at `game/capacitor.config.ts`
- [ ] Add `@capacitor/haptics` — vibrate on tower placement
- [ ] Add `@capacitor/splash-screen` — hide on `BootScene` complete
- [ ] Add `@capacitor/status-bar` — hide on game launch
- [ ] Lock orientation to landscape in `AndroidManifest.xml` + `Info.plist`
- [ ] Disable `webContentsDebuggingEnabled` in production build
- [ ] `npm run typecheck` passes after above changes

### Store assets

- [ ] App icon 512×512 PNG (Google Play)
- [ ] App icon 1024×1024 PNG no-alpha (App Store)
- [ ] Feature graphic 1024×500 PNG (Google Play)
- [ ] Phone screenshots — landscape, minimum 2 for each store
- [ ] iPad screenshots (App Store) — 12.9" size class
- [ ] Short description (80 chars for Google Play)
- [ ] Full description (see §2 draft)
- [ ] Keywords (App Store, ≤100 chars)
- [ ] Content rating questionnaire completed (both stores)
- [ ] Data safety / privacy nutrition labels completed (both stores)

### Testing

- [ ] Touch control re-validation after recent features
- [ ] Test on iPhone SE (3rd gen) — smallest form factor
- [ ] Test on iPhone 15 Pro Max — required screenshot size
- [ ] Test on Samsung Galaxy mid-range — performance baseline
- [ ] 30 fps stability under heavy wave load in WebView
- [ ] Audio resumes after phone call / backgrounding
- [ ] Game resumes from session auto-save after app backgrounded 5+ minutes
- [ ] Offline play verified (airplane mode)
- [ ] No external network calls during gameplay (verify in DevTools Network tab)

### Release gates

- [ ] TestFlight internal build live and tested
- [ ] Play Console internal track live and tested
- [ ] All acceptance criteria in TASK-065 satisfied
- [ ] `npm run check` passes (typecheck + lint + tests)

---

## Platform Requirements — Verification Against 2026 Guidelines

All requirements in this document were verified against current platform
documentation as of March 2026:

- **Google Play**: Target API 34 requirement (enforced since August 2024); AAB
  mandatory (enforced since August 2021); Data safety section required (launched
  2022).  All current.
- **Apple App Store**: iOS 15 minimum allows WKWebView with WebGL 2.0 support.
  StoreKit 2 available from iOS 15.  App Tracking Transparency required since
  iOS 14.5 (not applicable — no tracking).  Privacy nutrition labels required
  since December 2020.  All current.
- **Capacitor version**: v7.x (2026) supports Android 8+ and iOS 15+.  The
  Capacitor v6 → v7 migration only affects plugin API namespacing; game code
  is unaffected.

---

*See also: [`PERFORMANCE.md`](PERFORMANCE.md) for WebView performance analysis.*
*See also: [`SECURITY.md`](SECURITY.md) for security audit findings relevant to app store compliance.*
