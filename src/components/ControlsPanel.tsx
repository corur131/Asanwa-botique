import React, { useState } from 'react';
import {
  CharacterConfig,
  BodyType,
  SkinToneId,
  FaceShapePreset,
  EyeShapePreset,
  IrisColorId,
  BrowPreset,
  NosePreset,
  LipShapePreset,
  FemaleHairStyle,
  MaleHairStyle,
  HairColorId,
  FacialHairPreset,
  EarringStyle,
  CharacterState,
} from '../types/character';
import { SKIN_TONES } from '../constants/skinTones';
import { HAIR_PALETTES } from './renderer/hair';
import { Sparkles, Eye, Scissors, Heart, Gem, Check, Info } from 'lucide-react';

interface ControlsPanelProps {
  config: CharacterConfig;
  onChange: (newConfig: CharacterConfig) => void;
}

type TabType = 'model' | 'features' | 'hair' | 'makeup' | 'jewellery';

export const ControlsPanel: React.FC<ControlsPanelProps> = ({ config, onChange }) => {
  const [activeTab, setActiveTab] = useState<TabType>('model');

  const update = (partial: Partial<CharacterConfig>) => {
    onChange({ ...config, ...partial });
  };

  const isMale = config.body === 'male';
  const isPlain = config.state === 'plain';

  // Hair style lists
  const femaleHairOptions: { id: FemaleHairStyle; label: string }[] = [
    { id: 'longBraids', label: 'Long Braids (Divine)' },
    { id: 'boneStraight', label: 'Bone Straight' },
    { id: 'cornrows', label: 'Neat Cornrows' },
    { id: 'afroPuff', label: 'Afro Puff' },
    { id: 'shortNatural', label: 'Short Natural (TWA)' },
  ];

  const maleHairOptions: { id: MaleHairStyle; label: string }[] = [
    { id: 'lowCut', label: 'Low Cut Fade' },
    { id: 'waves', label: '360 Waves' },
    { id: 'shortDreads', label: 'Short Dreads' },
  ];

  // Lip presets
  const lipColorPresets = [
    { name: 'Berry Plum', color: '#ba5869' },
    { name: 'Deep Wine', color: '#882236' },
    { name: 'Nude Peach', color: '#ca7a6b' },
    { name: 'Warm Terracotta', color: '#b05943' },
    { name: 'Glossy Caramel', color: '#9d583b' },
    { name: 'Red Ochre', color: '#c4333d' },
    { name: 'Dark Cocoa', color: '#562725' },
  ];

  // Iris swatches
  const irisOptions: { id: IrisColorId; label: string; hex: string }[] = [
    { id: 'darkBrown', label: 'Dark Brown (Default)', hex: '#5c2a11' },
    { id: 'warmAmber', label: 'Warm Amber', hex: '#b87425' },
    { id: 'hazelGreen', label: 'Hazel Green', hex: '#5f7535' },
    { id: 'espressoBlack', label: 'Espresso Black', hex: '#1c120e' },
    { id: 'honeyBronze', label: 'Honey Bronze', hex: '#ab722f' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#13151b] text-slate-100 border-l border-white/10 select-none">
      {/* State Banner reminder */}
      {isPlain && (
        <div className="bg-amber-950/60 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-200 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Plain State Active:</strong> Frizzy hair, no makeup, and dull faded outfit.
            Skin tone, body type, and facial features remain strictly unchanged.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center border-b border-white/10 bg-[#0e1014] overflow-x-auto p-1.5 gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('model')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === 'model'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Model & State
        </button>
        <button
          onClick={() => setActiveTab('features')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === 'features'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          Face & Features
        </button>
        <button
          onClick={() => setActiveTab('hair')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === 'hair'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          Hair & Beard
        </button>
        <button
          onClick={() => setActiveTab('makeup')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === 'makeup'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          Makeup & Glam
        </button>
        <button
          onClick={() => setActiveTab('jewellery')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === 'jewellery'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Gem className="w-3.5 h-3.5" />
          Jewellery
        </button>
      </div>

      {/* Content panel */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* TAB 1: MODEL & STATE */}
        {activeTab === 'model' && (
          <div className="space-y-6">
            {/* Body Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Body Proportion (7.5 Heads Full Body)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'femaleRegular', label: 'Female Regular', desc: 'Divine baseline' },
                  { id: 'femalePlus', label: 'Female Plus-Size', desc: 'Fuller curves' },
                  { id: 'male', label: 'Male', desc: 'Broad shoulders' },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      const newBody = b.id as BodyType;
                      // Adjust default hair if switching genders
                      const newHair =
                        newBody === 'male'
                          ? 'waves'
                          : config.hair === 'waves' || config.hair === 'lowCut' || config.hair === 'shortDreads'
                          ? 'longBraids'
                          : config.hair;
                      update({ body: newBody, hair: newHair });
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      config.body === b.id
                        ? 'border-amber-500 bg-amber-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    <div className="text-xs font-semibold">{b.label}</div>
                    <div className="text-[10px] text-slate-400">{b.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Styling State */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Character Presentation State
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => update({ state: 'styled' })}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    config.state === 'styled'
                      ? 'border-amber-500 bg-amber-500/15 text-white'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                  }`}
                >
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Styled (Full Glam)
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Polished hair, gloss lips, cheek blush, liner, gold jewellery & pristine outfit.
                  </div>
                </button>

                <button
                  onClick={() => update({ state: 'plain' })}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    config.state === 'plain'
                      ? 'border-amber-500 bg-amber-500/15 text-white'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                  }`}
                >
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Plain (Customer Mode)
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Messy/frizzy hair, no makeup, dull faded outfit. Skin tone & features remain identical.
                  </div>
                </button>
              </div>
            </div>

            {/* Skin Tone Selector (8 tones) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Melanin Skin Tone (8 Hand-Tuned Radiant Palettes)
              </label>
              <p className="text-[11px] text-slate-400 mb-3">
                Rich glowing tones with warm undertones; never grey or ashy.
              </p>
              <div className="space-y-2">
                {(Object.keys(SKIN_TONES) as SkinToneId[]).map((toneKey) => {
                  const tone = SKIN_TONES[toneKey];
                  const isSelected = config.skinTone === toneKey;
                  return (
                    <button
                      key={toneKey}
                      onClick={() => update({ skinTone: toneKey })}
                      className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/15 ring-1 ring-amber-500/30'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* 5-color palette strip */}
                        <div className="flex rounded overflow-hidden border border-black/40 shadow-sm shrink-0">
                          <span className="w-3.5 h-6" style={{ backgroundColor: tone.highlight }} title="Highlight" />
                          <span className="w-3.5 h-6" style={{ backgroundColor: tone.base }} title="Base" />
                          <span className="w-3.5 h-6" style={{ backgroundColor: tone.mid }} title="Mid" />
                          <span className="w-3.5 h-6" style={{ backgroundColor: tone.shadow }} title="Shadow" />
                          <span className="w-3.5 h-6" style={{ backgroundColor: tone.contour }} title="Contour" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white">{tone.name}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">{tone.description}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FACE & FEATURES */}
        {activeTab === 'features' && (
          <div className="space-y-6">
            {/* Face Shape */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Face Shape Contour
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'oval', label: 'Oval (Divine)' },
                  { id: 'heart', label: 'Heart / Soft V' },
                  { id: 'square', label: 'Square / Sculpted' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => update({ faceShape: s.id as FaceShapePreset })}
                    className={`py-2 px-3 rounded-lg border text-center text-xs font-medium transition-all ${
                      config.faceShape === s.id
                        ? 'border-amber-500 bg-amber-500/15 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Eyes Shape */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Eye Anatomy Shape
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'almond', label: 'Almond (Divine)' },
                  { id: 'upturned', label: 'Upturned Glam' },
                  { id: 'doe', label: 'Wide Doe' },
                  { id: 'hooded', label: 'Hooded / Sultry' },
                ].map((e) => (
                  <button
                    key={e.id}
                    onClick={() =>
                      update({
                        eyes: { ...config.eyes, shape: e.id as EyeShapePreset },
                      })
                    }
                    className={`py-2 px-3 rounded-lg border text-left text-xs font-medium transition-all ${
                      config.eyes.shape === e.id
                        ? 'border-amber-500 bg-amber-500/15 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Iris Color */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Iris Color (Radial Gradient Core)
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {irisOptions.map((iris) => (
                  <button
                    key={iris.id}
                    onClick={() =>
                      update({
                        eyes: { ...config.eyes, irisColor: iris.id },
                      })
                    }
                    className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                      config.eyes.irisColor === iris.id
                        ? 'border-amber-500 bg-amber-500/15 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: iris.hex }}
                      />
                      <span className="text-xs font-medium">{iris.label}</span>
                    </div>
                    {config.eyes.irisColor === iris.id && (
                      <Check className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Eyebrows */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Eyebrow Preset (Fine Hair Strokes)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'featheredArch', label: 'Feathered Arch' },
                  { id: 'softNatural', label: 'Soft Natural' },
                  { id: 'straightDefined', label: 'Straight Defined' },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => update({ brows: b.id as BrowPreset })}
                    className={`py-2 px-2.5 rounded-lg border text-center text-xs font-medium transition-all ${
                      config.brows === b.id
                        ? 'border-amber-500 bg-amber-500/15 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nose */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Nose Preset (Sculpted Bridge & Tip Highlight)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'narrowDefined', label: 'Narrow Defined (Divine)' },
                  { id: 'broadAfrican', label: 'Broad Regal African' },
                  { id: 'button', label: 'Upturned Button' },
                  { id: 'softRegal', label: 'Soft Regal' },
                ].map((n) => (
                  <button
                    key={n.id}
                    onClick={() => update({ nose: n.id as NosePreset })}
                    className={`py-2 px-3 rounded-lg border text-left text-xs font-medium transition-all ${
                      config.nose === n.id
                        ? 'border-amber-500 bg-amber-500/15 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Lips Shape */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Lip Shape (Dual Top/Bottom Volume)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'fullPout', label: 'Full Pout (Divine)' },
                  { id: 'definedCupid', label: 'Defined Cupid' },
                  { id: 'widePillowy', label: 'Wide Pillowy' },
                  { id: 'subtleSoft', label: 'Subtle Soft' },
                ].map((lp) => (
                  <button
                    key={lp.id}
                    onClick={() =>
                      update({
                        lips: { ...config.lips, shape: lp.id as LipShapePreset },
                      })
                    }
                    className={`py-2 px-3 rounded-lg border text-left text-xs font-medium transition-all ${
                      config.lips.shape === lp.id
                        ? 'border-amber-500 bg-amber-500/15 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    {lp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: HAIR & GROOMING */}
        {activeTab === 'hair' && (
          <div className="space-y-6">
            {/* Hairstyle */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Hairstyle ({isMale ? 'Male Cuts' : 'Female Styles'})
              </label>
              <div className="grid grid-cols-1 gap-2">
                {(isMale ? maleHairOptions : femaleHairOptions).map((h) => (
                  <button
                    key={h.id}
                    onClick={() => update({ hair: h.id })}
                    className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                      config.hair === h.id
                        ? 'border-amber-500 bg-amber-500/15 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <span className="text-xs font-medium">{h.label}</span>
                    {config.hair === h.id && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Hair Color */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Hair Color Palette
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(HAIR_PALETTES) as HairColorId[]).map((cKey) => {
                  const pal = HAIR_PALETTES[cKey];
                  const labels: Record<HairColorId, string> = {
                    black: 'Obsidian Black',
                    darkBrown: 'Dark Brown',
                    burgundy: 'Lagos Burgundy',
                    honeyBlonde: 'Honey Blonde',
                  };
                  return (
                    <button
                      key={cKey}
                      onClick={() => update({ hairColor: cKey })}
                      className={`p-2 rounded-lg border text-left flex items-center gap-2.5 transition-all ${
                        config.hairColor === cKey
                          ? 'border-amber-500 bg-amber-500/15 text-white'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: pal.base }}
                      />
                      <span className="text-xs font-medium">{labels[cKey]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Male Facial Hair */}
            {isMale && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Facial Hair (Male Only)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'none', label: 'Clean Shaven' },
                    { id: 'stubble', label: '5 O’Clock Stubble' },
                    { id: 'fullBeard', label: 'Sculpted Beard' },
                  ].map((fh) => (
                    <button
                      key={fh.id}
                      onClick={() =>
                        update({
                          maleOnly: { facialHair: fh.id as FacialHairPreset },
                        })
                      }
                      className={`p-2 rounded-lg border text-center text-xs font-medium transition-all ${
                        config.maleOnly.facialHair === fh.id
                          ? 'border-amber-500 bg-amber-500/15 text-white'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                      }`}
                    >
                      {fh.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MAKEUP & GLAM */}
        {activeTab === 'makeup' && (
          <div className="space-y-6">
            {isPlain && (
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-400">
                Notice: When character is in <strong>Plain State</strong>, makeup is rendered natural/off to simulate unstyled customer testing. Toggling styling state to &quot;Styled&quot; displays full glam.
              </div>
            )}

            {/* Toggles */}
            <div className="space-y-3">
              {/* Blush toggle */}
              <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                <div>
                  <div className="text-xs font-semibold text-white">Cheek Blush</div>
                  <div className="text-[10px] text-slate-400">Soft blurred warm coral-rose glow on cheek apples</div>
                </div>
                <button
                  onClick={() =>
                    update({
                      makeup: { ...config.makeup, blush: !config.makeup.blush },
                    })
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    config.makeup.blush ? 'bg-amber-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      config.makeup.blush ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Liner toggle */}
              <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                <div>
                  <div className="text-xs font-semibold text-white">Winged Eyeliner</div>
                  <div className="text-[10px] text-slate-400">Crisp tapered winged stroke along upper lash line</div>
                </div>
                <button
                  onClick={() =>
                    update({
                      makeup: { ...config.makeup, liner: !config.makeup.liner },
                    })
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    config.makeup.liner ? 'bg-amber-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      config.makeup.liner ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Lashes natural / full */}
              <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                <div>
                  <div className="text-xs font-semibold text-white">Lashes Volume</div>
                  <div className="text-[10px] text-slate-400">Density and curve of individual upper lashes</div>
                </div>
                <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10">
                  <button
                    onClick={() =>
                      update({
                        makeup: { ...config.makeup, lashes: 'natural' },
                      })
                    }
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      config.makeup.lashes === 'natural'
                        ? 'bg-amber-600 text-white font-medium'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Natural
                  </button>
                  <button
                    onClick={() =>
                      update({
                        makeup: { ...config.makeup, lashes: 'full' },
                      })
                    }
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      config.makeup.lashes === 'full'
                        ? 'bg-amber-600 text-white font-medium'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Full Glam
                  </button>
                </div>
              </div>
            </div>

            {/* Lip Color Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Lipstick Color (Separate Top & Bottom Gradients + Gloss)
              </label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {lipColorPresets.map((lp) => (
                  <button
                    key={lp.name}
                    onClick={() =>
                      update({
                        lips: { ...config.lips, color: lp.color },
                        makeup: { ...config.makeup, lipColor: lp.color },
                      })
                    }
                    className={`p-2 rounded-lg border text-left flex items-center gap-2.5 transition-all ${
                      config.makeup.lipColor === lp.color
                        ? 'border-amber-500 bg-amber-500/15 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: lp.color }}
                    />
                    <span className="text-xs font-medium">{lp.name}</span>
                  </button>
                ))}
              </div>

              {/* Custom Hex Picker */}
              <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-lg">
                <input
                  type="color"
                  value={config.makeup.lipColor}
                  onChange={(e) =>
                    update({
                      lips: { ...config.lips, color: e.target.value },
                      makeup: { ...config.makeup, lipColor: e.target.value },
                    })
                  }
                  className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                />
                <span className="text-xs text-slate-300 font-mono">{config.makeup.lipColor}</span>
                <span className="text-[10px] text-slate-400 ml-auto">Custom shade</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: JEWELLERY */}
        {activeTab === 'jewellery' && (
          <div className="space-y-6">
            {/* Earrings */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Gold Earrings
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'none', label: 'None' },
                  { id: 'goldStuds', label: 'Gold Studs (Divine)' },
                  { id: 'goldHoops', label: 'Gold Hoops' },
                ].map((er) => (
                  <button
                    key={er.id}
                    onClick={() => update({ earrings: er.id as EarringStyle })}
                    className={`p-2.5 rounded-lg border text-center text-xs font-medium transition-all ${
                      config.earrings === er.id
                        ? 'border-amber-500 bg-amber-500/15 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    {er.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Necklace toggle */}
            <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
              <div>
                <div className="text-xs font-semibold text-white">Gold Drop Pendant Necklace</div>
                <div className="text-[10px] text-slate-400">
                  Draped gold chain with spherical pendant bead & specular highlight
                </div>
              </div>
              <button
                onClick={() => update({ necklace: !config.necklace })}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  config.necklace ? 'bg-amber-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    config.necklace ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
