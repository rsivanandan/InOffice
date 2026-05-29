# Work Attendance Tracker (RTO)

React Native app (iOS & Android) that tracks office attendance against working days.

## Build Plan

### Core Concepts

- **Working days** = Monday–Friday only
- **Target %** = User-defined attendance goal
- **In-office days** = Days marked as "came to office"
- **Two stat views**: with holidays counted vs. excluded

### Screens

| Screen | Purpose |
|--------|---------|
| **Home / Dashboard** | Monthly & YTD summary, two stat cards, progress vs target, quick "Mark today" button |
| **Calendar** | Monthly grid, tap to mark In Office / WFH / Leave / Holiday, weekends auto-grayed |
| **Leaves & Holidays** | Add/edit public holidays + personal leaves |
| **Settings** | Target %, work week customization, account, cloud sync toggle |

### Calculations

| Metric | Formula |
|--------|---------|
| Total working days | Mon–Fri days in month |
| Working days excl. holidays | Total working days − Public holidays − Personal leaves |
| Attendance % (incl. holidays) | `In-office / Total working days × 100` |
| Attendance % (excl. holidays) | `In-office / (Total working days − holidays − leaves) × 100` |

### Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React Native (Expo) |
| Navigation | React Navigation v6 (bottom tabs) |
| State | Zustand |
| Backend / Auth | Firebase (Firestore + Auth) |
| Local storage | SQLite (Expo) + AsyncStorage |
| Calendar | Custom month grid |
| Charts | react-native-gifted-charts or victory-native |

### Phases

1. **Foundation** — Expo, navigation, Firebase auth, login/signup
2. **Core Logic** — Calendar day marking, working day engine, offline storage
3. **Dashboard** — Stats cards, progress vs target
4. **Leaves & Settings** — Add/edit holidays/leaves, target slider
5. **Cloud Sync** — Firestore sync, conflict resolution

---

*Seeded from user specification on 2026-05-28.*
