// Power-up time bars (Task 028, D-071): a small icon and a bar that shrinks, at the top middle of the screen, one row per
// power that is on (car, magnet, boots). He cannot read a number, but he can see how much is left; the bar blinks gently
// in the last moments, like the power itself. Cosmetic only.
import Phaser from 'phaser';
import type { Layout } from '../ui/layout';

export interface BarEntry {
  key: string;
  /** Texture of the icon (the pickup orb). */
  tex: string;
  /** 1 = just started, 0 = over. */
  frac: number;
  color: number;
  alpha: number;
}

const ICON = 46;
const BAR_W = 260;
const BAR_H = 24;
const ROW = 54;

export class PowerBars {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly icons = new Map<string, Phaser.GameObjects.Image>();
  private cx = 640;
  private top = 24;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number,
  ) {
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(depth);
  }

  /** Top middle of the safe area, clear of the coin counter (left) and the Home button (right). */
  layout(l: Layout): void {
    this.cx = l.safeRect.x + l.safeRect.width / 2;
    this.top = Math.max(l.safeRect.y, l.uiRect.y) + 18;
  }

  update(entries: readonly BarEntry[]): void {
    const g = this.g;
    g.clear();
    const used = new Set<string>();
    const x0 = this.cx - (ICON + 10 + BAR_W) / 2;
    entries.forEach((e, i) => {
      used.add(e.key);
      const y = this.top + i * ROW;
      let icon = this.icons.get(e.key);
      if (!icon) {
        icon = this.scene.add.image(0, 0, e.tex).setDisplaySize(ICON, ICON).setScrollFactor(0).setDepth(this.depth + 0.1);
        this.icons.set(e.key, icon);
      }
      icon.setTexture(e.tex).setDisplaySize(ICON, ICON).setPosition(x0 + ICON / 2, y + ICON / 2).setAlpha(e.alpha).setVisible(true);
      const bx = x0 + ICON + 10;
      const by = y + (ICON - BAR_H) / 2;
      g.fillStyle(0xffffff, 0.85 * e.alpha).fillRoundedRect(bx - 4, by - 4, BAR_W + 8, BAR_H + 8, (BAR_H + 8) / 2);
      g.fillStyle(0x5d4037, 0.35 * e.alpha).fillRoundedRect(bx, by, BAR_W, BAR_H, BAR_H / 2);
      const w = Math.max(BAR_H, BAR_W * Math.max(0, Math.min(1, e.frac)));
      if (e.frac > 0) g.fillStyle(e.color, e.alpha).fillRoundedRect(bx, by, w, BAR_H, BAR_H / 2);
    });
    for (const [key, icon] of this.icons) if (!used.has(key)) icon.setVisible(false);
  }

  destroy(): void {
    this.g.destroy();
    for (const i of this.icons.values()) i.destroy();
    this.icons.clear();
  }
}
