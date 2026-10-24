import type Phaser from 'phaser';
import type { AvatarDef, PortraitRect } from './avatar/config';

/** The only things game code may ask about. Touch, keyboard and gamepad all map to these. */
export type Action = 'left' | 'right' | 'jump' | 'power';

/** Which way a picture faces. The game flips it so it always faces the direction of travel. */
export type Facing = 'right' | 'left';

export interface PoseDef {
  /** URL of the picture; undefined (file missing) falls back to the character's main image. */
  image?: string;
  /** Default 'right'. */
  facing?: Facing;
  /** Visible height in logical px; default the character's displayHeight, so poses swap without popping. */
  displayHeight?: number;
}

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
  /**
   * Extra pictures (D-023): `run` on the ground while moving, `jump` in the air; `image` is used when idle
   * and whenever a pose is missing or fails to load. Each is trimmed and scaled to the same visible height.
   */
  poses?: {
    /**
     * Standing still on the ground (Task 005). If missing and the main image is the jump pose
     * (`jump.image` equals `image`), the `run` picture is used standing still; otherwise the main image.
     */
    idle?: PoseDef;
    run?: PoseDef;
    jump?: PoseDef;
    /**
     * Optional run cycle (Task 004b): 2 or more pictures played as a flipbook on the ground while running,
     * instead of `run`. Each is trimmed and scaled like a pose (default height: `run`'s, then the character's),
     * feet on the same ground line. Frames that fail to load are skipped; under 2 usable frames = no flipbook.
     */
    runFrames?: PoseDef[];
    /** Flipbook speed at the level's normal run speed (frames per second, default 10); scales with speed. */
    runFps?: number;
  };
  /** Voice clips (URLs), one picked at random per play. Characters without voices use the generic sounds. */
  sounds?: { pick?: string[]; jump?: string[]; win?: string[] };
  /** Code-built avatar looks (Ball, Portrait, Robot; D-032, D-033): palette, size factor, antennae. Cosmetic only. */
  avatar?: AvatarDef;
  /** Where the face is in `image`, for the Portrait look (normalised centre and radius). */
  portrait?: PortraitRect;
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
