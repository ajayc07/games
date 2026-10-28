// Friendly bubbles (Task 007, D-041): shots pop them into coins that fly to the player by themselves.
// No faces, they never move toward the player and never harm. Pure and unit-tested; drawing is in BubbleField.ts.
import type { BubbleCell } from './grid';
import { circlesTouch } from './shots';

export type BubbleKind = BubbleCell['kind'];

export const BUBBLE = {
  /** Picture radius as a fraction of the tile: small = about 1 tile across, big = 2 tiles wide and tall. */
  radius: { small: 0.47, big: 1, high: 0.47, rainbow: 0.47 },
  /**
   * A small bubble floats this many tiles below its cell centre (on the cell's bottom edge), but never lower
   * than resting on the ground. The shot leaves the muzzle 26-78 px above the feet (look, colour and ?size=),
   * so the reachable centres are about 30-75 px up: the row on the ground gives 30 px (resting), the row
   * above it 64 px. Centred in its cell the upper one would sit at 96 px, out of reach for the ball and small robots.
   */
  smallDrop: 0.5,
  /**
   * A high bubble (`h`, Task 009) floats this many tiles ABOVE its cell centre. In the row 2.5 tiles over the ground that puts its
   * centre 176 px up. A shot from the top of a jump leaves 177-205 px up (both looks, every option, size 1) and a standing shot
   * 32-50 px up; with the hit circle (39 + 14 px) the bubble is reached from the top half of a jump and never from standing, even
   * for the biggest option at the peak with the bubble's bob (at exactly 160 px the purple robot was 1 px from missing).
   */
  highRise: 0.25,
  /** A rainbow bubble (Task 012, D-053) is a small one worth 8. */
  coins: { small: 3, big: 6, high: 4, rainbow: 8 },
  /** Hit circle = picture radius x this (generous). */
  hitScale: 1.3,
  /** Gentle bob: a few px, slow, each bubble with its own phase. The big one bobs less (it sits on the ground). */
  bobPx: { small: 4, big: 2, high: 4, rainbow: 4 },
  bobMs: 2200,
  /** Pop: scale up and fade (ms). */
  popMs: 220,
  /**
   * A big bubble takes this many shots to burst. Each hit that does not burst it shrinks it to the next size in
   * `bigScales` (index = hits taken so far, as a fraction of its full size); the last hit bursts it into the coins.
   */
  bigHits: 3,
  bigScales: [1, 0.72, 0.48],
} as const;

/** Size of a bubble (1 = full) after `hits` shots. Only big bubbles shrink; the others burst on the first hit. */
export function bubbleScale(kind: BubbleKind, hits: number): number {
  if (kind !== 'big') return 1;
  return BUBBLE.bigScales[Math.min(Math.max(0, hits), BUBBLE.bigScales.length - 1)];
}

/** Does the `hits`-th hit (1-based) burst a bubble of this kind? */
export function hitBursts(kind: BubbleKind, hits: number): boolean {
  return hits >= (kind === 'big' ? BUBBLE.bigHits : 1);
}

/** Coins from a pop: they appear in an arc, wait, then fly to the player and are counted on arrival. */
export const POP_COINS = {
  /** Wait before the first coin flies (ms). */
  delayMs: 400,
  /** Each next coin leaves this much later (ms). */
  staggerMs: 70,
  flyMs: 380,
  /** Arc above the bubble the coins appear in (px), for 3 coins; more coins get a wider arc. */
  arcRadius: 46,
  /** Coin sounds play at most this often, so 6 coins are not a wall of sound (ms). */
  soundGapMs: 140,
} as const;

export interface BubbleSpec {
  index: number;
  kind: BubbleKind;
  /** Rest centre (world px). */
  x: number;
  y: number;
  r: number;
  coins: number;
  /** Bob phase 0..1. */
  phase: number;
}

/**
 * World geometry of the grid's bubbles. A big one is centred in its 2x2 block (so its bottom sits on the ground
 * below it). A small one floats `BUBBLE.smallDrop` tiles below its cell centre, resting on the ground at the
 * lowest (`solid` is the grid's solid map). `gridTop` is the world y of grid row 0.
 */
export function bubbleSpecs(
  cells: readonly BubbleCell[],
  tile: number,
  gridTop: number,
  solid: readonly (readonly boolean[])[] = [],
): BubbleSpec[] {
  return cells.map((c, index) => {
    const size = c.kind === 'big' ? 2 : 1;
    const r = BUBBLE.radius[c.kind] * tile;
    let y = gridTop + (c.row + size / 2) * tile;
    if (c.kind === 'high') y -= BUBBLE.highRise * tile;
    if (c.kind === 'small' || c.kind === 'rainbow') {
      y += BUBBLE.smallDrop * tile;
      let ground = c.row + 1;
      while (ground < solid.length && !solid[ground]?.[c.col]) ground++;
      if (ground < solid.length) y = Math.min(y, gridTop + ground * tile - r);
    }
    return {
      index,
      kind: c.kind,
      x: (c.col + size / 2) * tile,
      y,
      r,
      coins: BUBBLE.coins[c.kind],
      // Spread phases so neighbours never bob together (golden-ratio steps).
      phase: (index * 0.618) % 1,
    };
  });
}

/** Vertical bob offset at time `now` (px). */
export function bobOffset(b: Pick<BubbleSpec, 'kind' | 'phase'>, now: number): number {
  return BUBBLE.bobPx[b.kind] * Math.sin(2 * Math.PI * (now / BUBBLE.bobMs + b.phase));
}

