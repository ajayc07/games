// The DOM side of the menu gamepad (Task 043, see menuPad.ts): polls the gamepads on its own animation frame (so it keeps working while
// the auto-pause has stopped the game loop) and dispatches ordinary keyboard events on the window, which every menu already understands.
// It also reports that a pad is in use, so gamepad-only play counts as activity (no auto-pause, no idle wave) and a press wakes the auto-pause.
import { MenuPadMapper, padInUse, type PadSnapshot } from './menuPad';

/** Shared switches. `suspended`: a level is being played (the pad is read directly, only the exit hold is sent). `asleep`: the auto-pause is showing. */
export const padBridge = { suspended: false, asleep: false };

type Listener = (pressedNow: boolean) => void;
const listeners = new Set<Listener>();
/** Called every frame a pad is in use; the argument is true on the frame it starts being used. */
export function onPadActivity(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const KEY_CODES: Record<string, { key: string; keyCode: number }> = {
  ArrowUp: { key: 'ArrowUp', keyCode: 38 },
  ArrowDown: { key: 'ArrowDown', keyCode: 40 },
  ArrowLeft: { key: 'ArrowLeft', keyCode: 37 },
  ArrowRight: { key: 'ArrowRight', keyCode: 39 },
  Space: { key: ' ', keyCode: 32 },
  Escape: { key: 'Escape', keyCode: 27 },
  KeyR: { key: 'r', keyCode: 82 },
  KeyP: { key: 'p', keyCode: 80 },
};

function pads(): PadSnapshot[] {
  const list = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
  return Array.from(list).filter((p): p is Gamepad => !!p);
}

/** Starts the polling (once). Safe where there is no Gamepad API. */
export function installPadBridge(target: Window = window): void {
  if (typeof navigator.getGamepads !== 'function') return;
  const mapper = new MenuPadMapper();
  let wasInUse = false;
  const frame = () => {
    const snap = pads();
    const inUse = padInUse(snap);
    if (inUse) for (const fn of listeners) fn(!wasInUse);
    wasInUse = inUse;
    // Asleep: the press that wakes the game goes no further (like a touch).
    const edges = padBridge.asleep ? mapper.releaseAll() : mapper.poll(snap, performance.now(), padBridge.suspended);
    for (const e of edges) {
      const k = KEY_CODES[e.code];
      if (!k) continue;
      target.dispatchEvent(new KeyboardEvent(e.type === 'down' ? 'keydown' : 'keyup', { code: e.code, key: k.key, keyCode: k.keyCode, repeat: e.repeat, bubbles: true, cancelable: true }));
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
