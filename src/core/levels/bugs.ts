// The Bolt Bug (Task 035, D-079): a small cute-grumpy gadget that trundles back and forth on flat ground. It can never hurt him
// (D-002): a touch only bumps him gently back, and a short grace time after the bump lets him walk on through. He beats it with
// what he has: three shots, or one touch while he is Mega Robo, a car or Flash. It pops into coins. Pure rules and numbers,
// tested; drawing and wiring are in BugField.ts and LevelScene.ts. Grid letter `g`: the middle of its patrol.
import { patrolLegMs, patrolPeriodMs, patrolPoseOf, type PatrolPose } from './patrol';
import { PHYSICS } from './physics';
import { circlesTouch } from './shots';

export const BUG = {
  /** Picture radius as a fraction of the tile: about one tile across. */
  radius: 0.45,
  /** Slow: this share of his walking speed. */
  speedShare: 0.4,
  /** It patrols this many tiles of travel (2 each side of the `g` cell's middle). */
  patrolTiles: 4,
  /** It stops this long at each end and turns with a small hop (ms, px). */
  turnPauseMs: 500,
  hopPx: 14,
  /** Shots to beat it, and its picture size after each hit (the hit circle stays the same so a tall muzzle still reaches it). */
  hits: 3,
  scales: [1, 0.82, 0.66],
  /** Shot hit circle = picture radius x this (generous, like bubbles). */
  hitScale: 1.3,
  /** Coins when it pops (they fly to him like bubble coins and count for the stars). */
  coins: 5,
  /** The touch circle (a little smaller than the picture, so a close jump over it never bumps). */
  touchScale: 0.9,
  /** A touch bumps him back (he slides away for `slideMs`), then `graceMs` he can walk through it. */
  bump: { slideMs: 300, graceMs: 800 },
  /** A level keeps the patrol clear: this many tiles of flat ground beyond each end of the patrol (gaps, start, goal, blocks). */
  margin: 3,
  /** Two bugs' middles are at least this many columns apart. */
  minApart: 7,
} as const;

/** Half the patrol travel in px. */
export const patrolHalf = (tile: number): number => (BUG.patrolTiles * tile) / 2;
/** The bug's picture radius in px. */
export const bugRadius = (tile: number): number => BUG.radius * tile;
/** Its speed in px/s. */
export const bugSpeed = (): number => PHYSICS.walkSpeed * BUG.speedShare;

export type { PatrolPose } from './patrol';

/** Time for one leg of the patrol (ms). */
export const legMs = (tile: number): number => patrolLegMs(BUG, tile);
/** A whole there-and-back (ms). */
export const periodMs = (tile: number): number => patrolPeriodMs(BUG, tile);

/**
 * Where the bug is at time `tMs` (a bug's own `phase` 0..1 offsets it so two bugs never walk in step): right, a pause and a
 * hop at the end, left, a pause and a hop at the other end. A triangle wave, never leaves the patrol (shared in `patrol.ts`).
 */
export function patrolPose(tMs: number, phase: number, tile: number): PatrolPose {
  return patrolPoseOf(BUG, tMs, phase, tile);
}

/** The picture size (1 = full) after `hits` shots. */
export function bugScale(hits: number): number {
  return BUG.scales[Math.min(Math.max(0, hits), BUG.scales.length - 1)];
}

/** Does the `hits`-th shot (1-based) beat it? */
export const bugBeaten = (hits: number): boolean => hits >= BUG.hits;

/** A shot (centre, radius) against the bug whose centre is (bx, by): the hit circle uses the FULL picture radius, whatever the shrink. */
export function shotHitsBug(sx: number, sy: number, shotR: number, r: number, bx: number, by: number): boolean {
  return circlesTouch(sx, sy, shotR, bx, by, r * BUG.hitScale);
}

/** Does his body rectangle touch the bug (circle at (bx, by), picture radius r, current size `scale`)? */
export function bugTouches(body: { left: number; right: number; top: number; bottom: number }, bx: number, by: number, r: number, scale = 1): boolean {
  const nx = Math.min(Math.max(bx, body.left), body.right);
  const ny = Math.min(Math.max(by, body.top), body.bottom);
  const rr = r * scale * BUG.touchScale;
  return (bx - nx) ** 2 + (by - ny) ** 2 <= rr * rr;
}

