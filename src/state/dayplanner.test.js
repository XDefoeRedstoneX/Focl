import { describe, it, expect } from 'vitest';
import { reducer, initialState, sanitizeImport } from './store.js';
import { runDailyMaintenance } from './maintenance.js';
import {
  hmToMin, minToHM, snapMin, blocksOverlap, minutesUntilWindow,
  isPlanningWindow, plannableDate, planEditMode,
  classOccursOn, planAdherence,
} from '../lib/helpers.js';

const base = (over = {}) => ({ ...initialState, ...over });

// A local Date at a given clock time on 2026-06-29 (a Monday).
const at = (hh, mm = 0) => new Date(2026, 5, 29, hh, mm);
const WINDOW = { start: '20:00', end: '24:00' };

describe('isPlanningWindow', () => {
  it('is true inside the window and false outside', () => {
    expect(isPlanningWindow(at(20, 0), WINDOW)).toBe(true);
    expect(isPlanningWindow(at(23, 59), WINDOW)).toBe(true);
    expect(isPlanningWindow(at(19, 59), WINDOW)).toBe(false);
    expect(isPlanningWindow(at(8, 0), WINDOW)).toBe(false);
  });

  it('treats 24:00 as end-of-day and handles wrapping windows', () => {
    const wrap = { start: '22:00', end: '02:00' };
    expect(isPlanningWindow(at(23, 0), wrap)).toBe(true);
    expect(isPlanningWindow(at(1, 0), wrap)).toBe(true);
    expect(isPlanningWindow(at(12, 0), wrap)).toBe(false);
  });

  it('hmToMin parses clock strings including 24:00', () => {
    expect(hmToMin('00:00')).toBe(0);
    expect(hmToMin('08:30')).toBe(510);
    expect(hmToMin('24:00')).toBe(1440);
  });
});

describe('timeline math', () => {
  it('minToHM is the inverse of hmToMin, with 1440 → 24:00', () => {
    expect(minToHM(0)).toBe('00:00');
    expect(minToHM(510)).toBe('08:30');
    expect(minToHM(1440)).toBe('24:00');
    for (const hm of ['06:15', '13:45', '24:00']) expect(minToHM(hmToMin(hm))).toBe(hm);
  });

  it('snapMin rounds to the nearest 15-minute grid', () => {
    expect(snapMin(7)).toBe(0);
    expect(snapMin(8)).toBe(15);
    expect(snapMin(517)).toBe(510); // 8:37 → 8:30 (nearer)
    expect(snapMin(523)).toBe(525); // 8:43 → 8:45
    expect(snapMin(100, 30)).toBe(90);
  });

  it('blocksOverlap is true on intersection, false when edges merely touch', () => {
    expect(blocksOverlap({ start: '09:00', end: '10:00' }, { start: '09:30', end: '11:00' })).toBe(true);
    expect(blocksOverlap({ start: '09:00', end: '10:00' }, { start: '10:00', end: '11:00' })).toBe(false);
    expect(blocksOverlap({ start: '09:00', end: '10:00' }, { start: '11:00', end: '12:00' })).toBe(false);
  });

  it('minutesUntilWindow counts to the next opening, 0 while open', () => {
    const w = { start: '20:00', end: '24:00' };
    expect(minutesUntilWindow(new Date(2026, 5, 29, 21, 0), w)).toBe(0);   // open now
    expect(minutesUntilWindow(new Date(2026, 5, 29, 18, 0), w)).toBe(120); // opens in 2h today
    expect(minutesUntilWindow(new Date(2026, 5, 29, 2, 0), w)).toBe(1080); // opens 20:00 today
  });
});

describe('plannableDate / planEditMode', () => {
  it('plannableDate is tomorrow only while in the window', () => {
    expect(plannableDate(at(21, 0), WINDOW)).toBe('2026-06-30');
    expect(plannableDate(at(10, 0), WINDOW)).toBe(null);
  });

  it('classifies a date as edit / locked / readonly', () => {
    const now = at(21, 0); // in window on 2026-06-29
    expect(planEditMode('2026-06-30', now, WINDOW)).toBe('edit');     // tomorrow, in window
    expect(planEditMode('2026-06-29', now, WINDOW)).toBe('locked');   // today
    expect(planEditMode('2026-06-28', now, WINDOW)).toBe('locked');   // past
    expect(planEditMode('2026-07-02', now, WINDOW)).toBe('readonly'); // future, not yet
  });

  it('tomorrow is readonly (not edit) when outside the window', () => {
    expect(planEditMode('2026-06-30', at(10, 0), WINDOW)).toBe('readonly');
  });
});

