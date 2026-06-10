<div align="center">

# Focl

**An offline-first personal productivity app — tasks, events, habits, workouts and weekly analytics in one dark, fast, native-feeling Android app.**

Built with React + Vite, wrapped with Capacitor, with a hand-written native Kotlin layer for the things the web can't do.

[![CI](https://github.com/XDefoeRedstoneX/Focl/actions/workflows/ci.yml/badge.svg)](https://github.com/XDefoeRedstoneX/Focl/actions/workflows/ci.yml)
![Tests](https://img.shields.io/badge/tests-63%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-Android-3DDC84)

<!-- Replace the link below with an Imgur URL of the hero shot -->
<img src="https://via.placeholder.com/300x650?text=Focl+Hero" alt="Focl home screen" width="280" />

</div>

---

## Overview

Focl is a Google Tasks–style productivity app I built for daily personal use, then hardened into a portfolio project. It runs fully offline, stores everything on-device, and is designed to feel like a native Android app rather than a website in a shell — hardware back-button navigation, haptics, status-bar theming and local notifications all included.

The codebase is a **React/Capacitor core** for fast cross-platform UI, with the data layer modelled as a **single pure reducer** and a **native Kotlin module** for capabilities web can't reach (home-screen widget, alarm-backed reminders).

## Features

| | |
|---|---|
| **Tasks** | Quick-add, priorities, deadlines, recurrence (daily/weekly/biweekly/monthly/weekdays/custom), search, overdue & upcoming sections. Recurring tasks roll forward automatically at the day boundary. |
| **Events** | Timed events with start/end, recurrence and reminders. |
| **Habits** | Daily/weekday/3×/custom schedules, streak tracking with grace rules, a weekly grid and a per-space overview. |
| **Workouts** | Reusable exercise *kits*, a weekly split planner, per-set logging with weight carry-over, and auto-checking of a linked habit when a session completes. |
| **Analytics** | Per-week snapshot: completion rate, by-day bars, per-habit and per-space breakdowns, auto-generated insights, and an archive of past weeks. |
| **Spaces** | Group everything by context (Life, College, Work…). |
| **Data** | JSON backup to device, share-sheet export, validated import, configurable auto-cleanup, full reset. |
| **Native polish** | Local notifications, haptic feedback, hardware back navigation, safe-area layout, offline-first storage. |

## Screenshots

> Replace each placeholder with an Imgur (or other) image URL.

| Home | Habits | Add | Analytics | Settings |
|---|---|---|---|---|
| ![Home](https://via.placeholder.com/180x390?text=Home) | ![Habits](https://via.placeholder.com/180x390?text=Habits) | ![Add](https://via.placeholder.com/180x390?text=Add) | ![Analytics](https://via.placeholder.com/180x390?text=Analytics) | ![Settings](https://via.placeholder.com/180x390?text=Settings) |

## Tech stack

- **UI** — React 18, Vite 5, inline style tokens (single source of truth in `lib/theme.js`)
- **State** — `useReducer` over a pure domain reducer; side effects isolated in `App.jsx`
- **Native bridge** — Capacitor 6 (Preferences, Local Notifications, Haptics, Filesystem, Share, Status Bar, App)
- **Native module** — Kotlin (home-screen widget, alarm-based reminders)
- **Quality** — ESLint 10 (flat config), Vitest (63 unit tests), GitHub Actions CI

## Architecture

```
┌─────────────────────────────────────────────┐
│  React UI (screens / components)             │
│      ▲ props              │ dispatch         │
│      │                    ▼                  │
│  ┌─────────────────────────────────────┐    │
│  │  state/  — pure reducer + daily      │    │   no side effects:
│  │           maintenance (roll-forward, │    │   fully unit-tested
│  │           cleanup, weekly archive)   │    │
│  └─────────────────────────────────────┘    │
│      │ effects (notifications, haptics,      │
│      ▼ storage) live in App.jsx              │
│  ┌─────────────────────────────────────┐    │
│  │  lib/  storage · notifications ·     │    │
│  │        haptics · fileio  (native ⇄   │    │
│  │        browser fallbacks)            │    │
│  └─────────────────────────────────────┘    │
└──────────────────────│──────────────────────┘
                       │ Capacitor bridge
              ┌────────▼─────────┐
              │  Native Kotlin   │  widget · alarm reminders
              └──────────────────┘
```

Every native API degrades gracefully to a browser equivalent (or a no-op), so the whole app runs in a plain browser during development and as a real APK on device.

```
src/
├── state/          reducer + daily maintenance (pure, tested)
├── lib/            theme, helpers, storage, notifications, haptics, fileio, seed
├── components/     BottomNav, SwipeRow, RowMenu, ui primitives
├── screens/        Home, Habits, AddEdit, Notif, Spaces, Workout, Analytics, Settings
└── App.jsx         state wiring, routing, native side effects
```

## Getting started

```bash
npm install
npm run dev        # browser preview at http://localhost:5173
```

```bash
npm run lint       # ESLint
npm test           # Vitest (run once)
npm run test:watch # Vitest watch mode
npm run build      # production web bundle
```

### Build the Android app

```bash
npm run android:init   # one-time: scaffolds the android/ project
npm run android:open    # build web, sync, open in Android Studio
```

Full device-by-device instructions (SDK setup, signing, sideloading) live in **[GUIDE.md](./GUIDE.md)**.

## Testing

63 unit tests cover the pure logic — date/recurrence math, streak computation, the state reducer, and daily maintenance (roll-forward, cleanup, archiving). Tests pin a fake clock and `TZ=UTC` so results never depend on when or where they run. CI runs lint, tests and build on every push and pull request.

## Roadmap

- [x] Lint/test/CI foundation
- [x] Pure reducer state layer + timezone, import and archive fixes
- [x] Reliable reminders: repeating schedules, startup resync, high-importance channel, exact-alarm surfacing
- [ ] Native Kotlin home-screen widget
- [ ] Subtasks, drag-to-reorder, habit heatmap, calendar month view
- [ ] Incremental TypeScript migration

## License

[MIT](./LICENSE) © XDefoeRedstoneX
