# Free-form Gemini chat (prototype)

This branch adds a free-text composer to WhatsApp and a protected Express endpoint that calls Gemini from the server. The Gemini key is never sent to the browser.

## Local setup

1. Use Node.js 20+.
2. Install dependencies: `npm install`
3. Create a local `.env` file (do not commit it) containing:
   ```env
   GEMINI_API_KEY=your_key_from_Google_AI_Studio
   # Optional: choose a model available to your API key
   GEMINI_MODEL=gemini-3.8-flash
   PORT=8787
   ```
4. In terminal 1, start the API and static server: `npm run server`
5. In terminal 2, start Vite: `npm run dev`
6. Open the Vite URL. The Vite dev server forwards `/api` requests to port 8787.

You can check the server at `http://localhost:8787/api/health`. `aiConfigured` must be true before AI replies can work.

## Deployment

This is now a **server-backed** feature. A static Firebase Hosting deployment alone cannot execute `server.ts`; deploy the app as a Node/Cloud Run service (build with `npm run build`, start with `npm start`) and configure `GEMINI_API_KEY` as a server secret/environment variable. Do not put the key in `VITE_*` variables, source files, or GitHub. If the existing game is currently hosted only on Firebase Hosting, its deployment needs an API rewrite/proxy to the server before this feature will work online.

The endpoint includes a modest in-memory rate limit for development. Before opening the game to public traffic, add real player authentication, a shared rate limiter, and persistent conversation memory.

## Current prototype boundaries

- Free-form messages are stored in the game's save state and sent to Gemini with recent chat context and the selected character's compact saved memory.
- Each main rival has a distinct voice and ambition. Private-chat memories are separated from the memory used in the shared Lagos Fashion Babes group.
- Gemini may return a structured collaboration response for an explicit joint fashion pop-up proposal sent privately to one of the five main rivals. Ordinary messages, group messages and chats with other contacts should not create a collaboration action.
- An accept/counter response is only a proposal. Divine must press **Confirm pop-up** or **Accept counter-offer** in WhatsApp. The engine checks that both businesses can fund their shares, deducts setup contributions, and schedules the event 3–14 in-game days ahead.
- At the event day's closing time, the engine calculates simulated sales based on business reputation, audience size and random market conditions. It records the result in the rival DM and GistLagos, and applies cash payouts plus appropriate follower, reputation and relationship changes. This is a simulated business outcome; there is not yet a separate rendered pop-up venue or customer-by-customer event scene.
- Gemini never writes money, follower, reputation, relationship or event results directly. The game engine validates and applies them.
- The existing scripted prompts, choices and game systems remain available.
- Memory is a compact record in the saved game, not a complete transcript or guarantee of perfect recall. Old saves are migrated with an empty collaboration list.
- A provider outage or invalid API key displays an error and lets the player retry.
