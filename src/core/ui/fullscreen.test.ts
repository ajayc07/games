import { describe, expect, it, vi } from 'vitest';
import { enterFullscreen, exitFullscreen, fullscreenAvailable, isFullscreen, isFullscreenSupported, isInstalled, shouldAutoEnter, type FsEnv } from './fullscreen';

const base = { supported: true, setting: true, alreadyFullscreen: false, installed: false };

describe('shouldAutoEnter', () => {
  it('enters only when supported, on, not already fullscreen and not installed', () => {
    expect(shouldAutoEnter(base)).toBe(true);
    expect(shouldAutoEnter({ ...base, supported: false })).toBe(false);
    expect(shouldAutoEnter({ ...base, setting: false })).toBe(false);
    expect(shouldAutoEnter({ ...base, alreadyFullscreen: true })).toBe(false);
    expect(shouldAutoEnter({ ...base, installed: true })).toBe(false);
  });
});

function env(over: Partial<FsEnv['doc']['documentElement']> = {}, extra: Partial<FsEnv> = {}, doc: Partial<FsEnv['doc']> = {}): FsEnv {
  return { doc: { documentElement: { requestFullscreen: vi.fn(async () => undefined), ...over }, ...doc }, ...extra };
}

describe('fullscreen module with a stubbed browser', () => {
  it('detects support, webkit fallback and iPhone-style no support', () => {
    expect(isFullscreenSupported(env())).toBe(true);
    expect(isFullscreenSupported(env({}, {}, { fullscreenEnabled: false }))).toBe(false);
    expect(isFullscreenSupported(env({ requestFullscreen: undefined, webkitRequestFullscreen: vi.fn() }))).toBe(true);
    expect(isFullscreenSupported(env({ requestFullscreen: undefined }))).toBe(false);
  });

  it('installed apps are detected and hide the row', () => {
    expect(isInstalled(env({}, { standalone: true }))).toBe(true);
    expect(isInstalled(env({}, { matchMedia: (q) => ({ matches: q.includes('fullscreen') }) }))).toBe(true);
    expect(isInstalled(env({}, { matchMedia: () => ({ matches: false }) }))).toBe(false);
    // Fullscreen reached through the API also matches display-mode: fullscreen; that is not an install.
    expect(isInstalled(env({}, { matchMedia: (q) => ({ matches: q.includes('fullscreen') }) }, { fullscreenElement: {} }))).toBe(false);
    expect(fullscreenAvailable(env({}, { standalone: true }))).toBe(false);
    expect(fullscreenAvailable(env())).toBe(true);
  });

  it('enter requests fullscreen and locks landscape', () => {
    const lock = vi.fn(async () => undefined);
    const e = env({}, { screen: { orientation: { lock } } });
    expect(enterFullscreen(e)).toBe(true);
    expect(e.doc.documentElement.requestFullscreen).toHaveBeenCalledOnce();
    expect(lock).toHaveBeenCalledWith('landscape');
  });

  it('enter does nothing when unsupported or already fullscreen', () => {
    expect(enterFullscreen(env({ requestFullscreen: undefined }))).toBe(false);
    expect(enterFullscreen(env({}, {}, { fullscreenElement: {} }))).toBe(false);
  });

  it('never throws: request rejects, request throws, orientation lock missing, rejects or throws', async () => {
    expect(() => enterFullscreen(env({ requestFullscreen: () => Promise.reject(new Error('no')) }))).not.toThrow();
    expect(enterFullscreen(env({ requestFullscreen: () => { throw new Error('no'); } }))).toBe(false);
    expect(() => enterFullscreen(env({}, { screen: {} }))).not.toThrow();
    expect(() => enterFullscreen(env({}, { screen: { orientation: { lock: () => Promise.reject(new Error('no')) } } }))).not.toThrow();
    expect(() => enterFullscreen(env({}, { screen: { orientation: { lock: () => { throw new Error('no'); } } } }))).not.toThrow();
    await new Promise((r) => setTimeout(r, 0)); // an unhandled rejection would fail the run
  });

  it('exit leaves only when in fullscreen and never throws', () => {
    const exit = vi.fn(async () => undefined);
    exitFullscreen(env({}, {}, { fullscreenElement: {}, exitFullscreen: exit }));
    expect(exit).toHaveBeenCalledOnce();
    exitFullscreen(env({}, {}, { exitFullscreen: exit }));
    expect(exit).toHaveBeenCalledOnce();
    expect(() => exitFullscreen(env({}, {}, { fullscreenElement: {}, exitFullscreen: () => { throw new Error('x'); } }))).not.toThrow();
    expect(isFullscreen(env({}, {}, { webkitFullscreenElement: {} }))).toBe(true);
  });
});
