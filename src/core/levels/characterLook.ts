// The pictures of one character in a level (D-023): idle (main image), run and jump poses.
// Every pose is trimmed and pre-scaled to the same visible height, so swapping never pops the size.
// Anything missing or undecodable falls back: pose -> main image -> placeholder capsule.
import type Phaser from 'phaser';
import type { CharacterDef, Facing } from '../types';
import { loadCharacterTexture } from './characterTexture';
import { TEX_RES, makeCapsuleTexture } from './placeholders';
import type { PoseName } from './poses';

export const DEFAULT_DISPLAY_HEIGHT = 104;

export interface PoseLook {
  key: string;
  /** Way the picture faces, for flipping. */
  facing: Facing;
  /** Scale that gives the configured on-screen height. */
  scale: number;
}

export class CharacterLook {
  private readonly loaded: Partial<Record<PoseName, PoseLook>> = {};
  private readonly capsule: PoseLook;
  /** Resolves when every picture has loaded or failed. */
  readonly ready: Promise<void>;

  constructor(scene: Phaser.Scene, character: CharacterDef) {
    const displayH = character.displayHeight ?? DEFAULT_DISPLAY_HEIGHT;
    const capsuleKey = makeCapsuleTexture(scene, character.color ?? 0xe53935);
    const capsuleH = scene.textures.getFrame(capsuleKey)?.height || 1;
    this.capsule = { key: capsuleKey, facing: 'right', scale: displayH / capsuleH };

    const sources: Array<[PoseName, string | undefined, Facing, number]> = [
      ['idle', character.image, 'right', displayH],
      ['run', character.poses?.run?.image, character.poses?.run?.facing ?? 'right', character.poses?.run?.displayHeight ?? displayH],
      ['jump', character.poses?.jump?.image, character.poses?.jump?.facing ?? 'right', character.poses?.jump?.displayHeight ?? displayH],
    ];
    this.ready = Promise.all(
      sources.map(async ([pose, url, facing, h]) => {
        // A pose that reuses the main image (Mario's jump) shares its texture.
        const name = url === character.image ? 'idle' : pose;
        const key = await loadCharacterTexture(scene, `${character.id}-${name}`, url, h);
        if (key) this.loaded[pose] = { key, facing, scale: 1 / TEX_RES };
      }),
    ).then(() => undefined);
  }

  /** Picture for a pose, with fallbacks. Changes once pictures finish loading. */
  get(pose: PoseName): PoseLook {
    return this.loaded[pose] ?? this.loaded.idle ?? this.capsule;
  }
}
