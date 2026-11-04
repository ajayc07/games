// Branches off a map (Task 037, D-085): the unlock rule, the layout of the mouth and the way-back arch, and one record for every world.
import { describe, expect, it } from 'vitest';
import type { WorldDef } from '../types';
import { branchOpen, branchesOf, currentDot, forkIndex, worldDots, worldOfLevel, worldStars } from './unlock';
import { clampScroll, farHopMs, MAP, mapGeometry, scrollFor } from './mapLayout';
import { freshRecord, mergeResult, parseRecord, resetLevels, serializeRecord } from '../storage/progress';
import { logicalWidthFor } from '../ui/layoutMath';
import { parentLayout } from '../parent/parentLayout';

const main: WorldDef = { id: 'main', name: 'Main', levels: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'] };
const cave: WorldDef = { id: 'cave', name: 'Cave', levels: ['c1'], branchFrom: { world: 'main', fork: 'm6' }, unlock: { afterLevel: 'm6' } };
const sky: WorldDef = { id: 'sky', name: 'Sky', levels: [] };
const worlds = [main, cave, sky];
const lv = (stars: Record<string, number>) => Object.fromEntries(Object.entries(stars).map(([k, s]) => [k, { stars: s, bestCoins: 0 }]));

const SIZES: Array<[number, number]> = [
  [844, 390],
  [1280, 800],
  [1024, 768],
  [1366, 512],
  [2400, 1000],
];

describe('branch unlock (Task 037)', () => {
  it('finds the branches of a map (worlds without levels are teasers, not branches) and the dot they fork after', () => {
    expect(branchesOf(worlds, 'main').map((w) => w.id)).toEqual(['cave']);
    expect(branchesOf(worlds, 'cave')).toEqual([]);
    expect(forkIndex(main, cave)).toBe(5);
    expect(forkIndex(main, { ...cave, branchFrom: { world: 'main' } })).toBe(6); // default: the last dot
    expect(forkIndex(main, { ...cave, branchFrom: { world: 'main', fork: 'nope' } })).toBe(6);
  });

  it('is locked until the named level has a star, whatever else was played', () => {
    expect(branchOpen(cave, {})).toBe(false);
    expect(branchOpen(cave, lv({ m1: 3, m2: 3, m3: 3, m4: 3, m5: 3 }))).toBe(false);
    expect(branchOpen(cave, lv({ m6: 0 }))).toBe(false); // played but no star
    expect(branchOpen(cave, lv({ m6: 1 }))).toBe(true);
    expect(branchOpen({ ...cave, unlock: undefined }, {})).toBe(true); // no rule = open
  });

  it('opens at once with unlockAll or the parent flag, and the flag is per world', () => {
    expect(branchOpen(cave, {}, { unlockAll: true })).toBe(true);
    expect(branchOpen(cave, {}, { openedWorlds: ['cave'] })).toBe(true);
    expect(branchOpen(cave, {}, { openedWorlds: ['sky'] })).toBe(false);
    expect(branchOpen(cave, {}, { openedWorlds: [] })).toBe(false);
  });

  it('keeps one progress record for every world: per-world dots, star totals and the world of a level', () => {
    const levels = lv({ m1: 3, m6: 2, c1: 1 });
    expect(worldDots(cave, levels, { openAtATime: 3 }).map((d) => [d.id, d.stars, d.open])).toEqual([['c1', 1, true]]);
    expect(worldDots(main, levels, { openAtATime: 3 })[5].stars).toBe(2);
    expect(worldStars(cave, levels)).toEqual({ stars: 1, max: 3 });
    expect(worldStars(main, levels)).toEqual({ stars: 5, max: 21 });
    expect(worldOfLevel(worlds, 'c1')?.id).toBe('cave');
    expect(worldOfLevel(worlds, 'm3')?.id).toBe('main');
    expect(worldOfLevel(worlds, 'zzz')).toBeUndefined();
    // The current dot works per world: the robot stands on the only Cave level, cleared or not.
    expect(currentDot(worldDots(cave, lv({ c1: 1 }), { openAtATime: 3 }))).toBe(0);
    expect(currentDot(worldDots(cave, {}, { openAtATime: 3 }))).toBe(0);
  });

  it('a round trip between worlds keeps both worlds results; the parent flag survives a progress reset and a save', () => {
    let rec = freshRecord();
    rec = mergeResult(rec, 'm6', { stars: 2, coins: 30 });
    rec = { ...rec, openedWorlds: ['cave'] };
    rec = mergeResult(rec, 'c1', { stars: 1, coins: 12 }); // play in the Cave
    rec = mergeResult(rec, 'm1', { stars: 3, coins: 5 }); // and back in the main world
    expect(rec.levels.m6.stars).toBe(2);
    expect(rec.levels.c1.stars).toBe(1);
    const reset = resetLevels(rec);
    expect(reset.levels).toEqual({});
    expect(reset.openedWorlds).toEqual(['cave']);
    const parsed = parseRecord(serializeRecord(rec)).record;
    expect(parsed.openedWorlds).toEqual(['cave']);
    expect(parsed.levels.c1.stars).toBe(1);
    // An old save without the field, or a damaged one, loads as "nothing opened".
    expect(parseRecord(JSON.stringify({ version: 1 })).record.openedWorlds).toEqual([]);
    expect(parseRecord(JSON.stringify({ version: 1, openedWorlds: 'cave' })).record.openedWorlds).toEqual([]);
    expect(parseRecord(JSON.stringify({ version: 1, openedWorlds: ['cave', 'cave', 5, ''] })).record.openedWorlds).toEqual(['cave']);
  });
});

describe('map layout with a branch (Task 037)', () => {
  it('puts the mouth above the path just after the fork dot: a tap target of 170+ px that touches no dot and no teaser and the picture clears the top', () => {
    const g = mapGeometry(13, 2, { branchAfter: [5] });
    expect(g.branches).toHaveLength(1);
    const m = g.branches[0];
    expect(m.x).toBeGreaterThan(g.dots[5].x);
    expect(m.x).toBeLessThan(g.dots[6].x);
    expect(MAP.mouthHit).toBeGreaterThanOrEqual(170);
    expect(m.y - MAP.mouthH / 2).toBeGreaterThan(100);
    for (const d of g.dots) {
      const apartX = Math.abs(d.x - m.x) >= (MAP.dotHit + MAP.mouthHit) / 2;
      const apartY = Math.abs(d.y - 10 - m.y) >= (MAP.dotHit + MAP.mouthHit) / 2;
      expect(apartX || apartY, `dot at ${d.x}`).toBe(true);
    }
    for (const t of g.teasers) expect(Math.abs(t.x - m.x)).toBeGreaterThan((MAP.teaserHit + MAP.mouthHit) / 2);
    // The base of the arch is clear of the avatar standing on the next dot.
    expect(m.y + MAP.mouthH / 2).toBeLessThan(g.dots[6].y - 60);
    expect(g.width).toBeGreaterThan(m.x + MAP.mouthW / 2);
    expect(g.back).toBeNull();
  });

  it('the mouth is fully on screen at every test size when the robot stands on the fork dot or on the next dot', () => {
    const g = mapGeometry(13, 2, { branchAfter: [5] });
    for (const [w, h] of SIZES) {
      const sw = logicalWidthFor(w, h);
      const m = g.branches[0];
      for (const focus of [g.dots[5].x, g.dots[6].x]) {
        const x = m.x - scrollFor(g.width, sw, focus);
        expect(x - MAP.mouthHit / 2, `${w}x${h} focus ${focus}`).toBeGreaterThanOrEqual(0);
        expect(x + MAP.mouthHit / 2, `${w}x${h} focus ${focus}`).toBeLessThanOrEqual(sw);
      }
      // Reachable by dragging: some scroll inside the map's range shows the whole tap square.
      const centred = clampScroll(m.x - sw / 2, g.width, sw);
      expect(m.x - centred - MAP.mouthHit / 2).toBeGreaterThanOrEqual(0);
      expect(m.x - centred + MAP.mouthHit / 2).toBeLessThanOrEqual(sw);
    }
  });

  it('a branch map has the way-back arch left of the first dot, fully on screen at every size with the robot on that dot', () => {
    const g = mapGeometry(1, 2, { back: true });
    expect(g.back).not.toBeNull();
    expect(g.back!.x).toBe(g.dots[0].x + MAP.backDx);
    expect(g.back!.x - MAP.mouthHit / 2).toBeGreaterThanOrEqual(0);
    expect(g.dots[0].x - g.back!.x).toBeGreaterThan((MAP.dotHit + MAP.mouthHit) / 2);
    for (const [w, h] of SIZES) {
      const sw = logicalWidthFor(w, h);
      const sc = scrollFor(g.width, sw, g.dots[0].x);
      const x = g.back!.x - sc;
      expect(x - MAP.mouthHit / 2, `${w}x${h}`).toBeGreaterThanOrEqual(0);
      expect(x + MAP.mouthHit / 2, `${w}x${h}`).toBeLessThanOrEqual(sw);
      expect(g.dots[0].x - sc - MAP.dotHit / 2, `${w}x${h}`).toBeGreaterThanOrEqual(0);
    }
    expect(mapGeometry(1, 2).back).toBeNull();
  });

  it('keeps the old geometry without a branch, and times a long hop between a normal hop and a cap', () => {
    expect(mapGeometry(6, 3).width).toBe(2785);
    expect(mapGeometry(3, 3, { branchAfter: [] }).dots.map((d) => d.x)).toEqual([230, 530, 830]);
    const a = { x: 0, y: 300 };
    expect(farHopMs(a, { x: 100, y: 300 })).toBe(MAP.hopMs);
    expect(farHopMs(a, { x: 1400, y: 300 })).toBeGreaterThan(MAP.hopMs);
    expect(farHopMs(a, { x: 99999, y: 300 })).toBe(MAP.farHopMaxMs);
  });
});

describe('parent view with the "Open the Cave now" row (Task 037)', () => {
  const NOTCH = { top: 0, right: 48, bottom: 20, left: 48 };
  const NONE = { top: 0, right: 0, bottom: 0, left: 0 };
  it('adds one row right under Unlock all; every control still fits and nothing overlaps', () => {
    for (const [w0, h0] of SIZES) {
      for (const insets of [NONE, NOTCH]) {
        const w = logicalWidthFor(w0, h0);
        const l = parentLayout(w, 720, insets, false, true);
        expect(l.rows.map((r) => r.id)).toEqual(['sound', 'look', 'main', 'unlock', 'branch', 'assist', 'demos']);
        expect(parentLayout(w, 720, insets, false, false).rows.map((r) => r.id)).toEqual(['sound', 'look', 'main', 'unlock', 'assist', 'demos']);
        const ctrls = l.rows.flatMap((r) => r.controls);
        for (const c of ctrls) {
          expect(c.height).toBeGreaterThanOrEqual(80);
          expect(c.y + c.height, `${w0}x${h0}`).toBeLessThanOrEqual(720 - insets.bottom);
        }
        for (let i = 1; i < l.rows.length; i++) expect(l.rows[i].rect.y).toBeGreaterThanOrEqual(l.rows[i - 1].rect.y + l.rows[i - 1].rect.height + 8);
      }
    }
  });
});
