// The Phaser side of bubbles (Task 007, D-041): translucent soft blue/white bubbles drawn in code (a highlight,
// no faces) that bob gently. A shot pops one: quick scale-up and fade, a ring and sparkles, a soft "plip" that
// rises for quick runs of pops, then its coins appear in an arc and fly to the player by themselves.
// Big bubbles are soft blockers until popped (the scene turns `walls()` into the player's soft stop).
import type Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { popSoundId } from '../audio/recipes';
import type { BubbleCell } from './grid';
import { TEX_RES } from './placeholders';
import {
  BUBBLE,
  CoinFlow,
  PopPitch,
  blockerWalls,
  bobOffset,
  bubbleSpecs,
  shotHitsBubble,
  type BubbleSpec,
  type FlyingCoin,
} from './bubbles';

interface BubbleView {
  spec: BubbleSpec;
  img: Phaser.GameObjects.Image;
  popped: boolean;
  /** Rainbow bubbles only: a soft sparkle that twinkles on the bubble about every 1.5 s. */
  twinkle?: Phaser.GameObjects.Image;
  /** Current centre (with the bob). */
  x: number;
  y: number;
}

const COIN_SIZE = 36;
const COIN_LIFT = 70;
const TWINKLE_MS = 1500;

export interface BubbleFieldOptions {
  cells: readonly BubbleCell[];
  /** The grid's solid map (small bubbles rest on the ground at the lowest). */
  solid: readonly (readonly boolean[])[];
  tile: number;
  gridTop: number;
  coinTexture: string;
  depth: { bubbles: number; coins: number };
  sparkle: Phaser.GameObjects.Particles.ParticleEmitter;
}

