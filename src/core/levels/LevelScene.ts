// Generic level scene: runs any level JSON with any theme and character. Knows nothing about a
// specific universe; the universe passes everything in through LevelSceneData.
import Phaser from 'phaser';
import type { CharacterDef } from '../types';
import { INPUT_EVENTS, InputManager } from '../input/InputManager';
import { TouchControls } from '../ui/TouchControls';
import { getLayout, type Layout } from '../ui/layout';
import { audio } from '../audio/AudioManager';
import type { DemoConfig, LevelData } from './format';
import { extractEntities, findRespawn, mergeSolids, starsFor, type Cell, type GridEntities } from './grid';
import { PHYSICS } from './physics';
import type { LevelTheme } from './theme';
import { makeEffectTextures, makeThemeTextures, themeKey } from './placeholders';
import { CharacterLook } from './characterLook';
import { ParallaxBackground } from './background';
import { ResultScreen } from './ResultScreen';
import { Player } from './Player';
import { DEMO_SKIP_AFTER_MS, DemoScript, demoOverrideFrom, shouldPlayDemo } from './demo';
import { DemoCues, drawFinger } from './demoFx';

export interface LevelSceneData {
  level: LevelData;
  theme: LevelTheme;
  character: CharacterDef;
  /** Leave the level (Home button). */
  onHome: () => void;
  /** Go to the next level in the world (Next button); omitted on a world's last level (D-025). */
  onNext?: () => void;
}

/** demo: the ghost shows the control; turn: "your turn" cue; then the real run. */
type Mode = 'demo' | 'turn' | 'play' | 'respawn' | 'finish' | 'result';

interface Coin {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  taken: boolean;
}

const COIN_SIZE = 40;
const COIN_HIT_R = 18;
/** Where the player sits on screen, as a fraction across the safe area (rest is look-ahead). */
const CAMERA_ANCHOR = 0.36;
const DEPTH = { ground: 0, coins: 10, flag: 5, ghost: 19, player: 20, fx: 30, hint: 40, hud: 900 };
const GHOST_ALPHA = 0.55;
/** The Jump button gives a gentle "press me" pulse this often until the first press (ms). */
const INVITE_EVERY_MS = 2600;
/** Delay of the win voice after the win jingle starts (ms). */
const WIN_VOICE_DELAY_MS = 350;

export class LevelScene extends Phaser.Scene {
  static readonly KEY = 'level';
  /** The tap hint is shown until the very first jump, then never again in this session. */
  private static hintDone = false;
  /** Levels whose demo already played this session (D-024; persistence decides later). */
  private static demoSeen = new Set<string>();

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
  private touch!: TouchControls;
  private bg!: ParallaxBackground;
  private look!: CharacterLook;
  private player!: Player;
  private ghost: Player | null = null;
  private demoScript: DemoScript | null = null;
  private demoCues: DemoCues | null = null;
  private demoStartedAt = 0;
  private invite: Phaser.Time.TimerEvent | null = null;
  private firstPress = false;
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
  private camX = 0;
  private camAnchor = CAMERA_ANCHOR;
  private cameraSnapped = false;

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
    this.cameraSnapped = false;
    this.camAnchor = CAMERA_ANCHOR;
    this.ghost = null;
    this.demoScript = null;
    this.demoCues = null;
    this.invite = null;
    this.firstPress = false;
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
    this.look = new CharacterLook(this, character);
    this.player = this.makePlayer(DEPTH.player, 1);
    this.buildEffects();
    this.buildHud();
    audio.registerVoices(character.id, character.sounds);

    // Buttons follow the level's controls from the start (the demo presses them), but input is only
    // read in play mode, so taps during the demo do nothing except skip it.
    this.input2 = new InputManager(this);
    this.input2.configure({ enabled: this.level.controls.enabled, tapAnywhereJumps: this.level.controls.tapAnywhereJumps });
    this.touch = new TouchControls(this, this.input2, this.layout);
    this.input2.on(INPUT_EVENTS.MISS, this.onMissTap, this);

