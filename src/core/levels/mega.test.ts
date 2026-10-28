import { describe, expect, it } from 'vitest';
import { MEGA, addToBar, barCapacity, barFraction, narrowGaps } from './mega';

describe('Mega Robo rules (Task 030, D-073)', () => {
  it('about two fills per level, never fewer than 8 coins, a fixed number in zen', () => {
    expect(barCapacity(60, false)).toBe(30);
    expect(barCapacity(10, false)).toBe(MEGA.minCapacity);
    expect(barCapacity(999, true)).toBe(MEGA.zenCapacity);
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
