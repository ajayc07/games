// Pictograms for Combo Practice (Task 011): little copies of the real buttons (same colours and icons as TouchControls),
// so a card or the map button says "these buttons together" without text.
import type Phaser from 'phaser';
import type { Action } from '../types';
import type { PracticeMode } from '../levels/practice';
import { STYLES, drawActionIcon } from '../ui/TouchControls';

/** The buttons each focus uses (shown on its card). */
export const MODE_BUTTONS: Record<PracticeMode, Action[]> = {
  'walk-shoot': ['right', 'power'],
  'jump-shoot': ['jump', 'power'],
  'walk-jump': ['right', 'jump'],
  everything: ['left', 'right', 'jump', 'power'],
};

/** Adds one mini button (base, white rim, icon) centred at (x, y) to `parent`. */
function miniButton(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, action: Action, x: number, y: number, r: number): void {
  const base = scene.add.circle(x, y, r, STYLES[action].color).setStrokeStyle(Math.max(3, r * 0.12), 0xffffff);
  const icon = scene.add.graphics().setPosition(x, y);
  drawActionIcon(icon, action, r);
  parent.add([base, icon]);
}

/** A small four-point sparkle (the "together" sign between two buttons). */
function sparkle(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, x: number, y: number, s: number): void {
  const g = scene.add.graphics().setPosition(x, y);
  g.fillStyle(0xfff59d, 1).lineStyle(Math.max(2, s * 0.12), 0xff8f00, 1);
  const pts = [
    { x: 0, y: -s },
    { x: s * 0.28, y: -s * 0.28 },
    { x: s, y: 0 },
    { x: s * 0.28, y: s * 0.28 },
    { x: 0, y: s },
    { x: -s * 0.28, y: s * 0.28 },
    { x: -s, y: 0 },
    { x: -s * 0.28, y: -s * 0.28 },
  ];
  g.fillPoints(pts as Phaser.Types.Math.Vector2Like[], true).strokePoints(pts as Phaser.Types.Math.Vector2Like[], true);
  parent.add(g);
}

/**
 * The buttons of a focus side by side with a sparkle between them, fitting `size` (width of the drawing).
 * Four buttons (everything) sit as on the screen: Left/Right on the left, Jump/Power on the right.
 */
export function addModePictogram(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, mode: PracticeMode, size: number): void {
  const buttons = MODE_BUTTONS[mode];
  if (buttons.length === 2) {
    const r = size * 0.22;
    miniButton(scene, parent, buttons[0], -size * 0.27, 0, r);
    miniButton(scene, parent, buttons[1], size * 0.27, 0, r);
    sparkle(scene, parent, 0, -r * 0.2, r * 0.42);
    return;
  }
  const r = size * 0.105;
  const xs = [-size * 0.38, -size * 0.12, size * 0.12, size * 0.38];
  buttons.forEach((a, i) => miniButton(scene, parent, a, xs[i], i === 2 ? -r * 0.35 : 0, r));
  sparkle(scene, parent, 0, -r * 1.25, r * 0.6);
}

/** The map's Practice button face: two buttons pressed together (an arrow and a star) on a round green-teal badge. */
export function addPracticeBadge(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, r: number): void {
  const base = scene.add.circle(0, 0, r, 0x00897b).setStrokeStyle(Math.max(4, r * 0.16), 0xffffff);
  parent.add(base);
  const br = r * 0.38;
  miniButton(scene, parent, 'right', -r * 0.36, r * 0.12, br);
  miniButton(scene, parent, 'power', r * 0.36, r * 0.12, br);
  sparkle(scene, parent, 0, -r * 0.42, r * 0.24);
}
