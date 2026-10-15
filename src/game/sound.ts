/**
 * Sound: background music, the generator, rain and thunder, NEPA bringing light,
 * and the little pops. Each has its own on/off and volume. Browsers (iPhones most
 * strictly) only allow sound after the player has touched the page, so on the first
 * tap the audio engine is switched on and every sound effect is loaded, ready to play.
 */
import { useEffect, useState } from 'react';

const KEY = 'asanwa-sound';
export type Settings = {
  music: boolean;
  sfx: boolean;
  gen: boolean;
  musicVol: number;
  sfxVol: number;
  genVol: number;
  /** Rain and thunder on wet days. */
  rain: boolean;
  rainVol: number;
  /** Live mirror reflections (heavier on old phones). */
  reflections: boolean;
};
const DEFAULTS: Settings = { music: true, sfx: true, gen: true, musicVol: 0.35, sfxVol: 0.8, genVol: 0.7, rain: true, rainVol: 0.6, reflections: true };

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* storage blocked */
  }
  return { ...DEFAULTS };
}
let settings = read();
const listeners = new Set<() => void>();
function write(next: Settings) {
  settings = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked */
  }
  listeners.forEach((f) => f());
  syncMusic();
  syncGen();
  syncRain();
}
export const soundSettings = () => settings;

// ---------------------------------------------------------------------------
// Music
// ---------------------------------------------------------------------------
let audio: HTMLAudioElement | null = null;
let unlocked = false;
function track() {
  if (!audio) {
    audio = new Audio(`${import.meta.env.BASE_URL}audio/lagos-boutique.mp3`);
    audio.loop = true;
    audio.preload = 'auto';
  }
  audio.volume = settings.musicVol;
  return audio;
}
function syncMusic() {
  if (!unlocked) return;
  const a = track();
  if (settings.music && !document.hidden) a.play().catch(() => undefined);
  else a.pause();
}

/** Call once: starts the sound on the first tap or key press. */
export function armSound() {
  const go = () => {
    unlocked = true;
    // Switch the audio engine on inside the tap (iPhones require this), with a silent
    // blip, then load every sound effect so they are ready the moment they're needed.
    try {
      const c = audioCtx();
      if (c.state === 'suspended') c.resume().catch(() => undefined);
      const blip = c.createBufferSource();
      blip.buffer = c.createBuffer(1, 1, 22050);
      blip.connect(c.destination);
      blip.start();
    } catch {
      /* no Web Audio */
    }
    void loadBuffer('nepa-light-back.mp3');
    void loadBuffer('rain-loop.mp3');
    void loadBuffer('thunder.mp3');
    syncMusic();
    syncGen();
    syncRain();
    window.removeEventListener('pointerdown', go);
    window.removeEventListener('keydown', go);
  };
  window.addEventListener('pointerdown', go);
  window.addEventListener('keydown', go);
  // A phone can suspend audio when the app goes to the background: wake it on the next tap too.
  window.addEventListener('pointerdown', () => { if (ctx && ctx.state !== 'running') ctx.resume().catch(() => undefined); });
  // keep quiet while the tab is hidden
  document.addEventListener('visibilitychange', () => {
    syncMusic();
    syncGen();
    syncRain();
  });
}

let ctx: AudioContext | null = null;
const audioCtx = () => (ctx = ctx || new AudioContext());

/** Decoded sound effects, loaded once. */
const buffers = new Map<string, AudioBuffer>();
const pending = new Map<string, Promise<AudioBuffer | null>>();
function loadBuffer(file: string): Promise<AudioBuffer | null> {
  const have = buffers.get(file);
  if (have) return Promise.resolve(have);
  let p = pending.get(file);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}audio/${file}`)
      .then((r) => r.arrayBuffer())
      .then((data) => audioCtx().decodeAudioData(data))
      .then((b) => { buffers.set(file, b); return b; })
      .catch(() => { pending.delete(file); return null; });
    pending.set(file, p);
  }
  return p;
}

/** Play a loaded effect once. */
function playOnce(file: string, volume: number, rate = 1, delay = 0) {
  const b = buffers.get(file);
  if (!b || !ctx) return false;
  try {
    if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = volume;
    src.connect(g).connect(ctx.destination);
    src.start(ctx.currentTime + delay);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Generator: a seamless loop while it runs. The small one is louder and rougher.
// ---------------------------------------------------------------------------
let genBuffer: AudioBuffer | null = null;
let genLoading = false;
let genNode: { src: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode; kind: 'small' | 'big' } | null = null;
let genWant: 'small' | 'big' | null = null;

async function loadGen() {
  if (genBuffer || genLoading) return;
  genLoading = true;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}audio/generator.wav`);
    genBuffer = await audioCtx().decodeAudioData(await res.arrayBuffer());
  } catch {
    /* no sound then */
  }
  genLoading = false;
  syncGen();
}

function stopGen() {
  if (!genNode) return;
  const n = genNode;
  genNode = null;
  try {
    const now = n.gain.context.currentTime;
    n.gain.gain.cancelScheduledValues(now);
    n.gain.gain.setValueAtTime(n.gain.gain.value, now);
    n.gain.gain.linearRampToValueAtTime(0, now + 0.6);
    n.src.stop(now + 0.65);
  } catch {
    /* already stopped */
  }
}

const genLevel = (kind: 'small' | 'big') => settings.genVol * (kind === 'small' ? 1 : 0.4);

