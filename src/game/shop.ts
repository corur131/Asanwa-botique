/**
 * The physical shop: listings to rent, the room's floor grid, and furniture.
 * Display space comes from furniture; floor and wall space are the only limits.
 * Prestige = listing stars + what is inside; it drives customer numbers and how many are rich.
 */
import { TIERS } from './economy';

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------
export interface Listing {
  id: string;
  tier: number;
  area: string;
  street: string;
  stars: number; // 1..4
  rent: number;
  moveIn: number;
  landlord: string;
  grace: number;
}

const AREAS: [string, string][][] = [
  [['Herbert Macaulay Way', 'Yaba']],
  [['Alagomeji side street', 'Yaba'], ['Tejuosho plaza', 'Yaba'], ['Adeniran Ogunsanya St', 'Surulere'], ['Allen Avenue', 'Ikeja']],
  [['Bode Thomas St', 'Surulere'], ['Opebi Road', 'Ikeja'], ['Ikeja City Mall row', 'Ikeja'], ['Admiralty Way', 'Lekki Phase 1']],
  [['Admiralty Way', 'Lekki Phase 1'], ['Awolowo Road', 'Ikoyi'], ['Bourdillon Road', 'Ikoyi'], ['Adeola Odeku St', 'Victoria Island']],
  [['Ozumba Mbadiwe Ave', 'Victoria Island'], ['Kingsway Road', 'Ikoyi'], ['Akin Adesola St', 'Victoria Island'], ['Banana Island Road', 'Ikoyi']],
];
const LANDLORDS = [
  ['Mama Bisi', 'Pastor Emeka', 'Iya Tolu', 'Mr Danjuma'],
  ['Mr Okafor', 'Madam Grace', 'Baba Sule', 'Mrs Coker'],
  ['Alhaji Bello', 'Barrister Eze', 'Mrs Lawal', 'Engr. Ade'],
  ['Chief Adeyemi', 'Otunba Ajayi', 'Dr. (Mrs) Bakare', 'Alhaja Shitta'],
];
const STAR_RENT = [0, 0.75, 1, 1.33, 1.75];
const STAR_GRACE = [0, 14, 7, 2, 0];

