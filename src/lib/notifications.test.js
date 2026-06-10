import { describe, it, expect } from 'vitest';
import { intId, buildFireDate } from './notifications.js';

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
