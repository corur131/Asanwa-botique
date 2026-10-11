/**
 * NEPA, solar and the generator.
 *
 * - Light goes at random: some days not at all, some days a few short cuts,
 *   some days for most of the day.
 * - Solar comes on by itself and runs until the battery is flat. Each panel
 *   stores about 100 minutes; AC on solar needs 3+ panels and drains twice as fast.
 *   Panels recharge while there is light during the day.
 * - A generator only runs when Divine switches it on, and burns fuel money.
 *   A small one runs lights and fans; a big one runs everything.
 * - With no power, waiting customers sweat and lose patience fast. Rich
 *   customers leave within minutes unless something is done.
 */
import { CustomerClass, GameState, Shout } from './types';
import { furnitureById, liveItems, shopStats } from './shop';
import { naira } from './economy';

/** The shop's stats with switched-off appliances left out. */
export const liveStats = (s: GameState) => shopStats(liveItems(s.furniture, s.off), s.tier, s.listing.stars);

export const POWER = {
  minutesPerPanel: 100,
  chargePerPanelPerMinute: 0.45,
  acPanels: 3,
  maxPanels: 8,
  /** Litres an hour. */
  burn: { small: 1.2, big: 2.6 } as const,
  /** Tank size in litres. */
  tank: { small: 10, big: 30 } as const,
  /** Naira per kWh from NEPA. */
  tariff: 225,
};

