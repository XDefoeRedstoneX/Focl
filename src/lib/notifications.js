// Schedules local notifications via Capacitor LocalNotifications plugin.
// No-ops gracefully in the browser (not a native platform).

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const isNative = () => Capacitor.isNativePlatform();

let permissionAsked = false;
let permissionGranted = false;

export async function ensurePermission() {
  if (!isNative()) return false;
  if (permissionAsked) return permissionGranted;
  permissionAsked = true;
  try {
    // Check first; only request if not already granted
    let status = await LocalNotifications.checkPermissions();
    if (status.display !== 'granted') {
      status = await LocalNotifications.requestPermissions();
    }
    permissionGranted = status.display === 'granted';
    return permissionGranted;
  } catch (e) {
    console.warn('permission check failed', e);
    return false;
  }
}

// Hash a string id to a stable positive 31-bit int
export function intId(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

// Compute the Date at which a notification should first fire.
// timing: 'on-day' | '10min' | '30min' | '1hour' | '1day' | 'custom'
// time: 'HH:MM' (24h)
// referenceISO: YYYY-MM-DD anchor (deadline or event date)
export function buildFireDate(timing, time, referenceISO) {
  if (!referenceISO) return null;
  const [h, m] = time.split(':').map(Number);
  const ref = new Date(`${referenceISO}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
  const offsets = { 'on-day': 0, '10min': -10 * 60000, '30min': -30 * 60000, '1hour': -60 * 60000, '1day': -24 * 3600000, custom: 0 };
  return new Date(ref.getTime() + (offsets[timing] || 0));
}

export async function scheduleItem(item, kind) {
  if (!isNative()) return;
  if (!await ensurePermission()) return;
  if (!item.notifications || !item.notifications.length) return;

  const referenceISO = kind === 'task'
    ? item.deadline
    : item.startDatetime?.slice(0, 10);

  const notifs = [];
  item.notifications.forEach((n, i) => {
    const fire = buildFireDate(n.timing, n.time, referenceISO);
    if (!fire || fire.getTime() < Date.now()) return;
    notifs.push({
      id: intId(item.id + ':' + i),
      title: item.name,
      body: item.notes || (kind === 'task' ? 'Task reminder' : 'Event reminder'),
      schedule: { at: fire, allowWhileIdle: true },
    });
  });

  if (notifs.length) {
    try {
      await LocalNotifications.schedule({ notifications: notifs });
    } catch (e) {
      console.warn('schedule failed', e);
    }
  }
}

// Fire a notification ~8 seconds from now to verify the whole pipeline.
// Returns a status string so the UI can show what happened.
export async function testNotification() {
  if (!isNative()) return 'not-native';
  const granted = await ensurePermission();
  if (!granted) return 'no-permission';
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: 999001,
        title: 'Focl test',
        body: 'If you see this, notifications work!',
        schedule: { at: new Date(Date.now() + 8000), allowWhileIdle: true },
      }],
    });
    return 'scheduled';
  } catch (e) {
    return 'error:' + (e?.message || 'unknown');
  }
}

export async function cancelItem(itemId, notifCount = 4) {
  if (!isNative()) return;
  const ids = [];
  for (let i = 0; i < notifCount; i++) ids.push({ id: intId(itemId + ':' + i) });
  try {
    await LocalNotifications.cancel({ notifications: ids });
  } catch {
    // safe to ignore
  }
}
