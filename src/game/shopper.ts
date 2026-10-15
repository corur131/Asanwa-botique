import { FABRIC_COLORS } from '../constants/catalog';
import { BUDGET, MARKUP, TIERS } from './economy';
import { cartTotal, displayCap, displayedCount } from './engine';
import { WANTED_COLOURS } from './colours';
import type { CartLine } from './engine';
import { canBuy, entryFor, HAIR_SWATCHES, isClothing, MARKET, pieceCost, takesColour } from './market';
import type { MarketEntry } from './market';
import type {
  CustomerClass, GameState, ShopperAudience, ProductSalesRecord, ShopperBuyingPreference, ShopperDressRank,
  ShopperJob, ShopperMission, ShopperOrderLine, ShopperPriceBand, ShopperProductCategory, StockKind,
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

const SHOPPER_CATEGORY_BY_KIND: Record<StockKind, ShopperProductCategory> = {
  top: 'top',
  bottom: 'bottom',
  dress: 'dress',
  outer: 'outer',
  shoes: 'shoes',
  bag: 'bag',
  necklace: 'jewellery',
  wrist: 'jewellery',
  earrings: 'jewellery',
  hair: 'hair',
  headwear: 'headwear',
  glasses: 'glasses',
} as Record<StockKind, ShopperProductCategory>;

export function shopperCategoryForKind(kind: StockKind): ShopperProductCategory {
  return SHOPPER_CATEGORY_BY_KIND[kind];
}

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
  if (mission === 'richCustomers') return [45_000, 110_000, 300_000, 600_000, 950_000, 1_800_000, 3_000_000][tierIndex] || 45_000;
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
  /** Do not recolour a line when it intentionally replenishes a stocked variant. */
  preserveVariant?: boolean;
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

/**
 * Fresh products should make the shop's colour palette broader, not repeat whichever
 * colours happened to sell most in the last few days. Existing variants are left alone
 * for genuine restock lines. Historical sales influence this only gently; current stock
 * and the products already chosen for this order drive the balance.
 */
function balancedShopperColour(
  entry: MarketEntry,
  s: GameState,
  records: ProductSalesRecord[],
  chosen: ShopperOrderLine[],
  offset = 0,
): string {
  const palette = entry.kind === 'hair'
    ? HAIR_SWATCHES.map((swatch) => swatch.color)
    : isClothing(entry.kind)
      // Clothes: mostly the colours customers ask for by name, plus the classic neutrals.
      ? [...new Set([...WANTED_COLOURS.map((c) => c.color), ...FABRIC_COLORS])]
      : FABRIC_COLORS;
  const options = palette.map((color) => {
    const stockUnits = s.stock
      .filter((row) => takesColour(row.kind) && row.color.toLowerCase() === color.toLowerCase())
      .reduce((sum, row) => sum + Math.max(0, row.pieces), 0);
    const orderUnits = chosen
      .filter((row) => takesColour(row.kind) && row.color.toLowerCase() === color.toLowerCase())
      .reduce((sum, row) => sum + Math.max(0, row.pieces), 0);
    const sameProduct = chosen.some((row) => row.kind === entry.kind && row.itemId === entry.id && row.color.toLowerCase() === color.toLowerCase());
    const historicUnits = records
      .filter((row) => row.color.toLowerCase() === color.toLowerCase())
      .reduce((sum, row) => sum + Math.max(0, row.units) * recency(row.day, s.day), 0);
    const wantedBonus = isClothing(entry.kind) && WANTED_COLOURS.some((c) => c.color.toLowerCase() === color.toLowerCase()) ? -1 : 0;
    return { color, score: stockUnits * 2 + orderUnits * 4 + Math.log1p(historicUnits) + wantedBonus + (sameProduct ? 1_000 : 0) };
  });
  const sorted = [...options].sort((a, b) => a.score - b.score);
  const lowestScore = sorted[0].score;
  const leastUsed = sorted.filter((option) => option.score <= lowestScore + 0.5);
  const seed = `${entry.kind}|${entry.id}|${s.day}|${offset}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return leastUsed[hash % leastUsed.length].color;
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


// ---------------------------------------------------------------------------
// Kunle, the automatic buyer. Used for Restock and Add variety when no strict
// filters are set. He thinks in customers, not in categories: he splits the
// money by who actually walks into this shop (poor / middle / rich, women / men),
// buys each style in a few of the colours customers ask for, and spends the
// budget properly instead of returning with one crop tee and a cap.
// ---------------------------------------------------------------------------

export const SHOPPER_NAME = 'Kunle';

type Segment = 'poor' | 'middle' | 'rich';
interface Role { audience: ShopperAudience; category: ShopperProductCategory; weight: number }

const WOMEN_ROLES: [ShopperProductCategory, number][] = [
  ['dress', 20], ['top', 9], ['bottom', 8], ['shoes', 12], ['hair', 10], ['bag', 7],
  ['headwear', 6], ['jewellery', 9], ['outer', 5], ['glasses', 2],
];
const MEN_ROLES: [ShopperProductCategory, number][] = [
  ['top', 24], ['bottom', 18], ['dress', 12], ['shoes', 14], ['headwear', 6], ['outer', 6], ['jewellery', 3], ['glasses', 2],
];
/** Matches generateRandomCustomer(): roughly a quarter of walk-ins are men. */
const MEN_SHARE = 0.26;
/** Rough spending power per segment, used to split the budget between them. */
const SEGMENT_SPEND: Record<Segment, number> = { poor: 1, middle: 2.2, rich: 6 };
const SEGMENT_GOAL_RANK: Record<Segment, ShopperDressRank> = { poor: 0, middle: 1, rich: 2 };
/** Most pieces of one colourway he will bring back, so nothing floods the store room. */
const SEGMENT_PIECE_CAP: Record<Segment, number> = { poor: 6, middle: 4, rich: 2 };

function hashOf(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
  return hash;
}

function audienceFits(entry: MarketEntry, audience: ShopperAudience) {
  return entry.for === 'both' || (audience === 'women' ? entry.for === 'f' : entry.for === 'm');
}

/** Wholesale cost window a segment can realistically pay for one piece. */
function segmentWindow(segment: Segment, s: GameState, retailCeiling: number): { min: number; target: number; max: number } {
  const ceilingCost = retailCeiling / MARKUP;
  if (segment === 'poor') return { min: 800, target: 3_500, max: Math.min(ceilingCost, (BUDGET.poor[1] * 0.55) / MARKUP) };
  if (segment === 'middle') return { min: 4_000, target: 14_000, max: Math.min(ceilingCost, (BUDGET.middle[1] * 0.6) / MARKUP) };
  const tierIndex = Math.max(0, Math.min(TIERS.length - 1, Math.floor(s.tier || 0)));
  const richTarget = [25_000, 40_000, 90_000, 180_000, 320_000, 520_000, 800_000][tierIndex] || 25_000;
  return { min: 18_000, target: Math.min(richTarget, ceilingCost), max: ceilingCost };
}

export interface ShopperPlanNote { segment: Segment; label: string; pieces: number; colours: string[] }

interface AutoPick {
  entry: MarketEntry;
  segment: Segment;
  lines: ShopperOrderLine[];
  unitCost: number;
  cap: number;
}

/**
 * Plan fresh styles for the shop. `mustCover` lists categories the shop has nothing
 * in; those are bought first so the racks are never missing shoes, bags or hair.
 */
function planFreshStyles(
  s: GameState,
  mission: ShopperMission,
  budget: number,
  styleLimit: number,
  records: ProductSalesRecord[],
  shoppingExamples: string,
  alreadyChosen: ShopperOrderLine[],
  mustCover: Set<ShopperProductCategory>,
): { picks: AutoPick[]; spent: number } {
  const retailCeiling = shopperPriceCeiling(s, mission);
  const tierIndex = Math.max(0, Math.min(TIERS.length - 1, Math.floor(s.tier || 0)));
  const mix = TIERS[tierIndex].mix;
  const rawShares = CLASS_ORDER.map((cls, i) => mix[i] * SEGMENT_SPEND[cls]);
  const totalShare = rawShares.reduce((a, b) => a + b, 0) || 1;
  const segments = CLASS_ORDER
    .map((cls, i) => ({ segment: cls as Segment, share: rawShares[i] / totalShare }))
    .filter((row) => row.share >= 0.04);

  const stockedProducts = new Set(s.stock.map((d) => `${d.kind}|${d.itemId}`));
  const takenProducts = new Set(alreadyChosen.map((l) => `${l.kind}|${l.itemId}`));
  const tripSeed = `${s.day}|${(s.shopperJobs || []).length}|${s.msgSeq || 0}`;
  const examplesGiven = !!shoppingExamples.trim();

  const eligible = MARKET.filter((entry) => {
    if (!canBuy(entry, s.tier)) return false;
    const cost = pieceCost(entry, isClothing(entry.kind) ? entry.fabric || 'plain' : undefined);
    return Number.isFinite(cost) && cost > 0 && cost * MARKUP <= retailCeiling;
  });

  const picks: AutoPick[] = [];
  const chosenLines = [...alreadyChosen];
  let spent = 0;
  let nativeCount = 0;
  let englishCount = 0;

  const choose = (role: { audience?: ShopperAudience; category: ShopperProductCategory }, segment: Segment, segBudgetPerPick: number) => {
    const kinds = SHOPPER_PREFERENCE_CATEGORIES.find((row) => row.id === role.category)?.kinds || [];
    const window = segmentWindow(segment, s, retailCeiling);
    const pool = eligible.filter((entry) => kinds.includes(entry.kind) &&
      (!role.audience || audienceFits(entry, role.audience)) &&
      !takenProducts.has(`${entry.kind}|${entry.id}`) &&
      !stockedProducts.has(`${entry.kind}|${entry.id}`));
    if (!pool.length) return null;
    const inWindow = pool.filter((entry) => {
      const cost = pieceCost(entry, isClothing(entry.kind) ? entry.fabric || 'plain' : undefined);
      return cost >= window.min * 0.6 && cost <= window.max;
    });
    const options = inWindow.length ? inWindow : pool;
    let best: MarketEntry | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const entry of options) {
      const cost = pieceCost(entry, isClothing(entry.kind) ? entry.fabric || 'plain' : undefined);
      if (cost > budget - spent) continue;
      const rank = shopperDressRank(entry);
      const goal = SEGMENT_GOAL_RANK[segment];
      let score = -Math.abs(Math.log(cost / Math.max(1, window.target))) * 1.6;
      score += rank === goal ? 2.5 : rank > goal ? (segment === 'poor' ? -3 : 0.8) : -1.5;
      score += Math.min(6, demandScore(records, entry, s, mission) * 0.8);
      if (examplesGiven) score += shopperPreferenceScore(entry, shoppingExamples) * 5;
      if (['dress', 'top', 'bottom'].includes(entry.kind)) {
        if (entry.native && nativeCount < englishCount) score += 1.5;
        if (!entry.native && englishCount < nativeCount) score += 1.5;
      }
      if (entry.kind === 'headwear' && /gele/i.test(entry.label) && role.audience !== 'men') score += 2;
      if (entry.kind === 'shoes' && segment !== 'poor' && /slide|flip|sneaker/i.test(entry.label)) score -= 1;
      // A different, sensible selection each trip instead of the same list every time.
      score += (hashOf(`${tripSeed}|${entry.kind}|${entry.id}`) % 1000) / 1000 * 2.2;
      if (cost * 1 > segBudgetPerPick * 1.6) score -= 2;
      if (score > bestScore) { bestScore = score; best = entry; }
    }
    if (!best) return null;
    const entry = best;
    const unitCost = pieceCost(entry, isClothing(entry.kind) ? entry.fabric || 'plain' : undefined);
    const cap = SEGMENT_PIECE_CAP[segment];
    const affordable = Math.floor((budget - spent) / unitCost);
    let units = Math.max(1, Math.min(affordable, Math.floor(segBudgetPerPick / unitCost), cap * 3));
    if (units < 1) return null;
    // Clothes come in two or three colourways that share one rack slot; customers ask
    // for colours by name, so this is what lets her actually say "yes, I have it in blue".
    const colourways = isClothing(entry.kind)
      ? Math.max(1, Math.min(segment === 'rich' ? 2 : 3, Math.ceil(units / 2)))
      : 1;
    units = Math.min(units, colourways * cap);
    const base = candidateLine(entry, s, mission, records, undefined, 1);
    const lines: ShopperOrderLine[] = [];
    let left = units;
    for (let c = 0; c < colourways && left > 0; c++) {
      const pieces = Math.ceil(left / (colourways - c));
      left -= pieces;
      let color = base.color;
      let pattern = base.pattern;
      let color2 = base.color2;
      if (takesColour(entry.kind)) {
        color = isClothing(entry.kind) || entry.kind === 'hair'
          ? balancedShopperColour(entry, s, records, chosenLines, c)
          : balancedShopperColour(entry, s, records, chosenLines);
        if (entry.kind === 'hair') pattern = Math.max(0, HAIR_SWATCHES.findIndex((sw) => sw.color === color));
        color2 = isClothing(entry.kind) ? base.color2 : color;
      }
      const line = toLine(entry, { fabric: base.fabric, color, color2, pattern, pieces });
      if (lines.some((l) => l.key === line.key)) { lines[lines.findIndex((l) => l.key === line.key)].pieces += pieces; continue; }
      lines.push(line);
      chosenLines.push(line);
    }
    takenProducts.add(`${entry.kind}|${entry.id}`);
    if (['dress', 'top', 'bottom'].includes(entry.kind)) entry.native ? nativeCount++ : englishCount++;
    spent += unitCost * units;
    const pick: AutoPick = { entry, segment, lines, unitCost, cap };
    picks.push(pick);
    return pick;
  };

  // 1. Categories the shop has nothing in at all.
  for (const category of mustCover) {
    if (picks.length >= styleLimit) break;
    const segment = segments.find((row) => row.segment === 'middle')?.segment || segments[0]?.segment || 'poor';
    const perPick = (budget * 0.5) / Math.max(1, styleLimit);
    // Most walk-ins are women, so cover a category for them first; men's-only categories still work.
    if (!choose({ audience: 'women', category }, segment, perPick)) choose({ category }, segment, perPick);
  }

  // 2. Split the rest of the styles between customer segments and women/men roles.
  const remainingStyles = Math.max(0, styleLimit - picks.length);
  const roles: Role[] = [
    ...WOMEN_ROLES.map(([category, weight]) => ({ audience: 'women' as const, category, weight: weight * (1 - MEN_SHARE) })),
    ...MEN_ROLES.map(([category, weight]) => ({ audience: 'men' as const, category, weight: weight * MEN_SHARE })),
  ];
  const roleWeight = roles.reduce((a, r) => a + r.weight, 0);
  const startSpent = spent;
  const freeBudget = Math.max(0, budget - startSpent);
  for (const { segment, share } of segments) {
    const segStyles = Math.max(1, Math.round(remainingStyles * share));
    const segBudget = freeBudget * share;
    const perPick = segBudget / segStyles;
    const taken = new Map<string, number>();
    let made = 0;
    let attempts = 0;
    while (made < segStyles && attempts < segStyles * 4 && picks.length < styleLimit) {
      attempts++;
      let bestRole = roles[0];
      let bestDeficit = Number.NEGATIVE_INFINITY;
      for (const role of roles) {
        const key = `${role.audience}|${role.category}`;
        const deficit = (role.weight / roleWeight) * (made + 1) - (taken.get(key) || 0);
        if (deficit > bestDeficit) { bestDeficit = deficit; bestRole = role; }
      }
      const key = `${bestRole.audience}|${bestRole.category}`;
      taken.set(key, (taken.get(key) || 0) + 1);
      if (choose(bestRole, segment, perPick)) made++;
    }
  }

  // 3. Money left over goes into more pieces of what he already picked, everyday
  // segments first, up to each colourway's cap.
  const order: Segment[] = ['middle', 'poor', 'rich'];
  let grew = true;
  while (grew && spent < budget * 0.92) {
    grew = false;
    for (const segment of order) {
      for (const pick of picks.filter((p) => p.segment === segment)) {
        for (const line of pick.lines) {
          if (line.pieces >= pick.cap || spent + pick.unitCost > budget) continue;
          line.pieces += 1;
          spent += pick.unitCost;
          grew = true;
        }
      }
    }
  }
  return { picks, spent };
}

function colourName(hex: string) {
  return WANTED_COLOURS.find((c) => c.color.toLowerCase() === hex.toLowerCase())?.name
    || HAIR_SWATCHES.find((c) => c.color.toLowerCase() === hex.toLowerCase())?.label?.toLowerCase()
    || '';
}

/** Kunle's report, in his own voice, explaining what he bought and why. */
function kunleReport(
  s: GameState,
  mission: ShopperMission,
  picks: AutoPick[],
  restockLines: ShopperOrderLine[],
  spent: number,
  budget: number,
  shoppingExamples: string,
): string {
  const naira = (n: number) => `₦${Math.round(n)?.toLocaleString('en-NG')}`;
  const pieces = [...restockLines, ...picks.flatMap((p) => p.lines)].reduce((a, l) => a + l.pieces, 0);
  const openers = [
    'Madam Divine! I don land from Yaba market.',
    'I\'m back o! That market was hot today but I found good things.',
    'Boss lady, I don return. See wetin I carry come.',
    'I don come back from market. Traders tried to cheat me but I stood my ground.',
  ];
  const opener = openers[hashOf(`${s.day}|${(s.shopperJobs || []).length}`) % openers.length];
  const parts = [opener];
  if (restockLines.length) {
    parts.push(`I topped up ${restockLines.length} of your bestsellers (${restockLines.reduce((a, l) => a + l.pieces, 0)} pieces) so you don't run out.`);
  } else if (mission === 'restock') {
    parts.push('Nothing has been selling fast enough to need a top-up yet, so I filled the gaps on your racks instead.');
  }
  const bySegment = (segment: Segment) => picks.filter((p) => p.segment === segment);
  const describe = (list: AutoPick[]) => list.slice(0, 3).map((p) => p.entry.label).join(', ');
  const poor = bySegment('poor');
  const middle = bySegment('middle');
  const rich = bySegment('rich');
  if (poor.length) parts.push(`For everyday customers: ${describe(poor)}${poor.length > 3 ? ` and ${poor.length - 3} more` : ''}. Cheap enough to move fast.`);
  if (middle.length) parts.push(`For the working-class madams and oga: ${describe(middle)}${middle.length > 3 ? ` and ${middle.length - 3} more` : ''}.`);
  if (rich.length) parts.push(`And for the big spenders: ${describe(rich)}${rich.length > 3 ? ` and ${rich.length - 3} more` : ''}.`);
  const men = picks.filter((p) => p.entry.for === 'm').length;
  if (men) parts.push(`I didn't forget the men: ${men} style${men === 1 ? '' : 's'} for them.`);
  const native = picks.filter((p) => p.entry.native).length;
  if (native) parts.push(`${native} native piece${native === 1 ? '' : 's'} for owambe and church people.`);
  const colours = [...new Set(picks.filter((p) => isClothing(p.entry.kind)).flatMap((p) => p.lines.map((l) => colourName(l.color))).filter(Boolean))];
  if (colours.length >= 3) parts.push(`I bought the clothes in different colours customers dey ask for (${colours.slice(0, 5).join(', ')}), and the extra colours share one rack space.`);
  if (shoppingExamples.trim()) parts.push(`You asked for “${shoppingExamples.trim().slice(0, 120)}”, so I looked for that first.`);
  parts.push(`Total: ${pieces} pieces for ${naira(spent)} out of ${naira(budget)}.`);
  if (budget - spent > budget * 0.15) parts.push(`I kept ${naira(budget - spent)} back. I no see anything else worth the money, and I no wan flood your store room.`);
  parts.push('Check the cart in Yaba Mart before you pay.');
  return parts.join(' ');
}

