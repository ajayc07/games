import { describe, expect, it } from 'vitest';
import { IDLE_WAVE, IdleWave, THUMP, landingThump } from './polish';
import { LAND_THUMP, LAND_THUMP_ID, STEP, pickStepVariant, stepRecipe, stepSoundId, stepVariants } from '../audio/steps';
import { DEFAULT_LIMITS, VoiceLimiter } from '../audio/voiceLimiter';
import { recipeDuration } from '../audio/recipes';
import { ANIM } from '../levels/animation';
import { PHYSICS } from '../levels/physics';
import { waveClip, idleClip } from './clips';

const T = 64;

describe('footsteps (Task 019, D-081)', () => {
  it('pitch variants stay within about 15% of each other and the run taps are lighter and shorter than the walk taps', () => {
    for (const kind of ['walk', 'run'] as const) {
      const hz = Array.from({ length: stepVariants(kind) }, (_, i) => stepRecipe(kind, i).tones[0].freq);
      expect(new Set(hz).size).toBe(hz.length);
      expect(Math.max(...hz) / Math.min(...hz)).toBeGreaterThan(1.1);
      expect(Math.max(...hz) / Math.min(...hz)).toBeLessThan(1.25);
    }
    const walk = stepRecipe('walk', 1);
    const run = stepRecipe('run', 1);
    expect(recipeDuration(run)).toBeLessThan(recipeDuration(walk));
    expect(run.tones[0].gain ?? 1).toBeLessThan(walk.tones[0].gain ?? 1);
    expect(run.tones[0].freq).toBeGreaterThan(walk.tones[0].freq);
    // Quiet and short: nothing above a third of full gain, nothing longer than a tenth of a second.
    for (const r of [walk, run]) {
      for (const t of r.tones) expect(t.gain ?? 1).toBeLessThanOrEqual(0.3);
      expect(recipeDuration(r)).toBeLessThan(0.1);
    }
  });

  it('ids are unique per kind and variant, and a random pick never repeats the last variant', () => {
    const ids = new Set<string>();
    for (const kind of ['walk', 'run'] as const) for (let i = 0; i < stepVariants(kind); i++) ids.add(stepSoundId(kind, i));
    expect(ids.size).toBe(stepVariants('walk') + stepVariants('run'));
    for (const kind of ['walk', 'run'] as const) {
      const n = stepVariants(kind);
      for (let last = -1; last < n; last++) {
        for (let r = 0; r < 1; r += 0.05) {
          const v = pickStepVariant(kind, r, last);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThan(n);
          expect(v).not.toBe(last);
        }
      }
      expect(pickStepVariant(kind, 0.999999, -1)).toBe(n - 1);
      expect(pickStepVariant(kind, 0, -1)).toBe(0);
    }
  });

  it('one tap per stride: a walk and the fastest run never need more voices than the limiter gives, and nothing is dropped', () => {
    // A stride is 56 px: 220 px/s walking, 319 hold-to-run, 374 Flash; the driver keeps at least STEP.minGapMs between taps.
    for (const speed of [PHYSICS.walkSpeed, PHYSICS.walkSpeed * 1.45, PHYSICS.walkSpeed * 1.7]) {
      const strideMs = (56 / speed) * 1000;
      const gap = Math.max(strideMs, STEP.minGapMs);
      const lim = new VoiceLimiter(DEFAULT_LIMITS);
      let dropped = 0;
      for (let t = 0, i = 0; t < 10_000; t += gap, i++) {
        const kind = speed > PHYSICS.walkSpeed * 1.2 ? 'run' : 'walk';
        if (!lim.tryStart(stepSoundId(kind, i % stepVariants(kind)), t, recipeDuration(stepRecipe(kind, 0)) * 1000)) dropped++;
        expect(lim.activeCount(stepSoundId(kind, i % stepVariants(kind)), t)).toBeLessThanOrEqual(DEFAULT_LIMITS.maxVoices);
      }
      expect(dropped, `speed ${speed}`).toBe(0);
      // The tap is shorter than the stride, so taps never pile up.
      expect(recipeDuration(stepRecipe('walk', 0)) * 1000).toBeLessThan(gap);
    }
    expect(STEP.minGapMs).toBeGreaterThanOrEqual(DEFAULT_LIMITS.minGapMs);
    expect(ANIM.dust.footfallMinMs).toBeGreaterThanOrEqual(STEP.minGapMs);
  });
});

describe('landing thump', () => {
  it('plays after a drop of at least a tile (a normal jump peaks 2.5 tiles) and not for a hop', () => {
    expect(THUMP.minDropTiles).toBe(1);
    expect(landingThump(160, T)).toBe(true); // a normal jump
    expect(landingThump(T, T)).toBe(true);
    expect(landingThump(T - 1, T)).toBe(false);
    expect(landingThump(20, T)).toBe(false); // a tiny hop
    expect(landingThump(0, T)).toBe(false);
    expect(landingThump(5 * T, T)).toBe(true); // a fall from a ledge
  });

  it('is a low, soft, short sound, lower than any step', () => {
    expect(LAND_THUMP_ID).toBe('landThump');
    expect(LAND_THUMP.tones[0].freq).toBeLessThan(stepRecipe('walk', 0).tones[0].freq);
    expect(recipeDuration(LAND_THUMP)).toBeLessThan(0.25);
    for (const t of LAND_THUMP.tones) expect(t.gain ?? 1).toBeLessThanOrEqual(0.5);
  });
});

