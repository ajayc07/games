// A short buzz where the browser supports it (Android Chrome and similar; iOS Safari has none, so nothing happens there).
// Never throws and never needs the caller to check: the game plays the same without it.

/** Vibrates for `pattern` ms (a number, or on/off/on... durations). */
export function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
  } catch {
    // Some browsers refuse without a recent touch; ignore.
  }
}

/** The buzz when he falls into a gap: one short, soft pulse. */
export const FALL_BUZZ_MS = 90;
