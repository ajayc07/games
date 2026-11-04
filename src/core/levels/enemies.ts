// Gentle enemies by kind (Task 038, D-085): the Bolt Bug (Task 035, numbers in bugs.ts and unchanged), the Rock Beetle (ground,
// tougher) and the Glow Bat (flying). One table of per-kind data drives the field, the validator and the stickers; the bump, the
// shot test and the touch test are shared. None of them can hurt him (D-002). Pure rules and numbers, tested; drawing and
// wiring are in EnemyField.ts and LevelScene.ts.
import { BUG, bugErrors } from './bugs';
import { patrolPoseOf, patrolSpeed, type PatrolDef, type PatrolPose } from './patrol';
import { circlesTouch } from './shots';

export type EnemyKind = 'bug' | 'beetle' | 'bat';
export const ENEMY_KINDS: readonly EnemyKind[] = ['bug', 'beetle', 'bat'];

/** The grid letter of each kind (the middle of its patrol; a bat's cell is two rows above the ground). */
export const ENEMY_LETTER: Record<EnemyKind, string> = { bug: 'g', beetle: 'k', bat: 'w' };
const KIND_OF: Record<string, EnemyKind> = { g: 'bug', k: 'beetle', w: 'bat' };
/** Every enemy letter (for the legend and for "is this cell an enemy"). */
export const ENEMY_LETTERS = 'gkw';

export interface EnemyDef {
  kind: EnemyKind;
  flying: boolean;
  /** Picture radius as a fraction of the tile. */
  radius: number;
  /** Ground kinds: the back-and-forth walk. A bat has `sine` instead. */
  patrol?: PatrolDef;
  /** Bat: a slow horizontal sine, `tiles` wide, one period in ms, and a small upward-only bob of the picture (px); hits and touches ignore it. */
  sine?: { tiles: number; periodMs: number; bobPx: number };
  /** Beetle: it puts its head out for the whole pause at each end. */
  peeks?: boolean;
  /** Shots to beat it and its picture size after each hit (the hit circle never shrinks). */
  hits: number;
  scales: readonly number[];
  /** Shot hit circle = picture radius x this. */
  hitScale: number;
  coins: number;
  /** The touch circle = picture radius x this. */
  touchScale: number;
  /** The level keeps this many tiles clear beyond the patrol. */
  margin: number;
  /** Sounds through the normal audio path. */
  hitSound: string;
  popSound: string;
}

/** The Bolt Bug exactly as Task 035 made it (its numbers live in BUG). */
const BUG_DEF: EnemyDef = {
  kind: 'bug',
  flying: false,
  radius: BUG.radius,
  patrol: { speedShare: BUG.speedShare, patrolTiles: BUG.patrolTiles, turnPauseMs: BUG.turnPauseMs },
  hits: BUG.hits,
  scales: BUG.scales,
  hitScale: BUG.hitScale,
  coins: BUG.coins,
  touchScale: BUG.touchScale,
  margin: BUG.margin,
  hitSound: 'pop-2',
  popSound: 'bugPop',
};

/** The Rock Beetle: a rounded rock-shell beetle about 1.4 tiles wide, patrol 6 tiles at 55% of his walk, 5 shots, 8 coins. */
export const BEETLE = {
  radius: 0.7,
  speedShare: 0.55,
  patrolTiles: 6,
  /** The peek at each end of the patrol (ms): the head comes out, stays, goes back in. */
  peekMs: 1000,
  hits: 5,
  scales: [1, 0.94, 0.88, 0.82, 0.76],
  hitScale: 1.2,
  coins: 8,
  touchScale: 0.85,
  margin: 3,
  minApart: 6,
} as const;

/** The Glow Bat: a small round bat with a glowing belly, a slow sine over 4 tiles, its middle 1.5 tiles above the ground, 3 shots, 6 coins. */
export const BAT = {
  radius: 0.42,
  patrolTiles: 4,
  /** One there-and-back of the sine (ms): the fastest point is 2 x pi x 128 px / 7 s, about 115 px/s, half his walk. */
  periodMs: 7000,
  /** Its middle (hits and touches) is exactly 1.5 tiles above the ground (the cell two rows over the ground row); the bob only lifts the picture. */
  bobPx: 8,
  hits: 3,
  scales: [1, 0.84, 0.7],
  /** Generous, because a shot from a standing muzzle (32-50 px up) must reach a bat 96 px up; the circle never shrinks. */
  hitScale: 1.9,
  coins: 6,
  /** Small, so a standing robot (84 px tall) walks under it without a touch; a jump into it bumps. */
  touchScale: 0.4,
  /** Clear ground under it and this many tiles beside its sine. */
  margin: 1,
  /** How near the player a bat flaps audibly (px) and how often (ms). */
  flapHearPx: 520,
  flapEveryMs: 520,
  minApart: 6,
} as const;

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  bug: BUG_DEF,
  beetle: {
    kind: 'beetle',
    flying: false,
    radius: BEETLE.radius,
    patrol: { speedShare: BEETLE.speedShare, patrolTiles: BEETLE.patrolTiles, turnPauseMs: BEETLE.peekMs },
    peeks: true,
    hits: BEETLE.hits,
    scales: BEETLE.scales,
    hitScale: BEETLE.hitScale,
    coins: BEETLE.coins,
    touchScale: BEETLE.touchScale,
    margin: BEETLE.margin,
    hitSound: 'beetleHit',
    popSound: 'beetlePop',
  },
  bat: {
    kind: 'bat',
    flying: true,
    radius: BAT.radius,
    sine: { tiles: BAT.patrolTiles, periodMs: BAT.periodMs, bobPx: BAT.bobPx },
    hits: BAT.hits,
    scales: BAT.scales,
    hitScale: BAT.hitScale,
    coins: BAT.coins,
    touchScale: BAT.touchScale,
    margin: BAT.margin,
    hitSound: 'pop-2',
    popSound: 'batPop',
  },
};

