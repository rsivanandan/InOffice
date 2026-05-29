# RTO (Return To Office) — Agent Guide

## Project

React Native (Expo SDK 56) app for tracking office attendance.

```
npx expo start       # dev server
npx expo start --ios # iOS simulator
npx expo start --web # web preview
npx jest              # run 56 tests
npx jest --coverage   # run with coverage (99% lines)
sonar-scanner         # analyze with SonarQube (needs SONAR_TOKEN)
```

## SonarQube

- Local instance at http://localhost:9000 (admin / NayinteMone1824!0)
- Token: `squ_e9f3120056fea5c94f9a27d3768a640bdf186d5c`
- Run: `SONAR_TOKEN=squ_e9f3120056fea5c94f9a27d3768a640bdf186d5c sonar-scanner`

## Architecture

| Path | Purpose |
|------|---------|
| `App.tsx` | Entry — bottom tab navigator (Calendar, Insights) |
| `src/screens/` | Screen components |
| `src/components/` | MonthGrid, DayCell, StatusPicker |
| `src/db/` | SQLite (expo-sqlite) — days table `(date TEXT PK, status TEXT)` |
| `src/types/` | `DayStatus` & `MonthStats` types |

## Key facts

- **Working days** = Monday–Friday only (hardcoded in `InsightsScreen.tsx`)
- **Day statuses**: `in-office`, `absent`, `public-holiday`, `personal-leave`, `sick-leave`
- Long-press a day to toggle in-office/absent; tap for full status picker modal
- Insights shows two percentages: including holidays/leaves, and excluding them (net working days)
- All data stored locally in SQLite via `expo-sqlite`

## Commands

```sh
npx expo install <pkg>   # install Expo-compatible packages
npx tsc --noEmit          # typecheck (typescript is bundled by Expo)
```

## Build & Publish

### Android (local — requires Android Studio)

```sh
./build.sh android-local           # full build (prebuild → gradle assembleRelease)
# APK at: android/app/build/outputs/apk/release/app-release.apk
```

### iOS (cloud via EAS — requires Expo login)

```sh
eas login                          # log into Expo account
eas build:configure                # configure credentials (first time)
./build.sh ios-eas                 # production build via EAS
./build.sh ios-eas-preview         # internal test build via EAS
```

### App Store / Play Store metadata

| Path | Purpose |
|------|---------|
| `store/ios/metadata.json` | App Store metadata |
| `store/android/metadata.json` | Play Store metadata |
| `store/privacy-policy.md` | Privacy policy for both stores |

## Important constraints

- Read https://docs.expo.dev/versions/v56.0.0/ before writing Expo code
- Do NOT add Firebase, auth, or cloud sync unless explicitly asked
- Do NOT add charts libraries unless asked
- Use `date-fns` for date math (already a dependency)
