// Generic level scene: runs any level JSON with any theme and character. Knows nothing about a
// specific universe; the universe passes everything in through LevelSceneData.
import Phaser from 'phaser';
import type { CharacterDef } from '../types';
import { InputManager } from '../input/InputManager';
import { TouchControls } from '../ui/TouchControls';
import { getLayout, type Layout } from '../ui/layout';
import { audio } from '../audio/AudioManager';
import { DEFAULT_RECIPES } from '../audio/recipes';
import type { LevelData } from './format';
import { extractEntities, findRespawn, mergeSolids, starsFor, type Cell, type GridEntities } from './grid';
import { PHYSICS } from './physics';
import type { LevelTheme } from './theme';
import { TEX_RES, makeCapsuleTexture, makeEffectTextures, makeThemeTextures, themeKey } from './placeholders';
import { loadCharacterTexture } from './characterTexture';
import { ParallaxBackground } from './background';
import { ResultScreen } from './ResultScreen';

export interface LevelSceneData {
  level: LevelData;
  theme: LevelTheme;
  character: CharacterDef;
  /** Leave the level (Home button). */
  onHome: () => void;
}

type Mode = 'play' | 'respawn' | 'finish' | 'result';

interface Coin {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  taken: boolean;
}

const DEFAULT_DISPLAY_HEIGHT = 104;
const COIN_SIZE = 40;
const COIN_HIT_R = 18;
/** Where the player sits on screen, as a fraction across the safe area (rest is look-ahead). */
const CAMERA_ANCHOR = 0.36;
const DEPTH = { ground: 0, coins: 10, flag: 5, player: 20, fx: 30, hint: 40, hud: 900 };

export class LevelScene extends Phaser.Scene {
  static readonly KEY = 'level';
  /** The tap hint is shown until the very first jump, then never again in this session. */
  private static hintDone = false;

  private data0!: LevelSceneData;
  private level!: LevelData;
  private grid!: GridEntities;
  private tile = 64;
  /** World y of the top of grid row 0 (grid bottom sits on the screen bottom). */
  private gridTop = 0;
  private worldW = 0;
  private runSpeed: number = PHYSICS.runSpeed;

  private layout!: Layout;
  private input2!: InputManager;
  private bg!: ParallaxBackground;
  private playerZone!: Phaser.GameObjects.Zone;
  private body2!: Phaser.Physics.Arcade.Body;
  private sprite!: Phaser.GameObjects.Image;
  private spriteBase = 1;
  private coins: Coin[] = [];
  private flagX = 0;
  private flagTopY = 0;
  private flagCloth!: Phaser.GameObjects.Image;
  private hud!: { icon: Phaser.GameObjects.Image; count: Phaser.GameObjects.Text };
  private hint: Phaser.GameObjects.Container | null = null;
  private result: ResultScreen | null = null;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparkle!: Phaser.GameObjects.Particles.ParticleEmitter;
  private confetti!: Phaser.GameObjects.Particles.ParticleEmitter;

  private mode: Mode = 'play';
  private coinCount = 0;
  private respawns = 0;
  private jumps = 0;
  private facing = 1;
  private jumpUsed = false;
  private jumpBufferUntil = -1;
  private lastGroundedAt = 0;
  private lastGroundedCol = 0;
  private airborneSince = -1;
  private squash = { x: 1, y: 1 };
  private bobPhase = 0;
  private camX = 0;
  private camAnchor = CAMERA_ANCHOR;
  private cameraSnapped = false;
  private ride: { x: number; y: number } | null = null;
  private jumpSound = 'jump';

