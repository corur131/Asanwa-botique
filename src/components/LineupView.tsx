import React from 'react';
import { CharacterConfig, CameraView } from '../types/character';
import { CharacterSvg } from './renderer/renderCharacter';
import { getDeborahConfig, PLUS_FEMALE_CONFIG, MALE_CONFIG } from '../constants/presets';
import { SKIN_TONES } from '../constants/skinTones';
import { RefreshCw, Link2, Sparkles, UserCheck } from 'lucide-react';

interface LineupViewProps {
  divineConfig: CharacterConfig;
  camera: CameraView;
  onSelectCharacterForEditing?: (config: CharacterConfig) => void;
}

export const LineupView: React.FC<LineupViewProps> = ({
  divineConfig,
  camera,
}) => {
  // Deborah live inherits Divine's face config
  const deborahConfig = getDeborahConfig(divineConfig);
  const plusConfig = PLUS_FEMALE_CONFIG;
  const maleConfig = MALE_CONFIG;

  const characters = [
    {
      name: '1. Divine (Active Builder)',
      role: 'Current Character Config',
      config: divineConfig,
      idPrefix: 'char-divine',
      badge: 'Active Source',
      badgeColor: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
      description: 'Lagos boutique style icon. Reference quality bar.',
    },
    {
      name: '2. Deborah (Live Face Mirror)',
      role: "Inherits Divine's Face Live",
      config: deborahConfig,
      idPrefix: 'char-deborah',
      badge: 'Live Synced Face',
      badgeColor: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
      description: 'Identical face, eyes, nose & lips as Divine. Distinct hair (bone straight), makeup & outfit.',
    },
    {
      name: '3. Folake (Plus-Size Female)',
      role: 'Full-Figured Proportions',
      config: plusConfig,
      idPrefix: 'char-plus',
      badge: 'Female Plus',
      badgeColor: 'border-purple-500/50 bg-purple-500/10 text-purple-300',
      description: 'Fuller hips, bust, arms, thighs & face. Sculpted afro puff, rich ebony tone.',
    },
    {
      name: '4. Kofi (Male Anatomy)',
      role: 'True Masculine Build',
      config: maleConfig,
      idPrefix: 'char-male',
      badge: 'Male Model',
      badgeColor: 'border-blue-500/50 bg-blue-500/10 text-blue-300',
      description: 'Broad shoulders, flat athletic chest, square jaw, 360 waves & tailored outfit.',
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0b0c10] overflow-y-auto p-4 md:p-6 space-y-4">
      {/* Informational Callout */}
      <div className="bg-gradient-to-r from-amber-950/40 via-[#181a22] to-emerald-950/40 border border-white/10 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
            <Link2 className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <span>Live Synchronized Multi-Character Lineup</span>
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live Reactive
              </span>
            </div>
            <div className="text-xs text-slate-300 mt-0.5">
              Notice: <strong>Deborah</strong> reads <strong>Divine&apos;s</strong> face config live. Edit Divine in the panel to watch Deborah&apos;s skin tone, facial contours, eyes, and lips update in real time without any ID or color clashes!
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-mono shrink-0 px-3 py-1.5 rounded-md bg-black/40 border border-white/5">
          ViewBox: 0 0 600 1500 · 4 Independent SVG Contexts
        </div>
      </div>

      {/* 4 Characters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
        {characters.map((item) => {
          const skin = SKIN_TONES[item.config.skinTone];
          return (
            <div
              key={item.idPrefix}
              className="flex flex-col bg-[#14161e] border border-white/10 rounded-xl overflow-hidden shadow-md transition-all hover:border-white/20"
            >
              {/* Card Header */}
              <div className="px-3.5 py-3 border-b border-white/10 bg-[#101218] flex items-center justify-between gap-2">
                <div className="truncate">
                  <div className="text-xs font-semibold text-white truncate">{item.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{item.role}</div>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded border shrink-0 ${item.badgeColor}`}>
                  {item.badge}
                </span>
              </div>

              {/* Character SVG Viewport */}
              <div className="relative flex-1 bg-gradient-to-b from-[#181a24] to-[#0f1016] flex items-center justify-center p-2 min-h-[380px] max-h-[520px]">
                {/* SVG Character */}
                <div className="w-full h-full max-h-[500px] flex items-center justify-center">
                  <CharacterSvg
                    config={item.config}
                    idPrefix={item.idPrefix}
                    camera={camera}
                    className="w-full h-full object-contain max-h-[500px]"
                  />
                </div>
              </div>

              {/* Card Footer Details */}
              <div className="p-3 bg-[#101218] border-t border-white/10 space-y-2 text-[11px]">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Skin Tone:</span>
                  <span className="font-medium text-white truncate max-w-[130px]">{skin.name}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Body Type:</span>
                  <span className="font-medium text-white">{item.config.body}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Hairstyle:</span>
                  <span className="font-medium text-white">{item.config.hair}</span>
                </div>
                <div className="pt-1.5 border-t border-white/5 text-[10px] text-slate-400 leading-relaxed">
                  {item.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
