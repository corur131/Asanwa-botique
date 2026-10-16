import assert from 'node:assert/strict';
import test from 'node:test';
import { DIVINE_CONFIG } from '../constants/presets';
import { STAFF } from './economy';
import { answerPoach, atTraining, candidates, marketWage, newGame, train, weeklyStaff } from './engine';
import type { GameState, StaffMember } from './types';

const member = (level: number, extra: Partial<StaffMember> = {}): StaffMember => ({ id: `m${level}`, name: 'Chioma Okafor', level, wage: 300_000, loyalty: 50, trained: true, weeks: 10, profession: 'stylist', look: DIVINE_CONFIG, ...extra });
const game = (staff: StaffMember[], cash = 50_000_000): GameState => ({ ...newGame(DIVINE_CONFIG), tier: 3, day: 20, cash, staff });

test('training is steep in the money levels and takes the stylist away for days', () => {
  assert.equal(STAFF.trainFee(2), 60_000);
  assert.equal(STAFF.trainFee(6), 1_200_000);
  assert.equal(STAFF.trainFee(9), 6_000_000);
  let total = 0;
  for (let l = 1; l < 10; l++) total += STAFF.trainFee(l);
  assert.equal(total, 14_660_000);
  const s = game([member(6)]);
  const after = train(s, 'm6');
  const m = after.staff[0];
  assert.equal(m.level, 7);
  assert.equal(after.cash, s.cash - 1_200_000);
  assert.ok(atTraining(after, m) && m.awayUntil === s.day + 2);
  assert.equal(train(after, 'm6'), after, 'cannot train again while away');
  assert.deepEqual(m.bond, { amount: 600_000, until: s.day + STAFF.bondDays });
});

test('experts on the market are level 5-6; level 7 only by an expensive headhunt', () => {
  for (let d = 1; d < 60; d++) {
    const s = { ...game([]), day: d };
    for (const c of candidates(s)) {
      if (c.kind === 'headhunt') { assert.equal(c.level, 7); assert.ok(c.signing >= 3_000_000); }
      else assert.ok(c.level <= 6, `${c.kind} level ${c.level}`);
    }
  }
  assert.ok(marketWage(7) >= 250_000 && marketWage(10) > marketWage(8));
});

test('rivals regularly try to poach level 7+ stylists and ask Divine to match', () => {
  let offers = 0;
  for (let i = 0; i < 200; i++) {
    const s = weeklyStaff(game([member(8, { loyalty: 100 })]));
    if (s.staff[0]?.poachOffer) offers++;
  }
  assert.ok(offers > 45 && offers < 100, `${offers}/200 weeks had an offer`);
});

test('match keeps her at the offered wage; let go sends her to the rival, who repays the bond', () => {
  const offer = { rivalId: 'tolani', shop: 'House of Tolani', owner: 'Tolani Adebayo', wage: 900_000, day: 20 };
  const s = game([member(8, { poachOffer: offer, bond: { amount: 1_250_000, until: 60 } })]);
  const matched = answerPoach(s, 'm8', 'match');
  assert.equal(matched.staff[0].wage, 900_000);
  assert.equal(matched.staff[0].poachOffer, undefined);

  const skillBefore = s.rivals.find((r) => r.id === 'tolani')!.skill;
  const gone = answerPoach(s, 'm8', 'release');
  assert.equal(gone.staff.length, 0);
  assert.equal(gone.cash, s.cash + 1_250_000, 'training bond repaid');
  assert.ok(gone.rivals.find((r) => r.id === 'tolani')!.skill > skillBefore, 'the rival got better');

  // a counter offer either keeps her at the midpoint or she leaves
  for (let i = 0; i < 20; i++) {
    const c = answerPoach(s, 'm8', 'counter');
    if (c.staff.length) assert.equal(c.staff[0].wage, 600_000);
  }
});

test('an unanswered offer is decided by her loyalty the next week', () => {
  const offer = { shop: 'Amaka\'s Closet', owner: 'Amaka Obi', wage: 3_000_000, day: 13 };
  const disloyal = weeklyStaff(game([member(7, { loyalty: 5, trained: false, poachOffer: offer })]));
  assert.equal(disloyal.staff.length, 0);
  const loyal = weeklyStaff(game([member(7, { loyalty: 100, wage: 2_000_000, poachOffer: { ...offer, wage: 2_200_000 } })]));
  assert.equal(loyal.staff.length, 1);
});
