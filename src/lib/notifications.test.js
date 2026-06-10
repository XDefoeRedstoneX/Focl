import { describe, it, expect } from 'vitest';
import { intId, buildFireDate, buildNotificationSpecs } from './notifications.js';

describe('intId', () => {
  it('is deterministic for the same input', () => {
    expect(intId('abc123:0')).toBe(intId('abc123:0'));
  });

  it('distinguishes the per-item notification slots', () => {
    expect(intId('abc123:0')).not.toBe(intId('abc123:1'));
  });

  it('always returns a positive 31-bit integer', () => {
    for (const s of ['', 'a', 'task-xyz:3', '🙂', 'x'.repeat(500)]) {
      const id = intId(s);
      expect(Number.isInteger(id)).toBe(true);
      expect(id).toBeGreaterThan(0);
      expect(id).toBeLessThanOrEqual(2 ** 31 - 1);
    }
  });
});

describe('buildFireDate', () => {
  const ref = '2026-06-15';
  const at = (time) => new Date(`${ref}T${time}:00`);

  it('returns null without a reference date', () => {
    expect(buildFireDate('10min', '09:00', null)).toBe(null);
    expect(buildFireDate('10min', '09:00', undefined)).toBe(null);
  });

  it('fires at the chosen time for on-day', () => {
    expect(buildFireDate('on-day', '09:00', ref)).toEqual(at('09:00'));
  });

  it('subtracts the lead-time offsets', () => {
    expect(buildFireDate('10min', '09:00', ref)).toEqual(at('08:50'));
    expect(buildFireDate('30min', '09:00', ref)).toEqual(at('08:30'));
    expect(buildFireDate('1hour', '09:00', ref)).toEqual(at('08:00'));
    expect(buildFireDate('1day', '09:00', ref)).toEqual(new Date('2026-06-14T09:00:00'));
  });

  it('crosses midnight when the offset demands it', () => {
    expect(buildFireDate('30min', '00:10', ref)).toEqual(new Date('2026-06-14T23:40:00'));
  });

  it('treats unknown timings as zero offset', () => {
    expect(buildFireDate('custom', '14:30', ref)).toEqual(at('14:30'));
    expect(buildFireDate('bogus', '14:30', ref)).toEqual(at('14:30'));
  });
});

describe('buildNotificationSpecs', () => {
  // 2026-06-15 is a Monday
  const NOW = new Date('2026-06-01T00:00:00').getTime();
  const task = (over = {}) => ({
    id: 't1', name: 'Pay rent', notes: '',
    deadline: '2026-06-15', recurrence: 'none', customDays: [],
    notifications: [{ timing: 'on-day', time: '09:00' }],
    ...over,
  });

  it('returns nothing without reminders', () => {
    expect(buildNotificationSpecs(task({ notifications: [] }), 'task', NOW)).toEqual([]);
  });

  it('builds a one-shot for non-recurring items, skipping past times', () => {
    const specs = buildNotificationSpecs(task(), 'task', NOW);
    expect(specs).toHaveLength(1);
    expect(specs[0].schedule).toEqual({ at: new Date('2026-06-15T09:00:00'), allowWhileIdle: true });
    expect(specs[0].title).toBe('Pay rent');
    expect(specs[0].channelId).toBe('focl-reminders');

    const past = new Date('2026-07-01T00:00:00').getTime();
    expect(buildNotificationSpecs(task(), 'task', past)).toEqual([]);
  });

  it('daily recurrence repeats by time-of-day', () => {
    const specs = buildNotificationSpecs(task({ recurrence: 'daily' }), 'task', NOW);
    expect(specs).toHaveLength(1);
    expect(specs[0].schedule).toEqual({ on: { hour: 9, minute: 0 } });
  });

  it('weekly recurrence repeats on the fire weekday (Sunday-first numbering)', () => {
    const specs = buildNotificationSpecs(task({ recurrence: 'weekly' }), 'task', NOW);
    expect(specs[0].schedule).toEqual({ on: { weekday: 2, hour: 9, minute: 0 } }); // Monday
  });

  it('weekdays recurrence expands to five repeating schedules', () => {
    const specs = buildNotificationSpecs(task({ recurrence: 'weekdays' }), 'task', NOW);
    expect(specs.map(s => s.schedule.on.weekday)).toEqual([2, 3, 4, 5, 6]);
    // each expansion gets its own stable id
    expect(new Set(specs.map(s => s.id)).size).toBe(5);
  });

  it('custom recurrence maps the selected day keys', () => {
    const specs = buildNotificationSpecs(
      task({ recurrence: 'custom', customDays: ['Mon', 'Fri'] }), 'task', NOW);
    expect(specs.map(s => s.schedule.on.weekday)).toEqual([2, 6]);
  });

  it('monthly recurrence repeats on the day of month', () => {
    const specs = buildNotificationSpecs(task({ recurrence: 'monthly' }), 'task', NOW);
    expect(specs[0].schedule).toEqual({ on: { day: 15, hour: 9, minute: 0 } });
  });

  it('biweekly arms the next future occurrence as a one-shot', () => {
    const later = new Date('2026-06-20T00:00:00').getTime();
    const specs = buildNotificationSpecs(task({ recurrence: 'biweekly' }), 'task', later);
    expect(specs[0].schedule).toEqual({ at: new Date('2026-06-29T09:00:00'), allowWhileIdle: true });
  });

  it('uses the event start date as the reference for events', () => {
    const ev = {
      id: 'e1', name: 'Standup', notes: '', recurrence: 'none', customDays: [],
      startDatetime: '2026-06-15T09:30', endDatetime: '2026-06-15T09:45',
      notifications: [{ timing: '10min', time: '09:30' }],
    };
    const specs = buildNotificationSpecs(ev, 'event', NOW);
    expect(specs[0].schedule.at).toEqual(new Date('2026-06-15T09:20:00'));
    expect(specs[0].body).toBe('Event reminder');
  });
});
