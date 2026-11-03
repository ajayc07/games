import { describe, expect, it } from 'vitest';
import { IDLE_ROUTINE, IdleRoutine, ballIdleMove, pushupPhase, pushupsMs, routineMs, stageMs, type IdleStage, type RoutineEvent } from './polish';
import { idleClip, pushupClip, tauntClip, type RobotPose } from './clips';
import { solveRig } from './robotRig';
import { viewOf } from './clips';
import { DEFAULT_RECIPES, recipeDuration } from '../audio/recipes';

/** Runs the routine on a still, untouched player: idle time grows with the clock. Returns the events with their times. */
function simulate(totalMs: number, opts: { free?: (t: number) => boolean; sleepMs?: number; touchAt?: number[]; step?: number } = {}) {
  const r = new IdleRoutine();
  const step = opts.step ?? 16;
  const events: Array<{ t: number; e: Exclude<RoutineEvent, null> }> = [];
  const cues: Array<{ t: number; c: string }> = [];
  let idle = 0;
  const touches = [...(opts.touchAt ?? [])];
  for (let t = 0; t <= totalMs; t += step) {
    if (touches.length && t >= touches[0]) {
      touches.shift();
      idle = 0;
    } else idle += step;
    const e = r.update(step, idle, opts.free ? opts.free(t) : true, opts.sleepMs ?? Infinity);
    if (e) events.push({ t, e });
    if (r.cue) cues.push({ t, c: r.cue });
  }
  return { r, events, cues };
}

describe('idle routine state machine (Task 036)', () => {
  it('numbers: wave 1.8 s, three push-ups of 0.6 s, a 1.8 s taunt, about 6 s of motion, 5 s rest', () => {
    expect(IDLE_ROUTINE.startMs).toBe(7000);
    expect(stageMs('wave')).toBe(1800);
    expect(IDLE_ROUTINE.pushups.reps).toBe(3);
    expect(IDLE_ROUTINE.pushups.repMs).toBe(600);
    expect(stageMs('taunt')).toBe(1800);
    expect(IDLE_ROUTINE.restMs).toBe(5000);
    expect(routineMs()).toBe(1800 + pushupsMs() + 1800);
    expect(routineMs()).toBeGreaterThan(5500);
    expect(routineMs()).toBeLessThan(7500);
  });

  it('runs wave -> push-ups -> taunt -> rest -> wave again, with the right timings', () => {
    const { events } = simulate(7000 + routineMs() + IDLE_ROUTINE.restMs + 2500);
    const names = events.map((e) => e.e);
    expect(names.slice(0, 5)).toEqual(['wave', 'pushups', 'taunt', 'end', 'wave']);
    const at = (i: number) => events[i].t;
    expect(at(0)).toBeGreaterThanOrEqual(7000 - 16);
    expect(at(0)).toBeLessThan(7040);
    expect(at(1) - at(0)).toBeGreaterThanOrEqual(1800 - 20);
    expect(at(1) - at(0)).toBeLessThan(1800 + 40);
    expect(at(2) - at(1)).toBeGreaterThanOrEqual(pushupsMs() - 20);
    expect(at(2) - at(1)).toBeLessThan(pushupsMs() + 40);
    expect(at(3) - at(2)).toBeGreaterThanOrEqual(1800 - 20);
    expect(at(3) - at(2)).toBeLessThan(1800 + 40);
    expect(at(4) - at(3)).toBeGreaterThanOrEqual(IDLE_ROUTINE.restMs - 20);
    expect(at(4) - at(3)).toBeLessThan(IDLE_ROUTINE.restMs + 40);
  });

  it('plays a tap at the bottom of each of the three push-ups and one "hee-hee" in the taunt', () => {
    const { events, cues } = simulate(7000 + routineMs() + 200);
    const push = events.find((e) => e.e === 'pushups')!.t;
    const taunt = events.find((e) => e.e === 'taunt')!.t;
    const taps = cues.filter((c) => c.c === 'pushupTap');
    const hees = cues.filter((c) => c.c === 'tauntHee');
    expect(taps).toHaveLength(3);
    taps.forEach((c, i) => {
      const want = push + IDLE_ROUTINE.pushups.downMs + (i + 0.5) * IDLE_ROUTINE.pushups.repMs;
      expect(Math.abs(c.t - want)).toBeLessThan(40);
    });
    expect(hees).toHaveLength(1);
    expect(Math.abs(hees[0].t - (taunt + IDLE_ROUTINE.tauntHeeAtMs))).toBeLessThan(40);
  });

  it('never starts before 7 s or when he is not standing free', () => {
    expect(simulate(6900).events).toEqual([]);
    expect(simulate(30_000, { free: () => false }).events).toEqual([]);
  });

  it('a touch at any stage ends it at once, and the next start needs another 7 s of quiet', () => {
    const stages: Array<[IdleStage, number]> = [
      ['wave', 7000 + 800],
      ['pushups', 7000 + 1800 + 1000],
      ['taunt', 7000 + 1800 + pushupsMs() + 800],
    ];
    for (const [stage, touch] of stages) {
      const { events, r } = simulate(touch + 6500, { touchAt: [touch] });
      const end = events.find((e) => e.e === 'end')!;
      expect(end, stage).toBeDefined();
      expect(end.t - touch, stage).toBeLessThan(40);
      expect(events.some((e) => e.t > end.t), stage).toBe(false);
      expect(r.stage).toBeNull();
    }
    const later = simulate(7000 + 800 + 7400, { touchAt: [7800] });
    expect(later.events.filter((e) => e.e === 'wave')).toHaveLength(2);
  });

  it('anything that stops him standing free ends it at once, at each stage', () => {
    for (const cutAt of [7000 + 500, 7000 + 1800 + 900, 7000 + 1800 + pushupsMs() + 500]) {
      const { events } = simulate(cutAt + 400, { free: (t) => t < cutAt });
      const end = events.find((e) => e.e === 'end')!;
      expect(end.t - cutAt).toBeLessThan(40);
    }
  });

  it('never starts in the last 10 s before the auto-pause, and a running routine ends there', () => {
    const sleep = 150_000;
    const r = new IdleRoutine();
    expect(r.update(16, 139_000, true, sleep)).toBe('wave');
    expect(r.update(16, 140_000, true, sleep)).toBe('end');
    expect(new IdleRoutine().update(16, 141_000, true, sleep)).toBeNull();
    expect(new IdleRoutine().update(16, 149_000, true, sleep)).toBeNull();
    // With the auto-pause off it keeps cycling.
    expect(simulate(60_000, { step: 50 }).events.filter((e) => e.e === 'wave').length).toBeGreaterThan(3);
  });

  it('fits before the auto-pause: the first routine ends long before the no-start window opens', () => {
    expect(7000 + routineMs()).toBeLessThan(150_000 - IDLE_ROUTINE.noStartBeforeSleepMs);
  });
});

