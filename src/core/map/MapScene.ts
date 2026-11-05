// World map (D-036, Task 006): one world as a horizontal, scrollable map with a winding path and one dot per
// level. Each dot shows 3 star slots; locked dots sit under a cloud; the avatar stands on the current dot.
// Tap an open dot: the avatar hops there, a big play icon pops, then the level starts. Tap a locked dot or a
// teaser signpost: its cloud bumps softly. After a level: the new stars fill in, newly opened clouds clear with
// sparkles, and the avatar hops on to the next dot. Keys: Left/Right hop between open dots, Enter/Space play.
// Generic: the universe passes the world, the dot states, the theme and the avatar; no text anywhere.
import Phaser from 'phaser';
import type { AvatarOptionDef } from '../types';
import type { LookName } from '../avatar/config';
import { getLayout, type Layout } from '../ui/layout';
import { audio } from '../audio/AudioManager';
import { AvatarDriver } from '../avatar/AvatarDriver';
import { createLook, sizeFromUrl } from '../avatar/createLook';
import type { LevelTheme } from '../levels/theme';
import { makeEffectTextures, makeThemeTextures, themeKey } from '../levels/placeholders';
import { ParallaxBackground } from '../levels/background';
import { makePaletteButton, starPath } from '../ui/icons';
import { HoldButton } from '../ui/HoldButton';
import { PARENT_HOLD_MS } from '../ui/hold';
import { clampScroll, farHopMs, hitIndex, hopPoint, MAP, mapGeometry, scrollFor, type MapGeometry, type MapPoint } from './mapLayout';
import { currentDot, newlyOpened, stepOpen, type DotState } from './unlock';
import { addPracticeBadge, addRestBadge, addZenBadge } from '../practice/icons';
import { MAP_PRACTICE, mapPracticeSpot, mapStickerSpot, mapZenSpot } from '../practice/practiceLayout';
import { addStickerBadge } from '../rewards/stickerArt';

export type TeaserIcon = 'cave' | 'sky' | 'castle';

/** A branch off this map (Task 037, D-085): a big mouth above the path just after dot `afterIndex`. */
export interface BranchSpec {
  worldId: string;
  /** The dot the path forks after. */
  afterIndex: number;
  /** Open now; a closed one is covered by a boulder that only shakes when tapped. */
  open: boolean;
  /** Open before the result just played (so a boulder that was there rolls away in the arrival animation). */
  wasOpen?: boolean;
  /** Stars earned in that world and the most it can give (for later crowns, Tasks 038-040). */
  stars?: { stars: number; max: number };
  /** He has beaten that world's boss (Task 040): the mouth wears a gold crown. */
  crowned?: boolean;
}

export interface MapSceneData {
  theme: LevelTheme;
  dots: DotState[];
  /** Cloud-covered signposts for the worlds still to come. */
  teasers: TeaserIcon[];
  option: AvatarOptionDef;
  look: LookName;
  /** Just back from a level: the dot states before its result, and which dot it was (for the animation). */
  arrival?: { before: DotState[]; from: number };
  onPlay: (levelId: string) => void;
  onPicker: () => void;
  /** The parent view (Task 010): opened by holding the gear for PARENT_HOLD_MS. Without it there is no gear. */
  onParent?: () => void;
  /** Combo Practice (Task 011): a fixed button (bottom-right) opens the practice selector. Always open. */
  onPractice?: () => void;
  /** The endless zen level (Task 020): a second fixed button, left of Practice. Always open. */
  onZen?: () => void;
  /** The sticker book (Task 031): a third fixed button, left of Zen. */
  onStickers?: () => void;
  /** Today's zen time is used up (Task 033): the Zen button shows a sleeping moon and does not open. */
  zenLocked?: boolean;
  /** Branches off this map (Task 037) and what to do when an open mouth is tapped (the universe switches to that world's map). */
  branches?: BranchSpec[];
  onBranch?: (worldId: string) => void;
  /** A branch map: a meadow arch at the left end that goes back to the map this one branches from. */
  onBack?: () => void;
  /** Arrived through a mouth or an arch: fade in from the dark. */
  fadeIn?: boolean;
  /** This world's boss is beaten (Task 040): a gold crown sits over the last dot of the path. */
  crowned?: boolean;
  /** Stand on this dot instead of the current one (coming back through the arch, he stands at the fork). */
  startAt?: number;
}

interface MouthView {
  root: Phaser.GameObjects.Container;
  halo: Phaser.GameObjects.Image | null;
  boulder: Phaser.GameObjects.Container | null;
}

interface DotView {
  root: Phaser.GameObjects.Container;
  stars: Phaser.GameObjects.Graphics[];
  cloud: Phaser.GameObjects.Image | null;
}

/** The dark a world change fades through. */
const FADE_RGB = [4, 10, 30] as const;
const DEPTH = { path: 1, dots: 2, avatar: 5, cloud: 6, fx: 7, ui: 20 };
const PALETTE_R = 56;
const DRAG_PX = 14;
const STAR_R = 15;
const STAR_SPOTS = [
  { x: -34, y: 52 },
  { x: 0, y: 60 },
  { x: 34, y: 52 },
];
const KEY_DIRS: Record<string, 1 | -1> = { ArrowLeft: -1, ArrowRight: 1, KeyA: -1, KeyD: 1 };

export class MapScene extends Phaser.Scene {
  static readonly KEY = 'map';

