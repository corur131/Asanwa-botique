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
import { fromData, newGame, moveTo, previewCashGrant } from './engine';

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

test('preview cash grants add ₦20 billion once per preview revision and are inert when disabled', () => {
  const original = newGame(DIVINE_CONFIG);
  const amount = 20_000_000_000;
  assert.equal(previewCashGrant(original, '', amount), original, 'no preview grant ID means no cash change');

  const first = previewCashGrant(original, 'pr-30-revision-a', amount);
  assert.equal(first.cash, original.cash + amount);
  assert.ok(first.appliedGrants?.includes('preview-cash-pr-30-revision-a'));
  assert.equal(previewCashGrant(first, 'pr-30-revision-a', amount), first, 'reload/re-render must not duplicate the same grant');

  const nextRevision = previewCashGrant(first, 'pr-30-revision-b', amount);
  assert.equal(nextRevision.cash, original.cash + amount * 2, 'a fresh preview revision gets its own one-time grant');
  assert.equal(previewCashGrant(original, 'pr-30-revision-a', 0), original, 'invalid grant amounts are ignored');
});
