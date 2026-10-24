// Level format v1 (D-018): JSON with an ASCII grid and a legend. Pure, framework-free, unit-tested.
import type { Action } from '../types';
import { ALL_ACTIONS } from '../input/actionState';

/** Legend for `grid`. New tile kinds (bricks, pipes, ...) get new entries here. */
export const LEGEND = {
  '.': 'empty',
  '#': 'ground',
  c: 'coin',
  S: 'start',
  F: 'flag',
} as const;

export type LegendChar = keyof typeof LEGEND;

export interface LevelControls {
  /** Actions the level allows; only these get on-screen buttons. */
  enabled: Action[];
  /** The player runs right by itself; Left/Right are not needed. */
  autoRun: boolean;
  /** Any tap, click or key counts as Jump; no buttons are shown. */
  tapAnywhereJumps: boolean;
  /** A "watch me" demo of the new control before the real run (D-024), or false. */
  demo: DemoConfig | false;
}

/**
 * "Watch me" demo (D-024). A ghost runs from the start until it reaches grid column `tiles`, pressing
 * Jump when its centre enters each column in `jumpsAtTiles`. Columns count from the left edge of the
 * grid (0-based), the same as reading the grid strings.
 */
export interface DemoConfig {
  tiles: number;
  jumpsAtTiles: number[];
}

export interface LevelData {
  version: 1;
  id: string;
  world: string;
  title: string;
  controls: LevelControls;
  /** Size of one grid cell in logical px. */
  tileSize: number;
  /** Run speed in px/s; the shared default from physics.ts if omitted. */
  runSpeed?: number;
  /** Coins needed for 2 and 3 stars. Finishing always gives 1 (D-020). */
  stars: { two: number; three: number };
  /** Equal-length rows, top row first. */
  grid: string[];
}

export type ParseResult = { ok: true; level: LevelData } | { ok: false; errors: string[] };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isPositive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

