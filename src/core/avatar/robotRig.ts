// Robot rig geometry (Task 005c, D-037): turns a RobotPose plus the head and body yaw into a 2D transform
// for every part. Pure (no Phaser) and unit-tested; RobotLook only copies the numbers onto images.
//
// A tiny 3D model: every joint has a forward (f), sideways (l, negative = the near side) and down (y)
// position in the body's own frame. A view (clips.ts `viewOf`) projects it to the screen with
//   x = dir * (f * side + l * front)
// so at yaw 0 (front view) forward swings vanish and only the sideways layout shows, and at a three-quarter
// view the limbs swing forward like a side view while the far ones tuck in behind. Because the front view is
// left/right symmetric, the mirror (`dir`) can flip there without any visible jump. Head parts use the head's
// view, everything else the body's, so in a turn the head leads. Numbers live in robotSpec.ts.
import type { LegPose, Limb, RobotPose, View } from './clips';
import { ROBOT } from './robotSpec';

/** A part's transform inside the robot's container (feet at 0, 0). `sx` carries the mirror sign. */
export interface Xf {
  x: number;
  y: number;
  rot: number;
  sx: number;
  sy: number;
}

export interface RigInput {
  pose: RobotPose;
  /** 0 on the ground .. 1 in the air (the planted-foot drop fades out in the air). */
  air: number;
  body: View;
  head: View;
  /** Eye offset (px): x toward the facing, y down. */
  look: { x: number; y: number };
  /** Antenna spring angle (screen radians, clockwise). */
  antenna: number;
  antennae: 0 | 1 | 2;
  cannon: boolean;
}

export interface RigFrame {
  /** Upper arm, forearm, hand (or cannon); thigh, shin, boot. */
  armN: [Xf, Xf, Xf];
  armF: [Xf, Xf, Xf];
  legN: [Xf, Xf, Xf];
  legF: [Xf, Xf, Xf];
  torso: Xf;
  chest: Xf;
  head: Xf;
  visor: Xf;
  /** Near eye, far eye. */
  eyes: [Xf, Xf];
  earN: Xf;
  earF: Xf;
  antennae: Xf[];
  /** The near ear is drawn in front of the head shell (three-quarter view) rather than behind it. */
  earNFront: boolean;
  /** How much the far-side limbs are shaded (0 front view .. 1 side view). */
  farShade: number;
  /** Where a shot leaves (end of the near hand or cannon). */
  tip: { x: number; y: number };
}

interface P3 {
  f: number;
  l: number;
  y: number;
}

const lerp = (a: number, b: number, w: number) => a + (b - a) * w;
/** Rotates (f, y) clockwise by `a` (forward lean is positive). */
const rotFY = (f: number, y: number, a: number) => ({ f: f * Math.cos(a) - y * Math.sin(a), y: f * Math.sin(a) + y * Math.cos(a) });

/** Upper segment direction of a limb (unit 3D): angle `a` forward from straight down, spread `s` out to `out` (-1 near side, +1 far). */
function limbDir(a: number, s: number, out: number): P3 {
  const c = Math.cos(s);
  return { f: Math.sin(a) * c, l: Math.sin(s) * out, y: Math.cos(a) * c };
}

