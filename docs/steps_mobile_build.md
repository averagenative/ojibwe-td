# Mobile Build Steps — Screenshot Evaluation Guide

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

-----------

cd ~/projects/ojibwe-td/game
npm run build:ios

cd ~/projects/ojibwe-td/game && npx cap open ios
