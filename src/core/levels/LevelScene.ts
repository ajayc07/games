// Generic level scene: runs any level JSON with any theme and avatar option. Knows nothing about a
// specific universe; the universe passes everything in through LevelSceneData.
import Phaser from 'phaser';
import type { Action, AvatarOptionDef } from '../types';
import { GOAL, goalX, padHeight, arrivalTotalMs, bulbSize, columnSize } from './goal';
import { INPUT_EVENTS, InputManager } from '../input/InputManager';
import { TouchControls } from '../ui/TouchControls';
import { getLayout, type Layout } from '../ui/layout';
import { audio } from '../audio/AudioManager';
import { playChime } from '../audio/chimePlayer';
import type { DemoConfig, LevelData } from './format';
import { extractEntities, findRespawn, mergeSolids, starsFor, type Cell, type GridEntities } from './grid';
import { PHYSICS } from './physics';
import type { LevelTheme } from './theme';
import { OBSTACLE_TEX, makeEffectTextures, makeObstacleTextures, makeThemeTextures, themeKey } from './placeholders';
import { PAD, PadTrigger } from './pads';
import { createLook, lookFromUrl, sizeFromUrl } from '../avatar/createLook';
import { HoldButton } from '../ui/HoldButton';
import { gaitFor } from '../avatar/clips';
import type { LookName } from '../avatar/config';
import { ParallaxBackground } from './background';
import { ResultScreen } from './ResultScreen';
import { Player } from './Player';
import { MotionFx } from './motionFx';
import { DEMO_SKIP_AFTER_MS, createDemo, demoOverrideFrom, shouldPlayDemo, type DemoRunner } from './demo';
import { walkDirection } from './walk';
import { DemoCues, drawFinger } from './demoFx';
import { Blaster, type Shooter } from './Blaster';
import { BubbleField } from './BubbleField';
import { SHOT } from './shots';
import { resolveAvatar } from '../avatar/config';
import type { PracticeMode } from './practice';
import { PracticeRun } from '../practice/PracticeRun';
import { resultHandlerFor, walkAssistOn } from '../practice/practiceResult';

export interface LevelSceneData {
  level: LevelData;
  theme: LevelTheme;
  /** The chosen avatar option (colours, size, antennae, chimes). */
  option: AvatarOptionDef;
  /** Leave the level (win screen Home, and the hold-to-exit icon). */
  onHome: () => void;
  /** Go to the next level in the world (Next button); omitted on a world's last level (D-025). */
  onNext?: () => void;
  /** Asked when the win screen appears (after onResult): is Next allowed now (the next level open)? Default yes. */
  nextAvailable?: () => boolean;
  /** Called at the goal, before the win screen, so progress is kept even if the child quits right away. */
  onResult?: (result: { stars: number; coins: number }) => void;
  /** How the player is drawn; default `?look=` / robot. */
  look?: LookName;
  /** Reopen the avatar picker (small icon on the win screen) until the map has its own button. */
  onPicker?: () => void;
  /** Win screen Replay; default restarts this level. A practice run passes a new layout (a new seed). */
  onReplay?: () => void;
  /** Combo Practice (Task 011): only for levels with `practice: true`. */
  practice?: { mode: PracticeMode; walkAssist: boolean; onPractice: () => void };
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
const DEPTH = { ground: 0, coins: 10, goal: 5, bubbles: 12, ghost: 19, player: 20, shots: 22, popCoins: 26, fx: 30, hint: 40, hud: 900, exit: 950 };
const GHOST_ALPHA = 0.55;
/** Each button gives a gentle "press me" pulse this often until its first press (ms); Left and Right take turns. */
const INVITE_EVERY_MS = 2600;
/** Camera look-ahead turns round only after moving the new way this long (ms), so quick turns do not swing it. */
const LOOK_TURN_MS = 350;
/** The player always stays at least this far inside the safe area (fraction of its width). */
const CAMERA_MARGIN = 0.15;

export class LevelScene extends Phaser.Scene {
  static readonly KEY = 'level';
  /** The tap hint is shown until the very first jump, then never again in this session. */
  private static hintDone = false;
  /** Levels whose demo already played this session (D-024; persistence decides later). */
  private static demoSeen = new Set<string>();

  /** Would this level's "watch me" demo play now (it then always runs on the canonical grid, Task 012)? */
  static demoWillPlay(level: LevelData): boolean {
    return shouldPlayDemo(level.controls.demo, LevelScene.demoSeen.has(level.id), demoOverrideFrom(location.search));
  }

  /** Parent view "Show again" (Task 010): every level's watch-me demo plays once more this session. */
  static forgetDemos(): void {
    LevelScene.demoSeen.clear();
  }

  private data0!: LevelSceneData;
  private level!: LevelData;
  private grid!: GridEntities;
  private tile = 64;
  /** World y of the top of grid row 0 (grid bottom sits on the screen bottom). */
  private gridTop = 0;
  private worldW = 0;
  /** Moving speed: run speed on auto-run levels, walk speed on Left/Right levels (D-029). */
  private moveSpeed: number = PHYSICS.runSpeed;

