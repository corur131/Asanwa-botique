/**
 * Background music and the message "pop". Browsers only allow sound after the
 * player has touched the page, so music starts on the first tap.
 */
import { useEffect, useState } from 'react';

const KEY = 'asanwa-sound';
type Settings = { music: boolean; sfx: boolean };

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { music: true, sfx: true, ...JSON.parse(raw) };
  } catch {
    /* storage blocked */
  }
  return { music: true, sfx: true };
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
}

let audio: HTMLAudioElement | null = null;
let unlocked = false;
function track() {
  if (!audio) {
    audio = new Audio(`${import.meta.env.BASE_URL}audio/lagos-boutique.mp3`);
    audio.loop = true;
    audio.volume = 0.35;
    audio.preload = 'auto';
  }
  return audio;
}
function syncMusic() {
  if (!unlocked) return;
  const a = track();
  if (settings.music) a.play().catch(() => undefined);
  else a.pause();
}

/** Call once: starts the music on the first tap or key press. */
export function armSound() {
  const go = () => {
    unlocked = true;
    syncMusic();
    window.removeEventListener('pointerdown', go);
    window.removeEventListener('keydown', go);
  };
  window.addEventListener('pointerdown', go);
  window.addEventListener('keydown', go);
  // keep quiet while the tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (!audio) return;
    if (document.hidden) audio.pause();
    else syncMusic();
  });
}

let ctx: AudioContext | null = null;
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
    ctx = ctx || new AudioContext();
    const now = ctx.currentTime;
    [880, 1320].forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, now + i * 0.09);
      g.gain.setValueAtTime(0.0001, now + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.25, now + i * 0.09 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.16);
      o.connect(g).connect(ctx!.destination);
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
    toggleMusic: () => write({ ...settings, music: !settings.music }),
    toggleSfx: () => write({ ...settings, sfx: !settings.sfx }),
  };
}
