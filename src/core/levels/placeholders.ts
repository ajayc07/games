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

/** Cave scenery strips (Task 037): hanging stalactites (tile at the top edge) and a floor row of crystal clusters (bottom-aligned). */
export const CAVE_STRIP = { stalactites: { w: 1024, h: 190 }, crystals: { w: 1024, h: 110 } } as const;
export const caveKey = (theme: LevelTheme, name: keyof typeof CAVE_STRIP) => `${theme.id}:cave-${name}`;

/**
 * The two tileable cave strips for a theme with a `cave` block (no-op otherwise, and when they exist). Each shape is drawn once
 * a strip-width to the left and right too, so the strip tiles without a seam.
 */
export function makeCaveTextures(scene: Phaser.Scene, theme: LevelTheme): void {
  const cave = theme.cave;
  if (!cave) return;
  const sKey = caveKey(theme, 'stalactites');
  if (!scene.textures.exists(sKey)) {
    const { w, h } = CAVE_STRIP.stalactites;
    // [centre fraction, half width px, length px]
    const spikes: Array<[number, number, number]> = [
      [0.04, 34, 120], [0.12, 22, 70], [0.2, 40, 160], [0.29, 26, 90], [0.37, 18, 56], [0.45, 38, 140], [0.54, 24, 84],
      [0.62, 42, 180], [0.7, 20, 62], [0.78, 32, 118], [0.86, 24, 80], [0.94, 36, 150],
    ];
    generate(scene, sKey, w, h, (g) => {
      g.fillStyle(cave.stalactite, 1).fillRect(0, 0, w, 16);
      for (const [fx, hw, len] of spikes) {
        for (const off of [-w, 0, w]) {
          const cx = fx * w + off;
          g.fillStyle(cave.stalactite, 1).fillTriangle(cx - hw, 8, cx + hw, 8, cx, len);
          // A paler sliver down one side and a bright tip catch the light.
          g.fillStyle(cave.stalactiteTip, 0.55).fillTriangle(cx - hw * 0.1, 8, cx + hw * 0.55, 8, cx, len);
          g.fillStyle(cave.stalactiteTip, 1).fillTriangle(cx - hw * 0.14, len - len * 0.16, cx + hw * 0.14, len - len * 0.16, cx, len);
        }
      }
    });
  }
  const cKey = caveKey(theme, 'crystals');
  if (!scene.textures.exists(cKey)) {
    const { w, h } = CAVE_STRIP.crystals;
    // [centre fraction, spike count, size factor]
    const clusters: Array<[number, number, number]> = [[0.08, 3, 1], [0.27, 2, 0.7], [0.46, 3, 1.1], [0.66, 2, 0.8], [0.84, 3, 0.95]];
    generate(scene, cKey, w, h, (g) => {
      clusters.forEach(([fx, n, size], ci) => {
        for (const off of [-w, 0, w]) {
          const cx = fx * w + off;
          for (let k = 0; k < n; k++) {
            const col = cave.crystals[(ci + k) % cave.crystals.length];
            const x = cx + (k - (n - 1) / 2) * 26 * size;
            const hw = (9 + (k % 2) * 3) * size;
            const top = h - (46 + ((k * 37 + ci * 19) % 40)) * size;
            // Soft glow behind, the body, a paler facet and a white glint.
            g.fillStyle(col, 0.16).fillCircle(x, h - 30, 46 * size);
            g.fillStyle(col, 1).fillPoints(
              [new Phaser.Geom.Point(x - hw, h), new Phaser.Geom.Point(x - hw, top + hw * 1.2), new Phaser.Geom.Point(x, top), new Phaser.Geom.Point(x + hw, top + hw * 1.2), new Phaser.Geom.Point(x + hw, h)],
              true,
            );
            g.fillStyle(0xffffff, 0.45).fillTriangle(x - hw * 0.15, h, x - hw * 0.15, top + hw * 1.2, x, top);
            g.fillStyle(0xffffff, 0.85).fillCircle(x - hw * 0.45, top + hw * 2, 2.2);
          }
        }
      });
    });
  }
}

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
export const POWER_ORB_KEYS = { magnet: 'orb-magnet', boots: 'orb-boots', flash: 'orb-flash' } as const;
/** The afterimage of the Flash streak: a soft yellow-white robot-shaped silhouette. */
export const FLASH_GHOST_KEY = 'fx-flash-ghost';

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
  // A yellow-white lightning bolt (Task 034).
  once(POWER_ORB_KEYS.flash, (g) => {
    const bolt = [[40, 12], [24, 38], [34, 38], [29, 60], [50, 30], [39, 30], [47, 12]];
    g.fillStyle(0xfdd835, 1).fillPoints(bolt.map(([x, y]) => new Phaser.Geom.Point(x, y)), true);
    g.lineStyle(2.5, 0xff8f00, 1).strokePoints(bolt.map(([x, y]) => new Phaser.Geom.Point(x, y)), true, true);
    g.fillStyle(0xffffff, 0.9).fillTriangle(38, 17, 31, 32, 36, 32);
  });
  if (!scene.textures.exists(FLASH_GHOST_KEY)) {
    generate(scene, FLASH_GHOST_KEY, 64, 96, (g) => {
      g.fillStyle(0xffffff, 1).fillRoundedRect(14, 36, 36, 46, 12).fillCircle(32, 24, 18).fillRoundedRect(18, 78, 10, 16, 4).fillRoundedRect(36, 78, 10, 16, 4);
    });
  }
}

