// Generated textures for code-built avatars (D-033). Each part is drawn once with Canvas 2D (gradients,
// soft glow), at PART_RES pixels per logical unit for crispness on high-DPI screens, cached in Phaser's
// texture manager by palette and part name, and reused by every avatar. Nothing is drawn per frame.
import type Phaser from 'phaser';
import { TEX_RES } from '../levels/placeholders';
import { needsHillRim, type AvatarPalette } from './config';
import { BALL, ROBOT } from './robotSpec';

export const PART_RES = TEX_RES;
/** Padding around every part (logical px) for outlines and glow. */
const PAD = 3;

/** A part texture: key plus the origin (0..1) that puts its joint at the image position. */
export interface Part {
  key: string;
  ox: number;
  oy: number;
}

const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

/** Mixes a colour toward white (t > 0) or black (t < 0). */
export function tone(c: number, t: number): number {
  const r = (c >> 16) & 255;
  const g = (c >> 8) & 255;
  const b = c & 255;
  const to = t > 0 ? 255 : 0;
  const k = Math.abs(t);
  const m = (v: number) => Math.round(v + (to - v) * k);
  return (m(r) << 16) | (m(g) << 8) | m(b);
}

const OUTLINE = 'rgba(28, 40, 52, 0.55)';
/** Light rim around accent parts whose colour would blend into the green hills (Task 006). */
const RIM = 'rgba(255, 255, 255, 0.85)';

function rimStroke(ctx: CanvasRenderingContext2D, on: boolean, width = 1.1): void {
  if (!on) return;
  ctx.strokeStyle = RIM;
  ctx.lineWidth = width;
  ctx.stroke();
}

function canvasPart(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  ox: number,
  oy: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): Part {
  // Origin given in logical px from the drawing's top-left (before padding).
  const W = w + PAD * 2;
  const H = h + PAD * 2;
  const part = { key, ox: (ox + PAD) / W, oy: (oy + PAD) / H };
  if (scene.textures.exists(key)) return part;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(W * PART_RES);
  canvas.height = Math.ceil(H * PART_RES);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(PART_RES, PART_RES);
    ctx.translate(PAD, PAD);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    draw(ctx);
  }
  scene.textures.addCanvas(key, canvas);
  return part;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Vertical gradient from a lighter top to a slightly darker bottom: soft "plastic" shading. */
function shaded(ctx: CanvasRenderingContext2D, color: number, y0: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, hex(tone(color, 0.25)));
  g.addColorStop(0.55, hex(color));
  g.addColorStop(1, hex(tone(color, -0.18)));
  return g;
}

function fillStroke(ctx: CanvasRenderingContext2D, fill: string | CanvasGradient, line = 1.6): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = line;
  ctx.stroke();
}

/** A vertical capsule hanging from (w/2, w/2): the joint end on top. */
function capsule(ctx: CanvasRenderingContext2D, w: number, len: number, fill: string | CanvasGradient): void {
  roundRect(ctx, 0, 0, w, len + w, w / 2);
  fillStroke(ctx, fill);
}

const pkey = (p: AvatarPalette) => `${p.body.toString(16)}-${p.joint.toString(16)}-${p.accent.toString(16)}-${p.visor.toString(16)}-${p.eye.toString(16)}`;

// ---------- robot ----------

export interface RobotParts {
  head: Part;
  visor: Part;
  ear: Part;
  chest: Part;
  eye: Part;
  eyeHappy: Part;
  antenna: Part;
  torso: Part;
  upperArm: Part;
  forearm: Part;
  hand: Part;
  cannon: Part;
  flash: Part;
  thigh: Part;
  shin: Part;
  boot: Part;
}

