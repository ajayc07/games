// Device -> action mappings (D-015). Pure data so it is easy to change in one place.
import type { Action } from '../types';

/** KeyboardEvent.code -> action. */
export const KEY_BINDINGS: Readonly<Record<string, Action>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'jump',
  ArrowUp: 'jump',
  KeyW: 'jump',
  KeyX: 'power',
  KeyZ: 'power',
  ShiftLeft: 'power',
  ShiftRight: 'power',
};

/** Standard Gamepad mapping button index -> action. */
export const PAD_BUTTON_BINDINGS: Readonly<Record<number, Action>> = {
  0: 'jump', // A / Cross
  1: 'power', // B / Circle
  2: 'power', // X / Square
  14: 'left', // d-pad left
  15: 'right', // d-pad right
};

/** Left stick deadzone for left/right. */
export const PAD_AXIS_THRESHOLD = 0.5;
