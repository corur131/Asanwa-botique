import { Occasion } from '../constants/catalog';
import { generateRandomCustomer } from '../utils/randomizer';
import { BUDGET, SERVICE_BUDGET, SERVICE_SHARE } from './economy';
import { WANTED_COLOURS } from './colours';
import { Customer, CustomerClass, GameState, PromotionLevel, Regular, Want } from './types';
import { shopStats } from './shop';

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const chance = (p: number) => Math.random() < p;

export const WOMEN = ['Adaeze', 'Funmilayo', 'Chiamaka', 'Aisha', 'Temitope', 'Ngozi', 'Bisola', 'Kemi', 'Halima', 'Ifeoma', 'Yetunde', 'Zainab', 'Omotola', 'Chioma', 'Damilola', 'Uche', 'Bukola', 'Amaka', 'Fatima', 'Toyin', 'Ebere', 'Simi', 'Ronke', 'Nkechi', 'Hauwa', 'Folake', 'Sade', 'Ijeoma', 'Mercy', 'Blessing', 'Precious', 'Joy', 'Esther', 'Ruth', 'Tolu', 'Adunni', 'Oluchi', 'Aminat', 'Ese', 'Ivie'];
export const MEN = ['Tunde', 'Chinedu', 'Emeka', 'Segun', 'Ibrahim', 'Femi', 'Obinna', 'Kunle', 'Musa', 'Dayo', 'Ikenna', 'Babatunde', 'Uchenna', 'Tobi', 'Yusuf', 'Kelechi', 'Wale', 'Ebuka', 'Gbenga', 'Osas'];

export const OCCASION_LABEL: Record<Occasion, string> = {
  owambe: 'Owambe party',
  wedding: 'Wedding',
  church: 'Church',
  office: 'Office',
  dateNight: 'Date night',
  birthday: 'Birthday',
  party: 'Night party',
  casual: 'Casual',
  brunch: 'Brunch',
  redCarpet: 'Red carpet',
};

const OCCASIONS: Record<CustomerClass, Occasion[]> = {
  poor: ['casual', 'church', 'owambe', 'birthday', 'office', 'casual', 'church'],
  middle: ['owambe', 'wedding', 'church', 'office', 'dateNight', 'birthday', 'party', 'brunch', 'casual'],
  rich: ['owambe', 'wedding', 'redCarpet', 'party', 'dateNight', 'birthday', 'wedding', 'owambe'],
};

const INTRO_F: Record<Occasion, string[]> = {
  owambe: ["My aunty's 60th birthday is this Saturday and the whole family will be there.", "We have owambe for my cousin's house-warming this weekend.", "My mum's friend is burying her father in style on Saturday. Big owambe."],
  wedding: ["My best friend's traditional wedding is next week and I'm in the aso-ebi crew.", "My brother is getting married on Saturday!", "I have a white wedding to attend in Ikoyi."],
  church: ["We have thanksgiving service on Sunday.", "It's our church anniversary this Sunday and I'm reading the Bible passage.", "Sunday service, but I want to look different this time."],
  office: ["I just got a new job at a bank in VI. First week is Monday.", "I have an interview with an oil company next week.", "My office has an end-of-month review and my oga will be there."],
  dateNight: ["My guy is taking me out on Friday night.", "First date with someone I met on Instagram. I'm nervous o.", "It's our anniversary dinner this weekend."],
  birthday: ["It's my birthday this weekend!", "My birthday shoot is on Saturday.", "My best friend's birthday dinner is tomorrow."],
  party: ["There's a big party on the Island this Friday.", "My friends are dragging me to a club in Lekki.", "Album listening party on Saturday."],
  casual: ["I just want something fine to wear around.", "I'm travelling to see my family and I want to look fresh.", "Just something for hangout with my friends."],
  brunch: ["Brunch with the girls in Lekki on Saturday.", "Sunday brunch at a new spot in VI.", "Girls' day out this weekend."],
  redCarpet: ["I'm walking the red carpet at an awards night.", "Movie premiere at Filmhouse IMAX. Cameras everywhere.", "I'm presenting at an awards show next week."],
};

const INTRO_M: Partial<Record<Occasion, string[]>> = {
  owambe: ["My father's 70th is this Saturday.", "Owambe for my uncle's chieftaincy title."],
  wedding: ["I'm the best man at my friend's wedding.", "My sister's traditional wedding is on Saturday."],
  church: ["Thanksgiving on Sunday, my wife wants me to look sharp.", "I'm ushering in church this Sunday."],
  office: ["I have a big presentation at work on Monday.", "Job interview next week."],
  dateNight: ["I'm taking a babe out on Friday.", "Anniversary dinner with my wife."],
  birthday: ["My birthday dinner is on Saturday.", "My guy's birthday party is this weekend."],
  party: ["We're going out on the Island on Friday.", "Club night in Lekki."],
  casual: ["I just want to look clean.", "Something for the weekend."],
  redCarpet: ["I'm on the red carpet at an awards night."],
  brunch: ["Brunch with my people in VI."],
};

const BUDGET_LINE: Record<CustomerClass, string[]> = {
  poor: ['I no get plenty money o, about {b} is what I have.', 'Abeg manage me, my budget is around {b}.', 'I can spend about {b}, no more.'],
  middle: ['My budget is about {b}.', 'I can do around {b}.', "I'm working with about {b}."],
  rich: ["Money isn't the problem, but I'm thinking around {b}.", 'Spend around {b}, just make me shine.', 'Budget is about {b}. Make it worth it.'],
};

