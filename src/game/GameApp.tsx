import React, { useEffect, useRef, useState } from 'react';
import { CharacterSvg } from '../components/renderer/renderCharacter';
import { SKIN_TONES } from '../constants/skinTones';
import { DIVINE_CONFIG } from '../constants/presets';
import { CharacterConfig, SkinToneId } from '../types/character';
import { TIERS, naira } from './economy';
import * as E from './engine';
import { lookCost, scoreLook } from './scoring';
import { GameState, ScoreBreakdown, Settlement, StyleChoice } from './types';
import { Bar, Btn, Card, Chip, Modal, Pill } from './ui/kit';
import { Morning } from './ui/Morning';
import { Market } from './ui/Market';
import { Styling } from './ui/Styling';
import { PriceModal, Reveal } from './ui/Checkout';

type Step = { kind: 'style' } | { kind: 'price'; choice: StyleChoice } | { kind: 'reveal'; choice: StyleChoice; stockBefore: GameState['stock']; score: ScoreBreakdown; st: Settlement };

export default function GameApp({ onLab }: { onLab: () => void }) {
  const [s, setS] = useState<GameState | null>(() => E.load());
  const [market, setMarket] = useState(false);
  const [step, setStep] = useState<Step>({ kind: 'style' });
  const [menu, setMenu] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
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

  const restore = async (f: File) => {
    const parsed = E.parseSave(await f.text());
    if (parsed) {
      setS(parsed);
      setMenu(false);
    } else alert('That file is not an Asanwa Boutique save.');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* HUD */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 border-b border-white/10 bg-[#101219]/95 backdrop-blur">
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
        <div className="w-36">
          <Bar label="Reputation" value={s.rep} max={100} tone={s.rep > 60 ? 'bg-emerald-400' : s.rep > 30 ? 'bg-amber-400' : 'bg-rose-400'} />
        </div>
        <div className={`text-xs ${s.lateRent ? 'text-rose-300 font-bold' : E.daysToRent(s.day) <= 2 ? 'text-amber-300' : 'text-slate-400'}`}>
          {s.lateRent ? `RENT LATE · clear by day ${s.lateRent.due}` : `Rent ${naira(t.rent)} ${E.daysToRent(s.day) === 0 ? 'tonight' : `in ${E.daysToRent(s.day)} day${E.daysToRent(s.day) > 1 ? 's' : ''}`}`}
        </div>
        <div className="ml-auto flex gap-2">
          <Btn size="sm" onClick={() => E.exportSave(s)}>Backup save</Btn>
          <Btn size="sm" onClick={() => setMenu(true)}>Menu</Btn>
        </div>
      </header>

      {s.lateRent && s.phase === 'morning' && (
        <div className="bg-rose-700/90 text-white text-sm px-4 py-2 text-center font-semibold">
          The landlord is waiting. You owe {naira(Math.max(0, -s.cash))}. Clear it by the end of day {s.lateRent.due} or you move down to a {TIERS[Math.max(0, s.tier - 1)].name}.
        </div>
      )}

      <main className="flex-1">
        {s.phase === 'morning' && market && <Market state={s} onBuy={(d) => up((g) => E.buyDesign(g, d))} onClose={() => setMarket(false)} />}
        {s.phase === 'morning' && !market && (
          <Morning
            s={s}
            a={{
              openShop: () => {
                setStep({ kind: 'style' });
                up(E.openShop);
              },
              goMarket: () => setMarket(true),
              display: (uid, on) => up((g) => E.setDisplayed(g, uid, on)),
              restock: (uid, n) => up((g) => E.restock(g, uid, n)),
              restockAll: () => up((g) => E.restockAll(g)),
              clear: (uid) => up((g) => E.clearDesign(g, uid)),
              moveUp: (grace) => up((g) => E.moveUp(g, grace)),
              hire: (c) => up((g) => E.hire(g, c)),
              train: (id) => up((g) => E.train(g, id)),
              fire: (id) => up((g) => E.fire(g, id)),
              raise: (id, ans) => up((g) => E.answerRaise(g, id, ans)),
            }}
          />
        )}

        {s.phase === 'shop' && (
          <>
            <div className="px-4 pt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>
                Customer {Math.min(s.queueIndex + 1, s.queue.length)} of {s.queue.length}
              </span>
              <span>·</span>
              <span>You've styled {divineHandled}/8 today</span>
              {s.staff.length > 0 && (
                <>
                  <span>·</span>
                  <span>Staff can take {Math.max(0, staffLeft)} more</span>
                </>
              )}
              {s.slowWeek && <Pill tone="gold">Slow week</Pill>}
            </div>
            {current && divineHandled < 8 && step.kind !== 'reveal' && (
              <Styling
                key={current.id}
                state={s}
                customer={current}
                served={divineHandled}
                onFinish={(choice) => setStep({ kind: 'price', choice })}
                onTurnAway={() => up(E.turnAway)}
                onSendToStaff={s.staff.length && staffLeft > 0 && current.cls !== 'rich' ? () => up((g) => E.staffServe(g, current).state) : null}
              />
            )}
            {current && step.kind === 'price' && (
              <PriceModal
                state={s}
                c={current}
                choice={step.choice}
                onBack={() => setStep({ kind: 'style' })}
                onPrice={(price) => {
                  const score = scoreLook(current, step.choice, s.stock);
                  const cost = lookCost(current, step.choice, s.stock);
                  const st = E.settle(current, score, price, cost.consumables);
                  const stockBefore = s.stock;
                  setStep({ kind: 'reveal', choice: step.choice, stockBefore, score, st });
                  up((g) => E.applyLook(g, current, step.choice, st, score));
                }}
              />
            )}
            {step.kind === 'reveal' && (
              <Reveal state={s} c={s.queue[s.queueIndex - 1]} choice={step.choice} stockBefore={step.stockBefore} score={step.score} st={step.st} onNext={() => setStep({ kind: 'style' })} />
            )}
            {step.kind !== 'reveal' && (!current || divineHandled >= 8) && (
              <div className="p-6 max-w-xl mx-auto">
                <Card title="Closing time">
                  <p className="text-sm text-slate-300 mb-3">
                    {current
                      ? `You're worn out after 8 customers. ${s.queue.length - s.queueIndex} still waiting: ${s.staff.length ? 'your staff will take the ones they can' : 'with no staff, they will leave'}.`
                      : 'No more customers today.'}
                  </p>
                  <Btn tone="gold" onClick={() => up(E.closeShop)}>
                    Close the shop
                  </Btn>
                </Card>
              </div>
            )}
          </>
        )}

        {s.phase === 'evening' && <Evening s={s} onSleep={() => up(E.nextMorning)} />}
      </main>

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
                <Btn
                  size="sm"
                  tone="danger"
                  onClick={() => {
                    E.clearSave();
                    setS(null);
                    setMenu(false);
                    setConfirmNew(false);
                  }}
                >
                  Delete and start over
                </Btn>
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
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-amber-300/80">Evening, day {s.day}</div>
        <h2 className="font-serif text-3xl font-bold text-white">The shop is closed</h2>
      </div>
      <div className="grid sm:grid-cols-4 gap-3">
        {[
          ['Served', `${d.served}`],
          ['Money in', naira(d.income)],
          ['Spent today', naira(d.costs)],
          ['Best look', d.bestScore ? `${d.bestScore}` : '–'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-white/10 bg-[#15171f] p-3 text-center">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">{k}</div>
            <div className="text-xl font-bold text-white">{v}</div>
          </div>
        ))}
      </div>
      <Card title="Today">
        <ul className="text-sm text-slate-300 space-y-1">
          <li>
            Net today: <b className={net >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{naira(net)}</b> (stock you bought this morning is already counted in your cash)
          </li>
          {d.tips > 0 && <li>Tips: {naira(d.tips)}</li>}
          {d.staffServed > 0 && <li>Your staff styled {d.staffServed} customer{d.staffServed > 1 ? 's' : ''}.</li>}
          {d.walkedOut > 0 && <li className="text-rose-300">{d.walkedOut} customer{d.walkedOut > 1 ? 's' : ''} didn't buy.</li>}
          <li>
            Reputation {d.repChange >= 0 ? 'up' : 'down'} {Math.abs(d.repChange).toFixed(1)} → {Math.round(s.rep)}
          </li>
          {d.events.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </Card>
      {todays.length > 0 && (
        <Card title="Messages">
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
      <div className="text-center">
        <Btn tone="gold" size="lg" onClick={onSleep}>
          Sleep → Day {s.day + 1}
        </Btn>
        <p className="text-[11px] text-slate-500 mt-2">The game saves on this device automatically. Use Backup save to keep a copy.</p>
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
              You are <b>Divine</b>, a stylist with a container kiosk, ₦200,000 and big dreams. Style your customers, set your prices, pay your rent, and grow from a kiosk to the flagship store on Victoria Island.
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
                    {(['oval', 'heart', 'square'] as const).map((f) => (
                      <Chip key={f} on={cfg.faceShape === f} onClick={() => set({ faceShape: f })}>{f[0].toUpperCase() + f.slice(1)}</Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Eyes</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(['almond', 'upturned', 'doe', 'hooded'] as const).map((f) => (
                      <Chip key={f} on={cfg.eyes.shape === f} onClick={() => set({ eyes: { ...cfg.eyes, shape: f } })}>{f[0].toUpperCase() + f.slice(1)}</Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nose</div>
                  <div className="flex flex-wrap gap-1.5">
                    {([['narrowDefined', 'Narrow'], ['button', 'Button'], ['broadAfrican', 'Broad'], ['softRegal', 'Regal']] as const).map(([id, l]) => (
                      <Chip key={id} on={cfg.nose === id} onClick={() => set({ nose: id })}>{l}</Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Lips</div>
                  <div className="flex flex-wrap gap-1.5">
                    {([['fullPout', 'Full'], ['definedCupid', 'Cupid'], ['widePillowy', 'Wide'], ['subtleSoft', 'Soft']] as const).map(([id, l]) => (
                      <Chip key={id} on={cfg.lips.shape === id} onClick={() => set({ lips: { ...cfg.lips, shape: id } })}>{l}</Chip>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">New hair, clothes and makeup for Divine come later, bought with money you earn.</p>
            </div>
          </Card>
          <div className="flex gap-2">
            <Btn tone="gold" size="lg" onClick={() => onStart(cfg)}>
              Open the kiosk →
            </Btn>
            <Btn size="lg" onClick={onLab}>Character Lab</Btn>
          </div>
        </div>
      </div>
    </div>
  );
};
