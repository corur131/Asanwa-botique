import type { BankPocket, BankState, BrandMetrics, BusinessLoan, GameState, PromotionCampaign, PromotionLevel, PromotionMode, Rival, WeeklyWealthSnapshot } from './types';
import { TIERS } from './economy';
import { furnitureById } from './shop';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const roundMoney = (value: number) => Math.max(0, Math.round(value));
const TIER_ASSETS = [90_000, 300_000, 1_100_000, 4_500_000, 12_000_000];
const PROMOTION_UNLOCK_TIER: Record<PromotionLevel, number> = { local: 0, citywide: 1, premium: 2, luxury: 4 };
const PROMOTION_LEVELS: PromotionLevel[] = ['local', 'citywide', 'premium', 'luxury'];
const PROMOTION_MIN: Record<PromotionLevel, number> = { local: 500, citywide: 2_000, premium: 7_500, luxury: 20_000 };
const PROMOTION_MAX: Record<PromotionLevel, number> = { local: 3_000, citywide: 12_000, premium: 45_000, luxury: 150_000 };
const TIER_BUDGET_CAP = [2_000, 8_000, 30_000, 70_000, 150_000];

export function initialBankState(): BankState {
  return {
    savings: 0, rentVault: 0, rentMode: 'manual', autoRentPercent: 20,
    savingsRatePct: 0.65, rentVaultRatePct: 0.25, fixedDeposits: [], loans: [],
    savingsGoalName: 'Next shop upgrade', savingsGoalAmount: 1_000_000,
  };
}

export function brandFromLegacy(rep = 35, followers = 120, tier = 0): BrandMetrics {
  const r = clamp(Number.isFinite(rep) ? rep : 35, 0, 100);
  const social = Math.log10(Math.max(1, followers) + 1);
  return {
    awareness: clamp(18 + social * 10 + tier * 4, 5, 100),
    prestige: clamp(15 + r * 0.52 + tier * 3, 5, 100),
    trendInfluence: clamp(12 + social * 5, 5, 100),
    loyalty: clamp(24 + r * 0.46, 5, 100),
    reliability: clamp(50 + r * 0.32, 5, 100),
  };
}

export function getBrandMetrics(s: Pick<GameState, 'brand' | 'rep' | 'followers' | 'tier'>): BrandMetrics {
  return s.brand || brandFromLegacy(s.rep, s.followers || 0, s.tier || 0);
}

export function brandPower(metrics: BrandMetrics, followers: number, tier: number): number {
  const core = metrics.awareness * 0.22 + metrics.prestige * 0.18 + metrics.trendInfluence * 0.17 +
    metrics.loyalty * 0.22 + metrics.reliability * 0.21;
  // Audience scale and physical scale continue contributing after any individual indicator plateaus.
  return Math.round(core + Math.log10(Math.max(1, followers) + 1) * 14 + Math.max(0, tier) * 18);
}

export function ensureBusinessState(s: GameState): GameState {
  const bank = s.bank || initialBankState();
  const brand = getBrandMetrics(s);
  const rivals = (s.rivals || []).map((r) => ({
    ...r,
    brand: r.brand || brandFromLegacy(r.rep, r.followers || 0, r.tier || 0),
    savings: Number.isFinite(r.savings) ? Math.max(0, r.savings || 0) : 0,
    debt: Number.isFinite(r.debt) ? Math.max(0, r.debt || 0) : 0,
    assetValue: Number.isFinite(r.assetValue) ? Math.max(0, r.assetValue || 0) : TIER_ASSETS[r.tier] || TIER_ASSETS[0],
    weekCosts: Array.isArray(r.weekCosts) ? r.weekCosts.slice(-7) : Array.from({ length: Math.min(7, (r.week || []).length) }, (_, i) => {
      const takings = (r.week || []).slice(-7)[i] || 0;
      return Math.round(takings * 0.62 + (TIERS[r.tier]?.running || 1500));
    }),
  }));
  return {
    ...s, bank, brand, rivals,
    wealthHistory: Array.isArray(s.wealthHistory) ? s.wealthHistory : [],
  };
}

