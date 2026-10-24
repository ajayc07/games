// Merges touch/mouse pointers, keyboard and gamepads into one action state.
// Game code only uses isDown / justPressed / justReleased / events; it never sees devices.
import Phaser from 'phaser';
import type { Action } from '../types';
import { ActionState, type ActionEvent, type InputConfig } from './actionState';
import { KEY_BINDINGS, PAD_AXIS_THRESHOLD, PAD_BUTTON_BINDINGS } from './bindings';
import { LOGICAL_HEIGHT } from '../ui/layoutMath';

export type { ActionEvent, InputConfig } from './actionState';

/** Maps a point in logical game coordinates to the touch button under it, if any. */
export type HitTest = (x: number, y: number) => Action | null;

export interface InputManagerOptions {
  /** KeyboardEvent.code values that are never treated as game input (e.g. lab mode keys). */
  reservedKeys?: string[];
  /** Pointers that START at a point for which this returns true are ignored (e.g. a settings icon). */
  ignorePointer?: (x: number, y: number) => boolean;
}

export const INPUT_EVENTS = {
  PRESS: 'press',
  RELEASE: 'release',
  CONFIGURE: 'configure',
  /** A touch/click started on no button. Payload { x, y, time } in logical units. */
  MISS: 'miss',
} as const;

