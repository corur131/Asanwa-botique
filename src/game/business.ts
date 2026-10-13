import type { BankPocket, BankState, BrandMetrics, BusinessBranch, BusinessExpansionState, BusinessLoan, CreditProfile, DepartmentOperation, ExpansionInvestment, GameState, WholesaleOperation, PromotionCampaign, PromotionLevel, PromotionMode, Rival, WeeklyWealthSnapshot } from './types';
import { TIERS } from './economy';
import { furnitureById } from './shop';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const roundMoney = (value: number) => Math.max(0, Math.round(value));
const TIER_ASSETS = [90_000, 300_000, 1_100_000, 4_500_000, 12_000_000, 45_000_000, 120_000_000];
const PROMOTION_UNLOCK_TIER: Record<PromotionLevel, number> = { local: 0, citywide: 1, premium: 2, luxury: 4 };
const PROMOTION_LEVELS: PromotionLevel[] = ['local', 'citywide', 'premium', 'luxury'];
const PROMOTION_MIN: Record<PromotionLevel, number> = { local: 500, citywide: 2_000, premium: 7_500, luxury: 20_000 };
const PROMOTION_MAX: Record<PromotionLevel, number> = { local: 3_000, citywide: 12_000, premium: 45_000, luxury: 150_000 };
const TIER_BUDGET_CAP = [2_000, 8_000, 30_000, 70_000, 150_000, 350_000, 750_000];

export function initialBusinessExpansion(): BusinessExpansionState {
  return { branches: [], departments: [], departmentOperations: [], wholesaleActive: false, wholesaleOperation: undefined, designerCollections: 0, expansionCredit: 0 };
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
  const bank0 = s.bank || initialBankState();
  // Backfill monetary arrears for older saves that only stored a consecutive missed-payment count.
  const bank = { ...bank0, loans: (bank0.loans || []).map((loan) => ({
    ...loan,
    arrearsBalance: Number.isFinite(loan.arrearsBalance)
      ? Math.max(0, loan.arrearsBalance || 0)
      : Math.max(0, loan.missedPayments || 0) * Math.max(0, loan.weeklyPayment || 0),
  })) };
  const businessExpansion = s.businessExpansion || initialBusinessExpansion();
  const brand = getBrandMetrics(s);
  const rivals = (s.rivals || []).map((r) => {
    const week = (r.week || []).slice(-7);
    const weekCosts = Array.isArray(r.weekCosts) ? r.weekCosts.slice(-7) : Array.from({ length: Math.min(7, week.length) }, (_, i) =>
      Math.round((week[i] || 0) * 0.62 + (TIERS[r.tier]?.running || 1500)));
    return {
      ...r,
      brand: r.brand || brandFromLegacy(r.rep, r.followers || 0, r.tier || 0),
      savings: Number.isFinite(r.savings) ? Math.max(0, r.savings || 0) : 0,
      debt: Number.isFinite(r.debt) ? Math.max(0, r.debt || 0) : 0,
      assetValue: Number.isFinite(r.assetValue) ? Math.max(0, r.assetValue || 0) : TIER_ASSETS[r.tier] || TIER_ASSETS[0],
      weekCosts,
      profitHistory: Array.isArray(r.profitHistory) ? r.profitHistory.slice(-28) : week.map((takings, i) => takings - (weekCosts[i] || 0)),
    };
  });
  const rivalEconomyVersion = Math.max(0, Number(s.rivalEconomyVersion) || 0);
  // Second one-time capital boost for established saves that already received v1.
  // Targets are calibrated to the uploaded Day 31 save: the player holds about ₦594m in liquid accounts.
  // This gives the leading rival ₦475m liquid capital, tier-3 boutiques ₦275m, tier-2 ₦140m,
  // tier-1 ₦65m, and tier-0 shops ₦28m. New games are excluded and the version makes this idempotent.
  if (rivalEconomyVersion < 2 && (s.day > 7 || (s.history || []).length > 0)) {
    const targetLiquidity = [28_000_000, 65_000_000, 140_000_000, 275_000_000, 475_000_000];
    for (const r of rivals) {
      const target = targetLiquidity[clamp(r.tier || 0, 0, 4)];
      const current = Math.max(0, r.cash || 0) + Math.max(0, r.savings || 0);
      const gap = Math.max(0, target - current);
      if (gap > 0) {
        const cashTopUp = Math.round(gap * 0.75);
        r.cash += cashTopUp;
        r.savings = Math.max(0, r.savings || 0) + gap - cashTopUp;
      }
    }
  }
  const inheritedCashDeficit = Math.max(0, -(Number.isFinite(s.cash) ? s.cash : 0));
  return {
    ...s,
    cash: Math.max(0, Number.isFinite(s.cash) ? s.cash : 0),
    operatingPayables: Math.max(0, s.operatingPayables || 0) + inheritedCashDeficit,
    bank, businessExpansion, brand, rivals,
    rivalEconomyVersion: 2,
    wealthHistory: Array.isArray(s.wealthHistory) ? s.wealthHistory : [],
    sponsorshipOffers: Array.isArray(s.sponsorshipOffers) ? s.sponsorshipOffers : [],
  };
}

export function availablePromotionLevels(tier: number): PromotionLevel[] {
  return PROMOTION_LEVELS.filter((level) => PROMOTION_UNLOCK_TIER[level] <= tier);
}
export function promotionBudgetBounds(tier: number, level: PromotionLevel): { min: number; max: number } {
  const max = Math.max(PROMOTION_MIN[level], Math.min(PROMOTION_MAX[level], TIER_BUDGET_CAP[clamp(tier, 0, TIER_BUDGET_CAP.length - 1)]));
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
  s0: GameState, mode: PromotionMode, level: PromotionLevel, hourlyBudget: number, durationHours = 48, target: 'brand' | 'warehouse' = 'brand',
): GameState {
  if (!availablePromotionLevels(s0.tier).includes(level)) return s0;
  if (target === 'warehouse' && !s0.businessExpansion?.wholesaleActive) return s0;
  const bounds = promotionBudgetBounds(s0.tier, level);
  const budget = Math.round(clamp(Number.isFinite(hourlyBudget) ? hourlyBudget : bounds.min, bounds.min, bounds.max) / 500) * 500;
  const hours = Math.round(clamp(Number.isFinite(durationHours) ? durationHours : 48, 8, 168) / 4) * 4;
  const campaign: PromotionCampaign = {
    active: true, mode, level, hourlyBudget: budget, startedDay: s0.day, target,
    hoursRemaining: mode === 'period' ? hours : undefined, hoursRun: 0, totalSpent: 0, estimatedReach: 0,
  };
  return { ...s0, promotion: campaign };
}