/** The least distance between two enemy middles (columns); two Bolt Bugs keep their 7 (bugs.ts). */
export const ENEMY_MIN_APART = 6;

export const enemyRadius = (kind: EnemyKind, tile: number): number => ENEMIES[kind].radius * tile;
export const enemyScale = (kind: EnemyKind, hits: number): number => {
  const s = ENEMIES[kind].scales;
  return s[Math.min(Math.max(0, hits), s.length - 1)];
};
export const enemyBeaten = (kind: EnemyKind, hits: number): boolean => hits >= ENEMIES[kind].hits;

/** A shot (centre, radius) against an enemy centred at (ex, ey): the hit circle uses the FULL picture radius, whatever the shrink. */
export function shotHitsEnemy(kind: EnemyKind, sx: number, sy: number, shotR: number, r: number, ex: number, ey: number): boolean {
  return circlesTouch(sx, sy, shotR, ex, ey, r * ENEMIES[kind].hitScale);
}

/** Does his body rectangle touch the enemy (circle at (ex, ey), picture radius r, current size `scale`)? */
export function enemyTouches(kind: EnemyKind, body: { left: number; right: number; top: number; bottom: number }, ex: number, ey: number, r: number, scale = 1): boolean {
  const nx = Math.min(Math.max(ex, body.left), body.right);
  const ny = Math.min(Math.max(ey, body.top), body.bottom);
  const rr = r * scale * ENEMIES[kind].touchScale;
  return (ex - nx) ** 2 + (ey - ny) ** 2 <= rr * rr;
}

/** The pose of an enemy at time `tMs`: a ground kind walks its triangle wave, a bat flies a sine (`dy` is the bob, 0 or negative = up). */
export interface EnemyPose extends PatrolPose {
  dy: number;
}

export function enemyPose(kind: EnemyKind, tMs: number, phase: number, tile: number): EnemyPose {
  const def = ENEMIES[kind];
  if (def.patrol) return { ...patrolPoseOf(def.patrol, tMs, phase, tile), dy: 0 };
  const s = def.sine!;
  const a = ((tMs / s.periodMs + phase) % 1) * 2 * Math.PI;
  const half = (s.tiles * tile) / 2;
  const bob = ((tMs / (s.periodMs / 3) + phase * 3) % 1) * 2 * Math.PI;
  return { dx: Math.sin(a) * half, dir: Math.cos(a) >= 0 ? 1 : -1, turn: 0, moving: true, dy: -s.bobPx * (0.5 + 0.5 * Math.sin(bob)) };
}

/** Speed (px/s) of a ground kind, and the fastest point of a bat's sine. */
export function enemyTopSpeed(kind: EnemyKind, tile: number): number {
  const def = ENEMIES[kind];
  if (def.patrol) return patrolSpeed(def.patrol);
  const s = def.sine!;
  return ((s.tiles * tile) / 2) * ((2 * Math.PI) / s.periodMs) * 1000;
}

export interface EnemyCell {
  kind: EnemyKind;
  col: number;
  row: number;
}

/** The enemies (`g`, `k`, `w`) in a grid, in reading order. */
export function enemyCells(rows: readonly string[]): EnemyCell[] {
  const out: EnemyCell[] = [];
  rows.forEach((line, row) => [...line].forEach((ch, col) => ch in KIND_OF && out.push({ kind: KIND_OF[ch], col, row })));
  return out;
}

/** Total coins of the enemies in a grid (they count for the stars). */
export const enemyCoins = (cells: ReadonlyArray<{ kind: EnemyKind }>): number => cells.reduce((n, c) => n + ENEMIES[c.kind].coins, 0);

/** `?enemies=0` hides every Cave enemy (the Bolt Bug has its own `?bugs=0`). */
export function enemiesFromSearch(search: string): boolean {
  return new URLSearchParams(search).get('enemies') !== '0';
}

const BLOCKERS = 'SFPMJLB^O';

/**
 * Level rules for the Rock Beetle (1-based in the words): the patrol (its cell and 3 tiles each side) and 3 tiles beyond it stand
 * on flat ground; no start, goal, pickup, block, pad or big bubble there; nothing at all in the patrol in the three rows above the ground.
 */