function wantLine(w: Want, male: boolean): string {
  switch (w.kind) {
    case 'color': return pick([`I want ${w.name}.`, `Something ${w.name}, abeg.`, `${w.name[0].toUpperCase() + w.name.slice(1)} is my colour.`]);
    case 'native': return pick(['I want native.', 'Make it native, I want to rep my culture.', 'Native wear, please.']);
    case 'english': return pick(['No native this time, I want English wear.', 'I want English, something modern.']);
    case 'gele': return pick(['I must tie gele.', "And gele! It's not complete without gele."]);
    case 'nails': return pick(['Please make my nails pop too.', 'Fresh nails to match the outfit, please.', 'I need a proper nail colour for this look.']);
    case 'noHeels': return pick(['Please no heels, my legs no fit.', 'Flat shoes only, I go dance well well.']);
    case 'fitted': return pick(['Make it show my shape.', 'I want something that hugs my body.']);
    case 'covered': return pick(['Nothing too short or open.', 'Keep it decent please, nothing short.']);
    case 'jacket': return male ? 'Add a jacket.' : pick(['Add a jacket on top.', 'I want a jacket or something on top.']);
    case 'hair': if (w.group === 'male') return 'Make the cut sharp.'; return { wig: 'Install a fine wig for me.', braids: 'Do braids for me.', natural: 'I want my natural hair, styled.', updo: 'Pack my hair up.', twists: 'I want twists.', locs: 'I want locs.' }[w.group] || 'Do something with my hair.';
    case 'glam': return pick(['Full glam, I want to slay.', 'Beat my face well well.']);
    case 'naturalFace': return pick(['Light makeup only.', "Soft makeup, I don't like heavy face."]);
  }
}

function wantsFor(occasion: Occasion, male: boolean, cls: CustomerClass, wigs: boolean): Want[] {
  const pool: Want[] = [];
  const colour = pick(WANTED_COLOURS);
  pool.push({ kind: 'color', color: colour.color, name: colour.name });
  if (occasion === 'owambe' || occasion === 'wedding') {
    pool.push({ kind: 'native' }, { kind: 'native' });
    if (!male) pool.push({ kind: 'gele' }, { kind: 'gele' });
  } else if (occasion !== 'redCarpet') {
    pool.push({ kind: 'native' }, { kind: 'english' });
  }
  if (occasion === 'church' && !male) pool.push({ kind: 'covered' });
  if (!male) {
    if (['party', 'dateNight', 'birthday', 'redCarpet'].includes(occasion)) pool.push({ kind: 'fitted' }, { kind: 'glam' }, { kind: 'nails' });
    if (['owambe', 'wedding'].includes(occasion)) pool.push({ kind: 'noHeels' }, { kind: 'glam' });
    if (['church', 'office', 'casual', 'brunch'].includes(occasion)) pool.push({ kind: 'naturalFace' });
    pool.push({ kind: 'hair', group: pick(wigs ? ['wig', 'braids', 'natural', 'updo'] : ['braids', 'natural', 'updo', 'twists']) });
  }
  if (['office', 'dateNight', 'casual'].includes(occasion)) pool.push({ kind: 'jacket' });
  const n = cls === 'poor' ? (chance(0.5) ? 1 : 0) : chance(0.6) ? 2 : 1;
  const out: Want[] = [];
  while (out.length < n && pool.length) {
    const w = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    if (out.some((o) => o.kind === w.kind)) continue;
    if ((w.kind === 'native' && out.some((o) => o.kind === 'english')) || (w.kind === 'english' && out.some((o) => o.kind === 'native'))) continue;
    if ((w.kind === 'glam' && out.some((o) => o.kind === 'naturalFace')) || (w.kind === 'naturalFace' && out.some((o) => o.kind === 'glam'))) continue;
    if (w.kind === 'gele' && out.some((o) => o.kind === 'english')) continue;
    out.push(w);
  }
  return out;
}

function classFor(state: GameState, mix: [number, number, number]): CustomerClass {
  const shift = (state.rep - 50) / 500;
  const r = Math.random();
  if (r < mix[0] - shift) return 'poor';
  if (r < mix[0] + mix[1] - shift / 2) return 'middle';
  return 'rich';
}

const roundBudget = (b: number) => (b >= 100_000 ? Math.round(b / 10_000) * 10_000 : Math.round(b / 1_000) * 1_000);

const unitSample = (random: () => number) => {
  const value = random();
  return Number.isFinite(value) ? Math.max(0, Math.min(0.999999999, value)) : 0.5;
};
const roundToFiveThousand = (value: number) => Math.round(value / 5_000) * 5_000;

/**
 * Rich clothing shoppers receive budget distributions based on the shop tier.
 * These are spending capacities, not promises to spend the full amount.
 * Tier indexes 0–6 represent in-game Levels 1–7; service-only visitors keep SERVICE_BUDGET.
 */