export function stopPromotion(s: GameState): GameState {
  return s.promotion?.active ? { ...s, promotion: { ...s.promotion, active: false } } : s;
}

/** Price for the next wholesale stock-and-capacity upgrade; maximum three upgrades. */
export function wholesaleUpgradeQuote(s: GameState): { level: number; nextCapacity: number; cost: number; available: boolean } {
  const expansion = s.businessExpansion || initialBusinessExpansion();
  const operation = expansion.wholesaleOperation;
  const level = Math.max(0, expansion.wholesaleUpgradeLevel || 0);
  const targetUnits = operation?.targetUnits || 320;
  const unitCost = Math.max(1, operation?.unitCost || 1);
  return { level, nextCapacity: targetUnits * 2, cost: roundMoney(750_000 * (level + 1) + targetUnits * unitCost), available: !!expansion.wholesaleActive && !!operation && level < 3 };
}

/** Doubles wholesale inventory capacity and buys the added stock at cost. */
export function upgradeWholesaleInventory(s0: GameState): GameState {
  const expansion = s0.businessExpansion || initialBusinessExpansion();
  const operation = expansion.wholesaleOperation;
  const quote = wholesaleUpgradeQuote(s0);
  if (!quote.available || !operation || s0.cash < quote.cost) return s0;
  const addedUnits = operation.targetUnits;
  const stockCost = addedUnits * operation.unitCost;
  const upgradeFee = quote.cost - stockCost;
  let s = ledger(s0, -quote.cost, 'Wholesale inventory capacity upgrade', 'operating');
  const upgraded = { ...operation, targetUnits: quote.nextCapacity, inventoryUnits: operation.inventoryUnits + addedUnits, inventoryValue: operation.inventoryValue + stockCost };
  s = { ...s, businessExpansion: { ...expansion, wholesaleOperation: upgraded, wholesaleUpgradeLevel: quote.level + 1 },
    today: { ...s.today, costs: s.today.costs + upgradeFee, events: [...s.today.events, 'Wholesale capacity upgraded to ' + quote.nextCapacity + ' units; added stock is recorded as inventory assets.'] } };
  return s;
}

function ledger(s: GameState, amount: number, label: string, category?: 'transfer' | 'operating' | 'financing' | 'interest'): GameState {
  if (!Number.isFinite(amount) || !amount) return s;
  const inheritedDeficit = Math.max(0, -s.cash);
  let cash = Math.max(0, s.cash);
  let operatingPayables = Math.max(0, s.operatingPayables || 0) + inheritedDeficit;
  const t = s.phase === 'shop' ? Math.floor(s.clock) : -1;
  const entries: GameState['ledger'] = [];
  if (amount < 0) {
    const requested = Math.abs(amount);
    const paid = Math.min(cash, requested);
    const shortfall = requested - paid;
    cash -= paid;
    operatingPayables += shortfall;
    entries.push({ day: s.day, t, label, amount: -paid, ...(category ? { category } : {}) });
    if (shortfall > 0) entries.unshift({ day: s.day, t, label: 'Unpaid operating cost: ' + label + ' (' + shortfall.toLocaleString('en-NG') + ' naira)', amount: 0, category: 'operating' });
  } else {
    cash += amount;
    entries.push({ day: s.day, t, label, amount, ...(category ? { category } : {}) });
    // Sales and other operating receipts clear old payables first. Transfers and new loans do not.
    if (category !== 'transfer' && category !== 'financing' && operatingPayables > 0) {
      const settlement = Math.min(cash, operatingPayables);
      if (settlement > 0) {
        cash -= settlement;
        operatingPayables -= settlement;
        entries.unshift({ day: s.day, t, label: 'Operating payables settled', amount: -settlement, category: 'operating' });
      }
    }
  }
  return { ...s, cash, operatingPayables, ledger: [...entries, ...(s.ledger || [])].slice(0, 500) };
}

export function transferBank(s0: GameState, pocket: BankPocket, amount: number, source: 'savings' | 'rentVault' = 'rentVault'): GameState {
  const bank = s0.bank || initialBankState();
  const value = roundMoney(amount);
  if (!Number.isFinite(amount) || amount <= 0 || !value) return s0;
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
  if (!Number.isFinite(amount) || amount <= 0 || !value || value > bank.savings || ![7, 14, 28, 56].includes(durationDays)) return s0;
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
  const arrearsAmount = bank.loans.reduce((sum, loan) => sum + Math.max(0, loan.arrearsBalance || 0), 0);
  const defaults = Math.max(profile.defaults, bank.loans.filter((loan) => loan.defaulted || (loan.missedPayments || 0) >= 3).length);
  return {
    score: profile.score, rating: creditRating(profile.score), onTimePayments: profile.onTimePayments,
    latePayments: profile.latePayments, defaults, loansTaken: profile.loansTaken,
    activeLoans: bank.loans.length, activeDebt, arrears, arrearsAmount,
    standing: bank.loans.some((loan) => loan.collectionsStarted || (loan.missedPayments || 0) >= 5) ? 'Collections' : defaults > 0 ? 'Default recorded' : arrearsAmount > 0 || arrears > 0 ? 'In arrears' : 'Current',
  };
}

