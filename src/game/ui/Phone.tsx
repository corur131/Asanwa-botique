import React, { useEffect, useRef, useState } from 'react';
import { CharacterSvg } from '../../components/renderer/renderCharacter';
import { naira } from '../economy';
import * as E from '../engine';
import { Listing } from '../shop';
import { GameState, Message, Post, Rival } from '../types';
import { MarketApp } from './MarketApp';
import { MovePanel, StaffActions, StaffPanel } from './Panels';
import type { CartLine } from '../engine';
import { GROUP, ladder } from '../rivals';
import { TIERS } from '../economy';

export type AppId = 'home' | 'chats' | 'market' | 'bank' | 'property' | 'gidigram' | 'staff' | 'top20' | 'gist';

const APPS: { id: Exclude<AppId, 'home'>; name: string; bg: string; glyph: string }[] = [
  { id: 'chats', name: 'WhatsApp', bg: 'bg-[#25D366]', glyph: '✆' },
  { id: 'market', name: 'Yaba Mart', bg: 'bg-gradient-to-br from-orange-400 to-rose-500', glyph: '🛍' },
  { id: 'gidigram', name: 'Gidigram', bg: 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600', glyph: '◎' },
  { id: 'bank', name: 'KoboBank', bg: 'bg-gradient-to-br from-emerald-600 to-teal-800', glyph: '₦' },
  { id: 'property', name: 'Lagos Lets', bg: 'bg-gradient-to-br from-sky-500 to-indigo-700', glyph: '⌂' },
  { id: 'staff', name: 'Staff', bg: 'bg-gradient-to-br from-slate-500 to-slate-800', glyph: '☺' },
  { id: 'top20', name: 'Top 20', bg: 'bg-gradient-to-br from-amber-400 to-yellow-700', glyph: '🏆' },
  { id: 'gist', name: 'GistLagos', bg: 'bg-gradient-to-br from-red-500 to-rose-800', glyph: '☕' },
];

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
  onMove: (l: Listing) => void;
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
  const unread = E.unreadCount(s);
  const back = () => {
    if (app === 'chats' && p.chat) p.setChat(null);
    else if (app === 'gidigram' && p.profile) p.setProfile(null);
    else setApp('home');
  };
  return (
    <div className="fixed inset-0 z-50 sm:inset-auto sm:right-6 sm:bottom-4 sm:top-auto flex sm:block items-stretch">
      <div className="absolute inset-0 bg-black/50 sm:hidden" onClick={p.onClose} />
      <div className="relative w-full sm:w-[390px] h-full sm:h-[min(800px,calc(100vh-90px))] sm:rounded-[44px] sm:border-[10px] border-[#0b0b0d] bg-[#0b0b0d] shadow-2xl overflow-hidden flex flex-col">
        {/* status bar */}
        <div className="relative flex items-center justify-between px-6 pt-2 pb-1 text-[12px] font-semibold text-white bg-black shrink-0">
          <span>{timeText(s)}</span>
          <span className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-1.5 w-24 h-6 rounded-full bg-[#0b0b0d] border border-white/5" />
          <span className="flex items-center gap-1.5 text-[11px]">
            <span>{E.inBlackout(s) ? 'MTN' : 'MTN 4G'}</span>
            <span className="inline-block w-6 h-3 rounded-sm border border-white/70 relative">
              <span className="absolute inset-[1px] right-[35%] bg-white rounded-[1px]" />
            </span>
          </span>
        </div>
        <div className="flex-1 min-h-0 flex flex-col bg-[#111]">
          {app === 'home' && <Home s={s} unread={unread} open={setApp} />}
          {app === 'chats' && <Chats {...p} />}
          {app === 'market' && <MarketApp s={s} cart={p.cart} setCart={p.setCart} onPay={() => { p.up((g) => E.buyCart(g, p.cart)); p.setCart(() => []); }} onBuyDrop={(n) => p.up((g) => E.buyDrop(g, n))} />}
          {app === 'bank' && <Bank s={s} />}
          {app === 'property' && (
            <AppFrame title="Lagos Lets" sub="Shops for rent this week" tone="bg-gradient-to-r from-sky-600 to-indigo-700">
              <div className="p-3">
                <MovePanel s={s} onMove={p.onMove} />
              </div>
            </AppFrame>
          )}
          {app === 'gidigram' && <Gidigram s={s} profile={p.profile} setProfile={p.setProfile} onVisit={p.onVisit} />}
          {app === 'top20' && <Top20 s={s} open={(id) => { p.setProfile(id); setApp('gidigram'); }} />}
          {app === 'gist' && <GistApp s={s} />}
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
          <button className="w-28 h-1.5 rounded-full bg-white/80 hover:bg-white" onClick={() => { p.setChat(null); setApp('home'); }} aria-label="Home" />
          <button className="px-4 py-1 hover:text-white" onClick={p.onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

const Home: React.FC<{ s: GameState; unread: number; open: (a: AppId) => void }> = ({ s, unread, open }) => (
  <div className="flex-1 bg-gradient-to-b from-[#3b1d4a] via-[#6b2d5c] to-[#c2563e] p-5 flex flex-col">
    <div className="text-center text-white mt-6 mb-8">
      <div className="text-5xl font-light tracking-tight">{timeText(s)}</div>
      <div className="text-sm opacity-80 mt-1">Day {s.day} · {s.phase === 'shop' ? 'Shop open' : s.phase === 'morning' ? 'Before opening' : 'Evening'}</div>
    </div>
    <div className="grid grid-cols-4 gap-y-6 gap-x-3">
      {APPS.map((a) => {
        const badge = a.id === 'chats' ? unread : 0;
        return (
          <button key={a.id} onClick={() => open(a.id)} className="flex flex-col items-center gap-1.5 group">
            <span className={`relative w-14 h-14 rounded-[18px] ${a.bg} flex items-center justify-center text-2xl text-white shadow-lg group-active:scale-95 transition-transform`}>
              {a.glyph}
              {badge > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-[11px] font-bold flex items-center justify-center border-2 border-[#6b2d5c]">{badge}</span>}
            </span>
            <span className="text-[11px] text-white font-medium drop-shadow">{a.name}</span>
          </button>
        );
      })}
    </div>
    <div className="mt-auto rounded-2xl bg-black/25 backdrop-blur p-3 text-white text-xs">
      <div className="opacity-70">KoboBank</div>
      <div className="text-lg font-bold">{naira(s.cash)}</div>
      <div className="opacity-70">Rent {naira(s.listing.rent)} {E.daysToRent(s.day) === 0 ? 'tonight' : `in ${E.daysToRent(s.day)} day${E.daysToRent(s.day) > 1 ? 's' : ''}`}</div>
    </div>
  </div>
);

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
const AVATAR_TONE: Record<string, string> = { Deborah: 'bg-pink-500', Landlord: 'bg-amber-700', [GROUP]: 'bg-gradient-to-br from-fuchsia-500 to-amber-500', GistLagos: 'bg-red-600' };
const avatarTone = (name: string) => AVATAR_TONE[name] || ['bg-sky-600', 'bg-violet-600', 'bg-emerald-600', 'bg-orange-500', 'bg-teal-600'][name.length % 5];
const stamp = (m: Message) => (m.t !== undefined ? `Day ${m.day} · ${E.clockText(m.t)}` : `Day ${m.day}`);

const Chats: React.FC<PhoneProps> = ({ s, up, chat, setChat, staff }) => {
  const list = E.chats(s);
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
              <span className={`w-11 h-11 rounded-full ${avatarTone(c.from)} flex items-center justify-center font-bold text-white shrink-0`}>{c.from[0]}</span>
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
        <span className={`w-9 h-9 rounded-full ${avatarTone(chat)} flex items-center justify-center font-bold`}>{chat[0]}</span>
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
              <div className={`flex ${m.from === 'You' ? 'justify-end' : ''}`}>
                <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-[13.5px] leading-snug text-[#E9EDEF] shadow ${m.from === 'You' ? 'bg-[#005C4B] rounded-tr-none' : m.tone === 'danger' ? 'bg-[#3a1d22] rounded-tl-none' : 'bg-[#202C33] rounded-tl-none'}`}>
                  {isGroup && m.from !== 'You' && <div className={`text-[11px] font-semibold ${authorTone(m.from)}`}>{m.from}</div>}
                  {m.text}
                  <div className="text-[10px] text-slate-400 text-right mt-0.5">{m.t !== undefined ? E.clockText(m.t) : ''}</div>
                </div>
              </div>
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
      ) : (
        <div className="bg-[#202C33] px-3 py-2 shrink-0">
          <div className="rounded-full bg-[#2A3942] text-slate-500 text-sm px-4 py-2">Message</div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------
const Bank: React.FC<{ s: GameState }> = ({ s }) => {
  const lines = s.ledger || [];
  const weekIn = lines.filter((l) => E.week(l.day) === E.week(s.day) && l.amount > 0).reduce((a, l) => a + l.amount, 0);
  const weekOut = lines.filter((l) => E.week(l.day) === E.week(s.day) && l.amount < 0).reduce((a, l) => a + l.amount, 0);
  const d = E.daysToRent(s.day);
  return (
    <AppFrame title="KoboBank" sub="Divine Styles · Current account" tone="bg-gradient-to-r from-emerald-700 to-teal-800">
      <div className="p-4 bg-gradient-to-b from-teal-900/60 to-transparent">
        <div className="text-xs text-emerald-200/80">Available balance</div>
        <div className={`text-3xl font-bold ${s.cash < 0 ? 'text-rose-300' : 'text-white'}`}>{naira(s.cash)}</div>
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
          <div className="rounded-xl bg-white/5 p-2.5"><div className="text-slate-400">In this week</div><div className="text-emerald-300 font-semibold">{naira(weekIn)}</div></div>
          <div className="rounded-xl bg-white/5 p-2.5"><div className="text-slate-400">Out this week</div><div className="text-rose-300 font-semibold">{naira(weekOut)}</div></div>
        </div>
        <div className={`mt-2 rounded-xl p-2.5 text-xs ${s.lateRent ? 'bg-rose-900/50 text-rose-200' : 'bg-white/5 text-slate-300'}`}>
          {s.lateRent ? `Rent is late. Clear it by the end of day ${s.lateRent.due}.` : `Rent ${naira(s.listing.rent)} goes out ${d === 0 ? 'tonight' : `in ${d} day${d > 1 ? 's' : ''}`} to ${s.listing.landlord}.`}
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Transactions</div>
        {lines.length === 0 && <p className="text-sm text-slate-500">Nothing yet.</p>}
        <div className="divide-y divide-white/5">
          {lines.slice(0, 80).map((l, i) => (
            <div key={i} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <div className="text-sm text-white truncate">{l.label}</div>
                <div className="text-[10px] text-slate-500">Day {l.day}{l.t >= 0 ? ` · ${E.clockText(l.t)}` : ''}</div>
              </div>
              <div className={`text-sm font-semibold shrink-0 ${l.amount >= 0 ? 'text-emerald-300' : 'text-slate-200'}`}>{l.amount >= 0 ? '+' : ''}{naira(l.amount)}</div>
            </div>
          ))}
        </div>
      </div>
    </AppFrame>
  );
};

// ---------------------------------------------------------------------------
// Gidigram
// ---------------------------------------------------------------------------
const FANS = ['tolu_xo', 'amaka.styles', 'lagosbabe_', 'kemi_oflagos', 'chi.chi', 'iam_bisola', 'yababoy', 'sade.k', 'ngozi_nails', 'fola.f', 'thisis_ada', 'mr_obinna'];
const COMMENTS = ['This is fire 🔥🔥', 'Where is this shop?? 😍', 'Divine you did that!', 'I need this for my sister wedding', 'Price please 🙏🏾', 'Omo! The finishing 💯', 'Booking you next week', 'She looks like money 💸', 'The colours 😩❤️', 'Clean!!'];
const hash = (str: string) => Array.from(str).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

const PostCard: React.FC<{ p: Post }> = ({ p }) => {
  const h = hash(p.id);
  const comments = [0, 1, 2].slice(0, 1 + (h % 3)).map((k) => ({ who: FANS[(h + k * 5) % FANS.length], text: COMMENTS[(h + k * 3) % COMMENTS.length] }));
  return (
    <div className="border-b border-white/10 pb-3">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]"><span className="block w-full h-full rounded-full bg-[#111] text-white text-xs font-bold flex items-center justify-center">D</span></span>
        <div className="leading-tight">
          <div className="text-sm text-white font-semibold">divine.styles</div>
          <div className="text-[10px] text-slate-500">Yaba, Lagos · Day {p.day}</div>
        </div>
      </div>
      <div className="aspect-[4/5] bg-gradient-to-b from-[#2a1f2e] to-[#141018] overflow-hidden">
        <CharacterSvg config={p.look} idPrefix={`gg-${p.id}`} camera="full" />
      </div>
      <div className="px-3 pt-2 text-sm text-white">
        <div className="flex gap-4 text-lg mb-1"><span>♥</span><span>💬</span><span>➤</span></div>
        <div className="font-semibold">{p.likes.toLocaleString('en-NG')} likes</div>
        <div><b>divine.styles</b> {p.caption} <span className="text-sky-300">@{p.name.toLowerCase()}</span></div>
        {comments.map((c, i) => <div key={i} className="text-[13px] text-slate-300"><b className="text-white">{c.who}</b> {c.text}</div>)}
        <div className="text-[11px] text-emerald-300 mt-1">+{p.gained} new followers from this post</div>
      </div>
    </div>
  );
};

const Gidigram: React.FC<{ s: GameState; profile: string | null; setProfile: (id: string | null) => void; onVisit: (id: string) => void }> = ({ s, profile, setProfile, onVisit }) => {
  const posts = s.posts || [];
  const [view, setView] = useState<'grid' | 'feed'>('grid');
  const [tab, setTab] = useState<'me' | 'explore'>(profile ? 'explore' : 'me');
  const rival = profile ? s.rivals?.find((r) => r.id === profile) : null;
  if (rival) return <RivalPage s={s} r={rival} back={() => setProfile(null)} onVisit={onVisit} />;
  if (tab === 'explore') {
    const list = [...(s.rivals || [])].sort((a, b) => b.followers - a.followers);
    return (
      <AppFrame title="Gidigram" sub="Explore boutiques" tone="bg-[#111] border-b border-white/10" right={<button className="text-xs text-slate-300 border border-white/20 rounded-lg px-2 py-1" onClick={() => setTab('me')}>My page</button>}>
        <div className="divide-y divide-white/5">
          {list.map((r) => (
            <button key={r.id} onClick={() => setProfile(r.id)} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/5">
              <span className="w-11 h-11 rounded-full overflow-hidden bg-[#2a1f2e] shrink-0 ring-2 ring-pink-500/60"><CharacterSvg config={r.look} idPrefix={`ex-${r.id}`} camera="portrait" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-white font-semibold truncate">{r.handle} {r.main && <span className="text-[10px] text-pink-300">● rival</span>}</span>
                <span className="block text-[11px] text-slate-400 truncate">{r.shop} · {r.area}</span>
              </span>
              <span className="text-[11px] text-slate-300 shrink-0">{r.followers.toLocaleString('en-NG')}</span>
            </button>
          ))}
        </div>
      </AppFrame>
    );
  }
  return (
    <AppFrame title="Gidigram" tone="bg-[#111] border-b border-white/10" right={<span className="flex gap-1.5"><button className="text-xs text-slate-300 border border-white/20 rounded-lg px-2 py-1" onClick={() => setTab('explore')}>Explore</button><button className="text-xs text-slate-300 border border-white/20 rounded-lg px-2 py-1" onClick={() => setView(view === 'grid' ? 'feed' : 'grid')}>{view === 'grid' ? 'Feed' : 'Grid'}</button></span>}>
      <div className="px-4 py-3 flex items-center gap-4">
        <span className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[3px] shrink-0"><span className="block w-full h-full rounded-full bg-[#111] text-white text-xl font-serif font-bold flex items-center justify-center">D</span></span>
        <div className="grid grid-cols-3 flex-1 text-center text-white">
          <div><div className="font-bold">{posts.length}</div><div className="text-[11px] text-slate-400">posts</div></div>
          <div><div className="font-bold">{(s.followers || 0).toLocaleString('en-NG')}</div><div className="text-[11px] text-slate-400">followers</div></div>
          <div><div className="font-bold">312</div><div className="text-[11px] text-slate-400">following</div></div>
        </div>
      </div>
      <div className="px-4 pb-3 text-sm text-white">
        <div className="font-semibold">Divine Styles · Asanwa Boutique</div>
        <div className="text-slate-300 text-[13px]">Stylist 💇🏾‍♀️ Native & English wear 👗 {s.listing.area}, Lagos 📍</div>
        <div className="text-[11px] text-slate-500 mt-1">More followers bring more customers to the shop (+{Math.round((E.followerTraffic(s.followers || 0) - 1) * 100)}% now). Post your best looks after a sale, up to 3 a day.</div>
      </div>
      {posts.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">No posts yet. After a look scores 70 or more, tap "Post to Gidigram".</p>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-3 gap-0.5">
          {posts.map((p) => (
            <button key={p.id} onClick={() => setView('feed')} className="aspect-square bg-gradient-to-b from-[#2a1f2e] to-[#141018] overflow-hidden relative">
              <div className="absolute inset-x-0 -top-2"><CharacterSvg config={p.look} idPrefix={`gt-${p.id}`} camera="bust" /></div>
              <span className="absolute bottom-1 left-1 text-[10px] text-white font-semibold drop-shadow">♥ {p.likes}</span>
            </button>
          ))}
        </div>
      ) : (
        posts.map((p) => <PostCard key={p.id} p={p} />)
      )}
    </AppFrame>
  );
};

// ---------------------------------------------------------------------------
// Rival pages, the Top 20 and the gist blog
// ---------------------------------------------------------------------------
const SPECIAL: Record<string, string> = { bridal: 'Bridal & luxury', genz: 'Gen Z wear', native: 'Native & aso-ebi', cheap: 'Cheap and fast', wigs: 'Wigs & glam', menswear: 'Menswear', luxury: 'Luxury', thrift: 'Thrift', everyday: 'Everyday wear' };

const RivalPage: React.FC<{ s: GameState; r: Rival; back: () => void; onVisit: (id: string) => void }> = ({ s, r, back, onVisit }) => {
  const posts = (s.rivalPosts || []).filter((p) => p.rivalId === r.id);
  const rank = ladder(s).findIndex((x) => x.id === r.id) + 1;
  const feeling = r.feeling > 30 ? 'Friendly' : r.feeling < -30 ? 'Enemy' : r.feeling < 0 ? 'Cold' : 'Neutral';
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="bg-[#111] border-b border-white/10 px-3 py-2.5 text-white flex items-center gap-2 shrink-0">
        <button onClick={back} className="text-xl px-1" aria-label="Back">‹</button>
        <div className="font-semibold">{r.handle}</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3 flex items-center gap-4">
          <span className="w-16 h-16 rounded-full overflow-hidden bg-[#2a1f2e] ring-2 ring-pink-500 shrink-0"><CharacterSvg config={r.look} idPrefix={`rp-${r.id}`} camera="portrait" /></span>
          <div className="grid grid-cols-3 flex-1 text-center text-white">
            <div><div className="font-bold">{posts.length + 30}</div><div className="text-[11px] text-slate-400">posts</div></div>
            <div><div className="font-bold">{r.followers.toLocaleString('en-NG')}</div><div className="text-[11px] text-slate-400">followers</div></div>
            <div><div className="font-bold">#{rank}</div><div className="text-[11px] text-slate-400">Top 20</div></div>
          </div>
        </div>
        <div className="px-4 pb-3 text-sm text-white">
          <div className="font-semibold">{r.owner} · {r.shop}</div>
          <div className="text-slate-300 text-[13px]">{SPECIAL[r.speciality]} · {TIERS[r.tier].name} in {r.area} 📍</div>
          {r.main && <div className="text-[11px] text-slate-500 mt-1">How she feels about you: <b className={r.feeling < 0 ? 'text-rose-300' : 'text-emerald-300'}>{feeling}</b></div>}
          <button onClick={() => onVisit(r.id)} className="mt-2 w-full rounded-lg bg-white/10 border border-white/15 py-1.5 text-sm font-semibold">Visit the shop</button>
        </div>
        {posts.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">No new posts this month.</p>
        ) : (
          posts.map((p) => (
            <div key={p.id} className="border-b border-white/10 pb-3">
              <div className="aspect-[4/5] bg-gradient-to-b from-[#2a1f2e] to-[#141018] overflow-hidden"><CharacterSvg config={p.look} idPrefix={`rpp-${p.id}`} camera="full" /></div>
              <div className="px-3 pt-2 text-sm text-white">
                <div className="font-semibold">{p.likes.toLocaleString('en-NG')} likes</div>
                <div><b>{r.handle}</b> {p.caption}</div>
                {p.shade && <div className="text-[11px] text-rose-300 mt-0.5">Everyone in the comments thinks this is about you 👀</div>}
                <div className="text-[10px] text-slate-500">Day {p.day}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const Top20: React.FC<{ s: GameState; open: (id: string) => void }> = ({ s, open }) => {
  const rows = ladder(s);
  const last = (s.ranking || []).slice(-1)[0];
  return (
    <AppFrame title="Top 20 Boutiques" sub={`Lagos · live now · next list on day ${s.day + ((7 - (s.day % 7)) % 7 || 7)}`} tone="bg-gradient-to-r from-amber-600 to-yellow-700">
      <div className="px-3 py-2 text-[11px] text-slate-400">Ranked on this week's takings, reputation, followers and shop size.</div>
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
              <span className="text-[11px] text-slate-400 shrink-0">rep {Math.round(r.rep)}</span>
            </button>
          );
        })}
      </div>
    </AppFrame>
  );
};

const GistApp: React.FC<{ s: GameState }> = ({ s }) => (
  <AppFrame title="GistLagos" sub="Fashion gist, no filter ☕" tone="bg-gradient-to-r from-red-600 to-rose-800">
    {(s.gist || []).length === 0 && <p className="p-4 text-sm text-slate-400">No gist yet. Give it a few days.</p>}
    <div className="divide-y divide-white/5">
      {(s.gist || []).map((g) => (
        <article key={g.id} className="px-4 py-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500">
            <span>Day {g.day}</span>
            {g.hot && <span className="text-rose-300 font-bold">🔥 Hot</span>}
            {g.about === 'you' && <span className="text-amber-300 font-bold">About you</span>}
          </div>
          <h3 className="text-white font-semibold leading-snug mt-0.5">{g.title}</h3>
          <p className="text-[13px] text-slate-300 mt-0.5">{g.body}</p>
        </article>
      ))}
    </div>
  </AppFrame>
);
