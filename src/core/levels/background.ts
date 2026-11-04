// Parallax background from generated shapes: sky gradient, drifting clouds, two layers of hills.
// Everything is fixed to the screen (scrollFactor 0) and scrolled by hand from the camera position,
// so it fills any logical width (960..1920) without depending on the level length.
import Phaser from 'phaser';
import type { Layout } from '../ui/layout';
import { CAVE_STRIP, caveKey, makeCaveTextures, makeEffectTextures, themeKey } from './placeholders';
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
  /** Night worlds: fixed stars (Task 016), a faint layer and a twinkling layer. */
  private readonly starsFaint: Phaser.GameObjects.Graphics | null;
  private readonly starsTwinkle: Phaser.GameObjects.Graphics | null;
  /** Twinkle factor (0.25..1) and the overall opacity used to fade a whole background in or out (Task 041). */
  private readonly twinkle = { t: 1 };
  private master = 1;
  /** Cave worlds (Task 037): stalactites hanging from the top, crystals along the floor and drifting glow-motes. */
  private readonly stalactites: Phaser.GameObjects.TileSprite | null = null;
  private readonly crystals: Phaser.GameObjects.TileSprite | null = null;
  private readonly motes: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly theme: LevelTheme,
    /** Screen y of the ground surface, where the hills stand. */
    private readonly horizonY: number,
  ) {
    this.sky = scene.add.graphics().setScrollFactor(0).setDepth(-100);
    this.starsFaint = theme.night ? scene.add.graphics().setScrollFactor(0).setDepth(-99) : null;
    this.starsTwinkle = theme.night ? scene.add.graphics().setScrollFactor(0).setDepth(-99) : null;
    if (this.starsTwinkle) scene.tweens.add({ targets: this.twinkle, t: 0.25, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    for (const c of CLOUDS) {
      const img = scene.add.image(0, c.y, themeKey(theme, 'cloud')).setScrollFactor(0).setDepth(-95).setAlpha(0.95);
      img.setDisplaySize(170 * c.scale, 84 * c.scale);
      this.clouds.push(img);
    }
    this.far = this.strip('hills-far', -90, 300);
    this.near = this.strip('hills-near', -80, 190);
    if (theme.cave) {
      makeCaveTextures(scene, theme);
      makeEffectTextures(scene);
      const sKey = caveKey(theme, 'stalactites');
      const cKey = caveKey(theme, 'crystals');
      const sk = CAVE_STRIP.stalactites.h / scene.textures.getFrame(sKey).height;
      this.stalactites = scene.add.tileSprite(0, 0, 100, CAVE_STRIP.stalactites.h, sKey).setOrigin(0, 0).setTileScale(sk, sk).setScrollFactor(0).setDepth(-92);
      const ck = CAVE_STRIP.crystals.h / scene.textures.getFrame(cKey).height;
      this.crystals = scene.add.tileSprite(0, horizonY + 12, 100, CAVE_STRIP.crystals.h, cKey).setOrigin(0, 1).setTileScale(ck, ck).setScrollFactor(0).setDepth(-78);
      for (let i = 0; i < theme.cave.motes; i++) {
        const d = 22 + (i % 4) * 9;
        const m = scene.add.image(0, 0, 'fx-glow').setScrollFactor(0).setDepth(-70).setBlendMode(Phaser.BlendModes.ADD).setTint(theme.cave.mote).setAlpha(0.3).setDisplaySize(d, d);
        this.motes.push(m);
      }
    }
  }

  layout(l: Layout): void {
    this.width = l.width;
    const { top, bottom } = this.theme.sky;
    this.sky.clear();
    this.sky.fillGradientStyle(top, top, bottom, bottom, 1);
    this.sky.fillRect(0, 0, l.width, l.height);
    for (const s of [this.far, this.near]) s.setSize(l.width, s.height);
    this.stalactites?.setSize(l.width, this.stalactites.height);
    this.crystals?.setSize(l.width, this.crystals.height);
    this.placeMotes(l);
    this.drawStars(l);
  }

  /** Cave only: a fixed scatter of glow-motes over the cavern; each then drifts up and down and pulses by its own tweens. */
  private placeMotes(l: Layout): void {
    let seed = 4242;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    this.motes.forEach((m, i) => {
      this.scene.tweens.killTweensOf(m); // a resize restarts the drift from the new spot
      m.setPosition(rnd() * l.width, 150 + rnd() * 400);
      this.scene.tweens.add({ targets: m, alpha: { from: 0.12, to: 0.42 }, duration: 1500 + (i % 5) * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 170 });
      this.scene.tweens.add({ targets: m, y: '-=46', x: `+=${i % 2 ? 24 : -24}`, duration: 5200 + (i % 4) * 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 230 });
    });
  }

  /** Night only: a fixed field of small stars in the upper half of the sky, the same for every screen size ratio. */
  private drawStars(l: Layout): void {
    const n = this.theme.night?.stars ?? 0;
    if (!this.starsFaint || !this.starsTwinkle || n === 0) return;
    this.starsFaint.clear();
    this.starsTwinkle.clear();
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < n; i++) {
      const x = rnd() * l.width;
      const y = rnd() * l.height * 0.5;
      const r = 1.2 + rnd() * 1.8;
      const g = i % 3 === 0 ? this.starsTwinkle : this.starsFaint;
      g.fillStyle(0xffffff, g === this.starsTwinkle ? 0.95 : 0.6).fillCircle(x, y, r);
    }
  }

  /** Fades the whole background (sky, stars, clouds, hills) to an opacity 0..1, for the zen day/night change (Task 041). */
  setAlpha(a: number): void {
    this.master = a;
    this.sky.setAlpha(a);
    this.starsFaint?.setAlpha(a);
    this.starsTwinkle?.setAlpha(a * this.twinkle.t);
    for (const c of this.clouds) c.setAlpha(0.95 * a);
    this.far.setAlpha(a);
    this.near.setAlpha(a);
    this.stalactites?.setAlpha(a);
    this.crystals?.setAlpha(a);
  }

  /** Removes every object and the twinkle tween. */
  destroy(): void {
    this.scene.tweens.killTweensOf(this.twinkle);
    this.sky.destroy();
    this.starsFaint?.destroy();
    this.starsTwinkle?.destroy();
    for (const c of this.clouds) c.destroy();
    this.far.destroy();
    this.near.destroy();
    this.stalactites?.destroy();
    this.crystals?.destroy();
    for (const m of this.motes) {
      this.scene.tweens.killTweensOf(m);
      m.destroy();
    }
  }

  /** Call every frame with the camera's horizontal scroll (logical px). */
  update(scrollX: number, dtSec: number): void {
    this.starsTwinkle?.setAlpha(this.master * this.twinkle.t);
    this.drift += dtSec * DRIFT;
    this.far.tilePositionX = (scrollX * 0.2) / this.far.tileScaleX;
    this.near.tilePositionX = (scrollX * 0.45) / this.near.tileScaleX;
    if (this.stalactites) this.stalactites.tilePositionX = (scrollX * 0.25) / this.stalactites.tileScaleX;
    if (this.crystals) this.crystals.tilePositionX = (scrollX * 0.7) / this.crystals.tileScaleX;
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
