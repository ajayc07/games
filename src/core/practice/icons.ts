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

/** The map's Zen button face (Task 020): a lying figure-eight (the endless sign) on a round violet badge, with a sparkle. */
export function addZenBadge(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, r: number): void {
  const base = scene.add.circle(0, 0, r, 0x7e57c2).setStrokeStyle(Math.max(4, r * 0.16), 0xffffff);
  parent.add(base);
  const g = scene.add.graphics();
  g.lineStyle(Math.max(5, r * 0.15), 0xffffff, 1);
  const a = r * 0.62;
  const pts: Phaser.Types.Math.Vector2Like[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    const d = 1 + Math.sin(t) ** 2;
    pts.push({ x: (a * Math.cos(t)) / d, y: r * 0.06 + (a * Math.sin(t) * Math.cos(t)) / d });
  }
  g.strokePoints(pts, true);
  parent.add(g);
  sparkle(scene, parent, r * 0.0, -r * 0.5, r * 0.2);
}

/** The map's Zen button when today's zen time is used up (Task 033): a sleepy night badge with a crescent moon and two stars. */
export function addRestBadge(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, r: number): void {
  const base = scene.add.circle(0, 0, r, 0x3949ab).setStrokeStyle(Math.max(4, r * 0.16), 0xffffff);
  parent.add(base);
  const moon = scene.add.circle(-r * 0.06, 0, r * 0.52, 0xfff59d);
  const bite = scene.add.circle(r * 0.2, -r * 0.14, r * 0.45, 0x3949ab);
  const s1 = scene.add.star(r * 0.45, -r * 0.4, 5, r * 0.05, r * 0.14, 0xffffff);
  const s2 = scene.add.star(r * 0.52, r * 0.2, 5, r * 0.04, r * 0.1, 0xffffff);
  parent.add([moon, bite, s1, s2]);
}

