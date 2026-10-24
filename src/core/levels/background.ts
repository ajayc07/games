// Parallax background from generated shapes: sky gradient, drifting clouds, two layers of hills.
// Everything is fixed to the screen (scrollFactor 0) and scrolled by hand from the camera position,
// so it fills any logical width (960..1920) without depending on the level length.
import Phaser from 'phaser';
import type { Layout } from '../ui/layout';
import { themeKey } from './placeholders';
import type { LevelTheme } from './theme';

const CLOUDS: Array<{ x: number; y: number; scale: number; factor: number }> = [
  { x: 120, y: 90, scale: 1, factor: 0.08 },
  { x: 520, y: 170, scale: 0.7, factor: 0.05 },
  { x: 860, y: 70, scale: 0.85, factor: 0.07 },
  { x: 1250, y: 150, scale: 1.1, factor: 0.1 },
  { x: 1650, y: 95, scale: 0.75, factor: 0.06 },
  { x: 2050, y: 180, scale: 0.9, factor: 0.09 },
];
const CLOUD_SPAN = 2400; // clouds wrap around over this width
const DRIFT = 6; // px/s, so the sky is alive even when the player stands still

export class ParallaxBackground {
  private readonly sky: Phaser.GameObjects.Graphics;
  private readonly far: Phaser.GameObjects.TileSprite;
  private readonly near: Phaser.GameObjects.TileSprite;
  private readonly clouds: Phaser.GameObjects.Image[] = [];
  private width = 0;
  private drift = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly theme: LevelTheme,
    /** Screen y of the ground surface, where the hills stand. */
    private readonly horizonY: number,
  ) {
    this.sky = scene.add.graphics().setScrollFactor(0).setDepth(-100);
    for (const c of CLOUDS) {
      const img = scene.add.image(0, c.y, themeKey(theme, 'cloud')).setScrollFactor(0).setDepth(-95).setAlpha(0.95);
      img.setDisplaySize(170 * c.scale, 84 * c.scale);
      this.clouds.push(img);
    }
    this.far = this.strip('hills-far', -90, 300);
    this.near = this.strip('hills-near', -80, 190);
  }

  layout(l: Layout): void {
    this.width = l.width;
    const { top, bottom } = this.theme.sky;
    this.sky.clear();
    this.sky.fillGradientStyle(top, top, bottom, bottom, 1);
    this.sky.fillRect(0, 0, l.width, l.height);
    for (const s of [this.far, this.near]) s.setSize(l.width, s.height);
  }

  /** Call every frame with the camera's horizontal scroll (logical px). */
  update(scrollX: number, dtSec: number): void {
    this.drift += dtSec * DRIFT;
    this.far.tilePositionX = (scrollX * 0.2) / this.far.tileScaleX;
    this.near.tilePositionX = (scrollX * 0.45) / this.near.tileScaleX;
    CLOUDS.forEach((c, i) => {
      const span = Math.max(CLOUD_SPAN, this.width + 400);
      const x = (((c.x - scrollX * c.factor - this.drift) % span) + span) % span;
      this.clouds[i].x = x - 200;
    });
  }

  private strip(name: 'hills-far' | 'hills-near', depth: number, logicalH: number): Phaser.GameObjects.TileSprite {
    const key = themeKey(this.theme, name);
    const frame = this.scene.textures.getFrame(key);
    const k = logicalH / frame.height;
    const s = this.scene.add.tileSprite(0, this.horizonY + 12, 100, logicalH, key);
    // Sample a few texels below the strip's top edge: with tiling, the solid bottom row would
    // otherwise bleed onto the top edge as a faint line. The bottom edge is hidden behind the ground.
    s.tilePositionY = 4;
    return s.setOrigin(0, 1).setTileScale(k, k).setScrollFactor(0).setDepth(depth);
  }
}