/** The Bolt Bug (Task 035): a round purple-grey gadget, two big round eyes (cute-grumpy brows), a tiny bolt antenna. 72 x 80, feet at the bottom. */
export const BUG_KEYS = { body: 'bolt-bug', leg: 'bolt-bug-leg' } as const;

export function makeBugTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(BUG_KEYS.body)) {
    generate(scene, BUG_KEYS.body, 72, 80, (g) => {
      // The antenna: a short stalk and a yellow bolt on top.
      g.lineStyle(4, 0x4a3a66, 1).lineBetween(36, 22, 36, 12);
      const bolt = [[38, 0], [29, 11], [35, 11], [32, 20], [43, 8], [37, 8], [41, 0]];
      g.fillStyle(0xfdd835, 1).fillPoints(bolt.map(([x, y]) => new Phaser.Geom.Point(x, y)), true);
      g.lineStyle(2, 0x4a3a66, 1).strokePoints(bolt.map(([x, y]) => new Phaser.Geom.Point(x, y)), true, true);
      // The body: a round shell with a lighter belly.
      g.fillStyle(0x4a3a66, 1).fillCircle(36, 50, 29);
      g.fillStyle(0x7e6b9e, 1).fillCircle(36, 50, 26);
      g.fillStyle(0xb9a9d6, 1).fillEllipse(36, 58, 36, 22);
      g.fillStyle(0xffffff, 0.35).fillEllipse(24, 36, 14, 8);
      // Two big round eyes with small dark pupils, and short slanted brows (cute-grumpy, never scary).
      for (const x of [26, 46]) {
        g.fillStyle(0xffffff, 1).fillCircle(x, 47, 10.5);
        g.lineStyle(2.5, 0x4a3a66, 1).strokeCircle(x, 47, 10.5);
        g.fillStyle(0x263238, 1).fillCircle(x + (x < 36 ? 1.5 : -1.5), 49, 5);
        g.fillStyle(0xffffff, 1).fillCircle(x + (x < 36 ? 3 : 0), 47, 1.8);
      }
      g.lineStyle(3.5, 0x4a3a66, 1).lineBetween(17, 33, 31, 37).lineBetween(55, 33, 41, 37);
      // A tiny flat mouth.
      g.lineStyle(2.5, 0x4a3a66, 1).lineBetween(31, 64, 41, 64);
    });
  }
  if (!scene.textures.exists(BUG_KEYS.leg)) {
    generate(scene, BUG_KEYS.leg, 16, 12, (g) => {
      g.fillStyle(0x4a3a66, 1).fillRoundedRect(1, 1, 14, 10, 5);
    });
  }
}

