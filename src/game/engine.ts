import { CharacterConfig } from '../types/character';
import { generateRandomCustomer } from '../utils/randomizer';
import { DIVINE_CAPACITY, HOUR_WEIGHTS, PATIENCE, SHOP_MINUTES, staffMinutes, NEW_SHOP_RAMP_DAYS, NEW_SHOP_START, SERVICE_FEE, SLOW_WEEK_CHANCE, STAFF, STAFF_CAPACITY, START_CASH, SUPPLIES_SHARE, MARKUP, TIERS, naira } from './economy';
import { canBuy, entryFor, isClothing, makeDesign, pieceCost } from './market';
import { FabricId } from '../types/character';
import { makeCustomer } from './customers';
import { buildLook, hairGroup, lookCost, scoreLook } from './scoring';
import { FEMALE_HAIR, MAKEUP_LOOKS } from '../constants/catalog';
import { colourName } from './colours';
import { FURNITURE, KIOSK_LISTING, Listing, Placed, STARTER_FURNITURE, autoPlace,
  findSpot, canPlace, ceilingCapacity, ceilingUsed, cheapestListing, furnitureById, listingsFor, newUid, prestigeRichShift, prestigeTraffic, shopStats, usesFloor, wallCapacity, wallUsed } from './shop';
import { Customer, DayLog, Departure, Design, GameState, LedgerLine, Message, Regular, ScoreBreakdown, Settlement, StaffMember, StyleChoice } from './types';

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const chance = (p: number) => Math.random() < p;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const emptyLog = (day: number): DayLog => ({ day, served: 0, walkedOut: 0, lost: 0, income: 0, costs: 0, tips: 0, bestScore: 0, repChange: 0, staffServed: 0, events: [] });

export const daysToRent = (day: number) => (7 - (day % 7)) % 7;
export const rentDue = (s: GameState) => s.listing.rent;
export const week = (day: number) => Math.floor((day - 1) / 7);
export const stats = (s: GameState) => shopStats(s.furniture, s.tier, s.listing.stars);
export const displayCap = (s: GameState) => stats(s).display;

/** Shop clock as "2:35pm". */
export function clockText(min: number) {
  const m = Math.floor(min);
  const h24 = 8 + Math.floor(m / 60);
  const mm = m % 60;
  const h = ((h24 + 11) % 12) + 1;
  return `${h}:${mm.toString().padStart(2, '0')}${h24 >= 12 ? 'pm' : 'am'}`;
}

export function msg(s: GameState, from: string, text: string, tone: Message['tone'] = 'info'): GameState {
  const id = (s.msgSeq || 0) + 1;
  const m: Message = { id, day: s.day, from, text, tone, t: s.phase === 'shop' ? Math.floor(s.clock) : undefined };
  return { ...s, msgSeq: id, messages: [m, ...s.messages].slice(0, 120) };
}

/** Money in or out, written to the bank statement. */
export function money(s: GameState, amount: number, label: string): GameState {
  if (!amount) return s;
  const line: LedgerLine = { day: s.day, t: s.phase === 'shop' ? Math.floor(s.clock) : -1, label, amount: Math.round(amount) };
  return { ...s, cash: s.cash + Math.round(amount), ledger: [line, ...(s.ledger || [])].slice(0, 150) };
}

// ---------------------------------------------------------------------------
// New game: the kiosk comes stocked with cheap native and English wear
// ---------------------------------------------------------------------------
const STARTER: [string, string, string, string, number][] = [
  // kind, item id, colour, colour2, pattern
  ['top', 'buba', '#E86A2E', '#2F5D3A', 6],
  ['bottom', 'iro', '#E86A2E', '#2F5D3A', 6],
  ['dress', 'fitFlare', '#2846A8', '#E3B23C', 1],
  ['dress', 'bubu', '#7A3A8C', '#E3B23C', 9],
  ['top', 'tshirt', '#F6F1E8', '#F6F1E8', 0],
  ['bottom', 'skinnyJeans', '#3C5A8A', '#3C5A8A', 0],
  ['top', 'camisole', '#C2262E', '#C2262E', 0],
  ['shoes', 'sandals', '#C9A163', '#C9A163', 0],
  ['shoes', 'slides', '#1E1E24', '#1E1E24', 0],
  ['dress', 'senator', '#2F5D3A', '#2F5D3A', 0],
  ['headwear', 'headwrap', '#E3B23C', '#1E1E24', 0],
  ['earrings', 'goldStuds', '#C9A163', '#C9A163', 0],
];

const freshDay = { clock: 0, arrivals: [], inShop: [], serving: null, left: [], blackout: null };

export function newGame(divine: CharacterConfig): GameState {
  const stock = STARTER.map(([kind, id, c, c2, pat]) => {
    const e = entryFor(kind as never, id)!;
    return { ...makeDesign(e, { fabric: e.fabric, color: c, color2: c2, pattern: pat, pieces: 2 }), displayed: true };
  });
  const spent = stock.reduce((a, d) => a + d.cost * d.pieces, 0);
  let s: GameState = {
    version: 3,
    listing: KIOSK_LISTING,
    furniture: STARTER_FURNITURE.map((f) => ({ ...f, uid: newUid() })),
    day: 1,
    cash: START_CASH,
    rep: 30,
    tier: 0,
    movedDay: -100,
    grace: 7,
    lateRent: null,
    stock,
    regulars: [],
    staff: [],
    hireOkDay: 0,
    divine,
    slowWeek: false,
    phase: 'morning',
    ...freshDay,
    ledger: [],
    followers: 120,
    posts: [],
    msgSeq: 0,
    read: {},
    today: emptyLog(1),
    history: [],
    messages: [],
    stats: { served: 0, totalEarned: 0, demotions: 0, bestScore: 0 },
    seed: Math.floor(Math.random() * 1e9),
  };
  s = money(s, -spent, 'Starter stock from Yaba market');
  s = msg(s, 'Deborah', `Sis! The kiosk is ready. I helped you stock it with ${naira(spent)} of clothes from Yaba market. You have ${naira(s.cash)} left. Rent is ${naira(TIERS[0].rent)} every 7 days. The place is small and rough, but we'll fix it up as the money comes.`, 'good');
  s = msg(s, 'Deborah', `The shop opens 8am to 8pm. Customers come in all day, busiest at lunch and after work. If you're slow, they get tired of waiting and leave, so move fast! Some only want hair or makeup, no clothes.`, 'info');
  return s;
}

// ---------------------------------------------------------------------------
// Opening the shop: who will come today, and when
// ---------------------------------------------------------------------------
/** Followers bring people in: up to +40% traffic. */
export const followerTraffic = (f: number) => 1 + 0.4 * (f / (f + 3000));

