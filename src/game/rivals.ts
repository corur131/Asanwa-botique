/**
 * The other boutiques. Nineteen shops on the same economy as Divine's: they
 * earn, pay rent, move up when they can afford it and get thrown down when they
 * can't. Five have full personalities; fourteen are background shops that still
 * climb and fall. Every Sunday the Top 20 ladder is published.
 */
import { CharacterConfig } from '../types/character';
import { generateRandomCustomer } from '../utils/randomizer';
import { CELEBRITY_FULFILMENT_RATE, TIERS, naira } from './economy';
import { celebrityAmountsForTier, celebrityIsScheduled, celebrityDiscoveryChance, celebrityVisitFollowThroughChance, chooseCelebrityTierForShop, celebrityProfileForTier, maximumCelebrityVisitsPerDay } from './customers';
import { BrandMetrics, GameState, Gist, Message, ReplyChoice, Rival, RivalPost } from './types';
import { Topic, startConvo } from './convos';
import { addBrag, gramNote } from './gram';
import { brandFromLegacy, brandPower, getBrandMetrics } from './business';

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const chance = (p: number) => Math.random() < p;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

type Seed = Omit<Rival, 'cash' | 'rep' | 'followers' | 'week' | 'feeling' | 'look' | 'moved' | 'broke' | 'stars'> & { rep: number; followers: number; male?: boolean };

const ROSTER: Seed[] = [
  // the five
  { id: 'tolani', owner: 'Tolani Adebayo', shop: 'House of Tolani', handle: 'houseoftolani', main: true, personality: 'queen', speciality: 'bridal', area: 'Victoria Island', tier: 4, signature: true, skill: 1.12, aggression: 0.45, rep: 84, followers: 32_000 },
  { id: 'amaka', owner: 'Amaka Obi', shop: "Amaka's Closet", handle: 'amakascloset_', main: true, personality: 'loud', speciality: 'genz', area: 'Yaba', tier: 1, skill: 1.02, aggression: 0.8, rep: 55, followers: 3_200 },
  { id: 'bisi', owner: 'Iya Bisi', shop: 'Bisi Aso-Oke & Lace', handle: 'bisi_asooke', main: true, personality: 'oldschool', speciality: 'native', area: 'Surulere', tier: 1, skill: 0.98, aggression: 0.4, rep: 60, followers: 1_400 },
  { id: 'chioma', owner: 'Chioma Eze', shop: 'Chi Cheap & Chic', handle: 'chicheapchic', main: true, personality: 'shady', speciality: 'cheap', area: 'Yaba', tier: 0, skill: 0.95, aggression: 0.9, rep: 38, followers: 900 },
  { id: 'zainab', owner: 'Zainab Bello', shop: 'Zee Hair & Glam', handle: 'zeeglam', main: true, personality: 'sweet', speciality: 'wigs', area: 'Yaba', tier: 0, skill: 1.03, aggression: 0.3, rep: 42, followers: 1_100 },
  // the rest of the ladder
  { id: 'ivory', owner: 'Mrs Funke Coker', shop: 'Ivory Lane', handle: 'ivorylane.vi', main: false, personality: 'pro', speciality: 'luxury', area: 'Ikoyi', tier: 3, skill: 1.16, aggression: 0.2, rep: 80, followers: 21_000 },
  { id: 'adeko', owner: 'Kola Ade', shop: 'Ade & Ko Couture', handle: 'adeandko', main: false, personality: 'pro', speciality: 'menswear', area: 'Lekki Phase 1', tier: 3, skill: 1.1, aggression: 0.3, rep: 76, followers: 15_000, male: true },
  { id: 'laceroom', owner: 'Ngozi Okafor', shop: 'The Lace Room', handle: 'thelaceroom', main: false, personality: 'pro', speciality: 'native', area: 'Lekki Phase 1', tier: 2, skill: 1.08, aggression: 0.3, rep: 70, followers: 9_000 },
  { id: 'sade', owner: 'Sade Williams', shop: 'Sade Styles', handle: 'sadestyles', main: false, personality: 'pro', speciality: 'everyday', area: 'Ikeja', tier: 2, skill: 1.0, aggression: 0.25, rep: 64, followers: 6_500 },
  { id: 'temi', owner: 'Temi Johnson', shop: 'Glow by Temi', handle: 'glowbytemi', main: false, personality: 'pro', speciality: 'wigs', area: 'Ikeja', tier: 2, skill: 1.02, aggression: 0.35, rep: 62, followers: 7_800 },
  { id: 'kaftan', owner: 'Musa Lawal', shop: 'Kaftan King', handle: 'kaftanking', main: false, personality: 'pro', speciality: 'menswear', area: 'Surulere', tier: 2, skill: 0.97, aggression: 0.2, rep: 58, followers: 4_100, male: true },
  { id: 'velvet', owner: 'Ify Nwosu', shop: 'Velvet & Vibes', handle: 'velvetandvibes', main: false, personality: 'pro', speciality: 'genz', area: 'Surulere', tier: 1, skill: 1.0, aggression: 0.4, rep: 54, followers: 5_200 },
  { id: 'ronke', owner: 'Ronke Bakare', shop: "Ronke's Rack", handle: 'ronkesrack', main: false, personality: 'pro', speciality: 'everyday', area: 'Yaba', tier: 1, skill: 0.93, aggression: 0.3, rep: 50, followers: 1_900 },
  { id: 'owambe', owner: 'Folake Adeyemi', shop: 'Owambe Express', handle: 'owambeexpress', main: false, personality: 'pro', speciality: 'native', area: 'Ikeja', tier: 1, skill: 0.97, aggression: 0.3, rep: 52, followers: 2_600 },
  { id: 'thrift', owner: 'Dami Ogun', shop: 'Thrift Republic', handle: 'thriftrepublic.ng', main: false, personality: 'pro', speciality: 'thrift', area: 'Yaba', tier: 1, skill: 0.95, aggression: 0.35, rep: 48, followers: 4_400 },
  { id: 'bubu', owner: 'Halima Yusuf', shop: 'Bubu Lounge', handle: 'bubulounge', main: false, personality: 'pro', speciality: 'native', area: 'Surulere', tier: 0, skill: 0.96, aggression: 0.2, rep: 44, followers: 800 },
  { id: 'blessing', owner: 'Mummy Blessing', shop: 'Mummy Blessing Fashion', handle: 'mummyblessingfashion', main: false, personality: 'pro', speciality: 'cheap', area: 'Yaba', tier: 0, skill: 0.86, aggression: 0.25, rep: 36, followers: 300 },
  { id: 'genzplug', owner: 'Tobi Ade', shop: 'Gen-Z Plug', handle: 'genzplug', main: false, personality: 'pro', speciality: 'genz', area: 'Yaba', tier: 0, skill: 0.98, aggression: 0.5, rep: 40, followers: 2_200, male: true },
  { id: 'lekkithrift', owner: 'Ebere Kalu', shop: 'Lekki Thrift Hub', handle: 'lekkithrifthub', main: false, personality: 'pro', speciality: 'thrift', area: 'Lekki Phase 1', tier: 0, skill: 0.9, aggression: 0.3, rep: 37, followers: 600 },
];

/** Daily takings before rent at skill 1 and average reputation, by shop size. Tuned in tools/rivalsim. */
const DAILY = [120_000, 400_000, 1_000_000, 2_500_000, 15_000_000, 40_000_000, 120_000_000];
/** Share of takings spent restocking, by shop size: big shops carry dearer stock. */
const STOCK_SHARE = [0.45, 0.5, 0.55, 0.6, 0.62, 0.66, 0.7];
/** Weekly wages for their staff. */
const WAGES = [0, 0, 60_000, 150_000, 300_000, 800_000, 1_800_000];
const STAR_RENT_FACTOR = [0, 0.75, 1, 1.33, 1.75] as const;
const hash = (id: string) => Array.from(id).reduce((a, c) => a + c.charCodeAt(0), 0);

