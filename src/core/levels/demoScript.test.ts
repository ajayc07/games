// Demo script v2 (D-030): time-based { script: [...] } parsing, validation and scheduling.
import { describe, expect, it } from 'vitest';
import { parseLevel } from './format';
import { DEMO_TAIL_MS, JUMP_PRESS_MS, TimedDemo, createDemo, DemoScript } from './demo';

const level = (demo: unknown, enabled: string[] = ['left', 'right', 'jump']) => ({
  version: 1,
  id: 'script-test',
  world: 'grass',
  title: 'Test',
  controls: { enabled, autoRun: false, tapAnywhereJumps: false, demo },
  tileSize: 64,
  stars: { two: 0, three: 0 },
  grid: ['..........', '...S.....F', '##########'],
});
const errorsOf = (demo: unknown, enabled?: string[]): string[] => {
  const r = parseLevel(level(demo, enabled));
  return r.ok ? [] : r.errors;
};

describe('controls.demo script form: parsing', () => {
  it('accepts a script and fills in the default hold for Left/Right only', () => {
    const r = parseLevel(level({ script: [{ t: 0, action: 'right' }, { t: 900, action: 'left', hold: 500 }, { t: 1500, action: 'jump' }] }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.level.controls.demo).toEqual({
      script: [
        { t: 0, action: 'right', hold: 600 },
        { t: 900, action: 'left', hold: 500 },
        { t: 1500, action: 'jump' },
      ],
    });
  });

  it('allows two steps at the same time (e.g. Right and Jump together)', () => {
    expect(errorsOf({ script: [{ t: 100, action: 'right' }, { t: 100, action: 'jump' }] })).toEqual([]);
  });

  it('rejects mixing the two forms', () => {
    expect(errorsOf({ script: [{ t: 0, action: 'jump' }], tiles: 5 })[0]).toMatch(/mixes the two forms/);
    expect(errorsOf({ script: [], jumpsAtTiles: [] })[0]).toMatch(/mixes the two forms/);
  });

  it('rejects an empty or non-array script and unknown fields', () => {
    expect(errorsOf({ script: [] })[0]).toMatch(/"controls.demo.script" must be a non-empty array/);
    expect(errorsOf({ script: 'go' })[0]).toMatch(/non-empty array of steps \(got "go"\)/);
    expect(errorsOf({ script: [{ t: 0, action: 'jump' }], speed: 2 })[0]).toMatch(/unknown field "speed"/);
    expect(errorsOf({ script: [{ t: 0, action: 'jump', when: 1 }] })[0]).toMatch(/step 1 has unknown field "when"/);
    expect(errorsOf({ script: [5] })[0]).toMatch(/step 1 must be an object/);
  });

  it('rejects bad actions, negative or missing times, unsorted times and hold on jump', () => {
    expect(errorsOf({ script: [{ t: 0, action: 'power' }] })[0]).toMatch(/step 1: "action" must be "left", "right" or "jump" \(got "power"\)/);
    expect(errorsOf({ script: [{ t: -5, action: 'jump' }] })[0]).toMatch(/step 1: "t" must be a time in ms, 0 or more \(got -5\)/);
    expect(errorsOf({ script: [{ action: 'jump' }] })[0]).toMatch(/"t" must be a time/);
    expect(errorsOf({ script: [{ t: 500, action: 'right' }, { t: 200, action: 'left' }] })[0]).toMatch(
      /step 2: "t" \(200\) is earlier than the step before \(500\)/,
    );
    expect(errorsOf({ script: [{ t: 0, action: 'jump', hold: 300 }] })[0]).toMatch(/"hold" is only for "left" and "right"/);
    expect(errorsOf({ script: [{ t: 0, action: 'left', hold: 0 }] })[0]).toMatch(/"hold" must be a positive time/);
  });

  it('rejects a step whose button the level does not enable', () => {
    expect(errorsOf({ script: [{ t: 0, action: 'left' }] }, ['jump'])[0]).toMatch(/presses "left", which is not in "controls.enabled"/);
  });

  it('still parses the tile form as before', () => {
    const r = parseLevel({ ...level({ tiles: 8, jumpsAtTiles: [5] }), controls: { enabled: ['jump'], autoRun: true, tapAnywhereJumps: false, demo: { tiles: 8, jumpsAtTiles: [5] } } });
    expect(r.ok).toBe(true);
  });
});

describe('TimedDemo scheduling', () => {
  // The Grass 3 shape: walk right, walk left, jump.
  const script = {
    script: [
      { t: 300, action: 'right' as const, hold: 1500 },
      { t: 2100, action: 'left' as const, hold: 900 },
      { t: 3300, action: 'jump' as const },
    ],
  };

  it('holds Left/Right for their hold time and presses Jump once', () => {
    const d = new TimedDemo(script);
    const moves: Array<[number, number]> = [];
    const presses: Array<[number, string, number]> = [];
    let jumps = 0;
    for (let t = 0; t <= 4000; t += 16) {
      const f = d.step(t);
      if (moves.length === 0 || moves[moves.length - 1][1] !== f.move) moves.push([t, f.move]);
      for (const p of f.presses) presses.push([t, p.action, p.holdMs]);
      if (f.jump) jumps++;
    }
    expect(moves.map((m) => m[1])).toEqual([0, 1, 0, -1, 0]);
    expect(moves[1][0]).toBeGreaterThanOrEqual(300);
    expect(moves[2][0]).toBeGreaterThanOrEqual(1800);
    expect(moves[3][0]).toBeGreaterThanOrEqual(2100);
    expect(moves[4][0]).toBeGreaterThanOrEqual(3000);
    expect(presses.map((p) => [p[1], p[2]])).toEqual([
      ['right', 1500],
      ['left', 900],
      ['jump', JUMP_PRESS_MS],
    ]);
    expect(jumps).toBe(1);
    expect(d.pressed).toBe(3);
  });

  it('ends 600 ms after the last step finishes', () => {
    const d = new TimedDemo(script);
    expect(d.endMs).toBe(3300 + DEMO_TAIL_MS); // the left hold ends at 3000, the jump at 3300
    expect(d.step(d.endMs - 1).done).toBe(false);
    expect(d.step(d.endMs).done).toBe(true);
    const long = new TimedDemo({ script: [{ t: 0, action: 'right', hold: 5000 }, { t: 100, action: 'jump' }] });
    expect(long.endMs).toBe(5000 + DEMO_TAIL_MS);
  });

  it('a long frame that skips several steps still makes every press', () => {
    const d = new TimedDemo(script);
    const f = d.step(3400);
    expect(f.presses.map((p) => p.action)).toEqual(['right', 'left', 'jump']);
    expect(f.jump).toBe(true);
    expect(f.move).toBe(0); // both holds are over by then
  });

  it('Left and Right held at the same time = stand still', () => {
    const d = new TimedDemo({ script: [{ t: 0, action: 'right', hold: 1000 }, { t: 200, action: 'left', hold: 300 }] });
    expect(d.step(100).move).toBe(1);
    expect(d.step(300).move).toBe(0);
    expect(d.step(600).move).toBe(1);
  });

  it('aims the finger at the held button, else the next one', () => {
    const d = new TimedDemo(script);
    expect(d.firstAction).toBe('right');
    expect(d.step(0).aim).toBe('right'); // before the first press: waits at Right
    expect(d.step(500).aim).toBe('right');
    expect(d.step(1900).aim).toBe('left'); // between holds: moves on to Left
    expect(d.step(3100).aim).toBe('jump');
    expect(d.step(3350).aim).toBe('jump');
  });

  it('createDemo picks the form', () => {
    expect(createDemo(script, 64)).toBeInstanceOf(TimedDemo);
    expect(createDemo(script, 64).timed).toBe(true);
    expect(createDemo({ tiles: 10, jumpsAtTiles: [5] }, 64)).toBeInstanceOf(DemoScript);
    expect(createDemo({ tiles: 10, jumpsAtTiles: [5] }, 64).firstAction).toBe('jump');
  });
});