export function customersToday(s: GameState, slow: boolean) {
  const t = TIERS[s.tier];
  const ramp = Math.min(1, NEW_SHOP_START + (1 - NEW_SHOP_START) * Math.max(0, s.day - s.movedDay) / NEW_SHOP_RAMP_DAYS);
  const traffic = prestigeTraffic(stats(s).prestige) * followerTraffic(s.followers || 0) * (1 + stats(s).traffic);
  return Math.max(4, Math.round(t.customers * traffic * (0.6 + (s.rep / 100) * 0.8) * (0.85 + Math.random() * 0.3) * (slow ? 0.55 : 1) * ramp));
}

/** How many people can wait inside: three standing, plus seats. */
export const waitingRoom = (s: GameState) => 3 + stats(s).seats;

function arrivalMinute() {
  const total = HOUR_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let h = 0;
  while (h < HOUR_WEIGHTS.length - 1 && r > HOUR_WEIGHTS[h]) r -= HOUR_WEIGHTS[h++];
  return Math.min(SHOP_MINUTES - 20, h * 60 + Math.random() * 60);
}

/** The look's score including what the shop adds. */
export function scoreInShop(s: GameState, c: Customer, choice: StyleChoice): ScoreBreakdown {
  const base = scoreLook(c, choice, s.stock);
  const b = shopBonus(s, c, choice);
  if (!b.bonus) return base;
  return { ...base, total: Math.min(100, base.total + b.bonus), bonus: b.bonus, bonusNotes: b.notes } as ScoreBreakdown;
}

/** Extra score from the shop itself: mirror, stations, fitting room. */
export function shopBonus(s: GameState, c: Customer, choice: StyleChoice): { bonus: number; notes: string[] } {
  const st = stats(s);
  let bonus = st.mirror;
  const notes: string[] = [];
  if (st.mirror) notes.push(`Mirror +${st.mirror}`);
  if (choice.hair && st.hairBonus) { bonus += st.hairBonus; notes.push(`Hair station +${st.hairBonus}`); }
  if (!c.male && choice.makeup && st.makeupBonus) { bonus += st.makeupBonus; notes.push(`Makeup station +${st.makeupBonus}`); }
  if (c.cls === 'rich' && st.richBonus) { bonus += st.richBonus; notes.push(`Fitting room +${st.richBonus}`); }
  if (st.scoreBonus) { bonus += st.scoreBonus; notes.push(`Steamer and lighting +${st.scoreBonus}`); }
  return { bonus: Math.min(10, bonus), notes };
}

export function openShop(s0: GameState): GameState {
  let s: GameState = { ...s0, phase: 'shop', ...freshDay, today: emptyLog(s0.day) };
  let slow = s.slowWeek;
  if (s.day % 7 === 1) {
    slow = s.day > 7 && chance(SLOW_WEEK_CHANCE);
    if (slow) s = msg(s, 'Deborah', pick(['Rain has started o. Customers will be few this week.', 'Fuel scarcity everywhere. People are not going out this week.', 'Exam week for the students. The market is quiet.']), 'warn');
  }
  const st = stats(s);
  const n = customersToday(s, slow);
  const mix = [...TIERS[s.tier].mix] as [number, number, number];
  const shift = prestigeRichShift(st.prestige);
  mix[0] = Math.max(0.05, mix[0] - shift);
  mix[2] = Math.max(0, mix[2] + shift);
  const arrivals = Array.from({ length: n }, () => ({ at: arrivalMinute(), c: makeCustomer(s, mix) })).sort((a, b) => a.at - b.at);
  let blackout: GameState['blackout'] = null;
  if (s.day > 2 && chance(1 / 8)) {
    const from = Math.floor(60 + Math.random() * 480);
    blackout = { from, to: from + 120 + Math.floor(Math.random() * 120) };
  }
  return { ...s, slowWeek: slow, arrivals, blackout };
}

export const divineCapacity = DIVINE_CAPACITY;
export const staffCapacity = (s: GameState) => s.staff.length * STAFF_CAPACITY;

export const inBlackout = (s: GameState, t = s.clock) => !!s.blackout && t >= s.blackout.from && t < s.blackout.to;
/** Fans and AC only work when there is light or a generator. */
export const coolNow = (s: GameState) => (inBlackout(s) && !stats(s).generator ? 0 : stats(s).cool);
export const waiting = (s: GameState) => s.inShop.filter((v) => !v.by);
export const visitor = (s: GameState, id: string | null) => (id ? s.inShop.find((v) => v.c.id === id) : undefined);
export const shopClosing = (s: GameState) => s.phase === 'shop' && s.clock >= SHOP_MINUTES;

function patienceFor(s: GameState, c: Customer) {
  const st = stats(s);
  let p = PATIENCE[c.cls] * (1 + Math.min(0.4, 0.1 * st.seats)) * (1 + coolNow(s) * 0.6) * (1 + st.patience);
  if (c.regularId) p += 20;
  return Math.round(p);
}

function depart(s: GameState, c: Customer, look: CharacterConfig, bag: boolean): GameState {
  const d: Departure = { key: `${c.id}-${Math.floor(s.clock)}`, id: c.id, look, bag };
  return { ...s, inShop: s.inShop.filter((v) => v.c.id !== c.id), serving: s.serving === c.id ? null : s.serving, left: [...s.left, d].slice(-10) };
}

/**
 * Moves the shop clock forward. People walk in, lose patience, get styled by
 * staff, and at 8pm the doors shut.
 */