function rng(seed: number) {
  let x = (seed * 9301 + 49297) % 233280;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

/** The starting kiosk. */
export const KIOSK_LISTING: Listing = { id: 'kiosk', tier: 0, area: 'Yaba', street: 'Herbert Macaulay Way', stars: 1, rent: TIERS[0].rent, moveIn: 0, landlord: 'Mama Put landlord, Iya Sikiru', grace: 7 };

/** Four listings for a shop size. They change every week. */
export function listingsFor(tier: number, week: number): Listing[] {
  if (tier === 0) return [KIOSK_LISTING];
  const t = TIERS[tier];
  const r = rng(week * 97 + tier * 13 + 5);
  const areas = AREAS[tier];
  return [1, 2, 3, 4].map((stars, i) => {
    const [street, area] = areas[i % areas.length];
    const wobble = 0.92 + r() * 0.16;
    const round = (n: number) => Math.round(n / 5_000) * 5_000;
    return {
      id: `L${tier}-${week}-${i}`,
      tier,
      area,
      street,
      stars,
      rent: round(t.rent * STAR_RENT[stars] * wobble),
      moveIn: round(t.moveIn * STAR_RENT[stars] * (0.95 + r() * 0.1)),
      landlord: LANDLORDS[stars - 1][Math.floor(r() * 4)],
      grace: Math.max(0, STAR_GRACE[stars] + (r() < 0.3 ? (stars <= 2 ? -2 : 1) : 0)),
    };
  });
}

/** The cheapest listing of a size (where a demoted shop lands). */
export const cheapestListing = (tier: number, week: number) => listingsFor(tier, week).reduce((a, b) => (b.rent < a.rent ? b : a));

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------
export interface RoomStyle {
  w: number; // floor cells across (x)
  d: number; // floor cells deep (z)
  wall: string;
  wallLow: string;
  floor: string;
  floor2: string;
  trim: string;
  kind: 'container' | 'plaster' | 'boutique' | 'marble' | 'flagship';
  height: number;
  /** 1..4: how well kept the place is (the listing's stars). Never as fine as the next size up. */
  finish: number;
}
export const ROOMS: RoomStyle[] = [
  { w: 5, d: 3, wall: '#5E7A86', wallLow: '#3E525C', floor: '#8C8C86', floor2: '#7C7C76', trim: '#9A5A2E', kind: 'container', height: 2.4, finish: 2 },
  { w: 7, d: 5, wall: '#E2D2AE', wallLow: '#B9A57D', floor: '#C9C2B4', floor2: '#B8B0A0', trim: '#7A5A3A', kind: 'plaster', height: 2.8, finish: 2 },
  { w: 9, d: 6, wall: '#F2C8CC', wallLow: '#D9A3AA', floor: '#B98A5E', floor2: '#A97A50', trim: '#F4E4C8', kind: 'boutique', height: 3, finish: 2 },
  { w: 11, d: 8, wall: '#F4F0EA', wallLow: '#E2D8CA', floor: '#ECE6DC', floor2: '#DCD3C6', trim: '#C9A163', kind: 'marble', height: 3.2, finish: 2 },
  { w: 13, d: 9, wall: '#1E1B22', wallLow: '#141217', floor: '#F2EDE6', floor2: '#1E1B22', trim: '#D4AF37', kind: 'flagship', height: 3.6, finish: 2 },
];

/** Floor size by shop size and stars: better listings are bigger. */
const SIZES: [number, number][][] = [
  [[5, 3]],
  [[8, 5], [9, 5], [9, 6], [10, 6]],
  [[10, 6], [11, 7], [12, 7], [12, 8]],
  [[12, 8], [13, 8], [14, 9], [14, 10]],
  [[14, 9], [15, 10], [16, 10], [17, 11]],
];

function shade(hex: string, toward: string, k: number) {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(toward.slice(1), 16);
  const ch = (v: number, s: number) => (v >> s) & 255;
  const mix = (s: number) => Math.round(ch(a, s) * (1 - k) + ch(b, s) * k);
  return `#${((mix(16) << 16) | (mix(8) << 8) | mix(0)).toString(16).padStart(6, '0')}`;
}

/** The room a listing comes with: size and how well kept it is. */
export function roomOf(l: Pick<Listing, 'tier' | 'stars'>): RoomStyle {
  const base = ROOMS[l.tier];
  const sizes = SIZES[l.tier];
  const [w, d] = sizes[Math.min(sizes.length, Math.max(1, l.stars)) - 1];
  const finish = l.tier === 0 ? 1 : l.stars;
  // tired places look dull and grubby; the best ones are fresh and bright
  const dull = [0, 0.32, 0.16, 0, 0][finish];
  const bright = finish === 4 ? 0.12 : 0;
  const tone = (c: string) => (bright ? shade(c, '#FFFFFF', base.kind === 'flagship' ? 0.02 : bright) : shade(c, '#6E6A62', dull));
  return { ...base, w, d, finish, wall: tone(base.wall), wallLow: tone(base.wallLow), floor: tone(base.floor), floor2: tone(base.floor2), height: base.height + (finish - 2) * 0.1 };
}

export type RoomKey = number | Pick<Listing, 'tier' | 'stars'>;
export const room = (k: RoomKey): RoomStyle => (typeof k === 'number' ? roomOf({ tier: k, stars: k === 0 ? 1 : 2 }) : roomOf(k));

// ---------------------------------------------------------------------------
// Furniture
// ---------------------------------------------------------------------------
export type Mount = 'floor' | 'wall' | 'ceiling' | 'finish';
export type FurnitureGroup = 'Display' | 'Mirrors' | 'Hair & makeup' | 'Seating' | 'Comfort & power' | 'Lighting' | 'Decor' | 'Paint & floor';
export const FURNITURE_GROUPS: FurnitureGroup[] = ['Display', 'Mirrors', 'Hair & makeup', 'Seating', 'Comfort & power', 'Lighting', 'Decor', 'Paint & floor'];
export interface FurnitureDef {
  id: string;
  name: string;
  price: number;
  w: number;
  d: number;
  mount: Mount;
  group: FurnitureGroup;
  /** Items it can show. */
  slots?: number;
  mirror?: number;
  hairBonus?: number;
  makeupBonus?: number;
  seats?: number;
  /** Cooling, 0..1: customers wait longer and reputation grows faster. Needs light or a generator. */
  cool?: number;
  /** Keeps the shop running when NEPA takes light. */
  generator?: boolean;
  wigs?: boolean;
  richBonus?: number;
  /** Customers wait this much longer (0.15 = 15%). */
  patience?: number;
  /** More people walk in (0.05 = 5%). */
  traffic?: number;
  /** Points added to every look's score. */
  scoreBonus?: number;
  /** Bigger tips. */
  tipBonus?: number;
  /** People can walk over it (rugs). */
  walkable?: boolean;
  /** Paint: wall and lower-wall colours. */
  paint?: [string, string];
  /** Flooring: two tile colours. */
  floorTiles?: [string, string];
  prestige: number;
  minTier?: number;
  starter?: boolean;
  note: string;
}

export const FURNITURE: FurnitureDef[] = [
  // display: every rack has its own capacity and takes its own floor space
  { id: 'rustyRail', name: 'Rusty rail', price: 4_000, w: 2, d: 1, mount: 'floor', group: 'Display', slots: 10, prestige: -1, starter: true, note: 'Holds 10. Squeaks when you touch it.' },
  { id: 'woodTable', name: 'Wobbly table', price: 3_000, w: 1, d: 1, mount: 'floor', group: 'Display', slots: 4, prestige: 0, starter: true, note: 'Holds 4 folded.' },
  { id: 'rollingRail', name: 'Rolling rail', price: 12_000, w: 1, d: 1, mount: 'floor', group: 'Display', slots: 8, prestige: 0, note: 'Holds 8. Small, on wheels, fits anywhere.' },
  { id: 'chromeRail', name: 'Chrome rail', price: 25_000, w: 2, d: 1, mount: 'floor', group: 'Display', slots: 15, prestige: 1, note: 'Holds 15. The standard shop rail.' },
  { id: 'zRack', name: 'Z-rack', price: 38_000, w: 2, d: 1, mount: 'floor', group: 'Display', slots: 20, prestige: 1, note: 'Holds 20 on a sloped double bar.' },
  { id: 'doubleRail', name: 'Two-tier rail', price: 48_000, w: 2, d: 1, mount: 'floor', group: 'Display', slots: 24, prestige: 1, minTier: 1, note: 'Holds 24: tops above, skirts below.' },
  { id: 'roundRack', name: 'Round rack', price: 60_000, w: 2, d: 2, mount: 'floor', group: 'Display', slots: 30, prestige: 1, minTier: 1, note: 'Holds 30 all the way round. Needs space.' },
  { id: 'nestingTables', name: 'Nesting tables', price: 30_000, w: 2, d: 1, mount: 'floor', group: 'Display', slots: 12, prestige: 1, note: 'Holds 12 folded, at three heights.' },
  { id: 'shoeRack', name: 'Shoe rack', price: 15_000, w: 1, d: 1, mount: 'floor', group: 'Display', slots: 8, prestige: 0, note: 'Holds 8.' },
  { id: 'spinner', name: 'Accessory spinner', price: 22_000, w: 1, d: 1, mount: 'floor', group: 'Display', slots: 10, prestige: 1, note: 'Holds 10 small pieces: jewellery, glasses, caps.' },
  { id: 'mannequin', name: 'Mannequin', price: 30_000, w: 1, d: 1, mount: 'floor', group: 'Display', slots: 2, prestige: 2, traffic: 0.03, note: 'Holds 2. Dressed up, it pulls people in.' },
  { id: 'woodShelving', name: 'Wooden shelving unit', price: 55_000, w: 2, d: 1, mount: 'floor', group: 'Display', slots: 18, prestige: 2, minTier: 1, note: 'Holds 18 on warm wood shelves.' },
  { id: 'jewelCounter', name: 'Glass jewellery counter', price: 70_000, w: 2, d: 1, mount: 'floor', group: 'Display', slots: 12, prestige: 2, minTier: 1, tipBonus: 0.05, note: 'Holds 12 under a lit glass top. Doubles as your till.' },
  { id: 'goldRail', name: 'Gold display rail', price: 140_000, w: 2, d: 1, mount: 'floor', group: 'Display', slots: 20, prestige: 3, minTier: 2, note: 'Holds 20 on a white plinth.' },
  { id: 'islandTable', name: 'Display island', price: 220_000, w: 2, d: 2, mount: 'floor', group: 'Display', slots: 28, prestige: 3, minTier: 2, note: 'Holds 28. A lit island in the middle of the floor.' },
  { id: 'glassCabinet', name: 'Glass cabinet', price: 300_000, w: 2, d: 1, mount: 'floor', group: 'Display', slots: 16, prestige: 4, minTier: 3, note: 'Holds 16 behind lit glass.' },
  { id: 'wallShelf', name: 'Wall shelves', price: 20_000, w: 2, d: 1, mount: 'wall', group: 'Display', slots: 8, prestige: 1, note: 'Holds 8. Uses no floor space.' },
  { id: 'wallRail', name: 'Wall hanging bar', price: 18_000, w: 2, d: 1, mount: 'wall', group: 'Display', slots: 10, prestige: 0, note: 'Holds 10 hung flat on the wall.' },
  { id: 'shoeWall', name: 'Shoe wall', price: 35_000, w: 2, d: 1, mount: 'wall', group: 'Display', slots: 12, prestige: 1, note: 'Holds 12 on angled ledges.' },
  { id: 'slatwall', name: 'Slatwall panel', price: 55_000, w: 3, d: 1, mount: 'wall', group: 'Display', slots: 18, prestige: 1, minTier: 1, note: 'Holds 18 on hooks and shelves.' },
  { id: 'displayWall', name: 'Lit display wall', price: 450_000, w: 3, d: 1, mount: 'wall', group: 'Display', slots: 30, prestige: 5, minTier: 3, note: 'Holds 30 on a glowing wall.' },
  // mirrors
  { id: 'crackedMirror', name: 'Cracked mirror', price: 2_000, w: 1, d: 1, mount: 'wall', group: 'Mirrors', mirror: 0, prestige: -1, starter: true, note: 'Customers can barely see themselves.' },
  { id: 'wallMirror', name: 'Long wall mirror', price: 12_000, w: 1, d: 1, mount: 'wall', group: 'Mirrors', mirror: 1, prestige: 0, note: '+1 to every score.' },
  { id: 'standMirror', name: 'Standing mirror', price: 30_000, w: 1, d: 1, mount: 'floor', group: 'Mirrors', mirror: 2, prestige: 1, note: '+2 to every score.' },
  { id: 'archMirror', name: 'Arched floor mirror', price: 65_000, w: 1, d: 1, mount: 'floor', group: 'Mirrors', mirror: 2, prestige: 2, note: '+2 to every score, and it looks expensive.' },
  { id: 'goldMirror', name: 'Gold-frame mirror', price: 120_000, w: 1, d: 1, mount: 'floor', group: 'Mirrors', mirror: 3, prestige: 2, minTier: 1, note: '+3 to every score.' },
  { id: 'mirrorWall', name: 'Mirror wall', price: 600_000, w: 3, d: 1, mount: 'wall', group: 'Mirrors', mirror: 5, prestige: 4, minTier: 2, note: '+5 to every score. The selfie spot.' },
  // hair and makeup
  { id: 'hairStation', name: 'Hair station', price: 45_000, w: 1, d: 1, mount: 'floor', group: 'Hair & makeup', hairBonus: 1, wigs: true, prestige: 1, note: 'Needed to install wigs. +1 on hair.' },
  { id: 'hoodDryer', name: 'Hood dryer', price: 35_000, w: 1, d: 1, mount: 'floor', group: 'Hair & makeup', hairBonus: 2, prestige: 1, note: '+2 on hair: sets braids and curls properly.' },
  { id: 'salonChair', name: 'Salon chair and dryer', price: 160_000, w: 1, d: 1, mount: 'floor', group: 'Hair & makeup', hairBonus: 3, wigs: true, prestige: 2, minTier: 1, note: 'Installs wigs. +3 on hair.' },
  { id: 'ringLight', name: 'Ring light', price: 18_000, w: 1, d: 1, mount: 'floor', group: 'Hair & makeup', makeupBonus: 1, prestige: 1, note: '+1 on made-up looks.' },
  { id: 'makeupStation', name: 'Makeup station', price: 75_000, w: 2, d: 1, mount: 'floor', group: 'Hair & makeup', makeupBonus: 3, prestige: 2, note: '+3 on made-up looks.' },
  { id: 'vanity', name: 'Hollywood vanity', price: 200_000, w: 2, d: 1, mount: 'floor', group: 'Hair & makeup', makeupBonus: 4, prestige: 3, minTier: 2, note: '+4 on made-up looks. Bulbs all round the mirror.' },
  { id: 'steamer', name: 'Clothes steamer', price: 25_000, w: 1, d: 1, mount: 'floor', group: 'Hair & makeup', scoreBonus: 1, prestige: 0, note: 'No creases: +1 to every look.' },
  // seating
  { id: 'plasticChair', name: 'Plastic chair', price: 1_500, w: 1, d: 1, mount: 'floor', group: 'Seating', seats: 1, prestige: -1, starter: true, note: 'One person can wait.' },
  { id: 'stool', name: 'Padded stool', price: 9_000, w: 1, d: 1, mount: 'floor', group: 'Seating', seats: 1, prestige: 0, note: 'One person waits, and it doesn\'t look cheap.' },
  { id: 'bench', name: 'Wooden bench', price: 20_000, w: 2, d: 1, mount: 'floor', group: 'Seating', seats: 3, prestige: 0, note: 'Three people can wait.' },
  { id: 'ottoman', name: 'Round ottoman', price: 35_000, w: 1, d: 1, mount: 'floor', group: 'Seating', seats: 2, prestige: 1, note: 'Two people wait. Shoe try-ons too.' },
  { id: 'sofa', name: 'Sofa', price: 110_000, w: 2, d: 1, mount: 'floor', group: 'Seating', seats: 4, prestige: 2, minTier: 1, note: 'Four people wait in comfort.' },
  { id: 'velvetSofa', name: 'Velvet lounge sofa', price: 380_000, w: 3, d: 1, mount: 'floor', group: 'Seating', seats: 6, prestige: 4, minTier: 3, richBonus: 1, note: 'Six people, and the rich ones love it.' },
  // comfort and power
  { id: 'fan', name: 'Standing fan', price: 15_000, w: 1, d: 1, mount: 'floor', group: 'Comfort & power', cool: 0.15, prestige: 0, note: 'A bit cooler: people wait longer. Off when NEPA takes light.' },
  { id: 'ceilingFan', name: 'Ceiling fan', price: 28_000, w: 1, d: 1, mount: 'ceiling', group: 'Comfort & power', cool: 0.2, prestige: 0, note: 'Cooler, and no floor space. Needs light.' },
  { id: 'ac', name: 'Split AC', price: 220_000, w: 1, d: 1, mount: 'wall', group: 'Comfort & power', cool: 0.4, prestige: 2, minTier: 1, note: 'Cold shop: people wait much longer, reputation grows faster. Needs light.' },
  { id: 'standingAc', name: 'Standing AC', price: 380_000, w: 1, d: 1, mount: 'floor', group: 'Comfort & power', cool: 0.55, prestige: 2, minTier: 2, note: 'The coldest shop on the street. Needs light.' },
  { id: 'smallGen', name: '"I better pass my neighbour" generator', price: 70_000, w: 1, d: 1, mount: 'floor', group: 'Comfort & power', generator: true, prestige: -1, note: 'Keeps the lights on when NEPA strikes. Loud.' },
  { id: 'generator', name: 'Soundproof generator', price: 260_000, w: 1, d: 1, mount: 'floor', group: 'Comfort & power', generator: true, prestige: 1, minTier: 1, note: 'Power through every blackout, quietly.' },
  { id: 'inverter', name: 'Inverter and solar', price: 520_000, w: 1, d: 1, mount: 'wall', group: 'Comfort & power', generator: true, prestige: 2, minTier: 2, note: 'Silent power from the sun. Very classy.' },
  { id: 'waterDispenser', name: 'Water dispenser', price: 18_000, w: 1, d: 1, mount: 'floor', group: 'Comfort & power', patience: 0.12, prestige: 0, note: 'Cold water for waiting customers: they wait 12% longer.' },
  { id: 'speaker', name: 'Bluetooth speaker', price: 12_000, w: 1, d: 1, mount: 'floor', group: 'Comfort & power', traffic: 0.05, patience: 0.05, prestige: 0, note: 'Afrobeats pulls people in from the street.' },
  { id: 'tv', name: 'Wall TV (fashion channel)', price: 120_000, w: 2, d: 1, mount: 'wall', group: 'Comfort & power', patience: 0.2, prestige: 1, minTier: 1, note: 'Runway shows on loop: people wait 20% longer.' },
  { id: 'diffuser', name: 'Scent diffuser', price: 15_000, w: 1, d: 1, mount: 'floor', group: 'Comfort & power', patience: 0.05, tipBonus: 0.05, prestige: 1, note: 'The shop smells like money. Slightly bigger tips.' },
  // lighting
  { id: 'bareBulb', name: 'Bare bulb', price: 500, w: 1, d: 1, mount: 'ceiling', group: 'Lighting', prestige: -1, starter: true, note: 'One bulb on a wire.' },
  { id: 'tubeLight', name: 'Fluorescent tube', price: 4_000, w: 1, d: 1, mount: 'ceiling', group: 'Lighting', prestige: 0, note: 'Bright, white, honest.' },
  { id: 'pendants', name: 'Pendant lights', price: 60_000, w: 1, d: 1, mount: 'ceiling', group: 'Lighting', prestige: 2, minTier: 1, note: 'Warm and stylish.' },
  { id: 'trackLights', name: 'Track spotlights', price: 85_000, w: 1, d: 1, mount: 'ceiling', group: 'Lighting', prestige: 2, scoreBonus: 1, minTier: 1, note: 'Spotlights make colours pop: +1 to every look.' },
  { id: 'ledStrip', name: 'LED light strip', price: 35_000, w: 2, d: 1, mount: 'wall', group: 'Lighting', prestige: 1, note: 'A soft glow along the wall.' },
  { id: 'chandelier', name: 'Crystal chandelier', price: 500_000, w: 1, d: 1, mount: 'ceiling', group: 'Lighting', prestige: 5, minTier: 3, note: 'Pure luxury.' },
  // decor
  { id: 'cardboardSign', name: 'Cardboard sign', price: 500, w: 1, d: 1, mount: 'wall', group: 'Decor', prestige: -1, starter: true, note: '"Divine Styles" in marker.' },
  { id: 'paintedSign', name: 'Hand-painted sign', price: 10_000, w: 2, d: 1, mount: 'wall', group: 'Decor', prestige: 1, traffic: 0.04, note: 'A proper sign: more people find you.' },
  { id: 'shopSign', name: 'Lightbox sign', price: 40_000, w: 2, d: 1, mount: 'wall', group: 'Decor', prestige: 2, traffic: 0.08, note: 'Lit at night: more walk-ins.' },
  { id: 'neon', name: 'Neon "Divine" sign', price: 90_000, w: 2, d: 1, mount: 'wall', group: 'Decor', prestige: 3, traffic: 0.12, minTier: 2, note: 'Very Instagram: more walk-ins.' },
  { id: 'wallArt', name: 'Framed fashion prints', price: 25_000, w: 1, d: 1, mount: 'wall', group: 'Decor', prestige: 1, note: 'Art that says "we know fashion".' },
  { id: 'ankaraArt', name: 'Ankara wall art', price: 30_000, w: 2, d: 1, mount: 'wall', group: 'Decor', prestige: 1, note: 'Bold Ankara panels.' },
  { id: 'clock', name: 'Wall clock', price: 6_000, w: 1, d: 1, mount: 'wall', group: 'Decor', prestige: 0, note: 'Tick tock.' },
  { id: 'plant', name: 'Potted plant', price: 8_000, w: 1, d: 1, mount: 'floor', group: 'Decor', prestige: 1, note: 'A bit of green.' },
  { id: 'snakePlant', name: 'Tall snake plant', price: 15_000, w: 1, d: 1, mount: 'floor', group: 'Decor', prestige: 1, note: 'Tall, tidy, impossible to kill.' },
  { id: 'palm', name: 'Indoor palm', price: 45_000, w: 1, d: 1, mount: 'floor', group: 'Decor', prestige: 2, minTier: 1, note: 'Resort energy.' },
  { id: 'flowers', name: 'Fresh flowers', price: 10_000, w: 1, d: 1, mount: 'floor', group: 'Decor', prestige: 1, note: 'Roses on a little stand.' },
  { id: 'rug', name: 'Ankara rug', price: 20_000, w: 2, d: 2, mount: 'floor', group: 'Decor', walkable: true, prestige: 1, note: 'People can walk on it.' },
  { id: 'fluffyRug', name: 'Round fluffy rug', price: 45_000, w: 2, d: 2, mount: 'floor', group: 'Decor', walkable: true, prestige: 2, minTier: 1, note: 'Soft and pink. People can walk on it.' },
  { id: 'persianRug', name: 'Persian rug', price: 150_000, w: 3, d: 2, mount: 'floor', group: 'Decor', walkable: true, prestige: 3, minTier: 2, note: 'Deep red and gold. People can walk on it.' },
  { id: 'curtainCorner', name: 'Curtain changing corner', price: 25_000, w: 1, d: 1, mount: 'floor', group: 'Decor', richBonus: 1, prestige: 1, note: 'Somewhere private to try on: rich clients +1.' },
  { id: 'fittingRoom', name: 'Fitting room', price: 180_000, w: 2, d: 2, mount: 'floor', group: 'Decor', prestige: 3, richBonus: 2, minTier: 1, note: 'Rich clients score +2.' },
  { id: 'windowPodium', name: 'Window display podium', price: 90_000, w: 2, d: 1, mount: 'floor', group: 'Decor', prestige: 2, traffic: 0.1, minTier: 1, note: 'Two dressed forms on a podium: more walk-ins.' },
  // paint and floor: one of each at a time, and they stay behind when you move
  { id: 'paintWhite', name: 'Fresh white paint', price: 15_000, w: 1, d: 1, mount: 'finish', group: 'Paint & floor', paint: ['#F2EEE6', '#D9D2C4'], prestige: 1, note: 'Clean and bright. Stays with the shop when you move.' },
  { id: 'paintBlush', name: 'Blush pink paint', price: 20_000, w: 1, d: 1, mount: 'finish', group: 'Paint & floor', paint: ['#F2CACC', '#DCA4AA'], prestige: 1, note: 'Soft and girly.' },
  { id: 'paintSage', name: 'Sage green paint', price: 20_000, w: 1, d: 1, mount: 'finish', group: 'Paint & floor', paint: ['#B9C9AE', '#93A688'], prestige: 1, note: 'Calm and fresh.' },
  { id: 'paintTerracotta', name: 'Terracotta paint', price: 20_000, w: 1, d: 1, mount: 'finish', group: 'Paint & floor', paint: ['#C8775A', '#A65C44'], prestige: 1, note: 'Warm and earthy.' },
  { id: 'paintNavy', name: 'Deep navy paint', price: 25_000, w: 1, d: 1, mount: 'finish', group: 'Paint & floor', paint: ['#26365A', '#1A2640'], prestige: 1, note: 'Moody: colours pop against it.' },
  { id: 'ankaraWallpaper', name: 'Ankara wallpaper', price: 60_000, w: 1, d: 1, mount: 'finish', group: 'Paint & floor', paint: ['#D8892F', '#2F5D3A'], prestige: 2, minTier: 1, note: 'Bold print on every wall.' },
  { id: 'goldWallpaper', name: 'Gold damask wallpaper', price: 120_000, w: 1, d: 1, mount: 'finish', group: 'Paint & floor', paint: ['#E8D9B0', '#C9A163'], prestige: 3, minTier: 2, note: 'Old money.' },
  { id: 'vinylFloor', name: 'Vinyl tiles', price: 25_000, w: 1, d: 1, mount: 'finish', group: 'Paint & floor', floorTiles: ['#D8D2C6', '#C6BEB0'], prestige: 1, note: 'Covers the cracked floor.' },
  { id: 'woodFloor', name: 'Wood laminate', price: 60_000, w: 1, d: 1, mount: 'finish', group: 'Paint & floor', floorTiles: ['#A97A50', '#996C44'], prestige: 2, minTier: 1, note: 'Warm wood underfoot.' },
  { id: 'terrazzo', name: 'Terrazzo floor', price: 90_000, w: 1, d: 1, mount: 'finish', group: 'Paint & floor', floorTiles: ['#E6E0D6', '#D6CEC0'], prestige: 2, minTier: 1, note: 'Speckled stone, very Lagos.' },
  { id: 'herringbone', name: 'Herringbone wood', price: 180_000, w: 1, d: 1, mount: 'finish', group: 'Paint & floor', floorTiles: ['#8A5E3A', '#B4865A'], prestige: 3, minTier: 2, note: 'Designer wood floor.' },
  { id: 'marbleFloor', name: 'Polished marble', price: 300_000, w: 1, d: 1, mount: 'finish', group: 'Paint & floor', floorTiles: ['#F4F0EA', '#E2DAD0'], prestige: 3, minTier: 3, note: 'Shiny white marble.' },
];
export const furnitureById = (id: string) => FURNITURE.find((f) => f.id === id)!;

export interface Placed {
  uid: string;
  id: string;
  x: number;
  z: number;
  rot: 0 | 1; // 1 = turned 90 degrees
  placed: boolean;
}

export const footprint = (p: Pick<Placed, 'id' | 'rot'>) => {
  const f = furnitureById(p.id);
  return p.rot ? { w: f.d, d: f.w } : { w: f.w, d: f.d };
};

/** Wall and ceiling items take a wall position, not floor cells. */
export const usesFloor = (id: string) => furnitureById(id).mount === 'floor' && !furnitureById(id).walkable;

/** How many lights and fans the ceiling can take. */
export const ceilingCapacity = (k: RoomKey) => Math.max(2, Math.floor(room(k).w / 2.4));
export const ceilingUsed = (items: Placed[]) => items.filter((p) => p.placed && furnitureById(p.id).mount === 'ceiling').length;

/** The paint and the floor the shop has now (the newest of each). */
export function finishes(items: Placed[]) {
  const on = items.filter((p) => p.placed && furnitureById(p.id).mount === 'finish').map((p) => furnitureById(p.id));
  return { paint: [...on].reverse().find((f) => f.paint), floor: [...on].reverse().find((f) => f.floorTiles) };
}

/** Wall items go along the back wall, then the left wall (the two tall walls). */
export const wallCapacity = (k: RoomKey) => room(k).w + room(k).d - 1;

/** Where each wall item hangs: side 'back' (along x at z=0) or 'left' (along z at x=0). */
export function wallLayout(items: Placed[], tier: RoomKey): Record<string, { side: 'back' | 'left'; at: number }> {
  const r = room(tier);
  const out: Record<string, { side: 'back' | 'left'; at: number }> = {};
  let back = 0;
  let left = 0;
  const wall = items.filter((p) => p.placed && furnitureById(p.id).mount === 'wall').sort((a, b) => a.x - b.x);
  for (const p of wall) {
    const w = furnitureById(p.id).w;
    if (back + w <= r.w) { out[p.uid] = { side: 'back', at: back }; back += w; }
    else if (left + w <= r.d - 1) { out[p.uid] = { side: 'left', at: left }; left += w; }
  }
  return out;
}
export const wallUsed = (items: Placed[]) => items.filter((p) => p.placed && furnitureById(p.id).mount === 'wall').reduce((a, p) => a + furnitureById(p.id).w, 0);

/** The front row is the walkway from the door; nothing can stand there. */
export function cellsBlocked(items: Placed[], tier: RoomKey, except?: string): boolean[][] {
  const r = room(tier);
  const g = Array.from({ length: r.d }, () => Array(r.w).fill(false) as boolean[]);
  for (const p of items) {
    if (!p.placed || p.uid === except || !usesFloor(p.id)) continue;
    const { w, d } = footprint(p);
    for (let z = p.z; z < p.z + d; z++) for (let x = p.x; x < p.x + w; x++) if (g[z] && x < r.w) g[z][x] = true;
  }
  return g;
}

export function canPlace(items: Placed[], tier: RoomKey, p: Placed): boolean {
  const r = room(tier);
  const f = furnitureById(p.id);
  if (f.mount !== 'floor') return true;
  const { w, d } = footprint(p);
  if (p.x < 0 || p.z < 0 || p.x + w > r.w || p.z + d > r.d - 1) return false;
  if (f.walkable) return true;
  const g = cellsBlocked(items, tier, p.uid);
  for (let z = p.z; z < p.z + d; z++) for (let x = p.x; x < p.x + w; x++) if (g[z][x]) return false;
  // nothing may wall off part of the floor: every free cell must still be reachable from the door
  for (let z = p.z; z < p.z + d; z++) for (let x = p.x; x < p.x + w; x++) g[z][x] = true;
  return allReachable(g, r.w, r.d);
}

function allReachable(g: boolean[][], w: number, d: number) {
  const seen = g.map((row) => row.map(() => false));
  const door: [number, number] = [Math.floor(w / 2), d - 1];
  if (g[door[1]][door[0]]) return false;
  const stack = [door];
  seen[door[1]][door[0]] = true;
  let n = 0;
  while (stack.length) {
    const [x, z] = stack.pop()!;
    n++;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= w || nz >= d || seen[nz][nx] || g[nz][nx]) continue;
      seen[nz][nx] = true;
      stack.push([nx, nz]);
    }
  }
  const free = g.reduce((a, row) => a + row.filter((b) => !b).length, 0);
  return n === free;
}

