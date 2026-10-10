import React, { useState } from 'react';
import { MARKUP, STAFF, TIERS, naira } from '../economy';
import { Candidate, RaiseAnswer, candidates, canHire, daysToRent, displayCap, displayedCount, listingsNow, marketWage, restockAllCost, stats, waitingRoom } from '../engine';
import { FURNITURE, FurnitureDef, Listing, furnitureById, wallCapacity, wallUsed } from '../shop';
import { GameState } from '../types';
import { Bar, Btn, Card, Modal, Pill, Swatch } from './kit';

const graceText = (g: number) => (g === 0 ? 'No grace: pay on the day' : `${g} day${g > 1 ? 's' : ''} of grace if late`);
export const Stars: React.FC<{ n: number }> = ({ n }) => <span className="text-amber-300 tracking-tight">{'★'.repeat(n)}<span className="text-slate-600">{'★'.repeat(Math.max(0, 4 - n))}</span></span>;

export const RentCard: React.FC<{ s: GameState; compact?: boolean }> = ({ s, compact }) => {
  const rent = s.listing.rent;
  const d = daysToRent(s.day);
  const short = s.cash < rent;
  return (
    <div className={`rounded-xl border p-3 backdrop-blur ${s.lateRent ? 'border-rose-500/60 bg-rose-950/80' : 'border-white/15 bg-[#12141c]/85'}`}>
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90">Rent</span>
        {s.lateRent ? <Pill tone="red">LATE</Pill> : d <= 2 ? <Pill tone="gold">Due soon</Pill> : null}
      </div>
      {s.lateRent ? (
        <div className="text-sm text-rose-200">
          You owe <b>{naira(Math.max(0, -s.cash))}</b>. Clear it by the end of <b>day {s.lateRent.due}</b> or you move down to a {TIERS[Math.max(0, s.tier - 1)].name}.
        </div>
      ) : (
        <div className="text-sm text-slate-200">
          <b className="text-white">{naira(rent)}</b> {d === 0 ? <b className="text-amber-300">tonight</b> : <>in <b>{d}</b> day{d > 1 ? 's' : ''}</>}
          {short && <span className="text-rose-300"> · short {naira(rent - s.cash)}</span>}
        </div>
      )}
      {!compact && <div className="text-[11px] text-slate-400 mt-0.5">{s.listing.landlord}: {graceText(s.grace)}</div>}
    </div>
  );
};

