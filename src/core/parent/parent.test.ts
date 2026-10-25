import { describe, expect, it } from 'vitest';
import { PARENT, parentLayout, previewFit, type Rect } from './parentLayout';
import { logicalWidthFor } from '../ui/layoutMath';
import { hitCirclesOverlap, placeButtons } from '../ui/buttonLayout';

const SIZES: Array<[string, number, number]> = [
  ['844x390', 844, 390],
  ['1280x800', 1280, 800],
  ['1024x768', 1024, 768],
  ['1366x512', 1366, 512],
  ['2400x1000', 2400, 1000],
];
const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };
const NOTCH = { top: 0, right: 48, bottom: 20, left: 48 };

const overlap = (a: Rect, b: Rect) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const inside = (r: Rect, w: number, h: number, i: typeof NO_INSETS) =>
  r.x >= i.left - 0.01 && r.y >= i.top - 0.01 && r.x + r.width <= w - i.right + 0.01 && r.y + r.height <= h - i.bottom + 0.01;

describe('parent view layout', () => {
  for (const [name, cw, ch] of SIZES) {
    for (const [iname, insets] of [
      ['no insets', NO_INSETS],
      ['with insets', NOTCH],
    ] as const) {
      it(`${name}, ${iname}: every control fits, is big enough and nothing overlaps`, () => {
        const w = logicalWidthFor(cw, ch);
        const l = parentLayout(w, 720, insets);
        const controls: Rect[] = [...l.rows.flatMap((r) => r.controls), ...l.sizeSteps, l.reset, l.back];
        for (const c of controls) {
          expect(c.width).toBeGreaterThanOrEqual(80);
          expect(c.height).toBeGreaterThanOrEqual(80);
          expect(inside(c, w, 720, insets)).toBe(true);
        }
        for (const r of [l.preview, ...l.rows.map((r) => r.label)]) expect(inside(r, w, 720, insets)).toBe(true);
        // No two tappable things come closer than the gap (a thumb never hits two).
        for (let i = 0; i < controls.length; i++) {
          for (let j = i + 1; j < controls.length; j++) {
            const a = controls[i];
            const g = PARENT.gap - 1;
            expect(overlap({ x: a.x - g, y: a.y - g, width: a.width + g * 2, height: a.height + g * 2 }, controls[j])).toBe(false);
          }
        }
        for (const c of controls) expect(overlap(l.preview, c)).toBe(false);
        for (const r of l.rows) expect(overlap(l.preview, r.rect)).toBe(false);
        expect(l.preview.height).toBeGreaterThanOrEqual(PARENT.previewMinH);
      });
    }
  }

  it('the preview is a scaled copy of the real button layout at every size step', () => {
    for (const [, cw, ch] of SIZES) {
      const w = logicalWidthFor(cw, ch);
      const l = parentLayout(w, 720, NO_INSETS);
      const fit = previewFit(l.preview, w, 720);
      expect(fit.width).toBeLessThanOrEqual(l.preview.width);
      expect(fit.height).toBeLessThanOrEqual(l.preview.height);
      expect(fit.width / fit.height).toBeCloseTo(w / 720, 5);
      for (const scale of [0.8, 1, 1.2, 1.4]) {
        for (const primary of ['jump', 'power'] as const) {
          const ui = { x: 0, y: 0, width: w, height: 720 };
          const real = placeButtons({ shown: ['left', 'right', 'jump', 'power'], ui, short: 720, scale, primary });
          const jump = real.find((b) => b.action === 'jump')!;
          const power = real.find((b) => b.action === 'power')!;
          expect(hitCirclesOverlap(jump, power)).toBe(false);
          const [big, small] = primary === 'jump' ? [jump, power] : [power, jump];
          expect(big.radius).toBeGreaterThan(small.radius);
          // Everything stays on the mini screen.
          for (const b of real) {
            const x = fit.x + b.x * fit.k;
            const y = fit.y + b.y * fit.k;
            expect(x - b.radius * fit.k).toBeGreaterThanOrEqual(fit.x - 0.01);
            expect(x + b.radius * fit.k).toBeLessThanOrEqual(fit.x + fit.width + 0.01);
            expect(y + b.radius * fit.k).toBeLessThanOrEqual(fit.y + fit.height + 0.01);
          }
        }
      }
    }
  });

  it('the six settings are in a fixed order in the left column (walk assist added in Task 011); the right column is right of them', () => {
    const l = parentLayout(960, 720, NO_INSETS);
    expect(l.rows.map((r) => r.id)).toEqual(['sound', 'look', 'main', 'unlock', 'assist', 'demos']);
    expect(l.rows.map((r) => r.controls.length)).toEqual([2, 2, 2, 2, 2, 1]);
    // The rows keep the usual gap at every size (so the "no two controls closer than the gap" check above holds).
    for (const [, cw, ch] of SIZES) {
      for (const ins of [NO_INSETS, NOTCH]) {
        const rows = parentLayout(logicalWidthFor(cw, ch), 720, ins).rows;
        for (let i = 1; i < rows.length; i++) expect(rows[i].rect.y - rows[i - 1].rect.y - PARENT.rowH).toBe(PARENT.gap);
      }
    }
    expect(l.sizeSteps).toHaveLength(4);
    const leftEdge = Math.max(...l.rows.map((r) => r.rect.x + r.rect.width));
    expect(Math.min(l.preview.x, l.reset.x, ...l.sizeSteps.map((s) => s.x))).toBeGreaterThan(leftEdge);
  });
});