/** Does a shot (centre, radius) hit a bubble whose centre is at (bx, by)? Uses the generous hit circle. */
export function shotHitsBubble(sx: number, sy: number, shotR: number, b: Pick<BubbleSpec, 'r'>, bx: number, by: number): boolean {
  return circlesTouch(sx, sy, shotR, bx, by, b.r * BUBBLE.hitScale);
}

/**
 * The soft blocker (a big bubble not yet popped): the walls it puts on a body centred at `x` with the given
 * half width, if the body overlaps it vertically. A body left of the bubble gets a right wall at the bubble's
 * left edge, and the other way round, so the walk code's soft stop (`edgeLimit`) stops it gently.
 */
export function blockerWalls(
  b: Pick<BubbleSpec, 'x' | 'y' | 'r'>,
  body: { x: number; top: number; bottom: number; halfWidth: number },
): { minX?: number; maxX?: number } {
  if (body.bottom <= b.y - b.r || body.top >= b.y + b.r) return {};
  if (body.x <= b.x) return { maxX: b.x - b.r - body.halfWidth };
  return { minX: b.x + b.r + body.halfWidth };
}

/** Where the coins of a pop appear: an arc above the bubble's centre, spread evenly, left to right. */
export function coinArc(
  x: number,
  y: number,
  n: number,
  radius: number = POP_COINS.arcRadius * Math.max(1, n / 3),
): Array<{ x: number; y: number }> {
  if (n <= 0) return [];
  const spread = Math.min(Math.PI * 0.9, 0.42 * (n - 1) + 0.0001);
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (n === 1 ? 0 : -spread / 2 + (spread * i) / (n - 1));
    return { x: x + Math.cos(a) * radius, y: y + Math.sin(a) * radius * 0.8 };
  });
}

export interface FlyingCoin {
  id: number;
  /** Where it appeared. */
  x: number;
  y: number;
  /** It leaves for the player at this time and arrives `POP_COINS.flyMs` later. */
  leaveAt: number;
  arrived: boolean;
  /** False for the demo ghost's pops: shown, never counted. */
  counted: boolean;
  /** Popped from a rainbow bubble: a special rainbow coin (Task 024). */
  rainbow: boolean;
}

/**
 * Coins on their way from popped bubbles to the player. `collect(now)` reports arrivals; coins count for
 * stars and bestCoins like any other coin. `flushAll` lands every coin at once (the flag is reached).
 */
export class CoinFlow {
  readonly coins: FlyingCoin[] = [];
  private nextId = 1;
  private lastSoundAt = -Infinity;

  /** A bubble popped at `now` at (x, y): its coins appear in an arc. Returns the new coins. */
  pop(now: number, x: number, y: number, n: number, counted = true, rainbow = false): FlyingCoin[] {
    const made = coinArc(x, y, n).map((p, i) => ({
      id: this.nextId++,
      x: p.x,
      y: p.y,
      leaveAt: now + POP_COINS.delayMs + i * POP_COINS.staggerMs,
      arrived: false,
      counted,
      rainbow,
    }));
    this.coins.push(...made);
    return made;
  }

  /** Progress of a coin's flight (0 waiting, 1 arrived). */
  progress(c: FlyingCoin, now: number): number {
    return Math.min(1, Math.max(0, (now - c.leaveAt) / POP_COINS.flyMs));
  }

  /** Coins that arrived since the last call; `counted` = how many count, `sound` = play the coin sound now. */
  collect(now: number): { arrived: FlyingCoin[]; counted: number; sound: boolean } {
    const arrived: FlyingCoin[] = [];
    for (const c of this.coins) {
      if (!c.arrived && now >= c.leaveAt + POP_COINS.flyMs) {
        c.arrived = true;
        arrived.push(c);
      }
    }
    this.prune();
    return { arrived, counted: arrived.filter((c) => c.counted).length, ...this.soundFor(arrived.length, now) };
  }

  /** Lands every coin now; returns how many of them count. */
  flushAll(): { arrived: FlyingCoin[]; counted: number } {
    const arrived = this.coins.filter((c) => !c.arrived);
    for (const c of arrived) c.arrived = true;
    this.prune();
    return { arrived, counted: arrived.filter((c) => c.counted).length };
  }

  /** Counted coins still on their way. */
  get pendingCounted(): number {
    return this.coins.filter((c) => !c.arrived && c.counted).length;
  }

  private soundFor(n: number, now: number): { sound: boolean } {
    if (n === 0 || now - this.lastSoundAt < POP_COINS.soundGapMs) return { sound: false };
    this.lastSoundAt = now;
    return { sound: true };
  }

  private prune(): void {
    for (let i = this.coins.length - 1; i >= 0; i--) if (this.coins[i].arrived) this.coins.splice(i, 1);
  }
}

/** Pop sound pitch: a run of pops within `windowMs` rises a step each time, up to `maxStep` (musical, capped). */
export const POP_PITCH = { windowMs: 1000, maxStep: 5 } as const;

export class PopPitch {
  private step = -1;
  private lastAt = -Infinity;

  /** The step (0..maxStep) for a pop at `now`. */
  next(now: number): number {
    this.step = now - this.lastAt <= POP_PITCH.windowMs ? Math.min(POP_PITCH.maxStep, this.step + 1) : 0;
    this.lastAt = now;
    return this.step;
  }
}
