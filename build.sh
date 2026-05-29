#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 {android-local|ios-eas|ios-eas-preview|all}"
  echo ""
  echo "  android-local     Build Android locally via Gradle (APK)"
  echo "  ios-eas           Build iOS via EAS Build (Production)"
  echo "  ios-eas-preview   Build iOS via EAS Build (Internal)"
  echo "  all               Run tests, then android-local + ios-eas"
  exit 1
}

CMD="${1:-}"

if [ -z "$CMD" ]; then
  usage
fi

case "$CMD" in
  android-local)
    echo "=== Running tests ==="
    npx jest --selectProjects "Unit Tests"
    echo ""
    echo "=== Prebuilding native project ==="
    npx expo prebuild --platform android --clean
    echo ""
    echo "=== Building Android APK (Release) ==="
    cd android
    ./gradlew assembleRelease
    cd ..
    echo ""
    echo "✅ APK at: android/app/build/outputs/apk/release/app-release.apk"
    ;;

  ios-eas)
    echo "=== Running tests ==="
    npx jest --selectProjects "Unit Tests"
    echo ""
    echo "=== Building iOS via EAS (Production) ==="
    eas build --platform ios --profile production --non-interactive
    ;;

  ios-eas-preview)
    echo "=== Running tests ==="
    npx jest --selectProjects "Unit Tests"
    echo ""
    echo "=== Building iOS via EAS (Preview) ==="
    eas build --platform ios --profile preview --non-interactive
    ;;

  all)
    echo "=== Running tests ==="
    npx jest
    echo ""
    echo "=== Prebuilding ==="
    npx expo prebuild --clean
    echo ""
    echo "=== Building Android ==="
    cd android
    ./gradlew assembleRelease
    cd ..
    echo ""
    echo "=== Building iOS via EAS ==="
    eas build --platform ios --profile production --non-interactive
    echo ""
    echo "✅ Android APK at: android/app/build/outputs/apk/release/app-release.apk"
    echo "✅ iOS build queued via EAS — check https://expo.dev"
    ;;

  *)
    usage
    ;;
esac