export function availablePromotionLevels(tier: number): PromotionLevel[] {
  return PROMOTION_LEVELS.filter((level) => PROMOTION_UNLOCK_TIER[level] <= tier);
}
export function promotionBudgetBounds(tier: number, level: PromotionLevel): { min: number; max: number } {
  const max = Math.max(PROMOTION_MIN[level], Math.min(PROMOTION_MAX[level], TIER_BUDGET_CAP[clamp(tier, 0, 4)]));
  return { min: Math.min(PROMOTION_MIN[level], max), max };
}
export function promotionTrafficBoost(s: GameState): number {
  const p = s.promotion;
  if (!p?.active) return 0;
  const level = { local: 0.06, citywide: 0.12, premium: 0.2, luxury: 0.3 }[p.level];
  const bounds = promotionBudgetBounds(s.tier, p.level);
  const intensity = clamp(p.hourlyBudget / Math.max(1, bounds.max), 0, 1);
  const brand = getBrandMetrics(s);
  return clamp(level + intensity * 0.16 + brand.awareness / 1000, 0.04, 0.62);
}

export function startPromotion(
  s0: GameState, mode: PromotionMode, level: PromotionLevel, hourlyBudget: number, durationHours = 48,
): GameState {
  if (!availablePromotionLevels(s0.tier).includes(level)) return s0;
  const bounds = promotionBudgetBounds(s0.tier, level);
  const budget = Math.round(clamp(Number.isFinite(hourlyBudget) ? hourlyBudget : bounds.min, bounds.min, bounds.max) / 500) * 500;
  const hours = Math.round(clamp(Number.isFinite(durationHours) ? durationHours : 48, 8, 168) / 4) * 4;
  const campaign: PromotionCampaign = {
    active: true, mode, level, hourlyBudget: budget, startedDay: s0.day,
    hoursRemaining: mode === 'period' ? hours : undefined, hoursRun: 0, totalSpent: 0, estimatedReach: 0,
  };
  return { ...s0, promotion: campaign };
}

export function stopPromotion(s: GameState): GameState {
  return s.promotion?.active ? { ...s, promotion: { ...s.promotion, active: false } } : s;
}

function ledger(s: GameState, amount: number, label: string): GameState {
  if (!amount) return s;
  return {
    ...s,
    cash: s.cash + amount,
    ledger: [{ day: s.day, t: s.phase === 'shop' ? Math.floor(s.clock) : -1, label, amount }, ...(s.ledger || [])].slice(0, 150),
  };
}

export function transferBank(s0: GameState, pocket: BankPocket, amount: number): GameState {
  const bank = s0.bank || initialBankState();
  const value = roundMoney(amount);
  if (!value) return s0;
  if (pocket === 'current') {
    const available = pocket === 'current' ? (s0.bank?.rentVault || 0) : 0;
    if (available <= 0 || value > available) return s0;
    return ledger({ ...s0, bank: { ...bank, rentVault: bank.rentVault - value } }, value, 'Transfer from Rent Vault to current account');
  }
  if (s0.cash < value) return s0;
  const updatedBank = pocket === 'savings'
    ? { ...bank, savings: bank.savings + value }
    : { ...bank, rentVault: bank.rentVault + value };
  return ledger({ ...s0, bank: updatedBank }, -value, pocket === 'savings' ? 'Transfer to savings' : 'Transfer to Rent Vault');
}

export function setRentSaving(s0: GameState, mode: 'manual' | 'automatic', percent?: number): GameState {
  const bank = s0.bank || initialBankState();
  return { ...s0, bank: { ...bank, rentMode: mode, autoRentPercent: clamp(Number.isFinite(percent) ? Number(percent) : bank.autoRentPercent, 0, 80) } };
}

export function setSavingsGoal(s: GameState, name: string, amount: number): GameState {
  if (!Number.isFinite(amount) || amount < 0) return s;
  return { ...s, bank: { ...(s.bank || initialBankState()), savingsGoalName: name.trim().slice(0, 60) || 'Business goal', savingsGoalAmount: roundMoney(amount) } };
}

export function createFixedDeposit(s0: GameState, amount: number, durationDays: number): GameState {
  const bank = s0.bank || initialBankState();
  const value = roundMoney(amount);
  if (!value || value > bank.savings || ![7, 14, 28, 56].includes(durationDays)) return s0;
  const deposit = { id: 'fd-' + s0.day + '-' + Math.random().toString(36).slice(2, 8), amount: value, ratePct: durationDays >= 28 ? 1.35 : 0.9, openedDay: s0.day, maturityDay: s0.day + durationDays };
  return { ...s0, bank: { ...bank, savings: bank.savings - value, fixedDeposits: [...bank.fixedDeposits, deposit] } };
}

