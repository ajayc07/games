import { describe, expect, it } from 'vitest';
import { parseLevel } from '../../../core/levels/format';
import { extractEntities } from '../../../core/levels/grid';
import { nextLevelId } from '../../../core/levels/progression';
import { jumpPeak, PHYSICS } from '../../../core/levels/physics';
import { asset } from '../assets';
import { options } from '../options';
import { validateOptions } from '../../../core/avatar/options';
import { resolveAvatar } from '../../../core/avatar/config';
import { chimeRecipe, chimeRootHz } from '../../../core/audio/chimes';
import { grassTheme } from '../themes';
import { UNIVERSE_ID, UNIVERSE_TITLE } from '../universe';
import { worlds } from '../worlds';
import grass1 from './grass-1.json';
import grass2 from './grass-2.json';
import grass3 from './grass-3.json';
import grass4 from './grass-4.json';
import { bubbleSpecs, BUBBLE } from '../../../core/levels/bubbles';
import { SHOT } from '../../../core/levels/shots';
import { worldDots } from '../../../core/map/unlock';

describe('Robo World level files', () => {
  /** Runs of missing ground in the row under the start. */
  const gapsOf = (e: ReturnType<typeof extractEntities>) =>
    e.solid[e.start.row + 1]
      .map((s, c) => (s ? -1 : c))
      .filter((c) => c >= 0)
      .reduce<number[][]>((acc, c) => {
        const last = acc[acc.length - 1];
        if (last && last[last.length - 1] === c - 1) last.push(c);
        else acc.push([c]);
        return acc;
      }, []);

  it('grass-1 is short (D-037): about 85 tiles, 16 coins, one or two tiny gaps near the end, no demo', () => {
    const r = parseLevel(grass1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.level.controls.demo).toBe(false);
    expect(r.level.stars).toEqual({ two: 7, three: 12 });
    const e = extractEntities(r.level.grid);
    expect(e.cols).toBe(85);
    expect(e.coins.length).toBe(16); // same coin density as the old 140-tile level (26 coins)
    const gaps = gapsOf(e);
    expect(gaps.length).toBeGreaterThanOrEqual(1);
    expect(gaps.length).toBeLessThanOrEqual(2);
    for (const g of gaps) {
      expect(g.length).toBe(1);
      expect(g[0]).toBeGreaterThan(e.cols / 2);
      expect(e.coins.some((c) => Math.abs(c.col - g[0]) <= 2)).toBe(true); // a coin arc over every gap
    }
  });

  it('grass-2 is a Jump-button level with a demo, about 90 tiles, 18 coins and 3 gaps in the last two thirds', () => {
    const r = parseLevel(grass2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const { controls, stars, grid } = r.level;
    expect(controls).toEqual({ enabled: ['jump'], autoRun: true, tapAnywhereJumps: false, demo: { tiles: 20, jumpsAtTiles: [8, 15] } });
    expect(stars).toEqual({ two: 9, three: 15 });
    const e = extractEntities(grid);
    expect(e.cols).toBe(90);
    expect(e.coins.length).toBe(18); // same coin density as the old 150-tile level (30 coins)
    const gaps = gapsOf(e);
    expect(gaps.length).toBeGreaterThanOrEqual(2);
    expect(gaps.length).toBeLessThanOrEqual(3);
    for (const g of gaps) {
      expect(g.length).toBeLessThanOrEqual(2);
      expect(g[0]).toBeGreaterThan(e.cols / 3);
      // A coin arc shortly before every gap.
      expect(e.coins.some((c) => c.col < g[0] && c.col >= g[0] - 8)).toBe(true);
    }
  });

  it('grass-3 is a Left/Right level: no auto-run, a script demo, flat ground, about 22 coins', () => {
    const r = parseLevel(grass3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const { controls, stars, grid, tileSize } = r.level;
    expect(controls.enabled).toEqual(['left', 'right', 'jump']);
    expect(controls.autoRun).toBe(false);
    expect(controls.tapAnywhereJumps).toBe(false);
    expect(controls.demo && 'script' in controls.demo && controls.demo.script.map((s) => s.action)).toEqual(['right', 'left', 'jump']);
    expect(stars).toEqual({ two: 10, three: 16 });
    const e = extractEntities(grid);
    expect(e.cols).toBeGreaterThanOrEqual(65);
    expect(e.cols).toBeLessThanOrEqual(75);
    expect(e.solid[e.start.row + 1].every(Boolean)).toBe(true); // no gaps
    expect(e.start.col).toBe(6);
    expect(e.flag.col).toBeGreaterThan(e.cols - 8);
    expect(e.flag.row).toBe(e.start.row);
    expect(e.coins.length).toBeGreaterThanOrEqual(20);
    expect(e.coins.length).toBeLessThanOrEqual(24);

    // Walkable coins: ground level or head height (the body is 84 px tall). Overhead coins need a jump.
    const ground = e.coins.filter((c) => c.row >= e.start.row - 1);
    const overhead = e.coins.filter((c) => c.row < e.start.row - 1);
    const left = e.coins.filter((c) => c.col < e.start.col);
    expect(left.length).toBeGreaterThanOrEqual(3);
    expect(left.length).toBeLessThanOrEqual(4);
    // Walking coins sit at head height (Task 005b section 0): above the Left/Right and Jump buttons, so none is
    // ever hidden behind a button, yet still collected by walking.
    for (const c of ground) {
      expect(c.row).toBe(e.start.row - 1);
      const above = (e.start.row + 1 - c.row - 0.5) * tileSize;
      expect(above).toBeLessThan(PHYSICS.body.height + 18);
    }
    expect(overhead.length).toBe(4);
    expect(ground.length + overhead.length).toBe(e.coins.length);
    // Overhead coins: out of reach walking (body 84 px tall), in reach of a standing jump.
    for (const c of overhead) {
      const above = (e.start.row + 1 - c.row - 0.5) * tileSize;
      expect(above).toBeGreaterThan(PHYSICS.body.height + 18);
      expect(above).toBeLessThanOrEqual(PHYSICS.body.height + jumpPeak(PHYSICS.jumpVelocity, PHYSICS.gravity) + 18);
    }
    // 3 stars needs more than the ground trails to the right: some left or overhead coins too.
    const rightGround = ground.filter((c) => c.col > e.start.col).length;
    expect(rightGround).toBeLessThan(stars.three);
    expect(rightGround).toBeGreaterThanOrEqual(stars.two);
  });

  it('grass-4 "Shoot" (D-041): Left/Right/Power, flat, 10-12 small bubbles and one big one, about 36-42 coins', () => {
    const r = parseLevel(grass4);
    expect(r.ok, r.ok ? '' : r.errors.join('; ')).toBe(true);
    if (!r.ok) return;
    const { controls, stars, grid, tileSize } = r.level;
    expect(controls.enabled).toEqual(['left', 'right', 'power']);
    expect(controls.autoRun).toBe(false);
    expect(controls.tapAnywhereJumps).toBe(false);
    const script = controls.demo && 'script' in controls.demo ? controls.demo.script : [];
    expect(script.filter((s) => s.action === 'power').length).toBeGreaterThanOrEqual(2);
    const last = script[script.length - 1];
    const demoMs = last.t + (last.hold ?? 0);
    expect(demoMs).toBeGreaterThanOrEqual(5000);
    expect(demoMs).toBeLessThanOrEqual(8000);
    const e = extractEntities(grid);
    expect(e.cols).toBeGreaterThanOrEqual(75);
    expect(e.cols).toBeLessThanOrEqual(85);
    expect(e.solid[e.start.row + 1].every(Boolean)).toBe(true); // no gaps
    expect(e.coins.length).toBe(0); // all coins come from bubbles
    const small = e.bubbles.filter((b) => b.kind === 'small');
    const big = e.bubbles.filter((b) => b.kind === 'big');
    expect(small.length).toBeGreaterThanOrEqual(10);
    expect(small.length).toBeLessThanOrEqual(12);
    expect(big.length).toBe(1);
    // Two close ahead of the start and one behind it.
    expect(small.filter((b) => b.col < e.start.col).length).toBe(1);
    expect(small.filter((b) => b.col > e.start.col && b.col <= e.start.col + 8).length).toBe(2);
    // The big bubble about 60% along, standing on the ground in front of the flag.
    const bigFrac = big[0].col / e.cols;
    expect(bigFrac).toBeGreaterThan(0.5);
    expect(bigFrac).toBeLessThan(0.7);
    expect(big[0].row + 2).toBe(e.start.row + 1);
    expect(e.flag.col).toBeGreaterThan(big[0].col + 4);
    const total = small.length * BUBBLE.coins.small + BUBBLE.coins.big;
    expect(total).toBeGreaterThanOrEqual(36);
    expect(total).toBeLessThanOrEqual(42);
    // 3 stars need most bubbles but not all; the big one alone gives 1 star.
    expect(stars.three).toBeLessThan(total);
    expect(stars.three).toBeGreaterThan(total - 2 * BUBBLE.coins.small - 1);
    expect(BUBBLE.coins.big).toBeLessThan(stars.two);
    // Every bubble is in reach of a horizontal shot from standing: shots leave 26-78 px above the feet
    // (measured over both looks, all sizes 0.8-1.6, the smallest and biggest options).
    const groundY = (e.start.row + 1) * tileSize;
    for (const b of bubbleSpecs(e.bubbles, tileSize, 0, e.solid)) {
      const above = groundY - b.y;
      const reach = b.r * BUBBLE.hitScale + SHOT.radius - BUBBLE.bobPx[b.kind];
      expect(Math.abs(above - 26), `bubble ${b.index}`).toBeLessThanOrEqual(reach);
      expect(Math.abs(above - 78), `bubble ${b.index}`).toBeLessThanOrEqual(reach);
    }
  });

  it('the grass world lists grass-1..4: Next goes 1 -> 2 -> 3 -> 4 and is hidden on 4', () => {
    expect(worlds.find((w) => w.id === 'grass')?.levels).toEqual(['grass-1', 'grass-2', 'grass-3', 'grass-4']);
    expect(nextLevelId(worlds, 'grass-1')).toBe('grass-2');
    expect(nextLevelId(worlds, 'grass-2')).toBe('grass-3');
    expect(nextLevelId(worlds, 'grass-3')).toBe('grass-4');
    expect(nextLevelId(worlds, 'grass-4')).toBeNull();
  });

  it('grass-4 is under a cloud on a fresh start (openAtATime 3) and opens once Grass 1 is cleared', () => {
    const grass = worlds.find((w) => w.id === 'grass')!;
    const fresh = worldDots(grass, {}, { openAtATime: 3, unlockAll: false });
    expect(fresh.map((d) => d.open)).toEqual([true, true, true, false]);
    const after = worldDots(grass, { 'grass-1': { stars: 1, bestCoins: 0 } }, { openAtATime: 3, unlockAll: false });
    expect(after.map((d) => d.open)).toEqual([true, true, true, true]);
  });
});

/** WCAG relative luminance and contrast ratio, for the "readable on green hills" rule. */
function luminance(c: number): number {
  const ch = [(c >> 16) & 255, (c >> 8) & 255, c & 255].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
const contrast = (a: number, b: number) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('Robo World avatar options (D-038)', () => {
  it('has one id and title constant and eight colour cards in order', () => {
    expect(UNIVERSE_ID).toBe('robo');
    expect(UNIVERSE_TITLE).toBe('Robo World');
    expect(options.map((o) => o.id)).toEqual(['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink']);
    expect(validateOptions(options)).toEqual([]);
  });

  it('size and antennae: yellow small with one antenna, purple big, the rest close to 1', () => {
    const by = (id: string) => resolveAvatar(options.find((o) => o.id === id));
    expect(by('yellow')).toMatchObject({ scale: 0.92, antennae: 1 });
    expect(by('purple').scale).toBe(1.12);
    for (const o of options.filter((x) => x.id !== 'yellow' && x.id !== 'purple')) {
      expect(o.scale).toBeGreaterThanOrEqual(0.95);
      expect(o.scale).toBeLessThanOrEqual(1.08);
      expect([1, 2]).toContain(o.antennae);
    }
  });

  it('keeps the white body and gives every option dark joints that stand out on the green hills', () => {
    for (const o of options) {
      const p = resolveAvatar(o).palette;
      expect(o.palette?.body, o.id).toBeUndefined(); // body stays the default white/light grey
      expect(contrast(p.joint, grassTheme.hills.near), o.id).toBeGreaterThanOrEqual(3);
      expect(contrast(p.joint, grassTheme.hills.far), o.id).toBeGreaterThanOrEqual(3);
      expect(contrast(p.body, p.joint), o.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('every chime is its own: pitch and timbre pairs are unique, and close pitches never share a timbre', () => {
    const keys = options.map((o) => `${o.chime.semitones}/${o.chime.timbre}`);
    expect(new Set(keys).size).toBe(options.length);
    const roots = options.map((o) => chimeRootHz(o.chime));
    expect(new Set(roots).size).toBe(options.length);
    const sorted = [...options].sort((a, b) => a.chime.semitones - b.chime.semitones);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].chime.semitones - sorted[i - 1].chime.semitones).toBeGreaterThanOrEqual(2);
      expect(sorted[i].chime.timbre, `${sorted[i - 1].id} vs ${sorted[i].id}`).not.toBe(sorted[i - 1].chime.timbre);
    }
    // Bigger robots sound lower.
    const purple = options.find((o) => o.id === 'purple')!;
    const yellow = options.find((o) => o.id === 'yellow')!;
    expect(chimeRootHz(purple.chime)).toBeLessThan(chimeRootHz(yellow.chime));
    for (const kind of ['pick', 'win'] as const) {
      const recipes = options.map((o) => JSON.stringify(chimeRecipe(kind, o.chime)));
      expect(new Set(recipes).size).toBe(options.length);
    }
  });

  it('no sound or picture files are bundled any more; theme art is still looked up', () => {
    expect(asset('nope.png')).toBeUndefined();
    expect(Object.values(grassTheme.images ?? {}).filter(Boolean)).toEqual([]);
  });
});
