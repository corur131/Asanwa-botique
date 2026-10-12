import { CharacterConfig } from '../types/character';
import { generateRandomCustomer } from '../utils/randomizer';
import { DIVINE_CAPACITY, HOUR_WEIGHTS, PATIENCE, SHOP_MINUTES, staffMinutes, NEW_SHOP_RAMP_DAYS, NEW_SHOP_START, SERVICE_FEE, SLOW_WEEK_CHANCE, STAFF, STAFF_CAPACITY, START_CASH, SUPPLIES_SHARE, MARKUP, TIERS, naira } from './economy';
import { canBuy, entryFor, isClothing, makeDesign, pieceCost, productKey } from './market';
import { FabricId } from '../types/character';
import { answerRival, competition, initRivals, poacher, reactToMove, simulateRivals } from './rivals';
import { answerInvite, contestFor, contestModel, dropStep, judge, planDrop, planEvents, planTips, visitStep, wonListing } from './encounters';
import { POWER as POWER_CFG, activeGeneratorUid, addShout, coolRunning, drainRate, fuelOf, fuelPrice, liveStats, nepaOff, outageAt, planOutages, pourFuel, powerStep, scarcity, source, tankSize } from './power';
import { answerConvo, startGist } from './convos';
import { ENERGY, busyNow, divineBonus, energyOf, energyStep, exhausted, payBills, spendEnergy } from './life';
import { makeCustomer, makeCelebrityCustomer } from './customers';
import { buildLook, hairGroup, lookCost, scoreLook } from './scoring';
import { FEMALE_HAIR, MAKEUP_LOOKS } from '../constants/catalog';
import { colourName } from './colours';
import { FURNITURE, KIOSK_LISTING, Listing, Placed, STARTER_FURNITURE, autoPlace,
  findSpot, canPlace, turn, Rot, ceilingCapacity, ceilingUsed, yardCapacity, yardUsed, cheapestListing, furnitureById, listingsFor, newUid, prestigeRichShift, prestigeTraffic, shopStats, usesFloor, wallCapacity, wallUsed } from './shop';
import { CharacterMemory, CollaborationEvent, CollaborationReply, Customer, DayLog, Departure, Design, ReplyChoice, GameState, LedgerLine, Message, Regular, ScoreBreakdown, Settlement, SponsorshipOffer, StaffMember, StaffProfession, StyleChoice } from './types';
import { closeBrandDay, ensureBusinessState, getBrandMetrics, initialBankState, processBankWeekly, processPromotionAtClose, processExpansionAtClose, promotionTrafficBoost, recordWeeklyWealth, saveRentAtClose } from './business';

export { brandPower, currentWealthRows, getBrandMetrics, maximumLoan, netWorthPlayer, netWorthRival, playerWeekTotals, unlocksForFollowers, availablePromotionLevels, promotionBudgetBounds, promotionTrafficBoost, startPromotion, stopPromotion, transferBank, setRentSaving, setSavingsGoal, createFixedDeposit, takeBusinessLoan, repayBusinessLoan, expansionOptions, investInExpansion } from './business';

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const chance = (p: number) => Math.random() < p;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const emptyLog = (day: number): DayLog => ({ day, served: 0, walkedOut: 0, lost: 0, income: 0, costs: 0, tips: 0, bestScore: 0, repChange: 0, staffServed: 0, events: [] });

export const daysToRent = (day: number) => (7 - (day % 7)) % 7;
export const rentDue = (s: GameState) => s.listing.rent;
export const week = (day: number) => Math.floor((day - 1) / 7);
export const stats = (s: GameState) => liveStats(s);
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

export function rivalDefaults() {
  const rivals = initRivals();
  const base = { rivals, ranking: [] as GameState['ranking'], rivalPosts: [], gist: [], drop: null, events: [], visit: null, spying: 0 };
  return base;
}

const freshDay = { clock: 0, arrivals: [], inShop: [], serving: null, left: [], outages: [] as GameState['outages'], shouts: [] as GameState['shouts'] };

export function newGame(divine: CharacterConfig): GameState {
  const stock = STARTER.map(([kind, id, c, c2, pat]) => {
    const e = entryFor(kind as never, id)!;
    return { ...makeDesign(e, { fabric: e.fabric, color: c, color2: c2, pattern: pat, pieces: 2 }), displayed: true };
  });
  const spent = stock.reduce((a, d) => a + d.cost * d.pieces, 0);
  let s: GameState = {
    version: 5,
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
    power: { gen: false, solar: 0, fuel: 0 },
    energy: 100,
    meter: { kwh: 0 },
    shoutSeq: 0,
    ledger: [],
    followers: 120,
    posts: [],
    msgSeq: 0,
    read: {},
    characterMemories: {},
    collaborations: [],
    ...rivalDefaults(),
    today: emptyLog(1),
    history: [],
    messages: [],
    stats: { served: 0, totalEarned: 0, demotions: 0, bestScore: 0 },
    seed: Math.floor(Math.random() * 1e9),
  };
  s = ensureBusinessState(s);
  s = { ...s, weather: weatherForDay(s.day, s.seed) };
  s = money(s, -spent, 'Starter stock from Yaba market');
  s = msg(s, 'Deborah', `Sis! The kiosk is ready. I helped you stock it with ${naira(spent)} of clothes from Yaba market. You have ${naira(s.cash)} left. Rent is ${naira(TIERS[0].rent)} every 7 days. The place is small and rough, but we'll fix it up as the money comes.`, 'good');
  s = msg(s, 'Deborah', `The shop opens 8am to 8pm. Customers come in all day, busiest at lunch and after work. If you're slow, they get tired of waiting and leave, so move fast! Some only want hair or makeup, no clothes.`, 'info');
  return s;
}

// ---------------------------------------------------------------------------
// Opening the shop: who will come today, and when
// ---------------------------------------------------------------------------
/** Followers bring people in: up to +40% traffic. */
/** Followers improve reach continuously; engaged audiences still matter beyond raw scale. */
export const followerTraffic = (f: number) => 1 + 0.4 * (Math.max(0, f) / (Math.max(0, f) + 3000)) + Math.min(0.28, Math.log10(Math.max(0, f) + 1) / 45);

export function weatherForDay(day: number, seed: number): NonNullable<GameState['weather']> {
  // A 360-day Lagos year: wet season around May–October, harmattan in Dec–Jan.
  const month = Math.floor(((Math.max(1, day) - 1) % 360) / 30);
  const n = Math.sin((seed % 9973) * 0.137 + day * 12.9898 + 78.233) * 43758.5453;
  const r = n - Math.floor(n);
  if (month >= 4 && month <= 9) return r < 0.68 ? 'rainy' : r < 0.88 ? 'cloudy' : 'sunny';
  if (month === 11 || month === 0) return r < 0.68 ? 'harmattan' : r < 0.9 ? 'cloudy' : 'sunny';
  if (month >= 1 && month <= 3) return r < 0.68 ? 'sunny' : 'cloudy';
  return r < 0.48 ? 'sunny' : r < 0.85 ? 'cloudy' : 'rainy';
}

export function customersToday(s: GameState, slow: boolean) {
  const t = TIERS[s.tier];
  const ramp = Math.min(1, NEW_SHOP_START + (1 - NEW_SHOP_START) * Math.max(0, s.day - s.movedDay) / NEW_SHOP_RAMP_DAYS);
  const brand = getBrandMetrics(s);
  const traffic = prestigeTraffic(stats(s).prestige) * followerTraffic(s.followers || 0) * (1 + stats(s).traffic) * (1 + promotionTrafficBoost(s)) * competition(s) * (s.listing.signature ? 1.35 : 1);
  const brandDemand = 0.55 + brand.awareness / 240 + brand.loyalty / 350 + brand.reliability / 400;
  const weatherTraffic = s.weather === 'rainy' ? 0.82 : s.weather === 'sunny' ? 1.04 : 1;
  return Math.max(4, Math.round(t.customers * traffic * brandDemand * (0.85 + Math.random() * 0.3) * (slow ? 0.55 : 1) * ramp * weatherTraffic));
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
  const b0 = shopBonus(s, c, choice);
  // Divine's own state counts when she is the one styling
  const d = s.serving === c.id ? divineBonus(s, !!choice.hair, !c.male && !!choice.makeup) : { bonus: 0, notes: [] };
  const b = { bonus: b0.bonus + d.bonus, notes: [...b0.notes, ...d.notes] };
  if (!b.bonus) return base;
  return { ...base, total: Math.max(0, Math.min(100, base.total + b.bonus)), bonus: b.bonus, bonusNotes: b.notes } as ScoreBreakdown;
}

/** Extra score from the shop itself: mirror, stations, fitting room. */
export function shopBonus(s: GameState, c: Customer, choice: StyleChoice): { bonus: number; notes: string[] } {
  const st = stats(s);
  let bonus = st.mirror;
  const notes: string[] = [];
  if (st.mirror) notes.push(`Mirror +${st.mirror}`);
  if (choice.hair && st.hairBonus) { bonus += st.hairBonus; notes.push(`Hair station +${st.hairBonus}`); }
  if (!c.male && choice.makeup && st.makeupBonus) { bonus += st.makeupBonus; notes.push(`Makeup station +${st.makeupBonus}`); }
  if (c.wants.some((w) => w.kind === 'nails') && choice.makeup?.nailColor && st.nailBonus) { bonus += st.nailBonus; notes.push(`Nail station +${st.nailBonus}`); }
  if (c.cls === 'rich' && st.richBonus) { bonus += st.richBonus; notes.push(`Fitting room +${st.richBonus}`); }
  if (st.scoreBonus) { bonus += st.scoreBonus; notes.push(`Steamer and lighting +${st.scoreBonus}`); }
  if (Object.values(choice).some((uid) => typeof uid === 'string' && s.stock.some((d) => d.uid === uid && (d.trend || 0) >= s.day))) { bonus += 4; notes.push('Trending fabric +4'); }
  const src = s.phase === 'shop' ? source(s) : 'grid';
  if (src === 'solar') { bonus += 2; notes.push('Cool and quiet on solar +2'); }
  if (src === 'none') {
    const lantern = s.furniture.some((p) => p.placed && p.id === 'lantern');
    bonus -= lantern ? 1 : 4;
    notes.push(lantern ? 'Lantern keeps the look visible -1' : 'Styled in the dark and heat -4');
  }
  return { bonus: Math.min(10, bonus), notes };
}

