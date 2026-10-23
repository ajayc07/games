// Framework-free input state. No DOM, no Phaser: unit-tested in actionState.test.ts.
//
// Every physical input (a key, a touch pointer, a gamepad button) is a "source" with an id such as
// 'key:Space', 'pointer:3' or 'pad:0:b0'. Each source holds one raw value: the action it maps to,
// or null when it maps to nothing (a key with no binding, a touch on empty sky). The merged action
// state is derived from all sources, after tap-anywhere mapping and enabled-action filtering.
import type { Action } from '../types';

export const ALL_ACTIONS: readonly Action[] = ['left', 'right', 'jump', 'power'];

export interface InputConfig {
  /** Actions that may fire. Everything else is ignored from every source. */
  enabled: Action[];
  /** Any tap, click, key or pad button anywhere counts as `jump` (Grass 1). */
  tapAnywhereJumps: boolean;
}

export interface ActionEvent {
  action: Action;
  /** Milliseconds, same clock as performance.now() / event.timeStamp. */
  time: number;
}

export type ActionListener = (type: 'press' | 'release', e: ActionEvent) => void;

export class ActionState {
  private readonly sources = new Map<string, Action | null>();
  private enabled = new Set<Action>(ALL_ACTIONS);
  private tapAnywhere = false;

  /** Live merged state: which actions are held right now. */
  private down = new Set<Action>();
  /** Edges collected since the last endFrame(). */
  private pendingPressed = new Set<Action>();
  private pendingReleased = new Set<Action>();
  /** Edges visible to game code during the current frame. */
  private framePressed = new Set<Action>();
  private frameReleased = new Set<Action>();

  constructor(private readonly listener?: ActionListener) {}

  configure(config: InputConfig, time = 0): void {
    this.enabled = new Set(config.enabled);
    this.tapAnywhere = config.tapAnywhereJumps;
    this.recompute(time);
  }

  get config(): InputConfig {
    return { enabled: ALL_ACTIONS.filter((a) => this.enabled.has(a)), tapAnywhereJumps: this.tapAnywhere };
  }

  /** A source started (or changed what it points at). `raw` null = mapped to nothing. */
  set(sourceId: string, raw: Action | null, time = 0): void {
    if (this.sources.has(sourceId) && this.sources.get(sourceId) === raw) return;
    this.sources.set(sourceId, raw);
    this.recompute(time);
  }

  /** A source ended (key up, pointer up, pad button released). */
  release(sourceId: string, time = 0): void {
    if (!this.sources.delete(sourceId)) return;
    this.recompute(time);
  }

  /** Release every source whose id starts with `prefix` (e.g. 'pointer:'), or all sources. */
  releaseAll(prefix = '', time = 0): void {
    let changed = false;
    for (const id of [...this.sources.keys()]) {
      if (id.startsWith(prefix)) {
        this.sources.delete(id);
        changed = true;
      }
    }
    if (changed) this.recompute(time);
  }

  hasSource(sourceId: string): boolean {
    return this.sources.has(sourceId);
  }

  /** Call once per frame, before game code reads justPressed/justReleased. */
  endFrame(): void {
    this.framePressed = this.pendingPressed;
    this.frameReleased = this.pendingReleased;
    this.pendingPressed = new Set();
    this.pendingReleased = new Set();
  }

  isDown(action: Action): boolean {
    return this.down.has(action);
  }

  /** True for exactly one frame after the action went down (even if it was released again within that frame). */
  justPressed(action: Action): boolean {
    return this.framePressed.has(action);
  }

  justReleased(action: Action): boolean {
    return this.frameReleased.has(action);
  }

  private effective(raw: Action | null): Action | null {
    if (this.tapAnywhere) return 'jump';
    return raw;
  }

  private recompute(time: number): void {
    const next = new Set<Action>();
    for (const raw of this.sources.values()) {
      const action = this.effective(raw);
      if (action && this.enabled.has(action)) next.add(action);
    }
    // Emit in a stable order so tests and logs are predictable.
    for (const action of ALL_ACTIONS) {
      const was = this.down.has(action);
      const now = next.has(action);
      if (!was && now) {
        this.pendingPressed.add(action);
        this.listener?.('press', { action, time });
      } else if (was && !now) {
        this.pendingReleased.add(action);
        this.listener?.('release', { action, time });
      }
    }
    this.down = next;
  }
}
