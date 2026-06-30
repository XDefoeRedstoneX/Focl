import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runDailyMaintenance, buildWeekSnapshot } from './maintenance.js';
import { DEFAULT_SETTINGS } from './store.js';

// 2026-06-10 is a Wednesday; the current Monday-start week begins 2026-06-08.
const TODAY = '2026-06-10';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-10T12:00:00Z'));
});
afterEach(() => vi.useRealTimers());

const state = (over = {}) => ({
  spaces: [], tasks: [], events: [], habits: [],
  settings: { ...DEFAULT_SETTINGS },
  archive: [], kits: [], plan: {}, sessions: [],
  ...over,
});

const task = (over = {}) => ({
  id: 't1', name: 'x', notes: '', spaceId: '', priority: 'medium',
  deadline: TODAY, done: false, recurrence: 'none', customDays: [],
  notifications: [],
  ...over,
});

describe('buildWeekSnapshot — plan adherence', () => {
  it('includes a plan field aggregating that week\'s day plans', () => {
    const weekStart = '2026-06-08'; // Monday
    const dayPlans = [{
      date: '2026-06-08', emergencyEdits: [{ at: 'x', action: 'move' }],
      blocks: [{ id: 'a', end: '09:00', done: true }, { id: 'b', end: '10:00', done: false }],
    }];
    const snap = buildWeekSnapshot(weekStart, { tasks: [], events: [], habits: [], spaces: [], dayPlans });
    expect(snap.plan).toMatchObject({ daysPlanned: 1, blocksPlanned: 2, blocksDone: 1, adherencePct: 50, emergencyEdits: 1 });
  });
});

describe('roll-forward of recurring tasks', () => {
  it('advances an overdue daily task to today and unchecks it', () => {
    const s0 = state({ tasks: [task({ deadline: '2026-06-08', recurrence: 'daily', done: true })] });
    const { state: s1, rolledTasks } = runDailyMaintenance(s0, TODAY);
    expect(s1.tasks[0].deadline).toBe(TODAY);
    expect(s1.tasks[0].done).toBe(false);
    expect(rolledTasks).toHaveLength(1);
    expect(s1.settings.lastRollDate).toBe(TODAY);
  });

  it('lands weekly tasks on the next occurrence even past today', () => {
    // weekly from Tue Jun 2 → Jun 9 → ... first occurrence >= today is Jun 16
    const s0 = state({ tasks: [task({ deadline: '2026-06-02', recurrence: 'weekly' })] });
    const { state: s1 } = runDailyMaintenance(s0, TODAY);
    expect(s1.tasks[0].deadline).toBe('2026-06-16');
  });

  it('leaves non-recurring and future tasks alone', () => {
    const s0 = state({
      tasks: [
        task({ id: 'a', deadline: '2026-06-01' }), // overdue, not recurring
        task({ id: 'b', deadline: '2026-06-20', recurrence: 'daily' }),
      ],
    });
    const { state: s1, rolledTasks } = runDailyMaintenance(s0, TODAY);
    expect(s1.tasks.find(t => t.id === 'a').deadline).toBe('2026-06-01');
    expect(s1.tasks.find(t => t.id === 'b').deadline).toBe('2026-06-20');
    expect(rolledTasks).toHaveLength(0);
  });

  it('runs at most once per day', () => {
    const s0 = state({
      tasks: [task({ deadline: '2026-06-09', recurrence: 'daily' })],
      settings: { ...DEFAULT_SETTINGS, lastRollDate: TODAY },
    });
    const { state: s1, rolledTasks } = runDailyMaintenance(s0, TODAY);
    expect(s1.tasks[0].deadline).toBe('2026-06-09');
    expect(rolledTasks).toHaveLength(0);
  });
});