export function premiumLoanEligible(s: GameState): boolean {
  const bank = s.bank || initialBankState();
  const profile = creditProfile(s);
  return profile.score >= 750 && profile.onTimePayments >= 3 && netWorthPlayer(s) >= 1_000_000
    && !bank.loans.some((loan) => loan.defaulted || (loan.missedPayments || 0) > 0 || (loan.arrearsBalance || 0) > 0 || loan.collectionsStarted)
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
  if (profile.score < 450 || bank.loans.some((loan) => loan.defaulted || (loan.missedPayments || 0) >= 3 || (loan.arrearsBalance || 0) > 0)) return 0;
  const maxByTier = [300_000, 1_500_000, 6_000_000, 25_000_000, 75_000_000, 250_000_000, 600_000_000][clamp(s.tier, 0, 6)];
  const weeklyRevenue = (s.history || []).slice(-7).reduce((sum, day) => sum + day.income, 0);
  const netWorth = Math.max(0, netWorthPlayer(s));
  const affordabilityLimit = Math.max(100_000, weeklyRevenue * 2 + Math.max(0, s.cash) * 0.25 + netWorth * 0.05);
  const scoreFactor = 0.35 + ((profile.score - 450) / 400) * 0.65;
  const scoreAdjustedTierLimit = maxByTier * clamp(scoreFactor, 0, 1);
  // Round down to the nearest ₦10,000. Rounding to nearest could authorize
  // a loan larger than the affordability/tier limit by up to ₦5,000.
  return Math.floor(Math.max(0, Math.min(scoreAdjustedTierLimit, affordabilityLimit) - activeDebt) / 10_000) * 10_000;
}

export function takeBusinessLoan(s0: GameState, requested: number, termWeeks: number): GameState {
  const amount = roundMoney(requested);
  if (!Number.isFinite(requested) || requested <= 0 || !amount || ![4, 8, 12, 24].includes(termWeeks) || amount > maximumLoan(s0)) return s0;
  const bank = s0.bank || initialBankState();
  const profile = creditProfile(s0);
  const rate = loanRateForScore(profile.score);
  const r = rate / 100;
  const weeklyPayment = Math.round(amount * r * Math.pow(1 + r, termWeeks) / (Math.pow(1 + r, termWeeks) - 1));
  const loan: BusinessLoan = {
    id: 'loan-' + s0.day + '-' + Math.random().toString(36).slice(2, 8),
    principal: amount, balance: amount, weeklyRatePct: rate, weeklyPayment, termWeeks,
    // First instalment is due at the first weekly banking cycle at least seven days after origination.
    nextPaymentDay: Math.ceil((s0.day + 7) / 7) * 7, missedPayments: 0, arrearsBalance: 0,
  };
  const next = ledger({ ...s0, bank: { ...bank, loans: [...bank.loans, loan], creditProfile: { ...profile, score: clamp(profile.score - 3, 300, 850), loansTaken: profile.loansTaken + 1, lastApplicationDay: s0.day } } }, amount, 'Business loan disbursement', 'financing');
  return { ...next, today: { ...next.today, events: [...next.today.events, 'Business loan approved: ' + amount.toLocaleString('en-NG') + ' naira over ' + termWeeks + ' weeks.'] } };
}

export function repayBusinessLoan(s0: GameState, loanId: string, amount: number): GameState {
  const bank = s0.bank || initialBankState();
  const loan = bank.loans.find((item) => item.id === loanId);
  const value = roundMoney(amount);
  if (!Number.isFinite(amount) || amount <= 0 || !loan || !value || value > s0.cash) return s0;
  const paid = Math.min(value, loan.balance);
  const remaining = Math.max(0, loan.balance - paid);
  const remainingArrears = Math.max(0, (loan.arrearsBalance || 0) - paid);
  const loans = bank.loans.map((item) => item.id === loanId ? { ...item, balance: remaining, arrearsBalance: remainingArrears } : item).filter((item) => item.balance > 0);
  const profile = creditProfile(s0);
  const cleared = remaining <= 0;
  const hadDelinquency = (loan.missedPayments || 0) > 0 || (loan.arrearsBalance || 0) > 0;
  const creditProfileNext = cleared ? { ...profile, score: clamp(profile.score + (hadDelinquency ? 3 : 8), 300, 850), onTimePayments: profile.onTimePayments + (hadDelinquency ? 0 : 1) } : profile;
  return ledger({ ...s0, bank: { ...bank, loans, creditProfile: creditProfileNext } }, -paid, cleared ? 'Loan paid off early' : 'Early loan repayment');
}

/** Offer one hardship arrangement: lower weekly payments by extending the term and slightly raising the rate. A prior default remains on record until the loan is cleared. */
export function arrangeBusinessLoanRepayment(s0: GameState, loanId: string): GameState {
  const bank = s0.bank || initialBankState();
  const loan = bank.loans.find((item) => item.id === loanId);
  if (!loan || loan.balance <= 0 || loan.arrangementUsed || ((loan.missedPayments || 0) < 1 && (loan.arrearsBalance || 0) <= 0)) return s0;
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
  const followersGained = p.target === 'warehouse' ? 0 : (estimatedReach > 0 ? Math.max(0, Math.round(estimatedReach * followerRate * (0.75 + Math.random() * 0.5) * (0.8 + brandBefore.loyalty / 250))) : 0);
  const stillActive = p.mode === 'always' ? chargedHours >= hours : newHours > 0;
  const promotion = {
    ...p, active: stillActive && (p.mode === 'always' || newHours > 0),
    hoursRemaining: p.mode === 'period' ? newHours : undefined,
    hoursRun: p.hoursRun + chargedHours,
    totalSpent: p.totalSpent + cost,
    estimatedReach: p.estimatedReach + estimatedReach,
  };
  const warehouseTarget = p.target === 'warehouse';
  s = { ...s, promotion, followers: Math.max(0, (s.followers || 0) + followersGained), brand: { ...brandBefore, awareness: clamp(brandBefore.awareness + (!warehouseTarget && estimatedReach > 0 ? 0.3 : 0), 5, 100), trendInfluence: clamp(brandBefore.trendInfluence + (!warehouseTarget && estimatedReach > 0 ? 0.15 : 0), 5, 100) }, today: { ...s.today, events: [...s.today.events, warehouseTarget ? ('Warehouse promotion reached an estimated ' + estimatedReach.toLocaleString('en-NG') + ' buyers; wholesale order demand is boosted while the campaign remains active.') : ('Promotion reached an estimated ' + estimatedReach.toLocaleString('en-NG') + ' people and added ' + followersGained.toLocaleString('en-NG') + ' followers.')] } };
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
    s = { ...s, bank, ledger: [{ day: s.day, t: -1, label: 'Fixed deposit maturity + interest', amount: returned }, ...(s.ledger || [])].slice(0, 500) };
  }
  return s;
}

