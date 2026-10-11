# Putting Asanwa Boutique online with Google sign-in

About 15 minutes, all in the browser. Until step 3 is done the game keeps working
exactly as before (one save on the device, no sign-in).

## 1. Create the Firebase project
1. Go to https://console.firebase.google.com → **Create a project** → name it `asanwa-boutique` → you can turn Google Analytics off → **Create**.

## 2. Turn on Google sign-in
1. Left menu **Build → Authentication → Get started**.
2. **Sign-in method → Google → Enable**, pick your email as support email → **Save**.

## 3. Create the database and lock it down
1. **Build → Firestore Database → Create database** → choose a location → **Start in production mode** → **Create**.
2. Open the **Rules** tab, delete what's there, paste everything from `firestore.rules` in this repo → **Publish**.

## 4. Connect the game to the project
1. Gear icon → **Project settings → General → Your apps** → click the **</>** (Web) icon → give it a nickname → tick **Also set up Firebase Hosting** → **Register app**.
2. Firebase shows a `firebaseConfig = { apiKey: ..., ... }` block. Copy those six values into `src/cloud/firebase-config.ts` (on GitHub: open the file → pencil icon → paste → **Commit changes**). These values are safe to be public; the rules protect the data.
3. In `.firebaserc`, replace `PUT-YOUR-FIREBASE-PROJECT-ID-HERE` with your project ID (shown in Project settings).

## 5. Let GitHub put every update live
1. **Project settings → Service accounts → Generate new private key** → a `.json` file downloads. Keep it private.
2. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Secret: open the downloaded `.json` file and paste **all** of it.
3. GitHub repo → **Actions** tab → **Deploy to Firebase Hosting** → **Run workflow** (or just push any change).
4. When it turns green the game is live at `https://<your-project-id>.web.app`. From now on **every push to main goes live automatically** in a few minutes.

## 6. Make yourself the admin
1. Open the live game, **Sign in with Google**, open **Menu** and copy your **Player ID** (the grey code at the bottom of your account box).
2. Firebase console → **Firestore Database → + Start collection** → Collection ID `admins` → Document ID: paste your Player ID → add a field `role` = `owner` → **Save**.
3. Reload the game. **Menu → Admin** now lets you give, take or set money for any player. Nobody can make themselves admin from the game; only this console can.

## Notes
- Each Google account has its own shop. Your girlfriend signs in with hers on her phone and starts fresh.
- The first account to sign in on a device that already has a game is offered that game ("Yes, it's my game").
- Progress is saved on the device on every change and to the account a few seconds later, at the end of each day, and when the app is put away. With no internet it keeps playing and syncs when it's back.
- Old saves always load after updates: the game upgrades them.
- Menu → **Download a backup** still works as an extra safety copy.
