// Generates placeholder PWA icons (coloured square with a yellow star) into public/icons/.
// Zero dependencies: rasterises with 4x4 supersampling and writes PNGs with node:zlib.
// Run: npm run icons
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const BG = [0x6e, 0xc6, 0xff];
const STAR = [0xff, 0xd5, 0x4f];
const EDGE = [0xff, 0xff, 0xff];

function starPolygon(cx, cy, outer, inner) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

function inside(pts, x, y) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function render(size, { starScale, rounded }) {
  const c = size / 2;
  const outer = size * 0.42 * starScale;
  const edgeStar = starPolygon(c, c * 1.04, outer, outer * 0.45);
  const fillStar = starPolygon(c, c * 1.04, outer * 0.86, outer * 0.86 * 0.45);
  const radius = rounded ? size * 0.2 : 0;
  const S = 4;
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const fx = x + (sx + 0.5) / S;
          const fy = y + (sy + 0.5) / S;
          // rounded-square mask
          const dx = Math.max(radius - fx, fx - (size - radius), 0);
          const dy = Math.max(radius - fy, fy - (size - radius), 0);
          if (radius && dx * dx + dy * dy > radius * radius) continue;
          const col = inside(fillStar, fx, fy) ? STAR : inside(edgeStar, fx, fy) ? EDGE : BG;
          r += col[0]; g += col[1]; b += col[2]; a += 255;
        }
      }
      const n = S * S;
      const i = (y * size + x) * 4;
      const cov = a / 255;
      px[i] = cov ? r / cov : 0;
      px[i + 1] = cov ? g / cov : 0;
      px[i + 2] = cov ? b / cov : 0;
      px[i + 3] = a / n;
    }
  }
  return px;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const icons = [
  { file: 'icon-192.png', size: 192, starScale: 1, rounded: true },
  { file: 'icon-512.png', size: 512, starScale: 1, rounded: true },
  // Maskable: full-bleed background, star inside the 80% safe zone.
  { file: 'icon-maskable-512.png', size: 512, starScale: 0.72, rounded: false },
];
for (const icon of icons) {
  writeFileSync(join(outDir, icon.file), png(icon.size, render(icon.size, icon)));
  console.log('wrote', icon.file);
}
