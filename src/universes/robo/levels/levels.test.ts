import { describe, expect, it } from 'vitest';
import { LEGEND, parseLevel, parseLevelOrThrow } from '../../../core/levels/format';
import { extractEntities } from '../../../core/levels/grid';
import { nextLevelId } from '../../../core/levels/progression';
import { jumpPeak, PHYSICS } from '../../../core/levels/physics';
import { asset } from '../assets';
import { options } from '../options';
import { validateOptions } from '../../../core/avatar/options';
import { resolveAvatar } from '../../../core/avatar/config';
import { chimeRecipe, chimeRootHz } from '../../../core/audio/chimes';
import { grassTheme, nightTheme, themeForWorld } from '../themes';
import { UNIVERSE_ID, UNIVERSE_TITLE } from '../universe';
import { worlds } from '../worlds';
import grass1 from './grass-1.json';
import grass2 from './grass-2.json';
import grass3 from './grass-3.json';
import grass4 from './grass-4.json';
import grass5 from './grass-5.json';
import grass6 from './grass-6.json';
import grass7 from './grass-7.json';
import night1 from './night-1.json';
import { BLOCK_MAX_TILES, padPeak } from '../../../core/levels/pads';
import { bubbleSpecs, BUBBLE } from '../../../core/levels/bubbles';
import { SHOT, SHOT_HEIGHT } from '../../../core/levels/shots';
import { shotHitsBubble } from '../../../core/levels/bubbles';
import { GOAL, arrivalExtraMs, bulbSize, columnSize, goalX, padHeight, padReachCols } from '../../../core/levels/goal';import { worldDots } from '../../../core/map/unlock';

/**
 * How far a jump carries at walk speed (px), for the gap check (Task 008). The jump lands level after 2 v / g seconds.
 * "standing" = pressing Right and Jump together from rest at the edge: the walk ramp loses half of its ramp-up time of speed.
 */
function walkingJumpReach(speed: number) {
  const air = (2 * PHYSICS.jumpVelocity) / PHYSICS.gravity;
  return { running: air * speed, standing: air * speed - (speed * PHYSICS.walkRampUpMs) / 2000 };
}
/**
 * Travel of the body centre needed to clear a gap of `tiles`, starting with the centre on the near edge (the body still
 * overlaps the ground): the body's far side must pass the far edge, so the centre must reach gap width minus half the body.
 */
