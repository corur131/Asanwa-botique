import { CharacterConfig } from '../types/character';
import { generateRandomCustomer } from '../utils/randomizer';
import { DIVINE_CAPACITY, GRACE_OPTIONS, NEW_SHOP_RAMP_DAYS, NEW_SHOP_START, SERVICE_FEE, SLOW_WEEK_CHANCE, STAFF, STAFF_CAPACITY, START_CASH, SUPPLIES_SHARE, MARKUP, TIERS, naira } from './economy';
import { entryFor, makeDesign } from './market';
import { makeCustomer } from './customers';
import { lookCost, scoreLook } from './scoring';
import { colourName } from './colours';
import { FURNITURE, KIOSK_LISTING, Listing, Placed, STARTER_FURNITURE, autoPlace,
  findSpot, canPlace, cheapestListing, furnitureById, listingsFor, newUid, prestigeRichShift, prestigeTraffic, shopStats, usesFloor, wallCapacity, wallUsed } from './shop';
import { Customer, DayLog, GameState, Message, Regular, ScoreBreakdown, Settlement, StaffMember, StyleChoice } from './types';

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const chance = (p: number) => Math.random() < p;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const emptyLog = (day: number): DayLog => ({ day, served: 0, walkedOut: 0, lost: 0, income: 0, costs: 0, tips: 0, bestScore: 0, repChange: 0, staffServed: 0, events: [] });

export const daysToRent = (day: number) => (7 - (day % 7)) % 7;
export const rentDue = (s: GameState) => s.listing.rent;
export const week = (day: number) => Math.floor((day - 1) / 7);
export const stats = (s: GameState) => shopStats(s.furniture, s.tier, s.listing.stars);
export const displayCap = (s: GameState) => stats(s).display;

function msg(s: GameState, from: string, text: string, tone: Message['tone'] = 'info'): GameState {
  return { ...s, messages: [{ day: s.day, from, text, tone }, ...s.messages].slice(0, 60) };
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

export function newGame(divine: CharacterConfig): GameState {
  const stock = STARTER.map(([kind, id, c, c2, pat]) => {
    const e = entryFor(kind as never, id)!;
    return { ...makeDesign(e, { fabric: e.fabric, color: c, color2: c2, pattern: pat }), displayed: true };
  });
  const spent = stock.reduce((a, d) => a + d.cost * d.pieces, 0);
  let s: GameState = {
    version: 2,
    listing: KIOSK_LISTING,
    furniture: STARTER_FURNITURE.map((f) => ({ ...f, uid: newUid() })),
    day: 1,
    cash: START_CASH - spent,
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
    queue: [],
    queueIndex: 0,
    today: emptyLog(1),
    history: [],
    messages: [],
    stats: { served: 0, totalEarned: 0, demotions: 0, bestScore: 0 },
    seed: Math.floor(Math.random() * 1e9),
  };
  s = msg(s, 'Deborah', `Sis! The kiosk is ready. I helped you stock it with ${naira(spent)} of clothes from Yaba market. You have ${naira(s.cash)} left. Rent is ${naira(TIERS[0].rent)} every 7 days. The place is small and rough, but we'll fix it up as the money comes. Let's make money!`, 'good');
  return s;
}

// ---------------------------------------------------------------------------
// Opening the shop
// ---------------------------------------------------------------------------
export function customersToday(s: GameState, slow: boolean) {
  const t = TIERS[s.tier];
  const ramp = Math.min(1, NEW_SHOP_START + (1 - NEW_SHOP_START) * Math.max(0, s.day - s.movedDay) / NEW_SHOP_RAMP_DAYS);
  const traffic = prestigeTraffic(stats(s).prestige);
  return Math.max(5, Math.round(t.customers * traffic * (0.6 + (s.rep / 100) * 0.8) * (0.85 + Math.random() * 0.3) * (slow ? 0.5 : 1) * ramp));
}

/** How many people can wait: the one being served, three standing, plus seats. */
export const waitingRoom = (s: GameState) => 4 + stats(s).seats;

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
  return { bonus: Math.min(10, bonus), notes };
}

