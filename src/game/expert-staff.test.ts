import assert from 'node:assert/strict';
import test from 'node:test';
import { DIVINE_CONFIG } from '../constants/presets';
import { newGame, staffFinish } from './engine';
import { makeCelebrityCustomer, makeCustomer } from './customers';
import type { Customer, GameState, StaffMember } from './types';

const staff = (level: number): StaffMember => ({ id: `st${level}`, name: 'Bola Ade', level, wage: 60_000, loyalty: 50, trained: false, weeks: 4, profession: 'stylist', look: DIVINE_CONFIG });

function shop(): GameState {
  return { ...newGame(DIVINE_CONFIG), tier: 3, phase: 'shop', clock: 300 };
}
/** Serve one customer and report what she paid and the score. */
function serve(s: GameState, c: Customer, level: number) {
  const m = staff(level);
  const before = s.cash;
  const after = staffFinish({ ...s, staff: [m], inShop: [{ c, arrived: 0, patience: 999, waited: 0, by: m.id, until: 300 }] }, c, m);
  const sale = after.ledger.find((l) => l.label.startsWith(c.name) && l.amount > 0);
  return { paid: (after.cash - before), sale: sale?.amount ?? 0, score: after.history.length ? 0 : after.today.bestScore, after };
}

test('level 7+ staff charge at least 95% of the budget, every time', () => {
  for (const level of [7, 8, 10]) {
    for (let i = 0; i < 40; i++) {
      const s = shop();
      const c = makeCustomer(s, [0.2, 0.4, 0.4]);
      if (c.service) continue;
      const r = serve(s, c, level);
      assert.ok(r.sale >= c.budget * 0.95 - 1, `level ${level} charged ${r.sale} of ${c.budget}`);
    }
  }
});

test('celebrities pay at least 95% of their budget to a level 7+ stylist', () => {
  for (let i = 0; i < 10; i++) {
    const s = shop();
    const c = makeCelebrityCustomer(s, 1);
    const r = serve(s, c, 9);
    assert.ok(r.sale >= c.budget * 0.95 - 1, `celebrity paid ${r.sale} of ${c.budget}`);
  }
});

test('level 8+ looks score 80-100, and 95+ looks are posted on Gidigram', () => {
  let posted = 0;
  for (let i = 0; i < 60; i++) {
    const s = shop();
    const c = makeCustomer(s, [0.3, 0.4, 0.3]);
    if (c.service) continue;
    const r = serve(s, c, 10);
    const best = r.after.today.bestScore;
    assert.ok(best >= 80 && best <= 100, `score ${best}`);
    const post = (r.after.posts || []).find((p) => p.name === c.name);
    if (best >= 95) { assert.ok(post && post.by === 'Bola Ade', 'a 95+ look is posted by the stylist'); posted++; }
    else assert.equal(post, undefined);
  }
  assert.ok(posted > 0, 'some looks reached 95+');
});

test('level 6 staff keep the old pricing (fair price, not the budget)', () => {
  let under = 0;
  for (let i = 0; i < 30; i++) {
    const s = shop();
    const c = makeCustomer(s, [0, 0, 1]);
    if (c.service) continue;
    if (serve(s, c, 6).sale < c.budget * 0.9) under++;
  }
  assert.ok(under > 0);
});
