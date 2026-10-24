// Per-option chimes (D-038): every avatar option has a short "pick" chime (card chosen) and a happier
// "win" arpeggio (flag), both built from one recipe with the option's pitch and timbre. Pure, unit-tested.
import type { SynthRecipe, Tone } from './recipes';

export const CHIME_TIMBRES = ['bell', 'soft', 'pluck', 'bright'] as const;
export type ChimeTimbre = (typeof CHIME_TIMBRES)[number];

export interface ChimeDef {
  /** Shift from the base pitch in semitones (about -6..+10 keeps it pleasant). */
  semitones: number;
  timbre: ChimeTimbre;
}

export type ChimeKind = 'pick' | 'win';

/** Base note of every chime (C5). */
export const CHIME_BASE_HZ = 523.25;
/** Allowed pitch shift; values outside are clamped so no option is shrill or muddy. */
export const CHIME_SEMITONES = { min: -7, max: 10 } as const;

/** Each timbre: its arpeggio (semitones above the root), note length, wave and overtone. */
interface TimbreSpec {
  /** Notes of the win arpeggio; the pick chime uses the first and the third entry. */
  win: number[];
  /** Time between notes (s) and note length (s); the last note rings longer. */
  step: number;
  note: number;
  tail: number;
  wave: OscillatorType;
  /** Optional quieter overtone layered on each note: frequency ratio and gain. */
  over?: { ratio: number; gain: number; wave: OscillatorType };
  /** Peak gain of the main note. */
  gain: number;
}

const TIMBRES: Record<ChimeTimbre, TimbreSpec> = {
  // A small glockenspiel: sine with an airy, slightly inharmonic overtone and a long ring.
  bell: { win: [0, 7, 12, 16, 19], step: 0.11, note: 0.22, tail: 0.6, wave: 'sine', over: { ratio: 2.76, gain: 0.2, wave: 'sine' }, gain: 0.65 },
  // Warm and round: pure sine, legato, a major arpeggio.
  soft: { win: [0, 4, 7, 12, 16], step: 0.13, note: 0.24, tail: 0.5, wave: 'sine', gain: 0.85 },
  // Bouncy: short triangle notes that hop up and back.
  pluck: { win: [0, 7, 12, 7, 12, 19], step: 0.09, note: 0.09, tail: 0.32, wave: 'triangle', over: { ratio: 2, gain: 0.18, wave: 'sine' }, gain: 0.75 },
  // Sparkly: triangle with an octave shimmer, a rising major run to the tenth.
  bright: { win: [0, 4, 7, 11, 12, 16], step: 0.08, note: 0.14, tail: 0.45, wave: 'triangle', over: { ratio: 2, gain: 0.22, wave: 'sine' }, gain: 0.62 },
};

export function chimeRootHz(def: ChimeDef): number {
  const s = Number.isFinite(def.semitones) ? def.semitones : 0;
  const st = Math.min(CHIME_SEMITONES.max, Math.max(CHIME_SEMITONES.min, s));
  return CHIME_BASE_HZ * 2 ** (st / 12);
}

function timbreOf(def: ChimeDef): TimbreSpec {
  return TIMBRES[def.timbre] ?? TIMBRES.soft;
}

const MAX_OVERTONE_HZ = 4500;
const ratio = (semis: number) => 2 ** (semis / 12);

function note(t: TimbreSpec, freq: number, at: number, dur: number, gain = 1, glideTo?: number): Tone[] {
  const main: Tone = { freq, at, dur, type: t.wave, gain: t.gain * gain };
  if (glideTo) main.to = glideTo;
  const out = [main];
  // Overtones above about 4.5 kHz are left out: they would only sound shrill.
  if (t.over && freq * t.over.ratio <= MAX_OVERTONE_HZ) out.push({ freq: freq * t.over.ratio, at, dur: dur * 0.7, type: t.over.wave, gain: t.over.gain * gain });
  return out;
}

/** The option's chime of `kind`. Same recipe for every option; pitch and timbre make each one its own. */
export function chimeRecipe(kind: ChimeKind, def: ChimeDef): SynthRecipe {
  const t = timbreOf(def);
  const root = chimeRootHz(def);
  if (kind === 'pick') {
    // Short, bright, rising: a quick lift into a held upper note.
    const hi = root * ratio(t.win[2]);
    return {
      tones: [
        ...note(t, root, 0, t.step + 0.02, 0.6, root * ratio(t.win[1])),
        ...note(t, hi, t.step, Math.min(0.26, Math.max(0.16, t.note + 0.06))),
      ],
    };
  }
  const tones: Tone[] = [];
  t.win.forEach((semis, i) => {
    const last = i === t.win.length - 1;
    tones.push(...note(t, root * ratio(semis), i * t.step, last ? t.tail : t.note, last ? 1 : 0.85));
  });
  return { tones };
}

/** Sound id of an option's chime, as registered with the AudioManager. */
export function chimeSoundId(optionId: string, kind: ChimeKind): string {
  return `chime:${optionId}:${kind}`;
}

/**
 * Peak of the summed tone gains at any moment (each tone counted at its peak while it plays). The
 * AudioManager multiplies this by 0.3, so 1.6 here stays well under clipping before the compressor.
 */
export function peakGain(r: SynthRecipe): number {
  const edges = r.tones.flatMap((t) => [t.at ?? 0]);
  let peak = 0;
  for (const at of edges) {
    const sum = r.tones
      .filter((t) => (t.at ?? 0) <= at && (t.at ?? 0) + t.dur > at)
      .reduce((s, t) => s + (t.gain ?? 1), 0);
    peak = Math.max(peak, sum);
  }
  return peak;
}
