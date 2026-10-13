import React, { useEffect } from 'react';
import { naira, TIERS } from '../economy';
import * as E from '../engine';
import type { GameState, PoliticianContract } from '../types';

const STATUS_LABEL: Record<PoliticianContract['status'], string> = {
  offered: 'New offer',
  accepted: 'In progress',
  fulfilled: 'Fulfilled',
  failed: 'Failed',
  declined: 'Declined',
  expired: 'Expired',
};

const STATUS_STYLE: Record<PoliticianContract['status'], string> = {
  offered: 'border-amber-300/30 bg-amber-400/10 text-amber-200',
  accepted: 'border-sky-300/30 bg-sky-400/10 text-sky-200',
  fulfilled: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200',
  failed: 'border-rose-300/30 bg-rose-400/10 text-rose-200',
  declined: 'border-white/10 bg-white/5 text-slate-400',
  expired: 'border-white/10 bg-white/5 text-slate-400',
};

export const ContractsApp: React.FC<{
  s: GameState;
  up: (f: (g: GameState) => GameState) => void;
  openShopper: () => void;
}> = ({ s, up, openShopper }) => {
  // Old saves predate this feature. Give them their first offer without resetting the save.
  useEffect(() => {
    if ((s.politicianContracts || []).length) return;
    const updated = E.ensurePoliticianContractOffer(s);
    if (updated !== s) up(() => updated);
  }, [s.day, s.politicianContracts?.length]);

  const contracts = [...(s.politicianContracts || [])].reverse();
  const active = contracts.find((contract) => contract.status === 'accepted');
  const offers = contracts.filter((contract) => contract.status === 'offered');
  const history = contracts.filter((contract) => !['offered', 'accepted'].includes(contract.status)).slice(0, 5);
  const tierName = TIERS[Math.max(0, Math.min(TIERS.length - 1, s.tier))]?.name || 'Boutique';

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#111] text-white">
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-800 px-3 py-3 shrink-0">
        <div className="text-lg font-bold">Politician Contracts</div>
        <div className="text-xs text-white/70 mt-0.5">Bulk orders from offices and public-event organisers</div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="rounded-xl bg-black/15 border border-white/10 p-2">
            <div className="text-[10px] uppercase tracking-wide text-white/60">Your boutique</div>
            <div className="font-semibold text-sm">{tierName}</div>
          </div>
          <div className="rounded-xl bg-black/15 border border-white/10 p-2">
            <div className="text-[10px] uppercase tracking-wide text-white/60">Available cash</div>
            <div className="font-semibold text-sm">{naira(s.cash)}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {active && (() => {
          const progress = E.politicianContractProgress(s, active);
          const remainingDays = Math.max(0, (active.deadlineDay || s.day) - s.day);
          return (
            <section key={active.id} className="rounded-xl border border-sky-300/25 bg-sky-400/[0.06] p-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-sky-200 font-bold">Accepted contract</div>
                  <div className="font-bold mt-1">{active.title}</div>
                  <div className="text-xs text-slate-400 mt-1">{active.client}</div>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${STATUS_STYLE[active.status]}`}>{STATUS_LABEL[active.status]}</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-300">{active.brief}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-black/20 p-2">
                  <div className="text-[10px] text-slate-400">Payment after delivery</div>
                  <div className="text-sm font-bold text-emerald-200">{naira(active.reward)}</div>
                </div>
                <div className="rounded-lg bg-black/20 p-2">
                  <div className="text-[10px] text-slate-400">Deadline</div>
                  <div className="text-sm font-bold">Day {active.deadlineDay}</div>
                  <div className="text-[10px] text-slate-400">{remainingDays === 0 ? 'Last day — deliver before closing' : `${remainingDays} day${remainingDays === 1 ? '' : 's'} remaining`}</div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">Stock ready for delivery</span>
                  <span className="text-slate-400">{progress.totalAvailable}/{progress.totalRequired} pieces</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${progress.totalRequired ? Math.min(100, progress.totalAvailable / progress.totalRequired * 100) : 0}%` }} />
                </div>
                <div className="divide-y divide-white/5">
                  {progress.requirements.map((row) => (
                    <div key={row.kind + '|' + row.itemId} className="py-2 flex items-center gap-2 text-xs">
                      <span className="min-w-0 flex-1">{row.label}</span>
                      <span className={row.remaining ? 'text-amber-200 shrink-0' : 'text-emerald-300 shrink-0'}>{row.available}/{row.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={openShopper} className="w-full rounded-full bg-violet-600 hover:bg-violet-500 py-2.5 text-sm font-bold">Send shopper for required goods →</button>
              <button
                disabled={!progress.complete || s.day > (active.deadlineDay || 0)}
                onClick={() => up((g) => E.deliverPoliticianContract(g, active.id))}
                className="w-full rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed py-2.5 text-sm font-bold"
              >
                {progress.complete ? `Deliver contract · receive ${naira(active.reward)}` : 'Stock required goods before delivery'}
              </button>
              <p className="text-[10px] leading-relaxed text-slate-500">Buying stock does not automatically complete the deal. Deliver here after every required product is in inventory. Missing the deadline costs money and reputation.</p>
            </section>
          );
        })()}

        {offers.map((contract) => (
          <section key={contract.id} className="rounded-xl border border-amber-300/20 bg-amber-400/[0.045] p-3 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-amber-200 font-bold">New offer · expires Day {contract.offerExpiresDay}</div>
                <div className="font-bold mt-1">{contract.title}</div>
                <div className="text-xs text-slate-400 mt-1">{contract.client}</div>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${STATUS_STYLE[contract.status]}`}>{STATUS_LABEL[contract.status]}</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">{contract.brief}</p>
            <div className="divide-y divide-white/5">
              {contract.requirements.map((row) => (
                <div key={row.kind + '|' + row.itemId} className="py-2 flex items-center gap-2 text-xs">
                  <span className="min-w-0 flex-1">{row.label}</span>
                  <span className="text-slate-400 shrink-0">×{row.quantity}</span>
                  <span className="font-semibold shrink-0">{naira(row.unitCost * row.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-black/20 p-2">
                <div className="text-[10px] text-slate-400">Payment on delivery</div>
                <div className="font-bold text-emerald-200">{naira(contract.reward)}</div>
              </div>
              <div className="rounded-lg bg-black/20 p-2">
                <div className="text-[10px] text-slate-400">Delivery window</div>
                <div className="font-bold">{contract.deadlineDays} days</div>
                <div className="text-[10px] text-slate-400">Starts when accepted</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => up((g) => E.declinePoliticianContract(g, contract.id))} className="flex-1 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 py-2.5 text-sm font-semibold">Decline</button>
              <button disabled={!!active} onClick={() => up((g) => E.acceptPoliticianContract(g, contract.id))} className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 py-2.5 text-sm font-bold">Accept contract</button>
            </div>
            <p className="text-[10px] text-slate-500">Accept only when you can source the required stock. Declining has no fee; late delivery triggers the stated penalty.</p>
          </section>
        ))}

        {!active && offers.length === 0 && (
          <section className="rounded-xl border border-white/10 bg-white/[0.035] p-4 text-center space-y-2">
            <div className="text-2xl">📄</div>
            <div className="font-semibold text-sm">No open contract offers</div>
            <p className="text-xs text-slate-400">New offers arrive every few in-game days. You never pay just to inspect or decline one.</p>
          </section>
        )}

        {history.length > 0 && (
          <section className="rounded-xl border border-white/10 bg-white/[0.035] p-3 space-y-2">
            <div className="font-semibold text-sm">Recent contract history</div>
            {history.map((contract) => (
              <div key={contract.id} className="border-b border-white/5 last:border-0 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs">{contract.title}</span>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${STATUS_STYLE[contract.status]}`}>{STATUS_LABEL[contract.status]}</span>
                </div>
                <div className="flex justify-between gap-2 text-[10px] text-slate-500 mt-1">
                  <span>{contract.client} · Day {contract.completedDay || contract.offeredDay}</span>
                  <span>{contract.status === 'fulfilled' ? naira(contract.reward) : contract.status === 'failed' ? `Fee ${naira(contract.penaltyCharged || contract.failurePenalty)}` : 'No payment'}</span>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
};
