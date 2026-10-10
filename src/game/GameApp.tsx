import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { CharacterSvg } from '../components/renderer/renderCharacter';
import { SKIN_TONES } from '../constants/skinTones';
import { DIVINE_CONFIG } from '../constants/presets';
import { CharacterConfig, SkinToneId } from '../types/character';
import { SHOP_MINUTES, TIERS, naira } from './economy';
import * as E from './engine';
import { lookCost, buildLook } from './scoring';
import { Customer, GameState, ScoreBreakdown, Settlement, StyleChoice, Visitor } from './types';
import { Bar, Btn, Card, Chip, Modal, Pill } from './ui/kit';
import { Styling } from './ui/Styling';
import { PriceModal, Reveal } from './ui/Checkout';
import { FurniturePanel, RailPanel, Stars, StaffActions } from './ui/Panels';
import { AppId, Phone } from './ui/Phone';
import { armSound, pop, useSound } from './sound';

const ShopScene = lazy(() => import('./scene/ShopScene'));

type Step =
  | { kind: 'style' }
  | { kind: 'price'; c: Customer; choice: StyleChoice }
  | { kind: 'reveal'; c: Customer; choice: StyleChoice; stockBefore: GameState['stock']; score: ScoreBreakdown; st: Settlement; posted?: boolean };
type Panel = null | 'rail' | 'furniture';

const CLS_DOT = { poor: 'bg-slate-400', middle: 'bg-sky-400', rich: 'bg-amber-400' } as const;

