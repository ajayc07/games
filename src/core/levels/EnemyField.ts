// The Phaser side of the gentle enemies (Task 035 Bolt Bug, Task 038 Rock Beetle and Glow Bat): they patrol or fly over flat ground,
// wobble and shrink with each shot and pop into coins. They never hurt him (the rules and numbers are in bugs.ts and enemies.ts).
import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { BUG } from './bugs';
import { BAT, ENEMIES, enemyBeaten, enemyPose, enemyRadius, enemyScale, shotHitsEnemy, type EnemyKind } from './enemies';
import type { Cell } from './grid';
import { BAT_KEYS, BEETLE_KEYS, BUG_KEYS, makeBatTextures, makeBeetleTextures, makeBugTextures, TEX_RES } from './placeholders';

type Img = Phaser.GameObjects.Image;
type Pose = ReturnType<typeof enemyPose>;

interface EnemyView {
  index: number;
  kind: EnemyKind;
  /** World x of the middle of the patrol, the y of the ground under it, and (a bat) the y of its middle. */
  cx: number;
  groundY: number;
  baseY: number;
  r: number;
  phase: number;
  body: Img;
  /** Everything else that is drawn with it: legs, head, cracks, wings, glow. */
  parts: Img[];
  legs: Img[];
  head?: Img;
  cracks: Img[];
  wings: Img[];
  glow?: Img;
  hits: number;
  /** Picture size (1 = full), tweened after a hit. */
  scale: number;
  wobble: number;
  beaten: boolean;
  /** A small hop after a bump, until this time. */
  hopUntil: number;
  /** Next time a bat flaps audibly. */
  nextFlap: number;
  /** Current centre of the body (for hits and touches). */
  x: number;
  y: number;
  dir: 1 | -1;
}

export interface EnemyFieldOptions {
  cells: ReadonlyArray<Cell & { kind: EnemyKind }>;
  tile: number;
  gridTop: number;
  depth: number;
  sparkle: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Coins for a beaten enemy: they appear in an arc and fly to him (BubbleField.spawnCoins). */
  spawnCoins: (now: number, x: number, y: number, n: number) => void;
  /** An enemy was beaten (for the stickers and the stats). */
  onBeaten: (index: number, kind: EnemyKind) => void;
}

const LEG_DX = 12;
const BEETLE_LEG_DX = 26;

