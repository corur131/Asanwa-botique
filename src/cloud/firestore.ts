/**
 * The real cloud: Firebase Auth (Google sign-in) and Firestore.
 *
 *   saves/{uid}                  one save per account (only that account, or an admin, can read it)
 *   saves/{uid}/grants/{id}      money sent by an admin; the player's game applies it once
 *   admins/{uid}                 who is an admin (set by hand in the Firebase console)
 *   adminLog/{id}                every admin money change, for the record
 */
import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, indexedDBLocalPersistence, initializeAuth, onAuthStateChanged, signInWithCredential, signInWithPopup, signInWithRedirect, signOut as fbSignOut } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config';
import { CloudSave, CloudStore, Grant, PlayerRow } from './types';

export function firestoreStore(): CloudStore {
  const app = initializeApp(firebaseConfig);
  // Inside the installed Android app, Google blocks web sign-in pop-ups, so we use the phone's own
  // Google account picker and hand the result to the normal Firebase web SDK.
  const native = Capacitor.isNativePlatform();
  const auth = native ? initializeAuth(app, { persistence: indexedDBLocalPersistence }) : getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  return {
    onUser(cb) {
      return onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, name: u.displayName || u.email || 'Player', email: u.email || '', photo: u.photoURL || undefined } : null));
    },
    async signIn() {
      if (native) {
        try {
          const result = await FirebaseAuthentication.signInWithGoogle();
          const idToken = result.credential?.idToken;
          if (!idToken) throw new Error('Google sign-in did not return an account token.');
          await signInWithCredential(auth, GoogleAuthProvider.credential(idToken, result.credential?.accessToken));
        } catch (e) {
          const msg = String((e as { message?: string }).message || e).toLowerCase();
          if (!msg.includes('cancel')) throw e;
        }
        return;
      }
      if (window.asanwaDesktop) {
        // Google OAuth is blocked in embedded desktop browsers. Sign in from
        // the system browser, then exchange the Google ID token with Firebase.
        const idToken = await window.asanwaDesktop.requestGoogleToken();
        await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
        return;
      }
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
      if (native) await FirebaseAuthentication.signOut().catch(() => {});
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
