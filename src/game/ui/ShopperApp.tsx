import React, { useState } from 'react';
import { naira, TIERS } from '../economy';
import * as E from '../engine';
import { entryFor } from '../market';
import type { GameState, ShopperMission } from '../types';
import { prepareShopperOrder, SHOPPER_MISSIONS, shopperAvailableBudget, shopperPriceCeiling } from '../shopper';
import type { CartLine } from '../engine';

export const ShopperApp: React.FC<{
  s: GameState;
  up: (f: (g: GameState) => GameState) => void;
  cart: CartLine[];
  openMarket: () => void;
}> = ({ s, up, cart, openMarket }) => {
  const available = shopperAvailableBudget(s, cart);
  const [mission, setMission] = useState<ShopperMission>('restock');
  const [budget, setBudget] = useState<number>(() => Math.min(500_000, available));
  const [brief, setBrief] = useState('');
  const [error, setError] = useState('');
  const [latestJobId, setLatestJobId] = useState<string | null>(null);
  const recentJobs = [...(s.shopperJobs || [])].slice(-5).reverse();
  const latestJob = recentJobs.find((job) => job.id === latestJobId) || recentJobs[0];
  const selectedMission = SHOPPER_MISSIONS.find((m) => m.id === mission) || SHOPPER_MISSIONS[0];

  const sendShopper = () => {
    const result = prepareShopperOrder(s, mission, budget, brief);
    if (!result.job) {
      setError(result.error || 'The shopper could not prepare an order.');
      return;
    }
    up(() => result.state);
    setLatestJobId(result.job.id);
    setError('');
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#111] text-white">
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 px-3 py-3 shrink-0">
        <div className="text-lg font-bold">Yaba Mart Shopper</div>
        <div className="text-xs text-white/75 mt-0.5">A business-minded buyer for your boutique</div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="rounded-xl bg-black/15 border border-white/10 p-2">
            <div className="text-[10px] uppercase tracking-wide text-white/60">Your boutique</div>
            <div className="font-semibold text-sm">{TIERS[Math.max(0, Math.min(4, s.tier))]?.name || 'Boutique'}</div>
          </div>
          <div className="rounded-xl bg-black/15 border border-white/10 p-2">
            <div className="text-[10px] uppercase tracking-wide text-white/60">Spendable for a new order</div>
            <div className="font-semibold text-sm">{naira(available)}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        <section className="rounded-xl border border-white/10 bg-white/[0.035] p-3 space-y-3">
          <div>
            <div className="font-semibold text-sm">1. Give your shopper a mission</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Recommendations change with your boutique level, customer mix and recorded product sales.</div>
          </div>
          <div className="space-y-1.5">
            {SHOPPER_MISSIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setMission(option.id)}
                className={`w-full text-left rounded-lg border p-2.5 transition-colors ${mission === option.id ? 'border-violet-400 bg-violet-500/15' : 'border-white/10 bg-black/10 hover:bg-white/5'}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${mission === option.id ? 'border-violet-300' : 'border-white/35'}`}>
                    {mission === option.id && <span className="w-2 h-2 rounded-full bg-violet-300" />}
                  </span>
                  <span className="font-semibold text-sm">{option.label}</span>
                </div>
                <div className="text-[11px] text-slate-400 pl-6 mt-1">{option.description}</div>
              </button>
            ))}
          </div>

          {mission === 'contract' && (
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-200">Contract sourcing brief</span>
              <textarea value={brief} onChange={(e) => setBrief(e.target.value)} maxLength={240} rows={2} placeholder="e.g. men's native wear, aso-oke outfits, bridesmaid dresses" className="w-full rounded-lg bg-black/25 border border-white/15 px-3 py-2 text-sm placeholder:text-slate-500 outline-none focus:border-violet-400" />
              <span className="block text-[10px] text-slate-500">This first version matches the brief to Yaba Mart catalogue names and categories. Formal contract offers, rewards and deadlines are a separate feature.</span>
            </label>
          )}

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-200">Maximum shopping budget</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₦</span>
              <input
                type="number"
                min={1000}
                max={available}
                step={1000}
                value={budget}
                onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-lg bg-black/25 border border-white/15 pl-7 pr-3 py-2 text-sm outline-none focus:border-violet-400"
              />
            </div>
            <div className="text-[10px] text-slate-500">The shopper cannot reserve more than your available cash after the existing cart is accounted for. Nothing is charged until you check out.</div>
          </label>

          <div className="rounded-lg bg-black/20 border border-white/5 px-3 py-2">
            <div className="text-[10px] text-slate-400">Current mission price guidance</div>
            <div className="text-sm font-semibold">{mission === 'contract' ? 'Based on the contract brief and budget' : `About ${naira(shopperPriceCeiling(s, mission))} retail per item`}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">This is a recommendation guardrail, not a promise that customers will buy every item.</div>
          </div>

          {error && <div role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-2.5 text-xs text-rose-200">{error}</div>}
          <button onClick={sendShopper} disabled={available < 1000 || budget < 1000 || budget > available || (mission === 'contract' && !brief.trim())} className="w-full rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed py-2.5 text-sm font-bold">
            Send shopper · up to {naira(Math.min(budget, available))}
          </button>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.035] p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-semibold text-sm">2. Review the returned order</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Every item is from the real catalogue and has been checked against your tier.</div>
            </div>
            <span className="text-lg">🛍️</span>
          </div>
          {!latestJob ? (
            <div className="rounded-lg bg-black/15 p-4 text-center text-xs text-slate-500">No shopper orders yet. Choose a mission above to prepare your first order.</div>
          ) : (
            <div className="rounded-lg border border-violet-400/25 bg-violet-500/[0.08] p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-sm">{SHOPPER_MISSIONS.find((m) => m.id === latestJob.mission)?.label || 'Shopper order'}</div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${latestJob.status === 'purchased' ? 'bg-emerald-500/15 text-emerald-300' : latestJob.status === 'cancelled' ? 'bg-rose-500/15 text-rose-300' : 'bg-violet-500/15 text-violet-200'}`}>{latestJob.status === 'purchased' ? 'Purchased' : latestJob.status === 'cancelled' ? 'Cancelled' : 'Ready in cart'}</span>
              </div>
              <div className="text-xs text-slate-300">{latestJob.summary}</div>
              <div className="divide-y divide-white/5">
                {latestJob.items.slice(0, 8).map((line) => (
                  <div key={line.key} className="py-1.5 flex items-center gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate">{entryFor(line.kind, line.itemId)?.label || line.itemId}</span>
                    <span className="text-slate-400 shrink-0">×{line.pieces}</span>
                    <span className="font-semibold shrink-0">{naira(E.cartLineCost(line))}</span>
                  </div>
                ))}
                {latestJob.items.length > 8 && <div className="pt-1 text-[10px] text-slate-400">+ {latestJob.items.length - 8} more product lines in Yaba Mart</div>}
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-2">
                <span className="text-xs text-slate-400">Estimated order total</span>
                <span className="font-bold">{naira(latestJob.estimatedTotal)}</span>
              </div>
              <button onClick={openMarket} className="w-full rounded-full bg-orange-500 hover:bg-orange-400 py-2.5 text-sm font-bold">Open Yaba Mart to review cart →</button>
            </div>
          )}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-400">Current Yaba Mart cart</span>
            <button onClick={openMarket} className="font-semibold text-orange-300 hover:text-orange-200">{cart.reduce((sum, line) => sum + line.pieces, 0)} pieces · {naira(E.cartTotal(cart))} →</button>
          </div>
        </section>

        {recentJobs.length > 1 && (
          <section className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
            <div className="font-semibold text-sm mb-2">Recent shopper activity</div>
            <div className="space-y-2">
              {recentJobs.slice(1).map((job) => (
                <button key={job.id} onClick={() => setLatestJobId(job.id)} className={`w-full text-left rounded-lg p-2 border ${latestJobId === job.id ? 'border-violet-400/50 bg-violet-500/10' : 'border-white/5 bg-black/10'}`}>
                  <div className="flex justify-between gap-2">
                    <span className="text-xs font-semibold truncate">{SHOPPER_MISSIONS.find((m) => m.id === job.mission)?.label || 'Shopper order'}</span>
                    <span className="text-[10px] text-slate-400">Day {job.completedDay}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{job.items.length} lines · {naira(job.estimatedTotal)}</div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
