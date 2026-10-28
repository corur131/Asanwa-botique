import React, { useState } from 'react';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { firebaseConfig } from '../cloud/firebase-config';

// Opened in the SYSTEM browser, not inside Electron: Google blocks OAuth in
// embedded browsers. Only an ephemeral Google OAuth ID token is sent to the
// desktop app's loopback listener, protected by a random one-time state.
export default function BrowserLogin() {
  const params = new URLSearchParams(window.location.search);
  const state = params.get('desktop_login') || '';
  const port = Number(params.get('port'));
  const valid = /^[0-9a-f]{64}$/.test(state) &&
    Number.isInteger(port) && port >= 1024 && port <= 65535;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function connect() {
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      const app = getApps()[0] || initializeApp(firebaseConfig);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(getAuth(app), provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.idToken) throw new Error('Google did not provide an account token.');
      // An ordinary form POST avoids browser CORS restrictions and keeps the
      // credential out of the URL, browser history, and referrer headers.
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'http://127.0.0.1:' + port + '/desktop-auth';
      for (const [name, value] of [['state', state], ['idToken', credential.idToken]]) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.');
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0d0f14] text-white flex items-center justify-center p-6">
      <section className="max-w-md w-full text-center space-y-5 bg-[#1b1722] border border-white/10 rounded-3xl p-8">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-400 text-black font-serif text-4xl font-bold flex items-center justify-center">A</div>
        <h1 className="text-3xl font-serif font-bold">Connect Asanwa Boutique</h1>
        <p className="text-slate-300 text-sm">Choose your Google account in this browser to continue playing in the Windows game. Your shop stays linked to that account.</p>
        {!valid ? (
          <p className="text-rose-300 text-sm">This desktop sign-in link is invalid. Return to the PC game and try again.</p>
        ) : (
          <button type="button" disabled={busy} onClick={() => void connect()}
            className="w-full rounded-xl bg-amber-400 text-black font-bold py-3 disabled:opacity-50">
            {busy ? 'Connecting…' : 'Continue with Google'}
          </button>
        )}
        {error && <p role="alert" className="text-rose-300 text-sm">{error}</p>}
        <p className="text-xs text-slate-500">This page only connects to Asanwa Boutique running on your own computer. Close it if you did not start sign-in from the game.</p>
      </section>
    </main>
  );
}
