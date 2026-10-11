/**
 * Divine's day around the shop: her energy, the little jobs she can do with
 * each piece of furniture, switching appliances, and the weekly bills.
 *
 * - Energy runs 0..100. Styling costs energy (a full look more than a quick
 *   hair or makeup job); the day's heat wears her down slowly, less with a fan
 *   or AC running. Sitting down and a cup of water bring some back; a night's
 *   sleep fills her up.
 * - Below 30 she is tired: she walks slower and her looks lose 3 points.
 *   At 0 she can't style anyone until she rests.
 * - During opening hours every job takes shop time, and she can't style while
 *   she is busy. Before opening and after closing they take no time.
 */
import { naira } from './economy';
import { POWER, addShout, coolRunning, fuelOf, fuelPrice, liveStats, nepaOff, refuel, setGen, solarCap, tankSize } from './power';
import { furnitureById, roomOf, SWITCHABLE } from './shop';
import { CharacterConfig } from '../types/character';
import { Busy, GameState, Pose } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

export const ENERGY = { max: 100, tired: 30, fullLook: 10, service: 6, perMinute: 0.025 };
export const energyOf = (s: GameState) => clamp(s.energy ?? ENERGY.max, 0, ENERGY.max);
export const isTired = (s: GameState) => energyOf(s) < ENERGY.tired;
/** Somewhere to sit or a cup of water in the shop. */
export const canRest = (s: GameState) => s.furniture.some((p) => p.placed && (furnitureById(p.id)?.group === 'Seating' || p.id === 'waterDispenser'));
/** Too tired to style (unless there is nowhere at all to rest, then she pushes on). */
export const exhausted = (s: GameState) => energyOf(s) <= 0 && canRest(s);

function setEnergy(s: GameState, v: number): GameState {
  const before = energyOf(s);
  const e = clamp(v, 0, ENERGY.max);
  let next: GameState = { ...s, energy: Math.round(e * 10) / 10 };
  if (before >= ENERGY.tired && e < ENERGY.tired && !s.today.tiredWarned) {
    next = { ...next, today: { ...next.today, tiredWarned: true } };
    next = text(next, 'Deborah', 'Sis, sit down small. You don tire 😩 Sit on a chair or drink water before the next customer, your looks are not coming out as fine when you are this tired.', 'warn');
  }
  if (before > 0 && e <= 0) next = addShout(next, 'Deborah', "Divine, you can't style anybody like this. Sit down and drink water first!", 'warn');
  return next;
}
/** A WhatsApp message (pops up like a notification). */
function text(s: GameState, from: string, body: string, tone: 'info' | 'warn' | 'good' = 'info'): GameState {
  const id = (s.msgSeq || 0) + 1;
  const m = { id, day: s.day, from, text: body, tone, t: s.phase === 'shop' ? Math.floor(s.clock) : undefined };
  return { ...s, msgSeq: id, messages: [m, ...s.messages].slice(0, 120) };
}

export const spendEnergy = (s: GameState, n: number) => setEnergy(s, energyOf(s) - n);
export const gainEnergy = (s: GameState, n: number) => setEnergy(s, energyOf(s) + n);

/** The heat of the day wears her down; a fan or AC slows it. */
export function energyStep(s: GameState, minutes: number): GameState {
  if (s.phase !== 'shop' || minutes <= 0) return s;
  if (s.busy?.pose === 'sit') return s;
  const cool = coolRunning(s);
  const k = cool >= 0.4 ? 0.55 : cool > 0 ? 0.75 : 1.35;
  return setEnergy(s, energyOf(s) - ENERGY.perMinute * k * minutes);
}

/** Score changes from how Divine is doing today. */
export function divineBonus(s: GameState, hair: boolean, makeup: boolean): { bonus: number; notes: string[] } {
  const did = s.today.did || {};
  let bonus = 0;
  const notes: string[] = [];
  if (did.tidy) { bonus += 1; notes.push('Tidy shop +1'); }
  if (hair && did.hair) { bonus += 2; notes.push('Practised hair today +2'); }
  if (makeup && did.makeup) { bonus += 2; notes.push('Practised makeup today +2'); }
  if (isTired(s)) { bonus -= 3; notes.push('Divine is tired -3'); }
  return { bonus, notes };
}

// ---------------------------------------------------------------------------
// Things to do with each piece of furniture
// ---------------------------------------------------------------------------
export type ActionId =
  | 'tidy' | 'checkStock' | 'restock'
  | 'selfie' | 'fixLook'
  | 'sit' | 'drink'
  | 'switch'
  | 'genStart' | 'genStop' | 'refuel5' | 'refuel10' | 'refuelFull'
  | 'battery'
  | 'tiktok' | 'practiseMakeup' | 'practiseHair'
  | 'channel' | 'countMoney';

