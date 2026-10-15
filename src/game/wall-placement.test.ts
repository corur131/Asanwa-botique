import assert from 'node:assert/strict';
import test from 'node:test';
import { DIVINE_CONFIG } from '../constants/presets';
import { buyPreviewed, newGame, withPreview } from './engine';
import { furnitureById, room, wallCapacity, wallFits, wallLayout, wallNoHang, type Placed } from './shop';
import type { GameState } from './types';

const signature = { tier: 4, stars: 3, signature: true };

function shopAt(listing: { tier: number; stars: number; signature?: boolean }, furniture: Placed[] = []): GameState {
  const s = newGame(DIVINE_CONFIG);
  return { ...s, cash: 100_000_000, tier: listing.tier, listing: { ...s.listing, ...listing, signature: !!listing.signature }, furniture };
}

test('signature and Empire feature walls are no-hang zones and do not count as wall space', () => {
  const zone = wallNoHang(signature).back[0];
  assert.ok(zone && zone[1] - zone[0] >= 5, 'the centre feature panel is blocked');
  assert.equal(wallNoHang({ tier: 6, stars: 2 }).back.length, 1, 'Empire House centre panel');
  assert.equal(wallNoHang({ tier: 1, stars: 2 }).back.length, 0, 'ordinary shops have no blocked zone');
  const r = room(signature);
  assert.equal(wallCapacity(signature), r.w + r.d - 1 - (zone[1] - zone[0]));
  const rail: Placed = { uid: 'r1', id: 'wallRail', x: 0, z: 0, rot: 0, placed: true };
  assert.equal(wallFits([rail], signature, 'r1', 'back', zone[0]), false);
  assert.equal(wallFits([rail], signature, 'r1', 'back', 0), true);
});

test('a wall piece saved inside the feature panel moves to the nearest free spot, and is never lost', () => {
  const zone = wallNoHang(signature).back[0];
  const inside: Placed = { uid: 'old', id: 'hangerWall', x: zone[0] + 1, z: 0, rot: 0, placed: true, wallSide: 'back' };
  const spot = wallLayout([inside], signature).old;
  assert.ok(spot);
  const w = furnitureById('hangerWall').w;
  assert.ok(spot.side === 'left' || spot.at + w <= zone[0] || spot.at >= zone[1]);
  // walls full except the feature: the piece still hangs somewhere
  const r = room(signature);
  const filler: Placed[] = [];
  let n = 0;
  for (const [side, len] of [['back', r.w], ['left', r.d - 1]] as const) {
    for (let at = 0; at < len; at++) {
      if (side === 'back' && at >= zone[0] && at < zone[1]) continue;
      filler.push({ uid: `f${n++}`, id: 'clock', x: at, z: 0, rot: 0, placed: true, wallSide: side });
    }
  }
  assert.ok(wallLayout([...filler, inside], signature).old, 'piece is still shown');
});

test('buying a wall piece hangs it exactly where the player chose', () => {
  const s = shopAt({ tier: 2, stars: 2 });
  const first = withPreview(s, 'wallRail');
  assert.ok(first.ok && first.wallSide, 'a default spot is offered');
  const chosen = withPreview(s, 'wallRail', { x: 2, z: 0, rot: 0, wallSide: 'left' });
  assert.ok(chosen.ok);
  const after = buyPreviewed(s, 'wallRail', { x: 2, z: 0, rot: 0, wallSide: 'left' });
  const bought = after.furniture.find((p) => p.id === 'wallRail' && !s.furniture.some((o) => o.uid === p.uid))!;
  assert.deepEqual(wallLayout(after.furniture, after.listing)[bought.uid], { side: 'left', at: 2 });
  assert.equal(after.cash, s.cash - furnitureById('wallRail').price);
});

test('the feature wall is refused when buying, with a clear reason, and nothing is charged', () => {
  const s = shopAt(signature);
  const zone = wallNoHang(signature).back[0];
  const bad = withPreview(s, 'wallRail', { x: zone[0] + 1, z: 0, rot: 0, wallSide: 'back' });
  assert.equal(bad.ok, false);
  assert.match(bad.why || '', /feature wall/);
  assert.equal(buyPreviewed(s, 'wallRail', { x: zone[0] + 1, z: 0, rot: 0, wallSide: 'back' }), s);
});
