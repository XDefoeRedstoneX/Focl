import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { reducer, initialState, sanitizeImport, isSessionComplete } from './store.js';

// 2026-06-10 is a Wednesday (streak math reads the clock)
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-10T12:00:00Z'));
});
afterEach(() => vi.useRealTimers());

const habit = (over = {}) => ({
  id: 'h1', name: 'Read', spaceId: '', color: '#fff',
  frequency: 'daily', customDays: [],
  streakCurrent: 0, streakBest: 0, goalDays: 30, completions: [],
  ...over,
});

const base = (over = {}) => ({ ...initialState, ...over });

describe('task actions', () => {
  it('toggles done', () => {
    const s0 = base({ tasks: [{ id: 't1', name: 'x', done: false }] });
    const s1 = reducer(s0, { type: 'task/toggle', id: 't1' });
    expect(s1.tasks[0].done).toBe(true);
    expect(reducer(s1, { type: 'task/toggle', id: 't1' }).tasks[0].done).toBe(false);
  });

  it('adds, patches and deletes', () => {
    let s = base({ tasks: [] });
    s = reducer(s, { type: 'task/add', task: { id: 't1', name: 'x' } });
    s = reducer(s, { type: 'task/update', id: 't1', patch: { name: 'y' } });
    expect(s.tasks).toEqual([{ id: 't1', name: 'y' }]);
    s = reducer(s, { type: 'task/delete', id: 't1' });
    expect(s.tasks).toEqual([]);
  });
});

describe('habit/toggleDay', () => {
  it('adds a completion and recomputes streaks', () => {
    const s0 = base({ habits: [habit({ completions: ['2026-06-09'], streakBest: 1 })] });
    const s1 = reducer(s0, { type: 'habit/toggleDay', id: 'h1', date: '2026-06-10' });
    expect(s1.habits[0].completions).toContain('2026-06-10');
    expect(s1.habits[0].streakCurrent).toBe(2);
    expect(s1.habits[0].streakBest).toBe(2);
  });

  it('removes a completion when already checked, keeping best streak', () => {
    const s0 = base({ habits: [habit({ completions: ['2026-06-10', '2026-06-09'], streakCurrent: 2, streakBest: 2 })] });
    const s1 = reducer(s0, { type: 'habit/toggleDay', id: 'h1', date: '2026-06-10' });
    expect(s1.habits[0].completions).toEqual(['2026-06-09']);
    expect(s1.habits[0].streakCurrent).toBe(1);
    expect(s1.habits[0].streakBest).toBe(2);
  });
});

describe('kit/delete', () => {
  it('removes the kit and clears plan days that referenced it', () => {
    const s0 = base({
      kits: [{ id: 'k1', name: 'Push', exercises: [] }],
      plan: { Mon: 'k1', Tue: null, Wed: 'k1', linkedHabitId: null },
    });
    const s1 = reducer(s0, { type: 'kit/delete', id: 'k1' });
    expect(s1.kits).toEqual([]);
    expect(s1.plan).toEqual({ Mon: null, Tue: null, Wed: null, linkedHabitId: null });
  });
});

describe('session/upsert', () => {
  const kit = { id: 'k1', name: 'Push', exercises: [{ id: 'x1', name: 'Bench', sets: 2, reps: 8 }] };
  const wired = () => base({
    kits: [kit],
    plan: { Wed: 'k1', linkedHabitId: 'h1' },
    habits: [habit()],
    sessions: [],
  });

  it('creates a session with the provided id', () => {
    const s1 = reducer(wired(), {
      type: 'session/upsert', id: 'new1',
      session: { date: '2026-06-10', kitId: 'k1', ex: { x1: { done: 1 } } },
    });
    expect(s1.sessions).toEqual([{ id: 'new1', date: '2026-06-10', kitId: 'k1', ex: { x1: { done: 1 } } }]);
  });

  it('auto-checks the linked habit when the session completes', () => {
    const s1 = reducer(wired(), {
      type: 'session/upsert', id: 'new1',
      session: { date: '2026-06-10', kitId: 'k1', ex: { x1: { done: 2 } } },
    });
    expect(s1.habits[0].completions).toContain('2026-06-10');
  });

  it('does not touch the habit for partial sessions or repeat completions', () => {
    const partial = reducer(wired(), {
      type: 'session/upsert', id: 'a',
      session: { date: '2026-06-10', kitId: 'k1', ex: { x1: { done: 1 } } },
    });
    expect(partial.habits[0].completions).toEqual([]);

    const complete = reducer(partial, {
      type: 'session/upsert', id: 'b',
      session: { date: '2026-06-10', kitId: 'k1', ex: { x1: { done: 2 } } },
    });
    const again = reducer(complete, {
      type: 'session/upsert', id: 'c',
      session: { date: '2026-06-10', kitId: 'k1', ex: { x1: { done: 2 } } },
    });
    // still exactly one completion — no double-toggle back off
    expect(again.habits[0].completions).toEqual(['2026-06-10']);
  });
});

describe('isSessionComplete', () => {
  const kit = { exercises: [{ id: 'x1', sets: 2 }, { id: 'x2', sets: 3 }] };
  it('requires every set of every exercise', () => {
    expect(isSessionComplete(kit, { x1: { done: 2 }, x2: { done: 3 } })).toBe(true);
    expect(isSessionComplete(kit, { x1: { done: 2 }, x2: { done: 2 } })).toBe(false);
    expect(isSessionComplete(kit, undefined)).toBe(false);
    expect(isSessionComplete({ exercises: [] }, {})).toBe(false);
  });
});

describe('import / reset', () => {
  it('import overwrites only the provided slices', () => {
    const s0 = base();
    const s1 = reducer(s0, { type: 'import', payload: { tasks: [{ id: 't9', name: 'i' }] } });
    expect(s1.tasks).toEqual([{ id: 't9', name: 'i' }]);
    expect(s1.habits).toBe(s0.habits);
  });

  it('reset returns the empty initial state, never sample data', () => {
    const dirty = reducer(base(), { type: 'task/add', task: { id: 'tx', name: 'x' } });
    const s = reducer(dirty, { type: 'reset' });
    expect(s).toEqual(initialState);
    expect(s.tasks).toEqual([]);
    expect(s.habits).toEqual([]);
  });
});

describe('sanitizeImport', () => {
  it('rejects files that are not a Focl backup', () => {
    expect(() => sanitizeImport(null)).toThrow();
    expect(() => sanitizeImport('hi')).toThrow();
    expect(() => sanitizeImport([1, 2])).toThrow();
    expect(() => sanitizeImport({ foo: 'bar' })).toThrow(/No Focl data/);
  });

  it('unwraps v2 payloads nested under data', () => {
    const out = sanitizeImport({ version: 2, data: { tasks: [{ id: 't1', name: 'x' }] } });
    expect(out).toEqual({ tasks: [{ id: 't1', name: 'x' }] });
  });

  it('accepts v1 payloads with slices at the top level', () => {
    const out = sanitizeImport({ habits: [{ id: 'h1' }], plan: { Mon: null } });
    expect(out.habits).toEqual([{ id: 'h1' }]);
    expect(out.plan).toEqual({ Mon: null });
  });

  it('drops malformed entries and non-array slices', () => {
    const out = sanitizeImport({
      tasks: [{ id: 't1' }, 'junk', null, { name: 'no id' }],
      events: 'not-an-array',
    });
    expect(out.tasks).toEqual([{ id: 't1' }]);
    expect(out.events).toBeUndefined();
  });
});
