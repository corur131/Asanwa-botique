import assert from 'node:assert/strict';
import test from 'node:test';
import { DIVINE_CONFIG } from '../constants/presets';
import { canStartGiveaway, closeShop, customersToday, newGame, nextMorning, pickWinner, startGiveaway } from './engine';
import type { EntrantKind, GameState } from './types';

const base = (followers = 5000): GameState => ({ ...newGame(DIVINE_CONFIG), day: 20, phase: 'morning', followers, cash: 1_000_000 });

function toPick(s0 = base()): GameState {
  const prize = s0.stock.find((d) => d.pieces > 0)!;
  let s = startGiveaway(s0, prize.uid);
  for (let i = 0; i < 2; i++) s = nextMorning(closeShop({ ...s, phase: 'shop' }));
  return s;
}

test('a giveaway sets the prize aside, runs two days, then waits for Divine to pick', () => {
  const s0 = base();
  const prize = s0.stock.find((d) => d.pieces > 0)!;
  const s = startGiveaway(s0, prize.uid);
  assert.equal(s.stock.find((d) => d.uid === prize.uid)!.pieces, prize.pieces - 1);
  assert.equal(s.giveaway?.status, 'live');
  assert.equal(canStartGiveaway(s).ok, false);
  const later = toPick();
  assert.equal(later.giveaway?.status, 'pick');
  const list = later.giveaway!.entrants!;
  assert.ok(list.length >= 28 && list.length <= 40, `${list.length} entrants`);
  assert.ok(later.giveaway!.entries > 1000, 'thousands of entries for a 5k page');
  assert.ok((later.followers || 0) > 5000, 'followers grew while it ran');
});

test('small pages cannot run giveaways, and only one every two weeks', () => {
  assert.equal(canStartGiveaway(base(100)).ok, false);
  const s = toPick();
  const done = pickWinner(s, s.giveaway!.entrants![0].id);
  assert.equal(done.giveaway?.status, 'done');
  assert.equal(canStartGiveaway(done).ok, false);
  assert.equal(canStartGiveaway({ ...done, day: 34 }).ok, true);
});

function winWith(kind: EntrantKind) {
  for (let i = 0; i < 20; i++) {
    const s = toPick();
    const e = s.giveaway!.entrants!.find((x) => x.kind === kind);
    if (e) return { before: s, after: pickWinner(s, e.id) };
  }
  throw new Error(`no ${kind} entrant`);
}

test('who wins matters', () => {
  const inf = winWith('influencer');
  assert.ok(inf.after.followers! > inf.before.followers! + 100);
  assert.ok(customersToday(inf.after, false) >= 1);
  assert.equal(inf.after.buzz?.mult, 1.12);
  const fake = winWith('fake');
  assert.ok(fake.after.followers! < fake.before.followers!);
  assert.ok(fake.after.rep < fake.before.rep);
  const friend = winWith('friend');
  assert.ok(friend.after.rep < friend.before.rep);
  assert.ok(friend.after.gist!.some((g) => g.title.startsWith('Rigged?')));
  const fan = winWith('fan');
  assert.ok(fan.after.rep > fan.before.rep);
  const big = winWith('bigSpender');
  assert.equal(big.after.vipGuestDay, big.before.day, 'picked in the morning: the rich relative comes today');
});