  private layout!: Layout;
  private input2!: InputManager;
  private touch!: TouchControls;
  private bg!: ParallaxBackground;
  /** How characters are drawn (`?look=`, D-032). */
  private lookName: LookName = 'robot';
  private player!: Player;
  private ghost: Player | null = null;
  private demo: DemoRunner | null = null;
  private demoCues: DemoCues | null = null;
  private demoStartedAt = 0;
  private invite: Phaser.Time.TimerEvent | null = null;
  /** Buttons pressed at least once this run (their "press me" pulses stop). */
  private pressedOnce = new Set<Action>();
  private inviteTick = 0;
  private coins: Coin[] = [];
  private goalX = 0;
  /** y of the pad's top face (where the robot stands once settled) and of the beacon centre. */
  private padTopY = 0;
  private beaconY = 0;
  private beacon!: Phaser.GameObjects.Image;
  private beaconHalo!: Phaser.GameObjects.Image;
  private goalRing!: Phaser.GameObjects.Image;
  private beaconBlink: Phaser.Tweens.Tween | null = null;
  private hud!: { icon: Phaser.GameObjects.Image; count: Phaser.GameObjects.Text };
  private hint: Phaser.GameObjects.Container | null = null;
  private result: ResultScreen | null = null;
  private motionFx!: MotionFx;
  private exitBtn!: HoldButton;
  /** Visual size factor of the player (`?size=`). */
  private size = 1;
  private sparkle!: Phaser.GameObjects.Particles.ParticleEmitter;
  private confetti!: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Shooting (Task 007): the player's and the demo ghost's. Only on levels that enable Power. */
  private blaster: Blaster | null = null;
  private ghostBlaster: Blaster | null = null;
  /** The demo ghost's Power press this frame. */
  private ghostPower = false;
  private bubbles!: BubbleField;
  /** Combo Practice (Task 011): star row, combos, coach and walk assist. Only on practice levels. */
  private practice: PracticeRun | null = null;

  private mode: Mode = 'play';
  private coinCount = 0;
  private respawns = 0;
  private camX = 0;
  private camAnchor = CAMERA_ANCHOR;
  private cameraSnapped = false;
  /** Direction of the camera look-ahead, and how long the actor has moved the other way (ms). */
  private lookDir = 1;
  private lookTurnMs = 0;

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
    this.moveSpeed = data.level.controls.autoRun
      ? (data.level.runSpeed ?? PHYSICS.runSpeed)
      : (data.level.walkSpeed ?? PHYSICS.walkSpeed);
    this.worldW = this.grid.cols * this.tile;
    this.mode = 'play';
    this.coinCount = 0;
    this.respawns = 0;
    this.cameraSnapped = false;
    this.camAnchor = CAMERA_ANCHOR;
    this.lookDir = 1;
    this.lookTurnMs = 0;
    this.ghost = null;
    this.demo = null;
    this.demoCues = null;
    this.invite = null;
    this.pressedOnce = new Set();
    this.inviteTick = 0;
    this.result = null;
    this.hint = null;
    this.coins = [];
    this.pads = [];
    this.blaster = null;
    this.ghostBlaster = null;
    this.ghostPower = false;
    this.practice = null;
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
    const { theme } = this.data0;
    this.layout = getLayout();
    this.gridTop = this.layout.height - this.grid.rows * this.tile;
    makeThemeTextures(this, theme, this.tile);
    makeEffectTextures(this);

    const surfaceY = this.gridTop + (this.grid.start.row + 1) * this.tile;
    this.bg = new ParallaxBackground(this, theme, surfaceY);
    this.buildGround();
    this.buildObstacles();
    this.buildCoins();
    this.buildGoal();
    this.lookName = this.data0.look ?? lookFromUrl();
    this.size = sizeFromUrl();
    this.motionFx = new MotionFx(this, DEPTH.player - 1, this.size);
    this.player = this.makePlayer(DEPTH.player, 1, true);
    this.buildEffects();
    this.bubbles = new BubbleField(this, {
      cells: this.grid.bubbles,
      solid: this.grid.solid,
      tile: this.tile,
      gridTop: this.gridTop,
      coinTexture: themeKey(theme, 'coin'),
      depth: { bubbles: DEPTH.bubbles, coins: DEPTH.popCoins },
      sparkle: this.sparkle,
    });
    if (this.level.controls.enabled.includes('power')) this.blaster = this.makeBlaster();
    this.buildHud();
    // Hold-to-exit (1 s, D-036): hidden during the demo and on the win screen.
    this.exitBtn = new HoldButton(this, () => this.afterStep(this.data0.onHome), DEPTH.exit);
    this.exitBtn.setEnabled(false);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.exitBtn.destroy());

