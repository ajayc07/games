import type Phaser from 'phaser';
import type { AvatarDef } from './avatar/config';

/** The only things game code may ask about. Touch, keyboard and gamepad all map to these. */
export type Action = 'left' | 'right' | 'jump' | 'power';

export interface CharacterDef {
  id: string;
  name: string;
  /**
   * URL of the character's picture, resolved by the universe from its assets/ folder. Not drawn in levels
   * (the avatar is code-built, D-037); kept for the character picker (Task 009).
   */
  image?: string;
  /** Colour of a placeholder when there is no picture (character picker). */
  color?: number;
  /** Voice clips (URLs), one picked at random per play. Characters without voices use the generic sounds. */
  sounds?: { pick?: string[]; jump?: string[]; win?: string[] };
  /** How the code-built avatar (Robot, Ball; D-032, D-033) looks for this character: palette, size factor, antennae. Cosmetic only. */
  avatar?: AvatarDef;
  /** Key of a power animation. Cosmetic only; all characters share identical physics. */
  powerAnimation: string;
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
  characters: CharacterDef[];
  defaultCharacterId: string;
  worlds: WorldDef[];
  unlock: { openAtATime: number };
  /** Boots the universe's first scene. */
  start(game: Phaser.Game): void;
}

/** Shape of a universe module, as loaded by the registry. */
export interface UniverseModule {
  default: UniverseManifest;
}
