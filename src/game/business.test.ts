import assert from 'node:assert/strict';
import test from 'node:test';
import type { Customer, GameState, Message } from './types';
import { initRivals, simulateRivals } from './rivals';
import { judge } from './encounters';
import { answerInvite } from './encounters';
import { money, payRent, settleLateRent, demote, closeShop, cashFlowSummary } from './engine';
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
  takeBusinessLoan,
  transferBank,
  investInExpansion,
  financeExpansionPurchase,
  expansionOptions,
  wholesaleUpgradeQuote,
  upgradeWholesaleInventory,
  startPromotion,
  processPromotionAtClose,
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

test('closing an already-closed day is a no-op and cannot charge obligations twice', () => {
  const alreadyClosed = state({ phase: 'evening', day: 7, cash: 100_000 });
  assert.equal(closeShop(alreadyClosed), alreadyClosed);
});

test('daily cash-flow report reconciles opening cash, operating result and other movements', () => {
  const before = state({
    cash: 25_000,
    today: { day: 10, served: 0, walkedOut: 0, lost: 0, income: 120_000, costs: 20_000, tips: 0, bestScore: 0, repChange: 0, staffServed: 0, openingCash: 100_000, events: [] },
    bank: { ...initialBankState(), savings: 40_000, rentVault: 15_000, fixedDeposits: [{ id: 'fd-test', amount: 10_000, ratePct: 1, openedDay: 1, maturityDay: 20 }] },
  });
  const report = cashFlowSummary(before);
  assert.equal(report.openingCash, 100_000);
  assert.equal(report.cash, 25_000);
  assert.equal(report.operatingResult, 100_000);
  assert.equal(report.cashChange, -75_000);
  assert.equal(report.otherMovement, -175_000);
  assert.equal(report.openingCash! + report.operatingResult + report.otherMovement!, report.cash);
  assert.equal(report.savings, 40_000);
  assert.equal(report.rentVault, 15_000);
  assert.equal(report.fixedDeposits, 10_000);
});

test('older saves without an opening-cash snapshot do not invent a cash-change figure', () => {
  const report = cashFlowSummary(state({ today: { day: 10, served: 0, walkedOut: 0, lost: 0, income: 4_000, costs: 1_000, tips: 0, bestScore: 0, repChange: 0, staffServed: 0, events: [] } }));
  assert.equal(report.openingCash, null);
  assert.equal(report.cashChange, null);
  assert.equal(report.otherMovement, null);
});

test('KoboBank ledger retains more than the former 150-entry limit', () => {
  let current = state({ ledger: [] });
  for (let i = 0; i < 200; i++) current = money(current, 100, 'Test receipt ' + i);
  assert.equal(current.ledger.length, 200);
  assert.equal(current.ledger[0].label, 'Test receipt 199');
});

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

test('weekly bank interest is not credited before a scheduled banking day', () => {
  const before = state({
    day: 8,
    bank: { ...initialBankState(), savings: 20_000, rentVault: 10_000, savingsRatePct: 1, rentVaultRatePct: 1 },
  });
  const after = processBankWeekly(before);
  assert.equal(after.bank!.savings, 20_000);
  assert.equal(after.bank!.rentVault, 10_000);
  assert.equal(after.ledger!.length, before.ledger!.length);
});

test('maximum loan rounds down and never authorizes more than the remaining cap', () => {
  const existingLoan = {
    id: 'existing-small-loan',
    principal: 82_875,
    balance: 82_875,
    weeklyRatePct: 0,
    weeklyPayment: 1_000,
    termWeeks: 8,
    nextPaymentDay: 14,
    missedPayments: 0,
    arrearsBalance: 0,
  };
  const before = state({
    day: 10,
    tier: 0,
    cash: 2_000_000,
    bank: { ...initialBankState(), loans: [existingLoan] },
  });
  assert.equal(maximumLoan(before), 100_000);
  assert.equal(takeBusinessLoan(before, 110_000, 8), before, 'a request above the rounded-down cap must be rejected');
  const approved = takeBusinessLoan(before, 100_000, 8);
  assert.notEqual(approved, before);
  assert.equal(approved.bank!.loans.reduce((sum, loan) => sum + loan.balance, 0), 182_875);
});

