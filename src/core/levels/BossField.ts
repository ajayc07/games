// The Phaser side of the Cave Guardian (Task 040): a big rock golem that walks slowly back and forth, wobbles and lights its chest
// crystal brighter with every hit, and crumbles into a shower of crystal coins. It never hurts him (rules and numbers in boss.ts).
import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { BOSS, bossBeaten, bossHitCircle, bossPose, bossTouches, crystalLight, shotHitsBoss } from './boss';
import type { Cell } from './grid';
import { GOLEM_BODY, GOLEM_KEYS, TEX_RES, makeGolemTextures } from './placeholders';

type Img = Phaser.GameObjects.Image;

export interface BossFieldOptions {
  cell: Cell;
  tile: number;
  gridTop: number;
  depth: number;
  sparkle: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Coins that fly to him (BubbleField.spawnCoins). */
  spawnCoins: (now: number, x: number, y: number, n: number) => void;
  /** The last hit: the golem starts to crumble (the scene opens the gate a little later). */
  onBeaten: () => void;
}

const CRYSTAL_COLORS = [0xc8fbff, 0xffffff, 0xff9fd8, 0xc9a8ff, 0x8ff0ff];

export class BossField {
  hits = 0;
  beaten = false;
  /** Current middle x of the golem (world px) and the ground under it. */
  x: number;
  readonly groundY: number;
  private readonly cx: number;
  private readonly k: number;
  private body: Img;
  private arms: Img[];
  private legs: Img[];
  private crystal: Img;
  private glow: Img;
  private all: Img[];
  /** 0..1 pulse after a hit (squash and a bigger crystal), tweened. */
  private pulse = 0;
  private hopUntil = -1;
  private nextStep = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly opts: BossFieldOptions,
  ) {
    makeGolemTextures(scene);
    const { tile, gridTop, depth, cell } = opts;
    this.k = tile / 64;
    this.cx = (cell.col + 0.5) * tile;
    this.x = this.cx;
    this.groundY = gridTop + (cell.row + 1) * tile;
    const image = (key: string, d: number, ox = 0.5, oy = 1): Img => scene.add.image(this.cx, this.groundY, key).setOrigin(ox, oy).setScale(this.k / TEX_RES).setDepth(d);
    this.legs = [image(GOLEM_KEYS.leg, depth - 0.2), image(GOLEM_KEYS.leg, depth - 0.2)];
    this.arms = [image(GOLEM_KEYS.arm, depth - 0.1, 0.5, 0.08), image(GOLEM_KEYS.arm, depth - 0.1, 0.5, 0.08)];
    this.body = image(GOLEM_KEYS.body, depth);
    this.glow = scene.add.image(this.cx, this.groundY, 'fx-glow').setTint(0x7fe8ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 0.1);
    this.crystal = image(GOLEM_KEYS.crystal, depth + 0.2, 0.5, 0.5);
    this.all = [...this.legs, ...this.arms, this.body, this.crystal];
    this.update(0);
  }

  /** The body's bottom edge, so the chest socket sits exactly on the crystal's hit circle. */
  private bodyBottom(bob: number): number {
    return this.groundY - BOSS.chestUp * this.opts.tile + (GOLEM_BODY.h - GOLEM_BODY.socketY) * this.k - bob;
  }

  /** Every frame: the slow walk (a pause at each end, the head tilting about), the arms and legs, the glowing crystal. `hearX` is where he is. */
  update(now: number, hearX?: number): void {
    if (this.beaten) return;
    const k = this.k;
    const p = bossPose(now, this.opts.tile);
    this.x = this.cx + p.dx;
    const stride = p.moving ? Math.sin((now / 1000) * 5) : 0;
    const bob = p.moving ? Math.abs(stride) * 3 * k : 0;
    const hop = now < this.hopUntil ? Math.sin(((this.hopUntil - now) / 260) * Math.PI) * 10 : 0;
    const light = crystalLight(this.hits);
    const tilt = p.moving ? stride * 1 : Math.sin((now / 1000) * 2.2) * 2.5 * p.turn;
    const sx = (1 + 0.05 * this.pulse) * (this.k / TEX_RES);
    const sy = (1 - 0.05 * this.pulse) * (this.k / TEX_RES);
    const bottom = this.bodyBottom(bob + hop);
    this.body.setPosition(this.x, bottom).setAngle(tilt).setScale(sx, sy);
    const socketY = bottom - (GOLEM_BODY.h - GOLEM_BODY.socketY) * k;
    this.crystal.setPosition(this.x, socketY).setAngle(tilt).setScale((k / TEX_RES) * (1 + 0.1 * Math.sin((now / 1000) * 3) + 0.45 * this.pulse));
    this.glow
      .setPosition(this.x, socketY)
      .setDisplaySize(120 * k * (0.7 + 0.9 * light + 0.5 * this.pulse), 120 * k * (0.7 + 0.9 * light + 0.5 * this.pulse))
      .setAlpha(0.3 + 0.5 * light + 0.15 * Math.sin((now / 1000) * 3));
    const shoulderY = bottom - (GOLEM_BODY.h - GOLEM_BODY.shoulderY) * k;
    this.arms.forEach((arm, i) => {
      const side = i === 0 ? -1 : 1;
      arm.setPosition(this.x + side * 94 * k, shoulderY).setRotation(side * 0.08 + (p.moving ? side * stride * 0.4 : 0)).setScale(k / TEX_RES);
    });
    this.legs.forEach((leg, i) => {
      const lift = p.moving ? Math.max(0, Math.sin((now / 1000) * 5 + i * Math.PI)) * 7 * k : 0;
      leg.setPosition(this.x + (i === 0 ? -36 : 36) * k, this.groundY - lift - hop * 0.3);
    });
    if (hearX !== undefined && p.moving && Math.abs(this.x - hearX) < 620 && now >= this.nextStep) {
      this.nextStep = now + 640;
      audio.play('golemStep');
    }
  }

  /** The crystal's hit circle now (debug and tests). */
  hitCircle(): { x: number; y: number; r: number } {
    return bossHitCircle(this.x, this.groundY, this.opts.tile);
  }

  touches(body: { left: number; right: number; top: number; bottom: number }): boolean {
    return !this.beaten && bossTouches(body, this.x, this.groundY, this.opts.tile);
  }

  /** A shot at (x, y): a hit on the crystal counts (true) and drops its coins; the tenth one beats it. */
  tryShot(x: number, y: number, r: number, now: number): boolean {
    if (this.beaten || !shotHitsBoss(x, y, r, this.x, this.groundY, this.opts.tile)) return false;
    this.hit(now);
    return true;
  }

  /** One hit (a shot, or a touch as Mega Robo, a car or Flash): the crystal shines brighter, it wobbles and drops 2 coins. */
  hit(now: number): void {
    if (this.beaten) return;
    this.hits++;
    const s = this.scene;
    const c = this.hitCircle();
    this.opts.spawnCoins(now, this.x, c.y - 10, BOSS.coinsPerHit);
    this.opts.sparkle.explode(10, this.x, c.y);
    if (bossBeaten(this.hits)) {
      this.crumble(now);
      return;
    }
    audio.play('golemHit');
    s.tweens.killTweensOf(this);
    this.pulse = 1;
    s.tweens.add({ targets: this, pulse: 0, duration: 380, ease: 'Elastic.easeOut' });
    const ring = s.add.circle(this.x, c.y, 34).setStrokeStyle(6, 0xc8fbff, 0.95).setDepth(this.opts.depth + 1);
    s.tweens.add({ targets: ring, scale: 2.2, alpha: 0, duration: 380, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
  }

  /** A gentle bump: it hops a little and gives a soft boing. Nothing else happens to it. */
  bumped(now: number): void {
    if (this.beaten) return;
    this.hopUntil = now + 260;
    audio.play('boing');
    this.opts.sparkle.explode(8, this.x, this.groundY - 40);
  }

  /** The crumble: the pieces sink and fade with a shake, rubble and crystal sparkles fly, and 20 coins fly to him. */
  private crumble(now: number): void {
    this.beaten = true;
    const s = this.scene;
    const { depth } = this.opts;
    const c = this.hitCircle();
    audio.play('golemCrumble');
    s.tweens.killTweensOf(this);
    this.glow.setAlpha(1).setDisplaySize(260 * this.k, 260 * this.k);
    s.tweens.add({ targets: this.glow, alpha: 0, displayWidth: 480 * this.k, displayHeight: 480 * this.k, duration: BOSS.crumbleMs, ease: 'Quad.easeOut' });
    for (const img of this.all) {
      const baseX = img.x;
      s.tweens.add({ targets: img, x: { from: baseX - 5, to: baseX + 5 }, duration: 70, yoyo: true, repeat: Math.floor(BOSS.crumbleMs / 140) - 1 });
      s.tweens.add({ targets: img, y: img.y + 36 * this.k, scaleY: img.scaleY * 0.35, alpha: 0, delay: 260, duration: BOSS.crumbleMs - 260, ease: 'Quad.easeIn' });
    }
    for (let i = 0; i < 14; i++) {
      const rock = s.add.circle(this.x + Phaser.Math.Between(-60, 60), c.y + Phaser.Math.Between(-70, 40), Phaser.Math.Between(6, 13), i % 3 === 0 ? 0xa3aecb : 0x6a7596).setStrokeStyle(2, 0x2b3550).setDepth(depth + 0.5);
      const dx = Phaser.Math.Between(-150, 150);
      s.tweens.add({ targets: rock, x: rock.x + dx, duration: 900, ease: 'Sine.easeOut' });
      s.tweens.add({ targets: rock, y: this.groundY - 8, duration: 900, ease: 'Bounce.easeOut', delay: i * 20 });
      s.tweens.add({ targets: rock, alpha: 0, duration: 400, delay: 1200, onComplete: () => rock.destroy() });
    }
    for (let i = 0; i < 3; i++) {
      const ring = s.add.circle(this.x, c.y, 50).setStrokeStyle(8, CRYSTAL_COLORS[i], 0.95).setDepth(depth + 1);
      s.tweens.add({ targets: ring, scale: 4 + i, alpha: 0, delay: i * 140, duration: 700, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
    }
    this.opts.sparkle.explode(46, this.x, c.y);
    this.opts.spawnCoins(now, this.x, c.y, BOSS.finishCoins);
    this.opts.onBeaten();
  }

  state(): { x: number; y: number; r: number; hits: number; beaten: boolean; groundY: number } {
    const c = this.hitCircle();
    return { x: this.x, y: c.y, r: c.r, hits: this.hits, beaten: this.beaten, groundY: this.groundY };
  }

  destroy(): void {
    const s = this.scene;
    s.tweens.killTweensOf(this);
    for (const img of [...this.all, this.glow]) {
      s.tweens.killTweensOf(img);
      img.destroy();
    }
  }
}
