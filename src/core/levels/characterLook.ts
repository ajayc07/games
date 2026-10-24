// The pictures of one character in a level (D-023): idle (main image), run and jump poses, plus an
// optional run-cycle flipbook (`poses.runFrames`, Task 004b).
// Every picture is trimmed and pre-scaled to its visible height, so swapping never pops the size.
// Anything missing or undecodable falls back: pose -> main image -> placeholder capsule; a run frame
// that fails is skipped, and with fewer than 2 usable frames there is no flipbook.
import type Phaser from 'phaser';
import type { CharacterDef, Facing } from '../types';
import { ANIM } from './animation';
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
  private frames: readonly PoseLook[] = [];
  /** Flipbook frames per second at normal run speed. */
  readonly runFps: number;
  /** Resolves when every picture has loaded or failed. */
  readonly ready: Promise<void>;

  constructor(scene: Phaser.Scene, character: CharacterDef) {
    const displayH = character.displayHeight ?? DEFAULT_DISPLAY_HEIGHT;
    const capsuleKey = makeCapsuleTexture(scene, character.color ?? 0xe53935);
    const capsuleH = scene.textures.getFrame(capsuleKey)?.height || 1;
    this.capsule = { key: capsuleKey, facing: 'right', scale: displayH / capsuleH };
    const poses = character.poses;
    this.runFps = poses?.runFps && poses.runFps > 0 ? poses.runFps : ANIM.flipbook.fps;

    const sources: Array<[PoseName, string | undefined, Facing, number]> = [
      ['idle', character.image, 'right', displayH],
      ['run', poses?.run?.image, poses?.run?.facing ?? 'right', poses?.run?.displayHeight ?? displayH],
      ['jump', poses?.jump?.image, poses?.jump?.facing ?? 'right', poses?.jump?.displayHeight ?? displayH],
    ];
    const posesReady = sources.map(async ([pose, url, facing, h]) => {
      // A pose that reuses the main image (Mario's jump) shares its texture.
      const name = url === character.image ? 'idle' : pose;
      const key = await loadCharacterTexture(scene, `${character.id}-${name}`, url, h);
      if (key) this.loaded[pose] = { key, facing, scale: 1 / TEX_RES };
    });

    // Run frames: default height = the run pose's, so the flipbook matches the single run picture.
    const frameDefs = poses?.runFrames ?? [];
    const frameH = poses?.run?.displayHeight ?? displayH;
    const framesReady = Promise.all(
      frameDefs.map(async (f, i) => {
        const key = await loadCharacterTexture(scene, `${character.id}-runframe-${i}`, f.image, f.displayHeight ?? frameH);
        return key ? { key, facing: f.facing ?? 'right', scale: 1 / TEX_RES } : null;
      }),
    ).then((list) => {
      const usable = list.filter((f): f is PoseLook => f !== null);
      this.frames = usable.length >= 2 ? usable : [];
    });

    this.ready = Promise.all([...posesReady, framesReady]).then(() => undefined);
  }

  /** Picture for a pose, with fallbacks. Changes once pictures finish loading. */
  get(pose: PoseName): PoseLook {
    return this.loaded[pose] ?? this.loaded.idle ?? this.capsule;
  }

  /** Usable run-cycle frames in order (empty = no flipbook, use the run pose). */
  get runFrames(): readonly PoseLook[] {
    return this.frames;
  }
}