type RichRetailBudgetBand = { readonly weight: number; readonly min: number; readonly max: number };
const BUDGET_BANDS = {
  entry: { min: 100_000, max: 500_000 },
  growing: { min: 500_000, max: 1_250_000 },
  premium: { min: 1_250_000, max: 2_500_000 },
  luxury: { min: 2_500_000, max: 4_000_000 },
  elite: { min: 4_000_000, max: 5_000_000 },
  maison: { min: 5_000_000, max: 7_500_000 },
  empire: { min: 7_500_000, max: 10_000_000 },
} as const;

const bands = (weights: readonly number[]): RichRetailBudgetBand[] => [
  ...(weights[0] ? [{ weight: weights[0], ...BUDGET_BANDS.entry }] : []),
  ...(weights[1] ? [{ weight: weights[1], ...BUDGET_BANDS.growing }] : []),
  ...(weights[2] ? [{ weight: weights[2], ...BUDGET_BANDS.premium }] : []),
  ...(weights[3] ? [{ weight: weights[3], ...BUDGET_BANDS.luxury }] : []),
  ...(weights[4] ? [{ weight: weights[4], ...BUDGET_BANDS.elite }] : []),
  ...(weights[5] ? [{ weight: weights[5], ...BUDGET_BANDS.maison }] : []),
  ...(weights[6] ? [{ weight: weights[6], ...BUDGET_BANDS.empire }] : []),
];

/** Ordinary-shop chances, ordered from Level 1 through Level 7. Every row totals 100%. */
export const RICH_RETAIL_BUDGET_BANDS_BY_TIER: readonly (readonly RichRetailBudgetBand[])[] = [
  bands([0.95, 0.05, 0, 0, 0, 0, 0]),
  bands([0.80, 0.18, 0.02, 0, 0, 0, 0]),
  bands([0.65, 0.22, 0.09, 0.035, 0.005, 0, 0]),
  bands([0.57, 0.22, 0.12, 0.07, 0.02, 0, 0]),
  bands([0.39, 0.24, 0.18, 0.12, 0.05, 0.02, 0]),
  bands([0.23, 0.23, 0.23, 0.18, 0.08, 0.03, 0.02]),
  bands([0.12, 0.18, 0.23, 0.22, 0.12, 0.08, 0.05]),
];

/** Signature customers skew wealthier than customers at an ordinary shop of the same tier. */
export const SIGNATURE_RICH_RETAIL_BUDGET_BANDS_BY_TIER: readonly (readonly RichRetailBudgetBand[])[] = [
  bands([0.85, 0.13, 0.02, 0, 0, 0, 0]),
  bands([0.68, 0.20, 0.10, 0.02, 0, 0, 0]),
  bands([0.53, 0.22, 0.13, 0.08, 0.04, 0, 0]),
  bands([0.45, 0.22, 0.16, 0.11, 0.06, 0, 0]),
  bands([0.28, 0.23, 0.22, 0.15, 0.07, 0.04, 0.01]),
  bands([0.15, 0.21, 0.25, 0.19, 0.09, 0.06, 0.05]),
  bands([0.10, 0.15, 0.22, 0.23, 0.14, 0.10, 0.06]),
];

/** Backward-compatible export: the original Level 3 baseline mix. */
export const RICH_RETAIL_BUDGET_BANDS = RICH_RETAIL_BUDGET_BANDS_BY_TIER[2];

export function richRetailBudget(
  random: () => number = Math.random,
  shopTierIndex = 2,
  signatureProperty = false,
): number {
  const tier = Math.max(0, Math.min(6, Math.floor(Number.isFinite(shopTierIndex) ? shopTierIndex : 2)));
  const bandsByTier = signatureProperty
    ? SIGNATURE_RICH_RETAIL_BUDGET_BANDS_BY_TIER
    : RICH_RETAIL_BUDGET_BANDS_BY_TIER;
  const selectedBands = bandsByTier[tier] || RICH_RETAIL_BUDGET_BANDS_BY_TIER[2];
  const roll = unitSample(random);
  let cumulative = 0;
  let band = selectedBands[selectedBands.length - 1];
  for (const candidate of selectedBands) {
    cumulative += candidate.weight;
    if (roll < cumulative) {
      band = candidate;
      break;
    }
  }
  const value = band.min + unitSample(random) * (band.max - band.min);
  return Math.max(band.min, Math.min(band.max, roundToFiveThousand(value)));
}

/**
 * Celebrity tiers are a separate five-level scale (0–4 internally, tiers 1–5 in-game).
 * Each lower tier tops out no more than ₦5m above the next tier's minimum.
 * Squared randomness favours attainable lower-end orders while retaining the rare upper end.
 */
/** Rank-based baseline spending capacity at a Flagship shop; venue prestige scales it further. */
export const CELEBRITY_SPEND_RANGES = [
  { min: 1_500_000, max: 12_000_000 },
  { min: 7_000_000, max: 25_000_000 },
  { min: 20_000_000, max: 45_000_000 },
  { min: 40_000_000, max: 90_000_000 },
  { min: 85_000_000, max: 250_000_000 },
] as const;

function lowWeightedAmount(min: number, max: number, random: () => number): number {
  const sample = unitSample(random);
  return Math.max(min, Math.min(max, roundToFiveThousand(min + (max - min) * sample * sample)));
}

