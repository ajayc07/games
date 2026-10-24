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
} satisfies Record<string, SynthRecipe>;

export type DefaultSoundId = keyof typeof DEFAULT_RECIPES;
