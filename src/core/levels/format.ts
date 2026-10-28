// Level format v1 (D-018): JSON with an ASCII grid and a legend. Pure, framework-free, unit-tested.
import type { Action } from '../types';
import { ALL_ACTIONS } from '../input/actionState';

/** Legend for `grid`. New tile kinds (bricks, pipes, ...) get new entries here. */
export const LEGEND = {
  '.': 'empty',
  '#': 'ground',
  c: 'coin',
  S: 'start',
  F: 'goal',
  /** Small bubble (Task 007, D-041): one cell, popped by a shot into 3 coins. Not solid. */
  o: 'bubble',
  /** Big bubble: a 2x2 block of `O` cells, a soft blocker until popped (6 coins). */
  O: 'big bubble',
  /** High bubble (Task 009): a small bubble worth 4 coins, centred in its cell (not dropped), meant to be 2.5 tiles up. */
  h: 'high bubble',
  /** Rainbow bubble (Task 012): a small bubble with a rainbow sheen worth 8 coins. Never in the JSON files; replay variety makes one. */
  r: 'rainbow bubble',
  /** Car pickup (Task 017): a glowing orb with a little car on it; touching it turns the robot into a car for 10 s. Not solid. */
  P: 'car pickup',
  /** Magnet pickup (Task 018): for 10 s loose coins near him fly to him. Not solid. */
  M: 'magnet pickup',
  /** Rocket boots pickup (Task 018): for 10 s his jump is about 1.3 times as strong, with flames at his feet. Not solid. */
  J: 'rocket boots pickup',
  /** Step block (Task 015): a solid one-tile toy block, stacked at most 2 high; he jumps up onto it. */
  B: 'step block',
  /** Bounce pad (Task 015): a springy plate on the ground (not solid); stepping on it launches him high. */
  '^': 'bounce pad',
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
 * "Watch me" demo (D-024, D-030), one of two forms:
 * - `DemoTilesConfig` (auto-run levels): the ghost runs from the start until it reaches grid column `tiles`,
 *   pressing Jump when its centre enters each column in `jumpsAtTiles`. Columns count from the left edge
 *   of the grid (0-based), the same as reading the grid strings.
 * - `DemoScriptConfig` (time-based): presses at `t` ms after the demo starts; Left/Right are held for `hold` ms.
 */
export type DemoConfig = DemoTilesConfig | DemoScriptConfig;

export interface DemoTilesConfig {
  tiles: number;
  jumpsAtTiles: number[];
}

export type DemoAction = 'left' | 'right' | 'jump' | 'power';

export interface DemoStepDef {
  /** Time of the press after the demo starts (ms). */
  t: number;
  action: DemoAction;
  /** How long Left/Right is held (ms). Always set after parsing (default DEFAULT_DEMO_HOLD_MS); jump and power have none. */
  hold?: number;
}

export interface DemoScriptConfig {
  script: DemoStepDef[];
}

/** Hold time of a scripted Left/Right press without `hold` (ms). */
export const DEFAULT_DEMO_HOLD_MS = 600;

export const isScriptDemo = (d: DemoConfig): d is DemoScriptConfig => 'script' in d;

export interface LevelData {
  version: 1;
  id: string;
  world: string;
  title: string;
  controls: LevelControls;
  /** Size of one grid cell in logical px. */
  tileSize: number;
  /** Run speed in px/s (auto-run levels); the shared default from physics.ts if omitted. */
  runSpeed?: number;
  /** Walk speed in px/s (Left/Right levels, D-029); the shared default from physics.ts if omitted. */
  walkSpeed?: number;
  /** Coins needed for 2 and 3 stars. Finishing always gives 1 (D-020). */
  stars: { two: number; three: number };
  /** Equal-length rows, top row first. */
  grid: string[];
  /**
   * A generated free-play level (Task 011, D-049): no progress is saved for it and the win screen shows the run's
   * combo stars. Absent on the normal levels.
   */
  practice?: true;
  /** `false` keeps the level's coins and bubbles where they are on replays (Task 012). Absent = replays may shuffle them. */
  variety?: false;
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
  if (raw.walkSpeed !== undefined && !isPositive(raw.walkSpeed)) err('"walkSpeed" must be a positive number');
  if (raw.practice !== undefined && typeof raw.practice !== 'boolean') err('"practice" must be true or false');
  if (raw.variety !== undefined && typeof raw.variety !== 'boolean') err('"variety" must be true or false');

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
    if (demo && isScriptDemo(demo) && Array.isArray(c.enabled)) {
      for (const step of demo.script) {
        if (!c.enabled.includes(step.action)) {
          err(`"controls.demo.script" presses "${step.action}", which is not in "controls.enabled"`);
        }
      }
    }
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
    for (const msg of bigBubbleErrors(rows)) err(msg);
    if (starts !== 1) err(`grid needs exactly one "S" (player start), found ${starts}`);
    if (flags !== 1) err(`grid needs exactly one "F" (goal), found ${flags}`);
    if (demo && !isScriptDemo(demo) && starts === 1) {
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
      walkSpeed: raw.walkSpeed as number | undefined,
      stars: { two: (s as { two: number }).two, three: (s as { three: number }).three },
      grid: [...(g as string[])],
      ...(raw.practice === true ? { practice: true as const } : {}),
      ...(raw.variety === false ? { variety: false as const } : {}),
    },
  };
}

