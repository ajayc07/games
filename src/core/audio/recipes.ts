// Generated placeholder sounds. Soft waveforms (sine/triangle), short, never harsh.

export interface Tone {
  /** Start frequency in Hz. */
  freq: number;
  /** Optional end frequency for a glide. */
  to?: number;
  /** Start offset in seconds from the sound start. */
  at?: number;
  /** Duration in seconds. */
  dur: number;
  type?: OscillatorType;
  /** Peak gain 0..1 before the sound's own volume. */
  gain?: number;
}

export interface SynthRecipe {
  tones: Tone[];
}

export function recipeDuration(r: SynthRecipe): number {
  return Math.max(0, ...r.tones.map((t) => (t.at ?? 0) + t.dur));
}

export const DEFAULT_RECIPES = {
  tap: { tones: [{ freq: 880, dur: 0.06, type: 'sine', gain: 0.5 }] },
  jump: { tones: [{ freq: 420, to: 840, dur: 0.16, type: 'triangle' }] },
  coin: {
    tones: [
      { freq: 988, dur: 0.08, type: 'triangle' },
      { freq: 1319, at: 0.08, dur: 0.24, type: 'triangle' },
    ],
  },
  win: {
    tones: [
      { freq: 523, dur: 0.14, type: 'triangle' },
      { freq: 659, at: 0.12, dur: 0.14, type: 'triangle' },
      { freq: 784, at: 0.24, dur: 0.14, type: 'triangle' },
      { freq: 1047, at: 0.36, dur: 0.4, type: 'triangle' },
    ],
  },
  // Gentle "oops, again": two soft falling notes, quieter than the rest.
  tryAgain: {
    tones: [
      { freq: 523, dur: 0.16, type: 'sine', gain: 0.6 },
      { freq: 440, at: 0.16, dur: 0.26, type: 'sine', gain: 0.6 },
    ],
  },
  // Soft falling glide for a fall into a gap (D-019): not a failure sound.
  whoosh: {
    tones: [
      { freq: 700, to: 260, dur: 0.38, type: 'sine', gain: 0.45 },
      { freq: 1050, to: 390, at: 0.03, dur: 0.32, type: 'sine', gain: 0.18 },
    ],
  },
  // Soft "your turn" cue after the demo: two gentle rising notes.
  yourTurn: {
    tones: [
      { freq: 587, dur: 0.14, type: 'sine', gain: 0.55 },
      { freq: 880, at: 0.14, dur: 0.3, type: 'sine', gain: 0.55 },
    ],
  },
  // Locked dot or teaser on the map: a soft, low "boop-boop", never a scolding sound.
  bump: {
    tones: [
      { freq: 330, dur: 0.09, type: 'sine', gain: 0.5 },
      { freq: 294, at: 0.1, dur: 0.14, type: 'sine', gain: 0.45 },
    ],
  },
  // A dot's cloud clears on the map: a quick sparkly rise.
  unlock: {
    tones: [
      { freq: 784, dur: 0.1, type: 'triangle', gain: 0.6 },
      { freq: 988, at: 0.08, dur: 0.1, type: 'triangle', gain: 0.6 },
      { freq: 1319, at: 0.16, dur: 0.12, type: 'triangle', gain: 0.6 },
      { freq: 1568, at: 0.24, dur: 0.32, type: 'sine', gain: 0.55 },
      { freq: 2637, at: 0.26, dur: 0.22, type: 'sine', gain: 0.15 },
    ],
  },
  // Short hop of the avatar along the map path.
  hop: { tones: [{ freq: 520, to: 700, dur: 0.1, type: 'sine', gain: 0.35 }] },
  pick: {
    tones: [
      { freq: 660, dur: 0.08, type: 'sine' },
      { freq: 880, at: 0.07, dur: 0.14, type: 'sine' },
    ],
  },
  power: {
    tones: [
      { freq: 300, to: 1200, dur: 0.28, type: 'triangle' },
      { freq: 600, to: 1800, at: 0.04, dur: 0.24, type: 'sine', gain: 0.4 },
    ],
  },
  // Combo Practice (Task 011): the star row is full. A quick happy run up and a sparkly top note (not the win jingle).
  comboRow: {
    tones: [
      { freq: 784, dur: 0.09, type: 'triangle', gain: 0.55 },
      { freq: 988, at: 0.08, dur: 0.09, type: 'triangle', gain: 0.55 },
      { freq: 1175, at: 0.16, dur: 0.09, type: 'triangle', gain: 0.55 },
      { freq: 1568, at: 0.24, dur: 0.1, type: 'triangle', gain: 0.55 },
      { freq: 1175, at: 0.34, dur: 0.09, type: 'triangle', gain: 0.5 },
      { freq: 1568, at: 0.42, dur: 0.38, type: 'sine', gain: 0.55 },
      { freq: 3136, at: 0.44, dur: 0.26, type: 'sine', gain: 0.12 },
    ],
  },
} satisfies Record<string, SynthRecipe>;

export type DefaultSoundId = keyof typeof DEFAULT_RECIPES;

/** Pentatonic steps (semitones) for a run of pops, so quick pops sound like a little tune (Task 007). */
export const POP_STEPS = [0, 2, 4, 7, 9, 12] as const;

/** Sound id of the pop at pitch step `step` (clamped to POP_STEPS). */
export function popSoundId(step: number): string {
  return `pop-${Math.max(0, Math.min(POP_STEPS.length - 1, Math.round(step)))}`;
}

/**
 * A soft bubble "plip": a quick upward sine glide with a quiet overtone, under 0.2 s. `step` raises the pitch
 * along POP_STEPS (capped at the top step).
 */
export function popRecipe(step: number): SynthRecipe {
  const i = Math.max(0, Math.min(POP_STEPS.length - 1, Math.round(step)));
  const f = 520 * 2 ** (POP_STEPS[i] / 12);
  return {
    tones: [
      { freq: f * 0.75, to: f * 1.5, dur: 0.09, type: 'sine', gain: 0.55 },
      { freq: f * 1.5, to: f * 2, at: 0.05, dur: 0.11, type: 'sine', gain: 0.22 },
    ],
  };
}

/** Steps (semitones) for the combo sound: one per star in the row, so each combo in a row sounds a little higher (Task 011). */
export const COMBO_STEPS = [0, 2, 4, 7, 9] as const;

/** Sound id of the combo sound for the star at `step` (0-based, clamped to COMBO_STEPS). */
export function comboSoundId(step: number): string {
  return `combo-${Math.max(0, Math.min(COMBO_STEPS.length - 1, Math.round(step)))}`;
}

/** A happy rising two-note "ta-da" (a fourth up), under 0.3 s; `step` raises both notes along COMBO_STEPS. */
export function comboRecipe(step: number): SynthRecipe {
  const i = Math.max(0, Math.min(COMBO_STEPS.length - 1, Math.round(step)));
  const f = 660 * 2 ** (COMBO_STEPS[i] / 12);
  return {
    tones: [
      { freq: f, dur: 0.09, type: 'triangle', gain: 0.55 },
      { freq: f * 1.335, at: 0.08, dur: 0.18, type: 'triangle', gain: 0.55 },
      { freq: f * 2.67, at: 0.09, dur: 0.14, type: 'sine', gain: 0.12 },
    ],
  };
}