    this.layout.bindToScene(this, (l) => this.relayout(l));
    const demo = this.level.controls.demo;
    if (demo && shouldPlayDemo(demo, LevelScene.demoSeen.has(this.level.id), demoOverrideFrom(location.search))) {
      this.startDemo(demo);
    } else {
      this.startPlay();
    }
    this.installDebugHook();
  }

  override update(time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    if (this.mode === 'demo') this.updateDemo(time);
    else if (this.mode === 'play') this.updatePlay(time);
    else if (this.mode === 'finish') this.updateFinish();
    this.player.updateSprite(time, dt);
    this.ghost?.updateSprite(time, dt);
    this.demoCues?.update();
    this.updateCamera(dt);
    this.bg.update(this.camX, dt);
    if (this.hint) this.hint.setPosition(this.player.body.center.x + 80, this.player.body.bottom - 150);
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

  private makePlayer(depth: number, alpha: number): Player {
    return new Player(this, {
      x: this.cellCenter(this.grid.start).x,
      feet: this.startFeet(),
      look: this.look,
      colliders: this.groundBodies,
      depth,
      tile: this.tile,
      alpha,
    });
  }

  private startFeet(): number {
    return this.gridTop + (this.grid.start.row + 1) * this.tile;
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
    const finger = drawFinger(this).setPosition(14, 10).setAngle(-18);
    this.hint = this.add.container(0, 0, [ring, dot, finger]).setDepth(DEPTH.hint);
    this.tweens.add({ targets: ring, scale: 2.1, alpha: 0, duration: 900, repeat: -1, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: dot, scale: 0.8, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: finger, y: 22, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // ---------- "watch me" demo (D-024) ----------

  private startDemo(config: DemoConfig): void {
    this.mode = 'demo';
    this.player.setPresent(false);
    this.ghost = this.makePlayer(DEPTH.ghost, GHOST_ALPHA);
    this.demoScript = new DemoScript(config, this.tile);
    this.demoCues = new DemoCues(this, this.touch);
    this.demoCues.showFinger();
    this.demoStartedAt = this.time.now;
    // Any tap or key after a moment skips the demo.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.trySkipDemo, this);
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.trySkipDemo, this);
  }

  private updateDemo(now: number): void {
    const ghost = this.ghost!;
    const { jump, done } = this.demoScript!.step(ghost.body.center.x);
    // The ghost always walks right, through the same movement and jump code as the player.
    const r = ghost.step(now, { vx: this.runSpeed, jumpPressed: jump });
    if (jump) {
      this.touch.animatePress('jump');
      this.demoCues!.tap();
      if (this.level.controls.tapAnywhereJumps) this.demoCues!.rippleAt(ghost.body.center.x, ghost.body.center.y);
    }
    if (r.jumped) audio.play('jump'); // generic only: the voice belongs to the child's own jumps
    if (r.landed) this.dust.explode(5, ghost.body.center.x, ghost.body.bottom - 4);
    if (done || ghost.body.top > this.layout.height + 40) this.endDemo();
  }

  private trySkipDemo(): void {
    if (this.mode === 'demo' && this.time.now - this.demoStartedAt >= DEMO_SKIP_AFTER_MS) this.endDemo();
  }

  /** Ghost fades, the camera glides back to the start, "your turn" cue, then the real run. */
  private endDemo(): void {
    if (this.mode !== 'demo') return;
    this.mode = 'turn';
    LevelScene.demoSeen.add(this.level.id);
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.trySkipDemo, this);
    this.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.trySkipDemo, this);
    const ghost = this.ghost!;
    ghost.body.setVelocity(0, 0);
    ghost.body.enable = false;
    this.tweens.add({ targets: ghost.sprite, alpha: 0, duration: 350, onComplete: () => ghost.destroy() });
    this.ghost = null;
    this.demoCues!.hideFinger();
    this.player.setPresent(true);
    this.player.placeAt(this.cellCenter(this.grid.start).x, this.startFeet(), this.time.now);
    this.time.delayedCall(800, () => {
      if (this.mode !== 'turn') return;
      audio.play('yourTurn');
      const b = this.player.body;
      this.demoCues!.yourTurn(b.center.x, b.bottom, b.bottom - 120, () => {
        if (this.mode === 'turn') this.startPlay();
      });
    });
  }

  // ---------- play ----------

  private startPlay(): void {
    this.mode = 'play';
    this.demoCues = null;
    const controls = this.level.controls;
    if (controls.tapAnywhereJumps) {
      if (!LevelScene.hintDone) this.buildHint();
    } else if (controls.enabled.includes('jump')) {
      this.invite = this.time.addEvent({ delay: INVITE_EVERY_MS, loop: true, callback: () => this.touch.pulse('jump', 'invite') });
    }
  }

  /** A tap that hit no button: the Jump button gives one friendly pulse ("press me"). Never a jump. */
  private onMissTap(): void {
    if (this.mode === 'play' || this.mode === 'respawn') this.touch.pulse('jump', 'nudge');
  }

  // ---------- per frame ----------

  private updatePlay(now: number): void {
    const input = this.input2;
    const controls = this.level.controls;
    const vx = controls.autoRun
      ? this.runSpeed
      : ((input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0)) * this.runSpeed;
    const pressed = input.justPressed('jump');
    if (pressed && !this.firstPress) {
      this.firstPress = true;
      this.invite?.remove();
      this.invite = null;
    }
    const r = this.player.step(now, { vx, jumpPressed: pressed });
    if (r.jumped) this.onJump();
    if (r.landed) this.dust.explode(7, this.player.body.center.x, this.player.body.bottom - 4);

    this.collectCoins();

    const body = this.player.body;
    if (body.center.x >= this.flagX - PHYSICS.body.width / 2) this.reachFlag();
    else if (body.top > this.layout.height + 40) this.startRespawn();
  }

  private onJump(): void {
    audio.play('jump'); // the generic sound always plays
    audio.playVoice(this.data0.character.id, 'jump'); // the voice at most once per 1.5 s (D-023)
    if (this.hint) {
      LevelScene.hintDone = true;
      const h = this.hint;
      this.hint = null;
      this.tweens.killTweensOf(h.list);
      this.tweens.add({ targets: h, alpha: 0, scale: 1.4, duration: 200, onComplete: () => h.destroy() });
    }
  }

  private collectCoins(): void {
    const b = this.player.body;
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

  private updateCamera(dt: number): void {
    const safe = this.layout.safeRect;
    const actor = this.ghost ?? this.player;
    const followX = actor.ride ? actor.ride.x : actor.body.center.x;
    // At the finish the character moves to the screen centre, between the result buttons.
    const finished = this.mode === 'finish' || this.mode === 'result';
    const anchorGoal = finished ? 0.5 : actor.facing >= 0 ? CAMERA_ANCHOR : 1 - CAMERA_ANCHOR;
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
    const player = this.player;
    const spot: Cell = findRespawn(this.grid.solid, player.lastGroundedCol) ?? this.grid.start;
    const T = this.tile;
    const target = { x: spot.col * T + T / 2, y: this.gridTop + (spot.row + 1) * T };
    const body = player.body;
    body.setVelocity(0, 0);
    body.enable = false;
    player.facing = 1;

    // The player rides a little cloud: up out of the gap, across, and gently down onto safe ground.
    const H = this.layout.height;
    const ride = { x: body.center.x, y: H + 60 };
    player.ride = ride;
    const cloud = this.add.image(ride.x, ride.y, themeKey(this.data0.theme, 'cloud')).setDisplaySize(120, 60);
    cloud.setDepth(DEPTH.player + 1);
    const follow = () => cloud.setPosition(ride.x, ride.y + 18);
    const hover = target.y - 70;
    this.tweens.chain({
      targets: ride,
      tweens: [
        { y: H - 200, duration: 450, ease: 'Sine.easeOut', onUpdate: follow },
        { x: target.x, y: hover, duration: 900, ease: 'Sine.easeInOut', onUpdate: follow },
        { y: target.y, duration: 300, ease: 'Sine.easeIn', onUpdate: follow },
      ],
      onComplete: () => {
        player.placeAt(target.x, target.y, this.time.now);
        player.ride = null;
        this.mode = 'play';
        this.tweens.add({ targets: cloud, y: cloud.y + 30, alpha: 0, duration: 400, onComplete: () => cloud.destroy() });
      },
    });
  }

  // ---------- flag and result ----------

  private reachFlag(): void {
    this.mode = 'finish';
    this.player.body.setVelocityX(0);
    this.invite?.remove();
    this.invite = null;
    this.input2.configure({ enabled: [], tapAnywhereJumps: false });
    if (this.hint) {
      this.hint.destroy();
      this.hint = null;
    }
  }

  /** Waits until the player is on the ground, then celebrates once. */
  private updateFinish(): void {
    const player = this.player;
    player.body.setVelocityX(0);
    if (!player.grounded) return;
    this.mode = 'result';
    audio.play('win');
    const charId = this.data0.character.id;
    this.time.delayedCall(WIN_VOICE_DELAY_MS, () => audio.playVoice(charId, 'win'));
    player.sprite.setDepth(ResultScreen.DEPTH + 0.5); // above the dim layer, below stars and buttons
    player.hop();
    this.confetti.explode(70, this.flagX, this.flagTopY + 20);
    this.time.delayedCall(250, () => this.confetti.explode(50, player.body.center.x, player.body.top));
    this.tweens.add({ targets: this.flagCloth, angle: { from: -8, to: 8 }, duration: 160, yoyo: true, repeat: 3 });
    const stars = starsFor(true, this.coinCount, this.level.stars);
    this.time.delayedCall(1100, () => {
      this.result = new ResultScreen(this, this.layout, stars, {
        onReplay: () => this.scene.restart(this.data0),
        // Leave after this frame: stopping the scene mid-update would break the rest of the frame.
        onHome: () => this.afterStep(this.data0.onHome),
        onNext: this.data0.onNext && (() => this.afterStep(this.data0.onNext!)),
      });
    });
  }

  private afterStep(fn: () => void): void {
    this.game.events.once(Phaser.Core.Events.POST_STEP, fn);
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
      controls: this.touch,
      state: () => ({
        level: this.level.id,
        mode: this.mode,
        x: this.player.body.center.x,
        bottom: this.player.body.bottom,
        grounded: this.player.grounded,
        coins: this.coinCount,
        totalCoins: this.coins.length,
        jumps: this.player.jumps,
        respawns: this.respawns,
        ghost: this.ghost && { x: this.ghost.body.center.x, jumps: this.ghost.jumps, alpha: this.ghost.sprite.alpha },
        demoPresses: this.demoScript?.pressed ?? 0,
        playerVisible: this.player.sprite.visible,
        pose: this.player.pose,
        flipX: Math.sign(this.player.sprite.scaleX),
        facing: this.player.facing,
        invite: this.invite !== null,
        hasNext: !!this.data0.onNext,
        resultArmed: this.result?.isArmed ?? false,
        stars: this.mode === 'result' ? starsFor(true, this.coinCount, this.level.stars) : 0,
        hint: this.hint !== null,
        camX: this.camX,
        fps: this.game.loop.actualFps,
        texture: this.player.sprite.texture.key,
        spriteHeight: this.player.sprite.displayHeight,
        ghostTexture: this.ghost?.sprite.texture.key ?? null,
      }),
    };
  }
}