  private data0!: MapSceneData;
  private layout!: Layout;
  private geo!: MapGeometry;
  private world!: Phaser.GameObjects.Container;
  private bg!: ParallaxBackground;
  private dotViews: DotView[] = [];
  private teaserViews: Phaser.GameObjects.Container[] = [];
  private mouthViews: MouthView[] = [];
  private backView: Phaser.GameObjects.Container | null = null;
  private palette!: Phaser.GameObjects.Container;
  private gear: HoldButton | null = null;
  /** The Practice button (Task 011), screen-fixed bottom-right; its face bobs inside it. */
  private practiceBtn: Phaser.GameObjects.Container | null = null;
  private practiceFace: Phaser.GameObjects.Container | null = null;
  private zenBtn: Phaser.GameObjects.Container | null = null;
  private zenFace: Phaser.GameObjects.Container | null = null;
  private stickerBtn: Phaser.GameObjects.Container | null = null;
  private stickerFace: Phaser.GameObjects.Container | null = null;
  private driver!: AvatarDriver;
  private sparkle!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dots: DotState[] = [];
  /** Dot the avatar stands on (or is hopping to). */
  private at = 0;
  private pos: MapPoint = { x: 0, y: 0 };
  private lift = 0;
  private vy = 0;
  private hop: { from: MapPoint; to: MapPoint; startedAt: number; ms?: number; then: () => void } | null = null;
  private facing: 1 | -1 = 1;
  private scroll = 0;
  private scrollTarget = 0;
  private drag: { x0: number; scroll0: number; moved: boolean; id: number } | null = null;
  private busy = false;
  private leaving = false;
  private seenKeys = new WeakSet<KeyboardEvent>();
  private phase = 'idle';

  constructor() {
    super(MapScene.KEY);
  }

  init(data: MapSceneData): void {
    this.data0 = data;
    this.dots = data.dots;
    this.dotViews = [];
    this.teaserViews = [];
    this.mouthViews = [];
    this.backView = null;
    this.hop = null;
    this.drag = null;
    this.busy = !!data.arrival;
    this.leaving = false;
    this.lift = 0;
    this.vy = 0;
    this.seenKeys = new WeakSet();
    this.phase = data.arrival ? 'arrival' : 'idle';
  }