describe('idle wave', () => {
  const run = (frames: Array<{ ms: number; idle: number; free?: boolean }>, sleepMs = Infinity) => {
    const w = new IdleWave();
    const events: Array<[number, string]> = [];
    let t = 0;
    for (const f of frames) {
      const e = w.update(f.ms, f.idle, f.free ?? true, sleepMs);
      t += f.ms;
      if (e) events.push([Math.round(t), e]);
    }
    return { w, events };
  };
  const still = (fromIdle: number, toIdle: number, step = 100) => {
    const out: Array<{ ms: number; idle: number }> = [];
    for (let i = fromIdle; i <= toIdle; i += step) out.push({ ms: step, idle: i });
    return out;
  };

  it('starts after about 7 s without a touch, waves for 1.8 s and then rests', () => {
    expect(IDLE_WAVE.startMs).toBeGreaterThanOrEqual(6000);
    expect(IDLE_WAVE.startMs).toBeLessThanOrEqual(8000);
    const { events } = run(still(0, 20_000));
    const first = events[0];
    expect(first[1]).toBe('start');
    expect(first[0]).toBeGreaterThanOrEqual(IDLE_WAVE.startMs);
    expect(first[0]).toBeLessThan(IDLE_WAVE.startMs + 300);
    expect(events[1][1]).toBe('end');
    expect(events[1][0] - first[0]).toBeGreaterThanOrEqual(IDLE_WAVE.waveMs - 100);
    expect(events[1][0] - first[0]).toBeLessThanOrEqual(IDLE_WAVE.waveMs + 150);
    // The next one comes after the rest, not at once.
    expect(events[2][1]).toBe('start');
    expect(events[2][0] - events[1][0]).toBeGreaterThanOrEqual(IDLE_WAVE.restMs - 100);
  });

  it('never before 7 s, and never when he is not standing free', () => {
    expect(run(still(0, 6900)).events).toEqual([]);
    expect(run(still(0, 20_000).map((f) => ({ ...f, free: false }))).events).toEqual([]);
  });

  it('a touch (idle time drops back) cancels it at once, and a new wave needs another 7 s', () => {
    const frames = [...still(0, 8000), { ms: 16, idle: 0 }, ...still(100, 6800)];
    const { events } = run(frames);
    expect(events.map((e) => e[1])).toEqual(['start', 'end']);
    const w = new IdleWave();
    for (const f of still(0, 8000)) w.update(f.ms, f.idle, true, Infinity);
    expect(w.active).toBe(true);
    expect(w.update(16, 0, true, Infinity)).toBe('end');
    expect(w.active).toBe(false);
  });

  it('moving, jumping or any other change that stops him standing free ends it at once', () => {
    const w = new IdleWave();
    for (const f of still(0, 8000)) w.update(f.ms, f.idle, true, Infinity);
    expect(w.active).toBe(true);
    expect(w.update(16, 8100, false, Infinity)).toBe('end');
  });

  it('never in the last 10 s before the auto-pause (150 s) would show', () => {
    const sleep = 150_000;
    const { events } = run(still(130_000, 149_000, 500), sleep);
    // Idle times 130..139.99 s may wave; from 140 s on nothing starts.
    for (const [t] of events) expect(t).toBeLessThanOrEqual(10_000 + 2000);
    const w = new IdleWave();
    expect(w.update(16, 141_000, true, sleep)).toBeNull();
    expect(w.update(16, 146_000, true, sleep)).toBeNull();
    // A wave already running when the window opens ends.
    const v = new IdleWave();
    expect(v.update(16, 139_000, true, sleep)).toBe('start');
    expect(v.update(16, 140_000, true, sleep)).toBe('end');
    // With the auto-pause off (Infinity) it just keeps waving now and then.
    expect(run(still(0, 60_000, 500)).events.filter((e) => e[1] === 'start').length).toBeGreaterThan(3);
  });

  it('the robot raises the near arm and keeps the other one in its idle pose, and the wave never moves the body', () => {
    for (const t of [0, 100, 225, 400, 900]) {
      const w = waveClip(t);
      const i = idleClip(t);
      expect(w.armN.a).toBeGreaterThan(2);
      expect(w.armN.a).toBeGreaterThan(i.armN.a + 1);
      expect(w.armF).toEqual(i.armF);
      expect(w.legN).toEqual(i.legN);
      expect(w.legF).toEqual(i.legF);
      expect(w.bob).toBe(i.bob);
    }
    // It swings from side to side.
    const spreads = [0, 110, 225, 340].map((t) => waveClip(t).armN.s);
    expect(Math.max(...spreads) - Math.min(...spreads)).toBeGreaterThan(0.3);
  });
});