export class BubbleField {
  readonly flow = new CoinFlow();
  private readonly views: BubbleView[];
  private readonly coinViews = new Map<number, Phaser.GameObjects.Image>();
  private readonly pitch = new PopPitch();
  /** Pops so far (debug). */
  pops = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly opts: BubbleFieldOptions,
  ) {
    const specs = bubbleSpecs(opts.cells, opts.tile, opts.gridTop, opts.solid);
    this.views = specs.map((spec) => {
      const key = bubbleTexture(scene, spec.r, spec.kind === 'rainbow');
      const img = scene.add.image(spec.x, spec.y, key).setScale(1 / TEX_RES).setDepth(opts.depth.bubbles);
      const twinkle =
        spec.kind === 'rainbow'
          ? scene.add.image(spec.x, spec.y, 'fx-sparkle').setDepth(opts.depth.bubbles + 0.1).setAlpha(0).setBlendMode('ADD')
          : undefined;
      return { spec, img, popped: false, x: spec.x, y: spec.y, twinkle };
    });
  }

  get specs(): BubbleSpec[] {
    return this.views.map((v) => v.spec);
  }

  /** Bob the bubbles and move the flying coins toward `target` (the player's chest). */
  update(now: number, target: { x: number; y: number }): void {
    for (const v of this.views) {
      if (v.popped) continue;
      v.y = v.spec.y + bobOffset(v.spec, now);
      v.img.setY(v.y);
      if (v.twinkle) {
        // A slow sparkle: grows and fades over the first 0.45 s of every 1.5 s (offset per bubble position).
        const phase = ((now + v.spec.x * 3) % TWINKLE_MS) / TWINKLE_MS;
        const k = phase < 0.3 ? Math.sin((phase / 0.3) * Math.PI) : 0;
        v.twinkle.setPosition(v.x - v.spec.r * 0.35, v.y - v.spec.r * 0.4).setAlpha(k).setScale(0.3 + 0.9 * k).setAngle(phase * 90);
      }
    }
    for (const c of this.flow.coins) {
      const img = this.coinViews.get(c.id);
      if (!img) continue;
      const t = this.flow.progress(c, now);
      if (t <= 0) continue; // waiting in its arc (the pop-in tween runs)
      // A gentle arc up and over to the player, shrinking a little on the way.
      const e = t * t * (3 - 2 * t);
      const x = c.x + (target.x - c.x) * e;
      const y = c.y + (target.y - c.y) * e - Math.sin(Math.PI * t) * COIN_LIFT;
      img.setPosition(x, y).setDisplaySize(COIN_SIZE * (1 - 0.35 * t), COIN_SIZE * (1 - 0.35 * t));
    }
  }

  /** Pops the first unpopped bubble a shot at (x, y) with radius r touches; returns its index or -1. */
  tryHit(x: number, y: number, r: number, now: number, counted = true): number {
    const v = this.views.find((b) => !b.popped && shotHitsBubble(x, y, r, b.spec, b.x, b.y));
    if (!v) return -1;
    this.pop(v, now, counted);
    return v.spec.index;
  }

  /** Coins that arrived this frame: how many count, and whether to play the (throttled) coin sound. */
  collect(now: number): { counted: number; arrived: number } {
    const r = this.flow.collect(now);
    for (const c of r.arrived) this.landCoin(c);
    if (r.sound) audio.play('coin');
    return { counted: r.counted, arrived: r.arrived.length };
  }

  /** Lands every coin still flying (the flag is reached); returns how many of them count. */
  flushCoins(): number {
    const r = this.flow.flushAll();
    for (const c of r.arrived) this.landCoin(c);
    if (r.arrived.length > 0) audio.play('coin');
    return r.counted;
  }

  /** Soft walls from unpopped big bubbles for a body (see blockerWalls); the tightest per side. */
  walls(body: { x: number; top: number; bottom: number; halfWidth: number }): { minX: number; maxX: number } {
    let minX = -Infinity;
    let maxX = Infinity;
    for (const v of this.views) {
      if (v.popped || v.spec.kind !== 'big') continue;
      const w = blockerWalls({ x: v.spec.x, y: v.spec.y, r: v.spec.r }, body);
      if (w.maxX !== undefined) maxX = Math.min(maxX, w.maxX);
      if (w.minX !== undefined) minX = Math.max(minX, w.minX);
    }
    return { minX, maxX };
  }

  /** After the demo: popped bubbles grow back in place and the demo's coins vanish. */
  restore(): void {
    for (const c of this.flow.flushAll().arrived) this.coinViews.get(c.id)?.destroy();
    for (const img of this.coinViews.values()) img.destroy();
    this.coinViews.clear();
    for (const v of this.views) {
      if (!v.popped) continue;
      v.popped = false;
      this.scene.tweens.killTweensOf(v.img);
      v.img.setVisible(true).setAlpha(0).setScale(0.3 / TEX_RES).setPosition(v.spec.x, v.spec.y);
      this.scene.tweens.add({ targets: v.img, alpha: 1, scale: 1 / TEX_RES, duration: 420, ease: 'Back.easeOut' });
    }
    this.pops = 0;
  }

  /** For tests and debugging. */
  state(): Array<{ kind: string; x: number; y: number; r: number; popped: boolean; coins: number }> {
    return this.views.map((v) => ({ kind: v.spec.kind, x: v.x, y: v.y, r: v.spec.r, popped: v.popped, coins: v.spec.coins }));
  }

  get totalCoins(): number {
    return this.views.reduce((n, v) => n + v.spec.coins, 0);
  }

  private pop(v: BubbleView, now: number, counted: boolean): void {
    v.popped = true;
    v.twinkle?.setAlpha(0);
    this.pops++;
    const s = this.scene;
    const rainbow = v.spec.kind === 'rainbow';
    // A rainbow bubble has its own rising chime (and does not step the pop pitch).
    audio.play(rainbow ? 'rainbow' : popSoundId(this.pitch.next(now)));
    // Quick scale-up and fade.
    s.tweens.killTweensOf(v.img);
    s.tweens.add({
      targets: v.img,
      scale: 1.35 / TEX_RES,
      alpha: 0,
      duration: BUBBLE.popMs,
      ease: 'Quad.easeOut',
      onComplete: () => v.img.setVisible(false),
    });
    // A ring and a burst of sparkles.
    const ring = s.add.circle(v.x, v.y, v.spec.r).setStrokeStyle(6, 0xffffff, 0.9).setDepth(this.opts.depth.coins);
    s.tweens.add({ targets: ring, scale: 1.6, alpha: 0, duration: 360, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
    this.opts.sparkle.explode(v.spec.kind === 'big' ? 22 : rainbow ? 30 : 12, v.x, v.y);
    if (rainbow) this.rainbowRings(v);
    // The coins appear in a little arc above the bubble.
    for (const c of this.flow.pop(now, v.x, v.y - v.spec.r * 0.3, v.spec.coins, counted)) {
      const img = s.add.image(c.x, c.y, this.opts.coinTexture).setDisplaySize(4, 4).setDepth(this.opts.depth.coins);
      s.tweens.add({ targets: img, displayWidth: COIN_SIZE, displayHeight: COIN_SIZE, duration: 220, ease: 'Back.easeOut' });
      this.coinViews.set(c.id, img);
    }
  }

  /** Three soft coloured rings spreading out after the white one: the rainbow burst (Task 012). */
  private rainbowRings(v: BubbleView): void {
    RAINBOW.slice(0, 5).forEach((color, i) => {
      const ring = this.scene.add.circle(v.x, v.y, v.spec.r * (0.8 + i * 0.12)).setStrokeStyle(5, color, 0.85).setDepth(this.opts.depth.coins);
      this.scene.tweens.add({
        targets: ring,
        scale: 2.2 + i * 0.25,
        alpha: 0,
        delay: i * 60,
        duration: 520,
        ease: 'Sine.easeOut',
        onComplete: () => ring.destroy(),
      });
    });
  }

  private landCoin(c: FlyingCoin): void {
    const img = this.coinViews.get(c.id);
    if (!img) return;
    this.coinViews.delete(c.id);
    this.scene.tweens.killTweensOf(img);
    this.opts.sparkle.explode(4, img.x, img.y);
    img.destroy();
  }
}

/** Soft rainbow colours (red to violet) for the sheen and the burst. */
const RAINBOW = [0xff5252, 0xffa726, 0xffee58, 0x4caf50, 0x2196f3, 0xab47bc];

/** A translucent soft blue/white bubble of radius `r` (logical px), drawn once and cached by size. `rainbow` adds a soft rainbow sheen. */
function bubbleTexture(scene: Phaser.Scene, r: number, rainbow = false): string {
  const key = `bubble${rainbow ? '-rainbow' : ''}-${Math.round(r)}`;
  if (scene.textures.exists(key)) return key;
  const pad = 4;
  const size = Math.ceil((r + pad) * 2 * TEX_RES);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(TEX_RES, TEX_RES);
    const c = r + pad;
    // Body: clear in the middle, bluer toward the rim.
    const body = ctx.createRadialGradient(c - r * 0.25, c - r * 0.3, r * 0.1, c, c, r);
    body.addColorStop(0, 'rgba(255, 255, 255, 0.36)');
    body.addColorStop(0.6, 'rgba(179, 229, 252, 0.45)');
    body.addColorStop(0.9, 'rgba(129, 212, 250, 0.72)');
    body.addColorStop(1, 'rgba(255, 255, 255, 0.85)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.fill();
    // Rim.
    ctx.lineWidth = Math.max(2.5, r * 0.06);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.stroke();
    // A faint pink-violet sheen at the bottom right, like soap film.
    ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.strokeStyle = 'rgba(244, 143, 177, 0.45)';
    ctx.beginPath();
    ctx.arc(c, c, r * 0.86, Math.PI * 0.1, Math.PI * 0.55);
    ctx.stroke();
    if (rainbow) {
      // Thick saturated rainbow bands just inside the rim, round the whole bubble (readable at 844x390).
      ctx.lineCap = 'butt';
      RAINBOW.forEach((color, i) => {
        ctx.lineWidth = Math.max(3.5, r * 0.12);
        ctx.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(c, c, r * (0.86 - i * 0.1), Math.PI * 0.02, Math.PI * 1.98);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
    // Highlight: a curved streak and a dot at the top left.
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(3, r * 0.11);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(c, c, r * 0.68, Math.PI * 1.08, Math.PI * 1.42);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(c + r * 0.05 - r * 0.42, c - r * 0.6, Math.max(2, r * 0.07), 0, Math.PI * 2);
    ctx.fill();
  }
  scene.textures.addCanvas(key, canvas);
  return key;
}
