---
id: TASK-065
title: Mobile App Publishing Plan — Android & iOS Store Readiness
status: done
priority: medium
phase: release
planning: true
---

# Mobile App Publishing Plan — Android & iOS Store Readiness

## Problem

Ojibwe TD is a browser game (Phaser 3 + TypeScript + Vite). To reach mobile
players on the Google Play Store and Apple App Store, we need a native wrapper,
store assets, compliance with platform guidelines, and a build/deploy pipeline.
This is a planning task to document everything needed.

## Goal

Create a complete roadmap for publishing Ojibwe TD as a native mobile app on
both Android (Google Play) and iOS (App Store). Identify the wrapper technology,
required assets, store compliance requirements, costs, and timeline.

## Deliverable

A detailed planning document at `docs/MOBILE-PUBLISHING.md` covering all
sections below.

## Acceptance Criteria

### 1. Wrapper Technology Evaluation
- [ ] Evaluate and recommend ONE wrapper approach:
  - **Capacitor (Ionic)** — modern, Phaser-friendly, good WebView performance,
    native plugin access. Most recommended for Phaser games.
  - **Cordova** — mature but aging, similar to Capacitor, larger plugin ecosystem
  - **TWA (Trusted Web Activity)** — Android only, wraps PWA, simplest approach
    but no iOS support
  - **Tauri Mobile** — Rust-based, small bundle, newer/less proven for games
  - **React Native WebView** — overkill for wrapping an existing web game
- [ ] Document pros/cons of each, recommend Capacitor unless strong reason not to
- [ ] Prototype: can the current Vite build output be loaded in Capacitor's
  WebView with Phaser running correctly?

### 2. Platform Requirements — Google Play Store
- [ ] **Developer account**: Google Play Console ($25 one-time fee)
- [ ] **App listing assets**:
  - App icon: 512×512 PNG (use medicine wheel or thunderbird logo)
  - Feature graphic: 1024×500 PNG
  - Screenshots: minimum 2, recommended 8 (phone + tablet)
  - Short description (80 chars), full description (4000 chars)
  - Category: Games → Strategy → Tower Defense
  - Content rating: IARC questionnaire (likely E for Everyone)
- [ ] **Technical requirements**:
  - Target SDK: Android 14+ (API level 34)
  - Min SDK: Android 8.0 (API level 26) for WebView compatibility
  - App bundle (AAB) format required (not APK)
  - 64-bit support required
  - App signing by Google Play
- [ ] **Compliance**:
  - Privacy policy URL required (even for no-data-collection games)
  - Data safety section (declare: no data collected, no data shared)
  - Ads declaration (none currently)
  - In-app purchases declaration (none currently, plan for future)
  - COPPA compliance if targeting children (we're not, but document)
- [ ] **Timeline**: ~1-2 days for first submission, 1-7 days for review

### 3. Platform Requirements — Apple App Store
- [ ] **Developer account**: Apple Developer Program ($99/year)
- [ ] **App listing assets**:
  - App icon: 1024×1024 PNG (no alpha, no rounded corners — Apple adds them)
  - Screenshots: required for each device class (6.7", 6.5", 5.5" iPhone;
    12.9" iPad). Minimum 1 per class, recommended 3-5.
  - App preview video: optional but recommended (15-30 seconds)
  - Description, keywords, support URL, privacy policy URL
  - Category: Games → Strategy
  - Age rating: 4+ or 9+ (no violence beyond cartoon/fantasy)
- [ ] **Technical requirements**:
  - Xcode + macOS required for building (need a Mac or Mac VM/CI)
  - iOS deployment target: iOS 15+ (for modern WebView/WKWebView)
  - Must support latest iPhone screen sizes
  - App Transport Security: all connections must be HTTPS
  - Binary must be signed with Apple distribution certificate
  - TestFlight for beta testing before submission
- [ ] **Compliance**:
  - App Review Guidelines (especially 4.2 — "minimum functionality" rule:
    WebView apps CAN be rejected if Apple thinks it's "just a website")
  - Mitigation: add native features via Capacitor (haptics, push notifications,
    offline support) to differentiate from web
  - Privacy nutrition labels (declare data practices)
  - Sign in with Apple required if any social login is offered
  - No external payment links (App Store IAP rules)
- [ ] **Timeline**: 1-3 days for build, 1-14 days for review (first submission
  often takes longer)

### 4. Mobile-Specific Game Adaptations
- [ ] **Touch controls**: Verify all gameplay works with touch (TASK mobile-friendly
  was done but needs re-validation after 20+ new features)
- [ ] **Screen sizes**: Test on 4.7" iPhone SE through 6.7" iPhone Pro Max and
  Android tablets
- [ ] **Performance**: WebView performance is ~70-80% of native browser. Profile
  on real devices (relates to TASK-063)
- [ ] **Offline support**: Game should work fully offline (no server calls).
  Service worker for asset caching.
- [ ] **Orientation**: Lock to landscape or support both? (TD games typically
  landscape-only)
- [ ] **Safe areas**: Respect notch/dynamic island on modern iPhones, camera
  cutouts on Android
- [ ] **Battery/thermal**: Monitor for excessive CPU usage that drains battery.
  Consider reducing particle effects on mobile.
- [ ] **Audio**: WebView audio autoplay restrictions — existing pointerdown
  resume pattern should work but test on real devices

### 5. Build & CI/CD Pipeline
- [ ] Capacitor project setup (`npx cap init`)
- [ ] Android build: Gradle → AAB (can build on Linux/WSL)
- [ ] iOS build: Xcode → IPA (requires macOS — GitHub Actions has macOS runners)
- [ ] Fastlane for automated store uploads (both platforms)
- [ ] Version bumping strategy: semver, tied to git tags
- [ ] Environment: dev (browser), staging (TestFlight/internal track), prod (stores)

### 6. Monetization Planning (Document Only)
- [ ] **Free with optional IAP**: cosmetic packs, extra commander slots,
  crystal bundles
- [ ] **No ads** (aligns with game's respectful aesthetic)
- [ ] **No pay-to-win**: IAP should never give gameplay advantage
- [ ] Apple/Google take 30% commission on IAP (15% for small business program)
- [ ] IAP implementation: Capacitor IAP plugin + receipt validation

### 7. Cost Summary
- [ ] Google Play: $25 one-time
- [ ] Apple Developer: $99/year
- [ ] Mac for iOS builds: $0 if using CI (GitHub Actions free tier), or
  ~$500-1500 for Mac Mini
- [ ] Domain for privacy policy: likely already have one, or use GitHub Pages
- [ ] Total minimum: ~$125 to launch on both platforms

### Guards
- [ ] Document created at `docs/MOBILE-PUBLISHING.md`
- [ ] All platform requirements verified against current (2026) store guidelines
- [ ] Capacitor prototype tested with current Vite build output
- [ ] Cost and timeline estimates included

## Notes

- Capacitor is the strongest choice for Phaser games — it wraps the web app in
  a native WebView with full plugin access (haptics, push, IAP, etc.)
- The biggest iOS risk is Apple's 4.2 guideline rejection for "minimum
  functionality". Adding native features (haptics on tower placement, push
  notifications for daily rewards) helps avoid this.
- Consider PWA as a stepping stone: add a service worker and manifest.json to
  make the game installable from the browser before doing full native wrappers.
  This gives mobile access immediately with no store submission.
- The Ojibwe cultural content is a strength for store listings — unique
  positioning in the TD category, educational value angle for age ratings
- Plan for localization: Ojibwe language elements in the game could be a
  feature highlight, but store descriptions should be in English (+ French for
  Canadian market)
