// Polish (Task 019, D-081): the pure rules behind the landing thump and the idle wave. Cosmetic only: nothing here touches physics,
// hit boxes or scores. Tested in polish.test.ts; AvatarDriver applies them.

export const THUMP = {
  /** He must have dropped at least this many tiles from the top of the air to the ground for the thump (a jump peaks 2.5 tiles). */
  minDropTiles: 1,
} as const;

/** Does this landing get the soft thump? `dropPx` is how far he came down (highest point of the air time to the ground). */
export function landingThump(dropPx: number, tile: number): boolean {
  return dropPx >= THUMP.minDropTiles * tile;
}

export const IDLE_WAVE = {
  /** He waves after this long without a touch (ms). */
  startMs: 7000,
  /** One wave sequence: two waves (ms). */
  waveMs: 1800,
  /** After a sequence, at least this long before the next one (ms). */
  restMs: 5000,
  /** No wave in the last stretch before the auto-pause (Task 027) would show (ms). */
  noWaveBeforeSleepMs: 10_000,
  /** The ball look bounces this high (px) while "waving". */
  ballBounce: 12,
} as const;

export type WaveEvent = 'start' | 'end' | null;

// ---------- idle routine (Task 036, D-084): wave -> push-ups -> taunt -> rest ----------

export type IdleStage = 'wave' | 'pushups' | 'taunt';
export type IdleCue = 'pushupTap' | 'tauntHee';
/** The stage that begins, 'end' when the whole routine stops (finished or cancelled), or nothing. */
export type RoutineEvent = IdleStage | 'end' | null;

/** Every number of the routine in one place (cosmetic only; first guesses). Times in ms, sizes in px. */
export const IDLE_ROUTINE = {
  /** He starts after this long without a touch. */
  startMs: 7000,
  /** After the taunt, at least this long of rest before the wave starts again. */
  restMs: 5000,
  /** Nothing starts, and a running routine ends, in the last stretch before the auto-pause (Task 027). */
  noStartBeforeSleepMs: 10_000,
  /** Stage 1: the wave (two waves). */
  waveMs: 1800,
  /** Stage 2: lower to the ground, three push-ups, stand up. */
  pushups: { downMs: 300, reps: 3, repMs: 600, upMs: 300 },
  /** Stage 3: beckon twice (robot), then shimmy and wink; the "hee-hee" sounds when the shimmy (ball: the hop) starts. */
  tauntMs: 1800,
  tauntHeeAtMs: 900,
  /** The ball look: small moves on the spot, nothing moves the physics body. */
  ball: { bounce: 12, bouncePeriodMs: 450, pulseSquash: 0.2, pulseStretch: 0.06, rockPx: 32, rockPeriodMs: 450, hopPx: 30, hopMs: 600 },
} as const;

export const pushupsMs = (): number => {
  const p = IDLE_ROUTINE.pushups;
  return p.downMs + p.reps * p.repMs + p.upMs;
};

export function stageMs(stage: IdleStage): number {
  return stage === 'wave' ? IDLE_ROUTINE.waveMs : stage === 'pushups' ? pushupsMs() : IDLE_ROUTINE.tauntMs;
}

/** Length of all three stages (ms), without the rest. */
export const routineMs = (): number => stageMs('wave') + stageMs('pushups') + stageMs('taunt');

const ORDER: readonly IdleStage[] = ['wave', 'pushups', 'taunt'];
const smooth01 = (t: number) => {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  return u * u * (3 - 2 * u);
};

/**
 * The push-up timeline `t` ms into the stage: `lower` is 0 standing .. 1 down in the plank, `rep` is 0 arms straight .. 1 chest at
 * its lowest, `u` is how far through the current rep (0..1, 0 outside the reps). Shared by the robot's pose and the ball's pulses.
 */
export function pushupPhase(t: number): { lower: number; rep: number; u: number } {
  const p = IDLE_ROUTINE.pushups;
  const repsEnd = p.downMs + p.reps * p.repMs;
  if (t <= 0) return { lower: 0, rep: 0, u: 0 };
  if (t < p.downMs) return { lower: smooth01(t / p.downMs), rep: 0, u: 0 };
  if (t < repsEnd) {
    const u = ((t - p.downMs) % p.repMs) / p.repMs;
    return { lower: 1, rep: 0.5 - 0.5 * Math.cos(2 * Math.PI * u), u };
  }
  if (t < repsEnd + p.upMs) return { lower: 1 - smooth01((t - repsEnd) / p.upMs), rep: 0, u: 0 };
  return { lower: 0, rep: 0, u: 0 };
}

/** The ball's small visual move for a stage `t` ms in: sideways rock, lift and squash (+ is taller). Zero at both ends of every stage. */
export function ballIdleMove(stage: IdleStage, t: number): { dx: number; lift: number; squash: number } {
  const B = IDLE_ROUTINE.ball;
  if (t < 0 || t > stageMs(stage)) return { dx: 0, lift: 0, squash: 0 };
  if (stage === 'wave') return { dx: 0, lift: B.bounce * Math.abs(Math.sin((Math.PI * t) / B.bouncePeriodMs)), squash: 0 };
  if (stage === 'pushups') {
    const ph = pushupPhase(t);
    const inReps = ph.lower === 1;
    return { dx: 0, lift: 0, squash: inReps ? -B.pulseSquash * ph.rep - B.pulseStretch * Math.sin(2 * Math.PI * ph.u) : 0 };
  }
  // Taunt: two quick rocks left and right, then one happy hop where the "hee-hee" sounds.
  const hopAt = IDLE_ROUTINE.tauntHeeAtMs;
  if (t < hopAt) return { dx: B.rockPx * Math.sin((2 * Math.PI * t) / B.rockPeriodMs), lift: 0, squash: 0 };
  const h = (t - hopAt) / B.hopMs;
  return { dx: 0, lift: h < 1 ? B.hopPx * Math.sin(Math.PI * h) : 0, squash: 0 };
}