/** Celebrity purchasing power reflects both their rank and the prestige of the shop hosting them. */
export function celebrityAmountsForTier(
  tier: number,
  random: () => number = Math.random,
  shopTierIndex = 4,
  signatureProperty = false,
): { budget: number; spendFloor: number } {
  const index = Math.max(0, Math.min(4, Math.floor(Number.isFinite(tier) ? tier : 0)));
  const shopTier = Math.max(0, Math.min(6, Math.floor(Number.isFinite(shopTierIndex) ? shopTierIndex : 4)));
  const venueMultiplier = [0.65, 0.72, 0.78, 0.90, 1.00, 1.15, 1.30][shopTier] * (signatureProperty ? 1.10 : 1);
  const baseline = CELEBRITY_SPEND_RANGES[index];
  const minimum = Math.round((baseline.min * venueMultiplier) / 5_000) * 5_000;
  const maximum = Math.max(minimum, Math.round((baseline.max * venueMultiplier) / 5_000) * 5_000);
  const budget = lowWeightedAmount(minimum, maximum, random);
  const spendFloor = lowWeightedAmount(minimum, budget, random);
  return { budget, spendFloor };
}

/** Zero-based shop tier index: a Level 3 shop (index 2) may attract celebrity tiers 1–3. */
export function maximumCelebrityTierForShop(shopTierIndex: number): number {
  if (!Number.isFinite(shopTierIndex) || shopTierIndex < 2) return -1;
  return Math.min(4, Math.floor(shopTierIndex));
}

/** Ordinary-shop candidate days per 14-day cycle; each is still a probability roll. */
export const CELEBRITY_DAYS_BY_SHOP_TIER: readonly (readonly number[])[] = [
  [],
  [],
  [2],
  [1, 9],
  [0, 5, 10],
  [0, 4, 8, 12],
  [0, 2, 4, 7, 9, 12],
];

/**
 * Signature properties earn extra celebrity opportunities per 14-day cycle:
 * 2 at Level 3, 4 at Level 4, 6 at Flagship, 8 at Luxury Maison, and 10 at Level 7.
 * The separate 1.5x visit probability still applies on each opportunity.
 */
export const SIGNATURE_CELEBRITY_DAYS_BY_SHOP_TIER: readonly (readonly number[])[] = [
  [],
  [],
  [2, 9],
  [1, 5, 9, 12],
  [0, 2, 5, 7, 9, 12],
  [0, 2, 4, 6, 8, 10, 12, 13],
  [0, 1, 3, 4, 6, 7, 9, 10, 12, 13],
];

export function celebrityIsScheduled(shopTierIndex: number, day: number, signatureProperty = false): boolean {
  if (!Number.isFinite(shopTierIndex) || shopTierIndex < 2) return false;
  const tier = Math.min(6, Math.floor(shopTierIndex));
  const daysByTier = signatureProperty ? SIGNATURE_CELEBRITY_DAYS_BY_SHOP_TIER : CELEBRITY_DAYS_BY_SHOP_TIER;
  const days = daysByTier[tier] || [];
  const fortnightDay = (Math.max(1, Math.floor(day)) - 1) % 14;
  return days.includes(fortnightDay);
}

/**
 * Shared brand profile used by the player, competitors and Deborah's advance tips.
 * Missing fields are backfilled from the game's legacy reputation/audience estimates.
 */
export interface CelebrityAttractionProfile {
  reputation?: number;
  followers?: number;
  shopTierIndex?: number;
  awareness?: number;
  prestige?: number;
  trendInfluence?: number;
  loyalty?: number;
  reliability?: number;
}

/** Follower bonuses are percentage points, with interpolation between the agreed milestones. */
const FOLLOWER_OPPORTUNITY_MILESTONES: readonly (readonly [number, number])[] = [
  [0, 0],
  [100_000, 2],
  [200_000, 2.5],
  [300_000, 3],
  [400_000, 3.5],
  [500_000, 4],
  [1_000_000, 6.5],
  [2_000_000, 11.5],
  [5_000_000, 26.5],
];

export function followerOpportunityBonus(followers: number): number {
  const audience = Math.max(0, Number.isFinite(followers) ? followers : 0);
  if (audience >= 5_000_000) {
    // No follower cap: each doubling after five million adds 12 percentage points.
    return 26.5 + 12 * Math.log2(audience / 5_000_000);
  }
  for (let i = 1; i < FOLLOWER_OPPORTUNITY_MILESTONES.length; i++) {
    const [upperFollowers, upperBonus] = FOLLOWER_OPPORTUNITY_MILESTONES[i];
    const [lowerFollowers, lowerBonus] = FOLLOWER_OPPORTUNITY_MILESTONES[i - 1];
    if (audience <= upperFollowers) {
      const progress = (audience - lowerFollowers) / (upperFollowers - lowerFollowers);
      return lowerBonus + (upperBonus - lowerBonus) * progress;
    }
  }
  return 26.5;
}

/** Percentage-point discovery boost from the existing brand-promotion levels. */
export function promotionDiscoveryBonus(level?: PromotionLevel): number {
  if (!level) return 0;
  return ({ local: 3, citywide: 6, premium: 10, luxury: 15 })[level];
}

/** Convert shared visibility into a probability; follower bonuses themselves remain uncapped. */
export function visibilityDiscoveryChance(
  baseChance: number,
  followers: number,
  promotionLevel?: PromotionLevel,
): number {
  const base = Number.isFinite(baseChance) ? Math.max(0, baseChance) : 0;
  const bonus = (followerOpportunityBonus(followers) + promotionDiscoveryBonus(promotionLevel)) / 100;
  // Natural probability limit only; this does not cap the follower-bonus curve.
  return Math.max(0, Math.min(0.98, base + bonus));
}

