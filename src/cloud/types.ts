/** What the game needs from "the cloud". Firestore in real life; an in-memory stand-in for tests. */
export interface CloudUser {
  uid: string;
  name: string;
  email: string;
  photo?: string;
}

export interface SaveMeta {
  name: string;
  email: string;
  day: number;
  cash: number;
  tier: number;
  version: number;
  savedAt: number;
}

export interface CloudSave {
  /** The game state, compressed. */
  data: string;
  meta: SaveMeta;
}

export interface Grant {
  id: string;
  kind: 'add' | 'set';
  amount: number;
  reason: string;
  by: string;
}

export interface PlayerRow extends SaveMeta {
  uid: string;
}

export interface CloudStore {
  /** Calls back with the signed-in user (or null) now and whenever it changes. */
  onUser(cb: (u: CloudUser | null) => void): () => void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  loadSave(uid: string): Promise<CloudSave | null>;
  writeSave(uid: string, save: CloudSave): Promise<void>;
  /** Money an admin has sent that this player's game hasn't applied yet. */
  onGrants(uid: string, cb: (g: Grant[]) => void): () => void;
  markApplied(uid: string, grantId: string): Promise<void>;
  isAdmin(uid: string): Promise<boolean>;
  listPlayers(): Promise<PlayerRow[]>;
  sendGrant(uid: string, g: Omit<Grant, 'id'>): Promise<void>;
}
