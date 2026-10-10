import React, { useEffect, useRef, useState } from 'react';
import { CharacterSvg } from '../../components/renderer/renderCharacter';
import { naira } from '../economy';
import * as E from '../engine';
import { Listing } from '../shop';
import { GameState, Message, Post } from '../types';
import { MarketApp } from './MarketApp';
import { MovePanel, StaffActions, StaffPanel } from './Panels';
import type { CartLine } from '../engine';

export type AppId = 'home' | 'chats' | 'market' | 'bank' | 'property' | 'gidigram' | 'staff';

const APPS: { id: Exclude<AppId, 'home'>; name: string; bg: string; glyph: string }[] = [
  { id: 'chats', name: 'WhatsApp', bg: 'bg-[#25D366]', glyph: '✆' },
  { id: 'market', name: 'Yaba Mart', bg: 'bg-gradient-to-br from-orange-400 to-rose-500', glyph: '🛍' },
  { id: 'gidigram', name: 'Gidigram', bg: 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600', glyph: '◎' },
  { id: 'bank', name: 'KoboBank', bg: 'bg-gradient-to-br from-emerald-600 to-teal-800', glyph: '₦' },
  { id: 'property', name: 'Lagos Lets', bg: 'bg-gradient-to-br from-sky-500 to-indigo-700', glyph: '⌂' },
  { id: 'staff', name: 'Staff', bg: 'bg-gradient-to-br from-slate-500 to-slate-800', glyph: '☺' },
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
}

const timeText = (s: GameState) => (s.phase === 'shop' ? E.clockText(s.clock) : s.phase === 'morning' ? '7:30am' : '9:15pm');

export const Phone: React.FC<PhoneProps> = (p) => {
  const { s, app, setApp } = p;
  const unread = E.unreadCount(s);
  const back = () => {
    if (app === 'chats' && p.chat) p.setChat(null);
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
          {app === 'market' && <MarketApp s={s} cart={p.cart} setCart={p.setCart} onPay={() => { p.up((g) => E.buyCart(g, p.cart)); p.setCart(() => []); }} />}
          {app === 'bank' && <Bank s={s} />}
          {app === 'property' && (
            <AppFrame title="Lagos Lets" sub="Shops for rent this week" tone="bg-gradient-to-r from-sky-600 to-indigo-700">
              <div className="p-3">
                <MovePanel s={s} onMove={p.onMove} />
              </div>
            </AppFrame>
          )}
          {app === 'gidigram' && <Gidigram s={s} />}
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
const AVATAR_TONE: Record<string, string> = { Deborah: 'bg-pink-500', Landlord: 'bg-amber-700' };
const avatarTone = (name: string) => AVATAR_TONE[name] || ['bg-sky-600', 'bg-violet-600', 'bg-emerald-600', 'bg-orange-500', 'bg-teal-600'][name.length % 5];
const stamp = (m: Message) => (m.t !== undefined ? `Day ${m.day} · ${E.clockText(m.t)}` : `Day ${m.day}`);

const Chats: React.FC<PhoneProps> = ({ s, up, chat, setChat, staff }) => {
  const list = E.chats(s);
  const endRef = useRef<HTMLDivElement>(null);
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
  const msgs = s.messages.filter((m) => m.from === chat).sort((a, b) => a.id - b.id);
  const member = s.staff.find((m) => m.name === chat);
  const ask = member?.raiseAsk;
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="bg-[#202C33] px-3 py-2.5 text-white flex items-center gap-3 shrink-0">
        <button onClick={() => setChat(null)} className="text-xl px-1" aria-label="Back to chats">‹</button>
        <span className={`w-9 h-9 rounded-full ${avatarTone(chat)} flex items-center justify-center font-bold`}>{chat[0]}</span>
        <div className="leading-tight">
          <div className="font-medium">{chat}</div>
          <div className="text-[11px] text-slate-400">{chat === 'Landlord' ? s.listing.landlord : member ? `Level ${member.level} stylist` : chat === 'Deborah' ? 'Bestie · manages the books' : 'online'}</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 bg-[#0B141A]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
        {msgs.map((m, i) => {
          const newDay = i === 0 || msgs[i - 1].day !== m.day;
          return (
            <React.Fragment key={m.id}>
              {newDay && <div className="text-center my-2"><span className="text-[10px] uppercase tracking-wider bg-[#182229] text-slate-400 rounded-md px-2 py-1">Day {m.day}</span></div>}
              <div className="flex">
                <div className={`max-w-[85%] rounded-lg rounded-tl-none px-2.5 py-1.5 text-[13.5px] leading-snug text-[#E9EDEF] shadow ${m.tone === 'danger' ? 'bg-[#3a1d22]' : 'bg-[#202C33]'}`}>
                  {m.text}
                  <div className="text-[10px] text-slate-400 text-right mt-0.5">{m.t !== undefined ? E.clockText(m.t) : ''}</div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={endRef} />
      </div>
      {member && ask ? (
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

const Gidigram: React.FC<{ s: GameState }> = ({ s }) => {
  const posts = s.posts || [];
  const [view, setView] = useState<'grid' | 'feed'>('grid');
  return (
    <AppFrame title="Gidigram" tone="bg-[#111] border-b border-white/10" right={<button className="text-xs text-slate-300 border border-white/20 rounded-lg px-2 py-1" onClick={() => setView(view === 'grid' ? 'feed' : 'grid')}>{view === 'grid' ? 'Feed' : 'Grid'}</button>}>
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
