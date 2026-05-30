# RTO (Return To Office) — Agent Guide

## Project

React Native (Expo SDK 56) app for tracking office attendance. This app is for both IOS and Android.

## KEY INSIGHTS

Before making any changes, ensure that it works for both IOS and Android. DO NOT break one for the other.

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

| Path              | Purpose                                                         |
| ----------------- | --------------------------------------------------------------- |
| `App.tsx`         | Entry — bottom tab navigator (Calendar, Insights)               |
| `src/screens/`    | Screen components                                               |
| `src/components/` | MonthGrid, DayCell, StatusPicker                                |
| `src/db/`         | SQLite (expo-sqlite) — days table `(date TEXT PK, status TEXT)` |
| `src/types/`      | `DayStatus` & `MonthStats` types                                |

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
export RTO_KEYSTORE_PASSWORD="<password>"
./build.sh android-local           # full build (prebuild → gradle assembleRelease)
# APK at: android/app/build/outputs/apk/release/app-release.apk
```

Keystore: `android/app/inoffice-release.keystore` (alias: `inoffice`)
Password via env var `RTO_KEYSTORE_PASSWORD` or Gradle property of same name.
**Never commit the keystore or password** — they are gitignored by `/android`.

### Android (EAS — AAB for Play Store)

```sh
eas login                          # log into Expo account
eas build:configure                # configure credentials (first time)
./build.sh android-eas             # production AAB build via EAS
```

Upload credentials and keystore to Expo when prompted during first EAS build.

### iOS (cloud via EAS — requires Expo login)

```sh
eas login                          # log into Expo account
eas build:configure                # configure credentials (first time)
./build.sh ios-eas                 # production build via EAS
./build.sh ios-eas-preview         # internal test build via EAS
```

### Play Store listing

| Item            | Path / Note                                                                    |
| --------------- | ------------------------------------------------------------------------------ |
| Metadata        | `store/android/metadata.json`                                                  |
| Privacy policy  | `store/privacy-policy.md` (host at `https://rsivanandan.com/inoffice/privacy`) |
| Screenshots     | `store/android/screenshots/` (phone screenshots, at least 2)                   |
| Developer email | Set to `rsivanandan@gmail.com` in metadata                                     |
| App signing     | Keystore at `android/app/inoffice-release.keystore` (keep safe!)               |

## Important constraints

- Read https://docs.expo.dev/versions/v56.0.0/ before writing Expo code
- Do NOT add Firebase, auth, or cloud sync unless explicitly asked
- Do NOT add charts libraries unless asked
- Use `date-fns` for date math (already a dependency)