/** First free floor spot for one new item, leaving everything else where it is. */
export function findSpot(items: Placed[], tier: RoomKey, it: Placed): Placed | null {
  const r = room(tier);
  for (let z = 0; z < r.d - 1; z++)
    for (let x = 0; x < r.w; x++)
      for (const rot of [0, 1] as const) {
        const cand = { ...it, x, z, rot, placed: true };
        if (canPlace(items, tier, cand)) return cand;
      }
  return null;
}

/** Puts every item somewhere it fits (after a move); what doesn't fit goes to storage. */
export function autoPlace(items: Placed[], tier: RoomKey): Placed[] {
  const r = room(tier);
  const out: Placed[] = [];
  let wall = 0;
  const cap = wallCapacity(tier);
  // big pieces first so they find room
  const order = [...items].sort((a, b) => furnitureById(b.id).w * furnitureById(b.id).d - furnitureById(a.id).w * furnitureById(a.id).d);
  for (const it of order) {
    const f = furnitureById(it.id);
    if (f.mount === 'finish') { out.push(it); continue; }
    if (f.mount === 'ceiling') { const ok = out.filter((o) => o.placed && furnitureById(o.id).mount === 'ceiling').length < ceilingCapacity(tier); out.push({ ...it, placed: ok, x: 0, z: 0 }); continue; }
    if (f.mount === 'wall') {
      const ok = wall + f.w <= cap;
      out.push({ ...it, placed: ok, x: wall, z: 0 });
      if (ok) wall += f.w;
      continue;
    }
    let done = false;
    for (let z = 0; z < r.d - 1 && !done; z++) {
      for (let x = 0; x < r.w && !done; x++) {
        for (const rot of [0, 1] as const) {
          const cand = { ...it, x, z, rot, placed: true };
          if (canPlace(out, tier, cand)) { out.push(cand); done = true; break; }
        }
      }
    }
    if (!done) out.push({ ...it, placed: false });
  }
  return out;
}

