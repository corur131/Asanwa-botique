/**
 * The physical shop: listings to rent, the room's floor grid, and furniture.
 * Display space comes from furniture, up to the shop size's limit (TIERS[t].slots).
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
export type Mount = 'floor' | 'wall' | 'ceiling';
export interface FurnitureDef {
  id: string;
  name: string;
  price: number;
  w: number;
  d: number;
  mount: Mount;
  group: 'Display' | 'Mirrors' | 'Hair & makeup' | 'Seating' | 'Comfort' | 'Decor';
  slots?: number;
  mirror?: number;
  hairBonus?: number;
  makeupBonus?: number;
  seats?: number;
  repBoost?: number;
  generator?: boolean;
  wigs?: boolean;
  richBonus?: number;
  prestige: number;
  minTier?: number;
  starter?: boolean;
  note: string;
}

export const FURNITURE: FurnitureDef[] = [
  // display
  { id: 'rustyRail', name: 'Rusty rail', price: 4_000, w: 2, d: 1, mount: 'floor', group: 'Display', slots: 8, prestige: -1, starter: true, note: '8 designs. Squeaks when you touch it.' },
  { id: 'woodTable', name: 'Wobbly table', price: 3_000, w: 1, d: 1, mount: 'floor', group: 'Display', slots: 4, prestige: 0, starter: true, note: '4 designs.' },
  { id: 'chromeRail', name: 'Chrome rail', price: 25_000, w: 2, d: 1, mount: 'floor', group: 'Display', slots: 8, prestige: 1, note: '8 designs.' },
  { id: 'shoeRack', name: 'Shoe rack', price: 15_000, w: 1, d: 1, mount: 'floor', group: 'Display', slots: 5, prestige: 0, note: '5 designs.' },
  { id: 'wallShelf', name: 'Wall shelves', price: 20_000, w: 2, d: 1, mount: 'wall', group: 'Display', slots: 6, prestige: 1, note: '6 designs, takes no floor space.' },
  { id: 'mannequin', name: 'Mannequin', price: 30_000, w: 1, d: 1, mount: 'floor', group: 'Display', slots: 2, prestige: 2, note: '2 designs. Makes the shop look serious.' },
  { id: 'jewelCounter', name: 'Glass jewellery counter', price: 70_000, w: 2, d: 1, mount: 'floor', group: 'Display', slots: 8, prestige: 2, minTier: 1, note: '8 designs, lit glass top.' },
  { id: 'goldRail', name: 'Gold display rail', price: 140_000, w: 2, d: 1, mount: 'floor', group: 'Display', slots: 10, prestige: 3, minTier: 2, note: '10 designs.' },
  { id: 'displayWall', name: 'Lit display wall', price: 450_000, w: 3, d: 1, mount: 'wall', group: 'Display', slots: 16, prestige: 5, minTier: 3, note: '16 designs on a glowing wall.' },
  // mirrors
  { id: 'crackedMirror', name: 'Cracked mirror', price: 2_000, w: 1, d: 1, mount: 'wall', group: 'Mirrors', mirror: 0, prestige: -1, starter: true, note: 'Customers can barely see themselves.' },
  { id: 'standMirror', name: 'Standing mirror', price: 30_000, w: 1, d: 1, mount: 'floor', group: 'Mirrors', mirror: 2, prestige: 1, note: '+2 to every score.' },
  { id: 'goldMirror', name: 'Gold-frame mirror', price: 120_000, w: 1, d: 1, mount: 'floor', group: 'Mirrors', mirror: 3, prestige: 2, minTier: 1, note: '+3 to every score.' },
  { id: 'mirrorWall', name: 'Mirror wall', price: 600_000, w: 3, d: 1, mount: 'wall', group: 'Mirrors', mirror: 5, prestige: 4, minTier: 2, note: '+5 to every score. The selfie spot.' },
  // hair and makeup
  { id: 'plasticChair', name: 'Plastic chair', price: 1_500, w: 1, d: 1, mount: 'floor', group: 'Seating', seats: 1, prestige: -1, starter: true, note: 'One person can wait.' },
  { id: 'hairStation', name: 'Hair station', price: 45_000, w: 1, d: 1, mount: 'floor', group: 'Hair & makeup', hairBonus: 1, wigs: true, prestige: 1, note: 'Needed to install wigs. +1 on hair.' },
  { id: 'salonChair', name: 'Salon chair and dryer', price: 160_000, w: 1, d: 1, mount: 'floor', group: 'Hair & makeup', hairBonus: 3, wigs: true, prestige: 2, minTier: 1, note: 'Installs wigs. +3 on hair.' },
  { id: 'ringLight', name: 'Ring light', price: 18_000, w: 1, d: 1, mount: 'floor', group: 'Hair & makeup', makeupBonus: 1, prestige: 1, note: '+1 on made-up looks.' },
  { id: 'makeupStation', name: 'Makeup station', price: 75_000, w: 2, d: 1, mount: 'floor', group: 'Hair & makeup', makeupBonus: 3, prestige: 2, note: '+3 on made-up looks.' },
  // seating
  { id: 'bench', name: 'Wooden bench', price: 20_000, w: 2, d: 1, mount: 'floor', group: 'Seating', seats: 3, prestige: 0, note: 'Three people can wait.' },
  { id: 'sofa', name: 'Sofa', price: 110_000, w: 2, d: 1, mount: 'floor', group: 'Seating', seats: 4, prestige: 2, minTier: 1, note: 'Four people wait in comfort.' },
  { id: 'velvetSofa', name: 'Velvet lounge sofa', price: 380_000, w: 3, d: 1, mount: 'floor', group: 'Seating', seats: 6, prestige: 4, minTier: 3, note: 'Six people, and the rich ones love it.' },
  // comfort
  { id: 'fan', name: 'Standing fan', price: 15_000, w: 1, d: 1, mount: 'floor', group: 'Comfort', repBoost: 0.1, prestige: 0, note: 'Reputation grows 10% faster.' },
  { id: 'ac', name: 'Split AC', price: 220_000, w: 1, d: 1, mount: 'wall', group: 'Comfort', repBoost: 0.25, prestige: 2, minTier: 1, note: 'Reputation grows 25% faster.' },
  { id: 'generator', name: 'Generator', price: 160_000, w: 1, d: 1, mount: 'floor', group: 'Comfort', generator: true, prestige: 0, note: 'No lost customers when NEPA takes light.' },
  // decor
  { id: 'cardboardSign', name: 'Cardboard sign', price: 500, w: 1, d: 1, mount: 'wall', group: 'Decor', prestige: -1, starter: true, note: '"Divine Styles" in marker.' },
  { id: 'bareBulb', name: 'Bare bulb', price: 500, w: 1, d: 1, mount: 'ceiling', group: 'Decor', prestige: -1, starter: true, note: 'One bulb on a wire.' },
  { id: 'plant', name: 'Potted plant', price: 8_000, w: 1, d: 1, mount: 'floor', group: 'Decor', prestige: 1, note: 'Prestige +1.' },
  { id: 'rug', name: 'Rug', price: 20_000, w: 2, d: 2, mount: 'floor', group: 'Decor', prestige: 1, note: 'Prestige +1. People can walk on it.' },
  { id: 'wallArt', name: 'Framed fashion prints', price: 25_000, w: 1, d: 1, mount: 'wall', group: 'Decor', prestige: 1, note: 'Prestige +1.' },
  { id: 'shopSign', name: 'Lit shop sign', price: 40_000, w: 2, d: 1, mount: 'wall', group: 'Decor', prestige: 2, note: 'Prestige +2.' },
  { id: 'pendants', name: 'Pendant lights', price: 60_000, w: 1, d: 1, mount: 'ceiling', group: 'Decor', prestige: 2, minTier: 1, note: 'Prestige +2. Replaces the bare bulb look.' },
  { id: 'fittingRoom', name: 'Fitting room', price: 180_000, w: 2, d: 2, mount: 'floor', group: 'Decor', prestige: 3, richBonus: 2, minTier: 1, note: 'Prestige +3, rich clients score +2.' },
  { id: 'neon', name: 'Neon "Divine" sign', price: 90_000, w: 2, d: 1, mount: 'wall', group: 'Decor', prestige: 3, minTier: 2, note: 'Prestige +3. Very Instagram.' },
  { id: 'chandelier', name: 'Crystal chandelier', price: 500_000, w: 1, d: 1, mount: 'ceiling', group: 'Decor', prestige: 5, minTier: 3, note: 'Prestige +5.' },
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
export const usesFloor = (id: string) => furnitureById(id).mount === 'floor' && id !== 'rug';

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
  if (p.id === 'rug') return true;
  const g = cellsBlocked(items, tier, p.uid);
  for (let z = p.z; z < p.z + d; z++) for (let x = p.x; x < p.x + w; x++) if (g[z][x]) return false;
  return true;
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
    if (f.mount === 'ceiling') { out.push({ ...it, placed: true, x: 0, z: 0 }); continue; }
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
  repBoost: number;
  generator: boolean;
  wigs: boolean;
  richBonus: number;
  furniturePrestige: number;
  prestige: number;
}

/** Most designs a shop can show: bigger, better listings hold more. */
export const displayLimit = (tier: number, stars: number) => Math.round(TIERS[tier].slots * (1 + (Math.max(1, stars) - 1) * 0.12));

