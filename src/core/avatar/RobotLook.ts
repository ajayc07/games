// The Robot look (D-032, D-033): an original friendly robot built from generated parts. One container
// (root at the feet) holds about 20 flat images; joint positions are worked out each frame by simple
// forward kinematics from a RobotPose (clips.ts), so nothing is redrawn per frame. Proportions, colours
// and clip amplitudes live in robotSpec.ts.
import type Phaser from 'phaser';
import type { CharacterDef } from '../types';
import { widthFor } from '../levels/animation';
import {
  BLINK_MS,
  LAND_POSE,
  airClip,
  approachWeight,
  blendPose,
  blinkOpen,
  eyeLook,
  gaitClip,
  idleClip,
  landWeight,
  nextBlinkAt,
  shootClip,
  springStep,
  turnToward,
  winClip,
  withShot,
  type RobotPose,
} from './clips';
import { resolveAvatar, type ResolvedAvatar } from './config';
import { PART_RES, partImage, robotParts, type Part, type RobotParts } from './parts';
import { ROBOT, ROBOT_CLIPS } from './robotSpec';
import type { AvatarEvent, AvatarLook, AvatarState, MotionWeights } from './types';

type Img = Phaser.GameObjects.Image;
interface Vec {
  x: number;
  y: number;
}

/** Rotates a point clockwise (Phaser, y down) by `a` around the origin. */
const rot = (p: Vec, a: number): Vec => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });
/** Point `len` along a limb at absolute angle `a` (0 = down, positive = forward). */
const along = (p: Vec, a: number, len: number): Vec => ({ x: p.x + Math.sin(a) * len, y: p.y + Math.cos(a) * len });

const FAR_TINT = 0xd5dbe0;
const NEVER = -1e9;

export class RobotLook implements AvatarLook {
  readonly name = 'robot' as const;
  readonly root: Phaser.GameObjects.Container;
  readonly ready = Promise.resolve();
  readonly shadowScale = 0.95;
  readonly avatar: ResolvedAvatar;
  private readonly parts: RobotParts;
  private readonly img: {
    armF: [Img, Img, Img];
    legF: [Img, Img, Img];
    antennae: Img[];
    torso: Img;
    head: Img;
    eyes: [Img, Img];
    legN: [Img, Img, Img];
    armN: [Img, Img, Img];
    flash: Img;
  };

  private turn = 1;
  private facing: 1 | -1 = 1;
  private airW = 0;
  private winW = 0;
  private winning = false;
  private jumpAt = NEVER;
  private landAt = NEVER;
  private shootAt = NEVER;
  private winAt = NEVER;
  private blinkAt: number;
  private antenna = { angle: 0, vel: 0 };
  private lastSpeed = 0;
  private muzzlePoint: Vec = { x: 0, y: 0 };
  private lastPose: RobotPose | null = null;

  constructor(scene: Phaser.Scene, character: CharacterDef, x: number, feet: number) {
    this.avatar = resolveAvatar(character.avatar);
    this.parts = robotParts(scene, this.avatar.palette);
    const p = this.parts;
    const mk = (part: Part, tint = false) => {
      const i = partImage(scene, part);
      if (tint) i.setTint(FAR_TINT);
      return i;
    };
    const antennae = Array.from({ length: this.avatar.antennae }, () => mk(p.antenna));
    this.img = {
      armF: [mk(p.upperArm, true), mk(p.forearm, true), mk(p.hand, true)],
      legF: [mk(p.thigh, true), mk(p.shin, true), mk(p.boot, true)],
      antennae,
      torso: mk(p.torso),
      head: mk(p.head),
      eyes: [mk(p.eye), mk(p.eye)],
      legN: [mk(p.thigh), mk(p.shin), mk(p.boot)],
      armN: [mk(p.upperArm), mk(p.forearm), mk(p.hand)],
      flash: mk(p.flash).setVisible(false),
    };
    const i = this.img;
    this.root = scene.add.container(x, feet, [
      ...i.armF,
      ...i.legF,
      ...i.antennae,
      i.torso,
      i.head,
      ...i.eyes,
      ...i.legN,
      ...i.armN,
      i.flash,
    ]);
    this.blinkAt = nextBlinkAt(scene.time.now, Math.random());
  }

  motion(): MotionWeights {
    return ROBOT_CLIPS.motion;
  }

  setFacing(facing: 1 | -1): void {
    this.facing = facing;
  }

  trigger(event: AvatarEvent, now: number): void {
    if (event === 'jump') this.jumpAt = now;
    else if (event === 'land') this.landAt = now;
    else if (event === 'shoot') this.shootAt = now;
    else if (event === 'win') {
      this.winning = true;
      this.winAt = now;
    }
  }

