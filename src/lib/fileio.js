// Export/import helpers.
// On Android (Capacitor): write JSON to Documents/Focl, optionally pop share sheet for Drive.
// In browser: trigger a download.

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { todayISO } from './helpers.js';

const isNative = () => Capacitor.isNativePlatform();

function fileName() {
  return `focl-backup-${todayISO()}.json`;
}

/**
 * Save a JSON payload locally. Returns { path, success }.
 * On Android: writes to Documents/Focl/, returns the path.
 * On browser: triggers a download, returns Downloads folder hint.
 */
export async function exportLocal(payload) {
  const name = fileName();
  const data = JSON.stringify(payload, null, 2);

  if (isNative()) {
    try {
      try {
        await Filesystem.mkdir({ path: 'Focl', directory: Directory.Documents, recursive: true });
      } catch {
        // folder already exists - ignore
      }
      await Filesystem.writeFile({
        path: `Focl/${name}`,
        data,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      return { success: true, path: `Documents/Focl/${name}`, native: true };
    } catch (e) {
      console.warn('Native export failed', e);
      return { success: false, error: e.message };
    }
  }

  // Browser fallback
  try {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true, path: `Downloads/${name}`, native: false };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Pop the native Android share sheet so the user can send the backup
 * to Drive, Gmail, etc. Falls back to a download in browser.
 */
export async function exportShare(payload) {
  if (!isNative()) {
    return exportLocal(payload);
  }
  try {
    const name = fileName();
    const data = JSON.stringify(payload, null, 2);
    const writeResult = await Filesystem.writeFile({
      path: name,
      data,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: 'Focl backup',
      text: `Focl backup - ${name}`,
      url: writeResult.uri,
      dialogTitle: 'Send backup to...',
    });
    return { success: true, shared: true };
  } catch (e) {
    if (e.message?.includes('canceled') || e.message?.includes('cancelled')) {
      return { success: false, canceled: true };
    }
    console.warn('Share failed', e);
    return { success: false, error: e.message };
  }
}

/**
 * Pick a JSON file. The hidden <input> approach works in both the
 * browser and the Capacitor WebView. Returns parsed JSON or throws.
 */
export async function pickAndReadJSON() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          resolve(JSON.parse(ev.target.result));
        } catch {
          reject(new Error('Not valid JSON'));
        }
      };
      reader.onerror = () => reject(new Error('Read failed'));
      reader.readAsText(file);
    };
    document.body.appendChild(input);
    input.click();
    setTimeout(() => input.remove(), 1000);
  });
}
