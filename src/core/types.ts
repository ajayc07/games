import type Phaser from 'phaser';
import type { AvatarDef } from './avatar/config';
import type { ChimeDef } from './audio/chimes';

/** The only things game code may ask about. Touch, keyboard and gamepad all map to these. */
export type Action = 'left' | 'right' | 'jump' | 'power';

/**
 * One avatar option (a card in the picker, D-038): the robot's colours, size factor and antennae, plus
 * the option's own synthesized chimes. Cosmetic only; every option shares identical physics.
 */
export interface AvatarOptionDef extends AvatarDef {
  /** Unique id, also used in `?color=` and in storage. */
  id: string;
  /** Pitch and timbre of the option's pick and win chimes. */
  chime: ChimeDef;
}

export interface WorldDef {
  id: string;
  name: string;
  /** Level ids in play order. */
  levels: string[];
}

export interface UniverseManifest {
  id: string;
  title: string;
  /** Avatar options in picker order; the first one is the fallback. */
  options: AvatarOptionDef[];
  worlds: WorldDef[];
  unlock: { openAtATime: number };
  /** Boots the universe's first scene. */
  start(game: Phaser.Game): void;
}

/** Shape of a universe module, as loaded by the registry. */
export interface UniverseModule {
  default: UniverseManifest;
}