  constructor() {
    super({
      key: LevelScene.KEY,
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: PHYSICS.gravity }, debug: false } },
    });
  }

  init(data: LevelSceneData): void {
    this.data0 = data;
    this.level = data.level;
    this.grid = extractEntities(data.level.grid);
    this.tile = data.level.tileSize;
    this.runSpeed = data.level.runSpeed ?? PHYSICS.runSpeed;
    this.worldW = this.grid.cols * this.tile;
    this.mode = 'play';
    this.coinCount = 0;
    this.respawns = 0;
    this.jumps = 0;
    this.facing = 1;
    this.jumpUsed = false;
    this.jumpBufferUntil = -1;
    this.airborneSince = -1;
    this.squash = { x: 1, y: 1 };
    this.cameraSnapped = false;
    this.ride = null;
    this.result = null;
    this.hint = null;
    this.coins = [];
  }

  preload(): void {
    // Real art for theme textures, if the universe supplies files. Missing ones are generated in create().
    const images = this.data0.theme.images ?? {};
    for (const [name, url] of Object.entries(images)) {
      const key = themeKey(this.data0.theme, name as keyof typeof images);
      if (url && !this.textures.exists(key)) this.load.image(key, url);
    }
  }

  create(): void {
    const { theme, character } = this.data0;
    this.layout = getLayout();
    this.gridTop = this.layout.height - this.grid.rows * this.tile;
    makeThemeTextures(this, theme, this.tile);
    makeEffectTextures(this);

    const surfaceY = this.gridTop + (this.grid.start.row + 1) * this.tile;
    this.bg = new ParallaxBackground(this, theme, surfaceY);
    this.buildGround();
    this.buildCoins();
    this.buildFlag();
    this.buildPlayer(character);
    this.buildEffects();
    this.buildHud();

    this.input2 = new InputManager(this);
    this.input2.configure({ enabled: this.level.controls.enabled, tapAnywhereJumps: this.level.controls.tapAnywhereJumps });
    new TouchControls(this, this.input2, this.layout);
    if (!LevelScene.hintDone) this.buildHint();

    if (character.sounds?.jump) {
      this.jumpSound = `jump:${character.id}`;
      if (!audio.has(this.jumpSound)) audio.register(this.jumpSound, { file: character.sounds.jump, synth: DEFAULT_RECIPES.jump });
    }

    this.layout.bindToScene(this, (l) => this.relayout(l));
    this.lastGroundedAt = this.time.now;
    this.installDebugHook();
  }

  override update(time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    if (this.mode === 'play') this.updatePlay(time);
    else if (this.mode === 'finish') this.updateFinish();
    this.updateSprite(time, dt);
    this.updateCamera(dt);
    this.bg.update(this.camX, dt);
    if (this.hint) this.hint.setPosition(this.body2.center.x + 80, this.body2.bottom - 150);
  }

  // ---------- build ----------

  private buildGround(): void {
    const T = this.tile;
    const { solid, cols, rows } = this.grid;
    const theme = this.data0.theme;
    const kindAt = (row: number, col: number): 'top' | 'fill' | null => {
      if (!solid[row][col]) return null;
      return row > 0 && solid[row - 1][col] ? 'fill' : 'top';
    };
    const strip = (kind: 'top' | 'fill', x: number, y: number, w: number) => {
      const key = themeKey(theme, kind === 'top' ? 'ground-top' : 'ground-fill');
      const frame = this.textures.getFrame(key);
      this.add
        .tileSprite(x, y, w, T, key)
        .setOrigin(0, 0)
        .setTileScale(T / frame.width, T / frame.height)
        .setDepth(DEPTH.ground);
    };
    // One strip per run of identical cells in a row: fewer objects and no seams.
    for (let row = 0; row < rows; row++) {
      let col = 0;
      while (col < cols) {
        const kind = kindAt(row, col);
        const from = col;
        while (col < cols && kindAt(row, col) === kind) col++;
        if (kind) strip(kind, from * T, this.gridTop + row * T, (col - from) * T);
      }
      // Scenery: the first and last columns continue past the level edges (wide screens, camera lead-in).
      const pad = 2400;
      const first = kindAt(row, 0);
      const last = kindAt(row, cols - 1);
      if (first) strip(first, -pad, this.gridTop + row * T, pad);
      if (last) strip(last, this.worldW, this.gridTop + row * T, pad);
    }

    // Collision: merged rectangles as static bodies.
    const bodies = mergeSolids(solid).map((r) => {
      const z = this.add.zone(r.col * T + (r.width * T) / 2, this.gridTop + r.row * T + (r.height * T) / 2, r.width * T, r.height * T);
      this.physics.add.existing(z, true);
      return z;
    });
    this.physics.world.setBounds(0, -2000, this.worldW, this.layout.height + 4000, true, true, false, false);
    this.groundBodies = bodies;
  }

  private groundBodies: Phaser.GameObjects.Zone[] = [];

  private buildCoins(): void {
    const key = themeKey(this.data0.theme, 'coin');
    this.coins = this.grid.coins.map((c, i) => {
      const { x, y } = this.cellCenter(c);
      const img = this.add.image(x, y, key).setDisplaySize(COIN_SIZE, COIN_SIZE).setDepth(DEPTH.coins);
      // A slow shimmer: coins gently bob, out of step with each other.
      this.tweens.add({ targets: img, y: y - 5, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: (i % 5) * 140 });
      return { img, x, y, taken: false };
    });
  }

  private buildFlag(): void {
    const T = this.tile;
    const theme = this.data0.theme;
    const base = this.gridTop + (this.grid.flag.row + 1) * T;
    this.flagX = this.grid.flag.col * T + T / 2;
    const poleH = T * 4 + 12;
    this.add.image(this.flagX, base, themeKey(theme, 'flag-pole')).setOrigin(0.5, 1).setDisplaySize(20, poleH).setDepth(DEPTH.flag);
    this.flagTopY = base - poleH;
    this.flagCloth = this.add
      .image(this.flagX + 4, this.flagTopY + 22, themeKey(theme, 'flag-cloth'))
      .setOrigin(0, 0)
      .setDisplaySize(84, 60)
      .setDepth(DEPTH.flag);
    this.tweens.add({ targets: this.flagCloth, scaleX: this.flagCloth.scaleX * 0.88, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private buildPlayer(character: CharacterDef): void {
    const { width, height } = PHYSICS.body;
    const start = this.cellCenter(this.grid.start);
    const feet = this.gridTop + (this.grid.start.row + 1) * this.tile;
    this.playerZone = this.add.zone(start.x, feet - height / 2, width, height);
    this.physics.add.existing(this.playerZone);
    this.body2 = this.playerZone.body as Phaser.Physics.Arcade.Body;
    this.body2.setMaxVelocity(1000, PHYSICS.maxFallSpeed);
    this.body2.setCollideWorldBounds(true);
    this.physics.add.collider(this.playerZone, this.groundBodies);

    const displayH = character.displayHeight ?? DEFAULT_DISPLAY_HEIGHT;
    // Capsule first; the real picture replaces it as soon as it is decoded (or never, if it fails).
    const capsule = makeCapsuleTexture(this, character.color ?? 0xe53935);
    this.sprite = this.add.image(start.x, feet, capsule).setOrigin(0.5, 1).setDepth(DEPTH.player);
    this.spriteBase = displayH / (this.sprite.height || 1);
    void loadCharacterTexture(this, character.id, character.image, displayH).then((key) => {
      if (!key || !this.sys.isActive() || !this.sprite.active) return;
      this.sprite.setTexture(key);
      this.spriteBase = 1 / TEX_RES;
    });
  }

  private buildEffects(): void {
    this.dust = this.add.particles(0, 0, 'fx-dust', {
      emitting: false,
      speedX: { min: -90, max: 90 },
      speedY: { min: -60, max: -10 },
      scale: { start: 0.55, end: 0.1 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 380,
    }).setDepth(DEPTH.fx);
    this.sparkle = this.add.particles(0, 0, 'fx-sparkle', {
      emitting: false,
      speed: { min: 90, max: 220 },
      scale: { start: 0.6, end: 0 },
      rotate: { min: 0, max: 180 },
      tint: [0xffffff, 0xfff176, 0xffd54f],
      lifespan: 420,
    }).setDepth(DEPTH.fx);
    this.confetti = this.add.particles(0, 0, 'fx-confetti', {
      emitting: false,
      speed: { min: 250, max: 620 },
      angle: { min: 220, max: 320 },
      gravityY: 700,
      rotate: { min: 0, max: 360 },
      scale: { min: 0.5, max: 0.9 },
      tint: [0xe53935, 0xffeb3b, 0x43a047, 0x1e88e5, 0xff8f00, 0xab47bc],
      lifespan: 2200,
    }).setDepth(DEPTH.fx);
  }

  private buildHud(): void {
    const icon = this.add.image(0, 0, themeKey(this.data0.theme, 'coin')).setDisplaySize(56, 56).setScrollFactor(0).setDepth(DEPTH.hud);
    const count = this.add
      .text(0, 0, '0', {
        fontFamily: '"Arial Black", "Arial Rounded MT Bold", Arial, sans-serif',
        fontSize: '60px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#5d4037',
        strokeThickness: 10,
        resolution: Math.max(1, this.layout.renderScale),
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    this.hud = { icon, count };
  }

  /** Big pulsing circle with a ripple next to the character, until the first jump. Icon only. */
  private buildHint(): void {
    const ring = this.add.circle(0, 0, 34).setStrokeStyle(8, 0xffffff, 1);
    const dot = this.add.circle(0, 0, 30, 0xffffff, 0.95);
    const finger = this.add.graphics();
    finger.fillStyle(0xffcc80, 1).lineStyle(4, 0x8d6e63, 1);
    finger.fillRoundedRect(-11, 4, 22, 54, 11).strokeRoundedRect(-11, 4, 22, 54, 11);
    finger.fillRoundedRect(-24, 34, 48, 44, 16).strokeRoundedRect(-24, 34, 48, 44, 16);
    finger.setPosition(14, 6).setAngle(-18);
    this.hint = this.add.container(0, 0, [ring, dot, finger]).setDepth(DEPTH.hint);
    this.tweens.add({ targets: ring, scale: 2.1, alpha: 0, duration: 900, repeat: -1, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: dot, scale: 0.8, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: finger, y: 18, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // ---------- per frame ----------

  private updatePlay(now: number): void {
    const body = this.body2;
    const input = this.input2;
    const controls = this.level.controls;
    const grounded = body.blocked.down;

    if (grounded) {
      this.lastGroundedAt = now;
      this.lastGroundedCol = Math.floor(body.center.x / this.tile);
      if (body.velocity.y >= 0) this.jumpUsed = false;
      if (this.airborneSince >= 0) {
        if (now - this.airborneSince > 120) this.onLand();
        this.airborneSince = -1;
      }
    } else if (this.airborneSince < 0) {
      this.airborneSince = now;
    }

    // Horizontal: auto-run, or Left/Right (release stops).
    let vx = 0;
    if (controls.autoRun) vx = this.runSpeed;
    else vx = ((input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0)) * this.runSpeed;
    body.setVelocityX(vx);
    if (vx !== 0) this.facing = Math.sign(vx);

    // Jump with buffering and coyote time (D-021). Fixed height: no early release cut.
    if (input.justPressed('jump')) this.jumpBufferUntil = now + PHYSICS.jumpBufferMs;
    const canJump = !this.jumpUsed && now - this.lastGroundedAt <= PHYSICS.coyoteMs;
    if (now <= this.jumpBufferUntil && canJump) this.jump();

    this.collectCoins();

    if (body.center.x >= this.flagX - PHYSICS.body.width / 2) this.reachFlag();
    else if (body.top > this.layout.height + 40) this.startRespawn();
  }

  private jump(): void {
    this.body2.setVelocityY(-PHYSICS.jumpVelocity);
    this.jumpUsed = true;
    this.jumpBufferUntil = -1;
    this.jumps++;
    this.squash = { x: 0.82, y: 1.2 };
    audio.play(this.jumpSound);
    if (this.hint) {
      LevelScene.hintDone = true;
      const h = this.hint;
      this.hint = null;
      this.tweens.killTweensOf(h.list);
      this.tweens.add({ targets: h, alpha: 0, scale: 1.4, duration: 200, onComplete: () => h.destroy() });
    }
  }

  private onLand(): void {
    this.squash = { x: 1.2, y: 0.8 };
    this.dust.explode(7, this.body2.center.x, this.body2.bottom - 4);
  }

  private collectCoins(): void {
    const b = this.body2;
    for (const coin of this.coins) {
      if (coin.taken) continue;
      const nx = Phaser.Math.Clamp(coin.x, b.left, b.right);
      const ny = Phaser.Math.Clamp(coin.y, b.top, b.bottom);
      if ((coin.x - nx) ** 2 + (coin.y - ny) ** 2 > COIN_HIT_R * COIN_HIT_R) continue;
      coin.taken = true;
      this.coinCount++;
      audio.play('coin');
      this.sparkle.explode(8, coin.x, coin.y);
      this.tweens.killTweensOf(coin.img);
      this.tweens.add({
        targets: coin.img,
        y: coin.y - 50,
        alpha: 0,
        scaleX: 0,
        duration: 320,
        ease: 'Quad.easeOut',
        onComplete: () => coin.img.setVisible(false),
      });
      this.hud.count.setText(String(this.coinCount));
      this.tweens.killTweensOf(this.hud.count);
      this.hud.count.setScale(1);
      this.tweens.add({ targets: this.hud.count, scale: 1.3, duration: 110, yoyo: true });
    }
  }

  private updateSprite(time: number, dt: number): void {
    const body = this.body2;
    const k = Math.min(1, dt * 12);
    this.squash.x += (1 - this.squash.x) * k;
    this.squash.y += (1 - this.squash.y) * k;

    let x = body.center.x;
    let y = body.bottom;
    let rot = 0;
    if (this.ride) {
      x = this.ride.x;
      y = this.ride.y;
    } else if (body.blocked.down && Math.abs(body.velocity.x) > 10) {
      // Gentle bob while running (no run animation frames yet).
      this.bobPhase += dt * (Math.abs(body.velocity.x) / 22);
      y -= Math.abs(Math.sin(this.bobPhase)) * 6;
      rot = Math.sin(this.bobPhase) * 0.06;
    } else if (!body.blocked.down) {
      rot = Phaser.Math.Clamp(body.velocity.y / 6000, -0.08, 0.12) * this.facing;
    } else {
      // Idle: a slow breath.
      this.squash.y += Math.sin(time / 300) * 0.002;
    }
    this.sprite.setPosition(x, y);
    this.sprite.setScale(this.spriteBase * this.squash.x * this.facing, this.spriteBase * this.squash.y);
    this.sprite.setRotation(rot);
  }

  private updateCamera(dt: number): void {
    const safe = this.layout.safeRect;
    const followX = this.ride ? this.ride.x : this.body2.center.x;
    // At the finish the character moves to the screen centre, between the result buttons.
    const finished = this.mode === 'finish' || this.mode === 'result';
    const anchorGoal = finished ? 0.5 : this.facing >= 0 ? CAMERA_ANCHOR : 1 - CAMERA_ANCHOR;
    this.camAnchor += (anchorGoal - this.camAnchor) * Math.min(1, dt * 2);
    const target = followX - (safe.x + safe.width * this.camAnchor);
    if (!this.cameraSnapped) {
      this.camX = target;
      this.cameraSnapped = true;
    } else {
      this.camX += (target - this.camX) * Math.min(1, dt * 6);
    }
    const cam = this.cameras.main;
    cam.scrollX = this.camX;
    cam.scrollY = 0;
  }

  // ---------- falling (D-019) ----------

  private startRespawn(): void {
    this.mode = 'respawn';
    this.respawns++;
    audio.play('whoosh');
    const spot: Cell = findRespawn(this.grid.solid, this.lastGroundedCol) ?? this.grid.start;
    const T = this.tile;
    const target = { x: spot.col * T + T / 2, y: this.gridTop + (spot.row + 1) * T };
    const body = this.body2;
    body.setVelocity(0, 0);
    body.enable = false;
    this.facing = 1;

    // The player rides a little cloud: up out of the gap, across, and gently down onto safe ground.
    const H = this.layout.height;
    this.ride = { x: body.center.x, y: H + 60 };
    const cloud = this.add.image(this.ride.x, this.ride.y, themeKey(this.data0.theme, 'cloud')).setDisplaySize(120, 60);
    cloud.setDepth(DEPTH.player + 1);
    const follow = () => cloud.setPosition(this.ride!.x, this.ride!.y + 18);
    const hover = target.y - 70;
    this.tweens.chain({
      targets: this.ride,
      tweens: [
        { y: H - 200, duration: 450, ease: 'Sine.easeOut', onUpdate: follow },
        { x: target.x, y: hover, duration: 900, ease: 'Sine.easeInOut', onUpdate: follow },
        { y: target.y, duration: 300, ease: 'Sine.easeIn', onUpdate: follow },
      ],
      onComplete: () => {
        this.playerZone.setPosition(target.x, target.y - PHYSICS.body.height / 2);
        body.enable = true;
        body.reset(this.playerZone.x, this.playerZone.y);
        this.ride = null;
        this.mode = 'play';
        this.jumpUsed = false;
        this.jumpBufferUntil = -1;
        this.airborneSince = -1;
        this.lastGroundedAt = this.time.now;
        this.squash = { x: 1.15, y: 0.85 };
        this.tweens.add({ targets: cloud, y: cloud.y + 30, alpha: 0, duration: 400, onComplete: () => cloud.destroy() });
      },
    });
  }

  // ---------- flag and result ----------

  private reachFlag(): void {
    this.mode = 'finish';
    this.body2.setVelocityX(0);
    this.input2.configure({ enabled: [], tapAnywhereJumps: false });
    if (this.hint) {
      this.hint.destroy();
      this.hint = null;
    }
  }

  /** Waits until the player is on the ground, then celebrates once. */
  private updateFinish(): void {
    const body = this.body2;
    body.setVelocityX(0);
    if (!body.blocked.down) return;
    this.mode = 'result';
    audio.play('win');
    this.sprite.setDepth(ResultScreen.DEPTH + 0.5); // above the dim layer, below stars and buttons
    body.setVelocityY(-PHYSICS.jumpVelocity * 0.7); // happy hop
    this.squash = { x: 0.85, y: 1.15 };
    this.confetti.explode(70, this.flagX, this.flagTopY + 20);
    this.time.delayedCall(250, () => this.confetti.explode(50, this.body2.center.x, this.body2.top));
    this.tweens.add({ targets: this.flagCloth, angle: { from: -8, to: 8 }, duration: 160, yoyo: true, repeat: 3 });
    const stars = starsFor(true, this.coinCount, this.level.stars);
    this.time.delayedCall(1100, () => {
      this.result = new ResultScreen(this, this.layout, stars, {
        onReplay: () => this.scene.restart(this.data0),
        // Leave after this frame: stopping the scene mid-update would break the rest of the frame.
        onHome: () => this.game.events.once(Phaser.Core.Events.POST_STEP, () => this.data0.onHome()),
      });
    });
  }

  // ---------- layout ----------

  private relayout(l: Layout): void {
    this.bg.layout(l);
    const safe = l.safeRect;
    const ui = l.uiRect;
    // HUD: top-left corner of the safe area (and clear of any notch).
    const x = Math.max(safe.x, ui.x) + 52;
    const y = Math.max(safe.y, ui.y) + 52;
    this.hud.icon.setPosition(x, y);
    this.hud.count.setPosition(x + 40, y + 2);
    this.result?.layout(l);
  }

  private cellCenter(c: Cell): { x: number; y: number } {
    return { x: c.col * this.tile + this.tile / 2, y: this.gridTop + c.row * this.tile + this.tile / 2 };
  }

  private installDebugHook(): void {
    if (!new URLSearchParams(location.search).has('debug')) return;
    (window as unknown as { __level: unknown }).__level = {
      scene: this,
      input: this.input2,
      layout: this.layout,
      audio,
      state: () => ({
        level: this.level.id,
        mode: this.mode,
        x: this.body2.center.x,
        bottom: this.body2.bottom,
        grounded: this.body2.blocked.down,
        coins: this.coinCount,
        totalCoins: this.coins.length,
        jumps: this.jumps,
        respawns: this.respawns,
        resultArmed: this.result?.isArmed ?? false,
        stars: this.mode === 'result' ? starsFor(true, this.coinCount, this.level.stars) : 0,
        hint: this.hint !== null,
        camX: this.camX,
        fps: this.game.loop.actualFps,
        texture: this.sprite.texture.key,
        spriteHeight: this.sprite.displayHeight,
      }),
    };
  }
}