/**
 * Base chance that each of three candidate celebrities discovers the shop.
 * These levels are calibrated to preserve the agreed high-frequency outcomes for
 * Level 6/7 Signature boutiques before followers or promotions are added.
 */
const CELEBRITY_DISCOVERY_BASE_BY_TIER: readonly number[] = [
  0, 0, 0.075, 0.122, 0.184, 0.23, 0.282,
];
const SIGNATURE_CELEBRITY_DISCOVERY_BASE_BY_TIER: readonly number[] = [
  0, 0, 0.096, 0.157, 0.243, 0.31, 0.39,
];

export function celebrityDiscoveryChance(
  shopTierIndex: number,
  signatureProperty: boolean,
  profile?: CelebrityAttractionProfile,
  promotionLevel?: PromotionLevel,
): number {
  if (maximumCelebrityTierForShop(shopTierIndex) < 0) return 0;
  const tier = Math.min(6, Math.floor(shopTierIndex));
  const table = signatureProperty
    ? SIGNATURE_CELEBRITY_DISCOVERY_BASE_BY_TIER
    : CELEBRITY_DISCOVERY_BASE_BY_TIER;
  return visibilityDiscoveryChance(table[tier] || 0, profile?.followers || 0, promotionLevel);
}

/** A discovered celebrity still has to decide whether the visit suits them. */
export function celebrityVisitFollowThroughChance(profile?: CelebrityAttractionProfile): number {
  const score = (value: number | undefined) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0, Math.min(100, value))
      : 50;
  const adjustment =
    (score(profile?.reputation) - 50) * 0.001 +
    (score(profile?.prestige) - 50) * 0.0006 +
    (score(profile?.loyalty) - 50) * 0.0004 +
    (score(profile?.reliability) - 50) * 0.0004;
  return Math.max(0.65, Math.min(0.95, 0.85 + adjustment));
}

/** Followers and brand campaigns shift customer composition towards affluent clients. */
export function affluentCustomerShareShift(followers: number, promotionLevel?: PromotionLevel): number {
  const campaignPoints = promotionLevel
    ? ({ local: 0.5, citywide: 1, premium: 2, luxury: 3 })[promotionLevel]
    : 0;
  return (followerOpportunityBonus(followers) * 0.25 + campaignPoints) / 100;
}
/** Bounded 0.78–1.25 attraction multiplier retained for celebrity-rank selection and existing rival systems. */
export function celebrityAttractionMultiplier(profile?: CelebrityAttractionProfile): number {
  if (!profile) return 1;
  const clampScore = (value: number | undefined, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0, Math.min(100, value))
      : Math.max(0, Math.min(100, fallback));
  const reputation = clampScore(profile.reputation, 50);
  const followers = typeof profile.followers === 'number' && Number.isFinite(profile.followers)
    ? Math.max(0, profile.followers) : 0;
  const social = Math.log10(followers + 1);
  const tier = typeof profile.shopTierIndex === 'number' && Number.isFinite(profile.shopTierIndex)
    ? Math.max(0, Math.min(6, Math.floor(profile.shopTierIndex))) : 0;
  const awareness = clampScore(profile.awareness, 18 + social * 10 + tier * 4);
  const prestige = clampScore(profile.prestige, 15 + reputation * 0.52 + tier * 3);
  const trendInfluence = clampScore(profile.trendInfluence, 12 + social * 5);
  const audienceScore = Math.max(0, Math.min(100, social / 5 * 100));
  const brandHeat = reputation * 0.35 + awareness * 0.25 + prestige * 0.20 +
    trendInfluence * 0.15 + audienceScore * 0.05;
  return Math.max(0.78, Math.min(1.25, 0.78 + (brandHeat / 100) * 0.47));
}

/** Higher shop tiers increasingly attract the strongest ranks; Signature and brand heat tilt the mix upward. */
export const CELEBRITY_TIER_WEIGHTS_BY_SHOP_TIER: readonly (readonly number[])[] = [
  [],
  [],
  [0.55, 0.30, 0.15],
  [0.38, 0.30, 0.22, 0.10],
  [0.26, 0.24, 0.21, 0.17, 0.12],
  [0.17, 0.20, 0.21, 0.22, 0.20],
  [0.10, 0.14, 0.18, 0.25, 0.33],
];

/** Select a celebrity rank using one distribution shared by player and rivals. */
export function chooseCelebrityTierForShop(
  shopTierIndex: number,
  signatureProperty = false,
  profile?: CelebrityAttractionProfile,
  random: () => number = Math.random,
): number {
  const highest = maximumCelebrityTierForShop(shopTierIndex);
  if (highest < 0) return -1;
  const tier = Math.min(6, Math.floor(shopTierIndex));
  const source = CELEBRITY_TIER_WEIGHTS_BY_SHOP_TIER[tier] || [1];
  const tilt = Math.max(0.75, Math.min(1.30,
    1 + (celebrityAttractionMultiplier(profile) - 1) * 0.8 + (signatureProperty ? 0.06 : 0)));
  const weights = source.slice(0, highest + 1).map((weight, index) => weight * Math.pow(tilt, index));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = unitSample(random) * total;
  for (let index = 0; index < weights.length; index++) {
    roll -= weights[index];
    if (roll < 0) return index;
  }
  return Math.max(0, weights.length - 1);
}