export function maximumLoan(s: GameState): number {
  const maxByTier = [300_000, 1_500_000, 6_000_000, 25_000_000, 75_000_000][clamp(s.tier, 0, 4)];
  const bank = s.bank || initialBankState();
  const activeDebt = bank.loans.reduce((sum, loan) => sum + loan.balance, 0);
  const weeklyRevenue = (s.history || []).slice(-7).reduce((sum, day) => sum + day.income, 0);
  const cashFlowLimit = Math.max(100_000, weeklyRevenue * 2 + Math.max(0, s.cash) * 0.25);
  return Math.round(Math.max(0, Math.min(maxByTier, cashFlowLimit - activeDebt)) / 10_000) * 10_000;
}

export function takeBusinessLoan(s0: GameState, requested: number, termWeeks: number): GameState {
  const amount = roundMoney(requested);
  if (!amount || ![4, 8, 12, 24].includes(termWeeks) || amount > maximumLoan(s0)) return s0;
  const bank = s0.bank || initialBankState();
  const rate = 3.2;
  const r = rate / 100;
  const weeklyPayment = Math.round(amount * r * Math.pow(1 + r, termWeeks) / (Math.pow(1 + r, termWeeks) - 1));
  const loan: BusinessLoan = {
    id: 'loan-' + s0.day + '-' + Math.random().toString(36).slice(2, 8),
    principal: amount, balance: amount, weeklyRatePct: rate, weeklyPayment, termWeeks,
    nextPaymentDay: s0.day + 7, missedPayments: 0,
  };
  const next = ledger({ ...s0, bank: { ...bank, loans: [...bank.loans, loan] } }, amount, 'Business loan disbursement');
  return { ...next, today: { ...next.today, events: [...next.today.events, 'Business loan approved: ' + amount.toLocaleString('en-NG') + ' naira over ' + termWeeks + ' weeks.'] } };
}

export function repayBusinessLoan(s0: GameState, loanId: string, amount: number): GameState {
  const bank = s0.bank || initialBankState();
  const loan = bank.loans.find((item) => item.id === loanId);
  const value = roundMoney(amount);
  if (!loan || !value || value > s0.cash) return s0;
  const paid = Math.min(value, loan.balance);
  const loans = bank.loans.map((item) => item.id === loanId ? { ...item, balance: Math.max(0, item.balance - paid) } : item).filter((item) => item.balance > 0);
  return ledger({ ...s0, bank: { ...bank, loans } }, -paid, 'Early loan repayment');
}

export function processPromotionAtClose(s0: GameState): GameState {
  const p = s0.promotion;
  if (!p?.active) return s0;
  const hours = p.mode === 'period' ? Math.min(12, Math.max(0, p.hoursRemaining || 0)) : 12;
  if (hours <= 0) return { ...s0, promotion: { ...p, active: false } };
  const affordableHours = Math.min(hours, Math.max(0, s0.cash) / Math.max(1, p.hourlyBudget));
  const chargedHours = Math.floor(affordableHours * 100) / 100;
  const cost = roundMoney(chargedHours * p.hourlyBudget);
  let s = cost ? ledger({ ...s0, today: { ...s0.today, costs: s0.today.costs + cost, events: [...s0.today.events, 'Promotion (' + p.level + '): ' + chargedHours + ' business hours, ' + cost.toLocaleString('en-NG') + ' naira.'] } }, -cost, 'Promotion: ' + p.level) : s0;
  const newHours = Math.max(0, (p.hoursRemaining || 0) - chargedHours);
  const reachMultiplier = { local: 1, citywide: 2.5, premium: 5.5, luxury: 10 }[p.level];
  const estimatedReach = Math.round(p.hourlyBudget * chargedHours * reachMultiplier / 15);
  const stillActive = p.mode === 'always' ? chargedHours >= hours : newHours > 0;
  const promotion = {
    ...p, active: stillActive && (p.mode === 'always' || newHours > 0),
    hoursRemaining: p.mode === 'period' ? newHours : undefined,
    hoursRun: p.hoursRun + chargedHours,
    totalSpent: p.totalSpent + cost,
    estimatedReach: p.estimatedReach + estimatedReach,
  };
  s = { ...s, promotion };
  if (chargedHours < hours) {
    s = { ...s, messages: [{ id: (s.msgSeq || 0) + 1, day: s.day, from: 'KoboBank', text: 'Your promotion stopped because the current account could not cover the full hourly budget.', tone: 'warn', t: -1 }, ...(s.messages || [])].slice(0, 160), msgSeq: (s.msgSeq || 0) + 1, promotion: { ...promotion, active: false } };
  }
  return s;
}

