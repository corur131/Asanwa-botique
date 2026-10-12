import type { BankPocket, BankState, BrandMetrics, BusinessBranch, BusinessExpansionState, BusinessLoan, CreditProfile, ExpansionInvestment, GameState, PromotionCampaign, PromotionLevel, PromotionMode, Rival, WeeklyWealthSnapshot } from './types';
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

export function initialBusinessExpansion(): BusinessExpansionState {
  return { branches: [], departments: [], wholesaleActive: false, designerCollections: 0 };
}

export function initialBankState(): BankState {
  return {
    savings: 0, rentVault: 0, rentMode: 'manual', autoRentPercent: 20,
    savingsRatePct: 0.65, rentVaultRatePct: 0.25, fixedDeposits: [], loans: [],
    creditProfile: { score: 620, onTimePayments: 0, latePayments: 0, defaults: 0, loansTaken: 0, lastApplicationDay: -999 },
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
  const businessExpansion = s.businessExpansion || initialBusinessExpansion();
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
    ...s, bank, businessExpansion, brand, rivals,
    wealthHistory: Array.isArray(s.wealthHistory) ? s.wealthHistory : [],
    sponsorshipOffers: Array.isArray(s.sponsorshipOffers) ? s.sponsorshipOffers : [],
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

function ledger(s: GameState, amount: number, label: string, category?: 'transfer' | 'operating' | 'financing' | 'interest'): GameState {
  if (!amount) return s;
  return {
    ...s,
    cash: s.cash + amount,
    ledger: [{ day: s.day, t: s.phase === 'shop' ? Math.floor(s.clock) : -1, label, amount, ...(category ? { category } : {}) }, ...(s.ledger || [])].slice(0, 150),
  };
}

export function transferBank(s0: GameState, pocket: BankPocket, amount: number, source: 'savings' | 'rentVault' = 'rentVault'): GameState {
  const bank = s0.bank || initialBankState();
  const value = roundMoney(amount);
  if (!value) return s0;
  if (pocket === 'current') {
    const available = source === 'savings' ? bank.savings : bank.rentVault;
    if (available <= 0 || value > available) return s0;
    const nextBank = source === 'savings'
      ? { ...bank, savings: bank.savings - value }
      : { ...bank, rentVault: bank.rentVault - value };
    return ledger({ ...s0, bank: nextBank }, value, 'Transfer from ' + (source === 'savings' ? 'savings' : 'Rent Vault') + ' to current account', 'transfer');
  }
  if (s0.cash < value) return s0;
  const updatedBank = pocket === 'savings'
    ? { ...bank, savings: bank.savings + value }
    : { ...bank, rentVault: bank.rentVault + value };
  return ledger({ ...s0, bank: updatedBank }, -value, pocket === 'savings' ? 'Transfer to savings' : 'Transfer to Rent Vault', 'transfer');
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

export function creditProfile(s: GameState): CreditProfile {
  const bank = s.bank || initialBankState();
  if (bank.creditProfile) return bank.creditProfile;
  // Existing saves receive a fair starter profile, with any known delinquency reflected.
  const missed = bank.loans.reduce((sum, loan) => sum + Math.max(0, loan.missedPayments || 0), 0);
  const defaults = bank.loans.filter((loan) => (loan.missedPayments || 0) >= 3).length;
  return {
    score: clamp(620 - Math.min(180, missed * 18) - defaults * 45, 300, 850),
    onTimePayments: 0, latePayments: missed, defaults,
    loansTaken: bank.loans.length, lastApplicationDay: -999,
  };
}

export function creditRating(score: number): string {
  if (score >= 800) return 'Excellent';
  if (score >= 750) return 'Very good';
  if (score >= 650) return 'Good';
  if (score >= 550) return 'Fair';
  if (score >= 450) return 'Poor';
  return 'Very poor';
}

/** A plain-language credit report for the in-game player. */
export function creditHistoryReport(s: GameState) {
  const bank = s.bank || initialBankState();
  const profile = creditProfile(s);
  const activeDebt = bank.loans.reduce((sum, loan) => sum + Math.max(0, loan.balance), 0);
  const arrears = bank.loans.reduce((sum, loan) => sum + Math.max(0, loan.missedPayments || 0), 0);
  const defaults = Math.max(profile.defaults, bank.loans.filter((loan) => loan.defaulted || (loan.missedPayments || 0) >= 3).length);
  return {
    score: profile.score, rating: creditRating(profile.score), onTimePayments: profile.onTimePayments,
    latePayments: profile.latePayments, defaults, loansTaken: profile.loansTaken,
    activeLoans: bank.loans.length, activeDebt, arrears,
    standing: bank.loans.some((loan) => loan.collectionsStarted || (loan.missedPayments || 0) >= 5) ? 'Collections' : defaults > 0 ? 'Default recorded' : arrears > 0 ? 'In arrears' : 'Current',
  };
}

export function premiumLoanEligible(s: GameState): boolean {
  const bank = s.bank || initialBankState();
  const profile = creditProfile(s);
  return profile.score >= 750 && profile.onTimePayments >= 3 && netWorthPlayer(s) >= 1_000_000
    && !bank.loans.some((loan) => loan.defaulted || (loan.missedPayments || 0) > 0 || loan.collectionsStarted)
    && maximumLoan(s) >= 10_000;
}

/** A preferred-customer growth loan: a small rate discount, with the same affordability safeguards. */
export function takePremiumBusinessLoan(s0: GameState, requested: number, termWeeks: number): GameState {
  if (!premiumLoanEligible(s0)) return s0;
  const beforeIds = new Set((s0.bank || initialBankState()).loans.map((loan) => loan.id));
  const next = takeBusinessLoan(s0, requested, termWeeks);
  if (next === s0) return s0;
  const bank = next.bank || initialBankState();
  const newLoan = bank.loans.find((loan) => !beforeIds.has(loan.id));
  if (!newLoan) return next;
  const rate = Math.max(1.5, Math.round((newLoan.weeklyRatePct - 0.4) * 10) / 10);
  const r = rate / 100;
  const weeklyPayment = Math.round(newLoan.principal * r * Math.pow(1 + r, termWeeks) / (Math.pow(1 + r, termWeeks) - 1));
  const loans = bank.loans.map((loan) => loan.id === newLoan.id ? { ...loan, loanType: 'premium' as const, weeklyRatePct: rate, weeklyPayment } : loan);
  const result = { ...next, bank: { ...bank, loans } };
  return { ...result, messages: [{ id: (result.msgSeq || 0) + 1, day: result.day, from: 'KoboBank', text: 'Preferred-customer growth financing approved at a 0.4 percentage-point weekly-rate discount. Keep all payments on time to retain access to preferred offers.', tone: 'good' as const, t: -1 }, ...(result.messages || [])].slice(0, 160), msgSeq: (result.msgSeq || 0) + 1 };
}

/** One optional renegotiation for a loan that is still current. */
export function renegotiateBusinessLoan(s0: GameState, loanId: string): GameState {
  const bank = s0.bank || initialBankState();
  const loan = bank.loans.find((item) => item.id === loanId);
  if (!loan || loan.balance <= 0 || loan.renegotiationUsed || loan.arrangementUsed || loan.defaulted || loan.collectionsStarted || (loan.missedPayments || 0) > 0) return s0;
  const termWeeks = Math.min(32, loan.termWeeks + 4);
  const rate = Math.min(5, Math.round((loan.weeklyRatePct + 0.3) * 10) / 10);
  const r = rate / 100;
  const weeklyPayment = Math.round(loan.balance * r * Math.pow(1 + r, termWeeks) / (Math.pow(1 + r, termWeeks) - 1));
  const loans = bank.loans.map((item) => item.id === loanId ? { ...item, termWeeks, weeklyRatePct: rate, weeklyPayment, nextPaymentDay: Math.max(item.nextPaymentDay, (Math.floor(s0.day / 7) + 1) * 7), renegotiationUsed: true } : item);
  const next = { ...s0, bank: { ...bank, loans } };
  return { ...next, messages: [{ id: (next.msgSeq || 0) + 1, day: next.day, from: 'KoboBank', text: 'Your one-time loan renegotiation is approved: the term is four weeks longer and the scheduled weekly payment has been recalculated. The weekly rate rose by 0.3 percentage points, so review the total cost before accepting similar offers.', tone: 'warn' as const, t: -1 }, ...(next.messages || [])].slice(0, 160), msgSeq: (next.msgSeq || 0) + 1, today: { ...next.today, events: [...next.today.events, 'KoboBank approved a one-time loan renegotiation.'] } };
}

export function loanRateForScore(score: number): number {
  if (score >= 800) return 2.2;
  if (score >= 750) return 2.5;
  if (score >= 650) return 2.8;
  if (score >= 550) return 3.2;
  if (score >= 450) return 3.8;
  return 4.5;
}

export function maximumLoan(s: GameState): number {
  const profile = creditProfile(s);
  const bank = s.bank || initialBankState();
  const activeDebt = bank.loans.reduce((sum, loan) => sum + Math.max(0, loan.balance), 0);
  // A current default blocks fresh borrowing until the player clears the defaulted loan.
  if (profile.score < 450 || bank.loans.some((loan) => loan.defaulted || (loan.missedPayments || 0) >= 3)) return 0;
  const maxByTier = [300_000, 1_500_000, 6_000_000, 25_000_000, 75_000_000][clamp(s.tier, 0, 4)];
  const weeklyRevenue = (s.history || []).slice(-7).reduce((sum, day) => sum + day.income, 0);
  const netWorth = Math.max(0, netWorthPlayer(s));
  const affordabilityLimit = Math.max(100_000, weeklyRevenue * 2 + Math.max(0, s.cash) * 0.25 + netWorth * 0.05);
  const scoreFactor = 0.35 + ((profile.score - 450) / 400) * 0.65;
  const scoreAdjustedTierLimit = maxByTier * clamp(scoreFactor, 0, 1);
  return Math.round(Math.max(0, Math.min(scoreAdjustedTierLimit, affordabilityLimit) - activeDebt) / 10_000) * 10_000;
}

export function takeBusinessLoan(s0: GameState, requested: number, termWeeks: number): GameState {
  const amount = roundMoney(requested);
  if (!amount || ![4, 8, 12, 24].includes(termWeeks) || amount > maximumLoan(s0)) return s0;
  const bank = s0.bank || initialBankState();
  const profile = creditProfile(s0);
  const rate = loanRateForScore(profile.score);
  const r = rate / 100;
  const weeklyPayment = Math.round(amount * r * Math.pow(1 + r, termWeeks) / (Math.pow(1 + r, termWeeks) - 1));
  const loan: BusinessLoan = {
    id: 'loan-' + s0.day + '-' + Math.random().toString(36).slice(2, 8),
    principal: amount, balance: amount, weeklyRatePct: rate, weeklyPayment, termWeeks,
    nextPaymentDay: (Math.floor(s0.day / 7) + 1) * 7, missedPayments: 0,
  };
  const next = ledger({ ...s0, bank: { ...bank, loans: [...bank.loans, loan], creditProfile: { ...profile, score: clamp(profile.score - 3, 300, 850), loansTaken: profile.loansTaken + 1, lastApplicationDay: s0.day } } }, amount, 'Business loan disbursement');
  return { ...next, today: { ...next.today, events: [...next.today.events, 'Business loan approved: ' + amount.toLocaleString('en-NG') + ' naira over ' + termWeeks + ' weeks.'] } };
}

export function repayBusinessLoan(s0: GameState, loanId: string, amount: number): GameState {
  const bank = s0.bank || initialBankState();
  const loan = bank.loans.find((item) => item.id === loanId);
  const value = roundMoney(amount);
  if (!loan || !value || value > s0.cash) return s0;
  const paid = Math.min(value, loan.balance);
  const remaining = Math.max(0, loan.balance - paid);
  const loans = bank.loans.map((item) => item.id === loanId ? { ...item, balance: remaining } : item).filter((item) => item.balance > 0);
  const profile = creditProfile(s0);
  const cleared = remaining <= 0;
  const creditProfileNext = cleared ? { ...profile, score: clamp(profile.score + (loan.missedPayments ? 3 : 8), 300, 850), onTimePayments: profile.onTimePayments + (loan.missedPayments ? 0 : 1) } : profile;
  return ledger({ ...s0, bank: { ...bank, loans, creditProfile: creditProfileNext } }, -paid, cleared ? 'Loan paid off early' : 'Early loan repayment');
}

/** Offer one hardship arrangement: lower weekly payments by extending the term and slightly raising the rate. A prior default remains on record until the loan is cleared. */
export function arrangeBusinessLoanRepayment(s0: GameState, loanId: string): GameState {
  const bank = s0.bank || initialBankState();
  const loan = bank.loans.find((item) => item.id === loanId);
  if (!loan || loan.balance <= 0 || loan.arrangementUsed || (loan.missedPayments || 0) < 1) return s0;
  const nextRate = Math.min(5, Math.round((loan.weeklyRatePct + 0.5) * 10) / 10);
  const nextTerm = Math.min(loan.termWeeks + 8, 32);
  const nextPayment = Math.max(1, roundMoney(loan.weeklyPayment * 0.75));
  const nextDay = (Math.floor(s0.day / 7) + 1) * 7;
  const loans = bank.loans.map((item) => item.id === loanId ? {
    ...item,
    weeklyRatePct: nextRate,
    termWeeks: nextTerm,
    weeklyPayment: nextPayment,
    nextPaymentDay: Math.max(nextDay, item.nextPaymentDay),
    missedPayments: 0,
    arrangementUsed: true,
    collectionsStarted: item.collectionsStarted || false,
  } : item);
  const next = { ...s0, bank: { ...bank, loans } };
  return { ...next, messages: [{ id: (next.msgSeq || 0) + 1, day: next.day, from: 'KoboBank', text: loan.defaulted ? 'Your hardship repayment arrangement is active. Weekly payments are lower, but the default remains on your credit record and new borrowing stays blocked until the loan is cleared.' : 'Your hardship repayment arrangement is active. Weekly payments are lower and the term is longer; the interest rate has increased slightly. Keep every new payment on time.', tone: 'warn' as const, t: -1 }, ...(next.messages || [])].slice(0, 160), msgSeq: (next.msgSeq || 0) + 1, today: { ...next.today, events: [...next.today.events, 'KoboBank approved a one-time hardship repayment arrangement.'] } };
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
  const followerRate = { local: 0.0007, citywide: 0.0011, premium: 0.0016, luxury: 0.002 }[p.level];
  const brandBefore = getBrandMetrics(s);
  const followersGained = estimatedReach > 0 ? Math.max(0, Math.round(estimatedReach * followerRate * (0.75 + Math.random() * 0.5) * (0.8 + brandBefore.loyalty / 250))) : 0;
  const stillActive = p.mode === 'always' ? chargedHours >= hours : newHours > 0;
  const promotion = {
    ...p, active: stillActive && (p.mode === 'always' || newHours > 0),
    hoursRemaining: p.mode === 'period' ? newHours : undefined,
    hoursRun: p.hoursRun + chargedHours,
    totalSpent: p.totalSpent + cost,
    estimatedReach: p.estimatedReach + estimatedReach,
  };
  s = { ...s, promotion, followers: Math.max(0, (s.followers || 0) + followersGained), brand: { ...brandBefore, awareness: clamp(brandBefore.awareness + (estimatedReach > 0 ? 0.3 : 0), 5, 100), trendInfluence: clamp(brandBefore.trendInfluence + (estimatedReach > 0 ? 0.15 : 0), 5, 100) }, today: { ...s.today, events: [...s.today.events, 'Promotion reached an estimated ' + estimatedReach.toLocaleString('en-NG') + ' people and added ' + followersGained.toLocaleString('en-NG') + ' followers.'] } };
  if (chargedHours < hours) {
    s = { ...s, messages: [{ id: (s.msgSeq || 0) + 1, day: s.day, from: 'KoboBank', text: 'Your promotion stopped because the current account could not cover the full hourly budget.', tone: 'warn' as const, t: -1 }, ...(s.messages || [])].slice(0, 160), msgSeq: (s.msgSeq || 0) + 1, promotion: { ...promotion, active: false } };
  }
  return s;
}

export function saveRentAtClose(s0: GameState): GameState {
  const bank = s0.bank || initialBankState();
  if (bank.rentMode !== 'automatic' || bank.autoRentPercent <= 0) return s0;
  // Rent has not been charged to today's costs yet; save a percentage of
  // positive earnings after today's operating costs, without deducting rent twice.
  const operatingProfit = Math.max(0, s0.today.income - s0.today.costs);
  const requested = roundMoney(operatingProfit * bank.autoRentPercent / 100);
  const amount = Math.min(requested, Math.max(0, s0.cash));
  if (!amount) return s0;
  const result = transferBank(s0, 'rentVault', amount);
  return { ...result, today: { ...result.today, events: [...result.today.events, 'Automatic Rent Vault transfer: ' + amount.toLocaleString('en-NG') + ' naira.'] } };
}

/** Release matured fixed deposits on their exact in-game maturity day. Safe to call daily. */
export function processFixedDepositMaturities(s0: GameState): GameState {
  let s = s0;
  let bank = s.bank || initialBankState();
  const maturity = bank.fixedDeposits.filter((deposit) => deposit.maturityDay <= s.day);
  if (maturity.length) {
    const returned = maturity.reduce((sum, deposit) => sum + roundMoney(deposit.amount * (1 + deposit.ratePct / 100)), 0);
    bank = { ...bank, savings: bank.savings + returned, fixedDeposits: bank.fixedDeposits.filter((deposit) => deposit.maturityDay > s.day) };
    s = { ...s, bank, ledger: [{ day: s.day, t: -1, label: 'Fixed deposit maturity + interest', amount: returned }, ...(s.ledger || [])].slice(0, 150) };
  }
  return s;
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
      const profile = currentBank.creditProfile || creditProfile({ ...s, bank: currentBank });
      const creditProfileNext = { ...profile, score: clamp(profile.score + (loan.missedPayments ? 2 : 5), 300, 850), onTimePayments: profile.onTimePayments + 1 };
      s = ledger({ ...s, bank: { ...currentBank, loans, creditProfile: creditProfileNext }, today: { ...s.today, costs: s.today.costs + interest, events: [...s.today.events, 'Paid ' + interest.toLocaleString('en-NG') + ' naira in business-loan interest.'] } }, -due, 'Weekly loan repayment');
      bank = s.bank || currentBank;
    } else {
      const profile = currentBank.creditProfile || creditProfile({ ...s, bank: currentBank });
      const nextMissed = (loan.missedPayments || 0) + 1;
      const newlyDefaulted = (loan.missedPayments || 0) < 3 && nextMissed >= 3;
      const feeRoom = Math.max(0, roundMoney(loan.principal * 0.1) - Math.max(0, loan.lateFees || 0));
      const penalty = Math.min(feeRoom, Math.max(2_500, roundMoney(loan.balance * 0.025)));
      const formalCollectionsNotice = nextMissed >= 5 && !loan.collectionsNoticeIssued;
      const loans = currentBank.loans.map((item) => item.id === loan.id ? { ...item, balance: item.balance + penalty, lateFees: Math.max(0, item.lateFees || 0) + penalty, nextPaymentDay: item.nextPaymentDay + 7, missedPayments: nextMissed, defaulted: item.defaulted || nextMissed >= 3, collectionsStarted: item.collectionsStarted || nextMissed >= 5, collectionsNoticeIssued: item.collectionsNoticeIssued || nextMissed >= 5 } : item);
      const scoreLoss = newlyDefaulted ? 65 : 22;
      const creditProfileNext = { ...profile, score: clamp(profile.score - scoreLoss, 300, 850), latePayments: profile.latePayments + 1, defaults: profile.defaults + (newlyDefaulted ? 1 : 0) };
      s = { ...s, bank: { ...currentBank, loans, creditProfile: creditProfileNext }, today: { ...s.today, costs: s.today.costs + penalty, events: [...s.today.events, 'A missed loan payment added ' + penalty.toLocaleString('en-NG') + ' naira to the loan balance.'] }, ledger: [{ day: s.day, t: -1, label: 'Missed loan payment fee', amount: -penalty }, ...(s.ledger || [])].slice(0, 150) };
      s = { ...s, messages: [{ id: (s.msgSeq || 0) + 1, day: s.day, from: 'KoboBank', text: formalCollectionsNotice ? 'FORMAL COLLECTIONS NOTICE: Your account has reached five consecutive missed payments and has been referred to KoboBank collections. Limited recovery from available business cash may begin, while protecting ₦25,000 for operating needs. Please clear the arrears or use an eligible repayment option.' : (nextMissed >= 3 ? 'Your KoboBank loan is now in DEFAULT. New borrowing is blocked until this loan is cleared. Your credit score has fallen sharply.' : 'A scheduled loan payment was missed. A capped late fee was added and your credit score has fallen.'), tone: 'danger' as const, t: -1 }, ...(s.messages || [])].slice(0, 160), msgSeq: (s.msgSeq || 0) + 1 };
      bank = s.bank || currentBank;
      // Persistent, limited collections begin at five consecutive missed payments.
      // Keep a small operating buffer so the game does not instantly bankrupt the player.
      if (nextMissed >= 5) {
        const availableForCollection = Math.max(0, s.cash - 25_000);
        const currentLoan = (s.bank || bank).loans.find((item) => item.id === loan.id);
        const collection = Math.min(availableForCollection, currentLoan ? currentLoan.balance : 0, Math.max(5_000, roundMoney(((currentLoan?.balance || 0) * 0.03))));
        if (collection > 0 && currentLoan) {
          const afterCollectionLoans = (s.bank || bank).loans.map((item) => item.id === loan.id ? { ...item, balance: Math.max(0, item.balance - collection), collectionsStarted: true } : item).filter((item) => item.balance > 0);
          s = { ...s, cash: s.cash - collection, bank: { ...(s.bank || bank), loans: afterCollectionLoans }, ledger: [{ day: s.day, t: -1, label: 'KoboBank debt recovery', amount: -collection }, ...(s.ledger || [])].slice(0, 150), messages: [{ id: (s.msgSeq || 0) + 1, day: s.day, from: 'KoboBank', text: 'FORMAL COLLECTIONS NOTICE: Your loan has been referred to KoboBank collections after five or more consecutive missed payments. ' + collection.toLocaleString('en-NG') + ' naira was recovered from available business cash; the ₦25,000 operating buffer was protected. Contact the in-game bank options to clear the arrears or request an eligible plan.', tone: 'danger' as const, t: -1 }, ...(s.messages || [])].slice(0, 160), msgSeq: (s.msgSeq || 0) + 1, today: { ...s.today, events: [...s.today.events, 'Debt recovery collected ' + collection.toLocaleString('en-NG') + ' naira while protecting a 25,000 naira operating buffer.'] } };
          bank = s.bank || bank;
        }
      }
    }
  }
  s = { ...s, bank };
  // Credit recovery is gradual: a cleared/default-free account can rebuild trust over time.
  const finalBank = s.bank || bank;
  const profile = finalBank.creditProfile || creditProfile({ ...s, bank: finalBank });
  const hasOverdueLoan = finalBank.loans.some((loan) => (loan.missedPayments || 0) > 0);
  if (!hasOverdueLoan && profile.score < 620) {
    // A quiet, fully current account can recover from past mistakes, but inactivity alone
    // should not inflate an already healthy score.
    const recovery = finalBank.loans.length ? 1 : 2;
    s = { ...s, bank: { ...finalBank, creditProfile: { ...profile, score: clamp(profile.score + recovery, 300, 620) } } };
  }
  return s;
}

export interface ExpansionOption {
  id: ExpansionInvestment;
  title: string;
  description: string;
  cost: number;
  minimumTier: number;
  available: boolean;
  reason?: string;
}

export function expansionOptions(s: GameState): ExpansionOption[] {
  const expansion = s.businessExpansion || initialBusinessExpansion();
  const branchCost = [0, 0, 0, 0, 18_000_000][Math.max(0, Math.min(4, s.tier))] || 18_000_000;
  const options: ExpansionOption[] = [
    { id: 'branch', title: 'Open a new branch', description: 'Add a second shop with its own customers, stock costs, rent and daily profit or loss.', cost: branchCost, minimumTier: 4, available: s.tier >= 4 && expansion.branches.length < 4 && s.cash >= branchCost, reason: s.tier < 4 ? 'Reach Flagship tier first' : expansion.branches.length >= 4 ? 'Maximum of four branches reached' : s.cash < branchCost ? 'Not enough current-account cash' : undefined },
    { id: 'wholesale', title: 'Wholesale operations', description: 'Sell in bulk to other boutiques. More revenue potential, but higher stock costs and cash-flow pressure.', cost: 7_500_000, minimumTier: 3, available: s.tier >= 3 && !expansion.wholesaleActive && s.cash >= 7_500_000, reason: s.tier < 3 ? 'Reach Big Boutique tier first' : expansion.wholesaleActive ? 'Already operating wholesale' : s.cash < 7_500_000 ? 'Not enough current-account cash' : undefined },
    { id: 'bridal', title: 'Bridal & occasionwear department', description: 'Add a dedicated premium department that increases prestige and high-value demand.', cost: 2_500_000, minimumTier: 2, available: s.tier >= 2 && !expansion.departments.includes('Bridal & Occasionwear') && s.cash >= 2_500_000, reason: s.tier < 2 ? 'Reach Boutique tier first' : expansion.departments.includes('Bridal & Occasionwear') ? 'Department already open' : s.cash < 2_500_000 ? 'Not enough current-account cash' : undefined },
    { id: 'accessories', title: 'Accessories department', description: 'Add bags, shoes, jewellery and accessories to create more complete looks and extra sales.', cost: 1_250_000, minimumTier: 1, available: s.tier >= 1 && !expansion.departments.includes('Accessories') && s.cash >= 1_250_000, reason: s.tier < 1 ? 'Reach Small Shop tier first' : expansion.departments.includes('Accessories') ? 'Department already open' : s.cash < 1_250_000 ? 'Not enough current-account cash' : undefined },
    { id: 'menswear', title: 'Menswear department', description: 'Introduce a dedicated menswear range to diversify customers and sales.', cost: 1_800_000, minimumTier: 2, available: s.tier >= 2 && !expansion.departments.includes('Menswear') && s.cash >= 1_800_000, reason: s.tier < 2 ? 'Reach Boutique tier first' : expansion.departments.includes('Menswear') ? 'Department already open' : s.cash < 1_800_000 ? 'Not enough current-account cash' : undefined },
    { id: 'designer', title: 'Launch a designer collection', description: 'Invest in an exclusive collection that boosts trend influence and brand prestige.', cost: 3_500_000, minimumTier: 2, available: s.tier >= 2 && s.cash >= 3_500_000, reason: s.tier < 2 ? 'Reach Boutique tier first' : s.cash < 3_500_000 ? 'Not enough current-account cash' : undefined },
  ];
  return options;
}

export function investInExpansion(s0: GameState, investment: ExpansionInvestment): GameState {
  const option = expansionOptions(s0).find((item) => item.id === investment);
  if (!option || !option.available) return s0;
  const current = s0.businessExpansion || initialBusinessExpansion();
  let expansion: BusinessExpansionState = current;
  let brand = getBrandMetrics(s0);
  switch (investment) {
    case 'branch': {
      const index = current.branches.length + 1;
      const areas = ['Lekki Phase 1', 'Ikeja', 'Surulere', 'Victoria Island'];
      const branch: BusinessBranch = {
        id: 'branch-' + s0.day + '-' + index,
        name: 'Asanwa Boutique ' + (index === 1 ? 'Lekki Outlet' : 'Branch ' + (index + 1)),
        area: areas[current.branches.length % areas.length],
        tier: 2,
        openedDay: s0.day,
        weeklyRent: 330_000,
        assetValue: 2_200_000,
      };
      expansion = { ...current, branches: [...current.branches, branch] };
      break;
    }
    case 'wholesale':
      expansion = { ...current, wholesaleActive: true };
      brand = { ...brand, awareness: clamp(brand.awareness + 2, 5, 100), reliability: clamp(brand.reliability + 1, 5, 100) };
      break;
    case 'bridal':
      expansion = { ...current, departments: [...current.departments, 'Bridal & Occasionwear'] };
      brand = { ...brand, prestige: clamp(brand.prestige + 7, 5, 100), loyalty: clamp(brand.loyalty + 1.5, 5, 100) };
      break;
    case 'accessories':
      expansion = { ...current, departments: [...current.departments, 'Accessories'] };
      brand = { ...brand, awareness: clamp(brand.awareness + 2.5, 5, 100), loyalty: clamp(brand.loyalty + 1.5, 5, 100) };
      break;
    case 'menswear':
      expansion = { ...current, departments: [...current.departments, 'Menswear'] };
      brand = { ...brand, awareness: clamp(brand.awareness + 2, 5, 100), loyalty: clamp(brand.loyalty + 1, 5, 100) };
      break;
    case 'designer':
      expansion = { ...current, designerCollections: current.designerCollections + 1 };
      brand = { ...brand, prestige: clamp(brand.prestige + 3.5, 5, 100), trendInfluence: clamp(brand.trendInfluence + 5, 5, 100) };
      break;
  }
  const charged = ledger({ ...s0, businessExpansion: expansion, brand }, -option.cost, 'Business expansion: ' + option.title);
  return {
    ...charged,
    today: { ...charged.today, events: [...charged.today.events, option.title + ' funded for ' + option.cost.toLocaleString('en-NG') + ' naira. The investment is recorded as a business asset rather than a daily operating expense.'] },
    gist: [{ id: 'expansion-' + investment + '-' + s0.day, day: s0.day, title: option.title + ' at Asanwa Boutique', body: 'Divine invested ' + option.cost.toLocaleString('en-NG') + ' naira in business expansion. The move can improve long-term revenue, but the business must still cover its running costs.', about: 'you', hot: true }, ...(s0.gist || [])].slice(0, 40),
  };
}

/** Run branch stores through the same simulated day as the main shop. */
export function processExpansionAtClose(s0: GameState): GameState {
  const expansion = s0.businessExpansion || initialBusinessExpansion();
  if (!expansion.branches.length && !expansion.wholesaleActive) return s0;
  let s = s0;
  for (const branch of expansion.branches) {
    const tier = clamp(branch.tier, 0, 4);
    const base = [24_000, 75_000, 165_000, 340_000, 600_000][tier];
    const brand = getBrandMetrics(s);
    const audienceLift = Math.min(0.3, Math.log10(Math.max(1, s.followers || 0) + 1) / 35);
    const demand = clamp((brand.awareness / 100) * 0.35 + (brand.loyalty / 100) * 0.25 + audienceLift, 0.3, 1.2);
    const revenue = roundMoney(base * demand * (0.75 + Math.random() * 0.5));
    const stockCost = roundMoney(revenue * 0.5);
    const runningCost = roundMoney(TIERS[tier].running * 0.65);
    s = ledger(s, revenue, branch.name + ' sales');
    s = ledger(s, -(stockCost + runningCost), branch.name + ' stock and running costs');
    s = {
      ...s,
      today: { ...s.today, income: s.today.income + revenue, costs: s.today.costs + stockCost + runningCost, events: [...s.today.events, branch.name + ' made ' + revenue.toLocaleString('en-NG') + ' naira in sales.'] },
    };
    if (s.day % 7 === 0) {
      s = ledger(s, -branch.weeklyRent, branch.name + ' weekly rent');
      s = { ...s, today: { ...s.today, costs: s.today.costs + branch.weeklyRent, events: [...s.today.events, branch.name + ' paid ' + branch.weeklyRent.toLocaleString('en-NG') + ' naira in weekly rent.'] } };
    }
  }
  if (expansion.wholesaleActive) {
    const brand = getBrandMetrics(s);
    const revenue = roundMoney(85_000 * (0.7 + brand.awareness / 160) * (0.8 + Math.random() * 0.4));
    const cost = roundMoney(revenue * 0.72);
    s = ledger(s, revenue, 'Wholesale orders');
    s = ledger(s, -cost, 'Wholesale stock and fulfilment');
    s = { ...s, today: { ...s.today, income: s.today.income + revenue, costs: s.today.costs + cost, events: [...s.today.events, 'Wholesale orders recorded ' + revenue.toLocaleString('en-NG') + ' naira in sales.'] } };
  }
  return s;
}

export function playerWeekTotals(s: GameState): { revenue: number; costs: number; profit: number } {
  const recent = (s.history || []).slice(-7);
  const revenue = recent.reduce((sum, d) => sum + d.income, 0);
  const costs = recent.reduce((sum, d) => sum + d.costs, 0);
  return { revenue, costs, profit: revenue - costs };
}

/** Money held in current, savings, Rent Vault and fixed-deposit accounts. */
export function financialAssets(s: Pick<GameState, 'cash' | 'bank'>): number {
  const bank = s.bank || initialBankState();
  const fixedDeposits = bank.fixedDeposits.reduce((sum, deposit) => sum + Math.max(0, deposit.amount), 0);
  return Math.round(s.cash + Math.max(0, bank.savings) + Math.max(0, bank.rentVault) + fixedDeposits);
}

/** Recorded liabilities: outstanding bank loans and any unpaid rent. */
export function totalLiabilities(s: Pick<GameState, 'bank' | 'lateRent'>): number {
  const bank = s.bank || initialBankState();
  const loans = bank.loans.reduce((sum, loan) => sum + Math.max(0, loan.balance), 0);
  const rentOwed = Math.max(0, s.lateRent?.amount || 0);
  return Math.round(loans + rentOwed);
}

export function netWorthPlayer(s: GameState): number {
  const inventory = (s.stock || []).reduce((sum, d) => sum + Math.max(0, d.cost) * Math.max(0, d.pieces), 0);
  const fixtures = (s.furniture || []).reduce((sum, item) => {
    try { return sum + furnitureById(item.id).price * 0.35; } catch { return sum; }
  }, 0);
  const expansion = s.businessExpansion || initialBusinessExpansion();
  const expansionAssets = expansion.branches.reduce((sum, branch) => sum + Math.max(0, branch.assetValue), 0) + (expansion.wholesaleActive ? 4_500_000 : 0) + expansion.departments.length * 650_000 + expansion.designerCollections * 1_250_000;
  const weekly = playerWeekTotals(s);
  const goodwill = Math.max(0, weekly.profit) * 5 + Math.max(0, s.followers || 0) * 5 +
    brandPower(getBrandMetrics(s), s.followers || 0, s.tier) * 100;
  return Math.round(financialAssets(s) + inventory + fixtures + expansionAssets + goodwill - totalLiabilities(s));
}

export function netWorthRival(r: Rival): number {
  const revenue = (r.week || []).reduce((sum, amount) => sum + amount, 0);
  const costs = (r.weekCosts || []).reduce((sum, amount) => sum + amount, 0);
  const profit = revenue - costs;
  const metrics = r.brand || brandFromLegacy(r.rep, r.followers, r.tier);
  const assets = (Number.isFinite(r.assetValue) ? (r.assetValue || 0) : TIER_ASSETS[r.tier] || TIER_ASSETS[0]) + Math.max(0, r.branches || 0) * 3_500_000 + (r.wholesaleActive ? 4_500_000 : 0) + (r.departments || []).length * 650_000;
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

export function closeBrandDay(s0: GameState): GameState {
  const old = getBrandMetrics(s0);
  const followerLift = Math.min(1.2, Math.log10(Math.max(1, s0.followers || 0) + 1) / 8);
  const campaignLift = s0.promotion?.active ? ({ local: 0.4, citywide: 0.7, premium: 1.1, luxury: 1.6 }[s0.promotion.level]) : 0;
  const best = s0.today?.bestScore || 0;
  const served = s0.today?.served || 0;
  const lost = (s0.today?.lost || 0) + (s0.today?.walkedOut || 0);
  const customerSignal = served - lost * 0.55;
  const brand: BrandMetrics = {
    awareness: clamp(old.awareness + 0.05 + followerLift * 0.12 + campaignLift + (s0.posts || []).filter((p) => p.day === s0.day).length * 0.35, 5, 100),
    prestige: clamp(old.prestige + (best - 65) * 0.018 + (s0.tier >= 3 ? 0.12 : 0) - (best > 0 && best < 50 ? 0.3 : 0), 5, 100),
    trendInfluence: clamp(old.trendInfluence + (s0.posts || []).filter((p) => p.day === s0.day).length * 0.7 + campaignLift * 0.4 - 0.12, 5, 100),
    loyalty: clamp(old.loyalty + (best >= 82 ? 0.35 : best > 0 && best < 58 ? -0.45 : 0) + clamp(customerSignal / 18, -0.35, 0.4), 5, 100),
    reliability: clamp(old.reliability + (lost === 0 && served > 0 ? 0.15 : lost > served ? -0.25 : 0), 5, 100),
  };
  return { ...s0, brand };
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
