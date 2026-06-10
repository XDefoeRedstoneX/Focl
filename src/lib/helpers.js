export const todayISO = () => new Date().toISOString().slice(0, 10);

export const addDays = (n, baseISO) => {
  const d = baseISO ? new Date(baseISO + 'T00:00:00') : new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const fmtDate = (d) =>
  new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

export const fmtDateShort = (d) =>
  new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

export const fmtTime = (t) => {
  const [h, m] = t.split(':');
  return `${((+h + 11) % 12) + 1}:${m} ${+h < 12 ? 'AM' : 'PM'}`;
};

export const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const getDayKey = (d) => weekDays[(d.getDay() + 6) % 7];

// Module-level week-start setting. App.jsx calls setWeekStart() when the
// user's preference loads/changes; every weekISO/weekDaysFrom caller then
// picks it up automatically without prop-threading.
let WEEK_START = 'monday';
export const setWeekStart = (s) => { WEEK_START = s === 'sunday' ? 'sunday' : 'monday'; };

// weekISO returns the 7 ISO dates of the week containing `anchor` (today by
// default). `startsOn` defaults to the configured week start.
export const weekISO = (anchor, startsOn = WEEK_START) => {
  const today = anchor ? new Date(anchor + 'T00:00:00') : new Date();
  const start = new Date(today);
  // days since the chosen week-start
  const offset = startsOn === 'sunday'
    ? today.getDay()              // Sun=0
    : (today.getDay() + 6) % 7;   // Mon=0
  start.setDate(today.getDate() - offset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
};

// Ordered weekday keys for a given week start (for analytics/labels)
export const weekDaysFrom = (startsOn = WEEK_START) =>
  startsOn === 'sunday'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : weekDays;

export const newId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

// Given a recurring item's rule and its current due-date ISO, return the next
// due-date ISO strictly after `fromISO`. Returns null for non-recurring.
// recurrence: 'none'|'daily'|'weekdays'|'weekly'|'biweekly'|'monthly'|'custom'
export const nextOccurrence = (recurrence, customDays, fromISO) => {
  if (!recurrence || recurrence === 'none') return null;
  const base = new Date(fromISO + 'T00:00:00');

  const iso = (d) => d.toISOString().slice(0, 10);

  if (recurrence === 'daily') {
    base.setDate(base.getDate() + 1);
    return iso(base);
  }
  if (recurrence === 'weekly') {
    base.setDate(base.getDate() + 7);
    return iso(base);
  }
  if (recurrence === 'biweekly') {
    base.setDate(base.getDate() + 14);
    return iso(base);
  }
  if (recurrence === 'monthly') {
    const wantedDay = base.getDate();
    base.setDate(1);                 // avoid overflow while changing month
    base.setMonth(base.getMonth() + 1);
    const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    base.setDate(Math.min(wantedDay, lastDay)); // Jan 31 -> Feb 28/29
    return iso(base);
  }
  if (recurrence === 'weekdays') {
    // next Mon–Fri day
    do { base.setDate(base.getDate() + 1); }
    while ([0, 6].includes(base.getDay()));
    return iso(base);
  }
  if (recurrence === 'custom') {
    const set = customDays && customDays.length ? customDays : [];
    if (!set.length) return null;
    // scan forward up to 14 days for the next matching weekday key
    for (let i = 1; i <= 14; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      if (set.includes(getDayKey(d))) return iso(d);
    }
    return null;
  }
  return null;
};

// Whether a habit is "due" today, based on frequency / customDays
export const isHabitDueOn = (habit, dateISO) => {
  const dKey = getDayKey(new Date(dateISO + 'T00:00:00'));
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'weekdays') return !['Sat', 'Sun'].includes(dKey);
  if (habit.frequency === '3x') return true; // user-chosen freedom, count regardless
  return habit.customDays.includes(dKey);
};

// Compute current streak from completions array (descending date scan)
export const computeStreak = (completions, frequency, customDays) => {
  if (!completions.length) return 0;
  const set = new Set(completions);
  let streak = 0;
  const d = new Date();
  // walk backward; if a day "should be done" and isn't, break.
  for (let i = 0; i < 366; i++) {
    const iso = d.toISOString().slice(0, 10);
    const due = isHabitDueOn({ frequency, customDays }, iso);
    if (due) {
      if (set.has(iso)) streak++;
      else if (i > 0) break; // missing today is okay (not yet checked off)
      else if (!set.has(iso)) {
        // today not done: streak continues from yesterday but doesn't count today
      }
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
};
