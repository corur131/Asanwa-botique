import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FURNITURE,
  KIOSK_LISTING,
  ROOMS,
  STARTER_FURNITURE,
  autoPlace,
  canPlace,
  cellsBlocked,
  furnitureById,
  listingsFor,
  newUid,
  prepareFurnitureForMove,
  readyFurnishedCost,
  roomOf,
  type Placed,
} from './shop';
import { TIERS } from './economy';
import { DIVINE_CONFIG } from '../constants/presets';
import { fromData, newGame, moveTo, openShop } from './engine';

function ownedStarterEquipment(): Placed[] {
  return STARTER_FURNITURE.map((item) => ({ ...item, uid: newUid() }));
}

test('automatic move arrangement distributes floor furniture away from the wall row', () => {
  const items = ownedStarterEquipment();
  const destination = listingsFor(1, 0)[0];
  const arranged = autoPlace(items, destination);
  const floorItems = arranged.filter((item) => furnitureById(item.id).mount === 'floor' && item.placed);
  assert.ok(floorItems.length > 0, 'at least some floor furniture should be placed');
  assert.ok(floorItems.every((item) => item.z >= 1), 'floor furniture should not be automatically packed into the back-wall row');
  assert.equal(new Set(floorItems.map((item) => `${item.x},${item.z}`)).size, floorItems.length, 'floor items should not share the same anchor cell');
});

test('storage move keeps every reusable item owned but unplaced', () => {
  const items = ownedStarterEquipment();
  const result = prepareFurnitureForMove(items, listingsFor(1, 0)[0], 'store');
  assert.equal(result.saleProceeds, 0);
  assert.equal(result.furniture.length, items.filter((item) => furnitureById(item.id).mount !== 'finish').length);
  assert.ok(result.furniture.every((item) => !item.placed), 'all reusable equipment should start in storage');
  assert.ok(result.furniture.every((item) => furnitureById(item.id).mount !== 'finish'), 'old-shop finishes should not move');
});

test('selling equipment clears the new shop and pays the existing 40% resale value', () => {
  const items = ownedStarterEquipment();
  const expected = items
    .filter((item) => furnitureById(item.id).mount !== 'finish')
    .reduce((sum, item) => sum + Math.round(furnitureById(item.id).price * 0.4), 0);
  const result = prepareFurnitureForMove(items, KIOSK_LISTING, 'sell');
  assert.deepEqual(result.furniture, []);
  assert.equal(result.saleProceeds, expected);
});

test('equipment resale calculation includes owned equipment, not shop finishes', () => {
  const items = [
    ...ownedStarterEquipment(),
    { uid: newUid(), id: FURNITURE.find((item) => item.mount === 'finish')!.id, x: 0, z: 0, rot: 0 as const, placed: true },
  ];
  const result = prepareFurnitureForMove(items, listingsFor(1, 0)[0], 'sell');
  const expected = items.filter((item) => furnitureById(item.id).mount !== 'finish')
    .reduce((sum, item) => sum + Math.round(furnitureById(item.id).price * 0.4), 0);
  assert.equal(result.saleProceeds, expected);
});

function allOpenCellsReachable(blocked: boolean[][], width: number, depth: number): boolean {
  const door: [number, number] = [Math.floor(width / 2), depth - 1];
  if (blocked[door[1]]?.[door[0]]) return false;
  const seen = blocked.map((row) => row.map(() => false));
  const queue: [number, number][] = [door];
  seen[door[1]][door[0]] = true;
  for (let i = 0; i < queue.length; i++) {
    const [x, z] = queue[i];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= width || nz >= depth || blocked[nz]?.[nx] || seen[nz][nx]) continue;
      seen[nz][nx] = true;
      queue.push([nx, nz]);
    }
  }
  return blocked.every((row, z) => row.every((isBlocked, x) => isBlocked || seen[z][x]));
}