  create(): void {
    const { theme } = this.data0;
    this.layout = getLayout();
    makeThemeTextures(this, theme, 64);
    makeEffectTextures(this);
    this.geo = mapGeometry(this.dots.length, this.data0.teasers.length, { branchAfter: (this.data0.branches ?? []).map((b) => b.afterIndex), back: !!this.data0.onBack });
    this.bg = new ParallaxBackground(this, theme, MAP.groundY);
    this.buildGround();
    this.world = this.add.container(0, 0);
    this.buildPath();

    // Before the arrival animation, show the dots as they were before the level's result.
    const shown = this.data0.arrival?.before ?? this.dots;
    shown.forEach((d, i) => this.dotViews.push(this.makeDot(i, d)));
    if (this.data0.crowned && this.dotViews.length > 0) {
      const last = this.geo.dots[this.dotViews.length - 1];
      const cg = this.add.graphics().setPosition(last.x, last.y - 96).setDepth(DEPTH.dots + 1);
      drawCrown(cg, 0, 0, 1.7);
      this.world.add(cg);
      this.tweens.add({ targets: cg, y: cg.y - 8, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.data0.teasers.forEach((icon, i) => this.teaserViews.push(this.makeTeaser(i, icon)));
    (this.data0.branches ?? []).forEach((b, i) => this.mouthViews.push(this.makeMouth(i, b)));
    if (this.data0.onBack && this.geo.back) this.backView = this.makeBackArch(this.geo.back);

    this.at = this.data0.arrival ? this.data0.arrival.from : this.data0.startAt !== undefined && this.dots[this.data0.startAt] ? this.data0.startAt : currentDot(this.dots);
    this.pos = { ...this.geo.dots[this.at] };
    const look = createLook(this, this.data0.look, this.data0.option, this.pos.x, this.pos.y, sizeFromUrl());
    this.driver = new AvatarDriver(this, { look, x: this.pos.x, feet: this.pos.y, depth: DEPTH.avatar, refSpeed: 200, gait: 'walk', groundAt: () => this.pos.y });
    this.world.add([this.driver.shadow, look.root]);
    this.sparkle = this.add.particles(0, 0, 'fx-sparkle', {
      emitting: false,
      speed: { min: 120, max: 340 },
      scale: { start: 1.3, end: 0 },
      rotate: { min: 0, max: 180 },
      tint: [0xffffff, 0xfff176, 0xffd54f, 0x80deea],
      lifespan: 800,
    });
    this.world.add(this.sparkle);

    this.palette = makePaletteButton(this, PALETTE_R, () => this.openPicker()).setDepth(DEPTH.ui);
    this.gear = null;
    if (this.data0.onParent) {
      // Top-left, far from the palette button and the dots; a 3 s hold (visible ring) or P held 3 s on a keyboard.
      this.gear = new HoldButton(this, () => this.openParent(), DEPTH.ui, { holdMs: PARENT_HOLD_MS, icon: 'gear', corner: 'top-left', inset: 84, key: 'KeyP', color: 0x6d6258 });
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.gear?.destroy());
    }
    this.practiceBtn = null;
    this.practiceFace = null;
    this.zenBtn = null;
    this.zenFace = null;
    this.stickerBtn = null;
    this.stickerFace = null;
    if (this.data0.onStickers) {
      const face = this.add.container(0, 0);
      addStickerBadge(this, face, MAP_PRACTICE.r);
      const btn = this.add.container(0, 0, [face]).setDepth(DEPTH.ui).setSize(MAP_PRACTICE.hit, MAP_PRACTICE.hit);
      btn.setInteractive({ useHandCursor: true }).on(Phaser.Input.Events.POINTER_DOWN, () => this.openStickers());
      this.tweens.add({ targets: face, y: -MAP_PRACTICE.bob, duration: MAP_PRACTICE.bobMs / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 800 });
      this.stickerBtn = btn;
      this.stickerFace = face;
    }
    if (this.data0.onZen) {
      const face = this.add.container(0, 0);
      if (this.data0.zenLocked) addRestBadge(this, face, MAP_PRACTICE.r);
      else addZenBadge(this, face, MAP_PRACTICE.r);
      const btn = this.add.container(0, 0, [face]).setDepth(DEPTH.ui).setSize(MAP_PRACTICE.hit, MAP_PRACTICE.hit);
      btn.setInteractive({ useHandCursor: true }).on(Phaser.Input.Events.POINTER_DOWN, () => this.openZen());
      // Out of step with the Practice button's bob.
      this.tweens.add({ targets: face, y: -MAP_PRACTICE.bob, duration: MAP_PRACTICE.bobMs / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 400 });
      this.zenBtn = btn;
      this.zenFace = face;
    }
    if (this.data0.onPractice) {
      // Bottom-right, below the dots and their stars, far from the gear (top-left) and the palette (top-right).
      const face = this.add.container(0, 0);
      addPracticeBadge(this, face, MAP_PRACTICE.r);
      const btn = this.add.container(0, 0, [face]).setDepth(DEPTH.ui).setSize(MAP_PRACTICE.hit, MAP_PRACTICE.hit);
      btn.setInteractive({ useHandCursor: true }).on(Phaser.Input.Events.POINTER_DOWN, () => this.openPractice());
      this.tweens.add({ targets: face, y: -MAP_PRACTICE.bob, duration: MAP_PRACTICE.bobMs / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.practiceBtn = btn;
      this.practiceFace = face;
    }

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.onKey, this);
    this.layout.bindToScene(this, (l) => this.relayout(l));
    this.scroll = this.scrollTarget = scrollFor(this.geo.width, this.layout.width, this.pos.x);
    this.world.x = -this.scroll;
    if (this.data0.fadeIn) this.cameras.main.fadeIn(450, ...FADE_RGB);
    if (this.data0.arrival) this.playArrival(this.data0.arrival);
    this.installDebugHook();
  }

  override update(time: number, delta: number): void {
    this.gear?.update(time);
    const dtMs = Math.min(delta, 50);
    // Hop along the path.
    let grounded = true;
    if (this.hop) {
      const h = this.hop;
      const t = (time - h.startedAt) / (h.ms ?? MAP.hopMs);
      const p = hopPoint(h.from, h.to, t);
      const prevLift = this.lift;
      this.pos = { x: p.x, y: p.y };
      this.lift = p.lift;
      this.vy = ((prevLift - this.lift) / Math.max(1, dtMs)) * 1000;
      grounded = false;
      if (t >= 1) {
        this.hop = null;
        this.lift = 0;
        this.vy = 0;
        grounded = true;
        this.driver.land(time, this.pos.x, this.pos.y);
        h.then();
      }
    }
    this.driver.update({
      time,
      dtMs,
      x: this.pos.x,
      bottom: this.pos.y - this.lift,
      vx: this.hop ? 200 * this.facing : 0,
      vy: this.vy,
      onGround: grounded,
      enabled: true,
      airborneMs: 0,
      jumped: !grounded,
      ride: null,
      facing: this.facing,
    });
    // Ease the scroll toward its target (follows the avatar unless the child is dragging).
    if (!this.drag?.moved) {
      if (this.hop) this.scrollTarget = scrollFor(this.geo.width, this.layout.width, this.pos.x);
      this.scroll += (this.scrollTarget - this.scroll) * Math.min(1, dtMs / 180);
    }
    this.world.x = -Math.round(this.scroll);
    this.bg.update(this.scroll, dtMs / 1000);
  }

  // ---------- building ----------

  private buildGround(): void {
    const g = this.add.graphics().setScrollFactor(0).setDepth(-50);
    const { ground } = this.data0.theme;
    this.events.on('map-layout', (l: Layout) => {
      g.clear();
      g.fillStyle(ground.dirt, 1).fillRect(0, MAP.groundY + 22, l.width, l.height - MAP.groundY);
      g.fillStyle(ground.grass, 1).fillRect(0, MAP.groundY, l.width, 26);
      g.fillStyle(ground.grassDark, 1).fillRect(0, MAP.groundY + 22, l.width, 6);
    });
  }

  private buildPath(): void {
    const pts = [...this.geo.dots, ...this.geo.teasers.map((t) => ({ x: t.x, y: t.y + 40 }))];
    if (pts.length < 2) return;
    const curve = new Phaser.Curves.Spline([pts[0].x - 120, pts[0].y + 30, ...pts.flatMap((p) => [p.x, p.y]), pts[pts.length - 1].x + 120, pts[pts.length - 1].y]);
    const g = this.add.graphics().setDepth(DEPTH.path);
    const lastDotT = this.geo.teasers.length > 0 ? (this.geo.dots.length + 0.5) / (pts.length + 1) : 1;
    const samples = curve.getSpacedPoints(Math.ceil(this.geo.width / 6));
    // Solid sandy path through the levels, then dotted stepping stones toward the teasers.
    for (const [w, col] of [
      [34, 0xb98a4b],
      [24, 0xf3d9a4],
    ] as const) {
      g.lineStyle(w, col, 1);
      g.beginPath();
      samples.forEach((p, i) => {
        if (i / samples.length > lastDotT) return;
        if (i === 0) g.moveTo(p.x, p.y);
        else g.lineTo(p.x, p.y);
      });
      g.strokePath();
    }
    samples.forEach((p, i) => {
      if (i / samples.length <= lastDotT || i % 6 !== 0) return;
      g.fillStyle(0xb98a4b, 1).fillCircle(p.x, p.y, 11);
      g.fillStyle(0xf3d9a4, 1).fillCircle(p.x, p.y, 8);
    });
    // The short side paths: from the fork dot up to each mouth, and from the way-back arch down to the first dot.
    const side: Array<[MapPoint, MapPoint, number]> = [];
    this.geo.branches.forEach((m, i) => side.push([this.geo.dots[this.data0.branches![i].afterIndex], { x: m.x, y: m.y + MAP.mouthH / 2 - 4 }, 1]));
    if (this.geo.back && this.geo.dots.length > 0) side.push([this.geo.dots[0], { x: this.geo.back.x, y: this.geo.back.y + MAP.mouthH / 2 - 4 }, -1]);
    for (const [from, to, dir] of side) {
      const c = new Phaser.Curves.Spline([from.x, from.y, (from.x + to.x) / 2 + dir * 10, (from.y + to.y) / 2 + 24, to.x, to.y]);
      const pts2 = c.getSpacedPoints(24);
      for (const [w, col] of [
        [34, 0xb98a4b],
        [24, 0xf3d9a4],
      ] as const) {
        g.lineStyle(w, col, 1);
        g.beginPath();
        pts2.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
        g.strokePath();
      }
    }
    this.world.add(g);
  }

  private makeDot(i: number, d: DotState): DotView {
    const p = this.geo.dots[i];
    const g = this.add.graphics();
    this.drawPad(g, d);
    const stars = STAR_SPOTS.map((s, k) => {
      const sg = this.add.graphics().setPosition(s.x, s.y);
      this.drawStar(sg, k < d.stars);
      return sg;
    });
    const root = this.add.container(p.x, p.y, [g, ...stars]).setDepth(DEPTH.dots);
    root.setData('pad', g);
    this.world.add(root);
    let cloud: Phaser.GameObjects.Image | null = null;
    if (!d.open) {
      cloud = this.add.image(p.x, p.y - 10, themeKey(this.data0.theme, 'cloud')).setDisplaySize(200, 110).setDepth(DEPTH.cloud);
      this.world.add(cloud);
    }
    for (const s of stars) s.setVisible(d.open);
    return { root, stars, cloud };
  }

  /** A round pad on the path: orange when open, green when cleared, grey when locked. */
  private drawPad(g: Phaser.GameObjects.Graphics, d: DotState): void {
    const R = MAP.dotR;
    const top = d.cleared ? 0x66bb6a : d.open ? 0xffb300 : 0xb0bec5;
    const side = d.cleared ? 0x2e7d32 : d.open ? 0xe65100 : 0x78909c;
    g.clear();
    g.fillStyle(0x000000, 0.15).fillEllipse(0, 22, R * 2.2, R * 0.9);
    g.fillStyle(side, 1).fillEllipse(0, 10, R * 2, R * 1.05);
    g.fillStyle(top, 1).fillEllipse(0, 0, R * 2, R * 1.05);
    g.lineStyle(5, 0xffffff, 1).strokeEllipse(0, 0, R * 2, R * 1.05);
    g.fillStyle(0xffffff, 0.35).fillEllipse(-R * 0.25, -R * 0.18, R * 0.9, R * 0.3);
  }

  private drawStar(g: Phaser.GameObjects.Graphics, filled: boolean): void {
    const pts = starPath(STAR_R).map((p) => new Phaser.Math.Vector2(p.x, p.y));
    g.clear();
    if (filled) g.fillStyle(0xffd600, 1).lineStyle(4, 0xff8f00, 1);
    else g.fillStyle(0xffffff, 0.45).lineStyle(4, 0xffffff, 1);
    g.fillPoints(pts, true).strokePoints(pts, true);
  }

  /** A big rock arch with glowing crystals (Task 037), about twice a dot; covered by a boulder while locked. */
  private makeMouth(i: number, b: BranchSpec): MouthView {
    const p = this.geo.branches[i];
    const g = this.add.graphics();
    const W = MAP.mouthW / 2;
    const H = MAP.mouthH / 2;
    g.fillStyle(0x000000, 0.2).fillEllipse(0, H - 2, MAP.mouthW + 20, 26);
    g.fillStyle(0x56627f, 1).fillRoundedRect(-W, -H, MAP.mouthW, MAP.mouthH - 8, { tl: W, tr: W, bl: 16, br: 16 });
    g.lineStyle(6, 0x2c3552, 1).strokeRoundedRect(-W, -H, MAP.mouthW, MAP.mouthH - 8, { tl: W, tr: W, bl: 16, br: 16 });
    g.fillStyle(0x7a88a8, 0.7).fillEllipse(-W * 0.45, -H * 0.62, W * 0.7, H * 0.22);
    g.fillStyle(0x07102a, 1).fillRoundedRect(-62, -48, 124, H + 46 - 6, { tl: 62, tr: 62, bl: 0, br: 0 });
    g.fillStyle(0x16508a, 0.85).fillRoundedRect(-42, 4, 84, H - 12 - 6, { tl: 42, tr: 42, bl: 0, br: 0 });
    g.fillStyle(0x6fe0ff, 0.5).fillRoundedRect(-24, 40, 48, H - 46, { tl: 24, tr: 24, bl: 0, br: 0 });
    // Crystals around the arch (pastel, with a white glint), so it reads as the glowing Cave from far away.
    const crystals: Array<[number, number, number, number, number]> = [
      [-92, -52, 20, 56, 0x8ff0ff],
      [-70, -92, 18, 52, 0xc9a8ff],
      [-14, -112, 22, 62, 0xff9fd8],
      [44, -100, 18, 54, 0x8ff0ff],
      [86, -58, 20, 58, 0xc9a8ff],
      [-W - 6, 54, 18, 48, 0xff9fd8],
      [W + 6, 50, 18, 52, 0x8ff0ff],
    ];
    for (const [x, y, hw, len, col] of crystals) {
      g.fillStyle(col, 1).fillTriangle(x - hw, y + len * 0.5, x + hw, y + len * 0.5, x, y - len * 0.5);
      g.fillStyle(0xffffff, 0.45).fillTriangle(x - hw * 0.1, y + len * 0.5, x - hw, y + len * 0.5, x, y - len * 0.5);
      g.lineStyle(3, 0x2c3552, 1).strokeTriangle(x - hw, y + len * 0.5, x + hw, y + len * 0.5, x, y - len * 0.5);
    }
    if (b.crowned) drawCrown(g, 0, -H - 26, 1.5);
    const root = this.add.container(p.x, p.y, [g]).setDepth(DEPTH.dots);
    let halo: Phaser.GameObjects.Image | null = null;
    const lockedAtFirst = !b.open || b.wasOpen === false;
    if (b.open) {
      // A soft cyan glow behind the arch that breathes, so he notices it (it comes on when the boulder rolls away if it was locked).
      halo = this.add.image(0, 8, 'fx-glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x7fe8ff).setDisplaySize(330, 300).setAlpha(lockedAtFirst ? 0 : 0.4);
      root.addAt(halo, 0);
      if (!lockedAtFirst) this.tweens.add({ targets: halo, alpha: 0.18, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.world.add(root);
    let boulder: Phaser.GameObjects.Container | null = null;
    if (lockedAtFirst) {
      const bg = this.add.graphics();
      bg.fillStyle(0x000000, 0.2).fillEllipse(6, 70, 170, 24);
      bg.fillStyle(0x8a8478, 1).fillCircle(0, 0, 78);
      bg.lineStyle(7, 0x5a554c, 1).strokeCircle(0, 0, 78);
      bg.fillStyle(0xa59f92, 1).fillEllipse(-22, -28, 70, 40);
      bg.lineStyle(5, 0x5a554c, 1).lineBetween(-10, -20, 6, 6).lineBetween(6, 6, -6, 28).lineBetween(6, 6, 30, 14);
      boulder = this.add.container(p.x, p.y + 38, [bg]).setDepth(DEPTH.cloud);
      this.world.add(boulder);
    }
    return { root, halo, boulder };
  }

  /** The meadow arch on a branch map (Task 037): a green arch with a sunny opening and flowers; it goes back. */
  private makeBackArch(p: MapPoint): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    const W = MAP.mouthW / 2;
    const H = MAP.mouthH / 2;
    g.fillStyle(0x000000, 0.2).fillEllipse(0, H - 2, MAP.mouthW + 20, 26);
    g.fillStyle(0x66bb6a, 1).fillRoundedRect(-W, -H, MAP.mouthW, MAP.mouthH - 8, { tl: W, tr: W, bl: 16, br: 16 });
    g.lineStyle(6, 0x2e7d32, 1).strokeRoundedRect(-W, -H, MAP.mouthW, MAP.mouthH - 8, { tl: W, tr: W, bl: 16, br: 16 });
    g.fillStyle(0x8fd47a, 1).fillEllipse(-W * 0.4, -H * 0.62, W * 0.8, H * 0.22);
    g.fillStyle(0xdff7b8, 1).fillRoundedRect(-62, -48, 124, H + 46 - 6, { tl: 62, tr: 62, bl: 0, br: 0 });
    g.fillStyle(0x7cd34a, 1).fillRect(-62, H - 30, 124, 24);
    g.fillStyle(0xffe082, 1).fillCircle(20, -2, 26);
    g.lineStyle(4, 0xfff59d, 1).strokeCircle(20, -2, 34);
    const blooms: Array<[number, number, number]> = [[-84, -40, 0xffffff], [-48, -88, 0xffeb3b], [10, -104, 0xf48fb1], [60, -84, 0xffffff], [88, -34, 0xffeb3b], [-96, 20, 0xf48fb1], [96, 24, 0xffffff]];
    for (const [x, y, col] of blooms) {
      g.fillStyle(col, 1).fillCircle(x, y, 13);
      g.fillStyle(0xff8f00, 1).fillCircle(x, y, 5);
    }
    const c = this.add.container(p.x, p.y, [g]).setDepth(DEPTH.dots);
    this.world.add(c);
    return c;
  }

  private makeTeaser(i: number, icon: TeaserIcon): Phaser.GameObjects.Container {
    const p = this.geo.teasers[i];
    const g = this.add.graphics();
    // Post and board.
    g.fillStyle(0x8d6e63, 1).fillRoundedRect(-9, -40, 18, 120, 6);
    g.fillStyle(0xa1887f, 1).fillRoundedRect(-62, -118, 124, 86, 16);
    g.lineStyle(5, 0x6d4c41, 1).strokeRoundedRect(-62, -118, 124, 86, 16);
    drawTeaserIcon(g, icon, 0, -75);
    // Fully opaque, so the stepping stones and the post never show through (D-040 housekeeping).
    const cloud = this.add.image(0, 40, themeKey(this.data0.theme, 'cloud')).setDisplaySize(190, 100);
    const veil = this.add.image(0, -78, themeKey(this.data0.theme, 'cloud')).setDisplaySize(170, 96).setAlpha(0.55);
    const c = this.add.container(p.x, p.y, [g, veil, cloud]).setDepth(DEPTH.cloud);
    this.world.add(c);
    return c;
  }

  // ---------- layout ----------

  private relayout(l: Layout): void {
    this.bg.layout(l);
    this.events.emit('map-layout', l);
    const p = l.anchor('top-right', 84, 84);
    this.palette.setPosition(p.x, p.y);
    this.gear?.layout(l);
    if (this.practiceBtn) {
      const s = mapPracticeSpot(l.width, l.height, l.insets);
      this.practiceBtn.setPosition(s.x, s.y);
    }
    if (this.zenBtn) {
      const s = mapZenSpot(l.width, l.height, l.insets);
      this.zenBtn.setPosition(s.x, s.y);
    }
    if (this.stickerBtn) {
      const s = mapStickerSpot(l.width, l.height, l.insets);
      this.stickerBtn.setPosition(s.x, s.y);
    }
    this.scrollTarget = scrollFor(this.geo.width, l.width, this.pos.x);
    this.scroll = this.scrollTarget;
  }

  // ---------- input ----------

  private onDown(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    if (over.includes(this.palette) || (this.practiceBtn && over.includes(this.practiceBtn)) || (this.zenBtn && over.includes(this.zenBtn)) || (this.stickerBtn && over.includes(this.stickerBtn))) return;
    const at = this.logical(pointer);
    if (this.gear?.contains(at.x, at.y)) return;
    const { x } = at;
    this.drag = { x0: x, scroll0: this.scroll, moved: false, id: pointer.id };
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    const d = this.drag;
    if (!d || d.id !== pointer.id || !pointer.isDown) return;
    const { x } = this.logical(pointer);
    if (!d.moved && Math.abs(x - d.x0) < DRAG_PX) return;
    d.moved = true;
    this.scroll = clampScroll(d.scroll0 - (x - d.x0), this.geo.width, this.layout.width);
    this.scrollTarget = this.scroll;
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    const d = this.drag;
    this.drag = null;
    if (!d || d.id !== pointer.id || d.moved) return;
    const { x, y } = this.logical(pointer);
    this.tapAt(x + this.scroll, y);
  }

  /** Pointer position in logical screen units (the camera is zoomed by renderScale, origin 0). */
  private logical(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    const z = this.cameras.main.zoom || 1;
    return { x: pointer.x / z, y: pointer.y / z };
  }

  private tapAt(mx: number, my: number): void {
    if (this.leaving) return;
    const mouth = hitIndex(this.geo.branches, mx, my, MAP.mouthHit);
    if (mouth >= 0) return this.goBranch(mouth);
    if (this.geo.back && this.backView && hitIndex([this.geo.back], mx, my, MAP.mouthHit) === 0) return this.goBack();
    const dot = hitIndex(this.geo.dots, mx, my, MAP.dotHit, -10);
    if (dot >= 0) {
      if (this.dots[dot].open && !this.dotViews[dot].cloud?.visible) this.goPlay(dot);
      else this.bump(this.dotViews[dot].cloud ?? this.dotViews[dot].root);
      return;
    }
    const t = hitIndex(this.geo.teasers, mx, my, MAP.teaserHit, -30);
    if (t >= 0) this.bump(this.teaserViews[t]);
  }

  private onKey(e: KeyboardEvent): void {
    if (this.seenKeys.has(e) || this.leaving) return;
    this.seenKeys.add(e);
    const dir = KEY_DIRS[e.code];
    if (dir) {
      if (this.busy || this.hop) return;
      const to = stepOpen(this.dots, this.at, dir);
      if (to !== this.at) this.hopTo(to, () => undefined);
      return;
    }
    if ((e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') && !e.repeat) this.goPlay(this.at);
  }

  // ---------- actions ----------

  /** Hops dot by dot to `target`, then calls `then`. */
  private hopTo(target: number, then: () => void): void {
    if (target === this.at && !this.hop) {
      then();
      return;
    }
    const dir: 1 | -1 = target > this.at ? 1 : -1;
    const next = this.at + dir;
    this.facing = dir;
    this.at = next;
    this.driver.takeoff(this.time.now);
    audio.play('hop');
    this.hop = {
      from: { ...this.pos },
      to: { ...this.geo.dots[next] },
      startedAt: this.time.now,
      then: () => (next === target ? then() : this.hopTo(target, then)),
    };
  }

  /** One long arc from where he stands to a point (a mouth or an arch), then the callback. */
  private hopToPoint(target: MapPoint, then: () => void): void {
    const from = { ...this.pos };
    this.facing = target.x >= from.x ? 1 : -1;
    this.driver.takeoff(this.time.now);
    audio.play('hop');
    this.hop = { from, to: target, startedAt: this.time.now, ms: farHopMs(from, target), then };
  }

  /** A mouth was tapped: locked = the boulder shakes; open = the robot hops to it, jumps in and the screen fades through the dark. */
  private goBranch(i: number): void {
    const spec = this.data0.branches?.[i];
    const view = this.mouthViews[i];
    if (!spec || !view || this.leaving) return;
    if (!spec.open) {
      this.bump(view.boulder ?? view.root);
      return;
    }
    if (this.busy) return;
    this.busy = true;
    const p = this.geo.branches[i];
    this.hopToPoint({ x: p.x, y: p.y + MAP.mouthH / 2 - 4 }, () => this.fadeThrough(() => this.data0.onBranch?.(spec.worldId), view.root));
  }

  /** The meadow arch was tapped: the same hop and fade, back to the map this one branches from. */
  private goBack(): void {
    if (this.busy || !this.geo.back || !this.backView) return;
    this.busy = true;
    const p = this.geo.back;
    this.hopToPoint({ x: p.x, y: p.y + MAP.mouthH / 2 - 4 }, () => this.fadeThrough(() => this.data0.onBack?.(), this.backView));
  }

  /** The robot hops in, the arch pulses and the camera fades to dark; then the callback switches the map. */
  private fadeThrough(go: () => void, arch: Phaser.GameObjects.Container | null): void {
    this.leaving = true;
    this.phase = 'leaving';
    audio.play('pick');
    this.driver.hop(this.time.now);
    if (arch) this.tweens.add({ targets: arch, scale: 1.06, duration: 160, yoyo: true, ease: 'Sine.easeOut' });
    this.sparkle.explode(26, this.pos.x, this.pos.y - 60);
    this.time.delayedCall(260, () => {
      const cam = this.cameras.main;
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.game.events.once(Phaser.Core.Events.POST_STEP, go));
      cam.fadeOut(420, ...FADE_RGB);
    });
  }

  private goPlay(index: number): void {
    if (this.busy || this.leaving || !this.dots[index]?.open) return;
    this.busy = true;
    this.hopTo(index, () => {
      this.leaving = true;
      this.phase = 'leaving';
      audio.play('pick');
      const p = this.geo.dots[index];
      const icon = this.add.container(p.x, p.y - 150).setDepth(DEPTH.fx).setScale(0);
      const base = this.add.circle(0, 0, 74, 0x43a047).setStrokeStyle(10, 0xffffff);
      const tri = this.add.graphics().fillStyle(0xffffff, 1).fillTriangle(-22, -36, -22, 36, 40, 0);
      icon.add([base, tri]);
      this.world.add(icon);
      this.driver.hop(this.time.now);
      this.tweens.add({
        targets: icon,
        scale: 1,
        duration: 260,
        ease: 'Back.easeOut',
        onComplete: () => this.time.delayedCall(300, () => this.game.events.once(Phaser.Core.Events.POST_STEP, () => this.data0.onPlay(this.dots[index].id))),
      });
    });
  }

  private bump(target: Phaser.GameObjects.Image | Phaser.GameObjects.Container): void {
    audio.play('bump');
    this.tweens.killTweensOf(target);
    const x0 = (target.getData('x0') as number | undefined) ?? target.x;
    target.setData('x0', x0);
    target.x = x0;
    this.tweens.add({ targets: target, x: { from: x0 - 8, to: x0 + 8 }, duration: 70, yoyo: true, repeat: 1, ease: 'Sine.easeInOut', onComplete: () => (target.x = x0) });
  }

  private openParent(): void {
    if (this.leaving || this.busy) return;
    this.leaving = true;
    audio.play('pick');
    this.game.events.once(Phaser.Core.Events.POST_STEP, () => this.data0.onParent?.());
  }

  private openPractice(): void {
    if (this.leaving) return;
    this.leaving = true;
    audio.play('pick');
    const face = this.practiceFace;
    if (face) {
      this.tweens.killTweensOf(face);
      this.tweens.add({ targets: face, scale: 1.15, duration: 110, yoyo: true, ease: 'Back.easeOut' });
    }
    this.time.delayedCall(240, () => this.game.events.once(Phaser.Core.Events.POST_STEP, () => this.data0.onPractice?.()));
  }

  private openStickers(): void {
    if (this.leaving) return;
    this.leaving = true;
    audio.play('pick');
    const face = this.stickerFace;
    if (face) {
      this.tweens.killTweensOf(face);
      this.tweens.add({ targets: face, scale: 1.15, duration: 110, yoyo: true, ease: 'Back.easeOut' });
    }
    this.time.delayedCall(240, () => this.game.events.once(Phaser.Core.Events.POST_STEP, () => this.data0.onStickers?.()));
  }

  private openZen(): void {
    if (this.leaving) return;
    if (this.data0.zenLocked) {
      // Resting: a soft bump and no more (Task 033).
      audio.play('tap');
      if (this.zenFace) this.tweens.add({ targets: this.zenFace, scale: 0.88, duration: 100, yoyo: true });
      return;
    }
    this.leaving = true;
    audio.play('pick');
    const face = this.zenFace;
    if (face) {
      this.tweens.killTweensOf(face);
      this.tweens.add({ targets: face, scale: 1.15, duration: 110, yoyo: true, ease: 'Back.easeOut' });
    }
    this.time.delayedCall(240, () => this.game.events.once(Phaser.Core.Events.POST_STEP, () => this.data0.onZen?.()));
  }

  private openPicker(): void {
    if (this.leaving) return;
    this.leaving = true;
    audio.play('pick');
    this.game.events.once(Phaser.Core.Events.POST_STEP, () => this.data0.onPicker());
  }

  /** Back from a level: new stars fill in, opened clouds clear, then the avatar hops to the next dot. */
  private playArrival(arrival: { before: DotState[]; from: number }): void {
    const view = this.dotViews[arrival.from];
    const after = this.dots[arrival.from];
    let t = 450;
    // The finished dot turns green (if it was not yet) and its new stars pop in one by one.
    if (after.cleared && !arrival.before[arrival.from]?.cleared) {
      this.time.delayedCall(t, () => this.drawPad(view.root.getData('pad') as Phaser.GameObjects.Graphics, after));
    }
    for (let k = arrival.before[arrival.from]?.stars ?? 0; k < after.stars; k++) {
      const sg = view.stars[k];
      this.time.delayedCall(t, () => {
        this.drawStar(sg, true);
        sg.setScale(0);
        audio.play('coin');
        this.tweens.add({ targets: sg, scale: 1, duration: 280, ease: 'Back.easeOut' });
      });
      t += 380;
    }
    const opened = newlyOpened(arrival.before, this.dots);
    for (const i of opened) {
      const v = this.dotViews[i];
      this.time.delayedCall(t, () => this.clearCloud(i, v));
      t += 700;
    }
    (this.data0.branches ?? []).forEach((b, i) => {
      if (b.open && b.wasOpen === false) {
        this.time.delayedCall(t, () => this.rollBoulderAway(i));
        t += 900;
      }
    });
    this.time.delayedCall(t + 150, () => {
      this.phase = 'hopping';
      this.hopTo(currentDot(this.dots), () => {
        this.busy = false;
        this.phase = 'idle';
      });
    });
  }

  /** The boulder over a mouth that has just opened (Task 037) rolls aside with sparkles, and the glow comes on. */
  private rollBoulderAway(i: number): void {
    const v = this.mouthViews[i];
    const p = this.geo.branches[i];
    audio.play('unlock');
    this.sparkle.explode(36, p.x, p.y);
    if (v.boulder) {
      const b = v.boulder;
      this.tweens.add({ targets: b, x: b.x + 150, y: b.y + 40, angle: 220, alpha: 0, duration: 800, ease: 'Sine.easeIn', onComplete: () => b.setVisible(false) });
    }
    const halo = v.halo;
    if (halo) {
      this.tweens.add({ targets: halo, alpha: 0.4, duration: 600, onComplete: () => this.tweens.add({ targets: halo, alpha: 0.18, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }) });
    }
  }

  private clearCloud(i: number, v: DotView): void {
    const p = this.geo.dots[i];
    audio.play('unlock');
    this.sparkle.explode(30, p.x, p.y - 10);
    if (v.cloud) {
      const c = v.cloud;
      this.tweens.add({ targets: c, alpha: 0, y: c.y - 50, scaleX: c.scaleX * 1.4, scaleY: c.scaleY * 1.4, duration: 600, ease: 'Sine.easeOut', onComplete: () => c.setVisible(false) });
    }
    this.drawPad(v.root.getData('pad') as Phaser.GameObjects.Graphics, this.dots[i]);
    v.stars.forEach((s) => s.setVisible(true).setAlpha(0));
    this.tweens.add({ targets: v.stars, alpha: 1, duration: 400, delay: 250 });
  }

  private installDebugHook(): void {
    if (!new URLSearchParams(location.search).has('debug')) return;
    (window as unknown as { __map: unknown }).__map = {
      scene: this,
      layout: this.layout,
      audio,
      state: () => ({
        phase: this.phase,
        busy: this.busy,
        at: this.at,
        dots: this.dots.map((d, i) => ({
          ...d,
          x: this.geo.dots[i].x - this.scroll,
          y: this.geo.dots[i].y,
          clouded: !!this.dotViews[i].cloud?.visible,
          starsShown: this.dotViews[i].stars.filter((s) => s.visible && s.scale > 0.9).length,
        })),
        teasers: this.geo.teasers.map((t) => ({ x: t.x - this.scroll, y: t.y })),
        branches: this.geo.branches.map((m, i) => ({ x: m.x - this.scroll, y: m.y, hit: MAP.mouthHit, worldId: this.data0.branches![i].worldId, open: this.data0.branches![i].open, locked: !!this.mouthViews[i].boulder?.visible, stars: this.data0.branches![i].stars })),
        back: this.geo.back && { x: this.geo.back.x - this.scroll, y: this.geo.back.y, hit: MAP.mouthHit },
        avatar: { x: this.pos.x - this.scroll, y: this.pos.y - this.lift },
        palette: { x: this.palette.x, y: this.palette.y, r: PALETTE_R },
        gear: this.gear?.state ?? null,
        stickers: this.stickerBtn && { x: this.stickerBtn.x, y: this.stickerBtn.y, r: MAP_PRACTICE.r, hit: MAP_PRACTICE.hit },
        zen: this.zenBtn && { x: this.zenBtn.x, y: this.zenBtn.y, r: MAP_PRACTICE.r, hit: MAP_PRACTICE.hit },
        practice: this.practiceBtn && { x: this.practiceBtn.x, y: this.practiceBtn.y, r: MAP_PRACTICE.r, hit: MAP_PRACTICE.hit, faceY: this.practiceFace?.y ?? 0 },
        scroll: this.scroll,
        mapWidth: this.geo.width,
        hopping: !!this.hop,
        fps: this.game.loop.actualFps,
      }),
    };
  }
}

/** Simple icons for the worlds still to come. */
function drawTeaserIcon(g: Phaser.GameObjects.Graphics, icon: TeaserIcon, x: number, y: number): void {
  if (icon === 'cave') {
    g.fillStyle(0x78909c, 1).fillEllipse(x, y + 8, 84, 60);
    g.fillStyle(0x37474f, 1).fillEllipse(x, y + 18, 40, 40);
    g.fillStyle(0x90a4ae, 1).fillCircle(x - 26, y - 6, 9).fillCircle(x + 22, y - 10, 7);
  } else if (icon === 'sky') {
    g.fillStyle(0xffd54f, 1).fillCircle(x + 20, y - 12, 18);
    g.fillStyle(0xffffff, 1).fillCircle(x - 14, y + 8, 18).fillCircle(x + 8, y + 12, 15).fillCircle(x - 32, y + 14, 12);
  } else {
    g.fillStyle(0xeceff1, 1).fillRect(x - 36, y - 8, 72, 40);
    for (const dx of [-36, -12, 12]) g.fillRect(x + dx, y - 22, 24, 14);
    g.fillStyle(0xe53935, 1).fillTriangle(x - 4, y - 46, x - 4, y - 30, x + 14, y - 38);
    g.fillStyle(0x795548, 1).fillRoundedRect(x - 10, y + 10, 20, 22, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.lineStyle(2, 0x9e9e9e, 1).lineBetween(x - 4, y - 46, x - 4, y - 22);
  }
}

/** A little gold crown with three gems (Task 040), centred on (x, y); `k` scales it (1 = about 60 px wide). */
function drawCrown(g: Phaser.GameObjects.Graphics, x: number, y: number, k: number): void {
  const p = (pts: Array<[number, number]>) => pts.map(([a, b]) => new Phaser.Geom.Point(x + a * k, y + b * k));
  const body = p([[-30, 18], [-34, -14], [-16, 2], [0, -22], [16, 2], [34, -14], [30, 18]]);
  g.fillStyle(0x7a4f00, 1).fillPoints(p([[-33, 22], [-38, -18], [-16, 0], [0, -27], [16, 0], [38, -18], [33, 22]]), true);
  g.fillStyle(0xffd54f, 1).fillPoints(body, true);
  g.fillStyle(0xfff3b0, 0.8).fillRect(x - 24 * k, y + 8 * k, 48 * k, 4 * k);
  g.fillStyle(0xe53935, 1).fillCircle(x, y + 3 * k, 5 * k);
  g.fillStyle(0x29b6f6, 1).fillCircle(x - 18 * k, y + 8 * k, 3.6 * k).fillCircle(x + 18 * k, y + 8 * k, 3.6 * k);
  g.fillStyle(0xffffff, 1).fillCircle(x - 34 * k, y - 15 * k, 3 * k).fillCircle(x + 34 * k, y - 15 * k, 3 * k).fillCircle(x, y - 24 * k, 3 * k);
}
