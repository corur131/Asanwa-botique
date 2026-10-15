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
  /** Rare, spacious signature property with exclusive clientele. */
  signature?: boolean;
}

const AREAS: [string, string][][] = [
  [['Herbert Macaulay Way', 'Yaba']],
  [['Alagomeji side street', 'Yaba'], ['Tejuosho plaza', 'Yaba'], ['Adeniran Ogunsanya St', 'Surulere'], ['Allen Avenue', 'Ikeja']],
  [['Bode Thomas St', 'Surulere'], ['Opebi Road', 'Ikeja'], ['Ikeja City Mall row', 'Ikeja'], ['Admiralty Way', 'Lekki Phase 1']],
  [['Admiralty Way', 'Lekki Phase 1'], ['Awolowo Road', 'Ikoyi'], ['Bourdillon Road', 'Ikoyi'], ['Adeola Odeku St', 'Victoria Island']],
  [['Ozumba Mbadiwe Ave', 'Victoria Island'], ['Kingsway Road', 'Ikoyi'], ['Akin Adesola St', 'Victoria Island'], ['Banana Island Road', 'Ikoyi']],
  [['Eko Atlantic Boulevard', 'Eko Atlantic'], ['Akin Adesola Avenue', 'Victoria Island'], ['Banana Island Road', 'Ikoyi'], ['Ozumba Mbadiwe Avenue', 'Victoria Island']],
  [['Banana Island Avenue', 'Banana Island'], ['Bourdillon Road', 'Ikoyi'], ['Eko Atlantic Boulevard', 'Eko Atlantic'], ['Oniru Waterfront Drive', 'Oniru']],
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
  if (tier === 0) return [KIOSK_LISTING, { ...KIOSK_LISTING, id: `signature-${tier}-${week}`, street: 'Yaba Signature Courtyard', stars: 4, signature: true, rent: 125_000, moveIn: 350_000, landlord: 'Chief Bisi Akinwale', grace: 0 }];
  const t = TIERS[tier];
  const r = rng(week * 97 + tier * 13 + 5);
  const areas = AREAS[tier];
  return [1, 2, 3, 4].map<Listing>((stars, i) => {
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
  }).concat({
    id: `signature-${tier}-${week}`, tier, area: tier >= 3 ? 'Victoria Island' : tier === 2 ? 'Lekki Phase 1' : 'Ikeja',
    street: ['','Allen Avenue Signature Maison','Lekki Signature Atelier','Ikoyi Grand Maison','Banana Island Crown House','Eko Atlantic Maison','Banana Island Empire House'][tier],
    stars: 4, signature: true,
    rent: Math.round(t.rent * 2.7 / 5_000) * 5_000,
    moveIn: Math.round(t.moveIn * 3.2 / 5_000) * 5_000,
    landlord: 'The Signature Property Group', grace: 0,
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
  kind: 'container' | 'plaster' | 'boutique' | 'marble' | 'flagship' | 'maison' | 'empire';
  height: number;
  /** 1..4: how well kept the place is (the listing's stars). Never as fine as the next size up. */
  finish: number;
  /** Real internal partitions; doorway cells remain clear for walking between rooms. */
  partitions?: RoomPartition[];
  /** Signature properties get unique architectural details in the 3D room. */
  signature?: boolean;
  /** Architectural identity of the premium Level 6/7 Signature homes; independent of room size/tier. */
  signatureTheme?: 'botanical-atrium' | 'cobalt-gallery';
}

export interface RoomPartition {
  axis: 'horizontal' | 'vertical';
  at: number;
  start: number;
  end: number;
  openings: number[];
}

export const ROOMS: RoomStyle[] = [
  { w: 5, d: 3, wall: '#5E7A86', wallLow: '#3E525C', floor: '#8C8C86', floor2: '#7C7C76', trim: '#9A5A2E', kind: 'container', height: 2.4, finish: 2 },
  { w: 7, d: 5, wall: '#E2D2AE', wallLow: '#B9A57D', floor: '#C9C2B4', floor2: '#B8B0A0', trim: '#7A5A3A', kind: 'plaster', height: 2.8, finish: 2 },
  { w: 9, d: 6, wall: '#F2C8CC', wallLow: '#D9A3AA', floor: '#B98A5E', floor2: '#A97A50', trim: '#F4E4C8', kind: 'boutique', height: 3, finish: 2 },
  { w: 11, d: 8, wall: '#F4F0EA', wallLow: '#E2D8CA', floor: '#ECE6DC', floor2: '#DCD3C6', trim: '#C9A163', kind: 'marble', height: 3.2, finish: 2 },
  { w: 13, d: 9, wall: '#1E1B22', wallLow: '#141217', floor: '#F2EDE6', floor2: '#1E1B22', trim: '#D4AF37', kind: 'flagship', height: 3.6, finish: 2 },
  { w: 24, d: 15, wall: '#D6D0C6', wallLow: '#A99E8F', floor: '#D9CEBC', floor2: '#F4EEE4', trim: '#C6A66D', kind: 'maison', height: 4.1, finish: 2 },
  { w: 32, d: 20, wall: '#211B2B', wallLow: '#3D3046', floor: '#DED4C4', floor2: '#F7F0E5', trim: '#E4C56E', kind: 'empire', height: 4.6, finish: 2 },
];

const SIZES: [number, number][][] = [
  [[5, 3]],
  [[8, 5], [9, 5], [9, 6], [10, 6]],
  [[10, 6], [11, 7], [12, 7], [12, 8]],
  [[12, 8], [13, 8], [14, 9], [14, 10]],
  [[14, 9], [15, 10], [16, 10], [17, 11]],
  [[20, 13], [22, 14], [24, 15], [26, 16]],
  [[28, 18], [31, 19], [34, 21], [36, 22]],
];

const SIGNATURE_SIZES: [number, number][] = [
  [10, 7], [15, 10], [20, 13], [25, 17], [30, 20], [36, 23], [44, 28],
];

function partitionLayout(tier: number, w: number, d: number): RoomPartition[] {
  const cell = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));
  if (tier === 5) {
    const north = cell(d * 0.38, 3, d - 4);
    const middle = cell(d * 0.70, north + 3, d - 2);
    const left = cell(w * 0.38, 3, w - 4);
    const right = cell(w * 0.70, left + 2, w - 2);
    return [
      { axis: 'horizontal', at: north, start: 1, end: w - 2, openings: [cell(w * 0.25, 2, w - 3), cell(w * 0.74, 2, w - 3)] },
      { axis: 'vertical', at: left, start: 1, end: north - 1, openings: [cell(north * 0.5, 2, north - 2)] },
      { axis: 'vertical', at: right, start: north + 1, end: middle - 1, openings: [cell((north + middle) / 2, north + 2, middle - 2)] },
      { axis: 'horizontal', at: middle, start: cell(w * 0.33, 1, w - 3), end: w - 2, openings: [cell(w * 0.71, 2, w - 3)] },
    ];
  }
  if (tier === 6) {
    const north = cell(d * 0.31, 3, d - 6);
    const middle = cell(d * 0.65, north + 3, d - 4);
    const south = cell(d * 0.84, middle + 2, d - 2);
    const backLeft = cell(w * 0.31, 3, w - 5);
    const backRight = cell(w * 0.68, backLeft + 2, w - 3);
    const centre = cell(w * 0.51, backLeft + 1, backRight - 1);
    const frontRight = cell(w * 0.78, centre + 1, w - 3);
    return [
      { axis: 'horizontal', at: north, start: 1, end: w - 2, openings: [cell(w * 0.22, 2, w - 3), cell(w * 0.52, 2, w - 3), cell(w * 0.82, 2, w - 3)] },
      { axis: 'vertical', at: backLeft, start: 1, end: north - 1, openings: [cell(north * 0.5, 2, north - 2)] },
      { axis: 'vertical', at: backRight, start: 1, end: north - 1, openings: [cell(north * 0.68, 2, north - 2)] },
      { axis: 'horizontal', at: middle, start: 1, end: w - 2, openings: [cell(w * 0.39, 2, w - 3), cell(w * 0.75, 2, w - 3)] },
      { axis: 'vertical', at: centre, start: north + 1, end: middle - 1, openings: [cell((north + middle) / 2, north + 2, middle - 2)] },
      { axis: 'vertical', at: frontRight, start: north + 1, end: middle - 1, openings: [cell((north + middle) / 2, north + 2, middle - 2)] },
      { axis: 'horizontal', at: south, start: cell(w * 0.35, 1, w - 3), end: w - 2, openings: [cell(w * 0.79, 2, w - 3)] },
      { axis: 'vertical', at: centre, start: middle + 1, end: south - 1, openings: [cell((middle + south) / 2, middle + 2, south - 2)] },
    ];
  }
  return [];
}

