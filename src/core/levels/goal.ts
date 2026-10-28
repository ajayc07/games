// The stage-end charging pad (Task 014, D-055): pure geometry and timing, no Phaser. The scene draws it.
import type { Cell } from './grid';

export const GOAL = {
  /** Pad size in tiles (width, height of the slab). */
  padTiles: { w: 2, h: 0.3 },
  /** Post (at the back of the pad), in tiles above the pad top. */
  postTiles: 2.5,
  /** Arrival: the robot eases onto the pad centre, then the pad charges (ms). */
  settleMs: 250,
  beamMs: 1000,
  beamTiles: 3,
  ringPulses: 2,
  ringPulseMs: 450,
  /** The result screen comes this long after the charge starts (it was 1100 after landing before). */
  resultDelayMs: 1100,
  /** Idle life: ring pulse period, beacon blink period (ms). */
  idleRingMs: 1400,
  idleBlinkMs: 1000,
} as const;

/** x of the pad centre and the level-end trigger (unchanged from the flag: the middle of the `F` column). */
export const goalX = (cell: Cell, tile: number): number => cell.col * tile + tile / 2;

/** Pad slab height (px). */
export const padHeight = (tile: number): number => GOAL.padTiles.h * tile;

/** Time from landing to the result screen (ms): the settle ease plus the charge. */
export const arrivalTotalMs = (): number => GOAL.settleMs + GOAL.resultDelayMs;

/** Extra time over the old flag sequence (landing to result screen was 1100 ms). */
export const arrivalExtraMs = (): number => arrivalTotalMs() - 1100;
