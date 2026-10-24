// Small code-drawn icons shared by several screens. No text anywhere (child-first UX).
import type Phaser from 'phaser';

/** Painter's palette with four colour dots: "choose your colour". `hole` = the button colour behind it. */
export function drawPalette(g: Phaser.GameObjects.Graphics, s: number, hole = 0x8e24aa): void {
  g.fillStyle(0xffffff, 1).fillEllipse(0, 0, s * 2.1, s * 1.75);
  g.fillStyle(hole, 1).fillCircle(s * 0.48, s * 0.42, s * 0.26); // thumb hole
  const dots: Array<[number, number, number]> = [
    [0xe53935, -s * 0.5, -s * 0.38],
    [0xfdd835, s * 0.08, -s * 0.52],
    [0x43a047, s * 0.6, -s * 0.18],
    [0x1e88e5, -s * 0.52, s * 0.28],
  ];
  for (const [c, x, y] of dots) g.fillStyle(c, 1).fillCircle(x, y, s * 0.24);
}

/** A palette button: purple circle with a white ring and the palette icon. Hit area 2.2 x r. */
export function makePaletteButton(scene: Phaser.Scene, r: number, onTap: () => void): Phaser.GameObjects.Container {
  const base = scene.add.circle(0, 0, r, 0x8e24aa).setStrokeStyle(10, 0xffffff);
  const g = scene.add.graphics();
  drawPalette(g, r * 0.55);
  const c = scene.add.container(0, 0, [base, g]).setSize(r * 2.2, r * 2.2).setData('r', r);
  c.setInteractive({ useHandCursor: true }).on('pointerdown', onTap);
  return c;
}

/** Five-point star outline points (for star slots and badges). */
export function starPath(r: number): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.48;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push({ x: rr * Math.cos(a), y: rr * Math.sin(a) + r * 0.08 });
  }
  return pts;
}
