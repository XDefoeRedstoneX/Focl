# Focl — Personal Productivity App

A dark-themed, offline-first tasks/events/habits tracker. Built as a React + Vite web app, wrapped with Capacitor to produce a native Android APK.

This project was set up to be **sideloaded onto your iqoo 12**. The instructions below walk through everything end-to-end.

---

## What's new vs. the original artifact

The single-file artifact has been refactored into a proper Vite project with these additions:

| Feature | Notes |
|---|---|
| **Persistent storage** | All data survives reloads & reboots. Uses Capacitor Preferences on Android (web build falls back to `localStorage`). |
| **Quick-add on Home** | One-line input above the task list — Enter to add a medium-priority task due today, auto-tagged with the current space filter. |
| **Swipe-to-delete / Edit on tap** | Swipe any task / event / habit / space left to reveal Edit + Delete. Tap a row to edit. |
| **Edit mode for everything** | Reopening an item pre-fills the AddEdit screen; Save becomes Update; Delete button appears. |
| **Search** | Search input on Home filters tasks & events by name in real time. |
| **Overdue section** | Past-due tasks pinned above "Due today" with a red accent. |
| **Smart streaks** | Streak recomputes from completions on every toggle, correctly handling frequency/customDays gaps. |
| **Habit color picker** | Six accent swatches available when creating/editing habits. |
| **Local notifications** | Native Android notifications scheduled via `@capacitor/local-notifications` based on each item's reminder settings. |
| **Export / Import / Reset** | Profile screen has working JSON backup, restore, and full reset (with confirmation). |
| **Stats summary** | Profile shows totals: tasks done, recurring events, lifetime habit completions, best streak. |
| **Responsive layout** | Removed the fixed 360×740 phone frame — now fills the device screen with safe-area padding. |
| **Confirmation modal** | Destructive actions ask before doing anything irreversible. |

---

## Project structure

```
focl-app/
├── android-resources/
│   └── icon-source.svg          # 1024×1024 launcher icon source
├── public/
│   └── focl-icon.svg            # web favicon
├── src/
│   ├── components/
│   │   ├── BottomNav.jsx        # 5-item nav + center FAB
│   │   ├── SwipeRow.jsx         # touch swipe-to-reveal-actions wrapper
│   │   └── ui.jsx               # Chip, Section, Empty, Toggle, Toast, Field, DayPicker, Stat, Confirm
│   ├── lib/
│   │   ├── theme.js             # colors, fonts, shared style atoms
│   │   ├── helpers.js           # date/id/streak math
│   │   ├── seed.js              # SEED_* + DEFAULTS for first run
│   │   ├── storage.js           # Capacitor Preferences with localStorage fallback
│   │   └── notifications.js     # Capacitor LocalNotifications wrapper
│   ├── screens/
│   │   ├── Home.jsx
│   │   ├── Habits.jsx
│   │   ├── AddEdit.jsx
│   │   ├── Notif.jsx
│   │   ├── Spaces.jsx
│   │   └── Profile.jsx
│   ├── App.jsx                  # state, persistence, routing
│   └── main.jsx                 # React entry
├── index.html
├── vite.config.js
├── capacitor.config.ts
└── package.json
```

---

## Prerequisites

You said you already have Android Studio + Android SDK installed. You also need:

- **Node.js 18 or 20** (LTS) — check with `node -v`
- **JDK 17** — Android Studio ships with one (`Embedded JDK`). Set `JAVA_HOME` to it or use Android Studio's terminal.
- **Android SDK Platform 34** (or whatever your Android Studio defaults to) and **Build-Tools 34.x**
- **USB debugging enabled** on the iqoo 12 (Settings → System → About phone → tap "Build number" 7 times, then back to Developer options → USB debugging)

> If anything's missing, Android Studio will prompt you to install it the first time you open the project.

---

## Step 1 — Initial setup

1. Copy this entire `focl-app/` folder to your machine.

2. From inside the folder, install dependencies:

   ```bash
   npm install
   ```

   This pulls down React, Vite, and the four Capacitor packages.

3. Verify the dev server works in a browser (optional sanity check):

   ```bash
   npm run dev
   ```

   Open the URL it prints (usually `http://localhost:5173`). You should see Focl with the seed data. Quit with `Ctrl+C` once it looks right.

---

## Step 2 — Add the Android platform

This generates the `android/` folder containing a real Gradle Android project. Run **once**:

```bash
npm run build         # generates the dist/ web bundle
npx cap add android   # creates android/ scaffolded with our config
```

If `cap add` complains it can't find `dist/`, run `npm run build` first.

---

## Step 3 — Generate the launcher icon

Capacitor scaffolds Android with a default icon. Replacing it is a one-time chore:

1. Open Android Studio → **File → Open** → select the `android/` folder inside the project.
2. Wait for Gradle sync (first time can take 5–10 minutes).
3. In the Project pane (left), right-click `app/res` → **New → Image Asset**.
4. Select **Launcher Icons (Adaptive and Legacy)**.
5. For **Foreground Layer** → Asset Type: **Image** → choose `android-resources/icon-source.svg`. Resize/trim until it looks right inside the safe zone.
6. For **Background Layer** → Color → `#0E0E10`.
7. Click Next → Finish. This generates all density variants.