/** Validates raw JSON. Errors are readable sentences that name the level and the problem. */
export function parseLevel(raw: unknown, source = 'level'): ParseResult {
  const errors: string[] = [];
  if (!isObject(raw)) return { ok: false, errors: [`${source}: not a JSON object`] };
  const name = typeof raw.id === 'string' && raw.id ? raw.id : source;
  const err = (msg: string) => errors.push(`${name}: ${msg}`);

  if (raw.version !== 1) err(`"version" must be 1 (got ${JSON.stringify(raw.version)})`);
  for (const key of ['id', 'world', 'title'] as const) {
    if (typeof raw[key] !== 'string' || raw[key] === '') err(`"${key}" must be a non-empty string`);
  }
  if (!isPositive(raw.tileSize)) err('"tileSize" must be a positive number');
  if (raw.runSpeed !== undefined && !isPositive(raw.runSpeed)) err('"runSpeed" must be a positive number');

  // controls
  const c = raw.controls;
  let demo: DemoConfig | false = false;
  if (!isObject(c)) {
    err('"controls" must be an object');
  } else {
    if (!Array.isArray(c.enabled)) err('"controls.enabled" must be an array of actions');
    else {
      for (const a of c.enabled) {
        if (!ALL_ACTIONS.includes(a as Action)) {
          err(`"controls.enabled" has unknown action ${JSON.stringify(a)} (use ${ALL_ACTIONS.join(', ')})`);
        }
      }
    }
    for (const key of ['autoRun', 'tapAnywhereJumps'] as const) {
      if (typeof c[key] !== 'boolean') err(`"controls.${key}" must be true or false`);
    }
    demo = parseDemo(c.demo, err);
  }

  // stars
  const s = raw.stars;
  if (!isObject(s) || !isCount(s.two) || !isCount(s.three)) {
    err('"stars" must be { "two": <coins>, "three": <coins> } with whole numbers');
  } else if (s.two > s.three) {
    err(`"stars.two" (${s.two}) must not be more than "stars.three" (${s.three})`);
  }

  // grid
  const g = raw.grid;
  if (!Array.isArray(g) || g.length === 0 || !g.every((r) => typeof r === 'string')) {
    err('"grid" must be a non-empty array of strings');
  } else {
    const rows = g as string[];
    const width = rows[0].length;
    if (width === 0) err('"grid" rows must not be empty');
    let starts = 0;
    let flags = 0;
    rows.forEach((row, r) => {
      if (row.length !== width) err(`grid row ${r + 1} has ${row.length} characters, expected ${width} (like row 1)`);
      for (let col = 0; col < row.length; col++) {
        const ch = row[col];
        if (!(ch in LEGEND)) {
          err(`grid row ${r + 1}, column ${col + 1}: unknown character ${JSON.stringify(ch)} (use ${Object.keys(LEGEND).join(' ')})`);
        }
        if (ch === 'S') starts++;
        if (ch === 'F') flags++;
      }
    });
    if (starts !== 1) err(`grid needs exactly one "S" (player start), found ${starts}`);
    if (flags !== 1) err(`grid needs exactly one "F" (flag), found ${flags}`);
    if (demo && starts === 1) {
      const startCol = rows.find((r) => r.includes('S'))!.indexOf('S');
      if (demo.tiles <= startCol || demo.tiles > width) {
        err(`"controls.demo.tiles" (${demo.tiles}) must be a column after the start (${startCol}) and inside the grid (width ${width})`);
      }
      for (const col of demo.jumpsAtTiles) {
        if (col <= startCol || col >= demo.tiles) {
          err(`"controls.demo.jumpsAtTiles" has column ${col}: it must be after the start (${startCol}) and before "tiles" (${demo.tiles})`);
        }
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  const controls = c as Record<string, unknown>;
  return {
    ok: true,
    level: {
      version: 1,
      id: raw.id as string,
      world: raw.world as string,
      title: raw.title as string,
      controls: {
        enabled: [...(controls.enabled as Action[])],
        autoRun: controls.autoRun as boolean,
        tapAnywhereJumps: controls.tapAnywhereJumps as boolean,
        demo,
      },
      tileSize: raw.tileSize as number,
      runSpeed: raw.runSpeed as number | undefined,
      stars: { two: (s as { two: number }).two, three: (s as { three: number }).three },
      grid: [...(g as string[])],
    },
  };
}

const DEMO_SHAPE = 'false or { "tiles": <column>, "jumpsAtTiles": [<column>, ...] }';

/** `controls.demo`: missing or false = no demo; otherwise the object form, checked field by field. */
function parseDemo(v: unknown, err: (msg: string) => void): DemoConfig | false {
  if (v === undefined || v === false) return false;
  if (!isObject(v)) {
    err(`"controls.demo" must be ${DEMO_SHAPE} (got ${JSON.stringify(v)})`);
    return false;
  }
  let ok = true;
  if (!isCount(v.tiles) || v.tiles === 0) {
    err(`"controls.demo.tiles" must be a whole number above 0 (got ${JSON.stringify(v.tiles)})`);
    ok = false;
  }
  if (!Array.isArray(v.jumpsAtTiles) || !v.jumpsAtTiles.every(isCount)) {
    err(`"controls.demo.jumpsAtTiles" must be an array of whole column numbers (got ${JSON.stringify(v.jumpsAtTiles)})`);
    ok = false;
  }
  for (const key of Object.keys(v)) {
    if (key !== 'tiles' && key !== 'jumpsAtTiles') {
      err(`"controls.demo" has unknown field "${key}" (use "tiles" and "jumpsAtTiles")`);
      ok = false;
    }
  }
  if (!ok) return false;
  const jumps = [...new Set(v.jumpsAtTiles as number[])].sort((a, b) => a - b);
  return { tiles: v.tiles as number, jumpsAtTiles: jumps };
}

/** Like parseLevel, but throws one Error listing every problem. */
export function parseLevelOrThrow(raw: unknown, source?: string): LevelData {
  const result = parseLevel(raw, source);
  if (!result.ok) throw new Error(`Invalid level\n- ${result.errors.join('\n- ')}`);
  return result.level;
}