/**
 * The Rock Beetle (Task 038): a rounded grey-blue rock shell with lighter plates, about 1.4 tiles wide (96 x 68, feet at the bottom,
 * facing right), a separate head that peeks out (cute-grumpy, never scary), stubby legs and four crack overlays that appear one per hit.
 */
export const BEETLE_KEYS = { body: 'rock-beetle', head: 'rock-beetle-head', leg: 'rock-beetle-leg', crack: (i: number) => `rock-beetle-crack-${i}` } as const;
const BEETLE_OUTLINE = 0x2f4252;
/** Each crack is one zig-zag line over the shell (i = 1..4); the shell shows the first `hits` of them. */
const BEETLE_CRACKS: number[][][] = [
  [[44, 10], [40, 20], [47, 26], [43, 36]],
  [[66, 24], [58, 30], [62, 38], [54, 46]],
  [[26, 22], [33, 29], [27, 36], [34, 44]],
  [[50, 40], [58, 46], [54, 54], [62, 58]],
];

export function makeBeetleTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(BEETLE_KEYS.body)) {
    generate(scene, BEETLE_KEYS.body, 96, 68, (g) => {
      // The dome: a dark outline, a grey-blue rock shell, a lighter top and a few paler plates.
      g.fillStyle(BEETLE_OUTLINE, 1).fillEllipse(48, 46, 94, 90);
      g.fillStyle(0x6f8ba3, 1).fillEllipse(48, 46, 88, 84);
      g.fillStyle(0x8da7bd, 1).fillEllipse(46, 38, 70, 56);
      g.fillStyle(0xa9c0d1, 1).fillEllipse(36, 26, 26, 14);
      g.lineStyle(2.5, 0x4d667c, 1).lineBetween(48, 6, 48, 40).lineBetween(26, 12, 20, 38).lineBetween(70, 12, 76, 38);
      // The flat belly line cuts the shell off at the ground.
      g.fillStyle(0x000000, 0).fillRect(0, 62, 96, 6);
      g.fillStyle(0x34495e, 1).fillRoundedRect(8, 58, 80, 10, 5);
    });
  }
  if (!scene.textures.exists(BEETLE_KEYS.head)) {
    // A beetle's head: two little feelers with round tips (so it reads as a beetle, not a turtle), big eyes and cute-grumpy brows.
    generate(scene, BEETLE_KEYS.head, 44, 52, (g) => {
      g.lineStyle(3, BEETLE_OUTLINE, 1).lineBetween(14, 16, 8, 5).lineBetween(30, 16, 36, 5);
      g.fillStyle(0xffd54f, 1).fillCircle(7, 4.5, 3.6).fillCircle(37, 4.5, 3.6);
      g.lineStyle(1.5, BEETLE_OUTLINE, 1).strokeCircle(7, 4.5, 3.6).strokeCircle(37, 4.5, 3.6);
      g.fillStyle(BEETLE_OUTLINE, 1).fillRoundedRect(1, 14, 42, 36, 16);
      g.fillStyle(0x7f9ab1, 1).fillRoundedRect(3, 16, 38, 32, 14);
      for (const x of [14, 31]) {
        g.fillStyle(0xffffff, 1).fillCircle(x, 32, 7.5);
        g.lineStyle(2, BEETLE_OUTLINE, 1).strokeCircle(x, 32, 7.5);
        g.fillStyle(0x263238, 1).fillCircle(x + 1.5, 33.5, 3.6);
        g.fillStyle(0xffffff, 1).fillCircle(x + 2.5, 32, 1.3);
      }
      g.lineStyle(3, BEETLE_OUTLINE, 1).lineBetween(7, 21, 18, 25).lineBetween(38, 21, 27, 25);
      g.lineStyle(2.5, BEETLE_OUTLINE, 1).lineBetween(17, 43, 28, 43);
    });
  }
  if (!scene.textures.exists(BEETLE_KEYS.leg)) {
    generate(scene, BEETLE_KEYS.leg, 20, 12, (g) => {
      g.fillStyle(BEETLE_OUTLINE, 1).fillRoundedRect(1, 1, 18, 10, 5);
    });
  }
  BEETLE_CRACKS.forEach((pts, i) => {
    const key = BEETLE_KEYS.crack(i + 1);
    if (scene.textures.exists(key)) return;
    generate(scene, key, 96, 68, (g) => {
      const line = pts.map(([x, y]) => new Phaser.Geom.Point(x, y));
      g.lineStyle(5, BEETLE_OUTLINE, 0.95).strokePoints(line, false, false);
      g.lineStyle(2, 0xdbe8f1, 0.8).strokePoints(line.map((p) => new Phaser.Geom.Point(p.x + 1.5, p.y)), false, false);
    });
  });
}

