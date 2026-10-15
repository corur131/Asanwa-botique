import { CharacterConfig, FabricId, Makeup } from '../types/character';
import { Occasion } from '../constants/catalog';
import type { Listing, Placed } from './shop';

export type CustomerClass = 'poor' | 'middle' | 'rich';

/** A serialisable cart line, also used by saved shopper orders. */
export interface ShopperOrderLine {
  key: string;
  kind: StockKind;
  itemId: string;
  fabric?: FabricId;
  color: string;
  color2: string;
  pattern: number;
  pieces: number;
}

/** Aggregated, real item-level demand from completed sales. */
export interface ProductSalesRecord {
  day: number;
  designKey: string;
  kind: StockKind;
  itemId: string;
  fabric: FabricId;
  color: string;
  color2: string;
  pattern: number;
  customerClass: CustomerClass;
  /** Number of pieces sold for this exact design/class/day grouping. */
  units: number;
  tier: number;
}

export type ShopperMission = 'restock' | 'variety' | 'richCustomers' | 'contract';
export type ShopperJobStatus = 'ready' | 'cancelled' | 'purchased';

/** These three ranks deliberately mirror the class-fit rank used by scoreLook(). */
export type ShopperDressRank = 0 | 1 | 2;
export type ShopperPriceBand = 'veryExpensive' | 'millionCouture';
export type ShopperAudience = 'women' | 'men';
export type ShopperProductCategory =
  | 'top' | 'bottom' | 'dress' | 'outer' | 'shoes' | 'bag'
  | 'jewellery' | 'headwear' | 'glasses' | 'hair';

export interface ShopperBuyingPreference {
  audience: ShopperAudience;
  category: ShopperProductCategory;
  /** One or more game dress-ranks: 0 everyday, 1 middle, 2 luxury. */
  ranks: ShopperDressRank[];
  /** Exact per-piece wholesale cost bands, independent of the visual/class rank. */
  priceBands?: ShopperPriceBand[];
}

export interface ShopperJob {
  id: string;
  mission: ShopperMission;
  budget: number;
  estimatedTotal: number;
  status: ShopperJobStatus;
  createdDay: number;
  completedDay: number;
  items: ShopperOrderLine[];
  summary: string;
  contractBrief?: string;
  contractId?: string;
  /** Snapshot of the player's strict category and dressing-rank filters for this order. */
  preferences?: ShopperBuyingPreference[];
  /** Commission already paid to the shopper for this order (absent in older saves). */
  commissionPaid?: number;
  /** Pieces of each order line already paid for, so commission is never charged twice. */
  paidPieces?: Record<string, number>;
}

/** A customer asked for a colour the shop had no clothes in. */
export interface ColourMiss {
  day: number;
  color: string;
  name: string;
}

export type PoliticianContractStatus = 'offered' | 'accepted' | 'fulfilled' | 'failed' | 'declined' | 'expired';

export interface PoliticianContractRequirement {
  kind: StockKind;
  itemId: string;
  label: string;
  quantity: number;
  /** Wholesale cost per piece at the time this contract was offered, for a transparent estimate. */
  unitCost: number;
}

export interface PoliticianContract {
  id: string;
  client: string;
  title: string;
  brief: string;
  offeredDay: number;
  offerExpiresDay: number;
  deadlineDays: number;
  deadlineDay?: number;
  acceptedDay?: number;
  completedDay?: number;
  status: PoliticianContractStatus;
  requirements: PoliticianContractRequirement[];
  reward: number;
  failurePenalty: number;
  penaltyCharged?: number;
}

/** What an item in stock is. Clothes use the wardrobe slots; the rest are accessory kinds. */
export type StockKind = 'top' | 'bottom' | 'dress' | 'outer' | 'shoes' | 'bag' | 'headwear' | 'necklace' | 'wrist' | 'glasses' | 'earrings' | 'hair';

