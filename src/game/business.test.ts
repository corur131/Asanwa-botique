import assert from 'node:assert/strict';
import test from 'node:test';
import type { GameState } from './types';
import { money } from './engine';
import {
  financialAssets,
  totalLiabilities,
  ensureBusinessState,
  initialBankState,
  processFixedDepositMaturities,
  processBankWeekly,
  repayBusinessLoan,
  arrangeBusinessLoanRepayment,
  transferBank,
} from './business';

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    day: 10,
    phase: 'morning',
    clock: 0,
    cash: 50_000,
    ledger: [],
    today: { income: 0, costs: 0, events: [] },
    messages: [],
    msgSeq: 0,
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


test('missed loan payment capitalizes interest, records the instalment as arrears, and logs both charges', () => {
  const loan = {
    id: 'loan-test', principal: 100_000, balance: 100_000, weeklyRatePct: 2,
    weeklyPayment: 12_000, termWeeks: 12, nextPaymentDay: 7, missedPayments: 0,
  };
  const before = state({
    day: 7,
    cash: 0,
    bank: { ...initialBankState(), savings: 0, rentVault: 0, loans: [loan] },
  });
  const after = processBankWeekly(before);
  const updated = after.bank!.loans[0];
  assert.equal(updated.balance, 104_500);
  assert.equal(updated.arrearsBalance, 12_000);
  assert.equal(updated.missedPayments, 1);
  assert.equal(after.today.costs, 4_500);
  assert.equal(after.ledger?.[0]?.label, 'Missed loan payment fee');
  assert.equal(after.ledger?.[1]?.label, 'Missed loan interest');
});

test('partial loan repayment reduces both debt and recorded arrears without erasing missed-payment history', () => {
  const loan = {
    id: 'loan-test', principal: 100_000, balance: 100_000, weeklyRatePct: 2,
    weeklyPayment: 12_000, termWeeks: 12, nextPaymentDay: 14,
    missedPayments: 1, arrearsBalance: 12_000,
  };
  const before = state({
    cash: 5_000,
    bank: { ...initialBankState(), loans: [loan] },
  });
  const after = repayBusinessLoan(before, 'loan-test', 3_000);
  assert.equal(after.cash, 2_000);
  assert.equal(after.bank!.loans[0].balance, 97_000);
  assert.equal(after.bank!.loans[0].arrearsBalance, 9_000);
  assert.equal(after.bank!.loans[0].missedPayments, 1);
});

test('hardship arrangement changes the schedule but does not erase monetary arrears', () => {
  const loan = {
    id: 'loan-test', principal: 100_000, balance: 104_500, weeklyRatePct: 2,
    weeklyPayment: 12_000, termWeeks: 12, nextPaymentDay: 14,
    missedPayments: 0, arrearsBalance: 12_000,
  };
  const before = state({ day: 10, bank: { ...initialBankState(), loans: [loan] } });
  const after = arrangeBusinessLoanRepayment(before, 'loan-test');
  assert.equal(after.bank!.loans[0].arrangementUsed, true);
  assert.equal(after.bank!.loans[0].arrearsBalance, 12_000);
  assert.equal(after.bank!.loans[0].missedPayments, 0);
});


test('unfunded operating costs become payables instead of negative cash', () => {
  const before = state({ cash: 1_000 });
  const after = money(before, -3_000, 'Unexpected operating bill');
  assert.equal(after.cash, 0);
  assert.equal(after.operatingPayables, 2_000);
  assert.equal(totalLiabilities(after), 2_000);
  assert.equal(after.ledger?.[0]?.amount, 0, 'unpaid shortfall is informational, not a cash movement');
  assert.equal(after.ledger?.[1]?.amount, -1_000, 'ledger records only the amount actually paid from cash');
});

test('new operating receipts settle payables before increasing spendable cash', () => {
  const before = state({ cash: 0, operatingPayables: 2_000 });
  const after = money(before, 5_000, 'Daily sales');
  assert.equal(after.cash, 3_000);
  assert.equal(after.operatingPayables, 0);
  assert.equal(after.ledger?.[0]?.label, 'Operating payables settled');
  assert.equal(after.ledger!.reduce((sum, line) => sum + line.amount, 0), after.cash - before.cash, 'cash ledger reconciles to the cash balance change');
});

test('legacy negative cash is migrated into an operating liability', () => {
  const before = state({ cash: -5_000, operatingPayables: 2_000 });
  const after = ensureBusinessState(before);
  assert.equal(after.cash, 0);
  assert.equal(after.operatingPayables, 7_000);
});
