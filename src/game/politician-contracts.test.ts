import assert from 'node:assert/strict';
import test from 'node:test';
import { DIVINE_CONFIG } from '../constants/presets';
import { MARKUP } from './economy';
import { acceptPoliticianContract, buyCart, deliverPoliticianContract, ensurePoliticianContractOffer, newGame, politicianContractProgress } from './engine';
import { canBuy, MARKET } from './market';
import { prepareShopperOrder } from './shopper';
import type { GameState, PoliticianContract } from './types';

function game(overrides: Partial<GameState> = {}): GameState {
  // Most contract workflow tests exercise the late-game eligible tier.
  const state = { ...newGame(DIVINE_CONFIG), tier: 6, ...overrides } as GameState;
  return ensurePoliticianContractOffer(state, true);
}

function contractFor(s: GameState): PoliticianContract {
  const contract = (s.politicianContracts || []).find((row) => row.status === 'offered');
  assert.ok(contract, 'a fresh game should have a politician contract offer');
  return contract!;
}

test('low-level boutiques do not receive politician contract offers', () => {
  const s = game({ tier: 0, politicianContracts: [] });
  assert.equal(s.politicianContracts?.some((row) => row.status === 'offered'), false);
  assert.equal(s.cash < 0, false);
});

test('new offer uses real catalogue items unlocked for the current boutique level', () => {
  const s = game({ tier: 6 });
  const offer = contractFor(s);
  assert.equal(offer.status, 'offered');
  assert.ok(offer.reward >= 500_000_000 && offer.reward <= 1_000_000_000,
    'Level 7 major contracts must offer ₦500m–₦1bn');
  assert.ok(offer.reward > offer.requirements.reduce((sum, row) => sum + row.unitCost * row.quantity, 0));
  assert.ok(offer.requirements.length >= 1);
  for (const requirement of offer.requirements) {
    const entry = MARKET.find((item) => item.kind === requirement.kind && item.id === requirement.itemId);
    assert.ok(entry, 'offer requirement must exist in the real Yaba Mart catalogue');
    assert.ok(canBuy(entry!, s.tier), 'offer must not require locked items');
    assert.ok(Number.isInteger(requirement.quantity) && requirement.quantity > 0);
  }
  assert.equal(s.cash < 0, false);
});

test('Level 6 and Level 7 major contracts use the proposed late-game payout scale', () => {
  const level6 = contractFor(game({ tier: 5, politicianContracts: [] }));
  assert.ok(level6.reward >= 220_000_000 && level6.reward <= 500_000_000,
    'Level 6 major contracts must offer ₦220m–₦500m');

  const level7 = contractFor(game({ tier: 6, politicianContracts: [] }));
  assert.ok(level7.reward >= 500_000_000 && level7.reward <= 1_000_000_000,
    'Level 7 major contracts must offer ₦500m–₦1bn');
});

