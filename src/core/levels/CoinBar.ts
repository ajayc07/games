// The coin progress bar (Task 030, D-073): under the coin counter, a bar that fills as he collects coins and never
// drains. When it is full he becomes Mega Robo. Cosmetic only; the rules are in mega.ts.
import Phaser from 'phaser';
import type { Layout } from '../ui/layout';

const W = 190;
const H = 22;
export const MEGA_ICON = 'icon-mega';

/** A small robot-head badge (drawn once): the picture for Mega Robo's bar. */
export function makeMegaIcon(scene: Phaser.Scene): void {
  if (scene.textures.exists(MEGA_ICON)) return;
  const S = 96;
  const tex = scene.textures.createCanvas(MEGA_ICON, S, S);
  const ctx = tex?.getContext();
  if (!tex || !ctx) return;
  const g = ctx.createRadialGradient(S / 2, S / 2, 6, S / 2, S / 2, S / 2);
  g.addColorStop(0, '#e1bee7');
  g.addColorStop(1, '#8e24aa');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  // Head, eyes, antenna.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(24, 34, 48, 36, 10);
  ctx.fill();
  ctx.fillStyle = '#6a1b9a';
  ctx.beginPath();
  ctx.arc(37, 51, 6, 0, Math.PI * 2);
  ctx.arc(59, 51, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(46, 22, 4, 12);
  ctx.beginPath();
  ctx.arc(48, 21, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffeb3b';
  ctx.fill();
  tex.refresh();
}

export class CoinBar {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly icon: Phaser.GameObjects.Image;
  private x = 20;
  private y = 120;
  private lastFrac = -1;
  private pulseUntil = 0;

  constructor(
    scene: Phaser.Scene,
    depth: number,
  ) {
    makeMegaIcon(scene);
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(depth);
    this.icon = scene.add.image(0, 0, MEGA_ICON).setDisplaySize(40, 40).setScrollFactor(0).setDepth(depth + 0.1);
  }

  /** Below the coin counter in the top-left corner (x, y = the counter's coin icon centre). */
  layout(_l: Layout, coinIconX: number, coinIconY: number): void {
    const x = coinIconX - 28 + 46;
    const y = coinIconY + 56;
    if (x === this.x && y === this.y) return;
    this.x = x;
    this.y = y;
    this.lastFrac = -1;
  }

  /** A little glow when a coin arrives. */
  pulse(now: number): void {
    this.pulseUntil = now + 250;
  }

  setVisible(v: boolean): void {
    this.g.setVisible(v);
    this.icon.setVisible(v);
  }

  update(now: number, frac: number): void {
    const hot = now < this.pulseUntil;
    const key = frac + (hot ? 2 : 0);
    if (key === this.lastFrac) return;
    this.lastFrac = key;
    const g = this.g;
    g.clear();
    const ix = this.x - 20;
    this.icon.setPosition(ix + 20, this.y);
    const bx = this.x + 24;
    const by = this.y - H / 2;
    g.fillStyle(0xffffff, 0.85).fillRoundedRect(bx - 4, by - 4, W + 8, H + 8, (H + 8) / 2);
    g.fillStyle(0x5d4037, 0.35).fillRoundedRect(bx, by, W, H, H / 2);
    if (frac > 0) g.fillStyle(hot ? 0xce93d8 : 0xab47bc, 1).fillRoundedRect(bx, by, Math.max(H, W * frac), H, H / 2);
  }

  destroy(): void {
    this.g.destroy();
    this.icon.destroy();
  }
}
