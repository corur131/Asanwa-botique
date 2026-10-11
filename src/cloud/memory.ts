/**
 * A stand-in cloud that lives in this browser tab's localStorage. Only used by
 * test builds (VITE_FAKE_CLOUD=1) to try sign-in, syncing and admin controls
 * without a real Firebase project. Never part of the real game.
 */
import { CloudSave, CloudStore, CloudUser, Grant, PlayerRow } from './types';

const K = 'fakecloud';
type DB = { user: CloudUser | null; saves: Record<string, CloudSave>; grants: Record<string, (Grant & { applied: boolean })[]>; admins: string[] };
const read = (): DB => {
  try {
    return { user: null, saves: {}, grants: {}, admins: ['admin-uid'], ...JSON.parse(localStorage.getItem(K) || '{}') };
  } catch {
    return { user: null, saves: {}, grants: {}, admins: ['admin-uid'] };
  }
};
const write = (d: DB) => localStorage.setItem(K, JSON.stringify(d));

export function memoryStore(): CloudStore {
  const users: ((u: CloudUser | null) => void)[] = [];
  const grantCbs: Record<string, (g: Grant[]) => void> = {};
  const fireGrants = (uid: string) => grantCbs[uid]?.((read().grants[uid] || []).filter((g) => !g.applied));
  return {
    onUser(cb) {
      users.push(cb);
      setTimeout(() => cb(read().user), 50);
      return () => users.splice(users.indexOf(cb), 1);
    },
    async signIn() {
      // test hook: whoever is named in 'fakecloud-next' signs in
      const who = localStorage.getItem('fakecloud-next') || 'admin';
      const u: CloudUser = who === 'admin' ? { uid: 'admin-uid', name: 'Shaka', email: 'admin@example.com' } : { uid: `${who}-uid`, name: who, email: `${who}@example.com` };
      write({ ...read(), user: u });
      users.forEach((f) => f(u));
    },
    async signOut() {
      write({ ...read(), user: null });
      users.forEach((f) => f(null));
    },
    async loadSave(uid) {
      return read().saves[uid] || null;
    },
    async writeSave(uid, save) {
      const d = read();
      write({ ...d, saves: { ...d.saves, [uid]: save } });
    },
    onGrants(uid, cb) {
      grantCbs[uid] = cb;
      setTimeout(() => fireGrants(uid), 50);
      const t = setInterval(() => fireGrants(uid), 1500);
      return () => clearInterval(t);
    },
    async markApplied(uid, id) {
      const d = read();
      write({ ...d, grants: { ...d.grants, [uid]: (d.grants[uid] || []).map((g) => (g.id === id ? { ...g, applied: true } : g)) } });
    },
    async isAdmin(uid) {
      return read().admins.includes(uid);
    },
    async listPlayers() {
      return Object.entries(read().saves).map(([uid, s]) => ({ uid, ...s.meta }) as PlayerRow);
    },
    async sendGrant(uid, g) {
      const d = read();
      const id = `g${Date.now().toString(36)}`;
      write({ ...d, grants: { ...d.grants, [uid]: [...(d.grants[uid] || []), { ...g, id, applied: false }] } });
      fireGrants(uid);
    },
  };
}
