import React, { useState } from 'react';
import { CharacterConfig, CameraView } from './types/character';
import { DIVINE_CONFIG } from './constants/presets';
import { CharacterSvg } from './components/renderer/renderCharacter';
import { SharedDefs } from './components/SharedDefs';
import { ControlsPanel } from './components/ControlsPanel';
import { LineupView } from './components/LineupView';
import { generateRandomCustomer } from './utils/randomizer';
import { SKIN_TONES } from './constants/skinTones';
import {
  Shuffle,
  Users,
  User,
  Download,
  RotateCcw,
  ZoomIn,
  Copy,
  Check,
  X,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export default function App() {
  const [characterConfig, setCharacterConfig] = useState<CharacterConfig>(DIVINE_CONFIG);
  const [viewMode, setViewMode] = useState<'builder' | 'lineup'>('builder');
  const [camera, setCamera] = useState<CameraView>('full');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Show temporary toast message
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Randomise customer button handler
  const handleRandomise = () => {
    const randomCustomer = generateRandomCustomer(characterConfig.state);
    setCharacterConfig(randomCustomer);
    triggerToast(
      `Generated customer: ${randomCustomer.body} (${SKIN_TONES[randomCustomer.skinTone].name.split('.')[1].trim()})`
    );
  };

  // Reset to Divine baseline
  const handleResetDivine = () => {
    setCharacterConfig(DIVINE_CONFIG);
    triggerToast('Reset to Divine (official baseline)');
  };

  // Export config button handler
  const handleExport = () => {
    const jsonStr = JSON.stringify(characterConfig, null, 2);
    navigator.clipboard
      ?.writeText(jsonStr)
      .then(() => {
        setCopied(true);
        triggerToast('Character config copied to clipboard as JSON!');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Fallback open modal
        setShowExportModal(true);
      });
  };

  const skin = SKIN_TONES[characterConfig.skinTone];

  return (
    <div className="flex flex-col min-h-screen bg-[#0d0f14] text-slate-100 antialiased selection:bg-amber-500/30">
      {/* Hidden global SVG filters for zero-overhead shared GPU blurring */}
      <SharedDefs />

      {/* ------------------------------------------------------------- */}
      {/* STRICT TOP BAR CONTRACT (Zone 1: Brand, Zone 2: Links, Zone 3: CTA) */}
      {/* ------------------------------------------------------------- */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-white/10 bg-[#12141c]/90 backdrop-blur shrink-0 z-20">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-serif font-bold text-slate-950 text-base shadow-sm">
            B
          </div>
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0">
            Boutique Character Lab
          </span>
        </div>

        {/* Zone 2: Clean 4–5 single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
          <button
            onClick={() => setViewMode('builder')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'builder' ? 'text-amber-400 font-semibold' : ''
            }`}
          >
            Character Builder
          </button>
          <button
            onClick={() => setViewMode('lineup')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'lineup' ? 'text-amber-400 font-semibold' : ''
            }`}
          >
            4-Character Lineup
          </button>
          <button
            onClick={() => setCamera('portrait')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Face Inspector
          </button>
          <button
            onClick={() => {
              setCharacterConfig({ ...characterConfig, state: characterConfig.state === 'styled' ? 'plain' : 'styled' });
              triggerToast(`Toggled styling state to: ${characterConfig.state === 'styled' ? 'Plain' : 'Styled'}`);
            }}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            {characterConfig.state === 'styled' ? 'Switch to Plain State' : 'Switch to Styled State'}
          </button>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-500 active:scale-95 transition-all shadow-sm whitespace-nowrap shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Download className="w-3.5 h-3.5 text-white" />}
            Export Config
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* WORKSPACE TOOLBAR (Mode Switcher, Camera, Randomise, Reset) */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 border-b border-white/10 bg-[#101219] shrink-0 text-xs">
        {/* Left: View Mode Segmented Control */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-black/40 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setViewMode('builder')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                viewMode === 'builder'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Builder Studio
            </button>
            <button
              onClick={() => setViewMode('lineup')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                viewMode === 'lineup'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Lineup (4 Characters)
            </button>
          </div>

          {/* Quick indicator if Deborah is mirroring live */}
          {viewMode === 'lineup' && (
            <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Deborah is live-mirroring Divine&apos;s face
            </span>
          )}
        </div>

        {/* Center: Camera Preset Zoom */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
          <span className="text-[10px] text-slate-400 px-2 font-mono uppercase tracking-wider flex items-center gap-1">
            <ZoomIn className="w-3 h-3" />
            Camera:
          </span>
          {[
            { id: 'full', label: 'Full Body' },
            { id: 'bust', label: 'Bust / Fit' },
            { id: 'portrait', label: 'Face Zoom' },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setCamera(c.id as CameraView)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                camera === c.id
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRandomise}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white active:scale-95 transition-all"
            title="Randomise customer body, skin, face presets, hair, and makeup"
          >
            <Shuffle className="w-3.5 h-3.5 text-amber-400" />
            Randomise Customer
          </button>

          <button
            onClick={handleResetDivine}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
            title="Reset to Divine baseline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Divine
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MAIN WORKBENCH CONTENT */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 flex overflow-hidden">
        {viewMode === 'builder' ? (
          /* Split Layout: Canvas Viewport (Left) + Controls Panel (Right) */
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left: Interactive Canvas Viewport */}
            <div className="flex-1 relative flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-[#11131a] via-[#0e1017] to-[#0a0b0f] overflow-hidden min-h-[440px]">
              {/* Studio ambient backdrop glow behind character */}
              <div
                className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                  background:
                    'radial-gradient(circle at 50% 30%, rgba(246, 219, 227, 0.15) 0%, rgba(13, 14, 18, 0) 70%)',
                }}
              />

              {/* Viewport Frame */}
              <div className="relative z-10 w-full max-w-[500px] h-full max-h-[720px] flex items-center justify-center">
                <CharacterSvg
                  config={characterConfig}
                  idPrefix="active-builder"
                  camera={camera}
                  className="w-full h-full object-contain filter drop-shadow-2xl"
                />
              </div>

              {/* Bottom Quick Spec Bar */}
              <div className="absolute bottom-3 left-4 right-4 sm:left-6 sm:right-6 pointer-events-none flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <div className="bg-black/60 backdrop-blur px-3 py-1.5 rounded-md border border-white/10 flex items-center gap-3">
                  <span>
                    Model: <strong className="text-white">{characterConfig.body}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Skin: <strong className="text-white">{skin.name.split('.')[1].trim()}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Hair: <strong className="text-white">{characterConfig.hair}</strong>
                  </span>
                </div>

                <div className="hidden sm:flex bg-black/60 backdrop-blur px-3 py-1.5 rounded-md border border-white/10 items-center gap-2">
                  <span>ViewBox: 0 0 600 1500 (7.5 Heads Proportions)</span>
                </div>
              </div>
            </div>

            {/* Right: Controls Panel */}
            <div className="w-full lg:w-[440px] xl:w-[480px] shrink-0 border-t lg:border-t-0 border-white/10 h-[500px] lg:h-auto overflow-hidden">
              <ControlsPanel
                config={characterConfig}
                onChange={setCharacterConfig}
              />
            </div>
          </div>
        ) : (
          /* Lineup View: 4 characters side-by-side */
          <div className="flex-1 flex flex-col overflow-hidden">
            <LineupView
              divineConfig={characterConfig}
              camera={camera}
            />
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* TOAST NOTIFICATION */}
      {/* ------------------------------------------------------------- */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-600 text-white px-4 py-2.5 rounded-lg shadow-xl border border-amber-400/40 text-xs font-medium flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* EXPORT CONFIG MODAL */}
      {/* ------------------------------------------------------------- */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14161f] border border-white/15 rounded-xl max-w-xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Character Configuration JSON</h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Exported character configuration schema for the Lagos Fashion Boutique character system:
            </p>

            <pre className="bg-[#0b0c10] border border-white/10 p-3.5 rounded-lg text-xs font-mono text-amber-300/90 overflow-x-auto max-h-[320px]">
              {JSON.stringify(characterConfig, null, 2)}
            </pre>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(characterConfig, null, 2));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-500"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied to Clipboard' : 'Copy JSON'}
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-white/5 rounded-lg border border-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
