// Builds the chosen look for an avatar option (D-032, D-037). Adding a body: implement AvatarLook, add its name
// to LOOK_NAMES (config.ts) and a case here.
import type Phaser from 'phaser';
import { BallLook } from './BallLook';
import { RobotLook } from './RobotLook';
import { parseLook, parseSize, type AvatarDef, type LookName } from './config';
import type { AvatarLook } from './types';

/** `size` = the visual size factor (default: `?size=`, see sizeFromUrl); the picker passes 1. */
export function createLook(
  scene: Phaser.Scene,
  name: LookName,
  avatar: AvatarDef | undefined,
  x: number,
  feet: number,
  size: number = sizeFromUrl(),
): AvatarLook {
  switch (name) {
    case 'ball':
      return new BallLook(scene, avatar, x, feet, size);
    case 'robot':
    default:
      return new RobotLook(scene, avatar, x, feet, size);
  }
}

let sizeWarned = false;

/** The visual size factor from `?size=` (0.8..1.6, default 1). Junk warns once per session. */
export function sizeFromUrl(): number {
  const { size, warning } = parseSize(typeof location === 'undefined' ? '' : location.search);
  if (warning && !sizeWarned) {
    sizeWarned = true;
    console.warn(warning);
  }
  return size;
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