test('200-day contract economy sample uses actual unlocked catalogue offers at Levels 6 and 7', () => {
  const scenarios = [
    { tier: 5, label: 'Level 6', lines: 3, minQty: 40, maxQty: 55, retailCeiling: 1_500_000, minReward: 220_000_000, maxReward: 500_000_000, weeklyRent: 30_000_000 },
    { tier: 6, label: 'Level 7', lines: 4, minQty: 45, maxQty: 65, retailCeiling: 3_000_000, minReward: 500_000_000, maxReward: 1_000_000_000, weeklyRent: 75_000_000 },
  ] as const;

  for (const scenario of scenarios) {
    const goodsCosts: number[] = [];
    const rewards: number[] = [];
    const contributions: number[] = [];
    for (let sample = 0; sample < 400; sample++) {
      const day = (sample % 200) + 1;
      const seed = (sample * 104_729 + 17) % 1_000_000_000;
      const base = newGame(DIVINE_CONFIG);
      const state = ensurePoliticianContractOffer({
        ...base,
        tier: scenario.tier,
        day,
        seed,
        politicianContracts: [],
      }, true);
      const offer = contractFor(state);
      assert.equal(offer.requirements.length, scenario.lines);
      assert.ok(offer.reward >= scenario.minReward && offer.reward <= scenario.maxReward);
      assert.ok(offer.requirements.every((row) =>
        Number.isInteger(row.quantity) &&
        row.quantity >= scenario.minQty &&
        row.quantity <= scenario.maxQty &&
        row.unitCost * MARKUP <= scenario.retailCeiling));
      const goodsCost = offer.requirements.reduce((sum, row) => sum + row.unitCost * row.quantity, 0);
      assert.ok(offer.reward > goodsCost, 'the contract payout must cover the actual catalogue goods cost');
      goodsCosts.push(goodsCost);
      rewards.push(offer.reward);
      contributions.push(offer.reward - goodsCost);
    }

    goodsCosts.sort((a, b) => a - b);
    contributions.sort((a, b) => a - b);
    const medianGoodsCost = goodsCosts[Math.floor(goodsCosts.length / 2)];
    const medianContribution = contributions[Math.floor(contributions.length / 2)];
    const meanReward = rewards.reduce((sum, amount) => sum + amount, 0) / rewards.length;
    console.log(
      '[Batch 6 economy sample] ' + scenario.label + ': 400 actual-catalogue offers; ' +
      'goods cost min/median/max ₦' + Math.round(goodsCosts[0]).toLocaleString('en-NG') + '/' +
      Math.round(medianGoodsCost).toLocaleString('en-NG') + '/' +
      Math.round(goodsCosts[goodsCosts.length - 1]).toLocaleString('en-NG') +
      '; median contribution ₦' + Math.round(medianContribution).toLocaleString('en-NG') +
      '; mean reward ₦' + Math.round(meanReward).toLocaleString('en-NG') +
      '; one contract's median contribution equals ' +
      (medianContribution / scenario.weeklyRent).toFixed(2) + ' weeks of standard tier rent.'
    );
    assert.ok(medianContribution > 0);
    assert.ok(meanReward >= scenario.minReward && meanReward <= scenario.maxReward);
  }
});

test('accepting a contract sets a deadline but never charges the player', () => {
  const s = game({ cash: 300_000 });
  const offer = contractFor(s);
  const accepted = acceptPoliticianContract(s, offer.id);
  const contract = accepted.politicianContracts!.find((row) => row.id === offer.id)!;
  assert.equal(contract.status, 'accepted');
  assert.equal(contract.acceptedDay, s.day);
  assert.equal(contract.deadlineDay, s.day + offer.deadlineDays);
  assert.equal(accepted.cash, s.cash);
  assert.equal(accepted.today.events.some((event) => event.includes(offer.title)), true);
});

test('shopper sources only missing quantities for the accepted contract and delivery pays after stock is verified', () => {
  const s = game({ cash: 1_000_000_000, tier: 6, marketCart: [] });
  const offer = contractFor(s);
  const accepted = acceptPoliticianContract(s, offer.id);
  const contract = accepted.politicianContracts!.find((row) => row.id === offer.id)!;
  // This is a fulfilment regression test, so fund the late-game sourcing order
  // generously enough to cover every required line. This is test-only money.
  const sourcingBudget = 500_000_000;
  const shopper = prepareShopperOrder(accepted, 'contract', sourcingBudget, contract.brief, contract.id);
  assert.ok(shopper.job, shopper.error);
  assert.equal(shopper.job.contractId, contract.id);
  assert.ok(shopper.job.items.every((line) => contract.requirements.some((row) => row.kind === line.kind && row.itemId === line.itemId)));
  assert.ok(shopper.job.estimatedTotal <= shopper.job.budget);
  assert.equal(shopper.state.cash, accepted.cash, 'preparing the cart must not charge money');

  const cart = shopper.state.marketCart || [];
  assert.ok(cart.length > 0);
  const beforeCheckout = shopper.state.cash;
  const purchased = buyCart(shopper.state, cart);
  assert.notEqual(purchased, shopper.state, 'the cart should checkout successfully');
  assert.ok(purchased.cash < beforeCheckout);
  assert.equal(purchased.shopperJobs?.find((job) => job.id === shopper.job!.id)?.status, 'purchased');

  const progress = politicianContractProgress(purchased, contract);
  assert.equal(progress.complete, true, 'the combined original stock and purchased stock must satisfy the offer');
  const cashBeforeDelivery = purchased.cash;
  const delivered = deliverPoliticianContract(purchased, contract.id);
  const completed = delivered.politicianContracts!.find((row) => row.id === contract.id)!;
  assert.equal(completed.status, 'fulfilled');
  assert.equal(completed.completedDay, purchased.day);
  assert.ok(delivered.cash >= cashBeforeDelivery + contract.reward);
  assert.equal(politicianContractProgress(delivered, contract).complete, false, 'delivery consumes the contracted stock');
  assert.ok(delivered.today.events.some((event) => event.includes('Contract delivered')));
});

