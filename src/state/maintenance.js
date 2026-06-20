// Daily maintenance, run once on the freshly loaded state at startup:
//   1. roll recurring tasks forward past missed occurrences
//   2. auto-delete old completed items (per the user's setting)
//   3. archive last week's stats snapshot
// Pure: returns the next state plus the tasks whose notifications need
// rescheduling — that side effect belongs to the caller.

import {
  todayISO, addDays, weekISO, weekDaysFrom,
  nextOccurrence, countEventsInWeek, habitWeeklyTarget,
} from '../lib/helpers.js';

export function runDailyMaintenance(state, today = todayISO()) {
  let { tasks, events, settings, archive } = state;
  const rolledTasks = [];

  // 1. Roll recurring tasks forward. Runs at the day boundary so a task
  //    you checked off stays visibly done all day, then becomes the next
  //    occurrence (unchecked) the following morning. Missed recurring
  //    tasks also advance instead of piling up as overdue.
  if (settings.lastRollDate !== today) {
    tasks = tasks.map(t => {
      if (!t.recurrence || t.recurrence === 'none') return t;
      if (t.deadline >= today) return t; // due today/future — leave alone
      // advance deadline until it lands on today or later
      let next = t.deadline;
      for (let i = 0; i < 62 && next < today; i++) {
        const n = nextOccurrence(t.recurrence, t.customDays, next);
        if (!n) break;
        next = n;
      }
      if (next === t.deadline) return t;
      const rolled = { ...t, deadline: next, done: false };
      rolledTasks.push(rolled);
      return rolled;
    });
    settings = { ...settings, lastRollDate: today };
  }

  // 2. Auto-cleanup completed items (never touches recurring tasks/events)
  if (settings.autoDeleteCompletedDays > 0 && settings.lastCleanupDate !== today) {
    const cutoffISO = addDays(-settings.autoDeleteCompletedDays, today);

    tasks = tasks.filter(t =>
      !(t.done && t.deadline < cutoffISO && (!t.recurrence || t.recurrence === 'none'))
    );
    events = events.filter(e =>
      !(e.recurrence === 'none' && e.startDatetime.slice(0, 10) < cutoffISO)
    );

    settings = { ...settings, lastCleanupDate: today };
  }

  // 3. Weekly archive: snapshot the previous week once the week rolls over.
  const thisWeekStart = weekISO(today)[0];
  if (settings.lastArchivedWeek !== thisWeekStart) {
    const prevWeekStart = addDays(-7, thisWeekStart);
    const alreadyArchived = archive.some(a => a.weekStart === prevWeekStart);
    // Skip on the very first run (lastArchivedWeek null): there is no
    // tracked previous week to snapshot yet.
    if (!alreadyArchived && settings.lastArchivedWeek !== null) {
      const snapshot = buildWeekSnapshot(prevWeekStart, { ...state, tasks, events });
      archive = [snapshot, ...archive].slice(0, 52); // keep up to 1 year
    }
    settings = { ...settings, lastArchivedWeek: thisWeekStart };
  }

  return {
    state: { ...state, tasks, events, settings, archive },
    rolledTasks,
  };
}

// Build a stats snapshot of a past week for the archive
export function buildWeekSnapshot(weekStart, { tasks, events, habits, spaces }) {
  const week = Array.from({ length: 7 }, (_, i) => addDays(i, weekStart));

  const tasksDueThisWeek = tasks.filter(t => week.includes(t.deadline));
  const tasksCompleted = tasksDueThisWeek.filter(t => t.done);
  const habitDone = habits.reduce((s, h) =>
    s + week.filter(d => h.completions.includes(d)).length, 0);
  const habitSlots = habits.length * 7;
  const habitPct = habitSlots ? Math.round((habitDone / habitSlots) * 100) : 0;
  const completionRate = tasksDueThisWeek.length
    ? Math.round((tasksCompleted.length / tasksDueThisWeek.length) * 100)
    : 0;

  const formatRange = () => {
    const opts = { month: 'short', day: 'numeric' };
    return `${new Date(week[0] + 'T00:00:00').toLocaleDateString('en-US', opts)} – ${new Date(week[6] + 'T00:00:00').toLocaleDateString('en-US', opts)}`;
  };

  return {
    isCurrent: false,
    weekStart,
    label: `Week of ${formatRange()}`,
    shortLabel: new Date(weekStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    tasksCompleted: tasksCompleted.length,
    tasksTotal: tasksDueThisWeek.length,
    completionRate,
    habitsCompleted: habitDone,
    habitSlots, habitPct,
    eventsCount: countEventsInWeek(events, week),
    byDay: week.map((d, i) => {
      const tDone = tasks.filter(t => t.done && t.deadline === d).length;
      const hDone = habits.filter(h => h.completions.includes(d)).length;
      return {
        date: d,
        dayKey: weekDaysFrom()[i],
        tasksDone: tDone, habitsDone: hDone,
        total: tDone + hDone,
      };
    }),
    perHabit: habits.map(h => ({
      id: h.id, name: h.name, color: h.color,
      done: week.filter(d => h.completions.includes(d)).length,
      target: habitWeeklyTarget(h),
    })),
    perSpace: spaces.map(sp => {
      const sTasks = tasks.filter(t => t.spaceId === sp.id);
      const sHabits = habits.filter(h => h.spaceId === sp.id);
      const tDone = sTasks.filter(t => t.done && week.includes(t.deadline)).length;
      const hDone = sHabits.reduce((s, h) =>
        s + week.filter(d => h.completions.includes(d)).length, 0);
      return {
        id: sp.id, name: sp.name, color: sp.color,
        tasks: tDone, habits: hDone, total: tDone + hDone,
      };
    }),
  };
}