/** Premium Signature homes use deliberately different circulation, not the same floorplan scaled up. */
function signaturePartitionLayout(tier: number, w: number, d: number): RoomPartition[] {
  const cell = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));
  if (tier === 5) {
    // Botanical conservatory: an open central promenade, a rear glass studio, and two garden wings.
    const rear = cell(d * 0.31, 3, d - 6);
    const mid = cell(d * 0.60, rear + 3, d - 3);
    const left = cell(w * 0.30, 3, w - 5);
    const right = cell(w * 0.70, left + 2, w - 3);
    return [
      { axis: 'horizontal', at: rear, start: 1, end: w - 2, openings: [cell(w * 0.22, 2, w - 3), cell(w * 0.50, 2, w - 3), cell(w * 0.78, 2, w - 3)] },
      { axis: 'vertical', at: left, start: 1, end: rear - 1, openings: [cell(rear * 0.52, 2, rear - 2)] },
      { axis: 'vertical', at: right, start: 1, end: rear - 1, openings: [cell(rear * 0.52, 2, rear - 2)] },
      { axis: 'horizontal', at: mid, start: 1, end: cell(w * 0.86, 1, w - 3), openings: [cell(w * 0.40, 2, w - 3), cell(w * 0.69, 2, w - 3)] },
    ];
  }
  if (tier === 6) {
    // Cobalt gallery: a broad runway, side galleries and two shallow viewing suites.
    const runway = cell(d * 0.43, 4, d - 4);
    const left = cell(w * 0.25, 4, w - 6);
    const right = cell(w * 0.75, left + 3, w - 3);
    const rear = cell(d * 0.72, runway + 2, d - 2);
    return [
      { axis: 'horizontal', at: runway, start: left + 1, end: right - 1, openings: [cell(w * 0.50, left + 2, right - 2)] },
      { axis: 'vertical', at: left, start: 2, end: rear - 1, openings: [cell(d * 0.56, 3, rear - 2)] },
      { axis: 'vertical', at: right, start: 2, end: rear - 1, openings: [cell(d * 0.56, 3, rear - 2)] },
      { axis: 'horizontal', at: rear, start: 1, end: left - 1, openings: [cell(left * 0.5, 2, left - 2)] },
      { axis: 'horizontal', at: rear, start: right + 1, end: w - 2, openings: [cell((right + w) / 2, right + 2, w - 3)] },
    ];
  }
  return partitionLayout(tier, w, d);
}

function shade(hex: string, toward: string, k: number) {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(toward.slice(1), 16);
  const ch = (v: number, s: number) => (v >> s) & 255;
  const mix = (s: number) => Math.round(ch(a, s) * (1 - k) + ch(b, s) * k);
  return `#${((mix(16) << 16) | (mix(8) << 8) | mix(0)).toString(16).padStart(6, '0')}`;
}

/** The room a listing comes with: size and how well kept it is. */
export function roomOf(l: Pick<Listing, 'tier' | 'stars'> & Partial<Pick<Listing, 'signature'>>): RoomStyle {
  const safeTier = Math.max(0, Math.min(ROOMS.length - 1, Math.floor(l.tier || 0)));
  const base = ROOMS[safeTier] || ROOMS[0];
  const sizes = SIZES[safeTier] || SIZES[0];
  const signatureSizes = SIGNATURE_SIZES[safeTier] || SIGNATURE_SIZES[SIGNATURE_SIZES.length - 1];
  const [w, d] = l.signature ? signatureSizes : sizes[Math.min(sizes.length, Math.max(1, l.stars)) - 1];
  const finish = l.signature ? 4 : safeTier === 0 ? 1 : l.stars;
  const dull = [0, 0.32, 0.16, 0, 0][finish];
  const bright = finish === 4 ? 0.12 : 0;
  const tone = (colour: string) => (bright ? shade(colour, '#FFFFFF', base.kind === 'flagship' ? 0.02 : bright) : shade(colour, '#6E6A62', dull));
  const signaturePalette = [
    { wall: '#D6EEF2', wallLow: '#90C0CB', floor: '#CFE3E6', floor2: '#F3FBFC', trim: '#75B5C4' },
    { wall: '#E9EEFF', wallLow: '#7887B6', floor: '#C9D3F0', floor2: '#F8FAFF', trim: '#A9BDF7' },
    { wall: '#FFF3C2', wallLow: '#B47A16', floor: '#E4BD3F', floor2: '#FFF2A9', trim: '#FFD54A' },
    { wall: '#173F34', wallLow: '#0A2924', floor: '#C7B995', floor2: '#F0E6D0', trim: '#D9B965' },
    { wall: '#241824', wallLow: '#111017', floor: '#E8E3DD', floor2: '#F7F3EB', trim: '#F0CF78' },
    { wall: '#123D36', wallLow: '#082A27', floor: '#D8D0B8', floor2: '#1B4D41', trim: '#D28A5F' },
    { wall: '#F2EEE6', wallLow: '#294A80', floor: '#F2EBDC', floor2: '#405C92', trim: '#CF7052' },
  ][safeTier];
  return {
    ...base, w, d, finish,
    wall: l.signature ? signaturePalette.wall : tone(base.wall),
    wallLow: l.signature ? signaturePalette.wallLow : tone(base.wallLow),
    floor: l.signature ? signaturePalette.floor : tone(base.floor),
    floor2: l.signature ? signaturePalette.floor2 : tone(base.floor2),
    trim: l.signature ? signaturePalette.trim : base.trim,
    height: base.height + (finish - 2) * 0.1 + (l.signature ? 0.9 + safeTier * 0.18 : 0),
    signature: !!l.signature,
    signatureTheme: l.signature && safeTier === 5 ? 'botanical-atrium' : l.signature && safeTier === 6 ? 'cobalt-gallery' : undefined,
    partitions: l.signature && safeTier >= 5 ? signaturePartitionLayout(safeTier, w, d) : partitionLayout(safeTier, w, d),
  };
}