export function solveRig(i: RigInput): RigFrame {
  const P = ROBOT.parts;
  const L = ROBOT.layout;
  const V = ROBOT.view;
  const { pose, body: B, head: H } = i;
  const projX = (p: P3) => B.dir * (p.f * B.side + p.l * B.front);

  /** A limb segment image from `p` along unit `d` for `len`; returns the image transform and the far end. */
  const seg = (p: P3, d: P3, len: number): { xf: Xf; end: P3 } => {
    const end = { f: p.f + d.f * len, l: p.l + d.l * len, y: p.y + d.y * len };
    const x0 = projX(p);
    const dx = projX(end) - x0;
    const dy = end.y - p.y;
    return {
      xf: { x: x0, y: p.y, rot: -Math.atan2(dx, dy), sx: B.dir, sy: Math.max(V.minLength, Math.hypot(dx, dy) / len) },
      end,
    };
  };

  // ---- legs (not leaned), with the lower foot planted while grounded ----
  const ankleY = (g: LegPose) => L.hipY + Math.cos(g.a) * P.thigh.len + Math.cos(g.a - g.b) * P.shin.len;
  const lowest = Math.max(ankleY(pose.legN), ankleY(pose.legF)) + P.boot.ankle;
  const dy = -lowest * (1 - i.air) - pose.bob; // the body sinks so a foot stays planted, then the clip's bob
  const bootK = lerp(V.bootFront, 1, B.side);
  const bootCentre = P.boot.w / 2 - P.boot.heel; // centre of the boot ahead of the ankle
  const leg = (g: LegPose, l: number): [Xf, Xf, Xf] => {
    const hip = { f: 0, l, y: L.hipY + dy };
    const thigh = seg(hip, limbDir(g.a, 0, 0), P.thigh.len);
    const shin = seg(thigh.end, limbDir(g.a - g.b, 0, 0), P.shin.len);
    const ank = shin.end;
    // Toe forward at side view; seen from the front the boot is narrower and centred on the ankle.
    const boot: Xf = {
      x: projX(ank) - B.dir * bootCentre * bootK * (1 - B.side),
      y: ank.y,
      rot: -B.dir * g.foot * B.side,
      sx: B.dir * bootK,
      sy: 1,
    };
    return [thigh.xf, shin.xf, boot];
  };
  const legN = leg(pose.legN, -L.hipL);
  const legF = leg(pose.legF, L.hipL);

  // ---- upper body leans around the hip ----
  const hipY = L.hipY + dy;
  const lean = pose.lean;
  const up = (f: number, y: number, l: number): P3 => {
    const r = rotFY(f, y, lean);
    return { f: r.f, l, y: hipY + r.y };
  };
  const bodyRot = B.dir * lean * B.side; // a forward lean seen from the front is just foreshortening
  const torso: Xf = { x: 0, y: hipY, rot: bodyRot, sx: B.dir * (B.front + V.torsoDepth * B.side), sy: 1 };
  const chestP = up(V.chestF, chestOffsetY(), 0);
  const chest: Xf = { x: projX(chestP), y: chestP.y, rot: bodyRot, sx: B.dir * lerp(1, V.chestWidth, B.side), sy: 1 };

  // Arms hang from the shoulders, which lean with the body.
  let tip = { x: 0, y: 0 };
  const arm = (g: Limb, l: number, out: number, near: boolean): [Xf, Xf, Xf] => {
    const sh = up(0, -L.shoulderY, l);
    const a = g.a - lean; // a limb hanging in the body's frame tilts back as the body leans forward
    const upper = seg(sh, limbDir(a, g.s, out), P.upperArm.len);
    const foreDir = limbDir(a + g.b, g.s, out);
    const fore = seg(upper.end, foreDir, P.forearm.len);
    const hand: Xf = { ...fore.xf, x: projX(fore.end), y: fore.end.y, sy: 1 };
    if (near) {
      const reach = i.cannon ? P.cannon.len : P.hand.r * 2;
      const t = { f: fore.end.f + foreDir.f * reach, l: fore.end.l + foreDir.l * reach, y: fore.end.y + foreDir.y * reach };
      tip = { x: projX(t), y: t.y };
    }
    return [upper.xf, fore.xf, hand];
  };
  const armF = arm(pose.armF, L.shoulderL, 1, false);
  const armN = arm(pose.armN, -L.shoulderL, -1, true);

  // ---- head: placed by the body, drawn in the head's own view ----
  const hc = up(0, -L.headY, 0);
  const hx = projX(hc);
  const headRot = bodyRot + pose.head; // the clip's head tilt shows as a gentle roll from every side
  const cos = Math.cos(headRot);
  const sin = Math.sin(headRot);
  /** A head part at (f, l) in the head's frame plus a screen-down offset `oy`. */
  const hp = (f: number, l: number, oy: number, rot: number, sx: number, sy = 1): Xf => {
    const ox = H.dir * (f * H.side + l * H.front);
    return { x: hx + ox * cos - oy * sin, y: hc.y + ox * sin + oy * cos, rot, sx: H.dir * sx, sy };
  };
  const earL = P.head.w / 2 + 1;
  const face = V.faceF;
  const eye = (l: number, sx: number): Xf => {
    const xf = hp(face, l, P.eye.y + i.look.y, headRot, sx);
    // Shift toward the facing by the look offset (in the head's frame).
    xf.x += H.dir * i.look.x * cos;
    xf.y += H.dir * i.look.x * sin;
    return xf;
  };
  const A = P.antenna;
  const n = i.antennae;
  const antennae: Xf[] = [];
  for (let k = 0; k < n; k++) {
    const side = n === 1 ? 0 : k === 0 ? -1 : 1;
    const xf = hp(V.antennaF, side * A.spread * lerp(1, V.antennaSpread, H.side), -P.head.h / 2 + 2, 0, 1);
    // Splay mirrors with the head; the spring angle is already in screen space.
    xf.rot = headRot + H.dir * side * A.splay * lerp(1, V.antennaSpread, H.side) + i.antenna * (1 + 0.15 * side * H.dir);
    antennae.push(xf);
  }

  return {
    armN,
    armF,
    legN,
    legF,
    torso,
    chest,
    head: hp(0, 0, 0, headRot, lerp(1, V.headWidth, H.side)),
    visor: hp(face, 0, P.visor.y, headRot, lerp(1, V.visorWidth, H.side)),
    eyes: [eye(-P.eye.gap, 1), eye(P.eye.gap, lerp(1, V.eyeFar, H.side))],
    earN: hp(-V.earBack, -earL, 2, headRot, 1),
    // The far ear peeks out behind the face side (a cartoon cheat: strictly it would be hidden).
    earF: hp(V.earFarPeek, earL, 2, headRot, lerp(1, V.earFarWidth, H.side)),
    antennae,
    earNFront: H.side > V.earFrontAt,
    farShade: B.side,
    tip,
  };
}

/** Chest panel centre above the hip joint (px, up negative), matching the torso texture in parts.ts. */
export function chestOffsetY(): number {
  const P = ROBOT.parts;
  const chestFromTop = P.neck.h + P.torso.h * 0.47;
  const hipFromTop = P.neck.h + P.torso.h - 2 + P.hips.h / 2;
  return chestFromTop - hipFromTop;
}
