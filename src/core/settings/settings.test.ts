import { describe, expect, it } from 'vitest';
import { freshRecord, parseRecord, serializeRecord } from '../storage/progress';
import { MemoryBackend } from '../storage/backends';
import { ProgressStore, progressKey } from '../storage/store';
import { unlockFromSearch, worldDots } from '../map/unlock';
import {
  BUTTON_SCALE_STEPS,
  bindSettings,
  clampButtonScale,
  nearestScaleStep,
  pickLook,
  resolveDayNight,
  resolveVibration,
  resolveButtonScale,
  resolveButtonsPrimary,
  resolveLook,
  resolveSoundOn,
  resolveFullscreen,
  resolveUnlockAll,
  resolveWalkAssist,
  settings,
  urlOverrides,
  type SettingsInput,
} from './settings';

const input = (search = '', saved: SettingsInput['saved'] = {}, savedLook: string | null = null): SettingsInput => ({ search, saved, savedLook });

describe('settings precedence: URL, then saved, then default', () => {
  it('button size', () => {
    expect(resolveButtonScale(input())).toBe(1);
    expect(resolveButtonScale(input('', { buttonScale: 1.2 }))).toBe(1.2);
    expect(resolveButtonScale(input('?buttonScale=0.8', { buttonScale: 1.2 }))).toBe(0.8);
    expect(resolveButtonScale(input('?buttonScale=junk', { buttonScale: 1.2 }))).toBe(1.2); // a bad URL value is ignored
    expect(resolveButtonScale(input('?buttonScale=-2'))).toBe(1);
  });

  it('button size is clamped to 0.6..1.6 from the URL and from storage', () => {
    expect(resolveButtonScale(input('?buttonScale=9'))).toBe(1.6);
    expect(resolveButtonScale(input('?buttonScale=0.1'))).toBe(0.6);
    expect(resolveButtonScale(input('', { buttonScale: 5 }))).toBe(1.6);
    expect(resolveButtonScale(input('', { buttonScale: 0.2 }))).toBe(0.6);
    expect(resolveButtonScale(input('', { buttonScale: Number.NaN }))).toBe(1);
    expect(clampButtonScale(1.234)).toBeCloseTo(1.234);
  });

  it('main button', () => {
    expect(resolveButtonsPrimary(input())).toBe('jump');
    expect(resolveButtonsPrimary(input('', { buttonsPrimary: 'power' }))).toBe('power');
    expect(resolveButtonsPrimary(input('?buttons=jump', { buttonsPrimary: 'power' }))).toBe('jump');
    expect(resolveButtonsPrimary(input('?buttons=power', { buttonsPrimary: 'jump' }))).toBe('power');
    expect(resolveButtonsPrimary(input('?buttons=xyz', { buttonsPrimary: 'power' }))).toBe('power');
  });

  it('sound', () => {
    expect(resolveSoundOn(input())).toBe(true);
    expect(resolveSoundOn(input('', { soundOn: false }))).toBe(false);
    expect(resolveSoundOn(input('?sound=1', { soundOn: false }))).toBe(true);
    expect(resolveSoundOn(input('?sound=0', { soundOn: true }))).toBe(false);
    expect(resolveSoundOn(input('?sound=off'))).toBe(false);
  });

  it('unlock all: ?unlock=all wins, the saved switch counts, default off', () => {
    expect(resolveUnlockAll(input())).toBe(false);
    expect(resolveUnlockAll(input('', { unlockAll: true }))).toBe(true);
    expect(resolveUnlockAll(input('?unlock=all', { unlockAll: false }))).toBe(true);
    expect(resolveUnlockAll(input('?unlock=none', { unlockAll: false }))).toBe(false);
  });

  it('look', () => {
    expect(resolveLook(input())).toBe('robot');
    expect(resolveLook(input('', {}, 'ball'))).toBe('ball');
    expect(resolveLook(input('?look=robot', {}, 'ball'))).toBe('robot');
    expect(resolveLook(input('?look=BALL', {}, 'robot'))).toBe('ball');
    expect(resolveLook(input('?look=sprite', {}, 'ball'))).toBe('ball'); // removed look: ignored
    expect(resolveLook(input('', {}, 'nonsense'))).toBe('robot');
  });

  it('fullscreen (Task 013): ?fullscreen=0|1, then the saved value, then on', () => {
    expect(resolveFullscreen(input())).toBe(true);
    expect(resolveFullscreen(input('', { fullscreen: false }))).toBe(false);
    expect(resolveFullscreen(input('?fullscreen=1', { fullscreen: false }))).toBe(true);
    expect(resolveFullscreen(input('?fullscreen=0', { fullscreen: true }))).toBe(false);
    expect(resolveFullscreen(input('?fullscreen=off'))).toBe(false);
    expect(resolveFullscreen(input('?fullscreen=maybe', { fullscreen: false }))).toBe(false); // a bad URL value is ignored
    expect(urlOverrides('?fullscreen=0').fullscreen).toBe(true);
    expect(parseRecord(serializeRecord({ ...freshRecord(), settings: { fullscreen: false } })).record.settings.fullscreen).toBe(false);
    expect(parseRecord('{"version":1,"settings":{"fullscreen":"yes"}}').record.settings.fullscreen).toBeUndefined();
  });

  it('walk assist (Task 011): ?assist=sticky|off, then the saved value, then off', () => {
    expect(resolveWalkAssist(input())).toBe('off');
    expect(resolveWalkAssist(input('', { walkAssist: 'sticky' }))).toBe('sticky');
    expect(resolveWalkAssist(input('?assist=off', { walkAssist: 'sticky' }))).toBe('off');
    expect(resolveWalkAssist(input('?assist=STICKY'))).toBe('sticky');
    expect(resolveWalkAssist(input('?assist=maybe', { walkAssist: 'sticky' }))).toBe('sticky'); // a bad URL value is ignored
  });

  it('removing the URL parameter returns to the saved value', () => {
    const saved = { buttonScale: 1.4, buttonsPrimary: 'power' as const };
    expect(resolveButtonScale(input('?buttonScale=0.8', saved))).toBe(0.8);
    expect(resolveButtonScale(input('', saved))).toBe(1.4);
    expect(resolveButtonsPrimary(input('?buttons=jump', saved))).toBe('jump');
    expect(resolveButtonsPrimary(input('', saved))).toBe('power');
  });

  it('reports which settings the URL pins', () => {
    expect(urlOverrides('')).toEqual({ buttonScale: false, buttonsPrimary: false, soundOn: false, unlockAll: false, look: false, walkAssist: false, fullscreen: false, dayNight: false, vibration: false });
    expect(urlOverrides('?buttonScale=1.3&buttons=power&sound=0&unlock=all&look=ball&assist=sticky')).toEqual({ buttonScale: true, buttonsPrimary: true, soundOn: true, unlockAll: true, look: true, walkAssist: true, fullscreen: false, dayNight: false, vibration: false });
    expect(urlOverrides('?assist=maybe').walkAssist).toBe(false);
    expect(urlOverrides('?buttonScale=junk&look=sprite').buttonScale).toBe(false);
    expect(urlOverrides('?look=sprite').look).toBe(false);
  });

  it('the four steps are inside the clamp range and the nearest step is found', () => {
    for (const s of BUTTON_SCALE_STEPS) expect(clampButtonScale(s)).toBe(s);
    expect(BUTTON_SCALE_STEPS.map(nearestScaleStep)).toEqual([0, 1, 2, 3]);
    expect(nearestScaleStep(1.6)).toBe(3);
    expect(nearestScaleStep(0.6)).toBe(0);
    expect(nearestScaleStep(1.09)).toBe(1);
  });
});

