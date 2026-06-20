import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  todayISO, addDays, fmtTime, getDayKey,
  setWeekStart, weekISO, weekDaysFrom, newId,
  nextOccurrence, isHabitDueOn, computeStreak,
  habitWeeklyTarget, CAP_WEEKDAY,
} from './helpers.js';

// 2026-06-10 is a Wednesday — fixed reference point for everything below.
const NOW = new Date('2026-06-10T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  setWeekStart('monday');
});

describe('todayISO', () => {
  it('returns the current date as YYYY-MM-DD', () => {
    expect(todayISO()).toBe('2026-06-10');
  });

  it('uses the local calendar date, not UTC', () => {
    // 20:00 UTC on Jun 10 is already 03:00 on Jun 11 in Jakarta (UTC+7)
    const prevTZ = process.env.TZ;
    process.env.TZ = 'Asia/Jakarta';
    try {
      vi.setSystemTime(new Date('2026-06-10T20:00:00Z'));
      expect(todayISO()).toBe('2026-06-11');
    } finally {
      process.env.TZ = prevTZ;
    }
  });
});

describe('addDays', () => {
  it('adds days to an explicit base date', () => {
    expect(addDays(1, '2026-06-10')).toBe('2026-06-11');
    expect(addDays(-1, '2026-06-10')).toBe('2026-06-09');
    expect(addDays(0, '2026-06-10')).toBe('2026-06-10');
  });

  it('rolls over month boundaries', () => {
    expect(addDays(1, '2026-01-31')).toBe('2026-02-01');
    expect(addDays(1, '2026-12-31')).toBe('2027-01-01');
  });

  it('defaults to today when no base is given', () => {
    expect(addDays(1)).toBe('2026-06-11');
  });
});

describe('fmtTime', () => {
  it('converts 24h HH:MM to 12h with AM/PM', () => {
    expect(fmtTime('09:05')).toBe('9:05 AM');
    expect(fmtTime('00:30')).toBe('12:30 AM');
    expect(fmtTime('12:00')).toBe('12:00 PM');
    expect(fmtTime('23:15')).toBe('11:15 PM');
  });
});

describe('getDayKey', () => {
  it('maps a Date to the Mon-first weekday key', () => {
    expect(getDayKey(new Date('2026-06-08T00:00:00'))).toBe('Mon');
    expect(getDayKey(new Date('2026-06-10T00:00:00'))).toBe('Wed');
    expect(getDayKey(new Date('2026-06-13T00:00:00'))).toBe('Sat');
    expect(getDayKey(new Date('2026-06-14T00:00:00'))).toBe('Sun');
  });
});

describe('weekISO', () => {
  it('returns the Monday-start week containing today by default', () => {
    expect(weekISO()).toEqual([
      '2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11',
      '2026-06-12', '2026-06-13', '2026-06-14',
    ]);
  });

  it('returns the Sunday-start week when asked', () => {
    expect(weekISO(undefined, 'sunday')).toEqual([
      '2026-06-07', '2026-06-08', '2026-06-09', '2026-06-10',
      '2026-06-11', '2026-06-12', '2026-06-13',
    ]);
  });

  it('accepts an explicit anchor date', () => {
    expect(weekISO('2026-06-14')[0]).toBe('2026-06-08'); // Sunday → same Mon-start week
    expect(weekISO('2026-06-15')[0]).toBe('2026-06-15'); // Monday starts a new week
  });

  it('respects the module-level week start set via setWeekStart', () => {
    setWeekStart('sunday');
    expect(weekISO()[0]).toBe('2026-06-07');
    setWeekStart('monday');
    expect(weekISO()[0]).toBe('2026-06-08');
  });
});

describe('weekDaysFrom', () => {
  it('orders weekday keys by week start', () => {
    expect(weekDaysFrom('monday')).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(weekDaysFrom('sunday')).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  });
});

describe('newId', () => {
  it('produces distinct non-empty string ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => newId()));
    expect(ids.size).toBe(100);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+$/);
  });
});

