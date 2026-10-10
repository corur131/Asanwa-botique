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
  { name: 'Kiosk', slots: 12, rent: 30_000, moveIn: 0, customers: 5, mix: [0.7, 0.27, 0.03], staff: 0, running: 1_500, luxury: false, blurb: 'A container kiosk on Herbert Macaulay Way, Yaba.' },
  { name: 'Small shop', slots: 25, rent: 120_000, moveIn: 100_000, customers: 7, mix: [0.55, 0.38, 0.07], staff: 0, running: 3_000, luxury: false, blurb: 'A proper shop in a Yaba plaza, with a fitting room.' },
  { name: 'Boutique', slots: 45, rent: 330_000, moveIn: 500_000, customers: 10, mix: [0.42, 0.46, 0.12], staff: 2, running: 6_000, luxury: true, blurb: 'A bright boutique in Surulere with a big mirror wall.' },
  { name: 'Big boutique', slots: 70, rent: 600_000, moveIn: 3_000_000, customers: 14, mix: [0.32, 0.5, 0.18], staff: 4, running: 12_000, luxury: true, blurb: 'Two floors on Admiralty Way, Lekki.' },
  { name: 'Flagship', slots: 100, rent: 850_000, moveIn: 8_500_000, customers: 18, mix: [0.25, 0.5, 0.25], staff: 6, running: 25_000, luxury: true, blurb: 'The flagship store on Victoria Island. Celebrities come here.' },
];

export const START_CASH = 200_000;
export const MARKUP = 1.35;
export const PIECES_PER_DESIGN = 2;
export const DIVINE_CAPACITY = 8;
export const STAFF_CAPACITY = 5;
export const NEW_SHOP_RAMP_DAYS = 14;
export const NEW_SHOP_START = 0.5;
export const SLOW_WEEK_CHANCE = 0.12;

export const SERVICE_FEE: Record<CustomerClass, number> = { poor: 2_000, middle: 5_000, rich: 15_000 };
export const SUPPLIES_SHARE = 0.35;
export const BUDGET: Record<CustomerClass, [number, number]> = {
  poor: [6_000, 18_000],
  middle: [20_000, 60_000],
  rich: [100_000, 300_000],
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

export const naira = (n: number) => `${n < 0 ? '-' : ''}₦${Math.abs(Math.round(n)).toLocaleString('en-NG')}`;