/** One design in the shop: a catalogue item in a chosen fabric and colour, with pieces in stock. */
export interface Design {
  uid: string;
  kind: StockKind;
  itemId: string;
  label: string;
  fabric: FabricId;
  color: string;
  color2: string;
  pattern: number;
  /** Wholesale cost of one piece. */
  cost: number;
  pieces: number;
  displayed: boolean;
  /** A trending drop: looks with it score more until this day. */
  trend?: number;
}

export type Want =
  | { kind: 'color'; color: string; name: string }
  | { kind: 'native' }
  | { kind: 'english' }
  | { kind: 'gele' }
  | { kind: 'nails' }
  | { kind: 'noHeels' }
  | { kind: 'fitted' }
  | { kind: 'covered' }
  | { kind: 'jacket' }
  | { kind: 'hair'; group: string }
  | { kind: 'glam' }
  | { kind: 'naturalFace' };

export interface Customer {
  id: string;
  name: string;
  cls: CustomerClass;
  occasion: Occasion;
  budget: number;
  wants: Want[];
  /** Learnt over repeat visits. */
  taste: { favColor: string; favName: string };
  request: string;
  /** How they walk in. */
  look: CharacterConfig;
  male: boolean;
  influencer: boolean;
  regularId?: string;
  /** Came only for hair and/or makeup: no clothes. */
  service?: 'hair' | 'makeup' | 'both';
  /** A style-off model: Divine's score is compared with a rival's. */
  contest?: { eventId: string; rivalId: string; rivalScore: number; prize: number; title: string };
  /** Celebrity guest created by a premium property visit. */
  celebrity?: { tier: number; rank: string; spendFloor: number };
}

export type Speciality = 'bridal' | 'genz' | 'native' | 'cheap' | 'wigs' | 'menswear' | 'luxury' | 'thrift' | 'everyday';

/** Another boutique on the ladder. Runs on the same economy as Divine's shop. */
export interface Rival {
  id: string;
  owner: string;
  shop: string;
  handle: string;
  /** The five with full personalities and drama; the rest are background shops that still compete. */
  main: boolean;
  personality: 'queen' | 'loud' | 'oldschool' | 'shady' | 'sweet' | 'pro';
  speciality: Speciality;
  area: string;
  tier: number;
  /** Signature-grade premium premises; optional in legacy saves. */
  signature?: boolean;
  stars: number;
  cash: number;
  rep: number;
  followers: number;
  /** How good they are at the business (0.8 weak … 1.3 excellent). */
  skill: number;
  /** How likely to play dirty, 0..1. */
  aggression: number;
  /** Takings over the last 7 days. */
  week: number[];
  /** Modeled operating costs for each matching day in week. */
  weekCosts?: number[];
  /** Daily operating profit history used to keep business valuation from overreacting to one-off celebrity sales. */
  profitHistory?: number[];
  /** Business assets, retained earnings and debt are modeled separately from shop takings. */
  savings?: number;
  debt?: number;
  assetValue?: number;
  brand?: BrandMetrics;
  promotion?: PromotionCampaign;
  /** Extra operating units beyond the original shop. */
  branches?: number;
  departments?: string[];
  wholesaleActive?: boolean;
  /** How they feel about Divine, -100 (enemy) … 100 (friend). */
  feeling: number;
  look: CharacterConfig;
  male?: boolean;
  /** Most recent day a celebrity actually arrived; prevents routine back-to-back visits. */
  lastCelebrityVisitDay?: number;
  /** Day they last moved shop (up or down). */
  moved: number;
  /** Days with cash below zero. */
  broke: number;
}

export interface RivalPost {
  id: string;
  rivalId: string;
  day: number;
  look: CharacterConfig;
  caption: string;
  likes: number;
  shade?: boolean;
}

export interface Gist {
  id: string;
  day: number;
  title: string;
  body: string;
  about?: string;
  hot?: boolean;
}

