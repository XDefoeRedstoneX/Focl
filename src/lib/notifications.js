// Schedules local notifications via Capacitor LocalNotifications plugin.
// No-ops gracefully in the browser (not a native platform).

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { CAP_WEEKDAY, todayISO } from './helpers.js';

const isNative = () => Capacitor.isNativePlatform();

// High-importance channel so reminders survive OEM notification filtering
// (default-importance channels are silenced or hidden on several skins).
const CHANNEL_ID = 'focl-reminders';

export async function initNotifications() {
  if (!isNative()) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Reminders',
      description: 'Task and event reminders',
      importance: 5,
      visibility: 1,
      vibration: true,
    });
  } catch {
    // channels unsupported (pre-Oreo / iOS) — plugin falls back to defaults
  }
}

// Only the *request dialog* is once-per-session; the actual permission is
// re-checked every time, so granting it in system settings takes effect
// immediately instead of being masked by a cached denial.
let requestedThisSession = false;

export async function ensurePermission() {
  if (!isNative()) return false;
  try {
    let status = await LocalNotifications.checkPermissions();
    if (status.display !== 'granted' && !requestedThisSession) {
      requestedThisSession = true;
      status = await LocalNotifications.requestPermissions();
    }
    return status.display === 'granted';
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

// Capacitor weekday numbers (Sunday-first 1–7) for the Mon–Fri set
const WEEKDAYS_CAP = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => CAP_WEEKDAY[d]);

// Map one reminder of an item to plugin schedule(s). Repeating rules use
// date-match schedules so they keep firing even when the app isn't
// opened; one-shot rules skip times already in the past.
function schedulesFor(item, kind, n, now) {
  const referenceISO = kind === 'task' ? item.deadline : item.startDatetime?.slice(0, 10);
  const fire = buildFireDate(n.timing, n.time, referenceISO);
  if (!fire) return [];

  const recurrence = item.recurrence || 'none';
  const hour = fire.getHours();
  const minute = fire.getMinutes();

  if (recurrence === 'daily') {
    return [{ on: { hour, minute } }];
  }
  if (recurrence === 'weekdays') {
    return WEEKDAYS_CAP.map(weekday => ({ on: { weekday, hour, minute } }));
  }
  if (recurrence === 'custom') {
    return (item.customDays || []).map(d => ({ on: { weekday: CAP_WEEKDAY[d], hour, minute } }));
  }
  if (recurrence === 'weekly') {
    return [{ on: { weekday: fire.getDay() + 1, hour, minute } }];
  }
  if (recurrence === 'monthly') {
    const day = fire.getDate();
    // A date-match on day 29–31 silently skips months that lack that day
    // (Feb, Apr, …). Fall back to a one-shot of the next occurrence, like
    // biweekly, so it always fires (re-armed by the startup resync).
    if (day <= 28) return [{ on: { day, hour, minute } }];
    let at = fire.getTime();
    while (at < now) {
      const d = new Date(at);
      d.setMonth(d.getMonth() + 1);
      at = d.getTime();
    }
    return [{ at: new Date(at), allowWhileIdle: true }];
  }
  if (recurrence === 'biweekly') {
    // No two-week date-match exists: arm the next future occurrence as a
    // one-shot; the startup resync re-arms the following one.
    let at = fire.getTime();
    while (at < now) at += 14 * 86400000;
    return [{ at: new Date(at), allowWhileIdle: true }];
  }
  // non-recurring
  if (fire.getTime() < now) return [];
  return [{ at: fire, allowWhileIdle: true }];
}

// Pure: the exact notification objects handed to the plugin for an item.
export function buildNotificationSpecs(item, kind, now = Date.now()) {
  // A completed one-off task has nothing left to remind about, so it must
  // not be (re-)armed — including by the startup resync. Recurring tasks
  // keep their repeating schedule: today's `done` is transient and future
  // occurrences still need the reminder.
  if (kind === 'task' && item.done && (!item.recurrence || item.recurrence === 'none')) {
    return [];
  }
  const specs = [];
  for (const n of item.notifications || []) {
    for (const schedule of schedulesFor(item, kind, n, now)) {
      if (specs.length >= MAX_NOTIFS_PER_ITEM) break; // keep ids within cancel range
      specs.push({
        id: intId(`${item.id}:${specs.length}`),
        title: item.name,
        body: item.notes || (kind === 'task' ? 'Task reminder' : 'Event reminder'),
        channelId: CHANNEL_ID,
        // Tasks stay in the shade until completed (completing cancels them);
        // events are informational and dismissable as usual.
        ongoing: kind === 'task',
        autoCancel: kind !== 'task',
        schedule,
      });
    }
  }
  return specs;
}

// Upper bound on scheduled notifications per item. buildNotificationSpecs
// caps at this; cancelItem clears this many ids. Generous so multi-reminder
// imported items (e.g. several custom-day rules) can't leave orphans.
export const MAX_NOTIFS_PER_ITEM = 32;

export async function scheduleItem(item, kind) {
  if (!isNative()) return;
  const specs = buildNotificationSpecs(item, kind);
  if (!specs.length) return;
  if (!await ensurePermission()) return;
  try {
    await LocalNotifications.schedule({ notifications: specs });
  } catch (e) {
    console.warn('schedule failed', e);
  }
}

export async function cancelItem(itemId) {
  if (!isNative()) return;
  const ids = [];
  for (let i = 0; i < MAX_NOTIFS_PER_ITEM; i++) ids.push({ id: intId(`${itemId}:${i}`) });
  try {
    await LocalNotifications.cancel({ notifications: ids });
  } catch {
    // safe to ignore
  }
}

// Cancel and re-arm every reminder. Run at startup: repairs items saved
// before permission was granted, alarms dropped by reboots or OEM battery
// managers, and re-arms biweekly one-shots.
// Adapt a class into an event-shaped reminder item so it flows through the
// existing schedule pipeline: anchored to today + the class start time, with
// a custom-day recurrence that fires weekly on each meeting day. A class with
// no reminder (or inactive) yields an empty `notifications`, so it gets
// cancelled but never scheduled.
// NOTE: odd/even-week classes still remind every week here — biweekly reminder
// precision is a later refinement; the agenda itself already respects parity.
export function classReminderItem(cls) {
  const armed = cls.reminder && cls.active !== false && cls.start;
  return {
    id: cls.id,
    name: cls.name,
    notes: cls.location ? `Class · ${cls.location}` : 'Class',
    startDatetime: `${todayISO()}T${cls.start || '00:00'}:00`,
    recurrence: 'custom',
    customDays: cls.days || [],
    notifications: armed ? [{ timing: cls.reminder.timing, time: cls.start }] : [],
  };
}

export async function resyncAll(tasks, events, classes = []) {
  if (!isNative()) return;
  const items = [
    ...tasks.map(t => [t, 'task']),
    ...events.map(e => [e, 'event']),
    ...classes.map(c => [classReminderItem(c), 'event']),
  ];
  await Promise.all(items.map(([i]) => cancelItem(i.id)));

  const withReminders = items.filter(([i]) => i.notifications?.length);
  if (!withReminders.length) return; // never prompt for permission needlessly
  if (!await ensurePermission()) return;

  for (const [item, kind] of withReminders) {
    const specs = buildNotificationSpecs(item, kind);
    if (!specs.length) continue;
    try {
      await LocalNotifications.schedule({ notifications: specs });
    } catch (e) {
      console.warn('resync failed for', item.id, e);
    }
  }
}

// Status for the Settings screen.
export async function getNotificationStatus() {
  if (!isNative()) return { native: false };
  const status = { native: true, permission: 'unknown', exactAlarms: 'unknown' };
  try {
    status.permission = (await LocalNotifications.checkPermissions()).display;
  } catch { /* leave unknown */ }
  try {
    status.exactAlarms = (await LocalNotifications.checkExactNotificationSetting()).exact_alarm;
  } catch { /* pre-Android-12 or unsupported — leave unknown */ }
  return status;
}

// Opens the system screen where the user can allow exact alarms.
export async function requestExactAlarms() {
  try {
    return (await LocalNotifications.changeExactNotificationSetting()).exact_alarm;
  } catch {
    return 'unknown';
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
        channelId: CHANNEL_ID,
        schedule: { at: new Date(Date.now() + 8000), allowWhileIdle: true },
      }],
    });
    return 'scheduled';
  } catch (e) {
    return 'error:' + (e?.message || 'unknown');
  }
}
