import { BUDGET, MARKUP, TIERS } from './economy';
import { cartTotal } from './engine';
import type { CartLine } from './engine';
import { canBuy, entryFor, HAIR_SWATCHES, isClothing, MARKET, pieceCost } from './market';
import type { MarketEntry } from './market';
import type {
  CustomerClass, GameState, ProductSalesRecord, ShopperBuyingPreference, ShopperDressRank,
  ShopperJob, ShopperMission, ShopperOrderLine, ShopperPriceBand, ShopperProductCategory,
} from './types';

const CLASS_ORDER: CustomerClass[] = ['poor', 'middle', 'rich'];
const DEFAULT_COLOUR = '#8E1F3A';
const DEFAULT_TRIM = '#C9A163';

export const SHOPPER_PREFERENCE_CATEGORIES: { id: ShopperProductCategory; label: string; kinds: string[] }[] = [
  { id: 'top', label: 'Tops', kinds: ['top'] },
  { id: 'bottom', label: 'Bottoms', kinds: ['bottom'] },
  { id: 'dress', label: 'Dresses & native sets', kinds: ['dress'] },
  { id: 'outer', label: 'Outerwear', kinds: ['outer'] },
  { id: 'shoes', label: 'Shoes', kinds: ['shoes'] },
  { id: 'bag', label: 'Bags', kinds: ['bag'] },
  { id: 'jewellery', label: 'Jewellery', kinds: ['necklace', 'wrist', 'earrings'] },
  { id: 'hair', label: 'Wigs & hair merchandise', kinds: ['hair'] },
  { id: 'headwear', label: 'Headwear', kinds: ['headwear'] },
  { id: 'glasses', label: 'Eyewear', kinds: ['glasses'] },
];

const CLASS_RANK: Record<'poor' | 'middle' | 'rich', number> = { poor: 0, middle: 1, rich: 2 };

/** Exactly mirrors the product/class ranking inputs used by scoreLook() for outfit quality. */
export function shopperDressRank(entry: MarketEntry): ShopperDressRank {
  const wardrobeRank = entry.wardrobe ? CLASS_RANK[entry.wardrobe.cls] : 0;
  const tier = entry.minTier || 0;
  const productRank = entry.price >= 150_000 || tier >= 3 ? 2
    : entry.price >= 25_000 || tier >= 2 ? 1
    : 0;
  return Math.max(wardrobeRank, productRank) as ShopperDressRank;
}

/** Price bands use the actual per-piece catalogue purchase cost, including clothing fabric cost. */
export function shopperPriceBandMatches(
  entry: MarketEntry,
  band: ShopperPriceBand,
  fabric?: MarketEntry['fabric'],
): boolean {
  const unitCost = pieceCost(entry, isClothing(entry.kind) ? (fabric || entry.fabric || 'plain') : undefined);
  if (band === 'veryExpensive') return unitCost >= 500_000 && unitCost < 1_000_000;
  return unitCost >= 1_000_000;
}

export function shopperEntryMatchesPreferences(
  entry: MarketEntry,
  preferences: ShopperBuyingPreference[],
  fabric?: MarketEntry['fabric'],
): boolean {
  if (!preferences.length) return true;
  return preferences.some((preference) => {
    const genderMatches = entry.for === 'both' ||
      (preference.audience === 'women' ? entry.for === 'f' : entry.for === 'm');
    const category = SHOPPER_PREFERENCE_CATEGORIES.find((row) => row.id === preference.category);
    const matchesRank = preference.ranks.includes(shopperDressRank(entry));
    const matchesPriceBand = (preference.priceBands || []).some((band) =>
      shopperPriceBandMatches(entry, band, fabric),
    );
    return genderMatches && !!category?.kinds.includes(entry.kind) && (matchesRank || matchesPriceBand);
  });
}

