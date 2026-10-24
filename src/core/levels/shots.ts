// Shooting (Task 007, D-041): the Power button fires a soft energy ball. Pure and unit-tested; the Phaser
// side (pictures, trail, sound) is `Blaster.ts`, shared by the levels and the Input Lab.

/** All shot tuning in one place (the levels and the Input Lab both use it). Units: px, ms, px/s. */
export const SHOT = {
  /** At most one shot per this long; holding Power repeats at this rate. */
  cooldownMs: 300,
  /** Shots on their way (waiting to leave the muzzle, or flying) at most. Fading ones do not count. */
  maxInFlight: 3,
  speed: 700,
  /** Distance a shot flies before it fades out. */
  range: 640,
  /** The ball leaves the muzzle this long after the press, once the arm points forward. */
  spawnDelayMs: 40,
  /** Radius of the ball for hit tests (the solid core is 10, the soft glow 20). */
  radius: 14,
  /** A press during the cooldown (or while 3 are flying) is kept this long, so mashing never loses a shot it could fire. */
  bufferMs: 300,
} as const;

/**
 * Where a shot leaves the avatar, as a height above the ground (px), measured in the browser at size 1 for both looks and all
 * eight options (Task 009, `?level=grass-6`): standing, and when pressing Power at the top of a jump (peak 160 px; the
 * measurement was taken a few frames before the peak at 154 px, so the upper bound is the measured 205 plus the missing 6).
 * Bubbles are placed from these numbers (`BUBBLE.smallDrop`, `BUBBLE.highRise`) and a test checks the reach.
 */
export const SHOT_HEIGHT = {
  standing: { min: 32, max: 50 },
  jumpPeak: { min: 177, max: 211 },
} as const;

export type ShotTuning = { readonly [K in keyof typeof SHOT]: number };

export type ShotPhase = 'pending' | 'flying' | 'spent';

export interface Shot {
  id: number;
  /** +1 right, -1 left: the shooter's facing when it fired. */
  dir: 1 | -1;
  firedAt: number;
  /** Position once flying (world px); the muzzle point at launch. */
  x: number;
  y: number;
  startX: number;
  travelled: number;
  phase: ShotPhase;
  /** Why it ended: it hit something, or reached its range. */
  end: 'hit' | 'range' | null;
}

/** What the cannon did this frame. */
export interface CannonEvents {
  /** A new shot was fired (the avatar plays `shoot`, the power sound plays). */
  fired: Shot | null;
  /** Shots that left the muzzle this frame (draw them). */
  launched: Shot[];
  /** Shots that reached their range this frame (fade them out). */
  expired: Shot[];
}

/**
 * Cooldown, press buffer, the in-flight cap and straight horizontal flight. Call `update` once per frame with
 * whether Power was pressed this frame and whether it is held, the shooter's facing and its muzzle point.
 */
export class ShotCannon {
  readonly shots: Shot[] = [];
  /** Shots fired in total (debug). */
  fired = 0;
  private lastFireAt = -Infinity;
  private bufferedUntil = -Infinity;
  private nextId = 1;

  constructor(readonly tuning: ShotTuning = SHOT) {}

  /** Pending and flying shots (the cap counts these). */
  get inFlight(): number {
    return this.shots.filter((s) => s.phase !== 'spent').length;
  }

  /** True if a press now would fire at once. */
  ready(now: number): boolean {
    return now - this.lastFireAt >= this.tuning.cooldownMs && this.inFlight < this.tuning.maxInFlight;
  }

  update(
    now: number,
    dtMs: number,
    input: { pressed: boolean; held: boolean },
    facing: 1 | -1,
    muzzle: () => { x: number; y: number },
  ): CannonEvents {
    const ev: CannonEvents = { fired: null, launched: [], expired: [] };
    // Move first, so a shot fired this frame starts exactly at the muzzle.
    for (const s of this.shots) {
      if (s.phase !== 'flying') continue;
      const step = Math.min((this.tuning.speed * Math.max(0, dtMs)) / 1000, this.tuning.range - s.travelled);
      s.travelled += step;
      s.x += s.dir * step;
      if (s.travelled >= this.tuning.range - 1e-6) {
        s.phase = 'spent';
        s.end = 'range';
        ev.expired.push(s);
      }
    }
    for (const s of this.shots) {
      if (s.phase === 'pending' && now >= s.firedAt + this.tuning.spawnDelayMs) {
        const p = muzzle();
        s.x = s.startX = p.x;
        s.y = p.y;
        s.phase = 'flying';
        ev.launched.push(s);
      }
    }
    if (input.pressed) this.bufferedUntil = now + this.tuning.bufferMs;
    const wants = input.held || now <= this.bufferedUntil;
    if (wants && this.ready(now)) {
      const shot: Shot = { id: this.nextId++, dir: facing, firedAt: now, x: 0, y: 0, startX: 0, travelled: 0, phase: 'pending', end: null };
      this.shots.push(shot);
      this.fired++;
      this.lastFireAt = now;
      this.bufferedUntil = -Infinity;
      ev.fired = shot;
      // A shot fired with no delay leaves the muzzle at once.
      if (this.tuning.spawnDelayMs <= 0) {
        const p = muzzle();
        shot.x = shot.startX = p.x;
        shot.y = p.y;
        shot.phase = 'flying';
        ev.launched.push(shot);
      }
    }
    // Forget spent shots (the scene has its own copy for the fade).
    for (let i = this.shots.length - 1; i >= 0; i--) if (this.shots[i].phase === 'spent') this.shots.splice(i, 1);
    return ev;
  }

  /** The shot hit something: it is used up at once. */
  consume(shot: Shot): void {
    if (shot.phase === 'spent') return;
    shot.phase = 'spent';
    shot.end = 'hit';
    const i = this.shots.indexOf(shot);
    if (i >= 0) this.shots.splice(i, 1);
  }

  /** Drops every shot (the demo ends, the level restarts). */
  clear(): void {
    this.shots.length = 0;
    this.bufferedUntil = -Infinity;
  }
}

/** Circle vs circle: does a ball of radius `r1` at (x1, y1) touch one of radius `r2` at (x2, y2)? */
export function circlesTouch(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const rr = r1 + r2;
  return dx * dx + dy * dy <= rr * rr;
}
