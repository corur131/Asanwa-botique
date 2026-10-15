import React, { useState } from 'react';
import { TIERS, naira } from '../economy';
import * as E from '../engine';
import { FURNITURE, FURNITURE_GROUPS, FurnitureGroup, furnitureById, furnitureForGroup, outdoorRoomFor } from '../shop';
import { GameState } from '../types';
import { useThumb } from '../scene/Thumbs';
import type { View } from '../scene/ShopScene';
import { Btn } from './kit';
import { useSound } from '../sound';

const Thumb: React.FC<{ id: string }> = ({ id }) => {
  const url = useThumb(id);
  return url ? <img src={url} alt="" className="w-full h-full object-cover" draggable={false} /> : <div className="w-full h-full animate-pulse bg-white/5" />;
};

/** The strip of furniture at the bottom of build mode. */
export const Catalogue: React.FC<{ s: GameState; onBuy: (id: string, yardSide?: 'left' | 'right') => void; onInstall: (uid: string) => void }> = ({ s, onBuy, onInstall }) => {
  const [tab, setTab] = useState<FurnitureGroup | 'Stored'>('Display');
  const [yardSide, setYardSide] = useState<'left' | 'right'>('right');
  const stored = s.furniture.filter((p) => !p.placed && furnitureById(p.id).mount !== 'finish');
  const items = tab === 'Stored' ? [] : furnitureForGroup(tab);
  const fin = s.furniture.filter((p) => furnitureById(p.id).mount === 'finish').map((p) => p.id);
  return (
    <div className="rounded-2xl border border-white/15 bg-[#12141c]/95 backdrop-blur p-2 w-full">
      <div className="flex gap-1 overflow-x-auto pb-1.5">
        {[...FURNITURE_GROUPS, ...(stored.length ? (['Stored'] as const) : [])].map((g) => (
          <button key={g} onClick={() => setTab(g)} className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tab === g ? 'bg-amber-500 text-black' : 'bg-white/5 text-slate-300'}`}>
            {g}{g === 'Stored' ? ` (${stored.length})` : ''}
          </button>
        ))}
      </div>
      {FURNITURE.some((f) => f.group === tab && f.mount === 'yard') && (
        <div className="flex flex-wrap items-center gap-1.5 px-1 pb-1 text-[11px]">
          <span className="text-slate-400 mr-1">Outdoor placement:</span>
          {(['left', 'right'] as const).map((side) => (
            <button key={side} onClick={() => setYardSide(side)} className={`rounded-full px-3 py-1.5 font-semibold ${yardSide === side ? 'bg-amber-500 text-black' : 'bg-white/10 text-slate-200'}`}>
              {side === 'left' ? 'Left side' : 'Right side'}
            </button>
          ))}
          <span className="text-slate-500">New outdoor pieces use this side.</span>
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tab === 'Stored' &&
          stored.map((p) => {
            const f = furnitureById(p.id);
            return (
              <button key={p.uid} onClick={() => onInstall(p.uid)} className="shrink-0 w-24 rounded-xl border border-white/15 bg-white/5 overflow-hidden text-left hover:border-amber-400/60">
                <div className="h-20 bg-[#2b2440]"><Thumb id={p.id} /></div>
                <div className="px-1.5 py-1">
                  <div className="text-[11px] text-white leading-tight line-clamp-2">{f.name}</div>
                  <div className="text-[10px] text-emerald-300 font-semibold">Put out</div>
                </div>
              </button>
            );
          })}
        {items.map((f) => {
          const locked = (f.minTier || 0) > s.tier;
          const poor = s.cash < f.price;
          const have = f.mount === 'finish' && fin.includes(f.id);
          const full = f.mount === 'yard' && !outdoorRoomFor(s.furniture, f.id, s.listing);
          const off = locked || poor || have || full;
          return (
            <button key={f.id} disabled={off} onClick={() => onBuy(f.id, f.mount === 'yard' ? yardSide : undefined)} title={f.note} className={`shrink-0 w-24 rounded-xl border overflow-hidden text-left ${off ? 'border-white/5 opacity-50' : 'border-white/15 hover:border-amber-400/60'} bg-white/5`}>
              <div className="h-20 bg-[#2b2440]"><Thumb id={f.id} /></div>
              <div className="px-1.5 py-1">
                <div className="text-[11px] text-white leading-tight line-clamp-2 min-h-[26px]">{f.name}</div>
                <div className={`text-[10px] font-semibold ${locked ? 'text-slate-400' : poor ? 'text-rose-300' : 'text-amber-200'}`}>
                  {locked ? `${TIERS[f.minTier || 0].name}+` : have ? 'In use' : full ? 'Yard full' : naira(f.price)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const VIEWS: { id: View; label: string }[] = [
  { id: 'angle', label: 'Angled' },
  { id: 'top', label: 'Top' },
  { id: 'front', label: 'Front' },
  { id: 'free', label: 'Free' },
];

export const ViewPicker: React.FC<{ view: View; setView: (v: View) => void }> = ({ view, setView }) => (
  <div className="flex gap-1 rounded-xl border border-white/15 bg-[#12141c]/92 p-1">
    {VIEWS.map((v) => (
      <button key={v.id} onClick={() => setView(v.id)} className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${view === v.id ? 'bg-amber-500 text-black' : 'text-slate-300 hover:bg-white/10'}`}>{v.label}</button>
    ))}
  </div>
);