export class InputManager extends Phaser.Events.EventEmitter {
  private readonly state: ActionState;
  private readonly canvas: HTMLCanvasElement;
  private readonly reserved: Set<string>;
  private readonly ignorePointer?: (x: number, y: number) => boolean;
  /** Pointers currently held down, with their last position in game coordinates. */
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private hitTest: HitTest = () => null;
  private readonly cleanups: Array<() => void> = [];
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    options: InputManagerOptions = {},
  ) {
    super();
    this.canvas = scene.game.canvas;
    this.reserved = new Set(options.reservedKeys ?? []);
    this.ignorePointer = options.ignorePointer;
    this.state = new ActionState((type, e) => this.emit(type, e));

    this.listen(this.canvas, 'pointerdown', this.onPointerDown);
    this.listen(window, 'pointermove', this.onPointerMove);
    this.listen(window, 'pointerup', this.onPointerEnd);
    this.listen(window, 'pointercancel', this.onPointerEnd);
    this.listen(window, 'keydown', this.onKeyDown);
    this.listen(window, 'keyup', this.onKeyUp);
    this.listen(window, 'blur', this.onBlur);
    this.listen(document, 'visibilitychange', this.onVisibility);

    // update() runs automatically before each scene update; destroy() on scene shutdown.
    scene.events.on(Phaser.Scenes.Events.PRE_UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);
  }

  // ---------- public API ----------

  configure(config: InputConfig): void {
    this.state.configure({ enabled: [...config.enabled], tapAnywhereJumps: config.tapAnywhereJumps }, performance.now());
    this.emit(INPUT_EVENTS.CONFIGURE, this.state.config);
  }

  get config(): InputConfig {
    return this.state.config;
  }

  isEnabled(action: Action): boolean {
    return this.state.config.enabled.includes(action);
  }

  isDown(action: Action): boolean {
    return this.state.isDown(action);
  }

  justPressed(action: Action): boolean {
    return this.state.justPressed(action);
  }

  justReleased(action: Action): boolean {
    return this.state.justReleased(action);
  }

  /** Listener for every press, with a timestamp (for later reaction-time logging). Returns unsubscribe. */
  onPress(listener: (e: ActionEvent) => void): () => void {
    this.on(INPUT_EVENTS.PRESS, listener);
    return () => this.off(INPUT_EVENTS.PRESS, listener);
  }

  /** Touch controls register how to find the button under a point. */
  setHitTest(hitTest: HitTest | null): void {
    this.hitTest = hitTest ?? (() => null);
  }

  /** Re-checks every held pointer against the current buttons (call after buttons move or hide). */
  refreshPointers(): void {
    const now = performance.now();
    for (const [id, p] of this.pointers) this.state.set(`pointer:${id}`, this.hitTest(p.x, p.y), now);
  }

  /** Releases everything from every device. */
  releaseAll(): void {
    this.pointers.clear();
    this.state.releaseAll('', performance.now());
  }

  /** Called once per frame (automatically, before the scene's update). */
  update(): void {
    this.pollGamepads();
    this.state.endFrame();
  }

  override destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.events.off(Phaser.Scenes.Events.PRE_UPDATE, this.update, this);
    for (const c of this.cleanups) c();
    this.cleanups.length = 0;
    this.state.releaseAll();
    super.destroy();
  }

  // ---------- pointers ----------

  /** Pointer position in logical units (the canvas may have more pixels than logical units on high-DPI). */
  private toGame(e: PointerEvent): { x: number; y: number } {
    const scale = this.scene.scale;
    const k = LOGICAL_HEIGHT / scale.height;
    return { x: scale.transformX(e.pageX) * k, y: scale.transformY(e.pageY) * k };
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const { x, y } = this.toGame(e);
    if (this.ignorePointer?.(x, y)) return;
    this.pointers.set(e.pointerId, { x, y });
    const hit = this.hitTest(x, y);
    this.state.set(`pointer:${e.pointerId}`, hit, e.timeStamp);
    // A tap that hit no button (and is not a tap-anywhere jump): scenes may give a friendly hint.
    if (!hit && !this.state.config.tapAnywhereJumps) this.emit(INPUT_EVENTS.MISS, { x, y, time: e.timeStamp });
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.pointers.has(e.pointerId)) return;
    const { x, y } = this.toGame(e);
    this.pointers.set(e.pointerId, { x, y });
    // Continuous hit-testing: sliding from Left onto Right switches buttons without lifting (D-015).
    this.state.set(`pointer:${e.pointerId}`, this.hitTest(x, y), e.timeStamp);
  };

  private onPointerEnd = (e: PointerEvent): void => {
    if (!this.pointers.delete(e.pointerId)) return;
    this.state.release(`pointer:${e.pointerId}`, e.timeStamp);
  };

  // ---------- keyboard ----------

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.reserved.has(e.code)) return;
    const action = KEY_BINDINGS[e.code] ?? null;
    if (action) e.preventDefault(); // no page scroll on Space/arrows
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    this.state.set(`key:${e.code}`, action, e.timeStamp);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.state.release(`key:${e.code}`, e.timeStamp);
  };

  // ---------- focus ----------

  private onBlur = (): void => this.releaseAll();

  private onVisibility = (): void => {
    if (document.visibilityState !== 'visible') this.releaseAll();
  };

  // ---------- gamepad ----------

  private pollGamepads(): void {
    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    const now = performance.now();
    const seen = new Set<string>();
    for (const pad of pads) {
      if (!pad || !pad.connected) continue;
      const p = `pad:${pad.index}:`;
      pad.buttons.forEach((b, i) => {
        if (!b.pressed) return;
        const id = `${p}b${i}`;
        seen.add(id);
        this.state.set(id, PAD_BUTTON_BINDINGS[i] ?? null, now);
      });
      const x = pad.axes[0] ?? 0;
      if (x < -PAD_AXIS_THRESHOLD) {
        seen.add(`${p}axis-left`);
        this.state.set(`${p}axis-left`, 'left', now);
      } else if (x > PAD_AXIS_THRESHOLD) {
        seen.add(`${p}axis-right`);
        this.state.set(`${p}axis-right`, 'right', now);
      }
    }
    for (const id of this.padSources) if (!seen.has(id)) this.state.release(id, now);
    this.padSources = seen;
  }

  private padSources = new Set<string>();

  // ---------- helpers ----------

  private listen<E extends Event>(target: EventTarget, type: string, handler: (e: E) => void): void {
    const h = handler as EventListener;
    target.addEventListener(type, h, { passive: false });
    this.cleanups.push(() => target.removeEventListener(type, h));
  }
}