export function openShop(s0: GameState): GameState {
  let s: GameState = { ...s0, phase: 'shop', weather: weatherForDay(s0.day, s0.seed), ...freshDay, today: emptyLog(s0.day) };
  let slow = s.slowWeek;
  if (s.day % 7 === 1) {
    slow = s.day > 7 && chance(SLOW_WEEK_CHANCE);
    if (slow) s = msg(s, 'Deborah', pick(['Rain has started o. Customers will be few this week.', 'Fuel scarcity everywhere. People are not going out this week.', 'Exam week for the students. The market is quiet.']), 'warn');
    if (scarcity(s) && tankSize(s)) s = msg(s, 'Deborah', `Fuel scarcity o! Petrol is ${naira(fuelPrice(s))} a litre this week, and the queues are long. Use the gen small small.`, 'warn');
  }
  const st = stats(s);
  const n = customersToday(s, slow);
  const mix = [...TIERS[s.tier].mix] as [number, number, number];
  const shift = prestigeRichShift(st.prestige);
  if (s.listing.signature) {
    // Signature properties are luxury-only: poor customers are excluded and middle-class visits are uncommon.
    mix[0] = 0.005;
    mix[1] = 0.075;
    mix[2] = 0.92;
  } else {
    mix[0] = Math.max(0.05, mix[0] - shift);
    mix[2] = Math.max(0, mix[2] + shift);
  }
  const arrivals = Array.from({ length: n }, () => ({ at: arrivalMinute(), c: makeCustomer(s, mix) }));
  // Premium access scales with property tier. These are the scheduled visit
  // days within each 14-day cycle (2, 3, 4, 5, and 6 visits, respectively).
  const celebrityDaysByTier: number[][] = [
    [2, 9],
    [1, 5, 10],
    [0, 4, 7, 11],
    [1, 4, 7, 10, 13],
    [0, 2, 4, 7, 9, 12],
  ];
  const fortnightDay = (s.day - 1) % 14;
  const celebrityScheduled = (celebrityDaysByTier[s.tier] || []).includes(fortnightDay);
  if (s.listing.signature && celebrityScheduled) {
    const c = makeCelebrityCustomer(s);
    arrivals.push({ at: 100 + Math.random() * 560, c });
  }
  const model = contestModel(s);
  if (model) arrivals.push(model);
  if (s.celebDay === s.day) {
    const c = makeCustomer(s, [0, 0, 1]);
    arrivals.push({ at: 120 + Math.random() * 360, c: { ...c, influencer: true, budget: Math.round(c.budget * 1.5 / 10_000) * 10_000, request: `Hi! I'm ${c.name}. ${c.request} (A celebrity! Her followers will see this look.)` } });
  }
  arrivals.sort((a, b) => a.at - b.at);
  const outages = planOutages(s.day);
  // Heavy rain makes grid faults more likely in the shop's neighbourhood.
  if (s.weather === 'rainy' && chance(0.35)) {
    const from = Math.round(30 + Math.random() * 540);
    outages.push({ from, to: from + Math.round(45 + Math.random() * 150) });
    outages.sort((a, b) => a.from - b.from);
  }
  if (s.weather === 'harmattan') s = addShout(s, 'Deborah', 'Harmattan dust everywhere this morning. Keep the clothes covered, sis.', 'warn');
  let next: GameState = { ...s, slowWeek: slow, arrivals, outages, busy: null, power: { ...s.power, gen: false, solar: s.power?.solar || 0 } };
  if (outageAt(next, 0)) {
    next = addShout(next, 'NEPA', 'No light this morning. NEPA took it before you opened.', 'nepa');
    if (stats(next).solarPanels && next.power.solar > 0) next = addShout(next, 'Solar', 'Solar is running the shop for now.', 'good');
    else if (stats(next).gen) next = addShout(next, 'Deborah', 'Start the generator before customers come!', 'warn');
  }
  return next;
}

export const divineCapacity = DIVINE_CAPACITY;
export const staffCapacity = (s: GameState) => s.staff.length * STAFF_CAPACITY;

export const inBlackout = (s: GameState, t = s.clock) => nepaOff(s, t);
/** Fans and AC only work when there is light, solar or a generator. */
export const coolNow = (s: GameState) => coolRunning(s);
export { POWER, activeGeneratorUid, fuelOf, fuelPerHour, fuelPrice, loadKw, pourFuel, refuel, scarcity, setGen, solarCap, source, tankSize } from './power';
export { ENERGY, actionsFor, busyNow, energyOf, exhausted, interact, isTired, weeklyBills } from './life';
export type { Action, ActionId } from './life';
export const waiting = (s: GameState) => s.inShop.filter((v) => !v.by);
export const visitor = (s: GameState, id: string | null) => (id ? s.inShop.find((v) => v.c.id === id) : undefined);

/** Staff need level 6 before they may serve wealthy customers. */
export const RICH_CUSTOMER_STAFF_LEVEL = 6;

/** Shared eligibility rule for automatic dispatch and player-directed assignments. */
export function staffCanServeCustomer(staff: Pick<StaffMember, 'level' | 'profession'>, customer: Customer): boolean {
  if (customer.cls === 'rich' && staff.level < RICH_CUSTOMER_STAFF_LEVEL) return false;
  const profession = staff.profession || 'stylist';
  if (profession === 'makeup') return customer.service === 'makeup' || customer.service === 'both';
  return customer.service !== 'makeup';
}

/** Whether at least one qualified employee can take this unassigned visitor. */
export function canAssignToStaff(s: GameState, id: string): boolean {
  const v = visitor(s, id);
  return !!v && !v.by && s.staff.some((m) => staffCanServeCustomer(m, v.c) && staffChoice(s, v.c) !== null);
}
export const shopClosing = (s: GameState) => s.phase === 'shop' && s.clock >= SHOP_MINUTES;

function patienceFor(s: GameState, c: Customer) {
  const st = stats(s);
  const weatherComfort = s.weather === 'rainy' || s.weather === 'harmattan' || s.weather === 'cloudy' ? 1.08 : 1;
  let p = PATIENCE[c.cls] * (1 + Math.min(0.4, 0.1 * st.seats)) * (1 + coolNow(s) * 0.6) * (1 + st.patience) * weatherComfort;
  if (c.regularId) p += 20;
  return Math.round(p);
}

function depart(s: GameState, c: Customer, look: CharacterConfig, bag: boolean): GameState {
  const d: Departure = { key: `${c.id}-${Math.floor(s.clock)}`, id: c.id, look, bag };
  return { ...s, inShop: s.inShop.filter((v) => v.c.id !== c.id), serving: s.serving === c.id ? null : s.serving, left: [...s.left, d].slice(-10) };
}

/** Small shop incidents. They only run during shop time and respect purchased safety equipment. */
function shopIncidentStep(s0: GameState, minutes: number): GameState {
  if (minutes <= 0) return s0;
  let s = s0;
  const has = (id: string) => s.furniture.some((p) => p.placed && p.id === id);
  const crowded = s.inShop.length >= 3 && (!!s.serving || !!s.busy);
  const guardOnDuty = !!s.security?.guard && has('securityPost');
  const theftRisk = guardOnDuty ? (has('cctv') ? 0.000006 : 0.000035) : has('cctv') ? 0.000015 : has('shopAlarm') ? 0.00006 : s.staff.length ? 0.00008 : 0.00016;
  if (crowded && chance(1 - Math.pow(1 - theftRisk, minutes))) {
    const available = s.stock.filter((d) => d.pieces > 0);
    if (available.length) {
      const stolen = available[Math.floor(Math.random() * available.length)];
      if (guardOnDuty && chance(0.82)) {
        s = addShout(s, s.security!.guard!.name, `Stop there! I caught someone taking ${stolen.label}. I've recovered it and returned it to the rail.`, 'good');
        s = { ...s, today: { ...s.today, events: [...s.today.events, `Security caught a shoplifter and recovered ${stolen.label}; no stock was lost.`] } };
      } else {
        s = { ...s, stock: s.stock.map((d) => d.uid === stolen.uid ? { ...d, pieces: Math.max(0, d.pieces - 1) } : d) };
        s = addShout(s, 'Deborah', `Sis, one ${stolen.label} don miss from the rail 😩`, 'warn');
        s = { ...s, today: { ...s.today, events: [...s.today.events, `Shoplifting: one ${stolen.label} went missing.`] } };
      }
    }
  }
  if (s.power?.gen && source(s) === 'gen') {
    const baseRisk = scarcity(s) ? 0.00018 : 0.000035;
    const risk = has('fireAlarm') ? baseRisk * 0.45 : baseRisk;
    if (chance(1 - Math.pow(1 - risk, minutes))) {
      if (has('fireExtinguisher') || has('fireBlanket')) {
        s = { ...s, power: { ...s.power, gen: false } };
        s = addShout(s, 'Deborah', 'Small flare-up at the gen! The extinguisher stopped it. Please check the generator before restarting.', 'warn');
        s = { ...s, today: { ...s.today, events: [...s.today.events, 'A generator flare-up was put out with the fire extinguisher.'] } };
      } else {
        const repair = scarcity(s) ? 85000 : 45000;
        s = money(s, -repair, 'Generator fire repairs');
        s = { ...s, power: { ...s.power, gen: false }, today: { ...s.today, costs: s.today.costs + repair, events: [...s.today.events, `Generator fire: paid ${naira(repair)} for repairs; smoke drove customers out.`] } };
        const sent = waiting(s);
        for (const v of sent) s = depart(s, v.c, v.c.look, false);
        if (sent.length) s = { ...s, today: { ...s.today, lost: s.today.lost + sent.length, closedOn: (s.today.closedOn || 0) + sent.length } };
        s = addShout(s, 'Deborah', `Fire at the generator! The gen is off and repairs cost ${naira(repair)}. We need an extinguisher, sis!`, 'warn');
      }
    }
  }
  return s;
}

