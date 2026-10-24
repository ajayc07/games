// One audio path for the whole app: Web Audio, unlocked on the first user gesture.
// Sounds come from files when available, otherwise from generated placeholder recipes.
import { DEFAULT_RECIPES, POP_STEPS, popRecipe, popSoundId, recipeDuration, type SynthRecipe } from './recipes';
import { DEFAULT_LIMITS, VoiceLimiter } from './voiceLimiter';
import { PendingQueue } from './pendingQueue';

export interface SoundDef {
  /** URL of an audio file. If missing or it fails to load, `synth` is used. */
  file?: string;
  synth?: SynthRecipe;
  /** 0..1, default 1. */
  volume?: number;
}

export type AudioState = 'locked' | 'running';

interface Entry {
  def: SoundDef;
  buffer?: AudioBuffer;
  loading?: Promise<void>;
  failed?: boolean;
}

const UNLOCK_EVENTS = ['pointerdown', 'touchend', 'mousedown', 'keydown'] as const;
/** Fallback synth when an id has neither a working file nor a recipe. */
const FALLBACK: SynthRecipe = DEFAULT_RECIPES.tap;

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly sounds = new Map<string, Entry>();
  private readonly limiter = new VoiceLimiter(DEFAULT_LIMITS);
  private muted = false;
  private volume = 0.8;
  private unlockInstalled = false;
  private readonly pending = new PendingQueue();
  /** How often each id actually started (debug and tests). */
  readonly played = new Map<string, number>();

  constructor() {
    for (const [id, synth] of Object.entries(DEFAULT_RECIPES)) this.register(id, { synth });
    POP_STEPS.forEach((_, i) => this.register(popSoundId(i), { synth: popRecipe(i) }));
  }

  get state(): AudioState {
    return this.ctx?.state === 'running' ? 'running' : 'locked';
  }

  /** Listens for the first gesture (and any later one, in case the browser suspends audio again). */
  installUnlock(target: Window = window): void {
    if (this.unlockInstalled) return;
    this.unlockInstalled = true;
    const unlock = () => this.unlock();
    for (const ev of UNLOCK_EVENTS) target.addEventListener(ev, unlock, { capture: true, passive: true });
  }

  /** Must run inside a user gesture handler. Safe to call often. */
  unlock(): void {
    const ctx = this.context();
    if (!ctx || ctx.state === 'running') return;
    void ctx.resume().then(() => this.flushPending(), () => undefined);
    // iOS: playing a silent buffer inside the gesture fully unlocks output.
    try {
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, 22050);
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      // ignore
    }
  }

  /** Registers or replaces a sound. A file starts loading straight away (in the background). */
  register(id: string, def: SoundDef): void {
    const entry: Entry = { def };
    this.sounds.set(id, entry);
    if (def.file) entry.loading = this.load(id, entry);
  }

  has(id: string): boolean {
    return this.sounds.has(id);
  }

  /**
   * Plays a sound. Never throws. While audio is still unlocking the request is queued and played
   * once it runs, if that is within about 300 ms (so the very first jump is heard). Muted = nothing.
   */
  play(id: string): void {
    try {
      if (this.muted) return;
      const ctx = this.ctx;
      if (!ctx || !this.master || ctx.state !== 'running') {
        this.pending.push(id, performance.now());
        return;
      }
      const entry = this.sounds.get(id);
      const volume = entry?.def.volume ?? 1;
      const buffer = entry?.buffer;
      const recipe = entry?.def.synth ?? FALLBACK;
      const durationMs = (buffer ? buffer.duration : recipeDuration(recipe)) * 1000;
      if (!this.limiter.tryStart(id, performance.now(), durationMs)) return;
      if (buffer) this.playBuffer(ctx, buffer, volume);
      else this.playRecipe(ctx, recipe, volume);
      this.played.set(id, (this.played.get(id) ?? 0) + 1);
    } catch {
      // Audio must never break the game.
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyVolume();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setMasterVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    this.applyVolume();
  }

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
    } catch {
      return null;
    }
    // master gain -> gentle compressor -> speakers, so overlapping sounds never clip.
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 4;
    this.master = this.ctx.createGain();
    this.master.connect(comp).connect(this.ctx.destination);
    this.applyVolume();
    this.ctx.addEventListener('statechange', () => this.flushPending());
    // Decode any files registered before the context existed.
    for (const [id, entry] of this.sounds) {
      if (entry.def.file && !entry.buffer && !entry.failed) entry.loading = this.load(id, entry);
    }
    return this.ctx;
  }

  private flushPending(): void {
    if (this.ctx?.state !== 'running') return;
    for (const id of this.pending.drain(performance.now())) this.play(id);
  }

  private applyVolume(): void {
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  private async load(id: string, entry: Entry): Promise<void> {
    const file = entry.def.file;
    if (!file) return;
    try {
      const res = await fetch(file);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.arrayBuffer();
      const ctx = this.ctx;
      if (!ctx) return; // decoded later, once the context exists
      entry.buffer = await ctx.decodeAudioData(data);
    } catch (err) {
      if (!entry.failed) console.warn(`[audio] "${id}": using placeholder (${file} did not load: ${String(err)})`);
      entry.failed = true;
    }
  }

  private playBuffer(ctx: AudioContext, buffer: AudioBuffer, volume: number): void {
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.buffer = buffer;
    src.connect(gain).connect(this.master!);
    src.start();
  }

  private playRecipe(ctx: AudioContext, recipe: SynthRecipe, volume: number): void {
    const t0 = ctx.currentTime + 0.005;
    for (const tone of recipe.tones) {
      const start = t0 + (tone.at ?? 0);
      const end = start + tone.dur;
      const peak = 0.3 * (tone.gain ?? 1) * volume;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone.type ?? 'sine';
      osc.frequency.setValueAtTime(tone.freq, start);
      if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, end);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain).connect(this.master!);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  }
}

/** The app-wide audio manager. */
export const audio = new AudioManager();
