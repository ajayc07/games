import { describe, expect, it } from 'vitest';
import { MEGA, addToBar, barFraction, megaPlan, narrowGaps, zenCapacity } from './mega';

describe('Mega Robo rules (Task 030, D-073)', () => {
  it('zen: 50 coins for the first three fills, then 75, then 100, and so on up to a limit', () => {
    expect([0, 1, 2].map(zenCapacity)).toEqual([50, 50, 50]);
    expect([3, 4, 5].map(zenCapacity)).toEqual([75, 75, 75]);
    expect([6, 9].map(zenCapacity)).toEqual([100, 125]);
    expect(zenCapacity(500)).toBe(MEGA.zenMax);
    expect(zenCapacity(-1)).toBe(50);
  });

  it('stages: no Mega Robo in the early levels, in power-up levels or in Practice; late levels fill once at 70% of the coins', () => {
    const base = { zen: false, practice: false, hasPickups: false, totalCoins: 100 };
    expect(megaPlan({ ...base, buttons: ['jump'] }).enabled).toBe(false);
    expect(megaPlan({ ...base, buttons: ['left', 'right', 'jump'] }).enabled).toBe(false);
    expect(megaPlan({ ...base, buttons: ['left', 'right', 'jump', 'power'], hasPickups: true }).enabled).toBe(false);
    expect(megaPlan({ ...base, buttons: ['left', 'right', 'jump', 'power'], practice: true }).enabled).toBe(false);
    const late = megaPlan({ ...base, buttons: ['left', 'right', 'jump', 'power'] });
    expect(late.enabled).toBe(true);
    expect(late.capacity(0)).toBe(70);
    expect(late.maxFills).toBe(1);
    expect(megaPlan({ ...base, buttons: ['left', 'right', 'jump', 'power'], totalCoins: 5 }).capacity(0)).toBe(MEGA.minCapacity);
    const zen = megaPlan({ ...base, zen: true, buttons: ['left', 'right', 'jump', 'power'], hasPickups: true });
    expect(zen.enabled).toBe(true);
    expect(zen.capacity(0)).toBe(50);
    expect(zen.capacity(3)).toBe(75);
    expect(zen.maxFills).toBe(Infinity);
  });

  it('the bar only grows, and fills exactly once per capacity, keeping the leftover', () => {
    let s = addToBar(0, 3, 10);
    expect(s).toEqual({ coins: 3, full: false });
    s = addToBar(s.coins, 6, 10);
    expect(s).toEqual({ coins: 9, full: false });
    s = addToBar(s.coins, 4, 10);
    expect(s).toEqual({ coins: 3, full: true });
    expect(addToBar(2, 0, 10)).toEqual({ coins: 2, full: false });
    expect(addToBar(2, -5, 10)).toEqual({ coins: 2, full: false });
    expect(addToBar(0, 50, 10).full).toBe(true);
  });

  it('the fraction is clamped for drawing', () => {
    expect(barFraction(5, 10)).toBe(0.5);
    expect(barFraction(15, 10)).toBe(1);
    expect(barFraction(1, 0)).toBe(0);
  });

  it('finds gaps of 1 and 2 tiles with ground on both sides, not wide ones or the open ends', () => {
    const rows = Array.from({ length: 11 }, () => Array.from({ length: 20 }, () => true));
    for (const c of [3, 8, 9, 14, 15, 16]) rows[9][c] = false;
    expect(narrowGaps(rows)).toEqual([{ col: 3, width: 1 }, { col: 8, width: 2 }]);
    const edge = Array.from({ length: 11 }, () => Array.from({ length: 6 }, () => true));
    edge[9][0] = false;
    edge[9][5] = false;
    expect(narrowGaps(edge)).toEqual([]);
  });

  it('he is bigger, faster and lasts long enough to enjoy', () => {
    expect(MEGA.boost).toBeGreaterThan(1.5);
    expect(MEGA.speedScale).toBeGreaterThan(1.2);
    expect(MEGA.durationMs).toBeGreaterThanOrEqual(10_000);
  });
});
