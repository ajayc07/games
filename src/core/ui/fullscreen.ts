// Browser fullscreen (Task 013). Best effort: feature-detected, never throws, never blocks play. The first real tap
// asks for fullscreen (plus a landscape lock where supported); after that the child leaving it is never fought.
// Re-entry is only through the parent view's Full screen row. The installed PWA is already fullscreen (manifest).
import { settings, settingsBound } from '../settings/settings';

/** The little part of the browser this module touches (a stub in tests). */
export interface FsEnv {
  doc: {
    fullscreenEnabled?: boolean;
    webkitFullscreenEnabled?: boolean;
    fullscreenElement?: unknown;
    webkitFullscreenElement?: unknown;
    documentElement: {
      requestFullscreen?: (o?: { navigationUI?: string }) => Promise<void> | void;
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    exitFullscreen?: () => Promise<void> | void;
    webkitExitFullscreen?: () => Promise<void> | void;
  };
  screen?: { orientation?: { lock?: (o: string) => Promise<void> } };
  /** `navigator.standalone` (iOS home-screen app). */
  standalone?: boolean;
  matchMedia?: (q: string) => { matches: boolean };
}

const realEnv = (): FsEnv => ({
  doc: document as unknown as FsEnv['doc'],
  screen: typeof screen === 'undefined' ? undefined : (screen as unknown as FsEnv['screen']),
  standalone: (navigator as unknown as { standalone?: boolean }).standalone,
  matchMedia: typeof matchMedia === 'function' ? (q) => matchMedia(q) : undefined,
});

export function isInstalled(env: FsEnv = realEnv()): boolean {
  if (env.standalone === true) return true;
  try {
    // `display-mode: fullscreen` also matches while the page itself is fullscreen through the API; that is not an install.
    const modes = isFullscreen(env) ? ['standalone', 'minimal-ui'] : ['fullscreen', 'standalone', 'minimal-ui'];
    return modes.some((m) => env.matchMedia?.(`(display-mode: ${m})`).matches === true);
  } catch {
    return false;
  }
}

/** The page can ask for fullscreen (false on iPhone Safari, which has no such API for pages). */
export function isFullscreenSupported(env: FsEnv = realEnv()): boolean {
  const d = env.doc;
  if (typeof d.documentElement.requestFullscreen === 'function') return d.fullscreenEnabled !== false;
  if (typeof d.documentElement.webkitRequestFullscreen === 'function') return d.webkitFullscreenEnabled !== false;
  return false;
}

export function isFullscreen(env: FsEnv = realEnv()): boolean {
  return !!(env.doc.fullscreenElement ?? env.doc.webkitFullscreenElement);
}

/** Whether the parent view shows its Full screen row. */
export function fullscreenAvailable(env: FsEnv = realEnv()): boolean {
  return isFullscreenSupported(env) && !isInstalled(env);
}

export interface AutoEnterInput {
  supported: boolean;
  setting: boolean;
  alreadyFullscreen: boolean;
  installed: boolean;
}

export function shouldAutoEnter(i: AutoEnterInput): boolean {
  return i.supported && i.setting && !i.alreadyFullscreen && !i.installed;
}

const swallow = (r: unknown): void => {
  if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => undefined);
};

/** Must run inside a user gesture. Returns whether a request was made (not whether the browser accepted it). */
export function enterFullscreen(env: FsEnv = realEnv()): boolean {
  if (!isFullscreenSupported(env) || isFullscreen(env)) return false;
  const el = env.doc.documentElement;
  try {
    if (typeof el.requestFullscreen === 'function') swallow(el.requestFullscreen({ navigationUI: 'hide' }));
    else swallow(el.webkitRequestFullscreen?.());
  } catch {
    return false; // refused: play on
  }
  try {
    swallow(env.screen?.orientation?.lock?.('landscape'));
  } catch {
    // no orientation lock here: fine
  }
  return true;
}

export function exitFullscreen(env: FsEnv = realEnv()): void {
  if (!isFullscreen(env)) return;
  try {
    const d = env.doc;
    if (typeof d.exitFullscreen === 'function') swallow(d.exitFullscreen());
    else swallow(d.webkitExitFullscreen?.());
  } catch {
    // ignore
  }
}

// Taps that count as a user activation for fullscreen (a touch's pointerdown does not; its pointerup/touchend does).
const GESTURE_EVENTS = ['pointerup', 'touchend', 'mousedown', 'keydown'] as const;

/**
 * Asks for fullscreen on the first real tap, once per page load. Waits until the saved settings are known, so a
 * parent's "Off" is respected; after one attempt the listeners are gone (no nagging, no re-request after Esc).
 */
export function installFullscreenOnFirstGesture(target: Window = window): void {
  const handler = (e: Event) => {
    if (e.type === 'keydown' && (e as KeyboardEvent).key === 'Escape') return;
    if (!settingsBound()) return; // too early to know the saved choice: wait for the next tap
    for (const ev of GESTURE_EVENTS) target.removeEventListener(ev, handler, true);
    try {
      const env = realEnv();
      if (shouldAutoEnter({ supported: isFullscreenSupported(env), setting: settings.fullscreen(), alreadyFullscreen: isFullscreen(env), installed: isInstalled(env) })) enterFullscreen(env);
    } catch {
      // never block play
    }
  };
  for (const ev of GESTURE_EVENTS) target.addEventListener(ev, handler, { capture: true, passive: true });
}
