# Focl — Beginner's Guide

This guide assumes you've never built an app before. Every step is a literal action you take on your computer. If something doesn't make sense, that's on the guide, not you. Open an issue mentally and we'll fix it.

---

## Part 1 — What you're actually doing

You have a folder of code (this `focl-app/` folder). The end goal is a file called `app-debug.apk` that you install on your iqoo 12 like any other Android app.

To get from one to the other, your computer does this:

```
Your code (folder of .jsx files)
        ↓  (Vite bundles it into a webpage)
A 'dist' folder (HTML + JS + CSS)
        ↓  (Capacitor wraps the webpage in an Android app shell)
An 'android' folder (a real Android Studio project)
        ↓  (Android Studio builds it)
app-debug.apk
        ↓  (you install it on your phone)
Focl on your home screen
```

Five tools do this work. You don't need to understand them — just know they exist:

| Tool | What it does | Already installed? |
|---|---|---|
| **Node.js** | Runs JavaScript on your computer | Probably not — install in Part 2 |
| **npm** | Downloads code libraries | Comes with Node.js |
| **Vite** | Bundles the webpage | Installed by npm |
| **Capacitor** | Wraps webpage as Android app | Installed by npm |
| **Android Studio** | Builds the final APK | You said you have it |

---

## Part 2 — Install Node.js

1. Go to https://nodejs.org
2. Click the big green button that says **LTS** (Long Term Support). It auto-detects your OS.
3. Run the installer. Click Next on everything. Accept all defaults.
4. **Restart your computer.** This makes sure the terminal knows about Node.

To check it worked, open a terminal:
- **Windows:** Press the Windows key, type `cmd`, press Enter.
- **Mac:** Press `Cmd + Space`, type `terminal`, press Enter.

In the terminal, type:

```
node -v
```

Press Enter. If you see something like `v20.11.0` (any v18, v20, or v22), you're good. If you see "command not found", restart your computer and try again. If still broken, the installer didn't work — re-download and reinstall.

---

## Part 3 — Where to put the focl-app folder

Pick somewhere easy to find. I recommend:

- **Windows:** `C:\Users\YourName\focl-app`
- **Mac:** `/Users/YourName/focl-app` (your home folder)

Copy/move the `focl-app` folder there. Don't put it inside Documents or Downloads — those have weird permissions sometimes.

---

## Part 4 — Open a terminal IN that folder

This is the part most beginners trip on. The terminal has a "current location" and commands run from there.

### Windows:
1. Open File Explorer, navigate to your `focl-app` folder.
2. In the folder, hold **Shift** and right-click in an empty area.
3. Click **"Open in Terminal"** or **"Open PowerShell window here"** (depending on Windows version).

### Mac:
1. Open Finder, navigate to your `focl-app` folder.
2. Right-click the folder itself.
3. Click **"New Terminal at Folder"**.
   - If you don't see that option: System Settings → Keyboard → Keyboard Shortcuts → Services → enable "New Terminal at Folder".

To confirm you're in the right place, type:

```
ls
```

(That's lowercase L, S.) Press Enter. You should see a list including `package.json`, `index.html`, `src`, etc. **If you see those, you're in the right place.** If you see something else, you're in the wrong folder — close the terminal and try again.

---

## Part 5 — About the `vite.config.js` file

**Good news: you don't need to create it. It already exists in the folder.**

Open File Explorer / Finder and look inside `focl-app/`. You should see a file called `vite.config.js`. If it's there, skip to Part 6.

### "I don't see it"

Some file managers hide files starting with a dot or with weird extensions. To check:

- **Windows:** In File Explorer, click the **View** menu at the top → tick **"File name extensions"** and **"Hidden items"**.
- **Mac:** In any Finder window, press `Cmd + Shift + .` (period) to toggle hidden files.

Still not there? Then it really is missing. Create it:

1. Inside the `focl-app` folder, right-click empty space → **New → Text Document** (Windows) or **New File** (Mac).
2. Name it exactly `vite.config.js` — including the `.js` ending, no `.txt`.
   - On Windows, if it shows up as `vite.config.js.txt`, rename it and delete the `.txt`.
3. Open it in **Notepad** (Windows) or **TextEdit** (Mac — but switch to Plain Text: Format menu → Make Plain Text).
4. Paste exactly this into it:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2018',
  },
  server: {
    host: true,
    port: 5173,
  },
})
```

5. Save (Ctrl/Cmd + S) and close.

**What is this file?** It's a settings file that tells Vite (the bundler) how to package your code. You never edit it again. It's already correct.

---

## Part 6 — Download all the code libraries

In your terminal (the one open in the `focl-app` folder from Part 4), type exactly:

```
npm install
```

Press Enter.

**This will take 1–5 minutes.** You'll see a lot of text scrolling. That's normal. It's downloading React, Vite, Capacitor, etc. into a new folder called `node_modules/` (it'll be huge — that's fine).

When it's done, you'll get your terminal prompt back. You might see warnings — ignore them. As long as there's no big red **ERROR** that stops everything, you're good.

To test, type:

```
npm run dev
```

Press Enter. After a few seconds you'll see something like:

```
  VITE v5.4.2  ready in 432 ms

  ➜  Local:   http://localhost:5173/
