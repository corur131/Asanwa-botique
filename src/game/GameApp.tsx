import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { CharacterSvg } from '../components/renderer/renderCharacter';
import { SKIN_TONES } from '../constants/skinTones';
import { DIVINE_CONFIG } from '../constants/presets';
import { CharacterConfig, SkinToneId } from '../types/character';
import { TIERS, naira } from './economy';
import * as E from './engine';
import { lookCost, buildLook } from './scoring';
import { GameState, ScoreBreakdown, Settlement, StyleChoice } from './types';
import { Bar, Btn, Card, Chip, Modal, Pill } from './ui/kit';
import { Market } from './ui/Market';
import { Styling } from './ui/Styling';
import { PriceModal, Reveal } from './ui/Checkout';
import { FurniturePanel, Messages, MovePanel, RailPanel, RentCard, StaffPanel, Stars } from './ui/Panels';
import type { Leaver } from './scene/ShopScene';

const ShopScene = lazy(() => import('./scene/ShopScene'));

type Step = { kind: 'style' } | { kind: 'price'; choice: StyleChoice } | { kind: 'reveal'; choice: StyleChoice; stockBefore: GameState['stock']; score: ScoreBreakdown; st: Settlement };
type Panel = null | 'rail' | 'furniture' | 'move' | 'staff' | 'messages';

