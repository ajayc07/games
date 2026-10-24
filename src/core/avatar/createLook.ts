// Builds the chosen look for a character (D-032). Adding a body: implement AvatarLook, add its name to
// LOOK_NAMES (config.ts) and a case here.
import type Phaser from 'phaser';
import type { CharacterDef } from '../types';
import type { CharacterLook } from '../levels/characterLook';
import { BallLook } from './BallLook';
import { RobotLook } from './RobotLook';
import { SpriteLook } from './SpriteLook';
import { parseLook, type LookName } from './config';
import type { AvatarLook } from './types';

export function createLook(
  scene: Phaser.Scene,
  name: LookName,
  character: CharacterDef,
  x: number,
  feet: number,
  pictures?: CharacterLook,
): AvatarLook {
  switch (name) {
    case 'ball':
      return new BallLook(scene, character, x, feet, false);
    case 'portrait':
      return new BallLook(scene, character, x, feet, true);
    case 'robot':
      return new RobotLook(scene, character, x, feet);
    case 'sprite':
    default:
      return new SpriteLook(scene, character, x, feet, pictures);
  }
}

let warned = false;

/** The look chosen with `?look=` (default sprite). An unknown value warns once per session. */
export function lookFromUrl(): LookName {
  const { look, warning } = parseLook(typeof location === 'undefined' ? '' : location.search);
  if (warning && !warned) {
    warned = true;
    console.warn(warning);
  }
  return look;
}
