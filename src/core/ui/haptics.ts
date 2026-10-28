// A short buzz where the browser supports it (Android Chrome and similar; iOS Safari has none, so nothing happens there).
// Never throws and never needs the caller to check: the game plays the same without it. The parent view can switch it off.
import { settings } from '../settings/settings';

/** Is vibration offered by this browser at all? (iOS Safari: no.) */
export function vibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/** Vibrates for `pattern` ms (a number, or on/off/on... durations). `force` ignores the parent's switch (the Test button). */
export function vibrate(pattern: number | number[], force = false): boolean {
  try {
    if (!force && !settings.vibration()) return false;
    if (vibrationSupported()) return navigator.vibrate(pattern);
  } catch {
    // Some browsers refuse without a recent touch; ignore.
  }
  return false;
}

/**
 * The buzz when he falls into a gap: two firm pulses, easy to feel in a hand holding a tablet or a phone (one short 90 ms
 * pulse was too faint on some Android phones, Task 025).
 */
export const FALL_BUZZ: number[] = [160, 70, 160];
