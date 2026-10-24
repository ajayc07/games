import { describe, expect, it } from 'vitest';
import { canPlay, confirm, initialPicker, moveFocus, selectCard } from './selection';
import { PICKER, pickerLayout, type PickerRect } from './pickerLayout';
import { logicalWidthFor } from '../ui/layoutMath';

const IDS = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'];

describe('picker selection', () => {
  it('starts on the stored option, else the first one; Play is enabled from the start', () => {
    expect(initialPicker(IDS, 'blue')).toEqual({ selected: 5, focus: 5 });
    expect(initialPicker(IDS, null)).toEqual({ selected: 0, focus: 0 });
    expect(initialPicker(IDS, 'gone')).toEqual({ selected: 0, focus: 0 });
    expect(canPlay(initialPicker(IDS, null), IDS.length)).toBe(true);
    expect(canPlay(initialPicker([], null), 0)).toBe(false);
  });

  it('Left/Right walk the cards in reading order and wrap; Up/Down move a row and stop at the edges', () => {
    let s = initialPicker(IDS, null);
    s = moveFocus(s, 'left', 8, 4);
    expect(s.focus).toBe(7);
    s = moveFocus(s, 'right', 8, 4);
    expect(s.focus).toBe(0);
    s = moveFocus(moveFocus(s, 'right', 8, 4), 'right', 8, 4);
    expect(s.focus).toBe(2);
    s = moveFocus(s, 'down', 8, 4);
    expect(s.focus).toBe(6);
    expect(moveFocus(s, 'down', 8, 4).focus).toBe(6);
    s = moveFocus(s, 'up', 8, 4);
    expect(s.focus).toBe(2);
    expect(moveFocus(s, 'up', 8, 4).focus).toBe(2);
    expect(moveFocus({ selected: 0, focus: 3 }, 'down', 6, 4).focus).toBe(3); // no card below
    expect(s.selected).toBe(0); // moving never changes the selection
  });

  it('Enter/Space: the first press selects the focused card, the second press plays', () => {
    const s = moveFocus(initialPicker(IDS, null), 'right', 8, 4);
    const first = confirm(s, 8);
    expect(first).toEqual({ state: { selected: 1, focus: 1 }, play: false });
    expect(confirm(first.state, 8).play).toBe(true);
    // With the cursor on the already-selected card, one press plays.
    expect(confirm(initialPicker(IDS, 'pink'), 8).play).toBe(true);
  });

  it('a tap selects straight away; out-of-range taps are ignored', () => {
    const s = selectCard(initialPicker(IDS, null), 4, 8);
    expect(s).toEqual({ selected: 4, focus: 4 });
    expect(selectCard(s, 9, 8)).toBe(s);
    expect(selectCard(s, -1, 8)).toBe(s);
  });
});

const overlaps = (a: PickerRect, b: PickerRect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe('picker layout', () => {
  const screens: Array<[number, number]> = [
    [844, 390],
    [1280, 800],
    [1024, 768],
    [1366, 512],
    [2400, 1000],
  ];
  const none = { top: 0, right: 0, bottom: 0, left: 0 };

  for (const [w, h] of screens) {
    it(`fits 2 rows of 4 big cards and the Play button at ${w}x${h}`, () => {
      const width = logicalWidthFor(w, h);
      const l = pickerLayout(width, 720, none, 8, 4);
      expect(l.cards).toHaveLength(8);
      const play = { x: l.play.x - l.play.r, y: l.play.y - l.play.r, width: l.play.r * 2, height: l.play.r * 2 };
      expect(play.width).toBeGreaterThanOrEqual(120);
      expect(play.x + play.width).toBeLessThanOrEqual(width);
      expect(play.y + play.height).toBeLessThanOrEqual(720);
      for (const [i, c] of l.cards.entries()) {
        expect(c.width).toBeGreaterThanOrEqual(PICKER.card.minSide);
        expect(c.height).toBeGreaterThanOrEqual(PICKER.card.minSide);
        expect(c.x).toBeGreaterThanOrEqual(0);
        expect(c.y).toBeGreaterThanOrEqual(0);
        expect(c.x + c.width).toBeLessThanOrEqual(width);
        expect(c.y + c.height).toBeLessThanOrEqual(720);
        expect(overlaps(c, play)).toBe(false);
        for (const d of l.cards.slice(i + 1)) expect(overlaps(c, d)).toBe(false);
      }
      expect(l.cards[4].y).toBeGreaterThan(l.cards[0].y); // second row
      expect(l.robotScale).toBeGreaterThan(1.2); // robots clearly larger than in a level
    });
  }

  it('keeps everything inside the device insets (notch, home bar)', () => {
    const ins = { top: 20, right: 60, bottom: 30, left: 60 };
    const width = logicalWidthFor(844, 390);
    const l = pickerLayout(width, 720, ins, 8, 4);
    expect(l.play.x + l.play.r).toBeLessThanOrEqual(width - ins.right);
    expect(l.play.y + l.play.r).toBeLessThanOrEqual(720 - ins.bottom);
    for (const c of l.cards) {
      expect(c.x).toBeGreaterThanOrEqual(ins.left);
      expect(c.y).toBeGreaterThanOrEqual(ins.top);
      expect(c.y + c.height).toBeLessThanOrEqual(720 - ins.bottom);
    }
  });
});