/** Probability on a candidate day. Brand heat matters; Signature adds a moderated 1.25x odds advantage. */
export function celebrityVisitChance(
  shopTierIndex: number,
  signatureProperty: boolean,
  profile?: CelebrityAttractionProfile,
): number {
  if (maximumCelebrityTierForShop(shopTierIndex) < 0) return 0;
  const tier = Math.min(6, Math.floor(shopTierIndex));
  // High-end boutiques should have genuinely frequent celebrity opportunities, not a token chance.
  const baseByTier = [0, 0, 0.18, 0.28, 0.40, 0.48, 0.56];
  const signatureMultiplier = signatureProperty ? 1.25 : 1;
  return Math.min(0.80, (baseByTier[tier] || 0) * signatureMultiplier * celebrityAttractionMultiplier(profile));
}

/** On a scheduled celebrity day, top shops can attract a second guest after the first one arrives. */
export function additionalCelebrityVisitChance(
  shopTierIndex: number,
  signatureProperty: boolean,
  profile?: CelebrityAttractionProfile,
): number {
  if (maximumCelebrityTierForShop(shopTierIndex) < 0) return 0;
  const tier = Math.min(6, Math.floor(shopTierIndex));
  const baseByTier = [0, 0, 0, 0.04, 0.08, 0.18, 0.25];
  return Math.min(0.35, (baseByTier[tier] || 0) * (signatureProperty ? 1.25 : 1) * celebrityAttractionMultiplier(profile));
}

/** Fashion Empire Signature can occasionally draw a third celebrity into a busy VIP day. */
export function thirdCelebrityVisitChance(
  shopTierIndex: number,
  signatureProperty: boolean,
  profile?: CelebrityAttractionProfile,
): number {
  if (Math.floor(shopTierIndex) < 6 || !signatureProperty) return 0;
  return Math.min(0.15, 0.12 * celebrityAttractionMultiplier(profile));
}

/** Daily guest capacity expands with the venue, up to three at a Signature Fashion Empire. */
export function maximumCelebrityVisitsPerDay(shopTierIndex: number, signatureProperty: boolean): number {
  const tier = Math.max(0, Math.min(6, Math.floor(Number.isFinite(shopTierIndex) ? shopTierIndex : 0)));
  if (tier >= 6 && signatureProperty) return 3;
  if (tier >= 4) return 2;
  return 1;
}

const SERVICE_INTRO = {
  hair: ["I didn't come for clothes today, just my hair.", 'Only my hair today, I already have my outfit.', "Abeg I just want to make my hair. I have clothes at home."],
  makeup: ['I just want makeup, my dress is ready.', "Only my face today. I'm wearing my own outfit.", 'Just makeup please, nothing else.'],
  both: ['Hair and makeup only, I have my outfit already.', "I'm not buying clothes today. Just do my hair and face."],
  male: ['Just a fresh cut, nothing else.', 'Only haircut and beard today, my guy.', "I just want to look clean. Cut only."],
};

function serviceWants(kind: NonNullable<Customer['service']>, occasion: Occasion, male: boolean, cls: CustomerClass, wigs: boolean): Want[] {
  if (male) return [{ kind: 'hair', group: 'male' }];
  const out: Want[] = [];
  if (kind !== 'makeup') out.push({ kind: 'hair', group: pick(cls === 'poor' || !wigs ? ['braids', 'natural', 'updo', 'twists', 'locs'] : ['wig', 'wig', 'braids', 'natural', 'updo', 'twists', 'locs']) });
  if (kind !== 'hair') out.push(['owambe', 'wedding', 'party', 'redCarpet', 'birthday', 'dateNight'].includes(occasion) ? { kind: 'glam' } : { kind: 'naturalFace' });
  return out;
}

export function buildRequest(c: Omit<Customer, 'request'>, regular?: Regular): string {
  const intro = pick((c.male ? INTRO_M[c.occasion] : null) || INTRO_F[c.occasion]);
  const parts = [regular ? pick([`Divine! It's me again, ${c.name}.`, `I'm back o! ${c.name}, remember me?`]) : '', intro];
  if (c.service) parts.push(pick(c.male ? SERVICE_INTRO.male : SERVICE_INTRO[c.service]));
  c.wants.forEach((w) => parts.push(wantLine(w, c.male)));
  if (regular?.tasteKnown && !c.service) parts.push(`You know I love ${c.taste.favName}.`);
  parts.push(pick(BUDGET_LINE[c.cls]).replace('{b}', `₦${c.budget?.toLocaleString('en-NG')}`));
  return parts.filter(Boolean).join(' ');
}