export function robotParts(scene: Phaser.Scene, pal: AvatarPalette): RobotParts {
  const P = ROBOT.parts;
  const k = (name: string) => `av-robot-${name}-${pkey(pal)}`;
  const rim = needsHillRim(pal.accent);

  // Head shell, visor and ear discs are separate so the three-quarter view can move them (Task 005c).
  // Origins at their centres.
  const head = canvasPart(scene, k('head'), P.head.w, P.head.h, P.head.w / 2, P.head.h / 2, (ctx) => {
    roundRect(ctx, 0, 0, P.head.w, P.head.h, P.head.radius);
    fillStroke(ctx, shaded(ctx, pal.body, 0, P.head.h), 1.8);
  });
  const Vz = P.visor;
  const visor = canvasPart(scene, k('visor'), Vz.w, Vz.h, Vz.w / 2, Vz.h / 2, (ctx) => {
    roundRect(ctx, 0, 0, Vz.w, Vz.h, Vz.radius);
    const vg = ctx.createLinearGradient(0, 0, 0, Vz.h);
    vg.addColorStop(0, hex(tone(pal.visor, 0.18)));
    vg.addColorStop(1, hex(pal.visor));
    ctx.fillStyle = vg;
    ctx.fill();
    // glossy highlight, centred so the visor looks the same mirrored
    ctx.beginPath();
    ctx.ellipse(Vz.w / 2, 4, Vz.w * 0.26, 2.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fill();
  });
  const E = P.ear;
  const ear = canvasPart(scene, k('ear'), E.r * 2, E.r * 2, E.r, E.r, (ctx) => {
    ctx.beginPath();
    ctx.arc(E.r, E.r, E.r, 0, Math.PI * 2);
    fillStroke(ctx, hex(pal.joint));
    ctx.beginPath();
    ctx.arc(E.r, E.r, E.r - E.ring / 2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = hex(pal.accent);
    ctx.lineWidth = E.ring;
    ctx.stroke();
    if (rim) {
      ctx.beginPath();
      ctx.arc(E.r, E.r, E.r - 0.6, 0, Math.PI * 2);
      rimStroke(ctx, true, 1);
    }
  });

  const glow = (ctx: CanvasRenderingContext2D) => {
    ctx.shadowColor = hex(pal.eye);
    ctx.shadowBlur = 4;
  };
  const eye = canvasPart(scene, k('eye'), P.eye.w, P.eye.h, P.eye.w / 2, P.eye.h / 2, (ctx) => {
    glow(ctx);
    ctx.beginPath();
    ctx.ellipse(P.eye.w / 2, P.eye.h / 2, P.eye.w / 2, P.eye.h / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = hex(pal.eye);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(P.eye.w / 2 - 0.8, P.eye.h / 2 - 1.5, P.eye.w * 0.2, P.eye.h * 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fill();
  });
  const eyeHappy = canvasPart(scene, k('eye-happy'), P.eye.w + 2, P.eye.h, (P.eye.w + 2) / 2, P.eye.h / 2, (ctx) => {
    glow(ctx);
    ctx.beginPath();
    ctx.arc((P.eye.w + 2) / 2, P.eye.h * 0.72, P.eye.w / 2, Math.PI * 1.05, Math.PI * 1.95);
    ctx.strokeStyle = hex(pal.eye);
    ctx.lineWidth = 2.8;
    ctx.stroke();
  });

  const A = P.antenna;
  const aw = A.tip * 2 + 2;
  const antenna = canvasPart(scene, k('antenna'), aw, A.length + A.tip * 2, aw / 2, A.length + A.tip * 2, (ctx) => {
    roundRect(ctx, aw / 2 - A.width / 2, A.tip, A.width, A.length + A.tip, A.width / 2);
    fillStroke(ctx, hex(pal.joint), 1);
    ctx.shadowColor = hex(pal.eye);
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(aw / 2, A.tip, A.tip, 0, Math.PI * 2);
    ctx.fillStyle = hex(pal.accent);
    ctx.fill();
    ctx.shadowBlur = 0;
    rimStroke(ctx, rim, 1);
    ctx.beginPath();
    ctx.arc(aw / 2 - 1, A.tip - 1, A.tip * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();
  });

  // Torso with neck on top and hips band. Origin = middle of the hips band (the hip joint).
  const T = P.torso;
  const tw = Math.max(T.w, P.hips.w);
  const th = P.neck.h + T.h + P.hips.h - 2;
  const hipOy = P.neck.h + T.h - 2 + P.hips.h / 2;
  const torso = canvasPart(scene, k('torso'), tw, th, tw / 2, hipOy, (ctx) => {
    roundRect(ctx, tw / 2 - P.neck.w / 2, 0, P.neck.w, P.neck.h + 4, 2);
    fillStroke(ctx, hex(pal.joint), 1.2);
    roundRect(ctx, tw / 2 - P.hips.w / 2, P.neck.h + T.h - 4, P.hips.w, P.hips.h + 2, 4);
    fillStroke(ctx, hex(pal.joint), 1.2);
    roundRect(ctx, tw / 2 - T.w / 2, P.neck.h, T.w, T.h, T.radius);
    fillStroke(ctx, shaded(ctx, pal.body, P.neck.h, P.neck.h + T.h), 1.8);
  });
  // Hexagonal chest panel, separate so it can slide toward the facing side. Origin = its centre.
  const cr = P.chest.r;
  const cw = cr * 2.4;
  const chest = canvasPart(scene, k('chest'), cw, cr * 2, cw / 2, cr, (ctx) => {
    const cx = cw / 2;
    const cy = cr;
    const hexPath = (r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i * Math.PI) / 3;
        const px = cx + Math.cos(a) * r * 1.15;
        const py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };
    ctx.shadowColor = hex(pal.accent);
    ctx.shadowBlur = 3;
    hexPath(cr);
    ctx.fillStyle = hex(pal.accent);
    ctx.fill();
    ctx.shadowBlur = 0;
    hexPath(cr * 0.5);
    ctx.fillStyle = hex(tone(pal.accent, 0.45));
    ctx.fill();
  });

  const U = P.upperArm;
  const shoulderR = 6;
  const upperArm = canvasPart(scene, k('upper-arm'), shoulderR * 2, U.len + U.w / 2 + shoulderR, shoulderR, shoulderR, (ctx) => {
    ctx.save();
    ctx.translate(shoulderR - U.w / 2, shoulderR - U.w / 2);
    capsule(ctx, U.w, U.len, shaded(ctx, pal.body, 0, U.len));
    ctx.restore();
    ctx.beginPath();
    ctx.arc(shoulderR, shoulderR, shoulderR, 0, Math.PI * 2);
    fillStroke(ctx, hex(pal.joint), 1.2);
  });
  const F = P.forearm;
  const forearm = canvasPart(scene, k('forearm'), F.w, F.len + F.w, F.w / 2, F.w / 2, (ctx) => {
    capsule(ctx, F.w, F.len, shaded(ctx, pal.body, 0, F.len));
    roundRect(ctx, 0.6, F.len - 2, F.w - 1.2, 4, 1.5);
    ctx.fillStyle = hex(pal.accent);
    ctx.fill();
  });
  const H = P.hand;
  const hand = canvasPart(scene, k('hand'), H.r * 2 + 2, H.r * 2 + 1, H.r + 1, 1, (ctx) => {
    ctx.beginPath();
    ctx.arc(H.r + 1, H.r + 1, H.r, 0, Math.PI * 2);
    fillStroke(ctx, shaded(ctx, pal.joint, 0, H.r * 2), 1.2);
    ctx.beginPath();
    ctx.ellipse(H.r * 2 - 0.5, H.r + 0.5, 2.4, 3.2, 0.3, 0, Math.PI * 2);
    fillStroke(ctx, hex(pal.joint), 1);
  });
  const Cn = P.cannon;
  const cannon = canvasPart(scene, k('cannon'), Cn.w, Cn.len, Cn.w / 2, 1, (ctx) => {
    roundRect(ctx, 0, 0, Cn.w, Cn.len, 3);
    fillStroke(ctx, shaded(ctx, pal.accent, 0, Cn.len), 1.4);
    if (rim) {
      roundRect(ctx, 1, 1, Cn.w - 2, Cn.len - 2, 2.4);
      rimStroke(ctx, true, 0.9);
    }
    roundRect(ctx, -0.5, Cn.len - 4, Cn.w + 1, 4, 2);
    fillStroke(ctx, hex(pal.joint), 1);
    ctx.beginPath();
    ctx.ellipse(Cn.w / 2, Cn.len - 1, Cn.w * 0.28, 1.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = hex(pal.visor);
    ctx.fill();
  });
  const flash = canvasPart(scene, k('flash'), 24, 24, 12, 12, (ctx) => {
    const g = ctx.createRadialGradient(12, 12, 1, 12, 12, 12);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, hex(pal.eye));
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const r = i % 2 === 0 ? 12 : 5.5;
      const a = (i * Math.PI) / 8;
      if (i === 0) ctx.moveTo(12 + Math.cos(a) * r, 12 + Math.sin(a) * r);
      else ctx.lineTo(12 + Math.cos(a) * r, 12 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  });

  const Th = P.thigh;
  const thigh = canvasPart(scene, k('thigh'), Th.w, Th.len + Th.w, Th.w / 2, Th.w / 2, (ctx) => {
    capsule(ctx, Th.w, Th.len, shaded(ctx, pal.joint, 0, Th.len));
  });
  const S = P.shin;
  const kneeR = 5.5;
  const shin = canvasPart(scene, k('shin'), S.w, S.len + S.w, S.w / 2, S.w / 2, (ctx) => {
    capsule(ctx, S.w, S.len, shaded(ctx, pal.body, 0, S.len));
    ctx.beginPath();
    ctx.arc(S.w / 2, S.w / 2, kneeR, 0, Math.PI * 2);
    fillStroke(ctx, hex(pal.joint), 1.1);
  });
  const B = P.boot;
  const boot = canvasPart(scene, k('boot'), B.w, B.h, B.heel, B.h - B.ankle, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(B.w - 7, 0);
    ctx.quadraticCurveTo(B.w, 1, B.w, B.h - 3);
    ctx.lineTo(B.w, B.h - 1);
    ctx.lineTo(0, B.h - 1);
    ctx.lineTo(0, 3);
    ctx.quadraticCurveTo(0, 0, 2, 0);
    ctx.closePath();
    fillStroke(ctx, shaded(ctx, pal.body, 0, B.h), 1.6);
    // coloured toe cap
    ctx.save();
    ctx.clip();
    ctx.fillStyle = hex(pal.accent);
    ctx.fillRect(B.w * 0.62, 0, B.w, B.h);
    if (rim) {
      ctx.beginPath();
      ctx.moveTo(B.w * 0.62, 0);
      ctx.lineTo(B.w * 0.62, B.h);
      rimStroke(ctx, true, 1);
    }
    ctx.restore();
    roundRect(ctx, -0.5, B.h - 2.5, B.w + 1, 2.5, 1.2);
    ctx.fillStyle = hex(pal.joint);
    ctx.fill();
  });

  return { head, visor, ear, chest, eye, eyeHappy, antenna, torso, upperArm, forearm, hand, cannon, flash, thigh, shin, boot };
}

// ---------- ball ----------

export interface BallParts {
  body: Part;
  shade: Part;
  sclera: Part;
  happy: Part;
  pupil: Part;
  cheeks: Part;
  smile: Part;
  grin: Part;
  open: Part;
}

export function ballParts(scene: Phaser.Scene, pal: AvatarPalette): BallParts {
  const D = BALL.size;
  const R = D / 2;
  const k = (name: string) => `av-ball-${name}-${pkey(pal)}`;
  const body = canvasPart(scene, k('body'), D, D, R, R, (ctx) => {
    ctx.beginPath();
    ctx.arc(R, R, R - 1, 0, Math.PI * 2);
    ctx.fillStyle = hex(pal.accent);
    ctx.fill();
    // A band and two spots that roll with the ball, so rolling is easy to see.
    ctx.save();
    ctx.clip();
    ctx.fillStyle = hex(pal.body);
    ctx.fillRect(0, R - 9, D, 18);
    ctx.fillStyle = hex(pal.joint);
    ctx.fillRect(0, R - 9, D, 2.5);
    ctx.fillRect(0, R + 6.5, D, 2.5);
    ctx.beginPath();
    ctx.arc(R, R * 0.38, 7, 0, Math.PI * 2);
    ctx.arc(R, R * 1.62, 7, 0, Math.PI * 2);
    ctx.fillStyle = hex(tone(pal.accent, 0.35));
    ctx.fill();
    ctx.restore();
    // A soft light rim just inside the outline when the colour would blend into the hills (Task 006).
    if (needsHillRim(pal.accent)) {
      ctx.beginPath();
      ctx.arc(R, R, R - 2.6, 0, Math.PI * 2);
      rimStroke(ctx, true, 2);
    }
  });
  // Fixed lighting on top of the rolling body: highlight top-left, shade bottom-right, outline.
  const shade = canvasPart(scene, 'av-ball-shade', D, D, R, R, (ctx) => {
    const g = ctx.createRadialGradient(R * 0.7, R * 0.6, R * 0.2, R, R, R);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.75, 'rgba(0,0,0,0.04)');
    g.addColorStop(1, 'rgba(0,0,0,0.26)');
    ctx.beginPath();
    ctx.arc(R, R, R - 1, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(R * 0.62, R * 0.45, R * 0.24, R * 0.13, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fill();
  });
  const E = BALL.eye;
  const sclera = canvasPart(scene, 'av-ball-sclera', E.w, E.h, E.w / 2, E.h / 2, (ctx) => {
    ctx.beginPath();
    ctx.ellipse(E.w / 2, E.h / 2, E.w / 2, E.h / 2, 0, 0, Math.PI * 2);
    fillStroke(ctx, '#ffffff', 1.8);
  });
  const happy = canvasPart(scene, 'av-ball-happy', E.w, E.h, E.w / 2, E.h / 2, (ctx) => {
    ctx.beginPath();
    ctx.arc(E.w / 2, E.h * 0.66, E.w * 0.42, Math.PI * 1.05, Math.PI * 1.95);
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 3.2;
    ctx.stroke();
  });
  const pupil = canvasPart(scene, 'av-ball-pupil', E.pupil * 2, E.pupil * 2, E.pupil, E.pupil, (ctx) => {
    ctx.beginPath();
    ctx.arc(E.pupil, E.pupil, E.pupil, 0, Math.PI * 2);
    ctx.fillStyle = '#263238';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(E.pupil - 1.4, E.pupil - 1.6, 1.4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  });
  const cheeks = canvasPart(scene, 'av-ball-cheeks', 56, 8, 28, 4, (ctx) => {
    ctx.fillStyle = 'rgba(255, 120, 140, 0.55)';
    for (const x of [6, 50]) {
      ctx.beginPath();
      ctx.ellipse(x, 4, 6, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  const smile = canvasPart(scene, 'av-ball-smile', 16, 8, 8, 2, (ctx) => {
    ctx.beginPath();
    ctx.arc(8, -1, 7, Math.PI * 0.2, Math.PI * 0.8);
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 2.6;
    ctx.stroke();
  });
  const grin = canvasPart(scene, 'av-ball-grin', 20, 11, 10, 1, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(1, 1);
    ctx.quadraticCurveTo(10, 3, 19, 1);
    ctx.quadraticCurveTo(18, 11, 10, 11);
    ctx.quadraticCurveTo(2, 11, 1, 1);
    ctx.closePath();
    fillStroke(ctx, '#7b1f2a', 1.6);
    ctx.beginPath();
    ctx.ellipse(10, 8.5, 5, 2.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ff8a80';
    ctx.fill();
  });
  const open = canvasPart(scene, 'av-ball-open', 12, 12, 6, 6, (ctx) => {
    ctx.beginPath();
    ctx.ellipse(6, 6, 5, 6, 0, 0, Math.PI * 2);
    fillStroke(ctx, '#7b1f2a', 1.6);
  });
  return { body, shade, sclera, happy, pupil, cheeks, smile, grin, open };
}

/** Energy ball for shooting (Input Lab): a glowing dot in the accent colour. */
export function energyBall(scene: Phaser.Scene, pal: AvatarPalette): Part {
  return canvasPart(scene, `av-energy-${pkey(pal)}`, 22, 22, 11, 11, (ctx) => {
    const g = ctx.createRadialGradient(11, 11, 1, 11, 11, 11);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, hex(tone(pal.accent, 0.3)));
    g.addColorStop(0.75, hex(pal.accent));
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(11, 11, 11, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Adds an image of a part to a container, at its joint origin and part resolution. */
export function partImage(scene: Phaser.Scene, part: Part): Phaser.GameObjects.Image {
  return scene.add.image(0, 0, part.key).setOrigin(part.ox, part.oy).setScale(1 / PART_RES);
}
