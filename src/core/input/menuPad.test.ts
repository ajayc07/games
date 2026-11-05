import { describe, expect, it } from 'vitest';
import { MENU_PAD, MenuPadMapper, padInUse, wantedKeys, type PadSnapshot } from './menuPad';

const pad = (pressed: number[] = [], axes: number[] = [0, 0, 0, 0]): PadSnapshot => ({
  connected: true,
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i) })),
  axes,
});
const codes = (s: Set<string>) => [...s].sort();

describe('menu gamepad mapping (Task 043)', () => {
  it('in menus: D-pad and stick are arrows, A is Space, B is Escape, X is R', () => {
    expect(codes(wantedKeys([pad([12])], false))).toEqual(['ArrowUp']);
    expect(codes(wantedKeys([pad([13])], false))).toEqual(['ArrowDown']);
    expect(codes(wantedKeys([pad([14])], false))).toEqual(['ArrowLeft']);
    expect(codes(wantedKeys([pad([15])], false))).toEqual(['ArrowRight']);
    expect(codes(wantedKeys([pad([], [-1, 0])], false))).toEqual(['ArrowLeft']);
    expect(codes(wantedKeys([pad([], [0.2, 0.9])], false))).toEqual(['ArrowDown']);
    expect(codes(wantedKeys([pad([0])], false))).toEqual(['Space']);
    expect(codes(wantedKeys([pad([1])], false))).toEqual(['Escape']);
    expect(codes(wantedKeys([pad([2])], false))).toEqual(['KeyR']);
    expect(codes(wantedKeys([pad([], [0.3, -0.4])], false))).toEqual([]); // inside the dead zone
  });

  it('Start + Select together are the parent gear key (P); either one alone does nothing in a menu', () => {
    expect(codes(wantedKeys([pad([8, 9])], false))).toEqual(['KeyP']);
    expect(codes(wantedKeys([pad([8])], false))).toEqual([]);
    expect(codes(wantedKeys([pad([9])], false))).toEqual([]);
  });

  it('while a level is played the menu layer sends only the exit hold (Select alone): jump, power and the stick are never keys', () => {
    expect(codes(wantedKeys([pad([0, 1, 2, 14, 15, 12, 13], [1, 1])], true))).toEqual([]);
    expect(codes(wantedKeys([pad([8])], true))).toEqual(['Escape']);
    expect(codes(wantedKeys([pad([8, 9])], true))).toEqual([]); // not the gear combination
  });

  it('ignores a disconnected pad and unknown buttons; mashing every other button does nothing', () => {
    expect(codes(wantedKeys([{ ...pad([0, 15]), connected: false }], false))).toEqual([]);
    expect(codes(wantedKeys([pad([3, 4, 5, 6, 7, 10, 11, 16])], false))).toEqual([]);
  });

  it('a press is one key down, the release one key up; no repeat for A, B, X', () => {
    const m = new MenuPadMapper();
    expect(m.poll([pad([0])], 0, false)).toEqual([{ type: 'down', code: 'Space', repeat: false }]);
    expect(m.poll([pad([0])], 5000, false)).toEqual([]);
    expect(m.poll([pad([])], 5016, false)).toEqual([{ type: 'up', code: 'Space', repeat: false }]);
  });

  it('a held direction repeats after a pause and then at a steady rate, never faster', () => {
    const m = new MenuPadMapper();
    const downs: number[] = [];
    for (let t = 0; t <= 2000; t += 16) for (const e of m.poll([pad([15])], t, false)) if (e.type === 'down') downs.push(t);
    expect(downs[0]).toBe(0);
    expect(downs[1]).toBeGreaterThanOrEqual(MENU_PAD.repeatAfterMs);
    for (let i = 2; i < downs.length; i++) expect(downs[i] - downs[i - 1]).toBeGreaterThanOrEqual(MENU_PAD.repeatEveryMs);
    expect(downs.length).toBeLessThan(10);
  });

  it('a button still held when a level ends is ignored until it is let go (no accidental menu press)', () => {
    const m = new MenuPadMapper();
    expect(m.poll([pad([0])], 0, true)).toEqual([]); // jumping in the level
    expect(m.poll([pad([0])], 16, false)).toEqual([]); // the level ended with A still down
    expect(m.poll([pad([0])], 32, false)).toEqual([]);
    expect(m.poll([pad([])], 48, false)).toEqual([]);
    expect(m.poll([pad([0])], 64, false)).toEqual([{ type: 'down', code: 'Space', repeat: false }]); // a new press works
  });

  it('suspending while a key is held releases it (a menu key never sticks into a level)', () => {
    const m = new MenuPadMapper();
    m.poll([pad([14])], 0, false);
    expect(m.poll([pad([14])], 16, true)).toEqual([{ type: 'up', code: 'ArrowLeft', repeat: false }]);
  });

  it('releaseAll lets go of everything (pad unplugged, page hidden)', () => {
    const m = new MenuPadMapper();
    m.poll([pad([0, 15])], 0, false);
    expect(m.releaseAll().map((e) => e.code).sort()).toEqual(['ArrowRight', 'Space']);
    expect(m.releaseAll()).toEqual([]);
  });

  it('padInUse sees any button or a pushed stick (idle watch, wake-up)', () => {
    expect(padInUse([pad()])).toBe(false);
    expect(padInUse([pad([7])])).toBe(true);
    expect(padInUse([pad([], [0, 0.8])])).toBe(true);
    expect(padInUse([{ ...pad([0]), connected: false }])).toBe(false);
  });
});