export const Messages: React.FC<{ s: GameState; n?: number }> = ({ s, n = 14 }) =>
  s.messages.length === 0 ? (
    <p className="text-sm text-slate-500">No messages.</p>
  ) : (
    <div className="space-y-2">
      {s.messages.slice(0, n).map((m, i) => (
        <div key={i} className={`rounded-lg p-2.5 text-sm border ${m.tone === 'danger' ? 'border-rose-500/40 bg-rose-500/10' : m.tone === 'warn' ? 'border-amber-500/30 bg-amber-500/5' : m.tone === 'good' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}>
          <div className="text-[11px] font-bold text-slate-400 mb-0.5">
            {m.from} · day {m.day}
          </div>
          <div className="text-slate-100">{m.text}</div>
        </div>
      ))}
    </div>
  );

// ---------------------------------------------------------------------------
// Rail: what's on display and in storage
// ---------------------------------------------------------------------------
export const RailPanel: React.FC<{ s: GameState; display: (uid: string, on: boolean) => void; restock: (uid: string, n: number) => void; restockAll: () => void; clear: (uid: string) => void }> = ({ s, display, restock, restockAll, clear }) => {
  const [tab, setTab] = useState<'display' | 'storage'>('display');
  const cap = displayCap(s);
  const shown = s.stock.filter((d) => d.displayed);
  const stored = s.stock.filter((d) => !d.displayed);
  const used = displayedCount(s);
  const restockCost = restockAllCost(s);
  const list = tab === 'display' ? shown : stored;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-slate-300">
          <b className="text-white">{used}/{cap}</b> on display
          {cap < TIERS[s.tier].slots && <span className="text-slate-500"> · buy rails or shelves for up to {TIERS[s.tier].slots}</span>}
        </div>
        <div className="flex gap-1.5">
          <Btn size="sm" tone={tab === 'display' ? 'gold' : 'ghost'} onClick={() => setTab('display')}>Display ({shown.length})</Btn>
          <Btn size="sm" tone={tab === 'storage' ? 'gold' : 'ghost'} onClick={() => setTab('storage')}>Storage ({stored.length})</Btn>
        </div>
      </div>
      <p className="text-xs text-slate-400">You can only style customers with what is on display.</p>
      {tab === 'display' && restockCost > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-white/5 p-2">
          <span className="text-xs text-slate-300">Some designs are sold out or low.</span>
          <Btn size="sm" tone="green" disabled={s.cash < restockCost} onClick={restockAll}>
            Restock all to 2 · {naira(restockCost)}
          </Btn>
        </div>
      )}
      {list.length === 0 ? (
        <p className="text-sm text-slate-500">{tab === 'display' ? 'Nothing on display. Go to the market.' : 'Storage is empty.'}</p>
      ) : (
        <div className="space-y-1.5">
          {list.map((d) => (
            <div key={d.uid} className={`flex flex-wrap items-center gap-2 p-2 rounded-lg border ${d.pieces === 0 ? 'border-rose-500/30 bg-rose-500/5' : 'border-white/10 bg-white/5'}`}>
              <Swatch d={d} />
              <div className="min-w-0 flex-1 basis-[55%]">
                <div className="text-sm font-semibold text-white truncate">{d.label}</div>
                <div className="text-[11px] text-slate-400">
                  {d.fabric !== 'plain' ? `${d.fabric} · ` : ''}cost {naira(d.cost)} · sells ~{naira(d.cost * MARKUP)} · {d.pieces === 0 ? <span className="text-rose-300">sold out</span> : `${d.pieces} left`}
                </div>
              </div>
              <div className="flex gap-1">
                <Btn size="sm" disabled={s.cash < d.cost * 2} onClick={() => restock(d.uid, 2)}>+2 · {naira(d.cost * 2)}</Btn>
                {d.displayed ? <Btn size="sm" onClick={() => display(d.uid, false)}>Store</Btn> : <Btn size="sm" tone="gold" disabled={used >= cap} onClick={() => display(d.uid, true)}>Display</Btn>}
                <Btn size="sm" onClick={() => clear(d.uid)} title="Sell back at half price">Sell off</Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Furniture: what the shop has, and the furniture store
// ---------------------------------------------------------------------------
export interface FurnitureActions {
  buy: (id: string) => void;
  move: (uid: string) => void;
  store: (uid: string) => void;
  sell: (uid: string) => void;
  install: (uid: string) => void;
}

export const ShopStatsCard: React.FC<{ s: GameState }> = ({ s }) => {
  const st = stats(s);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
      {[
        ['Prestige', `${st.prestige}`, `${s.listing.stars * 2} from location, ${st.furniturePrestige >= 0 ? '+' : ''}${st.furniturePrestige} inside`],
        ['Display', `${st.display}/${TIERS[s.tier].slots}`, 'designs'],
        ['Waiting room', `${waitingRoom(s)}`, 'people'],
        ['Mirror', st.mirror ? `+${st.mirror}` : '0', 'to every score'],
        ['Hair / makeup', `+${st.hairBonus} / +${st.makeupBonus}`, st.wigs ? 'wigs: yes' : 'wigs: need a hair station'],
        ['Comfort', st.generator ? 'Generator' : 'No generator', st.repBoost ? `rep +${Math.round(st.repBoost * 100)}%` : 'no fan or AC'],
      ].map(([k, v, n]) => (
        <div key={k} className="rounded-lg border border-white/10 bg-white/5 p-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">{k}</div>
          <div className="text-sm font-bold text-white">{v}</div>
          <div className="text-[10px] text-slate-500">{n}</div>
        </div>
      ))}
    </div>
  );
};

export const FurniturePanel: React.FC<{ s: GameState; a: FurnitureActions; selected: string | null }> = ({ s, a, selected }) => {
  const [tab, setTab] = useState<'mine' | 'store'>('mine');
  const groups = Array.from(new Set(FURNITURE.map((f) => f.group)));
  const [group, setGroup] = useState<FurnitureDef['group']>('Display');
  const wallLeft = wallCapacity(s.tier) - wallUsed(s.furniture);
  return (
    <div className="space-y-3">
      <ShopStatsCard s={s} />
      <div className="flex gap-1.5">
        <Btn size="sm" tone={tab === 'mine' ? 'gold' : 'ghost'} onClick={() => setTab('mine')}>In your shop ({s.furniture.length})</Btn>
        <Btn size="sm" tone={tab === 'store' ? 'gold' : 'ghost'} onClick={() => setTab('store')}>Furniture store</Btn>
      </div>
      {tab === 'mine' ? (
        <div className="space-y-1.5">
          <p className="text-xs text-slate-400">Tap a piece in the shop to select it. Move puts it under your finger: tap a free spot to drop it. The front row is the walkway.</p>
          {s.furniture.map((p) => {
            const f = furnitureById(p.id);
            return (
              <div key={p.uid} className={`flex flex-wrap items-center gap-2 p-2 rounded-lg border ${selected === p.uid ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 bg-white/5'}`}>
                <div className="min-w-0 flex-1 basis-[50%]">
                  <div className="text-sm font-semibold text-white">{f.name} {!p.placed && <Pill tone="grey">in storage</Pill>}</div>
                  <div className="text-[11px] text-slate-400">{f.note} {f.prestige ? `Prestige ${f.prestige > 0 ? '+' : ''}${f.prestige}.` : ''}</div>
                </div>
                <div className="flex gap-1">
                  {p.placed && f.mount === 'floor' && <Btn size="sm" onClick={() => a.move(p.uid)}>Move</Btn>}
                  {p.placed ? <Btn size="sm" onClick={() => a.store(p.uid)}>Store</Btn> : <Btn size="sm" tone="gold" onClick={() => a.install(p.uid)}>Put in shop</Btn>}
                  <Btn size="sm" onClick={() => a.sell(p.uid)} title="40% back">Sell · {naira(f.price * 0.4)}</Btn>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {groups.map((g) => (
              <Btn key={g} size="sm" tone={group === g ? 'gold' : 'ghost'} onClick={() => setGroup(g)}>{g}</Btn>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">Wall space left: {wallLeft} m.</p>
          {FURNITURE.filter((f) => f.group === group && !f.starter).map((f) => {
            const locked = (f.minTier || 0) > s.tier;
            return (
              <div key={f.id} className={`flex items-center gap-2 p-2 rounded-lg border border-white/10 bg-white/5 ${locked ? 'opacity-50' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">
                    {f.name} <span className="text-[11px] text-slate-400">· {f.w}×{f.d} {f.mount === 'wall' ? 'on the wall' : f.mount === 'ceiling' ? 'ceiling' : 'floor'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{f.note} {f.prestige ? `Prestige +${f.prestige}.` : ''}</div>
                </div>
                <Btn size="sm" tone="gold" disabled={locked || s.cash < f.price} onClick={() => a.buy(f.id)}>
                  {locked ? `Needs ${TIERS[f.minTier || 0].name}` : naira(f.price)}
                </Btn>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Moving: four listings at the next size
// ---------------------------------------------------------------------------
export const MovePanel: React.FC<{ s: GameState; onMove: (l: Listing) => void }> = ({ s, onMove }) => {
  const [pick, setPick] = useState<Listing | null>(null);
  const list = listingsNow(s);
  const next = TIERS[s.tier + 1];
  if (!next) return <p className="text-sm text-slate-300">You're in the flagship. There's nowhere bigger in Lagos.</p>;
  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-300">
        Now: <b className="text-white">{TIERS[s.tier].name}</b>, {s.listing.street}, {s.listing.area} <Stars n={s.listing.stars} /> · rent {naira(s.listing.rent)}
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
        <b className="text-white">{next.name}</b>: holds up to {next.slots} designs{next.staff ? `, ${next.staff} staff` : ''}{next.luxury ? ', luxury suppliers' : ''}. Your furniture comes with you; buy more rails to fill the bigger room. Listings change every week.
      </div>
      {list.map((l) => {
        const after = s.cash - l.moveIn;
        const risky = after < l.rent * 2;
        return (
          <div key={l.id} className="rounded-xl border border-white/10 bg-[#15171f] p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-white">{l.street}</div>
                <div className="text-[11px] text-slate-400">{l.area} · <Stars n={l.stars} /></div>
              </div>
              <Btn size="sm" tone="gold" disabled={s.cash < l.moveIn} onClick={() => setPick(l)}>
                {s.cash < l.moveIn ? `Need ${naira(l.moveIn)}` : 'View'}
              </Btn>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
              <div><div className="text-slate-500">Rent/week</div><div className="text-white font-semibold">{naira(l.rent)}</div></div>
              <div><div className="text-slate-500">Move-in</div><div className="text-white font-semibold">{naira(l.moveIn)}</div></div>
              <div><div className="text-slate-500">Landlord</div><div className={`font-semibold ${l.grace === 0 ? 'text-rose-300' : 'text-white'}`}>{l.grace === 0 ? 'No grace' : `${l.grace}d grace`}</div></div>
            </div>
            {s.cash >= l.moveIn && risky && <div className="text-[11px] text-rose-300 mt-1">After moving you'd have {naira(after)}: less than two weeks of rent.</div>}
          </div>
        );
      })}
      {pick && (
        <Modal onClose={() => setPick(null)}>
          <h2 className="font-serif text-2xl font-bold text-white">{pick.street}</h2>
          <p className="text-sm text-slate-400 mb-3">{pick.area} · {next.name} · <Stars n={pick.stars} /></p>
          <ul className="text-sm space-y-1 mb-3">
            <li>Move-in: <b>{naira(pick.moveIn)}</b> (you have {naira(s.cash)})</li>
            <li>Rent: <b>{naira(pick.rent)}</b> every 7 days</li>
            <li>Landlord: <b>{pick.landlord}</b>, {graceText(pick.grace)}</li>
            <li>Prestige from location: <b>{pick.stars * 2}</b> (more customers, more rich ones)</li>
          </ul>
          {s.cash - pick.moveIn < pick.rent * 2 && <p className="text-sm text-rose-300 mb-3">Careful: the first two weeks in a new shop are quiet, and you'd have less than two weeks of rent saved.</p>}
          <div className="flex gap-2 justify-end">
            <Btn onClick={() => setPick(null)}>Not yet</Btn>
            <Btn tone="gold" onClick={() => { onMove(pick); setPick(null); }}>Sign and move</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------
export interface StaffActions {
  hire: (c: Candidate) => void;
  train: (id: string) => void;
  fire: (id: string) => void;
  raise: (id: string, a: RaiseAnswer) => void;
}

export const StaffPanel: React.FC<{ s: GameState; a: StaffActions }> = ({ s, a }) => {
  const t = TIERS[s.tier];
  if (!t.staff) return <p className="text-sm text-slate-300">Staff unlock when you move into a Boutique.</p>;
  const cands = candidates(s);
  const hiring = canHire(s);
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">{s.staff.length}/{t.staff} hired. Staff style low-budget and middle-class customers when you're busy. Trainees are cheap and grow loyal; experts are good from day one but leave for money.</p>
      {s.staff.map((m) => (
        <div key={m.id} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-white">{m.name} <Pill tone={m.trained ? 'green' : 'gold'}>{m.trained ? 'Trained by you' : 'Expert'}</Pill></div>
              <div className="text-[11px] text-slate-400">Level {m.level} · {naira(m.wage)}/week · {m.weeks} wk · market {naira(marketWage(m.level))}</div>
            </div>
            <div className="flex gap-1.5">
              <Btn size="sm" tone="green" disabled={m.level >= 10 || s.cash < STAFF.trainFee(m.level)} onClick={() => a.train(m.id)}>Train · {naira(STAFF.trainFee(m.level))}</Btn>
              <Btn size="sm" onClick={() => a.fire(m.id)}>Let go</Btn>
            </div>
          </div>
          <div className="mt-2"><Bar label="Loyalty" value={m.loyalty} max={100} tone={m.loyalty > 60 ? 'bg-emerald-400' : m.loyalty > 30 ? 'bg-amber-400' : 'bg-rose-400'} /></div>
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
              <div className="text-[11px] text-slate-400 mb-2">Level {c.level} · {naira(c.wage)}/week · {c.kind === 'trainee' ? 'signing fee' : 'signing bonus'} {naira(c.signing)}</div>
              <Btn size="sm" tone="gold" disabled={!hiring || s.cash < c.signing} onClick={() => a.hire(c)}>{hiring ? 'Hire' : `Next hire from day ${s.hireOkDay}`}</Btn>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export { Card };
