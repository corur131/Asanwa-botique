import React, { useState } from 'react';
import App from './App';
import GameApp from './game/GameApp';
import { SharedDefs } from './components/SharedDefs';

/** The game is the main screen; the Character Lab (the old builder) is one click away. */
export default function Root() {
  const [mode, setMode] = useState<'game' | 'lab'>(() => (location.hash === '#lab' ? 'lab' : 'game'));
  const go = (m: 'game' | 'lab') => {
    setMode(m);
    history.replaceState(null, '', m === 'lab' ? '#lab' : '#');
  };
  if (mode === 'lab')
    return (
      <>
        <App />
        <button onClick={() => go('game')} className="fixed bottom-4 left-4 z-50 px-4 py-2 rounded-full bg-amber-500 text-black text-sm font-bold shadow-xl hover:bg-amber-400">
          ← Back to the game
        </button>
      </>
    );
  return (
    <>
      <SharedDefs />
      <GameApp onLab={() => go('lab')} />
    </>
  );
}