/** Return keys for each selected strict price band this exact product/fabric qualifies for. */
function matchingPriceBandPreferenceKeys(
  entry: MarketEntry,
  preferences: ShopperBuyingPreference[],
  fabric?: MarketEntry['fabric'],
): string[] {
  return [...new Set(preferences.flatMap((preference) => {
    const genderMatches = entry.for === 'both' ||
      (preference.audience === 'women' ? entry.for === 'f' : entry.for === 'm');
    const category = SHOPPER_PREFERENCE_CATEGORIES.find((row) => row.id === preference.category);
    if (!genderMatches || !category?.kinds.includes(entry.kind)) return [];
    return (preference.priceBands || [])
      .filter((band) => shopperPriceBandMatches(entry, band, fabric))
      .map((band) => `${preference.audience}|${preference.category}|${band}`);
  }))];
}

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
  const tierIndex = Math.max(0, Math.min(TIERS.length - 1, Math.floor(s.tier)));
  const tier = TIERS[tierIndex] || TIERS[0];
  const weightedSpend = tier.mix.reduce((sum, share, i) => sum + share * BUDGET[CLASS_ORDER[i]][1], 0);
  // Premium missions need a tier-aware luxury ceiling instead of the normal blended
  // customer average, which used to filter out almost every genuinely premium product.
  if (mission === 'richCustomers') return [45_000, 110_000, 300_000, 600_000, 950_000][tierIndex] || 45_000;
  if (mission === 'contract') return BUDGET.rich[1] * 0.8;
  return Math.max(5_000, weightedSpend * 0.45);
}

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

/** Match shopper examples to real catalogue metadata. This is a ranking hint only:
 * locked products remain locked and explicit missions still enforce their rules. */
function shopperPreferenceScore(entry: MarketEntry, brief: string): number {
  const words = brief.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((word) =>
    word.length >= 3 && !['the', 'and', 'for', 'with', 'from', 'that', 'this', 'please', 'need', 'want', 'buy', 'look', 'some', 'examples', 'example', 'items', 'products', 'stock', 'my', 'me'].includes(word),
  );
  if (!words.length) return 0;
  const premiumTags = entry.luxury ? ' luxury premium designer expensive high-end couture rich exclusive' : '';
  const nativeTags = entry.native ? ' native aso-oke ankara aso ebi' : '';
  const text = (entry.label + ' ' + entry.group + ' ' + entry.kind + premiumTags + nativeTags).toLowerCase();
  const aliases: Record<string, string[]> = {
    gown: ['dress', 'gown'], gowns: ['dress', 'gown'], dresses: ['dress', 'gown'],
    handbag: ['bag'], handbags: ['bag'], purses: ['bag'], purse: ['bag'],
    wigs: ['hair', 'wig'], wig: ['hair', 'wig'], braids: ['hair', 'braid'], braid: ['hair', 'braid'],
    heels: ['shoes', 'heel'], sneakers: ['shoes', 'sneaker'], footwear: ['shoes'],
    trousers: ['bottom', 'trouser'], pants: ['bottom', 'pant'], jeans: ['bottom', 'jean'],
    skirts: ['bottom', 'skirt'], blouse: ['top', 'blouse'], blouses: ['top', 'blouse'],
    jewellery: ['jewellery', 'jewelry', 'necklace', 'earrings', 'wrist'], jewelry: ['jewellery', 'jewelry', 'necklace', 'earrings', 'wrist'],
    asoebi: ['aso-ebi', 'aso-oke', 'ankara', 'native'], 'aso-ebi': ['aso-ebi', 'aso-oke', 'ankara', 'native'],
    expensive: ['expensive', 'luxury', 'premium', 'designer', 'couture'],
    designer: ['designer', 'luxury', 'premium', 'couture'],
    luxury: ['luxury', 'premium', 'designer', 'couture'], premium: ['premium', 'luxury', 'designer', 'couture'],
  };
  return words.reduce((score, word) => {
    const terms = aliases[word] || [word];
    return score + (terms.some((term) => text.includes(term)) ? 1 : 0);
  }, 0);
}

