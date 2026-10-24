import { describe, expect, it } from 'vitest';
import type { WorldDef } from '../types';
import { currentDot, newlyOpened, stepOpen, unlockFromSearch, worldDots } from './unlock';
import { clampScroll, hitIndex, hopPoint, MAP, mapGeometry, scrollFor } from './mapLayout';
import { logicalWidthFor } from '../ui/layoutMath';

const grass: WorldDef = { id: 'grass', name: 'Grass', levels: ['g1', 'g2', 'g3'] };
const five: WorldDef = { id: 'w', name: 'W', levels: ['a', 'b', 'c', 'd', 'e'] };
const lv = (stars: Record<string, number>) => Object.fromEntries(Object.entries(stars).map(([k, s]) => [k, { stars: s, bestCoins: 0 }]));
const openIds = (w: WorldDef, l: ReturnType<typeof lv>, openAtATime: number, unlockAll = false) =>
  worldDots(w, l, { openAtATime, unlockAll }).filter((d) => d.open).map((d) => d.id);

describe('unlock rule (D-036, D-037)', () => {
  it('openAtATime 3: all three Grass levels open on a fresh start', () => {
    expect(openIds(grass, {}, 3)).toEqual(['g1', 'g2', 'g3']);
  });

  it('openAtATime 2: Grass 3 stays under a cloud until Grass 1 is cleared', () => {
    expect(openIds(grass, {}, 2)).toEqual(['g1', 'g2']);
    expect(openIds(grass, lv({ g1: 0 }), 2)).toEqual(['g1', 'g2']); // played but no star = not cleared
    expect(openIds(grass, lv({ g1: 1 }), 2)).toEqual(['g1', 'g2', 'g3']);
  });

  it('openAtATime 1: one level at a time, each clear opens the next', () => {
    expect(openIds(five, {}, 1)).toEqual(['a']);
    expect(openIds(five, lv({ a: 2 }), 1)).toEqual(['a', 'b']);
    expect(openIds(five, lv({ a: 2, b: 1 }), 1)).toEqual(['a', 'b', 'c']);
    expect(openIds(five, lv({ a: 3, b: 3, c: 1, d: 1 }), 1)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('counts cleared levels, wherever they are', () => {
    // A later level cleared (e.g. with unlock=all before) still counts.
    expect(openIds(five, lv({ c: 1 }), 2)).toEqual(['a', 'b', 'c']);
  });

  it('unlockAll opens everything, including a star-gated final level', () => {
    const gated: WorldDef = { ...grass, finalLevelStarsRequired: 5 };
    expect(openIds(gated, {}, 1, true)).toEqual(['g1', 'g2', 'g3']);
  });

  it('finalLevelStarsRequired gates the last level by stars in the world', () => {
    const gated: WorldDef = { ...grass, finalLevelStarsRequired: 5 };
    expect(openIds(gated, lv({ g1: 2, g2: 2 }), 3)).toEqual(['g1', 'g2']);
    expect(openIds(gated, lv({ g1: 3, g2: 2 }), 3)).toEqual(['g1', 'g2', 'g3']);
  });

  it('stars are clamped and cleared means at least one star', () => {
    const d = worldDots(grass, lv({ g1: 7, g2: -1 }), { openAtATime: 3 });
    expect(d.map((x) => [x.stars, x.cleared])).toEqual([
      [3, true],
      [0, false],
      [0, false],
    ]);
  });

  it('reads ?unlock=all and, only with ?debug, ?open=N', () => {
    expect(unlockFromSearch('?unlock=all', 3)).toEqual({ openAtATime: 3, unlockAll: true });
    expect(unlockFromSearch('?open=2', 3)).toEqual({ openAtATime: 3, unlockAll: false });
    expect(unlockFromSearch('?debug=1&open=2', 3)).toEqual({ openAtATime: 2, unlockAll: false });
    expect(unlockFromSearch('?debug=1&open=zero', 3).openAtATime).toBe(3);
  });
});

describe('map position (current dot)', () => {
  const dots = (open: number, stars: number[]) =>
    worldDots(five, lv(Object.fromEntries(five.levels.map((id, i) => [id, stars[i] ?? 0]))), { openAtATime: open });

  it('stands on the next level to play: the first open level not yet cleared', () => {
    expect(currentDot(dots(3, []))).toBe(0);
    expect(currentDot(dots(3, [1]))).toBe(1);
    expect(currentDot(dots(3, [1, 2]))).toBe(2);
    expect(currentDot(dots(3, [0, 1]))).toBe(0); // a skipped level comes first
  });

  it('when everything open is cleared: the furthest cleared dot', () => {
    expect(currentDot(dots(9, [1, 1, 1, 1, 1]))).toBe(4);
    expect(currentDot(worldDots(grass, lv({ g1: 1, g2: 1, g3: 3 }), { openAtATime: 3 }))).toBe(2);
  });

  it('finds dots that just opened, and steps between open dots', () => {
    const before = worldDots(grass, {}, { openAtATime: 2 });
    const after = worldDots(grass, lv({ g1: 1 }), { openAtATime: 2 });
    expect(newlyOpened(before, after)).toEqual([2]);
    expect(newlyOpened(after, after)).toEqual([]);
    expect(stepOpen(before, 0, 1)).toBe(1);
    expect(stepOpen(before, 1, 1)).toBe(1); // next is locked: stay
    expect(stepOpen(before, 0, -1)).toBe(0);
  });
});

describe('map layout', () => {
  it('places dots left to right on a wavy path, then the teasers, with every target at least 96 px', () => {
    const g = mapGeometry(3, 3);
    expect(g.dots.map((d) => d.x)).toEqual([230, 530, 830]);
    expect(g.teasers[0].x).toBeGreaterThan(g.dots[2].x + MAP.dotGap * 0.5);
    expect(g.width).toBeGreaterThan(g.teasers[2].x);
    expect(MAP.dotHit).toBeGreaterThanOrEqual(96);
    expect(MAP.teaserHit).toBeGreaterThanOrEqual(96);
    for (const d of g.dots) {
      expect(d.y - 150).toBeGreaterThan(170); // the avatar on a dot stays below the palette button (top 168 px)
      expect(d.y + 75).toBeLessThan(MAP.groundY + 30); // star slots above the ground strip
    }
    // Neighbouring hit areas never overlap.
    expect(g.dots[1].x - g.dots[0].x).toBeGreaterThan(MAP.dotHit);
  });

  it('centres a map narrower than the screen and follows the current dot on a wider one', () => {
    const g = mapGeometry(3, 3);
    const wide = logicalWidthFor(1366, 512); // 1920, the widest
    expect(g.width).toBeLessThan(wide);
    expect(scrollFor(g.width, wide, g.dots[0].x)).toBeCloseTo(-(wide - g.width) / 2);
    const narrow = logicalWidthFor(1024, 768); // 960
    expect(scrollFor(g.width, narrow, g.dots[0].x)).toBe(0);
    const s2 = scrollFor(g.width, narrow, g.dots[2].x);
    expect(g.dots[2].x - s2).toBeCloseTo(narrow * MAP.focus);
    expect(scrollFor(g.width, narrow, 99999)).toBe(g.width - narrow);
    expect(clampScroll(-50, g.width, narrow)).toBe(0);
  });

  it('every dot is fully on screen when it is the focus, at all test sizes, with 3, 4 or 5 levels (Task 008)', () => {
    for (const levels of [3, 4, 5]) {
      const g = mapGeometry(levels, 3);
      for (const [w, h] of [
        [844, 390],
        [1280, 800],
        [1024, 768],
        [1366, 512],
        [2400, 1000],
      ]) {
        const sw = logicalWidthFor(w, h);
        for (const d of g.dots) {
          const x = d.x - scrollFor(g.width, sw, d.x);
          expect(x - MAP.dotHit / 2, `${levels} levels at ${w}x${h}`).toBeGreaterThanOrEqual(0);
          expect(x + MAP.dotHit / 2, `${levels} levels at ${w}x${h}`).toBeLessThanOrEqual(sw);
        }
      }
    }
  });

  it('scrolled to the far end, the last dot, the teasers and the map end are reachable (five levels)', () => {
    const g = mapGeometry(5, 3);
    expect(g.width).toBe(2485);
    for (const sw of [960, 1152, 1558, 1728, 1920]) {
      const end = clampScroll(99999, g.width, sw);
      for (const t of g.teasers) {
        const x = t.x - end;
        expect(x - MAP.teaserHit / 2).toBeGreaterThanOrEqual(0);
        expect(x + MAP.teaserHit / 2).toBeLessThanOrEqual(sw);
      }
      // The scroll never goes past either end of the map, so no empty space is shown.
      expect(clampScroll(-500, g.width, sw)).toBe(0);
      expect(end).toBe(g.width - sw);
    }
  });

  it('hit tests and hops', () => {
    const g = mapGeometry(3, 0);
    expect(hitIndex(g.dots, 530, 330, MAP.dotHit)).toBe(1);
    expect(hitIndex(g.dots, 380, 330, MAP.dotHit)).toBe(-1);
    const a = { x: 0, y: 100 };
    const b = { x: 300, y: 200 };
    expect(hopPoint(a, b, 0)).toEqual({ x: 0, y: 100, lift: 0 });
    expect(hopPoint(a, b, 0.5).lift).toBeCloseTo(MAP.hopLift);
    expect(hopPoint(a, b, 1)).toMatchObject({ x: 300, y: 200 });
    expect(hopPoint(a, b, 2).x).toBe(300);
  });
});
