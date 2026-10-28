# Asanwa Boutique for Windows (64-bit)

The Windows app packages the **actual React/Vite game** as an installable desktop game.
It does not require a browser tab to play. All ordinary game content is included in the
installer; Firebase cloud saves and Gemini chat require an internet connection.

## Download (after the Windows workflow succeeds on main)

1. Open the repository's **Releases** page and select the most recent release
   whose title begins **Asanwa Boutique PC - Windows build**.
2. Download `Asanwa-Boutique-Windows-1.0.0-x64.exe`.
3. Run the installer. A desktop and Start-menu shortcut will be created.
4. Open the game and choose **Sign in with Google**. The app opens the default
   Windows browser for Google sign-in; after choosing your account you return
   to the game. Each account loads its existing Firestore save.
5. Press **F11** to toggle fullscreen.

Windows may warn that the installer has an unknown publisher: this build does
**not** have a purchased Windows code-signing certificate. Do not disable your
antivirus or security features; verify that you downloaded the installer from
your own GitHub repository. Code signing is recommended before wider distribution.

For a one-off test build, open **Actions → Windows PC game**, select a successful
run, and download the `asanwa-boutique-windows` artifact (a ZIP containing the installer).
Artifacts expire after 30 days. GitHub Releases do not have this artifact timeout.

## Build it yourself

Requirements: Windows 10/11 (x64), Node.js 22.12+, npm and internet access for
dependencies and Firebase/AI services.

```powershell
npm install --legacy-peer-deps
npm run lint
npm run desktop:package
```

The Windows installer will appear under `desktop-dist/`.
To run a local desktop build without packaging: `npm run desktop:run`.

## Desktop account sign-in

Google blocks OAuth flows inside embedded Chromium windows. The desktop app
therefore launches the **system browser** at:

`https://asanwa-boutique-game.web.app/?desktop_login=...&port=...`

The web sign-in screen uses Firebase's existing Google provider and returns a
temporary Google credential to a **127.0.0.1-only** listener, with a random
one-time state and a short timeout. The desktop application signs in to the
same Firebase project as the website/Android version. The account's cloud save
then synchronizes through the existing code.

**Important:** The Firebase Hosting deployment must include the new desktop
login screen from this branch. The existing `.github/workflows/deploy.yml`
normally publishes it when the changes are merged to `main`. If that
deployment is skipped, desktop account sign-in will not work until it is live.

The custom `asanwa://game` origin is stable, so Firebase Auth persistence and
local device saves survive restarts. Guests who choose "play on this device"
have *separate* local progress from the web/Android guest modes.

The desktop app proxies Gemini chat through its main process to the existing
Render endpoint so the AI server's CORS restrictions do not prevent chats.
No Gemini API key is embedded in the desktop installer.

## Distribution and limitations

- Windows x64 only; Android APK and website build workflows remain unchanged.
- No native multiplayer mode is being added. Separate Google accounts still
  have separate existing cloud saves.
- No automatic PC updater in this first version. Download and run a newer
  Windows installer from GitHub Releases for future updates; saved data remains.
- Installer, Google account flow, Windows rendering, and cloud-save round trip
  must be tested on a real Windows 10/11 machine before wider distribution.
- Avoid publishing desktop sign-in links outside the application; they are
  temporary links for a specific local PC session.
