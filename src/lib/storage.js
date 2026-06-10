// Cross-platform persistence:
//  - On a native Capacitor platform (Android APK), uses @capacitor/preferences
//  - In a regular browser, falls back to localStorage
// All values are JSON-serialized.

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const isNative = () => Capacitor.isNativePlatform();

export async function loadKey(key, fallback) {
  try {
    if (isNative()) {
      const { value } = await Preferences.get({ key });
      return value ? JSON.parse(value) : fallback;
    }
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn('loadKey failed', key, e);
    return fallback;
  }
}

export async function saveKey(key, value) {
  try {
    const serialized = JSON.stringify(value);
    if (isNative()) {
      await Preferences.set({ key, value: serialized });
      return;
    }
    localStorage.setItem(key, serialized);
  } catch (e) {
    console.warn('saveKey failed', key, e);
  }
}

export async function clearAll() {
  try {
    if (isNative()) {
      await Preferences.clear();
      return;
    }
    localStorage.clear();
  } catch (e) {
    console.warn('clearAll failed', e);
  }
}

// Convenience: load whole state object at startup
export async function loadState(defaults) {
  const out = {};
  for (const k of Object.keys(defaults)) {
    out[k] = await loadKey(`focl.${k}`, defaults[k]);
  }
  return out;
}

export async function saveStateField(key, value) {
  await saveKey(`focl.${key}`, value);
}
