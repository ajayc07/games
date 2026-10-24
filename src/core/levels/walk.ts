// Walking on levels without auto-run (D-029): hold = move, release = stop. Pure and unit-tested.

/** Direction from the two buttons: both held (or neither) = stand still. */
export function walkDirection(left: boolean, right: boolean): -1 | 0 | 1 {
  if (left === right) return 0;
  return left ? -1 : 1;
}

/**
 * Moves the speed `v` toward `target` (px/s) for one frame. Speeding up takes `upMs` from standing to
 * `maxSpeed`, slowing down takes `downMs` from `maxSpeed` to standing; a reversal first slows to 0
 * (down rate), then speeds up the other way (up rate) with whatever time is left in the frame.
 */
export function rampSpeed(v: number, target: number, dtMs: number, maxSpeed: number, upMs: number, downMs: number): number {
  let t = Math.max(0, dtMs);
  if (v !== 0 && (Math.sign(target) !== Math.sign(v) || Math.abs(target) < Math.abs(v))) {
    const goal = Math.sign(target) === Math.sign(v) ? target : 0;
    const rate = maxSpeed / Math.max(1, downMs);
    const need = Math.abs(v - goal) / rate;
    if (need >= t) return v - Math.sign(v) * rate * t;
    t -= need;
    v = goal;
    if (v === target) return v;
  }
  const rate = maxSpeed / Math.max(1, upMs);
  const diff = target - v;
  const reach = rate * t;
  return Math.abs(diff) <= reach ? target : v + Math.sign(diff) * reach;
}

/** Within this distance of a level end (px), speed toward it fades out, so the player stops softly. */
export const EDGE_BRAKE_PX = 24;

/** Limits speed toward an invisible wall at `minX` / `maxX` (body centre), easing to a stop at it. */
export function edgeLimit(x: number, v: number, minX: number, maxX: number): number {
  if (v > 0) return Math.min(v, (v * Math.max(0, maxX - x)) / EDGE_BRAKE_PX);
  if (v < 0) return Math.max(v, (v * Math.max(0, x - minX)) / EDGE_BRAKE_PX);
  return v;
}

/** A change of facing within this long after the last one waits (ms), so quick alternating never flickers. */
export const FACING_HOLD_MS = 90;

export interface FacingState {
  facing: 1 | -1;
  changedAt: number;
}

/**
 * Facing follows the pressed direction at once, except that it changes at most once per FACING_HOLD_MS.
 * A direction still held after the hold flips it then (call every frame). Standing keeps the last facing.
 */
export function nextFacing(s: FacingState, dir: -1 | 0 | 1, now: number): FacingState {
  if (dir === 0 || dir === s.facing) return s;
  if (now - s.changedAt < FACING_HOLD_MS) return s;
  return { facing: dir, changedAt: now };
}
