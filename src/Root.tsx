import React, { useState } from 'react';
import App from './App';
import AuthGate from './cloud/AuthGate';
import { SharedDefs } from './components/SharedDefs';

interface GameRenderBoundaryState {
  failed: boolean;
  errorDetails: string;
}

class GameRenderBoundary extends React.Component<React.PropsWithChildren, GameRenderBoundaryState> {
  state: GameRenderBoundaryState = { failed: false, errorDetails: '' };

  static getDerivedStateFromError(error: unknown): Partial<GameRenderBoundaryState> {
    const details = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return { failed: true, errorDetails: details };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const details = `${error.name}: ${error.message}\n\nComponent stack:\n${info.componentStack || '(not available)'}`;
    this.setState({ errorDetails: details });
    console.error('Asanwa Boutique UI render error:', error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="min-h-screen bg-[#0d0f14] text-white flex items-center justify-center p-6">
          <section className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#191b27] p-6 space-y-4">
            <h1 className="text-xl font-bold">The shop screen needs to restart</h1>
            <p className="text-sm text-slate-300">The screen crashed while displaying the game. Your saved game has not been deliberately changed or deleted. Do not clear browser data. The diagnostic details below help us pinpoint the cause.</p>
            <div className="rounded-xl border border-amber-400/30 bg-black/30 p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-200">Error details</div>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-200">{this.state.errorDetails || 'The browser did not provide an error message. Copy the details after retrying.'}</pre>
              <button
                onClick={() => {
                  const details = this.state.errorDetails || 'Asanwa Boutique render crash: no error message was available.';
                  void navigator.clipboard?.writeText(details).catch(() => undefined);
                }}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Copy error details
              </button>
            </div>
            <p className="text-xs text-slate-400">You can try reloading once, but if this screen returns, copy these details and send them to ChatGPT. No coding is needed.</p>
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
