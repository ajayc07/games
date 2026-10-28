// The Robot look (D-032, D-033, D-037): an original friendly robot built from generated parts. One container
// (root at the feet) holds about 25 flat images. Each frame the clips (clips.ts) give a RobotPose, the yaw
// follows where the robot is going (front-on when still, three-quarter view when moving, head leading the
// body in a turn), and the pure rig solver (robotRig.ts) works out every part's position, angle and width.
// Nothing is redrawn per frame. Proportions, colours, view and clip numbers live in robotSpec.ts.
import type Phaser from 'phaser';
import { widthFor } from '../levels/animation';
import {
  BLINK_MS,
  LAND_POSE,
  airClip,
  approachWeight,
  blendPose,
  blinkOpen,
  clamp01,
  eyeLook,
  gaitClip,
  idleClip,
  landWeight,
  nextBlinkAt,
  shootClip,
  springStep,
  viewOf,
  winClip,
  withShot,
  yawStep,
  yawTarget,
  type RobotPose,
} from './clips';
import { resolveAvatar, type AvatarDef, type ResolvedAvatar } from './config';
import { PART_RES, partImage, robotParts, type Part, type RobotParts } from './parts';
import { solveRig, type Xf } from './robotRig';
import { ROBOT, ROBOT_CLIPS } from './robotSpec';
import type { AvatarEvent, AvatarLook, AvatarState, MotionWeights } from './types';

type Img = Phaser.GameObjects.Image;
type Limb3 = [Img, Img, Img];

const NEVER = -1e9;

