/**
 * Rival shops laid out like real boutiques, in zones:
 * - display along the side walls, and a feature island in the middle of big shops;
 * - the back wall: a mirror wall in big shops, plus shelves, art and AC;
 * - a mirror / styling corner at the back;
 * - the till counter by the entrance and seating on the other side of the door;
 * - plants and decor in the corners, a rug in the middle.
 * Each rival's kit matches what they sell, richer shops are fuller, and the
 * whole shop is rearranged every few weeks.
 */
import { FURNITURE, Rot, Listing, Placed, canPlace, ceilingCapacity, furnitureById, newUid, room } from './shop';
import { Rival, Speciality } from './types';

type Kit = {
  side: string[]; // display along the side walls
  island: string[];
  wall: string[]; // back wall pieces (after the mirror wall)
  corner: string[]; // styling corner
  seat: string[];
  decor: string[];
  rug: string[];
  lights: string[];
  paint: string[];
  floor: string[];
};

const KITS: Record<Speciality, Kit> = {
  bridal: { side: ['goldRail', 'mannequin', 'goldRail', 'glassCabinet'], island: ['islandTable', 'windowPodium'], wall: ['wallArt', 'displayWall', 'ac', 'wallArt'], corner: ['goldMirror', 'archMirror', 'fittingRoom', 'vanity'], seat: ['velvetSofa', 'ottoman', 'sofa'], decor: ['flowers', 'palm', 'flowers', 'snakePlant'], rug: ['persianRug', 'fluffyRug'], lights: ['chandelier', 'pendants', 'trackLights'], paint: ['paintBlush', 'goldWallpaper', 'paintWhite'], floor: ['marbleFloor', 'herringbone'] },
  luxury: { side: ['goldRail', 'glassCabinet', 'goldRail', 'mannequin'], island: ['islandTable', 'jewelCounter'], wall: ['displayWall', 'wallArt', 'ac', 'shoeWall'], corner: ['goldMirror', 'fittingRoom', 'vanity'], seat: ['velvetSofa', 'ottoman'], decor: ['palm', 'flowers', 'snakePlant'], rug: ['persianRug'], lights: ['chandelier', 'trackLights', 'pendants'], paint: ['goldWallpaper', 'paintNavy', 'paintWhite'], floor: ['marbleFloor', 'terrazzo'] },
  native: { side: ['woodShelving', 'nestingTables', 'woodShelving', 'chromeRail'], island: ['nestingTables', 'islandTable'], wall: ['wallShelf', 'ankaraArt', 'wallShelf', 'ac'], corner: ['standMirror', 'curtainCorner', 'makeupStation'], seat: ['bench', 'sofa', 'plasticChair'], decor: ['plant', 'snakePlant', 'plant'], rug: ['rug'], lights: ['tubeLight', 'pendants', 'ceilingFan'], paint: ['ankaraWallpaper', 'paintTerracotta', 'paintSage'], floor: ['woodFloor', 'terrazzo', 'vinylFloor'] },
  cheap: { side: ['chromeRail', 'zRack', 'rollingRail', 'doubleRail', 'woodTable'], island: ['roundRack', 'nestingTables'], wall: ['wallRail', 'cardboardSign', 'wallRail', 'paintedSign'], corner: ['standMirror', 'curtainCorner'], seat: ['plasticChair', 'plasticChair', 'stool'], decor: ['plant'], rug: [], lights: ['tubeLight', 'bareBulb', 'ceilingFan'], paint: ['paintWhite'], floor: ['vinylFloor'] },
  genz: { side: ['roundRack', 'chromeRail', 'shoeRack', 'doubleRail'], island: ['roundRack', 'windowPodium'], wall: ['neon', 'displayWall', 'ledStrip', 'shoeWall', 'ac'], corner: ['archMirror', 'ringLight', 'vanity'], seat: ['ottoman', 'stool', 'sofa'], decor: ['snakePlant', 'plant'], rug: ['fluffyRug', 'rug'], lights: ['trackLights', 'pendants', 'ceilingFan'], paint: ['paintBlush', 'paintNavy', 'paintSage'], floor: ['terrazzo', 'vinylFloor'] },
  wigs: { side: ['mannequin', 'spinner', 'mannequin', 'glassCabinet'], island: ['islandTable', 'roundRack'], wall: ['wallShelf', 'neon', 'wallMirror', 'ac'], corner: ['salonChair', 'hairStation', 'hoodDryer', 'vanity', 'ringLight'], seat: ['sofa', 'stool'], decor: ['flowers', 'plant'], rug: ['fluffyRug'], lights: ['pendants', 'trackLights', 'ceilingFan'], paint: ['paintBlush', 'paintWhite'], floor: ['terrazzo', 'woodFloor'] },
  menswear: { side: ['woodShelving', 'chromeRail', 'glassCabinet', 'shoeRack'], island: ['islandTable', 'nestingTables'], wall: ['shoeWall', 'wallArt', 'wallRail', 'ac', 'clock'], corner: ['standMirror', 'fittingRoom', 'curtainCorner'], seat: ['bench', 'sofa'], decor: ['snakePlant', 'palm'], rug: ['persianRug', 'rug'], lights: ['trackLights', 'pendants', 'tubeLight'], paint: ['paintNavy', 'paintSage', 'paintTerracotta'], floor: ['woodFloor', 'herringbone'] },
  thrift: { side: ['rollingRail', 'zRack', 'doubleRail', 'woodTable', 'chromeRail'], island: ['roundRack', 'nestingTables'], wall: ['wallRail', 'paintedSign', 'wallShelf', 'clock'], corner: ['standMirror', 'curtainCorner'], seat: ['stool', 'bench'], decor: ['plant', 'snakePlant'], rug: ['rug'], lights: ['tubeLight', 'bareBulb', 'ceilingFan'], paint: ['paintTerracotta', 'paintSage'], floor: ['vinylFloor', 'woodFloor'] },
  everyday: { side: ['chromeRail', 'doubleRail', 'shoeRack', 'woodShelving'], island: ['roundRack', 'nestingTables'], wall: ['wallRail', 'shopSign', 'wallShelf', 'ac', 'wallArt'], corner: ['standMirror', 'curtainCorner', 'makeupStation'], seat: ['sofa', 'bench', 'stool'], decor: ['plant', 'snakePlant'], rug: ['rug'], lights: ['tubeLight', 'pendants', 'ceilingFan'], paint: ['paintWhite', 'paintSage'], floor: ['vinylFloor', 'terrazzo'] },
};

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/** How often (in days) a rival rearranges. */
export const REARRANGE_DAYS = 21;

