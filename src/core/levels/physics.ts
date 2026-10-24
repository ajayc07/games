// One shared tuning file for every character (D-004, D-021). Units: logical px, seconds, ms.
// Tuned for 64 px tiles: a jump peaks about 2.5 tiles high and, at run speed 200, carries the
// player about 2.6 tiles, so a 2-tile gap is cleared with margin. Jump height is fixed.

export const PHYSICS = {
  /** Default run speed (px/s); a level may override it with `runSpeed`. */
  runSpeed: 200,
  /** Downward acceleration (px/s^2). Low-ish for a floaty, readable arc. */
  gravity: 1800,
  /** Take-off speed (px/s). Peak height = jumpVelocity^2 / (2 * gravity) = 160 px. */
  jumpVelocity: 760,
  /** Fastest fall (px/s), so long drops stay readable. */
  maxFallSpeed: 1100,
  /** A jump still works this long after running off an edge (ms). */
  coyoteMs: 120,
  /** A press this long before landing still jumps on landing (ms). */
  jumpBufferMs: 150,
  /** Collision box, independent of the character picture (px). */
  body: { width: 40, height: 84 },
} as const;

/** Highest point of a jump above the take-off height (px). */
export function jumpPeak(jumpVelocity: number, gravity: number): number {
  return (jumpVelocity * jumpVelocity) / (2 * gravity);
}

/** Horizontal distance covered by a jump that lands at its take-off height (px). */
export function jumpDistance(jumpVelocity: number, gravity: number, runSpeed: number): number {
  return ((2 * jumpVelocity) / gravity) * runSpeed;
}
