/**
 * The real cloud: Firebase Auth (Google sign-in) and Firestore.
 *
 *   saves/{uid}                  one save per account (only that account, or an admin, can read it)
 *   saves/{uid}/grants/{id}      money sent by an admin; the player's game applies it once
 *   admins/{uid}                 who is an admin (set by hand in the Firebase console)
 *   adminLog/{id}                every admin money change, for the record
 */
import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut as fbSignOut } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config';
import { CloudSave, CloudStore, Grant, PlayerRow } from './types';

export function firestoreStore(): CloudStore {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  return {
    onUser(cb) {
      return onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, name: u.displayName || u.email || 'Player', email: u.email || '', photo: u.photoURL || undefined } : null));
    },
    async signIn() {
      try {
        await signInWithPopup(auth, provider);
      } catch (e) {
        const code = (e as { code?: string }).code || '';
        // some phones block pop-ups: go the long way round
        if (code.includes('popup-blocked') || code.includes('operation-not-supported')) await signInWithRedirect(auth, provider);
        else if (!code.includes('popup-closed') && !code.includes('cancelled-popup')) throw e;
      }
    },
    async signOut() {
      await fbSignOut(auth);
    },
    async loadSave(uid) {
      const snap = await getDoc(doc(db, 'saves', uid));
      if (!snap.exists()) return null;
      const d = snap.data();
      return { data: d.data, meta: d.meta } as CloudSave;
    },
    async writeSave(uid, save) {
      await setDoc(doc(db, 'saves', uid), { data: save.data, meta: save.meta, updatedAt: serverTimestamp() });
    },
    onGrants(uid, cb) {
      const q = query(collection(db, 'saves', uid, 'grants'), where('applied', '==', false));
      return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Grant, 'id'>) }))), () => cb([]));
    },
    async markApplied(uid, grantId) {
      await updateDoc(doc(db, 'saves', uid, 'grants', grantId), { applied: true, appliedAt: serverTimestamp() });
    },
    async isAdmin(uid) {
      try {
        return (await getDoc(doc(db, 'admins', uid))).exists();
      } catch {
        return false;
      }
    },
    async listPlayers() {
      const snap = await getDocs(collection(db, 'saves'));
      return snap.docs.map((d) => ({ uid: d.id, ...(d.data().meta as Omit<PlayerRow, 'uid'>) }));
    },
    async sendGrant(uid, g) {
      await addDoc(collection(db, 'saves', uid, 'grants'), { ...g, applied: false, at: serverTimestamp() });
      await addDoc(collection(db, 'adminLog'), { player: uid, ...g, at: serverTimestamp() });
    },
  };
}
