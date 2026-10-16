import React, { useEffect, useRef, useState } from 'react';
import { CharacterSvg } from '../../components/renderer/renderCharacter';
import { getDeborahConfig, MALE_CONFIG } from '../../constants/presets';
import { naira } from '../economy';
import * as E from '../engine';
import { WEATHER_INFO, dateLabel, dayRange, festive, outdoorTemp, seasonOf } from '../climate';
import { Listing, MoveEquipmentPlan } from '../shop';
import { CharacterMemory, CollaborationReply, GameState, Message, Post, Rival } from '../types';
import { MarketApp } from './MarketApp';
import { ShopperApp } from './ShopperApp';
import { BankApp } from './BankApp';
import { GidigramApp } from './GidigramApp';
import { generatedFace, isBusinessName, knownFace } from '../faces';
import { ContractsApp } from './ContractsApp';
import { MovePanel, StaffActions, StaffPanel } from './Panels';
import type { CartLine } from '../engine';
import { GROUP, ladder } from '../rivals';
import { TIERS } from '../economy';

export type AppId = 'home' | 'chats' | 'market' | 'shopper' | 'contracts' | 'bank' | 'property' | 'gidigram' | 'staff' | 'top20' | 'forbes' | 'promotion' | 'empire' | 'gist' | 'weather';

