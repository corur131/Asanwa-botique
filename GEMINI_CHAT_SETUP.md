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

- Free-form messages are stored in the existing local game state and are sent to Gemini with the latest chat context.
- Gemini writes dialogue only. It does not directly modify in-game money, followers, reputation, or rival relationship values.
- The existing scripted prompts and choices remain available.
- Conversation memory is limited to recent messages; it is not yet durable character memory across deleted/trimmed messages or devices.
- A provider outage or invalid API key displays an error and lets the player retry.
