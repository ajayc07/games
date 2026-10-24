import type Phaser from 'phaser';

/** The only things game code may ask about. Touch, keyboard and gamepad all map to these. */
export type Action = 'left' | 'right' | 'jump' | 'power';

export interface CharacterDef {
  id: string;
  name: string;
  /** URL of the image, resolved by the universe from its assets/ folder. Placeholder shape if missing. */
  image?: string;
  /**
   * On-screen height of the visible character in logical px (transparent margins are trimmed first).
   * Tuned per character so the cast looks about the same size. Default 104.
   */
  displayHeight?: number;
  /** Colour of the placeholder capsule used when there is no image (or it fails to load). */
  color?: number;
  poses?: { run?: string; jump?: string };
  sounds?: { pick?: string; jump?: string; win?: string };
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