const EVERYDAY = ['#5A3A28', '#1E1E24', '#2F5D3A', '#7A3A8C', '#1F6FB2', '#E9D8B8', '#8E1F3A', '#6B8E23'];
/** Plain customers walk in wearing simple everyday clothes, never a gown. */
function everydayWardrobe(male: boolean) {
  const c = () => pick(EVERYDAY);
  const g = (style: string, fabric: 'plain' | 'denim' | 'ankara' = 'plain') => ({ style, fabric, color: fabric === 'denim' ? '#3C5A8A' : c(), color2: c(), pattern: Math.floor(Math.random() * 10) });
  if (male) return pick([{ top: g('tee'), bottom: g('jeans', 'denim') }, { top: g('polo'), bottom: g('chinos') }, { top: g('mensBuba', 'plain'), bottom: g('sokoto') }]);
  // 20 additional everyday and occasion outfit combinations, using the existing garment catalogue.
  return pick([
    { top: g('tshirt'), bottom: g('skinnyJeans', 'denim') },
    { top: g('tshirt'), bottom: g('maxiSkirt') },
    { top: g('blouse'), bottom: g('aLineSkirt') },
    { top: g('buba', 'ankara'), bottom: g('iro', 'ankara') },
    { dress: g('bubu', 'ankara') },
    { top: g('cropTee'), bottom: g('baggyJeans', 'denim') },
    { top: g('camisole'), bottom: g('pencilSkirt') },
    { top: g('peplumTop', 'ankara'), bottom: g('iro', 'ankara') },
    { top: g('offShoulderTop'), bottom: g('denimMaxiSkirt', 'denim') },
    { top: g('wrapTop'), bottom: g('wideLegTrousers') },
    { top: g('puffBlouse'), bottom: g('pleatedMidi') },
    { top: g('laceBlouse', 'ankara'), bottom: g('georgeWrapper', 'ankara') },
    { top: g('offShoulderBuba', 'ankara'), bottom: g('iro', 'ankara') },
    { dress: g('bodyconMini') },
    { dress: g('slipDress') },
    { dress: g('wrapDress') },
    { dress: g('shirtDress') },
    { dress: g('tubeMidi') },
    { dress: g('maxiDress') },
    { dress: g('ruffleMaxi') },
    { dress: g('mermaidGown', 'ankara') },
    { dress: g('adireMaxi', 'ankara') },
    { dress: g('jumpsuit') },
    { dress: g('playsuit') },
    { top: g('blazer'), bottom: g('straightTrousers') },
    { top: g('kimono'), bottom: g('skinnyJeans', 'denim') },
  ]);
}

/** Real Nigerian entertainers are represented as fictional in-game guest events. */
const CELEBRITY_POOLS: { name: string; male: boolean; rank: string }[][] = [
  [
    { name: 'Mavo', male: true, rank: 'Rising star' },
    { name: 'FOLA', male: true, rank: 'Breakout artist' },
    { name: 'Kiekie', male: false, rank: 'Digital favourite' },
    { name: 'Broda Shaggi', male: true, rank: 'Comedy star' },
  ],
  [
    { name: 'Rema', male: true, rank: 'Hitmaker' },
    { name: 'Ayra Starr', male: false, rank: 'Afropop star' },
    { name: 'Bimbo Ademoye', male: false, rank: 'Nollywood favourite' },
    { name: 'Tobi Bakre', male: true, rank: 'Screen star' },
    { name: 'Sabinus', male: true, rank: 'Comedy star' },
  ],
  [
    { name: 'Asake', male: true, rank: 'Arena headliner' },
    { name: 'Tiwa Savage', male: false, rank: 'Afrobeats icon' },
    { name: 'Olamide', male: true, rank: 'Music mogul' },
    { name: 'Kizz Daniel', male: true, rank: 'Hitmaker' },
    { name: 'Ini Edo', male: false, rank: 'Nollywood star' },
  ],
  [
    { name: 'Don Jazzy', male: true, rank: 'Music executive' },
    { name: 'Funke Akindele', male: false, rank: 'Blockbuster filmmaker' },
    { name: 'Tems', male: false, rank: 'Global music star' },
    { name: 'Genevieve Nnaji', male: false, rank: 'Screen icon' },
    { name: 'Olamide', male: true, rank: 'Music mogul' },
  ],
  [
    { name: 'Davido', male: true, rank: 'SSS global superstar' },
    { name: 'Wizkid', male: true, rank: 'SSS global superstar' },
    { name: 'Burna Boy', male: true, rank: 'SSS global superstar' },
    { name: 'Don Jazzy', male: true, rank: 'Industry heavyweight' },
    { name: 'Funke Akindele', male: false, rank: 'Nollywood powerhouse' },
    { name: 'Tiwa Savage', male: false, rank: 'Global Afrobeats icon' },
  ],
];

const celebrityNameKey = (name: string) => name.toLocaleLowerCase('en-NG').replace(/[^a-z0-9]/g, '');

/** Match celebrity identities even when a save changes spacing, punctuation, or letter case. */
export function isCelebrityRosterName(name: string): boolean {
  const key = celebrityNameKey(name);
  return !!key && CELEBRITY_POOLS.some((pool) => pool.some((profile) => celebrityNameKey(profile.name) === key));
}

/** Give a mislabelled ordinary customer a stable, ordinary name without changing their budget or identity. */
export function sanitizeOrdinaryCustomerName<T extends { id?: string; name: string; male: boolean }>(person: T): T {
  if (!isCelebrityRosterName(person.name)) return person;
  const names = person.male ? MEN : WOMEN;
  const identity = person.id || person.name;
  let seed = 0;
  for (let i = 0; i < identity.length; i++) seed = (seed * 31 + identity.charCodeAt(i)) >>> 0;
  return { ...person, name: names[seed % names.length] };
}

