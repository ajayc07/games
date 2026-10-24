// Turns a character picture into a game texture: transparent margins trimmed, pre-scaled to its
// on-screen size (high-quality downscale instead of shimmering on the GPU). Loaded with a plain
// Image + decode() so an unsupported or broken file (e.g. AVIF on an old browser) just returns
// null, with no console errors; the caller then keeps the placeholder capsule.
import type Phaser from 'phaser';
import { TEX_RES } from './placeholders';

const cache = new Map<string, Promise<string | null>>();

/**
 * Resolves to a texture key whose visible character is `displayHeight * TEX_RES` px tall
 * (display it at scale 1 / TEX_RES), or null if the image cannot be used.
 */
export function loadCharacterTexture(
  scene: Phaser.Scene,
  id: string,
  url: string | undefined,
  displayHeight: number,
): Promise<string | null> {
  if (!url) return Promise.resolve(null);
  const key = `char-${id}-${displayHeight}`;
  if (scene.textures.exists(key)) return Promise.resolve(key);
  let pending = cache.get(key);
  if (!pending) {
    const textures = scene.textures; // shared by all scenes, outlives this one
    pending = decode(url).then((img) => {
      if (!img) return null;
      if (textures.exists(key)) return key;
      const canvas = trimAndScale(img, Math.round(displayHeight * TEX_RES));
      if (!canvas) return null;
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

function trimAndScale(img: HTMLImageElement, targetH: number): HTMLCanvasElement | null {
  try {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const src = document.createElement('canvas');
    src.width = w;
    src.height = h;
    const sctx = src.getContext('2d', { willReadFrequently: true });
    if (!sctx) return null;
    sctx.drawImage(img, 0, 0);
    const box = alphaBounds(sctx.getImageData(0, 0, w, h).data, w, h) ?? { x: 0, y: 0, w, h };

    // Step down by halves for a smooth result, then one final resize.
    let cur: HTMLCanvasElement = src;
    let cx = box.x;
    let cy = box.y;
    let cw = box.w;
    let ch = box.h;
    while (ch / 2 >= targetH) {
      const next = canvasOf(Math.max(1, Math.round(cw / 2)), Math.max(1, Math.round(ch / 2)));
      next.getContext('2d')!.drawImage(cur, cx, cy, cw, ch, 0, 0, next.width, next.height);
      cur = next;
      cx = 0;
      cy = 0;
      cw = next.width;
      ch = next.height;
    }
    const out = canvasOf(Math.max(1, Math.round((cw * targetH) / ch)), targetH);
    const octx = out.getContext('2d')!;
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(cur, cx, cy, cw, ch, 0, 0, out.width, out.height);
    return out;
  } catch {
    return null;
  }
}

function canvasOf(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) ctx.imageSmoothingQuality = 'high';
  return c;
}

/** Bounding box of pixels that are not (almost) transparent. */
function alphaBounds(data: Uint8ClampedArray, w: number, h: number): { x: number; y: number; w: number; h: number } | null {
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