export default function GameApp({ onLab }: { onLab: () => void }) {
  const [s, setS] = useState<GameState | null>(() => E.load());
  const [panel, setPanel] = useState<Panel>(null);
  const [styling, setStyling] = useState(false);
  const [step, setStep] = useState<Step>({ kind: 'style' });
  const [drafts, setDrafts] = useState<Record<string, StyleChoice>>({});
  const [menu, setMenu] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [placing, setPlacing] = useState<{ uid: string; rot: 0 | 1 } | null>(null);
  const [phone, setPhone] = useState(false);
  const [phoneApp, setPhoneApp] = useState<AppId>('home');
  const [chat, setChat] = useState<string | null>(null);
  const [cart, setCart] = useState<E.CartLine[]>([]);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [toast, setToast] = useState<{ from: string; text: string } | null>(null);
  const seenMsg = useRef<number>(s?.msgSeq || 0);
  const sound = useSound();
  useEffect(() => armSound(), []);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (s) E.save(s);
  }, [s]);

  // the clock only runs while the tab is visible
  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  const running = !!s && s.phase === 'shop' && !paused && !menu && !hidden && !confirmClose;
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(2, (now - last) / 1000);
      last = now;
      setS((g) => (g ? E.tick(g, dt) : g));
    }, 500);
    return () => window.clearInterval(id);
  }, [running]);

  // a new WhatsApp message pops up like a notification
  useEffect(() => {
    if (!s) return;
    if (s.msgSeq > seenMsg.current) {
      const m = s.messages.find((x) => x.id === s.msgSeq);
      seenMsg.current = s.msgSeq;
      if (m && !(phone && phoneApp === 'chats' && chat === m.from)) {
        setToast({ from: m.from, text: m.text });
        pop();
        const id = window.setTimeout(() => setToast(null), 4500);
        return () => window.clearTimeout(id);
      }
    }
  }, [s?.msgSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) return <NewGame onStart={(cfg) => { const g = E.newGame(cfg); seenMsg.current = g.msgSeq; setS(g); }} onLab={onLab} />;

  const up = (f: (g: GameState) => GameState) => setS((g) => (g ? f(g) : g));
  const t = TIERS[s.tier];
  const st = E.stats(s);
  const current = E.visitor(s, s.serving)?.c;
  const queue = E.waiting(s).sort((a, b) => a.arrived - b.arrived);
  const unread = E.unreadCount(s);
  const closing = E.shopClosing(s);
  const dark = E.inBlackout(s) && s.phase === 'shop';

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
    if (s.serving && s.serving !== id) {
      setStyling(true);
      return;
    }
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
    <div className="h-screen flex flex-col overflow-hidden">
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
        <div className={`text-lg font-bold ${s.cash < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{naira(s.cash)}</div>
        <div className="w-32">
          <Bar label="Reputation" value={s.rep} max={100} tone={s.rep > 60 ? 'bg-emerald-400' : s.rep > 30 ? 'bg-amber-400' : 'bg-rose-400'} />
        </div>
        <div className="text-xs text-slate-300 max-sm:hidden">
          Prestige <b className="text-amber-300">{st.prestige}</b> · Followers <b className="text-pink-300">{(s.followers || 0).toLocaleString('en-NG')}</b>
        </div>
        <div className={`text-xs ${s.lateRent ? 'text-rose-300 font-bold' : E.daysToRent(s.day) <= 2 ? 'text-amber-300' : 'text-slate-400'}`}>
          {s.lateRent ? `RENT LATE · clear by day ${s.lateRent.due}` : `Rent ${naira(s.listing.rent)} ${E.daysToRent(s.day) === 0 ? 'tonight' : `in ${E.daysToRent(s.day)}d`}`}
        </div>
        <div className="ml-auto flex gap-2">
          <Btn size="sm" onClick={sound.toggleMusic} title={sound.music ? 'Music on' : 'Music off'}>{sound.music ? '♫ On' : '♫ Off'}</Btn>
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
            s={s}
            placing={placing}
            selected={selected}
            night={s.phase === 'evening'}
            dark={dark && !st.generator}
            onPlace={(x, z) => {
              if (!placing) return;
              up((g) => E.placeFurniture(g, placing.uid, x, z, placing.rot));
              setPlacing(null);
            }}
            onSelect={(uid) => {
              setSelected(uid);
              if (uid && s.phase === 'morning') setPanel('furniture');
            }}
            onCustomer={styleCustomer}
          />
        </Suspense>

        {/* top-left: where we are */}
        <div className={`absolute top-3 left-3 w-48 sm:w-60 space-y-2 pointer-events-none ${s.phase === 'shop' ? 'max-sm:hidden' : ''}`}>
          <div className="rounded-xl border border-white/15 bg-[#12141c]/85 backdrop-blur p-2 sm:p-3 pointer-events-auto">
            <div className="text-[11px] text-slate-400">{t.name}</div>
            <div className="text-sm font-semibold text-white leading-tight">{s.listing.street}, {s.listing.area}</div>
            <Stars n={s.listing.stars} />
          </div>
        </div>

        {/* the clock */}
        {s.phase === 'shop' && (
          <div className="absolute top-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-10 rounded-2xl border border-white/15 bg-[#12141c]/92 backdrop-blur px-3 py-2 flex items-center gap-3">
            <div className="leading-tight">
              <div className={`text-xl font-bold tabular-nums ${closing ? 'text-rose-300' : 'text-white'}`}>{E.clockText(s.clock)}</div>
              <div className="w-24 h-1 rounded-full bg-white/10 mt-1 overflow-hidden"><div className="h-full bg-amber-400" style={{ width: `${(s.clock / SHOP_MINUTES) * 100}%` }} /></div>
            </div>
            {dark && <Pill tone="red">{st.generator ? 'Gen on' : 'No light'}</Pill>}
            <Btn size="sm" onClick={() => setPaused((p) => !p)}>{paused ? '▶ Play' : '❚❚ Pause'}</Btn>
            {!s.inShop.length && !s.serving && !closing && s.arrivals.length > 0 && <Btn size="sm" tone="ghost" onClick={() => up(E.skipAhead)}>Skip ⏩</Btn>}
          </div>
        )}
        {paused && s.phase === 'shop' && !styling && (
          <button onClick={() => setPaused(false)} className="absolute inset-0 z-[5] bg-black/40 flex items-center justify-center">
            <span className="rounded-2xl bg-[#12141c]/95 border border-white/15 px-6 py-4 text-white font-semibold">Paused · tap to carry on</span>
          </button>
        )}

        {placing && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 rounded-xl border border-amber-500/50 bg-[#12141c]/95 p-2 flex items-center gap-2 text-sm">
            <span className="text-amber-200 px-1">Tap a free spot to drop it</span>
            <Btn size="sm" onClick={() => setPlacing({ ...placing, rot: placing.rot ? 0 : 1 })}>Rotate</Btn>
            <Btn size="sm" onClick={() => setPlacing(null)}>Cancel</Btn>
          </div>
        )}

        {/* morning controls */}
        {s.phase === 'morning' && !placing && (
          <div className={`absolute bottom-3 left-0 right-0 flex flex-wrap items-end justify-center gap-2 px-3 pointer-events-none ${panel ? 'max-sm:hidden sm:right-[460px]' : ''}`}>
            <div className="flex flex-wrap gap-1 rounded-2xl border border-white/15 bg-[#12141c]/90 backdrop-blur p-1.5 pointer-events-auto">
              <Btn size="sm" tone={panel === 'rail' ? 'gold' : 'ghost'} onClick={() => setPanel(panel === 'rail' ? null : 'rail')}>Rail</Btn>
              <Btn size="sm" tone={panel === 'furniture' ? 'gold' : 'ghost'} onClick={() => setPanel(panel === 'furniture' ? null : 'furniture')}>Furniture</Btn>
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
                {current && (
                  <button onClick={() => setStyling(true)} className="shrink-0 rounded-xl border border-amber-500 bg-amber-500/15 px-3 py-2 text-left">
                    <div className="text-xs font-bold text-amber-200">Continue →</div>
                    <div className="text-sm text-white">{current.name}</div>
                  </button>
                )}
                {queue.map((v) => <WaitChip key={v.c.id} v={v} clock={s.clock} disabled={!!current} onClick={() => styleCustomer(v.c.id)} onStaff={s.staff.length && v.c.cls !== 'rich' && !v.forStaff ? () => up((g) => E.sendToStaff(g, v.c.id)) : undefined} />)}
                {s.inShop.filter((v) => v.by && v.by !== 'divine').map((v) => (
                  <div key={v.c.id} className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 opacity-70">
                    <div className="text-[10px] text-slate-400">With {s.staff.find((m) => m.id === v.by)?.name}</div>
                    <div className="text-sm text-white">{v.c.name}</div>
                  </div>
                ))}
              </div>
            </div>
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
        {panel && (s.phase === 'morning' || (s.phase === 'shop' && panel === 'rail' && !styling)) && (
          <aside className="absolute z-20 right-0 top-0 bottom-0 w-full sm:w-[460px] bg-[#12141c]/97 border-l border-white/10 backdrop-blur flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="font-serif text-lg font-bold text-white">{{ rail: 'Your rail', furniture: 'Furniture' }[panel]}</h3>
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
                    buy: (id) => up((g) => E.buyFurniture(g, id)),
                    move: (uid) => {
                      const p = s.furniture.find((x) => x.uid === uid);
                      setPlacing({ uid, rot: p?.rot || 0 });
                      setPanel(null);
                    },
                    store: (uid) => up((g) => E.storeFurniture(g, uid)),
                    sell: (uid) => up((g) => E.sellFurniture(g, uid)),
                    install: (uid) => up((g) => E.installFurniture(g, uid)),
                  }}
                />
              )}
            </div>
          </aside>
        )}

        {s.phase === 'evening' && !(styling && step.kind === 'reveal') && (
          <div className="absolute inset-0 z-20 overflow-y-auto bg-black/40">
            <Evening s={s} onPhone={() => openPhone()} unread={unread} onSleep={() => up(E.nextMorning)} />
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
              onFinish={(choice) => setStep({ kind: 'price', c: current, choice })}
              onTurnAway={() => {
                done(current.id);
                up((g) => E.turnAway(g, current.id));
                setStyling(false);
              }}
              onSendToStaff={s.staff.length && current.cls !== 'rich' ? () => { up((g) => E.sendToStaff(g, current.id)); setStyling(false); } : null}
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
                const result = E.settle(c, score, price, cost.consumables);
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
          onMove={(l) => up((g) => E.moveTo(g, l))}
          staff={staffActions}
        />
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

      {menu && (
        <Modal onClose={() => setMenu(false)}>
          <h2 className="font-serif text-xl font-bold text-white mb-3">Menu</h2>
          <div className="space-y-2">
            <Btn className="w-full" onClick={() => E.exportSave(s)}>Download a backup of this save</Btn>
            <Btn className="w-full" onClick={() => fileRef.current?.click()}>Restore from a backup file</Btn>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
            <div className="grid grid-cols-2 gap-2">
              <Btn onClick={sound.toggleMusic}>Music: {sound.music ? 'on' : 'off'}</Btn>
              <Btn onClick={sound.toggleSfx}>Message pop: {sound.sfx ? 'on' : 'off'}</Btn>
            </div>
            <Btn className="w-full" onClick={onLab}>Character Lab</Btn>
            <Btn className="w-full" tone="danger" onClick={() => setConfirmNew(true)}>Start a new game</Btn>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">The shop clock stops while this menu is open.</p>
          {confirmNew && (
            <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm">
              <p className="text-rose-200 mb-2">This deletes the current game on this device. Download a backup first if you want to keep it.</p>
              <div className="flex gap-2">
                <Btn size="sm" onClick={() => setConfirmNew(false)}>Cancel</Btn>
                <Btn size="sm" tone="danger" onClick={() => { E.clearSave(); setS(null); setMenu(false); setConfirmNew(false); setCart([]); }}>Delete and start over</Btn>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

const PhoneButton: React.FC<{ unread: number; onClick: () => void }> = ({ unread, onClick }) => (
  <button onClick={onClick} className="relative rounded-lg px-3 py-1.5 text-sm font-semibold bg-white/5 border border-white/15 text-white hover:bg-white/10">
    📱 Phone
    {unread > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-[11px] font-bold flex items-center justify-center">{unread}</span>}
  </button>
);

const WaitChip: React.FC<{ v: Visitor; clock: number; disabled: boolean; onClick: () => void; onStaff?: () => void }> = ({ v, clock, disabled, onClick, onStaff }) => {
  const left = Math.max(0, 1 - (clock - v.arrived) / v.patience);
  return (
    <div className={`shrink-0 w-36 rounded-xl border px-2.5 py-2 ${disabled ? 'border-white/10 bg-white/5 opacity-60' : 'border-white/15 bg-white/5 hover:border-amber-400/60'}`}>
      <button className="w-full text-left" onClick={onClick} disabled={disabled}>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${CLS_DOT[v.c.cls]}`} />
          <span className="text-sm text-white font-semibold truncate">{v.c.name}</span>
        </div>
        <div className="text-[10px] text-slate-400 truncate">{v.forStaff ? 'For staff' : v.c.service ? (v.c.male ? 'Haircut only' : v.c.service === 'makeup' ? 'Makeup only' : v.c.service === 'both' ? 'Hair & makeup' : 'Hair only') : 'Full look'}{v.c.regularId ? ' · Regular' : ''}</div>
        <div className="h-1 mt-1 rounded-full bg-white/10 overflow-hidden"><div className={`h-full ${left > 0.5 ? 'bg-emerald-400' : left > 0.25 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${left * 100}%` }} /></div>
      </button>
      {onStaff && <button onClick={onStaff} className="text-[10px] text-sky-300 mt-1 hover:underline">Send to staff</button>}
    </div>
  );
};

