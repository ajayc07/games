// Avatar options (D-038): the universe's colour cards. Validation and lookup; pure, unit-tested, no Phaser.
import type { AvatarOptionDef } from '../types';
import { CHIME_SEMITONES, CHIME_TIMBRES } from '../audio/chimes';
import { SCALE_RANGE } from './robotSpec';

/** Readable problems with a universe's option list (empty = fine). */
export function validateOptions(options: readonly AvatarOptionDef[]): string[] {
  const errors: string[] = [];
  if (options.length === 0) errors.push('no avatar options');
  const seen = new Set<string>();
  options.forEach((o, i) => {
    const where = `option ${i + 1} (${o.id || '?'})`;
    if (!/^[a-z][a-z0-9-]*$/.test(o.id)) errors.push(`${where}: id must be lower-case letters, digits or "-"`);
    if (seen.has(o.id)) errors.push(`${where}: duplicate id`);
    seen.add(o.id);
    if (o.scale !== undefined && (o.scale < SCALE_RANGE.min || o.scale > SCALE_RANGE.max)) {
      errors.push(`${where}: scale ${o.scale} is outside ${SCALE_RANGE.min}..${SCALE_RANGE.max} (it would be clamped)`);
    }
    if (o.antennae !== undefined && ![0, 1, 2].includes(o.antennae)) errors.push(`${where}: antennae must be 0, 1 or 2`);
    if (!(CHIME_TIMBRES as readonly string[]).includes(o.chime?.timbre)) errors.push(`${where}: unknown chime timbre`);
    const st = o.chime?.semitones;
    if (typeof st !== 'number' || st < CHIME_SEMITONES.min || st > CHIME_SEMITONES.max) {
      errors.push(`${where}: chime semitones must be ${CHIME_SEMITONES.min}..${CHIME_SEMITONES.max}`);
    }
  });
  return errors;
}

/** The option with `id`, or undefined. */
export function findOption<T extends { id: string }>(options: readonly T[], id: string | null | undefined): T | undefined {
  return id ? options.find((o) => o.id === id) : undefined;
}

/**
 * Reads `?color=<id>`. `requested` is false without the parameter. An unknown id falls back to the first
 * option with a warning message (for one console warning).
 */
export function colorFromSearch<T extends { id: string }>(
  search: string,
  options: readonly T[],
): { requested: boolean; option: T; warning: string | null } {
  const v = new URLSearchParams(search).get('color');
  const first = options[0];
  if (v === null || v === '') return { requested: false, option: first, warning: null };
  const found = findOption(options, v.toLowerCase());
  if (found) return { requested: true, option: found, warning: null };
  const ids = options.map((o) => o.id).join(', ');
  return { requested: true, option: first, warning: `[avatar] unknown color "${v}", using "${first.id}" (use ${ids})` };
}
