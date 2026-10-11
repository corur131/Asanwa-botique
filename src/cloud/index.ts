import { firebaseConfig } from './firebase-config';
import { CloudStore } from './types';

/** True when the game should use accounts and cloud saves. */
export const cloudEnabled = () => !!firebaseConfig.apiKey || import.meta.env.VITE_FAKE_CLOUD === '1';

let store: Promise<CloudStore> | null = null;
/** The cloud, loaded only when needed so offline play stays light. */
export function getCloud(): Promise<CloudStore> {
  if (!store) store = import.meta.env.VITE_FAKE_CLOUD === '1' ? import('./memory').then((m) => m.memoryStore()) : import('./firestore').then((m) => m.firestoreStore());
  return store;
}
