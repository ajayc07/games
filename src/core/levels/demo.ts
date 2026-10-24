// "Watch me" demo logic (D-024, D-030), framework-free and unit-tested. The Phaser side lives in LevelScene.
import { isScriptDemo, type DemoAction, type DemoConfig, type DemoScriptConfig, type DemoStepDef, type DemoTilesConfig } from './format';

/** A press the demo makes this frame, for the button animation and the finger. */
export interface DemoPress {
  action: DemoAction;
  /** How long the button stays down (ms). */
  holdMs: number;
}

/** What the ghost does this frame. */
export interface DemoFrame {
  /** Walk/run direction: -1 left, 0 stand, 1 right. */
  move: -1 | 0 | 1;
  /** Press Jump this frame. */
  jump: boolean;
  /** Press Power this frame (one shot). */
  power: boolean;
  /** Presses that start this frame (empty most frames). */
  presses: DemoPress[];
  /** The button the finger should be at: the one being pressed, else the next one. */
  aim: DemoAction;
  /** The script is over. */
  done: boolean;
}

/** Both demo forms behind one interface. `step` is called once per frame. */
export interface DemoRunner {
  step(elapsedMs: number, x: number): DemoFrame;
  /** Number of presses made so far. */
  readonly pressed: number;
  /** The first button the demo presses (the "your turn" pulse goes there). */
  readonly firstAction: DemoAction;
  /** True for the time-based form: the scene also waits for the ghost to land before ending. */
  readonly timed: boolean;
}

export function createDemo(config: DemoConfig, tileSize: number): DemoRunner {
  return isScriptDemo(config) ? new TimedDemo(config) : new DemoScript(config, tileSize);
}

/** Short press shown on the button for a Jump or Power (ms). */
export const JUMP_PRESS_MS = 220;

/**
 * Tile form (auto-run levels). Call `step(elapsed, x)` once per frame with the ghost's centre x:
 * it says whether to press Jump this frame (the ghost just entered a jump column) and when the demo is over.
 * Each jump column fires once, in order, even if a long frame skips past several columns.
 */
export class DemoScript implements DemoRunner {
  readonly firstAction: DemoAction = 'jump';
  readonly timed = false;
  private next = 0;
  private readonly jumpXs: number[];
  private readonly endX: number;

  constructor(config: DemoTilesConfig, tileSize: number) {
    this.jumpXs = config.jumpsAtTiles.map((col) => col * tileSize);
    this.endX = config.tiles * tileSize;
  }

  step(_elapsedMs: number, x: number): DemoFrame {
    let jump = false;
    while (this.next < this.jumpXs.length && x >= this.jumpXs[this.next]) {
      jump = true;
      this.next++;
    }
    return { move: 1, jump, power: false, presses: jump ? [{ action: 'jump', holdMs: JUMP_PRESS_MS }] : [], aim: 'jump', done: x >= this.endX };
  }

  get pressed(): number {
    return this.next;
  }
}

/** After a Jump or Power press the finger stays on that button this long (ms) before gliding on. */
export const TAP_LINGER_MS = 350;

/** The demo ends this long after the last scripted step finishes (ms). */
export const DEMO_TAIL_MS = 600;

/**
 * Time-based form (D-030): each step presses at `t` ms; Left/Right stay held for `hold` ms. Both held at
 * once = stand still, like real input. Every step fires once, even if a long frame skips past it.
 */
export class TimedDemo implements DemoRunner {
  readonly timed = true;
  readonly firstAction: DemoAction;
  /** Time the demo is over (ms after start). */
  readonly endMs: number;
  private readonly steps: Required<DemoStepDef>[];
  private next = 0;
  private lastTap: { action: DemoAction; t: number } | null = null;

  constructor(config: DemoScriptConfig) {
    this.steps = config.script.map((s) => ({ t: s.t, action: s.action, hold: isTap(s.action) ? 0 : (s.hold ?? 0) }));
    this.firstAction = this.steps[0]?.action ?? 'jump';
    this.endMs = Math.max(0, ...this.steps.map((s) => s.t + s.hold)) + DEMO_TAIL_MS;
  }

  step(elapsedMs: number): DemoFrame {
    const presses: DemoPress[] = [];
    let jump = false;
    let power = false;
    while (this.next < this.steps.length && elapsedMs >= this.steps[this.next].t) {
      const s = this.steps[this.next++];
      if (s.action === 'jump') jump = true;
      if (s.action === 'power') power = true;
      if (isTap(s.action)) this.lastTap = { action: s.action, t: s.t };
      presses.push({ action: s.action, holdMs: isTap(s.action) ? JUMP_PRESS_MS : s.hold });
    }
    let left = false;
    let right = false;
    let held: DemoAction | null = null;
    for (let i = 0; i < this.next; i++) {
      const s = this.steps[i];
      if (isTap(s.action) || elapsedMs >= s.t + s.hold) continue;
      if (s.action === 'left') left = true;
      else right = true;
      held = s.action;
    }
    const move = left === right ? 0 : left ? -1 : 1;
    const upcoming = this.steps[this.next]?.action;
    const lastPressed = this.next > 0 ? this.steps[this.next - 1].action : this.firstAction;
    const lingering = this.lastTap && elapsedMs - this.lastTap.t < TAP_LINGER_MS ? this.lastTap.action : undefined;
    const aim = lingering ?? held ?? upcoming ?? lastPressed;
    return { move, jump, power, presses, aim, done: elapsedMs >= this.endMs };
  }

  get pressed(): number {
    return this.next;
  }
}

/** Jump and Power are single presses (no hold). */
const isTap = (a: DemoAction) => a === 'jump' || a === 'power';

/** Value of the `?demo=` URL parameter: '1' forces the demo, '0' skips it, anything else = normal rules. */
export type DemoOverride = 'force' | 'skip' | null;

export function demoOverrideFrom(search: string): DemoOverride {
  const v = new URLSearchParams(search).get('demo');
  if (v === '1') return 'force';
  if (v === '0') return 'skip';
  return null;
}

/** The demo plays once per session per level (in memory), unless the URL forces or skips it. */
export function shouldPlayDemo(config: DemoConfig | false, seenThisSession: boolean, override: DemoOverride): boolean {
  if (!config || override === 'skip') return false;
  return override === 'force' || !seenThisSession;
}

/** A tap ends the demo only after this long, so the child sees at least one press. */
export const DEMO_SKIP_AFTER_MS = 1500;
