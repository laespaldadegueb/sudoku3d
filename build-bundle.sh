#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_GRADLE="$PROJECT_DIR/android/app/build.gradle"
PACKAGE_JSON="$PROJECT_DIR/package.json"
OUTPUT_DIR="$PROJECT_DIR/android/app/build/outputs/bundle/release"

# Incrementa versionCode a build.gradle
CURRENT_CODE=$(grep -oP 'versionCode \K[0-9]+' "$BUILD_GRADLE")
NEW_CODE=$((CURRENT_CODE + 1))
sed -i "s/versionCode $CURRENT_CODE/versionCode $NEW_CODE/" "$BUILD_GRADLE"
echo "▶ versionCode: $CURRENT_CODE → $NEW_CODE"

# Sincronitza versió a package.json (1.0.<versionCode>)
NEW_VERSION="1.0.$NEW_CODE"
sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" "$PACKAGE_JSON"
echo "▶ version: $NEW_VERSION"

echo "▶ Build Vite..."
cd "$PROJECT_DIR"
npm run build

echo "▶ Sync Capacitor..."
npx cap sync android

echo "▶ Generant AAB (bundleRelease)..."
cd "$PROJECT_DIR/android"
./gradlew bundleRelease

echo "✓ Bundle generat v$NEW_VERSION (build $NEW_CODE) a:"
ls -lh "$OUTPUT_DIR"/*.aab
