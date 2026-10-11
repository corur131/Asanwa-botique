import { CharacterConfig, FabricId, Makeup } from '../types/character';
import { Occasion } from '../constants/catalog';
import type { Listing, Placed } from './shop';

export type CustomerClass = 'poor' | 'middle' | 'rich';

/** What an item in stock is. Clothes use the wardrobe slots; the rest are accessory kinds. */
export type StockKind = 'top' | 'bottom' | 'dress' | 'outer' | 'shoes' | 'bag' | 'headwear' | 'necklace' | 'wrist' | 'glasses' | 'earrings';

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
  /** How they feel about Divine, -100 (enemy) … 100 (friend). */
  feeling: number;
  look: CharacterConfig;
  male?: boolean;
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

export interface StaffMember {
  id: string;
  name: string;
  level: number;
  wage: number;
  loyalty: number;
  trained: boolean;
  weeks: number;
  look: CharacterConfig;
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
  staffServed: number;
  impatient?: number;
  doorLost?: number;
  heatLost?: number;
  closedOn?: number;
  fuel?: number;
  outageMinutes?: number;
  events: string[];
}

export interface ReplyChoice {
  id: 'classy' | 'clap' | 'ignore' | 'accept' | 'decline';
  label: string;
}

export interface Message {
  id: number;
  /** Group chat or DM thread this belongs to (defaults to the sender). */
  chat?: string;
  /** Replies Divine can pick, and what she picked. */
  choices?: ReplyChoice[];
  answered?: string;
  /** What the message is about, for the reply's effect. */
  ctx?: { kind: 'shade' | 'brag' | 'bait' | 'invite'; rivalId?: string; eventId?: string };
  /** Game minute (shop clock) it arrived, if during the day. */
  t?: number;
  day: number;
  from: string;
  text: string;
  tone: 'info' | 'warn' | 'danger' | 'good';
}

export interface GameState {
  version: 4;
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
  stock: Design[];
  regulars: Regular[];
  staff: StaffMember[];
  hireOkDay: number;
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
  power: { gen: boolean; solar: number };
  /** Things said out loud in the shop: NEPA news and customer complaints. */
  shouts: Shout[];
  shoutSeq: number;
  ledger: LedgerLine[];
  followers: number;
  posts: Post[];
  msgSeq: number;
  /** Last message id read, per chat. */
  read: Record<string, number>;
  rivals: Rival[];
  /** Weekly ladder: ids in order ('you' is Divine). */
  ranking: { week: number; order: string[] }[];
  rivalPosts: RivalPost[];
  gist: Gist[];
  drop: Drop | null;
  events: ShowEvent[];
  visit: Visit | null;
  /** Deborah's tip: a celebrity is coming on this day. */
  celebDay?: number;
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