/** Repair celebrity-name collisions in both the saved regular roster and anyone already on the shop floor. */
export function sanitizeSavedCelebrityNameCollisions(state: GameState): GameState {
  const safeCustomer = (customer: Customer): Customer =>
    customer.celebrity ? customer : sanitizeOrdinaryCustomerName(customer);
  return {
    ...state,
    regulars: (state.regulars || []).map((person) => sanitizeOrdinaryCustomerName(person)),
    arrivals: (state.arrivals || []).map((arrival) => ({ ...arrival, c: safeCustomer(arrival.c) })),
    inShop: (state.inShop || []).map((person) => ({ ...person, c: safeCustomer(person.c) })),
  };
}

/** Return a named guest from the same rank pool used by player and rival celebrity visits. */
export function celebrityProfileForTier(
  celebrityTier: number,
  random: () => number = Math.random,
): { name: string; male: boolean; rank: string } {
  const tier = Math.max(0, Math.min(4, Math.floor(Number.isFinite(celebrityTier) ? celebrityTier : 0)));
  const profiles = CELEBRITY_POOLS[tier];
  return profiles[Math.floor(unitSample(random) * profiles.length)];
}

export function makeCelebrityCustomer(state: GameState, celebrityTier: number): Customer {
  // Celebrity tier is its own five-level scale; shop level only controls eligibility.
  const tier = Math.max(0, Math.min(4, Math.floor(Number.isFinite(celebrityTier) ? celebrityTier : 0)));
  const profile = celebrityProfileForTier(tier);
  let base = makeCustomer(state, [0, 0, 1]);
  // The visual avatar is randomly generated, while the public figure is a fictional guest-event portrayal.
  if (base.male !== profile.male) {
    const candidates = Array.from({ length: 12 }, () => generateRandomCustomer('plain')).find((c) => (c.body === 'male') === profile.male);
    if (candidates) base = { ...base, look: { ...candidates, state: 'plain' }, male: profile.male };
  }
  const { budget, spendFloor } = celebrityAmountsForTier(tier, Math.random, state.tier, !!state.listing.signature);
  const guest = {
    ...base,
    id: `vip-${state.day}-${Math.random().toString(36).slice(2, 8)}`,
    name: profile.name,
    cls: 'rich' as const,
    occasion: 'redCarpet' as Occasion,
    budget,
    male: profile.male,
    influencer: true,
    regularId: undefined,
    celebrity: { tier, rank: profile.rank, spendFloor },
  };
  return {
    ...guest,
    request: `A special Lagos celebrity guest has arrived: ${profile.name} · ${profile.rank}. I need a show-stopping luxury look. Money is not the issue, and my team is waiting outside. Please make this memorable. Budget: ₦${budget?.toLocaleString('en-NG')}.`,
  };
}

export function makeCustomer(state: GameState, mix: [number, number, number]): Customer {
  // regulars come back
  const chosenRegular = state.regulars.length && chance(Math.min(0.35, 0.08 + state.regulars.length * 0.03)) ? pick(state.regulars) : undefined;
  const regular = chosenRegular ? sanitizeOrdinaryCustomerName(chosenRegular) : undefined;
  const cls = state.listing.signature ? (chance(0.08) ? 'middle' : 'rich') : regular ? regular.cls : classFor(state, mix);
  const rolled = regular ? { ...regular.look, state: 'plain' as const } : { ...generateRandomCustomer('plain'), state: 'plain' as const };
  const male = rolled.body === 'male';
  const look = regular ? rolled : { ...rolled, wardrobe: everydayWardrobe(male), outfit: undefined, accessories: { ...(rolled.accessories || {}), headwear: 'none', shoes: male ? 'slides' : 'flats' } as typeof rolled.accessories };
  const occasion = pick(OCCASIONS[cls]);
  // nobody asks for a wig install before there's a hair station
  const wigs = shopStats(state.furniture, state.tier, state.listing.stars).wigs;
  const service: Customer['service'] = chance(male ? SERVICE_SHARE.male : SERVICE_SHARE.female) ? (male ? 'hair' : pick(['hair', 'hair', 'makeup', 'both'] as const)) : undefined;
  const [lo, hi] = (service ? SERVICE_BUDGET : BUDGET)[cls];
  const budget = service
    ? roundBudget(lo + Math.random() * (hi - lo))
    : cls === 'rich'
      ? richRetailBudget(Math.random, state.tier, !!state.listing.signature)
      : roundBudget(lo + Math.random() * (hi - lo));
  const fav = regular ? { favColor: regular.favColor, favName: regular.favName } : (() => { const c = pick(WANTED_COLOURS); return { favColor: c.color, favName: c.name }; })();
  const base = {
    id: `c${state.day}-${Math.random().toString(36).slice(2, 8)}`,
    name: regular ? regular.name : pick(male ? MEN : WOMEN),
    cls,
    occasion,
    budget,
    wants: service ? serviceWants(service, occasion, male, cls, wigs) : wantsFor(occasion, male, cls, wigs),
    service,
    taste: fav,
    look,
    male,
    influencer: cls === 'rich' && chance(0.25),
    regularId: regular?.id,
  };
  return { ...base, request: buildRequest(base, regular) };
}
