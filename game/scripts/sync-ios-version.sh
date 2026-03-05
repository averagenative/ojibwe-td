#!/bin/bash
# Sync version from package.json into the Xcode project.
# Usage: bash scripts/sync-ios-version.sh
#
# - MARKETING_VERSION  = package.json "version" (e.g. 0.1.0)
# - CURRENT_PROJECT_VERSION = git commit count (auto-incrementing build number)

set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./package.json').version")
BUILD=$(git rev-list --count HEAD 2>/dev/null || echo "1")

PBXPROJ="ios/App/App.xcodeproj/project.pbxproj"

if [ ! -f "$PBXPROJ" ]; then
  echo "Error: $PBXPROJ not found. Run 'npx cap add ios' first."
  exit 1
fi

sed -i '' "s/MARKETING_VERSION = [^;]*/MARKETING_VERSION = $VERSION/" "$PBXPROJ"
sed -i '' "s/CURRENT_PROJECT_VERSION = [^;]*/CURRENT_PROJECT_VERSION = $BUILD/" "$PBXPROJ"

echo "iOS version synced: $VERSION ($BUILD)"