/** This week's petrol price per litre: it wobbles, and some weeks there is scarcity. */
export function fuelPrice(s: Pick<GameState, 'seed' | 'day'>): number {
  const wk = Math.floor((s.day - 1) / 7);
  const h = (n: number) => { const x = Math.sin((s.seed % 9973) * 0.137 + wk * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
  const base = 940 + h(1) * 200;
  return Math.round((scarcity(s) ? base * (1.55 + h(2) * 0.45) : base) / 10) * 10;
}
export function scarcity(s: Pick<GameState, 'seed' | 'day'>): boolean {
  const wk = Math.floor((s.day - 1) / 7);
  if (wk < 1) return false;
  const x = Math.sin((s.seed % 9973) * 0.311 + wk * 4.1414) * 24634.6345;
  return x - Math.floor(x) < 0.18;
}

export const tankSize = (s: GameState) => { const g = liveStats(s).gen; return g ? POWER.tank[g] : 0; };
/** Litres in the tank (old saves start full). */
export const fuelOf = (s: GameState) => Math.min(tankSize(s), s.power?.fuel ?? tankSize(s));

/** Electricity the shop pulls right now, in kW, if it is on NEPA. */
export function loadKw(s: GameState): number {
  let kw = 0.08;
  for (const p of liveItems(s.furniture, s.off)) {
    if (!p.placed) continue;
    const f = furnitureById(p.id);
    if (!f) continue;
    if (f.ac) kw += 1.4;
    else if (f.cool) kw += 0.07;
    else if (f.group === 'Lighting') kw += f.id === 'chandelier' ? 0.3 : 0.06;
    else if (f.id === 'tv') kw += 0.12;
    else if (['ringLight', 'vanity', 'neon', 'shopSign', 'displayWall', 'speaker', 'waterDispenser', 'steamer', 'hoodDryer', 'salonChair'].includes(f.id)) kw += f.id === 'hoodDryer' || f.id === 'salonChair' ? 0.25 : f.id === 'waterDispenser' ? 0.1 : 0.05;
  }
  return kw;
}

export type Source = 'grid' | 'solar' | 'gen' | 'none';

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Today's cuts. */
export function planOutages(day: number): { from: number; to: number }[] {
  if (day <= 1) return [];
  const r = Math.random();
  const n = r < 0.35 ? 0 : r < 0.75 ? 1 : r < 0.93 ? 2 : 3;
  const out: { from: number; to: number }[] = [];
  for (let i = 0; i < n; i++) {
    const k = Math.random();
    const len = k < 0.4 ? rand(15, 75) : k < 0.8 ? rand(120, 300) : rand(360, 900);
    // long cuts are often already on when the shop opens
    const from = k >= 0.8 && Math.random() < 0.5 ? -rand(0, 300) : rand(0, 690);
    out.push({ from: Math.round(from), to: Math.round(from + len) });
  }
  return out.sort((a, b) => a.from - b.from);
}

export const outageAt = (s: Pick<GameState, 'outages'>, t: number) => (s.outages || []).find((o) => t >= o.from && t < o.to);
export const nepaOff = (s: GameState, t = s.clock) => s.phase === 'shop' && !!outageAt(s, t);

export const solarCap = (s: GameState) => liveStats(s).solarPanels * POWER.minutesPerPanel;

/** Where the shop's power is coming from right now. */
export function source(s: GameState, t = s.clock): Source {
  if (!nepaOff(s, t)) return 'grid';
  const st = liveStats(s);
  if (s.power?.gen && st.gen) return 'gen';
  if (st.solarPanels && (s.power?.solar || 0) > 0) return 'solar';
  return 'none';
}

/** Cooling that is actually running. */
export function coolRunning(s: GameState): number {
  const st = liveStats(s);
  switch (source(s)) {
    case 'grid':
      return st.cool;
    case 'gen':
      return st.gen === 'big' ? st.cool : st.coolFans;
    case 'solar':
      return Math.min(0.8, st.coolFans + (st.solarPanels >= POWER.acPanels ? st.coolAc : 0));
    default:
      return 0;
  }
}

/** How fast waiting customers use up their patience. */
export function drainRate(s: GameState, cls: CustomerClass): number {
  const src = source(s);
  if (src === 'none') return { poor: 1.3, middle: 2, rich: 3 }[cls];
  const hot = coolRunning(s) <= 0;
  let r = hot ? { poor: 1.1, middle: 1.2, rich: 1.35 }[cls] : 1;
  if (s.weather === 'sunny' && hot) r *= 1.12;
  if (s.weather === 'rainy') r *= 0.9;
  if (s.weather === 'harmattan') r *= 0.94;
  if (src === 'solar') r *= 0.9; // cool, quiet, and they're impressed
  return r;
}

/** Litres an hour the generator burns. */
export const fuelPerHour = (s: GameState) => {
  const g = liveStats(s).gen;
  return g ? POWER.burn[g] : 0;
};

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

export const COMPLAIN = {
  dark: ['Ah ah, madam, you no get gen?', 'Abeg on gen na, you wan roast person for here?', 'Light don go o! Where your solar?', 'How you wan do my makeup for this darkness?', 'Heat wan kill me for this shop o.', 'NEPA again! Abeg do something.'],
  darkRich: ["I can't sit in this heat. Do you not have a generator?", "It's dark and hot. I'm not staying long like this.", 'Is this how you treat clients? No light?'],
  hot: ['E hot for here o, you no get fan?', 'Abeg, heat dey this shop.', 'I dey sweat like Christmas goat.', 'Fan nko? This heat no be small.'],
  solar: ['Ehen! You get solar. Una try.', 'At least it is cool in here.', 'NEPA took light and your shop is still bright? Nice.'],
};

export function addShout(s: GameState, who: string, text: string, tone: Shout['tone']): GameState {
  const id = (s.shoutSeq || 0) + 1;
  return { ...s, shoutSeq: id, shouts: [...(s.shouts || []), { id, who, text, tone }].slice(-8) };
}

/**
 * Runs the power side of one clock step: NEPA going and coming back, the
 * solar battery, the generator's fuel, and customers complaining.
 */
export function powerStep(s0: GameState, from: number, to: number): GameState {
  let s = s0;
  const st = liveStats(s);
  const minutes = to - from;
  const wasOff = !!outageAt(s, from);
  const isOff = !!outageAt(s, to);
  const power = { gen: !!s.power?.gen, solar: s.power?.solar || 0, fuel: fuelOf(s) };
  const cap = st.solarPanels * POWER.minutesPerPanel;

  if (!wasOff && isOff) {
    s = addShout(s, 'NEPA', 'NEPA has taken light!', 'nepa');
    if (st.solarPanels && power.solar > 0) s = addShout(s, 'Solar', `Solar came on by itself: about ${Math.round(power.solar / (st.coolAc && st.solarPanels >= POWER.acPanels ? 2 : 1))} minutes of battery.`, 'good');
    else if (st.gen) s = addShout(s, 'Deborah', 'Sis, start the generator before the customers start shouting!', 'warn');
    else s = addShout(s, 'Deborah', 'No gen, no solar. Customers will start complaining, and the rich ones will leave.', 'warn');
  }
  if (wasOff && !isOff) {
    s = addShout(s, 'NEPA', 'Up NEPA! Light is back.', 'good');
    playNepaSound();
    power.gen = false;
  }

  if (isOff) {
    s = { ...s, today: { ...s.today, outageMinutes: (s.today.outageMinutes || 0) + minutes } };
    if (power.gen && st.gen) {
      power.fuel = Math.max(0, power.fuel - (POWER.burn[st.gen] * minutes) / 60);
      if (power.fuel <= 0) {
        power.gen = false;
        s = addShout(s, 'Generator', 'Gen don off! Fuel finish 😩', 'warn');
      } else if (power.fuel < 1 && power.fuel + (POWER.burn[st.gen] * minutes) / 60 >= 1) s = addShout(s, 'Deborah', 'Sis, the gen is almost out of fuel. Refuel it!', 'warn');
    } else if (st.solarPanels && power.solar > 0) {
      const acOn = st.coolAc > 0 && st.solarPanels >= POWER.acPanels;
      power.solar = Math.max(0, power.solar - minutes * (acOn ? 2 : 1));
      if (power.solar <= 0) s = addShout(s, 'Solar', st.gen ? 'Solar battery is flat. Start the generator!' : 'Solar battery is flat. The shop is dark now.', 'warn');
    }
  } else {
    if (st.solarPanels && to < 600) {
      // sunshine and light: the batteries charge
      power.solar = Math.min(cap, power.solar + minutes * POWER.chargePerPanelPerMinute * st.solarPanels);
    }
    // on NEPA: the meter runs
    if (s.phase === 'shop') s = { ...s, meter: { kwh: (s.meter?.kwh || 0) + (loadKw(s) * minutes) / 60 } };
  }
  s = { ...s, power };

  // customers say what they feel
  const src = source(s, to);
  const hot = coolRunning(s) <= 0;
  const waiting = s.inShop.filter((v) => !v.by && !v.complained);
  for (const v of waiting) {
    let line: string | null = null;
    if (src === 'none' && Math.random() < 0.06 * minutes) line = pick(v.c.cls === 'rich' ? COMPLAIN.darkRich : COMPLAIN.dark);
    else if (src === 'solar' && Math.random() < 0.02 * minutes) line = pick(COMPLAIN.solar);
    else if (src === 'grid' && hot && Math.random() < 0.006 * minutes) line = pick(COMPLAIN.hot);
    if (line) {
      s = addShout(s, v.c.name, line, src === 'solar' ? 'good' : 'complain');
      s = { ...s, inShop: s.inShop.map((x) => (x.c.id === v.c.id ? { ...x, complained: true } : x)) };
    }
  }
  return s;
}

/** Switch the generator on or off. It only runs while NEPA is off. */
export function setGen(s: GameState, on: boolean): GameState {
  const st = liveStats(s);
  if (on && (!st.gen || !nepaOff(s))) return s;
  if (on && fuelOf(s) <= 0) return addShout(s, 'Generator', 'No fuel in the tank. Refuel the gen first.', 'warn');
  let next: GameState = { ...s, power: { ...s.power, gen: on, fuel: fuelOf(s) } };
  if (on) next = addShout(next, 'Generator', st.gen === 'small' ? 'Brrrrrm! The generator is on: lights and fans running.' : 'The generator is on: everything is running.', 'good');
  return next;
}

/** Pour petrol into the generator. 'full' fills the tank. Pays this week's price. */
export function refuel(s: GameState, litres: number | 'full'): GameState {
  const cap = tankSize(s);
  if (!cap) return s;
  const have = fuelOf(s);
  const price = fuelPrice(s);
  let l = Math.min(cap - have, litres === 'full' ? cap : litres);
  l = Math.min(l, Math.floor(Math.max(0, s.cash) / price));
  l = Math.floor(l * 10) / 10;
  if (l <= 0) return s;
  const cost = Math.round(l * price);
  const line = { day: s.day, t: s.phase === 'shop' ? Math.floor(s.clock) : -1, label: `Fuel: ${l} L at ${naira(price)}`, amount: -cost };
  const next: GameState = {
    ...s,
    cash: s.cash - cost,
    ledger: [line, ...(s.ledger || [])].slice(0, 150),
    power: { ...s.power, fuel: have + l },
    today: { ...s.today, fuel: (s.today.fuel || 0) + cost, litres: (s.today.litres || 0) + l, costs: s.today.costs + cost },
  };
  return addShout(next, 'Generator', `Poured ${l} litres. Tank: ${Math.round(have + l)} of ${cap} L.`, 'good');
}