test('fulfilled major contracts keep a 45-day cooldown before another offer', () => {
  const s = game({ tier: 6, politicianContracts: [] });
  const offer = contractFor(s);
  const completed = {
    ...s,
    politicianContracts: s.politicianContracts!.map((row) =>
      row.id === offer.id ? { ...row, status: 'fulfilled' as const, completedDay: s.day } : row),
  };
  const stillCoolingDown = ensurePoliticianContractOffer({ ...completed, day: s.day + 44 });
  assert.equal(stillCoolingDown.politicianContracts?.some((row) => row.status === 'offered'), false);

  const readyForNext = ensurePoliticianContractOffer({ ...completed, day: s.day + 45 });
  assert.equal(readyForNext.politicianContracts?.some((row) => row.status === 'offered'), true);
});

test('an accepted contract that passes its deadline fails and applies a fee and reputation consequence', () => {
  const s = game({ cash: 200_000 });
  const offer = contractFor(s);
  const accepted = acceptPoliticianContract(s, offer.id);
  const contract = accepted.politicianContracts!.find((row) => row.id === offer.id)!;
  const late = ensurePoliticianContractOffer({ ...accepted, day: contract.deadlineDay! + 1 });
  const failed = late.politicianContracts!.find((row) => row.id === contract.id)!;
  assert.equal(failed.status, 'failed');
  assert.equal(failed.completedDay, contract.deadlineDay! + 1);
  assert.equal(failed.penaltyCharged, contract.failurePenalty);
  assert.ok(late.cash < accepted.cash);
  assert.ok(late.rep < accepted.rep);
  assert.ok(late.today.costs >= contract.failurePenalty);
  assert.ok(late.messages.some((message) => message.text.includes('deadline') && message.tone === 'danger'));
});

test('a contract cannot be delivered until all required quantities are physically in stock', () => {
  const s = game({ cash: 300_000 });
  const offer = contractFor(s);
  const accepted = acceptPoliticianContract(s, offer.id);
  const early = deliverPoliticianContract(accepted, offer.id);
  assert.equal(early, accepted);
  assert.equal(politicianContractProgress(accepted, offer).complete, false);
});

test('expired offers do not incur a penalty and a fresh offer arrives after the cooldown', () => {
  const s = game({ cash: 200_000 });
  const offer = contractFor(s);
  const expired = ensurePoliticianContractOffer({ ...s, day: offer.offerExpiresDay + 1 });
  assert.equal(expired.politicianContracts!.find((row) => row.id === offer.id)!.status, 'expired');
  assert.equal(expired.cash, s.cash);
  assert.equal(expired.today.costs, s.today.costs);
  const expirationDay = expired.politicianContracts!.find((row) => row.id === offer.id)!.completedDay!;
  const beforeCooldownEnds = ensurePoliticianContractOffer({ ...expired, day: expirationDay + 44 });
  assert.equal(beforeCooldownEnds.politicianContracts!.some((row) => row.status === 'offered'), false);
  const nextDay = ensurePoliticianContractOffer({ ...expired, day: expirationDay + 45 });
  assert.ok(nextDay.politicianContracts!.some((row) => row.status === 'offered'));
});
