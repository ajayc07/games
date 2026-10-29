// Code-drawn stickers (Task 031, D-074): a round colour badge with a white picture. No text. Used by the sticker screen,
// the pop-up when one is earned and the map's sticker button.
import type Phaser from 'phaser';
import { starPath } from '../ui/icons';
import type { StickerDef } from './stickers';

type G = Phaser.GameObjects.Graphics;

/** Draws one sticker centred on (0, 0) with radius `r`. */
export function drawSticker(g: G, def: Pick<StickerDef, 'shape' | 'color'>, r: number): void {
  g.fillStyle(0x000000, 0.16).fillCircle(r * 0.05, r * 0.1, r);
  g.fillStyle(def.color, 1).fillCircle(0, 0, r);
  g.fillStyle(0xffffff, 0.28).fillEllipse(0, -r * 0.5, r * 1.3, r * 0.6);
  g.lineStyle(Math.max(3, r * 0.1), 0xffffff, 1).strokeCircle(0, 0, r * 0.95);
  const s = r * 0.56;
  g.fillStyle(0xffffff, 1);
  const poly = (pts: Array<[number, number]>) => g.fillPoints(pts.map(([x, y]) => ({ x: x * s, y: y * s })), true);
  switch (def.shape) {
    case 'star':
      g.fillPoints(starPath(s * 1.25), true);
      break;
    case 'heart':
      g.fillCircle(-s * 0.42, -s * 0.2, s * 0.52).fillCircle(s * 0.42, -s * 0.2, s * 0.52);
      poly([[-0.92, -0.02], [0.92, -0.02], [0, 1]]);
      break;
    case 'rocket':
      g.fillEllipse(0, -s * 0.05, s * 0.8, s * 1.7);
      poly([[-0.4, 0.3], [-0.95, 0.95], [-0.3, 0.75]]);
      poly([[0.4, 0.3], [0.95, 0.95], [0.3, 0.75]]);
      g.fillStyle(def.color, 1).fillCircle(0, -s * 0.2, s * 0.2);
      break;
    case 'moon':
      g.fillCircle(0, 0, s * 0.95);
      g.fillStyle(def.color, 1).fillCircle(s * 0.5, -s * 0.2, s * 0.8);
      break;
    case 'sun':
      g.fillCircle(0, 0, s * 0.55);
      g.lineStyle(s * 0.2, 0xffffff, 1);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        g.lineBetween(Math.cos(a) * s * 0.78, Math.sin(a) * s * 0.78, Math.cos(a) * s * 1.1, Math.sin(a) * s * 1.1);
      }
      break;
    case 'flower':
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        g.fillCircle(Math.cos(a) * s * 0.58, Math.sin(a) * s * 0.58, s * 0.4);
      }
      g.fillStyle(0xffd54f, 1).fillCircle(0, 0, s * 0.34);
      break;
    case 'car':
      g.fillRoundedRect(-s * 1.05, -s * 0.1, s * 2.1, s * 0.75, s * 0.2);
      g.fillRoundedRect(-s * 0.6, -s * 0.62, s * 1.2, s * 0.6, s * 0.2);
      g.fillStyle(def.color, 1).fillRect(-s * 0.4, -s * 0.5, s * 0.8, s * 0.32);
      g.fillStyle(0x37474f, 1).fillCircle(-s * 0.55, s * 0.68, s * 0.3).fillCircle(s * 0.55, s * 0.68, s * 0.3);
      break;
    case 'robot':
      g.fillRoundedRect(-s * 0.8, -s * 0.5, s * 1.6, s * 1.25, s * 0.25);
      g.fillRect(-s * 0.06, -s * 0.95, s * 0.12, s * 0.45).fillCircle(0, -s * 1.0, s * 0.15);
      g.fillStyle(def.color, 1).fillCircle(-s * 0.36, -s * 0.05, s * 0.2).fillCircle(s * 0.36, -s * 0.05, s * 0.2).fillRect(-s * 0.38, s * 0.4, s * 0.76, s * 0.14);
      break;
    case 'gear':
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const c = Math.cos(a);
        const n = Math.sin(a);
        const w = s * 0.2;
        const r0 = s * 0.6;
        const r1 = s * 1.0;
        g.fillPoints([{ x: c * r0 - n * w, y: n * r0 + c * w }, { x: c * r1 - n * w, y: n * r1 + c * w }, { x: c * r1 + n * w, y: n * r1 - c * w }, { x: c * r0 + n * w, y: n * r0 - c * w }], true);
      }
      g.fillCircle(0, 0, s * 0.75);
      g.fillStyle(def.color, 1).fillCircle(0, 0, s * 0.32);
      break;
    case 'crown':
      poly([[-1, 0.65], [-1, -0.55], [-0.5, 0], [0, -0.85], [0.5, 0], [1, -0.55], [1, 0.65]]);
      g.fillStyle(def.color, 1).fillCircle(0, 0.3, s * 0.16);
      break;
    case 'rainbow': {
      const bands = [0xffffff, 0xffeb3b, 0xffffff];
      bands.forEach((c, i) => {
        g.lineStyle(s * 0.22, c, 1).beginPath().arc(0, s * 0.55, s * (1.05 - i * 0.3), Math.PI, Math.PI * 2).strokePath();
      });
      break;
    }
    case 'bolt':
      poly([[0.25, -1.05], [-0.65, 0.15], [-0.08, 0.15], [-0.3, 1.05], [0.65, -0.25], [0.06, -0.25]]);
      break;
  }
}

/** The empty slot of a sticker he has not earned yet: a soft grey disc with a dotted ring. */
export function drawEmptySlot(g: G, r: number): void {
  g.fillStyle(0x000000, 0.12).fillCircle(0, 0, r);
  g.lineStyle(Math.max(3, r * 0.08), 0xffffff, 0.55);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.fillStyle(0xffffff, 0.55).fillCircle(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82, r * 0.05);
  }
}

/** The map's sticker button face (same size as Practice and Zen): an orange badge with a sticker on it. */
export function addStickerBadge(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, r: number): void {
  const base = scene.add.circle(0, 0, r, 0xff8f00).setStrokeStyle(Math.max(4, r * 0.16), 0xffffff);
  parent.add(base);
  const g = scene.add.graphics();
  drawSticker(g, { shape: 'star', color: 0xe91e63 }, r * 0.68);
  parent.add(g);
}