/** What Divine can do with the piece you tapped. */
export const ActionMenu: React.FC<{ s: GameState; uid: string; onPick: (id: E.ActionId) => void; onClose: () => void }> = ({ s, uid, onPick, onClose }) => {
  const p = s.furniture.find((x) => x.uid === uid);
  if (!p) return null;
  const f = furnitureById(p.id);
  const acts = E.actionsFor(s, uid);
  const busy = E.busyNow(s);
  const serving = s.phase === 'shop' && !!s.serving;
  const fuel = f.gen ? `${Math.round(E.fuelOf(s) * 10) / 10} of ${E.tankSize(s)} L · ${naira(E.fuelPrice(s))}/L this week${E.scarcity(s) ? ' (scarcity!)' : ''}` : null;
  return (
    <div className="absolute z-30 left-1/2 -translate-x-1/2 bottom-32 sm:bottom-36 w-[min(92vw,340px)] rounded-2xl border border-amber-500/40 bg-[#12141c]/97 shadow-2xl p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-white font-semibold leading-tight">{f.name}</div>
          {fuel && <div className="text-[11px] text-amber-200 mt-0.5">⛽ {fuel}</div>}
          {s.off?.[uid] && <div className="text-[11px] text-slate-400 mt-0.5">Switched off</div>}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-lg leading-none px-1">×</button>
      </div>
      {busy && <div className="text-[11px] text-amber-200 mb-2">Divine is busy until {E.clockText(busy.until)}.</div>}
      {serving && <div className="text-[11px] text-amber-200 mb-2">Finish with the customer at the mirror first.</div>}
      {!acts.length && <div className="text-sm text-slate-400">Nothing to do with this one. Rearrange it in build mode.</div>}
      <div className="grid gap-1.5">
        {acts.map((a) => (
          <button
            key={a.id}
            disabled={!!a.blocked || !!busy || serving}
            onClick={() => onPick(a.id)}
            className="rounded-lg px-3 py-2 text-left bg-white/5 border border-white/10 hover:border-amber-400/60 disabled:opacity-40 disabled:hover:border-white/10"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-white font-semibold">{a.label}</span>
              {a.minutes > 0 && <span className="text-[10px] text-slate-400 shrink-0">{a.minutes} min</span>}
            </div>
            {(a.blocked || a.hint) && <div className={`text-[11px] ${a.blocked ? 'text-slate-400' : 'text-emerald-300'}`}>{a.blocked || a.hint}</div>}
          </button>
        ))}
      </div>
    </div>
  );
};

/** On/off and volume for music, the generator and pops; mirror reflections. */
export const SoundSettings: React.FC = () => {
  const snd = useSound();
  const row = (label: string, on: boolean, vol: number, k: 'music' | 'gen' | 'sfx', vk: 'musicVol' | 'genVol' | 'sfxVol') => (
    <div className="flex items-center gap-2">
      <button onClick={() => snd.set({ [k]: !on })} className={`w-28 shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-left ${on ? 'bg-emerald-600/80 text-white' : 'bg-white/5 text-slate-400 border border-white/10'}`}>
        {label}: {on ? 'on' : 'off'}
      </button>
      <input type="range" min={0} max={1} step={0.05} value={vol} disabled={!on} onChange={(e) => snd.set({ [vk]: Number(e.target.value) })} className="flex-1 accent-amber-500 disabled:opacity-30" aria-label={`${label} volume`} />
    </div>
  );
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 space-y-2">
      <div className="text-[11px] uppercase tracking-wider text-amber-300/90 font-bold">Sound</div>
      {row('Music', snd.music, snd.musicVol, 'music', 'musicVol')}
      {row('Generator', snd.gen, snd.genVol, 'gen', 'genVol')}
      {row('Pops', snd.sfx, snd.sfxVol, 'sfx', 'sfxVol')}
      <div className="text-[11px] uppercase tracking-wider text-amber-300/90 font-bold pt-1">Graphics</div>
      <button onClick={() => snd.set({ reflections: !snd.reflections })} className={`w-full rounded-lg px-2 py-1.5 text-xs font-semibold text-left ${snd.reflections ? 'bg-emerald-600/80 text-white' : 'bg-white/5 text-slate-400 border border-white/10'}`}>
        Mirror reflections: {snd.reflections ? 'on' : 'off (faster on old phones)'}
      </button>
    </div>
  );
};

/** Divine's energy for the HUD. */
export const EnergyBar: React.FC<{ s: GameState }> = ({ s }) => {
  const e = E.energyOf(s);
  const tone = e >= 60 ? 'bg-emerald-400' : e >= 30 ? 'bg-amber-400' : 'bg-rose-500';
  return (
    <div className="w-28" title={e < 30 ? 'Tired: slower, and looks lose 3 points. Sit down or drink water.' : 'Divine’s energy'}>
      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
        <span>Energy{e < 30 ? ' · tired' : ''}</span>
        <span className="text-white">{Math.round(e)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className={`h-full ${tone} ${e < 30 ? 'animate-pulse' : ''}`} style={{ width: `${e}%` }} /></div>
    </div>
  );
};