export function processBankWeekly(s0: GameState): GameState {
  // The engine runs banking on day 7, 14, 21, etc. Keep the rule inside the
  // function too, so an early or accidental extra call cannot credit another week
  // of savings interest or attempt a scheduled payment ahead of its banking day.
  if (s0.day % 7 !== 0 || s0.bank?.lastProcessedDay === s0.day) return s0;
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
    s = { ...s, bank, ledger: [...entries, ...(s.ledger || [])].slice(0, 500) };
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
      const loans = currentBank.loans.map((item) => item.id === loan.id ? {
        ...item,
        balance: newBalance,
        // This payment satisfies the current scheduled instalment. Do not also
        // clear an older overdue instalment from the memo balance: that would
        // count one payment twice (as both current and overdue).
        arrearsBalance: newBalance <= 1 ? 0 : Math.max(0, item.arrearsBalance || 0),
        nextPaymentDay: item.nextPaymentDay + 7,
        missedPayments: 0,
      } : item).filter((item) => item.balance > 1);
      const profile = currentBank.creditProfile || creditProfile({ ...s, bank: currentBank });
      const hasDelinquency = (loan.missedPayments || 0) > 0 || (loan.arrearsBalance || 0) > 0;
      const creditProfileNext = { ...profile, score: clamp(profile.score + (hasDelinquency ? 2 : 5), 300, 850), onTimePayments: profile.onTimePayments + (hasDelinquency ? 0 : 1) };
      s = ledger({ ...s, bank: { ...currentBank, loans, creditProfile: creditProfileNext }, today: { ...s.today, costs: s.today.costs + interest, events: [...s.today.events, 'Paid ' + interest.toLocaleString('en-NG') + ' naira in business-loan interest.'] } }, -due, 'Weekly loan repayment');
      bank = s.bank || currentBank;
    } else {
      const profile = currentBank.creditProfile || creditProfile({ ...s, bank: currentBank });
      const nextMissed = (loan.missedPayments || 0) + 1;
      const newlyDefaulted = (loan.missedPayments || 0) < 3 && nextMissed >= 3;
      const feeRoom = Math.max(0, roundMoney(loan.principal * 0.1) - Math.max(0, loan.lateFees || 0));
      const penalty = Math.min(feeRoom, Math.max(2_500, roundMoney(loan.balance * 0.025)));
      const formalCollectionsNotice = nextMissed >= 5 && !loan.collectionsNoticeIssued;
      const loans = currentBank.loans.map((item) => item.id === loan.id ? { ...item, balance: item.balance + interest + penalty, arrearsBalance: Math.max(0, item.arrearsBalance || 0) + due, lateFees: Math.max(0, item.lateFees || 0) + penalty, nextPaymentDay: item.nextPaymentDay + 7, missedPayments: nextMissed, defaulted: item.defaulted || nextMissed >= 3, collectionsStarted: item.collectionsStarted || nextMissed >= 5, collectionsNoticeIssued: item.collectionsNoticeIssued || nextMissed >= 5 } : item);
      const scoreLoss = newlyDefaulted ? 65 : 22;
      const creditProfileNext = { ...profile, score: clamp(profile.score - scoreLoss, 300, 850), latePayments: profile.latePayments + 1, defaults: profile.defaults + (newlyDefaulted ? 1 : 0) };
      const missedEntries = [
        ...(penalty ? [{ day: s.day, t: -1, label: 'Missed loan payment fee', amount: -penalty }] : []),
        ...(interest ? [{ day: s.day, t: -1, label: 'Missed loan interest', amount: -interest }] : []),
      ];
      s = { ...s, bank: { ...currentBank, loans, creditProfile: creditProfileNext }, today: { ...s.today, costs: s.today.costs + interest + penalty, events: [...s.today.events, 'A missed loan payment added ' + interest.toLocaleString('en-NG') + ' naira in interest and ' + penalty.toLocaleString('en-NG') + ' naira in late fees.'] }, ledger: [...missedEntries, ...(s.ledger || [])].slice(0, 500) };
      s = { ...s, messages: [{ id: (s.msgSeq || 0) + 1, day: s.day, from: 'KoboBank', text: formalCollectionsNotice ? 'FORMAL COLLECTIONS NOTICE: Your account has reached five consecutive missed payments and has been referred to KoboBank collections. Limited recovery from available business cash may begin, while protecting ₦25,000 for operating needs. Please clear the arrears or use an eligible repayment option.' : (nextMissed >= 3 ? 'Your KoboBank loan is now in DEFAULT. New borrowing is blocked until this loan is cleared. Your credit score has fallen sharply.' : 'A scheduled loan payment was missed. A capped late fee was added and your credit score has fallen.'), tone: 'danger' as const, t: -1 }, ...(s.messages || [])].slice(0, 160), msgSeq: (s.msgSeq || 0) + 1 };
      bank = s.bank || currentBank;
      // Persistent, limited collections begin at five consecutive missed payments.
      // Keep a small operating buffer so the game does not instantly bankrupt the player.
      if (nextMissed >= 5) {
        const availableForCollection = Math.max(0, s.cash - 25_000);
        const currentLoan = (s.bank || bank).loans.find((item) => item.id === loan.id);
        const collection = Math.min(availableForCollection, currentLoan ? currentLoan.balance : 0, Math.max(5_000, roundMoney(((currentLoan?.balance || 0) * 0.03))));
        if (collection > 0 && currentLoan) {
          const afterCollectionLoans = (s.bank || bank).loans.map((item) => item.id === loan.id ? { ...item, balance: Math.max(0, item.balance - collection), arrearsBalance: Math.max(0, (item.arrearsBalance || 0) - collection), collectionsStarted: true } : item).filter((item) => item.balance > 0);
          s = { ...s, cash: s.cash - collection, bank: { ...(s.bank || bank), loans: afterCollectionLoans }, ledger: [{ day: s.day, t: -1, label: 'KoboBank debt recovery', amount: -collection }, ...(s.ledger || [])].slice(0, 500), messages: [{ id: (s.msgSeq || 0) + 1, day: s.day, from: 'KoboBank', text: 'FORMAL COLLECTIONS NOTICE: Your loan has been referred to KoboBank collections after five or more consecutive missed payments. ' + collection.toLocaleString('en-NG') + ' naira was recovered from available business cash; the ₦25,000 operating buffer was protected. Contact the in-game bank options to clear the arrears or request an eligible plan.', tone: 'danger' as const, t: -1 }, ...(s.messages || [])].slice(0, 160), msgSeq: (s.msgSeq || 0) + 1, today: { ...s.today, events: [...s.today.events, 'Debt recovery collected ' + collection.toLocaleString('en-NG') + ' naira while protecting a 25,000 naira operating buffer.'] } };
          bank = s.bank || bank;
        }
      }
    }
  }
  // Persist this banking date so a repeated call on the same day cannot credit
  // savings interest or process scheduled instalments twice.
  s = { ...s, bank: { ...(s.bank || bank), lastProcessedDay: s.day } };
  // Credit recovery is gradual: a cleared/default-free account can rebuild trust over time.
  const finalBank = s.bank || bank;
  const profile = finalBank.creditProfile || creditProfile({ ...s, bank: finalBank });
  const hasOverdueLoan = finalBank.loans.some((loan) => (loan.missedPayments || 0) > 0 || (loan.arrearsBalance || 0) > 0);
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
  cashRequired: number;
  minimumTier: number;
  available: boolean;
  financeable: boolean;
  reason?: string;
}