export function beetleErrors(rows: readonly string[]): string[] {
  const errors: string[] = [];
  const cells = enemyCells(rows).filter((e) => e.kind === 'beetle');
  const half = BEETLE.patrolTiles / 2;
  const reach = half + BEETLE.margin;
  const at = (r: number, c: number) => rows[r]?.[c] ?? ' ';
  for (const b of cells) {
    const name = `beetle at row ${b.row + 1}, column ${b.col + 1}`;
    if (b.col - reach < 0 || b.col + reach >= (rows[0]?.length ?? 0)) {
      errors.push(`${name}: needs ${reach} columns of room on each side (patrol of ${BEETLE.patrolTiles} tiles and ${BEETLE.margin} clear)`);
      continue;
    }
    for (let c = b.col - reach; c <= b.col + reach; c++) {
      if (at(b.row + 1, c) !== '#') errors.push(`${name}: the ground must be flat and unbroken from column ${b.col - reach + 1} to ${b.col + reach + 1} (no gap near it), but column ${c + 1} is not`);
      for (const r of [b.row, b.row - 1]) {
        const ch = at(r, c);
        if (BLOCKERS.includes(ch)) errors.push(`${name}: "${ch}" at row ${r + 1}, column ${c + 1} is too close (keep the start, goal, orbs, blocks, pads and big bubbles ${BEETLE.margin} tiles from the patrol)`);
      }
    }
    for (let c = b.col - half; c <= b.col + half; c++) {
      for (const r of [b.row, b.row - 1, b.row - 2]) {
        const ch = at(r, c);
        if (ch !== '.' && !(r === b.row && c === b.col && ch === 'k')) errors.push(`${name}: the patrol must be empty, but row ${r + 1}, column ${c + 1} has "${ch}"`);
      }
    }
  }
  return errors;
}

/**
 * Level rules for the Glow Bat: its cell is two rows above the ground row (so its middle is 1.5 tiles up); the ground below is flat
 * and unbroken for its 4-tile sine and one tile beyond; no block, pad, big bubble, start, goal or pickup within its height there;
 * nothing at all (coin, bubble) in its sine area in the three rows around it or in the row under it.
 */
export function batErrors(rows: readonly string[]): string[] {
  const errors: string[] = [];
  const cells = enemyCells(rows).filter((e) => e.kind === 'bat');
  const half = BAT.patrolTiles / 2;
  const reach = half + BAT.margin;
  const at = (r: number, c: number) => rows[r]?.[c] ?? ' ';
  for (const b of cells) {
    const name = `bat at row ${b.row + 1}, column ${b.col + 1}`;
    if (b.col - reach < 0 || b.col + reach >= (rows[0]?.length ?? 0)) {
      errors.push(`${name}: needs ${reach} columns of room on each side`);
      continue;
    }
    if (at(b.row + 2, b.col) !== '#' || at(b.row + 1, b.col) === '#') {
      errors.push(`${name}: a bat hangs two rows above the ground (the ground row must be 2 rows below its cell)`);
      continue;
    }
    for (let c = b.col - reach; c <= b.col + reach; c++) {
      if (at(b.row + 2, c) !== '#') errors.push(`${name}: the ground below must be flat and unbroken from column ${b.col - reach + 1} to ${b.col + reach + 1}, but column ${c + 1} is not`);
      for (const r of [b.row - 1, b.row, b.row + 1]) {
        const ch = at(r, c);
        if (BLOCKERS.includes(ch)) errors.push(`${name}: "${ch}" at row ${r + 1}, column ${c + 1} is too close (no start, goal, orb, block, pad or big bubble within its height)`);
      }
    }
    for (let c = b.col - half; c <= b.col + half; c++) {
      for (const r of [b.row - 1, b.row, b.row + 1]) {
        const ch = at(r, c);
        if (ch !== '.' && !(r === b.row && c === b.col && ch === 'w')) errors.push(`${name}: its sine area must be empty, but row ${r + 1}, column ${c + 1} has "${ch}"`);
      }
    }
  }
  return errors;
}

/** Every enemy rule at once (what `parseLevel` calls): the Bolt Bug rules, the beetle and bat rules, and the spacing between kinds. */
export function enemyErrors(rows: readonly string[]): string[] {
  const errors = [...bugErrors(rows), ...beetleErrors(rows), ...batErrors(rows)];
  const cells = enemyCells(rows);
  cells.forEach((a, i) => {
    for (const b of cells.slice(i + 1)) {
      if (a.kind === 'bug' && b.kind === 'bug') continue; // checked in bugErrors (7 columns)
      if (Math.abs(a.col - b.col) < ENEMY_MIN_APART) {
        errors.push(`${a.kind} at row ${a.row + 1}, column ${a.col + 1}: the ${b.kind} at column ${b.col + 1} is closer than ${ENEMY_MIN_APART} columns`);
      }
    }
  });
  return errors;
}
