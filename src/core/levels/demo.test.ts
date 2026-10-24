import { describe, expect, it } from 'vitest';
import { parseLevel } from './format';
import { DemoScript, demoOverrideFrom, shouldPlayDemo } from './demo';
import { nextLevelId } from './progression';
import { AIR_POSE_DELAY_MS, choosePose, flipSign } from './poses';

const level = (demo: unknown) => ({
  version: 1,
  id: 'demo-test',
  world: 'grass',
  title: 'Test',
  controls: { enabled: ['jump'], autoRun: true, tapAnywhereJumps: false, demo },
  tileSize: 64,
  stars: { two: 0, three: 0 },
  grid: [
    '..........................', //
    '...S.....................F',
    '##########################',
  ],
});
const errorsOf = (demo: unknown): string[] => {
  const r = parseLevel(level(demo));
  return r.ok ? [] : r.errors;
};

describe('controls.demo parsing', () => {
  it('accepts false, a missing value and the object form', () => {
    expect(errorsOf(false)).toEqual([]);
    expect(errorsOf(undefined)).toEqual([]);
    const r = parseLevel(level({ tiles: 20, jumpsAtTiles: [15, 8, 8] }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.level.controls.demo).toEqual({ tiles: 20, jumpsAtTiles: [8, 15] }); // sorted, deduplicated
  });

  it('rejects true and other non-objects with a readable message', () => {
    expect(errorsOf(true)[0]).toMatch(/"controls.demo" must be false or \{ "tiles"/);
    expect(errorsOf('yes')[0]).toMatch(/got "yes"/);
    expect(errorsOf([8])[0]).toMatch(/"controls.demo" must be/);
  });

  it('checks tiles and jumpsAtTiles', () => {
    expect(errorsOf({ tiles: 0, jumpsAtTiles: [] })[0]).toMatch(/"controls.demo.tiles" must be a whole number above 0/);
    expect(errorsOf({ tiles: 2.5, jumpsAtTiles: [] })[0]).toMatch(/"controls.demo.tiles"/);
    expect(errorsOf({ tiles: 20 })[0]).toMatch(/"controls.demo.jumpsAtTiles" must be an array/);
    expect(errorsOf({ tiles: 20, jumpsAtTiles: [8, 'x'] })[0]).toMatch(/whole column numbers/);
    expect(errorsOf({ tiles: 20, jumpsAtTiles: [], speed: 2 })[0]).toMatch(/unknown field "speed"/);
  });

  it('checks the columns against the grid and the start', () => {
    expect(errorsOf({ tiles: 40, jumpsAtTiles: [] })[0]).toMatch(/inside the grid \(width 26\)/);
    expect(errorsOf({ tiles: 2, jumpsAtTiles: [] })[0]).toMatch(/after the start \(3\)/);
    expect(errorsOf({ tiles: 20, jumpsAtTiles: [2] })[0]).toMatch(/column 2: it must be after the start/);
    expect(errorsOf({ tiles: 20, jumpsAtTiles: [20] })[0]).toMatch(/column 20: .*before "tiles" \(20\)/);
  });
});

describe('DemoScript', () => {
  const T = 64;

  it('presses jump once when the ghost enters each declared column, in order', () => {
    const script = new DemoScript({ tiles: 20, jumpsAtTiles: [8, 15] }, T);
    const pressesAt: number[] = [];
    for (let x = 3.5 * T; x < 21 * T; x += 3) {
      const { jump, done } = script.step(x);
      if (jump) pressesAt.push(Math.floor(x / T));
      if (done) {
        expect(Math.floor(x / T)).toBe(20);
        break;
      }
    }
    expect(pressesAt).toEqual([8, 15]);
    expect(script.pressed).toBe(2);
  });

  it('never presses twice for one column, even if the ghost moves back', () => {
    const script = new DemoScript({ tiles: 20, jumpsAtTiles: [8] }, T);
    expect(script.step(8 * T).jump).toBe(true);
    expect(script.step(8 * T + 1).jump).toBe(false);
    expect(script.step(7 * T).jump).toBe(false);
    expect(script.step(8 * T).jump).toBe(false);
  });

  it('a long frame that skips past two columns still makes one press that frame', () => {
    const script = new DemoScript({ tiles: 20, jumpsAtTiles: [8, 9] }, T);
    expect(script.step(9.5 * T)).toEqual({ jump: true, done: false });
    expect(script.pressed).toBe(2);
  });

  it('is done at the end column', () => {
    const script = new DemoScript({ tiles: 10, jumpsAtTiles: [] }, T);
    expect(script.step(10 * T - 1).done).toBe(false);
    expect(script.step(10 * T).done).toBe(true);
  });
});

describe('when the demo plays', () => {
  const demo = { tiles: 20, jumpsAtTiles: [8] };
  it('plays once per session unless forced or skipped', () => {
    expect(shouldPlayDemo(demo, false, null)).toBe(true);
    expect(shouldPlayDemo(demo, true, null)).toBe(false);
    expect(shouldPlayDemo(demo, true, 'force')).toBe(true);
    expect(shouldPlayDemo(demo, false, 'skip')).toBe(false);
    expect(shouldPlayDemo(false, false, 'force')).toBe(false);
  });
  it('reads ?demo=1 and ?demo=0', () => {
    expect(demoOverrideFrom('?demo=1')).toBe('force');
    expect(demoOverrideFrom('?debug=1&demo=0')).toBe('skip');
    expect(demoOverrideFrom('?demo=maybe')).toBeNull();
    expect(demoOverrideFrom('')).toBeNull();
  });
});

describe('nextLevelId', () => {
  const worlds = [
    { id: 'grass', name: 'Grass', levels: ['grass-1', 'grass-2'] },
    { id: 'pipe', name: 'Pipe', levels: ['pipe-1'] },
  ];
  it('gives the following level in the same world', () => {
    expect(nextLevelId(worlds, 'grass-1')).toBe('grass-2');
  });
  it('gives null on the last level of a world (no jump into the next world) and for unknown ids', () => {
    expect(nextLevelId(worlds, 'grass-2')).toBeNull();
    expect(nextLevelId(worlds, 'pipe-1')).toBeNull();
    expect(nextLevelId(worlds, 'nope')).toBeNull();
  });
});

describe('poses', () => {
  it('runs on the ground, jumps in the air, idles when still', () => {
    expect(choosePose({ grounded: true, speedX: 200, airborneMs: 0, jumped: false })).toBe('run');
    expect(choosePose({ grounded: true, speedX: 0, airborneMs: 0, jumped: false })).toBe('idle');
    expect(choosePose({ grounded: false, speedX: 200, airborneMs: 0, jumped: true })).toBe('jump');
  });
  it('does not flicker to the jump pose for a one-frame bump', () => {
    expect(choosePose({ grounded: false, speedX: 200, airborneMs: 16, jumped: false })).toBe('run');
    expect(choosePose({ grounded: false, speedX: 200, airborneMs: AIR_POSE_DELAY_MS, jumped: false })).toBe('jump');
  });
  it('flips so the picture faces the direction of travel (no moonwalking)', () => {
    expect(flipSign(1, 'right')).toBe(1);
    expect(flipSign(-1, 'right')).toBe(-1);
    expect(flipSign(1, 'left')).toBe(-1); // Luigi's run picture faces left: mirror it when running right
    expect(flipSign(-1, 'left')).toBe(1);
    expect(flipSign(1)).toBe(1);
  });
});
