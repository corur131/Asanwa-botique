/**
 * Economy numbers, tuned with tools/economy-sim (300 games x 200 days, three player types).
 * Change them there first, re-run the simulation, then copy them here.
 */
import { CustomerClass } from './types';

export interface ShopTier {
  name: string;
  slots: number;          // designs on display
  rent: number;           // weekly
  moveIn: number;         // deposit + fit-out, paid once
  customers: number;      // base customers a day at 50 reputation
  mix: [number, number, number]; // poor, middle, rich
  staff: number;          // staff slots
  running: number;        // daily light, fuel and running costs
  luxury: boolean;        // can buy from luxury suppliers
  blurb: string;
}

export const TIERS: ShopTier[] = [
  { name: 'Kiosk', slots: 20, rent: 30_000, moveIn: 0, customers: 9, mix: [0.7, 0.27, 0.03], staff: 0, running: 1_500, luxury: false, blurb: 'A container kiosk on Herbert Macaulay Way, Yaba.' },
  { name: 'Small shop', slots: 30, rent: 120_000, moveIn: 100_000, customers: 12, mix: [0.55, 0.38, 0.07], staff: 0, running: 3_000, luxury: false, blurb: 'A proper shop in a Yaba plaza, with a fitting room.' },
  { name: 'Boutique', slots: 50, rent: 1_000_000, moveIn: 3_000_000, customers: 16, mix: [0.42, 0.46, 0.12], staff: 2, running: 12_000, luxury: true, blurb: 'A larger boutique with a dedicated styling area and luxury suppliers.' },
  { name: 'Big boutique', slots: 75, rent: 4_000_000, moveIn: 12_000_000, customers: 21, mix: [0.32, 0.5, 0.18], staff: 4, running: 35_000, luxury: true, blurb: 'A substantial multi-zone boutique on the Lagos Island fashion circuit.' },
  { name: 'Flagship', slots: 105, rent: 12_000_000, moveIn: 35_000_000, customers: 27, mix: [0.25, 0.5, 0.25], staff: 6, running: 80_000, luxury: true, blurb: 'A major flagship with premium shopping areas and celebrity clientele.' },
  { name: 'Luxury Maison', slots: 140, rent: 30_000_000, moveIn: 75_000_000, customers: 34, mix: [0.18, 0.46, 0.36], staff: 8, running: 160_000, luxury: true, blurb: 'A prestigious multi-room maison with private fitting and VIP consultation spaces.' },
  { name: 'Fashion Empire House', slots: 180, rent: 75_000_000, moveIn: 180_000_000, customers: 43, mix: [0.12, 0.43, 0.45], staff: 10, running: 350_000, luxury: true, blurb: 'An iconic fashion empire with grand showrooms, private suites and dedicated back-of-house rooms.' },
];

/** The shop is open 8am–8pm: 720 game minutes, one per real second. */
export const SHOP_MINUTES = 720;
/** How busy each hour is, 8am first. Lunch and after work are the rush. */
export const HOUR_WEIGHTS = [0.45, 0.7, 0.9, 1, 1.35, 1.25, 0.9, 0.85, 1.1, 1.45, 1.5, 0.75];
/** Base minutes a customer waits before walking out. One game minute is roughly one real second.
 * Longer windows give the player a fair chance to finish a look; heat and darkness can still
 * wear down patience, while seats, cooling, signature shops and regular-customer loyalty add more.
 */
export const PATIENCE: Record<CustomerClass, number> = { poor: 150, middle: 120, rich: 90 };
/** Minutes a staff member takes for one customer at a level. */
export const staffMinutes = (level: number) => Math.max(30, 90 - 6 * level);

export const START_CASH = 200_000;

/**
 * High-value celebrity orders represent a fulfilled premium commission, not just one garment's
 * sticker price. Reserve this share of the order receipt for external sourcing, priority tailoring,
 * fitting and delivery. This is an explicit operating cost, separate from the stock bought earlier.
 */
export const CELEBRITY_FULFILMENT_RATE = 0.45;
export const MARKUP = 1.35;
export const PIECES_PER_DESIGN = 1;
export const DIVINE_CAPACITY = 8;
export const STAFF_CAPACITY = 5;
export const NEW_SHOP_RAMP_DAYS = 14;
export const NEW_SHOP_START = 0.5;
export const SLOW_WEEK_CHANCE = 0.12;

export const SERVICE_FEE: Record<CustomerClass, number> = { poor: 2_000, middle: 5_000, rich: 15_000 };
export const SUPPLIES_SHARE = 0.35;
/** Retail purchase capacity. Rich retail customers use a weighted sampler inside this wider band. */
export const BUDGET: Record<CustomerClass, [number, number]> = {
  poor: [6_000, 18_000],
  middle: [20_000, 60_000],
  rich: [100_000, 5_000_000],
};

/** Customers who only want hair or makeup done. */
export const SERVICE_SHARE = { female: 0.22, male: 0.15 };
export const SERVICE_BUDGET: Record<CustomerClass, [number, number]> = {
  poor: [4_000, 9_000],
  middle: [9_000, 26_000],
  rich: [30_000, 90_000],
};

/** Wholesale cost multiplier by fabric. */
export const FABRIC_COST: Record<string, number> = {
  plain: 1, ankara: 1.1, lace: 1.6, asoOke: 1.5, adire: 1.2, george: 2, satin: 1.2, velvet: 1.4, chiffon: 1.1, sequin: 1.5, denim: 1, leather: 1.6,
};

/** Hair is installed by Divine; attachments and wigs are sold to the customer at the markup. */
export const HAIR_COST: Record<string, number> = {
  wig: 9_000, braids: 2_500, twists: 3_000, locs: 3_000, natural: 500, updo: 800, male: 300,
};

export const EARRING_PRICE: Record<string, number> = {
  none: 0, goldStuds: 1_000, huggies: 1_500, goldHoops: 2_000, bigHoops: 2_000, goldDrops: 2_000, pearls: 2_500, chandelier: 4_500, coralDrops: 6_000,
};

export const STAFF = {
  traineeWage: 12_000,
  expertWage: 60_000,
  traineeLevel: 2,
  expertLevel: 8,
  trainFee: (level: number) => 15_000 * level,
  raisePerLevel: 1.12,
  hireDelayDays: 7,
};

export const GRACE_OPTIONS = [0, 2, 7, 7, 14];

export const naira = (n: number) => `${n < 0 ? '-' : ''}₦${Math.abs(Math.round(n))?.toLocaleString('en-NG')}`;