test('seven tiers are defined and Levels 6–7 have dedicated architectural room styles', () => {
  assert.equal(TIERS.length, 7);
  assert.equal(ROOMS.length, 7);
  const maison = roomOf({ tier: 5, stars: 2 });
  const empire = roomOf({ tier: 6, stars: 2 });
  assert.equal(TIERS[5].name, 'Luxury Maison');
  assert.equal(TIERS[6].name, 'Fashion Empire House');
  assert.equal(ROOMS[5].kind, 'maison');
  assert.equal(ROOMS[6].kind, 'empire');
  assert.ok(maison.w * maison.d > roomOf({ tier: 4, stars: 2 }).w * roomOf({ tier: 4, stars: 2 }).d);
  assert.ok(empire.w * empire.d > maison.w * maison.d);
  assert.ok((maison.partitions || []).length >= 4, 'Level 6 needs multiple internal partitions');
  assert.ok((empire.partitions || []).length >= 7, 'Level 7 needs a more elaborate room layout');
});

test('Signature Level 6 and 7 properties have their own architecture, palette, and floorplan', () => {
  const signature6 = roomOf(listingsFor(5, 0).find((listing) => listing.signature)!);
  const signature7 = roomOf(listingsFor(6, 0).find((listing) => listing.signature)!);
  const standard6 = roomOf(listingsFor(5, 0).find((listing) => !listing.signature && listing.stars === 2)!);
  const standard7 = roomOf(listingsFor(6, 0).find((listing) => !listing.signature && listing.stars === 2)!);

  assert.equal(signature6.signatureTheme, 'botanical-atrium');
  assert.equal(signature7.signatureTheme, 'cobalt-gallery');
  for (const [signature, standard] of [[signature6, standard6], [signature7, standard7]] as const) {
    assert.notEqual(signature.wall, standard.wall, 'Signature properties must not reuse the regular upper-wall colour');
    assert.notEqual(signature.wallLow, standard.wallLow, 'Signature properties must have different lower-wall treatment');
    assert.notEqual(signature.floor, standard.floor, 'Signature properties must have a distinct floor finish');
    assert.notEqual(signature.trim, standard.trim, 'Signature properties must have a distinct architectural accent');
    assert.notDeepEqual(signature.partitions, standard.partitions, 'Signature properties must not reuse the ordinary room layout');
    assert.ok(signature.signature, 'Signature styling should remain marked on the room');
  }
  assert.notEqual(signature6.wall, signature7.wall, 'Level 6 and Level 7 Signature properties need different palettes');
  assert.notEqual(signature6.floor2, signature7.floor2, 'Level 6 and Level 7 Signature properties need different floor patterns');
  assert.ok((signature6.partitions || []).length > 0);
  assert.ok((signature7.partitions || []).length > 0);
});

test('partition doorways keep every room in Level 6 and Level 7 connected to the entrance', () => {
  for (const tier of [5, 6]) {
    for (const listing of listingsFor(tier, 0)) {
      const r = roomOf(listing);
      if (!r.partitions?.length) continue;
      const blocked = cellsBlocked([], listing);
      assert.ok(allOpenCellsReachable(blocked, r.w, r.d), `all open cells should connect to the entrance at tier ${tier}`);
    }
  }
});

test('ready-furnished move charges its displayed package cost and preserves owned equipment in storage', () => {
  const owned = ownedStarterEquipment();
  const ownedUids = new Set(owned.map((item) => item.uid));
  const destination = listingsFor(6, 0).find((listing) => !listing.signature && listing.stars === 2)!;
  const result = prepareFurnitureForMove(owned, destination, 'furnished');
  assert.equal(result.saleProceeds, 0);
  assert.equal(result.packageCost, readyFurnishedCost(destination));
  const preserved = result.furniture.filter((item) => ownedUids.has(item.uid));
  assert.equal(preserved.length, owned.length);
  assert.ok(preserved.every((item) => !item.placed), 'old equipment must be retained in storage, not deleted or sold');
  assert.ok(result.furniture.some((item) => !ownedUids.has(item.uid) && item.placed), 'the shop must contain newly purchased arranged package items');
  assert.ok(result.packageCost > 0);
});

