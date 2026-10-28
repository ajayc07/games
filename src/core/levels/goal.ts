// The stage-end charging pad (Task 014, D-055): pure geometry and timing, no Phaser. The scene draws it.
import type { Cell } from './grid';

export const GOAL = {
  /** Pad size in tiles (width, height of the slab). */
  padTiles: { w: 3, h: 0.45 },
  /** Charger column at the back of the pad (width, height in tiles above the pad top) and the beacon bulb's diameter. */
  columnTiles: { w: 0.5, h: 1.4 },
  bulbTiles: 0.9,
  /** Faint idle light column rising from the bulb (tiles tall, width in tiles) and its breathing period (ms). */
  lightTiles: 4,
  lightWidthTiles: 1,
  lightBreatheMs: 2600,
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

/** Columns on each side of the `F` column that the pad's footprint covers (the pad is 3 tiles wide, centred on the column). */
export const padReachCols = (): number => Math.floor(GOAL.padTiles.w / 2);

/** Charger column and bulb sizes (px). */
export const columnSize = (tile: number): { w: number; h: number } => ({ w: GOAL.columnTiles.w * tile, h: GOAL.columnTiles.h * tile });
export const bulbSize = (tile: number): number => GOAL.bulbTiles * tile;

/** Time from landing to the result screen (ms): the settle ease plus the charge. */
export const arrivalTotalMs = (): number => GOAL.settleMs + GOAL.resultDelayMs;

/** Extra time over the old flag sequence (landing to result screen was 1100 ms). */
export const arrivalExtraMs = (): number => arrivalTotalMs() - 1100;
