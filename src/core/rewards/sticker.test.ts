import { describe, expect, it } from 'vitest';
import { stickerBookLayout } from './stickerLayout';

const NO = { top: 0, right: 0, bottom: 0, left: 0 };
const NOTCH = { top: 24, right: 48, bottom: 20, left: 48 };

describe('sticker book layout (Task 031)', () => {
  it('24 slots in 6 columns, all inside the screen and clear of Back and of each other, at every size', () => {
    for (const [w, h] of [[1280, 720], [1600, 720], [1066, 720], [900, 720]] as const) {
      for (const insets of [NO, NOTCH]) {
        const l = stickerBookLayout(w, h, insets);
        expect(l.slots).toHaveLength(24);
        expect(l.rows).toBe(4);
        for (const s of l.slots) {
          expect(s.r).toBeGreaterThanOrEqual(36);
          expect(s.x - s.r).toBeGreaterThanOrEqual(insets.left);
          expect(s.x + s.r).toBeLessThanOrEqual(w - insets.right);
          expect(s.y - s.r).toBeGreaterThanOrEqual(insets.top);
          expect(s.y + s.r).toBeLessThanOrEqual(h - insets.bottom);
          expect(Math.hypot(s.x - l.back.x, s.y - l.back.y)).toBeGreaterThan(s.r + l.back.r);
        }
        for (const [i, a] of l.slots.entries()) for (const b of l.slots.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.r + b.r);
      }
    }
  });
});