test('a saved five-tier-era flagship still loads with cash, stock, furniture and rivals preserved', () => {
  const fresh = newGame(DIVINE_CONFIG);
  const oldSave = {
    ...fresh,
    tier: 4,
    listing: listingsFor(4, 0).find((listing) => !listing.signature && listing.stars === 2)!,
    cash: 18_765_432,
    stock: fresh.stock.map((item, index) => ({ ...item, pieces: index + 3 })),
    furniture: ownedStarterEquipment(),
  };
  const loaded = fromData(oldSave);
  assert.ok(loaded, 'existing save should be accepted');
  assert.equal(loaded.version, 5);
  assert.equal(loaded.tier, 4);
  assert.equal(loaded.cash, oldSave.cash);
  assert.deepEqual(loaded.stock, oldSave.stock);
  assert.deepEqual(loaded.furniture, oldSave.furniture);
  assert.equal(loaded.rivals.length, oldSave.rivals.length);
});

test('moving into a ready-furnished shop charges the package once and keeps prior equipment', () => {
  const fresh = newGame(DIVINE_CONFIG);
  const owned = fresh.furniture.filter((item) => furnitureById(item.id).mount !== 'finish');
  const ownedUids = new Set(owned.map((item) => item.uid));
  const destination = listingsFor(1, 0).find((listing) => !listing.signature && listing.stars === 2)!;
  const packagePrice = readyFurnishedCost(destination);
  const startingCash = 20_000_000;
  const before = { ...fresh, cash: startingCash };
  const after = moveTo(before, destination, 'furnished');
  assert.equal(after.tier, 1, 'move should complete');
  assert.equal(after.cash, startingCash - destination.moveIn - packagePrice - (after.listing.moveIn - destination.moveIn));
  const retained = after.furniture.filter((item) => ownedUids.has(item.uid));
  assert.equal(retained.length, owned.length);
  assert.ok(retained.every((item) => !item.placed));
  assert.ok(after.furniture.some((item) => !ownedUids.has(item.uid) && item.placed));
  assert.ok(after.ledger.some((line) => line.label === 'Ready-furnished shop package' && line.amount === -packagePrice));
});

test('walkable rugs cannot be arranged through the new internal walls', () => {
  for (const tier of [5, 6]) {
    const destination = listingsFor(tier, 0).find((listing) => !listing.signature && listing.stars === 2)!;
    const room = roomOf(destination);
    const wall = room.partitions!.find((partition) =>
      Array.from({ length: partition.end - partition.start + 1 }, (_, i) => partition.start + i)
        .some((cell) => !partition.openings.includes(cell)),
    )!;
    const start = Array.from({ length: wall.end - wall.start + 1 }, (_, i) => wall.start + i)
      .find((cell) => !wall.openings.includes(cell))!;
    const rug: Placed = {
      uid: newUid(),
      id: 'rug',
      x: wall.axis === 'horizontal' ? start : wall.at - 1,
      z: wall.axis === 'horizontal' ? wall.at - 1 : start,
      rot: 0,
      placed: true,
    };
    assert.equal(canPlace([], destination, rug), false, `tier ${tier} rug should not cross an internal wall`);
  }
});

