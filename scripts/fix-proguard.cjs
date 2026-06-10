#!/usr/bin/env node
/**
 * Patches every build.gradle under android/ so that
 *   proguard-android.txt  ->  proguard-android-optimize.txt
 *
 * Run from the project root AFTER `npx cap add android` / `npx cap sync`:
 *   node scripts/fix-proguard.js
 *
 * Safe to run multiple times.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'android');

if (!fs.existsSync(ROOT)) {
  console.error('No android/ folder found. Run `npx cap add android` first.');
  process.exit(1);
}

let patched = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'build' || entry.name === '.gradle') continue;
      walk(full);
    } else if (entry.name === 'build.gradle') {
      const before = fs.readFileSync(full, 'utf8');
      // Replace only the non-optimize variant, and never double-apply
      const after = before.replace(
        /getDefaultProguardFile\(\s*['"]proguard-android\.txt['"]\s*\)/g,
        "getDefaultProguardFile('proguard-android-optimize.txt')"
      );
      if (after !== before) {
        fs.writeFileSync(full, after, 'utf8');
        patched++;
        console.log('Patched:', path.relative(ROOT, full));
      }
    }
  }
}

walk(ROOT);
console.log(patched === 0 ? 'Nothing to patch (already optimized).' : `Done. Patched ${patched} file(s).`);
