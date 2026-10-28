// Magnet and rocket boots (Task 018, D-062): two more optional, timed power-ups, like the car (car.ts). Pure rules and numbers,
// unit-tested; the wiring is in LevelScene.ts. Both only ever help: nothing is lost, nothing can go wrong, they end by themselves
// and no new button is needed.
import { PHYSICS, jumpPeak } from './physics';

/** The pickup kinds and the grid letters that place them. */
export const PICKUP_CHARS = { P: 'car', M: 'magnet', J: 'boots' } as const;
export type PickupKind = (typeof PICKUP_CHARS)[keyof typeof PICKUP_CHARS];

export const MAGNET = {
  durationMs: 10_000,
  /** Loose coins within this distance of his chest (px) are pulled to him. A little over 3 tiles. */
  radius: 230,
  /** How fast a pulled coin flies (px/s). */
  pullSpeed: 560,
} as const;

export const BOOTS = {
  durationMs: 12_000,
  /** Jump speed as a multiple of the normal jump. The player's body clamps vertical speed to 1000 px/s. */
  jumpScale: 1.3,
  /** The most vertical speed the body allows (px/s). */
  maxSpeed: 1000,
} as const;

/** Jump speed with the boots on (px/s), never more than the body's speed limit. */
export const bootsJumpSpeed = (base: number = PHYSICS.jumpVelocity): number => Math.min(BOOTS.maxSpeed, base * BOOTS.jumpScale);

/** How high a boots jump goes above the take-off feet (px), against a normal jump's. */
export const bootsPeak = (): number => jumpPeak(bootsJumpSpeed(), PHYSICS.gravity);
export const normalPeak = (): number => jumpPeak(PHYSICS.jumpVelocity, PHYSICS.gravity);

/** Is the coin close enough to be pulled? */
export function inMagnetRange(coin: { x: number; y: number }, target: { x: number; y: number }, radius: number = MAGNET.radius): boolean {
  return (coin.x - target.x) ** 2 + (coin.y - target.y) ** 2 <= radius * radius;
}

/** One step of a pulled coin toward the target (never overshoots). */
export function pullStep(
  coin: { x: number; y: number },
  target: { x: number; y: number },
  dtMs: number,
  speed: number = MAGNET.pullSpeed,
): { x: number; y: number } {
  const dx = target.x - coin.x;
  const dy = target.y - coin.y;
  const dist = Math.hypot(dx, dy);
  const step = (speed * Math.max(0, dtMs)) / 1000;
  if (dist <= step || dist === 0) return { x: target.x, y: target.y };
  return { x: coin.x + (dx / dist) * step, y: coin.y + (dy / dist) * step };
}
