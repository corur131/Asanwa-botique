import assert from 'node:assert/strict';
import test from 'node:test';
import type { GameState } from './types';
import { money, payRent, settleLateRent, demote } from './engine';
import {
  financialAssets,
  creditHistoryReport,
  netWorthPlayer,
  totalLiabilities,
  ensureBusinessState,
  initialBankState,
  processFixedDepositMaturities,
  processBankWeekly,
  processExpansionAtClose,
  repayBusinessLoan,
  arrangeBusinessLoanRepayment,
  maximumLoan,
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


test('branch operating costs create a payable rather than negative cash when funds run short', () => {
  const before = state({
    day: 7,
    cash: 0,
    rep: 35,
    followers: 120,
    tier: 0,
    businessExpansion: {
      branches: [{ id: 'branch-test', name: 'Test Branch', area: 'Lagos', tier: 0, openedDay: 1, weeklyRent: 1_000_000, assetValue: 90_000 }],
      departments: [],
      wholesaleActive: false,
      designerCollections: 0,
    },
  });
  const after = processExpansionAtClose(before);
  assert.ok(after.cash >= 0);
  assert.ok((after.operatingPayables || 0) > 0);
  assert.ok(totalLiabilities(after) >= (after.operatingPayables || 0));
});

test('older loans with missed payments receive an arrears estimate when saves are normalized', () => {
  const legacyLoan = {
    id: 'legacy-loan', principal: 100_000, balance: 100_000, weeklyRatePct: 2,
    weeklyPayment: 12_000, termWeeks: 12, nextPaymentDay: 14, missedPayments: 2,
  };
  const after = ensureBusinessState(state({
    bank: { ...initialBankState(), loans: [legacyLoan] },
  }));
  assert.equal(after.bank!.loans[0].arrearsBalance, 24_000);
});


test('rent paid from both Rent Vault and cash is charged once and reconciles across accounts', () => {
  const before = state({
    day: 14,
    cash: 10_000,
    tier: 0,
    grace: 3,
    listing: { rent: 12_000 } as GameState['listing'],
    lateRent: null,
    bank: { ...initialBankState(), savings: 0, rentVault: 4_000, fixedDeposits: [], loans: [] },
  });
  const after = payRent(before);
  assert.equal(after.cash, 2_000);
  assert.equal(after.bank!.rentVault, 0);
  assert.equal(after.lateRent, null);
  assert.equal(after.today.costs, 12_000);
  assert.equal(after.ledger!.reduce((sum, line) => sum + line.amount, 0), -12_000);
});

test('rent covered entirely by Rent Vault does not also deduct cash', () => {
  const before = state({
    cash: 7_000,
    tier: 0,
    grace: 3,
    listing: { rent: 5_000 } as GameState['listing'],
    lateRent: null,
    bank: { ...initialBankState(), savings: 0, rentVault: 8_000, fixedDeposits: [], loans: [] },
  });
  const after = payRent(before);
  assert.equal(after.cash, 7_000);
  assert.equal(after.bank!.rentVault, 3_000);
  assert.equal(after.lateRent, null);
  assert.equal(after.today.costs, 5_000);
});

test('short rent becomes one visible liability and later partial settlement reduces it without recharging rent', () => {
  const before = state({
    cash: 1_000,
    tier: 0,
    grace: 3,
    listing: { rent: 10_000 } as GameState['listing'],
    lateRent: null,
    bank: { ...initialBankState(), savings: 0, rentVault: 2_000, fixedDeposits: [], loans: [] },
  });
  const billed = payRent(before);
  assert.equal(billed.cash, 0);
  assert.equal(billed.bank!.rentVault, 0);
  assert.equal(billed.lateRent!.amount, 7_000);
  assert.equal(totalLiabilities(billed), 7_000);
  assert.equal(billed.today.costs, 10_000);

  const partiallySettled = settleLateRent({
    ...billed,
    cash: 3_000,
    bank: { ...billed.bank!, rentVault: 1_000 },
  });
  assert.equal(partiallySettled.cash, 0);
  assert.equal(partiallySettled.bank!.rentVault, 0);
  assert.equal(partiallySettled.lateRent!.amount, 3_000);
  assert.equal(totalLiabilities(partiallySettled), 3_000);
  assert.equal(partiallySettled.today.costs, 10_000, 'clearing arrears must not charge the original rent again');
});

test('net worth falls by the value of newly recorded rent arrears', () => {
  const common = {
    tier: 0, rep: 35, followers: 120, stock: [], furniture: [],
    bank: { ...initialBankState(), savings: 0, rentVault: 0, fixedDeposits: [], loans: [] },
    businessExpansion: { branches: [], departments: [], wholesaleActive: false, designerCollections: 0 },
  };
  const noDebt = state({ ...common, lateRent: null });
  const withDebt = state({ ...common, lateRent: { amount: 15_000, due: 20 } });
  assert.equal(netWorthPlayer(noDebt) - netWorthPlayer(withDebt), 15_000);
});


test('demotion waives half of rent arrears without creating fake cash and preserves the remaining debt', () => {
  const before = state({
    day: 14,
    cash: 2_000,
    tier: 1,
    grace: 3,
    lateRent: { amount: 10_000, due: 14 },
    furniture: [],
    stock: [],
    staff: [],
    rivals: [],
    history: [],
    stats: { served: 0, totalEarned: 0, demotions: 0, bestScore: 0 },
    businessExpansion: { branches: [], departments: [], wholesaleActive: false, designerCollections: 0 },
  });
  const after = demote(before);
  assert.equal(after.cash, 2_000);
  assert.equal(after.tier, 0);
  assert.equal(after.lateRent!.amount, 5_000);
  assert.ok(after.lateRent!.due > after.day);
  assert.equal(totalLiabilities(after), 5_000);
});

test('the smallest shop keeps rent debt on the books and extends its deadline instead of erasing it', () => {
  const before = state({ day: 20, tier: 0, lateRent: { amount: 4_000, due: 20 } });
  const after = demote(before);
  assert.equal(after.cash, before.cash);
  assert.equal(after.lateRent!.amount, 4_000);
  assert.equal(after.lateRent!.due, 27);
  assert.equal(totalLiabilities(after), 4_000);
});



test('scheduled loan payments do not falsely clear older arrears or count one instalment twice', () => {
  const loan = {
    id: 'loan-current-again', principal: 50_000, balance: 50_000, weeklyRatePct: 0,
    weeklyPayment: 10_000, termWeeks: 8, nextPaymentDay: 7,
    missedPayments: 0, arrearsBalance: 12_000,
  };
  const before = state({
    day: 7,
    cash: 30_000,
    bank: { ...initialBankState(), savings: 0, rentVault: 0, loans: [loan] },
  });
  assert.equal(maximumLoan(before), 0, 'new borrowing is blocked while monetary arrears remain');

  const first = processBankWeekly(before);
  assert.equal(first.bank!.loans[0].balance, 40_000);
  assert.equal(first.bank!.loans[0].arrearsBalance, 12_000);
  assert.equal(creditHistoryReport(first).standing, 'In arrears');

  const second = processBankWeekly({
    ...first,
    day: 14,
    cash: 30_000,
    bank: { ...first.bank!, loans: first.bank!.loans.map((item) => ({ ...item, nextPaymentDay: 14 })) },
  });
  assert.equal(second.bank!.loans[0].balance, 30_000);
  assert.equal(second.bank!.loans[0].arrearsBalance, 12_000);
  assert.equal(creditHistoryReport(second).standing, 'In arrears');

  const cure = repayBusinessLoan({ ...second, cash: 30_000 }, 'loan-current-again', 12_000);
  assert.equal(cure.bank!.loans[0].arrearsBalance, 0);
  assert.equal(creditHistoryReport(cure).standing, 'Current');
});

test('credit report continues to show arrears after a hardship plan resets consecutive missed-payment count', () => {
  const before = state({
    bank: { ...initialBankState(), loans: [{
      id: 'loan-report', principal: 100_000, balance: 104_500, weeklyRatePct: 2,
      weeklyPayment: 12_000, termWeeks: 12, nextPaymentDay: 21,
      missedPayments: 0, arrearsBalance: 9_000, arrangementUsed: true,
    }] },
  });
  const report = creditHistoryReport(before);
  assert.equal(report.arrearsAmount, 9_000);
  assert.equal(report.standing, 'In arrears');
});
