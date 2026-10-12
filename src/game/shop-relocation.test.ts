import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FURNITURE,
  KIOSK_LISTING,
  STARTER_FURNITURE,
  autoPlace,
  furnitureById,
  listingsFor,
  newUid,
  prepareFurnitureForMove,
  type Placed,
} from './shop';

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