describe('auto-cleanup', () => {
  // cutoff with the default 7 days from 2026-06-10 is 2026-06-03
  it('removes old completed non-recurring tasks and old one-time events', () => {
    const s0 = state({
      tasks: [
        task({ id: 'old-done', deadline: '2026-06-01', done: true }),
        task({ id: 'old-open', deadline: '2026-06-01', done: false }),
        task({ id: 'recent-done', deadline: '2026-06-05', done: true }),
        task({ id: 'old-recurring', deadline: '2026-06-01', done: true, recurrence: 'weekly' }),
      ],
      events: [
        { id: 'e-old', recurrence: 'none', startDatetime: '2026-05-20T10:00' },
        { id: 'e-recent', recurrence: 'none', startDatetime: '2026-06-05T10:00' },
        { id: 'e-recurring', recurrence: 'weekly', startDatetime: '2026-05-20T10:00' },
      ],
    });
    const { state: s1 } = runDailyMaintenance(s0, TODAY);
    expect(s1.tasks.map(t => t.id).sort()).toEqual(['old-open', 'old-recurring', 'recent-done']);
    expect(s1.events.map(e => e.id).sort()).toEqual(['e-recent', 'e-recurring']);
    expect(s1.settings.lastCleanupDate).toBe(TODAY);
  });

  it('is disabled when autoDeleteCompletedDays is 0', () => {
    const s0 = state({
      tasks: [task({ deadline: '2026-01-01', done: true })],
      settings: { ...DEFAULT_SETTINGS, autoDeleteCompletedDays: 0 },
    });
    const { state: s1 } = runDailyMaintenance(s0, TODAY);
    expect(s1.tasks).toHaveLength(1);
    expect(s1.settings.lastCleanupDate).toBe(null);
  });
});

describe('weekly archive', () => {
  it('snapshots the previous week when a new week starts', () => {
    const s0 = state({
      tasks: [task({ deadline: '2026-06-03', done: true, recurrence: 'weekly' })],
      habits: [{
        id: 'h1', name: 'Read', color: '#fff', spaceId: '',
        frequency: 'daily', customDays: [],
        streakCurrent: 0, streakBest: 0, goalDays: 30,
        completions: ['2026-06-03'],
      }],
      events: [
        { id: 'e1', recurrence: 'none', startDatetime: '2026-06-04T10:00', customDays: [] },
        { id: 'e2', recurrence: 'weekly', startDatetime: '2026-05-01T09:00', customDays: [] },
      ],
      settings: { ...DEFAULT_SETTINGS, lastArchivedWeek: '2026-06-01', lastRollDate: TODAY },
    });
    const { state: s1 } = runDailyMaintenance(s0, TODAY);

    expect(s1.archive).toHaveLength(1);
    const snap = s1.archive[0];
    expect(snap.weekStart).toBe('2026-06-01');
    expect(snap.tasksCompleted).toBe(1);
    expect(snap.habitsCompleted).toBe(1);
    expect(snap.eventsCount).toBe(2); // previously hardcoded to 0
    expect(s1.settings.lastArchivedWeek).toBe('2026-06-08');
  });

  it('does not snapshot on first run, but starts tracking', () => {
    const { state: s1 } = runDailyMaintenance(state(), TODAY);
    expect(s1.archive).toHaveLength(0);
    expect(s1.settings.lastArchivedWeek).toBe('2026-06-08');
  });

  it('does not duplicate an already-archived week', () => {
    const s0 = state({
      archive: [{ weekStart: '2026-06-01' }],
      settings: { ...DEFAULT_SETTINGS, lastArchivedWeek: '2026-05-25' },
    });
    const { state: s1 } = runDailyMaintenance(s0, TODAY);
    expect(s1.archive).toHaveLength(1);
  });
});

describe('buildWeekSnapshot', () => {
  it('computes per-day and per-space breakdowns over the right 7 days', () => {
    const snap = buildWeekSnapshot('2026-06-01', {
      tasks: [task({ deadline: '2026-06-02', done: true, spaceId: 'sp1' })],
      events: [],
      habits: [],
      spaces: [{ id: 'sp1', name: 'Life', color: '#fff' }],
    });
    expect(snap.byDay.map(d => d.date)).toEqual([
      '2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04',
      '2026-06-05', '2026-06-06', '2026-06-07',
    ]);
    expect(snap.byDay[1].tasksDone).toBe(1);
    expect(snap.perSpace[0].tasks).toBe(1);
    expect(snap.completionRate).toBe(100);
  });
});