/** A rival's shop, furnished and arranged for this stretch of weeks. */
export function zonedLayout(r: Rival, listing: Listing, day: number): Placed[] {
  const epoch = Math.floor(day / REARRANGE_DAYS);
  const rand = rng(hash(r.id) + epoch * 7919);
  const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const ok = (id: string) => { const f = furnitureById(id); return !!f && (f.minTier || 0) <= r.tier; };
  const kit = KITS[r.speciality] || KITS.everyday;
  const tier = r.tier;
  const R = room(listing);
  const W = R.w;
  const D = R.d;
  const door = Math.floor(W / 2);
  const fill = Math.min(1, 0.55 + tier * 0.12); // richer shops are fuller
  const items: Placed[] = [];
  const put = (id: string, x: number, z: number, rot: Rot = 0): boolean => {
    if (!ok(id)) return false;
    const p: Placed = { uid: newUid(), id, x, z, rot, placed: true };
    if (furnitureById(id).mount !== 'floor') { items.push(p); return true; }
    if (!canPlace(items, listing, p)) return false;
    items.push(p);
    return true;
  };
  const pickFrom = (list: string[]) => { const c = shuffle(list.filter(ok)); return c[0]; };

  // finishes
  if (tier > 0) {
    const paint = pickFrom(kit.paint);
    const floor = pickFrom(kit.floor);
    if (paint) put(paint, 0, 0);
    if (floor) put(floor, 0, 0);
  }

  // back wall: the mirror wall in big shops, then the rest of the wall kit, up to the wall's width
  let wallW = 0;
  const wallAdd = (id: string) => {
    if (!ok(id)) return;
    const f = furnitureById(id);
    if (wallW + f.w > W) return;
    items.push({ uid: newUid(), id, x: wallW, z: 0, rot: 0, placed: true });
    wallW += f.w;
  };
  const wallKit = shuffle(kit.wall);
  if (tier >= 2) wallAdd('mirrorWall');
  else if (tier === 1 && rand() < 0.6) wallAdd('wallMirror');
  else if (tier === 0) wallAdd('crackedMirror');
  for (const id of wallKit) if (rand() < fill + 0.2) wallAdd(id);
  for (const id of wallKit) wallAdd(id);

  // styling corner at the back: mirror and stations in front of the back wall, one end
  const cornerLeft = rand() < 0.5;
  const corner = shuffle(kit.corner).filter(ok);
  let cx = cornerLeft ? 1 : W - 2;
  for (const id of corner.slice(0, 1 + Math.round(tier * 0.8))) {
    const f = furnitureById(id);
    const x = cornerLeft ? cx : cx - f.w + 1;
    if (put(id, x, 1)) cx += cornerLeft ? f.w : -f.w;
  }

  // display along both side walls, turned to run along the wall
  const side = kit.side.filter(ok);
  for (const x of [0, W - 1]) {
    let z = 0;
    let k = Math.floor(rand() * side.length);
    while (z < D - 2) {
      if (rand() > fill + 0.15) { z++; continue; }
      const id = side[k++ % side.length];
      const f = furnitureById(id);
      const len = f.w;
      const xx = x === 0 ? 0 : W - f.d;
      if (put(id, xx, z, f.w > 1 ? 1 : 0)) z += len;
      else z++;
    }
  }

  // the island in the middle of bigger shops
  if (tier >= 2 || (tier === 1 && W >= 9 && rand() < 0.5)) {
    const n = tier >= 3 ? 2 : 1;
    const isl = shuffle(kit.island.filter(ok));
    const midZ = Math.max(2, Math.floor(D / 2) - 1);
    for (let i = 0; i < n && isl.length; i++) {
      const id = isl[i % isl.length];
      const f = furnitureById(id);
      const x = n === 1 ? Math.floor(W / 2 - f.w / 2) : i === 0 ? Math.floor(W / 3 - f.w / 2) : Math.floor((2 * W) / 3 - f.w / 2);
      put(id, x, midZ) || put(id, x, midZ - 1) || put(id, x, midZ + 1);
    }
  }

  // till counter by the entrance, seats on the other side of the door
  const tillSide = rand() < 0.5 ? -1 : 1;
  const tillId = tier >= 1 ? (ok('jewelCounter') ? 'jewelCounter' : 'woodTable') : 'woodTable';
  const tillX = tillSide < 0 ? Math.max(1, door - 3) : Math.min(W - 3, door + 2);
  put(tillId, tillX, D - 2) || put(tillId, tillX, D - 3);
  const seats = shuffle(kit.seat.filter(ok));
  let sx = tillSide < 0 ? door + 1 : door - 1;
  for (const id of seats.slice(0, 1 + Math.min(2, tier))) {
    const f = furnitureById(id);
    const x = tillSide < 0 ? sx : sx - f.w + 1;
    if (put(id, x, D - 2)) sx += tillSide < 0 ? f.w : -f.w;
  }

  // decor in the corners, a rug in the middle
  const decor = kit.decor.filter(ok);
  const corners: [number, number][] = shuffle([[0, D - 2], [W - 1, D - 2], [0, 0], [W - 1, 0], [1, D - 2], [W - 2, D - 2]]);
  let di = 0;
  for (const [x, z] of corners) if (decor.length && rand() < fill) put(decor[di++ % decor.length], x, z);
  const rug = pickFrom(kit.rug);
  if (rug && tier >= 1) put(rug, Math.floor(W / 2) - 1, Math.max(1, Math.floor(D / 2) + (tier >= 2 ? 1 : 0)));
  // a fan or standing AC and a water dispenser where they fit
  for (const id of [tier >= 2 ? 'standingAc' : 'fan', 'waterDispenser', 'speaker']) {
    for (let t = 0; t < 12; t++) if (put(id, Math.floor(rand() * W), 1 + Math.floor(rand() * (D - 3)))) break;
  }

  // ceiling lights
  const lights = kit.lights.filter(ok);
  const nCeil = Math.min(ceilingCapacity(listing), 2 + tier * 2);
  for (let i = 0; i < nCeil && lights.length; i++) put(lights[i % lights.length], 0, 0);

  // yard: power by size
  if (tier >= 1) put(tier >= 2 ? 'generator' : 'smallGen', 0, 0);
  else put('smallGen', 0, 0);
  for (let i = 0; i < Math.min(4, tier); i++) put('inverter', i + 1, 0);
  return items;
}

/** For tests: every rival kit only uses real furniture. */
export const kitIds = () => Object.values(KITS).flatMap((k) => Object.values(k).flat()).filter((id) => !FURNITURE.some((f) => f.id === id));