/** Mixes white toward the far-side tint by `k` (0..1), in 16 steps so the tint is only reset when it changes. */
function farTint(k: number): number {
  const q = Math.round(clamp01(k) * 16) / 16;
  const t = ROBOT.view.farTint;
  const ch = (shift: number) => Math.round(255 + (((t >> shift) & 255) - 255) * q);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

function put(img: Img, f: Xf, syMul = 1): void {
  img.setPosition(f.x, f.y).setRotation(f.rot).setScale(f.sx / PART_RES, (f.sy * syMul) / PART_RES);
}

export class RobotLook implements AvatarLook {
  readonly name = 'robot' as const;
  readonly root: Phaser.GameObjects.Container;
  readonly ready = Promise.resolve();
  readonly shadowScale: number;
  /** Option scale x visual size factor (`?size=`). */
  private k: number;
  private readonly k0: number;
  readonly avatar: ResolvedAvatar;
  private readonly parts: RobotParts;
  private readonly img: {
    armF: Limb3;
    legF: Limb3;
    antennae: Img[];
    torso: Img;
    chest: Img;
    earF: Img;
    earNBack: Img;
    head: Img;
    earNFront: Img;
    visor: Img;
    eyes: [Img, Img];
    legN: Limb3;
    armN: Limb3;
    flash: Img;
  };

  private facing: 1 | -1 = 1;
  /** Yaw of the head and of the body (-1..1, sign = facing side, 0 = facing the player). */
  private headYaw = 0;
  private bodyYaw = 0;
  private headDir: 1 | -1 = 1;
  private bodyDir: 1 | -1 = 1;
  /** Walk-cycle shift (0 or 1 step) that keeps the limbs in place when the near side changes at yaw 0. */
  private phaseShift = 0;
  private airW = 0;
  private winW = 0;
  private winning = false;
  private jumpAt = NEVER;
  private landAt = NEVER;
  private shootAt = NEVER;
  private winAt = NEVER;
  private blinkAt: number;
  /** Antenna spring, in screen space (so it never jumps when the robot turns). */
  private antenna = { angle: 0, vel: 0 };
  private lastSpeed = 0;
  private muzzlePoint = { x: 0, y: 0 };
  private lastPose: RobotPose | null = null;
  private tint = -1;
  private earFront = false;

  constructor(scene: Phaser.Scene, avatar: AvatarDef | undefined, x: number, feet: number, size = 1) {
    this.avatar = resolveAvatar(avatar);
    this.k = this.avatar.scale * size;
    this.k0 = this.k;
    this.shadowScale = 0.95 * size;
    this.parts = robotParts(scene, this.avatar.palette);
    const p = this.parts;
    const mk = (part: Part) => partImage(scene, part);
    this.img = {
      armF: [mk(p.upperArm), mk(p.forearm), mk(p.hand)],
      legF: [mk(p.thigh), mk(p.shin), mk(p.boot)],
      antennae: Array.from({ length: this.avatar.antennae }, () => mk(p.antenna)),
      torso: mk(p.torso),
      chest: mk(p.chest),
      earF: mk(p.ear),
      earNBack: mk(p.ear),
      head: mk(p.head),
      earNFront: mk(p.ear).setVisible(false),
      visor: mk(p.visor),
      eyes: [mk(p.eye), mk(p.eye)],
      legN: [mk(p.thigh), mk(p.shin), mk(p.boot)],
      armN: [mk(p.upperArm), mk(p.forearm), mk(p.hand)],
      flash: mk(p.flash).setVisible(false),
    };
    const i = this.img;
    // Draw order: far limbs behind the body, near limbs in front (the rig always puts the clip's N limbs on
    // the side nearer the player, so this order never has to change).
    this.root = scene.add.container(x, feet, [
      ...i.armF,
      ...i.legF,
      ...i.antennae,
      i.torso,
      i.chest,
      i.earF,
      i.earNBack,
      i.head,
      i.earNFront,
      i.visor,
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
    } else if (event === 'rest') this.winning = false; // the win pose blends back out
  }

  update(s: AvatarState): void {
    const t = s.time;
    const dt = s.dtMs;
    const C = ROBOT_CLIPS;
    this.facing = s.facing;
    this.airW = approachWeight(this.airW, !s.grounded && !s.riding, dt, C.blend.airIn, C.blend.airOut);
    this.winW = approachWeight(this.winW, this.winning && s.grounded, dt, C.blend.winIn, C.blend.winIn);
    const shot = shootClip(t - this.shootAt);

    // ---- yaw: head leads, body follows, both sweep through front-on ----
    const target = yawTarget({
      facing: s.facing,
      speed: s.riding ? 0 : s.speed,
      refSpeed: s.refSpeed,
      air: this.airW,
      shoot: shot.weight > 0 ? 1 : 0,
      win: this.winW,
    });
    this.headYaw = yawStep(this.headYaw, target, dt, ROBOT.yaw.headSweepMs);
    this.bodyYaw = yawStep(this.bodyYaw, target, dt, ROBOT.yaw.bodySweepMs);
    const head = viewOf(this.headYaw, this.headDir);
    const body = viewOf(this.bodyYaw, this.bodyDir);
    this.headDir = head.dir;
    if (body.dir !== this.bodyDir) {
      // The near side swapped (at yaw 0): shift the cycle one step so every limb stays where it was.
      this.phaseShift = 1 - this.phaseShift;
      this.bodyDir = body.dir;
    }

    // ---- pose: ground (idle <-> gait), air, land, win, shoot ----
    const step = C.stepLength[s.gait] * this.k;
    const phase = (s.stridePhase * 56) / step + this.phaseShift; // the driver's stride counts 56 px steps
    let pose = blendPose(idleClip(t), gaitClip(s.gait, phase), s.runBlend);
    if (this.airW > 0) pose = blendPose(pose, airClip(t - this.jumpAt, s.vy, t), this.airW);
    const lw = landWeight(t - this.landAt);
    if (lw > 0 && s.grounded) pose = blendPose(pose, LAND_POSE, lw);
    if (this.winW > 0) pose = blendPose(pose, winClip(t - this.winAt), this.winW);
    pose = withShot(pose, shot);
    this.lastPose = pose;

    // ---- expressions: blink, happy eyes, eyes looking ahead (more the further the head is turned) ----
    const blinkT = t - this.blinkAt;
    if (blinkT >= BLINK_MS) this.blinkAt = nextBlinkAt(t, Math.random());
    const happy = this.winW > 0.5;
    const open = happy ? 1 : blinkOpen(blinkT);
    const lk = eyeLook(clamp01(Math.abs(this.headYaw) / ROBOT.yaw.move), s.vy, ROBOT.look.x, ROBOT.look.y, ROBOT.look.perVy);

    // ---- antennae on a spring: they lag behind speed changes and bounces; a big wiggle when winning ----
    const spring = ROBOT.antennaSpring;
    const accel = (s.speed - this.lastSpeed) / Math.max(1, dt);
    this.lastSpeed = s.speed;
    let target2 = s.facing * (-accel * spring.push * 1000 - s.vy * spring.vyPush) + spring.sway * Math.sin((Math.PI * 2 * t) / 2100);
    if (this.winW > 0) target2 += this.winW * 0.5 * Math.sin((Math.PI * 2 * t) / 300);
    target2 = Math.max(-spring.max, Math.min(spring.max, target2));
    this.antenna = springStep(this.antenna.angle, this.antenna.vel, target2, dt, spring.stiffness, spring.damping);

    // ---- solve and apply ----
    const rig = solveRig({
      pose,
      air: this.airW,
      body,
      head,
      look: lk,
      antenna: this.antenna.angle,
      antennae: this.avatar.antennae,
      cannon: shot.cannon,
    });
    const i = this.img;
    const limb = (imgs: Limb3, f: [Xf, Xf, Xf]) => imgs.forEach((im, k) => put(im, f[k]));
    limb(i.legF, rig.legF);
    limb(i.legN, rig.legN);
    limb(i.armF, rig.armF);
    const handPart = shot.cannon ? this.parts.cannon : this.parts.hand;
    if (i.armN[2].texture.key !== handPart.key) i.armN[2].setTexture(handPart.key).setOrigin(handPart.ox, handPart.oy);
    limb(i.armN, rig.armN);
    put(i.torso, rig.torso);
    put(i.chest, rig.chest);
    put(i.head, rig.head);
    put(i.visor, rig.visor);
    put(i.earF, rig.earF);
    if (rig.earNFront !== this.earFront) {
      this.earFront = rig.earNFront;
      i.earNFront.setVisible(this.earFront);
      i.earNBack.setVisible(!this.earFront);
    }
    put(this.earFront ? i.earNFront : i.earNBack, rig.earN);
    const eyePart = happy ? this.parts.eyeHappy : this.parts.eye;
    i.eyes.forEach((e, k) => {
      if (e.texture.key !== eyePart.key) e.setTexture(eyePart.key).setOrigin(eyePart.ox, eyePart.oy);
      put(e, rig.eyes[k], open);
    });
    i.antennae.forEach((a, k) => put(a, rig.antennae[k]));
    i.flash.setVisible(shot.flash).setPosition(rig.tip.x, rig.tip.y);
    if (shot.flash) i.flash.setScale((0.7 + 0.6 * ((t - this.shootAt) / ROBOT_CLIPS.shoot.flashMs)) / PART_RES);

    // Far-side limbs a little darker in side views (white at the front view, so the mirror never shows).
    const tint = farTint(rig.farShade);
    if (tint !== this.tint) {
      this.tint = tint;
      for (const im of [...i.armF, ...i.legF, i.earF]) im.setTint(tint);
    }

    // ---- root: feet position, size factor, squash/stretch, small lean ----
    const S = this.k;
    this.root.setPosition(s.x, s.y - s.lift);
    this.root.setScale(S * widthFor(s.stretch), S * (1 + s.stretch));
    this.root.setRotation(s.rotation);
    this.muzzlePoint = { x: s.x + rig.tip.x * S, y: s.y - s.lift + rig.tip.y * S };
  }

  /** Mega Robo (Task 030): the whole body drawn this many times bigger (1 = normal). */
  setBoost(f: number): void {
    this.k = this.k0 * f;
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
      headYaw: this.headYaw,
      bodyYaw: this.bodyYaw,
      x: this.root.x,
      y: this.root.y,
      rot: this.root.rotation,
      scaleX: this.root.scaleX,
      scaleY: this.root.scaleY,
      displayHeight: 104 * this.k,
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
      earFront: this.earFront,
    };
  }

  destroy(): void {
    this.root.destroy();
  }
}