    // Buttons follow the level's controls from the start (the demo presses them), but input is only
    // read in play mode, so taps during the demo do nothing except skip it.
    // Touches on the exit icon never jump or move (also on tap-anywhere levels).
    this.input2 = new InputManager(this, { ignorePointer: (x, y) => this.exitBtn.contains(x, y) });
    this.input2.configure({ enabled: this.level.controls.enabled, tapAnywhereJumps: this.level.controls.tapAnywhereJumps });
    this.touch = new TouchControls(this, this.input2, this.layout);
    this.input2.on(INPUT_EVENTS.MISS, this.onMissTap, this);
    const practice = this.data0.practice;
    if (this.level.practice && practice) {
      this.practice = new PracticeRun(this, {
        mode: practice.mode,
        walkAssist: walkAssistOn(this.level, practice.walkAssist),
        touch: this.touch,
        layout: this.layout,
        coinTexture: themeKey(theme, 'coin'),
        onRowDone: () => this.cheer(),
      });
    }

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
    if (this.mode === 'demo') this.updateDemo(time, dt * 1000);
    else if (this.mode === 'play') this.updatePlay(time, dt * 1000);
    else if (this.mode === 'finish') this.updateFinish();
    this.player.updateAvatar(time, dt);
    this.ghost?.updateAvatar(time, dt);
    this.updateShots(time, dt * 1000);
    this.updatePractice(time);
    this.exitBtn.update(time);
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
    // Step blocks (Task 015) are solid but drawn as their own toy blocks (buildObstacles), not as ground.
    const isBlock = new Set(this.grid.blocks.map((b) => `${b.row}:${b.col}`));
    const kindAt = (row: number, col: number): 'top' | 'fill' | null => {
      if (!solid[row][col] || isBlock.has(`${row}:${col}`)) return null;
      return row > 0 && solid[row - 1][col] && !isBlock.has(`${row - 1}:${col}`) ? 'fill' : 'top';
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

  /** Bounce pads (Task 015): the plate and its spring, the trigger state, and where the plate is. */
  private pads: Array<{ plate: Phaser.GameObjects.Image; spring: Phaser.GameObjects.Image; trigger: PadTrigger; x: number; top: number; width: number }> = [];

  /** Step blocks and bounce pads (Task 015, D-059): generated toy textures, behind the player. */
  private buildObstacles(): void {
    const T = this.tile;
    const { blocks, pads } = this.grid;
    if (blocks.length === 0 && pads.length === 0) return;
    const plateW = Math.round(T * PAD.widthTiles);
    const totalH = T * PAD.heightTiles;
    const plateH = Math.round(totalH * 0.6);
    makeObstacleTextures(this, T, plateW, plateH);
    for (const b of blocks) {
      this.add.image(b.col * T + T / 2, this.gridTop + b.row * T + T / 2, `${OBSTACLE_TEX.block}-${T}`).setDisplaySize(T, T).setDepth(DEPTH.ground + 0.5);
    }
    for (const p of pads) {
      const x = p.col * T + T / 2;
      const groundTop = this.gridTop + (p.row + 1) * T;
      const top = groundTop - totalH;
      const spring = this.add
        .image(x, groundTop - (totalH - plateH) / 2, `${OBSTACLE_TEX.padSpring}-${T}`)
        .setDisplaySize(plateW * 0.5, totalH - plateH + 1)
        .setDepth(DEPTH.goal);
      const plate = this.add.image(x, top + plateH / 2, `${OBSTACLE_TEX.pad}-${T}`).setDisplaySize(plateW, plateH).setDepth(DEPTH.goal + 0.1);
      this.pads.push({ plate, spring, trigger: new PadTrigger(), x, top, width: plateW });
    }
  }

  /** A pad under the player's feet fires: launch, squash the plate, sound and sparkles. Only the real player (not the demo ghost). */
  private updatePads(now: number): void {
    const body = this.player.body;
    for (const pad of this.pads) {
      const fired = pad.trigger.update(
        now,
        { left: body.left, right: body.right, bottom: body.bottom, vy: body.velocity.y },
        { x: pad.x, width: pad.width, top: pad.top },
        this.player.grounded,
      );
      if (!fired) continue;
      this.player.launch(now, PAD.launch);
      audio.play('boing');
      this.sparkle.explode(10, pad.x, pad.top);
      this.tweens.killTweensOf(pad.plate);
      const baseY = pad.plate.y;
      pad.plate.setY(baseY + pad.plate.displayHeight * 0.35);
      this.tweens.add({ targets: pad.plate, y: baseY, duration: PAD.squashMs, ease: 'Back.easeOut' });
    }
  }

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

  /** The charging pad (D-055): slab, glowing ring, post with a blinking beacon, a few slow sparkles. All generated textures. */
  private buildGoal(): void {
    const T = this.tile;
    const theme = this.data0.theme;
    const base = this.gridTop + (this.grid.goal.row + 1) * T;
    this.goalX = goalX(this.grid.goal, T);
    const padH = padHeight(T);
    const padW = GOAL.padTiles.w * T;
    this.padTopY = base - padH;
    const padImg = this.add.image(this.goalX, base + 2, themeKey(theme, 'goal-pad')).setOrigin(0.5, 1).setDisplaySize(padW, padH + 4).setDepth(DEPTH.goal);
    const col = columnSize(T);
    const bulb = bulbSize(T);
    const postX = this.goalX + padW * 0.3;
    this.add.image(postX, base - padH * 0.5, themeKey(theme, 'goal-post')).setOrigin(0.5, 1).setDisplaySize(col.w, col.h).setDepth(DEPTH.goal - 0.1);
    this.beaconY = base - padH * 0.5 - col.h - bulb * 0.3;
    // A faint tall light column from the bulb: the goal can be found above the buttons from far away.
    const light = this.add
      .image(postX, this.beaconY, 'fx-lightcol')
      .setOrigin(0.5, 1)
      .setDisplaySize(GOAL.lightWidthTiles * T, GOAL.lightTiles * T)
      .setTint(theme.goal.beacon)
      .setDepth(DEPTH.goal - 0.6);
    this.tweens.add({ targets: light, alpha: { from: 1, to: 0.55 }, duration: GOAL.lightBreatheMs / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.beaconHalo = this.add.image(postX, this.beaconY, 'fx-dust').setDisplaySize(bulb * 1.7, bulb * 1.7).setTint(theme.goal.beacon).setAlpha(0.3).setBlendMode('ADD').setDepth(DEPTH.goal - 0.05);
    this.beacon = this.add.image(postX, this.beaconY, themeKey(theme, 'goal-beacon')).setDisplaySize(bulb, bulb).setDepth(DEPTH.goal);
    this.beaconBlink = this.tweens.add({ targets: this.beacon, alpha: { from: 1, to: 0.55 }, duration: GOAL.idleBlinkMs / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.beaconHalo, alpha: { from: 0.35, to: 0.05 }, duration: GOAL.idleBlinkMs / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.goalRing = this.add.image(this.goalX, this.padTopY + 8, themeKey(theme, 'goal-ring')).setDisplaySize(T * 2.2, 24).setDepth(DEPTH.goal + 0.1);
    this.tweens.add({ targets: this.goalRing, alpha: { from: 1, to: 0.45 }, scaleX: this.goalRing.scaleX * 1.06, duration: GOAL.idleRingMs / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add
      .particles(this.goalX, this.padTopY, 'fx-sparkle', {
        x: { min: -padW * 0.4, max: padW * 0.4 },
        y: { min: -6, max: 0 },
        speedY: { min: -38, max: -22 },
        speedX: 0,
        lifespan: 1800,
        frequency: 650,
        scale: { start: 0.32, end: 0 },
        alpha: { start: 0.9, end: 0 },
        tint: [theme.goal.glow, 0xffffff],
      })
      .setDepth(DEPTH.goal + 0.2);
    void padImg;
  }

  /** The real player gets dust; the demo ghost does not. */
  private makePlayer(depth: number, alpha: number, dust: boolean): Player {
    const x = this.cellCenter(this.grid.start).x;
    const feet = this.startFeet();
    return new Player(this, {
      x,
      feet,
      look: createLook(this, this.lookName, this.data0.option, x, feet, this.size),
      gait: gaitFor(this.level.controls.autoRun),
      colliders: this.groundBodies,
      depth,
      tile: this.tile,
      alpha,
      speed: this.moveSpeed,
      ramp: !this.level.controls.autoRun,
      // Invisible walls at both ends of the grid (the scenery carries on past them).
      minX: PHYSICS.body.width / 2,
      maxX: this.worldW - PHYSICS.body.width / 2,
      groundAt: this.groundAt,
      fx: dust ? this.motionFx : undefined,
    });
  }

  private makeBlaster(): Blaster {
    return new Blaster(this, resolveAvatar(this.data0.option).palette, DEPTH.shots);
  }

  /** A Player as a Shooter for its Blaster. */
  private shooterOf(p: Player): Shooter {
    return {
      facing: p.facing,
      muzzle: () => p.look.muzzle(),
      shoot: (now) => p.avatar.shoot(now),
    };
  }

  /** Soft walls from big bubbles for an actor this frame (Task 007). */
  private bubbleWalls(p: Player): { minX: number; maxX: number } {
    const b = p.body;
    return this.bubbles.walls({ x: b.center.x, top: b.top, bottom: b.bottom, halfWidth: PHYSICS.body.width / 2 });
  }

  /** World y of the top of the ground under x, at or below `feet`; null over a gap (shadow). */
  private readonly groundAt = (x: number, feet: number): number | null => {
    const T = this.tile;
    const { solid, cols, rows } = this.grid;
    const col = Phaser.Math.Clamp(Math.floor(x / T), 0, cols - 1); // scenery ground continues past both ends
    for (let row = 0; row < rows; row++) {
      const top = this.gridTop + row * T;
      if (solid[row][col] && top >= feet - 4) return top;
    }
    return null;
  };

  private startFeet(): number {
    return this.gridTop + (this.grid.start.row + 1) * this.tile;
  }

  private buildEffects(): void {
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
    this.ghost = this.makePlayer(DEPTH.ghost, GHOST_ALPHA, false);
    this.demo = createDemo(config, this.tile);
    if (this.blaster) this.ghostBlaster = this.makeBlaster();
    this.demoCues = new DemoCues(this, this.touch, this.demo.firstAction);
    this.demoCues.showFinger();
    this.demoStartedAt = this.time.now;
    // Any tap or key after a moment skips the demo.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.trySkipDemo, this);
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.trySkipDemo, this);
  }

  private updateDemo(now: number, dtMs: number): void {
    const ghost = this.ghost!;
    const demo = this.demo!;
    const f = demo.step(now - this.demoStartedAt, ghost.body.center.x);
    // The ghost moves through the same movement and jump code as the player.
    const r = ghost.step(now, { move: f.move, jumpPressed: f.jump, walls: this.bubbleWalls(ghost) }, dtMs);
    this.ghostPower = f.power;
    const cues = this.demoCues!;
    for (const p of f.presses) {
      this.touch.animatePress(p.action, p.holdMs);
      cues.tap(p.action, p.holdMs);
    }
    if (f.presses.length === 0) cues.aim(f.aim);
    if (f.jump && this.level.controls.tapAnywhereJumps) cues.rippleAt(ghost.body.center.x, ghost.body.center.y);
    if (r.jumped) audio.play('jump'); // generic only: the voice belongs to the child's own jumps
    // A timed demo also waits for the ghost to land, so it never fades out mid-jump.
    if ((f.done && (!demo.timed || ghost.grounded)) || ghost.body.top > this.layout.height + 40) this.endDemo();
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
    this.tweens.add({ targets: [ghost.look.root, ghost.avatar.shadow], alpha: 0, duration: 350, onComplete: () => ghost.destroy() });
    this.ghost = null;
    // The demo's shots vanish and the bubbles it popped grow back (its coins never counted).
    this.ghostBlaster?.destroy();
    this.ghostBlaster = null;
    this.ghostPower = false;
    this.bubbles.restore();
    this.demoCues!.hideFinger();
    this.demoCues!.aim(this.demo!.firstAction); // "your turn" pulses the first button the demo pressed
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
    this.exitBtn.setEnabled(true);
    const controls = this.level.controls;
    if (controls.tapAnywhereJumps) {
      if (!LevelScene.hintDone) this.buildHint();
    } else if (this.buttonActions().length > 0) {
      this.invite = this.time.addEvent({ delay: INVITE_EVERY_MS, loop: true, callback: () => this.inviteButtons() });
    }
  }

  /** The buttons this level shows. */
  private buttonActions(): Action[] {
    const c = this.level.controls;
    return c.tapAnywhereJumps ? [] : [...c.enabled];
  }

  /**
   * "Press me" pulses for buttons not yet pressed. One hand at a time: Left and Right take turns, and Jump and Power
   * take turns (Task 009), so at most two buttons pulse together (one per hand), never all four.
   */
  private inviteButtons(): void {
    const waiting = this.buttonActions().filter((a) => !this.pressedOnce.has(a));
    if (waiting.length === 0) {
      this.invite?.remove();
      this.invite = null;
      return;
    }
    const moves = waiting.filter((a) => a === 'left' || a === 'right');
    const acts = waiting.filter((a) => a === 'jump' || a === 'power');
    if (moves.length > 0) this.touch.pulse(moves[this.inviteTick % moves.length], 'invite');
    if (acts.length > 0) this.touch.pulse(acts[this.inviteTick % acts.length], 'invite');
    this.inviteTick++;
  }

  /** A tap that hit no button: the nearest button gives one friendly pulse ("press me"). Never a move or jump. */
  private onMissTap(e: { x: number; y: number }): void {
    if (this.mode !== 'play' && this.mode !== 'respawn') return;
    const near = this.touch.nearest(e.x, e.y);
    if (near) this.touch.pulse(near, 'nudge');
  }

  // ---------- per frame ----------

  private updatePlay(now: number, dtMs: number): void {
    const input = this.input2;
    const controls = this.level.controls;
    // Hold = move, release = stop; both held = stand (D-029). Practice may add the walk assist (Task 011).
    const move = controls.autoRun
      ? 1
      : this.practice
        ? this.practice.move(now, input.isDown('left'), input.isDown('right'))
        : walkDirection(input.isDown('left'), input.isDown('right'));
    for (const a of ['left', 'right', 'jump', 'power'] as const) if (input.justPressed(a)) this.pressedOnce.add(a);
    const pressed = input.justPressed('jump');
    const r = this.player.step(now, { move, jumpPressed: pressed, walls: this.bubbleWalls(this.player) }, dtMs);
    if (r.jumped) this.onJump();

    this.collectCoins();
    this.updatePads(now);

    const body = this.player.body;
    if (body.center.x >= this.goalX - PHYSICS.body.width / 2) this.reachGoal();
    else if (body.top > this.layout.height + 40) this.startRespawn();
  }

  private onJump(): void {
    audio.play('jump'); // the generic jump sound is the only sound on a jump (D-038)
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
      audio.play('coin');
      this.addCoins(1);
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
    }
  }

  /** Counts coins (walked over, or flown in from a popped bubble) and bumps the HUD counter. */
  private addCoins(n: number): void {
    if (n <= 0) return;
    this.coinCount += n;
    this.hud.count.setText(String(this.coinCount));
    this.tweens.killTweensOf(this.hud.count);
    this.hud.count.setScale(1);
    this.tweens.add({ targets: this.hud.count, scale: 1.3, duration: 110, yoyo: true });
  }

  /**
   * Shots and bubbles (Task 007), every frame in every mode, so shots in flight finish their path. Power is read
   * only in play; the ghost shoots from its script. Pops count only for the real player (in play or during the
   * cloud ride); the demo's pops are shown but never counted.
   */
  private updateShots(now: number, dtMs: number): void {
    const chest = (p: Player) => ({ x: p.body.center.x, y: p.body.center.y - 6 });
    if (this.blaster) {
      const input =
        this.mode === 'play' ? { pressed: this.input2.justPressed('power'), held: this.input2.isDown('power') } : { pressed: false, held: false };
      this.blaster.update(now, dtMs, input, this.shooterOf(this.player));
      if (this.mode === 'play' || this.mode === 'respawn') {
        for (const s of this.blaster.flying()) if (this.bubbles.tryHit(s.x, s.y, SHOT.radius, now, true) >= 0) this.blaster.hit(s);
      }
    }
    if (this.ghostBlaster && this.ghost) {
      this.ghostBlaster.update(now, dtMs, { pressed: this.ghostPower, held: false }, this.shooterOf(this.ghost));
      for (const s of this.ghostBlaster.flying()) if (this.bubbles.tryHit(s.x, s.y, SHOT.radius, now, false) >= 0) this.ghostBlaster.hit(s);
      this.ghostPower = false;
    }
    this.bubbles.update(now, chest(this.ghost ?? this.player));
    this.addCoins(this.bubbles.collect(now).counted);
  }

  /** Combo Practice (Task 011): combos and the coach, every frame (combos only count in play). */
  private updatePractice(now: number): void {
    if (!this.practice) return;
    const input = this.input2;
    const playing = this.mode === 'play';
    const b = this.player.body;
    const cam = this.camX;
    this.practice.update({
      now,
      playing,
      left: playing && input.isDown('left'),
      right: playing && input.isDown('right'),
      jump: playing && input.isDown('jump'),
      power: playing && input.isDown('power'),
      jumpPressed: playing && input.justPressed('jump'),
      powerPressed: playing && input.justPressed('power'),
      airborne: !this.player.grounded,
      possible: playing && !this.player.ride && !this.nearGap(b.center.x) && b.center.x < this.goalX - 2 * this.tile,
      facing: this.player.facing,
      avatar: { left: b.left - cam - 30, right: b.right - cam + 30, top: b.top - 40, bottom: b.bottom + 8 },
    });
  }

  /** True within a tile of a gap in the ground under the start row (the coach keeps quiet there). */
  private nearGap(x: number): boolean {
    const row = this.grid.solid[this.grid.start.row + 1];
    if (!row) return false;
    for (let c = Math.floor((x - this.tile) / this.tile); c <= Math.floor((x + this.tile) / this.tile); c++) {
      if (c >= 0 && c < row.length && !row[c]) return true;
    }
    return false;
  }

  /** The fifth combo star (Task 011): the win pose for about a second while the walk goes on. */
  private cheer(): void {
    const look = this.player.look;
    look.trigger('win', this.time.now);
    this.time.delayedCall(1000, () => look.trigger('rest', this.time.now));
  }

  private updateCamera(dt: number): void {
    const safe = this.layout.safeRect;
    const actor = this.ghost ?? this.player;
    const followX = actor.ride ? actor.ride.x : actor.body.center.x;
    // At the finish the character moves to the screen centre, between the result buttons.
    const finished = this.mode === 'finish' || this.mode === 'result';
    // Look-ahead toward where the character is heading. It only turns round after moving the new way
    // for LOOK_TURN_MS, so quick back-and-forth does not swing the view.
    const vx = actor.body.velocity.x;
    const movingOther = Math.abs(vx) > 40 && Math.sign(vx) !== this.lookDir;
    this.lookTurnMs = movingOther ? this.lookTurnMs + dt * 1000 : 0;
    if (this.lookTurnMs >= LOOK_TURN_MS) {
      this.lookDir = -this.lookDir;
      this.lookTurnMs = 0;
    }
    const anchorGoal = finished ? 0.5 : this.lookDir >= 0 ? CAMERA_ANCHOR : 1 - CAMERA_ANCHOR;
    this.camAnchor += (anchorGoal - this.camAnchor) * Math.min(1, dt * 1.6);
    const target = followX - (safe.x + safe.width * this.camAnchor);
    if (!this.cameraSnapped) {
      this.camX = target;
      this.cameraSnapped = true;
    } else {
      this.camX += (target - this.camX) * Math.min(1, dt * 6);
    }
    // Never let the character leave the central safe area, however the smoothing lags.
    if (!finished) {
      const minCam = followX - (safe.x + safe.width * (1 - CAMERA_MARGIN));
      const maxCam = followX - (safe.x + safe.width * CAMERA_MARGIN);
      this.camX = Phaser.Math.Clamp(this.camX, minCam, maxCam);
    }
    const cam = this.cameras.main;
    cam.scrollX = this.camX;
    cam.scrollY = 0;
  }

  // ---------- falling (D-019) ----------

  private startRespawn(): void {
    this.mode = 'respawn';
    this.respawns++;
    this.practice?.cancelLatch(); // the walk assist lets go on a fall (Task 011)
    audio.play('whoosh');
    const player = this.player;
    // Put him back on the side he came from: a fall while walking left over a gap must not carry him across it.
    const dir = player.facing;
    const spot: Cell = findRespawn(this.grid.solid, player.lastGroundedCol, 3, dir) ?? this.grid.start;
    const T = this.tile;
    const target = { x: spot.col * T + T / 2, y: this.gridTop + (spot.row + 1) * T };
    const body = player.body;
    player.halt();
    body.setVelocity(0, 0);
    body.enable = false;
    player.facing = dir; // looks toward the gap he fell into

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

  // ---------- goal pad and result ----------

  private reachGoal(): void {
    this.mode = 'finish';
    this.exitBtn.setEnabled(false);
    this.player.halt();
    this.invite?.remove();
    this.invite = null;
    this.input2.configure({ enabled: [], tapAnywhereJumps: false });
    this.practice?.finish();
    // Coins still flying from popped bubbles land now, so they count for the stars.
    this.addCoins(this.bubbles.flushCoins());
    if (this.hint) {
      this.hint.destroy();
      this.hint = null;
    }
  }

  /** Waits until the player is on the ground, then celebrates once. */
  private updateFinish(): void {
    const player = this.player;
    player.halt();
    if (!player.grounded) return;
    this.mode = 'result';
    this.settleOnPad();
    const stars = starsFor(true, this.coinCount, this.level.stars);
    // Keep progress now, before the win screen, so quitting right after still saves it. Practice saves nothing (Task 011).
    resultHandlerFor(this.level, this.data0.onResult)?.({ stars, coins: this.coinCount });
    const practice = this.practice && this.data0.practice ? { combos: this.practice.combo.total } : undefined;
    this.time.delayedCall(arrivalTotalMs(), () => {
      // A joyful bounce on the spot while the stars fill, ending as the buttons appear.
      player.celebrate(this.time.now, ResultScreen.fillMs(stars, practice));
      const replay = this.data0.onReplay;
      this.result = new ResultScreen(this, this.layout, stars, {
        onReplay: replay ? () => this.afterStep(replay) : () => this.scene.restart(this.data0),
        // Leave after this frame: stopping the scene mid-update would break the rest of the frame.
        onHome: () => this.afterStep(this.data0.onHome),
        onNext:
          this.data0.onNext && (this.data0.nextAvailable?.() ?? true) ? () => this.afterStep(this.data0.onNext!) : undefined,
        onPicker: this.data0.onPicker && (() => this.afterStep(this.data0.onPicker!)),
        onPractice: practice && this.data0.practice ? () => this.afterStep(this.data0.practice!.onPractice) : undefined,
      }, practice);
    });
  }

  /** The robot eases onto the pad centre (feet on the top face), then the pad charges. */
  private settleOnPad(): void {
    const player = this.player;
    const body = player.body;
    const x0 = body.center.x;
    const dx = this.goalX - x0;
    const lift = padHeight(this.tile);
    player.avatar.setDepth(ResultScreen.DEPTH + 0.5); // above the dim layer, below stars and buttons
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: GOAL.settleMs,
      ease: 'Sine.easeOut',
      onUpdate: (tw) => {
        const e = tw.getValue() ?? 0;
        body.reset(x0 + dx * e, body.center.y);
        player.lift = lift * e;
      },
      onComplete: () => this.chargePad(),
    });
  }

  /** The pad lights up: ring pulses, a beam, sparkles, the beacon goes solid; the robot flashes and does its win clip. */
  private chargePad(): void {
    const player = this.player;
    const theme = this.data0.theme;
    const T = this.tile;
    playChime(this.data0.option, 'win'); // the chosen option's own win chime (D-038)
    player.hop(this.time.now);
    this.beaconBlink?.remove();
    this.beaconBlink = null;
    this.beacon.setAlpha(1);
    this.tweens.killTweensOf(this.beaconHalo);
    this.beaconHalo.setAlpha(0.8);
    const bulb = bulbSize(T);
    this.tweens.add({ targets: this.beacon, displayWidth: bulb * 1.25, displayHeight: bulb * 1.25, duration: 200, yoyo: true });
    for (let i = 0; i < GOAL.ringPulses; i++) {
      const ring = this.add.image(this.goalX, this.padTopY + 8, themeKey(theme, 'goal-ring')).setDisplaySize(T * 2.2, 24).setDepth(DEPTH.goal + 0.3).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: ring, scaleX: ring.scaleX * 1.8, scaleY: ring.scaleY * 1.8, alpha: { from: 1, to: 0 }, duration: GOAL.ringPulseMs, delay: i * GOAL.ringPulseMs * 0.8, onComplete: () => ring.destroy() });
    }
    const beamH = GOAL.beamTiles * T;
    const beam = this.add.image(this.goalX, this.padTopY, 'fx-beam').setOrigin(0.5, 1).setDisplaySize(T * 1.4, 1).setTint(theme.goal.glow).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.goal - 0.5);
    this.tweens.add({ targets: beam, displayHeight: beamH, duration: 180, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: beam, alpha: 0, delay: GOAL.beamMs * 0.6, duration: GOAL.beamMs * 0.4, onComplete: () => beam.destroy() });
    this.sparkle.explode(22, this.goalX, this.padTopY - 4);
    // Charge effect on the body: a quick bright flash and a few bolts in the accent colour.
    const accent = resolveAvatar(this.data0.option).palette.accent;
    const cx = player.body.center.x;
    const cy = player.body.center.y;
    const flash = this.add.image(cx, cy, 'fx-dust').setDisplaySize(70, 70).setTint(0xffffff).setBlendMode(Phaser.BlendModes.ADD).setDepth(ResultScreen.DEPTH + 0.6);
    this.tweens.add({ targets: flash, displayWidth: 120, displayHeight: 120, alpha: { from: 0.6, to: 0 }, duration: 260, onComplete: () => flash.destroy() });
    const bolts = this.add
      .particles(cx, cy, 'fx-bolt', { emitting: false, speed: { min: 90, max: 170 }, scale: { start: 0.7, end: 0 }, rotate: { min: -40, max: 40 }, tint: [accent, 0xffffff, theme.goal.beacon], lifespan: 650 })
      .setDepth(ResultScreen.DEPTH + 0.6);
    bolts.explode(7);
    this.time.delayedCall(900, () => bolts.destroy());
    this.confetti.explode(70, this.goalX, this.beaconY);
    this.time.delayedCall(250, () => this.confetti.explode(50, player.body.center.x, player.body.top));
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
    this.exitBtn.layout(l);
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
        grid: this.level.grid,
        mode: this.mode,
        x: this.player.body.center.x,
        bottom: this.player.body.bottom,
        grounded: this.player.grounded,
        coins: this.coinCount,
        totalCoins: this.coins.length + this.bubbles.totalCoins,
        gridCoins: this.coins.length,
        shots: this.blaster && {
          inFlight: this.blaster.cannon.inFlight,
          fired: this.blaster.cannon.fired,
          visible: this.blaster.visibleCount,
          flying: this.blaster.flying().map((s) => ({ x: s.x, y: s.y, dir: s.dir, travelled: s.travelled })),
        },
        ghostShots: this.ghostBlaster && { inFlight: this.ghostBlaster.cannon.inFlight, fired: this.ghostBlaster.cannon.fired },
        bubbles: this.bubbles.state(),
        pops: this.bubbles.pops,
        coinsFlying: this.bubbles.flow.coins.length,
        muzzle: this.player.look.muzzle(),
        jumps: this.player.jumps,
        respawns: this.respawns,
        ghost: this.ghost && { x: this.ghost.body.center.x, jumps: this.ghost.jumps, alpha: this.ghost.look.root.alpha },
        demoPresses: this.demo?.pressed ?? 0,
        vx: this.player.body.velocity.x,
        pressedOnce: [...this.pressedOnce],
        lookDir: this.lookDir,
        playerVisible: this.player.look.root.visible,
        facing: this.player.facing,
        invite: this.invite !== null,
        hasNext: !!this.data0.onNext,
        exit: this.exitBtn.state,
        size: this.size,
        option: this.data0.option.id,
        resultButtons: this.result?.buttons() ?? [],
        resultArmed: this.result?.isArmed ?? false,
        stars: this.mode === 'result' ? starsFor(true, this.coinCount, this.level.stars) : 0,
        resultStars: this.result?.starCounts ?? null,
        practice: this.practice?.debug() ?? null,
        layoutWidth: this.layout.width,
        hint: this.hint !== null,
        camX: this.camX,
        fps: this.game.loop.actualFps,
        look: this.lookName,
        texture: this.player.look.debug().texture,
        avatarHeight: this.player.look.debug().displayHeight,
        ghostTexture: this.ghost?.look.debug().texture ?? null,
      }),
      anim: () => this.player.animState(),
      ghostAnim: () => this.ghost?.animState() ?? null,
    };
  }
}