export type RoomKey = number | (Pick<Listing, 'tier' | 'stars'> & Partial<Pick<Listing, 'signature'>>);
export const room = (k: RoomKey): RoomStyle => (typeof k === 'number' ? roomOf({ tier: k, stars: k === 0 ? 1 : 2 }) : roomOf(k));

// ---------------------------------------------------------------------------
// Furniture
// ---------------------------------------------------------------------------
export type Mount = 'floor' | 'wall' | 'ceiling' | 'finish' | 'yard';
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
  /** Bonus for requested nail styling. */
  nailBonus?: number;
  seats?: number;
  /** Cooling, 0..1: customers wait longer and reputation grows faster. Needs light or a generator. */
  cool?: number;
  /** m² of floor one AC unit can cool to the thermostat. */
  coolArea?: number;
  /** m² of floor a fan keeps the air moving over. */
  fanArea?: number;
  /** Is an air conditioner (needs a big generator or 3+ solar panels in a blackout). */
  ac?: boolean;
  /** A generator: small runs lights and fans; big runs everything. You switch it on; it burns fuel. */
  gen?: 'small' | 'big';
  /** A solar panel with battery: comes on by itself in a blackout. Stack them for longer. */
  solar?: boolean;
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
  { id: 'makeupChair', name: 'Makeup chair', price: 48_000, w: 1, d: 1, mount: 'floor', group: 'Hair & makeup', makeupBonus: 1, prestige: 1, note: 'A proper chair for makeup clients; staff can seat clients here.' },
  { id: 'ringLight', name: 'Ring light', price: 18_000, w: 1, d: 1, mount: 'floor', group: 'Hair & makeup', makeupBonus: 1, prestige: 1, note: '+1 on made-up looks.' },
  { id: 'makeupStation', name: 'Makeup station', price: 75_000, w: 2, d: 1, mount: 'floor', group: 'Hair & makeup', makeupBonus: 3, prestige: 2, note: '+3 on made-up looks.' },
  { id: 'nailStation', name: 'Nail styling station', price: 58_000, w: 1, d: 1, mount: 'floor', group: 'Hair & makeup', nailBonus: 3, prestige: 1, note: 'Customers asking for fresh nails get a +3 styling bonus when you choose a nail colour.' },
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
  { id: 'fan', name: 'Standing fan', price: 15_000, w: 1, d: 1, mount: 'floor', group: 'Comfort & power', cool: 0.15, fanArea: 15, prestige: 0, note: 'Moves the air over about 15 m²: feels up to 3°C cooler. Off when NEPA takes light.' },
  { id: 'ceilingFan', name: 'Ceiling fan', price: 28_000, w: 1, d: 1, mount: 'ceiling', group: 'Comfort & power', cool: 0.2, fanArea: 20, prestige: 0, note: 'Moves the air over about 20 m², and takes no floor space. Needs light.' },
  { id: 'ac', name: 'Split AC (1.5HP)', price: 220_000, w: 1, d: 1, mount: 'wall', group: 'Comfort & power', cool: 0.4, ac: true, coolArea: 25, prestige: 2, minTier: 1, note: 'Cools about 25 m² to your thermostat. Too small for a big shop on its own. Needs light.' },
  { id: 'standingAc', name: 'Standing AC (3HP)', price: 380_000, w: 1, d: 1, mount: 'floor', group: 'Comfort & power', cool: 0.55, ac: true, coolArea: 50, prestige: 2, minTier: 2, note: 'Cools about 50 m² to your thermostat. Needs light.' },
  { id: 'industrialAc', name: 'Industrial floor AC (5HP)', price: 850_000, w: 1, d: 1, mount: 'floor', group: 'Comfort & power', cool: 0.6, ac: true, coolArea: 110, prestige: 3, minTier: 3, note: 'Cools about 110 m². Built for big boutiques and flagships. Needs light; draws 3.7 kW.' },
  { id: 'centralAc', name: 'Central AC system (ducted)', price: 4_800_000, w: 1, d: 1, mount: 'yard', group: 'Comfort & power', cool: 0.7, ac: true, coolArea: 320, prestige: 4, minTier: 5, note: 'Outdoor plant in the yard, vents in the ceiling. Cools about 320 m². Needs serious power: 9 kW.' },
  { id: 'securityPost', name: 'Small security post', price: 55_000, w: 1, d: 1, mount: 'yard', group: 'Comfort & power', prestige: 0, note: 'Hire a security guard to protect the entrance and run fuel errands.' },
  { id: 'smallGen', name: '"I better pass my neighbour" generator', price: 70_000, w: 1, d: 1, mount: 'yard', group: 'Comfort & power', gen: 'small', prestige: -1, note: 'Stands in the yard outside. Start it when NEPA takes light; runs lights and fans, not AC. 10-litre tank, burns about 1.2 litres an hour. Loud!' },
  { id: 'generator', name: 'Soundproof generator', price: 260_000, w: 1, d: 1, mount: 'yard', group: 'Comfort & power', gen: 'big', prestige: 1, minTier: 1, note: 'Stands in the yard outside. Runs everything, AC included. 30-litre tank, burns about 2.6 litres an hour.' },
  { id: 'industrialGen', name: 'Commercial / industrial generator', price: 2_400_000, w: 1, d: 1, mount: 'yard', group: 'Comfort & power', gen: 'big', prestige: 2, minTier: 5, note: 'A high-capacity commercial unit for Luxury Maison and Fashion Empire. Rated for large shop loads, with an 80-litre tank; actual fuel use rises with demand.' },
  { id: 'inverter', name: 'Solar panel and battery', price: 150_000, w: 1, d: 1, mount: 'yard', group: 'Comfort & power', solar: true, prestige: 1, note: 'Sits in the yard outside. Comes on by itself when NEPA takes light, free and silent; customers love it. Each panel adds about 1 hour 40 minutes. 3 or more can run AC. Recharges while there is light.' },
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
  // new Nigerian boutique systems: every item is wired into gameplay
  { id: 'posTerminal', name: 'POS terminal', price: 45_000, w: 1, d: 1, mount: 'floor', group: 'Comfort & power', prestige: 1, minTier: 1, note: 'Accept card payments reliably; charges a small fee on POS sales.' },
  { id: 'cctv', name: 'CCTV security camera', price: 85_000, w: 1, d: 1, mount: 'wall', group: 'Comfort & power', prestige: 1, minTier: 1, note: 'Keeps an eye on busy rails and reduces shoplifting.' },
  { id: 'fireExtinguisher', name: 'Fire extinguisher', price: 18_000, w: 1, d: 1, mount: 'wall', group: 'Comfort & power', prestige: 0, note: 'Stops a generator flare-up before it becomes an expensive fire.' },
  { id: 'alterationsCorner', name: 'Alterations corner', price: 95_000, w: 2, d: 1, mount: 'floor', group: 'Hair & makeup', prestige: 2, minTier: 1, note: 'Quick adjustments rescue fitted-clothes sales that would otherwise be lost.' },
  { id: 'umbrellaCanopy', name: 'Street umbrella canopy', price: 32_000, w: 1, d: 1, mount: 'yard', group: 'Decor', patience: 0.05, prestige: 1, note: 'Shields the queue outside from Lagos sun and rain.' },
  { id: 'flowerWall', name: 'Gidigram flower wall', price: 55_000, w: 2, d: 1, mount: 'wall', group: 'Decor', prestige: 2, traffic: 0.04, note: 'A photo backdrop that boosts Gidigram engagement.' },
  { id: 'lantern', name: 'Rechargeable shop lantern', price: 12_000, w: 1, d: 1, mount: 'ceiling', group: 'Lighting', prestige: 0, note: 'Keeps the shop visible during outages and softens the dark-shop styling penalty.' },
  { id: 'rechargeableFan', name: 'Rechargeable standing fan', price: 38_000, w: 1, d: 1, mount: 'floor', group: 'Comfort & power', cool: 0.12, fanArea: 12, prestige: 1, note: 'A backup fan helps Divine and customers cope when NEPA takes light.' },
  // 27 more working shop upgrades: display capacity, service quality, comfort and safety
  { id: 'boutiqueDesk', name: 'Reception desk', price: 42_000, w: 1, d: 1, mount: 'floor', group: 'Display', patience: 0.08, prestige: 1, note: 'A proper welcome point helps customers wait a little longer.' },
  { id: 'doubleSofa', name: 'Two-piece waiting sofa', price: 145_000, w: 2, d: 1, mount: 'floor', group: 'Seating', seats: 5, patience: 0.08, prestige: 2, minTier: 1, note: 'Five extra comfortable waiting places.' },
  { id: 'luxeOttoman', name: 'Luxury try-on ottoman', price: 48_000, w: 1, d: 1, mount: 'floor', group: 'Seating', seats: 2, richBonus: 1, prestige: 2, note: 'Adds two waiting seats and a little luxury for fitting clients.' },
  { id: 'hangerWall', name: 'Premium hanger wall', price: 65_000, w: 2, d: 1, mount: 'wall', group: 'Display', slots: 28, prestige: 2, minTier: 1, note: 'Holds 28 pieces and keeps the rail tidy.' },
  { id: 'litMannequin', name: 'Lit outfit mannequin', price: 78_000, w: 1, d: 1, mount: 'floor', group: 'Display', slots: 4, traffic: 0.07, prestige: 3, note: 'Showcases four pieces and attracts extra walk-ins.' },
  { id: 'goldMannequin', name: 'Gold-plinth mannequin', price: 105_000, w: 1, d: 1, mount: 'floor', group: 'Display', slots: 3, traffic: 0.05, prestige: 3, minTier: 1, note: 'A premium display that draws customers and raises prestige.' },
  { id: 'bagWall', name: 'Designer bag wall', price: 44_000, w: 2, d: 1, mount: 'wall', group: 'Display', slots: 18, prestige: 2, note: 'Displays 18 bags and accessories.' },
  { id: 'sunglassesSpinner', name: 'Sunglasses spinner', price: 26_000, w: 1, d: 1, mount: 'floor', group: 'Display', slots: 12, prestige: 1, note: 'Adds 12 accessory display spaces.' },
  { id: 'jewelleryDisplay', name: 'Illuminated jewellery case', price: 98_000, w: 2, d: 1, mount: 'floor', group: 'Display', slots: 16, tipBonus: 0.06, prestige: 3, minTier: 1, note: 'Displays 16 small pieces and encourages larger tips.' },
  { id: 'purseIsland', name: 'Handbag display island', price: 125_000, w: 2, d: 2, mount: 'floor', group: 'Display', slots: 24, prestige: 3, minTier: 1, note: 'A centre display for 24 bags and accessories.' },
  { id: 'scarfStand', name: 'Scarf and gele stand', price: 19_000, w: 1, d: 1, mount: 'floor', group: 'Display', slots: 12, prestige: 1, note: 'Displays gele, scarves and headwear.' },
  { id: 'shoeBench', name: 'Shoe try-on bench', price: 32_000, w: 2, d: 1, mount: 'floor', group: 'Seating', seats: 2, patience: 0.05, prestige: 1, note: 'Two extra seats for customers trying shoes.' },
  { id: 'premiumFitting', name: 'Private luxury fitting room', price: 260_000, w: 2, d: 2, mount: 'floor', group: 'Decor', richBonus: 3, prestige: 4, minTier: 2, note: 'Private fitting space gives rich clients +3 to their look score.' },
  { id: 'hairMirror', name: 'Salon mirror and station', price: 82_000, w: 1, d: 1, mount: 'floor', group: 'Hair & makeup', mirror: 2, hairBonus: 1, wigs: true, prestige: 2, note: 'A mirror and hair station for wig installs and +1 hair quality.' },
  { id: 'salonWashBasin', name: 'Salon wash basin', price: 115_000, w: 1, d: 1, mount: 'floor', group: 'Hair & makeup', hairBonus: 2, wigs: true, prestige: 2, minTier: 1, note: 'A proper wash station improves hair services by +2.' },
  { id: 'nailPolishRack', name: 'Nail polish rack', price: 14_000, w: 1, d: 1, mount: 'floor', group: 'Hair & makeup', nailBonus: 1, prestige: 1, note: 'Adds +1 to requested nail styling when you choose a nail colour.' },
  { id: 'nailDryer', name: 'Electric nail dryer', price: 35_000, w: 1, d: 1, mount: 'floor', group: 'Hair & makeup', nailBonus: 2, prestige: 1, note: 'Adds +2 to requested nail styling when you choose a nail colour.' },
  { id: 'fullLengthMirror', name: 'Premium full-length mirror', price: 88_000, w: 1, d: 1, mount: 'floor', group: 'Mirrors', mirror: 3, prestige: 2, note: 'Adds +3 to every look score.' },
  { id: 'softboxLight', name: 'Softbox photography light', price: 42_000, w: 1, d: 1, mount: 'floor', group: 'Lighting', scoreBonus: 1, prestige: 1, note: 'Improves the lighting for styled looks by +1.' },
  { id: 'ceilingSpots', name: 'Warm ceiling spotlights', price: 72_000, w: 1, d: 1, mount: 'ceiling', group: 'Lighting', scoreBonus: 1, prestige: 2, minTier: 1, note: 'Better colour visibility adds +1 to styling scores.' },
  { id: 'aromaMachine', name: 'Premium aroma machine', price: 28_000, w: 1, d: 1, mount: 'floor', group: 'Comfort & power', patience: 0.08, tipBonus: 0.05, prestige: 1, note: 'A pleasant shop makes customers wait longer and tip a little more.' },
  { id: 'chilledWater', name: 'Chilled water cooler', price: 48_000, w: 1, d: 1, mount: 'floor', group: 'Comfort & power', patience: 0.15, prestige: 1, note: 'Cold water helps customers wait 15% longer.' },
  { id: 'inverterPanel', name: 'Extra solar panel', price: 95_000, w: 1, d: 1, mount: 'yard', group: 'Comfort & power', solar: true, prestige: 1, note: 'Adds another 100 minutes of solar backup.' },
  { id: 'shopAlarm', name: 'Shop security alarm', price: 62_000, w: 1, d: 1, mount: 'wall', group: 'Comfort & power', prestige: 1, minTier: 1, note: 'A security alarm deters theft when the shop is crowded.' },
  { id: 'fireBlanket', name: 'Generator fire blanket', price: 9_000, w: 1, d: 1, mount: 'wall', group: 'Comfort & power', prestige: 0, note: 'A backup fire blanket can put out a generator flare-up.' },
  { id: 'fireAlarm', name: 'Smoke and heat alarm', price: 24_000, w: 1, d: 1, mount: 'ceiling', group: 'Comfort & power', prestige: 1, note: 'Warns early and reduces the chance of a generator fire.' },
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
/** Catalogue items for one category. Deduplicate IDs to keep one definition and one buy action per item. */
export const furnitureForGroup = (group: FurnitureGroup): FurnitureDef[] => {
  const seen = new Set<string>();
  return FURNITURE.filter((f) => {
    if (f.group !== group || f.starter || seen.has(f.id)) return false;
    seen.add(f.id);
    return true;
  });
};