> Skip this step the first time if you want — you can come back to it later. The default icon is just ugly, not broken.

---

## Step 4 — Allow `INTERNET` is NOT required, but notifications need permission

The app is fully offline; no network permission is needed. Notifications work via the local Android scheduler.

Open `android/app/src/main/AndroidManifest.xml`. Capacitor already added what's needed. If it didn't, add inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>
<uses-permission android:name="android.permission.USE_EXACT_ALARM"/>
```

The plugin's docs cover this — the install pulls in the right manifest entries automatically in current versions.

---

## Step 5 — Build a debug APK (the easy path)

This is enough for personal use — no Play Store, no signing ceremony.

```bash
npm run android:sync   # rebuilds web + copies into android/
```

Then in Android Studio:

1. **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
2. When done, a notification appears at the bottom — click **locate**.
3. The file is at `android/app/build/outputs/apk/debug/app-debug.apk`.

**Or from the command line:**

```bash
cd android
./gradlew assembleDebug     # macOS / Linux
# or: gradlew.bat assembleDebug     # Windows
```

Same output location.

---

## Step 6 — Install on the iqoo 12

### Option A — USB (fastest)

1. Plug the iqoo 12 into your computer with a data-capable USB cable.
2. On the phone, accept "Allow USB debugging from this computer".
3. From the project root:

   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

   (`adb` is in `~/Library/Android/sdk/platform-tools` on macOS or `%LOCALAPPDATA%\Android\Sdk\platform-tools` on Windows — add it to PATH or use the full path.)

4. Focl appears in your app drawer.

### Option B — Transfer + install

1. Copy `app-debug.apk` to the phone via Files, Telegram-to-self, Drive, etc.
2. On iqoo: **Settings → Apps & permissions → Install unknown apps** → enable your file manager.
3. Open the APK, tap Install.

### Option C — Run + install in one shot from Android Studio

With the phone plugged in and USB debugging on, click the green **Run ▶** button in Android Studio (top bar) with your phone selected in the device dropdown. Builds, installs, and launches the app automatically. Best for iterating.

---

## Step 7 — Grant notification permission on first launch

The first time you open Focl on Android 13+, you'll get the standard notifications permission prompt. Allow it, otherwise reminders silently no-op.

Then create a task with a reminder set to "10 min before" and a deadline a few minutes in the future to confirm it fires.

---

## Iterating

After any code change:

```bash
npm run android:sync   # rebuild web + copy
# then either:
#   - Click Run ▶ in Android Studio  (recommended)
#   - or rebuild APK and reinstall via adb
```

For live reload during heavy iteration, run `npm run dev` and on the phone open `http://YOUR-LAPTOP-IP:5173` in Chrome. You lose native APIs (notifications, native preferences) but the UI iterates instantly.

---

## Signing for "release" builds (optional)

A debug APK works fine for personal use, but Android shows a warning the first install and the app can't be auto-updated through a store. If you want a clean release-signed build:

1. In Android Studio: **Build → Generate Signed Bundle / APK → APK**.
2. Create a new keystore — **save the keystore file and password somewhere safe**, you need them to ship updates.
3. Select `release` build variant, V1 + V2 signatures.
4. Output goes to `android/app/release/app-release.apk`.

You can install this the same way. Signature mismatches will prevent updating from a debug version, so pick one path early.

---

## Troubleshooting

**`adb: command not found`** → Add platform-tools to your PATH, or use the full path: `~/Library/Android/sdk/platform-tools/adb install …`

**Gradle sync fails on first open** → Open `android/build.gradle` and verify it picked up your installed SDK. Android Studio's "Project Structure" dialog (Cmd/Ctrl+;) is the safest way to fix path mismatches.

**APK installs but app crashes on launch** → Check `adb logcat | grep -i focl` while reopening. 95% of crashes here are because `npm run build` wasn't run before `cap sync`.

**Notifications don't fire** → On iqoo, also check Settings → Battery → Manage background activity → Focl → "No restrictions". Vivo/iqoo are aggressive about killing background scheduled work.

**App icon is still the default** → You skipped Step 3 or didn't re-sync. Run `npm run android:sync` and rebuild.

**Data disappeared after reinstall** → Capacitor Preferences are tied to the app package + install. Use Profile → Export before reinstalling. Same package ID + same signature = data persists.

---

## Future additions if you want them later

- **Subtasks** inside a task (add a `subtasks: []` field, render as nested checklist on edit)
- **Drag-to-reorder** within sections (react-dnd or a lighter touch library)
- **Calendar month view** for events
- **Per-habit history view** (heatmap calendar)
- **Widgets** (Android home-screen widget — needs native Kotlin, not just web)
- **Cloud sync** (if you stop wanting it to be personal-only — Supabase or Pocketbase work well)

Ask and I'll wire any of these in.
