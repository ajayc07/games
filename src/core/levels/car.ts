// Car power-up (Task 017, D-061): a glowing pickup turns the robot into a little car for a while. Pure rules and numbers,
// unit-tested; drawing is in CarSprite.ts and the wiring in LevelScene.ts. Cosmetic plus a modest speed-up: the hit box, jump
// height, gravity and every rule stay the same, nothing ever goes wrong because of it, it ends by itself.

export const CAR = {
  /** How long he stays a car (ms). */
  durationMs: 10_000,
  /** In the last part of the time the car blinks gently (ms), so the change back is never a surprise. */
  blinkMs: 1600,
  /** A blink phase lasts this long (ms): dim, bright, dim... */
  blinkPhaseMs: 160,
  /** Moving speed as a multiple of the level's walk speed. Only ever faster. */
  speedScale: 1.25,
  /** Pickup picture radius (px) and the circle it is touched with (generous). */
  pickupRadius: 28,
  pickupHit: 40,
  /** The car picture, in logical px at scale 1 (feet at the bottom middle). */
  size: { w: 112, h: 66 },
  /** The car is drawn a little bigger than its picture size so its roof reaches the head-height coins he collects. */
  scale: 1.2,
  wheel: { r: 15, front: 84, back: 28 },
} as const;

/** The car timer: starts on a pickup, ends by itself (or at once on a respawn or the goal). */
export class CarTimer {
  private until = -1;

  start(now: number): void {
    this.until = now + CAR.durationMs;
  }

  stop(): void {
    this.until = -1;
  }

  active(now: number): boolean {
    return now < this.until;
  }

  /** Time left (ms), 0 when he is not a car. */
  remaining(now: number): number {
    return Math.max(0, this.until - now);
  }
}

/** Opacity of the car (1 normally, a gentle dim-bright blink in the last `CAR.blinkMs`). */
export function carAlpha(remainingMs: number): number {
  if (remainingMs > CAR.blinkMs) return 1;
  return Math.floor(remainingMs / CAR.blinkPhaseMs) % 2 === 0 ? 0.55 : 1;
}

/** Does a body rectangle touch a pickup circle? (The same test the coins use.) */
export function touchesPickup(body: { left: number; right: number; top: number; bottom: number }, x: number, y: number): boolean {
  const nx = Math.min(Math.max(x, body.left), body.right);
  const ny = Math.min(Math.max(y, body.top), body.bottom);
  return (x - nx) ** 2 + (y - ny) ** 2 <= CAR.pickupHit * CAR.pickupHit;
}

/** Wheel turn (radians) for `distance` px rolled. */
export const wheelAngle = (distance: number): number => distance / CAR.wheel.r;