/**
 * The gentle bump. A touch starts a short slide away from the bug (he walks away by himself for `slideMs`; his facing stays),
 * then `graceMs` in which the bug does not bump at all, so he can always walk on through it, even if the slide was stopped by
 * a wall or a big bubble. Nothing is lost.
 */
export class BugBump {
  private slideUntil = -1;
  private graceUntil = -1;
  private dir: -1 | 0 | 1 = 0;

  /** He touches a bug at `now`: starts a bump and returns true, or false during the slide and the grace time. */
  touch(now: number, bodyX: number, bugX: number, facing: 1 | -1): boolean {
    if (now < this.graceUntil) return false;
    this.dir = bodyX < bugX ? -1 : bodyX > bugX ? 1 : (-facing as 1 | -1);
    this.slideUntil = now + BUG.bump.slideMs;
    this.graceUntil = this.slideUntil + BUG.bump.graceMs;
    return true;
  }

  /** The walking direction to force this frame (0 when no bump is sliding). */
  move(now: number): -1 | 0 | 1 {
    return now < this.slideUntil ? this.dir : 0;
  }

  reset(): void {
    this.slideUntil = -1;
    this.graceUntil = -1;
    this.dir = 0;
  }
}

/** `?bugs=0` hides the bugs of a level (a quick way to compare); anything else leaves them. */
export function bugsFromSearch(search: string): boolean {
  return new URLSearchParams(search).get('bugs') !== '0';
}

export interface BugCell {
  col: number;
  row: number;
}

/** The bugs (`g`) in a grid, in reading order. */
export function bugCells(rows: readonly string[]): BugCell[] {
  const out: BugCell[] = [];
  rows.forEach((line, row) => [...line].forEach((ch, col) => ch === 'g' && out.push({ col, row })));
  return out;
}

/**
 * The level rules for bugs, as readable sentences (1-based rows and columns): the patrol (the `g` cell and 2 tiles each side)
 * and 3 tiles beyond it stand on flat ground (no gap); no start, goal, pickup, block, pad or big bubble there; nothing at all in
 * the patrol (no coin, bubble) in the three rows above the ground; two bugs at least `minApart` columns apart.
 */
export function bugErrors(rows: readonly string[]): string[] {
  const errors: string[] = [];
  const bugs = bugCells(rows);
  const half = BUG.patrolTiles / 2;
  const reach = half + BUG.margin;
  const at = (r: number, c: number) => rows[r]?.[c] ?? ' ';
  bugs.forEach((b, i) => {
    const name = `bug at row ${b.row + 1}, column ${b.col + 1}`;
    if (b.col - reach < 0 || b.col + reach >= (rows[0]?.length ?? 0)) {
      errors.push(`${name}: needs ${reach} columns of room on each side (patrol of ${BUG.patrolTiles} tiles and ${BUG.margin} clear)`);
      return;
    }
    for (let c = b.col - reach; c <= b.col + reach; c++) {
      if (at(b.row + 1, c) !== '#') errors.push(`${name}: the ground must be flat and unbroken from column ${b.col - reach + 1} to ${b.col + reach + 1} (no gap near it), but column ${c + 1} is not`);
      for (const r of [b.row, b.row - 1]) {
        const ch = at(r, c);
        if ('SFPMJLB^O'.includes(ch)) errors.push(`${name}: "${ch}" at row ${r + 1}, column ${c + 1} is too close (keep the start, goal, orbs, blocks, pads and big bubbles ${BUG.margin} tiles from the patrol)`);
      }
    }
    for (let c = b.col - half; c <= b.col + half; c++) {
      for (const r of [b.row, b.row - 1, b.row - 2]) {
        const ch = at(r, c);
        if (ch !== '.' && !(r === b.row && c === b.col && ch === 'g')) errors.push(`${name}: the patrol must be empty, but row ${r + 1}, column ${c + 1} has "${ch}"`);
      }
    }
    for (const o of bugs.slice(i + 1)) {
      if (Math.abs(o.col - b.col) < BUG.minApart) errors.push(`${name}: another bug (column ${o.col + 1}) is closer than ${BUG.minApart} columns`);
    }
  });
  return errors;
}