export default function GameApp({ onLab }: { onLab: () => void }) {
  const [s, setS] = useState<GameState | null>(() => E.load());
  const [market, setMarket] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [styling, setStyling] = useState(false);
  const [step, setStep] = useState<Step>({ kind: 'style' });
  const [menu, setMenu] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [placing, setPlacing] = useState<{ uid: string; rot: 0 | 1 } | null>(null);
  const [leavers, setLeavers] = useState<Leaver[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (s) E.save(s);
  }, [s]);

  if (!s) return <NewGame onStart={(cfg) => setS(E.newGame(cfg))} onLab={onLab} />;

  const up = (f: (g: GameState) => GameState) => setS((g) => (g ? f(g) : g));
  const t = TIERS[s.tier];
  const current = s.phase === 'shop' ? s.queue[s.queueIndex] : undefined;
  const divineHandled = s.today.served + s.today.walkedOut - s.today.staffServed;
  const staffLeft = E.staffCapacity(s) - s.today.staffServed;
  const st = E.stats(s);
  const tired = divineHandled >= 8;

  const restore = async (f: File) => {
    const parsed = E.parseSave(await f.text());
    if (parsed) {
      setS(parsed);
      setMenu(false);
    } else alert('That file is not an Asanwa Boutique save.');
  };
  const leave = (look: CharacterConfig, bag = false) => setLeavers((l) => [...l.slice(-5), { key: `${Date.now()}-${Math.random()}`, look, bag }]);
  const turnAway = () => {
    if (current) leave(current.look);
    up(E.turnAway);
    setStyling(false);
    setStep({ kind: 'style' });
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
        <div className="text-xs text-slate-300">
          Prestige <b className="text-amber-300">{st.prestige}</b>
        </div>
        <div className={`text-xs ${s.lateRent ? 'text-rose-300 font-bold' : E.daysToRent(s.day) <= 2 ? 'text-amber-300' : 'text-slate-400'}`}>
          {s.lateRent ? `RENT LATE · clear by day ${s.lateRent.due}` : `Rent ${naira(s.listing.rent)} ${E.daysToRent(s.day) === 0 ? 'tonight' : `in ${E.daysToRent(s.day)}d`}`}
        </div>
        <div className="ml-auto flex gap-2">
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
            onPlace={(x, z) => {
              if (!placing) return;
              up((g) => E.placeFurniture(g, placing.uid, x, z, placing.rot));
              setPlacing(null);
            }}
            onSelect={(uid) => {
              setSelected(uid);
              if (uid && s.phase === 'morning') setPanel('furniture');
            }}
            onCustomer={(i) => {
              if (i === s.queueIndex && !tired) setStyling(true);
            }}
            leavers={leavers}
            onLeft={(key) => setLeavers((l) => l.filter((x) => x.key !== key))}
          />
        </Suspense>

        {/* top-left info */}
        <div className="absolute top-3 left-3 w-52 sm:w-64 space-y-2 pointer-events-none">
          <div className="rounded-xl border border-white/15 bg-[#12141c]/85 backdrop-blur p-2 sm:p-3 pointer-events-auto">
            <div className="text-[11px] text-slate-400">{t.name}</div>
            <div className="text-sm font-semibold text-white leading-tight">{s.listing.street}, {s.listing.area}</div>
            <Stars n={s.listing.stars} />
          </div>
          <div className="pointer-events-auto max-sm:hidden">
            <RentCard s={s} compact />
          </div>
          {s.phase === 'morning' && s.messages[0] && s.messages[0].day >= s.day - 1 && (
            <button onClick={() => setPanel('messages')} className={`w-full text-left rounded-xl border p-2.5 text-xs backdrop-blur pointer-events-auto ${s.messages[0].tone === 'danger' ? 'border-rose-500/50 bg-rose-950/80' : 'border-white/15 bg-[#12141c]/85'}`}>
              <div className="font-bold text-slate-400">{s.messages[0].from}</div>
              <div className="text-slate-100 line-clamp-3">{s.messages[0].text}</div>
            </button>
          )}
        </div>

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
              {([
                ['rail', 'Rail'],
                ['market', 'Market'],
                ['furniture', 'Furniture'],
                ['move', 'Move shop'],
                ['staff', 'Staff'],
                ['messages', 'Messages'],
              ] as const).map(([id, label]) => (
                <Btn key={id} size="sm" tone={panel === id ? 'gold' : 'ghost'} onClick={() => (id === 'market' ? setMarket(true) : setPanel(panel === id ? null : id))}>
                  {label}
                </Btn>
              ))}
            </div>
            <Btn
              tone="gold"
              size="lg"
              className="pointer-events-auto shadow-xl"
              onClick={() => {
                setPanel(null);
                setSelected(null);
                setStep({ kind: 'style' });
                up(E.openShop);
              }}
            >
              Open the shop →
            </Btn>
          </div>
        )}

        {/* shop controls */}
        {s.phase === 'shop' && !styling && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center px-3">
            <div className="rounded-2xl border border-white/15 bg-[#12141c]/92 backdrop-blur p-3 flex flex-wrap items-center gap-3 max-w-2xl">
              {current && !tired ? (
                <>
                  <div className="text-sm">
                    <div className="text-white font-semibold">
                      {current.name} is at the mirror <Pill tone={current.cls === 'rich' ? 'gold' : current.cls === 'middle' ? 'blue' : 'grey'}>{current.cls === 'rich' ? 'Rich' : current.cls === 'middle' ? 'Middle' : 'Low budget'}</Pill>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Customer {s.queueIndex + 1} of {s.queue.length} · you've styled {divineHandled}/8 · {s.queue.length - s.queueIndex - 1} waiting{s.today.lost ? ` · ${s.today.lost} left` : ''}
                    </div>
                  </div>
                  <Btn tone="gold" onClick={() => { setStep({ kind: 'style' }); setStyling(true); }}>
                    Style {current.name} →
                  </Btn>
                </>
              ) : (
                <>
                  <div className="text-sm text-slate-200">
                    {current ? `You're worn out after 8 customers. ${s.queue.length - s.queueIndex} still waiting: ${s.staff.length ? 'your staff will take the ones they can' : 'with no staff, they will leave'}.` : 'No more customers today.'}
                  </div>
                  <Btn tone="gold" onClick={() => up(E.closeShop)}>Close the shop</Btn>
                </>
              )}
            </div>
          </div>
        )}

        {/* side panel */}
        {panel && s.phase === 'morning' && (
          <aside className="absolute z-20 right-0 top-0 bottom-0 w-full sm:w-[460px] bg-[#12141c]/97 border-l border-white/10 backdrop-blur flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="font-serif text-lg font-bold text-white">{{ rail: 'Your rail', furniture: 'Furniture', move: 'Move to a bigger shop', staff: 'Staff', messages: 'Messages' }[panel]}</h3>
              <Btn size="sm" onClick={() => setPanel(null)}>Close</Btn>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {panel === 'rail' && <RailPanel s={s} display={(uid, on) => up((g) => E.setDisplayed(g, uid, on))} restock={(uid, n) => up((g) => E.restock(g, uid, n))} restockAll={() => up((g) => E.restockAll(g))} clear={(uid) => up((g) => E.clearDesign(g, uid))} />}
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
              {panel === 'move' && <MovePanel s={s} onMove={(l) => { up((g) => E.moveTo(g, l)); setPanel(null); }} />}
              {panel === 'staff' && <StaffPanel s={s} a={{ hire: (c) => up((g) => E.hire(g, c)), train: (id) => up((g) => E.train(g, id)), fire: (id) => up((g) => E.fire(g, id)), raise: (id, a) => up((g) => E.answerRaise(g, id, a)) }} />}
              {panel === 'messages' && <Messages s={s} n={30} />}
            </div>
          </aside>
        )}

        {s.phase === 'evening' && (
          <div className="absolute inset-0 z-20 overflow-y-auto bg-black/40">
            <Evening s={s} onSleep={() => { setLeavers([]); up(E.nextMorning); }} />
          </div>
        )}
      </div>

      {/* styling, full screen over the shop */}
      {s.phase === 'shop' && styling && (current || step.kind === 'reveal') && (
        <div className="fixed inset-0 z-40 bg-[#0d0e12] overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#101219]/95">
            <span className="text-xs text-slate-400">
              Day {s.day} · {naira(s.cash)} · customer {Math.min(s.queueIndex + 1, s.queue.length)} of {s.queue.length}
            </span>
            {step.kind !== 'reveal' && <Btn size="sm" onClick={() => setStyling(false)}>Back to the shop floor</Btn>}
          </div>
          {current && step.kind !== 'reveal' && (
            <Styling
              key={current.id}
              state={s}
              customer={current}
              served={divineHandled}
              canWig={st.wigs}
              onFinish={(choice) => setStep({ kind: 'price', choice })}
              onTurnAway={turnAway}
              onSendToStaff={
                s.staff.length && staffLeft > 0 && current.cls !== 'rich'
                  ? () => {
                      const res = E.staffServe(s, current);
                      leave(current.look, true);
                      setS(res.state);
                      setStyling(false);
                    }
                  : null
              }
            />
          )}
          {current && step.kind === 'price' && (
            <PriceModal
              state={s}
              c={current}
              choice={step.choice}
              onBack={() => setStep({ kind: 'style' })}
              onPrice={(price) => {
                const score = E.scoreInShop(s, current, step.choice);
                const cost = lookCost(current, step.choice, s.stock);
                const result = E.settle(current, score, price, cost.consumables);
                setStep({ kind: 'reveal', choice: step.choice, stockBefore: s.stock, score, st: result });
                up((g) => E.applyLook(g, current, step.choice, result, score));
              }}
            />
          )}
          {step.kind === 'reveal' && (
            <Reveal
              state={s}
              c={s.queue[s.queueIndex - 1]}
              choice={step.choice}
              stockBefore={step.stockBefore}
              score={step.score}
              st={step.st}
              onNext={() => {
                const c = s.queue[s.queueIndex - 1];
                const sold = step.st.outcome === 'paid' || step.st.outcome === 'bargained';
                leave(sold ? buildLook(c, step.choice, step.stockBefore) : c.look, sold);
                setStep({ kind: 'style' });
                setStyling(false);
              }}
            />
          )}
        </div>
      )}

      {market && s.phase === 'morning' && (
        <div className="fixed inset-0 z-40 bg-[#0d0e12] overflow-y-auto">
          <Market state={s} onBuy={(d) => up((g) => E.buyDesign(g, d))} onClose={() => setMarket(false)} />
        </div>
      )}

      {menu && (
        <Modal onClose={() => setMenu(false)}>
          <h2 className="font-serif text-xl font-bold text-white mb-3">Menu</h2>
          <div className="space-y-2">
            <Btn className="w-full" onClick={() => E.exportSave(s)}>Download a backup of this save</Btn>
            <Btn className="w-full" onClick={() => fileRef.current?.click()}>Restore from a backup file</Btn>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
            <Btn className="w-full" onClick={onLab}>Character Lab</Btn>
            <Btn className="w-full" tone="danger" onClick={() => setConfirmNew(true)}>Start a new game</Btn>
          </div>
          {confirmNew && (
            <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm">
              <p className="text-rose-200 mb-2">This deletes the current game on this device. Download a backup first if you want to keep it.</p>
              <div className="flex gap-2">
                <Btn size="sm" onClick={() => setConfirmNew(false)}>Cancel</Btn>
                <Btn size="sm" tone="danger" onClick={() => { E.clearSave(); setS(null); setMenu(false); setConfirmNew(false); }}>Delete and start over</Btn>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

const Evening: React.FC<{ s: GameState; onSleep: () => void }> = ({ s, onSleep }) => {
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
          ['Spent today', naira(d.costs)],
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
      <div className="text-center pb-4">
        <Btn tone="gold" size="lg" onClick={onSleep}>Sleep → Day {s.day + 1}</Btn>
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