/** A limited fabric or piece at Yaba market: rivals buy it too. */
export interface Drop {
  day: number;
  kind: StockKind;
  itemId: string;
  label: string;
  fabric: FabricId;
  color: string;
  color2: string;
  pattern: number;
  price: number;
  left: number;
  total: number;
  buyers: string[];
}

/** A style-off or show Divine is invited to. */
export interface ShowEvent {
  id: string;
  title: string;
  host: string;
  day: number;
  rivalId: string;
  prize: number;
  followers: number;
  status: 'invited' | 'accepted' | 'declined' | 'won' | 'lost' | 'missed';
}

/** A rival standing in Divine's shop. */
export interface Visit {
  rivalId: string;
  at: number;
  /** A waiting customer the rival is trying to steal. */
  target?: string;
  line: string;
}

/** Someone inside the shop: waiting, with Divine, or with a staff member. */
export interface Visitor {
  c: Customer;
  /** Game minute they walked in. */
  arrived: number;
  /** Minutes they will wait before walking out. */
  patience: number;
  /** 'divine' or a staff id once someone is styling them. */
  by?: string;
  /** Staff finish at this minute. */
  until?: number;
  /** Divine asked staff to take this one. */
  forStaff?: boolean;
  /** Minutes of patience used up (heat and darkness use it up faster). */
  waited?: number;
  complained?: boolean;
}

/** Someone walking out, for the 3D scene. */
export interface Departure {
  key: string;
  id: string;
  look: CharacterConfig;
  bag: boolean;
}

export interface Shout {
  id: number;
  who: string;
  text: string;
  tone: 'nepa' | 'complain' | 'good' | 'warn';
}

export interface LedgerLine {
  day: number;
  t: number;
  label: string;
  amount: number;
  /** Internal account transfers change the pocket, not total wealth or operating profit. */
  category?: 'transfer' | 'operating' | 'financing' | 'interest';
}

export interface Post {
  id: string;
  day: number;
  look: CharacterConfig;
  name: string;
  caption: string;
  score: number;
  likes: number;
  gained: number;
}

export interface Regular {
  id: string;
  name: string;
  look: CharacterConfig;
  cls: CustomerClass;
  male: boolean;
  visits: number;
  loyalty: number;
  bestScore: number;
  tasteKnown: boolean;
  favColor: string;
  favName: string;
}

export type StaffProfession = 'stylist' | 'makeup';

export interface StaffMember {
  id: string;
  name: string;
  level: number;
  wage: number;
  loyalty: number;
  trained: boolean;
  weeks: number;
  look: CharacterConfig;
  /** Optional for compatibility with existing saves; new hires have a defined profession. */
  profession?: StaffProfession;
  /** A pending raise demand (weekly wage asked for). */
  raiseAsk?: number;
}

/** What Divine puts on the customer. Stock is referenced by design uid. */
export interface StyleChoice {
  top?: string;
  bottom?: string;
  dress?: string;
  outer?: string;
  shoes?: string;
  bag?: string;
  headwear?: string;
  necklace?: string;
  wrist?: string;
  glasses?: string;
  earrings?: string;
  /** UID of a stocked wig, bundle, or braided-hair product. */
  hairpiece?: string;
  hair?: string;
  hairColor?: string;
  makeup?: Makeup;
  makeupLook?: string;
  beard?: string;
}

export interface ScoreBreakdown {
  total: number;
  occasion: number;
  request: number;
  cls: number;
  complete: number;
  harmony: number;
  notes: string[];
  /** Points the shop added (mirror, stations). */
  bonus?: number;
  bonusNotes?: string[];
}

