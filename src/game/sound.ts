/**
 * Sound: background music, the generator, and the little pops. Each has its
 * own on/off and volume. Browsers only allow sound after the player has
 * touched the page, so everything starts on the first tap.
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
  /** Live mirror reflections (heavier on old phones). */
  reflections: boolean;
};
const DEFAULTS: Settings = { music: true, sfx: true, gen: true, musicVol: 0.35, sfxVol: 0.8, genVol: 0.7, reflections: true };

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
    syncMusic();
    syncGen();
    window.removeEventListener('pointerdown', go);
    window.removeEventListener('keydown', go);
  };
  window.addEventListener('pointerdown', go);
  window.addEventListener('keydown', go);
  // keep quiet while the tab is hidden
  document.addEventListener('visibilitychange', () => {
    syncMusic();
    syncGen();
  });
}

let ctx: AudioContext | null = null;
const audioCtx = () => (ctx = ctx || new AudioContext());

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

/** Play the supplied Nigerian power-restoration sound when NEPA returns. */
let nepaAudio: HTMLAudioElement | null = null;
export function playNepaReturn() {
  if (!unlocked || document.hidden || !settings.sfx) return;
  try {
    if (!nepaAudio) {
      nepaAudio = new Audio(`${import.meta.env.BASE_URL}audio/nepa-power-return.mp3`);
      nepaAudio.preload = 'auto';
    }
    nepaAudio.currentTime = 0;
    nepaAudio.volume = Math.min(1, Math.max(0.1, settings.sfxVol * 1.35));
    nepaAudio.play().catch(() => undefined);
  } catch {
    /* audio can be unavailable on some devices */
  }
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
