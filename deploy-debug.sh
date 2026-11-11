#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "▶ Build Vite..."
cd "$PROJECT_DIR"
npm run build

echo "▶ Sync Capacitor..."
npx cap sync android

echo "▶ Instal·lant al mòbil (installDebug)..."
cd "$PROJECT_DIR/android"
./gradlew installDebug

echo "✓ Instal·lació completada."