  update(s: AvatarState): void {
    const t = s.time;
    const dt = s.dtMs;
    this.facing = s.facing;
    this.turn = turnToward(this.turn, s.facing, dt, ROBOT.turnMs);

    // ---- pose: ground (idle <-> gait), air, land, win, shoot ----
    const C = ROBOT_CLIPS;
    const step = C.stepLength[s.gait] * this.avatar.scale;
    const phase = (s.stridePhase * 56) / step; // the driver's stride counts 56 px steps
    let pose = blendPose(idleClip(t), gaitClip(s.gait, phase), s.runBlend);
    this.airW = approachWeight(this.airW, !s.grounded && !s.riding, dt, C.blend.airIn, C.blend.airOut);
    if (this.airW > 0) pose = blendPose(pose, airClip(t - this.jumpAt, s.vy, t), this.airW);
    const lw = landWeight(t - this.landAt);
    if (lw > 0 && s.grounded) pose = blendPose(pose, LAND_POSE, lw);
    this.winW = approachWeight(this.winW, this.winning && s.grounded, dt, C.blend.winIn, C.blend.winIn);
    if (this.winW > 0) pose = blendPose(pose, winClip(t - this.winAt), this.winW);
    const shot = shootClip(t - this.shootAt);
    pose = withShot(pose, shot);
    this.lastPose = pose;

    // ---- legs, with the lower foot snapped to the ground while grounded ----
    const P = ROBOT.parts;
    const L = ROBOT.layout;
    const legEnd = (hipX: number, a: number, b: number) => {
      const hip = { x: hipX, y: L.hipY };
      const knee = along(hip, a, P.thigh.len);
      const ankle = along(knee, a - b, P.shin.len);
      return { hip, knee, ankle };
    };
    const ln = legEnd(L.hipX.near, pose.legN.a, pose.legN.b);
    const lf = legEnd(L.hipX.far, pose.legF.a, pose.legF.b);
    const lowest = Math.max(ln.ankle.y, lf.ankle.y) + P.boot.ankle;
    const drop = -lowest * (1 - this.airW); // >= 0 when knees bend: the body sinks so a foot stays planted
    const dy = drop - pose.bob;
    const place = (imgs: [Img, Img, Img], leg: ReturnType<typeof legEnd>, a: number, b: number, foot: number) => {
      imgs[0].setPosition(leg.hip.x, leg.hip.y + dy).setRotation(-a);
      imgs[1].setPosition(leg.knee.x, leg.knee.y + dy).setRotation(-(a - b));
      imgs[2].setPosition(leg.ankle.x, leg.ankle.y + dy).setRotation(-foot);
    };
    place(this.img.legF, lf, pose.legF.a, pose.legF.b, pose.legF.foot);
    place(this.img.legN, ln, pose.legN.a, pose.legN.b, pose.legN.foot);

    // ---- upper body leans around the hip point ----
    const hip = { x: 0, y: L.hipY + dy };
    const lean = pose.lean;
    const up = (p: Vec): Vec => {
      const r = rot(p, lean);
      return { x: hip.x + r.x, y: hip.y + r.y };
    };
    this.img.torso.setPosition(hip.x, hip.y).setRotation(lean);
    const headC = up({ x: 0, y: -L.headY });
    const headRot = lean + pose.head;
    this.img.head.setPosition(headC.x, headC.y).setRotation(headRot);

    // Eyes: look toward the facing direction (forward in the root's mirrored frame) and with vertical speed.
    const blinkT = t - this.blinkAt;
    if (blinkT >= BLINK_MS) this.blinkAt = nextBlinkAt(t, Math.random());
    const happy = this.winW > 0.5;
    const open = happy ? 1 : blinkOpen(blinkT);
    const lk = eyeLook(Math.abs(this.turn) > 0.2 ? 1 : 0, s.vy, ROBOT.look.x, ROBOT.look.y, ROBOT.look.perVy);
    const eyeKey = happy ? this.parts.eyeHappy.key : this.parts.eye.key;
    this.img.eyes.forEach((e, i) => {
      const side = i === 0 ? -1 : 1;
      const p = rot({ x: side * P.eye.gap + lk.x, y: P.eye.y + lk.y }, headRot);
      if (e.texture.key !== eyeKey) {
        const part = happy ? this.parts.eyeHappy : this.parts.eye;
        e.setTexture(part.key).setOrigin(part.ox, part.oy);
      }
      e.setPosition(headC.x + p.x, headC.y + p.y).setRotation(headRot);
      e.setScale(1 / PART_RES, open / PART_RES);
    });

    // Antennae on a spring: they lag behind speed changes and bounces; a big wiggle when winning.
    const spring = ROBOT.antennaSpring;
    const accel = (s.speed - this.lastSpeed) / Math.max(1, dt);
    this.lastSpeed = s.speed;
    let target = -accel * spring.push * 1000 - s.vy * spring.vyPush + spring.sway * Math.sin((Math.PI * 2 * t) / 2100);
    if (this.winW > 0) target += this.winW * 0.5 * Math.sin((Math.PI * 2 * t) / 300);
    this.antenna = springStep(this.antenna.angle, this.antenna.vel, Math.max(-spring.max, Math.min(spring.max, target)), dt, spring.stiffness, spring.damping);
    const A = P.antenna;
    const n = this.img.antennae.length;
    this.img.antennae.forEach((img, i) => {
      const side = n === 1 ? 0 : i === 0 ? -1 : 1;
      const base = rot({ x: side * A.spread, y: -P.head.h / 2 + 2 }, headRot);
      img.setPosition(headC.x + base.x, headC.y + base.y).setRotation(headRot + side * A.splay + this.antenna.angle * (1 + 0.15 * side));
    });

    // Arms hang from the shoulders, which lean with the body.
    const arm = (imgs: [Img, Img, Img], shoulderX: number, a0: number, b: number, cannon: boolean) => {
      const sh = up({ x: shoulderX, y: -L.shoulderY });
      const a = a0 - lean; // a limb hanging in the body's frame tilts back as the body leans forward
      const elbow = along(sh, a, P.upperArm.len);
      const wrist = along(elbow, a + b, P.forearm.len);
      imgs[0].setPosition(sh.x, sh.y).setRotation(-a);
      imgs[1].setPosition(elbow.x, elbow.y).setRotation(-(a + b));
      const handPart = cannon ? this.parts.cannon : this.parts.hand;
      if (imgs[2].texture.key !== handPart.key) imgs[2].setTexture(handPart.key).setOrigin(handPart.ox, handPart.oy);
      imgs[2].setPosition(wrist.x, wrist.y).setRotation(-(a + b));
      return along(wrist, a + b, cannon ? P.cannon.len : P.hand.r * 2);
    };
    arm(this.img.armF, L.shoulderX.far, pose.armF.a, pose.armF.b, false);
    const tip = arm(this.img.armN, L.shoulderX.near, pose.armN.a, pose.armN.b, shot.cannon);
    this.img.flash.setVisible(shot.flash).setPosition(tip.x, tip.y);
    if (shot.flash) this.img.flash.setScale((0.7 + 0.6 * ((t - this.shootAt) / ROBOT_CLIPS.shoot.flashMs)) / PART_RES);

    // ---- root: feet position, size factor, squash/stretch, paper turn, small lean ----
    const S = this.avatar.scale;
    this.root.setPosition(s.x, s.y - s.lift);
    this.root.setScale(S * widthFor(s.stretch) * this.turn, S * (1 + s.stretch));
    this.root.setRotation(s.rotation);
    const sx = S * this.turn;
    this.muzzlePoint = { x: s.x + tip.x * sx, y: s.y - s.lift + tip.y * S };
  }

  setAlpha(alpha: number): void {
    this.root.setAlpha(alpha);
  }

  setDepth(depth: number): void {
    this.root.setDepth(depth);
  }

  setVisible(visible: boolean): void {
    this.root.setVisible(visible);
  }

  muzzle(): { x: number; y: number } {
    return this.muzzlePoint;
  }

  debug(): Record<string, number | string | boolean> {
    const p = this.lastPose;
    return {
      texture: 'robot',
      facing: this.facing,
      x: this.root.x,
      y: this.root.y,
      rot: this.root.rotation,
      scaleX: this.root.scaleX,
      scaleY: this.root.scaleY,
      displayHeight: 104 * this.avatar.scale,
      alpha: this.root.alpha,
      depth: this.root.depth,
      visible: this.root.visible,
      objects: this.root.length,
      airW: this.airW,
      winW: this.winW,
      happy: this.winW > 0.5,
      legN: p ? p.legN.a : 0,
      armN: p ? p.armN.a : 0,
      flash: this.img.flash.visible,
      cannon: this.img.armN[2].texture.key === this.parts.cannon.key,
      eyeOpen: this.img.eyes[0].scaleY * PART_RES,
    };
  }

  destroy(): void {
    this.root.destroy();
  }
}