export function saveRentAtClose(s0: GameState): GameState {
  const bank = s0.bank || initialBankState();
  if (bank.rentMode !== 'automatic' || bank.autoRentPercent <= 0) return s0;
  const operatingProfit = Math.max(0, s0.today.income - s0.today.costs);
  const requested = roundMoney(operatingProfit * bank.autoRentPercent / 100);
  const amount = Math.min(requested, Math.max(0, s0.cash));
  if (!amount) return s0;
  const result = transferBank(s0, 'rentVault', amount);
  return { ...result, today: { ...result.today, events: [...result.today.events, 'Automatic Rent Vault transfer: ' + amount.toLocaleString('en-NG') + ' naira.'] } };
}

export function processBankWeekly(s0: GameState): GameState {
  let s = s0;
  let bank = s.bank || initialBankState();
  const savingsInterest = roundMoney(bank.savings * bank.savingsRatePct / 100);
  const rentInterest = roundMoney(bank.rentVault * bank.rentVaultRatePct / 100);
  if (savingsInterest || rentInterest) {
    bank = { ...bank, savings: bank.savings + savingsInterest, rentVault: bank.rentVault + rentInterest };
    const entries = [
      ...(savingsInterest ? [{ day: s.day, t: -1, label: 'Savings interest', amount: savingsInterest }] : []),
      ...(rentInterest ? [{ day: s.day, t: -1, label: 'Rent Vault interest', amount: rentInterest }] : []),
    ];
    s = { ...s, bank, ledger: [...entries, ...(s.ledger || [])].slice(0, 150) };
  }
  const maturity = bank.fixedDeposits.filter((deposit) => deposit.maturityDay <= s.day);
  if (maturity.length) {
    const returned = maturity.reduce((sum, deposit) => sum + roundMoney(deposit.amount * (1 + deposit.ratePct / 100)), 0);
    bank = { ...bank, savings: bank.savings + returned, fixedDeposits: bank.fixedDeposits.filter((deposit) => deposit.maturityDay > s.day) };
    s = { ...s, bank, ledger: [{ day: s.day, t: -1, label: 'Fixed deposit maturity + interest', amount: returned }, ...(s.ledger || [])].slice(0, 150) };
  }
  bank = s.bank || bank;
  for (const loan0 of [...bank.loans]) {
    if (loan0.nextPaymentDay > s.day) continue;
    const currentBank = s.bank || bank;
    const loan = currentBank.loans.find((item) => item.id === loan0.id);
    if (!loan) continue;
    const interest = roundMoney(loan.balance * loan.weeklyRatePct / 100);
    const due = Math.min(loan.balance + interest, loan.weeklyPayment);
    if (s.cash >= due) {
      const newBalance = Math.max(0, loan.balance + interest - due);
      const loans = currentBank.loans.map((item) => item.id === loan.id ? { ...item, balance: newBalance, nextPaymentDay: item.nextPaymentDay + 7, missedPayments: 0 } : item).filter((item) => item.balance > 1);
      s = ledger({ ...s, bank: { ...currentBank, loans } }, -due, 'Weekly loan repayment');
      bank = s.bank || currentBank;
    } else {
      const penalty = Math.max(2_500, roundMoney(loan.balance * 0.025));
      const loans = currentBank.loans.map((item) => item.id === loan.id ? { ...item, balance: item.balance + penalty, nextPaymentDay: item.nextPaymentDay + 7, missedPayments: item.missedPayments + 1 } : item);
      s = { ...s, bank: { ...currentBank, loans }, ledger: [{ day: s.day, t: -1, label: 'Missed loan payment fee', amount: 0 }, ...(s.ledger || [])].slice(0, 150) };
      s = { ...s, messages: [{ id: (s.msgSeq || 0) + 1, day: s.day, from: 'KoboBank', text: 'A scheduled loan payment was missed. A penalty was added to the outstanding balance.', tone: 'danger', t: -1 }, ...(s.messages || [])].slice(0, 160), msgSeq: (s.msgSeq || 0) + 1 };
      bank = s.bank || currentBank;
    }
  }
  s = { ...s, bank };
  return s;
}

export function playerWeekTotals(s: GameState): { revenue: number; costs: number; profit: number } {
  const recent = (s.history || []).slice(-7);
  const revenue = recent.reduce((sum, d) => sum + d.income, 0);
  const costs = recent.reduce((sum, d) => sum + d.costs, 0);
  return { revenue, costs, profit: revenue - costs };
}

