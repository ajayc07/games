// Parent-view settings (D-047, Task 010). Every setting resolves as: URL parameter, then the saved value
// (the progress record's `settings`), then the default. Pure functions; the little runtime binding at the bottom
// lets code that has no store at hand (TouchControls, the Input Lab) ask the same questions.
import { DEFAULT_LOOK, LOOK_NAMES, type LookName } from '../avatar/config';
import type { ProgressSettings } from '../storage/progress';

/** Button size steps offered in the parent view; any stored or URL value is clamped to MIN..MAX. */
export const BUTTON_SCALE_STEPS = [0.8, 1, 1.2, 1.4] as const;
export const BUTTON_SCALE_MIN = 0.6;
export const BUTTON_SCALE_MAX = 1.6;
export const DEFAULT_BUTTON_SCALE = 1;
export type ButtonsPrimary = 'jump' | 'power';

export interface SettingsInput {
  /** `location.search` of this visit. */
  search: string;
  /** The record's saved settings. */
  saved: ProgressSettings;
  /** The record's saved look (`robot`/`ball`) or null. */
  savedLook: string | null;
}

const param = (search: string, key: string): string | null => new URLSearchParams(search).get(key);
const isLook = (v: unknown): v is LookName => typeof v === 'string' && (LOOK_NAMES as readonly string[]).includes(v);

export function clampButtonScale(v: number): number {
  return Math.min(BUTTON_SCALE_MAX, Math.max(BUTTON_SCALE_MIN, v));
}

/** `?buttonScale=1.3` (a positive number), else the saved value, else 1. Always clamped to 0.6..1.6. */
export function resolveButtonScale(i: SettingsInput): number {
  const raw = param(i.search, 'buttonScale');
  const url = raw === null ? NaN : Number(raw);
  if (Number.isFinite(url) && url > 0) return clampButtonScale(url);
  const saved = i.saved.buttonScale;
  if (typeof saved === 'number' && Number.isFinite(saved) && saved > 0) return clampButtonScale(saved);
  return DEFAULT_BUTTON_SCALE;
}

/** `?buttons=jump|power`, else the saved value, else jump. */
export function resolveButtonsPrimary(i: SettingsInput): ButtonsPrimary {
  const url = param(i.search, 'buttons');
  if (url === 'power' || url === 'jump') return url;
  return i.saved.buttonsPrimary === 'power' ? 'power' : 'jump';
}

/** `?sound=0|1` (also off/on), else the saved value, else on. */
export function resolveSoundOn(i: SettingsInput): boolean {
  const url = param(i.search, 'sound')?.toLowerCase();
  if (url === '0' || url === 'off') return false;
  if (url === '1' || url === 'on') return true;
  return i.saved.soundOn ?? true;
}

/** `?unlock=all` wins; else the saved switch; else off. */
export function resolveUnlockAll(i: SettingsInput): boolean {
  return param(i.search, 'unlock') === 'all' || i.saved.unlockAll === true;
}

/** `?look=` (a known name), else the saved look, else the robot. (An unknown `?look=` is ignored here; the boot warns.) */
export function resolveLook(i: SettingsInput): LookName {
  const url = param(i.search, 'look')?.toLowerCase();
  if (isLook(url)) return url;
  return isLook(i.savedLook) ? i.savedLook : DEFAULT_LOOK;
}

/** Which settings the URL pins for this visit (the parent view says so, since a change would not show). */
export function urlOverrides(search: string): { buttonScale: boolean; buttonsPrimary: boolean; soundOn: boolean; unlockAll: boolean; look: boolean } {
  const scale = Number(param(search, 'buttonScale'));
  const sound = param(search, 'sound')?.toLowerCase();
  const buttons = param(search, 'buttons');
  return {
    buttonScale: param(search, 'buttonScale') !== null && Number.isFinite(scale) && scale > 0,
    buttonsPrimary: buttons === 'jump' || buttons === 'power',
    soundOn: sound === '0' || sound === 'off' || sound === '1' || sound === 'on',
    unlockAll: param(search, 'unlock') === 'all',
    look: isLook(param(search, 'look')?.toLowerCase()),
  };
}

/** Index of the button size step closest to a scale (for highlighting the current step). */
export function nearestScaleStep(scale: number): number {
  let best = 0;
  for (let i = 1; i < BUTTON_SCALE_STEPS.length; i++) {
    if (Math.abs(BUTTON_SCALE_STEPS[i] - scale) < Math.abs(BUTTON_SCALE_STEPS[best] - scale)) best = i;
  }
  return best;
}

// ---- runtime binding ----

let source: () => SettingsInput = () => ({ search: typeof location === 'undefined' ? '' : location.search, saved: {}, savedLook: null });

/** The universe calls this once at boot with the progress store, so every reader sees live saved values. */
export function bindSettings(read: () => Pick<SettingsInput, 'saved' | 'savedLook'>, search: string = typeof location === 'undefined' ? '' : location.search): void {
  source = () => ({ search, ...read() });
}

export const settings = {
  buttonScale: (): number => resolveButtonScale(source()),
  buttonsPrimary: (): ButtonsPrimary => resolveButtonsPrimary(source()),
  soundOn: (): boolean => resolveSoundOn(source()),
  unlockAll: (): boolean => resolveUnlockAll(source()),
  look: (): LookName => resolveLook(source()),
};