const DEMO_SHAPE =
  'false, { "tiles": <column>, "jumpsAtTiles": [<column>, ...] } or { "script": [{ "t": <ms>, "action": "left"|"right"|"jump"|"power", "hold": <ms> }, ...] }';
const DEMO_ACTIONS: readonly string[] = ['left', 'right', 'jump', 'power'];
/** Single presses: no `hold`. */
const isSinglePress = (a: unknown) => a === 'jump' || a === 'power';

/**
 * Big bubbles (`O`) must be whole 2x2 blocks: every `O` belongs to exactly one block, read left to right and
 * top to bottom. Errors name the first cell of a broken block (1-based row and column, like the other grid errors).
 */
function bigBubbleErrors(rows: readonly string[]): string[] {
  const errors: string[] = [];
  const used = new Set<string>();
  const at = (r: number, c: number) => rows[r]?.[c] === 'O';
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (!at(r, c) || used.has(`${r}:${c}`)) continue;
      const block = [[r, c], [r, c + 1], [r + 1, c], [r + 1, c + 1]];
      if (block.every(([br, bc]) => at(br, bc) && !used.has(`${br}:${bc}`))) {
        for (const [br, bc] of block) used.add(`${br}:${bc}`);
      } else {
        errors.push(`grid row ${r + 1}, column ${c + 1}: a big bubble "O" must be a 2x2 block of "O" (2 wide, 2 tall)`);
        used.add(`${r}:${c}`);
      }
    }
  }
  return errors;
}

/** `controls.demo`: missing or false = no demo; otherwise one of the two object forms, checked field by field. */
function parseDemo(v: unknown, err: (msg: string) => void): DemoConfig | false {
  if (v === undefined || v === false) return false;
  if (!isObject(v)) {
    err(`"controls.demo" must be ${DEMO_SHAPE} (got ${JSON.stringify(v)})`);
    return false;
  }
  const hasScript = 'script' in v;
  const hasTiles = 'tiles' in v || 'jumpsAtTiles' in v;
  if (hasScript && hasTiles) {
    err('"controls.demo" mixes the two forms: use either "script" or "tiles" + "jumpsAtTiles", not both');
    return false;
  }
  return hasScript ? parseDemoScript(v, err) : parseDemoTiles(v, err);
}

function parseDemoTiles(v: Record<string, unknown>, err: (msg: string) => void): DemoTilesConfig | false {
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

function parseDemoScript(v: Record<string, unknown>, err: (msg: string) => void): DemoScriptConfig | false {
  let ok = true;
  const fail = (msg: string) => {
    err(msg);
    ok = false;
  };
  for (const key of Object.keys(v)) {
    if (key !== 'script') fail(`"controls.demo" has unknown field "${key}" (a script demo has only "script")`);
  }
  if (!Array.isArray(v.script) || v.script.length === 0) {
    fail(`"controls.demo.script" must be a non-empty array of steps (got ${JSON.stringify(v.script)})`);
    return false;
  }
  const script: DemoStepDef[] = [];
  let lastT = -Infinity;
  v.script.forEach((raw: unknown, i: number) => {
    const at = `"controls.demo.script" step ${i + 1}`;
    if (!isObject(raw)) {
      fail(`${at} must be an object like { "t": 500, "action": "right", "hold": 800 } (got ${JSON.stringify(raw)})`);
      return;
    }
    for (const key of Object.keys(raw)) {
      if (key !== 't' && key !== 'action' && key !== 'hold') fail(`${at} has unknown field "${key}" (use "t", "action", "hold")`);
    }
    const { t, action, hold } = raw;
    if (typeof t !== 'number' || !Number.isFinite(t) || t < 0) fail(`${at}: "t" must be a time in ms, 0 or more (got ${JSON.stringify(t)})`);
    else if (t < lastT) fail(`${at}: "t" (${t}) is earlier than the step before (${lastT}); list steps in time order`);
    else lastT = t;
    if (typeof action !== 'string' || !DEMO_ACTIONS.includes(action)) {
      fail(`${at}: "action" must be "left", "right", "jump" or "power" (got ${JSON.stringify(action)})`);
    }
    if (hold !== undefined) {
      if (isSinglePress(action)) fail(`${at}: "hold" is only for "left" and "right" (${action === 'jump' ? 'Jump' : 'Power'} is a single press)`);
      else if (!isPositive(hold)) fail(`${at}: "hold" must be a positive time in ms (got ${JSON.stringify(hold)})`);
    }
    if (ok) {
      const step: DemoStepDef = { t: t as number, action: action as DemoAction };
      if (!isSinglePress(action)) step.hold = (hold as number | undefined) ?? DEFAULT_DEMO_HOLD_MS;
      script.push(step);
    }
  });
  return ok ? { script } : false;
}

/** Like parseLevel, but throws one Error listing every problem. */
export function parseLevelOrThrow(raw: unknown, source?: string): LevelData {
  const result = parseLevel(raw, source);
  if (!result.ok) throw new Error(`Invalid level\n- ${result.errors.join('\n- ')}`);
  return result.level;
}
