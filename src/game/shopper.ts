import { BUDGET, MARKUP, TIERS } from './economy';
import { cartTotal } from './engine';
import type { CartLine } from './engine';
import { canBuy, entryFor, HAIR_SWATCHES, isClothing, MARKET, pieceCost } from './market';
import type { MarketEntry } from './market';
import type { CustomerClass, GameState, ProductSalesRecord, ShopperJob, ShopperMission, ShopperOrderLine } from './types';

const CLASS_ORDER: CustomerClass[] = ['poor', 'middle', 'rich'];
const DEFAULT_COLOUR = '#9A344D';
const DEFAULT_TRIM = '#D9B25A';

export const SHOPPER_MISSIONS: { id: ShopperMission; label: string; description: string }[] = [
  { id: 'restock', label: 'Restock bestsellers', description: 'Replenish popular products that are running low or have sold out.' },
  { id: 'variety', label: 'Add variety', description: 'Fill gaps in your assortment with distinct styles rather than near-duplicates.' },
  { id: 'richCustomers', label: 'Prepare for rich customers', description: 'Build a carefully limited premium selection appropriate for your boutique.' },
  { id: 'contract', label: 'Source for a contract', description: 'Match a short sourcing brief to eligible products in the official catalogue.' },
];

export const shopperAvailableBudget = (s: GameState, cart: CartLine[] = s.marketCart || []) =>
  Math.max(0, Math.floor((s.cash - cartTotal(cart)) / 100) * 100);

/** A normal shopping mission has a price ceiling derived from the actual customer mix
 * and spending bands. Explicit premium/contract missions may use a different ceiling,
 * but they never bypass catalogue unlocks, mission budget, or available cash. */
export function shopperPriceCeiling(s: GameState, mission: ShopperMission): number {
  const tier = TIERS[Math.max(0, Math.min(TIERS.length - 1, Math.floor(s.tier)))] || TIERS[0];
  const weightedSpend = tier.mix.reduce((sum, share, i) => sum + share * BUDGET[CLASS_ORDER[i]][1], 0);
  if (mission === 'richCustomers') return Math.min(BUDGET.rich[1] * 0.8, weightedSpend * (1.05 + tier.mix[2] * 1.5));
  if (mission === 'contract') return BUDGET.rich[1] * 0.8;
  return Math.max(5_000, weightedSpend * 0.45);
}

const designKey = (d: Pick<ShopperOrderLine, 'kind' | 'itemId' | 'fabric' | 'color' | 'color2' | 'pattern'>) =>
  [d.kind, d.itemId, d.fabric || 'plain', d.color, d.color2, d.pattern].join('|');

const cartKey = (d: Omit<ShopperOrderLine, 'key' | 'pieces'>) =>
  [d.kind, d.itemId, d.fabric || '', d.color, d.color2, d.pattern].join('|');

function recency(day: number, now: number) {
  const age = Math.max(0, now - day);
  if (age <= 7) return 2.2;
  if (age <= 30) return 1.4;
  if (age <= 90) return 0.65;
  if (age <= 180) return 0.25;
  return 0;
}

function demandScore(
  records: ProductSalesRecord[],
  entry: MarketEntry,
  s: GameState,
  mission: ShopperMission,
  variant?: { fabric: string; color: string; color2: string; pattern: number },
) {
  const mix = TIERS[Math.max(0, Math.min(TIERS.length - 1, s.tier))]?.mix || TIERS[0].mix;
  return records.reduce((score, row) => {
    if (row.kind !== entry.kind || row.itemId !== entry.id) return score;
    const ageWeight = recency(row.day, s.day);
    if (!ageWeight) return score;
    const clsIndex = CLASS_ORDER.indexOf(row.customerClass);
    const classWeight = mission === 'richCustomers'
      ? ({ poor: 0.2, middle: 0.8, rich: 2.8 } as Record<CustomerClass, number>)[row.customerClass]
      : 0.45 + (mix[clsIndex] || 0);
    const variantWeight = variant && row.fabric === variant.fabric && row.color === variant.color &&
      row.color2 === variant.color2 && row.pattern === variant.pattern ? 1.8 : variant ? 0.7 : 1;
    const tierWeight = row.tier === s.tier ? 1.2 : 0.85;
    return score + row.units * ageWeight * classWeight * variantWeight * tierWeight;
  }, 0);
}

