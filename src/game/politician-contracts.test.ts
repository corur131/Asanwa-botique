import assert from 'node:assert/strict';
import test from 'node:test';
import { DIVINE_CONFIG } from '../constants/presets';
import { acceptPoliticianContract, buyCart, deliverPoliticianContract, ensurePoliticianContractOffer, newGame, politicianContractProgress } from './engine';
import { canBuy, MARKET } from './market';
import { prepareShopperOrder } from './shopper';
import type { GameState, PoliticianContract } from './types';

function game(overrides: Partial<GameState> = {}): GameState {
  // Most contract workflow tests exercise the late-game eligible tier.
  return { ...newGame(DIVINE_CONFIG), tier: 6, ...overrides } as GameState;
}

function contractFor(s: GameState): PoliticianContract {
  const contract = (s.politicianContracts || []).find((row) => row.status === 'offered');
  assert.ok(contract, 'a fresh game should have a politician contract offer');
  return contract!;
}

test('new offer uses real catalogue items unlocked for the current boutique level', () => {
  const s = game({ tier: 0 });
  const offer = contractFor(s);
  assert.equal(offer.status, 'offered');
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
  const s = game({ cash: 500_000, tier: 0, marketCart: [] });
  const offer = contractFor(s);
  const accepted = acceptPoliticianContract(s, offer.id);
  const contract = accepted.politicianContracts!.find((row) => row.id === offer.id)!;
  const shopper = prepareShopperOrder(accepted, 'contract', 300_000, contract.brief, contract.id);
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
  const nextDay = ensurePoliticianContractOffer({ ...expired, day: (offer.completedDay || offer.offerExpiresDay + 1) + 3 });
  assert.ok(nextDay.politicianContracts!.some((row) => row.status === 'offered'));
});
