// Hold to run (Task 021, D-064): on Left/Right levels a quick tap walks as before; keeping the arrow held for a moment
// makes him break into a run, a little faster with the running legs, until he lets go or turns round. Pure and tested.

export const RUN_HOLD = {
  /** The arrow must be held this long before the run starts (ms); a tap or a short hold stays a walk. */
  holdMs: 350,
  /** Then the speed eases up to full run speed over this long (ms). */
  rampMs: 250,
  /** Run speed as a multiple of the walk speed. */
  scale: 1.45,
  /** However many boosts add up (run on top of the car), he never goes faster than this multiple of the walk speed. */
  maxTotal: 1.6,
  /** The legs switch to the running gait above this scale and back to walking below the lower one (no flicker). */
  gaitOn: 1.2,
  gaitOff: 1.1,
} as const;

/** Speed multiplier after holding one direction for `heldMs`: 1 until `holdMs`, then up to `scale` over `rampMs`. */
export function runScale(heldMs: number): number {
  const t = Math.min(1, Math.max(0, (heldMs - RUN_HOLD.holdMs) / RUN_HOLD.rampMs));
  const eased = t * t * (3 - 2 * t);
  return 1 + (RUN_HOLD.scale - 1) * eased;
}

/** The run multiplier and other boosts (the car, `speedScale`) together, capped. */
export function totalScale(run: number, other: number): number {
  return Math.min(RUN_HOLD.maxTotal, run * other);
}

/** Tracks how long one direction has been held. Releasing or turning round starts again from a walk. */
export class RunHold {
  private dir: -1 | 0 | 1 = 0;
  private heldMs = 0;
  private running = false;

  /** Call every frame with the walking direction; returns the run multiplier for this frame. */
  update(dir: -1 | 0 | 1, dtMs: number): number {
    if (dir !== this.dir) {
      this.dir = dir;
      this.heldMs = 0;
    } else if (dir !== 0) {
      this.heldMs += Math.max(0, dtMs);
    }
    const s = runScale(this.heldMs);
    this.running = this.running ? s > RUN_HOLD.gaitOff : s >= RUN_HOLD.gaitOn;
    return s;
  }

  /** Should the legs use the running gait right now? */
  get gaitRun(): boolean {
    return this.running;
  }

  reset(): void {
    this.dir = 0;
    this.heldMs = 0;
    this.running = false;
  }
}