export function openShop(s: GameState): GameState {
  let slow = s.slowWeek;
  let next = s;
  if (s.day % 7 === 1) {
    slow = s.day > 7 && chance(SLOW_WEEK_CHANCE);
    if (slow) next = msg(next, 'Deborah', pick(['Rain has started o. Customers will be few this week.', 'Fuel scarcity everywhere. People are not going out this week.', 'Exam week for the students. The market is quiet.']), 'warn');
  }
  const st = stats(next);
  let n = customersToday(next, slow);
  const mix = [...TIERS[next.tier].mix] as [number, number, number];
  const shift = prestigeRichShift(st.prestige);
  mix[0] = Math.max(0.05, mix[0] - shift);
  mix[2] = Math.max(0, mix[2] + shift);
  let lostAtDoor = 0;
  let blackout = false;
  if (s.day > 2 && chance(1 / 8)) {
    blackout = true;
    if (!st.generator) {
      const gone = Math.round(n * 0.35);
      lostAtDoor += gone;
      n -= gone;
    }
  }
  const room = waitingRoom(next);
  if (n > room + 2) {
    lostAtDoor += n - (room + 2);
    n = room + 2;
  }
  const queue: Customer[] = [];
  for (let i = 0; i < n; i++) queue.push(makeCustomer(next, mix));
  const events: string[] = [];
  if (blackout) events.push(st.generator ? 'NEPA took light, but your generator kept the shop open.' : 'NEPA took light. With no generator, some customers left in the heat.');
  if (lostAtDoor && !(blackout && !st.generator)) events.push(`${lostAtDoor} customer${lostAtDoor > 1 ? 's' : ''} left at the door: no space to wait. More seats would keep them.`);
  // rich clients and regulars come first; Divine sees them herself
  queue.sort((a, b) => (b.cls === 'rich' ? 2 : b.regularId ? 1 : 0) - (a.cls === 'rich' ? 2 : a.regularId ? 1 : 0));
  return { ...next, slowWeek: slow, phase: 'shop', queue, queueIndex: 0, today: { ...emptyLog(s.day), lost: lostAtDoor, events } };
}

export const divineCapacity = DIVINE_CAPACITY;
export const staffCapacity = (s: GameState) => s.staff.length * STAFF_CAPACITY;

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
    if (chance(0.4)) return { price, paid: 0, tip: 0, cost: 0, outcome: 'refused', line: pick(REACTIONS.cry) + " Take your clothes, I'm not buying.", reaction: 'cry', repDelta: -1.5 * (c.influencer ? 3 : 1), becameRegular: false };
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

