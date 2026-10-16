import assert from 'node:assert/strict';
import test from 'node:test';
import { DIVINE_CONFIG } from '../constants/presets';
import { answerOrder, closeShop, newGame, nextMorning } from './engine';
import { ordersToday, receiveOrders } from './orders';
import type { DmOrder, GameState } from './types';

const shop = (followers: number): GameState => ({ ...newGame(DIVINE_CONFIG), day: 10, followers, phase: 'shop', clock: 120, cash: 1_000_000 });

test('more followers bring more order DMs, only for things in stock', () => {
  let small = 0, big = 0;
  for (let i = 0; i < 200; i++) { small += ordersToday(shop(500)); big += ordersToday(shop(12_000)); }
  assert.equal(ordersToday(shop(100)), 0);
  assert.ok(big > small * 3, `${small} vs ${big}`);
  const s = receiveOrders(shop(5000), 4);
  assert.equal(s.dmOrders!.length, 4);
  for (const o of s.dmOrders!) assert.ok(s.stock.some((d) => d.uid === o.itemUid && d.pieces > 0));
});

function withOrder(o: Partial<DmOrder>): GameState {
  const s = shop(5000);
  const d = s.stock.find((x) => x.displayed && x.pieces > 0)!;
  const order: DmOrder = { id: 'o1', day: s.day, name: 'Kemi', handle: 'kemi_ng', area: 'Lekki Phase 1', riderFee: 5000, freeDelivery: true, itemUid: d.uid, label: d.label, color: d.color, price: 40_000, beg: false, pay: 'transfer', line: 'Hi', status: 'new', ...o };
  return { ...s, dmOrders: [order] };
}

test('a transfer order is paid on accepting, the rider is paid, and the piece leaves at delivery', () => {
  const s = withOrder({ pay: 'transfer' });
  const d = s.stock.find((x) => x.uid === s.dmOrders![0].itemUid)!;
  const a = answerOrder(s, 'o1', 'accept');
  assert.equal(a.dmOrders![0].status, 'accepted');
  assert.equal(a.cash, s.cash + 40_000 - 5000);
  const closed = closeShop({ ...a, dmOrders: a.dmOrders!.map((o) => ({ ...o, deliverDay: a.day })) });
  assert.equal(closed.dmOrders![0].status, 'delivered');
  assert.equal(closed.stock.find((x) => x.uid === d.uid)!.pieces, d.pieces - 1);
});

test('discount gives 10% off; decline sells nothing; unanswered DMs lapse the next day', () => {
  const s = withOrder({ beg: true });
  assert.equal(answerOrder(s, 'o1', 'discount').dmOrders![0].price, 36_000);
  assert.equal(answerOrder(s, 'o1', 'decline').dmOrders![0].status, 'declined');
  const nextDay = closeShop({ ...nextMorning(closeShop(s)), phase: 'shop' });
  assert.equal(nextDay.dmOrders!.find((o) => o.id === 'o1')!.status, 'expired');
});

test('pay-on-delivery is paid at the door, or fails and the piece comes back', () => {
  let delivered = 0, failed = 0;
  for (let i = 0; i < 80; i++) {
    const s = withOrder({ pay: 'pod' });
    const d0 = s.stock.find((x) => x.uid === 'o1' || x.uid === s.dmOrders![0].itemUid)!;
    const a = answerOrder(s, 'o1', 'accept');
    assert.equal(a.cash, s.cash - 5000, 'only the rider is paid up front');
    const c = closeShop({ ...a, dmOrders: a.dmOrders!.map((o) => ({ ...o, deliverDay: a.day })) });
    const st = c.dmOrders![0].status;
    if (st === 'delivered') delivered++;
    else { failed++; assert.equal(c.stock.find((x) => x.uid === d0.uid)!.pieces, d0.pieces); }
  }
  assert.ok(delivered > failed && failed > 0, `${delivered}/${failed}`);
});