interface Candidate {
  entry: MarketEntry;
  line: ShopperOrderLine;
  unitCost: number;
  score: number;
  suggestedPieces: number;
  /** Contract requirements are sourced in their listed order, regardless of sales scoring. */
  contractOrder?: number;
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
  contractId?: string,
  shoppingExamples = '',
  buyingPreferences: ShopperBuyingPreference[] = s.shopperPreferences || [],
): { state: GameState; job?: ShopperJob; error?: string } {
  const activePreferences = mission === 'contract' ? [] : buyingPreferences;
  const hasBuyingPreferences = activePreferences.length > 0;
  const available = shopperAvailableBudget(s);
  const budget = Math.max(0, Math.min(available, Math.floor((Number.isFinite(requestedBudget) ? requestedBudget : 0) / 100) * 100));
  if (budget < 1_000) return { state: s, error: 'Set a budget of at least ₦1,000 and leave enough uncommitted cash for checkout.' };
  const selectedContract = mission === 'contract' && contractId
    ? (s.politicianContracts || []).find((row) => row.id === contractId && row.status === 'accepted')
    : undefined;
  if (contractId && !selectedContract) return { state: s, error: 'That politician contract is no longer active. Open Contracts and select an accepted contract.' };
  if (mission === 'contract' && !selectedContract && !contractBrief.trim()) return { state: s, error: 'Accept a politician contract first, or enter a sourcing brief.' };

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
  const maxLines = [6, 8, 10, 13, 16][Math.max(0, Math.min(4, s.tier))] || 6;
  // Aim to use a meaningful share of the budget on premium missions, scaling quantities
  // rather than stopping at one unit per style. The 25-piece cap protects against runaway orders.
  const richQuantityFor = (unitCost: number) => (mission === 'richCustomers' || hasBuyingPreferences)
    ? Math.max(1, Math.min(25, Math.ceil((budget * 0.75) / (maxLines * Math.max(1, unitCost)))))
    : 1;
  const candidates: Candidate[] = [];

  for (const entry of MARKET) {
    if (!canBuy(entry, s.tier)) continue;
    const productKey = [entry.kind, entry.id].join('|');
    const variants = existingByProduct.get(productKey) || [];
    if (mission !== 'contract' && hasBuyingPreferences &&
      !shopperEntryMatchesPreferences(entry, activePreferences) &&
      !variants.some((variant) => shopperEntryMatchesPreferences(entry, activePreferences, variant.fabric))) continue;
    // Rich-customer mode defaults to the same highest dressing rank that scores as luxury.
    // Explicit category/rank selections replace this default, rather than being softened.
    if (mission === 'richCustomers' && !hasBuyingPreferences && shopperDressRank(entry) !== 2) continue;
    if (mission === 'contract' && !selectedContract && !textMatchesBrief(entry, contractBrief)) continue;
    const retail = pieceCost(entry, isClothing(entry.kind) ? entry.fabric || 'plain' : undefined) * MARKUP;
    if (mission !== 'contract' && mission !== 'richCustomers' && !hasBuyingPreferences && retail > priceCeiling) continue;

    const productDemand = demandScore(records, entry, s, mission);
    if (mission === 'contract' && selectedContract) {
      const requirementIndex = selectedContract.requirements.findIndex((row) => row.kind === entry.kind && row.itemId === entry.id);
      const requirement = selectedContract.requirements[requirementIndex];
      if (!requirement) continue;
      const inStock = s.stock.filter((row) => row.kind === requirement.kind && row.itemId === requirement.itemId)
        .reduce((sum, row) => sum + Math.max(0, row.pieces), 0);
      const inCart = (s.marketCart || []).filter((row) => row.kind === requirement.kind && row.itemId === requirement.itemId)
        .reduce((sum, row) => sum + Math.max(0, row.pieces), 0);
      const missing = Math.max(0, requirement.quantity - inStock - inCart);
      if (missing <= 0) continue;
      const line = candidateLine(entry, s, mission, records, variants[0], missing);
      const unitCost = pieceCost(entry, isClothing(entry.kind) ? line.fabric : undefined);
      if (!Number.isFinite(unitCost) || unitCost <= 0) continue;
      candidates.push({
        entry, line, unitCost,
        score: 1000 + productDemand + (inStock <= 0 ? 3 : 0),
        suggestedPieces: missing,
        contractOrder: requirementIndex,
      });
      continue;
    }
    if (mission === 'restock' && (variants.length || !hasBuyingPreferences)) {
      for (const variant of variants) {
        const matchingEntry = entryFor(variant.kind, variant.itemId);
        if (!matchingEntry || !canBuy(matchingEntry, s.tier)) continue;
        const recentUnits = records.filter((row) => row.kind === variant.kind && row.itemId === variant.itemId &&
          row.fabric === variant.fabric && row.color === variant.color && row.color2 === variant.color2 &&
          row.pattern === variant.pattern && row.day >= s.day - 7).reduce((sum, row) => sum + row.units, 0);
        const target = Math.min(8, Math.max(2, Math.ceil(recentUnits * 0.6)));
        if (variant.pieces >= target) continue;
        const line = candidateLine(entry, s, mission, records, variant, target - Math.max(0, variant.pieces));
        if (hasBuyingPreferences && !shopperEntryMatchesPreferences(entry, activePreferences, line.fabric)) continue;
        const unitCost = pieceCost(entry, isClothing(entry.kind) ? line.fabric : undefined);
        if (!Number.isFinite(unitCost) || unitCost <= 0) continue;
        if (unitCost * MARKUP > priceCeiling) continue;
        candidates.push({
          entry, line, unitCost,
          score: 3 + productDemand * 2 + recentUnits * 2 + (variant.pieces <= 0 ? 6 : variant.pieces === 1 ? 3 : 0),
          suggestedPieces: line.pieces,
        });
      }
      continue;
    }

    // Premium sourcing can replenish a luxury style once it sells out. Otherwise, variety
    // and premium missions add catalogue styles the boutique has not stocked before.
    if (mission === 'richCustomers' && variants.length) {
      for (const variant of variants) {
        // Without manual filters, premium sourcing replenishes sold-out styles only.
        // With strict filters, it may deliberately buy more of a matching style already in stock.
        if (!hasBuyingPreferences && variant.pieces > 0) continue;
        const line = candidateLine(entry, s, mission, records, variant, 1);
        if (hasBuyingPreferences && !shopperEntryMatchesPreferences(entry, activePreferences, line.fabric)) continue;
        const unitCost = pieceCost(entry, isClothing(entry.kind) ? line.fabric : undefined);
        if (!Number.isFinite(unitCost) || unitCost <= 0 || (!hasBuyingPreferences && unitCost * MARKUP > priceCeiling)) continue;
        const preferenceScore = shopperPreferenceScore(entry, shoppingExamples);
        const score = 90 + (entry.luxury ? 100 : 0) + productDemand * 2 +
          (shoppingExamples.trim() ? (preferenceScore > 0 ? 120 + preferenceScore * 120 : -80) : 0);
        candidates.push({ entry, line, unitCost, score, suggestedPieces: richQuantityFor(unitCost) });
      }
      continue;
    }

    if (variants.length) continue;
    const line = candidateLine(entry, s, mission, records, undefined, 1);
    if (hasBuyingPreferences && !shopperEntryMatchesPreferences(entry, activePreferences, line.fabric)) continue;
    const unitCost = pieceCost(entry, isClothing(entry.kind) ? line.fabric : undefined);
    if (!Number.isFinite(unitCost) || unitCost <= 0) continue;
    const missingKindBonus = (representedKinds.get(entry.kind) || 0) === 0 ? 5 : 0;
    const luxuryBonus = mission === 'richCustomers' && entry.luxury ? 100 : 0;
    const demandBonus = productDemand;
    const priceFit = mission === 'richCustomers' ? retail / Math.max(1, priceCeiling) : 1 - retail / Math.max(1, priceCeiling);
    const preferenceScore = shopperPreferenceScore(entry, shoppingExamples);
    let score = 2 + missingKindBonus + luxuryBonus + demandBonus + Math.max(0, priceFit) * 2;
    if (shoppingExamples.trim()) score += preferenceScore > 0 ? 120 + preferenceScore * 120 : -80;
    if (mission === 'variety') score += missingKindBonus * 1.5;
    if (mission === 'contract') {
      const text = (entry.label + ' ' + entry.group + ' ' + entry.kind).toLowerCase();
      const words = contractBrief.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 3);
      score += words.filter((word) => text.includes(word)).length * 10;
    }
    candidates.push({ entry, line, unitCost, score, suggestedPieces: richQuantityFor(unitCost) });
  }

  // Keep the assortment limited by boutique tier, but allow premium quantities to scale
  // with the chosen budget instead of capping every catalogue style at one piece.
  if (mission === 'contract' && selectedContract) {
    candidates.sort((a, b) => (a.contractOrder ?? 0) - (b.contractOrder ?? 0));
  } else {
    candidates.sort((a, b) => b.score - a.score || a.unitCost - b.unitCost || a.entry.label.localeCompare(b.entry.label));
  }
  const remainingCandidates = [...candidates];
  const chosen: ShopperOrderLine[] = [];
  const pickedProducts = new Set<string>();
  const pickedKinds = new Map<string, number>();
  const pickedGroups = new Map<string, number>();
  const coveredPriceBandKeys = new Set<string>();
  let spent = 0;
  const lineLimit = mission === 'contract' && selectedContract
    ? selectedContract.requirements.length
    : maxLines;

  // Re-rank after each pick. Variety and premium missions gently penalise overrepresented
  // kinds and catalogue groups, so the shopper does not fill the cart with near-copies.
  while (chosen.length < lineLimit && remainingCandidates.length) {
    let bestIndex = -1;
    if (mission === 'contract' && selectedContract) {
      bestIndex = remainingCandidates.findIndex((candidate) =>
        !pickedProducts.has([candidate.entry.kind, candidate.entry.id].join('|')),
      );
    } else {
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
        const bandKeys = hasBuyingPreferences
          ? matchingPriceBandPreferenceKeys(candidate.entry, activePreferences, candidate.line.fabric)
          : [];
        const uncoveredBandBonus = bandKeys.filter((key) => !coveredPriceBandKeys.has(key)).length * 1_000;
        const adjustedScore = candidate.score - diversityPenalty + uncoveredBandBonus;
        if (adjustedScore > bestScore) {
          bestScore = adjustedScore;
          bestIndex = i;
        }
      }
    }
    if (bestIndex < 0) break;
    const candidate = remainingCandidates.splice(bestIndex, 1)[0];
    const productKey = [candidate.entry.kind, candidate.entry.id].join('|');
    const remaining = budget - spent;
    if (remaining < candidate.unitCost) {
      if (mission === 'contract' && selectedContract) break;
      continue;
    }
    const quantity = Math.min(candidate.suggestedPieces, Math.floor(remaining / candidate.unitCost));
    if (quantity < 1) {
      if (mission === 'contract' && selectedContract) break;
      continue;
    }
    const line = { ...candidate.line, pieces: quantity };
    chosen.push(line);
    for (const key of matchingPriceBandPreferenceKeys(candidate.entry, activePreferences, line.fabric)) {
      coveredPriceBandKeys.add(key);
    }
    pickedProducts.add(productKey);
    const kind = candidate.entry.kind;
    const group = candidate.entry.group.toLowerCase();
    pickedKinds.set(kind, (pickedKinds.get(kind) || 0) + 1);
    pickedGroups.set(group, (pickedGroups.get(group) || 0) + 1);
    spent += candidate.unitCost * quantity;
  }

  if (!chosen.length) {
    if (selectedContract) {
      return { state: s, error: 'There is no missing contract quantity left to buy, or your budget cannot cover the next required item. The shopper did not add substitutes or extra products. Check existing stock and cart, or increase the budget.' };
    }
    return { state: s, error: mission === 'contract'
      ? 'I could not match that brief to affordable, unlocked Yaba Mart products. Try simpler product or category words.'
      : 'I could not find suitable products within this budget and your boutique’s current buying limits. Try a different mission or a larger budget.' };
  }

  const id = 'shopper-' + s.day + '-' + (s.msgSeq || 0) + '-' + ((s.shopperJobs || []).length + 1);
  const descriptions: Record<ShopperMission, string> = {
    restock: 'replenished low-stock designs with recent demand',
    variety: 'selected new styles to widen your assortment',
    richCustomers: 'selected a limited premium assortment within your current boutique level',
    contract: selectedContract ? `sourced the missing stock for “${selectedContract.title}”` : 'matched your brief against eligible catalogue products',
  };
  const exampleNote = mission !== 'contract' && shoppingExamples.trim()
    ? ` I prioritised catalogue items matching “${shoppingExamples.trim().slice(0, 120)}”.`
    : '';
  const filterNote = hasBuyingPreferences
    ? ` Applied ${activePreferences.length} strict category, dressing-rank and/or per-piece price filters.`
    : mission === 'richCustomers' ? ' Limited this order to the game’s luxury dressing rank.' : '';
  const summary = `Shopper returned on day ${s.day}: ${chosen.length} product lines, ${chosen.reduce((sum, line) => sum + line.pieces, 0)} pieces, estimated total ₦${spent.toLocaleString('en-NG')}. I ${descriptions[mission]}.${exampleNote}${filterNote}${selectedContract ? ` Contract deadline: Day ${selectedContract.deadlineDay}. ` : ' '}Review everything in Yaba Mart before checkout.`;
  const job: ShopperJob = {
    id, mission, budget, estimatedTotal: spent, status: 'ready',
    createdDay: s.day, completedDay: s.day, items: chosen, summary,
    ...(mission === 'contract' ? { contractBrief: (selectedContract?.brief || contractBrief).trim().slice(0, 240) } : {}),
    ...(selectedContract ? { contractId: selectedContract.id } : {}),
    ...(hasBuyingPreferences ? { preferences: activePreferences.map((row) => ({
      ...row, ranks: [...row.ranks], ...(row.priceBands ? { priceBands: [...row.priceBands] } : {}),
    })) } : {}),
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
    shopperPreferences: activePreferences.length ? activePreferences.map((row) => ({
      ...row, ranks: [...row.ranks], ...(row.priceBands ? { priceBands: [...row.priceBands] } : {}),
    })) : (s.shopperPreferences || []),
    shopperJobs: [...(s.shopperJobs || []), job].slice(-20),
    msgSeq,
    messages: [...(s.messages || []), message].slice(-500),
  };
  return { state, job };
}