export function netWorthPlayer(s: GameState): number {
  const bank = s.bank || initialBankState();
  const inventory = (s.stock || []).reduce((sum, d) => sum + Math.max(0, d.cost) * Math.max(0, d.pieces), 0);
  const fixtures = (s.furniture || []).reduce((sum, item) => {
    try { return sum + furnitureById(item.id).price * 0.35; } catch { return sum; }
  }, 0);
  const deposits = bank.fixedDeposits.reduce((sum, deposit) => sum + deposit.amount, 0);
  const debt = bank.loans.reduce((sum, loan) => sum + loan.balance, 0);
  const weekly = playerWeekTotals(s);
  const goodwill = Math.max(0, weekly.profit) * 5 + Math.max(0, s.followers || 0) * 5 +
    brandPower(getBrandMetrics(s), s.followers || 0, s.tier) * 100;
  return Math.round(s.cash + bank.savings + bank.rentVault + deposits + inventory + fixtures + goodwill - debt);
}

export function netWorthRival(r: Rival): number {
  const revenue = (r.week || []).reduce((sum, amount) => sum + amount, 0);
  const costs = (r.weekCosts || []).reduce((sum, amount) => sum + amount, 0);
  const profit = revenue - costs;
  const metrics = r.brand || brandFromLegacy(r.rep, r.followers, r.tier);
  const assets = Number.isFinite(r.assetValue) ? (r.assetValue || 0) : TIER_ASSETS[r.tier] || TIER_ASSETS[0];
  const goodwill = Math.max(0, profit) * 7 + Math.max(0, r.followers || 0) * 5 + brandPower(metrics, r.followers || 0, r.tier) * 100;
  return Math.round(r.cash + Math.max(0, r.savings || 0) + assets + goodwill - Math.max(0, r.debt || 0));
}

export function currentWealthRows(s: GameState): Omit<WeeklyWealthSnapshot, 'day' | 'rank' | 'previousRank' | 'wealthChange'>[] {
  const player = playerWeekTotals(s);
  const playerMetrics = getBrandMetrics(s);
  const rows: Omit<WeeklyWealthSnapshot, 'day' | 'rank' | 'previousRank' | 'wealthChange'>[] = [{
    ownerId: 'you', owner: 'Divine', shop: 'Asanwa Boutique', netWorth: netWorthPlayer(s), revenue: player.revenue, costs: player.costs, profit: player.profit,
    tier: s.tier, followers: s.followers || 0, brandPower: brandPower(playerMetrics, s.followers || 0, s.tier),
  }];
  for (const r of s.rivals || []) {
    const revenue = (r.week || []).reduce((sum, amount) => sum + amount, 0);
    const costs = (r.weekCosts || []).reduce((sum, amount) => sum + amount, 0);
    rows.push({
      ownerId: r.id, owner: r.owner, shop: r.shop, netWorth: netWorthRival(r), revenue, costs, profit: revenue - costs,
      tier: r.tier, followers: r.followers || 0, brandPower: brandPower(r.brand || brandFromLegacy(r.rep, r.followers, r.tier), r.followers || 0, r.tier),
    });
  }
  return rows;
}

export function recordWeeklyWealth(s0: GameState): GameState {
  if (s0.day % 7 !== 0) return s0;
  const current = currentWealthRows(s0).sort((a, b) => b.netWorth - a.netWorth);
  const prior = new Map<string, WeeklyWealthSnapshot>();
  for (const item of [...(s0.wealthHistory || [])].filter((row) => row.day < s0.day)) {
    const previous = prior.get(item.ownerId);
    if (!previous || item.day > previous.day) prior.set(item.ownerId, item);
  }
  const snapshots: WeeklyWealthSnapshot[] = current.map((row, index) => {
    const old = prior.get(row.ownerId);
    return { ...row, day: s0.day, rank: index + 1, previousRank: old?.rank || 0, wealthChange: row.netWorth - (old?.netWorth ?? row.netWorth) };
  });
  return { ...s0, wealthHistory: [...(s0.wealthHistory || []), ...snapshots].slice(-1500) };
}

export function unlocksForFollowers(followers: number): string[] {
  const unlocks: string[] = [];
  if (followers >= 1_000) unlocks.push('Micro-influencer sponsorships');
  if (followers >= 5_000) unlocks.push('Local fashion partnership offers');
  if (followers >= 25_000) unlocks.push('Premium campaign invitations');
  if (followers >= 100_000) unlocks.push('Major designer and celebrity collaborations');
  if (followers >= 500_000) unlocks.push('National brand ambassadorships');
  return unlocks;
}
