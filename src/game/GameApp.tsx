import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { CharacterSvg } from '../components/renderer/renderCharacter';
import { DIVINE_CONFIG } from '../constants/presets';
import { CharacterConfig } from '../types/character';
import { ControlsPanel } from '../components/ControlsPanel';
import { generateRandomCustomer } from '../utils/randomizer';
import { SHOP_MINUTES, TIERS, naira } from './economy';
import { brandPower, getBrandMetrics } from './business';
import * as E from './engine';
import { lookCost, buildLook } from './scoring';
import { Customer, GameState, Rival, ScoreBreakdown, Settlement, Shout, StyleChoice, Visitor } from './types';
import { Bar, Btn, Card, Chip, Modal, Pill } from './ui/kit';
import { Styling } from './ui/Styling';
import { PriceModal, Reveal } from './ui/Checkout';
import { FurniturePanel, RailPanel, Stars, StaffActions } from './ui/Panels';
import { AppId, Phone } from './ui/Phone';
import { furnitureById, turn, Rot } from './shop';
import type { CloudSession } from '../cloud/AuthGate';
import { AdminPanel } from '../cloud/AdminPanel';
import { armSound, playNepaReturn, pop, setGenSound, useSound } from './sound';
import { ActionMenu, Catalogue, EnergyBar, SoundSettings, ViewPicker } from './ui/Build';
import type { View } from './scene/ShopScene';
import type { Pose } from './types';

const ShopScene = lazy(() => import('./scene/ShopScene'));
const ThumbStudio = lazy(() => import('./scene/Thumbs').then((m) => ({ default: m.ThumbStudio })));

type Step =
  | { kind: 'style' }
  | { kind: 'price'; c: Customer; choice: StyleChoice }
  | { kind: 'reveal'; c: Customer; choice: StyleChoice; stockBefore: GameState['stock']; score: ScoreBreakdown; st: Settlement; posted?: boolean };
type Panel = null | 'rail' | 'furniture';

const CLS_DOT = { poor: 'bg-slate-400', middle: 'bg-sky-400', rich: 'bg-amber-400' } as const;

const CELEBRITY_NAMEPLATES = [
  { label: 'B', containerClass: 'border-teal-400/70 bg-teal-950/55 shadow-[0_0_12px_rgba(45,212,191,0.20)]', nameClass: 'text-teal-100', badgeClass: 'border-teal-300/60 bg-teal-400/20 text-teal-100', dotClass: 'bg-teal-300' },
  { label: 'A', containerClass: 'border-sky-400/70 bg-sky-950/55 shadow-[0_0_12px_rgba(56,189,248,0.22)]', nameClass: 'text-sky-100', badgeClass: 'border-sky-300/60 bg-sky-400/20 text-sky-100', dotClass: 'bg-sky-300' },
  { label: 'S', containerClass: 'border-rose-400/70 bg-rose-950/55 shadow-[0_0_13px_rgba(251,113,133,0.22)]', nameClass: 'text-rose-100', badgeClass: 'border-rose-300/60 bg-rose-400/20 text-rose-100', dotClass: 'bg-rose-300' },
  { label: 'SS', containerClass: 'border-violet-400/70 bg-violet-950/55 shadow-[0_0_14px_rgba(167,139,250,0.25)]', nameClass: 'text-violet-100', badgeClass: 'border-violet-300/60 bg-violet-400/20 text-violet-100', dotClass: 'bg-violet-300' },
  { label: 'SSS', containerClass: 'border-amber-300 bg-amber-950/65 ring-1 ring-amber-200/30 shadow-[0_0_18px_rgba(250,204,21,0.36)]', nameClass: 'text-amber-100', badgeClass: 'border-amber-200 bg-amber-300 text-amber-950', dotClass: 'bg-amber-200' },
] as const;

function celebrityNameplate(customer?: Customer) {
  if (!customer?.celebrity) return null;
  const tier = Math.max(0, Math.min(4, Math.floor(customer.celebrity.tier)));
  return CELEBRITY_NAMEPLATES[tier];
}

