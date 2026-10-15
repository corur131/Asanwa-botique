// How detailed the shop-floor people are on this device.
// 'high': full-detail people with shadows; 'medium': lighter people, no shadows; 'simple': block figures.
// The game guesses from the device, then steps down by itself if the shop runs slowly,
// unless the player picked a level in Settings.
import { useSyncExternalStore } from 'react';

export type PeopleQuality = 'high' | 'medium' | 'simple';
const KEY = 'asanwa-people-quality';
const LOCK = 'asanwa-people-quality-locked';

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string | null) {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* storage blocked */ }
}

function guess(): PeopleQuality {
  const saved = read(KEY) as PeopleQuality | null;
  if (saved === 'high' || saved === 'medium' || saved === 'simple') return saved;
  if (typeof navigator === 'undefined') return 'medium';
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (cores <= 2 || (mem !== undefined && mem <= 2)) return 'simple';
  // iPhones don't report memory; recent ones are fast. Android reports it (capped at 8).
  if (cores >= 6 && (mem === undefined || mem >= 6)) return 'high';
  return 'medium';
}

let current: PeopleQuality = guess();
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

/** The player's own choice from Settings: also stops automatic changes. */
export function setPeopleQuality(q: PeopleQuality) {
  current = q;
  write(KEY, q);
  write(LOCK, '1');
  notify();
}

/** Step down one level because the shop is running slowly (not if the player chose a level). */
export function lowerPeopleQuality(): boolean {
  if (read(LOCK) === '1' || current === 'simple') return false;
  current = current === 'high' ? 'medium' : 'simple';
  write(KEY, current);
  notify();
  return true;
}

export const usePeopleQuality = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => current, () => current);