```

Open that URL in any browser. **You should see Focl running.** Click around — it works.

When you're done looking, go back to the terminal and press `Ctrl + C` to stop the dev server.

---

## Part 7 — What "localStorage" / persistence means

You asked about Step 5 on localStorage. Let me explain what's happening.

**The problem:** Apps need to remember your data after you close them. When you add a task, it has to still be there tomorrow. Where does that data live?

There are three places data can be saved:

| Place | Used when | Good for |
|---|---|---|
| **Memory (RAM)** | App is running | Temporary — lost when you close the app |
| **localStorage** | App runs in a web browser | Survives reloads, lives inside the browser |
| **Capacitor Preferences** | App runs as an Android APK | Survives reloads, lives on the phone |

**Focl uses both, automatically.** The code in `src/lib/storage.js` checks: "Am I running in a browser or as an Android app?" and picks the right one.

- When you run `npm run dev` and view it in Chrome → it uses **localStorage** (your data is saved in Chrome's storage).
- When you install the APK on your iqoo 12 → it uses **Capacitor Preferences** (your data is saved by Android).

**You don't have to do anything for this to work.** It just works. The "Step 5" confusion was probably me being unclear in the previous README — there's no separate "set up localStorage" step. It's automatic.

### To prove it to yourself:
1. Run `npm run dev`, open it in your browser.
2. Add a task using the + button.
3. Close the browser tab.
4. Open `http://localhost:5173` again.
5. The task is still there. That's localStorage working.

The same thing will happen on your phone, just using a different storage system under the hood.

---

## Part 8 — Build the Android app

Now the actual phone part. Make sure you're still in the terminal in `focl-app/`.

### 8a. Build the website bundle

```
npm run build
```

This makes the `dist/` folder. Takes ~10 seconds.

### 8b. Create the Android project

```
npx cap add android
```

This makes a new `android/` folder. Takes ~30 seconds. You only run this **once, ever**.

### 8c. Open it in Android Studio

```
npx cap open android
```

This launches Android Studio with your project. The first time, Android Studio will spend **5–15 minutes** doing "Gradle sync" — downloading Android build tools. Just let it finish. Don't touch anything until the bottom progress bar is done.

---

## Part 9 — Build the APK

Once Android Studio is done syncing:

1. In the top menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Wait. First build takes 3–5 minutes. You'll see progress at the bottom.
3. When done, a small notification appears in the bottom-right corner: **"APK(s) generated successfully"**. Click the **locate** link.
4. Your file is `app-debug.apk` in `focl-app/android/app/build/outputs/apk/debug/`.

---

## Part 10 — Get the APK onto your iqoo 12

Easiest way: copy the file to the phone.

1. Connect iqoo 12 to computer with USB. Pick "File transfer" mode on the phone.
2. Copy `app-debug.apk` to the phone's Downloads folder.
3. On the phone, open **Files** → Downloads → tap `app-debug.apk`.
4. iqoo will say "For your security, your phone is not allowed to install unknown apps from this source" — tap **Settings** → toggle **"Allow from this source"** on.
5. Go back, tap the APK again → tap **Install**.
6. Focl is now in your app drawer.

---

## Part 11 — When you change the code later

You'll edit some `.jsx` file, want to see the change on the phone:

```
npm run build
npx cap copy
```

Then go back to Android Studio, **Build → Build APK(s)**, copy the new APK over, reinstall.

(Reinstalling over the same APK keeps your data.)

---

## Stuck?

Tell me exactly:
1. What step you're on.
2. What command you typed.
3. What you see on screen (copy-paste the error if there is one).

I'll walk you through it.
