// Task 009: the touch button layout (sizes, spacing, insets, no overlaps) and the nearest-button hit rule.
import { describe, expect, it } from 'vitest';
import {
  BUTTON_SIZE,
  EDGE_MARGIN,
  HIT_SLOP,
  MIN_BUTTON_SIZE,
  RIGHT_GAP,
  hitCirclesOverlap,
  parsePrimary,
  pickButton,
  placeButtons,
  type Area,
  type ButtonPlacement,
} from './buttonLayout';
import { LOGICAL_HEIGHT, logicalWidthFor } from './layoutMath';
import type { Action } from '../types';

const SIZES: Array<[number, number]> = [
  [844, 390],
  [1280, 800],
  [1024, 768],
  [1366, 512],
  [2400, 1000],
];
const ALL: Action[] = ['left', 'right', 'jump', 'power'];
const area = (w: number, h: number, insets = { top: 0, right: 0, bottom: 0, left: 0 }): Area => {
  const width = logicalWidthFor(w, h);
  return { x: insets.left, y: insets.top, width: width - insets.left - insets.right, height: LOGICAL_HEIGHT - insets.top - insets.bottom };
};
const by = (ps: ButtonPlacement[], a: Action) => ps.find((p) => p.action === a)!;
const place = (shown: Action[], ui: Area, extra: { scale?: number; primary?: 'jump' | 'power' } = {}) =>
  placeButtons({ shown, ui, short: LOGICAL_HEIGHT, ...extra });

describe('?buttons= (Task 009)', () => {
  it('defaults to jump; only "power" switches', () => {
    expect(parsePrimary('')).toBe('jump');
    expect(parsePrimary('?buttons=jump')).toBe('jump');
    expect(parsePrimary('?buttons=power')).toBe('power');
    expect(parsePrimary('?buttons=POWER')).toBe('jump');
    expect(parsePrimary('?buttons=left')).toBe('jump');
  });
});

describe('button layout: the layouts of Grass 1-5 are unchanged', () => {
  const ui = area(1024, 768); // 960 wide
  it('Left, Right and Jump (Grass 3, 5): 0.18 and 0.22 of the short edge', () => {
    const ps = place(['left', 'right', 'jump'], ui);
    const rl = (0.18 * 720) / 2;
    const rj = (0.22 * 720) / 2;
    expect(by(ps, 'left')).toMatchObject({ x: 28 + rl, y: 720 - 28 - rl, radius: rl });
    expect(by(ps, 'right').x).toBeCloseTo(28 + rl + rl + rl * 0.9 + rl);
    expect(by(ps, 'jump')).toMatchObject({ x: 960 - 28 - rj, y: 720 - 28 - rj, radius: rj });
  });

  it('Jump alone (Grass 2) and Power alone (Grass 4) are the big corner button (0.28)', () => {
    for (const a of ['jump', 'power'] as const) {
      const ps = place([a], ui);
      expect(ps.length).toBe(1);
      expect(ps[0].radius).toBeCloseTo((0.28 * 720) / 2);
      expect(ps[0].x).toBeCloseTo(960 - 28 - ps[0].radius);
    }
    // Left, Right and Power (Grass 4): Power takes the corner at the big size.
    const g4 = place(['left', 'right', 'power'], ui);
    expect(by(g4, 'power').radius).toBeCloseTo((0.28 * 720) / 2);
  });

  it('Left and Right with the right-hand button hidden still lay out', () => {
    expect(place(['left', 'right'], ui).map((p) => p.action)).toEqual(['left', 'right']);
    expect(place([], ui)).toEqual([]);
  });
});

