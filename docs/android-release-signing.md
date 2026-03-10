# Android Release Signing Setup

## 1. Generate the Keystore

Run from WSL or any terminal with `keytool` (comes with JDK):

```bash
cd ~/projects/greentd/game/android

keytool -genkeypair \
  -v \
  -keystore ojibwetd-release.keystore \
  -alias ojibwetd \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_PASSWORD_HERE \
  -keypass YOUR_PASSWORD_HERE \
  -dname "CN=Ojibwe TD, O=dcmichael, L=Duluth, ST=MN, C=US"
```

Replace `YOUR_PASSWORD_HERE` with a strong password. Keep this keystore safe — you can never update the app without it (unless using Play App Signing).

## 2. Create keystore.properties

```bash
cp keystore.properties.example keystore.properties
```

Edit `keystore.properties` and fill in the real passwords:

```properties
storeFile=ojibwetd-release.keystore
storePassword=YOUR_ACTUAL_PASSWORD
keyAlias=ojibwetd
keyPassword=YOUR_ACTUAL_PASSWORD
```

Both `keystore.properties` and `*.keystore` are gitignored.

## 3. Build the Release APK

```bash
cd ~/projects/greentd/game

# Sync web assets first
npm run build && npx cap sync android

# Build release APK
cd android && ./gradlew assembleRelease
```

The signed APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

## 4. Build AAB for Play Store (recommended)

Google Play prefers Android App Bundles:

```bash
cd ~/projects/greentd/game/android
./gradlew bundleRelease
```

The AAB will be at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

## 5. Play App Signing (recommended)

When uploading to Google Play Console for the first time, opt into **Play App Signing**. Google manages the actual signing key and you use your upload key (the one we generated). This way if you lose the keystore, Google can still issue updates.

## 6. Copy to Windows for Upload

```powershell
# From PowerShell
cp "\\wsl$\Ubuntu\home\dmichael\projects\greentd\game\android\app\build\outputs\bundle\release\app-release.aab" "$HOME\Desktop\"
```