describe('nextOccurrence', () => {
  it('returns null for non-recurring items', () => {
    expect(nextOccurrence('none', [], '2026-06-10')).toBe(null);
    expect(nextOccurrence(undefined, [], '2026-06-10')).toBe(null);
  });

  it('advances daily/weekly/biweekly by fixed steps', () => {
    expect(nextOccurrence('daily', [], '2026-06-10')).toBe('2026-06-11');
    expect(nextOccurrence('weekly', [], '2026-06-10')).toBe('2026-06-17');
    expect(nextOccurrence('biweekly', [], '2026-06-10')).toBe('2026-06-24');
  });

  it('advances monthly keeping the day-of-month', () => {
    expect(nextOccurrence('monthly', [], '2026-06-15')).toBe('2026-07-15');
  });

  it('clamps monthly to the last day of shorter months', () => {
    expect(nextOccurrence('monthly', [], '2026-01-31')).toBe('2026-02-28');
    expect(nextOccurrence('monthly', [], '2024-01-31')).toBe('2024-02-29'); // leap year
    expect(nextOccurrence('monthly', [], '2026-08-31')).toBe('2026-09-30');
  });

  it('skips weekends for weekdays recurrence', () => {
    expect(nextOccurrence('weekdays', [], '2026-06-10')).toBe('2026-06-11'); // Wed → Thu
    expect(nextOccurrence('weekdays', [], '2026-06-12')).toBe('2026-06-15'); // Fri → Mon
  });

  it('finds the next matching custom weekday', () => {
    expect(nextOccurrence('custom', ['Mon', 'Wed'], '2026-06-10')).toBe('2026-06-15'); // Wed → Mon
    expect(nextOccurrence('custom', ['Fri'], '2026-06-10')).toBe('2026-06-12');
  });

  it('returns null for custom recurrence without selected days', () => {
    expect(nextOccurrence('custom', [], '2026-06-10')).toBe(null);
  });
});

describe('isHabitDueOn', () => {
  it('daily habits are always due', () => {
    expect(isHabitDueOn({ frequency: 'daily' }, '2026-06-13')).toBe(true);
  });

  it('weekday habits skip weekends', () => {
    const h = { frequency: 'weekdays' };
    expect(isHabitDueOn(h, '2026-06-10')).toBe(true);  // Wed
    expect(isHabitDueOn(h, '2026-06-13')).toBe(false); // Sat
    expect(isHabitDueOn(h, '2026-06-14')).toBe(false); // Sun
  });

  it('3x habits count on any day', () => {
    expect(isHabitDueOn({ frequency: '3x' }, '2026-06-14')).toBe(true);
  });

  it('custom habits are due only on selected days', () => {
    const h = { frequency: 'custom', customDays: ['Mon', 'Fri'] };
    expect(isHabitDueOn(h, '2026-06-08')).toBe(true);  // Mon
    expect(isHabitDueOn(h, '2026-06-09')).toBe(false); // Tue
  });
});

describe('computeStreak', () => {
  it('is 0 with no completions', () => {
    expect(computeStreak([], 'daily', [])).toBe(0);
  });

  it('counts consecutive daily completions through today', () => {
    expect(computeStreak(['2026-06-10', '2026-06-09', '2026-06-08'], 'daily', [])).toBe(3);
  });

  it('does not break when today is not yet checked off', () => {
    expect(computeStreak(['2026-06-09', '2026-06-08'], 'daily', [])).toBe(2);
  });

  it('breaks at the first missed due day', () => {
    // yesterday missing → only today counts
    expect(computeStreak(['2026-06-10', '2026-06-08'], 'daily', [])).toBe(1);
  });

  it('skips non-due days for weekday habits', () => {
    // Wed, Tue, Mon this week + Fri last week; the weekend gap is not a miss
    const completions = ['2026-06-10', '2026-06-09', '2026-06-08', '2026-06-05'];
    expect(computeStreak(completions, 'weekdays', [])).toBe(4);
  });

  it('skips non-due days for custom habits', () => {
    // due Wed & Fri: today (Wed) + last Fri done, Wed before that missed
    expect(computeStreak(['2026-06-10', '2026-06-05'], 'custom', ['Wed', 'Fri'])).toBe(2);
  });
});

describe('habitWeeklyTarget', () => {
  it('maps each frequency to a weekly target', () => {
    expect(habitWeeklyTarget({ frequency: 'daily' })).toBe(7);
    expect(habitWeeklyTarget({ frequency: 'weekdays' })).toBe(5);
    expect(habitWeeklyTarget({ frequency: '3x' })).toBe(3);
    expect(habitWeeklyTarget({ frequency: 'custom', customDays: ['Mon', 'Wed', 'Fri'] })).toBe(3);
    expect(habitWeeklyTarget({ frequency: 'custom' })).toBe(0);
  });
});

describe('CAP_WEEKDAY', () => {
  it('numbers weekdays Sunday-first 1–7 for Capacitor', () => {
    expect(CAP_WEEKDAY.Sun).toBe(1);
    expect(CAP_WEEKDAY.Mon).toBe(2);
    expect(CAP_WEEKDAY.Sat).toBe(7);
  });
});
