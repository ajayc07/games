// The back-and-forth walk shared by every ground enemy (Task 035 Bolt Bug, Task 038 Rock Beetle): a triangle wave with a pause at
// each end. Pure. `bugs.ts` and `enemies.ts` both use it, so the Bolt Bug's numbers and motion stay exactly as they were.
import { PHYSICS } from './physics';

export interface PatrolDef {
  /** Share of his walking speed. */
  speedShare: number;
  /** Tiles of travel (half each side of the middle). */
  patrolTiles: number;
  /** Pause at each end (ms). */
  turnPauseMs: number;
}

export interface PatrolPose {
  /** Offset from the middle of the patrol (px). */
  dx: number;
  /** Which way it faces: +1 right, -1 left. */
  dir: 1 | -1;
  /** 0..1 while it turns at an end (the small hop or the peek); 0 while it trundles. */
  turn: number;
  /** Trundling (legs move) rather than turning. */
  moving: boolean;
}

export const patrolSpeed = (d: PatrolDef): number => PHYSICS.walkSpeed * d.speedShare;
export const patrolHalfPx = (d: PatrolDef, tile: number): number => (d.patrolTiles * tile) / 2;
/** Time for one leg of the patrol (ms). */
export const patrolLegMs = (d: PatrolDef, tile: number): number => ((d.patrolTiles * tile) / patrolSpeed(d)) * 1000;
/** A whole there-and-back (ms). */
export const patrolPeriodMs = (d: PatrolDef, tile: number): number => 2 * (patrolLegMs(d, tile) + d.turnPauseMs);

/** Where the walker is at time `tMs` (its own `phase` 0..1 offsets it so two never walk in step). */
export function patrolPoseOf(d: PatrolDef, tMs: number, phase: number, tile: number): PatrolPose {
  const leg = patrolLegMs(d, tile);
  const period = patrolPeriodMs(d, tile);
  const t = (((tMs + phase * period) % period) + period) % period;
  const half = patrolHalfPx(d, tile);
  if (t < leg) return { dx: -half + (t / leg) * 2 * half, dir: 1, turn: 0, moving: true };
  if (t < leg + d.turnPauseMs) return { dx: half, dir: 1, turn: Math.sin(((t - leg) / d.turnPauseMs) * Math.PI), moving: false };
  const u = t - leg - d.turnPauseMs;
  if (u < leg) return { dx: half - (u / leg) * 2 * half, dir: -1, turn: 0, moving: true };
  return { dx: -half, dir: -1, turn: Math.sin(((u - leg) / d.turnPauseMs) * Math.PI), moving: false };
}
