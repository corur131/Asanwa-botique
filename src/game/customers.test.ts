import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CELEBRITY_DAYS_BY_SHOP_TIER,
  CELEBRITY_SPEND_RANGES,
  celebrityAmountsForTier,
  celebrityIsScheduled,
  celebrityVisitChance,
  maximumCelebrityTierForShop,
  richRetailBudget,
} from './customers';
import { BUDGET, SERVICE_BUDGET } from './economy';
import { settle } from './engine';
import type { Customer, ScoreBreakdown } from './types';

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

test('rich retail capacity expands to ₦100k–₦5m with a weighted, non-round spread', () => {
  assert.deepEqual(BUDGET.rich, [100_000, 5_000_000]);
  assert.deepEqual(SERVICE_BUDGET.rich, [30_000, 90_000]);
  const random = seededRandom(3102026);
  const values = Array.from({ length: 20_000 }, () => richRetailBudget(random));
  assert.ok(values.every((value) => value >= 100_000 && value <= 5_000_000));
  assert.ok(values.every((value) => value % 5_000 === 0), 'budgets should retain meaningful ₦5k increments');
  assert.ok(values.some((value) => value > 300_000), 'the old ₦300k ceiling must be exceeded');
  assert.ok(values.some((value) => value > 1_000_000), 'million-naira spending capacity must be possible');
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  assert.ok(average >= 650_000 && average <= 740_000, `weighted mean should stay moderated, got ₦${Math.round(average)}`);
  const topTail = values.filter((value) => value >= 4_000_000).length / values.length;
  assert.ok(topTail >= 0.003 && topTail <= 0.007, `₦4m+ budgets should be rare, got ${topTail}`);
});

test('celebrity spend bands are tiered and every lower-tier maximum obeys the ₦5m overlap rule', () => {
  assert.equal(CELEBRITY_SPEND_RANGES.length, 5);
  assert.deepEqual(CELEBRITY_SPEND_RANGES[4], { min: 30_000_000, max: 210_000_000 });
  for (let tier = 0; tier < CELEBRITY_SPEND_RANGES.length; tier++) {
    const range = CELEBRITY_SPEND_RANGES[tier];
    assert.ok(range.min < range.max);
    if (tier < CELEBRITY_SPEND_RANGES.length - 1) {
      assert.ok(range.max <= CELEBRITY_SPEND_RANGES[tier + 1].min + 5_000_000);
    }
  }

  const random = seededRandom(99127);
  for (let tier = 0; tier < 5; tier++) {
    const range = CELEBRITY_SPEND_RANGES[tier];
    const amounts = Array.from({ length: 5_000 }, () => celebrityAmountsForTier(tier, random));
    assert.ok(amounts.every(({ budget, spendFloor }) =>
      budget >= range.min && budget <= range.max && spendFloor >= range.min && spendFloor <= budget
    ), `tier ${tier + 1} amounts must fit the tier range and floor must not exceed budget`);
    const meanBudget = amounts.reduce((sum, value) => sum + value.budget, 0) / amounts.length;
    assert.ok(meanBudget < range.min + (range.max - range.min) * 0.55, 'weighted amounts should favour the lower end');
    if (tier === 4) assert.ok(amounts.some((value) => value.budget > 35_000_000), 'SSS must exceed the old ₦35m ceiling sometimes');
  }
});

test('celebrity eligibility opens at Level 3 and lower celebrity ranks can visit higher shops', () => {
  assert.equal(maximumCelebrityTierForShop(0), -1);
  assert.equal(maximumCelebrityTierForShop(1), -1);
  assert.equal(maximumCelebrityTierForShop(2), 2); // Level 3: celebrity tiers 1–3
  assert.equal(maximumCelebrityTierForShop(3), 3); // Level 4: celebrity tiers 1–4
  assert.equal(maximumCelebrityTierForShop(4), 4); // Level 5+: all five celebrity tiers
  assert.equal(maximumCelebrityTierForShop(6), 4);
  assert.ok(!celebrityIsScheduled(1, 1), 'no candidate celebrity days before Level 3');
  assert.ok(celebrityIsScheduled(2, 3), 'Level 3 receives a candidate visit day');
  assert.deepEqual(CELEBRITY_DAYS_BY_SHOP_TIER.slice(2).map((days) => days.length), [1, 2, 3, 4, 6]);

  for (let shopTier = 2; shopTier <= 6; shopTier++) {
    const ordinary = celebrityVisitChance(shopTier, false);
    const signature = celebrityVisitChance(shopTier, true);
    assert.ok(ordinary > 0 && ordinary < 1);
    assert.ok(signature > ordinary && signature <= 0.95);
  }
  assert.equal(celebrityVisitChance(1, true), 0, 'Signature status cannot bypass the Level 3 gate');
});

test('visit-frequency simulation scales gradually with shop tier and Signature improves odds', () => {
  const random = seededRandom(20261013);
  const cycles = 4_000;
  const means: number[] = [];
  for (let shopTier = 2; shopTier <= 6; shopTier++) {
    const candidateDays = CELEBRITY_DAYS_BY_SHOP_TIER[shopTier];
    let normalVisits = 0;
    let signatureVisits = 0;
    for (let cycle = 0; cycle < cycles; cycle++) {
      for (const _day of candidateDays) {
        if (random() < celebrityVisitChance(shopTier, false)) normalVisits++;
        if (random() < celebrityVisitChance(shopTier, true)) signatureVisits++;
      }
    }
    const normalAverage = normalVisits / cycles;
    const signatureAverage = signatureVisits / cycles;
    means.push(normalAverage);
    const normalExpected = candidateDays.length * celebrityVisitChance(shopTier, false);
    const signatureExpected = candidateDays.length * celebrityVisitChance(shopTier, true);
    assert.ok(Math.abs(normalAverage - normalExpected) < 0.06);
    assert.ok(Math.abs(signatureAverage - signatureExpected) < 0.06);
    assert.ok(signatureAverage > normalAverage);
  }
  assert.ok(means[4] > means[0], 'Level 7 should offer more visit opportunities than Level 3');
});

test('rich and celebrity checkout payments cannot exceed their stated budget', () => {
  const rich = { cls: 'rich', budget: 500_000, male: false, influencer: false } as Customer;
  const score = { total: 100 } as ScoreBreakdown;
  const richSale = settle(rich, score, 2_000_000, 10_000, { hasPOS: true });
  assert.ok(richSale.paid <= rich.budget);

  const celebrity = {
    cls: 'rich',
    budget: 50_000_000,
    male: false,
    influencer: true,
    name: 'SSS guest',
    celebrity: { tier: 4, rank: 'SSS guest', spendFloor: 30_000_000 },
  } as Customer;
  const vipSale = settle(celebrity, score, 1_000_000, 10_000, { hasPOS: true });
  assert.ok(vipSale.paid >= celebrity.celebrity!.spendFloor);
  assert.ok(vipSale.paid <= celebrity.budget);
});