const Evening: React.FC<{ s: GameState; onSleep: () => void; onPhone: () => void; unread: number }> = ({ s, onSleep, onPhone, unread }) => {
  const d = s.today;
  const net = d.income - d.costs;
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
          ['Money in', naira(d.income)],
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
          <li>Net today: <b className={net >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{naira(net)}</b> (stock and furniture you bought this morning are already out of your cash)</li>
          {d.tips > 0 && <li>Tips: {naira(d.tips)}</li>}
          {d.staffServed > 0 && <li>Your staff styled {d.staffServed} customer{d.staffServed > 1 ? 's' : ''}.</li>}
          {d.walkedOut > 0 && <li className="text-rose-300">{d.walkedOut} customer{d.walkedOut > 1 ? 's' : ''} didn't buy.</li>}
          <li>Reputation {d.repChange >= 0 ? 'up' : 'down'} {Math.abs(d.repChange).toFixed(1)} → {Math.round(s.rep)}</li>
          {d.events.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
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
        <Btn tone="gold" size="lg" onClick={onSleep}>Sleep → Day {s.day + 1}</Btn>
      </div>
      <div className="text-center pb-4 -mt-3">
        <p className="text-[11px] text-slate-300 mt-2">The game saves on this device automatically. Use Backup to keep a copy.</p>
      </div>
    </div>
  );
};

const NewGame: React.FC<{ onStart: (cfg: CharacterConfig) => void; onLab: () => void }> = ({ onStart, onLab }) => {
  const [cfg, setCfg] = useState<CharacterConfig>(DIVINE_CONFIG);
  const set = (p: Partial<CharacterConfig>) => setCfg((c) => ({ ...c, ...p }));
  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <div className="max-w-5xl w-full grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6 items-center">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#1b1d27] to-[#0f1016] max-w-[380px] mx-auto w-full">
          <CharacterSvg config={cfg} idPrefix="newgame" camera="full" />
        </div>
        <div className="space-y-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-amber-300/80">Yaba, Lagos</div>
            <h1 className="font-serif text-4xl font-bold text-white">Asanwa Boutique</h1>
            <p className="text-sm text-slate-300 mt-2">
              You are <b>Divine</b>, a stylist with a rough little container kiosk, ₦200,000 and big dreams. Style your customers, set your prices, pay your rent, fix up your shop, and grow from Yaba to the flagship store on Victoria Island.
            </p>
          </div>
          <Card title="Make Divine yours">
            <div className="space-y-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Skin tone</div>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(SKIN_TONES) as SkinToneId[]).map((k) => (
                    <button key={k} title={SKIN_TONES[k].name} onClick={() => set({ skinTone: k })} className={`w-8 h-8 rounded-full border-2 ${cfg.skinTone === k ? 'border-amber-400 scale-110' : 'border-white/20'}`} style={{ background: SKIN_TONES[k].base }} />
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Body</div>
                <div className="flex flex-wrap gap-1.5">
                  {([['femaleSlim', 'Slim'], ['femaleRegular', 'Curvy'], ['femalePlus', 'Plus-size']] as const).map(([id, l]) => (
                    <Chip key={id} on={cfg.body === id} onClick={() => set({ body: id })}>{l}</Chip>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Face</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(['oval', 'heart', 'square'] as const).map((f) => <Chip key={f} on={cfg.faceShape === f} onClick={() => set({ faceShape: f })}>{f[0].toUpperCase() + f.slice(1)}</Chip>)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Eyes</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(['almond', 'upturned', 'doe', 'hooded'] as const).map((f) => <Chip key={f} on={cfg.eyes.shape === f} onClick={() => set({ eyes: { ...cfg.eyes, shape: f } })}>{f[0].toUpperCase() + f.slice(1)}</Chip>)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nose</div>
                  <div className="flex flex-wrap gap-1.5">
                    {([['narrowDefined', 'Narrow'], ['button', 'Button'], ['broadAfrican', 'Broad'], ['softRegal', 'Regal']] as const).map(([id, l]) => <Chip key={id} on={cfg.nose === id} onClick={() => set({ nose: id })}>{l}</Chip>)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Lips</div>
                  <div className="flex flex-wrap gap-1.5">
                    {([['fullPout', 'Full'], ['definedCupid', 'Cupid'], ['widePillowy', 'Wide'], ['subtleSoft', 'Soft']] as const).map(([id, l]) => <Chip key={id} on={cfg.lips.shape === id} onClick={() => set({ lips: { ...cfg.lips, shape: id } })}>{l}</Chip>)}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">New hair, clothes and makeup for Divine come later, bought with money you earn.</p>
            </div>
          </Card>
          <div className="flex gap-2">
            <Btn tone="gold" size="lg" onClick={() => onStart(cfg)}>Open the kiosk →</Btn>
            <Btn size="lg" onClick={onLab}>Character Lab</Btn>
          </div>
        </div>
      </div>
    </div>
  );
};