export const furnitureById = (id: string) => FURNITURE.find((f) => f.id === id)!;

export interface Placed {
  uid: string;
  id: string;
  x: number;
  z: number;
  /** Quarter turns: 0 = facing the shop front, 1 = 90°, 2 = 180°, 3 = 270°. */
  rot: Rot;
  placed: boolean;
  /** Outdoor items can be assigned to either side of the building. Older saves default to right. */
  yardSide?: 'left' | 'right';
  /** Wall pieces the player has positioned: which tall wall, with x = position along it. */
  wallSide?: 'back' | 'left';
}

export type Rot = 0 | 1 | 2 | 3;
/** The next quarter turn. */
export const turn = (r: number): Rot => (((r || 0) + 1) % 4) as Rot;
/** Y rotation in radians for a quarter turn. */
export const rotAngle = (r: number) => -((r || 0) % 4) * (Math.PI / 2);
export const footprint = (p: Pick<Placed, 'id' | 'rot'>) => {
  const f = furnitureById(p.id);
  return (p.rot || 0) % 2 ? { w: f.d, d: f.w } : { w: f.w, d: f.d };
};

/** Wall and ceiling items take a wall position, not floor cells. */
export const usesFloor = (id: string) => furnitureById(id).mount === 'floor' && !furnitureById(id).walkable;

