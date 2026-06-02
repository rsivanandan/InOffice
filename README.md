# InOffice — Return To Office Tracker

React Native (Expo SDK 56) app for tracking office attendance days. Data stored locally in SQLite. It is for both IOS and Android.

## KEY INFO

Before making any changes, it should ensure that nothing breaks on both IOS or Android.

## Git Workflow

- All development on `development` branch
- Only merge to `master` for releases
- Commit messages: descriptive, imperative mood

## Tech Stack

| Layer        | Choice                                                     |
| ------------ | ---------------------------------------------------------- |
| Framework    | React Native 0.85 + Expo SDK 56                            |
| Navigation   | `react-native-tab-view` + custom bottom tab bar            |
| Storage      | `expo-sqlite` with SQL-level backup/restore                |
| Date math    | `date-fns`                                                 |
| Spreadsheets | `xlsx` (import/export Excel)                               |
| Testing      | Jest + `@testing-library/react-native` (99% line coverage) |
| Quality      | SonarQube (local instance)                                 |

## Quick Start

```sh
npm install
npx expo prebuild
npx expo start
```

| Command                | Description       |
| ---------------------- | ----------------- |
| `npx expo start`       | Dev server        |
| `npx expo start --ios` | iOS simulator     |
| `npx expo start --web` | Web preview       |
| `npx jest`             | Run 62 tests      |
| `npx jest --coverage`  | Run with coverage |
| `npx tsc --noEmit`     | TypeScript check  |

## Architecture

```
App.tsx                  Entry — TabView with 4 tabs (swipeable)
src/screens/
  DashboardScreen.tsx    Current month stats + daily scatter
  CalendarScreen.tsx     MonthGrid with scrollable months
  InsightsScreen.tsx     Year-to-date percentages (gross & net)
  SettingsScreen.tsx     Backup/restore, Excel import/export, data management
src/components/
  DayCell.tsx            Single day cell with status indicator
  MonthGrid.tsx          Calendar grid for one month
  StatusPicker.tsx       Modal — pick from all 5 statuses
  WelcomeModal.tsx       First-launch onboarding
  HelpModal.tsx          Feature guide
  StatItem.tsx           Reusable stat display row
src/db/index.ts          SQLite operations (expo-sqlite)
src/types/index.ts       DayStatus, DayRecord, MonthStats
src/utils/
  stats.ts               MonthStats computation helpers
  TabIndexContext.tsx     Shared tab index context
```

## Features

- **Dashboard** — Current month overview with stats and daily status scatter
- **Calendar** — Swipeable months; tap to set status, long-press to toggle in-office/absent
- **Insights** — YTD percentages: gross (all days) and net (working days only, excluding holidays/leaves)
- **Settings** — Backup (.db), restore, export to Excel, import from Excel, download sample, delete all data
- **Day statuses**: `in-office`, `absent`, `public-holiday`, `personal-leave`, `sick-leave`
- **Working days**: Monday–Friday only

## Backup & Restore

Backup and restore use SQL-level operations (`serializeDatabaseAsync` / `deserializeDatabaseAsync` + `backupDatabaseAsync`) instead of file I/O, making them reliable across both Android and iOS.

## Excel Import / Export

### Export
Exports all attendance data to an `.xlsx` file with columns `Date`, `Status`, shared via the system share sheet.

### Import
Imports attendance from an `.xlsx` file. Expected columns: `Date`, `Status`. The import handler:
- Accepts dates in `YYYY-MM-DD` or `YYYY/MM/DD` format
- Accepts Excel serial date numbers (auto-converted to string via `{ raw: false }`)
- Normalizes `/` separators to `-` for consistent storage
- Validates statuses against the allowed set (`in-office`, `absent`, `public-holiday`, `personal-leave`, `sick-leave`)
- Skips rows with missing or invalid data
- Uses `INSERT OR REPLACE` — re-importing overwrites existing entries

### Sample
A sample Excel file with example data can be downloaded via the Settings screen.

## Build — Android

### Local APK (requires Android Studio)

```sh
export RTO_KEYSTORE_PASSWORD="NayinteMone1824!0"
./build.sh android-local
```

APK at `android/app/build/outputs/apk/release/app-release.apk`

Keystore: `inoffice-release.keystore` (alias: `inoffice`), password via `RTO_KEYSTORE_PASSWORD`.

### EAS AAB (Play Store)

```sh
eas login
eas build:configure
./build.sh android-eas
```

## Build — iOS

### Local Release (connected device)

```sh
npx expo run:ios --configuration Release --device
```

### EAS (App Store)

```sh
eas login
eas build:configure
./build.sh ios-eas          # production
./build.sh ios-eas-preview  # internal test
```

## Play Store

| Item           | Path                                                                             |
| -------------- | -------------------------------------------------------------------------------- |
| Metadata       | `store/android/metadata.json`                                                    |
| Privacy policy | `store/privacy-policy.md` (hosted at `https://rsivanandan.github.io/InOffice/privacy`) |
| Screenshots    | `store/android/screenshots/`                                                     |

## SonarQube

```sh
SONAR_TOKEN=<token> sonar-scanner
```

## Testing

62 tests across 6 suites with 99% line coverage:

```
__tests__/
  db.test.ts              — SQLite operations
  db.integration.test.ts  — Mocked file picker and SQL-level restore
  DayCell.test.tsx        — Day cell rendering
  MonthGrid.test.tsx      — Calendar grid
  StatusPicker.test.tsx   — Status picker modal
  WelcomeModal.test.tsx   — First-launch modal
```

## License

MIT