function median(values: number[]): number {
  if (!values.length) return 0;
  const ordered = values.map((value) => Math.max(0, Number.isFinite(value) ? value : 0)).sort((a, b) => a - b);
  return ordered[Math.floor(ordered.length / 2)] || 0;
}

/**
 * Conservative weekly profit estimate if this boutique operated at a target tier.
 * Uses the median recent takings to avoid one celebrity windfall deciding an upgrade.
 */
export function projectedRivalWeeklyProfitAtTier(r: Rival, targetTier: number): number {
  const currentTier = Math.max(0, Math.min(TIERS.length - 1, Math.floor(r.tier)));
  if (!Number.isInteger(targetTier) || targetTier <= currentTier || targetTier >= TIERS.length) return Number.NEGATIVE_INFINITY;
  const recentTakings = (r.week || []).slice(-7);
  if (!recentTakings.length || DAILY[currentTier] <= 0) return Number.NEGATIVE_INFINITY;

  const typicalDailyTakings = median(recentTakings);
  const projectedDailyTakings = typicalDailyTakings * DAILY[targetTier] / DAILY[currentTier];
  const stockShare = clamp(STOCK_SHARE[targetTier] + (r.wholesaleActive ? 0.05 : 0), 0.3, 0.78);
  const branchCount = Math.max(0, r.branches || 0);
  const departmentCount = (r.departments || []).length;
  const dailyRunning = TIERS[targetTier].running +
    branchCount * Math.max(5_000, TIERS[targetTier].running * 0.22) +
    departmentCount * 2_500 + (r.wholesaleActive ? 7_000 : 0);
  const projectedStars = r.skill > 1.05 ? 3 : 2;
  const weeklyFixed = TIERS[targetTier].rent * STAR_RENT_FACTOR[projectedStars] +
    WAGES[targetTier] + branchCount * TIERS[targetTier].rent * 0.55;
  return projectedDailyTakings * (1 - stockShare) * 7 - dailyRunning * 7 - weeklyFixed;
}

/** A rival upgrades only with protected liquidity, a profitable recent week, and positive projected tier economics. */
export function rivalCanAffordTierUpgrade(r: Rival, targetTier: number): boolean {
  if (targetTier !== r.tier + 1 || targetTier < 1 || targetTier >= TIERS.length || r.cash < 0) return false;
  const next = TIERS[targetTier];
  const appetite = 1.1 + (hash(r.id) % 6) * 0.1;
  const liquidAfterDebt = Math.max(0, r.cash) + Math.max(0, r.savings || 0) - Math.max(0, r.debt || 0);
  if (liquidAfterDebt <= next.moveIn * appetite + next.rent * 3) return false;

  const recentProfits = (r.profitHistory || []).slice(-7);
  const recentProfit = recentProfits.length >= 5
    ? recentProfits.reduce((sum, profit) => sum + profit, 0)
    : (r.week || []).reduce((sum, value) => sum + value, 0) -
      (r.weekCosts || []).reduce((sum, value) => sum + value, 0);
  return recentProfit > 0 && projectedRivalWeeklyProfitAtTier(r, targetTier) > 0;
}

/** Keep tier-specific premises valued consistently without erasing branch/department assets. */
function adjustRivalPropertyAssetValue(r: Rival, fromTier: number, toTier: number): void {
  const oldBase = Math.round(TIERS[fromTier].moveIn * 0.8 + TIERS[fromTier].rent * 2);
  const nextBase = Math.round(TIERS[toTier].moveIn * 0.8 + TIERS[toTier].rent * 2);
  const existing = Number.isFinite(r.assetValue) ? Math.max(0, r.assetValue || 0) : oldBase;
  r.assetValue = Math.max(0, existing - oldBase + nextBase);
}

/** Family bridge credit is a recorded liability, not a silent cash grant. */
function rescueRivalCash(r: Rival, targetCash: number): number {
  const borrowed = Math.max(0, Math.round(targetCash - r.cash));
  if (!borrowed) return 0;
  r.cash += borrowed;
  r.debt = Math.max(0, r.debt || 0) + borrowed;
  return borrowed;
}

function lookFor(male: boolean): CharacterConfig {
  for (let i = 0; i < 40; i++) {
    const c = generateRandomCustomer('styled');
    if ((c.body === 'male') === male) return c;
  }
  return generateRandomCustomer('styled');
}

export function initRivals(): Rival[] {
  return ROSTER.map((r) => {
    const { male, ...rest } = r;
    return {
      ...rest,
      stars: r.tier === 0 ? 1 : r.main ? 3 : 2,
      cash: TIERS[r.tier].rent * (r.id === 'tolani' ? 12 : 3) + TIERS[r.tier].moveIn * 0.2,
      week: Array.from({ length: 7 }, () => DAILY[r.tier] * r.skill * 0.6),
      feeling: r.id === 'zainab' ? 20 : r.id === 'tolani' ? 10 : 0,
      look: lookFor(!!male),
      male: !!male,
      moved: -100,
      broke: 0,
    };
  });
}

export const rivalById = (s: GameState, id?: string) => (s.rivals || []).find((r) => r.id === id);
export const mainRivals = (s: GameState) => (s.rivals || []).filter((r) => r.main);

// ---------------------------------------------------------------------------
// The ladder
// ---------------------------------------------------------------------------
/** Recent trading performance leads the ladder; reputation, audience and premises still matter. */
export function boutiqueScore(weekTakings: number, strength: number, followers: number, tier: number) {
  // `strength` is now an uncapped Brand Power score, not the legacy 0..100 reputation value.
  return weekTakings / 5_000 + strength * 2.4 + Math.sqrt(Math.max(0, followers)) * 0.75 + tier * 45;
}
export function playerWeek(s: GameState) {
  return s.history.slice(-7).reduce((a, d) => a + d.income, 0);
}
export function playerScore(s: GameState) {
  const power = brandPower(getBrandMetrics(s), s.followers || 0, s.tier);
  return boutiqueScore(playerWeek(s), power, s.followers || 0, s.tier);
}
export function rivalScore(r: Rival) {
  const power = brandPower(r.brand || brandFromLegacy(r.rep, r.followers, r.tier), r.followers, r.tier);
  return boutiqueScore(r.week.reduce((a, b) => a + b, 0), power, r.followers, r.tier);
}

export interface Rank { id: string; name: string; owner: string; score: number; brandPower: number; tier: number; area: string; rep: number; followers: number; you?: boolean; main?: boolean }
export function ladder(s: GameState): Rank[] {
  const rows: Rank[] = (s.rivals || []).map((r) => ({ id: r.id, name: r.shop, owner: r.owner, score: rivalScore(r), brandPower: brandPower(r.brand || brandFromLegacy(r.rep, r.followers, r.tier), r.followers, r.tier), tier: r.tier, area: r.area, rep: r.rep, followers: r.followers, main: r.main }));
  const playerPower = brandPower(getBrandMetrics(s), s.followers || 0, s.tier);
  rows.push({ id: 'you', name: 'Asanwa Boutique', owner: 'Divine', score: playerScore(s), brandPower: playerPower, tier: s.tier, area: s.listing.area, rep: s.rep, followers: s.followers || 0, you: true });
  return rows.sort((a, b) => b.score - a.score);
}
export const playerRank = (s: GameState) => ladder(s).findIndex((r) => r.you) + 1;
export const lastRank = (s: GameState, id: string) => {
  const r = (s.ranking || []).slice(-1)[0];
  return r ? r.order.indexOf(id) + 1 : 0;
};