/** A lightweight animated shop-floor layer makes a rival visit feel occupied while the existing 3D shop scene remains interactive-looking beneath it. */
const RivalShopActivity: React.FC<{ r: Rival }> = ({ r }) => {
  const [actors] = useState(() => {
    const count = Math.max(3, Math.min(7, 2 + r.tier + Math.floor((r.followers || 0) / 15000)));
    return Array.from({ length: count }, (_, i) => ({
      id: r.id + '-actor-' + i,
      role: i === 0 ? 'Owner' : i <= Math.max(1, Math.floor((r.tier + 1) / 2)) ? 'Staff' : 'Customer',
      activity: i === 0 ? 'Greeting a client' : i <= Math.max(1, Math.floor((r.tier + 1) / 2)) ? (i % 2 ? 'Arranging stock' : 'Assisting a shopper') : (i % 2 ? 'Browsing the rails' : 'Checking a look'),
      look: i === 0 ? r.look : generateRandomCustomer('styled'),
      delay: (i % 5) * -1.25,
      duration: 4.5 + (i % 4) * 1.2,
    }));
  });
  return (
    <>
      <style>{`
        @keyframes rival-shop-walk { 0%,100% { transform: translateX(-5px) translateY(0); } 25% { transform: translateX(10px) translateY(-3px); } 55% { transform: translateX(25px) translateY(0); } 78% { transform: translateX(4px) translateY(-2px); } }
        @keyframes rival-shop-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .rival-shop-actor { animation-name: rival-shop-walk; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        .rival-shop-portrait { animation: rival-shop-bob 1.7s ease-in-out infinite; }
      `}</style>
      <div className="absolute bottom-3 left-3 right-3 z-10 pointer-events-none">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/15 bg-[#11131c]/90 backdrop-blur-md p-2 sm:p-3 shadow-2xl">
          <div className="flex items-center justify-between gap-2 mb-2 px-1">
            <div className="text-xs font-semibold text-white">Shop floor · live activity</div>
            <div className="text-[10px] text-slate-400">{Math.max(1, Math.floor((r.tier + 1) / 2))} staff · customer flow {r.followers > 25000 ? 'busy' : r.followers > 5000 ? 'steady' : 'building'}</div>
          </div>
          <div className="flex items-end justify-around gap-1 sm:gap-4 min-h-[116px] overflow-hidden">
            {actors.map((actor, i) => (
              <div key={actor.id} className="relative flex flex-col items-center w-[18%] min-w-0">
                <div className="rival-shop-actor w-full flex justify-center" style={{ animationDuration: actor.duration + 's', animationDelay: actor.delay + 's' }}>
                  <div className="rival-shop-portrait h-[82px] w-[62px] sm:h-[96px] sm:w-[74px] overflow-hidden rounded-t-xl bg-gradient-to-b from-[#31283e] to-[#14131b] border border-white/10">
                    <CharacterSvg config={actor.look} idPrefix={'rival-floor-' + actor.id} camera="full" className="h-full w-full" />
                  </div>
                </div>
                <div className="text-[9px] sm:text-[10px] text-pink-200 font-semibold mt-1 truncate max-w-full">{actor.role}</div>
                <div className="text-[8px] sm:text-[9px] text-slate-400 truncate max-w-full">{actor.activity}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};



export default function GameApp({ onLab, initial, storageKey, cloud, notice }: { onLab: () => void; initial?: GameState | null; storageKey?: string; cloud?: CloudSession; notice?: string }) {
  const [s, setS] = useState<GameState | null>(() => initial !== undefined ? initial : E.load(storageKey));
  const [syncState, setSyncState] = useState<'saved' | 'saving' | 'offline'>('saved');
  const [admin, setAdmin] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [styling, setStyling] = useState(false);
  const [step, setStep] = useState<Step>({ kind: 'style' });
  const [drafts, setDrafts] = useState<Record<string, StyleChoice>>({});
  const [menu, setMenu] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  /** A floor piece in Divine's hands (build mode); `fresh` when just bought or taken out of storage. */
  const [placing, setPlacing] = useState<{ uid: string; rot: Rot; x: number; z: number; fresh?: boolean } | null>(null);
  const [build, setBuild] = useState(false);
  /** A catalogue piece you're trying before you buy it. */
  const [trying, setTrying] = useState<{ id: string; x: number; z: number; rot: Rot; yardSide?: 'left' | 'right' } | null>(null);
  const [view, setView] = useState<View>('angle');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  /** Last floor tile chosen by the player; the scene keeps Divine there until another destination is chosen. */
  const [manualTarget, setManualTarget] = useState<[number, number] | null>(null);
  const [localAct, setLocalAct] = useState<{ uid: string; pose: Pose } | null>(null);
  /** Persistent player-controlled seat; unlike short actions, this remains until Divine is sent elsewhere. */
  const [sitting, setSitting] = useState<{ uid: string; pose: Pose } | null>(null);
  const [phone, setPhone] = useState(false);
  const [phoneApp, setPhoneApp] = useState<AppId>('home');
  const [chat, setChat] = useState<string | null>(null);
  const [profile, setProfile] = useState<string | null>(null);
  const [touring, setTouring] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [timeSpeed, setTimeSpeed] = useState<2 | 5 | 10>(2);
  const [hidden, setHidden] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [lookEdit, setLookEdit] = useState<CharacterConfig | null>(null);
  const [bubbles, setBubbles] = useState<Shout[]>([]);
  const seenShout = useRef<number>(s?.shoutSeq || 0);
  const [toast, setToast] = useState<{ from: string; text: string } | null>(null);
  const seenMsg = useRef<number>(s?.msgSeq || 0);
  const sound = useSound();
  useEffect(() => armSound(), []);
  // R turns the piece you're holding (or the one you tapped)
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key !== 'r' && e.key !== 'R') return;
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (trying) setTrying((x) => (x ? { ...x, rot: turn(x.rot) } : x));
      else if (placing) setPlacing({ ...placing, rot: turn(placing.rot) });
      else if (selected && build) setS((g) => (g && g.phase !== 'shop' ? E.rotateFurniture(g, selected) : g));
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [placing, selected, build, trying]);
  const fileRef = useRef<HTMLInputElement>(null);

  // every change is saved on this device; signed-in players are also saved to their account
  useEffect(() => {
    if (!s) return;
    const stamped = E.save(s, storageKey);
    cloud?.sync.push(stamped);
  }, [s]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!cloud) return;
    cloud.sync.onStatus = setSyncState;
    return () => {
      cloud.sync.onStatus = undefined;
    };
  }, [cloud]);
  // money sent by an admin: applied once, then marked as done on the server
  const grantQueue = useRef<{ id: string; kind: 'add' | 'set'; amount: number; reason: string }[]>([]);
  useEffect(() => {
    if (!cloud) return;
    return cloud.store.onGrants(cloud.user.uid, (list) => {
      grantQueue.current = list;
      setS((g) => {
        if (!g) return g;
        let next = g;
        for (const x of list) next = E.adminGrant(next, x);
        return next;
      });
    });
  }, [cloud]);
  useEffect(() => {
    if (!cloud || !s) return;
    for (const x of grantQueue.current) if ((s.appliedGrants || []).includes(x.id)) cloud.store.markApplied(cloud.user.uid, x.id).catch(() => undefined);
    grantQueue.current = grantQueue.current.filter((x) => !(s.appliedGrants || []).includes(x.id));
  }, [s?.appliedGrants?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // the clock only runs while the tab is visible
  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  const running = !!s && s.phase === 'shop' && !paused && !menu && !hidden && !confirmClose && !lookEdit;
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.max(0, Math.min(2, (now - last) / 1000));
      last = now;
      // The multiplier advances walk-ins, patience, staff work, errands and the shop clock together.
      // Tick more frequently at higher speeds so customer/business simulation updates smoothly instead of jumping.
      setS((g) => (g ? E.tick(g, dt * timeSpeed) : g));
    }, Math.max(50, 500 / timeSpeed));
    return () => window.clearInterval(id);
  }, [running, timeSpeed]);

  // a new WhatsApp message pops up like a notification
  useEffect(() => {
    if (!s) return;
    if (s.msgSeq > seenMsg.current) {
      const m = s.messages.find((x) => x.id === s.msgSeq);
      seenMsg.current = s.msgSeq;
      if (m && !(phone && phoneApp === 'chats' && chat === E.thread(m))) {
        setToast({ from: m.from, text: m.text });
        pop();
        const id = window.setTimeout(() => setToast(null), 4500);
        return () => window.clearTimeout(id);
      }
    }
  }, [s?.msgSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  // NEPA news and customer complaints pop up for a few seconds
  useEffect(() => {
    if (!s) return;
    const fresh = (s.shouts || []).filter((x) => x.id > seenShout.current);
    if (!fresh.length) return;
    seenShout.current = s.shoutSeq;
    if (fresh.some((x) => x.who === 'NEPA' && x.text.includes('Light is back'))) playNepaReturn();
    if (fresh.some((x) => x.tone !== 'good')) pop();
    setBubbles((b) => [...b, ...fresh].slice(-4));
    fresh.forEach((x) => window.setTimeout(() => setBubbles((b) => b.filter((y) => y.id !== x.id)), x.tone === 'nepa' ? 6000 : 4500));
  }, [s?.shoutSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  // the generator hums while it runs
  const genKind = s && s.phase === 'shop' && s.power?.gen && E.source(s) === 'gen' ? E.stats(s).gen : null;
  useEffect(() => setGenSound(touring ? null : genKind), [genKind, touring]);
  useEffect(() => () => setGenSound(null), []);
  // a quick job outside opening hours: Divine walks over and does it for a few seconds
  useEffect(() => {
    if (!localAct) return;
    const id = window.setTimeout(() => setLocalAct(null), 4500);
    return () => window.clearTimeout(id);
  }, [localAct]);
  // build mode only before opening or after closing
  useEffect(() => {
    if (s?.phase === 'shop' && build) {
      setBuild(false);
      setPlacing(null);
      setSelected(null);
    }
  }, [s?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) return <NewGame onStart={(cfg) => { const g = E.newGame(cfg); seenMsg.current = g.msgSeq; setManualTarget(null); setSitting(null); setLocalAct(null); setS(g); }} onLab={onLab} />;

  const up = (f: (g: GameState) => GameState) => setS((g) => (g ? f(g) : g));
  // Yaba Mart cart lives in GameState so it is saved locally and synchronised with the account.
  const cart: E.CartLine[] = s.marketCart || [];
  const setCart = (f: (c: E.CartLine[]) => E.CartLine[]) => setS((g) => {
    if (!g) return g;
    return { ...g, marketCart: f(g.marketCart || []) };
  });
  const t = TIERS[s.tier];
  const st = E.stats(s);
  const current = E.visitor(s, s.serving)?.c;
  const queue = E.waiting(s).sort((a, b) => a.arrived - b.arrived);
  const unread = E.unreadCount(s);
  const closing = E.shopClosing(s);
  const src = s.phase === 'shop' ? E.source(s) : 'grid';
  const dark = src === 'none';
  const nepaOff = s.phase === 'shop' && E.inBlackout(s);
  const selectedPiece = selected ? (() => { const p = s.furniture.find((x) => x.uid === selected && x.placed); return p ? furnitureById(p.id) : null; })() : null;
  const busy = E.busyNow(s);
  const act = busy ? { uid: busy.uid, pose: busy.pose } : localAct || sitting;
  const securityPostForMenu = menuFor ? s.furniture.find((p) => p.uid === menuFor && p.id === 'securityPost') : undefined;
  const fuelGallonForMenu = menuFor?.startsWith('fuel-gallon:') ? menuFor.slice('fuel-gallon:'.length) : undefined;
  const securityMenuOpen = menuFor === '__security__' || !!securityPostForMenu;
  const say = (who: string, text: string) => {
    const b: Shout = { id: -Date.now(), who, text, tone: 'warn' };
    setBubbles((x) => [...x, b].slice(-4));
    window.setTimeout(() => setBubbles((x) => x.filter((y) => y.id !== b.id)), 4000);
  };
  const ghostOk = (() => {
    if (!placing) return false;
    const p = s.furniture.find((x) => x.uid === placing.uid);
    return !!p && E.canPlaceAt(s, { ...p, x: placing.x, z: placing.z, rot: placing.rot, placed: true });
  })();
  const enterBuild = () => {
    setPanel(null);
    setMenuFor(null);
    setSelected(null);
    setBuild(true);
  };
  const exitBuild = () => {
    setTrying(null);
    setBuild(false);
    setPlacing(null);
    setSelected(null);
    setView('angle');
  };
  /** Hold a floor piece: starts where it stands (or the first free spot). */
  const pickUp = (g: GameState, uid: string, fresh: boolean) => {
    const p = g.furniture.find((x) => x.uid === uid);
    if (!p || furnitureById(p.id).mount !== 'floor') return;
    const spot = p.placed ? p : E.spotFor(g, uid) || p;
    setSelected(uid);
    setPlacing({ uid, rot: spot.rot || 0, x: spot.x, z: spot.z, fresh });
  };
  /** Tap in the catalogue: try it in the shop first; Buy or Cancel. */
  const buy = (id: string, yardSide: 'left' | 'right' = 'right') => {
    setPlacing(null);
    setSelected(null);
    const pv = E.withPreview(s, id);
    setTrying({ id, x: pv.x, z: pv.z, rot: pv.rot, yardSide });
  };
  const tryView = trying ? E.withPreview(s, trying.id, trying) : null;
  const confirmBuy = () => {
    if (!trying || !tryView?.ok) return;
    const floor = furnitureById(trying.id).mount === 'floor';
    up((g) => E.buyPreviewed(g, trying.id, floor ? trying : furnitureById(trying.id).mount === 'yard' ? { x: trying.yardSide === 'left' ? -1 : 1, z: trying.z, rot: trying.rot, yardSide: trying.yardSide } : undefined));
    setTrying(null);
  };
  const install = (uid: string) => {
    const p = s.furniture.find((x) => x.uid === uid);
    if (!p) return;
    if (furnitureById(p.id).mount === 'floor') return pickUp(s, uid, true);
    up((g) => E.installFurniture(g, uid));
  };
  const doAction = (uid: string, id: E.ActionId) => {
    const res = E.interact(s, uid, id);
    if (res.s === s && !res.ui) return;
    setS(res.s);
    setMenuFor(null);
    const a = E.actionsFor(s, uid).find((x) => x.id === id);
    if (id === 'sit') {
      setSitting({ uid, pose: 'sit' });
      setLocalAct(null);
    } else {
      setSitting(null);
      if (a && !(s.phase === 'shop' && a.minutes > 0)) setLocalAct({ uid, pose: a.pose });
    }
    if (res.ui === 'fixLook') setLookEdit(s.divine);
    if (res.ui === 'checkStock' || res.ui === 'restock') setPanel('rail');
  };

  const restore = async (f: File) => {
    const parsed = E.parseSave(await f.text());
    if (parsed) {
      seenMsg.current = parsed.msgSeq;
      setS(parsed);
      setMenu(false);
    } else alert('That file is not an Asanwa Boutique save.');
  };
  const openPhone = (app: AppId = 'home', who: string | null = null) => {
    setPhoneApp(app);
    setChat(who);
    setPhone(true);
  };
  const styleCustomer = (id: string) => {
    if (s.phase !== 'shop') return;
    setSitting(null);
    if (!s.serving && E.exhausted(s)) return say('Deborah', "Divine has no energy left. Sit down or drink water first.");
    if (!s.serving && busy) return say('Divine', `Give me small time, I'm busy till ${E.clockText(busy.until)}.`);
    if (s.serving && s.serving !== id) {
      setStyling(true);
      return;
    }
    setSitting(null);
    up((g) => E.startStyling(g, id));
    setStep({ kind: 'style' });
    setStyling(true);
  };
  const done = (id: string) => setDrafts((d) => { const n = { ...d }; delete n[id]; return n; });
  const staffActions: StaffActions = {
    hire: (c) => up((g) => E.hire(g, c)),
    train: (id) => up((g) => E.train(g, id)),
    fire: (id) => up((g) => E.fire(g, id)),
    raise: (id, a) => up((g) => E.answerRaise(g, id, a)),
  };

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      {/* HUD */}
      <header className="z-30 flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 border-b border-white/10 bg-[#101219]/95 backdrop-blur shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-300 flex items-center justify-center font-serif font-bold text-black">A</div>
          <div className="leading-tight">
            <div className="font-serif font-bold text-white">Asanwa Boutique</div>
            <div className="text-[10px] text-slate-400">
              Day {s.day} · {t.name} · {s.phase === 'morning' ? 'Morning' : s.phase === 'shop' ? 'Shop open' : 'Evening'}
            </div>
          </div>
        </div>
        {s.weather && <div className="text-xs text-sky-200" title="Lagos weather affects walk-ins, comfort and energy">
          {s.weather === 'sunny' ? '☀️ Sunny · hot' : s.weather === 'rainy' ? '🌧️ Rainy · fewer walk-ins' : s.weather === 'harmattan' ? '🌫️ Harmattan · dusty' : '☁️ Cloudy · mild'}
        </div>}
        <div className={`text-lg font-bold ${s.cash < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{naira(s.cash)}</div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs"><div className="text-[10px] text-slate-400">Brand Power</div><div className="font-bold text-fuchsia-200">{brandPower(getBrandMetrics(s), s.followers || 0, s.tier)?.toLocaleString("en-NG")}</div></div>
        <EnergyBar s={s} />
        <div className="text-xs text-slate-300 max-sm:hidden">
          Prestige <b className="text-amber-300">{st.prestige}</b> · Followers <b className="text-pink-300">{(s.followers || 0)?.toLocaleString('en-NG')}</b>
        </div>
        <div className={`text-xs ${s.lateRent ? 'text-rose-300 font-bold' : E.daysToRent(s.day) <= 2 ? 'text-amber-300' : 'text-slate-400'}`}>
          {s.lateRent ? `RENT LATE · clear by day ${s.lateRent.due}` : `Rent ${naira(s.listing.rent)} ${E.daysToRent(s.day) === 0 ? 'tonight' : `in ${E.daysToRent(s.day)}d`}`}
        </div>
        <div className="ml-auto flex gap-2">
          <Btn size="sm" onClick={sound.toggleMusic} title={sound.music ? 'Music on' : 'Music off'}>{sound.music ? '♫ On' : '♫ Off'}</Btn>
          {genKind && <Btn size="sm" onClick={() => sound.set({ gen: !sound.gen })} title="Generator sound">{sound.gen ? '⛽🔊' : '⛽🔇'}</Btn>}
          <Btn size="sm" onClick={() => setMenuFor('__security__')} title="Fuel trips and security">🛡 Security</Btn>
          <Btn size="sm" onClick={() => E.exportSave(s)}>Backup</Btn>
          <Btn size="sm" onClick={() => setMenu(true)}>Menu</Btn>
        </div>
      </header>
      {s.lateRent && s.phase === 'morning' && (
        <div className="bg-rose-700/90 text-white text-sm px-4 py-2 text-center font-semibold shrink-0">
          The landlord is waiting. You owe {naira(Math.max(0, -s.cash))}. Clear it by the end of day {s.lateRent.due} or you move down to a {TIERS[Math.max(0, s.tier - 1)].name}.
        </div>
      )}

      {/* the shop floor */}
      <div className="relative flex-1 min-h-0">
        <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">Opening the shop…</div>}>
          <ShopScene
            s={tryView ? tryView.view : s}
            placing={trying && furnitureById(trying.id).mount === 'floor' ? { uid: E.PREVIEW_UID, rot: trying.rot, x: trying.x, z: trying.z } : placing}
            selected={trying ? E.PREVIEW_UID : build ? selected : menuFor}
            night={s.phase === 'evening' && !build}
            dark={dark}
            build={build}
            view={view}
            act={build ? null : act}
            manualTarget={manualTarget}
            onMoveTo={(x, z) => { setManualTarget([x, z]); setSitting(null); setLocalAct(null); setMenuFor(null); }}
            reflections={sound.reflections}
            onHover={(x, z) => (trying ? setTrying({ ...trying, x, z }) : placing && setPlacing({ ...placing, x, z }))}
            onSelect={(uid) => { if (!placing && !trying) setSelected(uid); }}
            onItem={(uid) => { if (!styling) { setSitting(null); setLocalAct(null); setMenuFor(uid); } }}
            onCustomer={styleCustomer}
          />
        </Suspense>

        {/* top-left: where we are */}
        <div className={`absolute top-3 left-3 w-48 sm:w-60 space-y-2 pointer-events-none ${s.phase === 'shop' ? 'max-sm:hidden' : ''} ${build ? 'hidden' : ''}`}>
          <div className="rounded-xl border border-white/15 bg-[#12141c]/85 backdrop-blur p-2 sm:p-3 pointer-events-auto">
            <div className="text-[11px] text-slate-400">{t.name}</div>
            <div className="text-sm font-semibold text-white leading-tight">{s.listing.street}, {s.listing.area}</div>
            <Stars n={s.listing.stars} />
          </div>
        </div>

        {/* the clock */}
        {s.phase === 'shop' && (
          <div className="absolute top-3 right-3 left-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-10 rounded-2xl border border-white/15 bg-[#12141c]/92 backdrop-blur px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:w-max">
            <div className="leading-tight">
              <div className={`text-xl font-bold tabular-nums ${closing ? 'text-rose-300' : 'text-white'}`}>{E.clockText(s.clock)}</div>
              <div className="w-24 h-1 rounded-full bg-white/10 mt-1 overflow-hidden"><div className="h-full bg-amber-400" style={{ width: `${(s.clock / SHOP_MINUTES) * 100}%` }} /></div>
            </div>
            <PowerChip s={s} up={up} />
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/25 p-1" aria-label="Game speed">
              {([2, 5, 10] as const).map((speed) => <button key={speed} type="button" aria-pressed={timeSpeed === speed} onClick={() => setTimeSpeed(speed)} className={`min-h-9 min-w-10 rounded-lg px-2 text-xs font-bold transition-colors ${timeSpeed === speed ? 'bg-amber-400 text-slate-950' : 'text-slate-200 hover:bg-white/10'}`}>{speed}×</button>)}
            </div>
            <Btn size="sm" onClick={() => setPaused((p) => !p)}>{paused ? '▶ Play' : '❚❚ Pause'}</Btn>
            {!s.inShop.length && !s.serving && !closing && s.arrivals.length > 0 && <Btn size="sm" tone="ghost" onClick={() => up(E.skipAhead)}>Skip ⏩</Btn>}
          </div>
        )}
        {paused && s.phase === 'shop' && !styling && (
          <button onClick={() => setPaused(false)} className="absolute inset-0 z-[5] bg-black/40 flex items-center justify-center">
            <span className="rounded-2xl bg-[#12141c]/95 border border-white/15 px-6 py-4 text-white font-semibold">Paused · tap to carry on</span>
          </button>
        )}

        {/* build mode */}
        {build && (
          <>
            <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
              <div className="pointer-events-auto"><ViewPicker view={view} setView={setView} /></div>
              <div className="flex gap-1.5 pointer-events-auto">
                <Btn size="sm" onClick={() => setPanel(panel === 'furniture' ? null : 'furniture')}>Shop stats</Btn>
                <Btn size="sm" tone="gold" onClick={exitBuild}>Done</Btn>
              </div>
            </div>
            {trying && tryView && (() => {
              const f = furnitureById(trying.id);
              const floor = f.mount === 'floor';
              return (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 rounded-xl border border-amber-500/50 bg-[#12141c]/95 p-2 flex flex-wrap items-center justify-center gap-2 text-sm max-w-[94vw]">
                  <span className="px-1 leading-tight">
                    <span className="block text-white font-semibold text-xs">{f.name} · {naira(f.price)}</span>
                    <span className={`block text-[11px] ${tryView.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{tryView.ok ? (floor ? 'Fits here · tap the floor to move it' : f.mount === 'finish' ? 'This is how it will look' : f.mount === 'yard' ? `Outdoor placement · ${trying.yardSide === 'left' ? 'left side' : 'right side'}` : 'This is where it will go') : tryView.why}</span>
                  </span>
                  {floor && <Btn size="sm" onClick={() => setTrying({ ...trying, rot: turn(trying.rot) })}>↻ Rotate</Btn>}
                  {f.mount === 'yard' && <><Btn size="sm" tone={trying.yardSide === 'left' ? 'gold' : 'ghost'} onClick={() => setTrying({ ...trying, yardSide: 'left' })}>← Left side</Btn><Btn size="sm" tone={trying.yardSide !== 'left' ? 'gold' : 'ghost'} onClick={() => setTrying({ ...trying, yardSide: 'right' })}>Right side →</Btn></>}
                  <Btn size="sm" tone="green" disabled={!tryView.ok} onClick={confirmBuy}>Buy</Btn>
                  <Btn size="sm" onClick={() => setTrying(null)}>Cancel</Btn>
                </div>
              );
            })()}
            {placing && !trying && (() => {
              const f = furnitureById(s.furniture.find((x) => x.uid === placing.uid)?.id || '');
              return (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 rounded-xl border border-amber-500/50 bg-[#12141c]/95 p-2 flex flex-wrap items-center justify-center gap-2 text-sm max-w-[94vw]">
                  <span className={`px-1 text-xs font-semibold ${ghostOk ? 'text-emerald-300' : 'text-rose-300'}`}>{f?.name}: {ghostOk ? 'fits here' : "can't go here"} · tap the floor to move it</span>
                  <Btn size="sm" onClick={() => setPlacing({ ...placing, rot: turn(placing.rot) })}>↻ Rotate</Btn>
                  <Btn size="sm" tone="green" disabled={!ghostOk} onClick={() => { up((g) => E.placeFurniture(g, placing.uid, placing.x, placing.z, placing.rot)); setPlacing(null); setSelected(null); }}>Place</Btn>
                  {placing.fresh ? (
                    <Btn size="sm" onClick={() => { up((g) => E.storeFurniture(g, placing.uid)); setPlacing(null); setSelected(null); }}>Put in storage</Btn>
                  ) : (
                    <Btn size="sm" onClick={() => { setPlacing(null); setSelected(null); }}>Cancel</Btn>
                  )}
                </div>
              );
            })()}
            {selectedPiece && !placing && !trying && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 rounded-xl border border-amber-500/50 bg-[#12141c]/95 p-2 flex flex-wrap items-center justify-center gap-2 text-sm max-w-[94vw]">
                <span className="text-white font-semibold px-1">{selectedPiece.name}</span>
                {selectedPiece.mount === 'floor' && <Btn size="sm" onClick={() => pickUp(s, selected!, false)}>Move</Btn>}
                {selectedPiece.mount === 'floor' && <Btn size="sm" onClick={() => up((g) => E.rotateFurniture(g, selected!))}>↻ Rotate</Btn>}
                {selectedPiece.mount === 'yard' && <><Btn size="sm" tone={s.furniture.find((p) => p.uid === selected)?.yardSide === 'left' ? 'gold' : 'ghost'} onClick={() => up((g) => ({ ...g, furniture: g.furniture.map((p) => p.uid === selected ? { ...p, yardSide: 'left' } : p) }))}>← Left side</Btn><Btn size="sm" tone={s.furniture.find((p) => p.uid === selected)?.yardSide !== 'left' ? 'gold' : 'ghost'} onClick={() => up((g) => ({ ...g, furniture: g.furniture.map((p) => p.uid === selected ? { ...p, yardSide: 'right' } : p) }))}>Right side →</Btn></>}
                <Btn size="sm" onClick={() => { up((g) => E.storeFurniture(g, selected!)); setSelected(null); }}>Store</Btn>
                <Btn size="sm" onClick={() => { up((g) => E.sellFurniture(g, selected!)); setSelected(null); }}>Sell · {naira(selectedPiece.price * 0.4)}</Btn>
                <Btn size="sm" tone="gold" onClick={() => setSelected(null)}>OK</Btn>
              </div>
            )}
            <div className={`absolute bottom-3 left-3 right-3 z-20 ${panel ? 'sm:right-[472px]' : ''}`}>
              <Catalogue s={s} onBuy={buy} onInstall={install} />
            </div>
            <Suspense fallback={null}><ThumbStudio /></Suspense>
          </>
        )}

        {/* what Divine can do with the piece you tapped */}
        {securityMenuOpen && !build && !styling && <SecurityMenu s={s} onClose={() => setMenuFor(null)} onHire={() => up(E.hireSecurityGuard)} onBuy={(litres, generatorUid) => up((g) => E.startFuelTrip(g, litres, generatorUid))} />}
        {fuelGallonForMenu && !build && !styling && <SecurityMenu s={s} gallonId={fuelGallonForMenu} onClose={() => setMenuFor(null)} onHire={() => up(E.hireSecurityGuard)} onBuy={(litres, generatorUid) => up((g) => E.startFuelTrip(g, litres, generatorUid))} onPour={(gallonId, generatorUid) => up((g) => E.pourSecurityGallon(g, gallonId, generatorUid))} />}
        {menuFor && menuFor !== '__security__' && !securityPostForMenu && !fuelGallonForMenu && !build && !styling && <ActionMenu s={s} uid={menuFor} onPick={(id) => doAction(menuFor, id)} onClose={() => setMenuFor(null)} />}
        {busy && !styling && (
          <div className="absolute z-10 left-1/2 -translate-x-1/2 bottom-32 sm:bottom-36 rounded-full bg-[#12141c]/92 border border-white/15 px-3 py-1 text-xs text-amber-200 pointer-events-none">
            Divine is busy · {E.actionLabel(s, busy)} · till {E.clockText(busy.until)}
          </div>
        )}

        {/* morning controls */}
        {s.phase === 'morning' && !build && (
          <div className={`absolute bottom-3 left-0 right-0 flex flex-wrap items-end justify-center gap-2 px-3 pointer-events-none ${panel ? 'max-sm:hidden sm:right-[460px]' : ''}`}>
            <div className="flex flex-wrap gap-1 rounded-2xl border border-white/15 bg-[#12141c]/90 backdrop-blur p-1.5 pointer-events-auto">
              <Btn size="sm" tone={panel === 'rail' ? 'gold' : 'ghost'} onClick={() => setPanel(panel === 'rail' ? null : 'rail')}>Rail</Btn>
              <Btn size="sm" onClick={enterBuild}>🔨 Build</Btn>
              <PhoneButton unread={unread} onClick={() => openPhone()} />
            </div>
            <Btn
              tone="gold"
              size="lg"
              className="pointer-events-auto shadow-xl"
              onClick={() => {
                setPanel(null);
                setSelected(null);
                setStep({ kind: 'style' });
                setPaused(false);
                up(E.openShop);
              }}
            >
              Open the shop →
            </Btn>
          </div>
        )}

        {/* shop controls: who's waiting */}
        {s.phase === 'shop' && !styling && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center px-3 pointer-events-none">
            <div className="rounded-2xl border border-white/15 bg-[#12141c]/92 backdrop-blur p-2.5 w-full max-w-3xl pointer-events-auto">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-sm text-white font-semibold flex-1 min-w-0 truncate">
                  {current ? `${current.name} is with you at the mirror` : queue.length ? `${queue.length} waiting · tap one to style` : closing ? 'Closing time' : s.arrivals.length ? 'Nobody waiting. Customers will come.' : 'No more customers today.'}
                </div>
                <PhoneButton unread={unread} onClick={() => openPhone()} />
                <Btn size="sm" tone="ghost" onClick={() => setPanel(panel === 'rail' ? null : 'rail')}>Rail</Btn>
                <Btn size="sm" tone={closing || (!s.arrivals.length && !s.inShop.length) ? 'gold' : 'ghost'} onClick={() => (s.inShop.length || (s.arrivals.length && !closing) ? setConfirmClose(true) : up(E.closeShop))}>Close shop</Btn>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {current && (() => {
                  const nameplate = celebrityNameplate(current);
                  return (
                    <button onClick={() => setStyling(true)} className={`shrink-0 rounded-xl border px-3 py-2 text-left ${nameplate ? nameplate.containerClass : 'border-amber-500 bg-amber-500/15'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${nameplate ? nameplate.nameClass : 'text-amber-200'}`}>Continue →</span>
                        {nameplate && <span className={`rounded border px-1 py-0.5 text-[9px] font-black tracking-wide ${nameplate.badgeClass}`}>{nameplate.label}</span>}
                      </div>
                      <div className={`text-sm font-semibold ${nameplate ? nameplate.nameClass : 'text-white'}`}>{current.name}</div>
                    </button>
                  );
                })()}
                {queue.map((v) => {
                  const canSendToStaff = E.canAssignToStaff(s, v.c.id);
                  return <WaitChip key={v.c.id} v={v} clock={s.clock} disabled={!!current} onClick={() => styleCustomer(v.c.id)} onStaff={canSendToStaff && !v.forStaff ? () => up((g) => E.sendToStaff(g, v.c.id)) : undefined} staffHint={!v.forStaff && s.staff.length > 0 && !canSendToStaff ? 'No staff/stock match yet' : undefined} />;
                })}
                {s.inShop.filter((v) => v.by && v.by !== 'divine').map((v) => {
                  const nameplate = celebrityNameplate(v.c);
                  return (
                    <div key={v.c.id} className={`shrink-0 rounded-xl border px-3 py-2 ${nameplate ? nameplate.containerClass : 'border-white/10 bg-white/5 opacity-70'}`}>
                      <div className={`text-[10px] ${nameplate ? nameplate.nameClass : 'text-slate-400'}`}>With {s.staff.find((m) => m.id === v.by)?.name}</div>
                      <div className="flex items-center gap-2">
                        <div className={`text-sm font-semibold ${nameplate ? nameplate.nameClass : 'text-white'}`}>{v.c.name}</div>
                        {nameplate && <span className={`rounded border px-1 py-0.5 text-[9px] font-black tracking-wide ${nameplate.badgeClass}`}>{nameplate.label}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* a rival is standing in the shop */}
        {s.visit && s.phase === 'shop' && <VisitCard s={s} up={up} />}

        {/* what people are saying in the shop */}
        {bubbles.length > 0 && (
          <div className="fixed z-[58] left-3 bottom-36 sm:bottom-40 flex flex-col gap-1.5 w-[min(80vw,340px)] pointer-events-none">
            {bubbles.map((b) => (
              <div key={b.id} className={`rounded-2xl px-3 py-2 text-sm shadow-xl border ${b.tone === 'nepa' ? 'bg-slate-900/95 border-amber-400/60 text-amber-200 font-semibold' : b.tone === 'complain' ? 'bg-rose-950/95 border-rose-500/50 text-rose-100' : b.tone === 'warn' ? 'bg-amber-950/95 border-amber-500/50 text-amber-100' : 'bg-emerald-950/95 border-emerald-500/40 text-emerald-100'}`}>
                <span className="block text-[10px] uppercase tracking-wider opacity-70">{b.who}</span>
                {b.text}
              </div>
            ))}
          </div>
        )}

        {/* toast */}
        {toast && (
          <button onClick={() => { setToast(null); setStyling(false); openPhone('chats', toast.from); }} className="fixed z-[60] top-3 left-1/2 -translate-x-1/2 w-[min(92vw,380px)] rounded-2xl bg-[#1f2c33]/97 border border-white/10 shadow-2xl p-3 text-left flex gap-3 animate-[fadeIn_.2s_ease-out]">
            <span className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center text-white text-lg shrink-0">✆</span>
            <span className="min-w-0">
              <span className="block text-[11px] text-slate-400">WhatsApp · {toast.from}</span>
              <span className="block text-sm text-white line-clamp-2">{toast.text}</span>
            </span>
          </button>
        )}

        {/* side panel */}
        {panel && (s.phase === 'morning' || (s.phase === 'evening' && build) || (s.phase === 'shop' && panel === 'rail' && !styling)) && (
          <aside className="absolute z-20 right-0 top-0 bottom-0 w-full sm:w-[460px] bg-[#12141c]/97 border-l border-white/10 backdrop-blur flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="font-serif text-lg font-bold text-white">{{ rail: 'Your rail', furniture: 'Your shop' }[panel]}</h3>
              <Btn size="sm" onClick={() => setPanel(null)}>Close</Btn>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {panel === 'rail' && (
                <>
                  <RailPanel s={s} display={(uid, on) => up((g) => E.setDisplayed(g, uid, on))} restock={(uid, n) => up((g) => E.restock(g, uid, n))} restockAll={() => up((g) => E.restockAll(g))} clear={(uid) => up((g) => E.clearDesign(g, uid))} />
                  <Btn className="w-full mt-3" tone="gold" onClick={() => { setPanel(null); openPhone('market'); }}>Buy new stock on Yaba Mart</Btn>
                </>
              )}
              {panel === 'furniture' && (
                <FurniturePanel
                  s={s}
                  selected={selected}
                  a={{
                    buy: (id) => { if (!build) setBuild(true); buy(id); setPanel(null); },
                    move: (uid) => {
                      if (!build) setBuild(true);
                      pickUp(s, uid, false);
                      setPanel(null);
                    },
                    store: (uid) => up((g) => E.storeFurniture(g, uid)),
                    sell: (uid) => up((g) => E.sellFurniture(g, uid)),
                    install: (uid) => { if (!build) setBuild(true); install(uid); setPanel(null); },
                  }}
                />
              )}
            </div>
          </aside>
        )}

        {s.phase === 'evening' && !build && !(styling && step.kind === 'reveal') && (
          <div className="absolute inset-0 z-20 overflow-y-auto bg-black/40">
            <Evening s={s} onPhone={() => openPhone()} unread={unread} onSleep={() => up(E.nextMorning)} onBuild={enterBuild} />
          </div>
        )}
      </div>

      {/* styling, full screen over the shop */}
      {styling && (current || step.kind !== 'style') && (
        <div className="fixed inset-0 z-40 bg-[#0d0e12] overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-2 border-b border-white/10 bg-[#101219]/95">
            <span className={`text-sm font-semibold tabular-nums ${closing ? 'text-rose-300' : 'text-white'}`}>
              {s.phase === 'shop' ? E.clockText(s.clock) : 'Closed'} <span className="text-xs text-slate-400 font-normal">· {queue.length} waiting · {naira(s.cash)}</span>
            </span>
            <div className="flex gap-2">
              {s.phase === 'shop' && nepaOff && <PowerChip s={s} up={up} />}
              {s.phase === 'shop' && <Btn size="sm" onClick={() => setPaused((p) => !p)}>{paused ? '▶' : '❚❚'}</Btn>}
              {step.kind === 'style' && <Btn size="sm" onClick={() => setStyling(false)}>Shop floor</Btn>}
            </div>
          </div>
          {paused && <div className="bg-amber-500/15 text-amber-200 text-xs text-center py-1">Paused</div>}
          {current && step.kind === 'style' && (
            <Styling
              key={current.id}
              state={s}
              customer={current}
              canWig={st.wigs}
              initial={drafts[current.id]}
              onChange={(ch) => setDrafts((d) => ({ ...d, [current.id]: ch }))}
              onFinish={(choice) => {
                if (!current.contest) return setStep({ kind: 'price', c: current, choice });
                // a style-off model doesn't pay: the judges score her against the rival's model
                const c = current;
                const score = E.scoreInShop(s, c, choice);
                const cost = lookCost(c, choice, s.stock);
                const won = score.total > (c.contest?.rivalScore ?? 0);
                const result: Settlement = { price: 0, paid: 0, tip: 0, cost: cost.consumables, outcome: 'paid', line: won ? 'The judges loved it! We won!!' : 'It was close… the other model edged it.', reaction: won ? 'scream' : 'frown', repDelta: 0, becameRegular: false };
                setStep({ kind: 'reveal', c, choice, stockBefore: s.stock, score, st: result });
                done(c.id);
                up((g) => E.applyLook(g, c, choice, result, score));
              }}
              onTurnAway={() => {
                done(current.id);
                up((g) => E.turnAway(g, current.id));
                setStyling(false);
              }}
              onSendToStaff={E.canAssignToStaff(s, current.id) ? () => { up((g) => E.sendToStaff(g, current.id)); setStyling(false); } : null}
            />
          )}
          {step.kind === 'price' && (
            <PriceModal
              state={s}
              c={step.c}
              choice={step.choice}
              onBack={() => setStep({ kind: 'style' })}
              onPrice={(price) => {
                const c = step.c;
                const score = E.scoreInShop(s, c, step.choice);
                const cost = lookCost(c, step.choice, s.stock);
                const result = E.settle(c, score, price, cost.consumables, {
                  hasPOS: s.furniture.some((p) => p.placed && p.id === 'posTerminal'),
                  hasAlterations: s.furniture.some((p) => p.placed && p.id === 'alterationsCorner'),
                  fitted: c.wants.some((w) => w.kind === 'fitted') && Object.values(step.choice).some((uid) => typeof uid === 'string' && s.stock.some((d) => d.uid === uid && ['bodyconMini', 'mermaidGown', 'tubeMidi', 'corsetGown', 'offShoulderGown', 'slitGown', 'pencilSkirt', 'skinnyJeans', 'corsetTop', 'tubeTop', 'jumpsuit', 'slipDress', 'laceGown', 'capeGown'].includes(d.itemId))),
                });
                setStep({ kind: 'reveal', c, choice: step.choice, stockBefore: s.stock, score, st: result });
                done(c.id);
                up((g) => E.applyLook(g, c, step.choice, result, score));
              }}
            />
          )}
          {step.kind === 'reveal' && (
            <Reveal
              state={s}
              c={step.c}
              choice={step.choice}
              stockBefore={step.stockBefore}
              score={step.score}
              st={step.st}
              canPost={E.canPost(s, step.score.total)}
              posted={step.posted}
              onPost={() => {
                const look = buildLook(step.c, step.choice, step.stockBefore);
                up((g) => E.postLook(g, step.c, look, step.score.total));
                setStep({ ...step, posted: true });
              }}
              onNext={() => {
                setStep({ kind: 'style' });
                setStyling(false);
              }}
            />
          )}
        </div>
      )}

      {phone && (
        <Phone
          s={s}
          up={up}
          app={phoneApp}
          setApp={setPhoneApp}
          chat={chat}
          setChat={setChat}
          cart={cart}
          setCart={setCart}
          onClose={() => setPhone(false)}
          onMove={(l, plan) => up((g) => E.moveTo(g, l, plan))}
          staff={staffActions}
          profile={profile}
          setProfile={setProfile}
          onVisit={(id) => { setPhone(false); setTouring(id); const r = s.rivals.find((x) => x.id === id); if (r) up((g) => E.noteVisit(g, r)); }}
        />
      )}

      {touring && (() => {
        const r = s.rivals.find((x) => x.id === touring);
        if (!r) return null;
        const fake = E.rivalShop(s, r);
        return (
          <div className="fixed inset-0 z-[45] bg-[#0d0e12] flex flex-col">
            <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-white/10 bg-[#101219]">
              <div className="leading-tight min-w-0 flex-1">
                <div className="text-white font-semibold">{r.shop} <Stars n={r.stars} /></div>
                <div className="text-[11px] text-slate-400">{r.owner} · {TIERS[r.tier].name} in {r.area} · Brand Power {brandPower(r.brand || E.getBrandMetrics(s), r.followers, r.tier)?.toLocaleString('en-NG')} · {Math.max(0, Number(r.followers) || 0)?.toLocaleString('en-NG')} followers</div>
              </div>
              <Btn size="sm" tone="gold" onClick={() => setTouring(null)}>Leave the shop</Btn>
            </div>
            <div className="relative flex-1 min-h-0">
              <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">Walking over…</div>}>
                <ShopScene s={fake} placing={null} selected={null} onSelect={() => undefined} onCustomer={() => undefined} reflections={sound.reflections} />
                <RivalShopActivity key={r.id} r={r} />
              </Suspense>
              <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-96 rounded-xl border border-white/15 bg-[#12141c]/92 p-3 text-sm text-slate-200 space-y-1">
                <div className="font-semibold text-white">What you notice</div>
                <div>• A full look here costs about <b>{naira([15_000, 45_000, 110_000, 220_000, 400_000][r.tier] * (r.speciality === 'cheap' ? 0.6 : r.speciality === 'luxury' || r.speciality === 'bridal' ? 1.4 : 1))}</b>.</div>
                <div>• {brandPower(r.brand || getBrandMetrics(s), r.followers, r.tier) > brandPower(getBrandMetrics(s), s.followers || 0, s.tier) ? 'This brand has stronger market pull than yours. ' : 'Your brand currently has stronger market pull. '}{r.tier > s.tier ? 'The shop is much bigger than yours.' : r.tier < s.tier ? "It's smaller than your shop." : "It's about your size."}</div>
                <div>• {r.owner.split(' ')[0]} is known for <b>{({ bridal: 'bridal looks', genz: 'Gen Z wear', native: 'native and aso-ebi', cheap: 'low prices', wigs: 'wigs and glam', menswear: 'menswear', luxury: 'luxury pieces', thrift: 'thrift finds', everyday: 'everyday wear' } as const)[r.speciality]}</b>.</div>
              </div>
            </div>
          </div>
        );
      })()}

      {lookEdit && (
        <div className="fixed inset-0 z-[65] bg-[#0d0e12]">
          <DivineEditor
            cfg={lookEdit}
            setCfg={setLookEdit}
            header={
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-serif text-2xl font-bold text-white">Divine's look</h2>
                <div className="flex gap-2">
                  <Btn size="sm" onClick={() => setLookEdit(null)}>← Back</Btn>
                  <Btn size="sm" tone="gold" onClick={() => { const c = lookEdit; up((g) => ({ ...g, divine: { ...c, state: 'styled' } })); setLookEdit(null); }}>Save & return</Btn>
                </div>
              </div>
            }
            footer={
              <div className="flex gap-2">
                <Btn tone="gold" onClick={() => { const c = lookEdit; up((g) => ({ ...g, divine: { ...c, state: 'styled' } })); setLookEdit(null); }}>Save & return to the shop</Btn>
                <Btn onClick={() => setLookEdit(null)}>Cancel</Btn>
              </div>
            }
          />
        </div>
      )}

      {confirmClose && (
        <Modal onClose={() => setConfirmClose(false)}>
          <h2 className="font-serif text-xl font-bold text-white mb-2">Close early?</h2>
          <p className="text-sm text-slate-300 mb-4">
            It's {E.clockText(s.clock)}. {s.inShop.length ? `${s.inShop.length} ${s.inShop.length > 1 ? 'people are' : 'person is'} still in the shop and will go home. ` : ''}More customers would still come before 8pm.
          </p>
          <div className="flex gap-2 justify-end">
            <Btn onClick={() => setConfirmClose(false)}>Keep working</Btn>
            <Btn tone="gold" onClick={() => { setConfirmClose(false); up(E.closeShop); }}>Close the shop</Btn>
          </div>
        </Modal>
      )}

      {admin && cloud && <AdminPanel store={cloud.store} me={cloud.user} onClose={() => setAdmin(false)} />}
      {notice && <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-[70] rounded-lg bg-amber-900/90 text-amber-100 text-xs px-3 py-1.5 pointer-events-none">{notice}</div>}

      {menu && (
        <Modal onClose={() => setMenu(false)}>
          <h2 className="font-serif text-xl font-bold text-white mb-3">Menu</h2>
          {cloud && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 mb-3 text-sm">
              <div className="text-white font-semibold">{cloud.user.name}</div>
              <div className="text-[11px] text-slate-400">{cloud.user.email}</div>
              <div className={`text-[11px] mt-1 ${syncState === 'offline' ? 'text-amber-300' : 'text-emerald-300'}`}>{syncState === 'saved' ? '✓ Saved to your account' : syncState === 'saving' ? 'Saving to your account…' : 'Offline: saved on this device, will sync when back online'}</div>
              <div className="flex gap-2 mt-2">
                {cloud.isAdmin && <Btn size="sm" tone="gold" onClick={() => { setMenu(false); setAdmin(true); }}>Admin</Btn>}
                <Btn size="sm" onClick={() => { setMenu(false); cloud.signOut(); }}>Sign out</Btn>
              </div>
              <div className="text-[10px] text-slate-600 mt-1.5 select-all">Player ID: {cloud.user.uid}</div>
            </div>
          )}
          <div className="space-y-2">
            <Btn className="w-full" onClick={() => E.exportSave(s)}>Download a backup of this save</Btn>
            <Btn className="w-full" onClick={() => fileRef.current?.click()}>Restore from a backup file</Btn>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
            <SoundSettings />
            {s.phase !== 'shop' && <Btn className="w-full" onClick={() => { setMenu(false); setLookEdit(s.divine); }}>Change Divine's look</Btn>}
            <Btn className="w-full" onClick={onLab}>Character Lab</Btn>
            <Btn className="w-full" tone="danger" onClick={() => setConfirmNew(true)}>Start a new game</Btn>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">The shop clock stops while this menu is open.</p>
          {confirmNew && (
            <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm">
              <p className="text-rose-200 mb-2">This deletes the current game on this device. Download a backup first if you want to keep it.</p>
              <div className="flex gap-2">
                <Btn size="sm" onClick={() => setConfirmNew(false)}>Cancel</Btn>
                <Btn size="sm" tone="danger" onClick={() => { E.clearSave(storageKey); setS(null); setMenu(false); setConfirmNew(false); }}>Delete and start over</Btn>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

/** A rival in the shop: say something. */
const VisitCard: React.FC<{ s: GameState; up: (f: (g: GameState) => GameState) => void }> = ({ s, up }) => {
  const v = s.visit!;
  const r = s.rivals.find((x) => x.id === v.rivalId);
  if (!r) return null;
  const target = v.target ? s.inShop.find((x) => x.c.id === v.target)?.c : undefined;
  return (
    <div className="fixed z-[57] right-3 bottom-36 sm:bottom-40 w-[min(92vw,360px)] rounded-2xl border border-pink-500/50 bg-[#1b1220]/97 shadow-2xl p-3">
      <div className="flex items-center gap-3">
        <span className="w-12 h-12 rounded-full overflow-hidden bg-[#2a1f2e] ring-2 ring-pink-500 shrink-0"><CharacterSvg config={r.look} idPrefix={`visit-${r.id}`} camera="portrait" /></span>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-pink-300">{r.owner} walked in</div>
          <div className="text-[11px] text-slate-400">{r.shop}</div>
        </div>
      </div>
      <p className="text-sm text-white italic mt-2">"{v.line}"</p>
      {target && <p className="text-[11px] text-rose-300 mt-1">She's talking to {target.name}, who is waiting. Do something or {target.name} goes with her.</p>}
      <div className="grid gap-1.5 mt-2">
        {E.VISIT_CHOICES.map((c) => (
          <button key={c.id} onClick={() => up((g) => E.answerVisit(g, c.id))} className={`rounded-lg px-3 py-1.5 text-sm text-left ${c.id === 'clap' ? 'bg-rose-700/80 text-white' : c.id === 'welcome' ? 'bg-emerald-700/70 text-white' : 'bg-white/10 text-slate-100'}`}>{c.label}</button>
        ))}
      </div>
    </div>
  );
};

/** Security management: hire the guard, order a gallon, or refill a selected generator. */
const SecurityMenu: React.FC<{
  s: GameState;
  gallonId?: string;
  onClose: () => void;
  onHire: () => void;
  onBuy: (litres: number, generatorUid?: string) => void;
  onPour?: (gallonId: string, generatorUid: string) => void;
}> = ({ s, gallonId, onClose, onHire, onBuy, onPour }) => {
  const [litres, setLitres] = useState(10);
  const [generatorUid, setGeneratorUid] = useState('');
  const generators = s.furniture.filter((p) => p.placed && !!furnitureById(p.id).gen);
  const selectedGenerator = generatorUid || generators[0]?.uid || '';
  const gallon = (s.security?.gallons || []).find((g) => g.id === gallonId);
  const post = s.furniture.some((p) => p.placed && p.id === 'securityPost');
  const guard = s.security?.guard;
  const trip = s.security?.trip;
  const price = Math.round(litres * E.fuelPrice(s));
  const busyText = trip ? `${trip.carrier === 'guard' ? guard?.name || 'Security guard' : 'Divine'} is ${trip.remaining > trip.total / 2 ? 'out buying fuel' : 'on the way back'} · about ${Math.ceil(trip.remaining)} in-game minutes remaining.` : '';
  return (
    <div className="fixed inset-0 z-[62] bg-black/65 flex items-end sm:items-center justify-center p-3">
      <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#12141c] shadow-2xl p-4 text-white max-h-[90dvh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="font-serif text-xl font-bold">{gallon ? 'Fuel gallon' : 'Security & fuel'}</h2>
            <p className="text-xs text-slate-400 mt-1">{gallon ? `${gallon.litres} L ready to pour` : 'Security is hired separately from salon staff.'}</p>
          </div>
          <Btn size="sm" onClick={onClose}>Close</Btn>
        </div>
        {gallon ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-200">Choose which generator should receive this gallon. The fuel has already been paid for.</p>
            {generators.length ? (
              <>
                <label className="block text-xs text-slate-300">Generator
                  <select value={selectedGenerator} onChange={(e) => setGeneratorUid(e.target.value)} className="mt-1 block w-full rounded-lg border border-white/15 bg-[#181b24] p-2 text-sm text-white">
                    {generators.map((g) => <option key={g.uid} value={g.uid}>{furnitureById(g.id).name} · {Math.round(E.fuelOf(s, g.uid) * 10) / 10}/{E.tankSize(s, g.uid)} L</option>)}
                  </select>
                </label>
                <Btn className="w-full" tone="gold" onClick={() => selectedGenerator && onPour?.(gallon.id, selectedGenerator)}>{guard ? `Ask ${guard.name} to fill it` : 'Fill the generator'}</Btn>
              </>
            ) : <p className="text-sm text-amber-200">Buy and place a generator before pouring this fuel.</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="font-semibold">{guard ? `${guard.name} · security guard` : 'No security guard hired'}</div>
              <p className="text-xs text-slate-400 mt-1">{guard ? (post ? 'On duty at the outside security post when not running an errand.' : 'The post is missing, so Divine will handle errands until it is placed again.') : post ? 'You own a security post. Hire a guard to protect the shop and run errands.' : 'Divine will go out herself for fuel. To hire a guard, buy and place the small security post from the Furniture Store first.'}</p>
              {post && !guard && <Btn className="w-full mt-2" tone="gold" onClick={onHire}>Hire security guard · ₦35,000</Btn>}
              {guard && <p className="text-xs text-emerald-200 mt-2">Weekly wage: {naira(guard.wage)}</p>}
            </div>
            {trip && <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">{busyText} Ordered: {trip.litres} L.</div>}
            <div>
              <label className="block text-xs text-slate-300">Fuel quantity
                <select value={litres} onChange={(e) => setLitres(Number(e.target.value))} className="mt-1 block w-full rounded-lg border border-white/15 bg-[#181b24] p-2 text-sm text-white">
                  {[5, 10, 20].map((v) => <option key={v} value={v}>{v} litres · {naira(v * E.fuelPrice(s))}</option>)}
                </select>
              </label>
            </div>
            {generators.length > 0 && (
              <label className="block text-xs text-slate-300">Generator to refill
                <select value={selectedGenerator} onChange={(e) => setGeneratorUid(e.target.value)} className="mt-1 block w-full rounded-lg border border-white/15 bg-[#181b24] p-2 text-sm text-white">
                  {generators.map((g) => <option key={g.uid} value={g.uid}>{furnitureById(g.id).name} · {Math.round(E.fuelOf(s, g.uid) * 10) / 10}/{E.tankSize(s, g.uid)} L</option>)}
                </select>
              </label>
            )}
            <div className="grid sm:grid-cols-2 gap-2">
              <Btn className="w-full" disabled={!!trip || s.cash < price} onClick={() => onBuy(litres)}>{guard && post ? 'Guard buys a gallon' : 'Divine goes to buy fuel'} · {naira(price)}</Btn>
              <Btn className="w-full" tone="gold" disabled={!!trip || !generators.length || s.cash < price} onClick={() => onBuy(litres, selectedGenerator)}>{guard && post ? 'Guard buys & refills' : 'Buy & refill generator'} · {naira(price)}</Btn>
            </div>
            {(s.security?.gallons || []).length > 0 && <p className="text-xs text-slate-400">There are {s.security!.gallons!.length} physical gallon(s) outside. Click a gallon in the yard to pour it.</p>}
            <p className="text-[11px] text-slate-500">The fuel is paid for when the trip starts. A trip takes in-game time; when the carrier returns, the gallon appears outside or the selected generator is refilled. This can be started before opening or after closing.</p>
          </div>
        )}
      </div>
    </div>
  );
};

/** NEPA status and the generator switch. */
const PowerChip: React.FC<{ s: GameState; up: (f: (g: GameState) => GameState) => void }> = ({ s, up }) => {
  const st = E.stats(s);
  const src = E.source(s);
  const off = E.inBlackout(s);
  const load = E.loadKw(s);
  const dailyKwh = E.dailyEnergyKwh(s);
  const tariff = E.tariffFor(s);
  const tariffOptions: number[] = Object.values(E.POWER.tariffs);
  const nextTariff = tariffOptions[(Math.max(0, tariffOptions.indexOf(tariff)) + 1) % tariffOptions.length];
  const powered = s.furniture.filter((p) => p.placed && !!E.EQUIPMENT_WATTS[p.id]);
  const sourceLabel = src === 'grid' ? (off ? 'Grid unavailable' : 'Grid supply') : src === 'gen' ? 'Generator supply' : src === 'solar' ? 'Solar / battery' : 'Power shortage';
  return (
    <details className="relative text-xs text-slate-200">
      <summary className="cursor-pointer list-none rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 font-semibold hover:bg-white/10">
        ⚡ Power &amp; Utilities · {src === 'grid' && !off ? 'NEPA' : src === 'none' ? 'Shortage' : src === 'solar' ? 'Solar' : 'Generator'}
      </summary>
      <div className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,360px)] space-y-2 rounded-xl border border-white/15 bg-[#11141d] p-3 shadow-2xl">
        <div className="flex items-center justify-between gap-2"><b className="text-sm text-white">Power &amp; Utilities</b><span className={src === 'none' ? 'text-rose-300' : 'text-emerald-300'}>{sourceLabel}</span></div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white/5 p-2"><div className="text-slate-400">Current load</div><b>{load.toFixed(2)} kW</b></div>
          <div className="rounded-lg bg-white/5 p-2"><div className="text-slate-400">Daily energy estimate</div><b>{dailyKwh.toFixed(1)} kWh</b></div>
          <div className="rounded-lg bg-white/5 p-2"><div className="text-slate-400">Daily grid cost estimate</div><b>{naira(E.dailyEnergyCost(s))}</b></div>
          <div className="rounded-lg bg-white/5 p-2"><div className="text-slate-400">Grid tariff</div><b>₦{tariff}/kWh</b></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn size="sm" onClick={() => up((g) => ({ ...g, power: { ...g.power, tariff: nextTariff } }))}>Change tariff → ₦{nextTariff}</Btn>
          {st.gen && <span className={E.fuelOf(s) < 2 ? 'text-rose-300' : 'text-slate-300'}>Fuel {Math.round(E.fuelOf(s) * 10) / 10}/{E.tankSize(s)} L</span>}
        </div>
        {st.gen && <div className="rounded-lg bg-white/5 p-2">
          <div className="flex items-center justify-between"><span>Generator load / capacity</span><b>{load.toFixed(2)} / {E.generatorCapacityKw(s).toFixed(1)} kW</b></div>
          <div className="text-slate-400">Fuel burn at current demand: {E.fuelPerHour(s).toFixed(2)} L/hour</div>
          {E.generatorOverloaded(s) && <div className="mt-1 text-rose-300">Warning: generator overload. Some equipment cannot run together.</div>}
          {off && !s.power.gen && E.fuelOf(s) > 0 && <Btn size="sm" tone="gold" onClick={() => up((g) => E.setGen(g, true))}>Start generator</Btn>}
          {s.power.gen && <Btn size="sm" onClick={() => up((g) => E.setGen(g, false))}>Stop generator</Btn>}
          {E.fuelOf(s) < E.tankSize(s) - 0.5 && <Btn size="sm" onClick={() => up((g) => E.refuel(g, 'full'))}>Refill · {naira(Math.round((E.tankSize(s) - E.fuelOf(s)) * E.fuelPrice(s)))}</Btn>}
        </div>}
        <div className="rounded-lg bg-white/5 p-2">
          <div>Solar generation capacity: {(st.solarPanels * 0.35).toFixed(2)} kW</div>
          <div>Battery reserve: {Math.round(s.power?.solar || 0)} / {Math.round(E.solarCap(s))} minutes equivalent</div>
          <div>Inverter status: {st.solarPanels ? (src === 'solar' ? 'Supplying power' : 'Installed · standby/charging') : 'Not installed'}</div>
        </div>
        <div>
          <div className="mb-1 font-semibold text-slate-300">Powered equipment</div>
          <div className="max-h-36 space-y-1 overflow-auto">
            {powered.length === 0 ? <div className="text-slate-500">No powered equipment installed.</div> : powered.slice(0, 12).map((p) => (
              <div key={p.uid} className="flex items-center justify-between gap-2">
                <span className="truncate">{furnitureById(p.id).name} · {E.EQUIPMENT_WATTS[p.id]} W</span>
                <Btn size="sm" tone={s.off?.[p.uid] ? 'ghost' : 'green'} onClick={() => up((g) => ({ ...g, off: { ...(g.off || {}), [p.uid]: !g.off?.[p.uid] } }))}>{s.off?.[p.uid] ? 'Off · switch on' : 'On · switch off'}</Btn>
              </div>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
};
const PhoneButton: React.FC<{ unread: number; onClick: () => void }> = ({ unread, onClick }) => (
  <button onClick={onClick} className="relative rounded-lg px-3 py-1.5 text-sm font-semibold bg-white/5 border border-white/15 text-white hover:bg-white/10">
    📱 Phone
    {unread > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-[11px] font-bold flex items-center justify-center">{unread}</span>}
  </button>
);

const WaitChip: React.FC<{ v: Visitor; clock: number; disabled: boolean; onClick: () => void; onStaff?: () => void; staffHint?: string }> = ({ v, clock, disabled, onClick, onStaff, staffHint }) => {
  const left = Math.max(0, 1 - (v.waited ?? clock - v.arrived) / v.patience);
  const nameplate = celebrityNameplate(v.c);
  const ordinaryService = v.forStaff ? 'For staff' : v.c.service ? (v.c.male ? 'Haircut only' : v.c.service === 'makeup' ? 'Makeup only' : v.c.service === 'both' ? 'Hair & makeup' : 'Hair only') : 'Full look';
  return (
    <div className={`shrink-0 w-36 rounded-xl border px-2.5 py-2 ${nameplate ? nameplate.containerClass : disabled ? 'border-white/10 bg-white/5 opacity-60' : 'border-white/15 bg-white/5 hover:border-amber-400/60'}`}>
      <button className="w-full text-left" onClick={onClick} disabled={disabled}>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full shrink-0 ${nameplate ? nameplate.dotClass : CLS_DOT[v.c.cls]}`} />
          <span className={`min-w-0 flex-1 text-sm font-semibold truncate ${nameplate ? nameplate.nameClass : 'text-white'}`}>{v.c.name}</span>
          {nameplate && <span className={`shrink-0 rounded border px-1 py-0.5 text-[9px] font-black tracking-wide ${nameplate.badgeClass}`}>{nameplate.label}</span>}
        </div>
        <div className={`text-[10px] truncate ${nameplate ? nameplate.nameClass : 'text-slate-400'}`}>{nameplate ? `${nameplate.label} celebrity · ${ordinaryService}` : ordinaryService}{v.c.regularId ? ' · Regular' : ''}</div>
        <div className="h-1 mt-1 rounded-full bg-white/10 overflow-hidden"><div className={`h-full ${left > 0.5 ? 'bg-emerald-400' : left > 0.25 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${left * 100}%` }} /></div>
      </button>
      {onStaff && <button onClick={onStaff} className="text-[10px] text-sky-300 mt-1 hover:underline">Send to staff</button>}
      {staffHint && <div className="text-[10px] text-amber-200 mt-1">{staffHint}</div>}
    </div>
  );
};

const Evening: React.FC<{ s: GameState; onSleep: () => void; onPhone: () => void; onBuild: () => void; unread: number }> = ({ s, onSleep, onPhone, onBuild, unread }) => {
  const d = s.today;
  const flow = E.cashFlowSummary(s);
  const net = flow.operatingResult;
  const todays = s.messages.filter((m) => m.day === s.day);
  return (
    <div className="p-4 max-w-2xl mx-auto space-y-3">
      <div className="text-center pt-2">
        <div className="text-xs uppercase tracking-widest text-amber-300/80">Evening, day {s.day}</div>
        <h2 className="font-serif text-3xl font-bold text-white drop-shadow">The shop is closed</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          ['Served', `${d.served}`],
          ['Business income', naira(d.income)],
          ['Left unserved', `${d.lost}`],
          ['Best look', d.bestScore ? `${d.bestScore}` : '–'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-white/10 bg-[#15171f]/95 p-3 text-center">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">{k}</div>
            <div className="text-xl font-bold text-white">{v}</div>
          </div>
        ))}
      </div>
      <Card title="Today" className="bg-[#15171f]/95">
        <ul className="text-sm text-slate-300 space-y-1">
          <li>Operating result: <b className={net >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{naira(net)}</b> — today's recorded business income minus recorded costs. This is not the same as the change in your cash balance.</li>
          {d.tips > 0 && <li>Tips: {naira(d.tips)}</li>}
          {d.staffServed > 0 && <li>Your staff styled {d.staffServed} customer{d.staffServed > 1 ? 's' : ''}.</li>}
          {d.walkedOut > 0 && <li className="text-rose-300">{d.walkedOut} customer{d.walkedOut > 1 ? 's' : ''} didn't buy.</li>}
          <li>Brand Power {brandPower(getBrandMetrics(s), s.followers || 0, s.tier)?.toLocaleString("en-NG")} · {Math.round(s.followers || 0)?.toLocaleString("en-NG")} social followers</li>
          {d.events.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      </Card>
      <Card title="Cash flow · where your money went" className="bg-[#15171f]/95">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border border-white/10 bg-black/15 p-3"><div className="text-[11px] text-slate-400">Cash at start of day</div><div className="mt-1 font-semibold text-white">{flow.openingCash === null ? 'Not recorded' : naira(flow.openingCash)}</div></div>
          <div className="rounded-lg border border-white/10 bg-black/15 p-3"><div className="text-[11px] text-slate-400">Cash now</div><div className="mt-1 font-semibold text-white">{naira(flow.cash)}</div></div>
          <div className="rounded-lg border border-white/10 bg-black/15 p-3"><div className="text-[11px] text-slate-400">Change in cash since morning</div><div className={'mt-1 font-semibold ' + (flow.cashChange !== null && flow.cashChange >= 0 ? 'text-emerald-300' : 'text-rose-300')}>{flow.cashChange === null ? 'Not available for this saved day' : (flow.cashChange > 0 ? '+' : '') + naira(flow.cashChange)}</div></div>
          <div className="rounded-lg border border-white/10 bg-black/15 p-3"><div className="text-[11px] text-slate-400">Other cash movements</div><div className={'mt-1 font-semibold ' + (flow.otherMovement !== null && flow.otherMovement >= 0 ? 'text-emerald-300' : 'text-rose-300')}>{flow.otherMovement === null ? 'Not available' : (flow.otherMovement > 0 ? '+' : '') + naira(flow.otherMovement)}</div></div>
        </div>
        <p className="text-xs leading-relaxed text-slate-400">The calculation reconciles: starting cash + operating result + other cash movements = cash now. Other movements can include shop move-in fees, stock or furniture purchases, savings transfers, loan repayments and banking activity that is not part of today's recorded operating result.</p>
        <div className="rounded-lg border border-emerald-400/15 bg-emerald-950/20 p-3 space-y-2">
          <div className="text-xs font-semibold text-emerald-100">Money still held in KoboBank</div>
          <div className="flex justify-between gap-3 text-sm"><span className="text-slate-300">Savings</span><b className="text-white">{naira(flow.savings)}</b></div>
          <div className="flex justify-between gap-3 text-sm"><span className="text-slate-300">Rent Vault</span><b className="text-white">{naira(flow.rentVault)}</b></div>
          <div className="flex justify-between gap-3 text-sm"><span className="text-slate-300">Fixed deposits (locked)</span><b className="text-white">{naira(flow.fixedDeposits)}</b></div>
          <p className="text-[11px] text-slate-400">Money transferred to Savings or the Rent Vault has left your spending cash, but it has not been spent. It is still part of your money.</p>
        </div>
        {flow.openingCash === null && <p className="text-xs text-amber-200">This save was created before daily opening cash was tracked. Starting with the next morning, the report will reconcile the cash movement exactly.</p>}
        {flow.recentMovements.length > 0 && <div className="space-y-2"><div className="text-xs font-semibold text-slate-200">Other account movements recorded today</div><div className="divide-y divide-white/[0.06]">{flow.recentMovements.map((line, i) => <div key={line.day + '-' + line.t + '-' + line.label + '-' + i} className="flex items-center justify-between gap-3 py-2 text-xs"><span className="min-w-0 text-slate-300">{line.label}</span><b className={line.amount >= 0 ? 'shrink-0 text-emerald-300' : 'shrink-0 text-rose-300'}>{line.amount > 0 ? '+' : ''}{naira(line.amount)}</b></div>)}</div></div>}
      </Card>
      {todays.length > 0 && (
        <Card title="Messages" className="bg-[#15171f]/95">
          <div className="space-y-2">
            {todays.map((m, i) => (
              <div key={i} className={`rounded-lg p-2.5 text-sm border ${m.tone === 'danger' ? 'border-rose-500/40 bg-rose-500/10' : m.tone === 'warn' ? 'border-amber-500/30 bg-amber-500/5' : m.tone === 'good' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}>
                <div className="text-[11px] font-bold text-slate-400">{m.from}</div>
                {m.text}
              </div>
            ))}
          </div>
        </Card>
      )}
      <div className="text-center pb-4 flex flex-wrap justify-center gap-2">
        <PhoneButton unread={unread} onClick={onPhone} />
        <Btn onClick={onBuild}>🔨 Build</Btn>
        <Btn tone="gold" size="lg" onClick={onSleep}>Sleep → Day {s.day + 1}</Btn>
      </div>
      <div className="text-center pb-4 -mt-3">
        <p className="text-[11px] text-slate-300 mt-2">The game saves on this device automatically. Use Backup to keep a copy.</p>
      </div>
    </div>
  );
};

/** Divine's look: the full editor, used when starting and from the menu. */
const DivineEditor: React.FC<{ cfg: CharacterConfig; setCfg: (c: CharacterConfig) => void; header: React.ReactNode; footer: React.ReactNode }> = ({ cfg, setCfg, header, footer }) => {
  const [camera, setCamera] = useState<'full' | 'bust' | 'portrait'>('full');
  return (
    <div className="h-[100dvh] flex flex-col lg:flex-row overflow-hidden">
      <div className="lg:flex-1 flex flex-col min-h-0 p-3 lg:p-6 gap-3 max-lg:h-[42dvh] shrink-0 lg:shrink">
        {header}
        <div className="relative flex-1 min-h-0 rounded-2xl border border-white/10 bg-gradient-to-b from-[#1b1d27] to-[#0f1016] flex justify-center overflow-hidden">
          <div className="absolute top-2 left-2 z-10 flex gap-1">
            {(['full', 'bust', 'portrait'] as const).map((v) => (
              <Chip key={v} on={camera === v} onClick={() => setCamera(v)}>{v === 'full' ? 'Full' : v === 'bust' ? 'Bust' : 'Face'}</Chip>
            ))}
          </div>
          <CharacterSvg config={{ ...cfg, state: 'styled' }} idPrefix="divine-edit" camera={camera} className="h-full w-auto max-w-full" />
        </div>
        <div className="max-lg:hidden">{footer}</div>
      </div>
      <div className="flex-1 lg:flex-none lg:w-[440px] min-h-0 flex flex-col">
        <div className="flex-1 min-h-0">
          <ControlsPanel config={{ ...cfg, state: 'styled' }} onChange={(c) => setCfg({ ...c, state: 'styled' })} mode="divine" />
        </div>
        <div className="lg:hidden border-t border-white/10 bg-[#101219] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0">{footer}</div>
      </div>
    </div>
  );
};

const NewGame: React.FC<{ onStart: (cfg: CharacterConfig) => void; onLab: () => void }> = ({ onStart, onLab }) => {
  const [cfg, setCfg] = useState<CharacterConfig>(DIVINE_CONFIG);
  const randomise = () => {
    let c = generateRandomCustomer('styled');
    for (let k = 0; k < 30 && c.body === 'male'; k++) c = generateRandomCustomer('styled');
    setCfg({ ...c, state: 'styled' });
  };
  return (
    <DivineEditor
      cfg={cfg}
      setCfg={setCfg}
      header={
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-amber-300/80">Yaba, Lagos</div>
          <h1 className="font-serif text-2xl lg:text-4xl font-bold text-white">Asanwa Boutique</h1>
          <p className="text-xs lg:text-sm text-slate-300 mt-1 max-lg:hidden">
            You are <b>Divine</b>, a stylist with a rough little container kiosk, ₦200,000 and big dreams. Make her yours: body, skin, face, hair, makeup and outfit.
          </p>
        </div>
      }
      footer={
        <div className="flex flex-wrap gap-2">
          <Btn tone="gold" size="lg" onClick={() => onStart({ ...cfg, state: 'styled' })}>Open the kiosk →</Btn>
          <Btn onClick={randomise}>Surprise me</Btn>
          <Btn onClick={() => setCfg(DIVINE_CONFIG)}>Reset</Btn>
          <Btn onClick={onLab}>Character Lab</Btn>
        </div>
      }
    />
  );
};
