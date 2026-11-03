// The Phaser side of the Bolt Bug (Task 035, D-079): little gadgets that trundle back and forth over a patrol on flat ground,
// hop when they turn, wobble and shrink with each shot and pop into coins. They never hurt him (the rules are in bugs.ts).
import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { popSoundId } from '../audio/recipes';
import type { Cell } from './grid';
import { BUG, bugBeaten, bugRadius, bugScale, patrolPose, shotHitsBug } from './bugs';
import { BUG_KEYS, makeBugTextures, TEX_RES } from './placeholders';

interface BugView {
  index: number;
  /** World x of the middle of the patrol, and of the ground under it. */
  cx: number;
  groundY: number;
  r: number;
  phase: number;
  body: Phaser.GameObjects.Image;
  legs: [Phaser.GameObjects.Image, Phaser.GameObjects.Image];
  hits: number;
  /** Picture size (1 = full), tweened after a hit. */
  scale: number;
  wobble: number;
  beaten: boolean;
  /** A small hop after a bump, until this time. */
  hopUntil: number;
  /** Current centre of the body (for hits and touches). */
  x: number;
  y: number;
  dir: 1 | -1;
}

export interface BugFieldOptions {
  cells: readonly Cell[];
  tile: number;
  gridTop: number;
  depth: number;
  sparkle: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Coins for a beaten bug: they appear in an arc and fly to him (BubbleField.spawnCoins). */
  spawnCoins: (now: number, x: number, y: number, n: number) => void;
  /** A bug was beaten (for the sticker and the stats). */
  onBeaten: (index: number) => void;
}

const LEG_DX = 12;

export class BugField {
  private readonly views: BugView[];
  /** Bugs beaten so far (debug). */
  beaten = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly opts: BugFieldOptions,
  ) {
    makeBugTextures(scene);
    const r = bugRadius(opts.tile);
    this.views = opts.cells.map((c, index) => {
      const cx = (c.col + 0.5) * opts.tile;
      const groundY = opts.gridTop + (c.row + 1) * opts.tile;
      const body = scene.add.image(cx, groundY, BUG_KEYS.body).setOrigin(0.5, 1).setScale(1 / TEX_RES).setDepth(opts.depth);
      const mkLeg = () => scene.add.image(cx, groundY, BUG_KEYS.leg).setOrigin(0.5, 1).setScale(1 / TEX_RES).setDepth(opts.depth - 0.1);
      return {
        index,
        cx,
        groundY,
        r,
        phase: (index * 0.618) % 1,
        body,
        legs: [mkLeg(), mkLeg()] as [Phaser.GameObjects.Image, Phaser.GameObjects.Image],
        hits: 0,
        scale: 1,
        wobble: 0,
        beaten: false,
        hopUntil: -1,
        x: cx,
        y: groundY - r,
        dir: 1 as const,
      };
    });
  }

  get count(): number {
    return this.views.length;
  }

  /** Coins all the bugs of the level give (counted in the level's totals). */
  get totalCoins(): number {
    return this.views.length * BUG.coins;
  }

  /** Every frame: the patrol, the waddle, the turning hop, the wobble after a hit and the small hop after a bump. */
  update(now: number): void {
    for (const v of this.views) {
      if (v.beaten) continue;
      const p = patrolPose(now, v.phase, this.opts.tile);
      v.x = v.cx + p.dx;
      v.dir = p.dir;
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
  }

  /** Bugs he is touching (a body rectangle against each unbeaten bug's circle), by index. */
  alive(): Array<{ index: number; x: number; y: number; r: number; scale: number }> {
    return this.views.filter((v) => !v.beaten).map((v) => ({ index: v.index, x: v.x, y: v.y, r: v.r, scale: v.scale }));
  }

  /** A shot at (x, y): hits the first unbeaten bug it touches; returns its index or -1. Three hits beat it. */
  tryShot(x: number, y: number, r: number, now: number): number {
    const v = this.views.find((b) => !b.beaten && shotHitsBug(x, y, r, b.r, b.x, b.y));
    if (!v) return -1;
    v.hits++;
    if (bugBeaten(v.hits)) this.pop(v, now, false);
    else this.shrink(v);
    return v.index;
  }

  /** He touched it as Mega Robo, a car or Flash: it pops at once, with a bigger burst. */
  popByTouch(index: number, now: number): void {
    const v = this.views[index];
    if (v && !v.beaten) this.pop(v, now, true);
  }

  /** A gentle bump: the bug hops a little and gives a tiny "hee", with a small puff of stars. Nothing else happens to it. */
  bumped(index: number, now: number): void {
    const v = this.views[index];
    if (!v || v.beaten) return;
    v.hopUntil = now + 260;
    audio.play('boing');
    audio.play('bugHee');
    this.opts.sparkle.explode(8, v.x, v.y - v.r * 0.5);
  }

  /** For tests and debugging. */
  state(): Array<{ index: number; x: number; y: number; r: number; hits: number; scale: number; beaten: boolean }> {
    return this.views.map((v) => ({ index: v.index, x: v.x, y: v.y, r: v.r, hits: v.hits, scale: v.scale, beaten: v.beaten }));
  }

  /** A hit that does not beat it: it wobbles, shrinks to its next size and sparkles a little (like a big bubble). */
  private shrink(v: BugView): void {
    const s = this.scene;
    audio.play(popSoundId(2));
    s.tweens.killTweensOf(v);
    s.tweens.add({ targets: v, scale: bugScale(v.hits), duration: 260, ease: 'Back.easeOut' });
    v.wobble = 0;
    s.tweens.add({ targets: v, wobble: { from: -14, to: 0 }, duration: 380, ease: 'Elastic.easeOut' });
    const ring = s.add.circle(v.x, v.y, v.r * v.scale).setStrokeStyle(5, 0xffffff, 0.9).setDepth(this.opts.depth + 1);
    s.tweens.add({ targets: ring, scale: 1.3, alpha: 0, duration: 300, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
    this.opts.sparkle.explode(8, v.x, v.y);
  }

  private pop(v: BugView, now: number, byTouch: boolean): void {
    v.beaten = true;
    this.beaten++;
    const s = this.scene;
    s.tweens.killTweensOf(v);
    audio.play('bugPop');
    for (const img of [v.body, ...v.legs]) {
      s.tweens.add({ targets: img, scale: img.scale * (byTouch ? 1.8 : 1.4), alpha: 0, duration: 260, ease: 'Quad.easeOut', onComplete: () => img.setVisible(false) });
    }
    const rings = byTouch ? 3 : 1;
    for (let i = 0; i < rings; i++) {
      const ring = s.add.circle(v.x, v.y, v.r * v.scale * (0.9 + i * 0.2)).setStrokeStyle(6, i === 0 ? 0xffffff : 0xfdd835, 0.9).setDepth(this.opts.depth + 1);
      s.tweens.add({ targets: ring, scale: 1.8 + i * 0.5, alpha: 0, delay: i * 70, duration: 380, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
    }
    this.opts.sparkle.explode(byTouch ? 34 : 20, v.x, v.y);
    this.opts.spawnCoins(now, v.x, v.y - v.r * 0.4, BUG.coins);
    this.opts.onBeaten(v.index);
  }
}
