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
import { furnitureById, liveItems, roomOf, shopStats } from './shop';
import { outdoorTemp } from './climate';
import { naira } from './economy';

/** The shop's stats with switched-off appliances left out. */
export const liveStats = (s: GameState) => shopStats(liveItems(s.furniture, s.off), s.tier, s.listing.stars);

export const POWER = {
  minutesPerPanel: 100,
  chargePerPanelPerMinute: 0.45,
  acPanels: 3,
  maxPanels: 8,
  /** Litres per hour at full rated load. */
  burn: { small: 1.2, big: 2.6, industrial: 5.5 } as const,
  /** Tank size in litres. */
  tank: { small: 10, big: 30, industrial: 80 } as const,
  /** Rated electrical output in kW. */
  capacityKw: { small: 0.8, big: 4.5, industrial: 14 } as const,
  /** Configurable in-game tariff options (₦/kWh). */
  tariffs: { residential: 225, commercial: 310, premium: 390 } as const,
  /** Default tariff for legacy saves. */
  tariff: 225,
  /** Typical open hours used for daily estimates. */
  openMinutesPerDay: 600,
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

/** UID of the generator used by the shop's existing on/off switch: the largest installed generator. */
export const activeGeneratorUid = (s: GameState) => s.furniture
  .filter((p) => p.placed && !!furnitureById(p.id).gen)
  .sort((a, b) => Number(furnitureById(b.id).gen === 'big') + Number(b.id === 'industrialGen') * 2 - Number(furnitureById(a.id).gen === 'big') - Number(a.id === 'industrialGen') * 2)[0]?.uid;

/** Tank size can be queried for one generator, or for the active generator. */
export const tankSize = (s: GameState, uid?: string) => {
  const piece = uid ? s.furniture.find((p) => p.uid === uid && p.placed) : undefined;
  const g = piece ? (piece.id === 'industrialGen' ? 'industrial' : furnitureById(piece.id).gen) : generatorKind(s);
  return g ? POWER.tank[g] : 0;
};
/** Litres in a particular tank. Old saves use power.fuel for their active generator. */
export const fuelOf = (s: GameState, uid?: string) => {
  const target = uid || activeGeneratorUid(s);
  const cap = tankSize(s, target);
  if (!cap) return 0;
  const stored = target ? s.power?.generatorFuel?.[target] : undefined;
  if (stored !== undefined) return Math.min(cap, Math.max(0, stored));
  if (!uid || target === activeGeneratorUid(s)) return Math.min(cap, Math.max(0, s.power?.fuel ?? cap));
  return 0;
};

/** Typical real-world running wattage for powered equipment. Unlisted stock/decor draws zero. */
export const EQUIPMENT_WATTS: Readonly<Record<string, number>> = {
  fan: 75, ceilingFan: 65, ac: 1500, standingAc: 2200,
  bareBulb: 60, tubeLight: 40, pendants: 45, trackLights: 120,
  ledStrip: 30, chandelier: 300, ringLight: 55, vanity: 45,
  neon: 80, shopSign: 100, displayWall: 90, speaker: 35,
  waterDispenser: 120, tv: 110, steamer: 1800, hoodDryer: 1200,
  salonChair: 250, rechargeableFan: 35,
};

/** Sum active powered equipment only; clothing and non-powered inventory never enter this calculation. */
export function equipmentLoadKw(items: readonly { id: string; uid?: string }[], off: Record<string, boolean> = {}): number {
  return items.reduce((sum, item) => sum + (item.uid && off[item.uid] ? 0 : (EQUIPMENT_WATTS[item.id] || 0) / 1000), 0);
}
export const kwhForLoad = (kw: number, minutes: number) => Math.max(0, kw) * Math.max(0, minutes) / 60;
export const tariffFor = (s: GameState) => {
  const tariff = s.power?.tariff;
  return typeof tariff === 'number' && Number.isFinite(tariff) && tariff > 0 ? tariff : POWER.tariff;
};
export const dailyEnergyKwh = (s: GameState) => kwhForLoad(loadKw(s), POWER.openMinutesPerDay);
export const dailyEnergyCost = (s: GameState) => Math.round(dailyEnergyKwh(s) * tariffFor(s));

/** Installed generator class, including the new commercial/industrial unit. */
export function generatorKind(s: GameState, uid?: string): 'small' | 'big' | 'industrial' | undefined {
  const piece = s.furniture.find((p) => p.placed && (uid ? p.uid === uid : p.uid === activeGeneratorUid(s)));
  if (!piece) return liveStats(s).gen || undefined;
  if (piece.id === 'industrialGen') return 'industrial';
  return furnitureById(piece.id).gen;
}
export const generatorCapacityKw = (s: GameState, uid?: string) => {
  const kind = generatorKind(s, uid);
  return kind ? POWER.capacityKw[kind] : 0;
};
export const generatorFuelBurnForLoad = (kind: 'small' | 'big' | 'industrial', demandKw: number) =>
  POWER.burn[kind] * (0.35 + 0.65 * Math.min(1, Math.max(0, demandKw) / POWER.capacityKw[kind]));
export const solarDrainMinutes = (minutes: number, demandKw: number, panels: number, acOn = false) =>
  Math.max(0, minutes) * Math.max(acOn ? 2 : 1, Math.max(1, demandKw / Math.max(0.35, panels * 0.35)));
export const solarChargeMinutes = (current: number, minutes: number, panels: number) =>
  Math.max(0, current) + Math.max(0, minutes) * POWER.chargePerPanelPerMinute * Math.max(0, panels);
export const loadExceedsCapacity = (demandKw: number, capacityKw: number) => demandKw > capacityKw + 0.001;
export const generatorOverloaded = (s: GameState) => !!s.power?.gen && loadExceedsCapacity(loadKw(s), generatorCapacityKw(s));

/** Electricity drawn right now, in kW. Baseline lighting scales with floor area and display capacity. */
export function loadKw(s: GameState): number {
  const st = liveStats(s);
  const slots = Math.max(0, st.display || 0);
  const room = (s.listing as any)?.w && (s.listing as any)?.d ? (s.listing as any).w * (s.listing as any).d : 30;
  const baseline = 0.08 + Math.min(0.8, room / 100 * 0.12) + Math.min(0.6, slots / 100 * 0.18) + Math.max(0, (s.tier || 0)) * 0.025;
  return baseline + equipmentLoadKw(liveItems(s.furniture, s.off).filter((p) => p.placed));
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
  if (s.power?.gen && st.gen && !loadExceedsCapacity(loadKw(s), generatorCapacityKw(s))) return 'gen';
  if (st.solarPanels && (s.power?.solar || 0) > 0 && !loadExceedsCapacity(loadKw(s), st.solarPanels * 0.35)) return 'solar';
  return 'none';
}

// ---------------------------------------------------------------------------
// Shop climate: indoor temperature from the weather, the crowd and the cooling.
// ---------------------------------------------------------------------------
/** Thermostat range for the ACs, °C. */
export const THERMOSTAT = { min: 16, max: 30, default: 24 } as const;
export const thermostatOf = (s: Pick<GameState, 'thermostat'>) => Math.max(THERMOSTAT.min, Math.min(THERMOSTAT.max, s.thermostat ?? THERMOSTAT.default));
export const setThermostat = (s: GameState, t: number): GameState => ({ ...s, thermostat: Math.max(THERMOSTAT.min, Math.min(THERMOSTAT.max, Math.round(t))) });

/** Most an AC system can pull a shop below its uncooled temperature, at full capacity. */
const AC_MAX_PULL = 13;

const areaCache = new Map<string, number>();
/** Shop floor area in m² (one grid cell is one square metre). */
export function shopArea(s: Pick<GameState, 'listing'>): number {
  const key = `${s.listing.tier}|${s.listing.stars}|${s.listing.signature ? 1 : 0}`;
  let a = areaCache.get(key);
  if (a === undefined) {
    const r = roomOf(s.listing);
    a = Math.max(6, r.w * r.d);
    areaCache.set(key, a);
  }
  return a;
}

export type ComfortStatus = 'cold' | 'cool' | 'comfy' | 'warm' | 'hot';
export interface ShopClimate {
  outdoor: number;
  /** Air temperature inside. */
  indoor: number;
  /** What it feels like with fans blowing. */
  feels: number;
  area: number;
  /** m² the running ACs / fans can handle. */
  acArea: number;
  fanArea: number;
  /** m² the installed ACs could handle if they were all running. */
  acInstalled: number;
  setpoint: number;
  /** 0..1: how hard the ACs are working. */
  acDuty: number;
  /** True when the running ACs are too small to reach the thermostat. */
  acStruggling: boolean;
  status: ComfortStatus;
}

/** Which cooling pieces actually have power right now. */
function runningCooling(s: GameState): { acArea: number; fanArea: number } {
  const live = liveItems(s.furniture.filter((p) => p.placed), s.off).map((p) => furnitureById(p.id));
  const src = source(s);
  const st = liveStats(s);
  const acOk = src === 'grid' || (src === 'gen' && st.gen !== 'small') || (src === 'solar' && st.solarPanels >= POWER.acPanels);
  const fansOk = src !== 'none';
  let acArea = 0;
  let fanArea = 0;
  for (const f of live) {
    if (f.ac && acOk) acArea += f.coolArea || 0;
    if (!f.ac && f.fanArea) {
      if (fansOk) fanArea += f.fanArea;
      else if (f.id === 'rechargeableFan' && (s.power?.fanBattery || 0) > 0) fanArea += f.fanArea;
    }
  }
  return { acArea, fanArea };
}

export function shopClimate(s: GameState, clock = s.clock): ShopClimate {
  const outdoor = outdoorTemp(s.day, s.seed, clock, s.weather);
  const area = shopArea(s);
  // A closed building runs a little warmer than outside; bodies add heat in a small room.
  const people = s.inShop.length + s.staff.length + 1;
  const uncooled = outdoor + 1.5 + Math.min(3, (3 * people) / area);
  const setpoint = thermostatOf(s);
  const { acArea, fanArea } = runningCooling(s);
  const acInstalled = s.furniture.filter((p) => p.placed).reduce((a, p) => a + (furnitureById(p.id).ac ? furnitureById(p.id).coolArea || 0 : 0), 0);
  // Spare capacity cools harder, up to half again; too little can't keep up.
  const capacity = Math.min(1.5, acArea / area);
  const maxPull = AC_MAX_PULL * capacity;
  const needed = Math.max(0, uncooled - setpoint);
  const pull = Math.min(needed, maxPull);
  const indoor = uncooled - pull;
  // Moving air feels cooler, up to 3°C when the fans cover the whole floor.
  const feels = indoor - Math.min(3, 3 * (fanArea / area));
  const status: ComfortStatus = feels < 19 ? 'cold' : feels < 21.5 ? 'cool' : feels <= 26 ? 'comfy' : feels <= 28.5 ? 'warm' : 'hot';
  return {
    outdoor, indoor: Math.round(indoor * 10) / 10, feels: Math.round(feels * 10) / 10, area, acArea, fanArea, acInstalled, setpoint,
    acDuty: maxPull > 0 ? Math.min(1, needed / maxPull) : 0,
    acStruggling: acArea > 0 && needed > maxPull + 0.5,
    status,
  };
}

/**
 * How pleasant the shop feels, 0..0.6. Kept for patience, reputation and Divine's energy.
 * Comfortable is best; too hot is worst; an over-cold shop is unpleasant too.
 */
export function coolRunning(s: GameState): number {
  const { feels } = shopClimate(s);
  if (feels >= 30) return 0;
  if (feels > 25) return Math.round(0.6 * (30 - feels) / 5 * 100) / 100;
  if (feels >= 20) return 0.6;
  return Math.max(0.1, Math.round((0.6 - (20 - feels) * 0.15) * 100) / 100);
}

/** How fast waiting customers use up their patience. */
export function drainRate(s: GameState, cls: CustomerClass): number {
  const src = source(s);
  // Power cuts still make customers less comfortable, but should not erase
  // most of the longer patience window—especially for rich customers.
  if (src === 'none') return { poor: 1.15, middle: 1.35, rich: 1.6 }[cls];
  const { status } = shopClimate(s);
  let r = status === 'hot' ? { poor: 1.08, middle: 1.14, rich: 1.25 }[cls]
    : status === 'warm' ? { poor: 1.02, middle: 1.05, rich: 1.09 }[cls]
      : status === 'cold' ? { poor: 1.04, middle: 1.06, rich: 1.1 }[cls]
        : 1;
  if (src === 'solar') r *= 0.9; // cool, quiet, and they're impressed
  return r;
}

/** Litres an hour the generator burns. */
export const fuelPerHour = (s: GameState) => {
  const g = generatorKind(s);
  if (!g) return 0;
  const demand = loadKw(s);
  return generatorFuelBurnForLoad(g, demand);
};

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

export const COMPLAIN = {
  dark: ['Ah ah, madam, you no get gen?', 'Abeg on gen na, you wan roast person for here?', 'Light don go o! Where your solar?', 'How you wan do my makeup for this darkness?', 'Heat wan kill me for this shop o.', 'NEPA again! Abeg do something.'],
  darkRich: ["I can't sit in this heat. Do you not have a generator?", "It's dark and hot. I'm not staying long like this.", 'Is this how you treat clients? No light?'],
  hot: ['E hot for here o, you no get fan?', 'Abeg, heat dey this shop.', 'I dey sweat like Christmas goat.', 'Fan nko? This heat no be small.'],
  cold: ['Abeg reduce this AC, I dey shiver.', 'Na fridge una open for here?', 'Haba, this cold too much. Harmattan no do una?', 'My hand don freeze o, off that AC small.'],
  coldRich: ["It's freezing in here. Please turn the AC down.", 'Do you keep the shop this cold on purpose?', "I didn't come here to catch a cold."],
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
  const activeUid = activeGeneratorUid(s);
  const power = { ...s.power, gen: !!s.power?.gen, solar: s.power?.solar || 0, fuel: fuelOf(s), generatorFuel: { ...(s.power?.generatorFuel || {}) }, fanBattery: s.power?.fanBattery || 0 };
  const cap = st.solarPanels * POWER.minutesPerPanel;

  if (!wasOff && isOff) {
    s = addShout(s, 'NEPA', 'NEPA has taken light!', 'nepa');
    if (st.solarPanels && power.solar > 0) s = addShout(s, 'Solar', `Solar came on by itself: about ${Math.round(power.solar / (st.coolAc && st.solarPanels >= POWER.acPanels ? 2 : 1))} minutes of battery.`, 'good');
    else if (st.gen) s = addShout(s, 'Deborah', 'Sis, start the generator before the customers start shouting!', 'warn');
    else s = addShout(s, 'Deborah', 'No gen, no solar. Customers will start complaining, and the rich ones will leave.', 'warn');
  }
  if (wasOff && !isOff) {
    s = addShout(s, 'NEPA', 'Up NEPA! Light is back.', 'good');
    power.gen = false;
  }

  if (isOff) {
    s = { ...s, today: { ...s.today, outageMinutes: (s.today.outageMinutes || 0) + minutes } };
    if (power.gen && st.gen) {
      const g = generatorKind(s, activeUid);
      const rate = g ? generatorFuelBurnForLoad(g, loadKw(s)) : POWER.burn[st.gen];
      power.fuel = Math.max(0, power.fuel - (rate * minutes) / 60);
      if (activeUid) power.generatorFuel[activeUid] = power.fuel;
      if (power.fuel <= 0) {
        power.gen = false;
        s = addShout(s, 'Generator', 'Gen don off! Fuel finish 😩', 'warn');
      } else if (power.fuel < 1 && power.fuel + (POWER.burn[st.gen] * minutes) / 60 >= 1) s = addShout(s, 'Deborah', 'Sis, the gen is almost out of fuel. Refuel it!', 'warn');
    } else if (st.solarPanels && power.solar > 0) {
      const acOn = st.coolAc > 0 && st.solarPanels >= POWER.acPanels;
      const demandFactor = Math.max(1, loadKw(s) / Math.max(0.35, st.solarPanels * 0.35));
      power.solar = Math.max(0, power.solar - solarDrainMinutes(minutes, loadKw(s), st.solarPanels, acOn));
      if (power.solar <= 0) s = addShout(s, 'Solar', st.gen ? 'Solar battery is flat. Start the generator!' : 'Solar battery is flat. The shop is dark now.', 'warn');
    } else if (s.furniture.some((p) => p.placed && p.id === 'rechargeableFan') && power.fanBattery > 0) {
      power.fanBattery = Math.max(0, power.fanBattery - minutes);
      if (power.fanBattery <= 0) s = addShout(s, 'Fan', 'The rechargeable fan battery is flat. It will charge when NEPA returns.', 'warn');
    }
  } else {
    if (s.furniture.some((p) => p.placed && p.id === 'rechargeableFan')) power.fanBattery = Math.min(120, power.fanBattery + minutes * 0.5);
    if (st.solarPanels && to < 600) {
      // sunshine and light: the batteries charge
      power.solar = Math.min(cap, solarChargeMinutes(power.solar, minutes, st.solarPanels));
    }
    // on NEPA: the meter runs
    if (s.phase === 'shop') s = { ...s, meter: { kwh: (s.meter?.kwh || 0) + kwhForLoad(loadKw(s), minutes) } };
  }
  s = { ...s, power };

  // customers say what they feel
  const src = source(s, to);
  const comfort = shopClimate(s).status;
  const hot = comfort === 'hot';
  const cold = comfort === 'cold';
  const waiting = s.inShop.filter((v) => !v.by && !v.complained);
  for (const v of waiting) {
    let line: string | null = null;
    if (src === 'none' && Math.random() < 0.06 * minutes) line = pick(v.c.cls === 'rich' ? COMPLAIN.darkRich : COMPLAIN.dark);
    else if (src === 'solar' && Math.random() < 0.02 * minutes) line = pick(COMPLAIN.solar);
    else if (src !== 'none' && hot && Math.random() < 0.008 * minutes) line = pick(COMPLAIN.hot);
    else if (cold && Math.random() < 0.006 * minutes) line = pick(v.c.cls === 'rich' ? COMPLAIN.coldRich : COMPLAIN.cold);
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
  let next: GameState = { ...s, power: { ...s.power, gen: on, fuel: fuelOf(s), generatorFuel: { ...(s.power?.generatorFuel || {}), ...(activeGeneratorUid(s) ? { [activeGeneratorUid(s)!]: fuelOf(s) } : {}) } } };
  if (on) next = addShout(next, 'Generator', generatorKind(s) === 'small' ? 'Brrrrrm! The generator is on: lights and fans running.' : generatorKind(s) === 'industrial' ? 'Commercial generator online. High-load equipment is supported.' : 'The generator is on. Check the load meter: equipment demand above capacity will still lose power.', 'good');
  return next;
}

/** Pour purchased petrol into one generator (or the active one). */
export function refuel(s: GameState, litres: number | 'full', uid?: string): GameState {
  const target = uid || activeGeneratorUid(s);
  const cap = tankSize(s, target);
  if (!cap || !target) return s;
  const have = fuelOf(s, target);
  const price = fuelPrice(s);
  let l = Math.min(cap - have, litres === 'full' ? cap : litres);
  l = Math.min(l, Math.floor(Math.max(0, s.cash) / price));
  l = Math.floor(l * 10) / 10;
  if (l <= 0) return s;
  const cost = Math.round(l * price);
  const line = { day: s.day, t: s.phase === 'shop' ? Math.floor(s.clock) : -1, label: `Fuel: ${l} L at ${naira(price)}`, amount: -cost };
  const total = have + l;
  const primary = target === activeGeneratorUid(s);
  const next: GameState = {
    ...s,
    cash: s.cash - cost,
    ledger: [line, ...(s.ledger || [])].slice(0, 500),
    power: { ...s.power, fuel: primary ? total : s.power.fuel, generatorFuel: { ...(s.power?.generatorFuel || {}), [target]: total } },
    today: { ...s.today, fuel: (s.today.fuel || 0) + cost, litres: (s.today.litres || 0) + l, costs: s.today.costs + cost },
  };
  return addShout(next, 'Generator', `Poured ${l} litres into the selected generator. Tank: ${Math.round(total * 10) / 10} of ${cap} L.`, 'good');
}

/** Pour fuel from an already-paid physical gallon without charging twice. */
export function pourFuel(s: GameState, litres: number, uid: string): { s: GameState; used: number; remaining: number } {
  const cap = tankSize(s, uid);
  if (!cap) return { s, used: 0, remaining: Math.max(0, litres) };
  const have = fuelOf(s, uid);
  const used = Math.floor(Math.min(Math.max(0, cap - have), Math.max(0, litres)) * 10) / 10;
  if (used <= 0) return { s, used: 0, remaining: Math.max(0, litres) };
  const total = have + used;
  const primary = uid === activeGeneratorUid(s);
  const next: GameState = {
    ...s,
    power: { ...s.power, fuel: primary ? total : s.power.fuel, generatorFuel: { ...(s.power?.generatorFuel || {}), [uid]: total } },
  };
  return { s: addShout(next, 'Generator', `Poured ${used} L into the generator. Tank: ${Math.round(total * 10) / 10} of ${cap} L.`, 'good'), used, remaining: Math.max(0, Math.round((litres - used) * 10) / 10) };
}
