import React, { useState } from 'react';
import { MARKUP, STAFF, TIERS, naira } from '../economy';
import { Candidate, RaiseAnswer, candidates, canHire, daysToRent, displayedCount, landlordOffer, marketWage, moveUpCost, restockAllCost } from '../engine';
import { GameState } from '../types';
import { Bar, Btn, Card, Modal, Pill, Swatch } from './kit';

export interface MorningActions {
  openShop: () => void;
  goMarket: () => void;
  display: (uid: string, on: boolean) => void;
  restock: (uid: string, n: number) => void;
  restockAll: () => void;
  clear: (uid: string) => void;
  moveUp: (grace: number) => void;
  hire: (c: Candidate) => void;
  train: (id: string) => void;
  fire: (id: string) => void;
  raise: (id: string, a: RaiseAnswer) => void;
}

const graceText = (g: number) => (g === 0 ? 'No grace at all: pay on the day' : `${g} day${g > 1 ? 's' : ''} of grace if you are late`);

export const RentCard: React.FC<{ s: GameState }> = ({ s }) => {
  const t = TIERS[s.tier];
  const d = daysToRent(s.day);
  const short = s.cash < t.rent;
  return (
    <Card title="Rent" right={s.lateRent ? <Pill tone="red">LATE</Pill> : d <= 2 ? <Pill tone="gold">Due soon</Pill> : null} className={s.lateRent ? 'border-rose-500/60 bg-rose-950/40' : ''}>
      {s.lateRent ? (
        <div className="text-sm text-rose-200">
          <b>You owe {naira(Math.max(0, -s.cash))}.</b> Clear it by the end of <b>day {s.lateRent.due}</b> or the landlord moves you down to a {TIERS[Math.max(0, s.tier - 1)].name}.
        </div>
      ) : (
        <div className="text-sm text-slate-300">
          <b className="text-white">{naira(t.rent)}</b> due {d === 0 ? <b className="text-amber-300">tonight</b> : <>in <b className="text-white">{d} day{d > 1 ? 's' : ''}</b> (end of day {s.day + d})</>}.{' '}
          {short && <span className="text-rose-300">You are short by {naira(t.rent - s.cash)}.</span>}
        </div>
      )}
      <div className="text-[11px] text-slate-500 mt-1">Landlord: {graceText(s.grace)}.</div>
    </Card>
  );
};

