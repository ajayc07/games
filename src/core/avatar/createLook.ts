// Builds the chosen look for a character (D-032, D-037). Adding a body: implement AvatarLook, add its name
// to LOOK_NAMES (config.ts) and a case here.
import type Phaser from 'phaser';
import type { CharacterDef } from '../types';
import { BallLook } from './BallLook';
import { RobotLook } from './RobotLook';
import { parseLook, type LookName } from './config';
import type { AvatarLook } from './types';

export function createLook(scene: Phaser.Scene, name: LookName, character: CharacterDef, x: number, feet: number): AvatarLook {
  switch (name) {
    case 'ball':
      return new BallLook(scene, character, x, feet);
    case 'robot':
    default:
      return new RobotLook(scene, character, x, feet);
  }
}

let warned = false;

/** The look chosen with `?look=` (default robot). An unknown value (e.g. the removed sprite) warns once per session. */
export function lookFromUrl(): LookName {
  const { look, warning } = parseLook(typeof location === 'undefined' ? '' : location.search);
  if (warning && !warned) {
    warned = true;
    console.warn(warning);
  }
  return look;
}