export interface Action {
  id: ActionId;
  label: string;
  /** Shop minutes it takes during opening hours. */
  minutes: number;
  pose: Pose;
  /** Why it can't be done right now. */
  blocked?: string;
  hint?: string;
}

const DISPLAY = new Set(['Display']);
const MAKEUP = new Set(['makeupStation', 'vanity', 'ringLight']);
const HAIR = new Set(['hairStation', 'salonChair', 'hoodDryer']);

const SELFIE_CAPTIONS = ['Shop owner energy ✨', 'Me, myself and my mirror 💅🏾', 'Who is this fine boss lady? 😌', 'Outfit of the day, styled by me', 'Come and shop with me today 🛍️', 'Lagos girl, Lagos shop 💯'];
const CHANNELS = ['Fashion TV', 'Africa Magic Yoruba', 'Nollywood classics', 'Super Eagles highlights', 'BBNaija live', 'Wazobia FM visuals', 'Cooking with Sisi Yemmie'];

/** What can be done with this placed piece right now. */
export function actionsFor(s: GameState, uid: string): Action[] {
  const p = s.furniture.find((x) => x.uid === uid);
  if (!p) return [];
  const f = furnitureById(p.id);
  if (!f) return [];
  const did = s.today.did || {};
  const out: Action[] = [];
  const open = s.phase === 'shop';
  if (DISPLAY.has(f.group) && f.slots) {
    out.push({ id: 'tidy', label: 'Tidy up', minutes: 15, pose: 'reach', hint: '+1 to every look today', blocked: did.tidy ? 'Already tidy today' : undefined });
    out.push({ id: 'checkStock', label: 'Check stock', minutes: 0, pose: 'stand' });
    out.push({ id: 'restock', label: 'Restock', minutes: 10, pose: 'reach' });
  }
  if (f.id === 'steamer') out.push({ id: 'tidy', label: 'Steam the clothes', minutes: 15, pose: 'work', hint: '+1 to every look today', blocked: did.tidy ? 'Already done today' : undefined });
  if (f.mirror) {
    out.push({ id: 'selfie', label: 'Take a selfie', minutes: 5, pose: 'phone', hint: 'Post to Gidigram', blocked: did.selfie ? 'One selfie a day' : undefined });
    out.push({ id: 'fixLook', label: 'Fix my look', minutes: 0, pose: 'stand' });
  }
  if (f.group === 'Seating') out.push({ id: 'sit', label: 'Sit and rest', minutes: 20, pose: 'sit', hint: '+30 energy', blocked: energyOf(s) >= ENERGY.max ? 'Divine is not tired' : undefined });
  if (f.id === 'waterDispenser') out.push({ id: 'drink', label: 'Drink water', minutes: 5, pose: 'drink', hint: '+12 energy', blocked: energyOf(s) >= ENERGY.max ? 'Not thirsty' : undefined });
  if (SWITCHABLE.has(f.id)) {
    const on = !s.off?.[uid];
    const what = f.id === 'speaker' ? (on ? 'Stop the music' : 'Play music') : f.id === 'tv' ? (on ? 'Switch off' : 'Switch on') : on ? 'Switch off' : 'Switch on';
    out.push({ id: 'switch', label: what, minutes: 0, pose: 'reach', hint: f.id === 'speaker' ? 'Music pulls in passers-by' : f.ac ? 'AC cools best but eats NEPA units' : f.cool ? 'Keeps customers and Divine cool' : undefined });
    if (f.id === 'tv' && on) out.push({ id: 'channel', label: 'Change channel', minutes: 0, pose: 'stand', hint: `On: ${CHANNELS[(s.channel || 0) % CHANNELS.length]}` });
  }
  if (f.gen) {
    const running = !!s.power?.gen;
    const fuel = fuelOf(s);
    if (running) out.push({ id: 'genStop', label: 'Stop the gen', minutes: 0, pose: 'reach' });
    else out.push({ id: 'genStart', label: 'Start the gen', minutes: 2, pose: 'reach', blocked: !open || !nepaOff(s) ? 'NEPA light is on' : fuel <= 0 ? 'No fuel' : undefined });
    const cap = tankSize(s);
    const price = fuelPrice(s);
    const room = cap - fuel;
    const tag = (l: number) => `${naira(Math.round(Math.min(l, room) * price))}`;
    out.push({ id: 'refuel5', label: 'Refuel 5 litres', minutes: 5, pose: 'work', hint: tag(5), blocked: room < 0.1 ? 'Tank is full' : undefined });
    out.push({ id: 'refuel10', label: 'Refuel 10 litres', minutes: 6, pose: 'work', hint: tag(10), blocked: room < 0.1 ? 'Tank is full' : undefined });
    out.push({ id: 'refuelFull', label: 'Fill the tank', minutes: 8, pose: 'work', hint: `${tag(room)} for ${Math.round(room * 10) / 10} L`, blocked: room < 0.1 ? 'Tank is full' : undefined });
  }
  if (f.solar) out.push({ id: 'battery', label: 'Check battery', minutes: 0, pose: 'stand' });
  if (MAKEUP.has(f.id)) {
    out.push({ id: 'tiktok', label: 'Film a TikTok', minutes: 20, pose: 'dance', hint: 'New followers', blocked: did.tiktok ? 'One TikTok a day' : undefined });
    out.push({ id: 'practiseMakeup', label: 'Practise makeup', minutes: 30, pose: 'work', hint: '+2 on makeup looks today', blocked: did.makeup ? 'Already practised today' : undefined });
  }
  if (HAIR.has(f.id)) out.push({ id: 'practiseHair', label: 'Practise a style', minutes: 30, pose: 'work', hint: '+2 on hair looks today', blocked: did.hair ? 'Already practised today' : undefined });
  if (f.id === 'jewelCounter') out.push({ id: 'countMoney', label: "Count today's money", minutes: 5, pose: 'count' });
  // jobs take time only while the shop is open
  return out.map((a) => ({ ...a, minutes: open ? a.minutes : 0 }));
}

