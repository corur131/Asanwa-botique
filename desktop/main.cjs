'use strict';

const { app, BrowserWindow, ipcMain, net, protocol, shell } = require('electron');
const { randomBytes, timingSafeEqual } = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// A stable, secure origin keeps IndexedDB, Firebase Auth, and local saves
// consistent between launches. Never load the UI through file:// or a random port.
protocol.registerSchemesAsPrivileged([{
  scheme: 'asanwa',
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
}]);

const GAME_ORIGIN = 'asanwa://game';
const LOGIN_ORIGIN = 'https://asanwa-boutique-game.web.app';
const AI_ENDPOINT = 'https://asanwa-botique.onrender.com/api/ai-chat';
let gameWindow = null;
let pendingLogin = null;

function safeExternal(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isWithin(root, child) {
  return child === root || child.startsWith(root + path.sep);
}

function installGameProtocol() {
  const root = path.resolve(__dirname, '..', 'dist');
  protocol.handle('asanwa', (request) => {
    try {
      const url = new URL(request.url);
      if (url.protocol !== 'asanwa:' || url.hostname !== 'game' || request.method !== 'GET') {
        return new Response('Forbidden', { status: 403 });
      }
      const pathname = decodeURIComponent(url.pathname);
      if (pathname.includes('\0')) return new Response('Invalid path', { status: 400 });
      let file = path.resolve(root, '.' + pathname);
      if (!isWithin(root, file)) return new Response('Forbidden', { status: 403 });
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        if (path.extname(file)) return new Response('Not found', { status: 404 });
        file = path.join(root, 'index.html');
      }
      return net.fetch(pathToFileURL(file).toString());
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0d0f14',
    title: 'Asanwa Boutique',
    icon: path.join(__dirname, '..', 'assets', 'icon-only.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });
  gameWindow = window;
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (safeExternal(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith(GAME_ORIGIN + '/')) return;
    event.preventDefault();
    if (safeExternal(url)) void shell.openExternal(url);
  });
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      event.preventDefault();
      window.setFullScreen(!window.isFullScreen());
    }
  });
  window.on('closed', () => { if (gameWindow === window) gameWindow = null; });
  void window.loadURL(GAME_ORIGIN + '/index.html');
}

function beginBrowserLogin() {
  return new Promise((resolve, reject) => {
    const state = randomBytes(32).toString('hex');
    let settled = false;
    let timeout;
    const server = http.createServer((req, res) => {
      if (req.method !== 'POST' || req.url !== '/desktop-auth') {
        res.writeHead(404).end();
        return;
      }
      // Never accept a credential from an arbitrary website or process.
      if (req.headers.origin !== LOGIN_ORIGIN || req.headers.host !== '127.0.0.1:' + server.address().port) {
        res.writeHead(403).end('Invalid login origin');
        return;
      }
      let body = '';
      let length = 0;
      req.on('data', (chunk) => {
        length += chunk.length;
        if (length > 16384) {
          res.writeHead(413).end('Request too large');
          req.destroy();
          return;
        }
        body += chunk.toString('utf8');
      });
      req.on('end', () => {
        if (length > 16384 || settled) return;
        const fields = new URLSearchParams(body);
        const received = fields.get('state') || '';
        const idToken = fields.get('idToken') || '';
        const validState = received.length === state.length &&
          timingSafeEqual(Buffer.from(received), Buffer.from(state));
        if (!validState || idToken.length < 100 || idToken.length > 12000 || idToken.split('.').length !== 3) {
          res.writeHead(403).end('Invalid login response');
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
          'Referrer-Policy': 'no-referrer',
        });
        res.end('<!doctype html><html><meta charset="utf-8"><title>Asanwa Boutique</title><body style="background:#15121e;color:#fff;font:18px sans-serif;text-align:center;padding:60px"><h2>Account connected</h2><p>Return to Asanwa Boutique on your PC. You can close this tab.</p></body></html>');
        finish(null, idToken);
      });
    });
    const finish = (error, token) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      server.close();
      if (error) reject(error);
      else resolve(token);
    };
    server.on('error', (error) => finish(error));
    server.listen(0, '127.0.0.1', async () => {
      const port = server.address().port;
      const authUrl = LOGIN_ORIGIN + '/?desktop_login=' + state + '&port=' + port;
      timeout = setTimeout(() => finish(new Error('Sign-in expired. Try again.')), 5 * 60 * 1000);
      try {
        await shell.openExternal(authUrl);
      } catch (error) {
        finish(error);
      }
    });
  });
}

app.whenReady().then(() => {
  installGameProtocol();
  ipcMain.handle('desktop:google-token', (event) => {
    if (!gameWindow || event.sender !== gameWindow.webContents) throw new Error('Invalid window');
    if (!pendingLogin) pendingLogin = beginBrowserLogin().finally(() => { pendingLogin = null; });
    return pendingLogin;
  });
  // The app's custom origin is not an allowed CORS origin at the AI server.
  // Keep the Gemini key server-side and proxy only this fixed endpoint.
  ipcMain.handle('desktop:ai-chat', async (event, body) => {
    if (!gameWindow || event.sender !== gameWindow.webContents) throw new Error('Invalid window');
    if (typeof body !== 'string' || body.length > 60000) throw new Error('Invalid chat payload');
    const response = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(60000),
    });
    return { status: response.status, body: await response.text() };
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
