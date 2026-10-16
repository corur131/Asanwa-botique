// Online orders through Gidigram DMs. Followers who saw the shop's posts message to buy
// something in stock; Divine accepts, gives a little discount, or declines. A dispatch rider
// delivers it: transfer-first orders are paid up front, pay-on-delivery ones sometimes fail
// at the door, and Lagos traffic can push a delivery to the next day.
import { MARKUP, naira } from './economy';
import type { Design, DmOrder, GameState } from './types';
import { saleOff } from './sales';

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const chance = (p: number) => Math.random() < p;

/** Lagos areas and what a dispatch rider charges to get there. */
export const AREAS: readonly [string, number][] = [
  ['Yaba', 1_500], ['Surulere', 2_000], ['Ikeja', 2_500], ['Gbagada', 2_500], ['Maryland', 2_500], ['Ojota', 3_000],
  ['Festac', 3_500], ['Ikoyi', 4_500], ['Victoria Island', 4_500], ['Lekki Phase 1', 5_000], ['Ajah', 6_000], ['Ikorodu', 6_000],
];
const FIRST = ['Adaeze', 'Funmi', 'Kemi', 'Ngozi', 'Halima', 'Tola', 'Bisi', 'Zainab', 'Ifeoma', 'Temi', 'Chiamaka', 'Yetunde', 'Ese', 'Uche', 'Bukola', 'Damilola', 'Obinna', 'Tunde', 'Segun', 'Emeka'];
const HANDLE_END = ['_xo', '.styles', '_ng', '01', '_lagos', '.k', '_official', 'xx', '_luxe', ''];

/** How much one piece sells for in the shop. */
const retail = (d: Design) => roundPrice(d.cost * MARKUP);
/** Naira prices: to the nearest ₦100 for small amounts, ₦500 above ₦20,000. */
export const roundPrice = (v: number) => (v < 20_000 ? Math.round(v / 100) * 100 : Math.round(v / 500) * 500);

/** Pieces of a design already promised to accepted, undelivered orders. */
function reserved(s: GameState, uid: string) {
  return (s.dmOrders || []).filter((o) => o.itemUid === uid && o.status === 'accepted').length;
}

/** How many order DMs arrive today: more followers and recent posts bring more. */
export function ordersToday(s: GameState): number {
  const followers = s.followers || 0;
  if (followers < 300) return 0;
  const recentPosts = (s.posts || []).filter((p) => p.day >= s.day - 2).length;
  // Sale days bring a rush of DMs too.
  const sale = saleOff(s) * 6;
  const rate = Math.min(6, followers / 3_000 + recentPosts * 0.5 + 0.3) + sale;
  return Math.min(8, Math.floor(rate + Math.random()));
}

function makeOrder(s: GameState, d: Design, seq: number): DmOrder {
  const first = pick(FIRST);
  const [area, riderFee] = pick(AREAS);
  const rich = ['Ikoyi', 'Victoria Island', 'Lekki Phase 1'].includes(area);
  const price = roundPrice(retail(d) * (rich ? 1.1 + Math.random() * 0.2 : 0.98 + Math.random() * 0.15) * (1 - saleOff(s)));
  const beg = chance(rich ? 0.2 : 0.45);
  const pay = chance(0.6) ? 'transfer' : 'pod';
  // Most buyers pay the rider themselves; some beg for free delivery (then the shop pays).
  const freeDelivery = chance(rich ? 0.15 : 0.3);
  const line = beg
    ? pick([`How much for the ${d.label}? Abeg last price 🙏🏾 Deliver to ${area}.`, `Is the ${d.label} still available? I'm in ${area}. Please do me discount.`, `I want this ${d.label}! Can you reduce small? Delivery to ${area}.`])
    : pick([`Hi! I want the ${d.label} you posted. Please deliver to ${area} 😍`, `Is the ${d.label} available? Send to ${area}, I'll ${pay === 'transfer' ? 'transfer now' : 'pay on delivery'}.`, `Good day! I need the ${d.label} for an event. I'm in ${area}.`]);
  const ask = freeDelivery ? ` ${pick(['Free delivery abeg 🙏🏾', 'Can you cover the delivery?', 'Delivery on you, please 😅'])}` : ` ${pick(['I will pay for delivery.', 'I go pay the rider.', 'Delivery fee is on me.'])}`;
  return {
    id: `dm${s.day}-${seq}-${Math.random().toString(36).slice(2, 6)}`,
    day: s.day,
    name: first,
    handle: `${first.toLowerCase()}${pick(HANDLE_END)}`,
    area,
    riderFee,
    freeDelivery,
    itemUid: d.uid,
    label: d.label,
    color: d.color,
    price,
    beg,
    pay,
    line: line + ask,
    status: 'new',
  };
}

