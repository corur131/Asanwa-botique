import { FabricId } from '../types/character';
import { AccessoryItem, BAGS, EARRINGS, GLASSES, HAIR_PRODUCTS, HEADWEAR, NECKLACES, SHOES, WARDROBE, WRIST, WardrobeItem } from '../constants/catalog';
import { EARRING_PRICE, FABRIC_COST, PIECES_PER_DESIGN, TIERS } from './economy';
import { Design, StockKind } from './types';

/** Anything sold at the market, clothes or accessory, in one shape. */
export interface MarketEntry {
  kind: StockKind;
  id: string;
  label: string;
  /** Wholesale price for one piece in the default fabric. */
  price: number;
  for: 'f' | 'm' | 'both';
  native: boolean;
  luxury: boolean;
  group: string;
  fabric?: FabricId;
  wardrobe?: WardrobeItem;
  /** Reuse high-quality renderer assets while keeping market IDs and prices independent. */
  renderId?: string;
  minTier?: number;
}

export type MarketCategory = 'top' | 'bottom' | 'dress' | 'outer' | 'suiting' | 'shoes' | 'bag' | 'headwear' | 'jewellery' | 'glasses' | 'hair';
export const MARKET_CATEGORIES: { id: MarketCategory; label: string }[] = [
  { id: 'top', label: 'Tops' },
  { id: 'bottom', label: 'Bottoms' },
  { id: 'dress', label: 'Dresses & Gowns' },
  { id: 'outer', label: 'Outerwear' },
  { id: 'suiting', label: 'Suits & tailoring' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'bag', label: 'Bags' },
  { id: 'headwear', label: 'Headwear' },
  { id: 'jewellery', label: 'Jewellery' },
  { id: 'glasses', label: 'Eyewear' },
  { id: 'hair', label: 'Wigs & braids' },
];

const acc = (kind: StockKind, list: AccessoryItem[], group: string): MarketEntry[] =>
  list.filter((a) => a.id !== 'none').map((a) => ({
    kind, id: a.id, label: a.label, price: a.price, for: a.for, native: !!a.native,
    luxury: a.price >= 10_000, group, renderId: a.renderId || a.id, minTier: a.minTier,
  }));

export const MARKET: MarketEntry[] = [
  ...WARDROBE.map((w) => ({
    kind: w.slot as StockKind, id: w.id, label: w.label, price: w.price, for: w.for, native: w.native,
    luxury: w.cls === 'rich', group: w.group, fabric: w.fabric, wardrobe: w,
    renderId: w.renderId || w.id, minTier: w.minTier,
  })),
  ...acc('shoes', SHOES, 'Shoes'),
  ...acc('bag', BAGS, 'Bags'),
  ...acc('headwear', HEADWEAR, 'Headwear'),
  ...acc('hair', HAIR_PRODUCTS, 'Wigs & Braided Hair'),
  ...acc('necklace', NECKLACES, 'Necklaces'),
  ...acc('wrist', WRIST, 'Wrist'),
  ...acc('glasses', GLASSES, 'Eyewear'),
  ...EARRINGS.filter((e) => e.id !== 'none').map((e) => ({ kind: 'earrings' as StockKind, id: e.id, label: e.label, price: EARRING_PRICE[e.id] || 4_000, for: 'f' as const, native: e.id === 'coralDrops', luxury: false, group: 'Earrings' })),
];

export const entryFor = (kind: StockKind, id: string) => MARKET.find((m) => m.kind === kind && m.id === id);

export function inCategory(e: MarketEntry, cat: MarketCategory) {
  if (cat === 'jewellery') return e.kind === 'necklace' || e.kind === 'wrist' || e.kind === 'earrings';
  if (cat === 'suiting') return /suit|tuxedo|tailor/i.test(e.label + ' ' + e.group);
  return e.kind === cat;
}

/** Clothes take a fabric; accessories keep a single colour. */
export const isClothing = (k: StockKind) => k === 'top' || k === 'bottom' || k === 'dress' || k === 'outer';

/** Colour matters for these accessories; jewellery and glasses are fixed. */
export const takesColour = (k: StockKind) => isClothing(k) || k === 'shoes' || k === 'bag' || k === 'headwear' || k === 'hair';

export function pieceCost(e: MarketEntry, fabric?: FabricId) {
  if (!isClothing(e.kind) || !fabric) return e.price;
  const base = FABRIC_COST[e.fabric || 'plain'] || 1;
  return Math.round(((e.price * (FABRIC_COST[fabric] || 1)) / base) / 100) * 100;
}

/** Cheap → mid → high → expensive → very expensive retail assortment ladder. */
export type PriceBand = 'Cheap' | 'Mid' | 'High' | 'Expensive' | 'Very expensive';
export function priceBand(price: number): PriceBand {
  if (price < 10_000) return 'Cheap';
  if (price < 40_000) return 'Mid';
  if (price < 150_000) return 'High';
  if (price < 500_000) return 'Expensive';
  return 'Very expensive';
}

/** Hair merchandise colourways map to actual renderer hair-palette IDs via pattern. */
export const HAIR_SWATCHES = [
  { id: 'black', label: 'Natural Black', color: '#1E1E24' },
  { id: 'darkBrown', label: 'Espresso Brown', color: '#5A3A28' },
  { id: 'burgundy', label: 'Burgundy', color: '#8E1F3A' },
  { id: 'ginger', label: 'Ginger Copper', color: '#E86A2E' },
  { id: 'honeyBlonde', label: 'Honey Blonde', color: '#C9A163' },
  { id: 'platinum', label: 'Platinum Blonde', color: '#F6F1E8' },
  { id: 'ombre', label: 'Ombre Violet', color: '#7A3A8C' },
] as const;

export const minTierFor = (e: MarketEntry) => e.minTier ?? (e.luxury ? 2 : 0);
export const canBuy = (e: MarketEntry, tier: number) => tier >= minTierFor(e);

/** One rack slot represents a garment/product style. Fabric, print and colour remain selectable stocked variants. */
export function productKey(d: Pick<Design, 'kind' | 'itemId' | 'fabric' | 'color2' | 'pattern'>): string {
  return [d.kind, d.itemId].join('|');
}

let uidCounter = Date.now() % 100000;
export function makeDesign(e: MarketEntry, o: { fabric?: FabricId; color: string; color2: string; pattern: number; pieces?: number }): Design {
  const fabric = isClothing(e.kind) ? o.fabric || e.fabric || 'plain' : 'plain';
  return {
    uid: `d${(uidCounter++).toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
    kind: e.kind,
    itemId: e.id,
    label: e.label,
    fabric,
    color: o.color,
    color2: o.color2,
    pattern: o.pattern,
    cost: pieceCost(e, fabric),
    pieces: o.pieces ?? PIECES_PER_DESIGN,
    displayed: false,
  };
}
