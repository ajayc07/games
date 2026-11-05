// Gamepad -> menu keys (Task 043). Menus already work with a keyboard (arrows, Space, Escape, R, P); this turns a gamepad into the same
// key presses, so every screen (picker, map, Practice, sticker book, win screen, hold-to-exit, parent gear) works with a controller and
// with a TV remote (which sends arrow keys and OK) without each screen knowing about gamepads. Pure and unit-tested; the DOM side is
// padBridge.ts. Levels still read the pad directly through InputManager (D-015): while a level is being played the mapper is
// "suspended" and sends only the hold-to-exit key, so the two never double up.
//
// Standard mapping: D-pad 12-15 and the left stick = arrows (with a slow repeat while held); A (0) = Space (confirm, Next, play);
// B (1) = Escape (back, Home); X (2) = R (replay on the win screen); Select (8) held in a level = Escape (the 1 s exit hold);
// Start + Select held together on the map = P (the parent gear's 3 s hold). Nothing else does anything, so mashing is harmless.

export interface PadSnapshot {
  connected: boolean;
  buttons: ReadonlyArray<{ pressed: boolean }>;
  axes: ReadonlyArray<number>;
}

export interface KeyEdge {
  type: 'down' | 'up';
  code: string;
  /** An auto-repeat of a held direction (like a held key on a keyboard). */
  repeat: boolean;
}

export const MENU_PAD = {
  /** The stick counts as a direction beyond this. */
  axis: 0.55,
  /** A held direction repeats after this long, then every `repeatEveryMs`. */
  repeatAfterMs: 450,
  repeatEveryMs: 220,
} as const;

/** Standard-mapping button numbers. */
const B = { a: 0, b: 1, x: 2, select: 8, start: 9, up: 12, down: 13, left: 14, right: 15 } as const;

export const DIRECTION_CODES = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] as const;

/** Which key codes the pad wants held right now. `suspended` = a level is being played. */
export function wantedKeys(pads: readonly PadSnapshot[], suspended: boolean): Set<string> {
  const want = new Set<string>();
  const pressed = (n: number) => pads.some((p) => p.connected && !!p.buttons[n]?.pressed);
  const axis = (i: number) => pads.reduce((v, p) => (p.connected && Math.abs(p.axes[i] ?? 0) > Math.abs(v) ? (p.axes[i] ?? 0) : v), 0);
  const start = pressed(B.start);
  const select = pressed(B.select);
  if (suspended) {
    // Playing: the only thing the menu layer does is the hold-to-exit key (Select alone), never B or the arrows.
    if (select && !start) want.add('Escape');
    return want;
  }
  if (pressed(B.up) || axis(1) < -MENU_PAD.axis) want.add('ArrowUp');
  if (pressed(B.down) || axis(1) > MENU_PAD.axis) want.add('ArrowDown');
  if (pressed(B.left) || axis(0) < -MENU_PAD.axis) want.add('ArrowLeft');
  if (pressed(B.right) || axis(0) > MENU_PAD.axis) want.add('ArrowRight');
  if (pressed(B.a)) want.add('Space');
  if (pressed(B.b)) want.add('Escape');
  if (pressed(B.x)) want.add('KeyR');
  if (start && select) want.add('KeyP');
  return want;
}

/** Is any button down or a stick pushed (a pad is in use: it counts as activity for the idle watch and wakes the auto-pause)? */
export function padInUse(pads: readonly PadSnapshot[]): boolean {
  return pads.some((p) => p.connected && (p.buttons.some((b) => b.pressed) || p.axes.some((a) => Math.abs(a) > MENU_PAD.axis)));
}

/** Turns successive pad snapshots into key down / up edges (and repeats for held directions). */
export class MenuPadMapper {
  private held = new Map<string, number>();
  private nextRepeat = new Map<string, number>();
  private wasSuspended = false;
  /** Keys that were already held when a level ended: ignored until they are let go, so a jump button still down does not press a menu. */
  private suppressed = new Set<string>();

  poll(pads: readonly PadSnapshot[], now: number, suspended: boolean): KeyEdge[] {
    let want = wantedKeys(pads, suspended);
    if (this.wasSuspended && !suspended) this.suppressed = new Set(want);
    this.wasSuspended = suspended;
    for (const code of [...this.suppressed]) if (!want.has(code)) this.suppressed.delete(code);
    if (this.suppressed.size > 0) want = new Set([...want].filter((c) => !this.suppressed.has(c)));
    const out: KeyEdge[] = [];
    for (const code of [...this.held.keys()]) {
      if (!want.has(code)) {
        this.held.delete(code);
        this.nextRepeat.delete(code);
        out.push({ type: 'up', code, repeat: false });
      }
    }
    for (const code of want) {
      if (!this.held.has(code)) {
        this.held.set(code, now);
        out.push({ type: 'down', code, repeat: false });
        if ((DIRECTION_CODES as readonly string[]).includes(code)) this.nextRepeat.set(code, now + MENU_PAD.repeatAfterMs);
      } else {
        const next = this.nextRepeat.get(code);
        if (next !== undefined && now >= next) {
          out.push({ type: 'down', code, repeat: true });
          this.nextRepeat.set(code, now + MENU_PAD.repeatEveryMs);
        }
      }
    }
    return out;
  }

  /** Everything let go (the page lost focus, or the pad was unplugged): returns the key-up edges. */
  releaseAll(): KeyEdge[] {
    const out = [...this.held.keys()].map((code) => ({ type: 'up' as const, code, repeat: false }));
    this.held.clear();
    this.nextRepeat.clear();
    return out;
  }
}