describe('the runtime binding reads live saved values', () => {
  it('follows changes to the saved settings, and the URL still wins', () => {
    let saved: SettingsInput['saved'] = {};
    bindSettings(() => ({ saved, savedLook: null }), '');
    expect(settings.buttonScale()).toBe(1);
    saved = { buttonScale: 1.4, soundOn: false, buttonsPrimary: 'power', unlockAll: true };
    expect(settings.buttonScale()).toBe(1.4);
    expect(settings.soundOn()).toBe(false);
    expect(settings.buttonsPrimary()).toBe('power');
    expect(settings.unlockAll()).toBe(true);
    bindSettings(() => ({ saved, savedLook: 'ball' }), '?buttonScale=0.8&buttons=jump');
    expect(settings.buttonScale()).toBe(0.8);
    expect(settings.buttonsPrimary()).toBe('jump');
    expect(settings.look()).toBe('ball');
    bindSettings(() => ({ saved: {}, savedLook: null }), '');
  });
});

describe('the record and the store', () => {
  it('an older record without buttonsPrimary loads unchanged', () => {
    const old = JSON.stringify({ version: 1, chosenCharacterId: 'blue', look: 'ball', levels: { g1: { stars: 2, bestCoins: 9 } }, settings: { soundOn: false, buttonScale: 1.2, unlockAll: true } });
    const { record, status } = parseRecord(old);
    expect(status).toBe('ok');
    expect(record.settings).toEqual({ soundOn: false, buttonScale: 1.2, unlockAll: true });
    expect(record.levels.g1).toEqual({ stars: 2, bestCoins: 9 });
    expect(record.settings.buttonsPrimary).toBeUndefined();
  });

  it('walkAssist is optional, round-trips and an invalid value is dropped (no version bump)', () => {
    const r = { ...freshRecord(), settings: { walkAssist: 'sticky' as const } };
    expect(parseRecord(serializeRecord(r)).record.settings.walkAssist).toBe('sticky');
    expect(parseRecord(JSON.stringify({ version: 1, settings: { walkAssist: 'always' } })).record.settings).toEqual({});
    expect(parseRecord(JSON.stringify({ version: 1, settings: { soundOn: true } })).record.settings.walkAssist).toBeUndefined();
  });

  it('buttonsPrimary round-trips; an invalid value is dropped', () => {
    const r = { ...freshRecord(), settings: { buttonsPrimary: 'power' as const } };
    expect(parseRecord(serializeRecord(r)).record.settings.buttonsPrimary).toBe('power');
    const bad = JSON.stringify({ version: 1, settings: { buttonsPrimary: 'both', soundOn: 'no' } });
    expect(parseRecord(bad).record.settings).toEqual({});
  });

  it('updateSettings merges and saves; reset clears levels and keeps colour, look and settings', async () => {
    const mem = new MemoryBackend();
    const store = await ProgressStore.open('robo', { backends: [mem] });
    store.setChosenCharacter('pink');
    store.setLook('ball');
    store.updateSettings({ soundOn: false, buttonScale: 1.4 });
    store.updateSettings({ buttonsPrimary: 'power' });
    store.recordResult('grass-1', { stars: 3, coins: 12 });
    store.recordResult('grass-2', { stars: 1, coins: 3 });
    await store.flush();
    expect(JSON.parse(mem.data.get(progressKey('robo'))!).settings).toEqual({ soundOn: false, buttonScale: 1.4, buttonsPrimary: 'power' });
    await store.resetProgress();
    const saved = JSON.parse(mem.data.get(progressKey('robo'))!);
    expect(saved.levels).toEqual({});
    expect(saved.chosenCharacterId).toBe('pink');
    expect(saved.look).toBe('ball');
    expect(saved.settings).toEqual({ soundOn: false, buttonScale: 1.4, buttonsPrimary: 'power' });
    // Results after a reset start from nothing.
    store.recordResult('grass-1', { stars: 1, coins: 2 });
    expect(store.level('grass-1')).toEqual({ stars: 1, bestCoins: 2 });
  });

  it('an unknown-version record is still never overwritten by settings changes or a reset', async () => {
    const mem = new MemoryBackend();
    const newer = JSON.stringify({ version: 2, keep: 'me' });
    mem.data.set(progressKey('robo'), newer);
    const store = await ProgressStore.open('robo', { backends: [mem] });
    store.updateSettings({ soundOn: false });
    await store.resetProgress();
    await store.flush();
    expect(mem.data.get(progressKey('robo'))).toBe(newer);
    expect(store.record.settings.soundOn).toBe(false); // applies for this visit
  });

  it('with storage blocked the settings still apply for the visit and nothing throws', async () => {
    const blocked = {
      name: 'blocked',
      get: async () => {
        throw new Error('no');
      },
      set: async () => {
        throw new Error('no');
      },
    };
    const store = await ProgressStore.open('robo', { backends: [blocked, blocked] });
    store.updateSettings({ buttonScale: 1.2, unlockAll: true });
    await expect(store.flush()).resolves.toBeUndefined();
    await expect(store.resetProgress()).resolves.toBeUndefined();
    expect(store.record.settings).toEqual({ buttonScale: 1.2, unlockAll: true });
  });
});

