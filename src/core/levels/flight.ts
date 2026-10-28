// Rocket boots flight (Task 028, D-071; replaces the hold-Jump flight of Task 023): while the boots are on, the robot flies
// forward by itself and the Left / Right buttons become Up / Down. Pure rules, unit-tested; the wiring is in Player.ts,
// TouchControls.ts and LevelScene.ts. When the time is up he lands by himself, and keeps flying on over a gap or a block
// until there is plain ground below him, so the timer can never drop him into a gap.

export const FLY = {
  /** Forward speed (px/s), before any car speed-up. A little faster than walking (220), slower than a hold-run (319). */
  speed: 250,
  /** Fastest climb or dive (px/s) and how quickly it gets there (px/s^2). */
  climb: 330,
  accel: 2400,
  /** The push up he gets at take-off (px/s). */
  launch: -420,
  /** How slowly he sinks when landing (px/s). */
  landSpeed: 190,
  /** The highest his body top may go, below the top of the level grid (px). */
  ceilingBelowGrid: 40,
  /** He never flies lower than this above the ground line until he lands (px). */
  floorGap: 6,
} as const;

/** -1 = up, 0 = hold still, 1 = down. */
export type FlyDir = -1 | 0 | 1;

/** Up (Left button, Up arrow or Jump key) and Down (Right button): both or neither = hold still. */
export function flyDirection(up: boolean, down: boolean): FlyDir {
  if (up === down) return 0;
  return up ? -1 : 1;
}

/** One frame toward the speed the direction asks for (smooth, never snappy). */
export function flyVelocity(vy: number, dir: FlyDir, dtMs: number): number {
  const target = dir * FLY.climb;
  const step = (FLY.accel * Math.max(0, dtMs)) / 1000;
  if (vy < target) return Math.min(target, vy + step);
  return Math.max(target, vy - step);
}

export interface FlightEnv {
  /** Highest allowed body top (world y). */
  ceilTop: number;
  /** The ground line (world y of the top of the ground he stands on). */
  floorY: number;
  /** Is it plain ground, with nothing in the way, under every column from `left` to `right` (world x)? */
  canLand(left: number, right: number): boolean;
}

export interface FlightBody {
  vy: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** The two phases of a flight and what each frame asks for. */
export class FlightState {
  phase: 'on' | 'landing' = 'on';

  /** Time is up: land at the next chance. */
  beginLanding(): void {
    this.phase = 'landing';
  }

  /** The vertical speed for this frame, and whether he has touched down. */
  step(body: FlightBody, dir: FlyDir, dtMs: number, env: FlightEnv): { vy: number; landed: boolean } {
    if (this.phase === 'landing') {
      if (env.canLand(body.left, body.right)) {
        if (body.bottom >= env.floorY - 2) return { vy: 0, landed: true };
        const target = Math.min(FLY.landSpeed, Math.max(0, (env.floorY - body.bottom) * 6 + 40));
        return { vy: approach(body.vy, target, dtMs), landed: false };
      }
      // Over a gap or blocks: stay up and keep going.
      return { vy: approach(body.vy, 0, dtMs), landed: false };
    }
    let vy = flyVelocity(body.vy, dir, dtMs);
    if (body.top <= env.ceilTop && vy < 0) vy = 0;
    if (body.bottom >= env.floorY - FLY.floorGap && vy > 0) vy = 0;
    return { vy, landed: false };
  }
}

function approach(v: number, target: number, dtMs: number): number {
  const step = (FLY.accel * Math.max(0, dtMs)) / 1000;
  return v < target ? Math.min(target, v + step) : Math.max(target, v - step);
}

/** Can he come down on columns `leftCol`..`rightCol`? Only where row 9 is ground and rows 7-8 (blocks) are empty. */
export function plainGround(solid: ReadonlyArray<ReadonlyArray<boolean>>, leftCol: number, rightCol: number, groundRow = 9): boolean {
  for (let c = leftCol; c <= rightCol; c++) {
    if (!solid[groundRow]?.[c]) return false;
    for (let r = groundRow - 2; r < groundRow; r++) if (solid[r]?.[c]) return false;
  }
  return true;
}