/** Appliances Divine can switch on and off. */
export const SWITCHABLE = new Set(['fan', 'ceilingFan', 'ac', 'standingAc', 'industrialAc', 'centralAc', 'speaker', 'tv']);
/** Furniture with switched-off appliances left out (they stop cooling, playing, drawing power). */
export const liveItems = (items: Placed[], off?: Record<string, boolean>) => (off && Object.keys(off).length ? items.filter((p) => !off[p.uid]) : items);

/** Spots in the yard outside for generators and solar panels. */
export const yardCapacity = (k: RoomKey) => Math.max(3, room(k).d + 1);
/** Generators, security post and canopy share the yard; solar panels have their own rack. */
export const yardUsed = (items: Placed[]) => items.filter((p) => p.placed && furnitureById(p.id).mount === 'yard' && !furnitureById(p.id).solar).length;
/** Solar panels stand on a rack along the back of the building, sized by the shop's width. */
export const solarRackCapacity = (k: RoomKey) => Math.max(6, Math.floor(room(k).w * 1.5));
export const solarUsed = (items: Placed[]) => items.filter((p) => p.placed && !!furnitureById(p.id).solar).length;
/** Is there outdoor space for this yard or solar piece? */
export const outdoorRoomFor = (items: Placed[], id: string, k: RoomKey) =>
  furnitureById(id).solar ? solarUsed(items) < solarRackCapacity(k) : yardUsed(items) < yardCapacity(k);

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
  const len = { back: r.w, left: r.d - 1 };
  const taken = { back: [] as [number, number][], left: [] as [number, number][] };
  const free = (side: 'back' | 'left', at: number, w: number) =>
    at >= 0 && at + w <= len[side] && taken[side].every(([a, b]) => at + w <= a || at >= b);
  const wall = items.filter((p) => p.placed && furnitureById(p.id).mount === 'wall');
  // Pieces the player positioned keep their exact spot.
  for (const p of wall.filter((x) => x.wallSide)) {
    const w = furnitureById(p.id).w;
    const side = p.wallSide!;
    if (free(side, p.x, w)) { out[p.uid] = { side, at: p.x }; taken[side].push([p.x, p.x + w]); }
  }
  // Everything else fills the first free gap: back wall first, then the left wall.
  for (const p of wall.filter((x) => !x.wallSide || !out[x.uid]).sort((a, b) => a.x - b.x)) {
    const w = furnitureById(p.id).w;
    let placed = false;
    for (const side of ['back', 'left'] as const) {
      for (let at = 0; at + w <= len[side] && !placed; at++) {
        if (free(side, at, w)) { out[p.uid] = { side, at }; taken[side].push([at, at + w]); placed = true; }
      }
      if (placed) break;
    }
  }
  return out;
}

/** Could this wall piece hang here (in bounds, not overlapping another piece)? */
export function wallFits(items: Placed[], tier: RoomKey, uid: string, side: 'back' | 'left', at: number): boolean {
  const r = room(tier);
  const p = items.find((x) => x.uid === uid);
  if (!p) return false;
  const w = furnitureById(p.id).w;
  if (at < 0 || at + w > (side === 'back' ? r.w : r.d - 1)) return false;
  const layout = wallLayout(items.filter((x) => x.uid !== uid), tier);
  return Object.entries(layout).every(([id, spot]) => {
    if (spot.side !== side) return true;
    const ow = furnitureById(items.find((x) => x.uid === id)!.id).w;
    return at + w <= spot.at || at >= spot.at + ow;
  });
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
  // Internal partitions block movement/placement, while their doorway cells stay open.
  for (const wall of r.partitions || []) {
    for (let along = wall.start; along <= wall.end; along++) {
      if (wall.openings.includes(along)) continue;
      if (wall.axis === 'horizontal') {
        if (g[wall.at] && along >= 0 && along < r.w) g[wall.at][along] = true;
      } else if (g[along] && wall.at >= 0 && wall.at < r.w) g[along][wall.at] = true;
    }
  }
  return g;
}