/**
 * Moves the shop clock forward. People walk in, lose patience, get styled by
 * staff, and at 8pm the doors shut.
 */
export function tick(s0: GameState, minutes: number): GameState {
  // Errands keep progressing while the boutique is closed too; the shop clock itself remains paused.
  if (s0.phase !== 'shop') return securityStep(s0, minutes);
  let s = s0;
  const end = Math.min(SHOP_MINUTES, s.clock + minutes);
  const st = stats(s);
  // walk-ins
  let lostDoor = 0;
  let lostHeat = 0;
  let lostWeather = 0;
  while (s.arrivals.length && s.arrivals[0].at <= end) {
    const [a, ...rest] = s.arrivals;
    s = { ...s, arrivals: rest };
    // passers-by look in at a dark, hot shop and keep walking
    const vip = !!a.c.contest || !!a.c.celebrity;
    const canopy = s.furniture.some((p) => p.placed && p.id === 'umbrellaCanopy');
    // Rain sends some walk-ins home; a street canopy protects the queue.
    if (!vip && s.weather === 'rainy' && chance(canopy ? 0.06 : 0.18)) { lostWeather++; continue; }
    if (!vip && s.weather === 'sunny' && chance(canopy ? 0.02 : 0.08)) { lostWeather++; continue; }
    if (!vip && source(s, a.at) === 'none' && chance({ poor: 0.2, middle: 0.35, rich: 0.6 }[a.c.cls])) { lostHeat++; continue; }
    if (!vip && waiting(s).length >= waitingRoom(s)) { lostDoor++; continue; }
    // the speaker is switched off: fewer people wander in from the street
    if (!vip && s.off && s.furniture.some((p) => p.placed && p.id === 'speaker' && s.off![p.uid]) && chance(0.08)) continue;
    // a style-off model waits for you all day
    s = { ...s, inShop: [...s.inShop, { c: a.c, arrived: a.at, patience: vip ? 9999 : patienceFor(s, a.c) * (s.listing.signature ? 2.1 : 1), waited: 0 }] };
  }
  if (lostDoor || lostHeat || lostWeather) s = { ...s, today: { ...s.today, lost: s.today.lost + lostDoor + lostHeat + lostWeather, doorLost: (s.today.doorLost || 0) + lostDoor, heatLost: (s.today.heatLost || 0) + lostHeat, weatherLost: (s.today.weatherLost || 0) + lostWeather } };
  s = powerStep(s, s.clock, end);
  s = shopIncidentStep(s, end - s.clock);
  s = dropStep(s, end - s.clock);
  s = visitStep(s, end - s.clock);
  s = energyStep(s, end - s.clock);
  s = securityStep(s, end - s.clock);
  s = { ...s, clock: end };
  if (s.busy && s.busy.until <= end) s = { ...s, busy: null };
  // tired of waiting: heat and darkness use patience up faster
  const step = end - s0.clock;
  s = { ...s, inShop: s.inShop.map((v) => (v.by ? v : { ...v, waited: (v.waited ?? Math.max(0, s0.clock - v.arrived)) + step * drainRate(s, v.c.cls) })) };
  for (const v of waiting(s)) {
    if (!v.complained && stats(s).seats > 0 && (v.waited || 0) > v.patience * 0.55) {
      const rival = s.rivals.find((r) => r.main && r.id !== 'you');
      s = addShout(s, v.c.name, rival ? `I don wait tire. I fit go ${rival.shop} instead, abeg.` : 'I don wait tire. Abeg, who go attend to me?', 'complain');
      s = { ...s, inShop: s.inShop.map((x) => x.c.id === v.c.id ? { ...x, complained: true } : x) };
    }
    if ((v.waited || 0) > v.patience) {
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
      // Dispatch the oldest eligible customer as soon as an employee is free; explicit requests go first.
      const next = waiting(s)
        .filter((v) => staffCanServeCustomer(m, v.c) && staffChoice(s, v.c) !== null)
        .sort((a, b) => Number(!!b.forStaff) - Number(!!a.forStaff) || a.arrived - b.arrived)[0];
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
  if (!s.serving && (exhausted(s) || busyNow(s))) return s;
  const v = visitor(s, id);
  if (!v || (v.by && v.by !== 'divine')) return s;
  return { ...s, serving: id, inShop: s.inShop.map((x) => (x.c.id === id ? { ...x, by: 'divine', forStaff: false } : x)) };
}

export function sendToStaff(s: GameState, id: string): GameState {
  const v = visitor(s, id);
  if (!v || !canAssignToStaff(s, id)) return s;
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
export function settle(c: Customer, score: ScoreBreakdown, price: number, supplies: number, context: { hasPOS?: boolean; hasAlterations?: boolean; fitted?: boolean } = {}): Settlement {
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
  if (s < 50 && !c.celebrity) {
    if (chance(0.4)) return { price, paid: 0, tip: 0, cost: 0, outcome: 'refused', line: pick(REACTIONS.cry) + ' Take it back, I\'m not paying.', reaction: 'cry', repDelta: -1.5 * (c.influencer ? 3 : 1), becameRegular: false };
    paid *= 0.7;
    outcome = 'bargained';
  } else if (s < 65) {
    paid *= 0.88;
    if (outcome === 'paid') outcome = 'bargained';
  }
  // Fitted pieces sometimes need a quick adjustment. The alterations corner saves the sale.
  if (!c.celebrity && context.fitted && chance(context.hasAlterations ? 0.04 : 0.2)) {
    if (context.hasAlterations) {
      paid = Math.round(paid * 0.95);
      outcome = 'bargained';
      line = 'This one is a bit tight, but the alterations corner fixed it on the spot. Thank you!';
    } else {
      return { price, paid: 0, tip: 0, cost: 0, outcome: 'walked', line: 'This one too tight for me. No alterations here? I will check another shop.', reaction: 'frown', repDelta: -1.2, becameRegular: false };
    }
  }
  // Some customers need to pay electronically. Transfers can fail when the network misbehaves;
  // a POS terminal makes card payments reliable but charges a small transaction fee.
  if (chance(0.3)) {
    if (!c.celebrity && !context.hasPOS && chance(0.35)) {
      return { price, paid: 0, tip: 0, cost: 0, outcome: 'walked', line: 'Do you take transfer? Network no gree! I cannot wait for this alert. I am going.', reaction: 'frown', repDelta: -0.8, becameRegular: false };
    }
    if (context.hasPOS) {
      paid = Math.round(paid * 0.99);
      line = `${line} POS approved, but the terminal took its small transaction fee.`;
    } else {
      line = `${line} Transfer alert received. Thank goodness.`;
    }
  }
  let tip = 0;
  if (s >= 85) tip = { poor: 0.03, middle: 0.08, rich: 0.15 }[c.cls] * paid;
  else if (s >= 75) tip = { poor: 0.01, middle: 0.04, rich: 0.07 }[c.cls] * paid;
  if (c.male) tip *= 1.5; // men tip big
  if (c.celebrity) {
    paid = Math.max(paid, c.celebrity.spendFloor);
    outcome = 'paid';
    tip = Math.max(tip, Math.round(paid * (0.22 + c.celebrity.tier * 0.035) / 100) * 100);
    line = `${c.name} loved the luxury look and paid lavishly, with a generous celebrity tip.`;
  }
  const repDelta = ((s - 65) / 18) * (c.influencer ? 3 : 1);
  return { price, paid: Math.round(paid), tip: Math.round(tip / 100) * 100, cost: supplies, outcome, line, reaction, repDelta, becameRegular: s >= 80 && !c.regularId };
}

/** Applies a finished look: stock leaves the shop, money and reputation move, the customer walks out. */
export function applyLook(s0: GameState, c: Customer, choice: StyleChoice, st0: Settlement, score: ScoreBreakdown): GameState {
  let st = st0;
  if (s0.listing.signature && !c.celebrity) st = { ...st, tip: Math.max(st.tip, Math.round(st.paid * 0.12 / 100) * 100) };
  // styling wears Divine out: a full look more than a quick hair or makeup job
  const s = s0.serving === c.id ? spendEnergy(s0, c.service ? ENERGY.service : ENERGY.fullLook) : s0;
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
  if (c.celebrity && sold) {
    const gained = Math.round((8_000 + Math.random() * 10_000) * (1 + c.celebrity.tier * 0.85));
    const rivals = next.rivals.map((r) => r.id === 'you' ? r : { ...r, feeling: clamp(r.feeling - (8 + c.celebrity!.tier * 3), -100, 100) });
    next = { ...next, followers: (next.followers || 0) + gained, rep: clamp(next.rep + 3 + c.celebrity.tier * 2, 0, 100), rivals,
      today: { ...next.today, events: [...next.today.events, `TRENDING IN LAGOS: ${c.name} visited your Signature shop, spent millions, tipped lavishly and posted your look. +${gained.toLocaleString('en-NG')} followers. Rivals are watching.`] } };
    next = msg(next, 'Gidigram', `TRENDING NOW 🔥 ${c.name} posted the look from your shop! +${gained.toLocaleString('en-NG')} followers, a huge reputation boost, and your rivals are jealous.`, 'good');
  }
  if (c.contest) next = judge(next, c, score.total);
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
  s = { ...s, power: { ...s.power, gen: false }, busy: null };
  const d = s.today;
  const ev: string[] = [];
  if (d.impatient) ev.push(`${d.impatient} customer${d.impatient > 1 ? 's' : ''} got tired of waiting and left.`);
  if (d.doorLost) ev.push(`${d.doorLost} turned back at the door: no space to wait. More seats would keep them.`);
  if (d.outageMinutes) {
    const h = Math.floor(d.outageMinutes / 60);
    const m = Math.round(d.outageMinutes % 60);
    ev.push(`NEPA took light for ${h ? `${h}h ` : ''}${m}m of opening time.`);
  }
  if (d.heatLost) ev.push(`${d.heatLost} walked past a dark, hot shop without coming in.`);
  if (d.litres) ev.push(`Bought ${Math.round(d.litres * 10) / 10} litres of fuel for ${naira(d.fuel || 0)}.`);
  if (d.closedOn) ev.push(`${d.closedOn} ${d.closedOn > 1 ? 'were' : 'was'} still waiting at closing time and went home.`);
  s = { ...s, today: { ...s.today, events: [...s.today.events, ...ev] } };
  s = processExpansionAtClose(s);
  s = processPromotionAtClose(s);
  s = saveRentAtClose(s);

  // weekly
  if (s.day % 7 === 0) {
    s = weeklyStaff(s);
    if (s.security?.guard) {
      const wage = s.security.guard.wage;
      s = money({ ...s, today: { ...s.today, costs: s.today.costs + wage, events: [...s.today.events, `Paid ${naira(wage)} in security wages.`] } }, -wage, `Security guard wages: ${s.security.guard.name}`);
    }
    s = payBills(s);
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
  // Keep the old score only for legacy save compatibility; public-facing progression uses Brand Power.
  s = { ...s, rep: clamp(s.rep - (s.rep - 40) * 0.03, 0, 100) };
  s = closeBrandDay(s);
  if (s.day % 7 === 0) s = processBankWeekly(s);
  const history = [...s.history, s.today].slice(-120);
  s = { ...s, history };
  s = simulateRivals(s);
  // now and then Deborah has gist
  if (s.day > 2 && Math.random() < 0.25 && !(s.convos || []).some((c) => c.with === 'Deborah' && !c.done)) s = startGist(s);
  s = planEvents(s);
  s = planTips(s);
  s = planSponsorshipOffer(s);
  s = resolveDueCollaborations(s);
  // closeShop records today's history before resolving due events; refresh that log
  // so collaboration payouts count in weekly performance and end-of-day summaries.
  if (s.history.length && s.history[s.history.length - 1].day === s.day) {
    s = { ...s, history: [...s.history.slice(0, -1), s.today] };
  }
  if (s.day % 7 === 0) s = recordWeeklyWealth(s);
  return { ...s, phase: 'evening', visit: null };
}

export function nextMorning(s: GameState): GameState {
  return planDrop({ ...s, day: s.day + 1, weather: weatherForDay(s.day + 1, s.seed), phase: 'morning', ...freshDay, busy: null, energy: ENERGY.max, today: emptyLog(s.day + 1) });
}

/** Add a message to a specific WhatsApp thread without invoking a model call. */
function refreshEveningHistory(s: GameState): GameState {
  if (s.phase !== 'evening' || !s.history.length || s.history[s.history.length - 1].day !== s.day) return s;
  return { ...s, history: [...s.history.slice(0, -1), s.today] };
}

function collaborationChatMessage(s: GameState, chat: string, from: string, text: string, tone: Message['tone'] = 'info'): GameState {
  const id = (s.msgSeq || 0) + 1;
  const message: Message = {
    id, day: s.day, from, chat, text, tone,
    t: s.phase === 'shop' ? Math.floor(s.clock) : undefined,
  };
  return { ...s, msgSeq: id, messages: [message, ...(s.messages || [])].slice(0, 160) };
}

function collaborationOutcome(s0: GameState, messageId: number, outcome: NonNullable<Message['collaborationOutcome']>, text: string): GameState {
  const message = s0.messages.find((m) => m.id === messageId);
  if (!message) return s0;
  const chat = message.from;
  const messages = s0.messages.map((m) => m.id === messageId ? { ...m, collaborationOutcome: outcome } : m);
  return collaborationChatMessage({ ...s0, messages }, chat, 'You', text);
}

/** Commit to an AI-negotiated pop-up only after Divine explicitly accepts the offer. */
export function confirmCollaboration(s0: GameState, messageId: number): GameState {
  const message = s0.messages.find((m) => m.id === messageId);
  const offer = message?.collaboration;
  if (!message || message.from === 'You' || message.chat === 'Lagos Fashion Babes' ||
      message.collaborationOutcome || !offer || (offer.decision !== 'accept' && offer.decision !== 'counter')) return s0;

  const partner = (s0.rivals || []).find((r) => r.owner === message.from && r.main);
  if (!partner) return s0;
  const active = (s0.collaborations || []).some((event) => event.partnerId === partner.id && event.status === 'scheduled');
  if (active) {
    return collaborationOutcome(s0, messageId, 'already_booked', 'I already have a pop-up scheduled with you. Let’s finish that one before booking another.');
  }

  const tierBudgetMax = [250_000, 2_000_000, 10_000_000, 50_000_000, 150_000_000][clamp(s0.tier, 0, 4)];
  const cashBudgetMax = Math.max(25_000, Math.min(tierBudgetMax, Math.max(0, s0.cash) * 2 + Math.max(0, partner.cash) * 2));
  const totalCost = Math.round(clamp(Number.isFinite(offer.totalCost) ? offer.totalCost : 20000, 15_000, cashBudgetMax) / 2500) * 2500;
  const playerCostSharePct = Math.round(Math.max(10, Math.min(90, Number.isFinite(offer.playerCostSharePct) ? offer.playerCostSharePct : 50)));
  const playerProfitSharePct = Math.round(Math.max(10, Math.min(90, Number.isFinite(offer.playerProfitSharePct) ? offer.playerProfitSharePct : 50)));
  const dayOffset = Math.round(Math.max(3, Math.min(14, Number.isFinite(offer.dayOffset) ? offer.dayOffset : 7)));
  const eventName = typeof offer.eventName === 'string' && offer.eventName.trim()
    ? offer.eventName.trim().slice(0, 80)
    : 'Asanwa Boutique x ' + partner.shop + ' Fashion Pop-up';
  const playerContribution = Math.round(totalCost * playerCostSharePct / 100);
  const partnerContribution = totalCost - playerContribution;

  if (s0.cash < playerContribution) {
    return collaborationOutcome(s0, messageId, 'unaffordable', 'I can’t commit to the pop-up yet — my share is ' + naira(playerContribution) + ', and I don’t have enough cash available. Let’s discuss a smaller budget.');
  }
  if (partner.cash < partnerContribution) {
    return collaborationOutcome(s0, messageId, 'partner_unable', 'The plan sounds good, but you can’t currently cover your ' + naira(partnerContribution) + ' share from the boutique’s available funds. We need to agree on a smaller budget first.');
  }

  const event: CollaborationEvent = {
    id: 'collab-' + s0.day + '-' + partner.id + '-' + messageId,
    partnerId: partner.id,
    partnerName: partner.owner,
    eventName,
    day: s0.day + dayOffset,
    createdDay: s0.day,
    totalCost,
    playerCostSharePct,
    playerProfitSharePct,
    status: 'scheduled',
  };
  let s = money(s0, -playerContribution, 'Pop-up setup share with ' + partner.owner);
  s = {
    ...s,
    rivals: s.rivals.map((r) => r.id === partner.id ? { ...r, cash: r.cash - partnerContribution, feeling: clamp(r.feeling + 3, -100, 100) } : r),
    collaborations: [...(s.collaborations || []), event].slice(-30),
    today: {
      ...s.today,
      costs: s.today.costs + playerContribution,
      events: [...s.today.events, 'Committed ' + naira(playerContribution) + ' to ' + eventName + ', scheduled for Day ' + event.day + '.'],
    },
    messages: s.messages.map((m) => m.id === messageId ? { ...m, collaborationOutcome: 'scheduled', collaborationScheduledDay: event.day } : m),
  };
  s = collaborationChatMessage(s, partner.owner, 'You',
    'Deal confirmed: ' + eventName + ' on Day ' + event.day + '. Total setup budget ' + naira(totalCost) +
    '; my contribution is ' + naira(playerContribution) + ' and my agreed profit share is ' + playerProfitSharePct + '%. Let’s make it work.');
  return refreshEveningHistory(s);
}

/** Decline an offer without spending money or changing the rival relationship score. */
export function declineCollaboration(s0: GameState, messageId: number): GameState {
  const message = s0.messages.find((m) => m.id === messageId);
  const offer = message?.collaboration;
  if (!message || message.from === 'You' || message.chat === 'Lagos Fashion Babes' ||
      message.collaborationOutcome || !offer || (offer.decision !== 'accept' && offer.decision !== 'counter')) return s0;
  return collaborationOutcome(s0, messageId, 'declined', 'I’ll pass on this pop-up proposal for now. We can discuss another idea later.');
}

/** Resolve scheduled pop-ups at closing time on their event day. All payouts are engine-calculated. */
function resolveDueCollaborations(s0: GameState): GameState {
  let s = s0;
  for (const event0 of [...(s.collaborations || [])].filter((item) => item.status === 'scheduled' && item.day <= s.day)) {
    const event = (s.collaborations || []).find((item) => item.id === event0.id);
    const partner = (s.rivals || []).find((r) => r.id === event0.partnerId);
    if (!event || !partner) continue;
    const totalCost = Math.max(1, event.totalCost);
    const playerCostSharePct = Math.max(10, Math.min(90, event.playerCostSharePct));
    const playerProfitSharePct = Math.max(10, Math.min(90, event.playerProfitSharePct));
    const playerContribution = Math.round(totalCost * playerCostSharePct / 100);
    const partnerContribution = totalCost - playerContribution;

    // Sales vary with both businesses' reputations and audience, then random market conditions.
    const reputationFactor = 0.82 + (Math.max(0, Math.min(100, s.rep)) / 100) * 0.22 + (Math.max(0, Math.min(100, partner.rep)) / 100) * 0.13;
    const audienceFactor = 0.9 + Math.min(0.3, Math.sqrt(Math.max(0, (s.followers || 0) + partner.followers)) / 2500);
    const salesFactor = (0.4 + Math.random() * 1.8) * reputationFactor * audienceFactor;
    const grossRevenue = Math.max(0, Math.round(totalCost * salesFactor));
    const profit = grossRevenue - totalCost;
    // Profits use the negotiated profit split. If the event loses money, the loss follows each side's capital contribution.
    const playerRate = (profit >= 0 ? playerProfitSharePct : playerCostSharePct) / 100;
    const partnerRate = 1 - playerRate;
    const playerPayout = Math.max(0, Math.round(playerContribution + profit * playerRate));
    const partnerPayout = Math.max(0, Math.round(partnerContribution + profit * partnerRate));

    s = money(s, playerPayout, 'Pop-up payout from ' + event.eventName);
    s = {
      ...s,
      rivals: s.rivals.map((r) => r.id === partner.id ? { ...r, cash: r.cash + partnerPayout, rep: clamp(r.rep + (profit >= 0 ? 0.5 : -0.3), 0, 100), feeling: clamp(r.feeling + (profit >= 0 ? 5 : -8), -100, 100), followers: r.followers + (profit > 0 ? Math.min(150, Math.max(10, Math.round(profit / 1500))) : 0) } : r),
      rep: clamp(s.rep + (profit > 0 ? Math.min(2, Math.max(0.3, profit / 60000)) : profit < 0 ? -0.8 : 0), 0, 100),
      followers: (s.followers || 0) + (profit > 0 ? Math.min(250, Math.max(15, Math.round(profit / 1000))) : 0),
      today: {
        ...s.today,
        income: s.today.income + playerPayout,
        events: [...s.today.events, eventNameForLog(event, grossRevenue, profit, playerPayout)],
      },
      collaborations: (s.collaborations || []).map((item) => item.id === event.id
        ? { ...item, status: 'completed', grossRevenue, profit, playerPayout, partnerPayout }
        : item),
    };
    const note = profit >= 0
      ? event.eventName + ' with ' + partner.owner + ' brought in ' + naira(grossRevenue) + '. After the costs, the event profit was ' + naira(profit) + '; your payout was ' + naira(playerPayout) + '.'
      : event.eventName + ' with ' + partner.owner + ' brought in ' + naira(grossRevenue) + ', below the setup cost of ' + naira(totalCost) + '. The event lost ' + naira(Math.abs(profit)) + '; your payout was ' + naira(playerPayout) + '.';
    const gistItem = { id: 'collab-gist-' + event.id, day: s.day, title: 'Pop-up results: ' + event.eventName, body: note, about: 'you', hot: profit < 0 };
    s = { ...s, gist: [gistItem, ...(s.gist || [])].slice(0, 40) };
    s = collaborationChatMessage(s, partner.owner, partner.owner, note, profit < 0 ? 'warn' : 'good');
  }
  return s;
}

function eventNameForLog(event: CollaborationEvent, grossRevenue: number, profit: number, payout: number): string {
  return event.eventName + ': sales ' + naira(grossRevenue) + ', event profit ' + naira(profit) + ', Divine payout ' + naira(payout) + '.';
}

function planSponsorshipOffer(s0: GameState): GameState {
  const offers = (s0.sponsorshipOffers || []).map((offer) =>
    offer.status === 'offered' && s0.day > offer.expiresDay ? { ...offer, status: 'expired' as const } : offer);
  const state = offers.length === (s0.sponsorshipOffers || []).length && offers.every((offer, i) => offer === (s0.sponsorshipOffers || [])[i])
    ? s0 : { ...s0, sponsorshipOffers: offers };
  const pending = offers.some((offer) => offer.status === 'offered' && state.day <= offer.expiresDay);
  if (pending || state.day % 7 !== 4 || (state.lastSponsorshipDay !== undefined && state.day - state.lastSponsorshipDay < 14)) return state;
  const followers = Math.max(0, state.followers || 0);
  const tier = followers >= 500_000 ? 4 : followers >= 100_000 ? 3 : followers >= 25_000 ? 2 : followers >= 5_000 ? 1 : followers >= 1_000 ? 0 : -1;
  if (tier < 0 || Math.random() > 0.68) return state;
  const bands = [
    { threshold: 1_000, sponsor: 'Lagos Style Collective', min: 15_000, max: 60_000, followers: 40 },
    { threshold: 5_000, sponsor: 'Naija Fashion Market', min: 50_000, max: 200_000, followers: 120 },
    { threshold: 25_000, sponsor: 'StyleHouse Media', min: 250_000, max: 900_000, followers: 350 },
    { threshold: 100_000, sponsor: 'Luxe Africa Campaigns', min: 1_000_000, max: 4_000_000, followers: 1_200 },
    { threshold: 500_000, sponsor: 'National Fashion Awards', min: 8_000_000, max: 25_000_000, followers: 8_000 },
  ];
  const band = bands[tier];
  const power = getBrandMetrics(state);
  const engagement = clamp((power.awareness * 0.25 + power.loyalty * 0.5 + power.reliability * 0.25) / 75, 0.65, 1.35);
  const offer: SponsorshipOffer = {
    id: 'sponsor-' + state.day + '-' + Math.random().toString(36).slice(2, 8),
    sponsor: band.sponsor,
    day: state.day,
    expiresDay: state.day + 3,
    followersRequired: band.threshold,
    payout: Math.round((band.min + Math.random() * (band.max - band.min)) * engagement / 5000) * 5000,
    bonusFollowers: Math.round(band.followers * engagement),
    status: 'offered',
  };
  const id = (state.msgSeq || 0) + 1;
  const message: Message = {
    id, day: state.day, from: offer.sponsor,
    text: 'Your audience is growing. We would like to sponsor a Gidigram campaign for Asanwa Boutique. We can pay ' + naira(offer.payout) + ' for a branded fashion post, with an extra audience boost if you accept. This offer expires after Day ' + offer.expiresDay + '.',
    tone: 'good', t: -1,
    choices: [{ id: 'accept', label: 'Accept sponsorship' }, { id: 'decline', label: 'Decline offer' }],
    ctx: { kind: 'sponsorship', offerId: offer.id },
  };
  return {
    ...state, msgSeq: id, messages: [message, ...(state.messages || [])].slice(0, 160),
    sponsorshipOffers: [...offers, offer].slice(-40), lastSponsorshipDay: state.day,
  };
}

function answerSponsorship(s0: GameState, message: Message, choice: ReplyChoice['id']): GameState {
  const offerId = message.ctx?.offerId;
  const offer = (s0.sponsorshipOffers || []).find((item) => item.id === offerId);
  if (!offer || offer.status !== 'offered') return s0;
  let s: GameState = { ...s0, messages: s0.messages.map((item) => item.id === message.id ? { ...item, answered: choice } : item) };
  if (s.day > offer.expiresDay) {
    s = { ...s, sponsorshipOffers: (s.sponsorshipOffers || []).map((item) => item.id === offer.id ? { ...item, status: 'expired' as const } : item) };
    return msg(s, offer.sponsor, 'That campaign offer has expired. We may contact you again when your audience grows.', 'warn');
  }
  if (choice !== 'accept') {
    s = { ...s, sponsorshipOffers: (s.sponsorshipOffers || []).map((item) => item.id === offer.id ? { ...item, status: 'declined' as const } : item) };
    return msg(s, offer.sponsor, 'No worries. Thank you for considering the offer; we will keep Asanwa Boutique on our list for future campaigns.', 'info');
  }
  s = money(s, offer.payout, 'Sponsored campaign: ' + offer.sponsor);
  const brand = getBrandMetrics(s);
  s = {
    ...s,
    followers: (s.followers || 0) + offer.bonusFollowers,
    brand: { ...brand, awareness: clamp(brand.awareness + 1.2, 5, 100), trendInfluence: clamp(brand.trendInfluence + 0.8, 5, 100) },
    today: { ...s.today, income: s.today.income + offer.payout, events: [...s.today.events, 'Sponsored campaign from ' + offer.sponsor + ' earned ' + naira(offer.payout) + '.'] },
    sponsorshipOffers: (s.sponsorshipOffers || []).map((item) => item.id === offer.id ? { ...item, status: 'accepted' as const } : item),
  };
  s = { ...s, gist: [{ id: 'sponsor-gist-' + offer.id, day: s.day, title: 'Asanwa Boutique lands a sponsored campaign', body: offer.sponsor + ' paid ' + naira(offer.payout) + ' for a Gidigram campaign. Divine gained ' + offer.bonusFollowers + ' followers.', about: 'you', hot: false }, ...(s.gist || [])].slice(0, 40) };
  return refreshEveningHistory(msg(s, offer.sponsor, 'The partnership is confirmed. Your payment is on its way, and we have shared your campaign with our fashion audience.', 'good'));
}

/** A reply picked in WhatsApp. */
export function answerMessage(s: GameState, msgId: number, choice: ReplyChoice['id']): GameState {
  const m = s.messages.find((x) => x.id === msgId);
  if (!m) return s;
  if (m.ctx?.kind === 'invite') return answerInvite(s, m, choice);
  if (m.ctx?.kind === 'sponsorship') return answerSponsorship(s, m, choice);
  if (m.convo) return answerConvo(s, msgId, choice);
  return answerRival(s, msgId, choice);
}

export { answerVisit, buyDrop, contestFor, noteVisit, rivalShop, VISIT_CHOICES } from './encounters';

function payRent(s: GameState): GameState {
  const rent = s.listing.rent;
  const bank = s.bank || initialBankState();
  const vaultUse = Math.min(Math.max(0, bank.rentVault), rent);
  const currentDue = rent - vaultUse;
  const bankAfterVault = { ...bank, rentVault: bank.rentVault - vaultUse };
  if (s.cash >= currentDue && !s.lateRent) {
    let paid: GameState = { ...s, bank: bankAfterVault, today: { ...s.today, costs: s.today.costs + rent, events: [...s.today.events, `Paid ${naira(rent)} rent${vaultUse ? ` (${naira(vaultUse)} from Rent Vault)` : ''}.`] } };
    if (currentDue) paid = money(paid, -currentDue, 'Rent');
    return msg(paid, 'Landlord', `Rent of ${naira(rent)} received. See you next week.`, 'info');
  }
  // Apply the Rent Vault balance first even when the current account is short;
  // the remaining amount follows the game's existing late-rent/grace rules.
  const remainingAfterVault = Math.max(0, rent - vaultUse);
  const due = s.day + s.grace;
  let next: GameState = { ...s, bank: bankAfterVault, lateRent: { amount: remainingAfterVault, due }, today: { ...s.today, costs: s.today.costs + rent, events: [...s.today.events, `Rent obligation ${naira(rent)}; Rent Vault covered ${naira(vaultUse)}.`] } };
  if (s.cash >= remainingAfterVault && s.cash > 0) {
    next = money({ ...next, lateRent: null }, -remainingAfterVault, 'Rent');
    return msg(next, 'Landlord', `Rent of ${naira(rent)} received from the Rent Vault and current account.`, 'info');
  }
  next = money(next, -remainingAfterVault, 'Rent (late)');
  return msg(next, 'Landlord', s.grace === 0
    ? 'You are short on rent and I do not give grace. Clear it today or you move out.'
    : `You are short on rent by ${naira(Math.max(0, remainingAfterVault - s.cash))}. I'm giving you ${s.grace} day${s.grace > 1 ? 's' : ''}. If it's not paid by day ${due}, you move to a smaller shop.`, 'danger');
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
  next = reactToMove(next, false);
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

export function moveTo(s0: GameState, l0: Listing): GameState {
  const fight = contestFor(s0, l0);
  const l = fight ? { ...l0, moveIn: l0.moveIn + fight.extra } : l0;
  if ((l.tier !== s0.tier + 1 && !(l.signature && l.tier === s0.tier && !s0.listing.signature)) || s0.cash < l.moveIn) return s0;
  const s = fight ? wonListing(s0, l0) : s0;
  const tier = l.tier;
  const t = TIERS[tier];
  const furniture = autoPlace(s.furniture.filter((f) => furnitureById(f.id).mount !== 'finish'), l);
  let next: GameState = money({ ...s, tier, listing: l, furniture, movedDay: s.day, grace: l.grace }, -l.moveIn, `Move-in: ${l.street}`);
  next = msg(next, 'Deborah', `We moved! Welcome to your ${t.name} on ${l.street}, ${l.area}. Rent is ${naira(l.rent)} a week and the landlord is ${l.landlord}. The shop holds up to ${t.slots} designs, so buy rails and shelves to fill it. It will be quiet for two weeks while people find us.`, 'good');
  next = reactToMove(next, !fight);
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
  if (f.mount === 'yard') {
    if (yardUsed(furniture) >= yardCapacity(s.listing)) return s;
    if (f.solar && furniture.filter((p) => furnitureById(p.id).solar).length >= POWER_CFG.maxPanels) return s;
    const previousActive = activeGeneratorUid(s);
    const knownFuel = { ...(s.power?.generatorFuel || {}) };
    if (previousActive && knownFuel[previousActive] === undefined) knownFuel[previousActive] = fuelOf(s, previousActive);
    const next = money({ ...s, power: { ...s.power, generatorFuel: knownFuel }, furniture: [...furniture, { ...item, placed: true, x: yardUsed(furniture) }] }, -f.price, f.name);
    if (f.solar) return { ...next, power: { ...next.power, solar: (next.power?.solar || 0) + POWER_CFG.minutesPerPanel } };
    if (!f.gen) return next;
    // Every generator starts with its own 5-litre reserve.
    const generatorFuel = { ...(next.power?.generatorFuel || {}), [item.uid]: 5 };
    const primary = activeGeneratorUid({ ...next, power: { ...next.power, generatorFuel } });
    return { ...next, power: { ...next.power, generatorFuel, fuel: primary ? (generatorFuel[primary] ?? next.power.fuel ?? 0) : next.power.fuel } };
  }
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

/** Hire a dedicated guard. A security post must be purchased and placed first. */
export function hireSecurityGuard(s: GameState): GameState {
  const post = s.furniture.find((p) => p.placed && p.id === 'securityPost');
  if (!post) return addShout(s, 'Security', 'Buy and place a small security post outside before hiring a guard.', 'warn');
  if (s.security?.guard) return s;
  const signing = 35_000;
  if (s.cash < signing) return addShout(s, 'Security', `You need ${naira(signing)} to hire a guard.`, 'warn');
  const guard = { id: `guard-${s.day}-${Math.random().toString(36).slice(2, 7)}`, name: ['Tunde', 'Chuka', 'Bashir', 'Emeka', 'Seyi'][Math.floor(Math.random() * 5)], wage: 18_000, look: generateRandomCustomer('styled') };
  let next = money({ ...s, today: { ...s.today, costs: s.today.costs + signing }, security: { ...(s.security || {}), guard, postUid: post.uid, gallons: s.security?.gallons || [] } }, -signing, 'Security guard signing fee');
  next = msg(next, 'Security', `${guard.name} has been hired. Weekly pay is ${naira(guard.wage)}. I will stay at the post and protect the shop.`, 'good');
  return next;
}

/** Buy fuel now; the courier trip happens in game time and can optionally refill a selected generator. */
export function startFuelTrip(s: GameState, litres: number, refillUid?: string): GameState {
  if (![5, 10, 20].includes(litres)) return s;
  if (s.security?.trip) return addShout(s, 'Security', 'A fuel trip is already in progress.', 'warn');
  const gen = refillUid ? s.furniture.find((p) => p.uid === refillUid && p.placed && !!furnitureById(p.id).gen) : undefined;
  if (refillUid && !gen) return addShout(s, 'Security', 'That generator is no longer available. Choose an installed generator.', 'warn');
  const cost = Math.round(litres * fuelPrice(s));
  if (s.cash < cost) return addShout(s, 'Security', `Fuel costs ${naira(cost)}. There is not enough cash for this trip.`, 'warn');
  const post = s.furniture.find((p) => p.placed && p.id === 'securityPost');
  const guardOnDuty = !!s.security?.guard && !!post;
  const total = guardOnDuty ? 58 : 92;
  let next = money({ ...s, security: { ...(s.security || {}), postUid: post?.uid || s.security?.postUid, gallons: s.security?.gallons || [], trip: { remaining: total, total, litres, cost, refillUid, carrier: guardOnDuty ? 'guard' : 'divine' } } }, -cost, `Fuel purchase: ${litres} L`);
  next = { ...next, today: { ...next.today, fuel: (next.today.fuel || 0) + cost, litres: (next.today.litres || 0) + litres, costs: next.today.costs + cost } };
  return addShout(next, guardOnDuty ? s.security!.guard!.name : 'Divine', guardOnDuty ? `I'm going to buy ${litres} litres of fuel. I'll announce when I'm back.` : `I'm heading out to buy ${litres} litres of fuel. I'll be back after the trip.`, 'good');
}

/** Advance an errand using the in-game clock, including after-hours trips once time resumes. */
function securityStep(s0: GameState, minutes: number): GameState {
  const trip = s0.security?.trip;
  if (!trip || minutes <= 0) return s0;
  const remaining = Math.max(0, trip.remaining - minutes);
  if (remaining > 0) return { ...s0, security: { ...s0.security!, trip: { ...trip, remaining } } };
  let s: GameState = { ...s0, security: { ...s0.security!, trip: null, gallons: s0.security?.gallons || [] } };
  let gallonLeft = trip.litres;
  if (trip.refillUid) {
    const poured = pourFuel(s, trip.litres, trip.refillUid);
    s = poured.s;
    gallonLeft = poured.remaining;
  }
  const gallons = [...(s.security?.gallons || [])];
  if (gallonLeft > 0.05) gallons.push({ id: `fuel-${s.day}-${Math.random().toString(36).slice(2, 7)}`, litres: gallonLeft });
  s = { ...s, security: { ...(s.security || {}), trip: null, gallons } };
  const who = trip.carrier === 'guard' ? s.security?.guard?.name || 'Security' : 'Divine';
  s = addShout(s, who, trip.refillUid && gallonLeft <= 0.05 ? 'I am back! I bought the fuel and filled the selected generator.' : `I am back! The ${Math.round(gallonLeft * 10) / 10} L gallon is here. Click it to refill a generator.`, 'good');
  return s;
}

/** Pour a delivered gallon into one selected generator without paying twice. */
export function pourSecurityGallon(s: GameState, gallonId: string, generatorUid: string): GameState {
  const gallon = (s.security?.gallons || []).find((g) => g.id === gallonId);
  if (!gallon) return s;
  const result = pourFuel(s, gallon.litres, generatorUid);
  if (result.used <= 0) return addShout(s, 'Generator', 'That generator has no room for more fuel. Choose another one.', 'warn');
  const gallons = (s.security?.gallons || []).filter((g) => g.id !== gallonId);
  if (result.remaining > 0.05) gallons.push({ ...gallon, litres: result.remaining });
  return { ...result.s, security: { ...(result.s.security || {}), gallons } };
}

/** Turn a piece 90 degrees where it stands (or the nearest spot it fits). */
export function rotateFurniture(s: GameState, uid: string): GameState {
  const p = s.furniture.find((f) => f.uid === uid);
  if (!p || !p.placed || furnitureById(p.id).mount !== 'floor') return s;
  const rot = turn(p.rot);
  for (const [dx, dz] of [[0, 0], [-1, 0], [0, -1], [-1, -1], [1, 0], [0, 1]]) {
    const cand: Placed = { ...p, rot, x: p.x + dx, z: p.z + dz };
    if (canPlace(s.furniture, s.listing, cand)) return { ...s, furniture: s.furniture.map((f) => (f.uid === uid ? cand : f)) };
  }
  return s;
}

export function placeFurniture(s: GameState, uid: string, x: number, z: number, rot: Rot): GameState {
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
  if (f.mount === 'yard') {
    if (yardUsed(s.furniture.filter((x) => x.placed)) >= yardCapacity(s.listing)) return s;
    return { ...s, furniture: s.furniture.map((x) => (x.uid === uid ? { ...x, placed: true } : x)) };
  }
  const spot = autoPlace([...s.furniture.filter((x) => x.placed), { ...p }], s.listing).find((x) => x.uid === uid)!;
  if (!spot.placed) return s;
  return { ...s, furniture: s.furniture.map((x) => (x.uid === uid ? spot : x)) };
}

export function storeFurniture(s0: GameState, uid: string): GameState {
  const p = s0.furniture.find((f) => f.uid === uid);
  const s = p && furnitureById(p.id).gen ? { ...s0, power: { ...s0.power, gen: false } } : s0;
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
/** Display space is per product/style, not per colourway. Old saves remain compatible. */
export const displayedCount = (s: GameState) => new Set(s.stock.filter((d) => d.displayed).map(productKey)).size;

export function buyDesign(s: GameState, d: ReturnType<typeof makeDesign>): GameState {
  const total = d.cost * d.pieces;
  if (s.cash < total) return s;
  const key = productKey(d);
  const existingVariants = s.stock.filter((x) => productKey(x) === key);
  // A new colour of an already-displayed design joins that rack slot; if the
  // parent style is stored, new colours remain in storage until the style is displayed.
  const free = existingVariants.length
    ? existingVariants.some((x) => x.displayed)
    : displayedCount(s) < displayCap(s);
  return money({ ...s, stock: [...s.stock, { ...d, displayed: free }] }, -total, `Stock: ${d.label} ×${d.pieces}`);
}

export function setDisplayed(s: GameState, uid: string, on: boolean): GameState {
  const target = s.stock.find((d) => d.uid === uid);
  if (!target) return s;
  const key = productKey(target);
  const alreadyDisplayed = s.stock.some((d) => productKey(d) === key && d.displayed);
  if (on && !alreadyDisplayed && displayedCount(s) >= displayCap(s)) return s;
  return { ...s, stock: s.stock.map((d) => (productKey(d) === key ? { ...d, displayed: on } : d)) };
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

/** Number of new rack styles a cart introduces; extra colours do not consume more display slots. */
export const cartNewDesigns = (s: GameState, lines: CartLine[]) => {
  const existing = new Set(s.stock.map(productKey));
  const added = new Set<string>();
  for (const line of lines) {
    const key = productKey({
      kind: line.kind, itemId: line.itemId, fabric: line.fabric || 'plain',
      color2: line.color2, pattern: line.pattern,
    });
    if (!existing.has(key)) added.add(key);
  }
  return added.size;
}

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
  const flowerWall = s.furniture.some((p) => p.placed && p.id === 'flowerWall');
  const gained = Math.max(5, Math.round((score - 60) * clsMult * (4 + Math.random() * 4) * fatigue * (1 + (s.followers || 0) / 6000) * (flowerWall ? 1.12 : 1)));
  const likes = Math.round(((s.followers || 0) + gained) * (0.08 + (score - 70) / 300) * (0.8 + Math.random() * 0.4) * (flowerWall ? 1.5 : 1));
  const post = { id: `p${s.day}-${Math.random().toString(36).slice(2, 7)}`, day: s.day, look, name: c.name, caption: pick(CAPTIONS), score, likes, gained };
  return { ...s, followers: (s.followers || 0) + gained, posts: [post, ...(s.posts || [])].slice(0, 24) };
}

// ---------------------------------------------------------------------------
// Chats
// ---------------------------------------------------------------------------
export function chats(s: GameState) {
  const by: Record<string, { from: string; last: Message; unread: number }> = {};
  for (const m of s.messages) {
    const k = thread(m);
    const c = (by[k] = by[k] || { from: k, last: m, unread: 0 });
    if (m.id > c.last.id) c.last = m;
    if (m.from !== 'You' && m.id > (s.read?.[k] || 0)) c.unread += 1;
  }
  return Object.values(by).sort((a, b) => b.last.id - a.last.id);
}
export const thread = (m: Message) => m.chat || m.from;
export const unreadCount = (s: GameState) => chats(s).reduce((a, c) => a + c.unread, 0);
export function markRead(s: GameState, from: string): GameState {
  const top = s.messages.filter((m) => thread(m) === from).reduce((a, m) => Math.max(a, m.id), 0);
  if ((s.read?.[from] || 0) >= top) return s;
  return { ...s, read: { ...(s.read || {}), [from]: top } };
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------
const STAFF_NAMES = ['Kemi', 'Blessing', 'Chidinma', 'Sola', 'Grace', 'Rukayat', 'Amarachi', 'Tosin', 'Ladi', 'Nneka', 'Bimpe', 'Jumoke', 'Ese', 'Rita', 'Seun', 'Uju'];

export interface Candidate { name: string; kind: 'trainee' | 'expert'; level: number; wage: number; signing: number; profession: StaffProfession }

export function candidates(s: GameState, profession: StaffProfession = 'stylist'): Candidate[] {
  const used = new Set(s.staff.map((x) => x.name));
  const free = STAFF_NAMES.filter((n) => !used.has(n));
  const seed = s.day * 31 + s.staff.length * 7;
  const a = free[seed % free.length];
  const b = free[(seed * 7 + 3) % free.length] === a ? free[(seed + 1) % free.length] : free[(seed * 7 + 3) % free.length];
  return [
    { name: a, kind: 'trainee', level: STAFF.traineeLevel, wage: STAFF.traineeWage, signing: STAFF.traineeWage * 0.5, profession },
    { name: b, kind: 'expert', level: STAFF.expertLevel, wage: STAFF.expertWage, signing: STAFF.expertWage * 2, profession },
  ];
}

export function canHire(s: GameState) {
  return TIERS[s.tier].staff > s.staff.length;
}

export function hire(s: GameState, c: Candidate): GameState {
  if (!canHire(s) || s.cash < c.signing) return s;
  const member: StaffMember = { id: `s${Date.now().toString(36)}`, name: c.name, level: c.level, wage: c.wage, loyalty: c.kind === 'trainee' ? 30 : 20, trained: c.kind === 'trainee', weeks: 0, profession: c.profession || 'stylist', look: { ...generateRandomCustomer('styled') } };
  return msg(money({ ...s, staff: [...s.staff, member], hireOkDay: s.day }, -c.signing, `Signing: ${c.name}`), c.name, c.profession === 'makeup' ? 'I specialise in makeup, ma. I will take care of the face clients.' : c.kind === 'trainee' ? 'Thank you for this chance, ma. I will learn fast!' : `I'm a stylist. Pay me well and I'll keep your customers looking good.`, 'good');
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
        const who = poacher(s);
        s = msg(s, 'Deborah', `${m.name} has left! ${who ? who.shop : 'Another boutique'} offered her ${naira(offer)} a week. You were paying ${naira(m.wage)}.`, 'danger');
        continue;
      }
      const who = poacher(s);
      s = msg(s, m.name, `${who ? `${who.owner} from ${who.shop}` : 'Another shop'} offered me ${naira(offer)} a week, but I'm staying with you.`, 'good');
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
function normaliseCharacterMemories(value: unknown, day: number): NonNullable<GameState['characterMemories']> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const clean: NonNullable<GameState['characterMemories']> = {};
  for (const [name, rawMemory] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
    if (!name.trim() || !rawMemory || typeof rawMemory !== 'object' || Array.isArray(rawMemory)) continue;
    const candidate = rawMemory as Partial<CharacterMemory>;
    const summary = typeof candidate.summary === 'string' ? candidate.summary.trim().slice(0, 500) : '';
    const notes = Array.isArray(candidate.notes)
      ? candidate.notes.filter((note): note is string => typeof note === 'string').map((note) => note.trim().slice(0, 160)).filter(Boolean).slice(-6)
      : [];
    if (!summary && notes.length === 0) continue;
    const updatedDay = typeof candidate.updatedDay === 'number' && Number.isFinite(candidate.updatedDay)
      ? Math.max(1, Math.floor(candidate.updatedDay))
      : Math.max(1, Math.floor(day || 1));
    clean[name.slice(0, 80)] = { summary, notes, updatedDay };
  }
  return clean;
}

function migrate(raw: GameState): GameState | null {
  type Old = Omit<GameState, 'version'> & { version: number; queue?: unknown; queueIndex?: unknown };
  let s = raw as unknown as Old;
  if (s.version === 5) {
    const current = s as GameState;
    return ensureBusinessState({
      ...current,
      characterMemories: normaliseCharacterMemories(current.characterMemories, current.day),
      collaborations: Array.isArray(current.collaborations) ? current.collaborations : [],
      version: 5,
    });
  }
  if (s.version === 4) {
    const current = s as unknown as GameState;
    const base = current.rivals
      ? { ...current, version: 5 as const, characterMemories: normaliseCharacterMemories(current.characterMemories, current.day), collaborations: Array.isArray(current.collaborations) ? current.collaborations : [] }
      : { ...current, version: 5 as const, characterMemories: normaliseCharacterMemories(current.characterMemories, current.day), collaborations: Array.isArray(current.collaborations) ? current.collaborations : [], ...rivalDefaults() };
    return ensureBusinessState(base as GameState);
  }
  if (s.version === 3) {
    const o = s as unknown as GameState & { blackout?: unknown };
    delete o.blackout;
    const midDay = o.phase === 'shop';
    const upgraded = {
      ...o, version: 5 as const, characterMemories: {}, collaborations: [], outages: [],
      power: { gen: false, solar: 0 }, shouts: [], shoutSeq: 0, ...rivalDefaults(),
      ...(midDay ? { ...freshDay, phase: 'morning' as const, today: emptyLog(o.day) } : {}),
    } as unknown as GameState;
    return ensureBusinessState(upgraded);
  }
  if (s.version === 1) {
    const listing = s.tier === 0 ? KIOSK_LISTING : { ...cheapestListing(s.tier, week(s.day)), rent: TIERS[s.tier].rent, stars: 2 };
    const base = STARTER_FURNITURE.map((f) => ({ ...f, uid: newUid() }));
    const rails = Array.from({ length: Math.max(0, Math.ceil((TIERS[s.tier].slots - 12) / 8)) }, () => ({ uid: newUid(), id: 'chromeRail', x: 0, z: 0, rot: 0 as const, placed: true }));
    s = { ...s, version: 2, listing, furniture: autoPlace([...base, ...rails], listing) } as Old;
  }
  if (s.version !== 2) return null;
  const messages = (s.messages || []).map((m, i) => ({ ...m, id: (s.messages || []).length - i }));
  const { queue: _q, queueIndex: _qi, ...rest } = s;
  void _q; void _qi;
  const midDay = s.phase === 'shop';
  const upgraded = {
    ...(rest as unknown as GameState),
    version: 5 as const,
    characterMemories: {},
    collaborations: [],
    ...freshDay,
    ...rivalDefaults(),
    power: { gen: false, solar: 0 },
    shoutSeq: 0,
    phase: midDay ? 'morning' as const : s.phase,
    today: midDay ? emptyLog(s.day) : s.today,
    ledger: [],
    followers: 120,
    posts: [],
    messages,
    msgSeq: messages.length,
    read: Object.fromEntries(messages.map((m) => [m.from, messages.length])),
  } as GameState;
  return ensureBusinessState(upgraded);
}
/** The save on this device from before accounts existed. */
export const LEGACY_KEY = KEY;
/** Each signed-in account keeps its own copy on the device too. */
export const keyFor = (uid?: string | null) => (uid ? `${KEY}:${uid}` : KEY);

export function save(s: GameState, key = KEY): GameState {
  const stamped = { ...s, savedAt: Date.now() };
  try {
    localStorage.setItem(key, JSON.stringify(stamped));
  } catch {
    /* storage can be full or blocked; the backup button and the cloud still work */
  }
  return stamped;
}
export function load(key = KEY): GameState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return migrate(s);
  } catch {
    return null;
  }
}
export function clearSave(key = KEY) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
/** A save brought in from elsewhere (the cloud, a backup): checked and upgraded. */
export function fromData(raw: unknown): GameState | null {
  const s = raw as GameState;
  if (!s || typeof s.day !== 'number' || !Array.isArray(s.stock)) return null;
  return migrate(s);
}

/** Money sent by an admin. Applied once, shown in the bank and as a message. */
export function adminGrant(s: GameState, g: { id: string; kind: 'add' | 'set'; amount: number; reason: string }): GameState {
  if ((s.appliedGrants || []).includes(g.id)) return s;
  const delta = Math.round(g.kind === 'set' ? g.amount - s.cash : g.amount);
  let next: GameState = { ...s, appliedGrants: [...(s.appliedGrants || []), g.id].slice(-100) };
  if (delta) next = money(next, delta, g.reason ? `Admin: ${g.reason}` : delta > 0 ? 'Admin top-up' : 'Admin deduction');
  return msg(next, 'Asanwa HQ', delta >= 0 ? `${naira(delta)} has been added to your account.${g.reason ? ` Note: ${g.reason}` : ''}` : `${naira(-delta)} has been taken from your account.${g.reason ? ` Note: ${g.reason}` : ''}`, delta >= 0 ? 'good' : 'warn');
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

// ---------------------------------------------------------------------------
// Build mode helpers
// ---------------------------------------------------------------------------
/** Could this floor piece stand here? */
export const canPlaceAt = (s: GameState, p: Placed) => canPlace(s.furniture, s.listing, p);
/** The first free spot for a piece that is not out yet. */
export function spotFor(s: GameState, uid: string): Placed | null {
  const p = s.furniture.find((x) => x.uid === uid);
  if (!p) return null;
  return findSpot(s.furniture.filter((x) => x.uid !== uid), s.listing, { ...p, placed: false }) || null;
}
/** "Tidy up" for the busy banner. */
export function actionLabel(s: GameState, b: { uid: string; action: string }) {
  const names: Record<string, string> = { tidy: 'tidying up', restock: 'restocking', selfie: 'taking a selfie', sit: 'resting', drink: 'drinking water', genStart: 'starting the gen', refuel5: 'pouring fuel', refuel10: 'pouring fuel', refuelFull: 'filling the tank', tiktok: 'filming a TikTok', practiseMakeup: 'practising makeup', practiseHair: 'practising a style', countMoney: 'counting money' };
  return names[b.action] || 'busy';
}

// ---------------------------------------------------------------------------
// Trying a piece before buying it
// ---------------------------------------------------------------------------
export const PREVIEW_UID = '__preview';

/**
 * The shop as it would look with this piece in it, for build mode's
 * "Buy / Cancel" step. Paint and flooring show on the walls and floor;
 * floor pieces sit where they would go (x, z, rot), others in their spot.
 */
export function withPreview(s: GameState, id: string, at?: { x: number; z: number; rot: Rot; yardSide?: 'left' | 'right' }): { view: GameState; ok: boolean; why?: string; x: number; z: number; rot: Rot } {
  const f = furnitureById(id);
  const base = { uid: PREVIEW_UID, id, x: 0, z: 0, rot: 0 as Rot, placed: true };
  let furniture = s.furniture;
  let item: Placed = base;
  let ok = true;
  let why: string | undefined;
  if (f.mount === 'floor') {
    if (at) item = { ...base, ...at };
    else item = findSpot(furniture, s.listing, { ...base, placed: false }) || { ...base, placed: true };
    ok = canPlace(furniture, s.listing, { ...item, placed: true });
    if (!ok) why = "Can't go here";
    item = { ...item, placed: false };
  } else if (f.mount === 'finish') {
    furniture = furniture.filter((p) => { const o = furnitureById(p.id); return o.mount !== 'finish' || (f.paint ? !o.paint : !o.floorTiles); });
  } else if (f.mount === 'wall') {
    ok = wallUsed(furniture) + f.w <= wallCapacity(s.listing);
    item = { ...base, x: wallUsed(furniture), placed: ok };
    if (!ok) why = 'No wall space left';
  } else if (f.mount === 'ceiling') {
    ok = ceilingUsed(furniture) < ceilingCapacity(s.listing);
    item = { ...base, placed: ok };
    if (!ok) why = 'No ceiling space left';
  } else if (f.mount === 'yard') {
    ok = yardUsed(furniture) < yardCapacity(s.listing) && !(f.solar && furniture.filter((p) => furnitureById(p.id).solar).length >= POWER_CFG.maxPanels);
    item = { ...base, placed: ok, x: yardUsed(furniture), yardSide: at?.yardSide || 'right' };
    if (!ok) why = 'The yard is full';
  }
  if (s.cash < f.price) { ok = false; why = `You need ${naira(f.price)}`; }
  if ((f.minTier || 0) > s.tier) { ok = false; why = `Needs a ${TIERS[f.minTier || 0].name}`; }
  return { view: { ...s, furniture: [...furniture, item] }, ok, why, x: item.x, z: item.z, rot: item.rot };
}

/** Buy the piece you were trying, where you put it. */
export function buyPreviewed(s: GameState, id: string, at?: { x: number; z: number; rot: Rot; yardSide?: 'left' | 'right' }): GameState {
  const before = new Set(s.furniture.map((p) => p.uid));
  let next = buyFurniture(s, id);
  if (next === s) return s;
  const fresh = next.furniture.find((p) => !before.has(p.uid));
  if (fresh && at && furnitureById(id).mount === 'floor') next = placeFurniture(next, fresh.uid, at.x, at.z, at.rot);
  if (fresh && at && furnitureById(id).mount === 'yard') next = { ...next, furniture: next.furniture.map((p) => p.uid === fresh.uid ? { ...p, yardSide: at.yardSide || (at.x < 0 ? 'left' : 'right') } : p) };
  return next;
}