export function tick(s0: GameState, minutes: number): GameState {
  if (s0.phase !== 'shop') return s0;
  let s = s0;
  const end = Math.min(SHOP_MINUTES, s.clock + minutes);
  const st = stats(s);
  // walk-ins
  let lostDoor = 0;
  let lostHeat = 0;
  while (s.arrivals.length && s.arrivals[0].at <= end) {
    const [a, ...rest] = s.arrivals;
    s = { ...s, arrivals: rest };
    if (inBlackout(s, a.at) && !st.generator && chance(0.35)) { lostHeat++; continue; }
    if (waiting(s).length >= waitingRoom(s)) { lostDoor++; continue; }
    s = { ...s, inShop: [...s.inShop, { c: a.c, arrived: a.at, patience: patienceFor(s, a.c) }] };
  }
  if (lostDoor || lostHeat) s = { ...s, today: { ...s.today, lost: s.today.lost + lostDoor + lostHeat, doorLost: (s.today.doorLost || 0) + lostDoor, heatLost: (s.today.heatLost || 0) + lostHeat } };
  s = { ...s, clock: end };
  // tired of waiting
  for (const v of waiting(s)) {
    if (end - v.arrived > v.patience * (inBlackout(s) && !st.generator ? 0.6 : 1)) {
      s = depart(s, v.c, v.c.look, false);
      s = { ...s, rep: clamp(s.rep - 0.4, 0, 100), today: { ...s.today, lost: s.today.lost + 1, impatient: (s.today.impatient || 0) + 1, repChange: s.today.repChange - 0.4 } };
    }
  }
  // staff finish and pick up the next person
  for (const m of s.staff) {
    const mine = s.inShop.find((v) => v.by === m.id);
    if (mine && (mine.until || 0) <= end) {
      s = staffFinish(s, mine.c, m);
    }
    if (!s.inShop.some((v) => v.by === m.id)) {
      // Divine's picks first: staff take people she sent, or anyone small who has waited 10 minutes
      const next = waiting(s).filter((v) => v.c.cls !== 'rich').sort((a, b) => Number(!!b.forStaff) - Number(!!a.forStaff) || a.arrived - b.arrived).find((v) => v.forStaff || end - v.arrived >= 10);
      if (next && end < SHOP_MINUTES) s = { ...s, inShop: s.inShop.map((v) => (v.c.id === next.c.id ? { ...v, by: m.id, until: end + staffMinutes(m.level) } : v)) };
    }
  }
  // 8pm: the doors shut
  if (end >= SHOP_MINUTES) {
    for (const v of s.inShop.filter((x) => x.by && x.by !== 'divine')) {
      const m = s.staff.find((x) => x.id === v.by);
      s = m ? staffFinish(s, v.c, m) : depart(s, v.c, v.c.look, false);
    }
    const sent = waiting(s);
    for (const v of sent) s = depart(s, v.c, v.c.look, false);
    if (sent.length) s = { ...s, today: { ...s.today, lost: s.today.lost + sent.length, closedOn: (s.today.closedOn || 0) + sent.length } };
    s = { ...s, arrivals: [] };
    if (!s.serving) return closeShop(s);
  }
  return s;
}

/** Jump the clock to the next walk-in when the shop is empty. */
export function skipAhead(s: GameState): GameState {
  if (s.phase !== 'shop' || s.inShop.length || s.serving) return s;
  const next = s.arrivals[0]?.at ?? SHOP_MINUTES;
  return tick(s, Math.max(0, next - s.clock) + 0.01);
}

/** Divine takes a waiting customer to the mirror. */
export function startStyling(s: GameState, id: string): GameState {
  if (s.serving && s.serving !== id) return s;
  const v = visitor(s, id);
  if (!v || (v.by && v.by !== 'divine')) return s;
  return { ...s, serving: id, inShop: s.inShop.map((x) => (x.c.id === id ? { ...x, by: 'divine', forStaff: false } : x)) };
}

export function sendToStaff(s: GameState, id: string): GameState {
  if (!s.staff.length) return s;
  const v = visitor(s, id);
  if (!v || v.c.cls === 'rich') return s;
  return { ...s, serving: s.serving === id ? null : s.serving, inShop: s.inShop.map((x) => (x.c.id === id ? { ...x, by: undefined, forStaff: true, arrived: Math.min(x.arrived, s.clock), patience: x.patience + 30 } : x)) };
}

// ---------------------------------------------------------------------------
// Settling a customer
// ---------------------------------------------------------------------------
const REACTIONS: Record<Settlement['reaction'], string[]> = {
  scream: ['*screams* Divine!!! Is this me?! I am taking a hundred pictures!', 'Ahhh! Na me be this? You are a genius!', 'Jesus! I look like a celebrity!'],
  smile: ['I love it! You did well.', 'Ehen! This is what I wanted.', 'Fine! My people will hear about you.'],
  okay: ["It's okay. Not bad.", 'Hmm. It will do.', 'Fair enough.'],
  frown: ["This isn't really what I asked for.", 'Hmm. I was expecting better.', 'Is this the best you can do?'],
  cry: ['What is this?! I am not paying full money for this!', 'You have spoilt my day! Everybody will laugh at me!', 'Ah! No, no, no. This is not it at all.'],
};

export function reactionFor(score: number): Settlement['reaction'] {
  return score >= 88 ? 'scream' : score >= 76 ? 'smile' : score >= 62 ? 'okay' : score >= 50 ? 'frown' : 'cry';
}

/** What the customer does with the price Divine names. */
export function settle(c: Customer, score: ScoreBreakdown, price: number, supplies: number): Settlement {
  const s = score.total;
  const reaction = reactionFor(s);
  let paid = price;
  let outcome: Settlement['outcome'] = 'paid';
  let line = pick(REACTIONS[reaction]);
  if (price > c.budget * 1.05) {
    if (c.cls === 'poor') {
      return { price, paid: 0, tip: 0, cost: 0, outcome: 'walked', line: `${naira(price)}?! I told you I have ${naira(c.budget)}. I'm going to another shop.`, reaction: 'frown', repDelta: -1.5, becameRegular: false };
    }
    if (c.cls === 'middle') {
      if (s < 60) return { price, paid: 0, tip: 0, cost: 0, outcome: 'walked', line: 'At this price, for this look? No way.', reaction: 'frown', repDelta: -2, becameRegular: false };
      paid = c.budget;
      outcome = 'bargained';
      line = `It's fine, but ${naira(price)} is too much. I'll give you ${naira(paid)}.`;
    }
    if (c.cls === 'rich' && s < 80) {
      paid = c.budget;
      outcome = 'bargained';
      line = `For this? ${naira(paid)}, take it or leave it.`;
    }
  }
  if (s < 50) {
    if (chance(0.4)) return { price, paid: 0, tip: 0, cost: 0, outcome: 'refused', line: pick(REACTIONS.cry) + ' Take it back, I\'m not paying.', reaction: 'cry', repDelta: -1.5 * (c.influencer ? 3 : 1), becameRegular: false };
    paid *= 0.7;
    outcome = 'bargained';
  } else if (s < 65) {
    paid *= 0.88;
    if (outcome === 'paid') outcome = 'bargained';
  }
  let tip = 0;
  if (s >= 85) tip = { poor: 0.03, middle: 0.08, rich: 0.15 }[c.cls] * paid;
  else if (s >= 75) tip = { poor: 0.01, middle: 0.04, rich: 0.07 }[c.cls] * paid;
  if (c.male) tip *= 1.5; // men tip big
  const repDelta = ((s - 65) / 18) * (c.influencer ? 3 : 1);
  return { price, paid: Math.round(paid), tip: Math.round(tip / 100) * 100, cost: supplies, outcome, line, reaction, repDelta, becameRegular: s >= 80 && !c.regularId };
}

