import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { DIVINE_CONFIG } from '../constants/presets';
import { FOLLOWER_REPAIR_TARGET, STAFF_POSTS_PER_DAY, newGame, postLook, reachBoost, repairRunawayFollowers } from './engine';
import type { Customer, GameState } from './types';

const rich = (s: GameState): Customer => ({ id: 'c1', name: 'Ada', cls: 'rich', occasion: 'owambe', budget: 1_000_000, wants: [], taste: { favColor: '#000', favName: 'black' }, request: '', look: s.divine, male: false, influencer: false });

test('staff share at most two looks a day', () => {
  let s: GameState = { ...newGame(DIVINE_CONFIG), day: 30, followers: 100_000, posts: [] };
  for (let i = 0; i < 10; i++) s = postLook(s, rich(s), s.divine, 99, 'Kemi');
  assert.equal(s.posts!.filter((p) => p.by).length, STAFF_POSTS_PER_DAY);
});

test('followers cannot snowball: a month of maxed-out posting stays believable', () => {
  let s: GameState = { ...newGame(DIVINE_CONFIG), day: 1, followers: 60_000, posts: [] };
  for (let d = 0; d < 30; d++) {
    s = { ...s, day: s.day + 1 };
    for (let i = 0; i < 3; i++) s = postLook(s, rich(s), s.divine, 100);
    for (let i = 0; i < 4; i++) s = postLook(s, rich(s), s.divine, 100, 'Kemi');
  }
  assert.ok((s.followers || 0) < 1_000_000, `${s.followers}`);
  assert.ok(reachBoost(10_000_000) <= 11);
});

test('a save hit by the bug is repaired once; money and staff are untouched', () => {
  const broken = JSON.parse(fs.readFileSync(new URL('./fixtures/runaway-followers.json', import.meta.url), 'utf8')) as GameState;
  assert.ok((broken.followers || 0) > 100_000_000);
  const fixed = repairRunawayFollowers(broken);
  assert.equal(fixed.followers, FOLLOWER_REPAIR_TARGET);
  assert.equal(fixed.cash, broken.cash);
  assert.deepEqual(fixed.staff, broken.staff);
  assert.ok(fixed.posts!.every((p) => p.likes < 100_000));
  assert.equal(repairRunawayFollowers({ ...fixed, followers: 5_000_000 }).followers, 5_000_000, 'only runs once');
  const healthy = { ...broken, followers: 80_000 };
  assert.equal(repairRunawayFollowers(healthy), healthy);
});