const EXPANSION_COSTS: Record<ExpansionInvestment, number> = {
  branch: 18_000_000, wholesale: 7_500_000, bridal: 2_500_000,
  accessories: 1_250_000, menswear: 1_800_000, designer: 3_500_000,
};

function effectiveExpansionCost(s: GameState, cost: number): number {
  const credit = Math.max(0, s.businessExpansion?.expansionCredit || 0);
  return Math.max(0, cost - credit);
}

export function expansionOptions(s: GameState): ExpansionOption[] {
  const expansion = s.businessExpansion || initialBusinessExpansion();
  const branchCost = s.tier >= 4 ? EXPANSION_COSTS.branch : 18_000_000;
  const raw: Omit<ExpansionOption, 'cashRequired' | 'available' | 'financeable' | 'reason'>[] = [
    { id: 'branch', title: 'Open a new branch', description: 'Add a second shop with its own customers, stock costs, rent and daily profit or loss.', cost: branchCost, minimumTier: 4 },
    { id: 'wholesale', title: 'Wholesale operations', description: 'Fulfil bulk orders from tracked stock, restock from available cash, and manage stock-outs and fulfilment costs.', cost: EXPANSION_COSTS.wholesale, minimumTier: 3 },
    { id: 'bridal', title: 'Bridal & occasionwear department', description: 'Operate a premium department with its own inventory, daily sales, cost of goods and running costs.', cost: EXPANSION_COSTS.bridal, minimumTier: 2 },
    { id: 'accessories', title: 'Accessories department', description: 'Sell and restock bags, shoes, jewellery and accessories from an independently tracked inventory.', cost: EXPANSION_COSTS.accessories, minimumTier: 1 },
    { id: 'menswear', title: 'Menswear department', description: 'Operate a dedicated menswear inventory with separate sales, restocking and operating performance.', cost: EXPANSION_COSTS.menswear, minimumTier: 2 },
    { id: 'designer', title: 'Launch a designer collection', description: 'Invest in an exclusive collection that boosts trend influence and brand prestige.', cost: EXPANSION_COSTS.designer, minimumTier: 2 },
  ];
  return raw.map((item) => {
    const duplicate = item.id === 'branch' ? expansion.branches.length >= 4
      : item.id === 'wholesale' ? expansion.wholesaleActive
      : item.id === 'designer' ? false
      : expansion.departments.includes(({ bridal: 'Bridal & Occasionwear', accessories: 'Accessories', menswear: 'Menswear' } as Record<string, string>)[item.id] || '');
    const credit = Math.max(0, expansion.expansionCredit || 0);
    const cashRequired = Math.max(0, item.cost - credit);
    const shortfall = Math.max(0, cashRequired - Math.max(0, s.cash));
    const financeable = shortfall > 0 && maximumLoan(s) >= shortfall;
    const eligibleTier = s.tier >= item.minimumTier;
    const available = eligibleTier && !duplicate && (s.cash >= cashRequired || financeable);
    const reason = !eligibleTier ? 'Reach ' + (TIERS[item.minimumTier]?.name || 'the required') + ' tier first'
      : duplicate ? item.id === 'branch' ? 'Maximum of four branches reached' : item.id === 'wholesale' ? 'Already operating wholesale' : 'Department already open'
      : available ? undefined
      : shortfall > 0 ? 'Insufficient cash and KoboBank borrowing capacity for the remaining ' + shortfall.toLocaleString('en-NG') + ' naira'
      : undefined;
    return { ...item, cashRequired, available, financeable: available && financeable, reason };
  });
}

export function financeExpansionPurchase(s0: GameState, investment: ExpansionInvestment): GameState {
  const option = expansionOptions(s0).find((item) => item.id === investment);
  if (!option || !option.available) return s0;
  const shortfall = Math.max(0, option.cashRequired - Math.max(0, s0.cash));
  if (!shortfall) return investInExpansion(s0, investment);
  if (maximumLoan(s0) < shortfall) return s0;
  // The loan is posted through the existing KoboBank ledger and liability system.
  // The proceeds are then spent immediately on the capital asset, preserving net worth.
  const financed = takeBusinessLoan(s0, shortfall, 24);
  if (financed === s0 || (financed.bank?.loans.length || 0) <= (s0.bank?.loans.length || 0)) return s0;
  const invested = investInExpansion(financed, investment);
  if (invested === financed) return s0;
  return {
    ...invested,
    today: { ...invested.today, events: [...invested.today.events, 'KoboBank financed ' + option.title + ' with a ' + shortfall.toLocaleString('en-NG') + ' naira, 24-week business loan. Weekly repayments and interest remain due under the normal loan schedule.'] },
  };
}