/** Rivals near Divine (same area, similar size, better reputation) take some of her walk-ins. */
export function competition(s: GameState): number {
  let k = 0;
  for (const r of s.rivals || []) {
    if (r.area !== s.listing.area || Math.abs(r.tier - s.tier) > 1) continue;
    const rivalPower = brandPower(r.brand || brandFromLegacy(r.rep, r.followers, r.tier), r.followers, r.tier);
    const playerPower = brandPower(getBrandMetrics(s), s.followers || 0, s.tier);
    if (rivalPower > playerPower) k += 0.04 + Math.min(0.07, (rivalPower - playerPower) / 1200);
  }
  return Math.max(0.78, 1 - k);
}

// ---------------------------------------------------------------------------
// Messages from rivals
// ---------------------------------------------------------------------------
export const GROUP = 'Lagos Fashion Babes';
export const REPLIES: ReplyChoice[] = [
  { id: 'classy', label: 'Stay classy' },
  { id: 'clap', label: 'Clap back' },
  { id: 'ignore', label: 'Ignore' },
];

function say(s: GameState, from: string, text: string, opts: Partial<Message> = {}): GameState {
  const id = (s.msgSeq || 0) + 1;
  const m: Message = { id, day: s.day, from, text, tone: 'info', t: s.phase === 'shop' ? Math.floor(s.clock) : undefined, ...opts };
  return { ...s, msgSeq: id, messages: [m, ...s.messages].slice(0, 160) };
}
const inGroup = (s: GameState, r: Rival, text: string, opts: Partial<Message> = {}) => say(s, r.owner, text, { chat: GROUP, ...opts });
/** A rival starts a back-and-forth with Divine (in the group, or in a DM). */
const talk = (s: GameState, r: Rival, text: string, topic: Topic, dm = false) => startConvo(s, { with: r.owner, rivalId: r.id, chat: dm ? undefined : GROUP, topic, opener: text });

function gist(s: GameState, title: string, body: string, about?: string, hot = false): GameState {
  const g: Gist = { id: `g${s.day}-${Math.random().toString(36).slice(2, 7)}`, day: s.day, title, body, about, hot };
  return { ...s, gist: [g, ...(s.gist || [])].slice(0, 40) };
}

function rivalPost(s: GameState, r: Rival, caption: string, shade = false, kind: RivalPost['kind'] = 'work'): GameState {
  const p: RivalPost = { id: `rp${s.day}-${Math.random().toString(36).slice(2, 7)}`, rivalId: r.id, day: s.day, look: kind === 'brag' && chance(0.5) ? r.look : lookFor(r.speciality === 'menswear' && chance(0.7)), caption, likes: Math.round(r.followers * rand(kind === 'brag' ? 0.08 : 0.04, kind === 'brag' ? 0.18 : 0.12)), shade, kind };
  return { ...s, rivalPosts: [p, ...(s.rivalPosts || [])].slice(0, 60) };
}

export interface CelebrityVisitAnnouncement {
  shopId: string;
  shopName: string;
  ownerName: string;
  celebrityName: string;
  spend: number;
  bought: boolean;
  premiumOrder: boolean;
  followerGain?: number;
}

/** Shared celebrity press/social event for Divine and rivals; reported receipts are not described as profit. */
export function announceCelebrityVisit(s0: GameState, event: CelebrityVisitAnnouncement): GameState {
  let s = s0;
  const spend = Math.max(0, Math.round(event.spend || 0));
  const moneyText = naira(spend);
  const headline = event.premiumOrder
    ? `${event.shopName} welcomes a celebrity client ✨`
    : event.bought
      ? `Celebrity shopping visit at ${event.shopName}`
      : `Celebrity visit to ${event.shopName} ends without an order`;
  const outcome = event.premiumOrder
    ? `${event.celebrityName} placed a premium order with reported revenue of ${moneyText}, including any tip.`
    : event.bought
      ? `${event.celebrityName} purchased a wardrobe with reported revenue of ${moneyText}, including any tip; it was not a top-tier premium order.`
      : `${event.celebrityName} visited but left without completing a purchase.`;
  const body = `${event.ownerName} of ${event.shopName}: ${outcome} Stock, styling and fulfilment costs are accounted for separately.`;
  s = gist(s, headline, body, event.shopId, event.premiumOrder || !event.bought);
  s = gramNote(s, `🚨 CELEBRITY SIGHTING: ${event.celebrityName} at ${event.shopName} — ${event.premiumOrder ? `premium order reported at ${moneyText}` : event.bought ? `a purchase reported at ${moneyText}` : 'no purchase was recorded'}.`, 'celebrity');
  if (event.shopId === 'you') {
    const gainText = event.followerGain ? ` +${event.followerGain?.toLocaleString('en-NG')} followers.` : '';
    s = gramNote(s, event.premiumOrder
      ? `TRENDING NOW 🔥 ${event.celebrityName} placed a premium order at Asanwa Boutique and posted the look.${gainText}`
      : event.bought
        ? `CELEBRITY SPOTTED ✨ ${event.celebrityName} shopped at Asanwa Boutique. Reported revenue: ${moneyText}.`
        : `CELEBRITY SIGHTING: ${event.celebrityName} visited Asanwa Boutique but left without buying.`, 'celebrity');
    if (event.bought) s = addBrag(s, 'celebrity', `${event.celebrityName} shopped with us`, `${event.celebrityName} ${event.premiumOrder ? 'placed a premium order' : 'bought a look'} at Asanwa Boutique.`, event.premiumOrder ? 5 : 4);
    s = say(s, 'Asanwa Boutique',
      `Celebrity update: ${event.celebrityName} ${event.premiumOrder ? `placed a premium order worth ${moneyText}` : event.bought ? `made a purchase worth ${moneyText}` : 'left without placing an order'}.`,
      { chat: GROUP, tone: event.bought ? 'good' : 'warn' });
    if (!event.followerGain) {
      s = { ...s, today: { ...s.today, events: [...(s.today?.events || []), headline] } };
    }
  } else {
    s = gramNote(s, event.premiumOrder
      ? `FASHION ALERT ✨ ${event.celebrityName} reportedly placed a premium order at ${event.shopName}: ${moneyText}.`
      : event.bought
        ? `CELEBRITY SPOTTED ✨ ${event.celebrityName} made a purchase at ${event.shopName}.`
        : `CELEBRITY SIGHTING: ${event.celebrityName} visited ${event.shopName} but left without an order.`, 'celebrity');
    const rival = rivalById(s, event.shopId);
    if (rival) s = rivalPost(s, rival,
      event.premiumOrder
        ? `${event.celebrityName} chose a standout luxury look at ${event.shopName} ✨ Reported order: ${moneyText}. #CelebrityStyle #LagosFashion`
        : event.bought
          ? `${event.celebrityName} purchased a wardrobe at ${event.shopName} ✨ #LagosFashion`
          : `${event.celebrityName} visited ${event.shopName} today, but no order was completed.`,
      !event.bought, event.bought ? 'brag' : 'work');
    if (rival?.main) s = inGroup(s, rival,
      event.premiumOrder
        ? `Celebrity client in my shop today 😌✨ Reported order: ${moneyText}. The industry is watching.`
        : event.bought
          ? `Celebrity shopper came through today ✨ A wardrobe purchase at ${event.shopName}.`
          : `A celebrity visited today but left without buying. We will take the feedback and do better.`,
      { tone: event.bought ? 'good' : 'warn' });
  }
  return s;
}