/** Applies a finished look: stock leaves the shop, money and reputation move, the customer walks out. */
export function applyLook(s0: GameState, c: Customer, choice: StyleChoice, st0: Settlement, score: ScoreBreakdown): GameState {
  let st = st0;
  const s = s0;
  const sold = st.outcome === 'paid' || st.outcome === 'bargained';
  let stock = s.stock;
  const lookOut = sold ? buildLook(c, choice, s.stock) : c.look;
  if (sold) {
    const used = new Set(Object.entries(choice).filter(([k]) => !['hair', 'hairColor', 'makeup', 'makeupLook', 'beard'].includes(k)).map(([, v]) => v as string));
    stock = s.stock.map((d) => (used.has(d.uid) ? { ...d, pieces: d.pieces - 1 } : d));
  }
  let regulars = s.regulars;
  if (c.regularId) {
    regulars = regulars.map((r) => (r.id === c.regularId ? { ...r, visits: r.visits + 1, loyalty: clamp(r.loyalty + (score.total - 70) / 2, 0, 100), bestScore: Math.max(r.bestScore, score.total), tasteKnown: r.tasteKnown || r.visits >= 1 } : r));
    regulars = regulars.filter((r) => r.loyalty > 0);
  } else if (st.becameRegular) {
    const r: Regular = { id: `r${Date.now().toString(36)}${Math.floor(Math.random() * 99)}`, name: c.name, look: c.look, cls: c.cls, male: c.male, visits: 1, loyalty: 20, bestScore: score.total, tasteKnown: false, favColor: c.taste.favColor, favName: c.taste.favName };
    regulars = [...regulars, r].slice(-30);
  }
  const today: DayLog = {
    ...s.today,
    served: s.today.served + (sold ? 1 : 0),
    walkedOut: s.today.walkedOut + (sold ? 0 : 1),
    income: s.today.income + (sold ? st.paid + st.tip : 0),
    costs: s.today.costs + (sold ? st.cost : 0),
    tips: s.today.tips + (sold ? st.tip : 0),
    bestScore: Math.max(s.today.bestScore, score.total),
    repChange: s.today.repChange + st.repDelta,
  };
  if (c.influencer) today.events = [...today.events, score.total >= 80 ? `${c.name} posted your work to her followers. Reputation up!` : score.total < 60 ? `${c.name} dragged your shop online. Reputation down.` : `${c.name} posted, nothing special.`];
  let next: GameState = {
    ...s,
    rep: clamp(s.rep + (st.repDelta > 0 ? st.repDelta * (1 + coolNow(s) * 0.6) : st.repDelta), 0, 100),
    stock,
    regulars,
    today,
    stats: { ...s.stats, served: s.stats.served + (sold ? 1 : 0), totalEarned: s.stats.totalEarned + (sold ? st.paid + st.tip - st.cost : 0), bestScore: Math.max(s.stats.bestScore, score.total) },
  };
  if (sold && st.tip && stats(s).tipBonus) st = { ...st, tip: Math.round((st.tip * (1 + stats(s).tipBonus)) / 100) * 100 };
  if (sold) {
    next = money(next, st.paid + st.tip, `${c.name}${c.service ? ` (${c.service === 'makeup' ? 'makeup' : c.service === 'both' ? 'hair & makeup' : 'hair'})` : ''}${st.tip ? ', with tip' : ''}`);
    next = money(next, -st.cost, 'Hair and makeup supplies');
  }
  if (c.influencer && score.total >= 80) next = { ...next, followers: (next.followers || 0) + Math.round(60 + Math.random() * 120) };
  next = depart(next, c, lookOut, sold);
  return next;
}

export function turnAway(s: GameState, id?: string): GameState {
  const v = visitor(s, id ?? s.serving);
  if (!v) return s;
  const next = depart(s, v.c, v.c.look, false);
  return { ...next, rep: clamp(s.rep - 0.5, 0, 100), today: { ...next.today, lost: next.today.lost + 1, repChange: next.today.repChange - 0.5 } };
}

/** What a staff member does on their own with the displayed stock. */
export function staffChoice(s: GameState, c: Customer): StyleChoice | null {
  const shown = s.stock.filter((d) => d.displayed && d.pieces > 0);
  const choice: StyleChoice = {};
  if (c.service) {
    const want = c.wants.find((w) => w.kind === 'hair') as { kind: 'hair'; group: string } | undefined;
    choice.hair = want && want.group !== 'male' ? FEMALE_HAIR.find((h) => hairGroup(h.id) === want.group)?.id || c.look.hair : c.look.hair;
    if (c.service !== 'hair' && !c.male) choice.makeup = { ...MAKEUP_LOOKS[c.wants.some((w) => w.kind === 'glam') ? 2 : 1].makeup };
    return choice;
  }
  const opts = shown.filter((d) => {
    const m = entryFor(d.kind, d.itemId);
    return !!m && (m.for === 'both' || m.for === (c.male ? 'm' : 'f'));
  });
  const dress = opts.filter((d) => d.kind === 'dress');
  const tops = opts.filter((d) => d.kind === 'top');
  const bottoms = opts.filter((d) => d.kind === 'bottom');
  const shoes = opts.filter((d) => d.kind === 'shoes');
  if (dress.length && (chance(0.5) || !tops.length || !bottoms.length)) choice.dress = pick(dress).uid;
  else if (tops.length && bottoms.length) { choice.top = pick(tops).uid; choice.bottom = pick(bottoms).uid; }
  else return null;
  if (shoes.length) choice.shoes = pick(shoes).uid;
  choice.hair = c.look.hair;
  return choice;
}

function staffFinish(s: GameState, c: Customer, m: StaffMember): GameState {
  const choice = staffChoice(s, c);
  if (!choice) return depart({ ...s, today: { ...s.today, lost: s.today.lost + 1 } }, c, c.look, false);
  const cost = lookCost(c, choice, s.stock);
  const base = scoreInShop(s, c, choice);
  const total = Math.round(clamp(base.total * (0.62 + 0.035 * m.level), 0, 100));
  const score = { ...base, total };
  const price = Math.min(cost.fair, c.budget);
  const st = settle(c, score, price, cost.consumables);
  const next = applyLook(s, c, choice, st, score);
  return { ...next, today: { ...next.today, staffServed: next.today.staffServed + (st.outcome === 'walked' || st.outcome === 'refused' ? 0 : 1) } };
}