const APPS: { id: Exclude<AppId, 'home'>; name: string; bg: string; glyph: string }[] = [
  { id: 'chats', name: 'WhatsApp', bg: 'bg-[#25D366]', glyph: '✆' },
  { id: 'market', name: 'Yaba Mart', bg: 'bg-gradient-to-br from-orange-400 to-rose-500', glyph: '🛍' },
  { id: 'shopper', name: 'Shopper', bg: 'bg-gradient-to-br from-violet-600 to-indigo-700', glyph: '🛒' },
  { id: 'contracts', name: 'Contracts', bg: 'bg-gradient-to-br from-emerald-700 to-teal-900', glyph: '📄' },
  { id: 'gidigram', name: 'Gidigram', bg: 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600', glyph: '◎' },
  { id: 'bank', name: 'KoboBank', bg: 'bg-gradient-to-br from-emerald-600 to-teal-800', glyph: '₦' },
  { id: 'property', name: 'Lagos Lets', bg: 'bg-gradient-to-br from-sky-500 to-indigo-700', glyph: '⌂' },
  { id: 'staff', name: 'Staff', bg: 'bg-gradient-to-br from-slate-500 to-slate-800', glyph: '☺' },
  { id: 'top20', name: 'Top 20', bg: 'bg-gradient-to-br from-amber-400 to-yellow-700', glyph: '🏆' },
  { id: 'forbes', name: 'Forbes', bg: 'bg-gradient-to-br from-zinc-700 to-zinc-950', glyph: '₦' },
  { id: 'promotion', name: 'Promotion', bg: 'bg-gradient-to-br from-fuchsia-600 to-purple-800', glyph: '📣' },
  { id: 'empire', name: 'Expansion', bg: 'bg-gradient-to-br from-indigo-600 to-blue-900', glyph: '🏬' },
  { id: 'weather', name: 'Lagos Weather', bg: 'bg-gradient-to-br from-sky-400 to-blue-700', glyph: '🌦️' },
];

const AppLogo: React.FC<{ id: Exclude<AppId, 'home'> }> = ({ id }) => {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const marks: Record<Exclude<AppId, 'home'>, React.ReactNode> = {
    chats: <><path d="M8 10.5A5.5 5.5 0 0 1 13.5 5h21A5.5 5.5 0 0 1 40 10.5v14a5.5 5.5 0 0 1-5.5 5.5H21l-9 7v-7.7a5.5 5.5 0 0 1-4-5.3z" fill="currentColor" opacity=".18" stroke="none"/><path d="M17 15h14M17 21h10" {...common}/><path d="M22 10.5c-1.2 4.7 3.2 10.5 8 11.5" {...common}/></>,
    market: <><path d="M10 18h28l-2 21H12z" fill="currentColor" opacity=".18" stroke="none"/><path d="M10 18h28l-2 21H12zM17 18v-4a7 7 0 0 1 14 0v4" {...common}/><path d="M18 25h12" {...common}/></>,
    shopper: <><path d="M8 18h32l-3 22H11z" fill="currentColor" opacity=".18" stroke="none"/><path d="M8 18h32l-3 22H11zM16 18v-4a8 8 0 0 1 16 0v4" {...common}/><path d="m16 28 5 5 11-11" {...common}/></>,
    contracts: <><path d="M12 5h18l7 7v31H12z" fill="currentColor" opacity=".18" stroke="none"/><path d="M12 5h18l7 7v31H12zM30 5v8h7M18 21h13M18 27h13M18 33h9" {...common}/><path d="m17 14 2 2 4-4" {...common}/></>,
    gidigram: <><rect x="7" y="10" width="34" height="28" rx="7" fill="currentColor" opacity=".18" stroke="none"/><rect x="7" y="10" width="34" height="28" rx="7" {...common}/><circle cx="24" cy="24" r="8" {...common}/><circle cx="34" cy="16.5" r="2" fill="currentColor" stroke="none"/></>,
    bank: <><path d="M5 17 24 7l19 10z" fill="currentColor" opacity=".22" stroke="none"/><path d="M5 17 24 7l19 10M7 40h34M10 20v16M19 20v16M29 20v16M38 20v16M5 40h38" {...common}/></>,
    property: <><path d="m5 23 19-16 19 16v17H5z" fill="currentColor" opacity=".2" stroke="none"/><path d="m5 23 19-16 19 16M9 21v19h30V21M19 40V27h10v13" {...common}/><path d="M32 13V8h5v9" {...common}/></>,
    staff: <><circle cx="18" cy="17" r="7" fill="currentColor" opacity=".22" stroke="none"/><circle cx="31" cy="19" r="5" fill="currentColor" opacity=".22" stroke="none"/><path d="M5 39c0-8 5-13 13-13s13 5 13 13M27 28c7-1 13 3 14 10" {...common}/><circle cx="18" cy="17" r="7" {...common}/><circle cx="31" cy="19" r="5" {...common}/></>,
    top20: <><path d="M24 5 29 16l12 1.5-9 8.5 2.5 12L24 32l-10.5 6 2.5-12L7 17.5 19 16z" fill="currentColor" opacity=".25" stroke="none"/><path d="m24 5 5 11 12 1.5-9 8.5 2.5 12L24 32l-10.5 6 2.5-12L7 17.5 19 16z" {...common}/></>,
    forbes: <><path d="M10 38V25h7v13M21 38V17h7v21M32 38V10h7v28" fill="currentColor" opacity=".24" stroke="none"/><path d="M7 40h34M10 38V25h7v13M21 38V17h7v21M32 38V10h7v28" {...common}/></>,
    promotion: <><path d="M7 20 35 9v25L7 25z" fill="currentColor" opacity=".24" stroke="none"/><path d="M7 20 35 9v25L7 25zM7 20v5M13 27l4 12h8l-5-10M35 16l6-4M35 27l6 4" {...common}/></>,
    empire: <><path d="M6 40V22h11v18M18 40V9h12v31M31 40V17h11v23" fill="currentColor" opacity=".2" stroke="none"/><path d="M6 40V22h11v18M18 40V9h12v31M31 40V17h11v23M22 15h4M22 21h4M22 27h4M10 28h3M35 23h3M35 29h3" {...common}/></>,
    gist: <><path d="M7 10h27a5 5 0 0 1 5 5v13a5 5 0 0 1-5 5H20l-8 6v-6H7a5 5 0 0 1-5-5V15a5 5 0 0 1 5-5z" fill="currentColor" opacity=".2" stroke="none"/><path d="M7 10h27a5 5 0 0 1 5 5v13a5 5 0 0 1-5 5H20l-8 6v-6H7a5 5 0 0 1-5-5V15a5 5 0 0 1 5-5zM12 19h19M12 25h13" {...common}/><path d="m35 4 1.5 4.5L41 10l-4.5 1.5L35 16l-1.5-4.5L29 10l4.5-1.5z" fill="currentColor" stroke="none"/></>,
    weather: <><circle cx="32" cy="14" r="7" fill="currentColor" opacity=".35" stroke="none"/><path d="M32 4v3M42 14h-3M39 7l-2 2M10 31a8 8 0 0 1 8-8 10 10 0 0 1 19 3 6.5 6.5 0 0 1 0 13H12a6 6 0 0 1-2-8z" fill="currentColor" opacity=".2" stroke="none"/><path d="M10 31a8 8 0 0 1 8-8 10 10 0 0 1 19 3 6.5 6.5 0 0 1 0 13H12a6 6 0 0 1-2-8z" {...common}/></>,
  };
  return <svg viewBox="0 0 48 48" className="h-[72%] w-[72%] drop-shadow-sm" aria-hidden="true" {...common}>{marks[id]}</svg>;
};

export interface PhoneProps {
  s: GameState;
  up: (f: (g: GameState) => GameState) => void;
  app: AppId;
  setApp: (a: AppId) => void;
  chat: string | null;
  setChat: (c: string | null) => void;
  cart: CartLine[];
  setCart: (f: (c: CartLine[]) => CartLine[]) => void;
  onClose: () => void;
  onMove: (l: Listing, plan: MoveEquipmentPlan, retainedStaffIds?: string[]) => void;
  staff: StaffActions;
  /** Walk into a rival's shop. */
  onVisit: (rivalId: string) => void;
  /** Rival whose Gidigram page to open. */
  profile: string | null;
  setProfile: (id: string | null) => void;
}

const timeText = (s: GameState) => (s.phase === 'shop' ? E.clockText(s.clock) : s.phase === 'morning' ? '7:30am' : '9:15pm');

export const Phone: React.FC<PhoneProps> = (p) => {
  const { s, app, setApp } = p;
  const [marketStartView, setMarketStartView] = useState<'list' | 'cart'>('list');
  const unread = E.unreadCount(s);
  const back = () => {
    if (app === 'chats' && p.chat) p.setChat(null);
    else if (app === 'gidigram' && p.profile) p.setProfile(null);
    else setApp('home');
  };
  return (
    <div className="fixed inset-0 z-[80] sm:inset-auto sm:right-6 sm:bottom-4 sm:top-auto flex sm:block items-stretch">
      <div className="absolute inset-0 bg-black/50 sm:hidden" onClick={p.onClose} />
      <div className="relative w-full sm:w-[390px] h-full sm:h-[min(844px,calc(100vh-56px))] sm:rounded-[48px] sm:border-[7px] border-[#a7a9ad] bg-[#08090c] shadow-[0_28px_90px_rgba(0,0,0,.65)] overflow-hidden flex flex-col ring-1 ring-white/20">
        {/* iPhone-inspired status bar and Dynamic Island */}
        <div className="relative flex items-center justify-between px-7 pt-3 pb-2 text-[12px] font-semibold text-white bg-[#08090c] shrink-0">
          <span className="tabular-nums">{timeText(s)}</span>
          <span className="absolute left-1/2 -translate-x-1/2 top-2 h-[25px] w-[104px] rounded-full bg-black border border-white/[0.07] shadow-inner" aria-hidden="true">
            <span className="absolute right-3 top-[7px] h-2.5 w-2.5 rounded-full bg-[#17242b] ring-1 ring-[#28363d]" />
          </span>
          <span className="flex items-center gap-1.5 text-[10px]">
            <span className="font-semibold">{E.inBlackout(s) ? 'MTN' : '4G'}</span>
            <svg viewBox="0 0 18 14" className="h-3 w-4" aria-label="Mobile signal"><path d="M1 13V10M5 13V7M9 13V4M13 13V1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <svg viewBox="0 0 26 14" className="h-3.5 w-6" aria-label="Battery"><rect x="1" y="1.5" width="21" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4"/><rect x="3.5" y="4" width="14" height="6" rx="1.5" fill="currentColor"/><path d="M23 5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </span>
        </div>
        <div className="flex-1 min-h-0 flex flex-col bg-[#111]">
          {app === 'home' && <Home s={s} unread={unread} open={(target) => { if (target === 'market') setMarketStartView('list'); setApp(target); }} />}
          {app === 'chats' && <Chats {...p} />}
          {app === 'market' && <MarketApp key={marketStartView} initialView={marketStartView} s={s} cart={p.cart} setCart={p.setCart} onPay={(makeRoom) => {
            const before = s;
            const after = E.buyCart(before, p.cart, { makeRoom });
            if (after === before) return false;
            const total = before.cash - after.cash;
            p.up(() => after);
            p.setCart(() => []);
            return { total, ...E.checkoutPlacement(before, after) };
          }} onBuyDrop={(n) => p.up((g) => E.buyDrop(g, n))} />}
          {app === 'shopper' && <ShopperApp s={s} up={p.up} cart={p.cart} openContracts={() => setApp('contracts')} openMarket={() => { setMarketStartView('cart'); setApp('market'); }} />}
          {app === 'contracts' && <ContractsApp s={s} up={p.up} openShopper={() => setApp('shopper')} />}
          {app === 'bank' && <BankApp s={s} up={p.up} />}
          {app === 'forbes' && <Forbes s={s} />}
          {app === 'promotion' && <PromotionApp s={s} up={p.up} />}
          {app === 'empire' && <BusinessExpansionApp s={s} up={p.up} />}
          {app === 'property' && (
            <AppFrame title="Lagos Lets" sub="Shops for rent this week" tone="bg-gradient-to-r from-sky-600 to-indigo-700">
              <div className="p-3">
                <MovePanel s={s} onMove={p.onMove} />
              </div>
            </AppFrame>
          )}
          {app === 'gidigram' && <GidigramApp s={s} up={p.up} profile={p.profile} setProfile={p.setProfile} onVisit={p.onVisit} />}
          {app === 'top20' && <Top20 s={s} open={(id) => { p.setProfile(id); setApp('gidigram'); }} />}
          {app === 'weather' && <WeatherApp s={s} />}
          {app === 'staff' && (
            <AppFrame title="Staff" sub="Hire, train, pay" tone="bg-slate-800">
              <div className="p-3">
                <StaffPanel s={s} a={p.staff} />
              </div>
            </AppFrame>
          )}
        </div>
        {/* home bar */}
        <div className="flex items-center justify-around bg-black py-2 shrink-0 text-white/80 text-sm">
          <button className="px-4 py-1 hover:text-white" onClick={back} aria-label="Back">‹ Back</button>
          <button className="w-28 h-1.5 rounded-full bg-white/80 hover:bg-white" onClick={() => { p.setChat(null); setMarketStartView('list'); setApp('home'); }} aria-label="Home" />
          <button className="px-4 py-1 hover:text-white" onClick={p.onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

const Home: React.FC<{ s: GameState; unread: number; open: (a: AppId) => void }> = ({ s, unread, open }) => {
  const dockApps = APPS.filter(a => ['chats', 'market', 'gidigram', 'bank'].includes(a.id));
  return (
    <div className="relative flex-1 overflow-y-auto bg-gradient-to-b from-[#151a37] via-[#3a275b] to-[#b35b68] px-5 pb-4 pt-5 flex flex-col">
      <div className="pointer-events-none absolute -right-16 top-20 h-52 w-52 rounded-full bg-fuchsia-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 top-64 h-48 w-48 rounded-full bg-cyan-300/15 blur-3xl" />
      <div className="relative mt-4 mb-6 text-center text-white">
        <div className="text-[48px] leading-none font-light tracking-[-0.055em] drop-shadow-lg tabular-nums">{timeText(s)}</div>
        <div className="mt-2 text-[12px] font-medium text-white/75">Day {s.day} <span className="mx-1.5 text-white/40">•</span> {s.phase === 'shop' ? 'Shop open' : s.phase === 'morning' ? 'Before opening' : 'Evening'}</div>
      </div>
      <div className="relative grid grid-cols-4 gap-x-2 gap-y-5">
        {APPS.map((a) => {
          const badge = a.id === 'chats' ? unread : a.id === 'gidigram' ? E.newOrders(s) : 0;
          return (
            <button key={a.id} onClick={() => open(a.id)} className="group flex min-w-0 flex-col items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/80 rounded-xl">
              <span className={`relative flex h-[58px] w-[58px] items-center justify-center rounded-[18px] border border-white/20 text-white shadow-[0_8px_18px_rgba(0,0,0,.28)] ring-1 ring-black/10 transition duration-150 group-active:scale-90 ${a.bg}`}>
                <span className="absolute inset-x-2 top-0 h-px bg-white/40" />
                <AppLogo id={a.id} />
                {badge > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#35244f] bg-[#ff375f] px-1 text-[10px] font-bold text-white shadow">{badge}</span>}
              </span>
              <span className="max-w-full truncate text-[10px] font-medium tracking-[-.01em] text-white [text-shadow:0_1px_4px_rgba(0,0,0,.65)]">{a.name}</span>
            </button>
          );
        })}
      </div>
      <div className="relative mt-auto pt-6">
        <button onClick={() => open('bank')} className="w-full rounded-[22px] border border-white/20 bg-white/[0.13] p-4 text-left text-white shadow-xl backdrop-blur-2xl transition hover:bg-white/[0.17] active:scale-[.99]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-700 shadow-lg"><AppLogo id="bank" /></span>
              <div><div className="text-[11px] font-semibold text-white/70">KoboBank · Current account</div><div className="mt-0.5 text-xl font-bold tracking-tight tabular-nums">{naira(s.cash)}</div></div>
            </div>
            <span className="text-xl text-white/70">›</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-2.5 text-[10px] text-white/75">
            <span>Rent {naira(s.listing.rent)}</span>
            <span>{E.daysToRent(s.day) === 0 ? 'Due tonight' : `Due in ${E.daysToRent(s.day)} day${E.daysToRent(s.day) > 1 ? 's' : ''}`}</span>
          </div>
        </button>
        <div className="mt-4 rounded-[25px] border border-white/20 bg-white/[0.16] p-2.5 shadow-2xl backdrop-blur-2xl">
          <div className="grid grid-cols-4 gap-1">
            {dockApps.map(a => <button key={a.id} onClick={() => open(a.id)} aria-label={a.name} className={`flex h-[50px] items-center justify-center rounded-[16px] border border-white/20 shadow-md transition active:scale-90 ${a.bg}`}><AppLogo id={a.id}/></button>)}
          </div>
        </div>
      </div>
    </div>
  );
};

const AppFrame: React.FC<{ title: string; sub?: string; tone: string; right?: React.ReactNode; children: React.ReactNode }> = ({ title, sub, tone, right, children }) => (
  <div className="flex-1 min-h-0 flex flex-col">
    <div className={`${tone} px-4 py-3 text-white flex items-center gap-3 shrink-0`}>
      <div className="min-w-0 flex-1">
        <div className="font-semibold leading-tight">{title}</div>
        {sub && <div className="text-[11px] opacity-75 truncate">{sub}</div>}
      </div>
      {right}
    </div>
    <div className="flex-1 overflow-y-auto">{children}</div>
  </div>
);

// ---------------------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------------------
type AvatarSize = 'list' | 'header' | 'message';

/** A small branded mark for the fashion-industry group, rather than a contact initial. */
const FashionGroupAvatar: React.FC<{ sizeClass: string }> = ({ sizeClass }) => (
  <span role="img" aria-label="Lagos Fashion Babes group profile picture" className={`relative ${sizeClass} rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-gradient-to-br from-[#3d1738] via-[#6e254e] to-[#172d32] ring-1 ring-[#d9b66c]/70`}>
    <svg viewBox="0 0 48 48" className="w-full h-full p-[3px]" aria-hidden="true">
      <circle cx="24" cy="24" r="21" fill="none" stroke="#e5cb8b" strokeWidth="1.25" opacity="0.9" />
      <path d="M24 15 C24 10 18.5 10 18.5 14" fill="none" stroke="#f7e9c3" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 16.5 L8.5 27 L39.5 27 Z" fill="#f0d99d" stroke="#fff2d3" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M17.5 27 L14.5 37.2 L33.5 37.2 L30.5 27 L27 31 L24 27.5 L21 31 Z" fill="#bb729b" stroke="#f8e9c8" strokeWidth="1.15" strokeLinejoin="round" />
      <path d="M11.5 25.5 L16.5 29 M36.5 25.5 L31.5 29" fill="none" stroke="#e4bd71" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M32.5 10.5 L37.5 7.5 M35 13 L40 10" fill="none" stroke="#f4dfac" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="11" cy="12" r="1.2" fill="#f4dfac" />
      <circle cx="37.5" cy="34" r="1.1" fill="#f4dfac" />
    </svg>
  </span>
);

const BUSINESS_MARKS: Record<string, { glyph: string; bg: string }> = {
  'Yaba Mart': { glyph: '🛍', bg: 'from-orange-400 to-rose-500' },
  KoboBank: { glyph: '₦', bg: 'from-emerald-600 to-teal-800' },
  'Asanwa HQ': { glyph: 'A', bg: 'from-amber-400 to-amber-700' },
  Bills: { glyph: '⚡', bg: 'from-yellow-400 to-orange-600' },
  Gidigram: { glyph: '◎', bg: 'from-yellow-400 via-pink-500 to-purple-600' },
  'Lagos Fashion Week': { glyph: 'LFW', bg: 'from-slate-900 to-slate-700' },
};
/** Logo-style avatar for companies, banks and brands. */
const BusinessAvatar: React.FC<{ name: string; sizeClass: string }> = ({ name, sizeClass }) => {
  const known = BUSINESS_MARKS[name];
  const palette = ['from-indigo-500 to-violet-700', 'from-sky-500 to-blue-700', 'from-fuchsia-500 to-pink-700', 'from-emerald-500 to-green-700', 'from-amber-500 to-orange-700', 'from-slate-600 to-slate-800'];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const glyph = known?.glyph || initials;
  return (
    <span role="img" aria-label={`${name} logo`} title={name} className={`${sizeClass} rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br ${known?.bg || palette[h % palette.length]} text-white font-extrabold ring-1 ring-white/20 ${glyph.length > 2 ? 'text-[9px]' : 'text-sm'}`}>{glyph}</span>
  );
};

const GistAvatar: React.FC<{ sizeClass: string }> = ({ sizeClass }) => (
  <span role="img" aria-label="GistLagos profile picture" className={`relative ${sizeClass} rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-gradient-to-br from-[#8f2639] to-[#391522] ring-1 ring-rose-300/50`}>
    <svg viewBox="0 0 48 48" className="w-full h-full p-2" aria-hidden="true">
      <path d="M10 13.5 H31.5 A3.5 3.5 0 0 1 35 17 V29.5 A3.5 3.5 0 0 1 31.5 33 H20 L12 38 V33 H10 A3.5 3.5 0 0 1 6.5 29.5 V17 A3.5 3.5 0 0 1 10 13.5 Z" fill="#fff2e8" />
      <path d="M13 20 H28 M13 24 H25 M13 28 H29" stroke="#9c3045" strokeWidth="2" strokeLinecap="round" />
      <path d="M34.5 9.5 L39 14 L34.5 18.5" fill="none" stroke="#f4c77d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

/** Every chat participant gets a portrait or branded avatar, reused in list, header and group messages. */
const ContactAvatar: React.FC<{ name: string; s: GameState; size?: AvatarSize }> = ({ name, s, size = 'list' }) => {
  const sizeClass = size === 'header' ? 'w-10 h-10' : size === 'message' ? 'w-6 h-6' : 'w-12 h-12';
  if (name === GROUP) return <FashionGroupAvatar sizeClass={sizeClass} />;
  if (name === 'GistLagos') return <GistAvatar sizeClass={sizeClass} />;

  if (name !== 'Landlord' && name !== 'Deborah' && isBusinessName(name)) return <BusinessAvatar name={name} sizeClass={sizeClass} />;
  const look = name === 'Deborah' ? getDeborahConfig(s.divine)
    : name === 'Landlord' ? MALE_CONFIG
      : knownFace(name, s) || generatedFace(name);
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '-');
  return (
    <span role="img" aria-label={`${name} profile picture`} title={name} className={`${sizeClass} rounded-full overflow-hidden shrink-0 ring-1 ring-white/15 bg-gradient-to-br from-[#32263d] to-[#162d30]`}>
      <CharacterSvg config={look} idPrefix={`wa-${safeName}-${size}`} camera="portrait" className="w-full h-full" />
    </span>
  );
};

const targetChatLabel = (chat: string) => chat === GROUP ? 'the group' : chat.split(' ')[0];

const stamp = (m: Message) => (m.t !== undefined ? `Day ${m.day} · ${E.clockText(m.t)}` : `Day ${m.day}`);

const RIVAL_VOICE: Record<Rival['personality'], string> = {
  queen: 'Composed, proud, status-conscious and used to being one of the best. She speaks with polished confidence, protects her premium reputation, and delivers controlled, precise shade rather than noisy insults. Bridal clients, exclusivity and quality matter to her.',
  loud: 'High-energy, expressive, socially bold and quick with a joke or comeback. Her rhythm can be lively and playful, with occasional current Nigerian slang and emojis when the moment earns them. She can boast or provoke, but can also laugh and ease off.',
  oldschool: 'An experienced, tradition-minded fashion trader who values respect, craftsmanship, fabric quality and years of practical knowledge. She speaks more deliberately, can be firm or admonishing, and does not need to imitate Gen-Z slang.',
  shady: 'Sharp, highly competitive and comfortable with indirect digs, price comparisons and sly little jabs. She watches customers and rivals closely, likes to make a point without sounding openly sentimental, and may escalate when challenged.',
  sweet: 'Warm, encouraging and relationship-minded, with a softer conversational rhythm. She can be genuinely generous, use affectionate language or an occasional emoji, and may become quietly hurt or passive-aggressive when treated badly rather than suddenly turning into a loud bully.',
  pro: 'Business-focused and comparatively measured. Let the individual shop, fashion speciality, market position and current relationship shape how formal, confident or competitive this person sounds; do not give every professional rival the same voice.'
};

const SPECIALITY_VOICE: Record<Rival['speciality'], string> = {
  bridal: 'Bridal and occasionwear: notices fit, finishing, fabric quality, exclusivity, deadlines and the bride’s overall experience.',
  genz: 'Gen-Z fashion: follows fast-moving trends, social-media presentation, youthful styling and what people will actually share or buy.',
  native: 'Traditional/native wear, aso-oke and lace: cares about fabric integrity, craftsmanship, cultural fit, finishing and experience.',
  cheap: 'Affordable fashion: focuses on prices, value for money, accessible styling and the practical reasons customers choose one shop over another.',
  wigs: 'Wigs and glam: notices hair quality, installation, styling, face-framing and the confidence a finished look gives a client.',
  menswear: 'Menswear: pays attention to fit, tailoring, proportion, fabric durability and clean details.',
  luxury: 'Luxury fashion: values refinement, service, exclusivity, presentation and quality that justifies a premium price.',
  thrift: 'Thrift fashion: has an eye for unusual finds, smart buys, good condition and value others may overlook.',
  everyday: 'Everyday fashion: prioritises wearability, comfort, versatility, practical budgets and pieces customers will use often.'
};

const relationshipRead = (feeling: number) => feeling <= -60
  ? 'Feels like a serious enemy: guarded, distrustful and quick to read bad intent.'
  : feeling <= -25
    ? 'There is clear tension: cool, competitive or suspicious, though not hostile in every single message.'
    : feeling < 25
      ? 'The relationship is mostly neutral: assess Divine’s actual message before deciding whether to be friendly or defensive.'
      : feeling < 60
        ? 'There is some goodwill: more open or respectful, but still an independent business rival.'
        : 'There is strong goodwill or trust: warmer and more cooperative, while keeping the character’s core personality.';

const RIVAL_DRIVES: Record<string, string> = {
  tolani: 'Long-term ambition: keep House of Tolani the first name people think of for elite bridal fashion. She protects exclusivity, reputation and access to influential brides; genuine craft earns respect, but a rising competitor can make her guarded.',
  amaka: 'Long-term ambition: own the youth-fashion conversation and turn online attention into repeat customers. She chases fresh trends and public wins, hates being dismissed as unserious, and may react quickly before thinking things through.',
  bisi: 'Long-term ambition: preserve a trusted, profitable native-wear business built on quality, fit and experience. She values respect, craftsmanship and cultural knowledge, and worries that careless shortcuts or a destructive price war cheapen the work.',
  chioma: 'Long-term ambition: win price-sensitive shoppers and build a recognisable affordable-fashion brand. She watches margins, prices and marketing opportunities closely; she is cheeky and opportunistic, but her business decisions should still make practical sense.',
  zainab: 'Long-term ambition: make Zee Hair & Glam the go-to name for beautiful, dependable wigs and finishing services. She values loyalty, partnerships and being taken seriously; she can be warm without being a pushover.'
};

const rivalProfile = (r: Rival, s: GameState) => {
  const currentLadder = ladder(s);
  const ownRank = currentLadder.findIndex((row) => row.id === r.id) + 1;
  const divineRank = currentLadder.findIndex((row) => row.you) + 1;
  const previousSnapshot = (s.dailyRanking || []).slice(-1)[0];
  const previousOwnRank = previousSnapshot ? previousSnapshot.order.indexOf(r.id) + 1 : 0;
  const previousDivineRank = previousSnapshot ? previousSnapshot.order.indexOf('you') + 1 : 0;
  const rankContext = ownRank > 0 && divineRank > 0
    ? [
        'Current calculated ladder position: ' + r.owner + ' is ranked #' + ownRank + ' of ' + currentLadder.length + '; Divine is ranked #' + divineRank + '. React to this only when the topic makes it natural.',
        previousSnapshot && previousSnapshot.day < s.day && previousOwnRank > 0 && previousDivineRank > 0
          ? 'Compared with the last recorded daily ladder on in-game day ' + previousSnapshot.day + ', ' + r.owner + ' was previously #' + previousOwnRank + ' and Divine was previously #' + previousDivineRank + '. These numbers can ground a natural reaction to competitive progress, but do not claim an unrecorded action or force the subject into every reply.'
          : ''
      ].filter(Boolean).join(' ')
    : '';
  return [
    r.owner + ' owns ' + r.shop + ' in ' + r.area + '.',
    'Core personality: ' + RIVAL_VOICE[r.personality],
    'Fashion expertise: ' + SPECIALITY_VOICE[r.speciality],
    'Personal ambition and pressure: ' + (RIVAL_DRIVES[r.id] || 'Build a sustainable boutique by serving a clear customer niche, protecting margins and reputation, and letting business choices reflect this shop’s speciality.'),
    'Relationship toward Divine: ' + relationshipRead(r.feeling),
    'Competitive behaviour: ' + (r.aggression >= 0.7
      ? 'highly willing to fight for customers and may use provocative or underhand tactics when the situation supports it.'
      : r.aggression >= 0.4
        ? 'competitive and capable of a sharp response, but not automatically looking for a fight.'
        : 'usually measured and professional; competes more through the business than personal attacks.'),
    'Current position: ' + (TIERS[r.tier]?.name || 'fashion') + ' tier, Brand Power ' + E.brandPower(r.brand || E.getBrandMetrics(s), r.followers, r.tier)?.toLocaleString('en-NG') + ', awareness ' + Math.round(r.brand?.awareness || 0) + ', ' + Math.max(0, Number(r.followers) || 0)?.toLocaleString('en-NG') + ' followers.',
    'Available business cash for feasibility checks only: ' + naira(Math.max(0, r.cash)) + '. Do not mention this figure unless discussing a collaboration budget.',
    rankContext,
    r.main
      ? 'This is one of the five principal rivals. Keep this individual recognisable across chats.'
      : 'This is a supporting rival. Use their specific shop, speciality, position and relationship to distinguish them without inventing a personal backstory.',
    'Agency rule: this character has priorities independent of Divine. They can disagree, negotiate, refuse a request, protect their interests, offer help for their own reasons or change their mind when events justify it. Do not force the ambition into every reply.'
  ].filter(Boolean).join(' ');
};
const groupMemoryKey = (name: string) => `${GROUP}::${name}`;

const memoryBrief = (name: string, memory?: CharacterMemory, compact = false) => {
  if (!memory || (!memory.summary.trim() && memory.notes.length === 0)) {
    return 'Persistent memory for ' + name + ': no established long-term memories yet. Build continuity from the actual conversation; do not invent a shared past.';
  }
  const summary = compact ? memory.summary.slice(0, 220) : memory.summary;
  const notes = compact ? memory.notes.slice(-3).map((note) => note.slice(0, 120)) : memory.notes;
  return [
    'Persistent memory for ' + name + ' (saved from prior chats; use for continuity, not as a script):',
    summary ? 'Current summary: ' + summary : '',
    notes.length ? 'Established memory notes: ' + notes.map((note) => '- ' + note).join(' ') : '',
    'These notes are a compact record, not permission to invent details beyond them.'
  ].filter(Boolean).join(' ');
};

const Chats: React.FC<PhoneProps> = ({ s, up, chat, setChat, staff }) => {
  const list = E.chats(s);
  const [draft, setDraft] = useState('');
  const [aiSending, setAiSending] = useState(false);
  const [aiError, setAiError] = useState('');
  const sendFreeform = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!chat || !text || aiSending) return;
    const targetChat = chat;
    const prior = s.messages
      .filter((m) => E.thread(m) === targetChat)
      .sort((a, b) => a.id - b.id)
      .slice(-12)
      .map((m) => ({
        role: m.from === 'You' ? 'user' : 'model',
        text: targetChat === GROUP && m.from !== 'You' ? `${m.from}: ${m.text}` : m.text,
      }));
    const targetRival = (s.rivals || []).find((r) => r.owner === targetChat);
    const targetStaff = (s.staff || []).find((m) => m.name === targetChat);
    const participants = targetChat === GROUP
      ? (s.rivals || []).filter((r) => r.main).map((r) => r.owner)
      : [];
    const characterProfile = targetChat === GROUP
      ? 'Group setting: Lagos fashion-business rivals who already know one another and Divine. Each listed participant has a distinct personality, independent ambition and group-only memory below. The group history and these group-only memories are shared context; private direct-message memories are not available in this room and must never be inferred. Choose the person whose viewpoint most naturally fits the latest message and recent group history. Do not blend voices, disclose private-chat information, write multiple replies or rotate speakers mechanically.\n\n' + (s.rivals || []).filter((r) => r.main).map((r) => rivalProfile(r, s) + '\n' + memoryBrief(r.owner, s.characterMemories?.[groupMemoryKey(r.owner)], true)).join('\n\n')
      : targetRival
        ? rivalProfile(targetRival, s)
        : targetStaff
          ? [
              targetStaff.name + ' works at Asanwa Boutique as a ' + (targetStaff.profession || 'stylist') + '.',
              'Experience: level ' + targetStaff.level + (targetStaff.trained ? ', trained' : ', still learning') + '.',
              'Work relationship: loyalty ' + targetStaff.loyalty + '/100. ' + (targetStaff.loyalty >= 70 ? 'They feel invested in Divine and can sound comfortably loyal.' : targetStaff.loyalty >= 35 ? 'They are cooperative but still have their own interests and boundaries.' : 'They are not strongly attached yet; keep them more cautious and work-focused rather than assuming closeness.'),
              targetStaff.profession === 'makeup' ? SPECIALITY_VOICE.wigs + ' Speak from a makeup-and-client-finish perspective, not as a fashion-rival.' : 'Styling perspective: outfit coordination, fit, customer preferences, stock and practical shop-floor work.',
              targetStaff.level >= 3 ? 'They are highly experienced and can speak confidently about their craft.' : targetStaff.level === 2 ? 'They have some experience and can give practical opinions without pretending to know everything.' : 'They are relatively junior; they may ask questions or speak modestly about unfamiliar tasks.',
              targetStaff.raiseAsk ? 'They have an unresolved wage conversation, so compensation may make them more assertive if the topic arises.' : '',
              'Give this staff member a recognisable conversational rhythm, but do not invent family history or personal facts that are not in the game.'
            ].filter(Boolean).join(' ')
          : targetChat === 'Deborah'
            ? [
                'Deborah is Divine’s twin sister and owns the biggest boutique in Lagos. She is successful, intelligent, socially influential, and intimately familiar with Divine’s business and personal life. She can offer genuine help and affection like a real sister, but she has her own major fashion empire and must not be portrayed as merely Divine’s employee or bookkeeper.',
                'The name and exact finances of Deborah’s boutique are not established in the current game data. Do not invent a boutique name, revenue, staff size, or specific future event.'
              ].join(' ')
            : targetChat === 'Landlord'
              ? 'The landlord of Divine’s current shop at ' + s.listing.street + ', ' + s.listing.area + '. Practical, business-minded and focused on rent, premises and payment. Can be strict or impatient when money is overdue, but should not be hostile without a reason. Keep the tone concise and negotiation-focused.'
              : 'A character in Asanwa Boutique, a contemporary Lagos fashion-business drama. Use the name and actual conversation history to stay consistent. Do not invent major game facts or a backstory that the game has not established.';
    const profileWithMemory = targetChat === GROUP
      ? characterProfile
      : characterProfile + '\n\n' + memoryBrief(targetChat, s.characterMemories?.[targetChat]);
    setDraft('');
    setAiError('');
    setAiSending(true);
    const userMessageId = s.msgSeq + 1;
    up((g) => ({
      ...g,
      msgSeq: Math.max(g.msgSeq || 0, userMessageId),
      messages: [{
        id: userMessageId, day: g.day, from: 'You', chat: targetChat, text,
        tone: 'info' as const, t: g.phase === 'shop' ? Math.floor(g.clock) : undefined,
      }, ...g.messages].slice(0, 160),
    }));
    try {
      // Never leave the composer in "Waiting for reply…" forever if the server stalls.
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 60000);
      let response: Response;
      try {
        response = await fetch(`${import.meta.env.VITE_AI_API_BASE_URL || ''}/api/ai-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            characterName: targetChat,
            characterProfile: profileWithMemory,
            participants,
            history: prior,
            message: text,
            gameContext: { day: s.day, brandPower: E.brandPower(E.getBrandMetrics(s), s.followers || 0, s.tier), tier: s.tier, followers: s.followers, cash: s.cash, netWorth: E.netWorthPlayer(s), shopName: 'Asanwa Boutique', partnerTier: targetRival?.tier, partnerCash: targetRival?.cash },
            canDiscussCollaboration: Boolean(targetRival?.main && targetChat !== GROUP),
          }),
        });
      } catch (fetchError) {
        if (controller.signal.aborted) {
          throw new Error('The AI took too long to respond. Please try again in a moment.');
        }
        throw new Error('Could not reach the AI server. Check your connection and try again.');
      } finally {
        window.clearTimeout(timeoutId);
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Gemini request failed (${response.status}).`);
      if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('Gemini returned an empty reply.');
      const requestedSpeaker = typeof data.speaker === 'string' ? data.speaker.trim() : '';
      const replyFrom = targetChat === GROUP
        ? participants.find((name) => name.toLowerCase() === requestedSpeaker.toLowerCase()) || participants[0] || targetChat
        : targetChat;
      const memoryUpdate = data.memory && typeof data.memory === 'object'
        ? data.memory as { summary?: unknown; add?: unknown }
        : {};
      const rawCollaboration = data.collaboration && typeof data.collaboration === 'object'
        ? data.collaboration as Partial<CollaborationReply>
        : {};
      const decision = rawCollaboration.decision;
      const collaboration: CollaborationReply | undefined = targetRival?.main &&
        (decision === 'accept' || decision === 'counter' || decision === 'reject')
        ? {
            decision,
            eventName: typeof rawCollaboration.eventName === 'string' ? rawCollaboration.eventName.trim().slice(0, 80) : 'Asanwa Boutique x ' + targetRival.shop + ' Fashion Pop-up',
            dayOffset: Math.round(Math.max(3, Math.min(14, typeof rawCollaboration.dayOffset === 'number' && Number.isFinite(rawCollaboration.dayOffset) ? rawCollaboration.dayOffset : 7))),
            totalCost: Math.round(Math.max(15000, Math.min(Math.max(15000, Math.min([250000, 2000000, 10000000, 50000000, 150000000, 300000000, 600000000][Math.max(0, Math.min(6, Math.min(s.tier, targetRival.tier)))], Math.max(0, s.cash) * 2 + Math.max(0, targetRival.cash) * 2)), typeof rawCollaboration.totalCost === 'number' && Number.isFinite(rawCollaboration.totalCost) ? rawCollaboration.totalCost : 20000)) / 2500) * 2500,
            playerCostSharePct: Math.round(Math.max(10, Math.min(90, typeof rawCollaboration.playerCostSharePct === 'number' && Number.isFinite(rawCollaboration.playerCostSharePct) ? rawCollaboration.playerCostSharePct : 50))),
            playerProfitSharePct: Math.round(Math.max(10, Math.min(90, typeof rawCollaboration.playerProfitSharePct === 'number' && Number.isFinite(rawCollaboration.playerProfitSharePct) ? rawCollaboration.playerProfitSharePct : 50))),
          }
        : undefined;
      const proposedSummary = typeof memoryUpdate.summary === 'string' ? memoryUpdate.summary.trim().slice(0, 500) : '';
      const proposedNotes = Array.isArray(memoryUpdate.add)
        ? memoryUpdate.add.filter((note): note is string => typeof note === 'string').slice(0, 2).map((note) => note.trim().slice(0, 160)).filter(Boolean)
        : [];
      up((g) => {
        const id = (g.msgSeq || 0) + 1;
        const replyMessage: Message = {
          id, day: g.day, from: replyFrom,
          ...(targetChat === GROUP ? { chat: targetChat } : {}),
          text: data.reply.trim().slice(0, 1200), tone: 'info',
          ...(collaboration ? { collaboration } : {}),
          t: g.phase === 'shop' ? Math.floor(g.clock) : undefined,
        };
        // Group-chat memories are separate from each character's private DM memory.
        // The same character can remember a public group exchange without exposing private DMs to the room.
        const memoryKey = targetChat === GROUP ? groupMemoryKey(replyFrom) : replyFrom;
        const previous = g.characterMemories?.[memoryKey];
        const notes = [...(previous?.notes || [])];
        for (const note of proposedNotes) {
          if (!notes.some((old) => old.toLocaleLowerCase() === note.toLocaleLowerCase())) notes.push(note);
        }
        const trimmedNotes = notes.slice(-6);
        const nextSummary = proposedSummary || previous?.summary || '';
        const previousNotes = previous?.notes || [];
        const notesChanged = trimmedNotes.length !== previousNotes.length || trimmedNotes.some((note, index) => note !== previousNotes[index]);
        const memoryChanged = nextSummary !== (previous?.summary || '') || notesChanged;
        const characterMemories = memoryChanged
          ? {
              ...(g.characterMemories || {}),
              [memoryKey]: { summary: nextSummary, notes: trimmedNotes, updatedDay: g.day },
            }
          : g.characterMemories;
        return {
          ...g,
          msgSeq: id,
          messages: [replyMessage, ...g.messages.map((m) =>
            E.thread(m) === targetChat && m.choices && !m.answered ? { ...m, answered: 'freeform' } : m,
          )].slice(0, 160),
          ...(memoryChanged ? { characterMemories } : {}),
        };
      });
    } catch (error) {
      up((g) => ({ ...g, messages: g.messages.filter((m) => m.id !== userMessageId) }));
      setDraft(text);
      setAiError(error instanceof Error ? error.message : 'Could not reach the AI service.');
    } finally {
      setAiSending(false);
    }
  };
  const endRef = useRef<HTMLDivElement>(null);
  // after Divine replies, their answers arrive one by one with "typing…"
  const [typing, setTyping] = useState<{ from: number; start: number } | null>(null);
  const [, tickTyping] = useState(0);
  // scroll down whenever a new bubble (or "typing…") appears, not on every clock tick
  const visCount = useRef(0);
  const seenCount = useRef(-1);
  useEffect(() => {
    if (visCount.current !== seenCount.current) {
      seenCount.current = visCount.current;
      window.setTimeout(() => endRef.current?.scrollIntoView({ block: 'end' }), 30);
    }
  });
  useEffect(() => {
    if (!typing) return;
    const id = window.setInterval(() => tickTyping((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [typing]);
  useEffect(() => {
    if (chat) up((g) => E.markRead(g, chat));
    endRef.current?.scrollIntoView();
  }, [chat, s.msgSeq]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!chat) {
    return (
      <AppFrame title="WhatsApp" tone="bg-[#202C33]">
        <div className="divide-y divide-white/5">
          {list.length === 0 && <p className="p-4 text-sm text-slate-400">No chats yet.</p>}
          {list.map((c) => (
            <button key={c.from} onClick={() => setChat(c.from)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 bg-[#111B21]">
              <ContactAvatar name={c.from} s={s} size="list" />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-white font-medium truncate">{c.from}</span>
                  <span className={`text-[10px] shrink-0 ${c.unread ? 'text-[#25D366]' : 'text-slate-500'}`}>{stamp(c.last)}</span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[13px] text-slate-400 truncate">{c.last.text}</span>
                  {c.unread > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-[#25D366] text-[11px] font-bold text-black flex items-center justify-center shrink-0">{c.unread}</span>}
                </span>
              </span>
            </button>
          ))}
        </div>
      </AppFrame>
    );
  }
  const all = s.messages.filter((m) => E.thread(m) === chat).sort((a, b) => a.id - b.id);
  const incoming = typing ? all.filter((m) => m.id > typing.from && m.from !== 'You') : [];
  const shownN = typing ? Math.floor((Date.now() - typing.start) / 1300) : 0;
  const hidden = new Set(incoming.slice(shownN).map((m) => m.id));
  if (typing && !hidden.size) window.setTimeout(() => setTyping(null), 0);
  const msgs = all.filter((m) => !hidden.has(m.id));
  const typer = incoming.find((m) => hidden.has(m.id))?.from;
  const member = s.staff.find((m) => m.name === chat);
  const ask = member?.raiseAsk;
  const isGroup = chat === GROUP;
  const rival = s.rivals?.find((r) => r.owner === chat);
  const pending = hidden.size ? undefined : [...msgs].reverse().find((m) => m.choices && !m.answered && m.from !== 'You');
  visCount.current = msgs.length * 4 + (typer ? 1 : 0) + (pending ? 2 : 0);
  const reply = (id: string) => {
    if (!pending) return;
    setTyping({ from: s.msgSeq, start: Date.now() });
    up((g) => E.answerMessage(g, pending.id, id));
  };
  const authorTone = (name: string) => ['text-pink-300', 'text-sky-300', 'text-amber-300', 'text-emerald-300', 'text-violet-300', 'text-orange-300'][name.length % 6];
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="bg-[#202C33] px-3 py-2.5 text-white flex items-center gap-3 shrink-0">
        <button onClick={() => setChat(null)} className="text-xl px-1" aria-label="Back to chats">‹</button>
        <ContactAvatar name={chat} s={s} size="header" />
        <div className="leading-tight">
          <div className="font-medium">{chat}</div>
          <div className="text-[11px] text-slate-400 truncate max-w-[230px]">{isGroup ? `${(s.rivals || []).filter((r) => r.main).map((r) => (/^(Iya|Mrs|Mummy|Mama)\b/.test(r.owner) ? r.owner : r.owner.split(' ')[0])).join(', ')}, You` : rival ? rival.shop : chat === 'Landlord' ? s.listing.landlord : member ? `Level ${member.level} stylist` : chat === 'Deborah' ? 'Twin sis · manages the books' : 'online'}</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 bg-[#0B141A]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
        {msgs.map((m, i) => {
          const newDay = i === 0 || msgs[i - 1].day !== m.day;
          return (
            <React.Fragment key={m.id}>
              {newDay && <div className="text-center my-2"><span className="text-[10px] uppercase tracking-wider bg-[#182229] text-slate-400 rounded-md px-2 py-1">Day {m.day}</span></div>}
              <div className={`flex items-end gap-1.5 ${m.from === 'You' ? 'justify-end' : ''}`}>
                {isGroup && m.from !== 'You' && <ContactAvatar name={m.from} s={s} size="message" />}
                <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-[13.5px] leading-snug text-[#E9EDEF] shadow ${m.from === 'You' ? 'bg-[#005C4B] rounded-tr-none' : m.tone === 'danger' ? 'bg-[#3a1d22] rounded-tl-none' : 'bg-[#202C33] rounded-tl-none'}`}>
                  {isGroup && m.from !== 'You' && <div className={`text-[11px] font-semibold ${authorTone(m.from)}`}>{m.from}</div>}
                  {m.text}
                  <div className="text-[10px] text-slate-400 text-right mt-0.5">{m.t !== undefined ? E.clockText(m.t) : ''}</div>
                </div>
              </div>
              {m.collaboration && (m.collaboration.decision === 'accept' || m.collaboration.decision === 'counter') && (
                <div className="ml-8 mt-1 mb-2 max-w-[90%] rounded-xl border border-emerald-400/25 bg-[#132920] p-3 text-[12px] text-slate-100">
                  <div className="font-semibold text-emerald-200 mb-1">
                    {m.collaboration.decision === 'counter' ? 'Business counter-offer' : 'Joint fashion pop-up proposal'}
                  </div>
                  <div className="font-medium text-white">{m.collaboration.eventName}</div>
                  <div className="text-slate-300 mt-1">Proposed for in-game Day {m.day + Math.round(Math.max(3, Math.min(14, m.collaboration.dayOffset)))} · {m.collaboration.dayOffset} days from when this offer was made</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 my-2">
                    <div><span className="text-slate-400">Total setup cost</span><div className="font-semibold">{naira(m.collaboration.totalCost)}</div></div>
                    <div><span className="text-slate-400">Your contribution</span><div className="font-semibold">{naira(Math.round(m.collaboration.totalCost * m.collaboration.playerCostSharePct / 100))} ({m.collaboration.playerCostSharePct}%)</div></div>
                    <div><span className="text-slate-400">Your profit share</span><div className="font-semibold">{m.collaboration.playerProfitSharePct}%</div></div>
                    <div><span className="text-slate-400">Partner's cost share</span><div className="font-semibold">{100 - m.collaboration.playerCostSharePct}%</div></div>
                  </div>
                  <div className="text-[10px] text-slate-400 mb-2">Confirming deducts your contribution immediately. The game calculates sales and the final payout when the event day ends.</div>
                  {m.collaborationOutcome === 'scheduled' ? (
                    <div className="rounded-lg bg-emerald-900/60 px-2.5 py-2 text-emerald-100">✓ Confirmed · scheduled for in-game Day {m.collaborationScheduledDay || (m.day + m.collaboration.dayOffset)}</div>
                  ) : m.collaborationOutcome === 'declined' ? (
                    <div className="rounded-lg bg-white/5 px-2.5 py-2 text-slate-300">Offer declined.</div>
                  ) : m.collaborationOutcome === 'unaffordable' ? (
                    <div className="rounded-lg bg-amber-900/40 px-2.5 py-2 text-amber-100">Not enough cash for your share. Discuss a smaller budget with the rival.</div>
                  ) : m.collaborationOutcome === 'partner_unable' ? (
                    <div className="rounded-lg bg-amber-900/40 px-2.5 py-2 text-amber-100">The rival cannot fund their share yet. Negotiate a smaller budget.</div>
                  ) : m.collaborationOutcome === 'already_booked' ? (
                    <div className="rounded-lg bg-white/5 px-2.5 py-2 text-slate-300">You already have an active pop-up with this rival.</div>
                  ) : (
                    <div className="flex gap-2">
                      <button className="flex-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 px-3 py-2 font-semibold text-white" onClick={() => up((g) => E.confirmCollaboration(g, m.id))}>
                        {m.collaboration.decision === 'counter' ? 'Accept counter-offer' : 'Confirm pop-up'}
                      </button>
                      <button className="rounded-lg bg-[#2A3942] hover:bg-[#354751] px-3 py-2 text-slate-200" onClick={() => up((g) => E.declineCollaboration(g, m.id))}>Decline</button>
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
        {typer && (
          <div className="flex">
            <div className="rounded-lg rounded-tl-none bg-[#202C33] px-3 py-2 text-[12px] text-slate-400 italic">
              {isGroup ? `${typer.split(' ')[0]} is typing` : 'typing'}
              <span className="inline-flex gap-0.5 ml-1 align-middle">{[0, 1, 2].map((i) => <span key={i} className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {pending ? (
        <div className="bg-[#202C33] p-2 shrink-0">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 px-1">
            <span>Reply to {pending.from.split(' ')[0]}:</span>
            {pending.convo && <button className="text-slate-400 hover:text-white underline" onClick={() => reply('read')}>Leave on read 👀</button>}
          </div>
          {pending.convo ? (
            <div className="grid gap-1.5 max-h-[42vh] overflow-y-auto">
              {pending.choices!.map((c) => (
                <button key={c.id} className={`rounded-xl text-left text-[13px] py-2 px-3 leading-snug ${/Clap|Receipts|Call/.test(c.tag || '') ? 'bg-[#3a1d22] text-rose-50 hover:bg-[#4a2229]' : /Classy|peace|well/.test(c.tag || '') ? 'bg-[#0d3b33] text-emerald-50 hover:bg-[#11493f]' : 'bg-[#2A3942] text-slate-100 hover:bg-[#32444e]'}`} onClick={() => reply(c.id)}>
                  {c.tag && <span className="block text-[10px] font-semibold opacity-70 mb-0.5">{c.tag}</span>}
                  {c.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {pending.choices!.map((c) => (
                <button key={c.id} className={`flex-1 rounded-full text-xs py-2 px-3 ${c.id === 'clap' ? 'bg-rose-700 text-white' : c.id === 'classy' || c.id === 'accept' ? 'bg-[#005C4B] text-white' : 'bg-[#2A3942] text-slate-200'}`} onClick={() => reply(c.id)}>
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : member && ask ? (
        <div className="bg-[#202C33] p-2 flex flex-wrap gap-1.5 shrink-0">
          <button className="flex-1 rounded-full bg-[#005C4B] text-white text-xs py-2 px-3" onClick={() => staff.raise(member.id, 'accept')}>Okay, {naira(ask)}</button>
          <button className="flex-1 rounded-full bg-[#2A3942] text-white text-xs py-2 px-3" onClick={() => staff.raise(member.id, 'counter')}>Offer {naira(Math.round((member.wage + ask) / 2 / 500) * 500)}</button>
          <button className="flex-1 rounded-full bg-[#2A3942] text-rose-300 text-xs py-2 px-3" onClick={() => staff.raise(member.id, 'refuse')}>No</button>
        </div>
      ) : null}
      {chat && (
        <form onSubmit={sendFreeform} className="bg-[#202C33] border-t border-white/5 p-2 shrink-0">
          {aiError && <div role="alert" className="text-[11px] text-rose-300 px-2 pb-1">{aiError}</div>}
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
              onTouchStart={(e) => { if (!aiSending) e.currentTarget.focus(); }}
              placeholder={aiSending ? 'Waiting for reply…' : `Message ${targetChatLabel(chat)}`}
              aria-label="Write a message"
              inputMode="text"
              enterKeyHint="send"
              autoCapitalize="sentences"
              autoCorrect="on"
              spellCheck
              autoComplete="off"
              rows={1}
              maxLength={1000}
              disabled={aiSending}
              style={{ fontSize: 16, touchAction: 'manipulation' }}
              className="relative z-10 pointer-events-auto min-w-0 flex-1 resize-none rounded-2xl bg-[#2A3942] text-white placeholder:text-slate-400 text-base px-4 py-2.5 outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
            />
            <button type="submit" disabled={aiSending || !draft.trim()} className="rounded-full w-10 h-10 shrink-0 bg-[#00A884] text-white font-bold disabled:opacity-40" aria-label="Send message">
              {aiSending ? '…' : '➤'}
            </button>
          </div>
          <div className="text-[10px] text-slate-500 px-2 pt-1">Free-form AI chat · Enter to send, Shift+Enter for a new line</div>
        </form>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

const BusinessExpansionApp: React.FC<{ s: GameState; up: PhoneProps['up'] }> = ({ s, up }) => {
  const expansion = s.businessExpansion || { branches: [], departments: [], wholesaleActive: false, designerCollections: 0 };
  const options = E.expansionOptions(s);
  const formatInvestment = (id: string) => id === 'branch' ? 'Branches' : id === 'wholesale' ? 'Wholesale' : id === 'designer' ? 'Collections' : 'Departments';
  return (
    <AppFrame title="Business Expansion" sub="Build beyond your current store" tone="bg-gradient-to-r from-indigo-700 to-blue-900">
      <div className="p-3 space-y-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs uppercase tracking-wide text-indigo-200">Asanwa Boutique portfolio</div>
          <div className="text-xl font-bold text-white mt-1">{TIERS[s.tier]?.name || 'Current shop'} · Brand Power {E.brandPower(E.getBrandMetrics(s), s.followers || 0, s.tier)?.toLocaleString('en-NG')}</div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-lg bg-black/15 p-2"><div className="text-[11px] text-slate-400">Branches</div><div className="text-lg font-bold text-white">{expansion.branches.length}</div></div>
            <div className="rounded-lg bg-black/15 p-2"><div className="text-[11px] text-slate-400">Departments</div><div className="text-lg font-bold text-white">{expansion.departments.length}</div></div>
            <div className="rounded-lg bg-black/15 p-2"><div className="text-[11px] text-slate-400">Wholesale</div><div className="text-sm font-semibold text-white">{expansion.wholesaleActive ? 'Active' : 'Not unlocked'}</div></div>
            <div className="rounded-lg bg-black/15 p-2"><div className="text-[11px] text-slate-400">Designer collections</div><div className="text-lg font-bold text-white">{expansion.designerCollections}</div></div>
          </div>
          {(expansion.expansionCredit || 0) > 0 && <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-2"><div className="text-[10px] uppercase tracking-wide text-emerald-200">Fashion event expansion credit</div><div className="text-sm font-bold text-white">{naira(expansion.expansionCredit || 0)}</div><div className="text-[11px] text-slate-400">Automatically reduces your next eligible capital purchase.</div></div>}
        </div>
        {expansion.branches.length > 0 && <section className="rounded-xl border border-white/10 p-3 space-y-2"><h3 className="text-white font-semibold">Branch performance</h3>{expansion.branches.map(branch => {
          const totalRevenue = Math.max(0, branch.cumulativeRevenue || 0);
          const totalCosts = Math.max(0, branch.cumulativeCosts || 0);
          const totalProfit = totalRevenue - totalCosts;
          const profitClass = (branch.lastDayProfit || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300';
          return <div key={branch.id} className="rounded-lg bg-white/5 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2"><div><div className="text-sm text-white font-semibold">{branch.name}</div><div className="text-xs text-slate-400">{branch.area} · {TIERS[branch.tier]?.name || 'Boutique'} · opened Day {branch.openedDay}</div></div><div className="text-right"><div className="text-[10px] text-slate-500">Estimated assets</div><div className="text-xs font-semibold text-indigo-200">{naira(branch.assetValue)}</div></div></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-black/15 p-2"><div className="text-[10px] text-slate-400">Latest day sales</div><div className="text-xs font-semibold text-white">{naira(branch.lastDayRevenue || 0)}</div></div>
              <div className="rounded-md bg-black/15 p-2"><div className="text-[10px] text-slate-400">Latest day profit/loss</div><div className={'text-xs font-semibold ' + profitClass}>{naira(branch.lastDayProfit || 0)}</div></div>
              <div className="rounded-md bg-black/15 p-2"><div className="text-[10px] text-slate-400">Lifetime sales</div><div className="text-xs font-semibold text-white">{naira(totalRevenue)}</div></div>
              <div className="rounded-md bg-black/15 p-2"><div className="text-[10px] text-slate-400">Lifetime operating result</div><div className={'text-xs font-semibold ' + (totalProfit >= 0 ? 'text-emerald-300' : 'text-rose-300')}>{naira(totalProfit)}</div></div>
            </div>
            <div className="text-[11px] text-slate-400">{branch.daysTrading || 0} trading days · weekly rent {naira(branch.weeklyRent)} · lifetime modeled costs {naira(totalCosts)}{branch.lastDay ? ' · last updated Day ' + branch.lastDay : ' · performance tracking starts at next close'}</div>
          </div>;
        })}</section>}
        {expansion.departments.length > 0 && <section className="rounded-xl border border-white/10 p-3 space-y-2"><h3 className="text-white font-semibold">Department performance & inventory</h3>{(expansion.departmentOperations || []).map(department => { const profit = (department.cumulativeRevenue || 0) - (department.cumulativeCosts || 0); return <div key={department.name} className="rounded-lg bg-white/5 p-3"><div className="font-semibold text-white text-sm">{department.name}</div><div className="grid grid-cols-2 gap-2 mt-2"><div className="rounded bg-black/15 p-2"><div className="text-[10px] text-slate-400">Stock on hand</div><div className="text-xs text-white">{department.inventoryUnits} / {department.targetUnits} units</div><div className="text-[10px] text-slate-500">Inventory value {naira(department.inventoryValue)}</div></div><div className="rounded bg-black/15 p-2"><div className="text-[10px] text-slate-400">Latest day profit/loss</div><div className={'text-xs font-semibold ' + ((department.lastDayProfit || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300')}>{naira(department.lastDayProfit || 0)}</div><div className="text-[10px] text-slate-500">Latest sales {naira(department.lastDayRevenue || 0)}</div></div><div className="rounded bg-black/15 p-2"><div className="text-[10px] text-slate-400">Lifetime sales</div><div className="text-xs text-white">{naira(department.cumulativeRevenue)}</div></div><div className="rounded bg-black/15 p-2"><div className="text-[10px] text-slate-400">Lifetime operating result</div><div className={'text-xs font-semibold ' + (profit >= 0 ? 'text-emerald-300' : 'text-rose-300')}>{naira(profit)}</div></div></div><div className="text-[10px] text-slate-500 mt-2">{department.daysTrading} trading days · unit cost {naira(department.unitCost)} · selling price {naira(department.unitPrice)}</div></div>; })}</section>}
        {expansion.wholesaleActive && <section className="rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-3 space-y-2"><h3 className="text-white font-semibold">Wholesale inventory upgrades</h3><p className="text-xs text-slate-400">Each upgrade doubles stock capacity and buys the added inventory. More stock lets you fulfil larger orders, but sales still depend on demand.</p>{(() => { const q = E.wholesaleUpgradeQuote(s); return <><div className="flex items-center justify-between text-xs"><span className="text-slate-400">Upgrade level</span><span className="text-white font-semibold">{q.level} / 3</span></div><div className="flex items-center justify-between text-xs"><span className="text-slate-400">Next stock capacity</span><span className="text-white font-semibold">{Math.max(0, Number(q.nextCapacity) || 0)?.toLocaleString('en-NG')} units</span></div>{q.available ? <button disabled={s.cash < q.cost} onClick={() => up(g => E.upgradeWholesaleInventory(g))} className="w-full rounded-lg bg-indigo-700 disabled:opacity-40 py-2 text-sm font-semibold text-white">Upgrade + stock · {naira(q.cost)}</button> : <div className="text-xs text-slate-500">{q.level >= 3 ? 'Maximum warehouse upgrade reached.' : 'Invest in wholesale first to unlock upgrades.'}</div>}</>; })()}</section>}
        {expansion.wholesaleActive && <section className="rounded-xl border border-white/10 p-3 space-y-2"><h3 className="text-white font-semibold">Wholesale order book</h3>{(() => { const w = expansion.wholesaleOperation; if (!w) return <p className="text-xs text-slate-400">Wholesale inventory initializes at the next closing cycle.</p>; const profit = w.cumulativeRevenue - w.cumulativeCosts; return <><div className="grid grid-cols-2 gap-2"><div className="rounded-lg bg-white/5 p-2"><div className="text-[10px] text-slate-400">Inventory</div><div className="text-sm font-bold text-white">{w.inventoryUnits} / {w.targetUnits} units</div><div className="text-[10px] text-slate-500">{naira(w.inventoryValue)} at cost</div></div><div className="rounded-lg bg-white/5 p-2"><div className="text-[10px] text-slate-400">Latest day profit/loss</div><div className={'text-sm font-bold ' + ((w.lastDayProfit || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300')}>{naira(w.lastDayProfit || 0)}</div><div className="text-[10px] text-slate-500">Sales {naira(w.lastDayRevenue || 0)}</div></div><div className="rounded-lg bg-white/5 p-2"><div className="text-[10px] text-slate-400">Orders fulfilled</div><div className="text-sm font-bold text-white">{w.ordersFulfilled}</div></div><div className="rounded-lg bg-white/5 p-2"><div className="text-[10px] text-slate-400">Orders with stock-outs</div><div className="text-sm font-bold text-white">{w.ordersMissed}</div></div></div><div className="text-[11px] text-slate-400">Lifetime sales {naira(w.cumulativeRevenue)} · lifetime operating result <span className={profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{naira(profit)}</span></div></>; })()}</section>}
        <section className="space-y-2"><h3 className="text-white font-semibold px-1">Invest in your next stage</h3>
          {options.map(option => <div key={option.id} className="rounded-xl border border-white/10 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2"><div className="flex-1"><div className="font-semibold text-white">{option.title}</div><p className="text-xs text-slate-400 mt-1">{option.description}</p></div><div className="text-sm font-bold text-indigo-200 whitespace-nowrap">{naira(option.cost)}</div></div>
            <div className="text-[11px] text-slate-500">Unlocks at {TIERS[option.minimumTier]?.name || 'Flagship'} tier.</div>
            {(expansion.expansionCredit || 0) > 0 && option.cashRequired < option.cost && <div className="text-[11px] text-emerald-300">Event credit applied: {naira(option.cost - option.cashRequired)} · Net capital cost {naira(option.cashRequired)}</div>}
            {option.available ? <button onClick={() => up(g => option.financeable ? E.financeExpansionPurchase(g, option.id) : E.investInExpansion(g, option.id))} className="w-full rounded-lg bg-indigo-700 py-2 text-sm font-semibold text-white">{option.financeable ? 'Finance with KoboBank' : 'Invest'} {naira(option.cashRequired)}</button> : <div className="rounded-lg bg-white/5 p-2 text-xs text-slate-500">{option.reason || 'Not currently available'}</div>}
            {option.financeable && <p className="text-[10px] text-amber-200">A 24-week business loan will cover the {naira(Math.max(0, option.cashRequired - Math.max(0, s.cash)))} shortfall. Interest and weekly repayments apply under your KoboBank loan terms.</p>}
          </div>)}
        </section>
        <p className="text-[11px] text-slate-500">Expansion can be funded with current-account cash or an eligible KoboBank business loan. Fashion event credit reduces the next eligible purchase. Departments and wholesale each track inventory, sales, cost of goods, running/fulfilment costs, restocking, stock-outs and lifetime performance; capital inventory purchases increase stock assets rather than being double-counted as sold goods.</p>
      </div>
    </AppFrame>
  );
};

const Forbes: React.FC<{ s: GameState }> = ({ s }) => {
  const history = s.wealthHistory || [];
  const latestSnapshotDay = history.reduce(
    (latestDay, item) => item.day <= s.day ? Math.max(latestDay, item.day) : latestDay,
    0,
  );
  const officialRanks = new Map(
    history
      .filter((item) => item.day === latestSnapshotDay)
      .map((item) => [item.ownerId, item] as const),
  );
  const latestByOwner = new Map<string, (typeof history)[number]>();
  for (const item of history) {
    if (item.day <= s.day) latestByOwner.set(item.ownerId, item);
  }

  // Keep row order and displayed ranks aligned with the most recent weekly publication.
  // Before the first snapshot, use a live estimate ordered by net worth.
  const rows = E.currentWealthRows(s).sort((a, b) => {
    const rankA = officialRanks.get(a.ownerId)?.rank;
    const rankB = officialRanks.get(b.ownerId)?.rank;
    if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
    if (rankA !== undefined) return -1;
    if (rankB !== undefined) return 1;
    return b.netWorth - a.netWorth;
  });

  return (
    <AppFrame title="Lagos Fashion Rich List" sub="In-game wealth estimates · weekly changes" tone="bg-gradient-to-r from-zinc-700 to-zinc-950">
      <div className="p-3 space-y-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs uppercase tracking-wider text-amber-200">Your estimated net worth</div>
          <div className="text-2xl font-bold text-white mt-1">{naira(E.netWorthPlayer(s))}</div>
          <div className="text-xs text-slate-400 mt-1">
            Cash and bank accounts + stock at cost + fixtures and expansion assets + brand/follower value + 3× average weekly profit over up to 28 days − loans, rent arrears and unpaid bills. This is an estimate, not spendable cash.
          </div>
        </div>
        {rows.map((row, index) => {
          const latest = latestByOwner.get(row.ownerId);
          const onSnapshotDay = !!latest && latest.day === s.day;
          const change = latest
            ? onSnapshotDay ? latest.wealthChange : row.netWorth - latest.netWorth
            : 0;
          const previousRank = latest?.previousRank || 0;
          const movement = onSnapshotDay && previousRank > 0
            ? previousRank - (latest?.rank || index + 1)
            : 0;
          return (
            <div key={row.ownerId} className="rounded-xl border border-white/10 p-3 flex gap-3 items-start">
              <div className="w-8 text-center text-lg font-bold text-amber-300">#{latest?.rank || index + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white">{row.owner}</div>
                <div className="text-xs text-slate-400">{row.shop} · {TIERS[row.tier]?.name || 'Fashion business'}</div>
                <div className="text-base font-bold text-white mt-1">{naira(row.netWorth)}</div>
                <div className={change > 0 ? 'text-xs mt-1 text-emerald-300' : change < 0 ? 'text-xs mt-1 text-rose-300' : 'text-xs mt-1 text-slate-400'}>
                  {latest
                    ? (change >= 0 ? '+' : '') + naira(change) + (onSnapshotDay ? ' this week' : ` since Day ${latest.day} snapshot`)
                    : 'First recorded estimate'}
                  {movement ? ' · ' + (movement > 0 ? 'up ' : 'down ') + Math.abs(movement) + ' place(s)' : ''}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
                  <div className="rounded-lg bg-white/5 p-2">
                    <div className="text-slate-400">Weekly revenue</div>
                    <div className="text-white font-semibold">{naira(row.revenue)}</div>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    <div className="text-slate-400">Profit / loss</div>
                    <div className={row.profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{naira(row.profit)}</div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  {Math.max(0, Number(row.followers) || 0)?.toLocaleString('en-NG')} followers · Brand Power {Math.max(0, Number(row.brandPower) || 0)?.toLocaleString('en-NG')}
                </div>
              </div>
            </div>
          );
        })}
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
          <div className="font-semibold text-amber-100">Deborah's fashion empire</div>
          <div className="text-xs text-slate-300 mt-1">Her exact business name and private financial figures are not yet modeled, so the game does not invent a precise fortune.</div>
        </div>
        <div className="text-[10px] text-slate-500">Estimates are in-game values, not real-world valuations. Published ranks are saved weekly; estimated net worth keeps updating between publications.</div>
      </div>
    </AppFrame>
  );
};
const PromotionApp: React.FC<{ s: GameState; up: PhoneProps['up'] }> = ({ s, up }) => {
  const [mode, setMode] = useState<'period' | 'always'>(s.promotion?.mode || 'period');
  const [target, setTarget] = useState<'brand' | 'warehouse'>(s.promotion?.target || 'brand');
  const levels = E.availablePromotionLevels(s.tier);
  const [level, setLevel] = useState<NonNullable<GameState['promotion']>['level']>(s.promotion?.level || 'local');
  const chosen = levels.includes(level) ? level : (levels[0] || 'local');
  const bounds = E.promotionBudgetBounds(s.tier, chosen);
  const [budget, setBudget] = useState(String(bounds.min));
  const [duration, setDuration] = useState(48);
  const active = s.promotion?.active ? s.promotion : null;
  return (
    <AppFrame title="Promotion Centre" sub="Paid campaigns · simulated business hours" tone="bg-gradient-to-r from-fuchsia-700 to-purple-900">
      <div className="p-3 space-y-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="flex items-center justify-between gap-2"><span className="text-white font-semibold">Campaign status</span><span className={active ? 'text-emerald-300 text-xs font-bold' : 'text-slate-400 text-xs'}>{active ? 'ACTIVE' : 'OFF'}</span></div>{active && <div className="grid grid-cols-2 gap-2 mt-2 text-xs"><div className="rounded-lg bg-black/15 p-2"><div className="text-slate-400">Level / spend</div><div className="text-white font-semibold">{active.target === 'warehouse' ? 'Warehouse · ' : 'Brand · '}{active.level} · {naira(active.hourlyBudget)}/hour</div></div><div className="rounded-lg bg-black/15 p-2"><div className="text-slate-400">Campaign spend</div><div className="text-white font-semibold">{naira(active.totalSpent)}</div></div><div className="rounded-lg bg-black/15 p-2"><div className="text-slate-400">Estimated reach</div><div className="text-white font-semibold">{Math.max(0, Number(active.estimatedReach) || 0)?.toLocaleString('en-NG')}</div></div><div className="rounded-lg bg-black/15 p-2"><div className="text-slate-400">Remaining time</div><div className="text-white font-semibold">{active.mode === 'always' ? 'Until stopped' : (active.hoursRemaining || 0) + ' hours'}</div></div></div>}{active && <button onClick={() => up(g => E.stopPromotion(g))} className="mt-3 w-full rounded-lg bg-rose-800 py-2 font-semibold text-white">Stop promotion</button>}</div>
        <div className="rounded-xl border border-white/10 p-3 space-y-3"><h3 className="font-semibold text-white">Create a campaign</h3><label className="block text-xs text-slate-400">Promote<select value={target} onChange={e => setTarget(e.target.value as 'brand' | 'warehouse')} className="mt-1 w-full rounded-lg bg-[#181b24] border border-white/10 p-2 text-white text-sm"><option value="brand">Boutique / brand awareness</option><option value="warehouse" disabled={!s.businessExpansion?.wholesaleActive}>Wholesale warehouse / buyer demand</option></select></label>{target === 'warehouse' && <p className="text-[11px] text-indigo-200">Warehouse campaigns boost wholesale order demand, not boutique followers. Invest in wholesale first.</p>}<label className="block text-xs text-slate-400">Campaign duration<select value={mode} onChange={e => setMode(e.target.value as 'period' | 'always')} className="mt-1 w-full rounded-lg bg-[#181b24] border border-white/10 p-2 text-white text-sm"><option value="period">Fixed period — stop automatically</option><option value="always">Always-on — until stopped</option></select></label><label className="block text-xs text-slate-400">Promotion level<select value={chosen} onChange={e => { const next = e.target.value as NonNullable<GameState['promotion']>['level']; setLevel(next); setBudget(String(E.promotionBudgetBounds(s.tier, next).min)); }} className="mt-1 w-full rounded-lg bg-[#181b24] border border-white/10 p-2 text-white text-sm">{levels.map(l => <option key={l} value={l}>{({local:'Local Buzz',citywide:'Citywide Campaign',premium:'Premium Campaign',luxury:'Luxury Spotlight'} as Record<string,string>)[l]}</option>)}</select></label><label className="block text-xs text-slate-400">Budget per business hour (₦)<input type="number" value={budget} min={bounds.min} max={bounds.max} step="500" onChange={e => setBudget(e.target.value)} className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 p-2 text-white text-sm"/><span className="block text-[10px] text-slate-500 mt-1">This tier allows {naira(bounds.min)}–{naira(bounds.max)} per hour. The shop runs 12 business hours per in-game day.</span></label>{mode === 'period' && <label className="block text-xs text-slate-400">Duration<select value={duration} onChange={e => setDuration(Number(e.target.value))} className="mt-1 w-full rounded-lg bg-[#181b24] border border-white/10 p-2 text-white text-sm">{[8,24,48,72,120,168].map(n => <option key={n} value={n}>{n} simulated hours</option>)}</select></label>}<button disabled={!!active || s.cash < bounds.min} onClick={() => up(g => E.startPromotion(g, mode, chosen, Math.max(0,Number(budget)||0), duration, target))} className="w-full rounded-lg bg-fuchsia-700 disabled:opacity-40 py-2 font-semibold text-white">Start promotion</button><p className="text-[11px] text-slate-500">Reach estimates are not guaranteed sales. Promotion is charged at closing and stops if the account cannot cover it.</p></div>
      </div>
    </AppFrame>
  );
};

// ---------------------------------------------------------------------------
// Gidigram
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Rival pages, the Top 20 and the gist blog
// ---------------------------------------------------------------------------
const SPECIAL: Record<string, string> = { bridal: 'Bridal & luxury', genz: 'Gen Z wear', native: 'Native & aso-ebi', cheap: 'Cheap and fast', wigs: 'Wigs & glam', menswear: 'Menswear', luxury: 'Luxury', thrift: 'Thrift', everyday: 'Everyday wear' };

const Top20: React.FC<{ s: GameState; open: (id: string) => void }> = ({ s, open }) => {
  const rows = ladder(s);
  const recentDays = (s.dailyRanking || []).slice(-2);
  // Compare against the prior in-game day so overtaking is visible before Sunday's official list.
  const last = recentDays.length > 1 ? recentDays[0] : (s.ranking || []).slice(-1)[0];
  return (
    <AppFrame title="Top 20 Boutiques" sub={`Lagos · live now · next list on day ${s.day + ((7 - (s.day % 7)) % 7 || 7)}`} tone="bg-gradient-to-r from-amber-600 to-yellow-700">
      <div className="px-3 py-2 text-[11px] text-slate-400">Weekly takings, Brand Power, followers, shop scale and market momentum decide this race. Forbes separately ranks estimated net worth.</div>
      <div className="divide-y divide-white/5">
        {rows.map((r, i) => {
          const before = last ? last.order.indexOf(r.id) + 1 : 0;
          const move = before ? before - (i + 1) : 0;
          return (
            <button key={r.id} disabled={r.you} onClick={() => open(r.id)} className={`w-full flex items-center gap-2 px-3 py-2 text-left ${r.you ? 'bg-amber-500/15' : 'hover:bg-white/5'}`}>
              <span className={`w-7 text-center font-bold ${i < 3 ? 'text-amber-300' : 'text-slate-300'}`}>{i + 1}</span>
              <span className={`w-6 text-[11px] text-center ${move > 0 ? 'text-emerald-300' : move < 0 ? 'text-rose-300' : 'text-slate-600'}`}>{move > 0 ? `▲${move}` : move < 0 ? `▼${-move}` : '–'}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-white font-semibold truncate">{r.name}{r.you ? ' (you)' : ''}{r.main ? ' ●' : ''}</span>
                <span className="block text-[11px] text-slate-400 truncate">{r.owner} · {TIERS[r.tier].name}, {r.area}</span>
              </span>
              <span className="text-[11px] text-slate-400 shrink-0">Power {Math.max(0, Number(r.brandPower) || 0)?.toLocaleString("en-NG")}</span>
            </button>
          );
        })}
      </div>
    </AppFrame>
  );
};

const WeatherApp: React.FC<{ s: GameState }> = ({ s }) => {
  const today = s.weather || E.weatherForDay(s.day, s.seed);
  const season = seasonOf(s.day);
  const range = dayRange(s.day, s.seed, today);
  const now = s.phase === 'shop' ? outdoorTemp(s.day, s.seed, s.clock, today) : null;
  // The next season, and how many days until it starts.
  let nextIn = 1;
  while (nextIn < 400 && seasonOf(s.day + nextIn).id === season.id) nextIn++;
  const next = seasonOf(s.day + nextIn);
  return (
    <AppFrame title="Lagos Weather" sub="Forecast for your boutique" tone="bg-gradient-to-r from-sky-600 to-blue-800">
      <div className="p-4">
        <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4 mb-3">
          <div className="text-xs uppercase tracking-wider text-sky-200">Today · {dateLabel(s.day)} · Day {s.day}</div>
          <div className="flex items-end justify-between gap-2 mt-1">
            <div className="text-2xl font-bold text-white">{WEATHER_INFO[today].icon} {WEATHER_INFO[today].title}</div>
            <div className="text-right">
              {now !== null && <div className="text-2xl font-bold text-white tabular-nums">{Math.round(now)}°C</div>}
              <div className="text-xs text-slate-300 tabular-nums">H {Math.round(range.high)}° · L {Math.round(range.low)}°</div>
            </div>
          </div>
          <p className="text-sm text-slate-300 mt-2">{WEATHER_INFO[today].detail}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 mb-3">
          <div className="text-xs uppercase tracking-wider text-slate-400">Season</div>
          <div className="text-lg font-semibold text-white mt-0.5">{season.icon} {season.name}{festive(s.day) ? ' · Owambe December 🎉' : ''}</div>
          <p className="text-xs text-slate-300 mt-1">{season.blurb}</p>
          <p className="text-[11px] text-slate-400 mt-1.5">{next.icon} {next.name} starts in {nextIn} day{nextIn === 1 ? '' : 's'}.</p>
        </div>
        <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Next 5 days</div>
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => {
            const day = s.day + i + 1;
            const weather = E.weatherForDay(day, s.seed);
            const r = dayRange(day, s.seed, weather);
            return <div key={i} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/5 px-3 py-2">
              <div className="text-xs text-slate-400 w-14">{dateLabel(day)}</div>
              <div className="text-xl">{WEATHER_INFO[weather].icon}</div>
              <div className="text-sm text-white flex-1">{WEATHER_INFO[weather].title}</div>
              <div className="text-xs text-slate-300 tabular-nums">{Math.round(r.high)}° / {Math.round(r.low)}°</div>
            </div>;
          })}
        </div>
        <p className="text-[11px] text-slate-500 mt-3">The game's year follows Lagos seasons: harmattan in Dec–Feb, the hot season in Mar–Apr, the rains in May–Oct with the August break, and dry season in November.</p>
      </div>
    </AppFrame>
  );
};

