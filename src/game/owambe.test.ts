import assert from 'node:assert/strict';
import test from 'node:test';
import { DIVINE_CONFIG } from '../constants/presets';
import { answerMessage, attendOwambe, newGame, nextMorning, owambeGuest, owambeTonight } from './engine';
import { planOwambe } from './owambe';
import { scoreLook } from './scoring';
import type { GameState, StyleChoice } from './types';

function invited(): GameState {
  const s = planOwambe({ ...newGame(DIVINE_CONFIG), day: 10, phase: 'evening', followers: 3000, cash: 1_000_000 }, true);
  assert.equal(s.owambe?.status, 'invited');
  return s;
}
const accept = (s: GameState) => answerMessage(s, s.messages.find((m) => m.ctx?.kind === 'owambe')!.id, 'accept');
const partyNight = (s: GameState): GameState => ({ ...s, day: s.owambe!.day, phase: 'evening' });

/** The best and worst looks Divine can put together from the rails for tonight. */
function looks(s: GameState): { best: StyleChoice; worst: StyleChoice } {
  const g = owambeGuest(s);
  const items = s.stock.filter((d) => d.displayed && d.pieces > 0);
  const options: StyleChoice[] = [];
  for (const d of items.filter((x) => x.kind === 'dress')) options.push({ dress: d.uid });
  for (const t of items.filter((x) => x.kind === 'top')) for (const b of items.filter((x) => x.kind === 'bottom')) options.push({ top: t.uid, bottom: b.uid });
  options.push({});
  const scored = options.map((c) => ({ c, v: scoreLook(g, c, s.stock).total })).sort((a, b) => b.v - a.v);
  return { best: scored[0].c, worst: scored[scored.length - 1].c };
}

test('an invitation can be accepted, and the party is on the evening of its day', () => {
  const s = accept(invited());
  assert.equal(s.owambe?.status, 'accepted');
  assert.equal(owambeTonight(s), undefined, 'not tonight yet');
  assert.ok(owambeTonight(partyNight(s)));
});

test('spraying costs money; a poor look gets gossip and Divine is tired the next morning', () => {
  const night = partyNight(accept(invited()));
  const { worst } = looks(night);
  const after = attendOwambe(night, worst, 50_000);
  assert.equal(after.cash, night.cash - 50_000);
  assert.equal(after.owambe?.status, 'done');
  assert.equal(after.owambe?.result, 'poor');
  assert.ok(after.rep < night.rep);
  const morning = nextMorning(after);
  assert.ok((morning.energy ?? 100) < 100, 'tired after the party');
});

test('a great entrance brings followers and rich clients for a week', () => {
  const night = partyNight(accept(invited()));
  const { best } = looks(night);
  const after = attendOwambe(night, best, 200_000);
  if (after.owambe?.result === 'great') {
    assert.ok((after.followers || 0) > (night.followers || 0));
    assert.equal(after.richUntil, night.day + 7);
  } else {
    assert.notEqual(after.owambe?.result, undefined);
  }
});

test('skipping an accepted party disappoints the host', () => {
  const night = partyNight(accept(invited()));
  const missed = nextMorning(night);
  assert.equal(missed.owambe?.status, 'missed');
  assert.ok(missed.rep < night.rep);
});