const ENERGY_COST: Partial<Record<ActionId, number>> = { tidy: 3, restock: 2, selfie: 2, tiktok: 4, practiseMakeup: 4, practiseHair: 4, refuel5: 1, refuel10: 1, refuelFull: 1 };

/**
 * Divine does something with a piece of furniture. Returns the new state, and
 * what the UI should do next (open the Divine editor, the stock panel...).
 */
export function interact(s0: GameState, uid: string, id: ActionId): { s: GameState; ui?: 'fixLook' | 'checkStock' | 'restock' } {
  const a = actionsFor(s0, uid).find((x) => x.id === id);
  if (!a || a.blocked) return { s: s0 };
  if (s0.phase === 'shop' && (s0.serving || (s0.busy && s0.busy.until > s0.clock))) return { s: s0 };
  let s = s0;
  const did = { ...(s.today.did || {}) };
  const p = s.furniture.find((x) => x.uid === uid)!;
  const f = furnitureById(p.id);
  let ui: 'fixLook' | 'checkStock' | 'restock' | undefined;
  switch (id) {
    case 'tidy':
      did.tidy = true;
      s = addShout(s, 'Divine', f.id === 'steamer' ? 'Everything steamed and neat. +1 to looks today.' : 'Folded, hung and neat. +1 to looks today.', 'good');
      break;
    case 'checkStock':
      ui = 'checkStock';
      break;
    case 'restock':
      ui = 'restock';
      break;
    case 'selfie': {
      did.selfie = true;
      s = postSelfie(s, s.divine);
      break;
    }
    case 'fixLook':
      ui = 'fixLook';
      break;
    case 'sit':
      s = gainEnergy(s, 30);
      s = addShout(s, 'Divine', pick(['Ahh. My legs thank me.', 'Five minutes. Just five minutes.', 'Sitting down small...']), 'good');
      break;
    case 'drink':
      s = gainEnergy(s, 12);
      s = addShout(s, 'Divine', 'Cold water. Life is back.', 'good');
      break;
    case 'switch': {
      const off = { ...(s.off || {}) };
      if (off[uid]) delete off[uid];
      else off[uid] = true;
      s = { ...s, off };
      break;
    }
    case 'channel':
      s = { ...s, channel: ((s.channel || 0) + 1) % CHANNELS.length };
      s = addShout(s, 'TV', `Now showing: ${CHANNELS[s.channel! % CHANNELS.length]}`, 'good');
      break;
    case 'genStart':
      s = setGen(s, true);
      break;
    case 'genStop':
      s = setGen(s, false);
      break;
    case 'refuel5':
      s = refuel(s, 5);
      break;
    case 'refuel10':
      s = refuel(s, 10);
      break;
    case 'refuelFull':
      s = refuel(s, 'full');
      break;
    case 'battery': {
      const cap = solarCap(s);
      const left = s.power?.solar || 0;
      const pct = cap ? Math.round((left / cap) * 100) : 0;
      const st = liveStats(s);
      const acOn = st.coolAc > 0 && st.solarPanels >= POWER.acPanels;
      const mins = Math.round(left / (acOn ? 2 : 1));
      s = addShout(s, 'Solar', `Battery ${pct}%: about ${Math.floor(mins / 60)}h ${mins % 60}m if NEPA takes light${acOn ? ' (AC on)' : ''}.`, pct < 20 ? 'warn' : 'good');
      break;
    }
    case 'tiktok': {
      did.tiktok = true;
      const viral = Math.random() < 0.08;
      const gained = Math.round((40 + Math.random() * 110) * (1 + (s.followers || 0) / 8000) * (viral ? 5 : 1));
      s = { ...s, followers: (s.followers || 0) + gained };
      s = addShout(s, 'TikTok', viral ? `It went viral!!! +${gained} followers 🔥` : `Posted! +${gained} followers.`, 'good');
      break;
    }
    case 'practiseMakeup':
      did.makeup = true;
      s = addShout(s, 'Divine', 'Blending is getting smoother. +2 on makeup looks today.', 'good');
      break;
    case 'practiseHair':
      did.hair = true;
      s = addShout(s, 'Divine', 'That parting is sharp now. +2 on hair looks today.', 'good');
      break;
    case 'countMoney': {
      const t = s.today;
      s = addShout(s, 'Divine', `Today so far: ${naira(t.income + t.tips)} in, ${naira(t.costs)} out. ${t.served} served.`, 'good');
      break;
    }
  }
  s = { ...s, today: { ...s.today, did } };
  const cost = ENERGY_COST[id];
  if (cost) s = spendEnergy(s, cost);
  if (s.phase === 'shop' && a.minutes > 0) {
    const busy: Busy = { uid, action: id, pose: a.pose, until: s.clock + a.minutes };
    s = { ...s, busy };
  }
  return { s, ui };
}

