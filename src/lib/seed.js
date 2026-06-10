import { C } from './theme.js';
import { todayISO, addDays, weekISO, newId } from './helpers.js';

export const SEED_SPACES = [
  { id: 'sp1', name: 'Life', color: C.green },
  { id: 'sp2', name: 'College', color: C.blue },
  { id: 'sp3', name: 'Work', color: C.amber },
];

const mkTask = (id, name, notes, spaceId, priority, deadline, done, notifications = []) => ({
  id, name, notes, spaceId, priority, deadline, done, notifications,
  createdAt: new Date().toISOString(),
});

export const SEED_TASKS = [
  mkTask('t1', 'Buy groceries', 'Milk, eggs, oats', 'sp1', 'medium', todayISO(), false, [{ timing: '1hour', time: '18:00' }]),
  mkTask('t2', 'Finish stats homework', 'Chapters 4–6', 'sp2', 'high', todayISO(), false),
  mkTask('t3', 'Review PR #482', '', 'sp3', 'high', todayISO(), true),
  mkTask('t4', 'Call mom', '', 'sp1', 'low', addDays(1), false),
  mkTask('t5', 'Draft Q3 retro', 'Cover wins + risks', 'sp3', 'medium', addDays(2), false),
  mkTask('t6', 'Read Chapter 12', '', 'sp2', 'medium', addDays(3), false),
  mkTask('t7', 'Pay rent', 'Auto-pay enabled?', 'sp1', 'high', addDays(5), false, [{ timing: '1day', time: '09:00' }]),
];

const mkEv = (id, name, notes, spaceId, start, end, recurrence, customDays = [], notifications = []) => ({
  id, name, notes, spaceId,
  startDatetime: `${todayISO()}T${start}`,
  endDatetime: `${todayISO()}T${end}`,
  recurrence, customDays, notifications,
  createdAt: new Date().toISOString(),
});

export const SEED_EVENTS = [
  mkEv('e1', 'Standup', '', 'sp3', '09:30', '09:45', 'weekdays', [], [{ timing: '10min', time: '09:20' }]),
  mkEv('e2', 'Lecture: Algorithms', 'Hall B', 'sp2', '11:00', '12:30', 'custom', ['Mon', 'Wed', 'Fri'], [{ timing: '30min', time: '10:30' }]),
  mkEv('e3', 'Yoga', '', 'sp1', '18:00', '19:00', 'none'),
  mkEv('e4', '1:1 w/ Sara', '', 'sp3', '15:00', '15:30', 'weekly'),
];

const week = weekISO();
const mkH = (id, name, spaceId, color, frequency, customDays, sc, sb, goal, comps) => ({
  id, name, spaceId, color, frequency, customDays,
  streakCurrent: sc, streakBest: sb, goalDays: goal,
  completions: comps,
  createdAt: new Date().toISOString(),
});

export const SEED_HABITS = [
  mkH('h1', 'Read 20 min', 'sp1', C.green, 'daily', [], 12, 21, 30, [week[0], week[1], week[2], week[3]]),
  mkH('h2', 'Workout', 'sp1', C.red, 'custom', ['Mon', 'Wed', 'Fri'], 4, 9, 60, [week[0], week[2]]),
  mkH('h3', 'Study Spanish', 'sp2', C.blue, 'weekdays', [], 8, 14, 30, [week[0], week[1], week[2], week[3]]),
  mkH('h4', 'Journal', 'sp1', C.purple, 'daily', [], 2, 18, 90, [week[2], week[3]]),
  mkH('h5', 'No phone after 10pm', 'sp1', C.amber, 'daily', [], 0, 6, 30, [week[1]]),
];

// Sample workout kits so the tab isn't empty on first run
export const SEED_KITS = [
  { id: 'k1', name: 'Push', color: C.amber, exercises: [
    { id: 'x1', name: 'Bench press', sets: 3, reps: 8 },
    { id: 'x2', name: 'Overhead press', sets: 3, reps: 10 },
    { id: 'x3', name: 'Dips', sets: 3, reps: 12 },
  ]},
  { id: 'k2', name: 'Pull', color: C.blue, exercises: [
    { id: 'x4', name: 'Pull-ups', sets: 3, reps: 8 },
    { id: 'x5', name: 'Barbell row', sets: 3, reps: 10 },
    { id: 'x6', name: 'Curls', sets: 3, reps: 12 },
  ]},
  { id: 'k3', name: 'Legs', color: C.green, exercises: [
    { id: 'x7', name: 'Squat', sets: 3, reps: 8 },
    { id: 'x8', name: 'Romanian deadlift', sets: 3, reps: 10 },
    { id: 'x9', name: 'Calf raises', sets: 4, reps: 15 },
  ]},
];

export const SEED_PLAN = {
  Mon: 'k1', Tue: null, Wed: 'k2', Thu: null, Fri: 'k3', Sat: null, Sun: null,
  linkedHabitId: 'h2', // auto-checks the Workout habit on session completion
};

export const DEFAULTS = {
  spaces: SEED_SPACES,
  tasks: SEED_TASKS,
  events: SEED_EVENTS,
  habits: SEED_HABITS,
  kits: SEED_KITS,
  plan: SEED_PLAN,
  sessions: [],
  settings: null, // App fills with DEFAULT_SETTINGS
  archive: [],    // Past weekly snapshots
};
