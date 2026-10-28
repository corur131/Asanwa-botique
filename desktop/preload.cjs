'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Expose narrowly scoped operations. No Node.js APIs or general-purpose
// network/file-system access are available to the game UI.
contextBridge.exposeInMainWorld('asanwaDesktop', Object.freeze({
  isDesktop: true,
  requestGoogleToken: () => ipcRenderer.invoke('desktop:google-token'),
  postAiChat: (jsonBody) => ipcRenderer.invoke('desktop:ai-chat', jsonBody),
}));