describe('classOccursOn', () => {
  // 2026-06-29 is a Monday, 2026-06-30 a Tuesday.
  const cls = (over = {}) => ({ id: 'c1', name: 'Algo', days: ['Mon', 'Wed'], weeks: 'all', active: true, ...over });

  it('matches weekday membership', () => {
    expect(classOccursOn(cls(), '2026-06-29')).toBe(true);  // Mon
    expect(classOccursOn(cls(), '2026-06-30')).toBe(false); // Tue
  });

  it('respects the active flag', () => {
    expect(classOccursOn(cls({ active: false }), '2026-06-29')).toBe(false);
  });

  it('honors odd/even week timetables', () => {
    // Same weekday, consecutive weeks → opposite parity.
    const odd = classOccursOn(cls({ weeks: 'odd' }), '2026-06-29');
    const oddNext = classOccursOn(cls({ weeks: 'odd' }), '2026-07-06');
    expect(odd).toBe(!oddNext);
    // 'all' ignores parity.
    expect(classOccursOn(cls({ weeks: 'all' }), '2026-06-29')).toBe(true);
  });
});

describe('planAdherence', () => {
  const plan = {
    date: '2026-06-29',
    blocks: [
      { id: 'b1', end: '09:00', done: true, doneAt: '2026-06-29T08:55:00' }, // on time
      { id: 'b2', end: '10:00', done: true, doneAt: '2026-06-29T12:00:00' }, // late (>30m grace)
      { id: 'b3', end: '11:00', done: false },                                // not done
    ],
    emergencyEdits: [{ at: 'x', action: 'move' }],
  };

  it('computes planned/done/adherence and on-time counts', () => {
    const a = planAdherence(plan, 30);
    expect(a.planned).toBe(3);
    expect(a.done).toBe(2);
    expect(a.adherence).toBe(67);     // 2/3
    expect(a.onTime).toBe(1);         // only b1 within end+grace
    expect(a.onTimePct).toBe(50);     // 1/2 done blocks
    expect(a.emergencyEdits).toBe(1);
  });

  it('handles an empty plan without dividing by zero', () => {
    const a = planAdherence({ date: '2026-06-29', blocks: [] });
    expect(a).toMatchObject({ planned: 0, done: 0, adherence: 0, onTime: 0, onTimePct: 0 });
  });
});

describe('class & template reducer actions', () => {
  it('saves, updates and deletes a class', () => {
    let s = base();
    s = reducer(s, { type: 'class/save', class: { id: 'c1', name: 'Algo' } });
    expect(s.classes).toEqual([{ id: 'c1', name: 'Algo' }]);
    s = reducer(s, { type: 'class/save', class: { id: 'c1', name: 'Algorithms' } });
    expect(s.classes[0].name).toBe('Algorithms');
    s = reducer(s, { type: 'class/delete', id: 'c1' });
    expect(s.classes).toEqual([]);
  });

  it('saves and deletes block & day templates', () => {
    let s = base();
    s = reducer(s, { type: 'blockTemplate/save', template: { id: 'bt1', title: 'Deep work' } });
    s = reducer(s, { type: 'dayTemplate/save', template: { id: 'dt1', name: 'Weekday' } });
    expect(s.blockTemplates).toHaveLength(1);
    expect(s.dayTemplates).toHaveLength(1);
    s = reducer(s, { type: 'blockTemplate/delete', id: 'bt1' });
    s = reducer(s, { type: 'dayTemplate/delete', id: 'dt1' });
    expect(s.blockTemplates).toEqual([]);
    expect(s.dayTemplates).toEqual([]);
  });
});