function makeDepartmentOperation(name: string, day: number, investmentCost: number): DepartmentOperation {
  const config: Record<string, { units: number; markup: number }> = {
    Accessories: { units: 180, markup: 2.25 },
    'Bridal & Occasionwear': { units: 72, markup: 2.45 },
    Menswear: { units: 120, markup: 2.2 },
  };
  const c = config[name] || { units: 100, markup: 2.1 };
  // Keep unit costs integral and reconcile opening inventory plus fixtures exactly to acquisition cost.
  const inventoryBudget = Math.max(0, investmentCost - 650_000);
  const unitCost = Math.max(1, roundMoney(inventoryBudget / c.units));
  const inventoryValue = unitCost * c.units;
  const assetValue = Math.max(0, investmentCost - inventoryValue);
  return { name, openedDay: day, targetUnits: c.units, inventoryUnits: c.units, inventoryValue, assetValue,
    unitCost, unitPrice: roundMoney(unitCost * c.markup), cumulativeRevenue: 0, cumulativeCosts: 0, daysTrading: 0 };
}

function makeWholesaleOperation(investmentCost: number): WholesaleOperation {
  const targetUnits = 320;
  // Wholesale infrastructure is valued at ₦4,500,000; the remaining setup capital is opening stock.
  const inventoryValue = Math.max(0, investmentCost - 4_500_000);
  const unitCost = Math.max(1, roundMoney(inventoryValue / targetUnits));
  return { targetUnits, inventoryUnits: targetUnits, inventoryValue, unitCost,
    unitPrice: roundMoney(unitCost * 1.85), cumulativeRevenue: 0, cumulativeCosts: 0, ordersFulfilled: 0, ordersMissed: 0 };
}

export function investInExpansion(s0: GameState, investment: ExpansionInvestment): GameState {
  const option = expansionOptions(s0).find((item) => item.id === investment);
  if (!option || !option.available || s0.cash < option.cashRequired) return s0;
  const current = s0.businessExpansion || initialBusinessExpansion();
  const effectiveCost = option.cashRequired;
  const creditUsed = Math.min(Math.max(0, current.expansionCredit || 0), option.cost);
  let expansion: BusinessExpansionState = { ...current, expansionCredit: Math.max(0, (current.expansionCredit || 0) - creditUsed) };
  let brand = getBrandMetrics(s0);
  switch (investment) {
    case 'branch': {
      const index = current.branches.length + 1;
      const areas = ['Lekki Phase 1', 'Ikeja', 'Surulere', 'Victoria Island'];
      const branch: BusinessBranch = {
        id: 'branch-' + s0.day + '-' + index,
        name: 'Asanwa Boutique ' + (index === 1 ? 'Lekki Outlet' : 'Branch ' + index),
        area: areas[current.branches.length % areas.length],
        tier: 2, openedDay: s0.day, weeklyRent: TIERS[2].rent, assetValue: option.cost,
      };
      expansion = { ...expansion, branches: [...current.branches, branch] };
      break;
    }
    case 'wholesale':
      expansion = { ...expansion, wholesaleActive: true, wholesaleOperation: makeWholesaleOperation(option.cost) };
      brand = { ...brand, awareness: clamp(brand.awareness + 2, 5, 100), reliability: clamp(brand.reliability + 1, 5, 100) };
      break;
    case 'bridal': {
      const name = 'Bridal & Occasionwear';
      expansion = { ...expansion, departments: [...current.departments, name], departmentOperations: [...(current.departmentOperations || []), makeDepartmentOperation(name, s0.day, option.cost)] };
      brand = { ...brand, prestige: clamp(brand.prestige + 7, 5, 100), loyalty: clamp(brand.loyalty + 1.5, 5, 100) };
      break;
    }
    case 'accessories': {
      const name = 'Accessories';
      expansion = { ...expansion, departments: [...current.departments, name], departmentOperations: [...(current.departmentOperations || []), makeDepartmentOperation(name, s0.day, option.cost)] };
      brand = { ...brand, awareness: clamp(brand.awareness + 2.5, 5, 100), loyalty: clamp(brand.loyalty + 1.5, 5, 100) };
      break;
    }
    case 'menswear': {
      const name = 'Menswear';
      expansion = { ...expansion, departments: [...current.departments, name], departmentOperations: [...(current.departmentOperations || []), makeDepartmentOperation(name, s0.day, option.cost)] };
      brand = { ...brand, awareness: clamp(brand.awareness + 2, 5, 100), loyalty: clamp(brand.loyalty + 1, 5, 100) };
      break;
    }
    case 'designer':
      expansion = { ...expansion, designerCollections: current.designerCollections + 1 };
      brand = { ...brand, prestige: clamp(brand.prestige + 3.5, 5, 100), trendInfluence: clamp(brand.trendInfluence + 5, 5, 100) };
      break;
  }
  const charged = ledger({ ...s0, businessExpansion: expansion, brand }, -effectiveCost, 'Business expansion: ' + option.title);
  return {
    ...charged,
    today: { ...charged.today, events: [...charged.today.events, option.title + ' funded for ' + effectiveCost.toLocaleString('en-NG') + ' naira. Earned event credit of ' + creditUsed.toLocaleString('en-NG') + ' naira was applied. The investment is recorded as a business asset rather than a daily operating expense.'] },
    gist: [{ id: 'expansion-' + investment + '-' + s0.day, day: s0.day, title: option.title + ' at Asanwa Boutique', body: 'Divine invested ' + effectiveCost.toLocaleString('en-NG') + ' naira in business expansion. The move can improve long-term revenue, but the business must still cover its running costs.', about: 'you', hot: true }, ...(s0.gist || [])].slice(0, 40),
  };
}