export const Morning: React.FC<{ s: GameState; a: MorningActions }> = ({ s, a }) => {
  const t = TIERS[s.tier];
  const [moveOffer, setMoveOffer] = useState<number | null>(null);
  const [tab, setTab] = useState<'display' | 'storage'>('display');
  const shown = s.stock.filter((d) => d.displayed);
  const stored = s.stock.filter((d) => !d.displayed);
  const used = displayedCount(s);
  const next = s.tier + 1 < TIERS.length ? TIERS[s.tier + 1] : null;
  const upCost = moveUpCost(s);
  const restockCost = restockAllCost(s);
  const soldOut = shown.filter((d) => d.pieces === 0).length;
  const list = tab === 'display' ? shown : stored;

  return (
    <div className="p-4 grid xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
      <div className="space-y-4 min-w-0">
        <div className="rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-transparent p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-amber-300/80">Morning, day {s.day}</div>
            <div className="font-serif text-2xl font-bold text-white">{t.name}</div>
            <div className="text-xs text-slate-400">{t.blurb}</div>
          </div>
          <div className="flex gap-2">
            <Btn onClick={a.goMarket}>Go to market</Btn>
            <Btn tone="gold" size="lg" onClick={a.openShop}>
              Open the shop →
            </Btn>
          </div>
        </div>
        <div className="xl:hidden">
          <RentCard s={s} />
        </div>

        <Card
          title={`Your rail · ${used}/${t.slots} on display`}
          right={
            <div className="flex gap-1.5">
              <Btn size="sm" tone={tab === 'display' ? 'gold' : 'ghost'} onClick={() => setTab('display')}>On display ({shown.length})</Btn>
              <Btn size="sm" tone={tab === 'storage' ? 'gold' : 'ghost'} onClick={() => setTab('storage')}>Storage ({stored.length})</Btn>
            </div>
          }
        >
          <p className="text-xs text-slate-400 mb-2">You can only style customers with what is on display. Swap items in and out each morning.</p>
          {tab === 'display' && restockCost > 0 && (
            <div className="flex items-center justify-between gap-2 mb-3 rounded-lg bg-white/5 p-2">
              <span className="text-xs text-slate-300">{soldOut} design{soldOut === 1 ? '' : 's'} sold out or low.</span>
              <Btn size="sm" tone="green" disabled={s.cash < restockCost} onClick={a.restockAll}>
                Restock all to 2 pieces · {naira(restockCost)}
              </Btn>
            </div>
          )}
          {list.length === 0 ? (
            <p className="text-sm text-slate-500">{tab === 'display' ? 'Nothing on display. Go to the market.' : 'Storage is empty.'}</p>
          ) : (
            <div className="space-y-1.5 max-h-[46vh] overflow-y-auto pr-1">
              {list.map((d) => (
                <div key={d.uid} className={`flex flex-wrap sm:flex-nowrap items-center gap-2.5 p-2 rounded-lg border ${d.pieces === 0 ? 'border-rose-500/30 bg-rose-500/5' : 'border-white/10 bg-white/5'}`}>
                  <Swatch d={d} />
                  <div className="min-w-0 flex-1 basis-[60%] sm:basis-auto">
                    <div className="text-sm font-semibold text-white truncate">{d.label}</div>
                    <div className="text-[11px] text-slate-400">
                      {d.fabric !== 'plain' ? `${d.fabric} · ` : ''}cost {naira(d.cost)} · sells ~{naira(d.cost * MARKUP)} · {d.pieces === 0 ? <span className="text-rose-300">sold out</span> : `${d.pieces} piece${d.pieces > 1 ? 's' : ''}`}
                    </div>
                  </div>
                  <Btn size="sm" disabled={s.cash < d.cost * 2} onClick={() => a.restock(d.uid, 2)} title="Buy 2 more pieces">
                    +2 · {naira(d.cost * 2)}
                  </Btn>
                  {d.displayed ? (
                    <Btn size="sm" onClick={() => a.display(d.uid, false)}>Store</Btn>
                  ) : (
                    <Btn size="sm" tone="gold" disabled={used >= t.slots} onClick={() => a.display(d.uid, true)}>Display</Btn>
                  )}
                  <Btn size="sm" onClick={() => a.clear(d.uid)} title="Sell back to the market at half price">
                    Sell off
                  </Btn>
                </div>
              ))}
            </div>
          )}
        </Card>

        {t.staff > 0 && <StaffCard s={s} a={a} />}
      </div>

      <div className="space-y-4 min-w-0">
        <div className="hidden xl:block">
          <RentCard s={s} />
        </div>
        <Card title="Messages">
          {s.messages.length === 0 ? (
            <p className="text-sm text-slate-500">No messages.</p>
          ) : (
            <div className="space-y-2 max-h-[38vh] overflow-y-auto pr-1">
              {s.messages.slice(0, 12).map((m, i) => (
                <div key={i} className={`rounded-lg p-2.5 text-sm border ${m.tone === 'danger' ? 'border-rose-500/40 bg-rose-500/10' : m.tone === 'warn' ? 'border-amber-500/30 bg-amber-500/5' : m.tone === 'good' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}>
                  <div className="text-[11px] font-bold text-slate-400 mb-0.5">
                    {m.from} · day {m.day}
                  </div>
                  <div className="text-slate-100">{m.text}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Your shop">
          <div className="space-y-2 text-sm">
            <Bar label="Reputation" value={s.rep} max={100} tone={s.rep > 60 ? 'bg-emerald-400' : s.rep > 30 ? 'bg-amber-400' : 'bg-rose-400'} />
            <div className="flex justify-between"><span className="text-slate-400">Regular customers</span><span>{s.regulars.length}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Customers served so far</span><span>{s.stats.served}</span></div>
            {s.day - s.movedDay < 14 && s.movedDay > 0 && <div className="text-xs text-amber-300">New shop: customers are still finding you ({Math.round(50 + (50 * (s.day - s.movedDay)) / 14)}% of full traffic).</div>}
          </div>
          {next && upCost !== null && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-sm text-white font-semibold">Next: {next.name}</div>
              <div className="text-xs text-slate-400 mb-2">
                {next.slots} display spaces · rent {naira(next.rent)}/week · move-in {naira(upCost)}
                {next.staff ? ` · ${next.staff} staff` : ''}
              </div>
              <Bar value={Math.max(0, s.cash)} max={upCost + next.rent * 2} tone="bg-sky-400" />
              <div className="text-[11px] text-slate-500 mt-1">Bar = move-in plus two weeks of the new rent saved. Moving with no savings is how shops get demoted.</div>
              <Btn className="mt-2" tone="gold" size="sm" disabled={s.cash < upCost} onClick={() => setMoveOffer(landlordOffer())}>
                See the landlord
              </Btn>
            </div>
          )}
        </Card>
      </div>

      {moveOffer !== null && next && upCost !== null && (
        <Modal onClose={() => setMoveOffer(null)}>
          <h2 className="font-serif text-2xl font-bold text-white mb-1">{next.name}</h2>
          <p className="text-sm text-slate-400 mb-3">{next.blurb}</p>
          <ul className="text-sm space-y-1 mb-3">
            <li>Move-in: <b>{naira(upCost)}</b> (you have {naira(s.cash)})</li>
            <li>Rent: <b>{naira(next.rent)}</b> every 7 days</li>
            <li>Display: {next.slots} designs{next.staff ? ` · staff: ${next.staff}` : ''}{next.luxury ? ' · luxury suppliers' : ''}</li>
            <li>Landlord: <b>{graceText(moveOffer)}</b></li>
          </ul>
          {s.cash - upCost < next.rent * 2 && (
            <p className="text-sm text-rose-300 mb-3">Careful: after moving you'll have {naira(s.cash - upCost)}, less than two weeks of rent, and the first two weeks are quiet.</p>
          )}
          <div className="flex gap-2 justify-end">
            <Btn onClick={() => setMoveOffer(null)}>Not yet</Btn>
            <Btn
              tone="gold"
              onClick={() => {
                a.moveUp(moveOffer);
                setMoveOffer(null);
              }}
            >
              Sign and move
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

const StaffCard: React.FC<{ s: GameState; a: MorningActions }> = ({ s, a }) => {
  const t = TIERS[s.tier];
  const cands = candidates(s);
  const hiring = canHire(s);
  return (
    <Card title={`Staff · ${s.staff.length}/${t.staff}`}>
      <p className="text-xs text-slate-400 mb-3">Staff style low-budget and middle-class customers when you're busy. Trainees are cheap and grow loyal; experts are good from day one but leave for money.</p>
      <div className="space-y-2">
        {s.staff.map((m) => (
          <div key={m.id} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-white">
                  {m.name} <Pill tone={m.trained ? 'green' : 'gold'}>{m.trained ? 'Trained by you' : 'Expert'}</Pill>
                </div>
                <div className="text-[11px] text-slate-400">Level {m.level} · {naira(m.wage)}/week · {m.weeks} week{m.weeks === 1 ? '' : 's'} with you · market rate {naira(marketWage(m.level))}</div>
              </div>
              <div className="flex gap-1.5">
                <Btn size="sm" tone="green" disabled={m.level >= 10 || s.cash < STAFF.trainFee(m.level)} onClick={() => a.train(m.id)}>
                  Train · {naira(STAFF.trainFee(m.level))}
                </Btn>
                <Btn size="sm" onClick={() => a.fire(m.id)}>Let go</Btn>
              </div>
            </div>
            <div className="mt-2">
              <Bar label="Loyalty" value={m.loyalty} max={100} tone={m.loyalty > 60 ? 'bg-emerald-400' : m.loyalty > 30 ? 'bg-amber-400' : 'bg-rose-400'} />
            </div>
            {m.raiseAsk && (
              <div className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
                <div className="text-amber-200 mb-1.5">{m.name} wants {naira(m.raiseAsk)} a week, or she leaves.</div>
                <div className="flex gap-1.5">
                  <Btn size="sm" tone="gold" onClick={() => a.raise(m.id, 'accept')}>Accept</Btn>
                  <Btn size="sm" onClick={() => a.raise(m.id, 'counter')}>Offer {naira(Math.round((m.wage + m.raiseAsk) / 2 / 500) * 500)}</Btn>
                  <Btn size="sm" tone="danger" onClick={() => a.raise(m.id, 'refuse')}>Refuse</Btn>
                </div>
              </div>
            )}
          </div>
        ))}
        {s.staff.length < t.staff && (
          <div className="grid sm:grid-cols-2 gap-2">
            {cands.map((c) => (
              <div key={c.kind} className="rounded-lg border border-dashed border-white/20 p-2.5">
                <div className="text-sm font-semibold text-white">{c.name} · {c.kind === 'trainee' ? 'Trainee' : 'Expert'}</div>
                <div className="text-[11px] text-slate-400 mb-2">
                  Level {c.level} · {naira(c.wage)}/week · {c.kind === 'trainee' ? 'signing fee' : 'signing bonus'} {naira(c.signing)}
                </div>
                <Btn size="sm" tone="gold" disabled={!hiring || s.cash < c.signing} onClick={() => a.hire(c)}>
                  {hiring ? 'Hire' : `Next hire from day ${s.hireOkDay}`}
                </Btn>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