function bestColour(records: ProductSalesRecord[], s: GameState, kind: string, mission: ShopperMission) {
  const scoreByColour = new Map<string, number>();
  for (const row of records) {
    if (row.kind !== kind) continue;
    const classWeight = mission === 'richCustomers'
      ? ({ poor: 0.2, middle: 0.8, rich: 2.8 } as Record<CustomerClass, number>)[row.customerClass]
      : 1;
    const score = row.units * recency(row.day, s.day) * classWeight;
    if (score > 0) scoreByColour.set(row.color, (scoreByColour.get(row.color) || 0) + score);
  }
  return [...scoreByColour.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function textMatchesBrief(entry: MarketEntry, brief: string) {
  const text = (entry.label + ' ' + entry.group + ' ' + entry.kind + (entry.native ? ' native aso-oke ankara' : '')).toLowerCase();
  const words = brief.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((word) =>
    word.length >= 3 && !['the', 'and', 'for', 'with', 'from', 'that', 'this', 'please', 'need', 'want', 'items', 'goods', 'contract'].includes(word),
  );
  if (!words.length) return true;
  return words.some((word) => text.includes(word));
}

interface Candidate {
  entry: MarketEntry;
  line: ShopperOrderLine;
  unitCost: number;
  score: number;
  suggestedPieces: number;
}

function toLine(entry: MarketEntry, opts: { fabric?: string; color: string; color2: string; pattern: number; pieces: number }): ShopperOrderLine {
  const body = {
    kind: entry.kind,
    itemId: entry.id,
    fabric: isClothing(entry.kind) ? (opts.fabric || entry.fabric || 'plain') as ShopperOrderLine['fabric'] : undefined,
    color: opts.color,
    color2: opts.color2,
    pattern: opts.pattern,
  };
  return { ...body, key: cartKey(body), pieces: opts.pieces };
}

function candidateLine(
  entry: MarketEntry,
  s: GameState,
  mission: ShopperMission,
  records: ProductSalesRecord[],
  existing?: GameState['stock'][number],
  suggestedPieces = 1,
): ShopperOrderLine {
  const popular = bestColour(records, s, entry.kind, mission);
  let color = existing?.color || popular || DEFAULT_COLOUR;
  let pattern = existing?.pattern || 0;
  if (entry.kind === 'hair') {
    const hairColor = existing?.color || popular || HAIR_SWATCHES[0].color;
    const idx = Math.max(0, HAIR_SWATCHES.findIndex((swatch) => swatch.color === hairColor));
    color = HAIR_SWATCHES[idx].color;
    pattern = idx;
  } else if (!isClothing(entry.kind) && !['shoes', 'bag', 'headwear'].includes(entry.kind)) {
    color = existing?.color || '#C9A163';
  }
  const fabric = isClothing(entry.kind) ? existing?.fabric || entry.fabric || 'plain' : undefined;
  const colour2 = existing?.color2 || (isClothing(entry.kind) ? DEFAULT_TRIM : color);
  return toLine(entry, { fabric, color, color2: colour2, pattern, pieces: suggestedPieces });
}

function mergeIntoCart(cart: CartLine[], additions: ShopperOrderLine[]): CartLine[] {
  const merged = new Map<string, CartLine>();
  for (const line of cart) {
    const key = cartKey(line);
    const previous = merged.get(key);
    merged.set(key, previous ? { ...previous, pieces: previous.pieces + line.pieces } : { ...line, key });
  }
  for (const line of additions) {
    const previous = merged.get(line.key);
    merged.set(line.key, previous ? { ...previous, pieces: previous.pieces + line.pieces } : { ...line });
  }
  return [...merged.values()];
}

/** Build a proposed order with deterministic business rules. AI is deliberately not
 * allowed to create catalogue IDs or choose a price; every line originates in MARKET. */
export function prepareShopperOrder(
  s: GameState,
  mission: ShopperMission,
  requestedBudget: number,
  contractBrief = '',
): { state: GameState; job?: ShopperJob; error?: string } {
  const available = shopperAvailableBudget(s);
  const budget = Math.max(0, Math.min(available, Math.floor((Number.isFinite(requestedBudget) ? requestedBudget : 0) / 100) * 100));
  if (budget < 1_000) return { state: s, error: 'Set a budget of at least ₦1,000 and leave enough uncommitted cash for checkout.' };
  if (mission === 'contract' && !contractBrief.trim()) return { state: s, error: 'Enter a short contract brief, such as “men’s native wear” or “bridesmaid dresses”.' };

  const records = s.productSales || [];
  const existingByProduct = new Map<string, GameState['stock']>();
  for (const design of s.stock) {
    const key = [design.kind, design.itemId].join('|');
    existingByProduct.set(key, [...(existingByProduct.get(key) || []), design]);
  }
  const representedKinds = new Map<string, number>();
  for (const design of s.stock) {
    if (design.pieces > 0) representedKinds.set(design.kind, (representedKinds.get(design.kind) || 0) + design.pieces);
  }
  const normalCeiling = shopperPriceCeiling(s, mission);
  const priceCeiling = normalCeiling;
  const candidates: Candidate[] = [];

  for (const entry of MARKET) {
    if (!canBuy(entry, s.tier)) continue;
    if (mission === 'contract' && !textMatchesBrief(entry, contractBrief)) continue;
    const retail = pieceCost(entry, isClothing(entry.kind) ? entry.fabric || 'plain' : undefined) * MARKUP;
    if (mission !== 'contract' && retail > priceCeiling) continue;

    const productKey = [entry.kind, entry.id].join('|');
    const variants = existingByProduct.get(productKey) || [];
    const productDemand = demandScore(records, entry, s, mission);
    if (mission === 'restock') {
      for (const variant of variants) {
        const matchingEntry = entryFor(variant.kind, variant.itemId);
        if (!matchingEntry || !canBuy(matchingEntry, s.tier)) continue;
        const recentUnits = records.filter((row) => row.kind === variant.kind && row.itemId === variant.itemId &&
          row.fabric === variant.fabric && row.color === variant.color && row.color2 === variant.color2 &&
          row.pattern === variant.pattern && row.day >= s.day - 7).reduce((sum, row) => sum + row.units, 0);
        const target = Math.min(8, Math.max(2, Math.ceil(recentUnits * 0.6)));
        if (variant.pieces >= target) continue;
        const line = candidateLine(entry, s, mission, records, variant, target - Math.max(0, variant.pieces));
        const unitCost = pieceCost(entry, isClothing(entry.kind) ? line.fabric : undefined);
        if (!Number.isFinite(unitCost) || unitCost <= 0) continue;
        if (mission !== 'contract' && unitCost * MARKUP > priceCeiling) continue;
        candidates.push({
          entry, line, unitCost,
          score: 3 + productDemand * 2 + recentUnits * 2 + (variant.pieces <= 0 ? 6 : variant.pieces === 1 ? 3 : 0),
          suggestedPieces: line.pieces,
        });
      }
      continue;
    }

    // Variety and premium sourcing add catalogue styles the boutique does not already own.
    // A different colour of the same catalogue style is not counted as new variety.
    if (variants.length) continue;
    const line = candidateLine(entry, s, mission, records, undefined, 1);
    const unitCost = pieceCost(entry, isClothing(entry.kind) ? line.fabric : undefined);
    if (!Number.isFinite(unitCost) || unitCost <= 0) continue;
    const missingKindBonus = (representedKinds.get(entry.kind) || 0) === 0 ? 5 : 0;
    const luxuryBonus = mission === 'richCustomers' && entry.luxury ? 8 : 0;
    const demandBonus = productDemand;
    const priceFit = mission === 'richCustomers' ? retail / Math.max(1, priceCeiling) : 1 - retail / Math.max(1, priceCeiling);
    let score = 2 + missingKindBonus + luxuryBonus + demandBonus + Math.max(0, priceFit) * 2;
    if (mission === 'variety') score += missingKindBonus * 1.5;
    if (mission === 'contract') {
      const text = (entry.label + ' ' + entry.group + ' ' + entry.kind).toLowerCase();
      const words = contractBrief.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 3);
      score += words.filter((word) => text.includes(word)).length * 10;
    }
    candidates.push({ entry, line, unitCost, score, suggestedPieces: 1 });
  }

  // Keep the order small enough to be reviewed and suitable for this shop's scale.
  const maxLines = [6, 8, 10, 13, 16][Math.max(0, Math.min(4, s.tier))] || 6;
  candidates.sort((a, b) => b.score - a.score || a.unitCost - b.unitCost || a.entry.label.localeCompare(b.entry.label));
  const remainingCandidates = [...candidates];
  const chosen: ShopperOrderLine[] = [];
  const pickedProducts = new Set<string>();
  const pickedKinds = new Map<string, number>();
  const pickedGroups = new Map<string, number>();
  let spent = 0;

  // Re-rank after each pick. Variety and premium missions gently penalise overrepresented
  // kinds and catalogue groups, so the shopper does not fill the cart with near-copies.
  while (chosen.length < maxLines && remainingCandidates.length) {
    let bestIndex = -1;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < remainingCandidates.length; i++) {
      const candidate = remainingCandidates[i];
      const key = [candidate.entry.kind, candidate.entry.id].join('|');
      if (pickedProducts.has(key)) continue;
      const kind = candidate.entry.kind;
      const group = candidate.entry.group.toLowerCase();
      const kindStock = representedKinds.get(kind) || 0;
      const kindPicks = pickedKinds.get(kind) || 0;
      const groupPicks = pickedGroups.get(group) || 0;
      const diversityPenalty = mission === 'restock' ? 0
        : Math.min(7, Math.log1p(kindStock) * 1.3) + kindPicks * 3 + groupPicks * 2.5;
      const adjustedScore = candidate.score - diversityPenalty;
      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestIndex = i;
      }
    }
    if (bestIndex < 0) break;
    const candidate = remainingCandidates.splice(bestIndex, 1)[0];
    const productKey = [candidate.entry.kind, candidate.entry.id].join('|');
    const remaining = budget - spent;
    if (remaining < candidate.unitCost) continue;
    const quantity = Math.min(candidate.suggestedPieces, Math.floor(remaining / candidate.unitCost));
    if (quantity < 1) continue;
    const line = { ...candidate.line, pieces: quantity };
    chosen.push(line);
    pickedProducts.add(productKey);
    const kind = candidate.entry.kind;
    const group = candidate.entry.group.toLowerCase();
    pickedKinds.set(kind, (pickedKinds.get(kind) || 0) + 1);
    pickedGroups.set(group, (pickedGroups.get(group) || 0) + 1);
    spent += candidate.unitCost * quantity;
  }

  if (!chosen.length) {
    return { state: s, error: mission === 'contract'
      ? 'I could not match that brief to affordable, unlocked Yaba Mart products. Try simpler product or category words.'
      : 'I could not find suitable products within this budget and your boutique’s current buying limits. Try a different mission or a larger budget.' };
  }

  const id = 'shopper-' + s.day + '-' + (s.msgSeq || 0) + '-' + ((s.shopperJobs || []).length + 1);
  const descriptions: Record<ShopperMission, string> = {
    restock: 'replenished low-stock designs with recent demand',
    variety: 'selected new styles to widen your assortment',
    richCustomers: 'selected a limited premium assortment within your current boutique level',
    contract: 'matched your brief against eligible catalogue products',
  };
  const summary = `Shopper returned on day ${s.day}: ${chosen.length} product lines, ${chosen.reduce((sum, line) => sum + line.pieces, 0)} pieces, estimated total ₦${spent.toLocaleString('en-NG')}. I ${descriptions[mission]}. Review everything in Yaba Mart before checkout.`;
  const job: ShopperJob = {
    id, mission, budget, estimatedTotal: spent, status: 'ready',
    createdDay: s.day, completedDay: s.day, items: chosen, summary,
    ...(mission === 'contract' ? { contractBrief: contractBrief.trim().slice(0, 240) } : {}),
  };
  const newCart = mergeIntoCart(s.marketCart || [], chosen);
  const msgSeq = (s.msgSeq || 0) + 1;
  const message = {
    id: msgSeq, day: s.day, from: 'Yaba Mart Shopper', text: summary, tone: 'good' as const,
    t: s.phase === 'shop' ? Math.floor(s.clock) : undefined,
  };
  const state: GameState = {
    ...s,
    marketCart: newCart,
    shopperJobs: [...(s.shopperJobs || []), job].slice(-20),
    msgSeq,
    messages: [...(s.messages || []), message].slice(-500),
  };
  return { state, job };
}