test('Level 6 and Level 7 furnished packages contain practical luxury equipment and decor', () => {
  const expectations = [
    { tier: 5, minPlaced: 24, ceilingFans: 3, acUnits: 2, sofas: 2, makeupStations: 1, ledStrips: 4, wallArt: 2 },
    { tier: 6, minPlaced: 34, ceilingFans: 4, acUnits: 3, sofas: 3, makeupStations: 2, ledStrips: 6, wallArt: 3 },
  ];
  for (const expected of expectations) {
    const destination = listingsFor(expected.tier, 0).find((listing) => !listing.signature && listing.stars === 2)!;
    const owned = ownedStarterEquipment();
    const ownedUids = new Set(owned.map((item) => item.uid));
    const fitout = prepareFurnitureForMove(owned, destination, 'furnished');
    const kit = fitout.furniture.filter((item) => !ownedUids.has(item.uid));
    const placed = kit.filter((item) => item.placed);
    const count = (id: string) => kit.filter((item) => item.id === id).length;
    assert.ok(placed.length >= expected.minPlaced, `tier ${expected.tier + 1} should arrange a full fitout, not just a few chairs`);
    assert.ok(count('ceilingFan') >= expected.ceilingFans);
    assert.ok(count('ac') >= expected.acUnits);
    assert.ok(count('velvetSofa') >= expected.sofas);
    assert.ok(count('makeupStation') >= expected.makeupStations);
    assert.ok(count('ledStrip') >= expected.ledStrips);
    assert.ok(count('wallArt') >= expected.wallArt);
    assert.ok(count('generator') >= 1, 'the high-end shop should have backup power equipment');
    assert.ok(count('chandelier') >= (expected.tier === 5 ? 2 : 3));
    assert.ok(count(expected.tier === 5 ? 'herringbone' : 'marbleFloor') >= 1, 'floor finish should match the store tier');
    assert.ok(count(expected.tier === 5 ? 'paintWhite' : 'paintNavy') >= 1, 'wall finish should match the store tier');
  }
});

test('Signature Fashion Empire can receive multiple celebrity guests on adjacent scheduled days', () => {
  const originalRandom = Math.random;
  try {
    Math.random = () => 0.001;
    const fresh = newGame(DIVINE_CONFIG);
    const signatureListing = listingsFor(6, 0).find((listing) => listing.signature);
    assert.ok(signatureListing, 'Fashion Empire should have a Signature property option');
    const day1 = openShop({
      ...fresh, tier: 6, listing: signatureListing!, day: 1, phase: 'morning' as const,
    });
    assert.ok(day1.arrivals.filter((arrival) => !!arrival.c.celebrity).length >= 2,
      'a Signature Fashion Empire can receive a second celebrity on a scheduled VIP day');
    assert.equal(day1.lastCelebrityVisitDay, 1);

    const day2 = openShop({ ...day1, day: 2, phase: 'morning' as const, celebDay: undefined });
    assert.ok(day2.arrivals.some((arrival) => !!arrival.c.celebrity),
      'a second scheduled opportunity can produce another visit on the following day');

    const tippedDay2 = openShop({ ...day1, day: 2, phase: 'morning' as const, celebDay: 2 });
    assert.ok(tippedDay2.arrivals.some((arrival) => !!arrival.c.celebrity),
      'Deborah’s confirmed lead remains an additional opportunity when daily capacity is available');
    assert.equal(tippedDay2.lastCelebrityVisitDay, 2);
  } finally {
    Math.random = originalRandom;
  }
});

test('normal Level 6 and 7 properties can receive celebrities on candidate visit days', () => {
  // The visit is now an opportunity, not a guaranteed payout. Force a successful probability roll
  // to make this integration check deterministic; the frequency distribution is covered separately.
  const originalRandom = Math.random;
  try {
    Math.random = () => 0.1;
    for (const tier of [5, 6]) {
      const fresh = newGame(DIVINE_CONFIG);
      const destination = listingsFor(tier, 0).find((listing) => !listing.signature && listing.stars === 2)!;
      const state = { ...fresh, tier, listing: destination, day: 1, phase: 'morning' as const };
      const opened = openShop(state);
      assert.ok(opened.arrivals.some((arrival) => !!arrival.c.celebrity), `regular level ${tier + 1} property can receive its tier-scheduled VIP`);
    }
  } finally {
    Math.random = originalRandom;
  }
});
