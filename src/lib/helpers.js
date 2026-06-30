// Format a Date as YYYY-MM-DD using the *local* calendar date.
// (toISOString() formats in UTC, which is the previous day for timezones
// east of UTC until UTC midnight — e.g. before 7am in UTC+7.)
export const localISO = (d) => {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export const todayISO = () => localISO(new Date());

export const addDays = (n, baseISO) => {
  const d = baseISO ? new Date(baseISO + 'T00:00:00') : new Date();
  d.setDate(d.getDate() + n);
  return localISO(d);
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

// Capacitor LocalNotifications weekday numbers (Sunday=1 … Saturday=7).
export const CAP_WEEKDAY = { Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6, Sat: 7 };

// How many times a habit is expected to be done in a 7-day week.
export const habitWeeklyTarget = (habit) =>
  habit.frequency === 'daily' ? 7
  : habit.frequency === 'weekdays' ? 5
  : habit.frequency === '3x' ? 3
  : (habit.customDays || []).length;

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
    return localISO(d);
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

  const iso = localISO;

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

// Number of events that occur at least once during `week` (7 ISO dates).
// Recurrences without a fixed weekly footprint (biweekly/monthly) are
// approximated as absent, matching the Analytics screen.
export const countEventsInWeek = (events, week) => events.filter(e => {
  if (e.recurrence === 'none') return week.includes(e.startDatetime.slice(0, 10));
  if (['daily', 'weekdays', 'weekly'].includes(e.recurrence)) return true;
  if (e.recurrence === 'custom') return (e.customDays || []).length > 0;
  return false;
}).length;

// Time-of-day greeting for the Today header title.
export const greeting = (now = new Date()) => {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

// "Tuesday · June 24" style kicker for the Today header.
export const dateKicker = (dateISO) => {
  const d = dateISO ? new Date(dateISO + 'T00:00:00') : new Date();
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const md = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  return `${weekday} · ${md}`;
};

// Does a (possibly recurring) event occur on dateISO? Occurrences never
// precede the event's own start date.
export const eventOccursOn = (event, dateISO) => {
  const startISO = event.startDatetime.slice(0, 10);
  if (dateISO < startISO) return false;
  const rec = event.recurrence || 'none';
  if (rec === 'none') return dateISO === startISO;
  if (rec === 'daily') return true;

  const start = new Date(startISO + 'T00:00:00');
  const day = new Date(dateISO + 'T00:00:00');
  const dKey = getDayKey(day);

  if (rec === 'weekdays') return !['Sat', 'Sun'].includes(dKey);
  if (rec === 'custom') return (event.customDays || []).includes(dKey);
  if (rec === 'weekly') return dKey === getDayKey(start);
  if (rec === 'biweekly') {
    if (dKey !== getDayKey(start)) return false;
    const weeks = Math.round((day - start) / (7 * 86400000));
    return weeks % 2 === 0;
  }
  if (rec === 'monthly') return day.getDate() === start.getDate();
  return false;
};

// Merge events (by occurrence), classes (by weekly timetable) and tasks (by
// deadline) into a single agenda for one day, sorted by time. Untimed tasks
// sort after timed items. Returns [{ kind, item, time }] where time is
// 'HH:MM' or null. `classes` is optional so 3-arg callers keep working.
export const agendaForDay = (tasks, events, dateISO, classes = []) => {
  const entries = [];
  for (const e of events) {
    if (eventOccursOn(e, dateISO)) {
      entries.push({ kind: 'event', item: e, time: e.startDatetime.slice(11, 16) || null });
    }
  }
  for (const c of classes) {
    if (classOccursOn(c, dateISO)) {
      entries.push({ kind: 'class', item: c, time: c.start || null });
    }
  }
  for (const t of tasks) {
    if (t.deadline === dateISO) entries.push({ kind: 'task', item: t, time: null });
  }
  // Timed items first (chronological), then untimed tasks.
  return entries.sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return 0;
  });
};

// --- Day Planner: planning window, class schedule, adherence ---

// 'HH:MM' → minutes since local midnight. '24:00' → 1440 (end-of-day).
export const hmToMin = (hm) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + (m || 0);
};

// minutes since midnight → 'HH:MM' (zero-padded). 1440 → '24:00' (end-of-day),
// the inverse of hmToMin so a block ending at midnight round-trips cleanly.
export const minToHM = (min) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// Round a minute value to the nearest `step` (default 15-min grid).
export const snapMin = (min, step = 15) => Math.round(min / step) * step;

// Do two {start,end} blocks (minutes) overlap? Touching edges don't count.
export const blocksOverlap = (a, b) =>
  hmToMin(a.start) < hmToMin(b.end) && hmToMin(b.start) < hmToMin(a.end);