// ---------------------------------------------------------------------------
// End of day: running costs, weekly wages, staff drama, rent
// ---------------------------------------------------------------------------
export function closeShop(s0: GameState): GameState {
  let s = s0;
  // anyone still here goes home
  const sentHome = s.inShop.length;
  for (const v of s.inShop) s = depart(s, v.c, v.c.look, false);
  if (sentHome) s = { ...s, today: { ...s.today, lost: s.today.lost + sentHome, closedOn: (s.today.closedOn || 0) + sentHome } };
  s = { ...s, arrivals: [], serving: null, clock: Math.max(s.clock, 0) };
  const t = { ...TIERS[s.tier], rent: s.listing.rent };
  s = money(s, -t.running, 'Light, fuel and running costs');
  s = { ...s, today: { ...s.today, costs: s.today.costs + t.running } };
  const d = s.today;
  const ev: string[] = [];
  if (d.impatient) ev.push(`${d.impatient} customer${d.impatient > 1 ? 's' : ''} got tired of waiting and left.`);
  if (d.doorLost) ev.push(`${d.doorLost} turned back at the door: no space to wait. More seats would keep them.`);
  if (d.heatLost) ev.push(`NEPA took light and ${d.heatLost} left in the heat. A generator would keep them.`);
  if (s.blackout && !d.heatLost) ev.push(stats(s).generator ? 'NEPA took light, but your generator kept the shop going.' : 'NEPA took light for a while today.');
  if (d.closedOn) ev.push(`${d.closedOn} ${d.closedOn > 1 ? 'were' : 'was'} still waiting at closing time and went home.`);
  s = { ...s, today: { ...s.today, events: [...s.today.events, ...ev] } };

  // weekly
  if (s.day % 7 === 0) {
    s = weeklyStaff(s);
    s = payRent(s);
    s = { ...s, followers: Math.round((s.followers || 0) * 0.98) };
  } else if (daysToRent(s.day) === 2) {
    s = msg(s, 'Landlord', `Good evening madam. Rent of ${naira(t.rent)} is due in 2 days.${s.cash < t.rent ? ` You have ${naira(s.cash)}. Don't let me come and lock this shop.` : ''}`, s.cash < t.rent ? 'danger' : 'warn');
  }
  // late rent: the grace period runs out
  if (s.lateRent && s.day >= s.lateRent.due) {
    if (s.cash < 0) s = demote(s);
    else s = msg({ ...s, lateRent: null }, 'Landlord', 'Thank you, the rent is cleared.', 'good');
  }
  // reputation drifts back toward 40 so it has to be earned every week
  s = { ...s, rep: clamp(s.rep - (s.rep - 40) * 0.03, 0, 100) };
  const history = [...s.history, s.today].slice(-120);
  return { ...s, history, phase: 'evening' };
}

export function nextMorning(s: GameState): GameState {
  return { ...s, day: s.day + 1, phase: 'morning', ...freshDay, today: emptyLog(s.day + 1) };
}

function payRent(s: GameState): GameState {
  const rent = s.listing.rent;
  if (s.cash >= rent && !s.lateRent) return msg(money({ ...s, today: { ...s.today, costs: s.today.costs + rent, events: [...s.today.events, `Paid ${naira(rent)} rent.`] } }, -rent, 'Rent'), 'Landlord', `Rent of ${naira(rent)} received. See you next week.`, 'info');
  const due = s.day + s.grace;
  const next = money({ ...s, lateRent: { amount: rent, due }, today: { ...s.today, costs: s.today.costs + rent } }, -rent, 'Rent (late)');
  return msg(next, 'Landlord', s.grace === 0
    ? `You are short on rent and I don't give grace. Clear it today or you move out.`
    : `You are short on rent by ${naira(-next.cash)}. I'm giving you ${s.grace} day${s.grace > 1 ? 's' : ''}. If it's not paid by day ${due}, you move to a smaller shop.`, 'danger');
}

function demote(s: GameState): GameState {
  if (s.tier === 0) return msg({ ...s, lateRent: null }, 'Landlord', 'This kiosk is the last stop. I will let the debt run, but pay me soon.', 'danger');
  const tier = s.tier - 1;
  const t = TIERS[tier];
  const listing = cheapestListing(tier, week(s.day));
  const furniture = autoPlace(s.furniture.filter((f) => furnitureById(f.id).mount !== 'finish').map((f) => ({ ...f, placed: true })), listing);
  const staff = s.staff.slice(0, t.staff);
  const left = s.staff.slice(t.staff);
  let next: GameState = money({ ...s, tier, listing, furniture, staff, lateRent: null, movedDay: s.day, grace: listing.grace, stats: { ...s.stats, demotions: s.stats.demotions + 1 } }, (s.lateRent?.amount || 0) * 0.5, 'Half the rent debt waived');
  next = fitDisplay(next);
  next = msg(next, 'Landlord', `Time is up. Pack your things. You have been moved down to a ${t.name} on ${listing.street}, ${listing.area}. I've kept the deposit and waived half the debt.`, 'danger');
  if (left.length) next = msg(next, 'Deborah', `${left.map((x) => x.name).join(' and ')} had to go. There's no space for them in the new shop.`, 'warn');
  if (furniture.some((f) => !f.placed)) next = msg(next, 'Deborah', `Some furniture didn't fit in the smaller shop, so it's in storage.`, 'warn');
  return next;
}

/** Designs beyond the display space go back to storage. */
export function fitDisplay(s: GameState): GameState {
  const cap = displayCap(s);
  let shown = 0;
  const stock = s.stock.map((d) => {
    if (!d.displayed) return d;
    shown += 1;
    return shown > cap ? { ...d, displayed: false } : d;
  });
  return { ...s, stock };
}

// ---------------------------------------------------------------------------
// Moving up
// ---------------------------------------------------------------------------
export function moveUpCost(s: GameState) {
  if (s.tier + 1 >= TIERS.length) return null;
  return Math.min(...listingsNow(s).map((l) => l.moveIn));
}

/** The four shops to rent at the next size this week. */
export function listingsNow(s: GameState): Listing[] {
  if (s.tier + 1 >= TIERS.length) return [];
  return listingsFor(s.tier + 1, week(s.day));
}

export function moveTo(s: GameState, l: Listing): GameState {
  if (l.tier !== s.tier + 1 || s.cash < l.moveIn) return s;
  const tier = l.tier;
  const t = TIERS[tier];
  const furniture = autoPlace(s.furniture.filter((f) => furnitureById(f.id).mount !== 'finish'), l);
  let next: GameState = money({ ...s, tier, listing: l, furniture, movedDay: s.day, grace: l.grace }, -l.moveIn, `Move-in: ${l.street}`);
  next = msg(next, 'Deborah', `We moved! Welcome to your ${t.name} on ${l.street}, ${l.area}. Rent is ${naira(l.rent)} a week and the landlord is ${l.landlord}. The shop holds up to ${t.slots} designs, so buy rails and shelves to fill it. It will be quiet for two weeks while people find us.`, 'good');
  if (t.staff && !s.staff.length) next = msg(next, 'Deborah', `You can hire staff now! Trainees are cheap and loyal; experts are good from day one but they leave for money.`, 'info');
  return next;
}

// ---------------------------------------------------------------------------
// Furniture
// ---------------------------------------------------------------------------
export function buyFurniture(s: GameState, id: string): GameState {
  const f = furnitureById(id);
  if (!f || s.cash < f.price || (f.minTier || 0) > s.tier) return s;
  const item: Placed = { uid: newUid(), id, x: 0, z: 0, rot: 0, placed: false };
  let furniture = s.furniture;
  let placedItem: Placed = item;
  if (f.mount === 'finish') {
    // new paint goes over the old paint; new flooring replaces the old floor
    furniture = furniture.filter((p) => { const o = furnitureById(p.id); return o.mount !== 'finish' || (f.paint ? !o.paint : !o.floorTiles); });
    placedItem = { ...item, placed: true };
  } else if (f.mount === 'ceiling') {
    if (ceilingUsed(furniture) < ceilingCapacity(s.listing)) placedItem = { ...item, placed: true };
  } else if (f.mount === 'wall') {
    if (wallUsed(furniture) + f.w <= wallCapacity(s.listing)) placedItem = { ...item, placed: true, x: wallUsed(furniture) };
  } else placedItem = findSpot(furniture, s.listing, item) || item;
  return money({ ...s, furniture: [...furniture, placedItem] }, -f.price, f.name);
}

/** Turn a piece 90 degrees where it stands (or the nearest spot it fits). */
export function rotateFurniture(s: GameState, uid: string): GameState {
  const p = s.furniture.find((f) => f.uid === uid);
  if (!p || !p.placed || furnitureById(p.id).mount !== 'floor') return s;
  const rot = (p.rot ? 0 : 1) as 0 | 1;
  for (const [dx, dz] of [[0, 0], [-1, 0], [0, -1], [-1, -1], [1, 0], [0, 1]]) {
    const cand: Placed = { ...p, rot, x: p.x + dx, z: p.z + dz };
    if (canPlace(s.furniture, s.listing, cand)) return { ...s, furniture: s.furniture.map((f) => (f.uid === uid ? cand : f)) };
  }
  return s;
}

export function placeFurniture(s: GameState, uid: string, x: number, z: number, rot: 0 | 1): GameState {
  const p = s.furniture.find((f) => f.uid === uid);
  if (!p) return s;
  const cand: Placed = { ...p, x, z, rot, placed: true };
  if (!canPlace(s.furniture, s.listing, cand)) return s;
  return { ...s, furniture: s.furniture.map((f) => (f.uid === uid ? cand : f)) };
}

/** Put a stored item back in the room wherever it fits. */
export function installFurniture(s: GameState, uid: string): GameState {
  const p = s.furniture.find((f) => f.uid === uid);
  if (!p || p.placed) return s;
  const f = furnitureById(p.id);
  if (f.mount === 'wall') {
    if (wallUsed(s.furniture) + f.w > wallCapacity(s.listing)) return s;
    return { ...s, furniture: s.furniture.map((x) => (x.uid === uid ? { ...x, placed: true, x: wallUsed(s.furniture) } : x)) };
  }
  if (f.mount === 'ceiling') {
    if (ceilingUsed(s.furniture) >= ceilingCapacity(s.listing)) return s;
    return { ...s, furniture: s.furniture.map((x) => (x.uid === uid ? { ...x, placed: true } : x)) };
  }
  const spot = autoPlace([...s.furniture.filter((x) => x.placed), { ...p }], s.listing).find((x) => x.uid === uid)!;
  if (!spot.placed) return s;
  return { ...s, furniture: s.furniture.map((x) => (x.uid === uid ? spot : x)) };
}

export function storeFurniture(s: GameState, uid: string): GameState {
  return fitDisplay({ ...s, furniture: s.furniture.map((f) => (f.uid === uid ? { ...f, placed: false } : f)) });
}

export function sellFurniture(s: GameState, uid: string): GameState {
  const p = s.furniture.find((f) => f.uid === uid);
  if (!p) return s;
  return fitDisplay(money({ ...s, furniture: s.furniture.filter((f) => f.uid !== uid) }, Math.round(furnitureById(p.id).price * 0.4), `Sold ${furnitureById(p.id).name}`));
}

export { FURNITURE, usesFloor };

// ---------------------------------------------------------------------------
// Stock
// ---------------------------------------------------------------------------
export const displayedCount = (s: GameState) => s.stock.filter((d) => d.displayed).length;

export function buyDesign(s: GameState, d: ReturnType<typeof makeDesign>): GameState {
  const total = d.cost * d.pieces;
  if (s.cash < total) return s;
  const free = displayedCount(s) < displayCap(s);
  return money({ ...s, stock: [...s.stock, { ...d, displayed: free }] }, -total, `Stock: ${d.label} ×${d.pieces}`);
}

export function setDisplayed(s: GameState, uid: string, on: boolean): GameState {
  if (on && displayedCount(s) >= displayCap(s)) return s;
  return { ...s, stock: s.stock.map((d) => (d.uid === uid ? { ...d, displayed: on } : d)) };
}

/** Buy more pieces of a design Divine already stocks. */
export function restock(s: GameState, uid: string, pieces: number): GameState {
  const d = s.stock.find((x) => x.uid === uid);
  if (!d || s.cash < d.cost * pieces) return s;
  return money({ ...s, stock: s.stock.map((x) => (x.uid === uid ? { ...x, pieces: x.pieces + pieces } : x)) }, -d.cost * pieces, `Restock: ${d.label} ×${pieces}`);
}

export const restockAllCost = (s: GameState, upTo = 2) => s.stock.filter((d) => d.displayed && d.pieces < upTo).reduce((a, d) => a + d.cost * (upTo - d.pieces), 0);

export function restockAll(s: GameState, upTo = 2): GameState {
  let next = s;
  for (const d of s.stock.filter((x) => x.displayed && x.pieces < upTo)) next = restock(next, d.uid, upTo - d.pieces);
  return next;
}

export interface CartLine {
  key: string;
  kind: Design['kind'];
  itemId: string;
  fabric?: FabricId;
  color: string;
  color2: string;
  pattern: number;
  pieces: number;
}

export function cartLineCost(l: CartLine) {
  const e = entryFor(l.kind, l.itemId);
  return e ? pieceCost(e, isClothing(l.kind) ? l.fabric : undefined) * l.pieces : 0;
}
export const cartTotal = (lines: CartLine[]) => lines.reduce((a, l) => a + cartLineCost(l), 0);

const sameDesign = (d: Design, l: CartLine) => d.kind === l.kind && d.itemId === l.itemId && (!isClothing(l.kind) || d.fabric === (l.fabric || d.fabric)) && d.color === l.color && (!isClothing(l.kind) || (d.color2 === l.color2 && d.pattern === l.pattern));

/** How many new designs a cart adds (the rest top up what's already in stock). */
export const cartNewDesigns = (s: GameState, lines: CartLine[]) => lines.filter((l, i) => !s.stock.some((d) => sameDesign(d, l)) && !lines.slice(0, i).some((o) => o.kind === l.kind && o.itemId === l.itemId && o.fabric === l.fabric && o.color === l.color && o.color2 === l.color2 && o.pattern === l.pattern)).length;

/** Pay for everything in the cart. Matching designs already in stock get topped up. */
export function buyCart(s0: GameState, lines: CartLine[]): GameState {
  if (s0.cash < cartTotal(lines)) return s0;
  let s = s0;
  for (const l of lines) {
    const e = entryFor(l.kind, l.itemId);
    if (!e || !canBuy(e, s.tier) || l.pieces <= 0) continue;
    const have = s.stock.find((d) => sameDesign(d, l));
    if (have) s = restock(s, have.uid, l.pieces);
    else s = buyDesign(s, makeDesign(e, { fabric: l.fabric, color: l.color, color2: l.color2, pattern: l.pattern, pieces: l.pieces }));
  }
  return s;
}

/** Sell old stock back to the market at half price. */
export function clearDesign(s: GameState, uid: string): GameState {
  const d = s.stock.find((x) => x.uid === uid);
  if (!d) return s;
  return money({ ...s, stock: s.stock.filter((x) => x.uid !== uid) }, Math.round(d.cost * d.pieces * 0.5), `Sold off ${d.label}`);
}

// ---------------------------------------------------------------------------
// Gidigram
// ---------------------------------------------------------------------------
export const postsToday = (s: GameState) => (s.posts || []).filter((p) => p.day === s.day).length;
export const canPost = (s: GameState, score: number) => score >= 70 && postsToday(s) < 3;

const CAPTIONS = [
  'Styled by @divine.styles 🔥', 'Another happy client! Book your slot 💅🏾', 'Owambe ready ✨', 'From walk-in to wow.', 'Who did it better? Us. 😌', 'Fresh out of the chair 💇🏾‍♀️', "Clean look for a clean guy.", 'Na so we dey do am for Yaba 💯',
];

export function postLook(s: GameState, c: Customer, look: CharacterConfig, score: number): GameState {
  if (!canPost(s, score)) return s;
  const clsMult = { poor: 0.6, middle: 1, rich: 2 }[c.cls];
  const fatigue = 1 / (1 + postsToday(s));
  const gained = Math.max(5, Math.round((score - 60) * clsMult * (4 + Math.random() * 4) * fatigue * (1 + (s.followers || 0) / 6000)));
  const likes = Math.round(((s.followers || 0) + gained) * (0.08 + (score - 70) / 300) * (0.8 + Math.random() * 0.4));
  const post = { id: `p${s.day}-${Math.random().toString(36).slice(2, 7)}`, day: s.day, look, name: c.name, caption: pick(CAPTIONS), score, likes, gained };
  return { ...s, followers: (s.followers || 0) + gained, posts: [post, ...(s.posts || [])].slice(0, 24) };
}

// ---------------------------------------------------------------------------
// Chats
// ---------------------------------------------------------------------------
export function chats(s: GameState) {
  const by: Record<string, { from: string; last: Message; unread: number }> = {};
  for (const m of s.messages) {
    const c = (by[m.from] = by[m.from] || { from: m.from, last: m, unread: 0 });
    if (m.id > c.last.id) c.last = m;
    if (m.id > (s.read?.[m.from] || 0)) c.unread += 1;
  }
  return Object.values(by).sort((a, b) => b.last.id - a.last.id);
}
export const unreadCount = (s: GameState) => chats(s).reduce((a, c) => a + c.unread, 0);
export function markRead(s: GameState, from: string): GameState {
  const top = s.messages.filter((m) => m.from === from).reduce((a, m) => Math.max(a, m.id), 0);
  if ((s.read?.[from] || 0) >= top) return s;
  return { ...s, read: { ...(s.read || {}), [from]: top } };
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------
const STAFF_NAMES = ['Kemi', 'Blessing', 'Chidinma', 'Sola', 'Grace', 'Rukayat', 'Amarachi', 'Tosin', 'Ladi', 'Nneka', 'Bimpe', 'Jumoke', 'Ese', 'Rita', 'Seun', 'Uju'];

export interface Candidate { name: string; kind: 'trainee' | 'expert'; level: number; wage: number; signing: number }

export function candidates(s: GameState): Candidate[] {
  const used = new Set(s.staff.map((x) => x.name));
  const free = STAFF_NAMES.filter((n) => !used.has(n));
  const seed = s.day * 31 + s.staff.length * 7;
  const a = free[seed % free.length];
  const b = free[(seed * 7 + 3) % free.length] === a ? free[(seed + 1) % free.length] : free[(seed * 7 + 3) % free.length];
  return [
    { name: a, kind: 'trainee', level: STAFF.traineeLevel, wage: STAFF.traineeWage, signing: STAFF.traineeWage * 0.5 },
    { name: b, kind: 'expert', level: STAFF.expertLevel, wage: STAFF.expertWage, signing: STAFF.expertWage * 2 },
  ];
}

export function canHire(s: GameState) {
  return TIERS[s.tier].staff > s.staff.length && s.day >= s.hireOkDay;
}

export function hire(s: GameState, c: Candidate): GameState {
  if (!canHire(s) || s.cash < c.signing) return s;
  const member: StaffMember = { id: `s${Date.now().toString(36)}`, name: c.name, level: c.level, wage: c.wage, loyalty: c.kind === 'trainee' ? 30 : 20, trained: c.kind === 'trainee', weeks: 0, look: { ...generateRandomCustomer('styled') } };
  return msg(money({ ...s, staff: [...s.staff, member], hireOkDay: s.day + STAFF.hireDelayDays }, -c.signing, `Signing: ${c.name}`), c.name, c.kind === 'trainee' ? 'Thank you for this chance, ma. I will learn fast!' : `I'm the best in Lagos. Pay me well and we'll have no problem.`, 'good');
}

export function train(s: GameState, id: string): GameState {
  const m = s.staff.find((x) => x.id === id);
  if (!m || m.level >= 10) return s;
  const fee = STAFF.trainFee(m.level);
  if (s.cash < fee) return s;
  const staff = s.staff.map((x) => (x.id === id ? { ...x, level: x.level + 1, wage: Math.round((x.wage * STAFF.raisePerLevel) / 500) * 500, loyalty: clamp(x.loyalty + (x.trained ? 8 : 3), 0, 100) } : x));
  return money({ ...s, staff }, -fee, `Training: ${m.name}`);
}

export function fire(s: GameState, id: string): GameState {
  const m = s.staff.find((x) => x.id === id);
  if (!m) return s;
  return msg({ ...s, staff: s.staff.filter((x) => x.id !== id) }, 'Deborah', `${m.name} has packed her things. She wasn't happy.`, 'warn');
}

export type RaiseAnswer = 'accept' | 'counter' | 'refuse';
export function answerRaise(s: GameState, id: string, answer: RaiseAnswer): GameState {
  const m = s.staff.find((x) => x.id === id);
  if (!m || !m.raiseAsk) return s;
  const ask = m.raiseAsk;
  let staff = s.staff;
  let next = s;
  if (answer === 'accept') {
    staff = s.staff.map((x) => (x.id === id ? { ...x, wage: ask, loyalty: clamp(x.loyalty + 6, 0, 100), raiseAsk: undefined } : x));
    next = msg({ ...s, staff }, m.name, 'Thank you ma! God bless you.', 'good');
  } else if (answer === 'counter') {
    const mid = Math.round((m.wage + ask) / 2 / 500) * 500;
    const takes = m.trained ? chance(0.8) : chance(0.45);
    if (takes) {
      staff = s.staff.map((x) => (x.id === id ? { ...x, wage: mid, raiseAsk: undefined } : x));
      next = msg({ ...s, staff }, m.name, `Okay, ${naira(mid)} is fine. I'll stay.`, 'info');
    } else {
      staff = s.staff.filter((x) => x.id !== id);
      next = msg({ ...s, staff, hireOkDay: s.day + STAFF.hireDelayDays }, m.name, 'That is not enough. I have another offer. Bye.', 'danger');
    }
  } else {
    const leaves = m.trained ? chance(0.25) : chance(0.75);
    if (leaves) {
      staff = s.staff.filter((x) => x.id !== id);
      next = msg({ ...s, staff, hireOkDay: s.day + STAFF.hireDelayDays }, m.name, "Then I'm going. Another shop wants me.", 'danger');
    } else {
      staff = s.staff.map((x) => (x.id === id ? { ...x, loyalty: clamp(x.loyalty - 15, 0, 100), raiseAsk: undefined } : x));
      next = msg({ ...s, staff }, m.name, 'Okay ma. I will manage.', 'warn');
    }
  }
  return next;
}

/** Fair weekly wage for a level: what other shops would pay. */
export const marketWage = (level: number) => Math.round((STAFF.traineeWage * STAFF.raisePerLevel ** (level - STAFF.traineeLevel)) / 500) * 500;

function weeklyStaff(s0: GameState): GameState {
  let s = s0;
  for (const m0 of s0.staff) {
    const m = s.staff.find((x) => x.id === m0.id);
    if (!m) continue;
    s = money({ ...s, today: { ...s.today, costs: s.today.costs + m.wage } }, -m.wage, `Wages: ${m.name}`);
    let loyalty = clamp(m.loyalty + (m.trained ? 4 : 1), 0, 100);
    // poaching offer
    if (chance(0.05 + 0.015 * m.level)) {
      const extra = 10 + Math.random() * 140; // % more pay
      const limit = loyalty * (m.trained ? 1.5 : 0.6);
      const offer = Math.round((m.wage * (1 + extra / 100)) / 500) * 500;
      if (extra > limit || chance(0.02)) {
        s = { ...s, staff: s.staff.filter((x) => x.id !== m.id), hireOkDay: s.day + STAFF.hireDelayDays };
        s = msg(s, 'Deborah', `${m.name} has left! Another boutique offered her ${naira(offer)} a week. You were paying ${naira(m.wage)}.`, 'danger');
        continue;
      }
      s = msg(s, m.name, `Another shop offered me ${naira(offer)} a week, but I'm staying with you.`, 'good');
      loyalty = clamp(loyalty + 2, 0, 100);
    }
    // raise demand when underpaid for their level
    let raiseAsk = m.raiseAsk;
    const fair = Math.max(marketWage(m.level), m.trained ? 0 : STAFF.expertWage);
    if (!raiseAsk && m.wage < fair * 0.95 && chance(m.trained ? 0.15 : 0.35)) {
      raiseAsk = Math.round((fair * 1.05) / 500) * 500;
      s = msg(s, m.name, `Ma, I need a raise to ${naira(raiseAsk)} a week or I will have to go. Other shops pay that for my level.`, 'warn');
    }
    s = { ...s, staff: s.staff.map((x) => (x.id === m.id ? { ...x, loyalty, weeks: x.weeks + 1, raiseAsk } : x)) };
  }
  return s;
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------
const KEY = 'asanwa-boutique-save-v1';

/** Older saves: v1 gets a listing and furniture; v2 gets the clock, chats, bank and Gidigram. */
function migrate(raw: GameState): GameState | null {
  type Old = Omit<GameState, 'version'> & { version: number; queue?: unknown; queueIndex?: unknown };
  let s = raw as unknown as Old;
  if (s.version === 3) return s as GameState;
  if (s.version === 1) {
    const listing = s.tier === 0 ? KIOSK_LISTING : { ...cheapestListing(s.tier, week(s.day)), rent: TIERS[s.tier].rent, stars: 2 };
    const base = STARTER_FURNITURE.map((f) => ({ ...f, uid: newUid() }));
    const rails = Array.from({ length: Math.max(0, Math.ceil((TIERS[s.tier].slots - 12) / 8)) }, () => ({ uid: newUid(), id: 'chromeRail', x: 0, z: 0, rot: 0 as const, placed: true }));
    s = { ...s, version: 2, listing, furniture: autoPlace([...base, ...rails], listing) } as Old;
  }
  if (s.version !== 2) return null;
  const messages = s.messages.map((m, i) => ({ ...m, id: s.messages.length - i }));
  const { queue: _q, queueIndex: _qi, ...rest } = s;
  void _q; void _qi;
  const midDay = s.phase === 'shop';
  return {
    ...(rest as unknown as GameState),
    version: 3,
    ...freshDay,
    phase: midDay ? 'morning' : s.phase,
    today: midDay ? emptyLog(s.day) : s.today,
    ledger: [],
    followers: 120,
    posts: [],
    messages,
    msgSeq: messages.length,
    read: Object.fromEntries(messages.map((m) => [m.from, messages.length])),
  };
}
export function save(s: GameState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage can be full or blocked; the backup button still works */
  }
}
export function load(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return migrate(s);
  } catch {
    return null;
  }
}
export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
export function exportSave(s: GameState) {
  const blob = new Blob([JSON.stringify(s)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `asanwa-boutique-day${s.day}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function parseSave(text: string): GameState | null {
  try {
    const s = JSON.parse(text) as GameState;
    if (typeof s.day !== 'number' || !Array.isArray(s.stock)) return null;
    return migrate(s);
  } catch {
    return null;
  }
}

export { colourName, MARKUP, SERVICE_FEE, SUPPLIES_SHARE };