export function canPlace(items: Placed[], tier: RoomKey, p: Placed): boolean {
  const r = room(tier);
  const f = furnitureById(p.id);
  if (f.mount !== 'floor') return true;
  const { w, d } = footprint(p);
  if (p.x < 0 || p.z < 0 || p.x + w > r.w || p.z + d > r.d - 1) return false;
  if (f.walkable) {
    // Rugs can overlap furniture as decoration, but must never be placed through an internal wall.
    const walls = cellsBlocked([], tier);
    for (let z = p.z; z < p.z + d; z++) for (let x = p.x; x < p.x + w; x++) if (walls[z][x]) return false;
    return true;
  }
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

/** Arrange owned equipment after a move. Floor pieces are distributed through the room instead of starting in the back-wall row. */
export function autoPlace(items: Placed[], tier: RoomKey): Placed[] {
  const r = room(tier);
  const out: Placed[] = [];
  let wall = 0;
  const cap = wallCapacity(tier);
  // Large pieces are placed first; wall and ceiling equipment is handled separately.
  const order = [...items].sort((a, b) => {
    const fa = furnitureById(a.id), fb = furnitureById(b.id);
    return fb.w * fb.d - fa.w * fa.d;
  });
  const centerXs = Array.from({ length: r.w }, (_, x) => x)
    .sort((a, b) => Math.abs(a - (r.w - 1) / 2) - Math.abs(b - (r.w - 1) / 2));
  const edgeXs = Array.from({ length: r.w }, (_, x) => x)
    .sort((a, b) => Math.min(a, r.w - 1 - a) - Math.min(b, r.w - 1 - b));
  // Keep the back-wall row clear for wall pieces and distribute floor pieces across the usable depth.
  const backToFrontZs = Array.from({ length: Math.max(0, r.d - 2) }, (_, i) => i + 1);
  const midToFrontZs = [...backToFrontZs]
    .sort((a, b) => Math.abs(a - Math.max(1, Math.floor((r.d - 2) / 2))) - Math.abs(b - Math.max(1, Math.floor((r.d - 2) / 2))));
  for (const it of order) {
    const f = furnitureById(it.id);
    if (f.mount === 'finish' || f.mount === 'yard') { out.push({ ...it, placed: true }); continue; }
    if (f.mount === 'ceiling') {
      const ok = out.filter((o) => o.placed && furnitureById(o.id).mount === 'ceiling').length < ceilingCapacity(tier);
      out.push({ ...it, placed: ok, x: 0, z: 0 });
      continue;
    }
    if (f.mount === 'wall') {
      const ok = wall + f.w <= cap;
      out.push({ ...it, placed: ok, x: wall, z: 0 });
      if (ok) wall += f.w;
      continue;
    }
    const xOrder = ['Display', 'Hair & makeup', 'Comfort & power', 'Decor'].includes(f.group) ? edgeXs : centerXs;
    const zOrder = f.group === 'Seating' || f.group === 'Mirrors' ? midToFrontZs : backToFrontZs;
    let done = false;
    for (const z of zOrder) {
      if (done) break;
      for (const x of xOrder) {
        if (done) break;
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

export type MoveEquipmentPlan = 'arrange' | 'store' | 'sell' | 'furnished';

/** Catalog-backed furniture packages for each destination tier. */
const READY_FURNISHED_KITS: Record<number, string[]> = {
  0: ['chromeRail', 'woodTable', 'standMirror', 'plasticChair', 'tubeLight', 'shopSign', 'paintWhite', 'vinylFloor'],
  1: ['doubleRail', 'woodShelving', 'jewelCounter', 'goldMirror', 'fittingRoom', 'sofa', 'pendants', 'plant', 'paintWhite', 'woodFloor'],
  2: ['goldRail', 'islandTable', 'glassCabinet', 'goldMirror', 'premiumFitting', 'sofa', 'trackLights', 'palm', 'goldWallpaper', 'marbleFloor'],
  3: ['goldRail', 'glassCabinet', 'displayWall', 'goldMirror', 'premiumFitting', 'velvetSofa', 'chandelier', 'windowPodium', 'jewelCounter', 'goldWallpaper', 'marbleFloor'],
  4: ['goldRail', 'glassCabinet', 'displayWall', 'mirrorWall', 'premiumFitting', 'velvetSofa', 'chandelier', 'windowPodium', 'jewelCounter', 'palm', 'goldWallpaper', 'marbleFloor'],
  // Level 6: Luxury Maison — tailored rails, VIP fitting, beauty stations, lounge seating,
  // practical climate control, abundant warm lighting and restrained ivory/brass finishes.
  5: [
    'goldRail', 'goldRail', 'goldRail', 'glassCabinet', 'glassCabinet',
    'displayWall', 'displayWall', 'mirrorWall', 'premiumFitting', 'fittingRoom', 'fittingRoom',
    'velvetSofa', 'velvetSofa', 'jewelCounter', 'jewelCounter', 'archMirror',
    'vanity', 'salonChair', 'makeupStation', 'boutiqueDesk', 'posTerminal',
    'ceilingFan', 'ceilingFan', 'ceilingFan', 'ac', 'ac', 'standingAc', 'rechargeableFan', 'generator',
    'chandelier', 'chandelier', 'trackLights', 'trackLights', 'ceilingSpots',
    'ledStrip', 'ledStrip', 'ledStrip', 'ledStrip',
    'bagWall', 'bagWall', 'neon', 'wallArt', 'wallArt', 'palm', 'palm', 'flowers',
    'diffuser', 'waterDispenser', 'fireExtinguisher', 'paintWhite', 'herringbone',
  ],
  // Level 7: Fashion Empire House — a flagship showroom, several climate units, premium workrooms,
  // an extensive media wall and a dramatic midnight/navy-and-gold visual treatment.
  6: [
    'goldRail', 'goldRail', 'goldRail', 'goldRail',
    'glassCabinet', 'glassCabinet', 'glassCabinet', 'displayWall', 'displayWall', 'displayWall',
    'mirrorWall', 'mirrorWall', 'premiumFitting', 'premiumFitting',
    'fittingRoom', 'fittingRoom', 'fittingRoom', 'velvetSofa', 'velvetSofa', 'velvetSofa',
    'jewelCounter', 'jewelCounter', 'jewelCounter', 'archMirror', 'archMirror',
    'vanity', 'vanity', 'salonChair', 'salonChair', 'makeupStation', 'makeupStation',
    'boutiqueDesk', 'posTerminal',
    'ceilingFan', 'ceilingFan', 'ceilingFan', 'ceilingFan',
    'ac', 'ac', 'ac', 'standingAc', 'standingAc', 'rechargeableFan', 'rechargeableFan', 'generator',
    'chandelier', 'chandelier', 'chandelier', 'trackLights', 'trackLights', 'ceilingSpots', 'ceilingSpots',
    'ledStrip', 'ledStrip', 'ledStrip', 'ledStrip', 'ledStrip', 'ledStrip',
    'bagWall', 'bagWall', 'bagWall', 'neon', 'neon', 'wallArt', 'wallArt', 'wallArt',
    'flowerWall', 'cctv', 'fireExtinguisher',
    'palm', 'palm', 'palm', 'flowers', 'flowers', 'diffuser', 'diffuser',
    'waterDispenser', 'waterDispenser', 'fluffyRug', 'fluffyRug',
    'paintNavy', 'marbleFloor',
  ],
};

function furnishedKitIds(tier: RoomKey): string[] {
  const level = Math.max(0, Math.min(ROOMS.length - 1, Math.floor(typeof tier === 'number' ? tier : tier.tier)));
  return (READY_FURNISHED_KITS[level] || READY_FURNISHED_KITS[0]).filter((id) => {
    const def = FURNITURE.find((item) => item.id === id);
    return !!def && (def.minTier || 0) <= level;
  });
}

/** Price shown before the player confirms a ready-furnished move. */
export function readyFurnishedCost(tier: RoomKey): number {
  return furnishedKitIds(tier).reduce((sum, id) => sum + furnitureById(id).price, 0);
}

/** Apply the player's chosen equipment plan. Shop finishes stay with the old premises. */
export function prepareFurnitureForMove(items: Placed[], tier: RoomKey, plan: MoveEquipmentPlan): { furniture: Placed[]; saleProceeds: number; packageCost: number } {
  const equipment = items.filter((item) => furnitureById(item.id).mount !== 'finish');
  if (plan === 'sell') {
    const saleProceeds = equipment.reduce((sum, item) => sum + Math.round(furnitureById(item.id).price * 0.4), 0);
    return { furniture: [], saleProceeds, packageCost: 0 };
  }
  if (plan === 'store') {
    return { furniture: equipment.map((item) => ({ ...item, placed: false, x: 0, z: 0 })), saleProceeds: 0, packageCost: 0 };
  }
  if (plan === 'furnished') {
    const stored = equipment.map((item) => ({ ...item, placed: false, x: 0, z: 0 }));
    const packageItems: Placed[] = furnishedKitIds(tier).map((id) => ({ uid: newUid(), id, x: 0, z: 0, rot: 0, placed: true }));
    return { furniture: [...stored, ...arrangeShop(packageItems, tier)], saleProceeds: 0, packageCost: readyFurnishedCost(tier) };
  }
  return { furniture: arrangeShop(equipment, tier), saleProceeds: 0, packageCost: 0 };
}

// ---------------------------------------------------------------------------
// What the furniture adds up to
// ---------------------------------------------------------------------------
export interface ShopStats {
  display: number;
  mirror: number;
  hairBonus: number;
  makeupBonus: number;
  nailBonus: number;
  seats: number;
  /** How cool the shop is, 0..1 (only while there is power). */
  cool: number;
  repBoost: number;
  /** Best generator owned. */
  gen: 'small' | 'big' | null;
  solarPanels: number;
  /** Cooling from fans only, and from AC only. */
  coolFans: number;
  coolAc: number;
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
    nailBonus: max('nailBonus'),
    seats: sum('seats'),
    cool,
    repBoost: cool * 0.6,
    gen: placed.some((f) => f.gen === 'big') ? 'big' : placed.some((f) => f.gen === 'small') ? 'small' : null,
    solarPanels: placed.filter((f) => f.solar).length,
    coolFans: Math.min(0.8, placed.filter((f) => !f.ac).reduce((a, f) => a + (f.cool || 0), 0)),
    coolAc: Math.min(0.8, placed.filter((f) => f.ac).reduce((a, f) => a + (f.cool || 0), 0)),
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

// ---------------------------------------------------------------------------
// Zoned arrangement for the player's shop (moves, ready-furnished packages).
// Laid out like a real boutique: till and window display by the entrance, rails
// and shelves along the walls, feature islands in the middle, a styling area and
// fitting rooms at the back (the back rooms in multi-room shops), a waiting lounge,
// and plants and power equipment in the corners. A walkway from the door and the
// doorways between rooms are kept clear. Anything that does not fit is stored.
// ---------------------------------------------------------------------------
type ZoneRole = 'till' | 'window' | 'styling' | 'fitting' | 'wallDisplay' | 'island' | 'seat' | 'rug' | 'corner';
const TILL_IDS = new Set(['jewelCounter', 'boutiqueDesk', 'posTerminal']);
const WINDOW_IDS = new Set(['windowPodium', 'litMannequin', 'goldMannequin', 'mannequin']);
const ISLAND_IDS = new Set(['roundRack', 'islandTable', 'purseIsland', 'nestingTables', 'jewelleryDisplay', 'spinner', 'sunglassesSpinner', 'scarfStand', 'woodTable']);
const FITTING_IDS = new Set(['fittingRoom', 'premiumFitting', 'curtainCorner']);

function zoneRole(id: string): ZoneRole {
  const f = furnitureById(id);
  if (f.walkable) return 'rug';
  if (TILL_IDS.has(id)) return 'till';
  if (WINDOW_IDS.has(id)) return 'window';
  if (FITTING_IDS.has(id)) return 'fitting';
  if (ISLAND_IDS.has(id)) return 'island';
  if (f.group === 'Hair & makeup' || f.group === 'Mirrors' || id === 'softboxLight') return 'styling';
  if (f.group === 'Seating') return 'seat';
  if (f.group === 'Display') return 'wallDisplay';
  return 'corner';
}
const ROLE_ORDER: ZoneRole[] = ['till', 'window', 'fitting', 'styling', 'wallDisplay', 'island', 'seat', 'corner', 'rug'];

export function arrangeShop(items: Placed[], tier: RoomKey): Placed[] {
  const r = room(tier);
  const W = r.w;
  const D = r.d;
  const door = Math.floor(W / 2);
  const walls = cellsBlocked([], tier);
  const openings = new Set<string>();
  for (const wall of r.partitions || []) for (const along of wall.openings) {
    openings.add(wall.axis === 'horizontal' ? `${along},${wall.at}` : `${wall.at},${along}`);
  }
  const isWall = (x: number, z: number) => x < 0 || x >= W || z < 0 || (z < D && !!walls[z]?.[x]);

  // Rooms: flood fill with doorways treated as boundaries, then depth from the entrance.
  const roomId: number[][] = Array.from({ length: D }, () => Array(W).fill(-1));
  let rooms = 0;
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    if (roomId[z][x] >= 0 || isWall(x, z) || openings.has(`${x},${z}`)) continue;
    const stack: [number, number][] = [[x, z]];
    roomId[z][x] = rooms;
    while (stack.length) {
      const [cx, cz] = stack.pop()!;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= W || nz >= D || roomId[nz][nx] >= 0 || isWall(nx, nz) || openings.has(`${nx},${nz}`)) continue;
        roomId[nz][nx] = rooms;
        stack.push([nx, nz]);
      }
    }
    rooms++;
  }
  const frontRoom = roomId[D - 1][door] >= 0 ? roomId[D - 1][door] : 0;
  const links = new Map<number, Set<number>>();
  for (const key of openings) {
    const [ox, oz] = key.split(',').map(Number);
    const near = new Set<number>();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const id = roomId[oz + dz]?.[ox + dx];
      if (id !== undefined && id >= 0) near.add(id);
    }
    for (const a of near) for (const b of near) if (a !== b) links.set(a, new Set([...(links.get(a) || []), b]));
  }
  const depth = Array(rooms).fill(99);
  depth[frontRoom] = 0;
  const queue = [frontRoom];
  while (queue.length) {
    const a = queue.shift()!;
    for (const b of links.get(a) || []) if (depth[b] > depth[a] + 1) { depth[b] = depth[a] + 1; queue.push(b); }
  }
  const maxDepth = Math.max(0, ...depth.filter((d) => d < 99));
  const depthNorm = (id: number) => (maxDepth ? Math.min(1, (depth[id] ?? maxDepth) / maxDepth) : 0);
  const centroid = Array.from({ length: rooms }, () => ({ x: 0, z: 0, n: 0 }));
  for (let z = 0; z < D - 1; z++) for (let x = 0; x < W; x++) { const id = roomId[z][x]; if (id >= 0) { centroid[id].x += x; centroid[id].z += z; centroid[id].n++; } }
  for (const c of centroid) if (c.n) { c.x /= c.n; c.z /= c.n; }

  // Keep clear: the aisle from the door into the front room, and a cell either side of every doorway.
  const clear = new Set<string>();
  for (let z = D - 2; z >= 0 && roomId[z][door] === frontRoom; z--) {
    clear.add(`${door},${z}`);
    if (W >= 9) clear.add(`${door - 1},${z}`);
  }
  for (const key of openings) {
    const [ox, oz] = key.split(',').map(Number);
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) clear.add(`${ox + dx},${oz + dz}`);
  }

  const out: Placed[] = [];
  const stored: Placed[] = [];
  const placedBy = new Map<ZoneRole, { x: number; z: number; room: number }[]>();
  const stylingLeft = (hashOf(String(W * 31 + D)) & 1) === 0;
  let tillSide = 0;

  // Wall pieces: back wall then left wall, interleaving kinds so AC, art and displays spread out.
  const wallItems = items.filter((it) => furnitureById(it.id).mount === 'wall');
  const bucket = (id: string) => { const f = furnitureById(id); return f.group === 'Mirrors' ? 0 : f.group === 'Display' ? 1 : f.group === 'Comfort & power' ? 2 : 3; };
  const buckets = [0, 1, 2, 3].map((b) => wallItems.filter((it) => bucket(it.id) === b).sort((a, b2) => furnitureById(b2.id).w - furnitureById(a.id).w));
  const wallSeq: Placed[] = [];
  while (buckets.some((b) => b.length)) for (const b of buckets) if (b.length) wallSeq.push(b.shift()!);
  let wallUsedW = 0;
  for (const it of wallSeq) {
    const w = furnitureById(it.id).w;
    if (wallUsedW + w <= wallCapacity(tier)) { out.push({ ...it, placed: true, x: wallUsedW, z: 0, rot: 0 }); wallUsedW += w; }
    else stored.push({ ...it, placed: false, x: 0, z: 0 });
  }
  let ceiling = 0;
  for (const it of items) {
    const f = furnitureById(it.id);
    if (f.mount === 'finish' || f.mount === 'yard') out.push({ ...it, placed: true });
    else if (f.mount === 'ceiling') {
      const ok = ceiling < ceilingCapacity(tier);
      if (ok) ceiling++;
      (ok ? out : stored).push({ ...it, placed: ok, x: 0, z: 0 });
    }
  }

  const floor = items.filter((it) => furnitureById(it.id).mount === 'floor')
    .sort((a, b) => ROLE_ORDER.indexOf(zoneRole(a.id)) - ROLE_ORDER.indexOf(zoneRole(b.id)) ||
      furnitureById(b.id).w * furnitureById(b.id).d - furnitureById(a.id).w * furnitureById(a.id).d);

  const centreOf = (list: { x: number; z: number }[]) => list.length ? { x: list.reduce((a, p) => a + p.x, 0) / list.length, z: list.reduce((a, p) => a + p.z, 0) / list.length } : null;
  for (const it of floor) {
    const role = zoneRole(it.id);
    const same = placedBy.get(role) || [];
    const sameCentre = centreOf(same);
    const seatsCentre = centreOf(placedBy.get('seat') || []);
    const candidates: { p: Placed; score: number; cx: number; cz: number; room: number; clearHit: boolean }[] = [];
    for (let rot = 0 as Rot; rot < 4; rot = (rot + 1) as Rot) {
      const { w, d } = footprint({ id: it.id, rot });
      for (let z = 0; z + d <= D - 1; z++) for (let x = 0; x + w <= W; x++) {
        const id0 = roomId[z][x];
        if (id0 < 0) continue;
        let sameRoom = true;
        let clearHit = false;
        for (let zz = z; zz < z + d && sameRoom; zz++) for (let xx = x; xx < x + w; xx++) {
          if (roomId[zz][xx] !== id0) { sameRoom = false; break; }
          if (clear.has(`${xx},${zz}`)) clearHit = true;
        }
        if (!sameRoom) continue;
        let L = true, R = true, B = true;
        for (let zz = z; zz < z + d; zz++) { if (!isWall(x - 1, zz)) L = false; if (!isWall(x + w, zz)) R = false; }
        for (let xx = x; xx < x + w; xx++) if (!isWall(xx, z - 1)) B = false;
        const F = z + d === D - 1 && id0 === frontRoom;
        const wallTouch = L || R || B;
        const corner = (L || R) && (B || F);
        // Facing: into the room from whichever wall it stands against.
        const wantRot: Rot | null = B ? 0 : L ? 3 : R ? 1 : F ? 2 : null;
        const faceOk = wantRot === null ? rot === 0 || rot === 2 : rot === wantRot || (corner && (rot === (L ? 3 : 1) || rot === (B ? 0 : 2)));
        const cx = x + w / 2, cz = z + d / 2;
        const dn = depthNorm(id0);
        const c = centroid[id0];
        const toCentre = Math.hypot(cx - c.x, cz - c.z) / Math.max(1, Math.hypot(W, D) / 4);
        const nearSame = same.length ? Math.min(...same.map((p) => Math.hypot(p.x - cx, p.z - cz))) : 99;
        let score = faceOk ? 0 : 6;
        switch (role) {
          case 'till':
            score += (id0 === frontRoom ? 0 : 40) + Math.abs(Math.abs(cx - door) - 3) + (F ? 0 : 2 + (D - 1 - (z + d)) * 0.8) + (sameCentre ? Math.hypot(cx - sameCentre.x, cz - sameCentre.z) : 0);
            break;
          case 'window':
            score += (id0 === frontRoom ? 0 : 40) + (F ? 0 : 6) + Math.abs(Math.abs(cx - door) - 2) * 0.6 + (tillSide && Math.sign(cx - door) === tillSide ? 3 : 0) + 6 / (1 + nearSame);
            break;
          case 'styling':
            score += (1 - dn) * 12 + (wallTouch ? 0 : 3) + (sameCentre ? Math.hypot(cx - sameCentre.x, cz - sameCentre.z) * 0.9 : (maxDepth ? 0 : z * 0.6 + (stylingLeft ? x : W - x) * 0.4));
            break;
          case 'fitting':
            score += (1 - dn) * 10 + (corner ? 0 : wallTouch ? 3 : 10) + (maxDepth ? 0 : z * 0.6 + (stylingLeft ? W - x : x) * 0.4) + 4 / (1 + nearSame);
            break;
          case 'wallDisplay': {
            const parallel = ((L || R) && d >= w) || (B && w >= d);
            // Side walls first (like a real shop floor), spread out rather than bunched in one corner.
            score += (wallTouch ? 0 : 25) + (parallel ? 0 : 3) + dn * 5 + (L || R ? 0 : 1.5) + 3 / (1 + nearSame) +
              (same.filter((p) => p.room === id0).length / Math.max(1, c.n / 6)) * 2 + Math.abs(cz - c.z) * 0.08;
            break;
          }
          case 'island':
            score += (wallTouch ? 20 : 0) + toCentre * 3 + dn * 4 + 8 / (1 + nearSame);
            break;
          case 'seat':
            // A waiting lounge in the front room, on the other side of the door from the till.
            score += (wallTouch ? 0 : 3) + dn * 6 + (id0 === frontRoom ? Math.abs(cz - (D - 3)) * 0.5 : 0) + (tillSide && Math.sign(cx - door) === tillSide && id0 === frontRoom ? 4 : 0) + (sameCentre ? Math.hypot(cx - sameCentre.x, cz - sameCentre.z) * 0.6 : 0);
            break;
          case 'rug':
            score += seatsCentre ? Math.hypot(cx - seatsCentre.x, cz - seatsCentre.z) : toCentre * 3;
            break;
          case 'corner':
            score += (corner ? 0 : wallTouch ? 2 : 8) + 8 / (1 + nearSame);
            break;
        }
        candidates.push({ p: { ...it, x, z, rot, placed: true }, score: score + (x + z * W) * 1e-4, cx, cz, room: id0, clearHit });
      }
    }
    candidates.sort((a, b) => a.score - b.score);
    let chosen = candidates.find((cnd) => !cnd.clearHit && canPlace(out, tier, cnd.p));
    if (!chosen) chosen = candidates.find((cnd) => canPlace(out, tier, cnd.p));
    if (!chosen) { stored.push({ ...it, placed: false, x: 0, z: 0 }); continue; }
    out.push(chosen.p);
    placedBy.set(role, [...same, { x: chosen.cx, z: chosen.cz, room: chosen.room }]);
    if (role === 'till' && !tillSide) tillSide = Math.sign(chosen.cx - door) || 1;
  }
  return [...out, ...stored];
}

function hashOf(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