/** Divine is in the middle of a job. */
export const busyNow = (s: GameState) => (s.phase === 'shop' && s.busy && s.busy.until > s.clock ? s.busy : null);

/** A selfie in the mirror, posted to Gidigram. */
export function postSelfie(s: GameState, look: CharacterConfig): GameState {
  const gained = Math.round((15 + Math.random() * 35) * (1 + (s.followers || 0) / 8000));
  const likes = Math.round(((s.followers || 0) + gained) * (0.1 + Math.random() * 0.06));
  const post = { id: `s${s.day}-${Math.random().toString(36).slice(2, 7)}`, day: s.day, look, name: 'Divine', caption: pick(SELFIE_CAPTIONS), score: 0, likes, gained };
  const next = { ...s, followers: (s.followers || 0) + gained, posts: [post, ...(s.posts || [])].slice(0, 24) };
  return addShout(next, 'Gidigram', `Selfie posted! ${likes} likes, +${gained} followers.`, 'good');
}

// ---------------------------------------------------------------------------
// Weekly bills, paid on Sunday with the rent
// ---------------------------------------------------------------------------
const LAWMA = [1_500, 2_500, 4_000, 6_000, 9_000];
const DUES = [2_000, 3_500, 6_000, 10_000, 15_000];
/** Market and estate dues are steeper on the Island. */
const AREA_DUES: Record<string, number> = { 'Victoria Island': 1.6, Ikoyi: 1.6, 'Lekki Phase 1': 1.4, Lekki: 1.3, 'Admiralty Way': 1.4, Ikeja: 1.15, Surulere: 1.05, Yaba: 1 };
const DATA = [3_500, 5_000, 8_000, 12_000, 18_000];

export interface Bill { label: string; amount: number }

export function weeklyBills(s: GameState): Bill[] {
  const kwh = Math.round(s.meter?.kwh || 0);
  const t = Math.min(4, s.tier);
  const size = roomOf(s.listing);
  const lawma = Math.round((LAWMA[t] * (0.8 + (size.w * size.d) / 60)) / 100) * 100;
  const area = s.listing.area || 'Yaba';
  return [
    { label: `NEPA electricity (${kwh} kWh)`, amount: Math.round(kwh * POWER.tariff) },
    { label: 'LAWMA waste collection', amount: lawma },
    { label: `${area} market association and security`, amount: Math.round((DUES[t] * (AREA_DUES[area] ?? 1.1)) / 100) * 100 },
    { label: 'Data, internet and POS charges', amount: DATA[t] },
  ];
}

export function payBills(s0: GameState): GameState {
  const bills = weeklyBills(s0);
  let s = s0;
  let total = 0;
  for (const b of bills) {
    if (!b.amount) continue;
    total += b.amount;
    const line = { day: s.day, t: -1, label: b.label, amount: -b.amount };
    s = { ...s, cash: s.cash - b.amount, ledger: [line, ...(s.ledger || [])].slice(0, 150) };
  }
  s = { ...s, meter: { kwh: 0 }, today: { ...s.today, costs: s.today.costs + total, events: [...s.today.events, `Paid ${naira(total)} in weekly bills.`] } };
  return text(s, 'Bills', `This week's bills:\n${bills.map((b) => `• ${b.label}: ${naira(b.amount)}`).join('\n')}\nTotal: ${naira(total)}. Paid from your account.`);
}
