import { describe, expect, it } from 'vitest';
import { parseLevel, parseLevelOrThrow } from './format';
import { extractEntities, findRespawn, mergeSolids, starsFor, surfaceRow } from './grid';
import { PHYSICS, jumpDistance, jumpPeak } from './physics';

const good = () => ({
  version: 1,
  id: 'test-1',
  world: 'grass',
  title: 'Test',
  controls: { enabled: ['jump'], autoRun: true, tapAnywhereJumps: true, demo: false },
  tileSize: 64,
  runSpeed: 200,
  stars: { two: 1, three: 2 },
  grid: [
    '..........', //
    '..c...c..F',
    'S.........',
    '####.#####',
    '####.#####',
  ],
});

const errorsOf = (raw: unknown): string[] => {
  const r = parseLevel(raw);
  return r.ok ? [] : r.errors;
};

describe('parseLevel', () => {
  it('accepts a valid level and fills defaults', () => {
    const raw = good() as Record<string, unknown>;
    delete (raw.controls as Record<string, unknown>).demo;
    delete raw.runSpeed;
    const r = parseLevel(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.level.controls.demo).toBe(false);
    expect(r.level.runSpeed).toBeUndefined();
    expect(r.level.grid).toHaveLength(5);
  });

  it('rejects rows of different length, naming the row', () => {
    const raw = good();
    raw.grid[2] = 'S........';
    expect(errorsOf(raw)).toEqual(['test-1: grid row 3 has 9 characters, expected 10 (like row 1)']);
  });

  it('rejects unknown legend characters with their position', () => {
    const raw = good();
    raw.grid[0] = '....X.....';
    expect(errorsOf(raw)[0]).toMatch(/row 1, column 5: unknown character "X"/);
  });

  it('needs exactly one S and one F', () => {
    const raw = good();
    raw.grid[1] = '..c...c...';
    raw.grid[0] = 'S.........';
    const errors = errorsOf(raw);
    expect(errors).toContain('test-1: grid needs exactly one "S" (player start), found 2');
    expect(errors).toContain('test-1: grid needs exactly one "F" (flag), found 0');
  });

  it('rejects unknown actions and bad control flags', () => {
    const raw = good() as unknown as { controls: Record<string, unknown> };
    raw.controls.enabled = ['jump', 'fly'];
    raw.controls.autoRun = 'yes';
    const errors = errorsOf(raw);
    expect(errors.some((e) => e.includes('unknown action "fly"'))).toBe(true);
    expect(errors.some((e) => e.includes('"controls.autoRun" must be true or false'))).toBe(true);
  });

  it('checks version, tileSize, stars and grid shape', () => {
    expect(errorsOf({ ...good(), version: 2 })[0]).toMatch(/"version" must be 1/);
    expect(errorsOf({ ...good(), tileSize: 0 })[0]).toMatch(/"tileSize"/);
    expect(errorsOf({ ...good(), stars: { two: 5, three: 3 } })[0]).toMatch(/must not be more than/);
    expect(errorsOf({ ...good(), stars: { two: 1 } })[0]).toMatch(/"stars" must be/);
    expect(errorsOf({ ...good(), grid: [] })[0]).toMatch(/"grid" must be a non-empty array/);
    expect(errorsOf(null)).toEqual(['level: not a JSON object']);
  });

  it('parseLevelOrThrow lists every problem', () => {
    expect(() => parseLevelOrThrow({ ...good(), version: 3, tileSize: -1 })).toThrow(/version[\s\S]*tileSize/);
  });
});

describe('extractEntities', () => {
  it('finds start, flag, coins and solid ground', () => {
    const e = extractEntities(good().grid);
    expect(e.cols).toBe(10);
    expect(e.rows).toBe(5);
    expect(e.start).toEqual({ col: 0, row: 2 });
    expect(e.flag).toEqual({ col: 9, row: 1 });
    expect(e.coins).toEqual([
      { col: 2, row: 1 },
      { col: 6, row: 1 },
    ]);
    expect(e.solid[3][4]).toBe(false); // the gap
    expect(e.solid[3][5]).toBe(true);
    expect(e.solid.flat().filter(Boolean)).toHaveLength(18);
  });

  it('merges ground into a few rectangles around gaps', () => {
    const { solid } = extractEntities(good().grid);
    expect(mergeSolids(solid)).toEqual([
      { col: 0, row: 3, width: 4, height: 2 },
      { col: 5, row: 3, width: 5, height: 2 },
    ]);
  });

  it('keeps different shapes apart', () => {
    const { solid } = extractEntities(['.##.', '####']);
    expect(mergeSolids(solid)).toEqual([
      { col: 1, row: 0, width: 2, height: 1 },
      { col: 0, row: 1, width: 4, height: 1 },
    ]);
  });

  it('finds the surface of each column', () => {
    const { solid } = extractEntities(good().grid);
    expect(surfaceRow(solid, 0)).toBe(3);
    expect(surfaceRow(solid, 4)).toBeNull();
  });
});