describe('unlock all through the settings', () => {
  const world = { id: 'w', name: 'W', levels: ['a', 'b', 'c', 'd', 'e', 'f'] };
  const open = (opts: ReturnType<typeof unlockFromSearch>) => worldDots(world, {}, opts).filter((d) => d.open).length;
  it('the saved switch opens every dot, as ?unlock=all does', () => {
    expect(open(unlockFromSearch('', 3))).toBe(3);
    expect(open(unlockFromSearch('', 3, true))).toBe(6);
    expect(open(unlockFromSearch('?unlock=all', 3, false))).toBe(6);
    expect(open(unlockFromSearch('', 3, false))).toBe(3);
  });
});

describe('day / night and vibration (Task 025)', () => {
  const input = (search: string, saved: Parameters<typeof resolveDayNight>[0]['saved'] = {}) => ({ search, saved, savedLook: null });

  it('day / night: the URL, then the saved value, then random', () => {
    expect(resolveDayNight(input(''))).toBe('random');
    expect(resolveDayNight(input('', { dayNight: 'night' }))).toBe('night');
    expect(resolveDayNight(input('?time=day', { dayNight: 'night' }))).toBe('day');
    expect(resolveDayNight(input('?time=nonsense', { dayNight: 'day' }))).toBe('day');
    expect(resolveDayNight(input('?time=RANDOM', { dayNight: 'day' }))).toBe('random');
    expect(urlOverrides('?time=day').dayNight).toBe(true);
    expect(urlOverrides('?time=x').dayNight).toBe(false);
  });

  it('vibration: the URL, then the saved value, then on', () => {
    expect(resolveVibration(input(''))).toBe(true);
    expect(resolveVibration(input('', { vibration: false }))).toBe(false);
    expect(resolveVibration(input('?vibrate=1', { vibration: false }))).toBe(true);
    expect(resolveVibration(input('?vibrate=off'))).toBe(false);
    expect(urlOverrides('?vibrate=0').vibration).toBe(true);
    expect(urlOverrides('').vibration).toBe(false);
  });

  it('which look a level gets: the night level is always dark, day and night are obeyed, random keeps a first play bright', () => {
    for (const roll of [0, 0.3, 0.7, 0.99]) {
      expect(pickLook('day', { nightLevel: true, varied: true, roll })).toBe('night');
      expect(pickLook('day', { nightLevel: false, varied: true, roll })).toBe('day');
      expect(pickLook('night', { nightLevel: false, varied: false, roll })).toBe('night');
      expect(pickLook('random', { nightLevel: false, varied: false, roll })).toBe('day');
    }
    expect(pickLook('random', { nightLevel: false, varied: true, roll: 0.2 })).toBe('night');
    expect(pickLook('random', { nightLevel: false, varied: true, roll: 0.8 })).toBe('day');
    // Roughly half and half over many rolls.
    let night = 0;
    for (let i = 0; i < 1000; i++) if (pickLook('random', { nightLevel: false, varied: true, roll: i / 1000 }) === 'night') night++;
    expect(night).toBe(500);
  });

  it('both settings survive the saved record, and bad values are dropped', () => {
    const rec = freshRecord();
    rec.settings.dayNight = 'night';
    rec.settings.vibration = false;
    const back = parseRecord(serializeRecord(rec)).record;
    expect(back.settings.dayNight).toBe('night');
    expect(back.settings.vibration).toBe(false);
    const bad = parseRecord(JSON.stringify({ version: 1, settings: { dayNight: 'purple', vibration: 'yes' } })).record;
    expect(bad.settings).toEqual({});
  });
});

