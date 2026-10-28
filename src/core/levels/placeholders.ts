// Generated placeholder textures for levels: simple shapes in the theme's colours.
// Drawn at TEX_RES pixels per logical unit so they stay crisp on high-DPI screens; display them
// with setDisplaySize / tileScale = 1 / TEX_RES.
import Phaser from 'phaser';
import { CAR } from './car';
import { GOAL, bulbSize, columnSize } from './goal';
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
    case 'goal-pad':
      return { w: tile * GOAL.padTiles.w, h: Math.ceil(tile * GOAL.padTiles.h) + 4 };
    case 'goal-ring':
      return { w: tile * 2.2, h: 24 };
    case 'goal-post':
      return columnSize(tile);
    case 'goal-beacon': {
      const d = bulbSize(tile);
      return { w: d, h: d };
    }
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

  const { ground, coin, goal, hills } = theme;
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
    // Robot hex-nut emblem (like the chest hexagon): a hexagon with a round hole.
    const hex = Array.from({ length: 6 }, (_, i) => new Phaser.Geom.Point(w / 2 + Math.cos((i * Math.PI) / 3) * r * 0.5, h / 2 + Math.sin((i * Math.PI) / 3) * r * 0.5));
    g.fillStyle(coin.edge, 1).fillPoints(hex, true);
    g.fillStyle(coin.fill, 1).fillCircle(w / 2, h / 2, r * 0.2);
    g.fillStyle(coin.shine, 0.9).fillCircle(w / 2 - r * 0.38, h / 2 - r * 0.38, r * 0.16);
  });

  draw('goal-pad', (g, w, h) => {
    // Chunky slab: a dark rim all round, a lighter top face inset, rivets along the dark front strip.
    g.fillStyle(goal.rim, 1).fillRoundedRect(0, 0, w, h, h / 2);
    const topH = h * 0.58;
    g.fillStyle(goal.top, 1).fillRoundedRect(6, 4, w - 12, topH, topH / 2);
    g.fillStyle(0xffffff, 0.45).fillRoundedRect(w * 0.12, 7, w * 0.3, 4, 2);
    g.fillStyle(goal.top, 0.85);
    for (let i = 0; i < 7; i++) g.fillCircle(w * (0.14 + i * 0.12), h - 6, 2.2);
  });

  draw('goal-ring', (g, w, h) => {
    g.lineStyle(7, goal.glow, 0.55).strokeEllipse(w / 2, h / 2, w - 8, h - 6);
    g.lineStyle(3.5, goal.ring, 1).strokeEllipse(w / 2, h / 2, w - 8, h - 6);
  });

  // The charger column: a short thick rounded cylinder with a light stripe, grooves and a hex-nut emblem (no thin pole).
  draw('goal-post', (g, w, h) => {
    g.fillStyle(goal.rim, 1).fillRoundedRect(0, 0, w, h, 9);
    g.fillStyle(goal.post, 1).fillRoundedRect(3.5, 3.5, w - 7, h - 7, 6);
    g.fillStyle(0xffffff, 0.8).fillRoundedRect(7, 8, w * 0.17, h - 16, 3);
    // A cyan charge band under the top, a dark groove near the foot, and the emblem between.
    g.fillStyle(goal.rim, 1).fillRect(3.5, h * 0.14, w - 7, h * 0.14 + 4);
    g.fillStyle(goal.ring, 1).fillRect(3.5, h * 0.14 + 2, w - 7, h * 0.14);
    g.fillStyle(goal.rim, 0.4).fillRect(3.5, h * 0.84, w - 7, 3);
    const cx = w / 2 + 2;
    const cy = h * 0.58;
    const r = w * 0.24;
    const hex = Array.from({ length: 6 }, (_, i) => new Phaser.Geom.Point(cx + Math.cos((i * Math.PI) / 3) * r, cy + Math.sin((i * Math.PI) / 3) * r));
    g.fillStyle(goal.rim, 1).fillPoints(hex, true);
    g.fillStyle(goal.post, 1).fillCircle(cx, cy, r * 0.4);
  });

  draw('goal-beacon', (g, w) => {
    g.fillStyle(goal.beaconRim, 1).fillCircle(w / 2, w / 2, w / 2);
    g.fillStyle(goal.beacon, 1).fillCircle(w / 2, w / 2, w / 2 - 4.5);
    g.fillStyle(0xffffff, 0.9).fillCircle(w * 0.36, w * 0.34, w * 0.1);
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
  // Soft ground shadow: stacked ellipses, faint at the rim and darker in the middle.
  once('fx-shadow', 64, 16, (g, w, h) => {
    for (let i = 0; i < 6; i++) {
      const k = 1 - i * 0.15;
      g.fillStyle(0x000000, 0.22).fillEllipse(w / 2, h / 2, w * k, h * k);
    }
  });
  // Speed streak: a thin rounded line.
  once('fx-streak', 30, 4, (g, w, h) => g.fillStyle(0xffffff, 1).fillRoundedRect(0, 0, w, h, h / 2));
  // Soft vertical beam: stacked rounded bars, faint at the edge and brighter in the middle.
  once('fx-beam', 64, 192, (g, w, h) => {
    for (let i = 0; i < 5; i++) {
      const inset = (i / 5) * (w / 2 - 4);
      g.fillStyle(0xffffff, 0.16).fillRoundedRect(inset, 0, w - inset * 2, h, 10);
    }
  });
  // Idle light column of the goal pad: soft bands, brightest at the bottom, fading to nothing at the top.
  once('fx-lightcol', 64, 256, (g, w, h) => {
    const rows = 128;
    for (let r = 0; r < rows; r++) {
      const a = ((r + 1) / rows) ** 1.1; // brightest at the bottom
      for (let i = 0; i < 4; i++) {
        const inset = (i / 4) * (w / 2 - 2);
        g.fillStyle(0xffffff, a * 0.45).fillRect(inset, r * (h / rows), w - inset * 2, h / rows);
      }
    }
  });
  // Soft round glow (night headlamp and fireflies, Task 016): stacked circles, brightest in the middle. Tinted and blended by the scene.
  once('fx-glow', 128, 128, (g, w) => {
    const c = w / 2;
    const steps = 32;
    for (let i = 0; i < steps; i++) {
      const k = i / steps;
      g.fillStyle(0xffffff, 0.045).fillCircle(c, c, c * (1 - k));
    }
  });
  once('fx-bolt', 20, 28, (g) => {
    g.fillStyle(0xffffff, 1).fillTriangle(12, 0, 2, 16, 11, 16).fillTriangle(8, 12, 18, 12, 6, 28);
  });
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

/** Step block and bounce pad textures (Task 015): fixed bright toy colours with dark rims, readable on every world. */
export const OBSTACLE_TEX = { block: 'obs-block', pad: 'obs-pad', padSpring: 'obs-pad-spring' } as const;

export function makeObstacleTextures(scene: Phaser.Scene, tile: number, padW: number, padH: number): void {
  const once = (key: string, w: number, h: number, paint: (g: Phaser.GameObjects.Graphics, w: number, h: number) => void) => {
    if (!scene.textures.exists(key)) generate(scene, key, w, h, paint);
  };
  // A toy block: warm orange, bevelled, a dark rim and a pale star-ish stud in the middle.
  once(`${OBSTACLE_TEX.block}-${tile}`, tile, tile, (g, w, h) => {
    g.fillStyle(0x7a3300, 1).fillRoundedRect(0, 0, w, h, 8);
    g.fillStyle(0xff9f1c, 1).fillRoundedRect(3, 3, w - 6, h - 6, 6);
    g.fillStyle(0xffc857, 1).fillRoundedRect(6, 6, w - 12, (h - 12) * 0.42, 5);
    g.fillStyle(0xe67e00, 1).fillRoundedRect(6, h * 0.62, w - 12, h * 0.3, 5);
    g.fillStyle(0xfff3c4, 1).fillCircle(w / 2, h / 2, w * 0.16);
    g.lineStyle(2, 0x7a3300, 1).strokeCircle(w / 2, h / 2, w * 0.16);
  });
  // The pad plate: magenta with pale stripes and a dark rim.
  once(`${OBSTACLE_TEX.pad}-${tile}`, padW, padH, (g, w, h) => {
    g.fillStyle(0x6d1239, 1).fillRoundedRect(0, 0, w, h, h / 2.2);
    g.fillStyle(0xff4d94, 1).fillRoundedRect(2, 2, w - 4, h - 4, h / 2.6);
    g.fillStyle(0xffffff, 0.85);
    for (let x = w * 0.16; x < w * 0.86; x += w * 0.2) g.fillRoundedRect(x, h * 0.3, w * 0.09, h * 0.4, 2);
  });
  // The spring under the plate: a dark coil with bright gaps, drawn as a stack of short bars.
  once(`${OBSTACLE_TEX.padSpring}-${tile}`, padW * 0.5, 14, (g, w, h) => {
    g.fillStyle(0x3b3b4f, 1).fillRect(0, 0, w, h);
    g.fillStyle(0xb8c0d8, 1);
    for (let y = 2; y < h - 2; y += 5) g.fillRect(2, y, w - 4, 2);
  });
}

/** Car textures (Task 017): the body in the robot's colours with its head in the window, a wheel, and the pickup orb. */
export function carTextureKeys(accent: number, joint: number) {
  return { body: `car-body-${accent}-${joint}`, wheel: 'car-wheel', orb: 'car-orb' };
}

export function makeCarTextures(scene: Phaser.Scene, accent: number, joint: number): void {
  const k = carTextureKeys(accent, joint);
  const once = (key: string, w: number, h: number, paint: (g: Phaser.GameObjects.Graphics, w: number, h: number) => void) => {
    if (!scene.textures.exists(key)) generate(scene, key, w, h, paint);
  };
  once(k.body, CAR.size.w, CAR.size.h, (g) => {
    // Lower body and cabin, each with a dark rim.
    g.fillStyle(joint, 1).fillRoundedRect(4, 28, 104, 26, 10);
    g.fillStyle(accent, 1).fillRoundedRect(6, 30, 100, 22, 8);
    g.fillStyle(joint, 1).fillRoundedRect(28, 5, 62, 32, 11);
    g.fillStyle(accent, 1).fillRoundedRect(30, 7, 58, 28, 9);
    // Window with the robot's head looking out.
    g.fillStyle(0xcfefff, 1).fillRoundedRect(35, 11, 48, 19, 6);
    g.fillStyle(0xffffff, 1).fillRoundedRect(51, 13, 26, 16, 6);
    g.fillStyle(0x263238, 1).fillRoundedRect(56, 18, 5, 6, 2).fillRoundedRect(67, 18, 5, 6, 2);
    // A light stripe, headlight and tail light.
    g.fillStyle(0xffffff, 0.5).fillRoundedRect(12, 36, 88, 4, 2);
    g.fillStyle(0xfff176, 1).fillCircle(104, 40, 6);
    g.lineStyle(2, joint, 1).strokeCircle(104, 40, 6);
    g.fillStyle(0xff5252, 1).fillCircle(8, 40, 4);
  });
  once(k.wheel, CAR.wheel.r * 2, CAR.wheel.r * 2, (g, w) => {
    const c = w / 2;
    g.fillStyle(0x263238, 1).fillCircle(c, c, c);
    g.fillStyle(0xcfd8dc, 1).fillCircle(c, c, c * 0.55);
    g.lineStyle(3, 0x263238, 1);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      g.lineBetween(c - Math.cos(a) * c * 0.5, c - Math.sin(a) * c * 0.5, c + Math.cos(a) * c * 0.5, c + Math.sin(a) * c * 0.5);
    }
    g.fillStyle(0x263238, 1).fillCircle(c, c, c * 0.14);
  });
  // The pickup: a glowing orb with a little blue car on it.
  once(k.orb, 72, 72, (g) => {
    g.fillStyle(0x80f4ff, 0.22).fillCircle(36, 36, 36);
    g.fillStyle(0x80f4ff, 0.35).fillCircle(36, 36, 31);
    g.fillStyle(0xffffff, 0.95).fillCircle(36, 36, 26);
    g.lineStyle(3, 0x00acc1, 1).strokeCircle(36, 36, 26);
    g.fillStyle(0x1e88e5, 1).fillRoundedRect(17, 37, 38, 13, 5);
    g.fillStyle(0x1e88e5, 1).fillRoundedRect(25, 27, 22, 13, 5);
    g.fillStyle(0xcfefff, 1).fillRoundedRect(28, 30, 16, 7, 3);
    g.fillStyle(0x263238, 1).fillCircle(26, 51, 5).fillCircle(46, 51, 5);
    g.fillStyle(0xcfd8dc, 1).fillCircle(26, 51, 2).fillCircle(46, 51, 2);
  });
}

/** Pickup orbs for the magnet and the rocket boots (Task 018): the same glowing orb as the car's, with their own icon. */
export const POWER_ORB_KEYS = { magnet: 'orb-magnet', boots: 'orb-boots' } as const;

export function makePowerOrbTextures(scene: Phaser.Scene): void {
  const once = (key: string, paint: (g: Phaser.GameObjects.Graphics) => void) => {
    if (scene.textures.exists(key)) return;
    generate(scene, key, 72, 72, (g) => {
      g.fillStyle(0x80f4ff, 0.22).fillCircle(36, 36, 36);
      g.fillStyle(0x80f4ff, 0.35).fillCircle(36, 36, 31);
      g.fillStyle(0xffffff, 0.95).fillCircle(36, 36, 26);
      g.lineStyle(3, 0x00acc1, 1).strokeCircle(36, 36, 26);
      paint(g);
    });
  };
  // A red horseshoe magnet with grey tips.
  once(POWER_ORB_KEYS.magnet, (g) => {
    g.lineStyle(9, 0xe53935, 1).beginPath().arc(36, 38, 11, 0, Math.PI, false).strokePath();
    g.lineStyle(9, 0xe53935, 1).lineBetween(25, 38, 25, 26).lineBetween(47, 38, 47, 26);
    g.fillStyle(0xcfd8dc, 1).fillRect(20.5, 19, 9, 8).fillRect(42.5, 19, 9, 8);
    g.lineStyle(2, 0x263238, 1).strokeRect(20.5, 19, 9, 8).strokeRect(42.5, 19, 9, 8);
  });
  // A little rocket with a flame.
  once(POWER_ORB_KEYS.boots, (g) => {
    g.fillStyle(0xff9800, 1).fillTriangle(31, 49, 41, 49, 36, 60);
    g.fillStyle(0xe53935, 1).fillTriangle(27, 46, 33, 38, 33, 46).fillTriangle(45, 46, 39, 38, 39, 46);
    g.fillStyle(0xeceff1, 1).fillRoundedRect(30, 22, 12, 27, 5);
    g.lineStyle(2, 0x263238, 1).strokeRoundedRect(30, 22, 12, 27, 5);
    g.fillStyle(0xe53935, 1).fillTriangle(30, 24, 42, 24, 36, 12);
    g.fillStyle(0x4fc3f7, 1).fillCircle(36, 33, 3.5);
  });
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