export class EnemyField {
  private readonly views: EnemyView[];
  /** Enemies beaten so far (debug). */
  beaten = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly opts: EnemyFieldOptions,
  ) {
    const kinds = new Set(opts.cells.map((c) => c.kind));
    if (kinds.has('bug')) makeBugTextures(scene);
    if (kinds.has('beetle')) makeBeetleTextures(scene);
    if (kinds.has('bat')) makeBatTextures(scene);
    this.views = opts.cells.map((c, index) => this.makeView(c, index));
  }

  private makeView(c: Cell & { kind: EnemyKind }, index: number): EnemyView {
    const { tile, gridTop, depth } = this.opts;
    const scene = this.scene;
    const cx = (c.col + 0.5) * tile;
    const groundY = gridTop + (c.row + (c.kind === 'bat' ? 2 : 1)) * tile;
    const baseY = gridTop + (c.row + 0.5) * tile;
    const r = enemyRadius(c.kind, tile);
    const image = (key: string, x: number, y: number, d: number, ox = 0.5, oy = 1): Img =>
      scene.add.image(x, y, key).setOrigin(ox, oy).setScale(1 / TEX_RES).setDepth(d);
    const v: EnemyView = {
      index,
      kind: c.kind,
      cx,
      groundY,
      baseY,
      r,
      phase: (index * 0.618) % 1,
      body: undefined as unknown as Img,
      parts: [],
      legs: [],
      cracks: [],
      wings: [],
      hits: 0,
      scale: 1,
      wobble: 0,
      beaten: false,
      hopUntil: -1,
      nextFlap: 0,
      x: cx,
      y: c.kind === 'bat' ? baseY : groundY - r,
      dir: 1,
    };
    if (c.kind === 'bug') {
      v.body = image(BUG_KEYS.body, cx, groundY, depth);
      v.legs = [image(BUG_KEYS.leg, cx, groundY, depth - 0.1), image(BUG_KEYS.leg, cx, groundY, depth - 0.1)];
    } else if (c.kind === 'beetle') {
      v.head = image(BEETLE_KEYS.head, cx, groundY, depth + 0.02);
      v.body = image(BEETLE_KEYS.body, cx, groundY, depth);
      v.legs = [image(BEETLE_KEYS.leg, cx, groundY, depth - 0.2), image(BEETLE_KEYS.leg, cx, groundY, depth - 0.2)];
      v.cracks = [1, 2, 3, 4].map((i) => image(BEETLE_KEYS.crack(i), cx, groundY, depth + 0.01).setAlpha(0));
    } else {
      v.glow = scene.add.image(cx, baseY, 'fx-glow').setTint(0xfff0a0).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth - 0.3).setAlpha(0.55);
      v.wings = [image(BAT_KEYS.wing, cx, baseY, depth - 0.1, 1, 0.35), image(BAT_KEYS.wing, cx, baseY, depth - 0.1, 0, 0.35).setFlipX(true)];
      v.body = image(BAT_KEYS.body, cx, baseY, depth, 0.5, 0.5);
    }
    v.parts = [...v.legs, ...(v.head ? [v.head] : []), ...v.cracks, ...v.wings, ...(v.glow ? [v.glow] : [])];
    return v;
  }

  get count(): number {
    return this.views.length;
  }

  /** Coins all the enemies of the level give (counted in the level's totals). */
  get totalCoins(): number {
    return this.views.reduce((n, v) => n + ENEMIES[v.kind].coins, 0);
  }

  /**
   * Every frame: the patrols and flights, the waddle, the turns and peeks, the wobble after a hit and the small hop after a bump.
   * `hearX` is where the player is (a bat flaps quietly when he is near).
   */
  update(now: number, hearX?: number): void {
    for (const v of this.views) {
      if (v.beaten) continue;
      const p = enemyPose(v.kind, now, v.phase, this.opts.tile);
      v.x = v.cx + p.dx;
      v.dir = p.dir;
      if (v.kind === 'bug') this.animBug(v, p, now);
      else if (v.kind === 'beetle') this.animBeetle(v, p, now);
      else this.animBat(v, p, now, hearX);
    }
  }

  private animBug(v: EnemyView, p: Pose, now: number): void {
    const step = p.moving ? Math.sin((now / 1000) * 14) : 0;
    const hop = p.turn * BUG.hopPx + (now < v.hopUntil ? Math.sin(((v.hopUntil - now) / 260) * Math.PI) * 18 : 0);
    const s = v.scale;
    // A gentle waddle: squash and stretch with each step.
    const squash = 1 + 0.04 * step;
    v.body
      .setPosition(v.x, v.groundY - 6 * s - hop)
      .setFlipX(v.dir < 0)
      .setAngle(v.wobble + (p.moving ? step * 3 : 0))
      .setScale((s * (2 - squash)) / TEX_RES, (s * squash) / TEX_RES);
    v.y = v.groundY - v.r - hop;
    v.legs.forEach((leg, i) => {
      const lift = p.moving ? Math.max(0, Math.sin((now / 1000) * 14 + i * Math.PI)) * 5 : 0;
      leg.setPosition(v.x + (i === 0 ? -LEG_DX : LEG_DX) * s, v.groundY - lift - hop * 0.3).setScale(s / TEX_RES);
    });
  }

  /** The beetle: a slow heavy waddle; at each end of the patrol (`turn` rises and falls over the 1 s pause) its head comes right out and looks about. */
  private animBeetle(v: EnemyView, p: Pose, now: number): void {
    const s = v.scale;
    const step = p.moving ? Math.sin((now / 1000) * 9) : 0;
    const bump = now < v.hopUntil ? Math.sin(((v.hopUntil - now) / 260) * Math.PI) * 14 : 0;
    const squash = 1 + 0.03 * step;
    const sx = (s * (2 - squash)) / TEX_RES;
    const sy = (s * squash) / TEX_RES;
    const flip = v.dir < 0;
    const angle = v.wobble + (p.moving ? step * 1.5 : 0);
    v.body.setPosition(v.x, v.groundY - 8 * s - bump).setFlipX(flip).setAngle(angle).setScale(sx, sy);
    v.y = v.groundY - v.r - bump;
    for (const c of v.cracks) c.setPosition(v.x, v.groundY - 8 * s - bump).setFlipX(flip).setAngle(angle).setScale(sx, sy);
    v.legs.forEach((leg, i) => {
      const lift = p.moving ? Math.max(0, Math.sin((now / 1000) * 9 + i * Math.PI)) * 4 : 0;
      leg.setPosition(v.x + (i === 0 ? -BEETLE_LEG_DX : BEETLE_LEG_DX) * s, v.groundY - lift - bump * 0.3).setScale(s / TEX_RES);
    });
    // The head sits in front of the shell's edge (always showing its cute-grumpy face); at the ends it comes right out, a little bigger, and looks about.
    const out = p.turn;
    const reach = (46 + 20 * out) * s * v.dir;
    const look = out > 0.2 ? Math.sin((now / 1000) * 6) * 2.5 * out : 0;
    v.head!
      .setPosition(v.x + reach, v.groundY - (6 + 3 * out) * s - bump * 0.6)
      .setFlipX(flip)
      .setAngle(look)
      .setScale((s * (0.9 + 0.18 * out)) / TEX_RES);
  }

  /** The bat: a slow sine with a small lift, wings flapping, the belly glowing a little brighter and dimmer. */
  private animBat(v: EnemyView, p: Pose, now: number, hearX?: number): void {
    const s = v.scale;
    const flap = Math.sin((now / 1000) * 11 + v.phase * 6);
    const hop = now < v.hopUntil ? Math.sin(((v.hopUntil - now) / 260) * Math.PI) * 14 : 0;
    // Hits and touches use the middle of its cell (the bob only lifts the picture), so a standing robot always walks under it and a shot always reaches it.
    v.y = v.baseY - hop;
    const py = v.y + p.dy;
    v.body.setPosition(v.x, py).setAngle(v.wobble + p.dir * 2.5).setScale((s * (1 + 0.03 * flap)) / TEX_RES, (s * (1 - 0.03 * flap)) / TEX_RES);
    const [wl, wr] = v.wings;
    wl.setPosition(v.x - 13 * s, py - 3 * s).setRotation(0.1 + 0.6 * flap).setScale(s / TEX_RES);
    wr.setPosition(v.x + 13 * s, py - 3 * s).setRotation(-0.1 - 0.6 * flap).setScale(s / TEX_RES);
    v.glow!.setPosition(v.x, py + 9 * s).setDisplaySize(86 * s, 86 * s).setAlpha(0.45 + 0.15 * Math.sin((now / 1000) * 3 + v.phase * 5));
    if (hearX !== undefined && Math.abs(v.x - hearX) < BAT.flapHearPx && now >= v.nextFlap) {
      v.nextFlap = now + BAT.flapEveryMs;
      audio.play('batFlap');
    }
  }

  /** Enemies he can touch (a body rectangle against each unbeaten one's circle), by index. */
  alive(): Array<{ index: number; kind: EnemyKind; x: number; y: number; r: number; scale: number }> {
    return this.views.filter((v) => !v.beaten).map((v) => ({ index: v.index, kind: v.kind, x: v.x, y: v.y, r: v.r, scale: v.scale }));
  }

  /** A shot at (x, y): hits the first unbeaten enemy it touches; returns its index or -1. */
  tryShot(x: number, y: number, r: number, now: number): number {
    const v = this.views.find((b) => !b.beaten && shotHitsEnemy(b.kind, x, y, r, b.r, b.x, b.y));
    if (!v) return -1;
    v.hits++;
    if (enemyBeaten(v.kind, v.hits)) this.pop(v, now, false);
    else this.shrink(v);
    return v.index;
  }

  /** He touched it as Mega Robo, a car or Flash: it pops at once, with a bigger burst. */
  popByTouch(index: number, now: number): void {
    const v = this.views[index];
    if (v && !v.beaten) this.pop(v, now, true);
  }

  /** A gentle bump: it hops a little and gives a tiny "hee", with a small puff of stars. Nothing else happens to it. */
  bumped(index: number, now: number): void {
    const v = this.views[index];
    if (!v || v.beaten) return;
    v.hopUntil = now + 260;
    audio.play('boing');
    audio.play('bugHee');
    this.opts.sparkle.explode(8, v.x, v.y - v.r * 0.5);
  }

  /** For tests and debugging. */
  state(): Array<{ index: number; kind: EnemyKind; x: number; y: number; r: number; hits: number; scale: number; beaten: boolean }> {
    return this.views.map((v) => ({ index: v.index, kind: v.kind, x: v.x, y: v.y, r: v.r, hits: v.hits, scale: v.scale, beaten: v.beaten }));
  }

  /** A hit that does not beat it: it wobbles, shrinks to its next size and sparkles a little (like a big bubble); a beetle shows one more crack. */
  private shrink(v: EnemyView): void {
    const s = this.scene;
    audio.play(ENEMIES[v.kind].hitSound);
    s.tweens.killTweensOf(v);
    s.tweens.add({ targets: v, scale: enemyScale(v.kind, v.hits), duration: 260, ease: 'Back.easeOut' });
    v.wobble = 0;
    s.tweens.add({ targets: v, wobble: { from: -14, to: 0 }, duration: 380, ease: 'Elastic.easeOut' });
    const crack = v.cracks[v.hits - 1];
    if (crack) s.tweens.add({ targets: crack, alpha: 1, duration: 140 });
    const ring = s.add.circle(v.x, v.y, v.r * v.scale).setStrokeStyle(5, 0xffffff, 0.9).setDepth(this.opts.depth + 1);
    s.tweens.add({ targets: ring, scale: 1.3, alpha: 0, duration: 300, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
    this.opts.sparkle.explode(8, v.x, v.y);
  }

  private pop(v: EnemyView, now: number, byTouch: boolean): void {
    v.beaten = true;
    this.beaten++;
    const s = this.scene;
    s.tweens.killTweensOf(v);
    audio.play(ENEMIES[v.kind].popSound);
    for (const img of [v.body, ...v.parts]) {
      s.tweens.add({ targets: img, scale: img.scale * (byTouch ? 1.8 : 1.4), alpha: 0, duration: 260, ease: 'Quad.easeOut', onComplete: () => img.setVisible(false) });
    }
    const rings = byTouch ? 3 : 1;
    for (let i = 0; i < rings; i++) {
      const ring = s.add.circle(v.x, v.y, v.r * v.scale * (0.9 + i * 0.2)).setStrokeStyle(6, i === 0 ? 0xffffff : 0xfdd835, 0.9).setDepth(this.opts.depth + 1);
      s.tweens.add({ targets: ring, scale: 1.8 + i * 0.5, alpha: 0, delay: i * 70, duration: 380, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
    }
    this.opts.sparkle.explode(byTouch ? 34 : 20, v.x, v.y);
    this.opts.spawnCoins(now, v.x, v.y - v.r * 0.4, ENEMIES[v.kind].coins);
    this.opts.onBeaten(v.index, v.kind);
  }
}
