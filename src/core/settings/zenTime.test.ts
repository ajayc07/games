import { describe, expect, it } from 'vitest';
import { DEFAULT_ZEN_LIMIT, ZEN_LIMITS, addZenMs, minutesText, resolveZenLimit, spentToday, todayKey, zenRemainingMs } from './zenTime';

describe('zen time management (Task 033, D-076)', () => {
  it('the choices are 15, 30, 60 minutes or none; the default is 30', () => {
    expect([...ZEN_LIMITS]).toEqual([15, 30, 60, 0]);
    expect(DEFAULT_ZEN_LIMIT).toBe(30);
  });

  it('the limit: the web address first (0 = none), then the saved value, then 30', () => {
    expect(resolveZenLimit('', {})).toBe(30);
    expect(resolveZenLimit('', { zenLimit: 60 })).toBe(60);
    expect(resolveZenLimit('', { zenLimit: 0 })).toBe(0);
    expect(resolveZenLimit('?zenlimit=0', { zenLimit: 15 })).toBe(0);
    expect(resolveZenLimit('?zenlimit=1', { zenLimit: 15 })).toBe(1);
    expect(resolveZenLimit('?zenlimit=abc', { zenLimit: 15 })).toBe(15);
  });

  it('counts today only: another day starts again from nothing', () => {
    expect(todayKey(new Date(2026, 9, 29, 23, 59))).toBe('2026-10-29');
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(spentToday(null, '2026-10-29')).toBe(0);
    expect(spentToday({ date: '2026-10-28', ms: 99_000 }, '2026-10-29')).toBe(0);
    expect(spentToday({ date: '2026-10-29', ms: 5000 }, '2026-10-29')).toBe(5000);
    let d = addZenMs(null, 4000, '2026-10-29');
    d = addZenMs(d, 6000.4, '2026-10-29');
    expect(d).toEqual({ date: '2026-10-29', ms: 10_000 });
    expect(addZenMs(d, 1000, '2026-10-30')).toEqual({ date: '2026-10-30', ms: 1000 });
    expect(addZenMs(d, -5, '2026-10-29').ms).toBe(10_000);
  });

  it('time left: none when there is no limit, never below zero', () => {
    expect(zenRemainingMs(0, 999_999)).toBeNull();
    expect(zenRemainingMs(15, 0)).toBe(900_000);
    expect(zenRemainingMs(15, 600_000)).toBe(300_000);
    expect(zenRemainingMs(15, 2_000_000)).toBe(0);
    expect(minutesText(125_000)).toBe('2 min');
  });
});
