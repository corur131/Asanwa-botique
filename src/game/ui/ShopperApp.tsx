import React, { useState } from 'react';
import { naira, TIERS } from '../economy';
import * as E from '../engine';
import { entryFor } from '../market';
import type { GameState, ShopperAudience, ShopperBuyingPreference, ShopperDressRank, ShopperMission, ShopperPriceBand } from '../types';
import {
  SHOPPER_NAME, prepareShopperOrder, SHOPPER_MISSIONS, SHOPPER_PREFERENCE_CATEGORIES,
  shopperAvailableBudget, shopperPriceCeiling,
} from '../shopper';
import type { CartLine } from '../engine';

export const ShopperApp: React.FC<{
  s: GameState;
  up: (f: (g: GameState) => GameState) => void;
  cart: CartLine[];
  openMarket: () => void;
  openContracts: () => void;
}> = ({ s, up, cart, openMarket, openContracts }) => {
  const available = shopperAvailableBudget(s, cart);
  // If this save has not recorded item-level demand yet, start with variety; restocking becomes smarter as new sales are recorded.
  const [mission, setMission] = useState<ShopperMission>(() => (s.productSales || []).length ? 'restock' : 'variety');
  const [budget, setBudget] = useState<number>(() => Math.min(500_000, available));
  const [contractId, setContractId] = useState('');
  const [shoppingExamples, setShoppingExamples] = useState('');
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferenceAudience, setPreferenceAudience] = useState<ShopperAudience>('women');
  const savedPreferences = s.shopperPreferences || [];
  const acceptedContracts = (s.politicianContracts || []).filter((contract) => contract.status === 'accepted');
  const selectedContract = acceptedContracts.find((contract) => contract.id === contractId) || acceptedContracts[0];
  const [error, setError] = useState('');
  const [latestJobId, setLatestJobId] = useState<string | null>(null);
  const recentJobs = [...(s.shopperJobs || [])].slice(-5).reverse();
  const latestJob = recentJobs.find((job) => job.id === latestJobId) || recentJobs[0];
  const priceRankOptions: { rank: ShopperDressRank; label: string; short: string }[] = [
    { rank: 0, label: 'Cheap / Everyday', short: 'Cheap' },
    { rank: 1, label: 'Mid-range', short: 'Mid' },
    { rank: 2, label: 'Expensive / Luxury', short: 'Luxury' },
  ];
  const priceBandOptions: { band: ShopperPriceBand; label: string; short: string }[] = [
    { band: 'veryExpensive', label: 'Very Expensive · ₦500,000–₦999,999 per piece', short: 'Very Expensive' },
    { band: 'millionCouture', label: 'Million-naira Couture · ₦1,000,000+ per piece', short: 'Million-naira Couture' },
  ];
  const selectedFilterCount = savedPreferences.reduce(
    (sum, preference) => sum + preference.ranks.length + (preference.priceBands || []).length, 0,
  );
  const filterSummary = savedPreferences.length
    ? savedPreferences.slice(0, 2).map((preference) => {
        const category = SHOPPER_PREFERENCE_CATEGORIES.find((row) => row.id === preference.category)?.label || preference.category;
        const ranks = preference.ranks.map((rank) => priceRankOptions.find((row) => row.rank === rank)?.short || '');
        const bands = (preference.priceBands || []).map((band) => priceBandOptions.find((row) => row.band === band)?.short || '');
        return `${preference.audience === 'women' ? 'Women' : 'Men'}: ${category} (${[...ranks, ...bands].filter(Boolean).join('+')})`;
      }).join(' · ') + (savedPreferences.length > 2 ? ` · +${savedPreferences.length - 2} more` : '')
    : 'Automatic — shopper chooses based on the mission';

  const setPreferenceRanks = (audience: ShopperAudience, category: ShopperBuyingPreference['category'], rank: ShopperDressRank, checked: boolean) => {
    const current = savedPreferences.find((row) => row.audience === audience && row.category === category);
    const ranks = checked
      ? [...new Set([...(current?.ranks || []), rank])].sort((a, b) => a - b) as ShopperDressRank[]
      : (current?.ranks || []).filter((value) => value !== rank);
    const priceBands = current?.priceBands || [];
    const next = savedPreferences.filter((row) => !(row.audience === audience && row.category === category));
    if (ranks.length || priceBands.length) next.push({ audience, category, ranks, ...(priceBands.length ? { priceBands } : {}) });
    up((game) => ({ ...game, shopperPreferences: next }));
  };

  const setPreferencePriceBand = (
    audience: ShopperAudience,
    category: ShopperBuyingPreference['category'],
    band: ShopperPriceBand,
    checked: boolean,
  ) => {
    const current = savedPreferences.find((row) => row.audience === audience && row.category === category);
    const priceBands = checked
      ? [...new Set([...(current?.priceBands || []), band])]
      : (current?.priceBands || []).filter((value) => value !== band);
    const ranks = current?.ranks || [];
    const next = savedPreferences.filter((row) => !(row.audience === audience && row.category === category));
    if (ranks.length || priceBands.length) next.push({ audience, category, ranks, ...(priceBands.length ? { priceBands } : {}) });
    up((game) => ({ ...game, shopperPreferences: next }));
  };

  const sendShopper = () => {
    if (mission === 'contract' && !selectedContract) {
      setError('Accept a politician contract first. The shopper will then buy the exact catalogue goods it requires.');
      return;
    }
    const result = prepareShopperOrder(
      s, mission, budget, selectedContract?.brief || '',
      mission === 'contract' ? selectedContract?.id : undefined,
      shoppingExamples, savedPreferences,
    );
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
        <div className="text-lg font-bold">{SHOPPER_NAME} · Yaba Mart Shopper</div>
        <div className="text-xs text-white/75 mt-0.5">Buys for the customers who actually walk in: everyday, middle-class and big spenders, women and men, in the colours they ask for.</div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="rounded-xl bg-black/15 border border-white/10 p-2">
            <div className="text-[10px] uppercase tracking-wide text-white/60">Your boutique</div>
            <div className="font-semibold text-sm">{TIERS[Math.max(0, Math.min(TIERS.length - 1, Math.floor(s.tier || 0)))]?.name || 'Boutique'}</div>
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
            {!(s.productSales || []).length && <div className="text-[11px] text-amber-200/90 mt-1">This save has no item-by-item sales history yet. The shopper starts by adding variety and learns which products sell as new sales are recorded.</div>}
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

          {mission !== 'contract' && (
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-200">Examples of what you want the shopper to buy (optional)</span>
              <input
                type="text"
                value={shoppingExamples}
                onChange={(e) => setShoppingExamples(e.target.value)}
                maxLength={240}
                placeholder="e.g. luxury gowns, designer bags, Ankara dresses, premium wigs"
                className="w-full rounded-lg bg-black/25 border border-white/15 px-3 py-2 text-sm outline-none focus:border-violet-400"
              />
              <div className="text-[10px] text-slate-500">The shopper will prioritise matching catalogue items. Boutique unlocks and your budget still apply.</div>
            </label>
          )}

          {mission !== 'contract' && (
            <section className="rounded-xl border border-white/10 bg-white/[0.035] overflow-hidden">
              <button
                type="button"
                onClick={() => setPreferencesOpen((open) => !open)}
                className="w-full flex items-center gap-2 text-left p-3 hover:bg-white/5"
                aria-expanded={preferencesOpen}
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold">2. Shopping preferences <span className="text-violet-300 font-medium">({selectedFilterCount} filters)</span></span>
                  <span className="block text-[10px] text-slate-400 mt-1 truncate">{filterSummary}</span>
                </span>
                <span className="text-slate-300 text-lg shrink-0">{preferencesOpen ? '−' : '+'}</span>
              </button>
              {preferencesOpen && (
                <div className="border-t border-white/10 p-3 space-y-3">
                  <p className="text-[11px] text-slate-400">Choose who the products are for, open a category and tick the ranks or exact per-piece purchase-cost bands you want. “Very Expensive” means ₦500,000–₦999,999 per piece; “Million-naira Couture” means ₦1,000,000 or more. These price bands do not rely on an item's rich/luxury class label.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([{ id: 'women', label: 'Women' }, { id: 'men', label: 'Men' }] as const).map((audience) => (
                      <button
                        key={audience.id}
                        type="button"
                        onClick={() => setPreferenceAudience(audience.id)}
                        className={`rounded-lg border py-2 text-sm font-semibold ${preferenceAudience === audience.id ? 'border-violet-400 bg-violet-500/15 text-white' : 'border-white/10 bg-black/15 text-slate-300'}`}
                      >
                        {audience.label}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {SHOPPER_PREFERENCE_CATEGORIES.map((category) => {
                      const preference = savedPreferences.find((row) => row.audience === preferenceAudience && row.category === category.id);
                      const ranks = preference?.ranks || [];
                      const priceBands = preference?.priceBands || [];
                      const categoryFilterCount = ranks.length + priceBands.length;
                      return (
                        <details key={category.id} className="rounded-lg border border-white/10 bg-black/15">
                          <summary className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm list-none">
                            <span className="flex-1 font-medium">{category.label}</span>
                            {categoryFilterCount > 0 && <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] text-violet-200">{categoryFilterCount} filter{categoryFilterCount === 1 ? '' : 's'}</span>}
                            <span className="text-slate-500 text-xs">⌄</span>
                          </summary>
                          <div className="px-3 pb-3 space-y-2.5">
                            <div>
                              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Dressing rank</div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                                {priceRankOptions.map((option) => (
                                  <label key={option.rank} className={`flex min-w-0 items-center gap-2 rounded-md border px-2 py-2 text-xs cursor-pointer ${ranks.includes(option.rank) ? 'border-violet-400/60 bg-violet-500/10 text-violet-100' : 'border-white/5 bg-black/10 text-slate-300'}`}>
                                    <input
                                      type="checkbox"
                                      checked={ranks.includes(option.rank)}
                                      onChange={(event) => setPreferenceRanks(preferenceAudience, category.id, option.rank, event.target.checked)}
                                      className="accent-violet-500"
                                    />
                                    <span>{option.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div className="border-t border-white/10 pt-2.5">
                              <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-200/80 mb-1.5">Exact per-piece purchase cost</div>
                              <div className="grid grid-cols-1 gap-1.5">
                                {priceBandOptions.map((option) => (
                                  <label key={option.band} className={`flex min-w-0 items-center gap-2 rounded-md border px-2 py-2 text-xs cursor-pointer ${priceBands.includes(option.band) ? 'border-amber-300/60 bg-amber-500/10 text-amber-100' : 'border-white/5 bg-black/10 text-slate-300'}`}>
                                    <input
                                      type="checkbox"
                                      checked={priceBands.includes(option.band)}
                                      onChange={(event) => setPreferencePriceBand(preferenceAudience, category.id, option.band, event.target.checked)}
                                      className="accent-amber-400"
                                    />
                                    <span>{option.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 p-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold">{selectedFilterCount ? `${selectedFilterCount} quality filters active` : 'No manual filters selected'}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">When active, only selected gender, category, rank and/or exact price-band combinations qualify.</div>
                    </div>
                    {savedPreferences.length > 0 && (
                      <button type="button" onClick={() => up((game) => ({ ...game, shopperPreferences: [] }))} className="shrink-0 text-xs font-semibold text-rose-300 hover:text-rose-200">Clear</button>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {mission === 'contract' && (
            selectedContract ? (
              <div className="rounded-lg border border-emerald-300/20 bg-emerald-400/[0.06] p-3 space-y-1.5">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-200">Accepted contract to source for</span>
                  <select value={selectedContract.id} onChange={(e) => setContractId(e.target.value)} className="w-full rounded-lg bg-[#19191e] border border-white/15 px-3 py-2 text-sm outline-none focus:border-emerald-400">
                    {acceptedContracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.title} · due Day {contract.deadlineDay}</option>)}
                  </select>
                </label>
                <div className="text-xs text-slate-300">{selectedContract.brief}</div>
                <div className="text-[11px] text-emerald-200">The shopper sources only contract-listed products and only the quantity still needed to reach each required total. Existing stock and matching items in the cart count toward those totals. A short budget creates a partial order in the contract's listed order; extra money never adds products or exceeds a requested quantity.</div>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-300/20 bg-amber-400/[0.06] p-3 space-y-2">
                <div className="text-sm font-semibold text-amber-100">Accept a contract first</div>
                <div className="text-xs text-slate-300">Open Politician Contracts, inspect an offer and accept it. The shopper will then target its exact required products and quantities.</div>
                <button onClick={openContracts} className="w-full rounded-full border border-amber-200/25 bg-amber-400/10 py-2 text-sm font-semibold text-amber-100">View politician contract offers →</button>
              </div>
            )
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
            <div className="text-[10px] text-slate-500">Kunle takes 5% of the goods he picks (at least ₦1,500), paid at checkout and only on items you keep. His fee is already set aside from the spendable amount. Shopping yourself in Yaba Mart is free.</div>
          </label>

          <div className="rounded-lg bg-black/20 border border-white/5 px-3 py-2">
            <div className="text-[10px] text-slate-400">Current mission price guidance</div>
            <div className="text-sm font-semibold">{mission === 'contract'
              ? 'Based on the contract brief and budget'
              : savedPreferences.length
                ? 'Following selected categories, ranks and exact price bands'
                : mission === 'richCustomers'
                  ? 'Luxury dressing rank only (Rank 2)'
                  : `Up to ${naira(shopperPriceCeiling(s, mission))} retail per item`}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{mission === 'contract'
              ? 'Contract requirements take priority over general shopping preferences.'
              : savedPreferences.length
                ? 'Only products matching selected gender, category, rank and/or exact price band are eligible. Very Expensive is ₦500,000–₦999,999 per piece; Million-naira Couture is ₦1,000,000+ per piece. Your budget controls quantity, not quality.'
                : mission === 'richCustomers'
                  ? 'Uses the same top quality rank that improves outfit scores for rich customers; if your tier has no eligible luxury items, the shopper will not silently substitute cheap stock.'
                  : 'This is a retail-price guide for one item, not your total order budget or a sales guarantee.'}</div>
          </div>

          {error && <div role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-2.5 text-xs text-rose-200">{error}</div>}
          <button onClick={sendShopper} disabled={available < 1000 || budget < 1000 || budget > available || (mission === 'contract' && !selectedContract)} className="w-full rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed py-2.5 text-sm font-bold">
            Send shopper · up to {naira(Math.min(budget, available))}
          </button>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.035] p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-semibold text-sm">3. Review the returned order</div>
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