function syncGen() {
  const want = unlocked && settings.gen && !document.hidden ? genWant : null;
  if (!want) return stopGen();
  if (!genBuffer) return void loadGen();
  if (genNode && genNode.kind === want) {
    genNode.gain.gain.setTargetAtTime(genLevel(want), genNode.gain.context.currentTime, 0.1);
    return;
  }
  stopGen();
  try {
    const c = audioCtx();
    if (c.state === 'suspended') c.resume().catch(() => undefined);
    const src = c.createBufferSource();
    src.buffer = genBuffer;
    src.loop = true;
    // small gen: faster and harsher; soundproof gen: lower and muffled
    src.playbackRate.value = want === 'small' ? 1.08 : 0.86;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = want === 'small' ? 9000 : 700;
    const gain = c.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(genLevel(want), c.currentTime + 0.8);
    src.connect(filter).connect(gain).connect(c.destination);
    src.start();
    genNode = { src, gain, filter, kind: want };
  } catch {
    /* audio blocked */
  }
}

/** "Up NEPA!": the Nigerian power-restoration sound when light comes back. */
export function playNepaReturn() {
  if (!unlocked || document.hidden || !settings.sfx) return;
  const volume = Math.min(1.2, Math.max(0.25, settings.sfxVol * 1.3));
  if (playOnce('nepa-light-back.mp3', volume)) return;
  // Not loaded yet (slow network): load it and play as soon as it arrives.
  void loadBuffer('nepa-light-back.mp3').then(() => playOnce('nepa-light-back.mp3', volume));
}

// ---------------------------------------------------------------------------
// Rain: a seamless loop on rainy days, heavier in a storm, with thunder that
// rolls in a moment after each lightning flash.
// ---------------------------------------------------------------------------
let rainWant: 'rain' | 'storm' | null = null;
let rainNode: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
const rainLevel = (kind: 'rain' | 'storm') => settings.rainVol * (kind === 'storm' ? 0.95 : 0.55);

function stopRain() {
  if (!rainNode) return;
  const n = rainNode;
  rainNode = null;
  try {
    const now = n.gain.context.currentTime;
    n.gain.gain.cancelScheduledValues(now);
    n.gain.gain.setValueAtTime(n.gain.gain.value, now);
    n.gain.gain.linearRampToValueAtTime(0, now + 1.5);
    n.src.stop(now + 1.6);
  } catch {
    /* already stopped */
  }
}

function syncRain() {
  const want = unlocked && settings.rain && !document.hidden ? rainWant : null;
  if (!want) return stopRain();
  const buf = buffers.get('rain-loop.mp3');
  if (!buf) return void loadBuffer('rain-loop.mp3').then((b) => b && syncRain());
  const c = audioCtx();
  if (rainNode) {
    rainNode.gain.gain.setTargetAtTime(rainLevel(want), c.currentTime, 0.5);
    return;
  }
  try {
    if (c.state === 'suspended') c.resume().catch(() => undefined);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = c.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(rainLevel(want), c.currentTime + 2);
    src.connect(gain).connect(c.destination);
    src.start(0, Math.random() * buf.duration);
    rainNode = { src, gain };
  } catch {
    /* audio blocked */
  }
}

/** Tell the sound what the sky is doing (null: dry). */
export function setWeatherSound(kind: 'rain' | 'storm' | null) {
  if (rainWant === kind) return;
  rainWant = kind;
  syncRain();
}

/** A lightning flash: thunder follows a moment later, never twice at once. */
let lastThunder = 0;
export function thunderClap() {
  if (!unlocked || document.hidden || !settings.rain || rainWant !== 'storm' || !ctx) return;
  if (ctx.currentTime - lastThunder < 5) return;
  lastThunder = ctx.currentTime;
  playOnce('thunder.mp3', settings.rainVol * (0.55 + Math.random() * 0.45), 0.85 + Math.random() * 0.2, 0.3 + Math.random() * 1.1);
}

/** Tell the sound which generator is running (null: none). */
export function setGenSound(kind: 'small' | 'big' | null) {
  if (genWant === kind) return;
  genWant = kind;
  syncGen();
}

// ---------------------------------------------------------------------------
// Pops
// ---------------------------------------------------------------------------
/** A short notification pop, and a buzz on phones that can vibrate. */
export function pop() {
  if (!settings.sfx) return;
  try {
    navigator.vibrate?.(60);
  } catch {
    /* not supported */
  }
  if (!unlocked) return;
  try {
    const c = audioCtx();
    const now = c.currentTime;
    const peak = Math.max(0.0002, 0.3 * settings.sfxVol);
    [880, 1320].forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, now + i * 0.09);
      g.gain.setValueAtTime(0.0001, now + i * 0.09);
      g.gain.exponentialRampToValueAtTime(peak, now + i * 0.09 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.16);
      o.connect(g).connect(c.destination);
      o.start(now + i * 0.09);
      o.stop(now + i * 0.09 + 0.18);
    });
  } catch {
    /* audio blocked */
  }
}

export function useSound() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const f = () => rerender((n) => n + 1);
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
  }, []);
  return {
    ...settings,
    set: (patch: Partial<Settings>) => write({ ...settings, ...patch }),
    toggleMusic: () => write({ ...settings, music: !settings.music }),
    toggleSfx: () => write({ ...settings, sfx: !settings.sfx }),
  };
}