describe('four buttons: Left, Right, Jump and Power (Task 009)', () => {
  for (const primary of ['jump', 'power'] as const) {
    for (const [w, h] of SIZES) {
      it(`?buttons=${primary} at ${w}x${h}: sizes, gaps and no overlaps`, () => {
        const ui = area(w, h);
        const ps = place(ALL, ui, { primary });
        expect(ps.length).toBe(4);
        const k = h / LOGICAL_HEIGHT; // physical px per logical unit
        const other: Action = primary === 'jump' ? 'power' : 'jump';
        // The two right-hand buttons are at least 0.20 of the short edge across (about 78 px at 844x390).
        for (const a of ['jump', 'power'] as const) expect((by(ps, a).radius * 2) / LOGICAL_HEIGHT, a).toBeGreaterThanOrEqual(MIN_BUTTON_SIZE);
        for (const a of [primary, other]) expect(by(ps, a).radius * 2 * k, a).toBeGreaterThanOrEqual(0.2 * h);
        // The primary is the larger corner button; the other is a similar size beside it.
        expect(by(ps, primary).radius).toBeGreaterThan(by(ps, other).radius);
        expect(by(ps, other).radius / by(ps, primary).radius).toBeGreaterThan(0.8);
        expect(by(ps, primary).x + by(ps, primary).radius).toBeCloseTo(ui.x + ui.width - EDGE_MARGIN);
        expect(by(ps, primary).y + by(ps, primary).radius).toBeCloseTo(ui.y + ui.height - EDGE_MARGIN);
        expect(by(ps, other).x).toBeLessThan(by(ps, primary).x);
        // At least 24 physical px between the two right-hand buttons' edges.
        const gap = Math.hypot(by(ps, primary).x - by(ps, other).x, by(ps, primary).y - by(ps, other).y) - by(ps, primary).radius - by(ps, other).radius;
        expect(gap, 'logical gap').toBeGreaterThanOrEqual(RIGHT_GAP - 0.001);
        expect(gap * k, 'physical gap').toBeGreaterThanOrEqual(24);
        // Left and Right are apart too.
        const lr = Math.hypot(by(ps, 'left').x - by(ps, 'right').x, by(ps, 'left').y - by(ps, 'right').y) - by(ps, 'left').radius - by(ps, 'right').radius;
        expect(lr * k).toBeGreaterThanOrEqual(24);
        // Nothing overlaps, and the two clusters leave room between them.
        for (let i = 0; i < ps.length; i++) {
          for (let j = i + 1; j < ps.length; j++) {
            const d = Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y);
            expect(d, `${ps[i].action}/${ps[j].action}`).toBeGreaterThan(ps[i].radius + ps[j].radius);
          }
        }
        expect(by(ps, 'right').x + by(ps, 'right').radius + 40).toBeLessThanOrEqual(by(ps, other).x - by(ps, other).radius);
        // Every circle is whole inside the screen.
        for (const p of ps) {
          expect(p.x - p.radius).toBeGreaterThanOrEqual(ui.x);
          expect(p.x + p.radius).toBeLessThanOrEqual(ui.x + ui.width);
          expect(p.y - p.radius).toBeGreaterThanOrEqual(ui.y);
          expect(p.y + p.radius).toBeLessThanOrEqual(ui.y + ui.height);
        }
        // The exit icon (top right, r 40 + hit 110 square) is far above the buttons.
        for (const p of ps) expect(p.y - p.radius).toBeGreaterThan(110 + 40);
        // The two right-hand hit circles do not overlap, so no touch is ambiguous between them.
        expect(hitCirclesOverlap(by(ps, 'jump'), by(ps, 'power'))).toBe(false);
      });
    }
  }

  it('stays inside the device insets (a notch and a home bar)', () => {
    const insets = { top: 0, right: 48, bottom: 22, left: 48 };
    const ui = area(2400, 1000, insets);
    const ps = place(ALL, ui);
    for (const p of ps) {
      expect(p.x - p.radius, p.action).toBeGreaterThanOrEqual(insets.left + EDGE_MARGIN - 0.001);
      expect(p.x + p.radius, p.action).toBeLessThanOrEqual(ui.x + ui.width - EDGE_MARGIN + 0.001);
      expect(p.y + p.radius, p.action).toBeLessThanOrEqual(LOGICAL_HEIGHT - insets.bottom - EDGE_MARGIN + 0.001);
    }
    expect(by(ps, 'jump').x + by(ps, 'jump').radius).toBeCloseTo(logicalWidthFor(2400, 1000) - insets.right - EDGE_MARGIN);
  });

  it('a big ?buttonScale never makes the two clusters meet (the scale is reduced to fit)', () => {
    for (const scale of [1, 1.3, 1.6]) {
      for (const [w, h] of SIZES) {
        const ps = place(ALL, area(w, h), { scale });
        for (let i = 0; i < ps.length; i++) {
          for (let j = i + 1; j < ps.length; j++) {
            expect(Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y), `${scale} at ${w}x${h}`).toBeGreaterThan(ps[i].radius + ps[j].radius);
          }
        }
        expect(hitCirclesOverlap(by(ps, 'jump'), by(ps, 'power'))).toBe(false);
      }
    }
  });
});