const gapNeed = (tiles: number) => tiles * 64 - PHYSICS.body.width / 2;

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
    expect(e.goal.col).toBeGreaterThan(e.cols - 8);
    expect(e.goal.row).toBe(e.start.row);
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
    expect(e.goal.col).toBeGreaterThan(big[0].col + 4);
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

  it('grass-5 "Move and Jump" (D-043): Left/Right/Jump, walking, gaps of 1 or 2 tiles with 6+ tiles of ground between, 22-28 coins', () => {
    const r = parseLevel(grass5);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const { controls, stars, grid } = r.level;
    expect(controls.enabled).toEqual(['left', 'right', 'jump']);
    expect(controls.autoRun).toBe(false);
    expect(controls.tapAnywhereJumps).toBe(false);
    expect(controls.demo && 'script' in controls.demo && controls.demo.script.map((s) => s.action)).toContain('jump');
    const e = extractEntities(grid);
    expect(e.cols).toBeGreaterThanOrEqual(70);
    expect(e.cols).toBeLessThanOrEqual(80);
    expect(e.bubbles).toEqual([]);
    expect(e.start.col).toBe(6);
    expect(e.goal.col).toBeGreaterThan(e.cols - 8);

    // Gap widths 1, 1, 2, 1, 2, 2 and a safe stretch of at least 6 tiles before, between and after the gaps.
    const gaps = gapsOf(e);
    expect(gaps.map((g) => g.length)).toEqual([1, 1, 2, 1, 2, 2]);
    expect(gaps[0][0] - e.start.col).toBeGreaterThanOrEqual(6);
    for (let i = 1; i < gaps.length; i++) {
      const prevEnd = gaps[i - 1][gaps[i - 1].length - 1];
      expect(gaps[i][0] - prevEnd - 1, `stretch before gap ${i + 1}`).toBeGreaterThanOrEqual(6);
    }
    const lastGap = gaps[gaps.length - 1];
    expect(e.goal.col - lastGap[lastGap.length - 1] - 1).toBeGreaterThanOrEqual(6);
    // Gaps go through every ground row, and the flag stands on ground.
    for (const g of gaps) for (let row = e.start.row + 1; row < e.rows; row++) for (const c of g) expect(e.solid[row][c]).toBe(false);
    expect(e.solid[e.start.row + 1][e.goal.col]).toBe(true);

    // Every gap can be crossed from a standing start at its edge, with a margin of at least 40 px (0.18 s of walking).
    const reach = walkingJumpReach(PHYSICS.walkSpeed);
    for (const g of gaps) expect(reach.standing, `gap of ${g.length}`).toBeGreaterThanOrEqual(gapNeed(g.length) + 40);

    // Coins: an arc over every gap (a coin above the gap), 3-4 to the left of the start, 22-28 in all, none in the ground.
    expect(e.coins.length).toBeGreaterThanOrEqual(22);
    expect(e.coins.length).toBeLessThanOrEqual(28);
    for (const g of gaps) {
      expect(e.coins.some((c) => c.col >= g[0] && c.col <= g[g.length - 1] && c.row < e.start.row), `arc over gap at ${g[0]}`).toBe(true);
    }
    const left = e.coins.filter((c) => c.col < e.start.col);
    expect(left.length).toBeGreaterThanOrEqual(3);
    expect(left.length).toBeLessThanOrEqual(4);
    for (const c of e.coins) expect(c.row).toBeLessThan(e.start.row);
    // A jump from the edge of a 1-tile gap flies over the next two columns at head height and lands about three columns
    // after the gap starts, so no walking coin sits there (the bot found them out of reach at the apex).
    for (const g of gaps.filter((x) => x.length === 1)) {
      const flownOver = e.coins.filter((c) => c.row === e.start.row - 1 && c.col > g[0] && c.col <= g[0] + 2);
      expect(flownOver, `coins right behind the gap at ${g[0]}`).toEqual([]);
    }

    // Stars: two need about half the coins, three need most, and three is reachable.
    expect(stars.two).toBeGreaterThanOrEqual(Math.floor(e.coins.length * 0.4));
    expect(stars.two).toBeLessThanOrEqual(Math.ceil(e.coins.length * 0.6));
    expect(stars.three).toBeGreaterThan(stars.two);
    expect(stars.three).toBeGreaterThanOrEqual(Math.floor(e.coins.length * 0.7));
    expect(stars.three).toBeLessThanOrEqual(e.coins.length);
    // Walking alone cannot give three stars: coins above head height (jump only) are needed.
    const jumpOnly = e.coins.filter((c) => c.row < e.start.row - 1).length;
    expect(e.coins.length - jumpOnly).toBeLessThan(stars.three);
  });

  it('grass-6 "Everything" (D-043): four buttons, walking, gaps 1,2,1,2,2 with 7+ tiles between, bubbles, a big blocker, high bonus bubbles', () => {
    const r = parseLevel(grass6);
    expect(r.ok, r.ok ? '' : r.errors.join('; ')).toBe(true);
    if (!r.ok) return;
    const { controls, stars, grid, tileSize } = r.level;
    expect(controls.enabled).toEqual(['left', 'right', 'jump', 'power']);
    expect(controls.autoRun).toBe(false);
    expect(controls.tapAnywhereJumps).toBe(false);
    const e = extractEntities(grid);
    expect(e.cols).toBeGreaterThanOrEqual(75);
    expect(e.cols).toBeLessThanOrEqual(90);
    expect(e.start.col).toBe(6);
    expect(e.goal.col).toBeGreaterThan(e.cols - 8);
    expect(e.solid[e.start.row + 1][e.goal.col]).toBe(true);

    // Gaps of 1 or 2 tiles only (D-045): 1, 2, 1, 2, 2, an opening stretch of about 14 tiles, 7+ tiles of ground between and after.
    const gaps = gapsOf(e);
    expect(gaps.map((g) => g.length)).toEqual([1, 2, 1, 2, 2]);
    expect(gaps[0][0] - e.start.col).toBeGreaterThanOrEqual(13);
    expect(gaps[0][0] - e.start.col).toBeLessThanOrEqual(16);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i][0] - gaps[i - 1][gaps[i - 1].length - 1] - 1, `stretch ${i}`).toBeGreaterThanOrEqual(7);
    const lastGap = gaps[gaps.length - 1];
    expect(e.goal.col - lastGap[lastGap.length - 1] - 1).toBeGreaterThanOrEqual(7);
    for (const g of gaps) for (let row = e.start.row + 1; row < e.rows; row++) for (const c of g) expect(e.solid[row][c]).toBe(false);
    // Every gap crossable from a standing start at its edge with a margin of at least 40 px (as in Grass 5).
    const reach = walkingJumpReach(PHYSICS.walkSpeed);
    for (const g of gaps) expect(reach.standing, `gap of ${g.length}`).toBeGreaterThanOrEqual(gapNeed(g.length) + 40);

    // Bubbles: 12-14 small, 3 high, one big at about 60%, at least 3 tiles from every gap edge (both sides).
    const small = e.bubbles.filter((b) => b.kind === 'small');
    const high = e.bubbles.filter((b) => b.kind === 'high');
    const big = e.bubbles.filter((b) => b.kind === 'big');
    expect(small.length).toBeGreaterThanOrEqual(12);
    expect(small.length).toBeLessThanOrEqual(14);
    expect(high.length).toBe(3);
    expect(big.length).toBe(1);
    expect(big[0].col / e.cols).toBeGreaterThan(0.55);
    expect(big[0].col / e.cols).toBeLessThan(0.65);
    expect(big[0].row + 2).toBe(e.start.row + 1); // stands on the ground
    for (const g of gaps) {
      const dist = big[0].col > g[g.length - 1] ? big[0].col - g[g.length - 1] - 1 : g[0] - (big[0].col + 1) - 1;
      expect(dist, `big bubble vs gap at ${g[0]}`).toBeGreaterThanOrEqual(3);
    }
    // The opening: 1 small bubble behind the start, 3 ahead before the first gap.
    expect(small.filter((b) => b.col < e.start.col).length).toBe(1);
    expect(small.filter((b) => b.col > e.start.col && b.col < gaps[0][0]).length).toBe(3);
    // High bubbles sit over safe ground, 3 or more tiles from any gap edge, in the row 2.5 tiles over the ground.
    for (const b of high) {
      for (const g of gaps) expect(Math.min(Math.abs(b.col - g[0]), Math.abs(b.col - g[g.length - 1])), `high bubble at ${b.col}`).toBeGreaterThanOrEqual(3);
      expect(e.solid[e.start.row + 1][b.col]).toBe(true);
      expect(b.row).toBe(e.start.row - 2);
    }

    // Reach (Task 009): a shot from the top of a jump pops every high bubble, a standing shot never does, whatever the bubble's bob.
    const gridTop = 720 - e.rows * tileSize;
    const ground = gridTop + (e.start.row + 1) * tileSize; // world y of the ground top
    const specs = bubbleSpecs(e.bubbles, tileSize, gridTop, e.solid).filter((s) => s.kind === 'high');
    expect(specs.length).toBe(3);
    for (const s of specs) {
      expect(ground - s.y, 'high bubble centre height').toBeGreaterThan(165);
      expect(ground - s.y).toBeLessThan(185);
      for (const bob of [-BUBBLE.bobPx.high, 0, BUBBLE.bobPx.high]) {
        for (const h of [SHOT_HEIGHT.standing.min, SHOT_HEIGHT.standing.max]) {
          expect(shotHitsBubble(s.x, ground - h, SHOT.radius, s, s.x, s.y + bob), `standing shot at ${h}`).toBe(false);
        }
        for (const h of [SHOT_HEIGHT.jumpPeak.min, (SHOT_HEIGHT.jumpPeak.min + SHOT_HEIGHT.jumpPeak.max) / 2, SHOT_HEIGHT.jumpPeak.max]) {
          expect(shotHitsBubble(s.x, ground - h, SHOT.radius, s, s.x, s.y + bob), `jump-peak shot at ${h}`).toBe(true);
        }
      }
    }
    // Even the biggest option's standing shot (size 1.6: up to 78 px) passes under.
    for (const s of specs) expect(shotHitsBubble(s.x, ground - 78, SHOT.radius, s, s.x, s.y - BUBBLE.bobPx.high)).toBe(false);

    // Coins: bubbles + gap arcs + a few to the left of the start. A coin arc over every gap; none right behind a 1-tile gap.
    for (const g of gaps) expect(e.coins.some((c) => c.col >= g[0] && c.col <= g[g.length - 1] && c.row < e.start.row), `arc over gap ${g[0]}`).toBe(true);
    for (const g of gaps.filter((x) => x.length === 1)) {
      expect(e.coins.filter((c) => c.row === e.start.row - 1 && c.col > g[0] && c.col <= g[0] + 2), `behind gap ${g[0]}`).toEqual([]);
    }
    const left = e.coins.filter((c) => c.col < e.start.col);
    expect(left.length).toBeGreaterThanOrEqual(3);
    expect(left.length).toBeLessThanOrEqual(4);
    const total = e.coins.length + small.length * BUBBLE.coins.small + big.length * BUBBLE.coins.big + high.length * BUBBLE.coins.high;
    expect(total).toBe(78);
    // Stars: two need about half, three about 80%; three never needs the high bubbles; a bot that skips every small bubble gets 1 star.
    expect(stars).toEqual({ two: 38, three: 62 });
    expect(stars.two).toBeGreaterThanOrEqual(Math.floor(total * 0.45));
    expect(stars.two).toBeLessThanOrEqual(Math.ceil(total * 0.55));
    expect(stars.three).toBeGreaterThanOrEqual(Math.floor(total * 0.75));
    expect(stars.three).toBeLessThanOrEqual(Math.ceil(total * 0.85));
    expect(total - high.length * BUBBLE.coins.high).toBeGreaterThanOrEqual(stars.three);
    const withoutSmall = e.coins.length + BUBBLE.coins.big;
    expect(withoutSmall).toBeLessThan(stars.two);

    // Demo (D-030): shoots, walks to the first gap, jumps it and shoots again; about 9-10 s with both buttons shown.
    const script = controls.demo && 'script' in controls.demo ? controls.demo.script : [];
    expect(script.filter((s) => s.action === 'power').length).toBeGreaterThanOrEqual(3);
    expect(script.filter((s) => s.action === 'jump').length).toBe(1);
    const jumpAt = script.findIndex((s) => s.action === 'jump');
    expect(script.slice(0, jumpAt).some((s) => s.action === 'power')).toBe(true);
    expect(script.slice(jumpAt + 1).some((s) => s.action === 'power')).toBe(true);
    const end = Math.max(...script.map((s) => s.t + (s.hold ?? 0))) + 600;
    expect(end).toBeGreaterThanOrEqual(8800);
    expect(end).toBeLessThanOrEqual(10500);
  });

  it('the grass world lists grass-1..7 and then night-1: Next goes on in that order and is hidden on night-1', () => {
    expect(worlds.find((w) => w.id === 'grass')?.levels).toEqual(['grass-1', 'grass-2', 'grass-3', 'grass-4', 'grass-5', 'grass-6', 'grass-7', 'night-1']);
    for (let i = 1; i < 7; i++) expect(nextLevelId(worlds, `grass-${i}`)).toBe(`grass-${i + 1}`);
    expect(nextLevelId(worlds, 'grass-7')).toBe('night-1');
    expect(nextLevelId(worlds, 'night-1')).toBeNull();
  });

  it('night-1 "Night Walk" (Task 016, D-060): night world, walking, all four buttons, gaps of 1-2 tiles, small bubbles and arcs', () => {
    const level = parseLevelOrThrow(night1, 'night-1');
    expect(level.world).toBe('night');
    expect(themeForWorld(level.world)).toBe(nightTheme);
    expect(level.controls.enabled).toEqual(['left', 'right', 'jump', 'power']);
    expect(level.controls.autoRun).toBe(false);
    const e = extractEntities(level.grid);
    expect(e.start.col).toBe(6);
    expect(e.bubbles.filter((b) => b.kind !== 'small').length).toBe(0);
    expect(e.bubbles.length).toBeGreaterThanOrEqual(10);
    const bottom = e.solid[e.start.row + 1];
    const gaps: number[][] = [];
    bottom.forEach((solid, c) => {
      if (solid) return;
      const last = gaps[gaps.length - 1];
      if (last && last[last.length - 1] === c - 1) last.push(c);
      else gaps.push([c]);
    });
    expect(gaps.length).toBeGreaterThanOrEqual(3);
    const reach = walkingJumpReach(PHYSICS.walkSpeed);
    for (const g of gaps) {
      expect(g.length).toBeLessThanOrEqual(2);
      expect(reach.standing, `gap of ${g.length}`).toBeGreaterThanOrEqual(gapNeed(g.length) + 40);
    }
    for (let i = 1; i < gaps.length; i++) expect(gaps[i][0] - gaps[i - 1][gaps[i - 1].length - 1] - 1).toBeGreaterThanOrEqual(8);
    // Everything is on the two shot-reachable rows (on the ground or one tile up) and 2+ columns from the goal.
    for (const b of e.bubbles) expect([e.start.row, e.start.row - 1]).toContain(b.row);
    for (const c of [...e.coins, ...e.bubbles]) expect(Math.abs(c.col - e.goal.col)).toBeGreaterThanOrEqual(2);
    const total = e.coins.length + 3 * e.bubbles.length;
    expect(level.stars.two).toBeLessThan(level.stars.three);
    expect(level.stars.three).toBeLessThanOrEqual(Math.round(total * 0.85));
    expect(level.stars.two).toBeGreaterThanOrEqual(Math.round(total * 0.4));
  });

  it('grass-7 "Blocks and Bounce" (Task 015, D-059): flat ground, step blocks 1-2 high, bounce pads with coins in the air, no bubbles', () => {
    const { controls } = grass7 as unknown as { controls: { enabled: string[]; demo: unknown } };
    expect(controls.enabled).toEqual(['left', 'right', 'jump']);
    const level = parseLevelOrThrow(grass7, 'grass-7');
    const e = extractEntities(level.grid);
    expect(e.start.col).toBe(6);
    expect(e.bubbles.length).toBe(0);
    expect(e.blocks.length).toBeGreaterThanOrEqual(8);
    expect(e.pads.length).toBe(2);
    // No gaps: the ground row under the start is solid all along.
    expect(e.solid[e.start.row + 1].every(Boolean)).toBe(true);
    // Every block rests on the ground or another block, and no stack is taller than BLOCK_MAX_TILES.
    for (const b of e.blocks) {
      expect(e.solid[b.row + 1][b.col], `block ${b.col}:${b.row} has support`).toBe(true);
      let height = 0;
      for (let r = b.row; r < e.rows && e.blocks.some((x) => x.col === b.col && x.row === r); r++) height++;
      expect(height).toBeLessThanOrEqual(BLOCK_MAX_TILES);
    }
    // No step between neighbouring columns is taller than BLOCK_MAX_TILES (a jump peaks 2.5 tiles), so every stair can be climbed.
    const top = (col: number) => e.solid.findIndex((row) => row[col]);
    for (let c = 1; c < e.cols; c++) expect(Math.abs(top(c) - top(c - 1)), `step at column ${c}`).toBeLessThanOrEqual(BLOCK_MAX_TILES);
    // Pads sit on flat ground (not on a block), 4+ tiles from every block, and from each other.
    for (const p of e.pads) {
      expect(e.solid[p.row + 1][p.col]).toBe(true);
      expect(e.blocks.some((b) => b.col === p.col)).toBe(false);
      for (const b of e.blocks) expect(Math.abs(b.col - p.col), `pad ${p.col} vs block ${b.col}`).toBeGreaterThanOrEqual(4);
    }
    // Coins above a pad: all within a launch's reach (the body's head reaches `body.height` above the feet at the peak), and some
    // higher than a normal jump reaches, so the pad matters.
    const T = 64;
    const feet = (e.start.row + 1) * T;
    const centre = (row: number) => row * T + T / 2;
    const launchTop = feet - padPeak() - PHYSICS.body.height;
    const jumpTop = feet - jumpPeak(PHYSICS.jumpVelocity, PHYSICS.gravity) - PHYSICS.body.height;
    for (const p of e.pads) {
      const above = e.coins.filter((c) => Math.abs(c.col - p.col) <= 1 && c.row < p.row);
      expect(above.length).toBeGreaterThanOrEqual(5);
      for (const c of above) expect(centre(c.row), `coin ${c.col}:${c.row} within a launch`).toBeGreaterThanOrEqual(launchTop);
      expect(above.some((c) => centre(c.row) < jumpTop)).toBe(true);
    }
    // No coin inside a block, on the pad cell, or within 2 columns of the goal.
    for (const c of e.coins) {
      expect(e.solid[c.row][c.col], `coin ${c.col}:${c.row} in a block`).toBe(false);
      expect(Math.abs(c.col - e.goal.col)).toBeGreaterThanOrEqual(2);
    }
    // Stars: one star for finishing, 2 and 3 need coins that need blocks and pads, but 3 never needs every coin.
    expect(level.stars.two).toBeLessThan(level.stars.three);
    expect(level.stars.three).toBeLessThan(e.coins.length);
    expect(level.variety).toBe(false);
  });

  it('grass-4, 5, 6 and 7 are under clouds on a fresh start (openAtATime 3); each clear opens the next one', () => {
    const grass = worlds.find((w) => w.id === 'grass')!;
    const open = (levels: Record<string, { stars: number; bestCoins: number }>) =>
      worldDots(grass, levels, { openAtATime: 3, unlockAll: false }).map((d) => d.open);
    const cleared = (...ids: string[]) => Object.fromEntries(ids.map((id) => [id, { stars: 1, bestCoins: 0 }]));
    expect(open({})).toEqual([true, true, true, false, false, false, false, false]);
    expect(open(cleared('grass-1'))).toEqual([true, true, true, true, false, false, false, false]);
    expect(open(cleared('grass-1', 'grass-2'))).toEqual([true, true, true, true, true, false, false, false]);
    expect(open(cleared('grass-1', 'grass-2', 'grass-3'))).toEqual([true, true, true, true, true, true, false, false]);
    expect(open(cleared('grass-1', 'grass-2', 'grass-3', 'grass-4'))).toEqual([true, true, true, true, true, true, true, false]);
    expect(open(cleared('grass-1', 'grass-2', 'grass-3', 'grass-4', 'grass-5'))).toEqual([true, true, true, true, true, true, true, true]);
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

describe('Charging pad goal (Task 014, D-055)', () => {
  const g = grassTheme.goal;
  const backgrounds = [grassTheme.hills.far, grassTheme.hills.near, grassTheme.sky.top, grassTheme.sky.bottom];
  it('pad rim and beacon outline stand out (3:1) from both hills and the sky', () => {
    for (const bg of backgrounds) {
      expect(contrast(g.rim, bg)).toBeGreaterThanOrEqual(3);
      expect(contrast(g.beaconRim, bg)).toBeGreaterThanOrEqual(3);
    }
  });
  it('the top face and the beacon are bright against their dark rims', () => {
    expect(contrast(g.top, g.rim)).toBeGreaterThanOrEqual(3);
    expect(contrast(g.beacon, g.beaconRim)).toBeGreaterThanOrEqual(3);
  });
  it('the trigger x equals the old flag trigger (middle of the F column) on every level', () => {
    for (const lvl of [grass1, grass2, grass3, grass4, grass5, grass6]) {
      const e = extractEntities(parseLevelOrThrow(lvl).grid);
      expect(goalX(e.goal, lvl.tileSize), lvl.id).toBe(e.goal.col * lvl.tileSize + lvl.tileSize / 2);
    }
  });
  it('arrival timings stay within the bounds', () => {
    expect(GOAL.settleMs).toBeGreaterThanOrEqual(200);
    expect(GOAL.settleMs).toBeLessThanOrEqual(300);
    expect(GOAL.beamMs).toBeGreaterThanOrEqual(800);
    expect(GOAL.beamMs).toBeLessThanOrEqual(1200);
    expect(GOAL.beamTiles).toBe(3);
    expect(GOAL.ringPulses).toBe(2);
    expect(arrivalExtraMs()).toBeLessThanOrEqual(300);
    expect(arrivalExtraMs()).toBeGreaterThanOrEqual(0);
  });
  it('the pad is chunky: about 3 tiles wide and 0.45 tall, a thick short column and a big bulb (Task 014b)', () => {
    expect(GOAL.padTiles).toEqual({ w: 3, h: 0.45 });
    expect(padHeight(64)).toBeCloseTo(28.8);
    expect(columnSize(64)).toEqual({ w: 32, h: 89.6 });
    expect(columnSize(64).h / columnSize(64).w).toBeLessThan(3.2); // stubby, not a pole
    expect(bulbSize(64)).toBeCloseTo(57.6);
    expect(bulbSize(64)).toBeGreaterThan(40 * 1.3); // clearly bigger than a coin (40 px) or a small bubble's picture
    expect(GOAL.lightTiles).toBe(4);
    expect(GOAL.padTiles.w * 64).toBe(192);
  });
  it('the robot settles on the same spot as before: the pad centre x and the top face lift', () => {
    expect(goalX({ col: 10, row: 3 }, 64)).toBe(672);
    expect(padHeight(64)).toBeLessThan(0.5 * 64); // a low step, the settle stays a short ease
    expect(padReachCols()).toBe(1);
  });
  it('no coin or bubble sits in the pad footprint or beside it, in any level (reports instead of editing)', () => {
    for (const lvl of [grass1, grass2, grass3, grass4, grass5, grass6]) {
      const goal = extractEntities(parseLevelOrThrow(lvl).grid).goal;
      lvl.grid.forEach((row: string, r: number) => {
        [...row].forEach((ch, c) => {
          if (!'coOhr'.includes(ch)) return;
          expect(Math.abs(c - goal.col), `${lvl.id} ${ch} at ${r},${c}`).toBeGreaterThanOrEqual(padReachCols() + 1);
        });
      });
    }
  });
  it('the legend calls F the goal and the parser still accepts it', () => {
    expect(LEGEND.F).toBe('goal');
    expect(parseLevel({ ...grass1, controls: { ...grass1.controls, demo: false }, stars: { two: 1, three: 2 }, grid: ['S.F', '###'] }).ok).toBe(true);
  });
});

describe('Night theme (Task 016, D-060)', () => {
  const t = nightTheme;
  it('is a night world with stars, fireflies and a headlamp, and daytime worlds are unchanged', () => {
    expect(t.night).toBeDefined();
    expect(t.night!.stars).toBeGreaterThan(20);
    expect(t.night!.fireflies).toBeGreaterThan(5);
    expect(t.night!.lampAlpha).toBeGreaterThan(0.3);
    expect(t.night!.lampAlpha).toBeLessThanOrEqual(0.7);
    expect(grassTheme.night).toBeUndefined();
    expect(themeForWorld('grass')).toBe(grassTheme);
    expect(t.id).not.toBe(grassTheme.id);
    expect(Object.values(t.images ?? {}).filter(Boolean)).toEqual([]);
  });
  it('the robot options stay readable: dark joints stand out (3:1) on the moonlit hills', () => {
    for (const o of options) {
      const p = resolveAvatar(o).palette;
      expect(contrast(p.joint, t.hills.near), o.id).toBeGreaterThanOrEqual(3);
      expect(contrast(p.joint, t.hills.far), o.id).toBeGreaterThanOrEqual(3);
    }
  });
  it('the pad rim and beacon outline stand out (3:1) from the hills, and the top face is bright against its rim', () => {
    for (const bg of [t.hills.far, t.hills.near]) {
      expect(contrast(t.goal.rim, bg)).toBeGreaterThanOrEqual(3);
      expect(contrast(t.goal.beaconRim, bg)).toBeGreaterThanOrEqual(3);
    }
    expect(contrast(t.goal.top, t.goal.rim)).toBeGreaterThanOrEqual(3);
    expect(contrast(t.goal.beacon, t.goal.beaconRim)).toBeGreaterThanOrEqual(3);
  });
  it('coins and the ground grass stand out from the hills and the sky', () => {
    for (const bg of [t.hills.far, t.hills.near, t.sky.top, t.sky.bottom]) expect(contrast(t.coin.fill, bg)).toBeGreaterThanOrEqual(1.5);
    expect(contrast(t.ground.grass, t.hills.near)).toBeGreaterThanOrEqual(1.5);
    expect(contrast(t.sky.top, t.sky.bottom)).toBeLessThan(6); // a soft gradient, not a black void
  });
});
