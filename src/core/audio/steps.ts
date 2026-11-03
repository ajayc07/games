// Footsteps and the landing thump (Task 019, D-081): small tone recipes in the same style as the other placeholder sounds.
// Several pitch variants per kind so a walk never sounds mechanical; the scene picks one at random for each stride (never the same
// twice in a row). Pure and tested; the wiring is in LevelScene.ts and AvatarDriver.ts.
import type { SynthRecipe } from './recipes';

export type StepKind = 'walk' | 'run';

export const STEP = {
  /** Pitch multipliers of the variants: walk taps are a little lower and softer-attacked, run taps lighter and quicker. */
  walkPitch: [0.92, 1, 1.07, 1.14],
  runPitch: [0.94, 1, 1.09],
  /** Base pitch (Hz) and peak gain of the tap; every step is quiet (the Volume setting scales it all). */
  walkHz: 170,
  runHz: 240,
  walkGain: 0.22,
  runGain: 0.13,
  /** At most one step sound this often (ms), so a fast run is a patter and never a buzz. */
  minGapMs: 100,
} as const;

/** The sound id of a step variant, e.g. `step-walk-2`. */
export const stepSoundId = (kind: StepKind, variant: number): string => `step-${kind}-${variant}`;

export const stepVariants = (kind: StepKind): number => (kind === 'walk' ? STEP.walkPitch.length : STEP.runPitch.length);

/** A short soft tap: a quick falling sine with a faint click on top. */
export function stepRecipe(kind: StepKind, variant: number): SynthRecipe {
  const pitches = kind === 'walk' ? STEP.walkPitch : STEP.runPitch;
  const k = pitches[Math.max(0, Math.min(pitches.length - 1, variant))];
  const hz = (kind === 'walk' ? STEP.walkHz : STEP.runHz) * k;
  const gain = kind === 'walk' ? STEP.walkGain : STEP.runGain;
  const dur = kind === 'walk' ? 0.06 : 0.04;
  return {
    tones: [
      { freq: hz, to: hz * 0.6, dur, type: 'sine', gain },
      { freq: hz * 5, to: hz * 3, dur: 0.012, type: 'triangle', gain: gain * 0.3 },
    ],
  };
}

/** Which variant to play: from a random number 0..1, never the same as `last` (so two taps in a row always differ). */
export function pickStepVariant(kind: StepKind, rand: number, last: number): number {
  const n = stepVariants(kind);
  let v = Math.min(n - 1, Math.max(0, Math.floor(rand * n)));
  if (v === last) v = (v + 1) % n;
  return v;
}

/** The soft landing thump: a low sine that falls, a quiet body and a tiny tick. Lower and rounder than a step. */
export const LAND_THUMP: SynthRecipe = {
  tones: [
    { freq: 120, to: 55, dur: 0.14, type: 'sine', gain: 0.45 },
    { freq: 240, to: 110, dur: 0.07, type: 'triangle', gain: 0.12 },
  ],
};

export const LAND_THUMP_ID = 'landThump';
