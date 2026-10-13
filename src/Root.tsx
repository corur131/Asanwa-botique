import React, { useState } from 'react';
import App from './App';
import AuthGate from './cloud/AuthGate';
import { SharedDefs } from './components/SharedDefs';

class GameRenderBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Asanwa Boutique UI render error:', error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="min-h-screen bg-[#0d0f14] text-white flex items-center justify-center p-6">
          <section className="max-w-lg rounded-2xl border border-white/10 bg-[#191b27] p-6 space-y-4">
            <h1 className="text-xl font-bold">The shop screen needs to restart</h1>
            <p className="text-sm text-slate-300">Your saved game has not been deleted. Reload this page to restart the display. If this keeps happening, tell us what you were doing when it occurred.</p>
            <button onClick={() => window.location.reload()} className="rounded-xl bg-amber-400 px-4 py-2 font-semibold text-black">Reload game safely</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

/** The game is the main screen; the Character Lab (the old builder) is one click away. */
export default function Root() {
  const [mode, setMode] = useState<'game' | 'lab'>(() => (location.hash === '#lab' ? 'lab' : 'game'));
  const go = (m: 'game' | 'lab') => {
    setMode(m);
    history.replaceState(null, '', m === 'lab' ? '#lab' : '#');
  };
  if (mode === 'lab')
    return (
      <GameRenderBoundary>
        <>
          <App />
          <button onClick={() => go('game')} className="fixed bottom-4 left-4 z-50 px-4 py-2 rounded-full bg-amber-500 text-black text-sm font-bold shadow-xl hover:bg-amber-400">
            ← Back to the game
          </button>
        </>
      </GameRenderBoundary>
    );
  return (
    <GameRenderBoundary>
      <>
        <SharedDefs />
        <AuthGate onLab={() => go('lab')} />
      </>
    </GameRenderBoundary>
  );
}