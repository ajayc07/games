/** Best-effort screen wake lock so the screen does not dim mid-play. Failures are ignored. */
let sentinel: WakeLockSentinel | null = null;

async function acquire(): Promise<void> {
  if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  if (sentinel && !sentinel.released) return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
  } catch {
    // Not allowed (no gesture yet, low battery, unsupported): ignore.
  }
}

export function keepScreenAwake(): void {
  void acquire();
  // Some browsers need a gesture; retry on interaction and when the tab comes back.
  window.addEventListener('pointerdown', () => void acquire(), { passive: true });
  window.addEventListener('keydown', () => void acquire());
  document.addEventListener('visibilitychange', () => void acquire());
}