export interface DayLog {
  day: number;
  served: number;
  walkedOut: number;
  lost: number;
  income: number;
  costs: number;
  tips: number;
  bestScore: number;
  repChange: number;
  /** Cash available at the beginning of the in-game day, before morning purchases/transfers. */
  openingCash?: number;
  /** Cash balance recorded when the shop day was closed. */
  closingCash?: number;
  staffServed: number;
  impatient?: number;
  doorLost?: number;
  heatLost?: number;
  /** Walk-ins lost to bad weather. */
  weatherLost?: number;
  closedOn?: number;
  fuel?: number;
  outageMinutes?: number;
  /** Litres poured into the generator today. */
  litres?: number;
  /** Deborah has already told Divine to rest today. */
  tiredWarned?: boolean;
  /** Divine's little jobs today (once each per day). */
  did?: Partial<Record<'tidy' | 'hair' | 'makeup' | 'selfie' | 'tiktok', boolean>>;
  events: string[];
}

/** What Divine is busy doing in the shop (takes shop time). */
export interface Busy {
  uid: string;
  action: string;
  pose: Pose;
  until: number;
}

export type Pose = 'stand' | 'sit' | 'reach' | 'phone' | 'drink' | 'dance' | 'work' | 'count';

/** Electricity and bills for the running week. */
export interface WeekMeter {
  /** kWh drawn from NEPA this week. */
  kwh: number;
}

export interface ReplyChoice {
  id: string;
  label: string;
  /** Short label for the spirit of the reply (e.g. "🔥 Clap back"). */
  tag?: string;
}

export type CollaborationDecision = 'none' | 'accept' | 'counter' | 'reject';

/** AI's proposed response to a concrete pop-up collaboration invitation. Game rules validate it before use. */
export interface CollaborationReply {
  decision: CollaborationDecision;
  eventName: string;
  /** Number of in-game days from today, bounded by the engine. */
  dayOffset: number;
  totalCost: number;
  playerCostSharePct: number;
  playerProfitSharePct: number;
}

/** A real collaboration that has been confirmed and will resolve through the game engine. */
export interface CollaborationEvent {
  id: string;
  partnerId: string;
  partnerName: string;
  eventName: string;
  day: number;
  createdDay: number;
  totalCost: number;
  playerCostSharePct: number;
  playerProfitSharePct: number;
  status: 'scheduled' | 'completed';
  grossRevenue?: number;
  profit?: number;
  playerPayout?: number;
  partnerPayout?: number;
}

export interface Message {
  id: number;
  /** Group chat or DM thread this belongs to (defaults to the sender). */
  chat?: string;
  /** Replies Divine can pick, and what she picked. */
  choices?: ReplyChoice[];
  answered?: string;
  /** The back-and-forth conversation this message belongs to. */
  convo?: string;
  /** What the message is about, for the reply's effect. */
  ctx?: { kind: 'shade' | 'brag' | 'bait' | 'invite' | 'sponsorship'; rivalId?: string; eventId?: string; offerId?: string };
  /** Structured business proposal returned by the AI; only explicit player confirmation makes it real. */
  collaboration?: CollaborationReply;
  /** Result of the player's action on a collaboration proposal. */
  collaborationOutcome?: 'scheduled' | 'declined' | 'unaffordable' | 'already_booked' | 'partner_unable';
  collaborationScheduledDay?: number;
  /** Game minute (shop clock) it arrived, if during the day. */
  t?: number;
  day: number;
  from: string;
  text: string;
  tone: 'info' | 'warn' | 'danger' | 'good';
}

export type LagosWeather = 'sunny' | 'rainy' | 'harmattan' | 'cloudy';

/** Compact memory the AI can use across chat sessions without another API call. */
export interface CharacterMemory {
  /** A short, current summary of the character's relationship and ongoing context with Divine. */
  summary: string;
  /** A few durable, grounded events or facts this character should remember. */
  notes: string[];
  /** In-game day on which this memory was last updated. */
  updatedDay: number;
}

export type PromotionLevel = 'local' | 'citywide' | 'premium' | 'luxury';
export type PromotionMode = 'period' | 'always';
export type BankPocket = 'savings' | 'rentVault' | 'current';