// Minutes from `now` until the planning window next opens (0 if already open).
export const minutesUntilWindow = (now, window) => {
  if (!window || isPlanningWindow(now, window)) return 0;
  const cur = now.getHours() * 60 + now.getMinutes();
  let diff = hmToMin(window.start) - cur;
  if (diff <= 0) diff += 1440; // opens tomorrow
  return diff;
};

// Is `now` (a Date) inside the nightly planning window? The window is
// { start, end } as 'HH:MM' local times. Windows may end at '24:00' and may
// wrap past midnight (start > end), e.g. { start:'22:00', end:'02:00' }.
export const isPlanningWindow = (now, window) => {
  if (!window) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = hmToMin(window.start);
  const end = hmToMin(window.end);
  return start < end
    ? cur >= start && cur < end
    : cur >= start || cur < end; // wrapping window
};

// The date the planner is currently building: tomorrow, while in the window;
// null otherwise. Intended for windows that end at/before midnight (the default
// 20:00–24:00) — the evening you plan precedes the day you're planning.
export const plannableDate = (now, window) =>
  isPlanningWindow(now, window) ? addDays(1, localISO(now)) : null;

// What a user may do with the plan for `dateISO` right now:
//   'edit'     — it's tomorrow and we're inside the planning window
//   'locked'   — its day has begun or passed (execute; emergency-edit only)
//   'readonly' — a future date not yet in its window
export const planEditMode = (dateISO, now, window) => {
  if (dateISO <= localISO(now)) return 'locked';
  if (dateISO === plannableDate(now, window)) return 'edit';
  return 'readonly';
};

// Even/odd parity of a date's week, measured from a fixed Monday epoch, for
// biweekly ('odd'/'even') class timetables. Stable and timezone-agnostic.
const EPOCH_MONDAY = Date.UTC(1970, 0, 5); // 1970-01-05 is a Monday
const weekParity = (dateISO) => {
  const d = new Date(dateISO + 'T00:00:00');
  const offset = (d.getDay() + 6) % 7;       // days since Monday
  const mondayUTC = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() - offset);
  const weeks = Math.round((mondayUTC - EPOCH_MONDAY) / (7 * 86400000));
  return weeks % 2 === 0 ? 'even' : 'odd';
};

// Does a class meet on dateISO? Classes recur weekly (no start date), honoring
// their weekday set, `active` flag, and `weeks` ('all' | 'odd' | 'even').
export const classOccursOn = (cls, dateISO) => {
  if (cls.active === false) return false;
  const dKey = getDayKey(new Date(dateISO + 'T00:00:00'));
  if (!(cls.days || []).includes(dKey)) return false;
  const weeks = cls.weeks || 'all';
  return weeks === 'all' ? true : weekParity(dateISO) === weeks;
};

// Adherence stats for one day plan. on-time = a done block whose completion
// (doneAt) landed no later than its end time plus a grace window. Blocks
// completed without a recorded doneAt don't count toward on-time.
export const planAdherence = (dayPlan, graceMin = 30) => {
  const blocks = dayPlan?.blocks || [];
  const planned = blocks.length;
  const done = blocks.filter(b => b.done).length;
  let onTime = 0;
  if (dayPlan?.date) {
    const dayStart = new Date(dayPlan.date + 'T00:00:00').getTime();
    for (const b of blocks) {
      if (!b.done || !b.doneAt) continue;
      const deadline = dayStart + (hmToMin(b.end) + graceMin) * 60000;
      if (new Date(b.doneAt).getTime() <= deadline) onTime++;
    }
  }
  return {
    planned,
    done,
    adherence: planned ? Math.round((done / planned) * 100) : 0,
    onTime,
    onTimePct: done ? Math.round((onTime / done) * 100) : 0,
    emergencyEdits: (dayPlan?.emergencyEdits || []).length,
  };
};

// Aggregate plan adherence across a week (7 ISO dates). Only days that have a
// plan with blocks count toward `daysPlanned`.
export const weekPlanAdherence = (dayPlans, week, graceMin = 30) => {
  let daysPlanned = 0, blocksPlanned = 0, blocksDone = 0, onTime = 0, emergencyEdits = 0;
  for (const date of week) {
    const plan = (dayPlans || []).find(p => p.date === date);
    if (!plan || !(plan.blocks || []).length) continue;
    daysPlanned++;
    const a = planAdherence(plan, graceMin);
    blocksPlanned += a.planned;
    blocksDone += a.done;
    onTime += a.onTime;
    emergencyEdits += a.emergencyEdits;
  }
  return {
    daysPlanned, blocksPlanned, blocksDone, onTime, emergencyEdits,
    adherencePct: blocksPlanned ? Math.round((blocksDone / blocksPlanned) * 100) : 0,
    onTimePct: blocksDone ? Math.round((onTime / blocksDone) * 100) : 0,
  };
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
    const iso = localISO(d);
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
