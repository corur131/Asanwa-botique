import assert from 'node:assert/strict';
import test from 'node:test';
import { DIVINE_CONFIG } from '../constants/presets';
import { FABRIC_COLORS } from '../constants/catalog';
import { buyCart, cartTotal, newGame, validateCart } from './engine';
import { isClothing, MARKET } from './market';
import type { CartLine } from './engine';

const EMPIRE_ITEM_ID = 'couture26EmpireLiquidMetalDrapeShell';

function levelSevenCart(cash: number) {
  const entry = MARKET.find((item) => item.id === EMPIRE_ITEM_ID);
  assert.ok(entry, 'Level 7 couture item exists in Yaba Mart');
  const fabric = isClothing(entry.kind) ? entry.fabric || 'plain' : undefined;
  const lineWithoutKey = {
    kind: entry.kind,
    itemId: entry.id,
    fabric,
    color: FABRIC_COLORS[5],
    color2: isClothing(entry.kind) ? FABRIC_COLORS[3] : FABRIC_COLORS[5],
    pattern: 0,
    pieces: 2,
  };
  const line: CartLine = {
    ...lineWithoutKey,
    key: [lineWithoutKey.kind, lineWithoutKey.itemId, lineWithoutKey.fabric || '', lineWithoutKey.color, lineWithoutKey.color2, lineWithoutKey.pattern].join('|'),
  };
  const state = { ...newGame(DIVINE_CONFIG), tier: 6, cash, marketCart: [line] };
  return { state, line, entry };
}

test('Level 7 Yaba Mart cart accepts and charges for valid Empire products', () => {
  const { state, line, entry } = levelSevenCart(10_000_000);
  const validation = validateCart(state, [line]);
  assert.deepEqual(validation.errors, []);
  assert.equal(validation.ok, true);
  assert.equal(validation.total, cartTotal([line]));

  const after = buyCart(state, [line]);
  assert.notEqual(after, state, 'successful checkout must produce a changed game state');
  assert.equal(after.cash, state.cash - validation.total);
  assert.ok(after.stock.some((item) => item.itemId === entry.id && item.pieces >= line.pieces));
});

test('Level 7 Yaba Mart checkout explains insufficient spending cash and charges nothing', () => {
  const { state, line } = levelSevenCart(100_000);
  const validation = validateCart(state, [line]);
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some((error) => error.includes('available cash')));

  const after = buyCart(state, [line]);
  assert.equal(after, state, 'invalid checkout must leave inventory and cash untouched');
  assert.equal(after.cash, state.cash);
});

test('cart rejects more than 500 pieces on one line before deducting money', () => {
  const { state, line } = levelSevenCart(10_000_000);
  const tooMany = { ...line, pieces: 501 };
  const validation = validateCart(state, [tooMany]);
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some((error) => error.includes('between 1 and 500')));

  const after = buyCart(state, [tooMany]);
  assert.equal(after, state);
  assert.equal(after.cash, state.cash);
});
