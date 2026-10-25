import { describe, expect, it } from 'vitest';
import { logicalWidthFor } from '../ui/layoutMath';
import { CARD_ORDER, MAP_PRACTICE, mapPracticeSpot, moveCardFocus, practiceSelectLayout, SELECT } from './practiceLayout';
import { practiceStars, resultHandlerFor, walkAssistOn } from './practiceResult';
import { MAP, mapGeometry } from '../map/mapLayout';
import { generatePractice } from '../levels/practice';
import { parseLevelOrThrow } from '../levels/format';
import { MemoryBackend } from '../storage/backends';
import { ProgressStore } from '../storage/store';
import grass6 from '../../universes/robo/levels/grass-6.json';

const SIZES: Array<[number, number]> = [
  [844, 390],
  [1280, 800],
  [1024, 768],
  [1366, 512],
  [2400, 1000],
];
const NONE = { top: 0, right: 0, bottom: 0, left: 0 };
const NOTCH = { top: 0, right: 48, bottom: 20, left: 48 };

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
const overlap = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const square = (x: number, y: number, side: number): Box => ({ x: x - side / 2, y: y - side / 2, width: side, height: side });

describe('practice selector layout (Task 011)', () => {
  for (const [w, h] of SIZES) {
    for (const [name, ins] of [
      ['no insets', NONE],
      ['insets', NOTCH],
    ] as const) {
      it(`${w}x${h} (${name}): four big cards in a 2x2 grid and a big Back button, inside the insets, no overlaps`, () => {
        const width = logicalWidthFor(w, h);
        const l = practiceSelectLayout(width, 720, ins);
        expect(l.cards.map((c) => c.mode)).toEqual([...CARD_ORDER]);
        const back = square(l.back.x, l.back.y, l.back.r * 2);
        expect(l.back.r * 2).toBeGreaterThanOrEqual(120);
        expect(back.x).toBeGreaterThanOrEqual(ins.left);
        expect(back.y + back.height).toBeLessThanOrEqual(720 - ins.bottom);
        for (const [i, c] of l.cards.entries()) {
          expect(c.width).toBeGreaterThanOrEqual(SELECT.card.minSide);
          expect(c.height).toBeGreaterThanOrEqual(SELECT.card.minSide);
          expect(c.x).toBeGreaterThanOrEqual(ins.left);
          expect(c.y).toBeGreaterThanOrEqual(ins.top);
          expect(c.x + c.width).toBeLessThanOrEqual(width - ins.right);
          expect(c.y + c.height).toBeLessThanOrEqual(720 - ins.bottom);
          expect(overlap(c, back)).toBe(false);
          for (const d of l.cards.slice(i + 1)) {
            const g = SELECT.gap - 1;
            expect(overlap({ x: c.x - g, y: c.y - g, width: c.width + 2 * g, height: c.height + 2 * g }, d)).toBe(false);
          }
        }
        expect(l.cards[2].y).toBeGreaterThan(l.cards[0].y); // two rows
        expect(l.cards[1].x).toBeGreaterThan(l.cards[0].x);
      });
    }
  }

  it('arrows move the cursor in the 2x2 grid', () => {
    expect(moveCardFocus(0, 'right')).toBe(1);
    expect(moveCardFocus(3, 'right')).toBe(0);
    expect(moveCardFocus(0, 'left')).toBe(3);
    expect(moveCardFocus(0, 'down')).toBe(2);
    expect(moveCardFocus(2, 'down')).toBe(2);
    expect(moveCardFocus(3, 'up')).toBe(1);
    expect(moveCardFocus(1, 'up')).toBe(1);
  });
});