/** Run branches, departments and wholesale through one idempotent daily close. */
export function processExpansionAtClose(s0: GameState): GameState {
  const original = s0.businessExpansion || initialBusinessExpansion();
  if (original.lastProcessedDay === s0.day) return s0;
  const expansion: BusinessExpansionState = {
    ...original,
    departmentOperations: [...(original.departmentOperations || original.departments.map((name) => makeDepartmentOperation(name, s0.day, EXPANSION_COSTS[(name === 'Accessories' ? 'accessories' : name === 'Menswear' ? 'menswear' : 'bridal') as ExpansionInvestment])) )],
    wholesaleOperation: original.wholesaleActive ? (original.wholesaleOperation || makeWholesaleOperation(EXPANSION_COSTS.wholesale)) : original.wholesaleOperation,
  };
  if (!expansion.branches.length && !expansion.wholesaleActive && !(expansion.departmentOperations || []).length) {
    return { ...s0, businessExpansion: { ...expansion, lastProcessedDay: s0.day } };
  }
  let s = s0;
  const branches = [...expansion.branches];
  for (let index = 0; index < branches.length; index += 1) {
    const branch = branches[index];
    const tier = clamp(branch.tier, 0, 6);
    const base = [24_000, 75_000, 450_000, 2_000_000, 8_000_000, 20_000_000, 50_000_000][tier];
    const brand = getBrandMetrics(s);
    const audienceLift = Math.min(0.3, Math.log10(Math.max(1, s.followers || 0) + 1) / 35);
    const demand = clamp((brand.awareness / 100) * 0.35 + (brand.loyalty / 100) * 0.25 + audienceLift, 0.3, 1.2);
    const revenue = roundMoney(base * demand * (0.75 + Math.random() * 0.5));
    const stockCost = roundMoney(revenue * 0.5);
    const runningCost = roundMoney(TIERS[tier].running * 0.65);
    const rentCost = s.day % 7 === 0 ? Math.max(0, branch.weeklyRent) : 0;
    const dayCosts = stockCost + runningCost + rentCost;
    s = ledger(s, revenue, branch.name + ' sales');
    s = ledger(s, -(stockCost + runningCost), branch.name + ' stock and running costs', 'operating');
    s = { ...s, today: { ...s.today, income: s.today.income + revenue, costs: s.today.costs + stockCost + runningCost, events: [...s.today.events, branch.name + ' made ' + revenue.toLocaleString('en-NG') + ' naira in sales.'] } };
    if (rentCost > 0) {
      s = ledger(s, -rentCost, branch.name + ' weekly rent', 'operating');
      s = { ...s, today: { ...s.today, costs: s.today.costs + rentCost, events: [...s.today.events, branch.name + ' paid ' + rentCost.toLocaleString('en-NG') + ' naira in weekly rent.'] } };
    }
    branches[index] = { ...branch, cumulativeRevenue: Math.max(0, branch.cumulativeRevenue || 0) + revenue,
      cumulativeCosts: Math.max(0, branch.cumulativeCosts || 0) + dayCosts, daysTrading: Math.max(0, branch.daysTrading || 0) + 1,
      lastDay: s.day, lastDayRevenue: revenue, lastDayCosts: dayCosts, lastDayProfit: revenue - dayCosts };
  }

  const departmentOperations = [...(expansion.departmentOperations || [])].map((originalDepartment) => {
    let d = { ...originalDepartment };
    const brand = getBrandMetrics(s);
    const audience = Math.min(1.35, 0.75 + Math.log10(Math.max(1, s.followers || 0) + 1) / 12 + brand.awareness / 250);
    const demandByDepartment: Record<string, number> = { Accessories: 8, 'Bridal & Occasionwear': 3, Menswear: 5 };
    const unitsDemanded = Math.max(1, Math.round((demandByDepartment[d.name] || 4) * audience * (0.75 + Math.random() * 0.5)));
    const unitsSold = Math.min(Math.max(0, d.inventoryUnits), unitsDemanded);
    const revenue = unitsSold * d.unitPrice;
    const costOfGoods = unitsSold * d.unitCost;
    const runningByDepartment: Record<string, number> = { Accessories: 2_500, 'Bridal & Occasionwear': 4_500, Menswear: 3_000 };
    const runningCost = runningByDepartment[d.name] || 2_500;
    s = ledger(s, revenue, d.name + ' department sales');
    // COGS is recognized when units leave inventory; cash was already paid at restock.
    s = ledger(s, -runningCost, d.name + ' department running costs', 'operating');
    s = { ...s, today: { ...s.today, income: s.today.income + revenue, costs: s.today.costs + costOfGoods + runningCost,
      events: [...s.today.events, d.name + ' sold ' + unitsSold + ' units for ' + revenue.toLocaleString('en-NG') + ' naira' + (unitsSold < unitsDemanded ? '; ' + (unitsDemanded - unitsSold) + ' requested units were unavailable.' : '.') ] } };
    d.inventoryUnits = Math.max(0, d.inventoryUnits - unitsSold);
    d.inventoryValue = Math.max(0, d.inventoryValue - costOfGoods);
    const minimumStock = Math.ceil(d.targetUnits * 0.4);
    if (d.inventoryUnits < minimumStock && s.cash > 0) {
      const requestedUnits = Math.min(d.targetUnits - d.inventoryUnits, d.targetUnits - minimumStock + (minimumStock - d.inventoryUnits));
      const affordableUnits = Math.min(requestedUnits, Math.floor(Math.max(0, s.cash) / Math.max(1, d.unitCost)));
      if (affordableUnits > 0) {
        const purchaseCost = affordableUnits * d.unitCost;
        s = ledger(s, -purchaseCost, d.name + ' inventory restock');
        d.inventoryUnits += affordableUnits;
        d.inventoryValue += purchaseCost;
      }
    }
    d.cumulativeRevenue += revenue;
    d.cumulativeCosts += costOfGoods + runningCost;
    d.daysTrading += 1;
    d.lastDay = s.day; d.lastDayRevenue = revenue; d.lastDayCosts = costOfGoods + runningCost; d.lastDayProfit = revenue - costOfGoods - runningCost;
    return d;
  });

  let wholesaleOperation = expansion.wholesaleOperation;
  if (expansion.wholesaleActive && wholesaleOperation) {
    let w = { ...wholesaleOperation };
    const brand = getBrandMetrics(s);
    const warehouseCampaign = s.promotion?.active && s.promotion.target === 'warehouse' ? s.promotion : null;
    const promotionLift = warehouseCampaign ? ({ local: 1.15, citywide: 1.3, premium: 1.5, luxury: 1.75 }[warehouseCampaign.level]) : 1;
    const budgetLift = warehouseCampaign ? Math.min(0.2, warehouseCampaign.hourlyBudget / 2_000_000) : 0;
    const demand = Math.max(1, Math.round((14 + brand.awareness / 8) * (0.7 + Math.random() * 0.6) * (promotionLift + budgetLift)));
    const fulfilled = Math.min(w.inventoryUnits, demand);
    const revenue = fulfilled * w.unitPrice;
    const costOfGoods = fulfilled * w.unitCost;
    const fulfilment = Math.round(revenue * 0.06);
    const operating = 8_000;
    s = ledger(s, revenue, 'Wholesale customer orders');
    // Wholesale COGS reduces inventory value, not cash a second time; stock purchases post cash at restock.
    s = ledger(s, -fulfilment, 'Wholesale fulfilment', 'operating');
    s = ledger(s, -operating, 'Wholesale operations', 'operating');
    s = { ...s, today: { ...s.today, income: s.today.income + revenue, costs: s.today.costs + costOfGoods + fulfilment + operating,
      events: [...s.today.events, 'Wholesale fulfilled ' + fulfilled + ' of ' + demand + ' units for ' + revenue.toLocaleString('en-NG') + ' naira' + (fulfilled < demand ? '; stock-out prevented ' + (demand - fulfilled) + ' units from shipping.' : '.') ] } };
    w.inventoryUnits = Math.max(0, w.inventoryUnits - fulfilled);
    w.inventoryValue = Math.max(0, w.inventoryValue - costOfGoods);
    if (fulfilled > 0) w.ordersFulfilled += 1;
    if (fulfilled < demand) w.ordersMissed += 1;
    const minimumStock = Math.ceil(w.targetUnits * 0.4);
    if (w.inventoryUnits < minimumStock && s.cash > 0) {
      const requestedUnits = Math.min(w.targetUnits - w.inventoryUnits, Math.max(0, w.targetUnits - minimumStock + (minimumStock - w.inventoryUnits)));
      const affordableUnits = Math.min(requestedUnits, Math.floor(Math.max(0, s.cash) / Math.max(1, w.unitCost)));
      if (affordableUnits > 0) {
        const purchaseCost = affordableUnits * w.unitCost;
        s = ledger(s, -purchaseCost, 'Wholesale inventory restock');
        w.inventoryUnits += affordableUnits;
        w.inventoryValue += purchaseCost;
      }
    }
    w.cumulativeRevenue += revenue;
    w.cumulativeCosts += costOfGoods + fulfilment + operating;
    w.lastDay = s.day; w.lastDayRevenue = revenue; w.lastDayCosts = costOfGoods + fulfilment + operating; w.lastDayProfit = revenue - costOfGoods - fulfilment - operating;
    wholesaleOperation = w;
  }
  return { ...s, businessExpansion: { ...expansion, branches, departmentOperations, wholesaleOperation, lastProcessedDay: s.day } };
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
export function totalLiabilities(s: Pick<GameState, 'bank' | 'lateRent' | 'operatingPayables'>): number {
  const bank = s.bank || initialBankState();
  const loans = bank.loans.reduce((sum, loan) => sum + Math.max(0, loan.balance), 0);
  const rentOwed = Math.max(0, s.lateRent?.amount || 0);
  const operatingPayables = Math.max(0, s.operatingPayables || 0);
  return Math.round(loans + rentOwed + operatingPayables);
}

function sustainableWeeklyProfit(days: { income: number; costs: number }[]): number {
  const recent = days.slice(-28);
  if (!recent.length) return 0;
  const total = recent.reduce((sum, day) => sum + (day.income || 0) - (day.costs || 0), 0);
  return Math.max(0, (total / recent.length) * 7);
}

function sustainableRivalWeeklyProfit(profitHistory: number[]): number {
  const recent = profitHistory.slice(-28);
  if (!recent.length) return 0;
  return Math.max(0, recent.reduce((sum, profit) => sum + profit, 0) / recent.length * 7);
}

export function netWorthPlayer(s: GameState): number {
  const inventory = (s.stock || []).reduce((sum, d) => sum + Math.max(0, d.cost) * Math.max(0, d.pieces), 0);
  const fixtures = (s.furniture || []).reduce((sum, item) => {
    try { return sum + furnitureById(item.id).price * 0.35; } catch { return sum; }
  }, 0);
  const expansion = s.businessExpansion || initialBusinessExpansion();
  const departmentOperations = expansion.departmentOperations || [];
  const departmentInventory = departmentOperations.reduce((sum, department) => sum + Math.max(0, department.inventoryValue || 0), 0);
  const departmentAssets = departmentOperations.reduce((sum, department) => sum + Math.max(0, department.assetValue ?? 650_000), 0);
  const legacyDepartmentAssets = Math.max(0, expansion.departments.length - departmentOperations.length) * 650_000;
  const wholesaleInventory = Math.max(0, expansion.wholesaleOperation?.inventoryValue || 0);
  const expansionAssets = expansion.branches.reduce((sum, branch) => sum + Math.max(0, branch.assetValue), 0) + (expansion.wholesaleActive ? 4_500_000 : 0) + departmentAssets + legacyDepartmentAssets + expansion.designerCollections * EXPANSION_COSTS.designer + departmentInventory + wholesaleInventory + Math.max(0, expansion.expansionCredit || 0);
  const sustainableProfit = sustainableWeeklyProfit(s.history || []);
  const goodwill = sustainableProfit * 3 + Math.max(0, s.followers || 0) * 5 +
    brandPower(getBrandMetrics(s), s.followers || 0, s.tier) * 100;
  return Math.round(financialAssets(s) + inventory + fixtures + expansionAssets + goodwill - totalLiabilities(s));
}

export function netWorthRival(r: Rival): number {
  const profitHistory = Array.isArray(r.profitHistory) && r.profitHistory.length
    ? r.profitHistory
    : (r.week || []).map((amount, index) => amount - ((r.weekCosts || [])[index] || 0));
  const sustainableProfit = sustainableRivalWeeklyProfit(profitHistory);
  const metrics = r.brand || brandFromLegacy(r.rep, r.followers, r.tier);
  const assets = (Number.isFinite(r.assetValue) ? (r.assetValue || 0) : TIER_ASSETS[r.tier] || TIER_ASSETS[0]) + Math.max(0, r.branches || 0) * 3_500_000 + (r.wholesaleActive ? 4_500_000 : 0) + (r.departments || []).length * 650_000;
  const goodwill = sustainableProfit * 3 + Math.max(0, r.followers || 0) * 5 + brandPower(metrics, r.followers || 0, r.tier) * 100;
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
