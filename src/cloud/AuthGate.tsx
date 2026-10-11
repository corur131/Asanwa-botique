import React, { useEffect, useMemo, useRef, useState } from 'react';
import GameApp from '../game/GameApp';
import * as E from '../game/engine';
import { naira, TIERS } from '../game/economy';
import { GameState } from '../game/types';
import { cloudEnabled, getCloud } from './index';
import { CloudSync, newest, unpack } from './sync';
import { CloudStore, CloudUser } from './types';

export interface CloudSession {
  store: CloudStore;
  user: CloudUser;
  sync: CloudSync;
  isAdmin: boolean;
  signOut: () => void;
}

const CLAIMED = 'asanwa-legacy-claimed';

/**
 * Sign in with Google, then play your own save. Without a Firebase config the
 * game runs exactly as before (one save on this device).
 */
export default function AuthGate({ onLab }: { onLab: () => void }) {
  const enabled = cloudEnabled();
  const [store, setStore] = useState<CloudStore | null>(null);
  const [user, setUser] = useState<CloudUser | null | undefined>(undefined);
  const [offline, setOffline] = useState(false);
  const [initial, setInitial] = useState<GameState | null | undefined>(undefined);
  const [legacy, setLegacy] = useState<GameState | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let off = () => {};
    getCloud()
      .then((s) => {
        setStore(s);
        off = s.onUser(setUser);
      })
      .catch(() => setError("Couldn't reach the sign-in service. You can still play on this device."));
    return () => off();
  }, [enabled]);

  // signed in: find the newest copy of this account's save
  useEffect(() => {
    if (!store || !user) return;
    let alive = true;
    setInitial(undefined);
    (async () => {
      const local = E.load(E.keyFor(user.uid));
      let cloud: GameState | null = null;
      try {
        const c = await store.loadSave(user.uid);
        cloud = c ? unpack(c) : null;
      } catch {
        setError('No internet right now: playing your copy on this device. It will sync when you are back online.');
      }
      const best = newest(local, cloud);
      if (!alive) return;
      const old = !best && !localStorage.getItem(CLAIMED) ? E.load(E.LEGACY_KEY) : null;
      setLegacy(old);
      setInitial(best);
      store.isAdmin(user.uid).then((a) => alive && setIsAdmin(a));
    })();
    return () => {
      alive = false;
    };
  }, [store, user]);

  const sync = useMemo(() => (store && user ? new CloudSync(store, user) : null), [store, user]);
  const syncRef = useRef(sync);
  syncRef.current = sync;
  useEffect(() => {
    const flush = () => syncRef.current?.flush();
    const hide = () => document.hidden && flush();
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  if (!enabled || offline) return <GameApp onLab={onLab} />;

  if (user === undefined && !error) return <Splash text="Opening Asanwa Boutique…" />;

  if (!user || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-300 flex items-center justify-center font-serif font-bold text-black text-2xl">A</div>
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-amber-300/80">Yaba, Lagos</div>
            <h1 className="font-serif text-3xl font-bold text-white">Asanwa Boutique</h1>
            <p className="text-sm text-slate-400 mt-2">Sign in so your shop is saved to your account. Play on your phone or laptop and pick up where you left off.</p>
          </div>
          {error && <p className="text-sm text-amber-300">{error}</p>}
          <button
            disabled={!store || busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                await store!.signIn();
              } catch {
                setError("Sign-in didn't work. Check your internet and try again.");
              }
              setBusy(false);
            }}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-white text-[#1f1f1f] font-semibold py-3 shadow-lg disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.8 6C12.3 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.5 5.8c4.4-4 6.8-10 6.8-17.1z"/><path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C1 16.6 0 20.2 0 24s1 7.4 2.6 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.8l-7.8 6C6.6 42.6 14.6 48 24 48z"/></svg>
            {busy ? 'Signing in…' : 'Sign in with Google'}
          </button>
          <button onClick={() => setOffline(true)} className="text-xs text-slate-400 underline">Play on this device without an account</button>
        </div>
      </div>
    );
  }

  if (initial === undefined) return <Splash text={`Loading ${user.name.split(' ')[0]}'s shop…`} />;

  if (legacy && initial === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full rounded-2xl border border-white/10 bg-[#15171f] p-5 space-y-3">
          <h2 className="font-serif text-xl font-bold text-white">Welcome, {user.name.split(' ')[0]}!</h2>
          <p className="text-sm text-slate-300">
            This device already has a game: <b>day {legacy.day}</b>, {TIERS[legacy.tier].name}, <b>{naira(legacy.cash)}</b>. Do you want to bring it into your account?
          </p>
          <p className="text-xs text-slate-500">Only do this if it's your game. Each account gets its own save, so your partner can sign in with her own account and start fresh.</p>
          <div className="flex flex-col gap-2">
            <button className="rounded-xl bg-amber-500 text-black font-semibold py-2.5" onClick={() => { localStorage.setItem(CLAIMED, user.uid); setInitial({ ...legacy, savedAt: Date.now() }); setLegacy(null); }}>Yes, it's my game</button>
            <button className="rounded-xl border border-white/20 text-slate-200 py-2.5" onClick={() => setLegacy(null)}>No, start a new game</button>
          </div>
        </div>
      </div>
    );
  }

  const session: CloudSession = {
    store,
    user,
    sync: sync!,
    isAdmin,
    signOut: async () => {
      await sync?.flush();
      await store.signOut();
      setInitial(undefined);
    },
  };
  return <GameApp key={user.uid} onLab={onLab} initial={initial} storageKey={E.keyFor(user.uid)} cloud={session} notice={error} />;
}

const Splash: React.FC<{ text: string }> = ({ text }) => <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">{text}</div>;
