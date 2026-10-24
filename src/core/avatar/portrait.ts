// Portrait decal (D-032): the character's face cut from its main image as a round disc with a white rim,
// for the Portrait look. Loaded once per character and size; null if there is no image, no usable crop,
// or the image cannot be decoded (the look then keeps the Ball's drawn face).
import type Phaser from 'phaser';
import type { CharacterDef } from '../types';
import { portraitPixels } from './config';
import { PART_RES } from './parts';

const cache = new Map<string, Promise<string | null>>();

export function loadPortraitTexture(scene: Phaser.Scene, character: CharacterDef, diameter: number): Promise<string | null> {
  const url = character.image;
  if (!url || !character.portrait) return Promise.resolve(null);
  const key = `av-portrait-${character.id}-${Math.round(diameter)}`;
  if (scene.textures.exists(key)) return Promise.resolve(key);
  let pending = cache.get(key);
  if (!pending) {
    const textures = scene.textures;
    const rect = character.portrait;
    pending = decode(url).then((img) => {
      if (!img) return null;
      if (textures.exists(key)) return key;
      const disc = portraitPixels(rect, img.naturalWidth, img.naturalHeight);
      if (!disc) return null;
      const size = Math.ceil(diameter * PART_RES);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const r = size / 2;
      const rim = 3 * PART_RES;
      ctx.beginPath();
      ctx.arc(r, r, r - 1, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(r, r, r - rim, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#e8f4fb';
      ctx.fillRect(0, 0, size, size);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, disc.cx - disc.r, disc.cy - disc.r, disc.r * 2, disc.r * 2, rim, rim, size - rim * 2, size - rim * 2);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(r, r, r - 1, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(28, 40, 52, 0.45)';
      ctx.lineWidth = 2 * PART_RES * 0.6;
      ctx.stroke();
      textures.addCanvas(key, canvas);
      return key;
    });
    cache.set(key, pending);
  }
  return pending;
}

async function decode(url: string): Promise<HTMLImageElement | null> {
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img.naturalWidth > 0 && img.naturalHeight > 0 ? img : null;
  } catch {
    return null;
  }
}