test('loan disbursement and principal repayment preserve net worth apart from interest', () => {
  const before = state();
  const beforeWorth = netWorthPlayer(before);
  const borrowed = takeBusinessLoan(before, 100_000, 8);
  assert.notEqual(borrowed, before, 'eligible loan should be approved');
  assert.equal(borrowed.cash, before.cash + 100_000);
  assert.equal(netWorthPlayer(borrowed), beforeWorth, 'cash and loan liability rise by the same amount');

  const loan = borrowed.bank!.loans[0];
  const repaid = repayBusinessLoan(borrowed, loan.id, 10_000);
  assert.equal(repaid.cash, borrowed.cash - 10_000);
  assert.equal(repaid.bank!.loans[0].balance, loan.balance - 10_000);
  assert.equal(netWorthPlayer(repaid), netWorthPlayer(borrowed), 'paying principal reduces cash and liability equally');
});

test('repeated weekly banking on the same day does not credit interest twice', () => {
  const before = state({
    day: 14,
    bank: {
      ...initialBankState(),
      savings: 100_000,
      rentVault: 50_000,
      savingsRatePct: 1,
      rentVaultRatePct: 1,
      loans: [],
    },
  });
  const first = processBankWeekly(before);
  assert.equal(first.bank!.savings, 101_000);
  assert.equal(first.bank!.rentVault, 50_500);
  const repeated = processBankWeekly(first);
  assert.equal(repeated, first, 'same-day duplicate processing should be a no-op');
  assert.equal(repeated.bank!.savings, 101_000);
  assert.equal(repeated.bank!.rentVault, 50_500);
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


test('branch performance accumulates sales, costs, profit, and weekly rent exactly once', () => {
  const before = state({
    day: 14,
    cash: 100_000_000,
    businessExpansion: {
      branches: [{
        id: 'branch-performance',
        name: 'Performance Branch',
        area: 'Ikeja',
        tier: 0,
        openedDay: 1,
        weeklyRent: 10_000,
        assetValue: 2_200_000,
      }],
      departments: [],
      wholesaleActive: false,
      designerCollections: 0,
    },
  });
  const after = processExpansionAtClose(before);
  const branch = after.businessExpansion!.branches[0];
  assert.ok((branch.lastDayRevenue || 0) > 0);
  assert.equal(branch.cumulativeRevenue, branch.lastDayRevenue);
  assert.equal(branch.cumulativeCosts, branch.lastDayCosts);
  assert.equal(branch.lastDayCosts, Math.round((branch.lastDayRevenue || 0) * 0.5) + Math.round(1_500 * 0.65) + 10_000);
  assert.equal(branch.lastDayProfit, (branch.lastDayRevenue || 0) - (branch.lastDayCosts || 0));
  assert.equal(branch.daysTrading, 1);
  assert.equal(branch.lastDay, 14);
  assert.equal(after.businessExpansion!.lastProcessedDay, 14);

  const repeated = processExpansionAtClose(after);
  assert.equal(repeated, after, 'same-day repeat must not post another sale, cost, or rent');
  assert.equal(repeated.cash, after.cash);
  assert.equal(repeated.businessExpansion!.branches[0].cumulativeRevenue, branch.cumulativeRevenue);
  assert.equal(repeated.businessExpansion!.branches[0].cumulativeCosts, branch.cumulativeCosts);
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


test('new branch names follow the correct sequence without skipping a number', () => {
  let game = state({ day: 10, tier: 4, cash: 100_000_000, businessExpansion: {
    branches: [], departments: [], wholesaleActive: false, designerCollections: 0,
  } });
  game = investInExpansion(game, 'branch');
  game = investInExpansion(game, 'branch');
  game = investInExpansion(game, 'branch');
  assert.deepEqual(game.businessExpansion!.branches.map((branch) => branch.name), [
    'Asanwa Boutique Lekki Outlet',
    'Asanwa Boutique Branch 2',
    'Asanwa Boutique Branch 3',
  ]);
});

test('KoboBank directly finances an eligible expansion shortfall and the loan is recorded as a liability', () => {
  const history = Array.from({ length: 7 }, (_, index) => ({
    day: index + 1, served: 4, walkedOut: 0, lost: 0, income: 300_000, costs: 100_000,
    tips: 0, bestScore: 80, repChange: 0, staffServed: 0, events: [],
  }));
  const before = state({
    day: 14, tier: 2, cash: 700_000, history,
    businessExpansion: { branches: [], departments: [], wholesaleActive: false, designerCollections: 0 },
  });
  const option = expansionOptions(before).find((item) => item.id === 'accessories');
  assert.ok(option?.available);
  assert.equal(option?.financeable, true);
  const after = financeExpansionPurchase(before, 'accessories');
  assert.equal(after.businessExpansion?.departments.includes('Accessories'), true);
  assert.equal(after.bank?.loans.length, 1);
  assert.equal(after.bank?.loans[0].principal, 550_000);
  assert.equal(after.cash, 0);
  assert.equal(after.businessExpansion?.expansionCredit || 0, 0);
});

test('department sales consume inventory, record operating performance, and do not process twice in one day', () => {
  let before = state({
    day: 14, tier: 2, cash: 20_000_000,
    businessExpansion: { branches: [], departments: [], wholesaleActive: false, designerCollections: 0 },
  });
  before = investInExpansion(before, 'accessories');
  const after = processExpansionAtClose(before);
  const department = after.businessExpansion?.departmentOperations?.[0];
  assert.ok(department);
  assert.equal(department?.lastDay, 14);
  assert.ok((department?.lastDayRevenue || 0) > 0);
  assert.ok((department?.daysTrading || 0) === 1);
  assert.ok((department?.inventoryUnits || 0) <= (department?.targetUnits || 0));
  assert.equal(processExpansionAtClose(after), after);
});

test('wholesale operation tracks order fulfilment, inventory value, and idempotent daily closing', () => {
  let before = state({
    day: 14, tier: 3, cash: 100_000_000,
    businessExpansion: { branches: [], departments: [], wholesaleActive: false, designerCollections: 0 },
  });
  before = investInExpansion(before, 'wholesale');
  const after = processExpansionAtClose(before);
  const wholesale = after.businessExpansion?.wholesaleOperation;
  assert.ok(wholesale);
  assert.equal(wholesale?.lastDay, 14);
  assert.ok((wholesale?.lastDayRevenue || 0) > 0);
  assert.ok((wholesale?.ordersFulfilled || 0) >= 1);
  assert.ok((wholesale?.inventoryValue || 0) >= 0);
  assert.equal(processExpansionAtClose(after), after);
});

test('expansion credit is applied once and cannot make an investment exceed available funding', () => {
  const before = state({
    day: 14, tier: 2, cash: 1_000_000,
    businessExpansion: { branches: [], departments: [], wholesaleActive: false, designerCollections: 0, expansionCredit: 400_000 },
  });
  const option = expansionOptions(before).find((item) => item.id === 'accessories');
  assert.equal(option?.cashRequired, 850_000);
  const after = investInExpansion(before, 'accessories');
  assert.equal(after.businessExpansion?.departments.includes('Accessories'), true);
  assert.equal(after.businessExpansion?.expansionCredit, 0);
  assert.equal(after.cash, 150_000);
});

test('accepting a fashion invitation creates expansion credit and improves brand awareness', () => {
  const invitation = {
    id: 77, day: 10, from: 'Fashion Host', text: 'You are invited', tone: 'info',
    chat: 'Fashion Host', ctx: { kind: 'invite', eventId: 'event-credit-test' },
  } as Message;
  const before = state({
    day: 10,
    messages: [invitation],
    events: [{ id: 'event-credit-test', title: 'Pop-up Style-off', host: 'Fashion Host', day: 12, rivalId: 'missing-rival', prize: 100_000, followers: 100, status: 'invited' }],
    businessExpansion: { branches: [], departments: [], wholesaleActive: false, designerCollections: 0 },
  });
  const after = answerInvite(before, invitation, 'accept');
  assert.equal(after.events.find((event) => event.id === 'event-credit-test')?.status, 'accepted');
  assert.equal(after.businessExpansion?.expansionCredit, 25_000);
  assert.ok((after.brand?.awareness || 0) > 0);
});

test('fashion event victories award expansion credit and strengthen business brand metrics', () => {
  const event = { id: 'show-win-test', title: 'Pop-up Style-off', host: 'Fashion Host', day: 10, rivalId: 'missing-rival', prize: 200_000, followers: 250, status: 'accepted' as const };
  const customer = {
    id: 'model-show-win-test', name: 'Kiki', cls: 'rich', occasion: 'party', budget: 0, wants: [],
    taste: { favColor: '#C2262E', favName: 'red' }, request: 'Style-off model', look: {} as Customer['look'],
    male: false, influencer: true,
    contest: { eventId: event.id, rivalId: event.rivalId, rivalScore: 70, prize: event.prize, title: event.title },
  } as Customer;
  const before = state({
    day: 10, cash: 500_000, followers: 1_000, rep: 50,
    events: [event], rivals: [], gist: [], messages: [],
    businessExpansion: { branches: [], departments: [], wholesaleActive: false, designerCollections: 0 },
  });
  const after = judge(before, customer, 90);
  assert.equal(after.events.find((item) => item.id === event.id)?.status, 'won');
  assert.equal(after.businessExpansion?.expansionCredit, 30_000);
  assert.equal(after.cash, 700_000);
  assert.equal(after.followers, 1_250);
  assert.ok((after.brand?.prestige || 0) > 0);
});

test('well-funded rival businesses develop branches, departments or wholesale operations over time', () => {
  const base = initRivals().find((rival) => rival.id === 'ivory')!;
  const rival = {
    ...base, main: false, tier: 4, cash: 100_000_000, moved: -100, branches: 0,
    departments: [], wholesaleActive: false, savings: 0,
    week: Array.from({ length: 7 }, () => 500_000),
    weekCosts: Array.from({ length: 7 }, () => 250_000),
  };
  const history = Array.from({ length: 7 }, (_, index) => ({
    day: index + 1, served: 4, walkedOut: 0, lost: 0, income: 100_000, costs: 50_000,
    tips: 0, bestScore: 80, repChange: 0, staffServed: 0, events: [],
  }));
  let game = state({
    day: 1, tier: 2, history, listing: { area: 'Yaba', rent: 100_000 } as GameState['listing'],
    rivals: [rival], ranking: [], dailyRanking: [], rivalPosts: [], gist: [], events: [],
  });
  for (let day = 1; day <= 84; day += 1) {
    game = simulateRivals({ ...game, day, today: { ...game.today, events: [] } });
  }
  const developed = game.rivals[0];
  assert.ok((developed.branches || 0) > 0 || (developed.departments || []).length > 0 || developed.wholesaleActive,
    'a solvent established rival should reinvest in at least one operating expansion over twelve weeks');
});

test('financing a branch converts cash and loan proceeds into a capital asset without inflating net worth', () => {
  const before = state({
    day: 14, tier: 4, cash: 100_000_000,
    businessExpansion: { branches: [], departments: [], wholesaleActive: false, designerCollections: 0 },
  });
  const beforeWorth = netWorthPlayer(before);
  const after = investInExpansion(before, 'branch');
  assert.equal(after.businessExpansion?.branches[0].assetValue, 18_000_000);
  assert.equal(after.cash, 82_000_000);
  assert.equal(netWorthPlayer(after), beforeWorth);
});

test('opening department and wholesale inventory values reconcile to their capital setup costs', () => {
  let game = state({
    day: 14, tier: 3, cash: 40_000_000,
    businessExpansion: { branches: [], departments: [], wholesaleActive: false, designerCollections: 0 },
  });
  game = investInExpansion(game, 'accessories');
  const department = game.businessExpansion?.departmentOperations?.[0];
  assert.equal((department?.inventoryValue || 0) + (department?.assetValue || 0), 1_250_000);
  game = investInExpansion(game, 'wholesale');
  assert.equal((game.businessExpansion?.wholesaleOperation?.inventoryValue || 0) + 4_500_000, 7_500_000);
});


test('wholesale inventory upgrade doubles capacity, buys added stock, and refuses unaffordable purchases', () => {
  let before = state({
    day: 14, tier: 3, cash: 30_000_000,
    businessExpansion: { branches: [], departments: [], wholesaleActive: false, designerCollections: 0 },
  });
  before = investInExpansion(before, 'wholesale');
  const beforeOperation = before.businessExpansion!.wholesaleOperation!;
  const quote = wholesaleUpgradeQuote(before);
  assert.equal(quote.available, true);
  assert.equal(quote.nextCapacity, beforeOperation.targetUnits * 2);
  const upgraded = upgradeWholesaleInventory(before);
  const operation = upgraded.businessExpansion!.wholesaleOperation!;
  assert.equal(operation.targetUnits, quote.nextCapacity);
  assert.equal(operation.inventoryUnits, beforeOperation.inventoryUnits + beforeOperation.targetUnits);
  assert.equal(operation.inventoryValue, beforeOperation.inventoryValue + beforeOperation.targetUnits * beforeOperation.unitCost);
  assert.equal(upgraded.businessExpansion!.wholesaleUpgradeLevel, 1);
  const unaffordable = { ...before, cash: quote.cost - 1 };
  assert.equal(upgradeWholesaleInventory(unaffordable), unaffordable);
});

test('warehouse promotion is recorded as a buyer-demand campaign, not a follower campaign', () => {
  let before = state({
    day: 14, tier: 3, cash: 30_000_000,
    businessExpansion: { branches: [], departments: [], wholesaleActive: false, designerCollections: 0 },
  });
  before = investInExpansion(before, 'wholesale');
  const campaign = startPromotion(before, 'period', 'local', 10_000, 24, 'warehouse');
  assert.equal(campaign.promotion?.target, 'warehouse');
  const after = processPromotionAtClose(campaign);
  assert.equal(after.followers || 0, before.followers || 0);
  assert.ok(after.today.events.some((event) => event.includes('Warehouse promotion reached')));
});