const finite = (p: RobotPose) => {
  const nums = [p.bob, p.lean, p.head];
  for (const l of [p.armN, p.armF, p.legN, p.legF]) nums.push(l.a, l.b, l.s);
  nums.push(p.legN.foot, p.legF.foot);
  return nums.every(Number.isFinite);
};

describe('idle routine clips and sounds', () => {
  it('push-up phases: standing, lowering, three reps, standing up, standing', () => {
    expect(pushupPhase(0)).toEqual({ lower: 0, rep: 0, u: 0 });
    expect(pushupPhase(IDLE_ROUTINE.pushups.downMs).lower).toBe(1);
    // Chest lowest in the middle of each rep, arms straight between reps.
    for (let i = 0; i < 3; i++) {
      const start = IDLE_ROUTINE.pushups.downMs + i * IDLE_ROUTINE.pushups.repMs;
      expect(pushupPhase(start + 1).rep).toBeLessThan(0.01);
      expect(pushupPhase(start + IDLE_ROUTINE.pushups.repMs / 2).rep).toBeGreaterThan(0.99);
    }
    expect(pushupPhase(pushupsMs()).lower).toBe(0);
    expect(pushupPhase(pushupsMs() + 500).lower).toBe(0);
  });

  it('robot push-up and taunt poses are finite, within the existing limits and start and end at the idle pose', () => {
    const times = (n: number) => Array.from({ length: 41 }, (_, i) => (n * i) / 40);
    for (const t of times(pushupsMs())) {
      const { pose, tilt } = pushupClip(t);
      expect(finite(pose), `push ${t}`).toBe(true);
      expect(Number.isFinite(tilt)).toBe(true);
      expect(tilt).toBeGreaterThanOrEqual(0);
      expect(tilt).toBeLessThan(1.5);
      for (const l of [pose.armN, pose.armF]) {
        expect(Math.abs(l.a)).toBeLessThan(3.2);
        expect(l.b).toBeGreaterThanOrEqual(0);
        expect(l.b).toBeLessThan(2.6);
      }
    }
    expect(pushupClip(0).tilt).toBe(0);
    expect(pushupClip(pushupsMs()).tilt).toBe(0);
    expect(pushupClip(IDLE_ROUTINE.pushups.downMs + 300).tilt).toBeGreaterThan(1.2);
    for (const t of times(IDLE_ROUTINE.tauntMs)) {
      const f = tauntClip(t);
      expect(finite(f.pose), `taunt ${t}`).toBe(true);
      expect(Number.isFinite(f.rock) && Number.isFinite(f.wiggle)).toBe(true);
      expect(f.wink).toBeGreaterThanOrEqual(0);
      expect(f.wink).toBeLessThanOrEqual(1);
      expect(Math.abs(f.rock)).toBeLessThan(0.15);
      for (const l of [f.pose.armN, f.pose.armF]) {
        expect(Math.abs(l.a)).toBeLessThan(3.2);
        expect(l.b).toBeGreaterThanOrEqual(0);
        expect(l.b).toBeLessThan(2.6);
      }
    }
    // At both ends the taunt is the plain idle pose and nothing sways.
    for (const t of [0, IDLE_ROUTINE.tauntMs]) {
      const f = tauntClip(t);
      expect(f.rock).toBeCloseTo(0, 6);
      expect(f.wink).toBe(0);
      expect(f.pose.armN.a).toBeCloseTo(idleClip(t).armN.a, 6);
      expect(f.pose.armN.b).toBeCloseTo(idleClip(t).armN.b, 6);
      expect(f.pose.legN.a).toBeCloseTo(idleClip(t).legN.a, 6);
    }
    // The beckon swings the forearm twice; a wink happens in the shimmy.
    const bends = times(IDLE_ROUTINE.tauntHeeAtMs).map((t) => tauntClip(t).pose.armN.b);
    expect(Math.max(...bends) - Math.min(...bends)).toBeGreaterThan(1);
    expect(Math.max(...times(IDLE_ROUTINE.tauntMs).map((t) => tauntClip(t).wink))).toBeGreaterThan(0.9);
  });

  it('the rig solves every stage frame to finite numbers at the front and side views', () => {
    for (const yaw of [0, 0.5, 0.95]) {
      const v = viewOf(yaw, 1);
      for (let t = 0; t <= pushupsMs(); t += 100) {
        const rig = solveRig({ pose: pushupClip(t).pose, air: 0, body: v, head: v, look: { x: 0, y: 0 }, antenna: 0, antennae: 2, cannon: false });
        for (const xf of [...rig.armN, ...rig.armF, ...rig.legN, ...rig.legF, rig.torso, rig.head]) {
          expect(Number.isFinite(xf.x + xf.y + xf.rot + xf.sx + xf.sy)).toBe(true);
        }
      }
    }
  });

  it('ball moves stay small and are zero at the start and end of every stage', () => {
    for (const stage of ['wave', 'pushups', 'taunt'] as IdleStage[]) {
      const end = stageMs(stage);
      for (const t of [0, end]) {
        const m = ballIdleMove(stage, t);
        expect(Math.abs(m.dx)).toBeLessThan(0.01);
        expect(Math.abs(m.lift)).toBeLessThan(0.01);
        expect(Math.abs(m.squash)).toBeLessThan(0.01);
      }
      for (let t = 0; t <= end; t += 20) {
        const m = ballIdleMove(stage, t);
        expect(Number.isFinite(m.dx + m.lift + m.squash)).toBe(true);
        expect(Math.abs(m.dx)).toBeLessThanOrEqual(IDLE_ROUTINE.ball.rockPx + 0.001);
        expect(m.lift).toBeGreaterThanOrEqual(0);
        expect(m.lift).toBeLessThanOrEqual(IDLE_ROUTINE.ball.hopPx + 0.001);
        expect(Math.abs(m.squash)).toBeLessThanOrEqual(IDLE_ROUTINE.ball.pulseSquash + IDLE_ROUTINE.ball.pulseStretch);
      }
    }
    // Rock about half a tile; three squash pulses; one hop.
    expect(IDLE_ROUTINE.ball.rockPx).toBeCloseTo(32, 0);
    const squashes = Array.from({ length: pushupsMs() / 10 }, (_, i) => ballIdleMove('pushups', i * 10).squash);
    let pulses = 0;
    for (let i = 1; i < squashes.length - 1; i++) if (squashes[i] < -0.15 && squashes[i] <= squashes[i - 1] && squashes[i] < squashes[i + 1]) pulses++;
    expect(pulses).toBe(3);
  });

  it('pushupTap and tauntHee are quiet, short tone recipes', () => {
    for (const id of ['pushupTap', 'tauntHee'] as const) {
      const r = DEFAULT_RECIPES[id];
      expect(recipeDuration(r)).toBeLessThan(0.3);
      for (const t of r.tones) expect(t.gain ?? 1).toBeLessThanOrEqual(0.3);
    }
    expect(DEFAULT_RECIPES.tauntHee.tones).toHaveLength(2);
    expect(DEFAULT_RECIPES.tauntHee.tones[1].freq).toBeGreaterThan(DEFAULT_RECIPES.tauntHee.tones[0].freq);
  });
});