/**
 * The idle routine: after `startMs` without a touch, while he stands free on the ground, he runs wave -> push-ups -> taunt, rests
 * `restMs`, and starts again at the wave. A touch (idle time drops back) or anything that stops him standing free ends it at once;
 * a new start then needs another `startMs` of quiet. Never starts, and ends, in the last `noStartBeforeSleepMs` before the auto-pause.
 */
export class IdleRoutine {
  private current: IdleStage | null = null;
  private t = 0;
  private rest = 0;
  private lastIdle = 0;
  private lastCue: IdleCue | null = null;

  get stage(): IdleStage | null {
    return this.current;
  }

  get active(): boolean {
    return this.current !== null;
  }

  /** Milliseconds into the current stage. */
  get stageTime(): number {
    return this.t;
  }

  /** The sound cue that fell due in the last `update` (a tap at the bottom of each push-up, the "hee-hee"), or null. */
  get cue(): IdleCue | null {
    return this.lastCue;
  }

  /**
   * One frame. `idleMs` is the time since the last touch, `free` says he stands still on the ground with nothing else going on,
   * `sleepMs` is the auto-pause time (Infinity when it is off).
   */
  update(dtMs: number, idleMs: number, free: boolean, sleepMs: number): RoutineEvent {
    const dt = Math.max(0, dtMs);
    this.lastCue = null;
    const touched = idleMs < this.lastIdle;
    this.lastIdle = idleMs;
    const blocked = idleMs >= sleepMs - IDLE_ROUTINE.noStartBeforeSleepMs;
    if (this.current) {
      if (!free || touched || blocked) {
        this.current = null;
        this.rest = touched || !free ? 0 : IDLE_ROUTINE.restMs;
        return 'end';
      }
      const before = this.t;
      this.t += dt;
      this.cueBetween(this.current, before, this.t);
      if (this.t >= stageMs(this.current)) {
        const next = ORDER[ORDER.indexOf(this.current) + 1];
        if (next) {
          this.current = next;
          this.t = 0;
          return next;
        }
        this.current = null;
        this.rest = IDLE_ROUTINE.restMs;
        return 'end';
      }
      return null;
    }
    this.rest = Math.max(0, this.rest - dt);
    if (free && !touched && !blocked && this.rest <= 0 && idleMs >= IDLE_ROUTINE.startMs) {
      this.current = 'wave';
      this.t = 0;
      return 'wave';
    }
    return null;
  }

  private cueBetween(stage: IdleStage, from: number, to: number): void {
    if (stage === 'pushups') {
      const p = IDLE_ROUTINE.pushups;
      for (let i = 0; i < p.reps; i++) {
        const at = p.downMs + (i + 0.5) * p.repMs; // the bottom of rep i
        if (from < at && at <= to) this.lastCue = 'pushupTap';
      }
    } else if (stage === 'taunt') {
      const at = IDLE_ROUTINE.tauntHeeAtMs;
      if (from < at && at <= to) this.lastCue = 'tauntHee';
    }
  }

  reset(): void {
    this.current = null;
    this.t = 0;
    this.rest = 0;
    this.lastIdle = 0;
    this.lastCue = null;
  }
}

/**
 * The first idle wave (Task 019), kept because its rules are still tested; the game now uses `IdleRoutine` (Task 036), whose
 * first stage is this same wave. The idle wave: after `startMs` without a touch, while he stands free on the ground, he waves for `waveMs`, rests, and may wave
 * again. A touch (idle time drops back) or anything that stops him standing free (he moves, jumps, wins, becomes a car...) ends
 * it at once. Never in the last `noWaveBeforeSleepMs` before the auto-pause.
 */
export class IdleWave {
  private waving = false;
  private waveT = 0;
  private rest = 0;
  private lastIdle = 0;

  get active(): boolean {
    return this.waving;
  }

  /**
   * One frame. `idleMs` is the time since the last touch, `free` says he is standing still on the ground with nothing else going
   * on, `sleepMs` is the auto-pause time (Infinity when it is off). Returns 'start' or 'end' when the wave begins or stops.
   */
  update(dtMs: number, idleMs: number, free: boolean, sleepMs: number): WaveEvent {
    const touched = idleMs < this.lastIdle;
    this.lastIdle = idleMs;
    if (this.waving) {
      this.waveT += Math.max(0, dtMs);
      if (!free || touched || this.waveT >= IDLE_WAVE.waveMs || idleMs >= sleepMs - IDLE_WAVE.noWaveBeforeSleepMs) {
        this.waving = false;
        this.rest = touched || !free ? 0 : IDLE_WAVE.restMs;
        return 'end';
      }
      return null;
    }
    this.rest = Math.max(0, this.rest - Math.max(0, dtMs));
    if (free && !touched && this.rest <= 0 && idleMs >= IDLE_WAVE.startMs && idleMs < sleepMs - IDLE_WAVE.noWaveBeforeSleepMs) {
      this.waving = true;
      this.waveT = 0;
      return 'start';
    }
    return null;
  }

  /** How far through the wave sequence (0..1), for the looks. */
  get progress(): number {
    return Math.min(1, this.waveT / IDLE_WAVE.waveMs);
  }

  reset(): void {
    this.waving = false;
    this.waveT = 0;
    this.rest = 0;
    this.lastIdle = 0;
  }
}
