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

/** Short press shown on the button for a Jump (ms). */
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
    return { move: 1, jump, presses: jump ? [{ action: 'jump', holdMs: JUMP_PRESS_MS }] : [], aim: 'jump', done: x >= this.endX };
  }

  get pressed(): number {
    return this.next;
  }
}

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

  constructor(config: DemoScriptConfig) {
    this.steps = config.script.map((s) => ({ t: s.t, action: s.action, hold: s.action === 'jump' ? 0 : (s.hold ?? 0) }));
    this.firstAction = this.steps[0]?.action ?? 'jump';
    this.endMs = Math.max(0, ...this.steps.map((s) => s.t + s.hold)) + DEMO_TAIL_MS;
  }

  step(elapsedMs: number): DemoFrame {
    const presses: DemoPress[] = [];
    let jump = false;
    while (this.next < this.steps.length && elapsedMs >= this.steps[this.next].t) {
      const s = this.steps[this.next++];
      if (s.action === 'jump') jump = true;
      presses.push({ action: s.action, holdMs: s.action === 'jump' ? JUMP_PRESS_MS : s.hold });
    }
    let left = false;
    let right = false;
    let held: DemoAction | null = null;
    for (let i = 0; i < this.next; i++) {
      const s = this.steps[i];
      if (s.action === 'jump' || elapsedMs >= s.t + s.hold) continue;
      if (s.action === 'left') left = true;
      else right = true;
      held = s.action;
    }
    const move = left === right ? 0 : left ? -1 : 1;
    const upcoming = this.steps[this.next]?.action;
    const lastPressed = this.next > 0 ? this.steps[this.next - 1].action : this.firstAction;
    const aim = jump ? 'jump' : (held ?? upcoming ?? lastPressed);
    return { move, jump, presses, aim, done: elapsedMs >= this.endMs };
  }

  get pressed(): number {
    return this.next;
  }
}

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
