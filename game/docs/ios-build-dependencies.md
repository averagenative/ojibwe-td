# iOS Build Dependencies

## The Problem

The Capacitor plugins ship Swift source code that gets compiled on your machine. Different Xcode/Swift versions can break compilation if the plugin source uses APIs that changed between framework versions.

We hit this on 2025-03-07: Xcode 16.2 (Swift 6.0) broke `@capacitor/splash-screen@8.0.1` and `@capacitor/status-bar@8.0.1` because the Capacitor Swift PM binary at 8.1.0 changed several APIs (`getString` removed from `PluginConfig`, `UIColor(fromHex:)` renamed to `UIColor(argb:)`, `ApplicationDelegateProxy` signature changed).

## Current Working Setup (dmichael's MBP)

| Component | Version |
|---|---|
| macOS | 14.8.4 (Sonoma) |
| Xcode | 16.2 (Build 16C5032a) |
| Swift | 6.0.3 |
| Node | (run `node -v` to check) |
| @capacitor/core | 8.1.0 |
| @capacitor/ios | 8.1.0 |
| @capacitor/cli | 8.1.0 |
| capacitor-swift-pm | 8.1.0 (binary xcframework, resolved via SPM) |
| @capacitor/haptics | 8.0.1 |
| @capacitor-community/keep-awake | 8.0.0 |

### Removed Plugins

These were removed because no stable release is compatible with Swift 6 / Capacitor Swift PM 8.1.0:

- `@capacitor/splash-screen` — replaced by native LaunchScreen storyboard (auto-dismissed)
- `@capacitor/status-bar` — replaced by `Info.plist` keys:
  - `UIStatusBarHidden = true`
  - `UIViewControllerBasedStatusBarAppearance = false`

### AppDelegate Patch

`ios/App/App/AppDelegate.swift` line 46 was updated to match the Capacitor 8.1.0 `ApplicationDelegateProxy` API:

```swift
// Old (worked with Xcode 15 / Swift 5.9):
return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)

// New (works with Xcode 16 / Swift 6.0):
guard let url = userActivity.webpageURL else { return false }
return ApplicationDelegateProxy.shared.application(application, open: url)
```

## Brother's MBP

| Component | Version |
|---|---|
| macOS | 15.x (Sequoia) |
| Xcode | 26.2 |
| Swift | 6.2.3 |
| All other deps | Same npm versions |

Both machines are on Swift 6.x so the current codebase works on both.

## How to Stay in Sync

1. **Both machines should use the same Xcode major version.** This is the root cause of divergence. Either:
   - Both upgrade to Xcode 16.2+ (current state of this repo), or
   - Both use Xcode 15.x (would need to revert the AppDelegate patch and re-add splash-screen/status-bar plugins)

2. **After any `npm install`, always run:**
   ```bash
   npx cap sync ios
   ```

3. **After pulling changes that touch iOS files, in Xcode:**
   - File > Packages > Reset Package Caches
   - Product > Clean Build Folder (Cmd+Shift+K)
   - Build

4. **Lock exact versions** — `package-lock.json` is committed and should be respected. Always use `npm ci` on a fresh clone instead of `npm install` to get exact versions.

## Build Commands

```bash
# Full build + iOS sync
npm run build && npx cap sync ios

# Then open Xcode
npx cap open ios

# Or one-liner
npm run build:ios
```

## Troubleshooting

**"Value of type 'PluginConfig' has no member 'getString'"** or similar Swift compile errors in `node_modules/@capacitor/*`:
- Version mismatch between Capacitor plugins and the Swift PM binary framework
- Check `ios/App/CapApp-SPM/Package.swift` for the `capacitor-swift-pm` version
- Ensure all `@capacitor/*` npm packages are on compatible versions
- If a plugin has no Swift 6-compatible release, remove it and use native alternatives

**Build works on one machine but not another:**
- Compare `xcodebuild -version` and `swift --version` on both machines
- The Capacitor Swift PM is a pre-compiled `.xcframework` — its API surface can differ across Swift versions