function finishOrder(
  s: GameState,
  mission: ShopperMission,
  budget: number,
  chosen: ShopperOrderLine[],
  spent: number,
  summary: string,
  activePreferences: ShopperBuyingPreference[],
  selectedContract?: NonNullable<GameState['politicianContracts']>[number],
  contractBrief = '',
): { state: GameState; job: ShopperJob } {
  const hasBuyingPreferences = activePreferences.length > 0;
  const id = 'shopper-' + s.day + '-' + (s.msgSeq || 0) + '-' + ((s.shopperJobs || []).length + 1);
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
    id: msgSeq, day: s.day, from: `${SHOPPER_NAME} (Shopper)`, text: summary, tone: 'good' as const,
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

/** Restock + Add variety without strict filters: Kunle plans the order himself. */
function prepareAutoOrder(
  s: GameState,
  mission: ShopperMission,
  budget: number,
  shoppingExamples: string,
): { state: GameState; job?: ShopperJob; error?: string } {
  const records = s.productSales || [];
  const tierIndex = Math.max(0, Math.min(TIERS.length - 1, Math.floor(s.tier || 0)));
  const retailCeiling = shopperPriceCeiling(s, mission);
  let spent = 0;

  // 1. Restock: bestsellers that are low or sold out, ordered by how fast they sell.
  const restockLines: ShopperOrderLine[] = [];
  if (mission === 'restock') {
    const ranked = s.stock.map((variant) => {
      const entry = entryFor(variant.kind, variant.itemId);
      const sameVariant = (row: ProductSalesRecord) => row.kind === variant.kind && row.itemId === variant.itemId &&
        row.fabric === variant.fabric && row.color === variant.color && row.color2 === variant.color2 && row.pattern === variant.pattern;
      const recent = records.filter((row) => sameVariant(row) && row.day >= s.day - 14).reduce((a, r) => a + r.units, 0);
      const month = records.filter((row) => sameVariant(row) && row.day >= s.day - 30).reduce((a, r) => a + r.units, 0);
      return { variant, entry, recent, month };
    }).filter((row) => row.entry && canBuy(row.entry, s.tier) && (row.recent > 0 || (row.month > 0 && row.variant.pieces <= 0)))
      .sort((a, b) => b.recent - a.recent || b.month - a.month);
    for (const { variant, entry, recent, month } of ranked) {
      const target = Math.min(12, Math.max(3, Math.ceil(Math.max(recent, month / 2) * 1.2)));
      const need = target - Math.max(0, variant.pieces);
      if (need <= 0) continue;
      const line = candidateLine(entry!, s, mission, records, variant, need);
      const unitCost = pieceCost(entry!, isClothing(entry!.kind) ? line.fabric : undefined);
      if (!Number.isFinite(unitCost) || unitCost <= 0) continue;
      const pieces = Math.min(need, Math.floor((budget * 0.75 - spent) / unitCost));
      if (pieces < 1) continue;
      restockLines.push({ ...line, pieces });
      spent += unitCost * pieces;
    }
  }

  // 2. Fresh styles: fill empty categories first, then plan by customer segment.
  const eligibleCategories = new Set(MARKET.filter((entry) => canBuy(entry, s.tier) &&
    pieceCost(entry, isClothing(entry.kind) ? entry.fabric || 'plain' : undefined) * MARKUP <= retailCeiling)
    .map((entry) => shopperCategoryForKind(entry.kind)));
  const stockedCategories = new Set(s.stock.filter((d) => d.pieces > 0).map((d) => shopperCategoryForKind(d.kind)));
  for (const line of restockLines) stockedCategories.add(shopperCategoryForKind(line.kind));
  const mustCover = new Set([...eligibleCategories].filter((c) => !stockedCategories.has(c)));
  const freeSlots = Math.max(0, displayCap(s) - displayedCount(s));
  const tierStyles = [8, 12, 16, 22, 28, 34, 40][tierIndex] || 8;
  // Full racks don't stop him: new styles wait in the store room and she swaps them in.
  let styleLimit = tierStyles;
  if (mission === 'restock') styleLimit = restockLines.length ? Math.max(mustCover.size, Math.ceil(styleLimit / 2)) : styleLimit;
  styleLimit = Math.max(styleLimit, mustCover.size);
  const freshBudget = Math.max(0, budget - spent);
  const { picks, spent: freshSpent } = planFreshStyles(
    s, mission, freshBudget, styleLimit, records, shoppingExamples, restockLines, mustCover,
  );
  spent += freshSpent;
  const chosen = [...restockLines, ...picks.flatMap((p) => p.lines)].filter((l) => l.pieces > 0);
  if (!chosen.length) {
    return { state: s, error: 'Kunle could not find anything worth buying within this budget and your shop level. Try a bigger budget.' };
  }
  let summary = kunleReport(s, mission, picks, restockLines, spent, budget, shoppingExamples);
  if (picks.length > freeSlots) {
    summary = summary.replace('Check the cart', `Your racks only have space for ${freeSlots} new style${freeSlots === 1 ? '' : 's'}, so the rest go to the store room. Swap them in at the start of the day, or buy another rail. Check the cart`);
  }
  return finishOrder(s, mission, budget, chosen, spent, summary, []);
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
  if ((mission === 'variety' || mission === 'restock') && !hasBuyingPreferences) {
    return prepareAutoOrder(s, mission, budget, shoppingExamples);
  }

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
  const stockedCategories = new Set<ShopperProductCategory>(
    s.stock.filter((design) => design.pieces > 0).map((design) => shopperCategoryForKind(design.kind)),
  );
  const normalCeiling = shopperPriceCeiling(s, mission);
  const priceCeiling = normalCeiling;
  const maxLines = [6, 8, 10, 13, 16, 20, 24][Math.max(0, Math.min(6, Math.floor(s.tier || 0)))] || 6;
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
        preserveVariant: !!variants.length,
      });
      continue;
    }
    if (mission === 'restock' && variants.length) {
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
          preserveVariant: true,
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
        candidates.push({ entry, line, unitCost, score, suggestedPieces: richQuantityFor(unitCost), preserveVariant: true });
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
  const pickedCategories = new Set<ShopperProductCategory>();
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
    let coveringCategory: ShopperProductCategory | null = null;
    if (mission === 'contract' && selectedContract) {
      bestIndex = remainingCandidates.findIndex((candidate) =>
        !pickedProducts.has([candidate.entry.kind, candidate.entry.id].join('|')),
      );
    } else {
      // Cover each available shopper category before spending the whole order on repeats.
      // Restock only targets categories that currently have no pieces; Variety/premium
      // missions spread their new assortment across the eligible categories in the catalogue.
      const remainingBudget = budget - spent;
      const coverageOptions = remainingCandidates
        .map((candidate, index) => ({ candidate, index, category: shopperCategoryForKind(candidate.entry.kind) }))
        .filter(({ candidate, index, category }) =>
          !pickedProducts.has([candidate.entry.kind, candidate.entry.id].join('|')) &&
          !pickedCategories.has(category) &&
          (mission !== 'restock' || !stockedCategories.has(category)) &&
          candidate.unitCost <= remainingBudget,
        )
        // Best product for each category, not the cheapest one; keep each category's
        // first pick within a fair share of the money still unspent.
        .sort((a, b) => {
          const share = remainingBudget / Math.max(1, lineLimit - chosen.length);
          const aFits = a.candidate.unitCost <= share ? 1 : 0;
          const bFits = b.candidate.unitCost <= share ? 1 : 0;
          return bFits - aFits || b.candidate.score - a.candidate.score ||
            b.candidate.unitCost - a.candidate.unitCost || a.index - b.index;
        });
      if (coverageOptions.length && chosen.length < lineLimit) {
        bestIndex = coverageOptions[0].index;
        coveringCategory = coverageOptions[0].category;
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
    }
    if (bestIndex < 0) break;
    const candidate = remainingCandidates.splice(bestIndex, 1)[0];
    const productKey = [candidate.entry.kind, candidate.entry.id].join('|');
    const remaining = budget - spent;
    if (remaining < candidate.unitCost) {
      if (mission === 'contract' && selectedContract) break;
      continue;
    }
    const affordableQuantity = Math.floor(remaining / candidate.unitCost);
    const quantity = coveringCategory
      ? Math.min(1, affordableQuantity)
      : Math.min(candidate.suggestedPieces, affordableQuantity);
    if (quantity < 1) {
      if (mission === 'contract' && selectedContract) break;
      continue;
    }
    let line: ShopperOrderLine = { ...candidate.line, pieces: quantity };
    if (!candidate.preserveVariant && takesColour(line.kind)) {
      const color = balancedShopperColour(candidate.entry, s, records, chosen);
      const pattern = line.kind === 'hair'
        ? Math.max(0, HAIR_SWATCHES.findIndex((swatch) => swatch.color === color))
        : line.pattern;
      const color2 = isClothing(line.kind) ? line.color2 : color;
      const colourAdjusted = { ...line, color, color2, pattern };
      line = { ...colourAdjusted, key: cartKey(colourAdjusted) };
    }
    chosen.push(line);
    pickedCategories.add(shopperCategoryForKind(candidate.entry.kind));
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

  const descriptions: Record<ShopperMission, string> = {
    restock: 'replenished low-stock designs with recent demand',
    variety: 'selected new styles to widen your assortment',
    richCustomers: 'picked premium pieces your rich clients will respect',
    contract: selectedContract ? `sourced the missing stock for “${selectedContract.title}”` : 'matched your brief against eligible catalogue products',
  };
  const exampleNote = mission !== 'contract' && shoppingExamples.trim()
    ? ` I prioritised catalogue items matching “${shoppingExamples.trim().slice(0, 120)}”.`
    : '';
  const filterNote = hasBuyingPreferences
    ? ` I stuck strictly to your ${activePreferences.length} shopping filter${activePreferences.length === 1 ? '' : 's'}.`
    : mission === 'richCustomers' ? ' Only top-rank luxury pieces, nothing cheap.' : '';
  const pieces = chosen.reduce((sum, line) => sum + line.pieces, 0);
  const summary = `${SHOPPER_NAME} is back: ${chosen.length} product lines, ${pieces} pieces, ₦${spent?.toLocaleString('en-NG')} total. I ${descriptions[mission]}.${exampleNote}${filterNote}${selectedContract ? ` Contract deadline: Day ${selectedContract.deadlineDay}. ` : ' '}Check the cart in Yaba Mart before you pay.`;
  return finishOrder(s, mission, budget, chosen, spent, summary, activePreferences, selectedContract, contractBrief);
}