/** Brand indicators evolve over time; the combined Brand Power score is intentionally uncapped. */
export interface BrandMetrics {
  awareness: number;
  prestige: number;
  trendInfluence: number;
  loyalty: number;
  reliability: number;
}

export interface PromotionCampaign {
  active: boolean;
  mode: PromotionMode;
  level: PromotionLevel;
  hourlyBudget: number;
  startedDay: number;
  /** Remaining simulated business hours for a fixed-period campaign. */
  hoursRemaining?: number;
  hoursRun: number;
  totalSpent: number;
  estimatedReach: number;
  /** Optional for legacy saves: warehouse promotion drives wholesale demand instead of followers. */
  target?: 'brand' | 'warehouse';
}

export interface BusinessLoan {
  id: string;
  principal: number;
  balance: number;
  weeklyRatePct: number;
  weeklyPayment: number;
  termWeeks: number;
  nextPaymentDay: number;
  missedPayments: number;
  /** Monetary value of unpaid scheduled instalments; memo balance included in balance, not an extra liability. */
  arrearsBalance?: number;
  /** Cumulative late fees, capped so missed payments cannot create runaway debt. */
  lateFees?: number;
  /** Once defaulted, this remains on the account until the loan is fully cleared. */
  defaulted?: boolean;
  /** Collections begin after five consecutive missed payments. */
  collectionsStarted?: boolean;
  /** One hardship repayment arrangement is allowed per loan. */
  arrangementUsed?: boolean;
  /** One standard-loan renegotiation offer per loan. */
  renegotiationUsed?: boolean;
  loanType?: 'standard' | 'premium';
  /** Formal collections notice has been issued. */
  collectionsNoticeIssued?: boolean;
}

export interface FixedDeposit {
  id: string;
  amount: number;
  ratePct: number;
  openedDay: number;
  maturityDay: number;
}

export interface BusinessBranch {
  id: string;
  name: string;
  area: string;
  tier: number;
  openedDay: number;
  weeklyRent: number;
  assetValue: number;
  /** Lifetime modeled performance; optional to keep older saved games compatible. */
  cumulativeRevenue?: number;
  cumulativeCosts?: number;
  daysTrading?: number;
  /** Most recent completed trading day, used for the branch dashboard. */
  lastDay?: number;
  lastDayRevenue?: number;
  lastDayCosts?: number;
  lastDayProfit?: number;
}


export type ExpansionInvestment = 'branch' | 'wholesale' | 'bridal' | 'accessories' | 'menswear' | 'designer';

export interface DepartmentOperation {
  name: string;
  openedDay: number;
  targetUnits: number;
  inventoryUnits: number;
  inventoryValue: number;
  /** Non-inventory fixtures/brand assets for valuation reconciliation. */
  assetValue?: number;
  unitCost: number;
  unitPrice: number;
  cumulativeRevenue: number;
  cumulativeCosts: number;
  daysTrading: number;
  lastDay?: number;
  lastDayRevenue?: number;
  lastDayCosts?: number;
  lastDayProfit?: number;
}

export interface WholesaleOperation {
  targetUnits: number;
  inventoryUnits: number;
  inventoryValue: number;
  unitCost: number;
  unitPrice: number;
  cumulativeRevenue: number;
  cumulativeCosts: number;
  ordersFulfilled: number;
  ordersMissed: number;
  lastDay?: number;
  lastDayRevenue?: number;
  lastDayCosts?: number;
  lastDayProfit?: number;
}

export interface BusinessExpansionState {
  branches: BusinessBranch[];
  departments: string[];
  /** Detailed department-level stock and operating performance; optional for legacy saves. */
  departmentOperations?: DepartmentOperation[];
  wholesaleActive: boolean;
  /** Inventory and order fulfilment for wholesale, initialized when activated. */
  wholesaleOperation?: WholesaleOperation;
  /** Number of paid wholesale inventory-capacity upgrades. */
  wholesaleUpgradeLevel?: number;
  designerCollections: number;
  /** Earned event credit can offset a future capital expansion purchase. */
  expansionCredit?: number;
  /** Prevents branch, department and wholesale transactions being posted twice for one in-game day. */
  lastProcessedDay?: number;
}

