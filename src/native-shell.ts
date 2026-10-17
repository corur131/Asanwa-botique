/**
 * Makes the installed Android app behave like a game rather than a web page:
 * the back button steps back through the game, a short buzz on taps, the screen stays awake.
 * Everything here does nothing in a normal browser.
 */
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { setPopBuzz, soundSettings } from './game/sound';

export const isNativeApp = Capacitor.isNativePlatform();

type BackHandler = () => boolean;
const handlers: BackHandler[] = [];

/** Register what the back button should close. Return true if it handled the press. */
export function onBackButton(h: BackHandler): () => void {
  handlers.push(h);
  return () => {
    const i = handlers.indexOf(h);
    if (i >= 0) handlers.splice(i, 1);
  };
}

/** A short buzz. Light for taps, medium for sales and level-ups. */
export function buzz(kind: 'light' | 'medium' = 'light') {
  if (!isNativeApp || !soundSettings().sfx) return;
  Haptics.impact({ style: kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => {});
}

function toast(text: string) {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText =
    'position:fixed;left:50%;bottom:calc(32px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:99999;' +
    'background:rgba(20,12,24,.92);color:#fff;padding:10px 16px;border-radius:999px;font:600 13px system-ui,sans-serif;pointer-events:none';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

let wakeLock: { release: () => Promise<void> } | null = null;
async function keepAwake() {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    if (nav.wakeLock && document.visibilityState === 'visible') wakeLock = await nav.wakeLock.request('screen');
  } catch {
    /* not allowed right now; try again next time the app is shown */
  }
}

export function initNativeShell() {
  if (!isNativeApp) return;
  setPopBuzz(() => buzz('medium'));
  let lastBack = 0;
  App.addListener('backButton', () => {
    for (let i = handlers.length - 1; i >= 0; i--) {
      try {
        if (handlers[i]()) return;
      } catch {
        /* keep going */
      }
    }
    const now = Date.now();
    if (now - lastBack < 2000) {
      App.exitApp();
      return;
    }
    lastBack = now;
    toast('Press back again to exit');
  });
  // A light buzz on every button tap, like a game.
  document.addEventListener('click', (e) => {
    if ((e.target as Element | null)?.closest?.('button, [role="button"], a')) buzz('light');
  }, { capture: true, passive: true });
  keepAwake();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') keepAwake();
    else wakeLock?.release().catch(() => {});
  });
}