const LINES = {
  brag: {
    queen: ['Another bride, another masterpiece. Some of us were built for this. 👑', 'Booked till December. Thank God for growth 🙏🏾', 'Some people are still learning to tie gele. I just did three brides before 10am.'],
    loud: ['Omo! Sold out AGAIN 😂😂 Una no ready for Amaka', 'My DMs are flooded. Abeg calm down, I am one person 😩', 'Na me get Yaba this year, write it down ✍🏾'],
    oldschool: ['Real aso-oke does not come from China. I have been doing this before some of you were born.', 'Three owambes this weekend. Experience is the best teacher.'],
    shady: ['Why pay ₦40k when Chi Cheap & Chic will do it for ₦15k? Think about it 🤔', 'Busy busy busy. Some shops are empty though 👀'],
    sweet: ['Grateful for every customer today 🥰 Love you all!', 'New wigs just landed ❤️ come and see!'],
    pro: ['Good week at the shop. Grateful.', 'New collection is out.'],
  },
  shade: {
    queen: ['Some people opened a kiosk and think they are a designer 😌', 'Imitation is the best form of flattery. Keep copying, darling.'],
    loud: ['Divine, is that your shop or a container? 😂', 'Who taught Divine how to tie gele? Abeg refund them 💀', 'I saw that look you posted. My apprentice does better.'],
    oldschool: ['These young girls think styling is TikTok. Respect your elders.', 'Divine, that lace was not real lace. Customers are not stupid.'],
    shady: ['Divine dey charge ₦30k for wetin I do for ₦12k 😂', 'Your customer came to my shop after. Just saying 🤷🏾‍♀️'],
    sweet: ["Divine your shop is so cute! Small, but cute 🥰", "I love that you're trying, sis ❤️"],
    pro: ['Some new shops are pricing very aggressively.'],
  },
  jealous: ['Who is her sugar daddy? Just asking questions 🤔', 'Some people move shop every month like say na rent-free 🙄', 'Na God dey bless people wey no sabi work sha 😒', 'Hmm. Congratulations I guess.', 'Who is sponsoring her? Just asking 👀', 'Big shop, small talent 😂', 'Let us see how long she will last there.', 'Rent there is not small o. Wish her luck 🙃', 'We move. Abeg.'],
  welcomeUp: (name: string) => [`Congrats ${name}! 🎉`, `Ehen, ${name} don enter big league o`, `Congrats babe ❤️`],
  mock: (name: string) => [`${name} don pack go smaller shop o 😂`, `Landlord no dey play o. Sorry ${name} 🙃`, `Abeg who saw ${name}'s new shop? Small like matchbox 💀`],
};

