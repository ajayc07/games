// The Cave Guardian (Task 040, D-085): a big, friendly-grumpy rock golem at the end of the Cave. It can never hurt him (D-002):
// it only walks slowly toward and away, a touch bumps him gently back (the Bolt Bug's bump and grace time), and there are no
// projectiles. He beats it with 10 power shots on the glowing chest crystal; a touch as Mega Robo, a car or Flash counts as one hit.
// Pure rules and numbers, tested; drawing is in BossField.ts, wiring in LevelScene.ts. Grid letter `G`: the middle of its walk.
import { patrolPoseOf, patrolSpeed, type PatrolDef, type PatrolPose } from './patrol';
import { circlesTouch } from './shots';

export const BOSS = {
  /** The picture is about this many tiles tall. */
  tilesTall: 4,
  /** Power shots on the chest crystal that beat it. */
  hits: 10,
  /** Coins every hit drops, and the shower when it crumbles (both fly to him like bubble coins and count for the stars). */
  coinsPerHit: 2,
  finishCoins: 20,
  /** It walks `patrolTiles` of travel at this share of his walking speed (35%), pausing at each end. */
  walk: { speedShare: 0.35, patrolTiles: 10, turnPauseMs: 900 } satisfies PatrolDef,
  /**
   * The crystal: its middle is `chestUp` tiles above the ground. The shot circle (`hitRadius` tiles) is generous so a standing muzzle
   * (32-50 px up) and a muzzle at the top of a jump (177-211 px) both reach it from a distance (the picture of the crystal is smaller).
   */
  chestUp: 1.9,
  hitRadius: 1.6,
  /** The touch circle: the body of the golem. A touch bumps him back (never when he flies). */
  touchUp: 1.6,
  touchRadius: 1.25,
  /** The level keeps this many tiles clear beyond the walk (start, goal, orbs) and the arena is at least this wide. */
  margin: 3,
  minArena: 28,
  /** The crumble lasts this long (ms) before the gate opens. */
  crumbleMs: 1400,
  gateMs: 1600,
} as const;

/** Every coin the Guardian gives (counted in the level's totals). */
export const BOSS_COINS = BOSS.hits * BOSS.coinsPerHit + BOSS.finishCoins;

/** The golem's size in px. */
export const bossHeight = (tile: number): number => BOSS.tilesTall * tile;
export const bossSpeed = (): number => patrolSpeed(BOSS.walk);
export const bossBeaten = (hits: number): boolean => hits >= BOSS.hits;
/** How bright the chest crystal is (0 = a faint glow, 1 = at its brightest when it is about to crumble). */
export const crystalLight = (hits: number): number => Math.min(1, Math.max(0, hits) / BOSS.hits);

/** Where the Guardian is at time `tMs` (the offset from the middle of its walk). */
export function bossPose(tMs: number, tile: number): PatrolPose {
  return patrolPoseOf(BOSS.walk, tMs, 0, tile);
}

/** The crystal's hit circle for a golem standing at `x` on ground `groundY` (px). */
export const bossHitCircle = (x: number, groundY: number, tile: number) => ({ x, y: groundY - BOSS.chestUp * tile, r: BOSS.hitRadius * tile });

/** A shot (centre, radius) against the crystal's hit circle. */
export function shotHitsBoss(sx: number, sy: number, shotR: number, x: number, groundY: number, tile: number): boolean {
  const c = bossHitCircle(x, groundY, tile);
  return circlesTouch(sx, sy, shotR, c.x, c.y, c.r);
}

/** Does his body rectangle touch the golem (a circle `touchUp` tiles up, `touchRadius` tiles wide)? */
export function bossTouches(body: { left: number; right: number; top: number; bottom: number }, x: number, groundY: number, tile: number): boolean {
  const cy = groundY - BOSS.touchUp * tile;
  const nx = Math.min(Math.max(x, body.left), body.right);
  const ny = Math.min(Math.max(cy, body.top), body.bottom);
  const r = BOSS.touchRadius * tile;
  return (x - nx) ** 2 + (cy - ny) ** 2 <= r * r;
}

/** `?boss=0` opens the gate without a fight (a test aid). */
export function bossFromSearch(search: string): boolean {
  return new URLSearchParams(search).get('boss') !== '0';
}

/**
 * Level rules for the Guardian's arena (`G` is the middle of its walk): exactly one `G`; the ground is flat and unbroken along the
 * whole width (no gaps, no blocks, pads or bubbles to get stuck on); the arena is at least `minArena` wide; the walk (5 tiles each
 * side) plus `margin` stands inside the grid; no start, goal or orb within the walk and its margin; nothing at all in the walk in the
 * four rows above the ground (the golem's body).
 */
export function bossErrors(rows: readonly string[]): string[] {
  const errors: string[] = [];
  const cells: Array<{ row: number; col: number }> = [];
  rows.forEach((line, row) => [...line].forEach((ch, col) => ch === 'G' && cells.push({ row, col })));
  if (cells.length === 0) return errors;
  if (cells.length > 1) return [`the arena can only have one Guardian "G", found ${cells.length}`];
  const { row, col } = cells[0];
  const width = rows[0]?.length ?? 0;
  const half = BOSS.walk.patrolTiles / 2;
  const reach = half + BOSS.margin;
  const at = (r: number, c: number) => rows[r]?.[c] ?? ' ';
  if (width < BOSS.minArena) errors.push(`the Guardian's arena must be at least ${BOSS.minArena} tiles wide, it is ${width}`);
  if (col - reach < 0 || col + reach >= width) errors.push(`Guardian at column ${col + 1}: needs ${reach} columns of room on each side`);
  for (let c = 0; c < width; c++) {
    if (at(row + 1, c) !== '#') errors.push(`the Guardian's arena must have flat unbroken ground, but column ${c + 1} has none`);
    for (let r = 0; r < rows.length; r++) {
      const ch = at(r, c);
      if ('BO^h'.includes(ch)) errors.push(`the Guardian's arena has no blocks, pads or big or high bubbles ("${ch}" at row ${r + 1}, column ${c + 1})`);
    }
  }
  for (let c = col - reach; c <= col + reach; c++) {
    for (const r of [row, row - 1]) {
      const ch = at(r, c);
      if ('SFPMJL'.includes(ch)) errors.push(`Guardian at column ${col + 1}: "${ch}" at row ${r + 1}, column ${c + 1} is too close (keep the start, goal and orbs ${BOSS.margin} tiles from its walk)`);
    }
  }
  for (let c = col - half; c <= col + half; c++) {
    for (let r = row; r > row - BOSS.tilesTall; r--) {
      const ch = at(r, c);
      if (ch !== '.' && !(r === row && c === col && ch === 'G')) errors.push(`Guardian at column ${col + 1}: its walk must be empty, but row ${r + 1}, column ${c + 1} has "${ch}"`);
    }
  }
  return errors;
}
