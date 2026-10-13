import assert from 'node:assert/strict';
import test from 'node:test';
import { DIVINE_CONFIG } from '../constants/presets';
import { MARKUP } from './economy';
import { buyCart, cartTotal, fromData, newGame, validateCart } from './engine';
import { canBuy, MARKET, pieceCost } from './market';
import { prepareShopperOrder, shopperPriceCeiling } from './shopper';
import type { GameState, ShopperOrderLine } from './types';

function game(overrides: Partial<GameState> = {}): GameState {
  return { ...newGame(DIVINE_CONFIG), ...overrides } as GameState;
}

function lineFor(item: (typeof MARKET)[number], pieces = 1): ShopperOrderLine {
  const fabric = ['top', 'bottom', 'dress', 'outer'].includes(item.kind) ? item.fabric || 'plain' : undefined;
  const color = item.kind === 'hair' ? '#1E1E24' : '#8E1F3A';
  const color2 = fabric ? '#C9A163' : color;
  const pattern = 0;
  return {
    key: [item.kind, item.id, fabric || '', color, color2, pattern].join('|'),
    kind: item.kind, itemId: item.id, fabric, color, color2, pattern, pieces,
  };
}

test('tier-aware shopper orders only use unlocked catalogue items and stay within budget', () => {
  const s = game({ cash: 500_000, tier: 0, marketCart: [] });
  const budget = 80_000;
  const result = prepareShopperOrder(s, 'variety', budget);
  assert.ok(result.job, result.error);
  assert.ok(result.job.estimatedTotal <= budget);
  assert.ok(result.job.estimatedTotal <= s.cash);
  assert.equal(validateCart(result.state, result.state.marketCart || []).ok, true, 'the shopper cart must pass the same checkout validator');
  for (const line of result.job.items) {
    const entry = MARKET.find((item) => item.kind === line.kind && item.id === line.itemId);
    assert.ok(entry, 'shopper must use the official catalogue');
    assert.ok(canBuy(entry!, s.tier), 'shopper must obey boutique unlocks');
    assert.ok(pieceCost(entry!, line.fabric) * MARKUP <= shopperPriceCeiling(s, 'variety'));
  }
  assert.equal(result.state.cash, s.cash, 'preparing an order must not charge cash');
  assert.equal(result.state.marketCart?.length, result.job.items.length);
  assert.equal(result.state.shopperJobs?.at(-1)?.id, result.job.id, 'the order is saved in GameState');
  assert.equal(result.state.msgSeq, (s.msgSeq || 0) + 1, 'a return notification is recorded');
  const roundTrip = fromData(JSON.parse(JSON.stringify(result.state)));
  assert.deepEqual(roundTrip?.marketCart, result.state.marketCart, 'cart survives save serialisation');
  assert.deepEqual(roundTrip?.shopperJobs, result.state.shopperJobs, 'shopper order survives save serialisation');
});

test('restock mission reacts to recorded recent sales and low inventory', () => {
  const base = game({ cash: 500_000, tier: 0, marketCart: [] });
  const design = base.stock.find((d) => canBuy(MARKET.find((m) => m.kind === d.kind && m.id === d.itemId)!, base.tier))!;
  const recent = {
    day: base.day - 1,
    designKey: [design.kind, design.itemId, design.fabric, design.color, design.color2, design.pattern].join('|'),
    kind: design.kind, itemId: design.itemId, fabric: design.fabric, color: design.color,
    color2: design.color2, pattern: design.pattern, customerClass: 'poor' as const, units: 6, tier: base.tier,
  };
  const s = { ...base, stock: base.stock.map((d) => d.uid === design.uid ? { ...d, pieces: 0 } : d), productSales: [recent] };
  const result = prepareShopperOrder(s, 'restock', 100_000);
  assert.ok(result.job, result.error);
  assert.ok(result.job.items.some((line) => line.kind === design.kind && line.itemId === design.itemId && line.color === design.color), 'recently successful sold-out variant should be shortlisted');
  assert.ok(result.job.estimatedTotal <= 100_000);
});

test('checkout rejects locked, malformed, duplicate, or unaffordable cart lines atomically', () => {
  const s = game({ cash: 100_000, tier: 0 });
  const locked = MARKET.find((item) => !canBuy(item, s.tier));
  assert.ok(locked, 'catalogue should include some higher-tier goods');
  const lockedLine = lineFor(locked!);
  assert.equal(validateCart(s, [lockedLine]).ok, false);
  assert.equal(buyCart(s, [lockedLine]), s, 'a rejected order must not partially mutate the game');

  const affordable = MARKET.find((item) => canBuy(item, s.tier) && pieceCost(item, item.fabric) > 0 && pieceCost(item, item.fabric) < s.cash / 2)!;
  const validLine = lineFor(affordable);
  assert.equal(validateCart(s, [validLine]).ok, true);
  assert.equal(validateCart(s, [validLine, { ...validLine }]).ok, false, 'duplicate lines must be rejected');
  const expensiveQuantity = { ...validLine, pieces: 501 };
  assert.equal(validateCart(s, [expensiveQuantity]).ok, false, 'checkout must reject orders beyond available funds or quantity rules');
  const after = buyCart(s, [validLine]);
  assert.notEqual(after, s);
  assert.equal(after.cash, s.cash - cartTotal([validLine]));
});

test('shopper cannot spend cash already reserved by items in the existing cart', () => {
  const s = game({ cash: 100_000, tier: 0, marketCart: [] });
  const entry = MARKET.find((item) => canBuy(item, s.tier) && pieceCost(item, item.fabric) < 50_000)!;
  const reservation = lineFor(entry, 1);
  const withCart = { ...s, marketCart: [reservation] };
  const result = prepareShopperOrder(withCart, 'variety', 100_000);
  assert.ok(result.job, result.error);
  assert.ok(result.job.budget <= s.cash - cartTotal([reservation]));
  assert.ok(cartTotal(result.state.marketCart || []) <= s.cash, 'the combined cart must remain payable when generated');
});