export function shopStats(items: Placed[], tier: number, stars: number): ShopStats {
  const placed = items.filter((p) => p.placed).map((p) => furnitureById(p.id));
  const sum = (k: keyof FurnitureDef) => placed.reduce((a, f) => a + ((f[k] as number) || 0), 0);
  const max = (k: keyof FurnitureDef) => placed.reduce((a, f) => Math.max(a, (f[k] as number) || 0), 0);
  // pendant lights replace the bare bulb's ugliness
  let fp = sum('prestige');
  if (placed.some((f) => f.id === 'pendants' || f.id === 'chandelier') && placed.some((f) => f.id === 'bareBulb')) fp += 1;
  if (placed.some((f) => f.id === 'shopSign' || f.id === 'neon') && placed.some((f) => f.id === 'cardboardSign')) fp += 1;
  if (placed.some((f) => (f.mirror || 0) > 0) && placed.some((f) => f.id === 'crackedMirror')) fp += 1;
  const furniturePrestige = Math.min(fp, 4 + tier * 4);
  return {
    display: Math.min(displayLimit(tier, stars), sum('slots')),
    mirror: max('mirror'),
    hairBonus: max('hairBonus'),
    makeupBonus: max('makeupBonus'),
    seats: sum('seats'),
    repBoost: Math.max(...placed.map((f) => f.repBoost || 0), 0),
    generator: placed.some((f) => f.generator),
    wigs: placed.some((f) => f.wigs),
    richBonus: max('richBonus'),
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
