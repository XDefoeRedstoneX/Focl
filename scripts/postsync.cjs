#!/usr/bin/env node
/**
 * Post-sync patcher. Run AFTER `npx cap add android` / `npx cap sync`.
 * Wired into npm scripts so it runs automatically.
 *
 *   node scripts/postsync.cjs
 *
 * Does three things, all idempotent (safe to run repeatedly):
 *  1. build.gradle:  proguard-android.txt -> proguard-android-optimize.txt
 *  2. AndroidManifest.xml: ensure notification + exact-alarm permissions exist
 *  3. Pin Android Gradle Plugin to an 8.x version Capacitor 6 supports
 *     (Android Studio sometimes auto-upgrades it to 9.x, which breaks the build)
 */
const fs = require('fs');
const path = require('path');

const ANDROID = path.join(__dirname, '..', 'android');
const AGP_VERSION = '8.7.2'; // last known-good AGP for Capacitor 6

if (!fs.existsSync(ANDROID)) {
  console.error('No android/ folder found. Run `npx cap add android` first.');
  process.exit(1);
}

// ---- 1. Patch build.gradle files ----
let patchedGradle = 0;
function walkGradle(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'build' || entry.name === '.gradle') continue;
      walkGradle(full);
    } else if (entry.name === 'build.gradle') {
      let before = fs.readFileSync(full, 'utf8');
      let after = before.replace(
        /getDefaultProguardFile\(\s*['"]proguard-android\.txt['"]\s*\)/g,
        "getDefaultProguardFile('proguard-android-optimize.txt')"
      );
      // Pin AGP version wherever it's declared
      after = after.replace(
        /com\.android\.tools\.build:gradle:[\d.]+/g,
        `com.android.tools.build:gradle:${AGP_VERSION}`
      );
      if (after !== before) {
        fs.writeFileSync(full, after, 'utf8');
        patchedGradle++;
        console.log('Patched gradle:', path.relative(ANDROID, full));
      }
    }
  }
}
walkGradle(ANDROID);

// ---- 1b. Pin AGP in version catalog if present (newer Capacitor templates) ----
const tomlPath = path.join(ANDROID, 'gradle', 'libs.versions.toml');
if (fs.existsSync(tomlPath)) {
  let t = fs.readFileSync(tomlPath, 'utf8');
  const patched = t.replace(
    /(agp\s*=\s*")[\d.]+(")/,
    `$1${AGP_VERSION}$2`
  );
  if (patched !== t) {
    fs.writeFileSync(tomlPath, patched, 'utf8');
    console.log(`Pinned AGP to ${AGP_VERSION} in libs.versions.toml`);
  }
}

// ---- 2. Patch AndroidManifest.xml ----
const manifestPath = path.join(ANDROID, 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
  let m = fs.readFileSync(manifestPath, 'utf8');
  const perms = [
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.SCHEDULE_EXACT_ALARM',
    'android.permission.USE_EXACT_ALARM',
    'android.permission.RECEIVE_BOOT_COMPLETED',
  ];
  let added = 0;
  for (const perm of perms) {
    if (!m.includes(perm)) {
      m = m.replace(
        /(<manifest[^>]*>)/,
        `$1\n    <uses-permission android:name="${perm}"/>`
      );
      added++;
    }
  }
  if (added > 0) {
    fs.writeFileSync(manifestPath, m, 'utf8');
    console.log(`Added ${added} permission(s) to AndroidManifest.xml`);
  } else {
    console.log('Manifest permissions already present.');
  }
} else {
  console.warn('AndroidManifest.xml not found at expected path.');
}

console.log(`Post-sync done. (${patchedGradle} gradle file(s) patched)`);
