// Plays an avatar option's pick or win chime (D-038), registering its synth recipe on first use.
import { audio } from './AudioManager';
import { chimeRecipe, chimeSoundId, type ChimeDef, type ChimeKind } from './chimes';

export function playChime(option: { id: string; chime: ChimeDef }, kind: ChimeKind): void {
  const id = chimeSoundId(option.id, kind);
  if (!audio.has(id)) audio.register(id, { synth: chimeRecipe(kind, option.chime) });
  audio.play(id);
}
