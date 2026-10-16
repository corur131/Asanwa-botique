import assert from 'node:assert/strict';
import test from 'node:test';
import { DIVINE_CONFIG } from '../constants/presets';
import { canPlanSale, cancelSale, closeShop, customersToday, newGame, nextMorning, planSale, saleEvent, salePrice, saleToday } from './engine';
import { saleTraffic } from './sales';
import type { GameState } from './types';

const evening = (day = 10): GameState => ({ ...newGame(DIVINE_CONFIG), day, phase: 'evening', followers: 4000, cash: 1_000_000 });

test('a sale is announced in the evening for tomorrow, at most once a week', () => {
  const s = planSale(evening(), 20);
  assert.equal(s.sale?.day, 11);
  assert.equal(s.sale?.off, 20);
  assert.ok((s.followers || 0) > 4000, 'the sale post gains followers');
  assert.equal(canPlanSale(s).ok, false, 'one sale already announced');
  assert.equal(canPlanSale({ ...evening(), phase: 'shop' }).ok, false, 'not while the shop is open');
  // Two days later another sale is not allowed yet; seven days after the last one it is.
  assert.equal(canPlanSale({ ...s, day: 13 }).ok, false);
  assert.equal(canPlanSale({ ...s, day: 17 }).ok, true);
});

test('calling off a sale frees the week again', () => {
  const s = cancelSale(planSale(evening(), 10));
  assert.equal(s.sale, undefined);
  assert.equal(canPlanSale(s).ok, true);
});

test('sale day: more customers, discounted checkout prices', () => {
  const morning = nextMorning(planSale(evening(), 30));
  assert.equal(saleToday(morning)?.off, 30);
  assert.equal(salePrice(morning, 50_000), 35_000);
  assert.equal(salePrice({ ...morning, day: 12 }, 50_000), 50_000, 'no discount once the sale is over');
  const noSale = { ...morning, sale: undefined };
  let a = 0, b = 0;
  for (let i = 0; i < 200; i++) { a += customersToday(noSale, false); b += customersToday(morning, false); }
  assert.ok(b > a * 1.5, `${a} vs ${b}`);
});

test('Black Friday and Detty December pull extra crowds; back-to-back sales pull fewer', () => {
  assert.equal(saleEvent(325), 'Black Friday');
  assert.equal(saleEvent(345), 'Detty December');
  assert.equal(saleEvent(100), null);
  const base = { ...evening(100), phase: 'shop' as const, sale: { day: 100, off: 20 as const } };
  const bf = { ...base, day: 325, sale: { day: 325, off: 20 as const } };
  assert.ok(saleTraffic(bf) > saleTraffic(base));
  assert.ok(saleTraffic({ ...base, sale: { ...base.sale, prev: 93 } }) < saleTraffic(base));
});

test('closing a sale day reports how it went', () => {
  const morning = nextMorning(planSale(evening(), 20));
  const closed = closeShop({ ...morning, phase: 'shop' });
  assert.ok(closed.today.events.some((e) => e.startsWith('Sale day (20% off)')));
});