describe('the map Practice button (Task 011)', () => {
  for (const [w, h] of SIZES.filter(([w]) => w !== 1366)) {
    for (const [name, ins] of [
      ['no insets', NONE],
      ['insets', NOTCH],
    ] as const) {
      it(`${w}x${h} (${name}): inside the insets, a big hit area, clear of the gear, the palette and every dot`, () => {
        const width = logicalWidthFor(w, h);
        const s = mapPracticeSpot(width, 720, ins);
        expect(s.hit).toBeGreaterThanOrEqual(96);
        const hit = square(s.x, s.y, s.hit + 2 * MAP_PRACTICE.bob);
        expect(hit.x).toBeGreaterThanOrEqual(ins.left);
        expect(hit.y).toBeGreaterThanOrEqual(ins.top);
        expect(s.x + s.r).toBeLessThanOrEqual(width - ins.right);
        expect(s.y + s.r + MAP_PRACTICE.bob).toBeLessThanOrEqual(720 - ins.bottom);
        // The gear (top-left, inset 84, hit 110) and the palette (top-right, inset 84, r 56, hit 2.2 r).
        expect(overlap(hit, square(ins.left + 84, ins.top + 84, 110))).toBe(false);
        expect(overlap(hit, square(width - ins.right - 84, ins.top + 84, 56 * 2.2))).toBe(false);
        // Dots scroll under it horizontally, so it must be below every dot's tap area, star slots and avatar.
        const geo = mapGeometry(6, 3);
        for (const d of geo.dots) expect(hit.y).toBeGreaterThan(d.y - 10 + MAP.dotHit / 2);
        for (const t of geo.teasers) expect(hit.y).toBeGreaterThan(t.y - 30 + MAP.teaserHit / 2);
      });
    }
  }
});

describe('practice results (Task 011)', () => {
  it('the walk assist is for practice levels only: Grass 1-6 walk as before with it switched on', async () => {
    const files = import.meta.glob<unknown>('../../universes/robo/levels/*.json', { eager: true, import: 'default' });
    const normal = Object.values(files).map((raw) => parseLevelOrThrow(raw));
    expect(normal.length).toBe(6);
    for (const lv of normal) {
      expect(walkAssistOn(lv, 'sticky'), lv.id).toBe(false);
      expect(walkAssistOn(lv, true), lv.id).toBe(false);
    }
    const practice = parseLevelOrThrow(generatePractice('walk-shoot', 1).config);
    expect(walkAssistOn(practice, 'sticky')).toBe(true);
    expect(walkAssistOn(practice, 'off')).toBe(false);
  });

  it('the win screen shows one star per combo: 5 slots, 10 for a busy run, no more', () => {
    expect(practiceStars(0)).toEqual({ slots: 5, filled: 0 });
    expect(practiceStars(3)).toEqual({ slots: 5, filled: 3 });
    expect(practiceStars(5)).toEqual({ slots: 5, filled: 5 });
    expect(practiceStars(6)).toEqual({ slots: 10, filled: 6 });
    expect(practiceStars(40)).toEqual({ slots: 10, filled: 10 });
  });

  it('a practice level never records progress, even if a result callback is passed; normal levels do', async () => {
    const mem = new MemoryBackend();
    const store = await ProgressStore.open('robo', { backends: [mem] });
    store.recordResult('grass-1', { stars: 2, coins: 9 });
    await store.flush();
    const before = JSON.stringify(store.record);
    const saved = await mem.get('athi.robo.progress');
    const practice = parseLevelOrThrow(generatePractice('everything', 5).config);
    const onResult = (r: { stars: number; coins: number }) => store.recordResult(practice.id, r);
    resultHandlerFor(practice, onResult)?.({ stars: 3, coins: 99 });
    await store.flush();
    expect(JSON.stringify(store.record)).toBe(before);
    expect(await mem.get('athi.robo.progress')).toBe(saved);
    expect(store.record.levels[practice.id]).toBeUndefined();
    // A normal level still records.
    const g6 = parseLevelOrThrow(grass6);
    resultHandlerFor(g6, (r: { stars: number; coins: number }) => store.recordResult(g6.id, r))?.({ stars: 1, coins: 3 });
    expect(store.record.levels['grass-6']).toEqual({ stars: 1, bestCoins: 3 });
  });
});
