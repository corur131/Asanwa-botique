// Sale days. Divine announces 10, 20 or 30% off for tomorrow (one sale a week). The shop
// gets a crowd, every price is discounted at checkout (staff too), Gidigram spreads the
// word and rivals react. Black Friday and Detty December pull even bigger crowds.
import { dateLabel, monthOf } from './climate';
import { gramNote } from './gram';
import { reactToSale } from './rivals';
import type { GameState, SaleDay, SaleOff } from './types';

export const SALE_OFFS: SaleOff[] = [10, 20, 30];
/** How many more people come, by discount. */
export const SALE_BOOST: Record<SaleOff, number> = { 10: 1.25, 20: 1.5, 30: 1.8 };
/** Days between sales. */
export const SALE_GAP = 7;

/** Black Friday is the last week of November; Detty December is all of December. */
export function saleEvent(day: number): 'Black Friday' | 'Detty December' | null {
  const dom = ((Math.max(1, day) - 1) % 30) + 1;
  if (monthOf(day) === 10 && dom >= 23) return 'Black Friday';
  if (monthOf(day) === 11) return 'Detty December';
  return null;
}
const EVENT_BOOST = { 'Black Friday': 1.25, 'Detty December': 1.15 } as const;

/** Today's sale, if one is running. */
export const saleToday = (s: GameState): SaleDay | undefined => (s.sale && s.sale.day === s.day ? s.sale : undefined);
/** A sale announced for a later day. */
export const saleAhead = (s: GameState): SaleDay | undefined => (s.sale && s.sale.day > s.day ? s.sale : undefined);
/** Today's discount as a fraction (0 when there is no sale). */
export const saleOff = (s: GameState) => (saleToday(s)?.off || 0) / 100;

/** What the customer pays at checkout for a tag price. */
export function salePrice(s: GameState, price: number): number {
  const off = saleOff(s);
  if (!off) return price;
  const v = price * (1 - off);
  return v < 20_000 ? Math.round(v / 100) * 100 : Math.round(v / 500) * 500;
}

/** How much busier the shop is today because of a sale (1 = no sale). */
export function saleTraffic(s: GameState): number {
  const sale = saleToday(s);
  if (!sale) return 1;
  const event = saleEvent(sale.day);
  // A sale only a week after the last one: some shoppers already bought last time.
  const tired = sale.prev && sale.day - sale.prev <= 14 ? 0.85 : 1;
  const split = sale.rivalCounter ? 0.9 : 1;
  return SALE_BOOST[sale.off] * (event ? EVENT_BOOST[event] : 1) * tired * split;
}

/** The first day a new sale could run. */
export const nextSaleDay = (s: GameState) => Math.max(s.day + 1, (s.lastSaleDay ?? -99) + SALE_GAP);

export function canPlanSale(s: GameState): { ok: boolean; reason?: string } {
  if (s.phase !== 'evening') return { ok: false, reason: 'Announce a sale in the evening, after closing.' };
  if (saleAhead(s)) return { ok: false, reason: 'A sale is already announced.' };
  const first = nextSaleDay(s);
  if (first > s.day + 1) return { ok: false, reason: `One sale a week. The next one can run on day ${first} (${dateLabel(first)}).` };
  return { ok: true };
}

/** Announce a sale for tomorrow: a Gidigram post, the blog, and the rivals all hear about it. */
export function planSale(s0: GameState, off: SaleOff): GameState {
  if (!canPlanSale(s0).ok || !SALE_OFFS.includes(off)) return s0;
  const day = s0.day + 1;
  const event = saleEvent(day);
  const fans = s0.followers || 0;
  const gained = Math.round(Math.min(600, 10 + fans * 0.004 * (off / 10)) * (event ? 1.3 : 1));
  let s: GameState = { ...s0, sale: { day, off, prev: s0.lastSaleDay }, lastSaleDay: day, followers: fans + gained };
  s = gramNote(s, `Your sale post is up: "${event ? `${event} at Asanwa Boutique! ` : ''}${off}% OFF EVERYTHING tomorrow 🛍️". +${gained?.toLocaleString('en-NG')} followers and the shares are flying.`, 'like');
  const r = reactToSale(s, off, event);
  s = r.s;
  if (r.counter) s = { ...s, sale: { ...s.sale!, rivalCounter: r.counter } };
  return s;
}

/** Call off an announced sale (some followers are disappointed). */
export function cancelSale(s: GameState): GameState {
  const sale = saleAhead(s);
  if (!sale) return s;
  const lost = Math.round(Math.min(200, (s.followers || 0) * 0.003));
  return gramNote({ ...s, sale: undefined, lastSaleDay: sale.prev, followers: Math.max(0, (s.followers || 0) - lost) }, `You called off the sale. Some followers are vexed: -${lost} followers.`, 'comment');
}