describe('nearest-button hit rule (pickButton)', () => {
  const ui = area(1280, 800);
  const ps = place(ALL, ui);

  it('a touch on a button centre hits that button', () => {
    for (const p of ps) expect(pickButton(ps, p.x, p.y), p.action).toBe(p.action);
  });

  it('the picked button always contains the point (enlarged by the slop), and no point is in both right-hand buttons', () => {
    const jump = by(ps, 'jump');
    const power = by(ps, 'power');
    let both = 0;
    for (let x = power.x - 200; x <= jump.x + 200; x += 3) {
      for (let y = jump.y - 200; y <= jump.y + 130; y += 3) {
        const inJ = Math.hypot(x - jump.x, y - jump.y) <= jump.radius * HIT_SLOP;
        const inP = Math.hypot(x - power.x, y - power.y) <= power.radius * HIT_SLOP;
        if (inJ && inP) both++;
        const hit = pickButton(ps, x, y);
        if (inJ && !inP) expect(hit).toBe('jump');
        if (inP && !inJ) expect(hit).toBe('power');
        if (!inJ && !inP) expect(hit === 'jump' || hit === 'power').toBe(false);
      }
    }
    expect(both).toBe(0);
  });

  it('a thumb sliding from Jump to Power (and back) switches buttons, passing at most a short dead zone', () => {
    const jump = by(ps, 'jump');
    const power = by(ps, 'power');
    const seq: Array<Action | null> = [];
    for (let i = 0; i <= 100; i++) seq.push(pickButton(ps, jump.x + ((power.x - jump.x) * i) / 100, jump.y + ((power.y - jump.y) * i) / 100));
    expect(seq[0]).toBe('jump');
    expect(seq[100]).toBe('power');
    // Jump, then maybe a gap, then Power: never back and forth, never another button.
    const compact = seq.filter((v, i) => i === 0 || v !== seq[i - 1]);
    expect(compact.filter((v) => v !== null)).toEqual(['jump', 'power']);
    expect(seq.filter((v) => v === null).length).toBeLessThan(40);
    const back = [...seq].reverse().filter((v, i, arr) => i === 0 || v !== arr[i - 1]);
    expect(back.filter((v) => v !== null)).toEqual(['power', 'jump']);
  });

  it('Left and Right share one band: the midpoint switches them with no dead zone', () => {
    const l = by(ps, 'left');
    const r = by(ps, 'right');
    const mid = (l.x + r.x) / 2;
    expect(pickButton(ps, mid - 1, l.y)).toBe('left');
    expect(pickButton(ps, mid + 1, l.y)).toBe('right');
    expect(pickButton(ps, mid, l.y)).not.toBeNull();
    expect(pickButton(ps, mid, l.y - 400)).toBeNull();
  });

  it('a touch far from every button hits nothing', () => {
    expect(pickButton(ps, ui.width / 2, 100)).toBeNull();
  });
});

describe('size table (Task 009)', () => {
  it('lists the diameters as fractions of the short edge', () => {
    expect(BUTTON_SIZE).toEqual({ left: 0.18, right: 0.18, jump: 0.22, solo: 0.28, primary: 0.26, secondary: 0.22 });
    expect(Math.min(BUTTON_SIZE.primary, BUTTON_SIZE.secondary)).toBeGreaterThanOrEqual(MIN_BUTTON_SIZE);
  });
});
