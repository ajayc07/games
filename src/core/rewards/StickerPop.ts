// The pop-up when a sticker is earned (Task 031): it bounces in at the middle of the screen with a burst of stars and a happy
// sound, wiggles for a moment and floats away. It never blocks a tap. Cosmetic only.
import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { drawSticker } from './stickerArt';
import { stickerById } from './stickers';

export const POP_MS = { in: 450, hold: 1500, out: 450 };

export function showStickerPop(scene: Phaser.Scene, id: string, depth: number, x: number, y: number, size = 120): void {
  const def = stickerById(id);
  if (!def) return;
  const g = scene.add.graphics();
  drawSticker(g, def, size);
  const root = scene.add.container(x, y, [g]).setScrollFactor(0).setDepth(depth).setScale(0).setAlpha(1);
  audio.play('stickerGet');
  // A burst of little stars.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const star = scene.add.star(x, y, 5, 6, 14, i % 2 ? 0xffeb3b : 0xffffff).setScrollFactor(0).setDepth(depth - 0.1).setScale(0.2);
    scene.tweens.add({ targets: star, x: x + Math.cos(a) * size * 1.6, y: y + Math.sin(a) * size * 1.4, scale: 1, alpha: 0, angle: 180, duration: 700, ease: 'Quad.easeOut', onComplete: () => star.destroy() });
  }
  scene.tweens.add({ targets: root, scale: 1, duration: POP_MS.in, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: root, angle: { from: -8, to: 8 }, duration: 260, yoyo: true, repeat: 5, delay: POP_MS.in, ease: 'Sine.easeInOut' });
  scene.tweens.add({
    targets: root,
    y: y - size * 0.9,
    alpha: 0,
    scale: 0.6,
    duration: POP_MS.out,
    delay: POP_MS.in + POP_MS.hold,
    ease: 'Quad.easeIn',
    onComplete: () => root.destroy(),
  });
}
