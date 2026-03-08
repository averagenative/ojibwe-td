# iOS Build & TestFlight Deployment

## Prerequisites

- Xcode installed with your Apple Developer account signed in (Xcode > Settings > Accounts)
- Node.js and npm installed
- Capacitor CLI available (`@capacitor/cli` in devDependencies)

## 1. Build the Web App & Sync to iOS

```bash
cd game
npm run build
npx cap sync ios
```

## 2. Bump Version (if needed)

Version info lives in `game/ios/App/App.xcodeproj/project.pbxproj`:

- **MARKETING_VERSION** — user-facing version (e.g. `0.1.4`)
- **CURRENT_PROJECT_VERSION** — build number (e.g. `536`), must be unique per upload

You can also update these in Xcode: **App target > General > Identity > Version / Build**

To sync from `package.json`:

```bash
./scripts/sync-ios-version.sh
```

## 3. Check Signing

In Xcode, open `game/ios/App/App.xcworkspace`:

1. Select the **App** target
2. Go to **Signing & Capabilities**
3. Ensure **Team** is set to your Apple Developer account
4. Ensure **Bundle Identifier** matches your App Store Connect app (e.g. `com.ojibwetd.app`)
5. "Automatically manage signing" should be checked

> **Note:** The `project.pbxproj` file contains team-specific signing settings. If another developer has changed the team/bundle ID, you'll need to switch it back to yours locally before archiving.

## 4. Archive

1. Open `game/ios/App/App.xcworkspace` in Xcode
2. Select **Any iOS Device (arm64)** as the build target (not a simulator)
3. **Product > Clean Build Folder** (Shift+Cmd+K) — recommended if signing or bundle ID changed
4. **Product > Archive**
5. Wait for the build to complete — the Organizer window opens automatically

## 5. Upload to App Store Connect

1. In the Organizer, select your archive
2. Click **Distribute App**
3. Choose **App Store Connect > Upload**
4. Walk through the options (defaults are typically fine)
5. Xcode uploads the build directly — no need for Transporter

## 6. TestFlight

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app > **TestFlight** tab
3. The build appears after a few minutes of processing
4. Add testers under **Internal Testing** (or External Testing for wider distribution)
5. Testers receive a notification and can install via the TestFlight app

## 7. App Store Submission (when ready)

1. In App Store Connect, go to **App Store** tab > your version
2. Under **Build**, click "+" and select the uploaded build
3. Fill in: screenshots, description, keywords, "What's New", age rating, privacy declarations
4. Click **Submit for Review**
5. Review typically takes 24-48 hours for first submission

## Troubleshooting

### "No Account for Team" error
Another developer's team ID is in the project. Change the Team in Signing & Capabilities to your own account.

### "No profiles for bundle ID" error
The bundle identifier in the project doesn't match your App Store Connect app. Update it in Signing & Capabilities or directly in `project.pbxproj`.

### Build number not unique
Each TestFlight upload requires a higher `CURRENT_PROJECT_VERSION` than the previous upload. Increment it before archiving.

### Missing App Icon
Ensure `game/ios/App/App/Assets.xcassets/AppIcon.appiconset` contains a complete 1024x1024 icon.
