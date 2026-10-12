import assert from 'node:assert/strict';
import test from 'node:test';
import type { GameState } from './types';
import {
  financialAssets,
  initialBankState,
  processFixedDepositMaturities,
  transferBank,
} from './business';

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    day: 10,
    phase: 'morning',
    clock: 0,
    cash: 50_000,
    ledger: [],
    bank: {
      ...initialBankState(),
      savings: 20_000,
      rentVault: 10_000,
      fixedDeposits: [],
      ...overrides.bank,
    },
    ...overrides,
  } as unknown as GameState;
}

test('moving money from cash to savings does not change total financial assets', () => {
  const before = state();
  const after = transferBank(before, 'savings', 12_000);
  assert.equal(after.cash, before.cash - 12_000);
  assert.equal(after.bank?.savings, before.bank!.savings + 12_000);
  assert.equal(financialAssets(after), financialAssets(before));
});

test('moving money from savings back to current account does not change total financial assets', () => {
  const before = state();
  const after = transferBank(before, 'current', 8_000, 'savings');
  assert.equal(after.cash, before.cash + 8_000);
  assert.equal(after.bank?.savings, before.bank!.savings - 8_000);
  assert.equal(financialAssets(after), financialAssets(before));
});

test('fixed deposit stays locked before its maturity day', () => {
  const before = state({
    day: 9,
    bank: {
      ...initialBankState(),
      savings: 0,
      fixedDeposits: [{ id: 'fd-test', amount: 10_000, ratePct: 0.9, openedDay: 2, maturityDay: 10 }],
    } as GameState['bank'],
  });
  const after = processFixedDepositMaturities(before);
  assert.equal(after.bank?.fixedDeposits.length, 1);
  assert.equal(after.bank?.savings, 0);
});

test('fixed deposit releases principal plus interest on its exact maturity day', () => {
  const before = state({
    day: 10,
    bank: {
      ...initialBankState(),
      savings: 0,
      fixedDeposits: [{ id: 'fd-test', amount: 10_000, ratePct: 0.9, openedDay: 3, maturityDay: 10 }],
    } as GameState['bank'],
  });
  const after = processFixedDepositMaturities(before);
  assert.equal(after.bank?.savings, 10_090);
  assert.equal(after.bank?.fixedDeposits.length, 0);
  assert.equal(after.ledger?.[0]?.label, 'Fixed deposit maturity + interest');
});

test('processing a matured deposit twice does not credit it twice', () => {
  const before = state({
    day: 10,
    bank: {
      ...initialBankState(),
      savings: 0,
      fixedDeposits: [{ id: 'fd-test', amount: 10_000, ratePct: 0.9, openedDay: 3, maturityDay: 10 }],
    } as GameState['bank'],
  });
  const once = processFixedDepositMaturities(before);
  const twice = processFixedDepositMaturities(once);
  assert.equal(twice.bank?.savings, once.bank?.savings);
  assert.equal(twice.ledger?.length, once.ledger?.length);
});
