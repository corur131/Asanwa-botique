import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CELEBRITY_DAYS_BY_SHOP_TIER,
  SIGNATURE_CELEBRITY_DAYS_BY_SHOP_TIER,
  CELEBRITY_SPEND_RANGES,
  CELEBRITY_TIER_WEIGHTS_BY_SHOP_TIER,
  celebrityAmountsForTier,
  celebrityAttractionMultiplier,
  additionalCelebrityVisitChance,
  thirdCelebrityVisitChance,
  maximumCelebrityVisitsPerDay,
  chooseCelebrityTierForShop,
  celebrityIsScheduled,
  celebrityVisitChance,
  maximumCelebrityTierForShop,
  RICH_RETAIL_BUDGET_BANDS_BY_TIER,
  SIGNATURE_RICH_RETAIL_BUDGET_BANDS_BY_TIER,
  richRetailBudget,
} from './customers';
import { BUDGET, SERVICE_BUDGET, CELEBRITY_FULFILMENT_RATE, TIERS } from './economy';
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


test('rich clothing budgets progress by shop tier and Signature properties skew wealthier', () => {
  assert.equal(RICH_RETAIL_BUDGET_BANDS_BY_TIER.length, 7);
  assert.equal(SIGNATURE_RICH_RETAIL_BUDGET_BANDS_BY_TIER.length, 7);

  for (let tier = 0; tier < 7; tier++) {
    const ordinaryBands = RICH_RETAIL_BUDGET_BANDS_BY_TIER[tier];
    const signatureBands = SIGNATURE_RICH_RETAIL_BUDGET_BANDS_BY_TIER[tier];
    assert.ok(Math.abs(ordinaryBands.reduce((sum, band) => sum + band.weight, 0) - 1) < 1e-12,
      `ordinary Level ${tier + 1} percentages must total 100%`);
    assert.ok(Math.abs(signatureBands.reduce((sum, band) => sum + band.weight, 0) - 1) < 1e-12,
      `Signature Level ${tier + 1} percentages must total 100%`);
  }

  const random = seededRandom(20261013);
  const ordinaryMax = [1_250_000, 2_500_000, 5_000_000, 5_000_000, 7_500_000, 10_000_000, 10_000_000];
  const signatureMax = [2_500_000, 4_000_000, 5_000_000, 5_000_000, 10_000_000, 10_000_000, 10_000_000];
  for (let tier = 0; tier < 7; tier++) {
    const ordinary = Array.from({ length: 8_000 }, () => richRetailBudget(random, tier, false));
    const signature = Array.from({ length: 8_000 }, () => richRetailBudget(random, tier, true));
    assert.ok(ordinary.every((budget) => budget <= ordinaryMax[tier]),
      `ordinary Level ${tier + 1} must respect its top budget band`);
    assert.ok(signature.every((budget) => budget <= signatureMax[tier]),
      `Signature Level ${tier + 1} must respect its top budget band`);
    const ordinaryMean = ordinary.reduce((sum, budget) => sum + budget, 0) / ordinary.length;
    const signatureMean = signature.reduce((sum, budget) => sum + budget, 0) / signature.length;
    assert.ok(signatureMean > ordinaryMean,
      `Signature Level ${tier + 1} should have a wealthier rich-customer budget mix`);
  }

  assert.deepEqual(
    RICH_RETAIL_BUDGET_BANDS_BY_TIER[4].map((band) => band.weight),
    [0.39, 0.24, 0.18, 0.12, 0.05, 0.02],
    'ordinary Flagship uses the proposed Level 5 mix',
  );
  assert.deepEqual(
    SIGNATURE_RICH_RETAIL_BUDGET_BANDS_BY_TIER[4].map((band) => band.weight),
    [0.28, 0.23, 0.22, 0.15, 0.07, 0.04, 0.01],
    'Signature Flagship uses the proposed Signature mix',
  );
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


test('Signature properties receive more celebrity opportunities than ordinary shops', () => {
  assert.deepEqual(
    CELEBRITY_DAYS_BY_SHOP_TIER.slice(2).map((days) => days.length),
    [1, 2, 3, 4, 6],
  );
  assert.deepEqual(
    SIGNATURE_CELEBRITY_DAYS_BY_SHOP_TIER.slice(2).map((days) => days.length),
    [2, 4, 6, 8, 10],
  );

  for (let tier = 2; tier <= 6; tier++) {
    assert.ok(
      SIGNATURE_CELEBRITY_DAYS_BY_SHOP_TIER[tier].length > CELEBRITY_DAYS_BY_SHOP_TIER[tier].length,
      `Signature Level ${tier + 1} should have more candidate days`,
    );
    for (const day of SIGNATURE_CELEBRITY_DAYS_BY_SHOP_TIER[tier]) {
      assert.ok(celebrityIsScheduled(tier, day + 1, true), `Signature Level ${tier + 1} must recognize cycle day ${day}`);
    }
  }
  assert.ok(!celebrityIsScheduled(4, 3, false), 'ordinary Flagship should not inherit the Signature-only schedule');
  assert.ok(celebrityIsScheduled(4, 3, true), 'Signature Flagship should have an extra eligible day');
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
    assert.ok(Math.abs(signature - ordinary * 1.25) < 1e-12,
      `Signature Level ${shopTier + 1} should have exactly 1.25x the ordinary celebrity chance before brand heat`);
  }
  assert.equal(celebrityVisitChance(1, true), 0, 'Signature status cannot bypass the Level 3 gate');
  assert.deepEqual(
    [2, 3, 4, 5, 6].map((tier) => Number(celebrityVisitChance(tier, true).toFixed(2))),
    [0.23, 0.35, 0.50, 0.60, 0.70],
  );
});

test('reputation, audience and brand heat improve attraction without guaranteeing a celebrity', () => {
  const cold = { reputation: 25, followers: 120, shopTierIndex: 5, awareness: 20, prestige: 25, trendInfluence: 18 };
  const hot = { reputation: 92, followers: 250_000, shopTierIndex: 5, awareness: 92, prestige: 88, trendInfluence: 96 };
  assert.ok(celebrityAttractionMultiplier(cold) < 1);
  assert.ok(celebrityAttractionMultiplier(hot) > celebrityAttractionMultiplier(cold));
  assert.ok(celebrityAttractionMultiplier(hot) <= 1.25);
  assert.ok(celebrityVisitChance(5, true, hot) > celebrityVisitChance(5, true, cold));
  assert.ok(celebrityVisitChance(5, true, hot) < 1, 'brand heat must never guarantee a visit');

  assert.equal(CELEBRITY_TIER_WEIGHTS_BY_SHOP_TIER.length, 7);
  const flagshipRandom = seededRandom(20261013);
  const empireRandom = seededRandom(20261014);
  const signatureRandom = seededRandom(20261015);
  const samples = 12_000;
  let flagshipTop = 0, empireTop = 0, signatureEmpireTop = 0;
  for (let i = 0; i < samples; i++) {
    if (chooseCelebrityTierForShop(4, false, undefined, flagshipRandom) === 4) flagshipTop++;
    if (chooseCelebrityTierForShop(6, false, undefined, empireRandom) === 4) empireTop++;
    if (chooseCelebrityTierForShop(6, true, undefined, signatureRandom) === 4) signatureEmpireTop++;
  }
  assert.ok(empireTop > flagshipTop, 'Fashion Empire should attract more top-tier celebrities than Flagship');
  assert.ok(signatureEmpireTop > empireTop, 'Signature should modestly improve the top-rank celebrity mix');
});

test('visit frequency rises by level, Signature gets more scheduled days, and top shops can host multiple guests', () => {
  const random = seededRandom(20261013);
  const cycles = 4_000;
  const means: number[] = [];
  for (let shopTier = 2; shopTier <= 6; shopTier++) {
    const normalDays = CELEBRITY_DAYS_BY_SHOP_TIER[shopTier];
    const signatureDays = SIGNATURE_CELEBRITY_DAYS_BY_SHOP_TIER[shopTier];
    let normalVisits = 0;
    let signatureVisits = 0;
    for (let cycle = 0; cycle < cycles; cycle++) {
      for (const _day of normalDays) {
        if (random() < celebrityVisitChance(shopTier, false)) normalVisits++;
      }
      for (const _day of signatureDays) {
        if (random() < celebrityVisitChance(shopTier, true)) signatureVisits++;
      }
    }
    const normalAverage = normalVisits / cycles;
    const signatureAverage = signatureVisits / cycles;
    means.push(normalAverage);
    const normalExpected = normalDays.length * celebrityVisitChance(shopTier, false);
    const signatureExpected = signatureDays.length * celebrityVisitChance(shopTier, true);
    assert.ok(Math.abs(normalAverage - normalExpected) < 0.06);
    assert.ok(Math.abs(signatureAverage - signatureExpected) < 0.06);
    assert.ok(signatureAverage > normalAverage);
  }
  assert.ok(means[4] > means[0], 'Level 7 should have more visits than Level 3');
  assert.ok(additionalCelebrityVisitChance(5, true) > 0.2, 'Signature Luxury Maison should have a meaningful second-guest chance');
  assert.ok(thirdCelebrityVisitChance(6, true) > 0.1, 'Signature Fashion Empire can occasionally host a third guest');
  assert.equal(maximumCelebrityVisitsPerDay(4, false), 2);
  assert.equal(maximumCelebrityVisitsPerDay(6, true), 3);
});

test('rich and celebrity checkout payments respect budget and high-value orders require a strong look', () => {
  const rich = { cls: 'rich', budget: 500_000, male: false, influencer: false } as Customer;
  const excellent = { total: 100 } as ScoreBreakdown;
  const richSale = settle(rich, excellent, 2_000_000, 10_000, { hasPOS: true });
  assert.ok(richSale.paid <= rich.budget);

  const celebrity = {
    cls: 'rich',
    budget: 50_000_000,
    male: false,
    influencer: true,
    name: 'SSS guest',
    celebrity: { tier: 4, rank: 'SSS guest', spendFloor: 30_000_000 },
  } as Customer;
  const premiumSale = settle(celebrity, excellent, 1_000_000, 10_000, { hasPOS: true });
  assert.ok(premiumSale.paid >= celebrity.celebrity!.spendFloor);
  assert.ok(premiumSale.paid <= celebrity.budget);
  assert.equal(premiumSale.cost, Math.round(premiumSale.paid * CELEBRITY_FULFILMENT_RATE), 'premium payout must book sourcing and tailoring costs');
  assert.ok(premiumSale.paid - premiumSale.cost < premiumSale.paid, 'gross celebrity receipt must not be treated as net profit');

  const average = settle(celebrity, { total: 72 } as ScoreBreakdown, 1_000_000, 10_000);
  assert.ok(average.paid >= celebrity.celebrity!.spendFloor, 'a completed standard celebrity purchase must honour the guest spend floor');
  assert.ok(average.paid < celebrity.budget, 'the guest budget remains a ceiling, not an automatic full-budget charge');
  assert.equal(average.cost, Math.round(average.paid * CELEBRITY_FULFILMENT_RATE), 'standard celebrity purchases must book fulfilment costs even when they are not premium orders');

  const rema = {
    cls: 'rich', budget: 18_000_000, male: true, influencer: true, name: 'Rema',
    celebrity: { tier: 1, rank: 'Hitmaker', spendFloor: 8_000_000 },
  } as Customer;
  const remaSale = settle(rema, { total: 72 } as ScoreBreakdown, 1_865_000, 10_000);
  assert.equal(remaSale.paid, 8_000_000, 'Rema cannot be charged an ordinary-item total below the supplied celebrity floor');
  assert.equal(remaSale.cost, Math.round(8_000_000 * CELEBRITY_FULFILMENT_RATE));
  assert.ok(!remaSale.line.includes('premium celebrity order'), 'a standard purchase remains distinct from a premium-quality order');

  const rejected = settle(celebrity, { total: 48 } as ScoreBreakdown, 1_000_000, 10_000);
  assert.equal(rejected.outcome, 'refused');
  assert.equal(rejected.paid, 0, 'poor styling must not create an automatic celebrity payout');
  assert.equal(rejected.cost, 0, 'rejected looks must not charge consumable costs as though a sale occurred');
});


test('14-day celebrity payout simulation keeps premium orders below shop rent on their own', () => {
  // A stress-case planning assumption: 60% of celebrity visits achieve the score needed for a premium order.
  // The rest of the boutique still has to earn its keep through normal sales and services.
  const random = seededRandom(20261013);
  const cycles = 4_000;

  for (let shopTier = 2; shopTier <= 6; shopTier++) {
    for (const signature of [false, true]) {
      let premiumOrders = 0;
      let netPremiumReceipts = 0;
      const days = CELEBRITY_DAYS_BY_SHOP_TIER[shopTier];
      const maxCelebrityTier = maximumCelebrityTierForShop(shopTier);

      for (let cycle = 0; cycle < cycles; cycle++) {
        for (const _day of days) {
          if (random() >= celebrityVisitChance(shopTier, signature)) continue;
          const celebrityTier = Math.floor(random() * (maxCelebrityTier + 1));
          const { budget, spendFloor } = celebrityAmountsForTier(celebrityTier, random, shopTier, signature);
          if (random() >= 0.6) continue;
          const gross = Math.min(budget, spendFloor);
          const fulfilment = Math.max(0, Math.round(gross * CELEBRITY_FULFILMENT_RATE));
          premiumOrders++;
          netPremiumReceipts += gross - fulfilment;
        }
      }

      const averageNetPerFortnight = netPremiumReceipts / cycles;
      assert.ok(premiumOrders > 0, 'simulation should observe premium orders at shop tier ' + shopTier);
      assert.ok(averageNetPerFortnight < TIERS[shopTier].rent * 2,
        'celebrity premium receipts should not cover all rent by themselves at shop tier ' + shopTier +
        (signature ? ' with Signature status' : ' without Signature status'));
    }
  }
});