describe('day plan reducer actions', () => {
  const block = (over = {}) => ({ id: 'x1', title: 'Study', start: '07:00', end: '08:00', kind: 'custom', done: false, ...over });

  it('addBlock creates a draft plan on first use', () => {
    const s = reducer(base(), { type: 'dayplan/addBlock', date: '2026-06-30', block: block() });
    expect(s.dayPlans).toHaveLength(1);
    expect(s.dayPlans[0]).toMatchObject({ date: '2026-06-30', status: 'draft' });
    expect(s.dayPlans[0].blocks).toHaveLength(1);
  });

  it('updates and removes blocks', () => {
    let s = reducer(base(), { type: 'dayplan/addBlock', date: '2026-06-30', block: block() });
    s = reducer(s, { type: 'dayplan/updateBlock', date: '2026-06-30', id: 'x1', patch: { start: '09:00' } });
    expect(s.dayPlans[0].blocks[0].start).toBe('09:00');
    s = reducer(s, { type: 'dayplan/removeBlock', date: '2026-06-30', id: 'x1' });
    expect(s.dayPlans[0].blocks).toEqual([]);
  });

  it('seed replaces a plan\'s blocks wholesale', () => {
    let s = reducer(base(), { type: 'dayplan/addBlock', date: '2026-06-30', block: block() });
    s = reducer(s, { type: 'dayplan/seed', date: '2026-06-30', blocks: [block({ id: 'y1' }), block({ id: 'y2' })] });
    expect(s.dayPlans[0].blocks.map(b => b.id)).toEqual(['y1', 'y2']);
  });

  it('toggleBlockDone records and clears doneAt', () => {
    let s = reducer(base(), { type: 'dayplan/addBlock', date: '2026-06-30', block: block() });
    s = reducer(s, { type: 'dayplan/toggleBlockDone', date: '2026-06-30', id: 'x1', at: '2026-06-30T07:30:00' });
    expect(s.dayPlans[0].blocks[0]).toMatchObject({ done: true, doneAt: '2026-06-30T07:30:00' });
    s = reducer(s, { type: 'dayplan/toggleBlockDone', date: '2026-06-30', id: 'x1' });
    expect(s.dayPlans[0].blocks[0]).toMatchObject({ done: false, doneAt: null });
  });

  it('toggle/commit are no-ops when the plan does not exist', () => {
    const s = base();
    expect(reducer(s, { type: 'dayplan/toggleBlockDone', date: '2099-01-01', id: 'x' }).dayPlans).toEqual([]);
    expect(reducer(s, { type: 'dayplan/commit', date: '2099-01-01' }).dayPlans).toEqual([]);
  });

  it('commit locks a draft and stamps committedAt', () => {
    let s = reducer(base(), { type: 'dayplan/addBlock', date: '2026-06-30', block: block() });
    s = reducer(s, { type: 'dayplan/commit', date: '2026-06-30', at: '2026-06-29T21:40:00' });
    expect(s.dayPlans[0]).toMatchObject({ status: 'locked', committedAt: '2026-06-29T21:40:00' });
  });

  it('emergencyEdit applies the op and appends an audit entry', () => {
    let s = reducer(base(), { type: 'dayplan/addBlock', date: '2026-06-29', block: block() });
    s = reducer(s, { type: 'dayplan/commit', date: '2026-06-29', at: '2026-06-28T21:00:00' });
    s = reducer(s, {
      type: 'dayplan/emergencyEdit', date: '2026-06-29',
      op: { kind: 'update', id: 'x1', patch: { start: '10:00' } },
      at: '2026-06-29T11:00:00', note: 'meeting ran over',
    });
    expect(s.dayPlans[0].blocks[0].start).toBe('10:00');
    expect(s.dayPlans[0].emergencyEdits).toEqual([
      { at: '2026-06-29T11:00:00', action: 'update', blockId: 'x1', note: 'meeting ran over' },
    ]);
  });
});

describe('runDailyMaintenance — day plan auto-lock & prune', () => {
  const state = (dayPlans) => ({ ...initialState, dayPlans });
  const plan = (over = {}) => ({ date: '2026-06-30', status: 'draft', committedAt: null, blocks: [], emergencyEdits: [], ...over });

  it('locks drafts whose day has arrived or passed, leaving future drafts', () => {
    const s0 = state([
      plan({ date: '2026-06-28' }),           // past → lock
      plan({ date: '2026-06-29' }),           // today → lock
      plan({ date: '2026-07-05' }),           // future → stay draft
    ]);
    const { state: s1 } = runDailyMaintenance(s0, '2026-06-29');
    const byDate = Object.fromEntries(s1.dayPlans.map(p => [p.date, p.status]));
    expect(byDate['2026-06-28']).toBe('locked');
    expect(byDate['2026-06-29']).toBe('locked');
    expect(byDate['2026-07-05']).toBe('draft');
  });

  it('prunes day plans older than the auto-delete cutoff', () => {
    // Default autoDeleteCompletedDays is 7 → cutoff is 2026-06-22.
    const s0 = state([plan({ date: '2026-06-01', status: 'locked' }), plan({ date: '2026-06-29' })]);
    const { state: s1 } = runDailyMaintenance(s0, '2026-06-29');
    expect(s1.dayPlans.map(p => p.date)).toEqual(['2026-06-29']);
  });
});

describe('sanitizeImport — new slices', () => {
  it('carries classes and templates through, dropping junk', () => {
    const out = sanitizeImport({
      classes: [{ id: 'c1' }, null, { name: 'no id' }],
      blockTemplates: [{ id: 'bt1' }],
      dayTemplates: [{ id: 'dt1' }],
    });
    expect(out.classes).toEqual([{ id: 'c1' }]);
    expect(out.blockTemplates).toEqual([{ id: 'bt1' }]);
    expect(out.dayTemplates).toEqual([{ id: 'dt1' }]);
  });

  it('keeps day plans keyed by date and drops entries without one', () => {
    const out = sanitizeImport({
      dayPlans: [{ date: '2026-06-30', blocks: [] }, { blocks: [] }, null],
    });
    expect(out.dayPlans).toEqual([{ date: '2026-06-30', blocks: [] }]);
  });
});