/** New order DMs for the day, for things actually in stock. */
export function receiveOrders(s: GameState, count = ordersToday(s)): GameState {
  if (count <= 0) return s;
  const available = s.stock.filter((d) => d.displayed && d.pieces - reserved(s, d.uid) > 0);
  if (!available.length) return s;
  const fresh: DmOrder[] = [];
  for (let i = 0; i < count; i++) fresh.push(makeOrder(s, pick(available), i));
  return {
    ...s,
    dmOrders: [...fresh, ...(s.dmOrders || [])].slice(0, 40),
    gramNotes: [{ id: `n-dm-${s.day}-${Math.random().toString(36).slice(2, 6)}`, day: s.day, kind: 'comment' as const, text: `${fresh.length} new order DM${fresh.length > 1 ? 's' : ''}: people want to buy from your posts. Open Gidigram ✉️` }, ...(s.gramNotes || [])].slice(0, 40),
  };
}

export const newOrders = (s: GameState) => (s.dmOrders || []).filter((o) => o.status === 'new').length;

export type OrderAnswer = 'accept' | 'discount' | 'decline';
type Money = (s: GameState, amount: number, label: string) => GameState;

/**
 * Answer a DM. Accepting reserves the piece and sends the rider (fee paid now); transfer
 * orders are paid immediately. Refusing a "last price?" customer a discount can lose her.
 */
export function answerOrder(s: GameState, id: string, answer: OrderAnswer, money: Money): GameState {
  const o = (s.dmOrders || []).find((x) => x.id === id);
  if (!o || o.status !== 'new') return s;
  const set = (patch: Partial<DmOrder>, next: GameState = s): GameState => ({ ...next, dmOrders: (next.dmOrders || []).map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  if (answer === 'decline') return set({ status: 'declined', reply: 'Sorry, not available now.' });
  const d = s.stock.find((x) => x.uid === o.itemUid);
  if (!d || d.pieces - reserved(s, d.uid) <= 0) return set({ status: 'declined', reply: 'Sorry, it just sold out.' });
  if (answer === 'accept' && o.beg && chance(0.3)) return set({ status: 'declined', reply: 'Okay.', outcome: 'Na wa, no discount? I will leave it then.' });
  const price = answer === 'discount' ? roundPrice(o.price * 0.9) : o.price;
  // Accepted while the shop can still dispatch today → delivered this evening; otherwise tomorrow.
  const late = s.phase === 'evening' || (s.phase === 'shop' && s.clock > 600);
  const traffic = chance(0.2);
  let next = o.freeDelivery ? money(s, -o.riderFee, `Dispatch rider (free delivery): ${o.area}`) : s;
  if (o.pay === 'transfer') next = money({ ...next, today: { ...next.today, income: next.today.income + price } }, price, `Online order (transfer): ${o.name}`);
  return set({ status: 'accepted', price, paid: o.pay === 'transfer', deliverDay: s.day + (late ? 1 : 0) + (traffic ? 1 : 0), delayed: traffic, reply: answer === 'discount' ? `Okay dear, ${naira(price)} for you. Rider is on the way 🛵` : `It's available! ${naira(price)}. Rider is on the way 🛵` }, next);
}

/** End of day: deliveries arrive (or fail at the door); unanswered DMs from earlier days lapse. */
export function settleOrders(s0: GameState, money: Money): GameState {
  let s = s0;
  for (const o of s0.dmOrders || []) {
    if (o.status === 'new' && o.day < s.day) {
      s = { ...s, dmOrders: (s.dmOrders || []).map((x) => (x.id === o.id ? { ...x, status: 'expired' as const, outcome: 'No reply, so she bought somewhere else.' } : x)) };
      continue;
    }
    if (o.status !== 'accepted' || (o.deliverDay ?? s.day) > s.day) continue;
    const d = s.stock.find((x) => x.uid === o.itemUid);
    const failed = !o.paid && chance(0.15);
    if (failed) {
      s = { ...s, dmOrders: (s.dmOrders || []).map((x) => (x.id === o.id ? { ...x, status: 'failed' as const, outcome: pick(['Customer not picking calls at the gate. Rider brought it back.', 'She said she changed her mind at the door 🙄 Item returned.', 'Wrong address and phone off. Item returned.']) } : x)) };
      continue;
    }
    if (d) s = { ...s, stock: s.stock.map((x) => (x.uid === d.uid ? { ...x, pieces: Math.max(0, x.pieces - 1) } : x)) };
    if (!o.paid) s = money({ ...s, today: { ...s.today, income: s.today.income + o.price } }, o.price, `Online order (paid on delivery): ${o.name}`);
    const gained = 2 + Math.floor(Math.random() * 12);
    const review = chance(0.35);
    s = {
      ...s,
      followers: (s.followers || 0) + gained,
      dmOrders: (s.dmOrders || []).map((x) => (x.id === o.id ? { ...x, status: 'delivered' as const, outcome: o.delayed ? 'Delivered a day late (traffic), but she loves it 💕' : 'Delivered! She loves it 💕' } : x)),
      ...(review ? { gramNotes: [{ id: `n-rv-${o.id}`, day: s.day, kind: 'mention' as const, text: `@${o.handle}: ${pick(['Received my order, sharp delivery! ⭐⭐⭐⭐⭐', 'Quality is 10/10, will order again 😍', 'Rider came on time, item is beautiful 💯', 'Asanwa Boutique no dey disappoint ❤️'])}` }, ...(s.gramNotes || [])].slice(0, 40) } : {}),
    };
  }
  return s;
}