/** Applies a finished look: stock leaves the shop, money and reputation move. */
export function applyLook(s: GameState, c: Customer, choice: StyleChoice, st: Settlement, score: ScoreBreakdown): GameState {
  const sold = st.outcome === 'paid' || st.outcome === 'bargained';
  let stock = s.stock;
  if (sold) {
    const used = new Set(Object.entries(choice).filter(([k]) => !['hair', 'hairColor', 'makeup', 'makeupLook', 'beard'].includes(k)).map(([, v]) => v as string));
    stock = s.stock.map((d) => (used.has(d.uid) ? { ...d, pieces: d.pieces - 1 } : d));
  }
  const net = sold ? st.paid + st.tip - st.cost : 0;
  let regulars = s.regulars;
  if (c.regularId) {
    regulars = regulars.map((r) => (r.id === c.regularId ? { ...r, visits: r.visits + 1, loyalty: clamp(r.loyalty + (score.total - 70) / 2, 0, 100), bestScore: Math.max(r.bestScore, score.total), tasteKnown: r.tasteKnown || r.visits >= 1 } : r));
    regulars = regulars.filter((r) => r.loyalty > 0);
  } else if (st.becameRegular) {
    const r: Regular = { id: `r${Date.now().toString(36)}`, name: c.name, look: c.look, cls: c.cls, male: c.male, visits: 1, loyalty: 20, bestScore: score.total, tasteKnown: false, favColor: c.taste.favColor, favName: c.taste.favName };
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
  return {
    ...s,
    cash: s.cash + net,
    rep: clamp(s.rep + (st.repDelta > 0 ? st.repDelta * (1 + stats(s).repBoost) : st.repDelta), 0, 100),
    stock,
    regulars,
    today,
    queueIndex: s.queueIndex + 1,
    stats: { ...s.stats, served: s.stats.served + (sold ? 1 : 0), totalEarned: s.stats.totalEarned + net, bestScore: Math.max(s.stats.bestScore, score.total) },
  };
}

export function turnAway(s: GameState): GameState {
  return { ...s, rep: clamp(s.rep - 0.5, 0, 100), queueIndex: s.queueIndex + 1, today: { ...s.today, lost: s.today.lost + 1, repChange: s.today.repChange - 0.5 } };
}

/** Staff style a small customer on their own from displayed stock. */
export function staffServe(s: GameState, c: Customer): { state: GameState; served: boolean } {
  if (!s.staff.length || c.cls === 'rich') return { state: turnAway(s), served: false };
  const shown = s.stock.filter((d) => d.displayed && d.pieces > 0);
  const fitsSex = (id: string) => {
    const e = shown.find((d) => d.uid === id);
    if (!e) return false;
    const m = entryFor(e.kind, e.itemId);
    return !!m && (m.for === 'both' || m.for === (c.male ? 'm' : 'f'));
  };
  const opts = shown.filter((d) => fitsSex(d.uid));
  const dress = opts.filter((d) => d.kind === 'dress');
  const tops = opts.filter((d) => d.kind === 'top');
  const bottoms = opts.filter((d) => d.kind === 'bottom');
  const shoes = opts.filter((d) => d.kind === 'shoes');
  const choice: StyleChoice = {};
  if (dress.length && (chance(0.5) || !tops.length || !bottoms.length)) choice.dress = pick(dress).uid;
  else if (tops.length && bottoms.length) { choice.top = pick(tops).uid; choice.bottom = pick(bottoms).uid; }
  else return { state: turnAway(s), served: false };
  if (shoes.length) choice.shoes = pick(shoes).uid;
  choice.hair = c.look.hair;
  const cost = lookCost(c, choice, s.stock);
  const best = s.staff.reduce((a, b) => (b.level > a.level ? b : a));
  const base = scoreInShop(s, c, choice);
  const total = Math.round(clamp(base.total * (0.62 + 0.035 * best.level), 0, 100));
  const score = { ...base, total };
  const price = Math.min(cost.fair, c.budget);
  const st = settle(c, score, price, cost.consumables);
  let next = applyLook(s, c, choice, st, score);
  next = { ...next, today: { ...next.today, staffServed: next.today.staffServed + (st.outcome === 'walked' || st.outcome === 'refused' ? 0 : 1) } };
  return { state: next, served: true };
}

// ---------------------------------------------------------------------------
// End of day: running costs, weekly wages, staff drama, rent
// ---------------------------------------------------------------------------
export function closeShop(s0: GameState): GameState {
  let s = s0;
  // anyone still waiting goes to staff or leaves
  while (s.queueIndex < s.queue.length) {
    const c = s.queue[s.queueIndex];
    const staffDone = s.today.staffServed;
    if (s.staff.length && staffDone < staffCapacity(s) && c.cls !== 'rich') s = staffServe(s, c).state;
    else s = turnAway(s);
  }
  const t = { ...TIERS[s.tier], rent: s.listing.rent };
  s = { ...s, cash: s.cash - t.running, today: { ...s.today, costs: s.today.costs + t.running } };
  if (s.today.lost) s = { ...s, today: { ...s.today, events: [...s.today.events, `${s.today.lost} customer${s.today.lost > 1 ? 's' : ''} left without being served.`] } };

  // weekly
  if (s.day % 7 === 0) {
    s = weeklyStaff(s);
    s = payRent(s);
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
  return { ...s, day: s.day + 1, phase: 'morning', queue: [], queueIndex: 0, today: emptyLog(s.day + 1) };
}

function payRent(s: GameState): GameState {
  const rent = s.listing.rent;
  if (s.cash >= rent && !s.lateRent) return msg({ ...s, cash: s.cash - rent, today: { ...s.today, costs: s.today.costs + rent, events: [...s.today.events, `Paid ${naira(rent)} rent.`] } }, 'Landlord', `Rent of ${naira(rent)} received. See you next week.`, 'info');
  const due = s.day + s.grace;
  const next = { ...s, cash: s.cash - rent, lateRent: { amount: rent, due }, today: { ...s.today, costs: s.today.costs + rent } };
  return msg(next, 'Landlord', s.grace === 0
    ? `You are short on rent and I don't give grace. Clear it today or you move out.`
    : `You are short on rent by ${naira(-next.cash)}. I'm giving you ${s.grace} day${s.grace > 1 ? 's' : ''}. If it's not paid by day ${due}, you move to a smaller shop.`, 'danger');
}

function demote(s: GameState): GameState {
  if (s.tier === 0) return msg({ ...s, lateRent: null }, 'Landlord', 'This kiosk is the last stop. I will let the debt run, but pay me soon.', 'danger');
  const tier = s.tier - 1;
  const t = TIERS[tier];
  const listing = cheapestListing(tier, week(s.day));
  const furniture = autoPlace(s.furniture.map((f) => ({ ...f, placed: true })), tier);
  const staff = s.staff.slice(0, t.staff);
  const left = s.staff.slice(t.staff);
  let next: GameState = { ...s, tier, listing, furniture, staff, lateRent: null, cash: s.cash + (s.lateRent?.amount || 0) * 0.5, movedDay: s.day, grace: listing.grace, stats: { ...s.stats, demotions: s.stats.demotions + 1 } };
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
  const furniture = autoPlace(s.furniture, tier);
  let next: GameState = { ...s, tier, listing: l, furniture, cash: s.cash - l.moveIn, movedDay: s.day, grace: l.grace };
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
  let placedItem: Placed = item;
  if (f.mount === 'ceiling') placedItem = { ...item, placed: true };
  else if (f.mount === 'wall') {
    if (wallUsed(s.furniture) + f.w <= wallCapacity(s.tier)) placedItem = { ...item, placed: true, x: wallUsed(s.furniture) };
  } else placedItem = findSpot(s.furniture, s.tier, item) || item;
  return { ...s, cash: s.cash - f.price, furniture: [...s.furniture, placedItem] };
}

export function placeFurniture(s: GameState, uid: string, x: number, z: number, rot: 0 | 1): GameState {
  const p = s.furniture.find((f) => f.uid === uid);
  if (!p) return s;
  const cand: Placed = { ...p, x, z, rot, placed: true };
  if (!canPlace(s.furniture, s.tier, cand)) return s;
  return { ...s, furniture: s.furniture.map((f) => (f.uid === uid ? cand : f)) };
}

/** Put a stored item back in the room wherever it fits. */
export function installFurniture(s: GameState, uid: string): GameState {
  const p = s.furniture.find((f) => f.uid === uid);
  if (!p || p.placed) return s;
  const f = furnitureById(p.id);
  if (f.mount === 'wall') {
    if (wallUsed(s.furniture) + f.w > wallCapacity(s.tier)) return s;
    return { ...s, furniture: s.furniture.map((x) => (x.uid === uid ? { ...x, placed: true, x: wallUsed(s.furniture) } : x)) };
  }
  if (f.mount === 'ceiling') return { ...s, furniture: s.furniture.map((x) => (x.uid === uid ? { ...x, placed: true } : x)) };
  const spot = autoPlace([...s.furniture.filter((x) => x.placed), { ...p }], s.tier).find((x) => x.uid === uid)!;
  if (!spot.placed) return s;
  return { ...s, furniture: s.furniture.map((x) => (x.uid === uid ? spot : x)) };
}

export function storeFurniture(s: GameState, uid: string): GameState {
  return fitDisplay({ ...s, furniture: s.furniture.map((f) => (f.uid === uid ? { ...f, placed: false } : f)) });
}

export function sellFurniture(s: GameState, uid: string): GameState {
  const p = s.furniture.find((f) => f.uid === uid);
  if (!p) return s;
  return fitDisplay({ ...s, cash: s.cash + Math.round(furnitureById(p.id).price * 0.4), furniture: s.furniture.filter((f) => f.uid !== uid) });
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
  return { ...s, cash: s.cash - total, stock: [...s.stock, { ...d, displayed: free }] };
}

export function setDisplayed(s: GameState, uid: string, on: boolean): GameState {
  if (on && displayedCount(s) >= displayCap(s)) return s;
  return { ...s, stock: s.stock.map((d) => (d.uid === uid ? { ...d, displayed: on } : d)) };
}

/** Buy more pieces of a design Divine already stocks. */
export function restock(s: GameState, uid: string, pieces: number): GameState {
  const d = s.stock.find((x) => x.uid === uid);
  if (!d || s.cash < d.cost * pieces) return s;
  return { ...s, cash: s.cash - d.cost * pieces, stock: s.stock.map((x) => (x.uid === uid ? { ...x, pieces: x.pieces + pieces } : x)) };
}

export const restockAllCost = (s: GameState, upTo = 2) => s.stock.filter((d) => d.displayed && d.pieces < upTo).reduce((a, d) => a + d.cost * (upTo - d.pieces), 0);

export function restockAll(s: GameState, upTo = 2): GameState {
  let next = s;
  for (const d of s.stock.filter((x) => x.displayed && x.pieces < upTo)) next = restock(next, d.uid, upTo - d.pieces);
  return next;
}

/** Sell old stock back to the market at half price. */
export function clearDesign(s: GameState, uid: string): GameState {
  const d = s.stock.find((x) => x.uid === uid);
  if (!d) return s;
  return { ...s, cash: s.cash + Math.round(d.cost * d.pieces * 0.5), stock: s.stock.filter((x) => x.uid !== uid) };
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
  return msg({ ...s, cash: s.cash - c.signing, staff: [...s.staff, member], hireOkDay: s.day + STAFF.hireDelayDays }, c.name, c.kind === 'trainee' ? 'Thank you for this chance, ma. I will learn fast!' : `I'm the best in Lagos. Pay me well and we'll have no problem.`, 'good');
}

export function train(s: GameState, id: string): GameState {
  const m = s.staff.find((x) => x.id === id);
  if (!m || m.level >= 10) return s;
  const fee = STAFF.trainFee(m.level);
  if (s.cash < fee) return s;
  const staff = s.staff.map((x) => (x.id === id ? { ...x, level: x.level + 1, wage: Math.round((x.wage * STAFF.raisePerLevel) / 500) * 500, loyalty: clamp(x.loyalty + (x.trained ? 8 : 3), 0, 100) } : x));
  return { ...s, cash: s.cash - fee, staff };
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
    s = { ...s, cash: s.cash - m.wage, today: { ...s.today, costs: s.today.costs + m.wage } };
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

/** Saves from before the 3D shop get the cheapest listing of their size and furniture that matches their display. */
function migrate(raw: GameState): GameState | null {
  const s = raw as unknown as GameState & { version: number };
  if (s.version === 2) return s;
  if (s.version !== 1) return null;
  const listing = s.tier === 0 ? KIOSK_LISTING : { ...cheapestListing(s.tier, week(s.day)), rent: TIERS[s.tier].rent, stars: 2 };
  const base = STARTER_FURNITURE.map((f) => ({ ...f, uid: newUid() }));
  const rails = Array.from({ length: Math.max(0, Math.ceil((TIERS[s.tier].slots - 12) / 8)) }, () => ({ uid: newUid(), id: 'chromeRail', x: 0, z: 0, rot: 0 as const, placed: true }));
  return { ...s, version: 2, listing, furniture: autoPlace([...base, ...rails], s.tier) };
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