/**
 * The Glow Bat (Task 038): a small round bat with a glowing pale belly, two ears, big friendly eyes and a tiny smile (56 x 54), and one
 * wing (46 x 34, pointing left; the right wing is the same picture flipped) that flaps.
 */
export const BAT_KEYS = { body: 'glow-bat', wing: 'glow-bat-wing' } as const;
const BAT_OUTLINE = 0x2c2150;

export function makeBatTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(BAT_KEYS.body)) {
    generate(scene, BAT_KEYS.body, 56, 54, (g) => {
      for (const [x1, x2, x3] of [[11, 21, 17], [45, 35, 39]]) {
        g.fillStyle(BAT_OUTLINE, 1).fillTriangle(x1 - 1, 24, x2 + (x2 > x1 ? 1 : -1), 16, x3, 2);
        g.fillStyle(0x6a5bb0, 1).fillTriangle(x1 + (x1 < 28 ? 2 : -2), 22, x2, 17, x3, 6);
      }
      g.fillStyle(BAT_OUTLINE, 1).fillCircle(28, 31, 24);
      g.fillStyle(0x5b4b9a, 1).fillCircle(28, 31, 21.5);
      g.fillStyle(0xfff3b0, 0.95).fillEllipse(28, 40, 30, 22);
      g.fillStyle(0xffffff, 0.7).fillEllipse(28, 42, 16, 9);
      for (const x of [20, 36]) {
        g.fillStyle(0xffffff, 1).fillCircle(x, 27, 6.5);
        g.lineStyle(2, BAT_OUTLINE, 1).strokeCircle(x, 27, 6.5);
        g.fillStyle(0x263238, 1).fillCircle(x + (x < 28 ? 1.2 : -1.2), 28.5, 3.2);
        g.fillStyle(0xffffff, 1).fillCircle(x + (x < 28 ? 2.2 : -0.2), 27, 1.1);
      }
      g.lineStyle(2.5, BAT_OUTLINE, 1).lineBetween(14, 19, 24, 22).lineBetween(42, 19, 32, 22);
      g.lineStyle(2, BAT_OUTLINE, 1).lineBetween(25, 36, 31, 36);
    });
  }
  if (!scene.textures.exists(BAT_KEYS.wing)) {
    generate(scene, BAT_KEYS.wing, 46, 34, (g) => {
      const pts = [[44, 4], [30, 0], [16, 4], [2, 14], [10, 15], [8, 25], [17, 22], [18, 32], [28, 24], [44, 22]];
      const poly = pts.map(([x, y]) => new Phaser.Geom.Point(x, y));
      g.fillStyle(BAT_OUTLINE, 1).fillPoints(poly, true);
      g.fillStyle(0x6a5bb0, 1).fillPoints(poly.map((p) => new Phaser.Geom.Point(p.x * 0.9 + 4.4, p.y * 0.86 + 3)), true);
      g.lineStyle(2, 0x9486d4, 0.9).lineBetween(42, 12, 12, 16).lineBetween(42, 14, 18, 26);
    });
  }
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