/** A reply to a rival: what it does depends on the choice. */
export function answerRival(s0: GameState, msgId: number, choice: ReplyChoice['id']): GameState {
  const m = s0.messages.find((x) => x.id === msgId);
  if (!m || m.answered || !m.choices) return s0;
  let s: GameState = { ...s0, messages: s0.messages.map((x) => (x.id === msgId ? { ...x, answered: choice } : x)) };
  const r = rivalById(s, m.ctx?.rivalId);
  const where = m.chat || m.from;
  const mine = (text: string) => say(s, 'You', text, { chat: where, tone: 'info' });
  const feel = (d: number) => (r ? { ...s, rivals: s.rivals.map((x) => (x.id === r.id ? { ...x, feeling: clamp(x.feeling + d, -100, 100) } : x)) } : s);
  if (choice === 'classy') {
    s = mine(pick(['Congrats to everyone winning. There is room for all of us ❤️', 'God bless your hustle sis. Mine is coming too 🙏🏾', 'No wahala. Let the work speak.']));
    s = { ...feel(6), rep: clamp(s.rep + 0.5, 0, 100), followers: (s.followers || 0) + Math.round(rand(5, 25)) };
  } else if (choice === 'clap') {
    s = mine(pick(['At least my customers come back 😌', 'Container or not, the girls are booking. Cry about it 😂', 'You talk too much for someone with an empty shop.', 'Stay in your lane, I am busy making money 💅🏾']));
    s = feel(-15);
    if (chance(0.55)) {
      const gain = Math.round(rand(60, 220));
      s = { ...s, followers: (s.followers || 0) + gain, rep: clamp(s.rep + 1, 0, 100) };
      s = gist(s, `${r ? r.owner : 'A rival'} and Divine drag each other in fashion group chat 🍿`, `Screenshots are everywhere. Fans say Divine won this round. Her page gained ${gain} followers overnight.`, 'you', true);
    } else {
      s = { ...s, rep: clamp(s.rep - 2, 0, 100) };
      s = gist(s, `Divine of Asanwa Boutique loses her cool in group chat`, `"Very unprofessional," says one customer. Her reputation took a hit.`, 'you', true);
    }
  } else if (choice === 'ignore') {
    s = feel(-2);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Each evening: every rival's day, and the drama that comes with it
// ---------------------------------------------------------------------------
export function simulateRivals(s0: GameState): GameState {
  let s = s0;
  if (!s.rivals?.length) return s;
  const today = s.day;
  // Snapshot the current order once, so rivals can react to the actual race for rank.
  const currentOrder = ladder(s).map((row) => row.id);
  const rankById = new Map(currentOrder.map((id, index) => [id, index + 1] as const));
  const youRank = rankById.get('you') || 20;
  // Rival-only race: who is on top, and by how much. Being number one costs something.
  const rivalOrder = currentOrder.filter((id) => id !== 'you');
  const rivalPos = new Map(rivalOrder.map((id, index) => [id, index + 1] as const));
  const scoreOf = new Map(s.rivals.map((r) => [r.id, rivalScore(r)] as const));
  const leadGap = clamp((scoreOf.get(rivalOrder[0]) || 1) / Math.max(1, scoreOf.get(rivalOrder[1]) || 1), 1, 16);
  const rivals: Rival[] = [];
  const news: { kind: 'up' | 'down' | 'viral' | 'scandal' | 'campaign' | 'celebrity' | 'rescue' | 'poach' | 'investor'; r: Rival; from?: Rival; amount?: number; spend?: number; bought?: boolean; premiumOrder?: boolean; celebrityTier?: number; celebrityName?: string; rescueAmount?: number }[] = [];
  const growthNotes: { owner: string; shop: string; detail: string }[] = [];
  for (const r0 of s.rivals) {
    const r = { ...r0, week: [...r0.week], weekCosts: [...(r0.weekCosts || [])] };
    const t = TIERS[r.tier];
    const repK = 0.6 + (r.rep / 100) * 0.8;
    const followK = 1 + 0.3 * (r.followers / (r.followers + 8000));
    const ramp = Math.min(1, 0.55 + (today - r.moved) / 20);
    const rivalRank = rankById.get(r.id) || 20;
    const pos = rivalPos.get(r.id) || 20;
    const isLeader = pos === 1;
    // Big audiences grow more slowly: the next 100k followers are harder than the first.
    const followerScale = 1 / (1 + r.followers / 120_000);
    const chasingDivine = Math.abs(rivalRank - youRank) <= (r.main ? 5 : 2);
    const guardingTopFive = rivalRank <= 5;
    const campaignChance = clamp(
      0.035 + r.aggression * 0.055 + (chasingDivine ? 0.07 : 0) + (guardingTopFive ? 0.025 : 0),
      0.03,
      0.22,
    );
    // Each boutique can have one defining event today: a push for customers, a viral win or a setback.
    const dayEvent: 'campaign' | 'viral' | 'scandal' | null = chance(campaignChance)
      ? 'campaign'
      : chance(0.038 * (r.main ? 1.25 : 1) * (pos > 3 ? 1.4 : 1))
        ? 'viral'
        : chance(isLeader ? 0.03 : pos <= 3 ? 0.018 : 0.01)
          ? 'scandal'
          : null;
    const eventMultiplier = dayEvent === 'campaign'
      ? rand(1.25, 1.65)
      : dayEvent === 'viral'
        ? rand(1.7, 2.4)
        : dayEvent === 'scandal'
          ? rand(0.38, 0.72)
          : 1;
    // A shop's daily form is volatile enough that a strong week can overtake an established name.
    const form = 1 + 0.2 * Math.sin(today / 9 + hash(r.id));
    const branchCount = Math.max(0, r.branches || 0);
    const departmentCount = (r.departments || []).length;
    const expansionLift = 1 + branchCount * 0.28 + departmentCount * 0.075 + (r.wholesaleActive ? 0.16 : 0);
    // A runaway leader saturates: customers start trying the shops everyone else is talking about.
    const saturation = isLeader ? 1 / (1 + 0.3 * Math.log2(leadGap)) : 1;
    const takings = saturation * DAILY[r.tier] * expansionLift * r.skill * form * repK * followK * ramp * rand(0.58, 1.48) * eventMultiplier * (r.stars === 1 ? 0.9 : r.stars >= 3 ? 1.1 : 1);
    r.week.push(takings);
    r.week = r.week.slice(-7);
    const stockShare = clamp(STOCK_SHARE[r.tier] + (r.wholesaleActive ? 0.05 : 0), 0.3, 0.78);
    const branchRunning = branchCount * Math.max(5_000, t.running * 0.22);
    const departmentRunning = departmentCount * 2_500;
    const wholesaleRunning = r.wholesaleActive ? 7_000 : 0;
    // The top shops carry heavier overheads: bigger teams, PR, security and the cost of staying on top.
    // The further ahead the leader runs, the heavier it gets.
    const topShare = isLeader ? clamp(0.08 + 0.07 * Math.log2(leadGap), 0.08, 0.3) : pos <= 3 ? 0.04 : 0;
    const topCost = takings * topShare;
    let dailyCosts = takings * stockShare + t.running + branchRunning + departmentRunning + wholesaleRunning + topCost;
    r.cash += takings * (1 - stockShare) - t.running - branchRunning - departmentRunning - wholesaleRunning - topCost;
    if (today % 7 === 0) {
      const weeklyCosts = t.rent * [0, 0.75, 1, 1.33, 1.75][r.stars] + WAGES[r.tier] + branchCount * t.rent * 0.55;
      r.cash -= weeklyCosts;
      dailyCosts += weeklyCosts;
    }
    r.weekCosts = [...(r.weekCosts || []), dailyCosts].slice(-7);
    // reputation drifts toward what their skill earns, with small daily swings.
    const target = 30 + r.skill * 45;
    r.rep = clamp(r.rep + (target - r.rep) * 0.04 + rand(-1.5, 1.5), 5, 99);
    const priorFollowers = r.followers;
    r.followers = Math.max(0, Math.round(r.followers * (1 + ((r.rep - 45) / 9000) * followerScale) + rand(0, 6) * (r.tier + 1)));
    const baseBrand = r.brand || brandFromLegacy(r.rep, priorFollowers, r.tier);
    r.brand = {
      awareness: clamp(baseBrand.awareness + (r.followers > priorFollowers ? 0.12 : -0.04) + (dayEvent === 'campaign' ? 1.15 : 0), 5, 100),
      prestige: clamp(baseBrand.prestige + (r.skill > 1.1 ? 0.1 : -0.03) + (dayEvent === 'scandal' ? -0.9 : 0), 5, 100),
      trendInfluence: clamp(baseBrand.trendInfluence + (dayEvent === 'viral' ? rand(1.5, 3.2) : dayEvent === 'campaign' ? 0.25 : -0.08), 5, 100),
      loyalty: clamp(baseBrand.loyalty + (r.skill > 1.05 ? 0.08 : -0.04) + (dayEvent === 'scandal' ? -0.65 : 0), 5, 100),
      reliability: clamp(baseBrand.reliability + (r.cash < 0 ? -0.16 : 0.03) + (dayEvent === 'scandal' ? -0.25 : 0), 5, 100),
    };
    r.assetValue = Math.max(0, Math.round(TIERS[r.tier].moveIn * 0.8 + TIERS[r.tier].rent * 2));
    const bankSavings = Math.max(0, r.savings || 0);
    if (r.cash < TIERS[r.tier].rent && bankSavings > 0) {
      const released = Math.min(bankSavings, TIERS[r.tier].rent - r.cash);
      r.cash += released;
      r.savings = bankSavings - released;
    } else if (r.cash > TIERS[r.tier].rent * 5 + TIERS[r.tier].moveIn * 0.5) {
      const reserve = Math.min(Math.round((r.cash - TIERS[r.tier].rent * 3) * 0.02), Math.max(0, r.cash - TIERS[r.tier].rent * 3));
      r.cash -= reserve;
      r.savings = bankSavings + reserve;
    }
    // Campaigns cost money but can turn into customers; aggressive rivals spend more readily.
    if (dayEvent === 'campaign') {
      const campaignCost = Math.round(takings * rand(0.07, 0.13));
      r.cash -= campaignCost;
      r.weekCosts[r.weekCosts.length - 1] = (r.weekCosts[r.weekCosts.length - 1] || 0) + campaignCost;
      r.followers += Math.round((rand(90, 260) * (r.tier + 1) + takings / 10_000 * rand(1, 3)) * followerScale);
      r.rep = clamp(r.rep + rand(0.2, 0.8), 5, 99);
      if (r.main) news.push({ kind: 'campaign', r });
    }
    // Player and rivals share the same follower/promotion discovery and visit-follow-through model.
    // A signature address is earned: any established flagship with a strong name qualifies.
    const signatureProperty = r.tier >= 4 && r.rep >= 75 && r.stars >= 2;
    const celebrityProfile = {
      reputation: r.rep,
      followers: r.followers || 0,
      shopTierIndex: r.tier,
      awareness: r.brand?.awareness,
      prestige: r.brand?.prestige,
      trendInfluence: r.brand?.trendInfluence,
      loyalty: r.brand?.loyalty,
      reliability: r.brand?.reliability,
    };
    const celebrityScheduled = celebrityIsScheduled(r.tier, today, signatureProperty);
    const maxDailyCelebrityVisits = maximumCelebrityVisitsPerDay(r.tier, signatureProperty);
    const promotionLevel = r.promotion?.active && r.promotion.target !== 'warehouse'
      ? r.promotion.level
      : dayEvent === 'campaign'
        ? (r.tier >= 5 ? 'luxury' : r.tier >= 3 ? 'premium' : 'citywide')
        : undefined;
    const guestTiers: number[] = [];
    if (celebrityScheduled) {
      const discoveryChance = celebrityDiscoveryChance(r.tier, signatureProperty, celebrityProfile, promotionLevel);
      const followThroughChance = celebrityVisitFollowThroughChance(celebrityProfile);
      for (let candidate = 0; candidate < 3 && guestTiers.length < maxDailyCelebrityVisits; candidate++) {
        if (!chance(discoveryChance)) continue;
        if (!chance(followThroughChance)) continue;
        const celebrityTier = chooseCelebrityTierForShop(r.tier, signatureProperty, celebrityProfile);
        if (celebrityTier >= 0) guestTiers.push(celebrityTier);
      }
    }
    if (guestTiers.length > 0) {
      r.lastCelebrityVisitDay = today;
      // Each guest is a separate purchase outcome, so publicity, followers, revenue and stock costs
      // can all accumulate when a busy premium shop receives more than one celebrity.
      for (let guestIndex = 0; guestIndex < guestTiers.length; guestIndex++) {
        const celebrityTier = guestTiers[guestIndex];
        const namedGuest = celebrityProfileForTier(celebrityTier);
        const { budget, spendFloor } = celebrityAmountsForTier(celebrityTier, Math.random, r.tier, signatureProperty);
        const currentBrand: BrandMetrics = r.brand || brandFromLegacy(r.rep, r.followers || 0, r.tier);
        const purchaseChance = clamp(0.80 + (r.skill - 1) * 0.20 + (r.rep - 50) / 500, 0.55, 0.92);
        const premiumOrderChance = clamp(0.48 + (r.skill - 1) * 0.60 + (r.rep - 50) * 0.002 +
          (currentBrand.reliability - 50) * 0.0015, 0.15, 0.90);
        const bought = chance(purchaseChance);
        const premiumOrder = bought && chance(premiumOrderChance);
        const regularOrderFloor = [250_000, 900_000, 1_500_000, 3_000_000, 5_000_000][celebrityTier] || 250_000;
        const celebritySpend = !bought ? 0 : Math.min(budget, Math.max(spendFloor, regularOrderFloor));
        const tipRate = premiumOrder ? 0.05 + celebrityTier * 0.02 : 0.015 + celebrityTier * 0.005;
        const celebrityTip = Math.round(celebritySpend * tipRate);
        const celebrityRevenue = celebritySpend + celebrityTip;
        const celebrityCosts = Math.round(celebritySpend * CELEBRITY_FULFILMENT_RATE);
        r.week[r.week.length - 1] = (r.week[r.week.length - 1] || 0) + celebrityRevenue;
        r.cash += celebrityRevenue - celebrityCosts;
        r.weekCosts[r.weekCosts.length - 1] = (r.weekCosts[r.weekCosts.length - 1] || 0) + celebrityCosts;
        dailyCosts += celebrityCosts;
        r.rep = clamp(r.rep + (premiumOrder ? rand(0.8, 2.2) : bought ? rand(0.1, 0.5) : -rand(0.3, 1.1)), 5, 99);
        if (bought) {
          r.followers += Math.round(followerScale * (premiumOrder
            ? rand(250, 1_800) * (r.tier + 1) + celebritySpend / 100_000 * rand(2, 8)
            : rand(20, 100) * (r.tier + 1)));
        }
        r.brand = {
          ...currentBrand,
          awareness: clamp(currentBrand.awareness + (premiumOrder ? rand(0.8, 2.1) : bought ? rand(0.1, 0.6) : -rand(0.2, 0.7)), 5, 100),
          prestige: clamp(currentBrand.prestige + (premiumOrder ? rand(0.4, 1.4) : bought ? rand(0.1, 0.5) : -rand(0.5, 1.1)), 5, 100),
          trendInfluence: clamp(currentBrand.trendInfluence + (premiumOrder ? rand(0.5, 1.7) : bought ? rand(0.1, 0.7) : -rand(0.3, 0.9)), 5, 100),
        };
        news.push({
          kind: 'celebrity', r, spend: celebrityRevenue, bought, premiumOrder, celebrityTier,
          celebrityName: `${namedGuest.name} · ${namedGuest.rank}`,
        });
      }
    }
    // Bad weeks still hurt: theft, a landlord's surprise charge or a dead generator.
    if (chance(0.025)) { const incidentCost = Math.round(takings * rand(2, 4)); r.cash -= incidentCost; r.weekCosts[r.weekCosts.length - 1] = (r.weekCosts[r.weekCosts.length - 1] || 0) + incidentCost; }
    if (dayEvent === 'viral') {
      r.followers += Math.round(rand(1_200, 4_800) * (r.tier + 1) * followerScale);
      r.rep = clamp(r.rep + rand(3, 7), 0, 99);
      news.push({ kind: 'viral', r });
    } else if (dayEvent === 'scandal') {
      r.rep = clamp(r.rep - rand(6, 12), 0, 99);
      // Bad press costs followers too, and the bigger the shop the louder the unfollows.
      r.followers = Math.round(r.followers * (1 - rand(0.02, 0.06) * (isLeader ? 1.5 : 1)));
      const scandalCost = Math.round(DAILY[r.tier] * rand(0.9, 1.8));
      r.cash -= scandalCost;
      r.weekCosts[r.weekCosts.length - 1] = (r.weekCosts[r.weekCosts.length - 1] || 0) + scandalCost;
      news.push({ kind: 'scandal', r });
    }
    // Established rivals reinvest retained earnings in a branch, wholesale, or a new department.
    // Only one capital project can be bought per rival per week, and a rent reserve is protected.
    const departmentNames = r.departments || [];
    const reserve = TIERS[r.tier].rent * 3;
    let expansionInvestmentMade = false;
    if (today % 7 === hash(r.id) % 7 && today - r.moved > 14 && r.cash > reserve + 1_250_000) {
      const canOpenBranch = r.tier >= 3 && branchCount < 3 && r.cash > reserve + 12_000_000;
      const canOpenWholesale = r.tier >= 2 && !r.wholesaleActive && r.cash > reserve + 8_000_000;
      const preferredDepartment = r.speciality === 'bridal' ? 'Bridal & Occasionwear'
        : r.speciality === 'menswear' ? 'Menswear' : 'Accessories';
      const departmentCost = preferredDepartment === 'Bridal & Occasionwear' ? 2_500_000
        : preferredDepartment === 'Menswear' ? 1_800_000 : 1_250_000;
      const canOpenDepartment = r.tier >= (preferredDepartment === 'Accessories' ? 1 : 2)
        && departmentNames.length < 3 && !departmentNames.includes(preferredDepartment)
        && r.cash > reserve + departmentCost;
      if (canOpenBranch && chance(0.5)) {
        r.cash -= 7_500_000;
        r.branches = branchCount + 1;
        expansionInvestmentMade = true;
        // Branch assets are already valued from r.branches in netWorthRival; do not double-count them in assetValue.
        growthNotes.push({ owner: r.owner, shop: r.shop, detail: 'opened branch ' + r.branches + ' and committed ₦7,500,000 to its setup' });
      } else if (canOpenWholesale && chance(0.55)) {
        r.cash -= 5_000_000;
        r.wholesaleActive = true;
        expansionInvestmentMade = true;
        growthNotes.push({ owner: r.owner, shop: r.shop, detail: 'launched wholesale operations with a ₦5,000,000 stock and fulfilment investment' });
      } else if (canOpenDepartment && chance(0.7)) {
        r.cash -= departmentCost;
        r.departments = [...departmentNames, preferredDepartment];
        expansionInvestmentMade = true;
        growthNotes.push({ owner: r.owner, shop: r.shop, detail: 'opened its ' + preferredDepartment + ' department for ₦' + departmentCost?.toLocaleString('en-NG') });
      }
    }
    // Record operating profit before making the next investment decision.
    // Capex is an asset movement, not an operating expense, so it stays outside this history.
    r.profitHistory = [...(r.profitHistory || []), (r.week[r.week.length - 1] || 0) - (r.weekCosts[r.weekCosts.length - 1] || 0)].slice(-28);

    // Service family bridge credit from cash above a three-rent reserve. Principal repayment reduces both cash and debt.
    if (today % 7 === 0 && (r.debt || 0) > 0) {
      const safeReserve = TIERS[r.tier].rent * 3;
      const repayment = Math.min(Math.max(0, r.debt || 0), Math.round(Math.max(0, r.cash - safeReserve) * 0.15));
      if (repayment > 0) {
        r.cash -= repayment;
        r.debt = Math.max(0, (r.debt || 0) - repayment);
      }
    }

    // Move up only if the next tier is affordable from liquid assets and recent profits can sustain its bills.
    const next = TIERS[r.tier + 1];
    // The shop on top is careful about the next big move: it wants a much fatter cushion first.
    const leaderCaution = isLeader ? 2 : 1;
    if (next && !expansionInvestmentMade && today - r.moved > (isLeader ? 28 : 14) && rivalCanAffordTierUpgrade(r, r.tier + 1)
      && Math.max(0, r.cash) + Math.max(0, r.savings || 0) >= (next.moveIn + next.rent * 3) * leaderCaution) {
      const cashNeeded = next.moveIn + next.rent * 3;
      const savingsToCash = Math.min(Math.max(0, r.savings || 0), Math.max(0, cashNeeded - r.cash));
      if (savingsToCash > 0) {
        r.savings = Math.max(0, (r.savings || 0) - savingsToCash);
        r.cash += savingsToCash;
      }
      if (r.cash >= cashNeeded) {
        const previousTier = r.tier;
        r.cash -= next.moveIn;
        r.tier += 1;
        r.stars = r.skill > 1.05 ? 3 : 2;
        r.moved = today;
        adjustRivalPropertyAssetValue(r, previousTier, r.tier);
        news.push({ kind: 'up', r });
      }
    }

    r.broke = r.cash < 0 ? r.broke + 1 : 0;
    if (r.broke >= 10 && r.tier > 0) {
      const previousTier = r.tier;
      r.tier -= 1;
      r.stars = 1;
      adjustRivalPropertyAssetValue(r, previousTier, r.tier);
      const rescueAmount = rescueRivalCash(r, TIERS[r.tier].rent * 2);
      r.broke = 0;
      r.moved = today;
      r.rep = clamp(r.rep - 6, 0, 99);
      news.push({ kind: 'down', r });
      if (rescueAmount > 0) news.push({ kind: 'rescue', r, rescueAmount });
    } else if (r.broke >= 14) {
      // A kiosk can keep going through a recorded, interest-free family bridge loan.
      const rescueAmount = rescueRivalCash(r, TIERS[0].rent * 2);
      r.broke = 0;
      if (rescueAmount > 0) news.push({ kind: 'rescue', r, rescueAmount });
    }
    rivals.push(r);
  }
  if (today % 7 === 0) weeklyShakeUp(rivals, news);
  s = { ...s, rivals };
  for (const note of growthNotes) s = gist(s, note.shop + ' expands its fashion empire', note.owner + ' ' + note.detail + '. The investment raises future sales potential but adds real operating costs.', note.shop);

  // news about other shops
  for (const n of news) {
    const r = n.r;
    if (n.kind === 'celebrity') {
      s = announceCelebrityVisit(s, {
        shopId: r.id,
        shopName: r.shop,
        ownerName: r.owner,
        celebrityName: n.celebrityName || (n.premiumOrder ? 'a celebrity client' : 'a celebrity guest'),
        spend: n.spend || 0,
        bought: !!n.bought,
        premiumOrder: !!n.premiumOrder,
      });
    } else if (n.kind === 'up') {
      s = gist(s, `${r.shop} moves to a ${TIERS[r.tier].name}!`, `${r.owner} has upgraded. Sources say the rent is not small.`, r.id);
      if (r.main) {
        s = talk(s, r, pick([`Guess who just signed for a ${TIERS[r.tier].name}? 😌🔑`, `New shop, new level. ${TIERS[r.tier].name} babyyyy 🎉`, `God did! We have moved to a ${TIERS[r.tier].name} 🙏🏾`]), 'brag');
        s = rivalPost(s, r, pick([`New shop, new chapter 🔑✨ ${r.shop} is now a ${TIERS[r.tier].name}. Come and see us!`, `We moved UP 😌🔑 ${TIERS[r.tier].name} in ${r.area}. God did 🙏🏾`]), false, 'brag');
        for (const o of mainRivals(s).filter((x) => x.id !== r.id && chance(0.5))) s = inGroup(s, o, chance(0.5) ? pick(LINES.jealous) : pick(LINES.welcomeUp(r.owner.split(' ')[0])));
      }
    } else if (n.kind === 'down') {
      s = gist(s, `Landlord locks ${r.shop}!`, `${r.owner} could not pay rent and has moved to a ${TIERS[r.tier].name}. Lagos is hard o.`, r.id, true);
      for (const o of mainRivals(s).filter((x) => x.id !== r.id && chance(0.35))) s = inGroup(s, o, pick(LINES.mock(r.owner.split(' ')[0])));
    } else if (n.kind === 'viral') {
      s = gist(s, `${r.shop} goes viral 🔥`, `A look from ${r.owner}'s shop is all over Gidigram. The sudden attention has brought a surge of bookings and followers.`, r.id);
      if (r.main) s = rivalPost(s, r, pick(LINES.brag[r.personality]));
    } else if (n.kind === 'campaign') {
      s = gist(s, `${r.shop} launches an aggressive campaign`, `${r.owner} is spending on promotions and discounts to pull customers from rival boutiques. It is working, but the marketing bill is not small.`, r.id);
    } else if (n.kind === 'poach' && n.from) {
      const from = n.from;
      s = gist(s, `${r.shop} poaches ${from.owner.split(' ')[0]}'s head stylist 👀`, `The stylist behind some of ${from.shop}'s biggest looks has moved to ${r.owner}. Insiders say the offer was "too sweet to refuse".`, r.id, true);
      if (r.main && chance(0.6)) s = inGroup(s, r, pick(['New hire alert 😌 Some people did not know what they had.', 'My team just got stronger 💪🏾 No names, no stress.', 'When you treat staff well, talent finds you 😌']));
      if (from.main && chance(0.5)) s = inGroup(s, from, pick(['Staff come, staff go. The brand remains 💅🏾', 'Let them go. I trained one, I will train ten.', 'Some people cannot build, they can only poach 🙄']));
    } else if (n.kind === 'investor') {
      s = gist(s, `${r.shop} lands an investor 💰`, `${r.owner} has secured ${naira(n.amount || 0)} from a private investor to grow the business. Bigger premises may be next.`, r.id);
      if (r.main) s = rivalPost(s, r, pick(['New partners, new chapter 🤝✨ Big things loading…', 'God has sent helpers 🙏🏾 Watch this space 👀']), false, 'brag');
    } else if (n.kind === 'rescue') {
      s = gist(s, `${r.shop} secures family bridge credit`,
        `${r.owner} borrowed ${naira(n.rescueAmount || 0)} after a cash crisis to keep trading. The amount is recorded as a liability; future surplus cash will repay it before further expansion.`,
        r.id, true);
    } else {
      s = gist(s, `Customer drags ${r.shop} online`, `"They spoilt my wedding look," says a bride. ${r.owner} has not responded.`, r.id, true);
    }
  }

  // everyday chatter, brags and shade at Divine
  for (const r of mainRivals(s)) {
    if (chance(0.18)) s = chance(0.6) ? talk(s, r, pick(LINES.brag[r.personality]), 'brag') : inGroup(s, r, pick(LINES.brag[r.personality]), { ctx: { kind: 'brag', rivalId: r.id } });
    if (chance(0.3)) s = rivalPost(s, r, pick(LINES.brag[r.personality]));
    // Big days get bragged about: rich clients and, for bigger shops, official contracts.
    if (r.tier >= 1 && chance(0.06)) s = rivalPost(s, r, pick([`Big madam in the shop today 👑 Full wardrobe, no price talk 😌💸 #LagosLuxury`, `When the rich client says "do anything you like" ✨ #${r.shop.replace(/[^A-Za-z]/g, '')}`, `Luxury client, luxury look 💎 Booked again for next week`]), false, 'brag');
    if (r.tier >= 2 && chance(0.03)) {
      s = rivalPost(s, r, pick([`Official supplier for a government event 📦🇳🇬 Signed and delivered`, `Another office contract delivered on time 😌 Thank you for the trust`]), false, 'brag');
      s = gist(s, `${r.shop} lands an official clothing contract`, `${r.owner} confirmed a government supply deal this week. The fashion group chat is talking.`, r.id);
    }
    // shade: more when Divine is doing well, and from those who dislike her
    const threat = s.today.bestScore >= 85 || lastRank(s, 'you') > youRank ? 0.12 : 0.04;
    if (chance(threat * (0.4 + r.aggression) * (r.feeling < 0 ? 1.5 : 1))) {
      const line = pick(LINES.shade[r.personality]);
      if (chance(0.5)) s = talk(s, r, line, 'shade');
      else s = talk(s, r, line, 'bait', true);
      if (chance(0.3)) s = rivalPost(s, r, `Some people in ${s.listing.area} should stick to selling pure water 😂 #notsubbing`, true);
    }
  }
  for (const r of s.rivals.filter((x) => !x.main && chance(0.05))) s = rivalPost(s, r, pick(LINES.brag.pro));

  // Sunday: publish the official Top 20, but keep day-to-day movement separately.
  if (today % 7 === 0) s = publishLadder(s);
  const dailyOrder = ladder(s).map((row) => row.id);
  s = {
    ...s,
    dailyRanking: [...(s.dailyRanking || []), { day: today, order: dailyOrder }].slice(-30),
  };
  return s;
}

/**
 * Weekly shake-up so no shop runs away forever. Skill drifts with results: the shop on top
 * gets comfortable while hungry shops below improve. The leader loses talent to rivals,
 * and shops that fall behind can attract investors. Mutates the rivals passed in.
 */
function weeklyShakeUp(rivals: Rival[], news: { kind: 'poach' | 'investor' | string; r: Rival; from?: Rival; amount?: number }[]): void {
  const order = [...rivals].sort((a, b) => rivalScore(b) - rivalScore(a));
  order.forEach((r, i) => {
    // Main rivals settle around a competitive 1.05; background shops around their own natural level.
    const home = r.main ? 1.05 : Math.min(1.05, ROSTER.find((x) => x.id === r.id)?.skill ?? 1);
    let drift = rand(-0.008, 0.008) + (home - r.skill) * 0.1;
    if (i === 0 && r.skill > 1) drift -= 0.015;
    else if (i < 3 && r.skill > 1) drift -= 0.005;
    else if (i >= 5 && r.main && r.skill < 1.12) drift += 0.01;
    r.skill = Math.round(clamp(r.skill + drift, 0.85, 1.22) * 1000) / 1000;
  });
  // Top talent gets tempted away from the leader by a hungrier shop.
  const leader = order[0];
  if (leader && chance(0.35)) {
    const hunters = order.slice(1, 9).filter((r) => r.tier >= 1);
    const hunter = hunters.find((r) => r.main && chance(0.5)) || (hunters.length ? pick(hunters) : undefined);
    if (hunter) {
      const swing = rand(0.02, 0.04);
      leader.skill = Math.round(clamp(leader.skill - swing, 0.85, 1.22) * 1000) / 1000;
      hunter.skill = Math.round(clamp(hunter.skill + swing, 0.85, 1.22) * 1000) / 1000;
      leader.rep = clamp(leader.rep - rand(1, 3), 5, 99);
      news.push({ kind: 'poach', r: hunter, from: leader });
    }
  }
  // Investors back shops that are behind but trading well enough to grow.
  order.slice(3).forEach((r) => {
    // Main rivals can be backed all the way to the top; background shops only up to a mid-size shop,
    // so the Top 20 doesn't fill up with empires.
    const ceiling = r.main ? Math.min(TIERS.length - 1, order[0].tier) : 3;
    if (r.tier >= ceiling || r.cash < 0 || (r.debt || 0) > 0) return;
    if (!chance(r.main ? 0.13 : 0.035)) return;
    const amount = Math.round((TIERS[r.tier + 1].moveIn * 1.6 + TIERS[r.tier + 1].rent * 3) * rand(0.9, 1.2) / 100_000) * 100_000;
    r.cash += amount;
    news.push({ kind: 'investor', r, amount });
  });
}

export function publishLadder(s0: GameState): GameState {
  let s = s0;
  const rows = ladder(s);
  const order = rows.map((r) => r.id);
  const prev = lastRank(s, 'you');
  const now = order.indexOf('you') + 1;
  s = { ...s, ranking: [...(s.ranking || []), { week: Math.floor(s.day / 7), order }].slice(-12) };
  const top3 = rows.slice(0, 3).map((r, i) => `${i + 1}. ${r.name}`).join(', ');
  s = gist(s, `Top 20 Boutiques in Lagos: week ${Math.floor(s.day / 7)}`, `${top3}. Asanwa Boutique is #${now}${prev ? ` (${prev > now ? `up from #${prev}` : prev < now ? `down from #${prev}` : 'no change'})` : ''}.`, undefined, true);
  s = gramNote(s, `🏆 This week's Top 20 Boutiques is out! #1 ${rows[0].name}. Asanwa Boutique: #${now}.`, 'news');
  if (prev && now < prev) {
    const passed = rows.slice(now, prev).map((r) => rivalById(s, r.id)).filter((r): r is Rival => !!r && r.main);
    for (const r of passed.slice(0, 2)) s = talk(s, r, pick(LINES.jealous), 'jealous');
    s = say(s, 'Deborah', `Sis!! You're #${now} on the Top 20 now! Tolani was asking me who your landlord is 👀`, { tone: 'good' });
    s = addBrag(s, 'top20', `Up to #${now} on the Top 20`, `Asanwa Boutique climbed from #${prev} to #${now} on this week's Top 20.`, now <= 3 ? 4 : 2);
  }
  return s;
}

/** When Divine moves into a bigger shop, the group chat reacts. */
export function reactToMove(s0: GameState, up: boolean): GameState {
  let s = s0;
  if (!s.rivals?.length) return s;
  if (up) {
    s = gist(s, `Asanwa Boutique moves to ${s.listing.area}!`, `Divine has signed for a ${TIERS[s.tier].name} on ${s.listing.street}. Her rivals are watching.`, 'you');
    s = addBrag(s, 'upgrade', `We moved to a ${TIERS[s.tier].name}`, `Asanwa Boutique now trades from a ${TIERS[s.tier].name} on ${s.listing.street}, ${s.listing.area}.`, 3 + Math.min(2, Math.floor(s.tier / 3)));
    for (const r of mainRivals(s).filter(() => chance(0.6))) s = r.feeling < 10 ? talk(s, r, pick(LINES.jealous), 'jealous') : inGroup(s, r, pick(LINES.welcomeUp('Divine')));
  } else {
    s = gist(s, `Landlord throws Asanwa Boutique out!`, `Divine has moved to a ${TIERS[s.tier].name}. Rivals are laughing in the group chat.`, 'you', true);
    for (const r of mainRivals(s).filter((x) => x.feeling < 20 && chance(0.6))) s = talk(s, r, pick(LINES.mock('Divine')), 'mock');
  }
  return s;
}

/** A rival's name for staff-poaching messages. */
export function poacher(s: GameState): Rival | undefined {
  const near = (s.rivals || []).filter((r) => r.tier >= s.tier && r.tier <= s.tier + 2);
  return near.length ? pick(near) : undefined;
}
