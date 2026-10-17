/**
 * Graphics quality for the 3D shop: Auto, Low, Medium or High.
 *
 * Auto starts at Medium and lets the 3D scene's frame-rate monitor move it down to Low on
 * slow phones or up to High on fast ones. The level it settles on is remembered per phone,
 * so the next session starts there. A player can also pick a level by hand in Settings.
 */
import { useSyncExternalStore } from 'react';

export type GfxLevel = 'low' | 'medium' | 'high';
export type GfxSetting = 'auto' | GfxLevel;

export type GfxProfile = {
  /** Canvas resolution range (device pixel ratio). */
  dpr: [number, number];
  /** Real-time shadows (only ever in small shops, as before). */
  shadows: boolean;
  /** How many mirrors may show live reflections. Each one redraws the whole shop. */
  liveMirrors: number;
  /** Multiplier for rain drops. */
  weather: number;
  /** Smooth edges. Only read when the 3D view opens. */
  antialias: boolean;
};

export const GFX: Record<GfxLevel, GfxProfile> = {
  low: { dpr: [0.75, 1], shadows: false, liveMirrors: 0, weather: 0.35, antialias: false },
  medium: { dpr: [1, 1.25], shadows: true, liveMirrors: 1, weather: 0.7, antialias: true },
  high: { dpr: [1, 1.5], shadows: true, liveMirrors: 2, weather: 1, antialias: true },
};

const KEY = 'asanwa-gfx';
type Stored = { setting: GfxSetting; auto: GfxLevel; fps: boolean };
const DEFAULTS: Stored = { setting: 'auto', auto: 'medium', fps: false };

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* storage blocked */
  }
  return { ...DEFAULTS };
}

let state = read();
let snapshot = { ...state, level: levelOf(state) };
const listeners = new Set<() => void>();

function levelOf(s: Stored): GfxLevel {
  return s.setting === 'auto' ? s.auto : s.setting;
}

function write(next: Stored) {
  state = next;
  snapshot = { ...next, level: levelOf(next) };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked */
  }
  listeners.forEach((f) => f());
}

export function setGfx(setting: GfxSetting) {
  write({ ...state, setting });
}

export function setShowFps(fps: boolean) {
  write({ ...state, fps });
}

const ORDER: GfxLevel[] = ['low', 'medium', 'high'];

/** Called by the frame-rate monitor in Auto mode: step one level down or up. */
export function autoStep(dir: -1 | 1) {
  if (state.setting !== 'auto') return;
  const i = ORDER.indexOf(state.auto) + dir;
  if (i < 0 || i >= ORDER.length) return;
  write({ ...state, auto: ORDER[i] });
}

/** Called when the monitor gives up on a phone that keeps dipping: settle on Low. */
export function autoFallback() {
  if (state.setting === 'auto' && state.auto !== 'low') write({ ...state, auto: 'low' });
}

export function gfxNow() {
  return snapshot;
}

export function useGfx() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot,
  );
}