export interface CreditProfile {
  score: number;
  onTimePayments: number;
  latePayments: number;
  defaults: number;
  loansTaken: number;
  lastApplicationDay: number;
}

export interface BankState {
  savings: number;
  rentVault: number;
  rentMode: 'manual' | 'automatic';
  autoRentPercent: number;
  savingsRatePct: number;
  rentVaultRatePct: number;
  fixedDeposits: FixedDeposit[];
  loans: BusinessLoan[];
  /** Last in-game day on which weekly banking was processed; optional for old saves. */
  lastProcessedDay?: number;
  /** Persisted in-game credit record; optional for older save compatibility. */
  creditProfile?: CreditProfile;
  savingsGoalName: string;
  savingsGoalAmount: number;
}

/** Weekly public wealth snapshot; figures are game estimates, not real-world valuations. */
export interface WeeklyWealthSnapshot {
  day: number;
  ownerId: string;
  owner: string;
  shop: string;
  netWorth: number;
  revenue: number;
  costs: number;
  profit: number;
  rank: number;
  previousRank: number;
  wealthChange: number;
  tier: number;
  followers: number;
  brandPower: number;
}

export interface SponsorshipOffer {
  id: string;
  sponsor: string;
  day: number;
  expiresDay: number;
  followersRequired: number;
  payout: number;
  bonusFollowers: number;
  status: 'offered' | 'accepted' | 'declined' | 'expired';
}

