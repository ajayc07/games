/** Best-effort screen wake lock so the screen does not dim mid-play. Failures are ignored. */
let sentinel: WakeLockSentinel | null = null;
/** False while the game sleeps from inactivity (Task 027): the lock is released and not asked for again until it wakes. */
let allowed = true;

/** Lets the screen sleep (false) or keeps it awake again (true). */
export function setScreenAwakeAllowed(on: boolean): void {
  allowed = on;
  if (!on) {
    void sentinel?.release().catch(() => undefined);
    sentinel = null;
  } else void acquire();
}

async function acquire(): Promise<void> {
  if (!allowed || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
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
