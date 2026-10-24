// Generated placeholder textures for levels: simple shapes in the theme's colours.
// Drawn at TEX_RES pixels per logical unit so they stay crisp on high-DPI screens; display them
// with setDisplaySize / tileScale = 1 / TEX_RES.
import Phaser from 'phaser';
import type { LevelTheme, ThemeTexture } from './theme';

export const TEX_RES = 2;

/** Logical size of each theme texture (tile-sized ones use the level's tileSize). */
export function themeTextureSize(name: ThemeTexture, tile: number): { w: number; h: number } {
  switch (name) {
    case 'ground-top':
    case 'ground-fill':
      return { w: tile, h: tile };
    case 'coin':
      return { w: 40, h: 40 };
    case 'flag-pole':
      return { w: 20, h: tile * 4 + 12 };
    case 'flag-cloth':
      return { w: 84, h: 60 };
    case 'hills-far':
      return { w: 1024, h: 300 };
    case 'hills-near':
      return { w: 768, h: 190 };
    case 'cloud':
      return { w: 170, h: 84 };
  }
}

export const themeKey = (theme: LevelTheme, name: ThemeTexture) => `${theme.id}:${name}`;

/** Creates every theme texture that is not already loaded from a file. */
export function makeThemeTextures(scene: Phaser.Scene, theme: LevelTheme, tile: number): void {
  const draw = (name: ThemeTexture, paint: (g: Phaser.GameObjects.Graphics, w: number, h: number) => void) => {
    const key = themeKey(theme, name);
    if (scene.textures.exists(key)) return;
    const { w, h } = themeTextureSize(name, tile);
    generate(scene, key, w, h, paint);
  };

  const { ground, coin, flag, hills } = theme;
  const dots = (g: Phaser.GameObjects.Graphics, w: number, top: number, h: number) => {
    g.fillStyle(ground.dirtDots, 1);
    const spots: Array<[number, number, number]> = [
      [0.2, 0.35, 0.06],
      [0.68, 0.22, 0.05],
      [0.45, 0.62, 0.07],
      [0.85, 0.78, 0.05],
      [0.12, 0.85, 0.04],
    ];
    for (const [fx, fy, fr] of spots) g.fillCircle(fx * w, top + fy * (h - top), fr * w);
  };

  draw('ground-fill', (g, w, h) => {
    g.fillStyle(ground.dirt, 1).fillRect(0, 0, w, h);
    dots(g, w, 0, h);
  });

  draw('ground-top', (g, w, h) => {
    g.fillStyle(ground.dirt, 1).fillRect(0, 0, w, h);
    dots(g, w, h * 0.3, h);
    const band = h * 0.26;
    g.fillStyle(ground.grassDark, 1).fillRect(0, 0, w, band + 6);
    // Scalloped edge: 4 bumps per tile so neighbouring tiles join seamlessly.
    for (let i = 0; i < 4; i++) g.fillCircle((i + 0.5) * (w / 4), band + 4, w / 8);
    g.fillStyle(ground.grass, 1).fillRect(0, 0, w, band);
    for (let i = 0; i < 4; i++) g.fillCircle((i + 0.5) * (w / 4), band - 2, w / 8 - 2);
  });

  draw('coin', (g, w, h) => {
    const r = Math.min(w, h) / 2;
    g.fillStyle(coin.edge, 1).fillCircle(w / 2, h / 2, r);
    g.fillStyle(coin.fill, 1).fillCircle(w / 2, h / 2, r * 0.8);
    g.fillStyle(coin.edge, 1).fillRoundedRect(w / 2 - r * 0.12, h / 2 - r * 0.45, r * 0.24, r * 0.9, r * 0.1);
    g.fillStyle(coin.shine, 0.9).fillCircle(w / 2 - r * 0.38, h / 2 - r * 0.38, r * 0.16);
  });

  draw('flag-pole', (g, w, h) => {
    g.fillStyle(flag.pole, 1).fillRoundedRect(w / 2 - 4, w / 2, 8, h - w / 2, 3);
    g.fillStyle(flag.knob, 1).fillCircle(w / 2, w / 2, w / 2);
  });

  draw('flag-cloth', (g, w, h) => {
    g.fillStyle(flag.cloth, 1).fillTriangle(0, 0, w, h / 2, 0, h);
    g.fillStyle(0xffffff, 1).fillCircle(w * 0.3, h / 2, h * 0.16);
  });

  const hillStrip = (color: number, shade: number, bumps: Array<[number, number, number]>) =>
    (g: Phaser.GameObjects.Graphics, w: number, h: number) => {
      // Each bump is drawn again one strip-width left and right so the strip tiles seamlessly.
      for (const [fx, fr, fh] of bumps) {
        for (const off of [-w, 0, w]) {
          const cx = fx * w + off;
          g.fillStyle(color, 1).fillEllipse(cx, h, fr * w * 2, fh * h * 2);
          g.fillStyle(shade, 1).fillEllipse(cx - fr * w * 0.35, h - fh * h * 0.55, fr * w * 0.5, fh * h * 0.25);
        }
      }
      g.fillStyle(color, 1).fillRect(0, h - 8, w, 8);
    };

  draw('hills-far', hillStrip(hills.far, hills.farShade, [
    [0.12, 0.2, 0.75],
    [0.45, 0.26, 0.95],
    [0.8, 0.18, 0.65],
  ]));
  draw('hills-near', hillStrip(hills.near, hills.nearShade, [
    [0.2, 0.16, 0.8],
    [0.62, 0.22, 0.95],
    [0.95, 0.1, 0.55],
  ]));

  draw('cloud', (g, w, h) => {
    g.fillStyle(theme.cloud, 1);
    g.fillCircle(w * 0.3, h * 0.62, h * 0.32);
    g.fillCircle(w * 0.5, h * 0.42, h * 0.4);
    g.fillCircle(w * 0.72, h * 0.6, h * 0.32);
    g.fillRoundedRect(w * 0.12, h * 0.55, w * 0.76, h * 0.42, h * 0.2);
  });
}