export interface GameState {
  version: 5;
  /** Lagos-season weather, optional so older saves continue loading. */
  weather?: LagosWeather;
  /** The shop she rents now. */
  listing: Listing;
  /** Furniture she owns: placed in the room or in storage. */
  furniture: Placed[];
  day: number;
  cash: number;
  rep: number;
  tier: number;
  movedDay: number;
  grace: number;
  /** Rent owed and the day it must be cleared by. */
  lateRent: { amount: number; due: number } | null;
  /** Rent already paid directly to the landlord and reserved as a credit against the next bill. */
  rentPrepaid?: number;
  /** Unpaid operating costs when a recurring bill exceeds available cash; included in liabilities. */
  operatingPayables?: number;
  stock: Design[];
  /** Saved Yaba Mart cart; survives app changes and reloads. */
  marketCart?: ShopperOrderLine[];
  /** Item-level sales used to train tier-aware shopper recommendations. */
  productSales?: ProductSalesRecord[];
  /** Shopper orders and their statuses are part of the saved game. */
  shopperJobs?: ShopperJob[];
  /** Colour requests the racks could not answer; the shopper buys more of these. */
  colourMisses?: ColourMiss[];
  /** Player's reusable Shopper category/rank selections, retained across app opens and reloads. */
  shopperPreferences?: ShopperBuyingPreference[];
  /** Government/office clothing contracts, offer history and deadlines. */
  politicianContracts?: PoliticianContract[];
  regulars: Regular[];
  staff: StaffMember[];
  hireOkDay: number;
  /** Optional security/fuel workflow; absent in older saves. */
  security?: {
    guard?: { id: string; name: string; wage: number; look: CharacterConfig };
    postUid?: string;
    trip?: { remaining: number; total: number; litres: number; cost: number; refillUid?: string; carrier: 'guard' | 'divine' } | null;
    gallons?: { id: string; litres: number }[];
  };
  divine: CharacterConfig;
  slowWeek: boolean;
  phase: 'morning' | 'shop' | 'evening';
  /** Shop clock: game minutes since 8:00am. The shop shuts at 720 (8:00pm). */
  clock: number;
  /** Customers still to come today, by minute. */
  arrivals: { at: number; c: Customer }[];
  inShop: Visitor[];
  /** Customer id Divine is styling. */
  serving: string | null;
  left: Departure[];
  /** NEPA cuts today, in shop minutes (can start before opening and run past closing). */
  outages: { from: number; to: number }[];
  /** Generator on, solar battery minutes, litres in the generator's tank. */
  power: { gen: boolean; solar: number; /** User-selected grid tariff; omitted in older saves. */ tariff?: number; fuel?: number; /** Fuel by generator furniture UID; legacy saves use fuel for the primary generator. */ generatorFuel?: Record<string, number>; /** Rechargeable fan battery, in minutes. */ fanBattery?: number };
  /** Divine's energy, 0..100. Full after a night's sleep. */
  energy?: number;
  /** Appliances switched off (fans, AC, speaker, TV), by furniture uid. */
  off?: Record<string, boolean>;
  busy?: Busy | null;
  meter?: WeekMeter;
  /** Day on which the recurring weekly utility/market bills were settled; guards duplicate close calls. */
  utilityBillDay?: number;
  /** TV channel index, for fun. */
  channel?: number;
  /** WhatsApp conversations that go back and forth. */
  convos?: import('./convos').Convo[];
  /** Lines said lately, so chats don't repeat themselves. */
  said?: string[];
  /** Things said out loud in the shop: NEPA news and customer complaints. */
  shouts: Shout[];
  shoutSeq: number;
  ledger: LedgerLine[];
  followers: number;
  posts: Post[];
  msgSeq: number;
  /** Last message id read, per chat. */
  read: Record<string, number>;
  /** Persistent, compact AI memories keyed by the character's chat name. */
  characterMemories?: Record<string, CharacterMemory>;
  /** Confirmed joint business pop-ups; absent in legacy saves. */
  collaborations?: CollaborationEvent[];
  /** New financial systems are optional in the type so versioned saves can be migrated safely. */
  bank?: BankState;
  businessExpansion?: BusinessExpansionState;
  brand?: BrandMetrics;
  promotion?: PromotionCampaign;
  /** Historical weekly wealth snapshots for every modeled business owner. */
  wealthHistory?: WeeklyWealthSnapshot[];
  /** Sponsored-content opportunities unlocked by social audience growth. */
  sponsorshipOffers?: SponsorshipOffer[];
  lastSponsorshipDay?: number;
  rivals: Rival[];
  /** Versioned one-time rival economy catch-up for existing saves. */
  rivalEconomyVersion?: number;
  /** Official weekly ladder: ids in order ('you' is Divine). */
  ranking: { week: number; order: string[] }[];
  /** Recent daily ladder snapshots, separate from the official weekly history. */
  dailyRanking?: { day: number; order: string[] }[];
  rivalPosts: RivalPost[];
  gist: Gist[];
  drop: Drop | null;
  events: ShowEvent[];
  visit: Visit | null;
  /** Deborah's tip: a celebrity is coming on this day. */
  celebDay?: number;
  /** Last day a celebrity arrived at Divine's shop; optional in existing saves. */
  lastCelebrityVisitDay?: number;
  /** Times Divine has looked around Tolani's shop (Deborah notices). */
  spying: number;
  /** When this copy was saved (ms), to tell which copy is newest. */
  savedAt?: number;
  /** Admin money grants already applied. */
  appliedGrants?: string[];
  today: DayLog;
  history: DayLog[];
  messages: Message[];
  stats: { served: number; totalEarned: number; demotions: number; bestScore: number };
  seed: number;
}

export interface Settlement {
  price: number;
  paid: number;
  tip: number;
  cost: number;
  outcome: 'paid' | 'bargained' | 'walked' | 'refused';
  line: string;
  reaction: 'scream' | 'smile' | 'okay' | 'frown' | 'cry';
  repDelta: number;
  becameRegular: boolean;
}
