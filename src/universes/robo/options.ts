// The avatar options: eight colour cards for the robot (D-038). Plain data (no Phaser), so tests can read it.
// Body stays white/light grey (the robot default); accent = the hue, joints = a dark shade of it (so limbs stay
// readable on the green hills), eyes = a light tint. Small size differences and one or two antennae make each card
// feel like its own little robot. Chimes: one recipe, the option's pitch (semitones from C5) and timbre;
// neighbours in pitch never share a timbre. Bigger robots sound lower, smaller ones higher.
import type { AvatarOptionDef } from '../../core/types';

export const options: AvatarOptionDef[] = [
  {
    id: 'red',
    palette: { accent: 0xe53935, joint: 0x7f1919, eye: 0xff8a80 },
    scale: 1,
    antennae: 2,
    chime: { semitones: 0, timbre: 'bright' },
  },
  {
    id: 'orange',
    palette: { accent: 0xfb8c00, joint: 0x7a3a00, eye: 0xffcc80 },
    scale: 1.04,
    antennae: 2,
    chime: { semitones: 4, timbre: 'pluck' },
  },
  {
    id: 'yellow',
    palette: { accent: 0xfdd835, joint: 0x5c4800, eye: 0xfff59d },
    scale: 0.92,
    antennae: 1,
    chime: { semitones: 8, timbre: 'bright' },
  },
  {
    id: 'green',
    palette: { accent: 0x43a047, joint: 0x1b4d20, eye: 0xb9f6ca },
    scale: 0.97,
    antennae: 2,
    chime: { semitones: -2, timbre: 'pluck' },
  },
  {
    id: 'teal',
    palette: { accent: 0x00acc1, joint: 0x00505a, eye: 0x84ffff },
    scale: 1,
    antennae: 1,
    chime: { semitones: 2, timbre: 'bell' },
  },
  {
    id: 'blue',
    palette: { accent: 0x1e88e5, joint: 0x0d3c7a, eye: 0x82b1ff },
    scale: 1.06,
    antennae: 2,
    chime: { semitones: -4, timbre: 'bell' },
  },
  {
    id: 'purple',
    palette: { accent: 0x8e24aa, joint: 0x4a148c, eye: 0xea80fc },
    scale: 1.12,
    antennae: 2,
    chime: { semitones: -6, timbre: 'soft' },
  },
  {
    id: 'pink',
    palette: { accent: 0xec407a, joint: 0x7a0d47, eye: 0xff80ab },
    scale: 0.96,
    antennae: 2,
    chime: { semitones: 6, timbre: 'soft' },
  },
];