// ---------------------------------------------------------------------------
// What the furniture adds up to
// ---------------------------------------------------------------------------
export interface ShopStats {
  display: number;
  mirror: number;
  hairBonus: number;
  makeupBonus: number;
  seats: number;
  /** How cool the shop is, 0..1 (only while there is power). */
  cool: number;
  repBoost: number;
  generator: boolean;
  wigs: boolean;
  richBonus: number;
  patience: number;
  traffic: number;
  scoreBonus: number;
  tipBonus: number;
  furniturePrestige: number;
  prestige: number;
}

export function shopStats(items: Placed[], tier: number, stars: number): ShopStats {
  const fin = finishes(items);
  // only the newest paint and floor count
  const placed = items.filter((p) => p.placed).map((p) => furnitureById(p.id)).filter((f) => f.mount !== 'finish' || f === fin.paint || f === fin.floor);
  const sum = (k: keyof FurnitureDef) => placed.reduce((a, f) => a + ((f[k] as number) || 0), 0);
  const max = (k: keyof FurnitureDef) => placed.reduce((a, f) => Math.max(a, (f[k] as number) || 0), 0);
  // better pieces cancel the starter junk's ugliness
  let fp = sum('prestige');
  const has = (...ids: string[]) => placed.some((f) => ids.includes(f.id));
  if (has('pendants', 'chandelier', 'trackLights', 'tubeLight') && has('bareBulb')) fp += 1;
  if (has('paintedSign', 'shopSign', 'neon') && has('cardboardSign')) fp += 1;
  if (placed.some((f) => (f.mirror || 0) > 0) && has('crackedMirror')) fp += 1;
  if (has('stool', 'bench', 'ottoman', 'sofa', 'velvetSofa') && has('plasticChair')) fp += 1;
  const furniturePrestige = Math.min(fp, 4 + tier * 4);
  const cool = Math.min(0.8, sum('cool'));
  return {
    display: sum('slots'),
    mirror: max('mirror'),
    hairBonus: max('hairBonus'),
    makeupBonus: max('makeupBonus'),
    seats: sum('seats'),
    cool,
    repBoost: cool * 0.6,
    generator: placed.some((f) => f.generator),
    wigs: placed.some((f) => f.wigs),
    richBonus: Math.min(3, sum('richBonus')),
    patience: Math.min(0.5, sum('patience')),
    traffic: Math.min(0.3, sum('traffic')),
    scoreBonus: Math.min(2, sum('scoreBonus')),
    tipBonus: Math.min(0.2, sum('tipBonus')),
    furniturePrestige,
    prestige: stars * 2 + furniturePrestige,
  };
}

/** Customers a day scale with prestige; 6 (two stars, plain room) is the tuned baseline. */
export const prestigeTraffic = (prestige: number) => Math.max(0.7, Math.min(1.45, 0.85 + 0.025 * prestige));
/** Each prestige point above 6 turns about 1% of customers from poor to rich. */
export const prestigeRichShift = (prestige: number) => Math.max(-0.03, Math.min(0.12, (prestige - 6) * 0.01));

export const STARTER_FURNITURE: Omit<Placed, 'uid'>[] = [
  { id: 'rustyRail', x: 0, z: 0, rot: 0, placed: true },
  { id: 'woodTable', x: 4, z: 0, rot: 0, placed: true },
  { id: 'plasticChair', x: 4, z: 1, rot: 0, placed: true },
  { id: 'crackedMirror', x: 2, z: 0, rot: 0, placed: true },
  { id: 'cardboardSign', x: 3, z: 0, rot: 0, placed: true },
  { id: 'bareBulb', x: 0, z: 0, rot: 0, placed: true },
];

let fc = 0;
export const newUid = () => `f${Date.now().toString(36)}${(fc++).toString(36)}`;
