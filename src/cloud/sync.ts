/**
 * Keeping the device copy and the cloud copy of a save in step.
 * The device copy is written on every change (as before); the cloud copy is
 * written a few seconds after changes stop, at the end of each phase, and when
 * the tab is hidden. When loading, the newest copy wins.
 */
import LZString from 'lz-string';
const { compressToUTF16, decompressFromUTF16 } = LZString;
import * as E from '../game/engine';
import { GameState } from '../game/types';
import { CloudSave, CloudStore, CloudUser } from './types';

export function pack(s: GameState, u: CloudUser): CloudSave {
  return {
    data: compressToUTF16(JSON.stringify(s)),
    meta: { name: u.name, email: u.email, day: s.day, cash: Math.round(s.cash), tier: s.tier, version: s.version, savedAt: s.savedAt || Date.now() },
  };
}

export function unpack(c: CloudSave): GameState | null {
  try {
    const json = decompressFromUTF16(c.data);
    if (!json) return null;
    const s = E.fromData(JSON.parse(json));
    return s ? { ...s, savedAt: s.savedAt || c.meta.savedAt } : null;
  } catch {
    return null;
  }
}

/** The newer of two copies (either can be missing). */
export function newest(a: GameState | null, b: GameState | null): GameState | null {
  if (!a) return b;
  if (!b) return a;
  return (b.savedAt || 0) > (a.savedAt || 0) ? b : a;
}

export class CloudSync {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: GameState | null = null;
  private lastPhase = '';
  status: 'saved' | 'saving' | 'offline' = 'saved';
  onStatus?: (s: CloudSync['status']) => void;

  constructor(private store: CloudStore, private user: CloudUser, private delay = 8000) {}

  /** Call on every state change. */
  push(s: GameState) {
    this.pending = s;
    const phaseChanged = s.phase !== this.lastPhase;
    this.lastPhase = s.phase;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), phaseChanged ? 300 : this.delay);
  }

  async flush() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const s = this.pending;
    if (!s) return;
    this.pending = null;
    this.set('saving');
    try {
      await this.store.writeSave(this.user.uid, pack(s, this.user));
      this.set(this.pending ? 'saving' : 'saved');
    } catch {
      // keep it for the next try; the device copy is already safe
      this.pending = this.pending || s;
      this.set('offline');
      this.timer = setTimeout(() => this.flush(), 15000);
    }
  }

  private set(st: CloudSync['status']) {
    this.status = st;
    this.onStatus?.(st);
  }
}