/** Small shared effect textures (theme independent). */
export function makeEffectTextures(scene: Phaser.Scene): void {
  const once = (key: string, w: number, h: number, paint: (g: Phaser.GameObjects.Graphics, w: number, h: number) => void) => {
    if (!scene.textures.exists(key)) generate(scene, key, w, h, paint);
  };
  once('fx-dust', 24, 24, (g, w) => g.fillStyle(0xffffff, 1).fillCircle(w / 2, w / 2, w / 2));
  once('fx-confetti', 10, 14, (g, w, h) => g.fillStyle(0xffffff, 1).fillRect(0, 0, w, h));
  once('fx-sparkle', 28, 28, (g, w) => {
    const c = w / 2;
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(c, 0, c + 4, c, c - 4, c);
    g.fillTriangle(c, w, c + 4, c, c - 4, c);
    g.fillTriangle(0, c, c, c - 4, c, c + 4);
    g.fillTriangle(w, c, c, c - 4, c, c + 4);
  });
}

/** A friendly capsule with eyes: the character when there is no picture. */
export function makeCapsuleTexture(scene: Phaser.Scene, color: number): string {
  const key = `char-capsule-${color.toString(16)}`;
  if (scene.textures.exists(key)) return key;
  generate(scene, key, 56, 100, (g, w, h) => {
    g.fillStyle(0xffffff, 1).fillRoundedRect(0, 0, w, h, w / 2);
    g.fillStyle(color, 1).fillRoundedRect(3, 3, w - 6, h - 6, w / 2 - 3);
    g.fillStyle(0xffffff, 1).fillCircle(w * 0.5, h * 0.3, 8).fillCircle(w * 0.8, h * 0.3, 8);
    g.fillStyle(0x222222, 1).fillCircle(w * 0.55, h * 0.3, 4).fillCircle(w * 0.85, h * 0.3, 4);
  });
  return key;
}

function generate(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  paint: (g: Phaser.GameObjects.Graphics, w: number, h: number) => void,
): void {
  const g = scene.make.graphics({}, false);
  g.setScale(TEX_RES);
  paint(g, w, h);
  g.generateTexture(key, Math.ceil(w * TEX_RES), Math.ceil(h * TEX_RES));
  g.destroy();
}
