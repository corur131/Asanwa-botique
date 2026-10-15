import assert from 'node:assert/strict';
import test from 'node:test';
import { DIVINE_CONFIG } from '../constants/presets';
import { FABRIC_COLORS } from '../constants/catalog';
import { buyCart, checkoutPlacement, displayCap, displayedCount, newGame, putOnDisplay, staffJobMinutes } from './engine';
import { staffMinutes } from './economy';
import { MARKET, isClothing, productKey } from './market';
import type { CartLine } from './engine';
import type { GameState } from './types';

test('higher-level staff are much faster, and smaller jobs take less time', () => {
  assert.equal(staffMinutes(1), 60);
  assert.equal(staffMinutes(2), 53);
  assert.ok(staffMinutes(5) <= 36);
  assert.ok(staffMinutes(8) <= 25);
  assert.equal(staffMinutes(10), 18);
  assert.equal(staffMinutes(10, 'hair'), 9);
  for (let l = 1; l < 10; l++) assert.ok(staffMinutes(l + 1) < staffMinutes(l), `level ${l + 1} beats ${l}`);
  const s = newGame(DIVINE_CONFIG);
  assert.ok(staffJobMinutes(s, { level: 5 }, { service: 'hair' }) < staffJobMinutes(s, { level: 5 }, { service: undefined }));
});

function lineFor(id: string): CartLine {
  const e = MARKET.find((x) => x.id === id)!;
  const base = { kind: e.kind, itemId: e.id, fabric: isClothing(e.kind) ? e.fabric || 'plain' : undefined, color: FABRIC_COLORS[5], color2: FABRIC_COLORS[3], pattern: 0, pieces: 2 };
  return { ...base, key: [base.kind, base.itemId, base.fabric || '', base.color, base.color2, base.pattern].join('|') };
}

function fullRacks(): { s: GameState; spare: CartLine } {
  let s: GameState = { ...newGame(DIVINE_CONFIG), cash: 50_000_000 };
  const cap = displayCap(s);
  assert.ok(cap > 0, 'starting shop has some display space');
  const pool = MARKET.filter((e) => e.minTier === undefined || e.minTier <= s.tier).filter((e) => !s.stock.some((d) => d.itemId === e.id));
  let i = 0;
  while (displayedCount(s) < cap) s = buyCart(s, [lineFor(pool[i++].id)]);
  return { s, spare: lineFor(pool[i].id) };
}

test('a new style bought with full racks goes to storage unless the player makes room', () => {
  const { s, spare } = fullRacks();
  const stored = buyCart(s, [spare]);
  const placed = checkoutPlacement(s, stored);
  assert.equal(placed.stored.length, 1);
  assert.equal(placed.shown.length, 0);

  const roomy = buyCart(s, [spare], { makeRoom: true });
  const swapped = checkoutPlacement(s, roomy);
  assert.equal(swapped.shown.length, 1, 'new style is on the rack');
  assert.equal(swapped.swappedOut.length, 1, 'one slow seller went to storage');
  assert.equal(displayedCount(roomy), displayCap(roomy));
});

test('putOnDisplay swaps a stored style onto full racks but never one the look is using', () => {
  const { s, spare } = fullRacks();
  const withStored = buyCart(s, [spare]);
  const item = withStored.stock.find((d) => d.itemId === spare.itemId)!;
  assert.equal(item.displayed, false);
  const keep = new Set(withStored.stock.filter((d) => d.displayed).map(productKey));
  assert.equal(putOnDisplay(withStored, item.uid, keep), withStored, 'nothing may be swapped out');
  const after = putOnDisplay(withStored, item.uid);
  assert.equal(after.stock.find((d) => d.uid === item.uid)!.displayed, true);
  assert.equal(displayedCount(after), displayCap(after));
});
