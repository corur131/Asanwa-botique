/**
 * Installed Android app only: checks GitHub for a newer APK and shows a small banner.
 * The build number is stamped into VITE_APP_BUILD by .github/workflows/android.yml.
 */
import { Capacitor } from '@capacitor/core';

const REPO = 'corur131/asanwa-botique';
const BUILD = Number(import.meta.env.VITE_APP_BUILD || 0);

export function checkForUpdate(): void {
  if (!Capacitor.isNativePlatform() || !BUILD) return;
  fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((rel: { tag_name?: string } | null) => {
      const latest = Number(String(rel?.tag_name || '').split('.').pop());
      if (latest > BUILD) showBanner();
    })
    .catch(() => {});
}

function showBanner(): void {
  const bar = document.createElement('div');
  bar.setAttribute('role', 'status');
  bar.style.cssText =
    'position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:99999;display:flex;gap:10px;align-items:center;' +
    'background:#2a1430;color:#fff;padding:12px 14px;border-radius:14px;font:600 14px system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35)';
  const text = document.createElement('span');
  text.style.flex = '1';
  text.textContent = 'New version of Asanwa Boutique available. Your progress stays.';
  const get = document.createElement('a');
  get.href = `https://github.com/${REPO}/releases/latest/download/asanwa-boutique.apk`;
  get.target = '_blank';
  get.rel = 'noopener';
  get.textContent = 'Download';
  get.style.cssText = 'background:#e8b84a;color:#2a1430;padding:8px 12px;border-radius:10px;text-decoration:none';
  const close = document.createElement('button');
  close.textContent = '×';
  close.setAttribute('aria-label', 'Dismiss');
  close.style.cssText = 'background:none;border:0;color:#fff;font-size:20px;padding:0 4px';
  close.onclick = () => bar.remove();
  bar.append(text, get, close);
  document.body.appendChild(bar);
}