describe('starsFor', () => {
  const t = { two: 12, three: 20 };
  it('gives 1 for finishing, more for coins', () => {
    expect(starsFor(true, 0, t)).toBe(1);
    expect(starsFor(true, 11, t)).toBe(1);
    expect(starsFor(true, 12, t)).toBe(2);
    expect(starsFor(true, 19, t)).toBe(2);
    expect(starsFor(true, 20, t)).toBe(3);
    expect(starsFor(true, 99, t)).toBe(3);
  });
  it('gives nothing before the flag', () => {
    expect(starsFor(false, 30, t)).toBe(0);
  });
});

describe('findRespawn', () => {
  const grid = [
    '....................', //
    'S...................',
    '########..##.#######',
  ];
  const { solid } = extractEntities(grid);

  it('goes at least 3 columns behind the last grounded column', () => {
    // Fell at the gap after col 7: back to col 4.
    expect(findRespawn(solid, 7)).toEqual({ col: 4, row: 1 });
    expect(findRespawn(solid, 7.9)).toEqual({ col: 4, row: 1 });
  });

  it('skips gaps and prefers columns with ground on both sides', () => {
    // From col 13 (lone tile): 10 is ground but next to a gap, 9 is a gap... 6 is steady.
    expect(findRespawn(solid, 13)).toEqual({ col: 6, row: 1 });
    // From col 14: col 11 is ground with a gap on its right, col 10 too; 6 is the nearest steady column.
    expect(findRespawn(solid, 14)).toEqual({ col: 6, row: 1 });
  });

  it('falls back to the start area, or an unsteady column, or null', () => {
    expect(findRespawn(solid, 3)).toEqual({ col: 0, row: 1 }); // col 0 has no left neighbour
    expect(findRespawn(solid, 1)).toBeNull();
    expect(findRespawn(extractEntities(['....', '#.#.']).solid, 3, 1)).toEqual({ col: 2, row: 0 });
  });
});

describe('findRespawn heading left (Task 008)', () => {
  const { solid } = extractEntities(['....................', '..S.................', '#########..#########']);

  it('heading right, behind means to the left (the default); heading left, behind means to the right', () => {
    // Gap at columns 9 and 10. Fell walking right, last on col 8: back to col 5. Walking left, last on col 11: on to col 14.
    expect(findRespawn(solid, 8)).toEqual({ col: 5, row: 1 });
    expect(findRespawn(solid, 8, 3, 1)).toEqual({ col: 5, row: 1 });
    expect(findRespawn(solid, 11, 3, -1)).toEqual({ col: 14, row: 1 });
  });

  it('never carries the player across the gap he fell into', () => {
    expect(findRespawn(solid, 11, 3, -1)!.col).toBeGreaterThan(10);
    expect(findRespawn(solid, 8, 3, 1)!.col).toBeLessThan(9);
  });

  it('heading left at the right end of the level falls back to the left side', () => {
    const end = extractEntities(['.......', '#######']).solid;
    expect(findRespawn(end, 6, 3, -1)).toEqual({ col: 3, row: 0 });
  });
});

describe('physics tuning (D-021)', () => {
  const tile = 64;
  it('peaks about 2.5 tiles high', () => {
    const peak = jumpPeak(PHYSICS.jumpVelocity, PHYSICS.gravity) / tile;
    expect(peak).toBeGreaterThan(2.3);
    expect(peak).toBeLessThan(2.7);
  });
  it('clears a 2-tile gap with margin at the default run speed', () => {
    const dist = jumpDistance(PHYSICS.jumpVelocity, PHYSICS.gravity, PHYSICS.runSpeed);
    expect(dist).toBeGreaterThan(2 * tile + 32);
  });
});
