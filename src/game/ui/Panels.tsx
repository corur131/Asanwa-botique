import React, { Suspense, lazy, useState } from 'react';
import { MARKUP, STAFF, TIERS, naira } from '../economy';
import { POWER, contestFor, fuelOf, fuelPerHour, tankSize, Candidate, RaiseAnswer, candidates, canHire, daysToRent, displayCap, displayedCount, listingsNow, marketWage, restockAllCost, stats, waitingRoom } from '../engine';
import { FURNITURE, FURNITURE_GROUPS, FurnitureDef, FurnitureGroup, Listing, ceilingCapacity, ceilingUsed, finishes, furnitureById, roomOf, wallCapacity, wallUsed } from '../shop';

const FurniturePreview = lazy(() => import('../scene/Previews').then((m) => ({ default: m.FurniturePreview })));
const RoomPreview = lazy(() => import('../scene/Previews').then((m) => ({ default: m.RoomPreview })));
const Loading = () => <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">Loading picture…</div>;
import { GameState, StaffProfession } from '../types';
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
          {used >= cap && <span className="text-slate-500"> · full: buy another rail or shelf for more space</span>}
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
                <Btn size="sm" disabled={s.cash < d.cost} onClick={() => restock(d.uid, 1)}>+1 · {naira(d.cost)}</Btn>
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
  const pct = (v: number) => `+${Math.round(v * 100)}%`;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
      {[
        ['Prestige', `${st.prestige}`, `${s.listing.stars * 2} from location, ${st.furniturePrestige >= 0 ? '+' : ''}${st.furniturePrestige} inside (max ${4 + s.tier * 4} here)`],
        ['Display', `${displayedCount(s)}/${st.display}`, 'items out on rails and shelves'],
        ['Waiting room', `${waitingRoom(s)}`, `people · they wait ${pct(Math.min(0.4, 0.1 * st.seats) + st.patience)} longer`],
        ['Look bonus', `+${st.mirror + st.scoreBonus}`, `mirror +${st.mirror}${st.scoreBonus ? `, steamer/lights +${st.scoreBonus}` : ''}`],
        ['Hair / makeup', `+${st.hairBonus} / +${st.makeupBonus}`, st.wigs ? 'wigs: yes' : 'wigs: need a hair station'],
        ['Cooling', st.cool ? pct(st.cool) : 'Hot', st.cool ? 'off in blackouts unless solar or gen' : 'buy a fan or AC: customers complain of heat'],
        ['Power', st.solarPanels ? `${st.solarPanels} solar` : st.gen ? 'Generator' : 'NEPA only', `${st.gen ? `${st.gen === 'big' ? 'big' : 'small'} gen (${fuelPerHour(s)} L/hr, ${Math.round(fuelOf(s) * 10) / 10}/${tankSize(s)} L)` : 'no gen'} · solar ${Math.round(s.power?.solar || 0)}/${st.solarPanels * POWER.minutesPerPanel} min${st.solarPanels >= POWER.acPanels ? ' · runs AC' : ''}`],
        ['Walk-ins', st.traffic ? pct(st.traffic) : '+0%', 'signs, music, window display'],
        ['Tips', st.tipBonus ? pct(st.tipBonus) : '+0%', 'counter, scent'],
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

const where = (f: FurnitureDef) => (f.mount === 'finish' ? 'whole shop' : f.mount === 'wall' ? `${f.w} m of wall` : f.mount === 'ceiling' ? 'ceiling' : `${f.w}×${f.d} m floor`);

export const FurniturePanel: React.FC<{ s: GameState; a: FurnitureActions; selected: string | null }> = ({ s, a, selected }) => {
  const [tab, setTab] = useState<'mine' | 'store'>('mine');
  const [group, setGroup] = useState<FurnitureGroup>('Display');
  const [look, setLook] = useState<string | null>(null);
  const [bought, setBought] = useState<{ n: number; name: string } | null>(null);
  const wallLeft = wallCapacity(s.listing) - wallUsed(s.furniture);
  const ceilLeft = ceilingCapacity(s.listing) - ceilingUsed(s.furniture);
  const st = stats(s);
  const fin = finishes(s.furniture);
  const last = bought && s.furniture.length >= bought.n ? s.furniture[s.furniture.length - 1] : null;
  const buy = (f: FurnitureDef) => {
    setBought({ n: s.furniture.length, name: f.name });
    a.buy(f.id);
  };
  const mine = s.furniture.filter((p) => furnitureById(p.id).mount !== 'finish');
  return (
    <div className="space-y-3">
      <ShopStatsCard s={s} />
      <div className="flex gap-1.5">
        <Btn size="sm" tone={tab === 'mine' ? 'gold' : 'ghost'} onClick={() => setTab('mine')}>In your shop ({mine.length})</Btn>
        <Btn size="sm" tone={tab === 'store' ? 'gold' : 'ghost'} onClick={() => setTab('store')}>Furniture store</Btn>
      </div>
      {tab === 'mine' ? (
        <div className="space-y-1.5">
          <p className="text-xs text-slate-400">Drag any piece on the floor to move it, or tap it and use Rotate. You can't block the walkway at the front or wall off part of the floor.</p>
          <p className="text-[11px] text-slate-500">Walls: {fin.paint ? fin.paint.name : 'as you found them'} · Floor: {fin.floor ? fin.floor.name : 'as you found it'}</p>
          {mine.map((p) => {
            const f = furnitureById(p.id);
            return (
              <div key={p.uid} className={`flex flex-wrap items-center gap-2 p-2 rounded-lg border ${selected === p.uid ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 bg-white/5'}`}>
                <div className="min-w-0 flex-1 basis-[50%]">
                  <div className="text-sm font-semibold text-white">{f.name} {!p.placed && <Pill tone="grey">in storage</Pill>}</div>
                  <div className="text-[11px] text-slate-400">{f.note}</div>
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
            {FURNITURE_GROUPS.map((g) => (
              <Btn key={g} size="sm" tone={group === g ? 'gold' : 'ghost'} onClick={() => { setGroup(g); setLook(null); }}>{g}</Btn>
            ))}
          </div>
          {last && bought && (
            <div className={`rounded-lg p-2 text-xs ${last.placed ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200' : 'bg-amber-500/10 border border-amber-500/30 text-amber-200'}`}>
              {last.placed ? `${bought.name} is in your shop. Drag it wherever you want.` : `${bought.name} is in storage: no free spot for it. Move or store something, then tap "Put in shop" in the other tab.`}
            </div>
          )}
          <p className="text-[11px] text-slate-500">
            Tap a piece to see it. Free wall: {wallLeft} m · ceiling: {ceilLeft} spot{ceilLeft === 1 ? '' : 's'}.
            {group === 'Paint & floor' && ' New paint covers the old paint; new flooring replaces the old floor. They stay behind if you move shop.'}
          </p>
          {FURNITURE.filter((f) => f.group === group && !f.starter).map((f) => {
            const locked = (f.minTier || 0) > s.tier;
            const open = look === f.id;
            const current = f === fin.paint || f === fin.floor;
            return (
              <div key={f.id} className={`rounded-lg border ${open ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 bg-white/5 hover:border-white/25'} ${locked ? 'opacity-60' : ''}`}>
                <div onClick={() => setLook(open ? null : f.id)} className="cursor-pointer flex items-center gap-2 p-2">
                  {f.paint && <span className="w-7 h-7 rounded-md border border-white/20 shrink-0" style={{ background: `linear-gradient(${f.paint[0]} 60%, ${f.paint[1]} 60%)` }} />}
                  {f.floorTiles && <span className="w-7 h-7 rounded-md border border-white/20 shrink-0" style={{ background: `repeating-conic-gradient(${f.floorTiles[0]} 0 25%, ${f.floorTiles[1]} 0 50%) 0 0/14px 14px` }} />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white">
                      {f.name} <span className="text-[11px] text-slate-400">· {where(f)}</span> {current && <Pill tone="green">in your shop</Pill>}
                    </div>
                    <div className="text-[11px] text-slate-400">{f.note}{f.prestige > 0 ? ` Prestige +${f.prestige}.` : ''}</div>
                  </div>
                  <span className="text-xs font-semibold text-amber-200 shrink-0">{locked ? `${TIERS[f.minTier || 0].name}+` : naira(f.price)}</span>
                </div>
                {open && (
                  <div className="border-t border-white/10">
                    {f.mount !== 'finish' && (
                      <div className="h-44">
                        <Suspense fallback={<Loading />}>
                          <FurniturePreview id={f.id} />
                        </Suspense>
                      </div>
                    )}
                    <div className="p-2.5 space-y-1">
                      {!!f.slots && <div className="text-[11px] text-emerald-300">Adds {f.slots} display spaces: {st.display} → {st.display + f.slots}.</div>}
                      {f.mount === 'wall' && f.w > wallLeft && <div className="text-[11px] text-amber-300">Not enough free wall: it will go to storage.</div>}
                      {f.mount === 'ceiling' && ceilLeft <= 0 && <div className="text-[11px] text-amber-300">The ceiling is full: it will go to storage.</div>}
                      <Btn className="w-full" tone="gold" disabled={locked || current || s.cash < f.price} onClick={() => buy(f)}>
                        {locked ? `Needs a ${TIERS[f.minTier || 0].name}` : current ? 'Already in your shop' : s.cash < f.price ? `Need ${naira(f.price)}` : `Buy · ${naira(f.price)}`}
                      </Btn>
                    </div>
                  </div>
                )}
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
        <b className="text-white">{next.name}</b>: bigger, better listings are roomier and hold more{next.staff ? `, ${next.staff} staff` : ''}{next.luxury ? ', luxury suppliers' : ''}. Your furniture comes with you; buy more rails to fill the bigger room. Listings change every week.
      </div>
      {list.map((l0) => {
        const fight = contestFor(s, l0);
        const l = fight ? { ...l0, moveIn: l0.moveIn + fight.extra } : l0;
        const after = s.cash - l.moveIn;
        const risky = after < l.rent * 2;
        return (
          <div key={l.id} className="rounded-xl border border-white/10 bg-[#15171f] p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-white">{l.street} {l.signature && <Pill tone="gold">✦ SIGNATURE</Pill>}</div>
                <div className="text-[11px] text-slate-400">{l.area} · <Stars n={l.stars} /> · {roomOf(l).w}×{roomOf(l).d} m floor {l.signature && <Pill tone="gold">SIGNATURE</Pill>}</div>
              </div>
              <Btn size="sm" tone="gold" onClick={() => setPick(l0)}>View</Btn>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
              <div><div className="text-slate-500">Rent/week</div><div className="text-white font-semibold">{naira(l.rent)}</div></div>
              <div><div className="text-slate-500">Move-in</div><div className="text-white font-semibold">{naira(l.moveIn)}</div></div>
              <div><div className="text-slate-500">Landlord</div><div className={`font-semibold ${l.grace === 0 ? 'text-rose-300' : 'text-white'}`}>{l.grace === 0 ? 'No grace' : `${l.grace}d grace`}</div></div>
            </div>
            {fight && <div className="text-[11px] text-amber-300 mt-1">⚔ {fight.rival.owner} ({fight.rival.shop}) wants this shop too. To get it you must outbid {fight.rival.male ? 'him' : 'her'} by {naira(fight.extra)} (included above). {fight.rival.male ? "He" : 'She'} won't be happy.</div>}
            {s.cash >= l.moveIn && risky && <div className="text-[11px] text-rose-300 mt-1">After moving you'd have {naira(after)}: less than two weeks of rent.</div>}
          </div>
        );
      })}
      {pick && (
        <Modal onClose={() => setPick(null)}>
          <div className="h-56 -mx-1 mb-3 rounded-xl overflow-hidden">
            <Suspense fallback={<Loading />}>
              <RoomPreview tier={pick.tier} stars={pick.stars} signature={pick.signature} />
            </Suspense>
          </div>
          <h2 className="font-serif text-2xl font-bold text-white">{pick.street}</h2>
          <p className="text-sm text-slate-400 mb-3">{pick.area} · {next.name} · <Stars n={pick.stars} /> {pick.signature && <Pill tone="gold">SIGNATURE PROPERTY</Pill>}</p>
          <ul className="text-sm space-y-1 mb-3">
            <li>Floor: <b>{roomOf(pick).w}×{roomOf(pick).d} m</b>, {wallCapacity(pick)} m of wall{pick.stars === 1 ? ', tired and in need of paint' : pick.stars === 4 ? ', freshly done with a feature wall' : ''}</li>
            <li>Move-in: <b>{naira(pick.moveIn + (contestFor(s, pick)?.extra || 0))}</b> (you have {naira(s.cash)}){contestFor(s, pick) ? `, outbidding ${contestFor(s, pick)!.rival.owner}` : ''}</li>
            <li>Rent: <b>{naira(pick.rent)}</b> every 7 days</li>
            <li>Landlord: <b>{pick.landlord}</b>, {graceText(pick.grace)}</li>
            <li>Prestige from location: <b>{pick.stars * 2}</b> (more customers, more rich ones)</li>
            {pick.signature && <li className="text-amber-200">Signature benefits: extra customer traffic, rich-only walk-ins, much larger tips, celebrity visits with multi-million-naira spending, trending posts and large follower gains. Celebrity frequency is rare by design.</li>}
          </ul>
          {s.cash - pick.moveIn < pick.rent * 2 && <p className="text-sm text-rose-300 mb-3">Careful: the first two weeks in a new shop are quiet, and you'd have less than two weeks of rent saved.</p>}
          <div className="flex gap-2 justify-end">
            <Btn onClick={() => setPick(null)}>Not yet</Btn>
            <Btn tone="gold" disabled={s.cash < pick.moveIn + (contestFor(s, pick)?.extra || 0)} onClick={() => { onMove(pick); setPick(null); }}>{s.cash < pick.moveIn + (contestFor(s, pick)?.extra || 0) ? `Need ${naira(pick.moveIn + (contestFor(s, pick)?.extra || 0))}` : 'Sign and move'}</Btn>
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
  const [profession, setProfession] = useState<StaffProfession>('stylist');
  if (!t.staff) return <p className="text-sm text-slate-300">Staff unlock when you move into a Boutique.</p>;
  const cands = candidates(s, profession);
  const hiring = canHire(s);
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">{s.staff.length}/{t.staff} hired. Staff style low-budget and middle-class customers when you're busy. Trainees are cheap and grow loyal; experts are good from day one but leave for money.</p>
      {s.staff.map((m) => (
        <div key={m.id} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-white">{m.name} <Pill tone={m.trained ? 'green' : 'gold'}>{m.trained ? 'Trained by you' : 'Expert'}</Pill></div>
              <div className="text-[11px] text-slate-400">{m.profession === 'makeup' ? 'Makeup artist' : 'Hair & styling'} · Level {m.level} · {naira(m.wage)}/week · {m.weeks} wk · market {naira(marketWage(m.level))}</div>
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
        <div className="space-y-2">
        <label className="block text-xs text-slate-300">Profession to hire
          <select value={profession} onChange={(e) => setProfession(e.target.value as StaffProfession)} className="mt-1 block w-full rounded-lg border border-white/15 bg-[#181b24] p-2 text-sm text-white">
            <option value="stylist">Hair stylist / styling</option>
            <option value="makeup">Makeup artist</option>
          </select>
        </label>
        <div className="grid sm:grid-cols-2 gap-2">
          {cands.map((c) => (
            <div key={c.kind} className="rounded-lg border border-dashed border-white/20 p-2.5">
              <div className="text-sm font-semibold text-white">{c.name} · {c.kind === 'trainee' ? 'Trainee' : 'Expert'}</div>
              <div className="text-[11px] text-amber-200">{c.profession === 'makeup' ? 'Makeup artist' : 'Hair & styling'}</div>
              <div className="text-[11px] text-slate-400 mb-2">Level {c.level} · {naira(c.wage)}/week · {c.kind === 'trainee' ? 'signing fee' : 'signing bonus'} {naira(c.signing)}</div>
              <Btn size="sm" tone="gold" disabled={!hiring || s.cash < c.signing} onClick={() => a.hire(c)}>{hiring ? 'Hire now' : 'No staff slots available'}</Btn>
            </div>
          ))}
        </div>
        </div>
      )}
    </div>
  );
};

export { Card };
