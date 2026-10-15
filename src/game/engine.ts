import { CharacterConfig } from '../types/character';
import { generateRandomCustomer } from '../utils/randomizer';
import { DIVINE_CAPACITY, HOUR_WEIGHTS, PATIENCE, SHOP_MINUTES, staffMinutes, NEW_SHOP_RAMP_DAYS, NEW_SHOP_START, SERVICE_FEE, SLOW_WEEK_CHANCE, STAFF, STAFF_CAPACITY, START_CASH, SUPPLIES_SHARE, MARKUP, TIERS, FABRIC_COST, CELEBRITY_FULFILMENT_RATE, naira, SHOPPER_COMMISSION_MIN, SHOPPER_COMMISSION_RATE } from './economy';
import { canBuy, entryFor, HAIR_SWATCHES, isClothing, makeDesign, pieceCost, productKey, MARKET } from './market';
import { FabricId } from '../types/character';
import { announceCelebrityVisit, answerRival, competition, initRivals, poacher, reactToMove, simulateRivals } from './rivals';
import { answerInvite, contestFor, contestModel, dropStep, judge, planDrop, planEvents, planTips, visitStep, wonListing } from './encounters';
import { POWER as POWER_CFG, activeGeneratorUid, addShout, coolRunning, drainRate, fuelOf, fuelPrice, liveStats, nepaOff, outageAt, planOutages, pourFuel, powerStep, scarcity, source, tankSize } from './power';
import { answerConvo, startGist } from './convos';
import { ENERGY, busyNow, divineBonus, energyOf, energyStep, exhausted, payBills, spendEnergy } from './life';
import { makeCustomer, makeCelebrityCustomer, celebrityIsScheduled, celebrityDiscoveryChance, celebrityVisitFollowThroughChance, affluentCustomerShareShift, visibilityDiscoveryChance, maximumCelebrityTierForShop, chooseCelebrityTierForShop, maximumCelebrityVisitsPerDay, sanitizeSavedCelebrityNameCollisions } from './customers';
import { buildLook, hairGroup, lookCost, scoreLook } from './scoring';
import { FABRIC_COLORS, FEMALE_HAIR, MAKEUP_LOOKS } from '../constants/catalog';
import { colourName, sameColour } from './colours';
import { FURNITURE, KIOSK_LISTING, Listing, Placed, STARTER_FURNITURE, arrangeShop, autoPlace, prepareFurnitureForMove,
  findSpot, canPlace, turn, Rot, ceilingCapacity, ceilingUsed, yardCapacity, yardUsed, wallFits, solarRackCapacity, solarUsed, outdoorRoomFor, cheapestListing, furnitureById, listingsFor, newUid, prestigeRichShift, prestigeTraffic, shopStats, usesFloor, wallCapacity, wallUsed, MoveEquipmentPlan } from './shop';
import { CharacterMemory, CollaborationEvent, CollaborationReply, Customer, DayLog, Departure, Design, ReplyChoice, GameState, LedgerLine, Message, PoliticianContract, PoliticianContractRequirement, Regular, ScoreBreakdown, Settlement, SponsorshipOffer, StaffMember, StaffProfession, StyleChoice, Visitor } from './types';
import { addBrag, blogPost, closeGramDay } from './gram';
import { SeasonId, festive, seasonOf, weatherFor } from './climate';
import { autoSaveAtClose, closeBrandDay, ensureBusinessState, getBrandMetrics, initialBankState, investmentValue, processBankWeekly, processFixedDepositMaturities, processInvestments, processPromotionAtClose, processExpansionAtClose, promotionTrafficBoost, recordWeeklyWealth, saveRentAtClose } from './business';

export { brandPower, currentWealthRows, financialAssets, getBrandMetrics, creditProfile, creditRating, creditHistoryReport, premiumLoanEligible, takePremiumBusinessLoan, renegotiateBusinessLoan, loanRateForScore, maximumLoan, netWorthPlayer, netWorthRival, playerWeekTotals, totalLiabilities, unlocksForFollowers, availablePromotionLevels, promotionBudgetBounds, promotionTrafficBoost, startPromotion, stopPromotion, wholesaleUpgradeQuote, upgradeWholesaleInventory, transferBank, setRentSaving, setSavingsGoal, createFixedDeposit, breakFixedDeposit, fixedDepositRate, FIXED_DEPOSIT_TERMS, buyTreasuryBill, treasuryBillYield, TBILL_TENORS, buyBond, sellBond, bondCoupon, BOND_TERMS, MIN_INVESTMENT, bankMarket, investmentValue, setAutoSave, loanPayoffQuote, loanInterestToDate, LOAN_PROCESSING_FEE_RATE, takeBusinessLoan, repayBusinessLoan, arrangeBusinessLoanRepayment, expansionOptions, investInExpansion, financeExpansionPurchase } from './business';

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const chance = (p: number) => Math.random() < p;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const emptyLog = (day: number, openingCash?: number): DayLog => ({ day, served: 0, walkedOut: 0, lost: 0, income: 0, costs: 0, tips: 0, bestScore: 0, repChange: 0, ...(typeof openingCash === 'number' && Number.isFinite(openingCash) ? { openingCash: Math.round(openingCash) } : {}), staffServed: 0, events: [] });

/** Reconcile reported operating performance with current cash and money held in KoboBank. */
export function cashFlowSummary(s: GameState) {
  const openingCash = typeof s.today?.openingCash === 'number' && Number.isFinite(s.today.openingCash) ? Math.round(s.today.openingCash) : null;
  const cash = Math.round(s.cash);
  const operatingResult = Math.round((s.today?.income || 0) - (s.today?.costs || 0));
  const cashChange = openingCash === null ? null : cash - openingCash;
  const otherMovement = cashChange === null ? null : cashChange - operatingResult;
  const bank = s.bank || initialBankState();
  const fixedDeposits = (bank.fixedDeposits || []).reduce((total, deposit) => total + Math.max(0, deposit.amount || 0), 0);
  const recentMovements = (s.ledger || []).filter((line) => line.day === s.day && (
    line.category === 'transfer' || line.t < 0 || /move-in|furniture|starter stock|inventory|rent|promotion|debt recovery|fixed deposit|savings|vault|loan|wholesale|payables settled|unpaid operating cost/i.test(line.label)
  )).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 8);
  return {
    openingCash, cash, operatingResult, cashChange, otherMovement,
    savings: Math.round(bank.savings || 0), rentVault: Math.round(bank.rentVault || 0),
    fixedDeposits: Math.round(fixedDeposits),
    investments: investmentValue(s),
    recentMovements,
  };
}

export const daysToRent = (day: number) => (7 - (day % 7)) % 7;
export const rentDue = (s: GameState) => s.listing.rent;
export const week = (day: number) => Math.floor((day - 1) / 7);
export const stats = (s: GameState) => liveStats(s);
export const displayCap = (s: GameState) => stats(s).display;

/** Shop clock as "2:35pm". */
export function clockText(min: number) {
  const m = Math.floor(min);
  const h24 = 8 + Math.floor(m / 60);
  const mm = m % 60;
  const h = ((h24 + 11) % 12) + 1;
  return `${h}:${mm.toString().padStart(2, '0')}${h24 >= 12 ? 'pm' : 'am'}`;
}

export function msg(s: GameState, from: string, text: string, tone: Message['tone'] = 'info'): GameState {
  const id = (s.msgSeq || 0) + 1;
  const m: Message = { id, day: s.day, from, text, tone, t: s.phase === 'shop' ? Math.floor(s.clock) : undefined };
  return { ...s, msgSeq: id, messages: [m, ...s.messages].slice(0, 120) };
}

/** Money in or out, written to the bank statement. Unfunded operating costs become payables, never unexplained negative cash. */
export function money(s: GameState, amount: number, label: string): GameState {
  if (!Number.isFinite(amount) || !Math.round(amount)) return s;
  const value = Math.round(amount);
  const inheritedDeficit = Math.max(0, -s.cash);
  let cash = Math.max(0, s.cash);
  let operatingPayables = Math.max(0, s.operatingPayables || 0) + inheritedDeficit;
  const t = s.phase === 'shop' ? Math.floor(s.clock) : -1;
  const entries: LedgerLine[] = [];
  if (value < 0) {
    const requested = Math.abs(value);
    const paid = Math.min(cash, requested);
    const shortfall = requested - paid;
    cash -= paid;
    operatingPayables += shortfall;
    entries.push({ day: s.day, t, label, amount: -paid, category: 'operating' });
    if (shortfall > 0) entries.unshift({ day: s.day, t, label: 'Unpaid operating cost: ' + label + ' (' + shortfall?.toLocaleString('en-NG') + ' naira)', amount: 0, category: 'operating' });
  } else {
    cash += value;
    entries.push({ day: s.day, t, label, amount: value, category: 'operating' });
    // Incoming business receipts first settle bills that could not be paid earlier.
    const settlement = Math.min(cash, operatingPayables);
    if (settlement > 0) {
      cash -= settlement;
      operatingPayables -= settlement;
      entries.unshift({ day: s.day, t, label: 'Operating payables settled', amount: -settlement, category: 'operating' });
    }
  }
  return { ...s, cash, operatingPayables, ledger: [...entries, ...(s.ledger || [])].slice(0, 500) };
}

// ---------------------------------------------------------------------------
// New game: the kiosk comes stocked with cheap native and English wear
// ---------------------------------------------------------------------------
const STARTER: [string, string, string, string, number][] = [
  // kind, item id, colour, colour2, pattern
  ['top', 'buba', '#E86A2E', '#2F5D3A', 6],
  ['bottom', 'iro', '#E86A2E', '#2F5D3A', 6],
  ['dress', 'fitFlare', '#2846A8', '#E3B23C', 1],
  ['dress', 'bubu', '#7A3A8C', '#E3B23C', 9],
  ['top', 'tshirt', '#F6F1E8', '#F6F1E8', 0],
  ['bottom', 'skinnyJeans', '#3C5A8A', '#3C5A8A', 0],
  ['top', 'camisole', '#C2262E', '#C2262E', 0],
  ['shoes', 'sandals', '#C9A163', '#C9A163', 0],
  ['shoes', 'slides', '#1E1E24', '#1E1E24', 0],
  ['dress', 'senator', '#2F5D3A', '#2F5D3A', 0],
  ['headwear', 'headwrap', '#E3B23C', '#1E1E24', 0],
  ['earrings', 'goldStuds', '#C9A163', '#C9A163', 0],
];

export function rivalDefaults() {
  const rivals = initRivals();
  const base = { rivals, ranking: [] as GameState['ranking'], rivalPosts: [], gist: [], drop: null, events: [], visit: null, spying: 0 };
  return base;
}

const freshDay = { clock: 0, arrivals: [], inShop: [], serving: null, left: [], outages: [] as GameState['outages'], shouts: [] as GameState['shouts'] };

// Large government/organization contracts must remain rare enough not to replace ordinary shop progression.
const POLITICIAN_CONTRACT_COOLDOWN_DAYS = 45;

const CONTRACT_TIER_RULES = [
  { retailCeiling: 18_000, lines: 1, minQty: 2, maxQty: 3, deadlineDays: 5, minUnitCost: 0 },
  { retailCeiling: 60_000, lines: 1, minQty: 3, maxQty: 5, deadlineDays: 6, minUnitCost: 0 },
  { retailCeiling: 100_000, lines: 2, minQty: 4, maxQty: 6, deadlineDays: 7, minUnitCost: 0 },
  { retailCeiling: 200_000, lines: 2, minQty: 6, maxQty: 9, deadlineDays: 8, minUnitCost: 0 },
  { retailCeiling: 300_000, lines: 3, minQty: 8, maxQty: 12, deadlineDays: 10, minUnitCost: 0 },
  // Major contracts require luxury catalogue items so the proposed rewards are backed by
  // substantial sourcing costs, not hundreds of pieces of cheap everyday stock.
  { retailCeiling: 1_500_000, lines: 3, minQty: 40, maxQty: 55, deadlineDays: 12, minUnitCost: 460_000 },
  { retailCeiling: 3_000_000, lines: 4, minQty: 45, maxQty: 65, deadlineDays: 14, minUnitCost: 700_000 },
] as const;

const CONTRACT_CLIENTS = [
  'Hon. Amaka Okafor',
  'Hon. Tunde Adebayo',
  'Councillor Kemi Lawal',
  'Office of Senator Ibrahim',
  'Lagos Constituency Liaison Office',
  'Hon. Chuka Nwosu',
] as const;

const CONTRACT_TITLES = [
  'Community outreach wardrobe',
  'Formal delegation clothing order',
  'Constituency cultural reception',
  'Executive appreciation event',
  'Public service gala collection',
] as const;

/** Generate a real catalogue-backed offer, never free-form or AI-invented products. */
function makePoliticianContractOffer(s: GameState): PoliticianContract | null {
  const rule = CONTRACT_TIER_RULES[clamp(Math.floor(s.tier || 0), 0, CONTRACT_TIER_RULES.length - 1)];
  const eligible = MARKET
    .filter((entry) => canBuy(entry, s.tier) && ['top', 'bottom', 'dress', 'outer', 'shoes', 'bag', 'headwear'].includes(entry.kind))
    .map((entry) => ({
      entry,
      unitCost: pieceCost(entry, isClothing(entry.kind) ? entry.fabric || 'plain' : undefined),
    }))
    .filter((row) => {
      if (row.unitCost < rule.minUnitCost || row.unitCost * MARKUP > rule.retailCeiling) return false;
      const held = (s.stock || []).filter((design) => design.kind === row.entry.kind && design.itemId === row.entry.id)
        .reduce((sum, design) => sum + Math.max(0, design.pieces), 0);
      // Keep contracts meaningful even for a new kiosk: offers require at least a little new sourcing.
      return held < rule.minQty;
    })
    .sort((a, b) => a.unitCost - b.unitCost || a.entry.label.localeCompare(b.entry.label));
  if (!eligible.length) return null;

  const lineCount = Math.min(rule.lines, eligible.length);
  const start = Math.abs(Math.floor((s.seed || 0) + s.day * 19)) % eligible.length;
  const requirements: PoliticianContractRequirement[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < eligible.length && requirements.length < lineCount; i++) {
    const row = eligible[(start + i) % eligible.length];
    const key = row.entry.kind + '|' + row.entry.id;
    if (seen.has(key)) continue;
    seen.add(key);
    const quantity = rule.minQty + (Math.abs(Math.floor((s.seed || 0) / (i + 1) + s.day * (i + 5))) % (rule.maxQty - rule.minQty + 1));
    requirements.push({
      kind: row.entry.kind,
      itemId: row.entry.id,
      label: row.entry.label,
      quantity,
      unitCost: row.unitCost,
    });
  }
  if (!requirements.length) return null;

  const goodsCost = requirements.reduce((sum, row) => sum + row.unitCost * row.quantity, 0);
  const tierIndex = clamp(Math.floor(s.tier || 0), 0, CONTRACT_TIER_RULES.length - 1);
  const costScaledReward = Math.ceil((goodsCost * 4) / 1_000) * 1_000;
  // Major late-game contracts use the roadmap's proposed scale. The value is an
  // offer only: the game still pays it exclusively after verified delivery.
  const reward = tierIndex === 5
    ? Math.min(500_000_000, Math.max(220_000_000, costScaledReward))
    : tierIndex >= 6
      ? Math.min(1_000_000_000, Math.max(500_000_000, costScaledReward))
      : Math.ceil((goodsCost * 1.65) / 1_000) * 1_000;
  const titleIndex = Math.min(CONTRACT_TITLES.length - 1, Math.floor(s.tier || 0));
  const client = CONTRACT_CLIENTS[Math.abs(Math.floor((s.seed || 0) + s.day * 13)) % CONTRACT_CLIENTS.length];
  const title = CONTRACT_TITLES[titleIndex];
  const labels = requirements.map((row) => row.label);
  const brief = `Supply ${requirements.reduce((sum, row) => sum + row.quantity, 0)} pieces for ${title.toLowerCase()}. Required catalogue goods: ${labels.join(', ')}. Every line must be delivered before the agreed deadline.`;
  const id = `politician-${s.day}-${Math.abs(Math.floor((s.seed || 0) + s.day * 997)).toString(36)}`;
  return {
    id, client, title, brief, offeredDay: s.day, offerExpiresDay: s.day + 2,
    deadlineDays: rule.deadlineDays, status: 'offered', requirements, reward,
    failurePenalty: Math.max(1_000, Math.ceil((reward * 0.1) / 1_000) * 1_000),
  };
}

/**
 * Expire stale offers and fail overdue accepted contracts at the start of a new
 * in-game day. It also keeps at most one live offer/accepted contract at a time.
 */
export function ensurePoliticianContractOffer(s0: GameState, force = false): GameState {
  let s = s0;
  let contracts = [...(s.politicianContracts || [])];
  for (const old of [...contracts]) {
    if (old.status === 'offered' && s.day > old.offerExpiresDay) {
      contracts = contracts.map((row) => row.id === old.id ? { ...row, status: 'expired' as const, completedDay: s.day } : row);
      s = { ...s, politicianContracts: contracts };
      s = msg(s, old.client, `The offer for “${old.title}” has expired. No fee was charged. I will send another opportunity later.`, 'warn');
    } else if (old.status === 'accepted' && typeof old.deadlineDay === 'number' && s.day > old.deadlineDay) {
      const lateFee = old.failurePenalty;
      contracts = contracts.map((row) => row.id === old.id ? { ...row, status: 'failed' as const, completedDay: s.day, penaltyCharged: lateFee } : row);
      s = {
        ...s,
        politicianContracts: contracts,
        rep: clamp(s.rep - 4, 0, 100),
        followers: Math.max(0, Math.floor((s.followers || 0) * 0.98)),
        today: {
          ...s.today,
          costs: (s.today?.costs || 0) + lateFee,
          events: [...(s.today?.events || []), `Failed politician contract “${old.title}”: ${naira(lateFee)} late fee assessed and shop reputation reduced.`],
        },
      };
      s = money(s, -lateFee, `Politician contract late fee: ${old.title}`);
      s = msg(s, old.client, `The delivery deadline for “${old.title}” was missed. The contract is now failed. A ${naira(lateFee)} late fee was assessed, and your shop's reputation has fallen. Complete future orders before their deadline.`, 'danger');
    }
  }
  contracts = [...(s.politicianContracts || contracts)];
  const hasLive = contracts.some((row) => row.status === 'offered' || row.status === 'accepted');
  const lastActivityDay = contracts.reduce((latest, row) => Math.max(latest, row.completedDay || row.offeredDay), 0);
  if (hasLive || (!force && contracts.length > 0 && s.day < lastActivityDay + POLITICIAN_CONTRACT_COOLDOWN_DAYS)) {
    return contracts.length ? { ...s, politicianContracts: contracts.slice(-20) } : s;
  }
  // Politician contracts are rare late-game opportunities, not day-one walk-in orders.
  // Tier indexes 5 and 6 correspond to boutique Levels 6 and 7.
  if (Math.floor(s.tier || 0) < 5) return contracts.length ? { ...s, politicianContracts: contracts.slice(-20) } : s;

  const offer = makePoliticianContractOffer(s);
  if (!offer) return s;
  if (!force) {
    const tierIndex = clamp(Math.floor(s.tier || 0), 0, CONTRACT_TIER_RULES.length - 1);
    const promotionLevel = s.promotion?.active && s.promotion.target !== 'warehouse'
      ? s.promotion.level
      : undefined;
    const discoveryBase = tierIndex === 5 ? 0.20 : 0.25;
    const issueChance = tierIndex === 5 ? 0.10 : 0.12;
    const discovered = chance(visibilityDiscoveryChance(discoveryBase, s.followers || 0, promotionLevel));
    if (!discovered || !chance(issueChance)) return s;
  }
  s = { ...s, politicianContracts: [...contracts, offer].slice(-20) };
  s = msg(s, offer.client,
    `NEW CLOTHING CONTRACT OFFER: “${offer.title}”. Estimated payment on complete delivery: ${naira(offer.reward)}. The offer expires after Day ${offer.offerExpiresDay}. Open the Contracts app to inspect the required goods, accept or decline, and source stock through your Yaba Mart Shopper.`,
    'good');
  return s;
}

/** Accepting locks in a deadline; the offer itself never charges the player. */
export function acceptPoliticianContract(s0: GameState, contractId: string): GameState {
  const contract = (s0.politicianContracts || []).find((row) => row.id === contractId);
  if (!contract || contract.status !== 'offered' || s0.day > contract.offerExpiresDay) return s0;
  if ((s0.politicianContracts || []).some((row) => row.status === 'accepted')) {
    return msg(s0, 'Yaba Mart Contracts', 'You already have an accepted politician contract. Deliver it before taking on another.');
  }
  const accepted: PoliticianContract = { ...contract, status: 'accepted', acceptedDay: s0.day, deadlineDay: s0.day + contract.deadlineDays };
  const s = {
    ...s0,
    politicianContracts: (s0.politicianContracts || []).map((row) => row.id === contractId ? accepted : row),
    today: { ...s0.today, events: [...(s0.today?.events || []), `Accepted “${contract.title}” from ${contract.client}; delivery is due by Day ${accepted.deadlineDay}.`] },
  };
  return msg(s, contract.client, `Agreement confirmed. Please deliver all requested pieces by the end of Day ${accepted.deadlineDay}. The promised payment of ${naira(contract.reward)} is released only after delivery is verified.`, 'good');
}

/** Declining an offer has no financial penalty and frees the next offer after a short cooldown. */
export function declinePoliticianContract(s0: GameState, contractId: string): GameState {
  const contract = (s0.politicianContracts || []).find((row) => row.id === contractId);
  if (!contract || contract.status !== 'offered') return s0;
  const contracts = (s0.politicianContracts || []).map((row) =>
    row.id === contractId ? { ...row, status: 'declined' as const, completedDay: s0.day } : row);
  return msg({ ...s0, politicianContracts: contracts }, contract.client,
    `Thank you for considering “${contract.title}”. I understand you cannot take it on right now. There is no fee for declining.`, 'info');
}

/** How many required pieces are currently in inventory (cart contents do not count until checkout). */
export function politicianContractProgress(s: GameState, contract: PoliticianContract) {
  const requirements = contract.requirements.map((requirement) => {
    const available = (s.stock || []).filter((d) => d.kind === requirement.kind && d.itemId === requirement.itemId)
      .reduce((sum, d) => sum + Math.max(0, d.pieces), 0);
    return { ...requirement, available: Math.min(requirement.quantity, available), remaining: Math.max(0, requirement.quantity - available) };
  });
  return {
    requirements,
    complete: requirements.every((row) => row.remaining === 0),
    totalRequired: requirements.reduce((sum, row) => sum + row.quantity, 0),
    totalAvailable: requirements.reduce((sum, row) => sum + row.available, 0),
  };
}

/** Deliver only when every required SKU/quantity exists; the exact inventory is removed. */
export function deliverPoliticianContract(s0: GameState, contractId: string): GameState {
  const contract = (s0.politicianContracts || []).find((row) => row.id === contractId);
  if (!contract || contract.status !== 'accepted' || typeof contract.deadlineDay !== 'number' || s0.day > contract.deadlineDay) return s0;
  if (!politicianContractProgress(s0, contract).complete) return s0;

  let remaining = new Map<string, number>(contract.requirements.map((row) => [[row.kind, row.itemId].join('|'), row.quantity] as const));
  let stock = [...s0.stock];
  let costOfGoods = 0;
  stock = stock.map((design) => {
    const key = [design.kind, design.itemId].join('|');
    const needed = remaining.get(key) || 0;
    if (needed <= 0 || design.pieces <= 0) return design;
    const used = Math.min(design.pieces, needed);
    remaining.set(key, needed - used);
    costOfGoods += used * design.cost;
    return { ...design, pieces: design.pieces - used };
  });
  if ([...remaining.values()].some((n) => n > 0)) return s0;

  const updatedContract = { ...contract, status: 'fulfilled' as const, completedDay: s0.day };
  let s: GameState = {
    ...s0,
    stock,
    politicianContracts: (s0.politicianContracts || []).map((row) => row.id === contractId ? updatedContract : row),
    rep: clamp(s0.rep + 3, 0, 100),
    followers: (s0.followers || 0) + Math.max(80, 80 * (s0.tier + 1)),
    stats: { ...s0.stats, totalEarned: (s0.stats?.totalEarned || 0) + contract.reward - costOfGoods },
    today: {
      ...s0.today,
      income: (s0.today?.income || 0) + contract.reward,
      costs: (s0.today?.costs || 0) + costOfGoods,
      events: [...(s0.today?.events || []), `Contract delivered: “${contract.title}” for ${contract.client}. Payment ${naira(contract.reward)}; inventory cost recognised ${naira(costOfGoods)}.`],
    },
  };
  s = money(s, contract.reward, `Politician contract payment: ${contract.title}`);
  s = addBrag(s, 'contract', `Delivered "${contract.title}"`, `Asanwa Boutique delivered an official clothing contract for ${contract.client}.`, 4);
  s = msg(s, contract.client, `Delivery accepted. All requested goods for “${contract.title}” have been checked in. ${naira(contract.reward)} has been paid to your business, and your record with our office has improved. Thank you.`, 'good');
  return refreshEveningHistory(s);
}

export function newGame(divine: CharacterConfig): GameState {
  const stock = STARTER.map(([kind, id, c, c2, pat]) => {
    const e = entryFor(kind as never, id)!;
    return { ...makeDesign(e, { fabric: e.fabric, color: c, color2: c2, pattern: pat, pieces: 2 }), displayed: true };
  });
  const spent = stock.reduce((a, d) => a + d.cost * d.pieces, 0);
  let s: GameState = {
    version: 5,
    listing: KIOSK_LISTING,
    furniture: STARTER_FURNITURE.map((f) => ({ ...f, uid: newUid() })),
    day: 1,
    cash: START_CASH,
    rep: 30,
    tier: 0,
    movedDay: -100,
    grace: 7,
    lateRent: null,
    stock,
    regulars: [],
    staff: [],
    hireOkDay: 0,
    divine,
    slowWeek: false,
    phase: 'morning',
    ...freshDay,
    power: { gen: false, solar: 0, fuel: 0 },
    energy: 100,
    meter: { kwh: 0 },
    shoutSeq: 0,
    ledger: [],
    followers: 120,
    posts: [],
    msgSeq: 0,
    read: {},
    characterMemories: {},
    collaborations: [],
    ...rivalDefaults(),
    today: emptyLog(1),
    history: [],
    messages: [],
    stats: { served: 0, totalEarned: 0, demotions: 0, bestScore: 0 },
    seed: Math.floor(Math.random() * 1e9),
  };
  s = ensureBusinessState(s);
  s = { ...s, weather: weatherForDay(s.day, s.seed) };
  s = money(s, -spent, 'Starter stock from Yaba market');
  // Day-one opening cash starts after the starter inventory has been purchased.
  s = { ...s, today: { ...s.today, openingCash: s.cash } };
  s = msg(s, 'Deborah', `Sis! The kiosk is ready. I helped you stock it with ${naira(spent)} of clothes from Yaba market. You have ${naira(s.cash)} left. Rent is ${naira(TIERS[0].rent)} every 7 days. The place is small and rough, but we'll fix it up as the money comes.`, 'good');
  s = msg(s, 'Deborah', `The shop opens 8am to 8pm. Customers come in all day, busiest at lunch and after work. If you're slow, they get tired of waiting and leave, so move fast! Some only want hair or makeup, no clothes.`, 'info');
  s = ensurePoliticianContractOffer(s, true);
  return s;
}

// ---------------------------------------------------------------------------
// Opening the shop: who will come today, and when
// ---------------------------------------------------------------------------
/** Followers bring people in: up to +40% traffic. */
/** Followers improve reach continuously; engaged audiences still matter beyond raw scale. */
export const followerTraffic = (f: number) => 1 + 0.4 * (Math.max(0, f) / (Math.max(0, f) + 3000)) + Math.min(0.28, Math.log10(Math.max(0, f) + 1) / 45);

export function weatherForDay(day: number, seed: number): NonNullable<GameState['weather']> {
  return weatherFor(day, seed);
}

export function customersToday(s: GameState, slow: boolean) {
  const t = TIERS[s.tier];
  const ramp = Math.min(1, NEW_SHOP_START + (1 - NEW_SHOP_START) * Math.max(0, s.day - s.movedDay) / NEW_SHOP_RAMP_DAYS);
  const brand = getBrandMetrics(s);
  const traffic = prestigeTraffic(stats(s).prestige) * followerTraffic(s.followers || 0) * (1 + stats(s).traffic) * (1 + promotionTrafficBoost(s)) * competition(s) * (s.listing.signature ? 1.35 : 1);
  const brandDemand = 0.55 + brand.awareness / 240 + brand.loyalty / 350 + brand.reliability / 400;
  // Storms keep people indoors; December is owambe season and the streets are full.
  const weatherTraffic = (s.weather === 'storm' ? 0.68 : s.weather === 'rainy' ? 0.82 : s.weather === 'sunny' ? 1.04 : 1) * (festive(s.day) ? 1.15 : 1);
  return Math.max(4, Math.round(t.customers * traffic * brandDemand * (0.85 + Math.random() * 0.3) * (slow ? 0.55 : 1) * ramp * weatherTraffic));
}

/** How many people can wait inside: three standing, plus seats. */
export const waitingRoom = (s: GameState) => 3 + stats(s).seats;

function arrivalMinute() {
  const total = HOUR_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let h = 0;
  while (h < HOUR_WEIGHTS.length - 1 && r > HOUR_WEIGHTS[h]) r -= HOUR_WEIGHTS[h++];
  return Math.min(SHOP_MINUTES - 20, h * 60 + Math.random() * 60);
}

/** The look's score including what the shop adds. */
export function scoreInShop(s: GameState, c: Customer, choice: StyleChoice): ScoreBreakdown {
  const base = scoreLook(c, choice, s.stock);
  const b0 = shopBonus(s, c, choice);
  // Divine's own state counts when she is the one styling
  const d = s.serving === c.id ? divineBonus(s, !!choice.hair, !c.male && !!choice.makeup) : { bonus: 0, notes: [] };
  const b = { bonus: b0.bonus + d.bonus, notes: [...b0.notes, ...d.notes] };
  if (!b.bonus) return base;
  return { ...base, total: Math.max(0, Math.min(100, base.total + b.bonus)), bonus: b.bonus, bonusNotes: b.notes } as ScoreBreakdown;
}

/** Extra score from the shop itself: mirror, stations, fitting room. */
export function shopBonus(s: GameState, c: Customer, choice: StyleChoice): { bonus: number; notes: string[] } {
  const st = stats(s);
  let bonus = st.mirror;
  const notes: string[] = [];
  if (st.mirror) notes.push(`Mirror +${st.mirror}`);
  if (choice.hair && st.hairBonus) { bonus += st.hairBonus; notes.push(`Hair station +${st.hairBonus}`); }
  if (!c.male && choice.makeup && st.makeupBonus) { bonus += st.makeupBonus; notes.push(`Makeup station +${st.makeupBonus}`); }
  if (c.wants.some((w) => w.kind === 'nails') && choice.makeup?.nailColor && st.nailBonus) { bonus += st.nailBonus; notes.push(`Nail station +${st.nailBonus}`); }
  if (c.cls === 'rich' && st.richBonus) { bonus += st.richBonus; notes.push(`Fitting room +${st.richBonus}`); }
  if (st.scoreBonus) { bonus += st.scoreBonus; notes.push(`Steamer and lighting +${st.scoreBonus}`); }
  if (Object.values(choice).some((uid) => typeof uid === 'string' && s.stock.some((d) => d.uid === uid && (d.trend || 0) >= s.day))) { bonus += 4; notes.push('Trending fabric +4'); }
  const src = s.phase === 'shop' ? source(s) : 'grid';
  if (src === 'solar') { bonus += 2; notes.push('Cool and quiet on solar +2'); }
  if (src === 'none') {
    const lantern = s.furniture.some((p) => p.placed && p.id === 'lantern');
    bonus -= lantern ? 1 : 4;
    notes.push(lantern ? 'Lantern keeps the look visible -1' : 'Styled in the dark and heat -4');
  }
  return { bonus: Math.min(10, bonus), notes };
}

export function openShop(s0: GameState): GameState {
  const today = s0.today?.day === s0.day
    ? { ...s0.today }
    : emptyLog(s0.day, s0.cash);
  let s: GameState = { ...s0, phase: 'shop', weather: weatherForDay(s0.day, s0.seed), ...freshDay, today };
  let slow = s.slowWeek;
  if (s.day % 7 === 1) {
    slow = s.day > 7 && chance(SLOW_WEEK_CHANCE);
    if (slow) s = msg(s, 'Deborah', pick(['Rain has started o. Customers will be few this week.', 'Fuel scarcity everywhere. People are not going out this week.', 'Exam week for the students. The market is quiet.']), 'warn');
    if (scarcity(s) && tankSize(s)) s = msg(s, 'Deborah', `Fuel scarcity o! Petrol is ${naira(fuelPrice(s))} a litre this week, and the queues are long. Use the gen small small.`, 'warn');
  }
  const st = stats(s);
  const n = customersToday(s, slow);
  const mix = [...TIERS[s.tier].mix] as [number, number, number];
  const shift = prestigeRichShift(st.prestige);
  if (s.listing.signature) {
    // Signature properties are luxury-only: poor customers are excluded and middle-class visits are uncommon.
    mix[0] = 0.005;
    mix[1] = 0.075;
    mix[2] = 0.92;
  } else {
    mix[0] = Math.max(0.05, mix[0] - shift);
    mix[2] = Math.max(0, mix[2] + shift);
  }
  const signatureProperty = !!s.listing.signature;
  const promotionLevel = s.promotion?.active && s.promotion.target !== 'warehouse'
    ? s.promotion.level
    : undefined;

  // Social growth and active brand campaigns move customer composition toward affluent shoppers,
  // while preserving the total mix rather than multiplying every customer category.
  const affluentShift = affluentCustomerShareShift(s.followers || 0, promotionLevel);
  const nonAffluentShare = Math.max(0, mix[0] + mix[1]);
  const appliedAffluentShift = Math.min(affluentShift, nonAffluentShare);
  if (nonAffluentShare > 0 && appliedAffluentShift > 0) {
    mix[0] -= appliedAffluentShift * (mix[0] / nonAffluentShare);
    mix[1] -= appliedAffluentShift * (mix[1] / nonAffluentShare);
    mix[2] = Math.min(1, mix[2] + appliedAffluentShift);
  }

  const arrivals = Array.from({ length: n }, () => ({ at: arrivalMinute(), c: makeCustomer(s, mix) }));
  // Celebrity discovery and visit follow-through are separate rolls. Three possible guests
  // may notice the shop on each scheduled day; the tier's daily capacity remains authoritative.
  const celebrityProfile = {
    reputation: s.rep,
    followers: s.followers || 0,
    shopTierIndex: s.tier,
    awareness: s.brand?.awareness,
    prestige: s.brand?.prestige,
    trendInfluence: s.brand?.trendInfluence,
    loyalty: s.brand?.loyalty,
    reliability: s.brand?.reliability,
  };
  const celebrityScheduled = celebrityIsScheduled(s.tier, s.day, signatureProperty);
  const highestEligibleCelebrityTier = maximumCelebrityTierForShop(s.tier);
  const maxDailyCelebrityVisits = maximumCelebrityVisitsPerDay(s.tier, signatureProperty);
  let celebrityAttention = false;
  if (highestEligibleCelebrityTier >= 0 && celebrityScheduled) {
    const discoveryChance = celebrityDiscoveryChance(s.tier, signatureProperty, celebrityProfile, promotionLevel);
    const followThroughChance = celebrityVisitFollowThroughChance(celebrityProfile);
    const guests: Customer[] = [];
    for (let candidate = 0; candidate < 3 && guests.length < maxDailyCelebrityVisits; candidate++) {
      if (!chance(discoveryChance)) continue;
      celebrityAttention = true;
      if (!chance(followThroughChance)) continue;
      const celebrityTier = chooseCelebrityTierForShop(s.tier, signatureProperty, celebrityProfile);
      if (celebrityTier >= 0) guests.push(makeCelebrityCustomer(s, celebrityTier));
    }
    guests.forEach((c, index) => arrivals.push({ at: 100 + Math.random() * 560 + index, c }));
  }
  const model = contestModel(s);
  if (model) arrivals.push(model);
  // Deborah's confirmed lead can add another guest if the property has remaining VIP capacity.
  const alreadyScheduledCelebrities = arrivals.filter((arrival) => !!arrival.c.celebrity).length;
  if (s.celebDay === s.day && highestEligibleCelebrityTier >= 0 &&
      alreadyScheduledCelebrities < maxDailyCelebrityVisits) {
    const celebrityTier = chooseCelebrityTierForShop(s.tier, signatureProperty, celebrityProfile);
    const c = makeCelebrityCustomer(s, celebrityTier);
    arrivals.push({ at: 120 + Math.random() * 360, c });
  }
  arrivals.sort((a, b) => a.at - b.at);
  const outages = planOutages(s.day);
  // Heavy rain makes grid faults more likely in the shop's neighbourhood.
  if (s.weather === 'rainy' && chance(0.35)) {
    const from = Math.round(30 + Math.random() * 540);
    outages.push({ from, to: from + Math.round(45 + Math.random() * 150) });
    outages.sort((a, b) => a.from - b.from);
  }
  // Thunderstorms trip transformers: a long cut is likely.
  if (s.weather === 'storm' && chance(0.7)) {
    const from = Math.round(60 + Math.random() * 480);
    outages.push({ from, to: from + Math.round(120 + Math.random() * 240) });
    outages.sort((a, b) => a.from - b.from);
  }
  if (s.weather === 'storm') s = addShout(s, 'Deborah', 'Thunderstorm today, sis. Fewer people will come out, and NEPA will surely take light. Check the fuel.', 'warn');
  if (s.weather === 'harmattan') s = addShout(s, 'Deborah', 'Harmattan dust everywhere this morning. Keep the clothes covered, sis.', 'warn');
  let next: GameState = { ...s, slowWeek: slow, arrivals, outages, busy: null, power: { ...s.power, gen: false, solar: s.power?.solar || 0 } };
  if (arrivals.some((arrival) => !!arrival.c.celebrity)) {
    next = { ...next, lastCelebrityVisitDay: s.day };
  } else if (celebrityAttention) {
    next = addShout(next, 'Deborah', 'Sis, word is reaching celebrity circles, but nobody confirmed a visit today. Keep the boutique ready; attention does not always turn into a visit.', 'good');
  }
  if (outageAt(next, 0)) {
    next = addShout(next, 'NEPA', 'No light this morning. NEPA took it before you opened.', 'nepa');
    if (stats(next).solarPanels && next.power.solar > 0) next = addShout(next, 'Solar', 'Solar is running the shop for now.', 'good');
    else if (stats(next).gen) next = addShout(next, 'Deborah', 'Start the generator before customers come!', 'warn');
  }
  return next;
}

export const divineCapacity = DIVINE_CAPACITY;
export const staffCapacity = (s: GameState) => s.staff.length * STAFF_CAPACITY;

export const inBlackout = (s: GameState, t = s.clock) => nepaOff(s, t);
/** Fans and AC only work when there is light, solar or a generator. */
export const coolNow = (s: GameState) => coolRunning(s);
export { POWER, EQUIPMENT_WATTS, activeGeneratorUid, dailyEnergyCost, dailyEnergyKwh, equipmentLoadKw, fuelOf, fuelPerHour, fuelPrice, generatorCapacityKw, generatorOverloaded, generatorKind, kwhForLoad, loadExceedsCapacity, loadKw, pourFuel, refuel, scarcity, setGen, setThermostat, shopClimate, solarCap, source, tariffFor, tankSize, THERMOSTAT } from './power';
export type { ShopClimate } from './power';
export { ENERGY, actionsFor, busyNow, energyOf, exhausted, interact, isTired, weeklyBills } from './life';
export type { Action, ActionId } from './life';
export const waiting = (s: GameState) => s.inShop.filter((v) => !v.by);
export const visitor = (s: GameState, id: string | null) => (id ? s.inShop.find((v) => v.c.id === id) : undefined);

/** Staff need level 6 before they may serve wealthy customers. */
export const RICH_CUSTOMER_STAFF_LEVEL = 6;

/** Shared eligibility rule for automatic dispatch and player-directed assignments. */
export function staffCanServeCustomer(staff: Pick<StaffMember, 'level' | 'profession'>, customer: Customer): boolean {
  if (customer.cls === 'rich' && staff.level < RICH_CUSTOMER_STAFF_LEVEL) return false;
  const profession = staff.profession || 'stylist';
  if (profession === 'makeup') return customer.service === 'makeup' || customer.service === 'both';
  return customer.service !== 'makeup';
}

/** How long this employee needs for this customer: job size, level and salon equipment. */
export function staffJobMinutes(s: GameState, m: Pick<StaffMember, 'level'>, c: Pick<Customer, 'service'>): number {
  const job = c.service || 'look';
  const st = stats(s);
  // Proper salon kit speeds the matching work up: up to 15% off with top equipment.
  const hairTools = Math.min(0.15, 0.05 * (st.hairBonus || 0));
  const faceTools = Math.min(0.15, 0.04 * (st.makeupBonus || 0));
  const boost = job === 'hair' ? hairTools : job === 'makeup' ? faceTools : job === 'both' ? (hairTools + faceTools) / 2 : 0;
  return staffMinutes(m.level, job, boost);
}

/** Celebrities are never auto-dispatched; an explicit player assignment is required. */
export function staffMayAutoDispatch(v: Pick<Visitor, 'c' | 'forStaff'>): boolean {
  return !v.c.celebrity || !!v.forStaff;
}

/** Whether at least one qualified employee can take this unassigned visitor. */
export function canAssignToStaff(s: GameState, id: string): boolean {
  const v = visitor(s, id);
  return !!v && (!v.by || (v.by === 'divine' && s.serving === id)) && s.staff.some((m) => staffCanServeCustomer(m, v.c) && staffChoice(s, v.c) !== null);
}
export const shopClosing = (s: GameState) => s.phase === 'shop' && s.clock >= SHOP_MINUTES;

function patienceFor(s: GameState, c: Customer) {
  const st = stats(s);
  const weatherComfort = s.weather === 'rainy' || s.weather === 'storm' || s.weather === 'harmattan' || s.weather === 'cloudy' ? 1.08 : 1;
  let p = PATIENCE[c.cls] * (1 + Math.min(0.4, 0.1 * st.seats)) * (1 + coolNow(s) * 0.6) * (1 + st.patience) * weatherComfort;
  if (c.regularId) p += 20;
  return Math.round(p);
}

function depart(s: GameState, c: Customer, look: CharacterConfig, bag: boolean): GameState {
  const d: Departure = { key: `${c.id}-${Math.floor(s.clock)}`, id: c.id, look, bag };
  return { ...s, inShop: s.inShop.filter((v) => v.c.id !== c.id), serving: s.serving === c.id ? null : s.serving, left: [...s.left, d].slice(-10) };
}

/** Small shop incidents. They only run during shop time and respect purchased safety equipment. */
function shopIncidentStep(s0: GameState, minutes: number): GameState {
  if (minutes <= 0) return s0;
  let s = s0;
  const has = (id: string) => s.furniture.some((p) => p.placed && p.id === id);
  const crowded = s.inShop.length >= 3 && (!!s.serving || !!s.busy);
  const guardOnDuty = !!s.security?.guard && has('securityPost');
  const theftRisk = guardOnDuty ? (has('cctv') ? 0.000006 : 0.000035) : has('cctv') ? 0.000015 : has('shopAlarm') ? 0.00006 : s.staff.length ? 0.00008 : 0.00016;
  if (crowded && chance(1 - Math.pow(1 - theftRisk, minutes))) {
    const available = s.stock.filter((d) => d.pieces > 0);
    if (available.length) {
      const stolen = available[Math.floor(Math.random() * available.length)];
      if (guardOnDuty && chance(0.82)) {
        s = addShout(s, s.security!.guard!.name, `Stop there! I caught someone taking ${stolen.label}. I've recovered it and returned it to the rail.`, 'good');
        s = { ...s, today: { ...s.today, events: [...s.today.events, `Security caught a shoplifter and recovered ${stolen.label}; no stock was lost.`] } };
      } else {
        s = { ...s, stock: s.stock.map((d) => d.uid === stolen.uid ? { ...d, pieces: Math.max(0, d.pieces - 1) } : d) };
        s = addShout(s, 'Deborah', `Sis, one ${stolen.label} don miss from the rail 😩`, 'warn');
        s = { ...s, today: { ...s.today, events: [...s.today.events, `Shoplifting: one ${stolen.label} went missing.`] } };
      }
    }
  }
  if (s.power?.gen && source(s) === 'gen') {
    const baseRisk = scarcity(s) ? 0.00018 : 0.000035;
    const risk = has('fireAlarm') ? baseRisk * 0.45 : baseRisk;
    if (chance(1 - Math.pow(1 - risk, minutes))) {
      if (has('fireExtinguisher') || has('fireBlanket')) {
        s = { ...s, power: { ...s.power, gen: false } };
        s = addShout(s, 'Deborah', 'Small flare-up at the gen! The extinguisher stopped it. Please check the generator before restarting.', 'warn');
        s = { ...s, today: { ...s.today, events: [...s.today.events, 'A generator flare-up was put out with the fire extinguisher.'] } };
      } else {
        const repair = scarcity(s) ? 85000 : 45000;
        s = money(s, -repair, 'Generator fire repairs');
        s = { ...s, power: { ...s.power, gen: false }, today: { ...s.today, costs: s.today.costs + repair, events: [...s.today.events, `Generator fire: paid ${naira(repair)} for repairs; smoke drove customers out.`] } };
        const sent = waiting(s);
        for (const v of sent) s = depart(s, v.c, v.c.look, false);
        if (sent.length) s = { ...s, today: { ...s.today, lost: s.today.lost + sent.length, closedOn: (s.today.closedOn || 0) + sent.length } };
        s = addShout(s, 'Deborah', `Fire at the generator! The gen is off and repairs cost ${naira(repair)}. We need an extinguisher, sis!`, 'warn');
      }
    }
  }
  return s;
}

/**
 * Moves the shop clock forward. People walk in, lose patience, get styled by
 * staff, and at 8pm the doors shut.
 */
export function tick(s0: GameState, minutes: number): GameState {
  // Errands keep progressing while the boutique is closed too; the shop clock itself remains paused.
  if (s0.phase !== 'shop') return securityStep(s0, minutes);
  let s = s0;
  const end = Math.min(SHOP_MINUTES, s.clock + minutes);
  const st = stats(s);
  // walk-ins
  let lostDoor = 0;
  let lostHeat = 0;
  let lostWeather = 0;
  while (s.arrivals.length && s.arrivals[0].at <= end) {
    const [a, ...rest] = s.arrivals;
    s = { ...s, arrivals: rest };
    // passers-by look in at a dark, hot shop and keep walking
    const vip = !!a.c.contest || !!a.c.celebrity;
    const canopy = s.furniture.some((p) => p.placed && p.id === 'umbrellaCanopy');
    // Rain sends some walk-ins home; a street canopy protects the queue.
    if (!vip && s.weather === 'rainy' && chance(canopy ? 0.06 : 0.18)) { lostWeather++; continue; }
    if (!vip && s.weather === 'storm' && chance(canopy ? 0.12 : 0.3)) { lostWeather++; continue; }
    if (!vip && s.weather === 'sunny' && chance(canopy ? 0.02 : 0.08)) { lostWeather++; continue; }
    if (!vip && source(s, a.at) === 'none' && chance({ poor: 0.2, middle: 0.35, rich: 0.6 }[a.c.cls])) { lostHeat++; continue; }
    if (!vip && waiting(s).length >= waitingRoom(s)) { lostDoor++; continue; }
    // the speaker is switched off: fewer people wander in from the street
    if (!vip && s.off && s.furniture.some((p) => p.placed && p.id === 'speaker' && s.off![p.uid]) && chance(0.08)) continue;
    // a style-off model waits for you all day
    s = { ...s, inShop: [...s.inShop, { c: a.c, arrived: a.at, patience: vip ? 9999 : patienceFor(s, a.c) * (s.listing.signature ? 2.1 : 1), waited: 0 }] };
  }
  if (lostDoor || lostHeat || lostWeather) s = { ...s, today: { ...s.today, lost: s.today.lost + lostDoor + lostHeat + lostWeather, doorLost: (s.today.doorLost || 0) + lostDoor, heatLost: (s.today.heatLost || 0) + lostHeat, weatherLost: (s.today.weatherLost || 0) + lostWeather } };
  s = powerStep(s, s.clock, end);
  s = shopIncidentStep(s, end - s.clock);
  s = dropStep(s, end - s.clock);
  s = visitStep(s, end - s.clock);
  s = energyStep(s, end - s.clock);
  s = securityStep(s, end - s.clock);
  s = { ...s, clock: end };
  if (s.busy && s.busy.until <= end) s = { ...s, busy: null };
  // tired of waiting: heat and darkness use patience up faster
  const step = end - s0.clock;
  s = { ...s, inShop: s.inShop.map((v) => (v.by ? v : { ...v, waited: (v.waited ?? Math.max(0, s0.clock - v.arrived)) + step * drainRate(s, v.c.cls) })) };
  for (const v of waiting(s)) {
    if (!v.complained && stats(s).seats > 0 && (v.waited || 0) > v.patience * 0.55) {
      const rival = s.rivals.find((r) => r.main && r.id !== 'you');
      s = addShout(s, v.c.name, rival ? `I don wait tire. I fit go ${rival.shop} instead, abeg.` : 'I don wait tire. Abeg, who go attend to me?', 'complain');
      s = { ...s, inShop: s.inShop.map((x) => x.c.id === v.c.id ? { ...x, complained: true } : x) };
    }
    if ((v.waited || 0) > v.patience) {
      s = depart(s, v.c, v.c.look, false);
      s = { ...s, rep: clamp(s.rep - 0.4, 0, 100), today: { ...s.today, lost: s.today.lost + 1, impatient: (s.today.impatient || 0) + 1, repChange: s.today.repChange - 0.4 } };
    }
  }
  // staff finish and pick up the next person
  for (const m of s.staff) {
    const mine = s.inShop.find((v) => v.by === m.id);
    if (mine && (mine.until || 0) <= end) {
      s = staffFinish(s, mine.c, m);
    }
    if (!s.inShop.some((v) => v.by === m.id)) {
      // Dispatch the oldest eligible customer as soon as an employee is free; explicit requests go first.
      const next = waiting(s)
        .filter((v) => staffMayAutoDispatch(v) && staffCanServeCustomer(m, v.c) && staffChoice(s, v.c) !== null)
        .sort((a, b) => Number(!!b.forStaff) - Number(!!a.forStaff) || a.arrived - b.arrived)[0];
      if (next && end < SHOP_MINUTES) s = { ...s, inShop: s.inShop.map((v) => (v.c.id === next.c.id ? { ...v, by: m.id, until: end + staffJobMinutes(s, m, next.c) } : v)) };
    }
  }
  // 8pm: the doors shut
  if (end >= SHOP_MINUTES) {
    for (const v of s.inShop.filter((x) => x.by && x.by !== 'divine')) {
      const m = s.staff.find((x) => x.id === v.by);
      s = m ? staffFinish(s, v.c, m) : depart(s, v.c, v.c.look, false);
    }
    const sent = waiting(s);
    for (const v of sent) s = depart(s, v.c, v.c.look, false);
    if (sent.length) s = { ...s, today: { ...s.today, lost: s.today.lost + sent.length, closedOn: (s.today.closedOn || 0) + sent.length } };
    s = { ...s, arrivals: [] };
    if (!s.serving) return closeShop(s);
  }
  return s;
}

/** Jump the clock to the next walk-in when the shop is empty. */
export function skipAhead(s: GameState): GameState {
  if (s.phase !== 'shop' || s.inShop.length || s.serving) return s;
  const next = s.arrivals[0]?.at ?? SHOP_MINUTES;
  return tick(s, Math.max(0, next - s.clock) + 0.01);
}

/** Divine takes a waiting customer to the mirror. */
export function startStyling(s: GameState, id: string): GameState {
  if (s.serving && s.serving !== id) return s;
  if (!s.serving && (exhausted(s) || busyNow(s))) return s;
  const v = visitor(s, id);
  if (!v || (v.by && v.by !== 'divine')) return s;
  return { ...s, serving: id, inShop: s.inShop.map((x) => (x.c.id === id ? { ...x, by: 'divine', forStaff: false } : x)) };
}

export function sendToStaff(s: GameState, id: string): GameState {
  const v = visitor(s, id);
  if (!v || !canAssignToStaff(s, id)) return s;
  return { ...s, serving: s.serving === id ? null : s.serving, inShop: s.inShop.map((x) => (x.c.id === id ? { ...x, by: undefined, forStaff: true, arrived: Math.min(x.arrived, s.clock), patience: x.patience + 30 } : x)) };
}

// ---------------------------------------------------------------------------
// Settling a customer
// ---------------------------------------------------------------------------
const REACTIONS: Record<Settlement['reaction'], string[]> = {
  scream: ['*screams* Divine!!! Is this me?! I am taking a hundred pictures!', 'Ahhh! Na me be this? You are a genius!', 'Jesus! I look like a celebrity!'],
  smile: ['I love it! You did well.', 'Ehen! This is what I wanted.', 'Fine! My people will hear about you.'],
  okay: ["It's okay. Not bad.", 'Hmm. It will do.', 'Fair enough.'],
  frown: ["This isn't really what I asked for.", 'Hmm. I was expecting better.', 'Is this the best you can do?'],
  cry: ['What is this?! I am not paying full money for this!', 'You have spoilt my day! Everybody will laugh at me!', 'Ah! No, no, no. This is not it at all.'],
};

export function reactionFor(score: number): Settlement['reaction'] {
  return score >= 88 ? 'scream' : score >= 76 ? 'smile' : score >= 62 ? 'okay' : score >= 50 ? 'frown' : 'cry';
}

/** What the customer does with the price Divine names. */
export function settle(c: Customer, score: ScoreBreakdown, price: number, supplies: number, context: { hasPOS?: boolean; hasAlterations?: boolean; fitted?: boolean } = {}): Settlement {
  const s = score.total;
  const reaction = reactionFor(s);
  let paid = price;
  let outcome: Settlement['outcome'] = 'paid';
  let line = pick(REACTIONS[reaction]);
  if (price > c.budget * 1.05) {
    if (c.cls === 'poor') {
      return { price, paid: 0, tip: 0, cost: 0, outcome: 'walked', line: `${naira(price)}?! I told you I have ${naira(c.budget)}. I'm going to another shop.`, reaction: 'frown', repDelta: -1.5, becameRegular: false };
    }
    if (c.cls === 'middle') {
      if (s < 60) return { price, paid: 0, tip: 0, cost: 0, outcome: 'walked', line: 'At this price, for this look? No way.', reaction: 'frown', repDelta: -2, becameRegular: false };
      paid = c.budget;
      outcome = 'bargained';
      line = `It's fine, but ${naira(price)} is too much. I'll give you ${naira(paid)}.`;
    }
    if (c.cls === 'rich') {
      paid = c.budget;
      outcome = 'bargained';
      line = s >= 80
        ? `I love the look, but my budget is ${naira(c.budget)}. Can we keep it there?`
        : `For this? ${naira(paid)}, take it or leave it.`;
    }
  }
  if (s < 50 && !c.celebrity) {
    if (chance(0.4)) return { price, paid: 0, tip: 0, cost: 0, outcome: 'refused', line: pick(REACTIONS.cry) + ' Take it back, I\'m not paying.', reaction: 'cry', repDelta: -1.5 * (c.influencer ? 3 : 1), becameRegular: false };
    paid *= 0.7;
    outcome = 'bargained';
  } else if (s < 65) {
    paid *= 0.88;
    if (outcome === 'paid') outcome = 'bargained';
  }
  // Fitted pieces sometimes need a quick adjustment. The alterations corner saves the sale.
  if (!c.celebrity && context.fitted && chance(context.hasAlterations ? 0.04 : 0.2)) {
    if (context.hasAlterations) {
      paid = Math.round(paid * 0.95);
      outcome = 'bargained';
      line = 'This one is a bit tight, but the alterations corner fixed it on the spot. Thank you!';
    } else {
      return { price, paid: 0, tip: 0, cost: 0, outcome: 'walked', line: 'This one too tight for me. No alterations here? I will check another shop.', reaction: 'frown', repDelta: -1.2, becameRegular: false };
    }
  }
  // Some customers need to pay electronically. Transfers can fail when the network misbehaves;
  // a POS terminal makes card payments reliable but charges a small transaction fee.
  if (chance(0.3)) {
    if (!c.celebrity && !context.hasPOS && chance(0.35)) {
      return { price, paid: 0, tip: 0, cost: 0, outcome: 'walked', line: 'Do you take transfer? Network no gree! I cannot wait for this alert. I am going.', reaction: 'frown', repDelta: -0.8, becameRegular: false };
    }
    if (context.hasPOS) {
      paid = Math.round(paid * 0.99);
      line = `${line} POS approved, but the terminal took its small transaction fee.`;
    } else {
      line = `${line} Transfer alert received. Thank goodness.`;
    }
  }
  // A celebrity can refuse a poor look. High-value orders are only unlocked by a strong result.
  if (c.celebrity && s < 60) {
    return {
      price, paid: 0, tip: 0, cost: 0, outcome: 'refused',
      line: 'I needed a standout look for my event. This is not right for me, so I will not buy it today.',
      reaction: 'frown', repDelta: -3, becameRegular: false,
    };
  }
  // Budget is a spending ceiling, not a guarantee that every rich customer spends it all.
  if (c.cls === 'rich') paid = Math.min(paid, c.budget);
  let tip = 0;
  let fulfilmentCost = supplies;
  if (s >= 85) tip = { poor: 0.03, middle: 0.08, rich: 0.15 }[c.cls] * paid;
  else if (s >= 75) tip = { poor: 0.01, middle: 0.04, rich: 0.07 }[c.cls] * paid;
  if (c.male) tip *= 1.5; // men tip big
  if (c.celebrity) {
    // Every completed celebrity purchase honours the guest's rank/venue spend floor.
    // Styling score determines premium status, tip level and publicity—not whether a celebrity's
    // minimum order value can silently collapse to a low-priced individual item.
    paid = Math.min(c.budget, Math.max(paid, c.celebrity.spendFloor));
    fulfilmentCost = Math.max(supplies, Math.round(paid * CELEBRITY_FULFILMENT_RATE));
    if (s >= 80) {
      outcome = 'paid';
      const celebrityTipRate = 0.05 + c.celebrity.tier * 0.02;
      tip = Math.max(tip, Math.round(paid * celebrityTipRate / 100) * 100);
      line = `${c.name} loved the luxury look and placed a premium celebrity order, with a generous tip.`;
    } else {
      if (s >= 75) {
        const regularCelebrityTipRate = 0.03 + c.celebrity.tier * 0.01;
        tip = Math.max(tip, Math.round(paid * regularCelebrityTipRate / 100) * 100);
      }
      line = `${c.name} bought the look at their celebrity spending level, but the styling did not qualify for a premium order.`;
    }
  }
  const repDelta = ((s - 65) / 18) * (c.influencer ? 3 : 1);
  return { price, paid: Math.round(paid), tip: Math.round(tip / 100) * 100, cost: fulfilmentCost, outcome, line, reaction, repDelta, becameRegular: s >= 80 && !c.regularId };
}

/** Applies a finished look: stock leaves the shop, money and reputation move, the customer walks out. */
export function applyLook(s0: GameState, c: Customer, choice: StyleChoice, st0: Settlement, score: ScoreBreakdown): GameState {
  let st = st0;
  if (s0.listing.signature && !c.celebrity) st = { ...st, tip: Math.max(st.tip, Math.round(st.paid * 0.12 / 100) * 100) };
  // Apply tip bonuses before calculating the day report so reported income matches the actual receipt.
  // styling wears Divine out: a full look more than a quick hair or makeup job
  const s = s0.serving === c.id ? spendEnergy(s0, c.service ? ENERGY.service : ENERGY.fullLook) : s0;
  const sold = st.outcome === 'paid' || st.outcome === 'bargained';
  // Apply every tip modifier before the day log, lifetime earnings, and bank receipt are updated.
  if (sold && st.tip && stats(s).tipBonus) st = { ...st, tip: Math.round((st.tip * (1 + stats(s).tipBonus)) / 100) * 100 };
  let stock = s.stock;
  let productSales = [...(s.productSales || [])];
  const lookOut = sold ? buildLook(c, choice, s.stock) : c.look;
  if (sold) {
    const used = new Set(Object.entries(choice).filter(([k]) => !['hair', 'hairColor', 'makeup', 'makeupLook', 'beard'].includes(k)).map(([, v]) => v as string));
    stock = s.stock.map((d) => (used.has(d.uid) ? { ...d, pieces: d.pieces - 1 } : d));

    // Record real product demand, not just daily revenue. Repeated sales in the same
    // day are aggregated by exact variant, customer class and shop tier.
    for (const uid of used) {
      const design = s.stock.find((d) => d.uid === uid);
      if (!design) continue;
      const designKey = [design.kind, design.itemId, design.fabric, design.color, design.color2, design.pattern].join('|');
      const at = productSales.findIndex((row) => row.day === s.day && row.designKey === designKey && row.customerClass === c.cls && row.tier === s.tier);
      if (at >= 0) {
        productSales[at] = { ...productSales[at], units: productSales[at].units + 1 };
      } else {
        productSales.push({
          day: s.day, designKey, kind: design.kind, itemId: design.itemId,
          fabric: design.fabric, color: design.color, color2: design.color2,
          pattern: design.pattern, customerClass: c.cls, units: 1, tier: s.tier,
        });
      }
    }
    // Keep a generous rolling window so the save does not grow forever.
    productSales = productSales.filter((row) => row.day >= s.day - 179).slice(-5000);
  }
  // Remember colour requests the racks could not answer at all, so the shopper
  // buys more of them. Only counts when no clothing on display had that colour.
  let colourMisses = s.colourMisses || [];
  if (!c.service) {
    for (const w of c.wants) {
      if (w.kind !== 'color') continue;
      const onRack = s.stock.some((d) => d.displayed && d.pieces > 0 && isClothing(d.kind) && sameColour(d.color, w.color));
      if (!onRack) colourMisses = [...colourMisses, { day: s.day, color: w.color, name: w.name }];
    }
    colourMisses = colourMisses.filter((row) => row.day >= s.day - 60).slice(-300);
  }
  let regulars = s.regulars;
  if (c.regularId) {
    regulars = regulars.map((r) => (r.id === c.regularId ? { ...r, visits: r.visits + 1, loyalty: clamp(r.loyalty + (score.total - 70) / 2, 0, 100), bestScore: Math.max(r.bestScore, score.total), tasteKnown: r.tasteKnown || r.visits >= 1 } : r));
    regulars = regulars.filter((r) => r.loyalty > 0);
  } else if (st.becameRegular) {
    const r: Regular = { id: `r${Date.now().toString(36)}${Math.floor(Math.random() * 99)}`, name: c.name, look: c.look, cls: c.cls, male: c.male, visits: 1, loyalty: 20, bestScore: score.total, tasteKnown: false, favColor: c.taste.favColor, favName: c.taste.favName };
    regulars = [...regulars, r].slice(-30);
  }
  const today: DayLog = {
    ...s.today,
    served: s.today.served + (sold ? 1 : 0),
    walkedOut: s.today.walkedOut + (sold ? 0 : 1),
    income: s.today.income + (sold ? st.paid + st.tip : 0),
    costs: s.today.costs + (sold ? st.cost : 0),
    tips: s.today.tips + (sold ? st.tip : 0),
    bestScore: Math.max(s.today.bestScore, score.total),
    repChange: s.today.repChange + st.repDelta,
  };
  if (c.influencer) today.events = [...today.events, score.total >= 80 ? `${c.name} posted your work to her followers. Reputation up!` : score.total < 60 ? `${c.name} dragged your shop online. Reputation down.` : `${c.name} posted, nothing special.`];
  let next: GameState = {
    ...s,
    ...(sold && c.cls === 'rich' && !c.celebrity && score.total >= 85
      ? { brags: addBrag(s, 'richClient', `Styled a luxury client`, `${c.name}, a rich client, loved her look (${Math.round(score.total)}/100) and paid in full.`, 3).brags }
      : {}),
    rep: clamp(s.rep + (st.repDelta > 0 ? st.repDelta * (1 + coolNow(s) * 0.6) : st.repDelta), 0, 100),
    stock,
    productSales,
    colourMisses,
    regulars,
    today,
    stats: { ...s.stats, served: s.stats.served + (sold ? 1 : 0), totalEarned: s.stats.totalEarned + (sold ? st.paid + st.tip - st.cost : 0), bestScore: Math.max(s.stats.bestScore, score.total) },
  };
  if (sold) {
    const customerReceiptLabel = c.celebrity
      ? `${c.name} · celebrity payment including tip`
      : `${c.name}${c.service ? ` (${c.service === 'makeup' ? 'makeup' : c.service === 'both' ? 'hair & makeup' : 'hair'})` : ''}${st.tip ? ', with tip' : ''}`;
    next = money(next, st.paid + st.tip, customerReceiptLabel);
    next = money(next, -st.cost, c.celebrity && score.total >= 80 ? 'Celebrity order fulfilment, sourcing & tailoring' : 'Hair and makeup supplies');
  }
  if (c.influencer && score.total >= 80) next = { ...next, followers: (next.followers || 0) + Math.round(60 + Math.random() * 120) };
  let celebrityFollowerGain = 0;
  if (c.celebrity && sold && score.total >= 80) {
    const gained = Math.round((8_000 + Math.random() * 10_000) * (1 + c.celebrity.tier * 0.85));
    celebrityFollowerGain = gained;
    const rivals = next.rivals.map((r) => r.id === 'you' ? r : { ...r, feeling: clamp(r.feeling - (8 + c.celebrity!.tier * 3), -100, 100) });
    next = { ...next, followers: (next.followers || 0) + gained, rep: clamp(next.rep + 3 + c.celebrity.tier * 2, 0, 100), rivals,
      today: { ...next.today, events: [...next.today.events, `TRENDING IN LAGOS: ${c.name} paid ${naira(st.paid + st.tip)} including a ${naira(st.tip)} tip, then posted your look. +${gained?.toLocaleString('en-NG')} followers. Rivals are watching.`] } };
  }
  if (c.celebrity) {
    const currentBrand = getBrandMetrics(next);
    const bought = sold && st.paid > 0;
    const premiumOrder = bought && score.total >= 80;
    const rank = c.celebrity.tier;
    next = {
      ...next,
      brand: {
        ...currentBrand,
        awareness: clamp(currentBrand.awareness + (premiumOrder ? 1.0 + rank * 0.25 : bought ? 0.25 : -0.15), 5, 100),
        prestige: clamp(currentBrand.prestige + (premiumOrder ? 0.45 + rank * 0.15 : bought ? 0.10 : -0.25), 5, 100),
        trendInfluence: clamp(currentBrand.trendInfluence + (premiumOrder ? 0.7 + rank * 0.25 : bought ? 0.25 : -0.30), 5, 100),
      },
    };
    next = announceCelebrityVisit(next, {
      shopId: 'you',
      shopName: 'Asanwa Boutique',
      ownerName: 'Divine',
      celebrityName: `${c.name} · ${c.celebrity.rank}`,
      spend: st.paid + st.tip,
      bought,
      premiumOrder,
      followerGain: celebrityFollowerGain,
    });
  }
  if (c.contest) next = judge(next, c, score.total);
  next = depart(next, c, lookOut, sold);
  return next;
}

export function turnAway(s: GameState, id?: string): GameState {
  const v = visitor(s, id ?? s.serving);
  if (!v) return s;
  const next = depart(s, v.c, v.c.look, false);
  return { ...next, rep: clamp(s.rep - 0.5, 0, 100), today: { ...next.today, lost: next.today.lost + 1, repChange: next.today.repChange - 0.5 } };
}

/** What a staff member does on their own with the displayed stock. */
export function staffChoice(s: GameState, c: Customer): StyleChoice | null {
  const shown = s.stock.filter((d) => d.displayed && d.pieces > 0);
  const choice: StyleChoice = {};
  if (c.service) {
    const want = c.wants.find((w) => w.kind === 'hair') as { kind: 'hair'; group: string } | undefined;
    choice.hair = want && want.group !== 'male' ? FEMALE_HAIR.find((h) => hairGroup(h.id) === want.group)?.id || c.look.hair : c.look.hair;
    if (c.service !== 'hair' && !c.male) choice.makeup = { ...MAKEUP_LOOKS[c.wants.some((w) => w.kind === 'glam') ? 2 : 1].makeup };
    return choice;
  }
  const opts = shown.filter((d) => {
    const m = entryFor(d.kind, d.itemId);
    return !!m && (m.for === 'both' || m.for === (c.male ? 'm' : 'f'));
  });
  const dress = opts.filter((d) => d.kind === 'dress');
  const tops = opts.filter((d) => d.kind === 'top');
  const bottoms = opts.filter((d) => d.kind === 'bottom');
  const shoes = opts.filter((d) => d.kind === 'shoes');
  if (dress.length && (chance(0.5) || !tops.length || !bottoms.length)) choice.dress = pick(dress).uid;
  else if (tops.length && bottoms.length) { choice.top = pick(tops).uid; choice.bottom = pick(bottoms).uid; }
  else return null;
  if (shoes.length) choice.shoes = pick(shoes).uid;
  choice.hair = c.look.hair;
  return choice;
}

function staffFinish(s: GameState, c: Customer, m: StaffMember): GameState {
  const choice = staffChoice(s, c);
  if (!choice) return depart({ ...s, today: { ...s.today, lost: s.today.lost + 1 } }, c, c.look, false);
  const cost = lookCost(c, choice, s.stock);
  const base = scoreInShop(s, c, choice);
  const total = Math.round(clamp(base.total * (0.62 + 0.035 * m.level), 0, 100));
  const score = { ...base, total };
  const price = Math.min(cost.fair, c.budget);
  const st = settle(c, score, price, cost.consumables);
  const next = applyLook(s, c, choice, st, score);
  return { ...next, today: { ...next.today, staffServed: next.today.staffServed + (st.outcome === 'walked' || st.outcome === 'refused' ? 0 : 1) } };
}

// ---------------------------------------------------------------------------
// End of day: running costs, weekly wages, staff drama, rent
// ---------------------------------------------------------------------------
export function closeShop(s0: GameState): GameState {
  // Closing is a once-per-day transaction: a duplicate close must not charge
  // wages, rent, branch costs, or banking a second time.
  if (s0.phase === 'evening') return s0;
  let s = s0;
  // anyone still here goes home
  const sentHome = s.inShop.length;
  for (const v of s.inShop) s = depart(s, v.c, v.c.look, false);
  if (sentHome) s = { ...s, today: { ...s.today, lost: s.today.lost + sentHome, closedOn: (s.today.closedOn || 0) + sentHome } };
  s = { ...s, arrivals: [], serving: null, clock: Math.max(s.clock, 0) };
  const t = { ...TIERS[s.tier], rent: s.listing.rent };
  s = { ...s, power: { ...s.power, gen: false }, busy: null };
  const d = s.today;
  const ev: string[] = [];
  if (d.impatient) ev.push(`${d.impatient} customer${d.impatient > 1 ? 's' : ''} got tired of waiting and left.`);
  if (d.doorLost) ev.push(`${d.doorLost} turned back at the door: no space to wait. More seats would keep them.`);
  if (d.outageMinutes) {
    const h = Math.floor(d.outageMinutes / 60);
    const m = Math.round(d.outageMinutes % 60);
    ev.push(`NEPA took light for ${h ? `${h}h ` : ''}${m}m of opening time.`);
  }
  if (d.heatLost) ev.push(`${d.heatLost} walked past a dark, hot shop without coming in.`);
  if (d.litres) ev.push(`Bought ${Math.round(d.litres * 10) / 10} litres of fuel for ${naira(d.fuel || 0)}.`);
  if (d.closedOn) ev.push(`${d.closedOn} ${d.closedOn > 1 ? 'were' : 'was'} still waiting at closing time and went home.`);
  s = { ...s, today: { ...s.today, events: [...s.today.events, ...ev] } };
  s = processExpansionAtClose(s);
  s = processPromotionAtClose(s);

  // Settle weekly obligations before calculating rent savings. Account transfers
  // are not expenses and must not reduce profit or count twice in the ledger.
  if (s.day % 7 === 0) {
    s = weeklyStaff(s);
    if (s.security?.guard) {
      const wage = s.security.guard.wage;
      s = money({ ...s, today: { ...s.today, costs: s.today.costs + wage, events: [...s.today.events, `Paid ${naira(wage)} in security wages.`] } }, -wage, `Security guard wages: ${s.security.guard.name}`);
    }
    s = payBills(s);
    s = processBankWeekly(s);
  }

  // Fixed deposits mature on their exact due day, not only on weekly banking days.
  s = processFixedDepositMaturities(s);
  // Treasury bills mature daily; bonds pay weekly coupons and repay at maturity.
  s = processInvestments(s);

  // Clear any old rent arrears from the Rent Vault and available cash before
  // saving for the next bill or creating a new rent liability.
  s = settleLateRent(s);
  s = saveRentAtClose(s);
  s = autoSaveAtClose(s);
  s = closeGramDay(s);

  if (s.day % 7 === 0) {
    s = payRent(s);
    s = { ...s, followers: Math.round((s.followers || 0) * 0.98) };
  } else if (daysToRent(s.day) === 2) {
    s = msg(s, 'Landlord', `Good evening madam. Rent of ${naira(t.rent)} is due in 2 days.${s.cash < t.rent ? ` You have ${naira(s.cash)}. Don't let me come and lock this shop.` : ''}`, s.cash < t.rent ? 'danger' : 'warn');
  }
  // late rent: the grace period runs out
  if (s.lateRent && s.day >= s.lateRent.due) {
    if (s.lateRent.amount > 0) s = demote(s);
    else s = msg({ ...s, lateRent: null }, 'Landlord', 'Thank you, the rent is cleared.', 'good');
  }
  // Keep the old score only for legacy save compatibility; public-facing progression uses Brand Power.
  s = { ...s, rep: clamp(s.rep - (s.rep - 40) * 0.03, 0, 100) };
  s = closeBrandDay(s);
  const history = [...s.history, s.today].slice(-120);
  s = { ...s, history };
  s = simulateRivals(s);
  // now and then Deborah has gist
  if (s.day > 2 && Math.random() < 0.25 && !(s.convos || []).some((c) => c.with === 'Deborah' && !c.done)) s = startGist(s);
  s = planEvents(s);
  s = planTips(s);
  s = planSponsorshipOffer(s);
  s = resolveDueCollaborations(s);
  // closeShop records today's history before resolving due events; refresh that log
  // so collaboration payouts count in weekly performance and end-of-day summaries.
  if (s.history.length && s.history[s.history.length - 1].day === s.day) {
    s = { ...s, history: [...s.history.slice(0, -1), s.today] };
  }
  if (s.day % 7 === 0) s = recordWeeklyWealth(s);
  const finalToday = { ...s.today, closingCash: Math.round(s.cash) };
  const finalHistory = s.history.length && s.history[s.history.length - 1].day === s.day
    ? [...s.history.slice(0, -1), finalToday]
    : s.history;
  return { ...s, today: finalToday, history: finalHistory, phase: 'evening', visit: null };
}

export function nextMorning(s: GameState): GameState {
  let next = planDrop({ ...s, day: s.day + 1, weather: weatherForDay(s.day + 1, s.seed), phase: 'morning', ...freshDay, busy: null, energy: ENERGY.max, today: emptyLog(s.day + 1, s.cash) });
  next = seasonChange(next, s.day);
  return ensurePoliticianContractOffer(next);
}

const SEASON_NEWS: Record<SeasonId, { deborah: string; title: string; body: string }> = {
  harmattan: { deborah: 'Harmattan don land, sis! Mornings go cold, dust everywhere. Stock jackets and covered looks, and keep the clothes covered.', title: 'Harmattan is here: layer up, Lagos 🧥', body: 'Cold dusty mornings and hot afternoons. Stylists are pushing jackets, shawls and covered silhouettes, with lip balm on standby.' },
  hotSeason: { deborah: 'The heat don start o. Customers go sweat for that shop if no cooling. Make sure the fans and AC dey work.', title: 'Hot season: Lagos is boiling ☀️', body: 'Breathable fabrics and light colours are moving fast. Boutiques without proper cooling are losing customers to the ones with AC.' },
  rains: { deborah: 'Rainy season don start. Fewer people go waka come shop, and NEPA go dey misbehave. Get canopy for the door and keep fuel.', title: 'The rains are back 🌧️', body: 'Expect flooded roads, fewer walk-ins and lots of blackouts. Flats over heels this season.' },
  augustBreak: { deborah: 'August break! The rain go rest small. Nice weather to push sales, sis.', title: 'August break: the rain takes a breather ⛅', body: 'Cool, cloudy days and dry roads. Perfect weather for shopping and outdoor shoots.' },
  lateRains: { deborah: 'The rain don come back for last round. Storms for evening, so plan well.', title: 'Late rains: one more round of storms ⛈️', body: 'September and October bring the last heavy rains of the year. Waterproof everything.' },
  drySeason: { deborah: 'Dry season don come. Owambe season dey near, December go busy!', title: 'Dry season: owambe season loading 🎉', body: 'The roads are dry and the party calendar is filling up. Native wear and gele bookings are about to spike.' },
};

/** A new season starts: Deborah warns you and the fashion blog writes about it. */
function seasonChange(s: GameState, previousDay: number): GameState {
  const now = seasonOf(s.day);
  let next = s;
  if (now.id !== seasonOf(previousDay).id) {
    const news = SEASON_NEWS[now.id];
    next = msg(next, 'Deborah', news.deborah, 'info');
    next = blogPost(next, news.title, news.body, undefined, true);
  }
  if (festive(s.day) && !festive(previousDay)) {
    next = msg(next, 'Deborah', 'Detty December is here!! Owambe, weddings, end of year parties. Expect more customers and lots of native and gele requests.', 'good');
  }
  return next;
}

/** Add a message to a specific WhatsApp thread without invoking a model call. */
function refreshEveningHistory(s: GameState): GameState {
  if (s.phase !== 'evening' || !s.history.length || s.history[s.history.length - 1].day !== s.day) return s;
  return { ...s, history: [...s.history.slice(0, -1), s.today] };
}

function collaborationChatMessage(s: GameState, chat: string, from: string, text: string, tone: Message['tone'] = 'info'): GameState {
  const id = (s.msgSeq || 0) + 1;
  const message: Message = {
    id, day: s.day, from, chat, text, tone,
    t: s.phase === 'shop' ? Math.floor(s.clock) : undefined,
  };
  return { ...s, msgSeq: id, messages: [message, ...(s.messages || [])].slice(0, 160) };
}

function collaborationOutcome(s0: GameState, messageId: number, outcome: NonNullable<Message['collaborationOutcome']>, text: string): GameState {
  const message = s0.messages.find((m) => m.id === messageId);
  if (!message) return s0;
  const chat = message.from;
  const messages = s0.messages.map((m) => m.id === messageId ? { ...m, collaborationOutcome: outcome } : m);
  return collaborationChatMessage({ ...s0, messages }, chat, 'You', text);
}

/** Commit to an AI-negotiated pop-up only after Divine explicitly accepts the offer. */
export function confirmCollaboration(s0: GameState, messageId: number): GameState {
  const message = s0.messages.find((m) => m.id === messageId);
  const offer = message?.collaboration;
  if (!message || message.from === 'You' || message.chat === 'Lagos Fashion Babes' ||
      message.collaborationOutcome || !offer || (offer.decision !== 'accept' && offer.decision !== 'counter')) return s0;

  const partner = (s0.rivals || []).find((r) => r.owner === message.from && r.main);
  if (!partner) return s0;
  const active = (s0.collaborations || []).some((event) => event.partnerId === partner.id && event.status === 'scheduled');
  if (active) {
    return collaborationOutcome(s0, messageId, 'already_booked', 'I already have a pop-up scheduled with you. Let’s finish that one before booking another.');
  }

  const tierBudgetMax = [250_000, 2_000_000, 10_000_000, 50_000_000, 150_000_000, 300_000_000, 600_000_000][clamp(s0.tier, 0, 6)];
  const cashBudgetMax = Math.max(25_000, Math.min(tierBudgetMax, Math.max(0, s0.cash) * 2 + Math.max(0, partner.cash) * 2));
  const totalCost = Math.round(clamp(Number.isFinite(offer.totalCost) ? offer.totalCost : 20000, 15_000, cashBudgetMax) / 2500) * 2500;
  const playerCostSharePct = Math.round(Math.max(10, Math.min(90, Number.isFinite(offer.playerCostSharePct) ? offer.playerCostSharePct : 50)));
  const playerProfitSharePct = Math.round(Math.max(10, Math.min(90, Number.isFinite(offer.playerProfitSharePct) ? offer.playerProfitSharePct : 50)));
  const dayOffset = Math.round(Math.max(3, Math.min(14, Number.isFinite(offer.dayOffset) ? offer.dayOffset : 7)));
  const eventName = typeof offer.eventName === 'string' && offer.eventName.trim()
    ? offer.eventName.trim().slice(0, 80)
    : 'Asanwa Boutique x ' + partner.shop + ' Fashion Pop-up';
  const playerContribution = Math.round(totalCost * playerCostSharePct / 100);
  const partnerContribution = totalCost - playerContribution;

  if (s0.cash < playerContribution) {
    return collaborationOutcome(s0, messageId, 'unaffordable', 'I can’t commit to the pop-up yet — my share is ' + naira(playerContribution) + ', and I don’t have enough cash available. Let’s discuss a smaller budget.');
  }
  if (partner.cash < partnerContribution) {
    return collaborationOutcome(s0, messageId, 'partner_unable', 'The plan sounds good, but you can’t currently cover your ' + naira(partnerContribution) + ' share from the boutique’s available funds. We need to agree on a smaller budget first.');
  }

  const event: CollaborationEvent = {
    id: 'collab-' + s0.day + '-' + partner.id + '-' + messageId,
    partnerId: partner.id,
    partnerName: partner.owner,
    eventName,
    day: s0.day + dayOffset,
    createdDay: s0.day,
    totalCost,
    playerCostSharePct,
    playerProfitSharePct,
    status: 'scheduled',
  };
  let s = money(s0, -playerContribution, 'Pop-up setup share with ' + partner.owner);
  s = {
    ...s,
    rivals: s.rivals.map((r) => r.id === partner.id ? { ...r, cash: r.cash - partnerContribution, feeling: clamp(r.feeling + 3, -100, 100) } : r),
    collaborations: [...(s.collaborations || []), event].slice(-30),
    today: {
      ...s.today,
      costs: s.today.costs + playerContribution,
      events: [...s.today.events, 'Committed ' + naira(playerContribution) + ' to ' + eventName + ', scheduled for Day ' + event.day + '.'],
    },
    messages: s.messages.map((m) => m.id === messageId ? { ...m, collaborationOutcome: 'scheduled', collaborationScheduledDay: event.day } : m),
  };
  s = collaborationChatMessage(s, partner.owner, 'You',
    'Deal confirmed: ' + eventName + ' on Day ' + event.day + '. Total setup budget ' + naira(totalCost) +
    '; my contribution is ' + naira(playerContribution) + ' and my agreed profit share is ' + playerProfitSharePct + '%. Let’s make it work.');
  return refreshEveningHistory(s);
}

/** Decline an offer without spending money or changing the rival relationship score. */
export function declineCollaboration(s0: GameState, messageId: number): GameState {
  const message = s0.messages.find((m) => m.id === messageId);
  const offer = message?.collaboration;
  if (!message || message.from === 'You' || message.chat === 'Lagos Fashion Babes' ||
      message.collaborationOutcome || !offer || (offer.decision !== 'accept' && offer.decision !== 'counter')) return s0;
  return collaborationOutcome(s0, messageId, 'declined', 'I’ll pass on this pop-up proposal for now. We can discuss another idea later.');
}

/** Resolve scheduled pop-ups at closing time on their event day. All payouts are engine-calculated. */
function resolveDueCollaborations(s0: GameState): GameState {
  let s = s0;
  for (const event0 of [...(s.collaborations || [])].filter((item) => item.status === 'scheduled' && item.day <= s.day)) {
    const event = (s.collaborations || []).find((item) => item.id === event0.id);
    const partner = (s.rivals || []).find((r) => r.id === event0.partnerId);
    if (!event || !partner) continue;
    const totalCost = Math.max(1, event.totalCost);
    const playerCostSharePct = Math.max(10, Math.min(90, event.playerCostSharePct));
    const playerProfitSharePct = Math.max(10, Math.min(90, event.playerProfitSharePct));
    const playerContribution = Math.round(totalCost * playerCostSharePct / 100);
    const partnerContribution = totalCost - playerContribution;

    // Sales vary with both businesses' reputations and audience, then random market conditions.
    const reputationFactor = 0.82 + (Math.max(0, Math.min(100, s.rep)) / 100) * 0.22 + (Math.max(0, Math.min(100, partner.rep)) / 100) * 0.13;
    const audienceFactor = 0.9 + Math.min(0.3, Math.sqrt(Math.max(0, (s.followers || 0) + partner.followers)) / 2500);
    const salesFactor = (0.4 + Math.random() * 1.8) * reputationFactor * audienceFactor;
    const grossRevenue = Math.max(0, Math.round(totalCost * salesFactor));
    const profit = grossRevenue - totalCost;
    // Profits use the negotiated profit split. If the event loses money, the loss follows each side's capital contribution.
    const playerRate = (profit >= 0 ? playerProfitSharePct : playerCostSharePct) / 100;
    const partnerRate = 1 - playerRate;
    const playerPayout = Math.max(0, Math.round(playerContribution + profit * playerRate));
    const partnerPayout = Math.max(0, Math.round(partnerContribution + profit * partnerRate));

    s = money(s, playerPayout, 'Pop-up payout from ' + event.eventName);
    s = {
      ...s,
      rivals: s.rivals.map((r) => r.id === partner.id ? { ...r, cash: r.cash + partnerPayout, rep: clamp(r.rep + (profit >= 0 ? 0.5 : -0.3), 0, 100), feeling: clamp(r.feeling + (profit >= 0 ? 5 : -8), -100, 100), followers: r.followers + (profit > 0 ? Math.min(150, Math.max(10, Math.round(profit / 1500))) : 0) } : r),
      rep: clamp(s.rep + (profit > 0 ? Math.min(2, Math.max(0.3, profit / 60000)) : profit < 0 ? -0.8 : 0), 0, 100),
      followers: (s.followers || 0) + (profit > 0 ? Math.min(250, Math.max(15, Math.round(profit / 1000))) : 0),
      today: {
        ...s.today,
        income: s.today.income + playerPayout,
        events: [...s.today.events, eventNameForLog(event, grossRevenue, profit, playerPayout)],
      },
      collaborations: (s.collaborations || []).map((item) => item.id === event.id
        ? { ...item, status: 'completed', grossRevenue, profit, playerPayout, partnerPayout }
        : item),
    };
    const note = profit >= 0
      ? event.eventName + ' with ' + partner.owner + ' brought in ' + naira(grossRevenue) + '. After the costs, the event profit was ' + naira(profit) + '; your payout was ' + naira(playerPayout) + '.'
      : event.eventName + ' with ' + partner.owner + ' brought in ' + naira(grossRevenue) + ', below the setup cost of ' + naira(totalCost) + '. The event lost ' + naira(Math.abs(profit)) + '; your payout was ' + naira(playerPayout) + '.';
    const gistItem = { id: 'collab-gist-' + event.id, day: s.day, title: 'Pop-up results: ' + event.eventName, body: note, about: 'you', hot: profit < 0 };
    s = { ...s, gist: [gistItem, ...(s.gist || [])].slice(0, 40) };
    s = collaborationChatMessage(s, partner.owner, partner.owner, note, profit < 0 ? 'warn' : 'good');
  }
  return s;
}

function eventNameForLog(event: CollaborationEvent, grossRevenue: number, profit: number, payout: number): string {
  return event.eventName + ': sales ' + naira(grossRevenue) + ', event profit ' + naira(profit) + ', Divine payout ' + naira(payout) + '.';
}

function planSponsorshipOffer(s0: GameState): GameState {
  const offers = (s0.sponsorshipOffers || []).map((offer) =>
    offer.status === 'offered' && s0.day > offer.expiresDay ? { ...offer, status: 'expired' as const } : offer);
  const state = offers.length === (s0.sponsorshipOffers || []).length && offers.every((offer, i) => offer === (s0.sponsorshipOffers || [])[i])
    ? s0 : { ...s0, sponsorshipOffers: offers };
  const pending = offers.some((offer) => offer.status === 'offered' && state.day <= offer.expiresDay);
  if (pending || state.day % 7 !== 4 || (state.lastSponsorshipDay !== undefined && state.day - state.lastSponsorshipDay < 14)) return state;
  const followers = Math.max(0, state.followers || 0);
  const tier = followers >= 500_000 ? 4 : followers >= 100_000 ? 3 : followers >= 25_000 ? 2 : followers >= 5_000 ? 1 : followers >= 1_000 ? 0 : -1;
  if (tier < 0 || Math.random() > 0.68) return state;
  const bands = [
    { threshold: 1_000, sponsor: 'Lagos Style Collective', min: 15_000, max: 60_000, followers: 40 },
    { threshold: 5_000, sponsor: 'Naija Fashion Market', min: 50_000, max: 200_000, followers: 120 },
    { threshold: 25_000, sponsor: 'StyleHouse Media', min: 250_000, max: 900_000, followers: 350 },
    { threshold: 100_000, sponsor: 'Luxe Africa Campaigns', min: 1_000_000, max: 4_000_000, followers: 1_200 },
    { threshold: 500_000, sponsor: 'National Fashion Awards', min: 8_000_000, max: 25_000_000, followers: 8_000 },
  ];
  const band = bands[tier];
  const power = getBrandMetrics(state);
  const engagement = clamp((power.awareness * 0.25 + power.loyalty * 0.5 + power.reliability * 0.25) / 75, 0.65, 1.35);
  const offer: SponsorshipOffer = {
    id: 'sponsor-' + state.day + '-' + Math.random().toString(36).slice(2, 8),
    sponsor: band.sponsor,
    day: state.day,
    expiresDay: state.day + 3,
    followersRequired: band.threshold,
    payout: Math.round((band.min + Math.random() * (band.max - band.min)) * engagement / 5000) * 5000,
    bonusFollowers: Math.round(band.followers * engagement),
    status: 'offered',
  };
  const id = (state.msgSeq || 0) + 1;
  const message: Message = {
    id, day: state.day, from: offer.sponsor,
    text: 'Your audience is growing. We would like to sponsor a Gidigram campaign for Asanwa Boutique. We can pay ' + naira(offer.payout) + ' for a branded fashion post, with an extra audience boost if you accept. This offer expires after Day ' + offer.expiresDay + '.',
    tone: 'good', t: -1,
    choices: [{ id: 'accept', label: 'Accept sponsorship' }, { id: 'decline', label: 'Decline offer' }],
    ctx: { kind: 'sponsorship', offerId: offer.id },
  };
  return {
    ...state, msgSeq: id, messages: [message, ...(state.messages || [])].slice(0, 160),
    sponsorshipOffers: [...offers, offer].slice(-40), lastSponsorshipDay: state.day,
  };
}

function answerSponsorship(s0: GameState, message: Message, choice: ReplyChoice['id']): GameState {
  const offerId = message.ctx?.offerId;
  const offer = (s0.sponsorshipOffers || []).find((item) => item.id === offerId);
  if (!offer || offer.status !== 'offered') return s0;
  let s: GameState = { ...s0, messages: s0.messages.map((item) => item.id === message.id ? { ...item, answered: choice } : item) };
  if (s.day > offer.expiresDay) {
    s = { ...s, sponsorshipOffers: (s.sponsorshipOffers || []).map((item) => item.id === offer.id ? { ...item, status: 'expired' as const } : item) };
    return msg(s, offer.sponsor, 'That campaign offer has expired. We may contact you again when your audience grows.', 'warn');
  }
  if (choice !== 'accept') {
    s = { ...s, sponsorshipOffers: (s.sponsorshipOffers || []).map((item) => item.id === offer.id ? { ...item, status: 'declined' as const } : item) };
    return msg(s, offer.sponsor, 'No worries. Thank you for considering the offer; we will keep Asanwa Boutique on our list for future campaigns.', 'info');
  }
  s = money(s, offer.payout, 'Sponsored campaign: ' + offer.sponsor);
  const brand = getBrandMetrics(s);
  s = {
    ...s,
    followers: (s.followers || 0) + offer.bonusFollowers,
    brand: { ...brand, awareness: clamp(brand.awareness + 1.2, 5, 100), trendInfluence: clamp(brand.trendInfluence + 0.8, 5, 100) },
    today: { ...s.today, income: s.today.income + offer.payout, events: [...s.today.events, 'Sponsored campaign from ' + offer.sponsor + ' earned ' + naira(offer.payout) + '.'] },
    sponsorshipOffers: (s.sponsorshipOffers || []).map((item) => item.id === offer.id ? { ...item, status: 'accepted' as const } : item),
  };
  s = { ...s, gist: [{ id: 'sponsor-gist-' + offer.id, day: s.day, title: 'Asanwa Boutique lands a sponsored campaign', body: offer.sponsor + ' paid ' + naira(offer.payout) + ' for a Gidigram campaign. Divine gained ' + offer.bonusFollowers + ' followers.', about: 'you', hot: false }, ...(s.gist || [])].slice(0, 40) };
  return refreshEveningHistory(msg(s, offer.sponsor, 'The partnership is confirmed. Your payment is on its way, and we have shared your campaign with our fashion audience.', 'good'));
}

/** A reply picked in WhatsApp. */
export function answerMessage(s: GameState, msgId: number, choice: ReplyChoice['id']): GameState {
  const m = s.messages.find((x) => x.id === msgId);
  if (!m) return s;
  if (m.ctx?.kind === 'invite') return answerInvite(s, m, choice);
  if (m.ctx?.kind === 'sponsorship') return answerSponsorship(s, m, choice);
  if (m.convo) return answerConvo(s, msgId, choice);
  return answerRival(s, msgId, choice);
}

export { answerVisit, buyDrop, contestFor, noteVisit, rivalShop, VISIT_CHOICES } from './encounters';

export function settleLateRent(s0: GameState): GameState {
  const late = s0.lateRent;
  if (!late || late.amount <= 0) return late ? { ...s0, lateRent: null } : s0;

  const bank = s0.bank || initialBankState();
  const vaultPaid = Math.min(Math.max(0, bank.rentVault), late.amount);
  const cashDue = late.amount - vaultPaid;
  const cashPaid = Math.min(Math.max(0, s0.cash), cashDue);
  const unpaid = Math.max(0, late.amount - vaultPaid - cashPaid);
  if (vaultPaid === 0 && cashPaid === 0) return s0;

  let next: GameState = {
    ...s0,
    bank: { ...bank, rentVault: bank.rentVault - vaultPaid },
    lateRent: unpaid > 0 ? { ...late, amount: unpaid } : null,
    today: {
      ...s0.today,
      events: [...s0.today.events, `Paid ${naira(vaultPaid + cashPaid)} toward overdue rent${unpaid ? `; ${naira(unpaid)} remains` : ''}.`],
    },
  };
  if (vaultPaid > 0) {
    next = {
      ...next,
      ledger: [{ day: next.day, t: -1, label: 'Overdue rent paid from Rent Vault', amount: -vaultPaid }, ...(next.ledger || [])].slice(0, 500),
    };
  }
  if (cashPaid > 0) next = money(next, -cashPaid, 'Overdue rent payment');
  return next;
}

/** Pay the landlord directly before the weekly rent run; any advance is credited once. */
export function payRentEarly(s0: GameState, amount: number): GameState {
  const requested = Math.round(amount);
  const arrears = Math.max(0, s0.lateRent?.amount || 0);
  const prepaid = Math.max(0, Math.round(s0.rentPrepaid || 0));
  const rentRemaining = Math.max(0, Math.round(s0.listing.rent) - prepaid);
  const maximumPayable = arrears + rentRemaining;
  // Reject an invalid or unaffordable amount instead of silently making a partial payment.
  if (!Number.isFinite(amount) || requested <= 0 || requested > Math.max(0, s0.cash) || requested > maximumPayable) return s0;

  const arrearsPaid = Math.min(requested, arrears);
  const advancePaid = requested - arrearsPaid;
  const arrearsRemaining = arrears - arrearsPaid;
  const t = s0.phase === 'shop' ? Math.floor(s0.clock) : -1;
  const entries: GameState['ledger'] = [];
  if (advancePaid > 0) entries.push({
    day: s0.day, t, label: 'Advance rent paid to ' + s0.listing.landlord, amount: -advancePaid, category: 'operating',
  });
  if (arrearsPaid > 0) entries.push({
    day: s0.day, t, label: 'Overdue rent paid to ' + s0.listing.landlord, amount: -arrearsPaid, category: 'operating',
  });

  let next: GameState = {
    ...s0,
    cash: Math.max(0, s0.cash - requested),
    rentPrepaid: prepaid + advancePaid,
    lateRent: s0.lateRent ? (arrearsRemaining > 0 ? { ...s0.lateRent, amount: arrearsRemaining } : null) : null,
    ledger: [...entries, ...(s0.ledger || [])].slice(0, 500),
    today: {
      ...s0.today,
      // Overdue rent was already charged when it fell due; only new advance rent is a new cost today.
      costs: (s0.today?.costs || 0) + advancePaid,
      events: [...(s0.today?.events || []), 'Paid ' + naira(requested) + ' directly to ' + s0.listing.landlord + '.'
        + (arrearsPaid ? ' Overdue rent cleared: ' + naira(arrearsPaid) + '.' : '')
        + (advancePaid ? ' Advance rent credit: ' + naira(advancePaid) + '.' : '')],
    },
  };
  const message = arrearsRemaining > 0
    ? 'Thank you. ' + naira(arrearsPaid) + ' has been applied to your overdue rent; ' + naira(arrearsRemaining) + ' remains due by Day ' + s0.lateRent!.due + '.'
    : advancePaid > 0
      ? 'Payment received. ' + naira(advancePaid) + ' has been credited toward your upcoming rent. I will deduct it from the next rent bill, so you will not pay that amount twice.'
      : 'Thank you. Your overdue rent has been cleared.';
  next = msg(next, 'Landlord', message, arrearsRemaining > 0 ? 'warn' : 'good');
  return next;
}

export function payRent(s: GameState): GameState {
  const rent = Math.max(0, Math.round(s.listing.rent));
  const bank = s.bank || initialBankState();
  const prepaid = Math.min(Math.max(0, Math.round(s.rentPrepaid || 0)), rent);
  const remainingRent = rent - prepaid;
  const vaultPaid = Math.min(Math.max(0, bank.rentVault), remainingRent);
  const afterVault = remainingRent - vaultPaid;
  // Advance payments, the Rent Vault, and current cash are applied in that order.
  // Only the unpaid remainder becomes a liability, and previously paid rent is never charged twice.
  const cashPaid = Math.min(Math.max(0, s.cash), afterVault);
  const unpaid = Math.max(0, remainingRent - vaultPaid - cashPaid);
  const bankAfter = { ...bank, rentVault: bank.rentVault - vaultPaid };
  let next: GameState = {
    ...s,
    bank: bankAfter,
    rentPrepaid: Math.max(0, Math.max(0, Math.round(s.rentPrepaid || 0)) - prepaid),
    today: {
      ...s.today,
      costs: (s.today?.costs || 0) + remainingRent,
      events: [...(s.today?.events || []), `Rent bill ${naira(rent)}; advance payment covered ${naira(prepaid)}, Rent Vault paid ${naira(vaultPaid)}, current account paid ${naira(cashPaid)}${unpaid ? `, unpaid balance ${naira(unpaid)}` : ''}.`],
    },
  };
  if (vaultPaid > 0) {
    next = {
      ...next,
      ledger: [{ day: next.day, t: -1, label: 'Rent paid from Rent Vault', amount: -vaultPaid }, ...(next.ledger || [])].slice(0, 500),
    };
  }
  if (cashPaid > 0) next = money(next, -cashPaid, 'Rent');
  if (unpaid > 0) {
    const previous = next.lateRent;
    const totalOwed = unpaid + Math.max(0, previous?.amount || 0);
    const due = previous?.due ?? (s.day + s.grace);
    next = { ...next, lateRent: { amount: totalOwed, due } };
    return msg(next, 'Landlord', s.grace === 0
      ? `Rent is short by ${naira(totalOwed)}. Clear it today or you move out.`
      : `Rent is short by ${naira(totalOwed)}. You have ${s.grace} day${s.grace > 1 ? 's' : ''} to clear it. If it remains unpaid by day ${due}, you move to a smaller shop.`, 'danger');
  }
  return msg(next, 'Landlord', prepaid > 0
    ? (remainingRent === 0
      ? `Rent of ${naira(rent)} is fully covered by your ${naira(prepaid)} advance payment. See you next week.`
      : `Rent of ${naira(rent)} received; ${naira(prepaid)} was paid early and the remaining ${naira(remainingRent)} is now settled. See you next week.`)
    : `Rent of ${naira(rent)} received. See you next week.`, 'info');
}

export function demote(s: GameState): GameState {
  if (s.tier === 0) return msg({ ...s, lateRent: s.lateRent ? { ...s.lateRent, due: s.day + 7 } : null }, 'Landlord', 'This kiosk is the last stop. I will let the debt run for another week, but pay me soon.', 'danger');
  const tier = s.tier - 1;
  const t = TIERS[tier];
  const listing = cheapestListing(tier, week(s.day));
  const furniture = arrangeShop(s.furniture.filter((f) => furnitureById(f.id).mount !== 'finish').map((f) => ({ ...f, placed: true })), listing);
  const staff = s.staff.slice(0, t.staff);
  const left = s.staff.slice(t.staff);
  const remainingRentDebt = Math.max(0, Math.ceil((s.lateRent?.amount || 0) * 0.5));
  let next: GameState = { ...s, tier, listing, furniture, staff, lateRent: remainingRentDebt > 0 ? { amount: remainingRentDebt, due: s.day + Math.max(1, listing.grace) } : null, movedDay: s.day, grace: listing.grace, stats: { ...s.stats, demotions: s.stats.demotions + 1 } };
  next = fitDisplay(next);
  next = msg(next, 'Landlord', `Time is up. Pack your things. You have been moved down to a ${t.name} on ${listing.street}, ${listing.area}. I've kept the deposit and waived half the debt.`, 'danger');
  next = reactToMove(next, false);
  if (left.length) next = msg(next, 'Deborah', `${left.map((x) => x.name).join(' and ')} had to go. There's no space for them in the new shop.`, 'warn');
  if (furniture.some((f) => !f.placed)) next = msg(next, 'Deborah', `Some furniture didn't fit in the smaller shop, so it's in storage.`, 'warn');
  return next;
}

/** Designs beyond the display space go back to storage. */
export function fitDisplay(s: GameState): GameState {
  const cap = displayCap(s);
  let shown = 0;
  const stock = s.stock.map((d) => {
    if (!d.displayed) return d;
    shown += 1;
    return shown > cap ? { ...d, displayed: false } : d;
  });
  return { ...s, stock };
}

// ---------------------------------------------------------------------------
// Moving up
// ---------------------------------------------------------------------------
export function moveUpCost(s: GameState) {
  if (s.tier + 1 >= TIERS.length) return null;
  return Math.min(...listingsNow(s).map((l) => l.moveIn));
}

/** The four shops to rent at the next size this week. */
export function listingsNow(s: GameState): Listing[] {
  if (s.tier + 1 >= TIERS.length) return [];
  return listingsFor(s.tier + 1, week(s.day));
}

export function moveTo(s0: GameState, l0: Listing, equipmentPlan: MoveEquipmentPlan = 'arrange', retainedStaffIds?: string[]): GameState {
  // Any currently offered tier can be selected, but relocating to the exact same listing is a no-op.
  if (l0.id === s0.listing.id || l0.tier < 0 || l0.tier >= TIERS.length) return s0;
  const staffLimit = TIERS[l0.tier].staff;
  const mustChooseStaff = s0.staff.length > staffLimit;
  // Never silently dismiss employees: a downward move requiring cuts must carry an explicit selection.
  if (mustChooseStaff && !retainedStaffIds) return s0;
  const retainedIds = retainedStaffIds ? new Set(retainedStaffIds) : new Set(s0.staff.map((member) => member.id));
  if (retainedIds.size > staffLimit || [...retainedIds].some((id) => !s0.staff.some((member) => member.id === id))) return s0;
  const fight = contestFor(s0, l0);
  const l = fight ? { ...l0, moveIn: l0.moveIn + fight.extra } : l0;
  const move = prepareFurnitureForMove(s0.furniture, l, equipmentPlan);
  if (s0.cash + move.saleProceeds < l.moveIn + move.packageCost) return s0;
  const s = fight ? wonListing(s0, l0) : s0;
  const tier = l.tier;
  const t = TIERS[tier];
  let next: GameState = { ...s, tier, listing: l, furniture: move.furniture, staff: s.staff.filter((member) => retainedIds.has(member.id)), movedDay: s.day, grace: l.grace };
  const departedStaff = s.staff.filter((member) => !retainedIds.has(member.id));
  if (departedStaff.length) next = msg(next, 'Deborah', `Before the move, you chose to part ways with ${departedStaff.map((member) => member.name).join(', ')} to fit the new shop's ${staffLimit} staff slot${staffLimit === 1 ? '' : 's'}. Their weekly wages will no longer be charged.`, 'good');
  // Credit sale proceeds before charging move-in so the transaction never creates a temporary payable.
  if (move.saleProceeds > 0) next = money(next, move.saleProceeds, 'Sold shop equipment during move');
  next = money(next, -l.moveIn, `Move-in: ${l.street}`);
  if (move.packageCost > 0) next = money(next, -move.packageCost, 'Ready-furnished shop package');
  next = fitDisplay(next);
  const equipmentMessage = equipmentPlan === 'store'
    ? ' I have put your reusable equipment in storage; the new shop starts empty, and you can bring items out from Build mode.'
    : equipmentPlan === 'sell'
      ? ` I sold your reusable shop equipment for ${naira(move.saleProceeds)} at the usual 40% resale value. Your clothing stock and business records are still yours.`
      : equipmentPlan === 'furnished'
        ? ` The ready-furnished package cost ${naira(move.packageCost)} and has been arranged for this shop. Your previously owned reusable equipment is safely in storage.`
        : (() => {
          const storedNames = move.furniture.filter((f) => !f.placed && furnitureById(f.id).mount !== 'finish').map((f) => furnitureById(f.id).name);
          const storedNote = storedNames.length ? ` ${storedNames.length} piece${storedNames.length === 1 ? '' : 's'} did not fit and went to storage: ${[...new Set(storedNames)].slice(0, 5).join(', ')}${storedNames.length > 5 ? ' and more' : ''}.` : '';
          return ` I set the shop up properly: till and window display by the door, rails along the walls, styling and fitting rooms at the back, and a seating area for waiting customers.${storedNote} You can still move anything in Build mode.`;
        })();
  next = msg(next, 'Deborah', `We moved! Welcome to your ${t.name} on ${l.street}, ${l.area}. Rent is ${naira(l.rent)} a week and the landlord is ${l.landlord}. The shop holds up to ${t.slots} designs.${equipmentMessage} It will be quiet for two weeks while people find us.`, 'good');
  next = reactToMove(next, !fight);
  if (t.staff && !s.staff.length) next = msg(next, 'Deborah', `You can hire staff now! Trainees are cheap and loyal; experts are good from day one but they leave for money.`, 'info');
  return next;
}

// ---------------------------------------------------------------------------
// Furniture
// ---------------------------------------------------------------------------
export function buyFurniture(s: GameState, id: string): GameState {
  const f = furnitureById(id);
  if (!f || s.cash < f.price || (f.minTier || 0) > s.tier) return s;
  const item: Placed = { uid: newUid(), id, x: 0, z: 0, rot: 0, placed: false };
  let furniture = s.furniture;
  let placedItem: Placed = item;
  if (f.mount === 'yard') {
    if (!outdoorRoomFor(furniture, id, s.listing)) return s;
    const previousActive = activeGeneratorUid(s);
    const knownFuel = { ...(s.power?.generatorFuel || {}) };
    if (previousActive && knownFuel[previousActive] === undefined) knownFuel[previousActive] = fuelOf(s, previousActive);
    const next = money({ ...s, power: { ...s.power, generatorFuel: knownFuel }, furniture: [...furniture, { ...item, placed: true, x: f.solar ? solarUsed(furniture) : yardUsed(furniture) }] }, -f.price, f.name);
    if (f.solar) return { ...next, power: { ...next.power, solar: (next.power?.solar || 0) + POWER_CFG.minutesPerPanel } };
    if (!f.gen) return next;
    // Every generator starts with its own 5-litre reserve.
    const generatorFuel = { ...(next.power?.generatorFuel || {}), [item.uid]: 5 };
    const primary = activeGeneratorUid({ ...next, power: { ...next.power, generatorFuel } });
    return { ...next, power: { ...next.power, generatorFuel, fuel: primary ? (generatorFuel[primary] ?? next.power.fuel ?? 0) : next.power.fuel } };
  }
  if (f.mount === 'finish') {
    // new paint goes over the old paint; new flooring replaces the old floor
    furniture = furniture.filter((p) => { const o = furnitureById(p.id); return o.mount !== 'finish' || (f.paint ? !o.paint : !o.floorTiles); });
    placedItem = { ...item, placed: true };
  } else if (f.mount === 'ceiling') {
    if (ceilingUsed(furniture) < ceilingCapacity(s.listing)) placedItem = { ...item, placed: true };
  } else if (f.mount === 'wall') {
    if (wallUsed(furniture) + f.w <= wallCapacity(s.listing)) placedItem = { ...item, placed: true, x: wallUsed(furniture) };
  } else placedItem = findSpot(furniture, s.listing, item) || item;
  return money({ ...s, furniture: [...furniture, placedItem] }, -f.price, f.name);
}

/** Hire a dedicated guard. A security post must be purchased and placed first. */
export function hireSecurityGuard(s: GameState): GameState {
  const post = s.furniture.find((p) => p.placed && p.id === 'securityPost');
  if (!post) return addShout(s, 'Security', 'Buy and place a small security post outside before hiring a guard.', 'warn');
  if (s.security?.guard) return s;
  const signing = 35_000;
  if (s.cash < signing) return addShout(s, 'Security', `You need ${naira(signing)} to hire a guard.`, 'warn');
  const guard = { id: `guard-${s.day}-${Math.random().toString(36).slice(2, 7)}`, name: ['Tunde', 'Chuka', 'Bashir', 'Emeka', 'Seyi'][Math.floor(Math.random() * 5)], wage: 18_000, look: generateRandomCustomer('styled') };
  let next = money({ ...s, today: { ...s.today, costs: s.today.costs + signing }, security: { ...(s.security || {}), guard, postUid: post.uid, gallons: s.security?.gallons || [] } }, -signing, 'Security guard signing fee');
  next = msg(next, 'Security', `${guard.name} has been hired. Weekly pay is ${naira(guard.wage)}. I will stay at the post and protect the shop.`, 'good');
  return next;
}

/** Buy fuel now; the courier trip happens in game time and can optionally refill a selected generator. */
export function startFuelTrip(s: GameState, litres: number, refillUid?: string): GameState {
  if (![5, 10, 20].includes(litres)) return s;
  if (s.security?.trip) return addShout(s, 'Security', 'A fuel trip is already in progress.', 'warn');
  const gen = refillUid ? s.furniture.find((p) => p.uid === refillUid && p.placed && !!furnitureById(p.id).gen) : undefined;
  if (refillUid && !gen) return addShout(s, 'Security', 'That generator is no longer available. Choose an installed generator.', 'warn');
  const cost = Math.round(litres * fuelPrice(s));
  if (s.cash < cost) return addShout(s, 'Security', `Fuel costs ${naira(cost)}. There is not enough cash for this trip.`, 'warn');
  const post = s.furniture.find((p) => p.placed && p.id === 'securityPost');
  const guardOnDuty = !!s.security?.guard && !!post;
  const total = guardOnDuty ? 58 : 92;
  let next = money({ ...s, security: { ...(s.security || {}), postUid: post?.uid || s.security?.postUid, gallons: s.security?.gallons || [], trip: { remaining: total, total, litres, cost, refillUid, carrier: guardOnDuty ? 'guard' : 'divine' } } }, -cost, `Fuel purchase: ${litres} L`);
  next = { ...next, today: { ...next.today, fuel: (next.today.fuel || 0) + cost, litres: (next.today.litres || 0) + litres, costs: next.today.costs + cost } };
  return addShout(next, guardOnDuty ? s.security!.guard!.name : 'Divine', guardOnDuty ? `I'm going to buy ${litres} litres of fuel. I'll announce when I'm back.` : `I'm heading out to buy ${litres} litres of fuel. I'll be back after the trip.`, 'good');
}

/** Advance an errand using the in-game clock, including after-hours trips once time resumes. */
function securityStep(s0: GameState, minutes: number): GameState {
  const trip = s0.security?.trip;
  if (!trip || minutes <= 0) return s0;
  const remaining = Math.max(0, trip.remaining - minutes);
  if (remaining > 0) return { ...s0, security: { ...s0.security!, trip: { ...trip, remaining } } };
  let s: GameState = { ...s0, security: { ...s0.security!, trip: null, gallons: s0.security?.gallons || [] } };
  let gallonLeft = trip.litres;
  if (trip.refillUid) {
    const poured = pourFuel(s, trip.litres, trip.refillUid);
    s = poured.s;
    gallonLeft = poured.remaining;
  }
  const gallons = [...(s.security?.gallons || [])];
  if (gallonLeft > 0.05) gallons.push({ id: `fuel-${s.day}-${Math.random().toString(36).slice(2, 7)}`, litres: gallonLeft });
  s = { ...s, security: { ...(s.security || {}), trip: null, gallons } };
  const who = trip.carrier === 'guard' ? s.security?.guard?.name || 'Security' : 'Divine';
  s = addShout(s, who, trip.refillUid && gallonLeft <= 0.05 ? 'I am back! I bought the fuel and filled the selected generator.' : `I am back! The ${Math.round(gallonLeft * 10) / 10} L gallon is here. Click it to refill a generator.`, 'good');
  return s;
}

/** Pour a delivered gallon into one selected generator without paying twice. */
export function pourSecurityGallon(s: GameState, gallonId: string, generatorUid: string): GameState {
  const gallon = (s.security?.gallons || []).find((g) => g.id === gallonId);
  if (!gallon) return s;
  const result = pourFuel(s, gallon.litres, generatorUid);
  if (result.used <= 0) return addShout(s, 'Generator', 'That generator has no room for more fuel. Choose another one.', 'warn');
  const gallons = (s.security?.gallons || []).filter((g) => g.id !== gallonId);
  if (result.remaining > 0.05) gallons.push({ ...gallon, litres: result.remaining });
  return { ...result.s, security: { ...(result.s.security || {}), gallons } };
}

/** Turn a piece 90 degrees where it stands (or the nearest spot it fits). */
export function rotateFurniture(s: GameState, uid: string): GameState {
  const p = s.furniture.find((f) => f.uid === uid);
  if (!p || !p.placed || furnitureById(p.id).mount !== 'floor') return s;
  const rot = turn(p.rot);
  for (const [dx, dz] of [[0, 0], [-1, 0], [0, -1], [-1, -1], [1, 0], [0, 1]]) {
    const cand: Placed = { ...p, rot, x: p.x + dx, z: p.z + dz };
    if (canPlace(s.furniture, s.listing, cand)) return { ...s, furniture: s.furniture.map((f) => (f.uid === uid ? cand : f)) };
  }
  return s;
}

export function placeFurniture(s: GameState, uid: string, x: number, z: number, rot: Rot): GameState {
  const p = s.furniture.find((f) => f.uid === uid);
  if (!p) return s;
  const cand: Placed = { ...p, x, z, rot, placed: true };
  if (!canPlace(s.furniture, s.listing, cand)) return s;
  return { ...s, furniture: s.furniture.map((f) => (f.uid === uid ? cand : f)) };
}

/** Hang a wall piece exactly where the player chose, if that part of the wall is free. */
export function placeWallItem(s: GameState, uid: string, side: 'back' | 'left', at: number): GameState {
  const p = s.furniture.find((f) => f.uid === uid);
  if (!p || furnitureById(p.id).mount !== 'wall' || !wallFits(s.furniture, s.listing, uid, side, at)) return s;
  return { ...s, furniture: s.furniture.map((f) => (f.uid === uid ? { ...f, placed: true, wallSide: side, x: at, z: 0 } : f)) };
}

/** Put a stored item back in the room wherever it fits. */
export function installFurniture(s: GameState, uid: string): GameState {
  const p = s.furniture.find((f) => f.uid === uid);
  if (!p || p.placed) return s;
  const f = furnitureById(p.id);
  if (f.mount === 'wall') {
    if (wallUsed(s.furniture) + f.w > wallCapacity(s.listing)) return s;
    return { ...s, furniture: s.furniture.map((x) => (x.uid === uid ? { ...x, placed: true, x: wallUsed(s.furniture) } : x)) };
  }
  if (f.mount === 'ceiling') {
    if (ceilingUsed(s.furniture) >= ceilingCapacity(s.listing)) return s;
    return { ...s, furniture: s.furniture.map((x) => (x.uid === uid ? { ...x, placed: true } : x)) };
  }
  if (f.mount === 'yard') {
    if (!outdoorRoomFor(s.furniture.filter((x) => x.placed), p.id, s.listing)) return s;
    return { ...s, furniture: s.furniture.map((x) => (x.uid === uid ? { ...x, placed: true } : x)) };
  }
  const spot = autoPlace([...s.furniture.filter((x) => x.placed), { ...p }], s.listing).find((x) => x.uid === uid)!;
  if (!spot.placed) return s;
  return { ...s, furniture: s.furniture.map((x) => (x.uid === uid ? spot : x)) };
}

export function storeFurniture(s0: GameState, uid: string): GameState {
  const p = s0.furniture.find((f) => f.uid === uid);
  const s = p && furnitureById(p.id).gen ? { ...s0, power: { ...s0.power, gen: false } } : s0;
  return fitDisplay({ ...s, furniture: s.furniture.map((f) => (f.uid === uid ? { ...f, placed: false } : f)) });
}

export function sellFurniture(s: GameState, uid: string): GameState {
  const p = s.furniture.find((f) => f.uid === uid);
  if (!p) return s;
  return fitDisplay(money({ ...s, furniture: s.furniture.filter((f) => f.uid !== uid) }, Math.round(furnitureById(p.id).price * 0.4), `Sold ${furnitureById(p.id).name}`));
}

export { FURNITURE, usesFloor };

// ---------------------------------------------------------------------------
// Stock
// ---------------------------------------------------------------------------
/** Display space is per product/style, not per colourway. Old saves remain compatible. */
export const displayedCount = (s: GameState) => new Set(s.stock.filter((d) => d.displayed).map(productKey)).size;

export function buyDesign(s: GameState, d: ReturnType<typeof makeDesign>): GameState {
  const total = d.cost * d.pieces;
  if (s.cash < total) return s;
  const key = productKey(d);
  const existingVariants = s.stock.filter((x) => productKey(x) === key);
  // A new colour of an already-displayed design joins that rack slot; if the
  // parent style is stored, new colours remain in storage until the style is displayed.
  const free = existingVariants.length
    ? existingVariants.some((x) => x.displayed)
    : displayedCount(s) < displayCap(s);
  return money({ ...s, stock: [...s.stock, { ...d, displayed: free }] }, -total, `Stock: ${d.label} ×${d.pieces}`);
}

export function setDisplayed(s: GameState, uid: string, on: boolean): GameState {
  const target = s.stock.find((d) => d.uid === uid);
  if (!target) return s;
  const key = productKey(target);
  const alreadyDisplayed = s.stock.some((d) => productKey(d) === key && d.displayed);
  if (on && !alreadyDisplayed && displayedCount(s) >= displayCap(s)) return s;
  return { ...s, stock: s.stock.map((d) => (productKey(d) === key ? { ...d, displayed: on } : d)) };
}

/** Units of a style (all colours) sold over the last `days` days. */
function recentStyleSales(s: GameState, key: string, days = 14): number {
  return (s.productSales || []).filter((r) => r.day > s.day - days && productKey(r) === key).reduce((a, r) => a + r.units, 0);
}

/**
 * The displayed style that earns its rack space least: sold-out styles first, then the
 * fewest pieces sold in the last two weeks. `keep` styles are never chosen.
 */
export function slowestDisplayedStyle(s: GameState, keep: Set<string> = new Set()): { key: string; label: string } | null {
  const shown = new Map<string, Design[]>();
  for (const d of s.stock) if (d.displayed) shown.set(productKey(d), [...(shown.get(productKey(d)) || []), d]);
  let best: { key: string; label: string; rank: number } | null = null;
  for (const [key, variants] of shown) {
    if (keep.has(key)) continue;
    const pieces = variants.reduce((a, d) => a + d.pieces, 0);
    const rank = (pieces > 0 ? 1_000_000 : 0) + recentStyleSales(s, key) * 1000 + Math.min(999, pieces);
    if (!best || rank < best.rank) best = { key, label: variants[0].label, rank };
  }
  return best && { key: best.key, label: best.label };
}

/**
 * Put a stored style on the racks. If the racks are full, the slowest seller goes to the
 * store room to make space. Returns the state unchanged when there are no racks at all.
 */
export function putOnDisplay(s: GameState, uid: string, keep: Set<string> = new Set()): GameState {
  const target = s.stock.find((d) => d.uid === uid);
  if (!target) return s;
  const key = productKey(target);
  if (s.stock.some((d) => productKey(d) === key && d.displayed)) return s;
  if (displayCap(s) <= 0) return s;
  let next = s;
  if (displayedCount(next) >= displayCap(next)) {
    const out = slowestDisplayedStyle(next, new Set([...keep, key]));
    if (!out) return s;
    next = { ...next, stock: next.stock.map((d) => (productKey(d) === out.key ? { ...d, displayed: false } : d)) };
  }
  return setDisplayed(next, uid, true);
}

/** What a checkout did to the racks, for an honest receipt. */
export function checkoutPlacement(before: GameState, after: GameState): { shown: string[]; stored: string[]; swappedOut: string[] } {
  const had = new Set(before.stock.map(productKey));
  const wasShown = new Set(before.stock.filter((d) => d.displayed).map(productKey));
  const isShown = new Set(after.stock.filter((d) => d.displayed).map(productKey));
  const fresh = new Map<string, string>();
  for (const d of after.stock) if (!had.has(productKey(d))) fresh.set(productKey(d), d.label);
  const labelOf = (key: string) => before.stock.find((d) => productKey(d) === key)?.label || key;
  return {
    shown: [...fresh].filter(([k]) => isShown.has(k)).map(([, l]) => l),
    stored: [...fresh].filter(([k]) => !isShown.has(k)).map(([, l]) => l),
    swappedOut: [...wasShown].filter((k) => !isShown.has(k)).map(labelOf),
  };
}

/** Buy more pieces of a design Divine already stocks. */
export function restock(s: GameState, uid: string, pieces: number): GameState {
  const d = s.stock.find((x) => x.uid === uid);
  if (!d || s.cash < d.cost * pieces) return s;
  return money({ ...s, stock: s.stock.map((x) => (x.uid === uid ? { ...x, pieces: x.pieces + pieces } : x)) }, -d.cost * pieces, `Restock: ${d.label} ×${pieces}`);
}

export const restockAllCost = (s: GameState, upTo = 2) => s.stock.filter((d) => d.displayed && d.pieces < upTo).reduce((a, d) => a + d.cost * (upTo - d.pieces), 0);

export function restockAll(s: GameState, upTo = 2): GameState {
  let next = s;
  for (const d of s.stock.filter((x) => x.displayed && x.pieces < upTo)) next = restock(next, d.uid, upTo - d.pieces);
  return next;
}

export interface CartLine {
  key: string;
  kind: Design['kind'];
  itemId: string;
  fabric?: FabricId;
  color: string;
  color2: string;
  pattern: number;
  pieces: number;
}

export function cartLineCost(l: CartLine) {
  const e = entryFor(l.kind, l.itemId);
  return e ? pieceCost(e, isClothing(l.kind) ? l.fabric : undefined) * l.pieces : 0;
}
export const cartTotal = (lines: CartLine[]) => lines.reduce((a, l) => a + cartLineCost(l), 0);

export interface CartValidation {
  ok: boolean;
  total: number;
  /** Shopper commission due at checkout for the items he picked; 0 for manual shopping. */
  commission: number;
  errors: string[];
}

const shopperLineKey = (l: Pick<CartLine, 'kind' | 'itemId' | 'fabric' | 'color' | 'color2' | 'pattern'>) =>
  [l.kind, l.itemId, l.fabric || '', l.color, l.color2, l.pattern].join('|');

/**
 * Kunle's commission on a checkout: 5% of the goods in this cart that came from his
 * open orders, with a ₦1,500 minimum per order the first time it is paid. Items the
 * player added by hand, or removed from his list, are not commissioned.
 */
export function shopperCommission(s: GameState, lines: CartLine[]): { total: number; byJob: { id: string; amount: number; pieces: Record<string, number> }[] } {
  const remaining = new Map<string, { pieces: number; unit: number }>();
  for (const raw of lines) {
    const line = canonicaliseCartColours(raw);
    const entry = entryFor(line.kind, line.itemId);
    if (!entry || line.pieces <= 0) continue;
    const key = shopperLineKey(line);
    const unit = pieceCost(entry, isClothing(line.kind) ? (line.fabric || 'plain') as FabricId : undefined);
    const prev = remaining.get(key);
    remaining.set(key, { pieces: (prev?.pieces || 0) + line.pieces, unit });
  }
  const byJob: { id: string; amount: number; pieces: Record<string, number> }[] = [];
  let total = 0;
  for (const job of s.shopperJobs || []) {
    if (job.status !== 'ready') continue;
    let matched = 0;
    const pieces: Record<string, number> = {};
    for (const item of job.items) {
      const key = shopperLineKey(item);
      const have = remaining.get(key);
      if (!have || have.pieces <= 0) continue;
      const owed = Math.max(0, item.pieces - (job.paidPieces?.[key] || 0));
      const take = Math.min(owed, have.pieces);
      if (take <= 0) continue;
      have.pieces -= take;
      pieces[key] = take;
      matched += take * have.unit;
    }
    if (matched <= 0) continue;
    let amount = Math.round((matched * SHOPPER_COMMISSION_RATE) / 100) * 100;
    if (!job.commissionPaid) amount = Math.max(SHOPPER_COMMISSION_MIN, amount);
    byJob.push({ id: job.id, amount, pieces });
    total += amount;
  }
  return { total, byJob };
}

/** Match official palette colours robustly without allowing unsupported colours. */
function officialMarketColour(value: unknown, palette: readonly string[]): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalised = value.trim().toLowerCase();
  return palette.find((colour) => colour.toLowerCase() === normalised);
}

/** Convert known palette colours back to their official hex form before saving stock. */
function canonicaliseCartColours(line: CartLine): CartLine {
  const palette = line.kind === 'hair' ? HAIR_SWATCHES.map((swatch) => swatch.color) : FABRIC_COLORS;
  const colour = officialMarketColour(line.color, palette);
  const colour2 = isClothing(line.kind) ? officialMarketColour(line.color2, FABRIC_COLORS) : undefined;
  return {
    ...line,
    color: colour || line.color,
    ...(isClothing(line.kind) && colour2 ? { color2: colour2 } : {}),
  };
}

/** Validate the entire order before any cash or inventory is changed. */
export function validateCart(s: GameState, lines: CartLine[]): CartValidation {
  const errors: string[] = [];
  if (!Array.isArray(lines) || lines.length === 0) errors.push('Your cart is empty.');
  if (Array.isArray(lines) && lines.length > 250) errors.push('Your cart contains too many separate lines.');
  const seen = new Set<string>();
  let total = 0;
  for (const rawLine of Array.isArray(lines) ? lines : []) {
    if (!rawLine || typeof rawLine !== 'object') {
      errors.push('The cart contains an invalid item.');
      continue;
    }
    const line = canonicaliseCartColours(rawLine);
    const entry = entryFor(line.kind, line.itemId);
    if (!entry) {
      errors.push('A cart item is not in the official Yaba Mart catalogue.');
      continue;
    }
    if (!canBuy(entry, s.tier)) {
      errors.push(`${entry.label} is locked at your current boutique level.`);
      continue;
    }
    if (!Number.isInteger(line.pieces) || line.pieces < 1 || line.pieces > 500) {
      errors.push(`${entry.label} has an invalid quantity. Quantities must be between 1 and 500 per line.`);
      continue;
    }
    const palette = line.kind === 'hair' ? HAIR_SWATCHES.map((swatch) => swatch.color) : FABRIC_COLORS;
    const colour = officialMarketColour(line.color, palette);
    const colour2 = isClothing(line.kind) ? officialMarketColour(line.color2, FABRIC_COLORS) : undefined;
    if (!colour || (isClothing(line.kind) && !colour2)) {
      const badPart = !colour ? 'main colour' : 'second/trim colour';
      errors.push(`${entry.label} has a ${badPart} that is not offered by the official market palette.`);
      continue;
    }
    if (!Number.isInteger(line.pattern) || line.pattern < 0 || line.pattern > 32) {
      errors.push(`${entry.label} has an invalid pattern.`);
      continue;
    }
    if (line.kind === 'hair' && HAIR_SWATCHES[line.pattern]?.color.toLowerCase() !== colour.toLowerCase()) {
      errors.push(`${entry.label} has a hair colour/pattern combination that is not offered by the market.`);
      continue;
    }
    const fabric = line.fabric || 'plain';
    if (isClothing(line.kind) && !Object.prototype.hasOwnProperty.call(FABRIC_COST, fabric)) {
      errors.push(`${entry.label} has an invalid fabric selection.`);
      continue;
    }
    const canonicalKey = [line.kind, line.itemId, line.fabric || '', colour, colour2 || line.color2, line.pattern].join('|');
    if (seen.has(canonicalKey)) {
      errors.push(`Duplicate cart lines found for ${entry.label}. Combine duplicate quantities before checkout.`);
      continue;
    }
    seen.add(canonicalKey);
    total += pieceCost(entry, isClothing(line.kind) ? fabric as FabricId : undefined) * line.pieces;
  }
  const commission = errors.length === 0 ? shopperCommission(s, lines).total : 0;
  if (errors.length === 0 && s.cash < total + commission) errors.push('There is not enough available cash to pay for this cart and the shopper commission.');
  return { ok: errors.length === 0, total, commission, errors };
}

const sameDesign = (d: Design, l: CartLine) => d.kind === l.kind && d.itemId === l.itemId && (!isClothing(l.kind) || d.fabric === (l.fabric || d.fabric)) && d.color === l.color && (!isClothing(l.kind) || (d.color2 === l.color2 && d.pattern === l.pattern));

/** Number of new rack styles a cart introduces; extra colours do not consume more display slots. */
export const cartNewDesigns = (s: GameState, lines: CartLine[]) => {
  const existing = new Set(s.stock.map(productKey));
  const added = new Set<string>();
  for (const line of lines) {
    const key = productKey({
      kind: line.kind, itemId: line.itemId, fabric: line.fabric || 'plain',
      color2: line.color2, pattern: line.pattern,
    });
    if (!existing.has(key)) added.add(key);
  }
  return added.size;
}

/** Pay for everything in the cart. Matching designs already in stock get topped up. */
export function buyCart(s0: GameState, lines: CartLine[], opts: { makeRoom?: boolean } = {}): GameState {
  const canonicalLines = lines.map(canonicaliseCartColours);
  const validation = validateCart(s0, canonicalLines);
  if (!validation.ok) return s0;
  const commission = shopperCommission(s0, canonicalLines);
  let newCollection = false;
  let s = s0;
  for (const l of canonicalLines) {
    const e = entryFor(l.kind, l.itemId);
    if (!e || !canBuy(e, s.tier) || l.pieces <= 0) continue;
    const have = s.stock.find((d) => sameDesign(d, l));
    if (have) s = restock(s, have.uid, l.pieces);
    else s = buyDesign(s, makeDesign(e, { fabric: l.fabric, color: l.color, color2: l.color2, pattern: l.pattern, pieces: l.pieces }));
  }

  // Mark a shopper order purchased only when its complete proposed quantity was
  // actually present in this successful checkout. Keep quantities separate so
  // two similar pending orders cannot both claim the same cart pieces.
  const purchasedCounts = new Map<string, number>();
  for (const line of canonicalLines) {
    const key = [line.kind, line.itemId, line.fabric || '', line.color, line.color2, line.pattern].join('|');
    purchasedCounts.set(key, (purchasedCounts.get(key) || 0) + line.pieces);
  }
  const shopperJobs = (s.shopperJobs || []).map((job) => {
    if (job.status !== 'ready') return job;
    const needed = new Map<string, number>();
    for (const line of job.items) {
      needed.set(line.key, (needed.get(line.key) || 0) + line.pieces);
    }
    const complete = [...needed.entries()].every(([key, amount]) => (purchasedCounts.get(key) || 0) >= amount);
    if (!complete) return job;
    for (const [key, amount] of needed) purchasedCounts.set(key, Math.max(0, (purchasedCounts.get(key) || 0) - amount));
    if (job.items.reduce((a, l) => a + l.pieces, 0) >= 20) newCollection = true;
    return { ...job, status: 'purchased' as const };
  }).map((job) => {
    const paid = commission.byJob.find((row) => row.id === job.id);
    if (!paid) return job;
    const paidPieces = { ...(job.paidPieces || {}) };
    for (const [key, n] of Object.entries(paid.pieces)) paidPieces[key] = (paidPieces[key] || 0) + n;
    return { ...job, commissionPaid: (job.commissionPaid || 0) + paid.amount, paidPieces };
  });
  let next: GameState = { ...s, shopperJobs };
  if (opts.makeRoom) {
    // Swap slow sellers off the racks so the new styles are usable straight away.
    const had = new Set(s0.stock.map(productKey));
    const fresh = next.stock.filter((d, i, all) => !had.has(productKey(d)) && all.findIndex((x) => productKey(x) === productKey(d)) === i);
    const keep = new Set(fresh.map(productKey));
    for (const d of fresh) next = putOnDisplay(next, d.uid, keep);
  }
  if (commission.total > 0) next = money(next, -commission.total, "Kunle's commission (shopper)");
  if (newCollection) next = addBrag(next, 'collection', 'New collection in store', 'Fresh stock from Yaba Mart is on the racks at Asanwa Boutique.', 1);
  return next;
}

/** Sell old stock back to the market at half price. */
export function clearDesign(s: GameState, uid: string): GameState {
  const d = s.stock.find((x) => x.uid === uid);
  if (!d) return s;
  return money({ ...s, stock: s.stock.filter((x) => x.uid !== uid) }, Math.round(d.cost * d.pieces * 0.5), `Sold off ${d.label}`);
}

// ---------------------------------------------------------------------------
// Gidigram
// ---------------------------------------------------------------------------
export const postsToday = (s: GameState) => (s.posts || []).filter((p) => p.day === s.day).length;
export const canPost = (s: GameState, score: number) => score >= 70 && postsToday(s) < 3;

const CAPTIONS = [
  'Styled by @divine.styles 🔥', 'Another happy client! Book your slot 💅🏾', 'Owambe ready ✨', 'From walk-in to wow.', 'Who did it better? Us. 😌', 'Fresh out of the chair 💇🏾‍♀️', "Clean look for a clean guy.", 'Na so we dey do am for Yaba 💯',
];

export function postLook(s: GameState, c: Customer, look: CharacterConfig, score: number): GameState {
  if (!canPost(s, score)) return s;
  const clsMult = { poor: 0.6, middle: 1, rich: 2 }[c.cls];
  const fatigue = 1 / (1 + postsToday(s));
  const flowerWall = s.furniture.some((p) => p.placed && p.id === 'flowerWall');
  const gained = Math.max(5, Math.round((score - 60) * clsMult * (4 + Math.random() * 4) * fatigue * (1 + (s.followers || 0) / 6000) * (flowerWall ? 1.12 : 1)));
  const likes = Math.round(((s.followers || 0) + gained) * (0.08 + (score - 70) / 300) * (0.8 + Math.random() * 0.4) * (flowerWall ? 1.5 : 1));
  const post = { id: `p${s.day}-${Math.random().toString(36).slice(2, 7)}`, day: s.day, look, name: c.name, caption: pick(CAPTIONS), score, likes, gained };
  return { ...s, followers: (s.followers || 0) + gained, posts: [post, ...(s.posts || [])].slice(0, 24) };
}

// ---------------------------------------------------------------------------
// Chats
// ---------------------------------------------------------------------------
export function chats(s: GameState) {
  const by: Record<string, { from: string; last: Message; unread: number }> = {};
  for (const m of s.messages) {
    const k = thread(m);
    const c = (by[k] = by[k] || { from: k, last: m, unread: 0 });
    if (m.id > c.last.id) c.last = m;
    if (m.from !== 'You' && m.id > (s.read?.[k] || 0)) c.unread += 1;
  }
  return Object.values(by).sort((a, b) => b.last.id - a.last.id);
}
export const thread = (m: Message) => m.chat || m.from;
export const unreadCount = (s: GameState) => chats(s).reduce((a, c) => a + c.unread, 0);
export function markRead(s: GameState, from: string): GameState {
  const top = s.messages.filter((m) => thread(m) === from).reduce((a, m) => Math.max(a, m.id), 0);
  if ((s.read?.[from] || 0) >= top) return s;
  return { ...s, read: { ...(s.read || {}), [from]: top } };
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------
const STAFF_NAMES = ['Kemi', 'Blessing', 'Chidinma', 'Sola', 'Grace', 'Rukayat', 'Amarachi', 'Tosin', 'Ladi', 'Nneka', 'Bimpe', 'Jumoke', 'Ese', 'Rita', 'Seun', 'Uju'];

export interface Candidate { name: string; kind: 'trainee' | 'expert'; level: number; wage: number; signing: number; profession: StaffProfession }

export function candidates(s: GameState, profession: StaffProfession = 'stylist'): Candidate[] {
  const used = new Set(s.staff.map((x) => x.name));
  const free = STAFF_NAMES.filter((n) => !used.has(n));
  const seed = s.day * 31 + s.staff.length * 7;
  const a = free[seed % free.length];
  const b = free[(seed * 7 + 3) % free.length] === a ? free[(seed + 1) % free.length] : free[(seed * 7 + 3) % free.length];
  return [
    { name: a, kind: 'trainee', level: STAFF.traineeLevel, wage: STAFF.traineeWage, signing: STAFF.traineeWage * 0.5, profession },
    { name: b, kind: 'expert', level: STAFF.expertLevel, wage: STAFF.expertWage, signing: STAFF.expertWage * 2, profession },
  ];
}

export function canHire(s: GameState) {
  return TIERS[s.tier].staff > s.staff.length;
}

export function hire(s: GameState, c: Candidate): GameState {
  if (!canHire(s) || s.cash < c.signing) return s;
  const member: StaffMember = { id: `s${Date.now().toString(36)}`, name: c.name, level: c.level, wage: c.wage, loyalty: c.kind === 'trainee' ? 30 : 20, trained: c.kind === 'trainee', weeks: 0, profession: c.profession || 'stylist', look: { ...generateRandomCustomer('styled') } };
  return msg(money({ ...s, staff: [...s.staff, member], hireOkDay: s.day }, -c.signing, `Signing: ${c.name}`), c.name, c.profession === 'makeup' ? 'I specialise in makeup, ma. I will take care of the face clients.' : c.kind === 'trainee' ? 'Thank you for this chance, ma. I will learn fast!' : `I'm a stylist. Pay me well and I'll keep your customers looking good.`, 'good');
}

export function train(s: GameState, id: string): GameState {
  const m = s.staff.find((x) => x.id === id);
  if (!m || m.level >= 10) return s;
  const fee = STAFF.trainFee(m.level);
  if (s.cash < fee) return s;
  const staff = s.staff.map((x) => (x.id === id ? { ...x, level: x.level + 1, wage: Math.round((x.wage * STAFF.raisePerLevel) / 500) * 500, loyalty: clamp(x.loyalty + (x.trained ? 8 : 3), 0, 100) } : x));
  return money({ ...s, staff }, -fee, `Training: ${m.name}`);
}

export function fire(s: GameState, id: string): GameState {
  const m = s.staff.find((x) => x.id === id);
  if (!m) return s;
  return msg({ ...s, staff: s.staff.filter((x) => x.id !== id) }, 'Deborah', `${m.name} has packed her things. She wasn't happy.`, 'warn');
}

export type RaiseAnswer = 'accept' | 'counter' | 'refuse';
export function answerRaise(s: GameState, id: string, answer: RaiseAnswer): GameState {
  const m = s.staff.find((x) => x.id === id);
  if (!m || !m.raiseAsk) return s;
  const ask = m.raiseAsk;
  let staff = s.staff;
  let next = s;
  if (answer === 'accept') {
    staff = s.staff.map((x) => (x.id === id ? { ...x, wage: ask, loyalty: clamp(x.loyalty + 6, 0, 100), raiseAsk: undefined } : x));
    next = msg({ ...s, staff }, m.name, 'Thank you ma! God bless you.', 'good');
  } else if (answer === 'counter') {
    const mid = Math.round((m.wage + ask) / 2 / 500) * 500;
    const takes = m.trained ? chance(0.8) : chance(0.45);
    if (takes) {
      staff = s.staff.map((x) => (x.id === id ? { ...x, wage: mid, raiseAsk: undefined } : x));
      next = msg({ ...s, staff }, m.name, `Okay, ${naira(mid)} is fine. I'll stay.`, 'info');
    } else {
      staff = s.staff.filter((x) => x.id !== id);
      next = msg({ ...s, staff, hireOkDay: s.day + STAFF.hireDelayDays }, m.name, 'That is not enough. I have another offer. Bye.', 'danger');
    }
  } else {
    const leaves = m.trained ? chance(0.25) : chance(0.75);
    if (leaves) {
      staff = s.staff.filter((x) => x.id !== id);
      next = msg({ ...s, staff, hireOkDay: s.day + STAFF.hireDelayDays }, m.name, "Then I'm going. Another shop wants me.", 'danger');
    } else {
      staff = s.staff.map((x) => (x.id === id ? { ...x, loyalty: clamp(x.loyalty - 15, 0, 100), raiseAsk: undefined } : x));
      next = msg({ ...s, staff }, m.name, 'Okay ma. I will manage.', 'warn');
    }
  }
  return next;
}

/** Fair weekly wage for a level: what other shops would pay. */
export const marketWage = (level: number) => Math.round((STAFF.traineeWage * STAFF.raisePerLevel ** (level - STAFF.traineeLevel)) / 500) * 500;

function weeklyStaff(s0: GameState): GameState {
  let s = s0;
  for (const m0 of s0.staff) {
    const m = s.staff.find((x) => x.id === m0.id);
    if (!m) continue;
    s = money({ ...s, today: { ...s.today, costs: s.today.costs + m.wage } }, -m.wage, `Wages: ${m.name}`);
    let loyalty = clamp(m.loyalty + (m.trained ? 4 : 1), 0, 100);
    // poaching offer
    if (chance(0.05 + 0.015 * m.level)) {
      const extra = 10 + Math.random() * 140; // % more pay
      const limit = loyalty * (m.trained ? 1.5 : 0.6);
      const offer = Math.round((m.wage * (1 + extra / 100)) / 500) * 500;
      if (extra > limit || chance(0.02)) {
        s = { ...s, staff: s.staff.filter((x) => x.id !== m.id), hireOkDay: s.day + STAFF.hireDelayDays };
        const who = poacher(s);
        s = msg(s, 'Deborah', `${m.name} has left! ${who ? who.shop : 'Another boutique'} offered her ${naira(offer)} a week. You were paying ${naira(m.wage)}.`, 'danger');
        continue;
      }
      const who = poacher(s);
      s = msg(s, m.name, `${who ? `${who.owner} from ${who.shop}` : 'Another shop'} offered me ${naira(offer)} a week, but I'm staying with you.`, 'good');
      loyalty = clamp(loyalty + 2, 0, 100);
    }
    // raise demand when underpaid for their level
    let raiseAsk = m.raiseAsk;
    const fair = Math.max(marketWage(m.level), m.trained ? 0 : STAFF.expertWage);
    if (!raiseAsk && m.wage < fair * 0.95 && chance(m.trained ? 0.15 : 0.35)) {
      raiseAsk = Math.round((fair * 1.05) / 500) * 500;
      s = msg(s, m.name, `Ma, I need a raise to ${naira(raiseAsk)} a week or I will have to go. Other shops pay that for my level.`, 'warn');
    }
    s = { ...s, staff: s.staff.map((x) => (x.id === m.id ? { ...x, loyalty, weeks: x.weeks + 1, raiseAsk } : x)) };
  }
  return s;
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------
const KEY = 'asanwa-boutique-save-v1';

/** Older saves: v1 gets a listing and furniture; v2 gets the clock, chats, bank and Gidigram. */
function normaliseCharacterMemories(value: unknown, day: number): NonNullable<GameState['characterMemories']> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const clean: NonNullable<GameState['characterMemories']> = {};
  for (const [name, rawMemory] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
    if (!name.trim() || !rawMemory || typeof rawMemory !== 'object' || Array.isArray(rawMemory)) continue;
    const candidate = rawMemory as Partial<CharacterMemory>;
    const summary = typeof candidate.summary === 'string' ? candidate.summary.trim().slice(0, 500) : '';
    const notes = Array.isArray(candidate.notes)
      ? candidate.notes.filter((note): note is string => typeof note === 'string').map((note) => note.trim().slice(0, 160)).filter(Boolean).slice(-6)
      : [];
    if (!summary && notes.length === 0) continue;
    const updatedDay = typeof candidate.updatedDay === 'number' && Number.isFinite(candidate.updatedDay)
      ? Math.max(1, Math.floor(candidate.updatedDay))
      : Math.max(1, Math.floor(day || 1));
    clean[name.slice(0, 80)] = { summary, notes, updatedDay };
  }
  return clean;
}

function migrate(raw: GameState): GameState | null {
  type Old = Omit<GameState, 'version'> & { version: number; queue?: unknown; queueIndex?: unknown };
  let s = raw as unknown as Old;
  if (s.version === 5) {
    const current = s as GameState;
    return ensureBusinessState({
      ...sanitizeSavedCelebrityNameCollisions(current),
      characterMemories: normaliseCharacterMemories(current.characterMemories, current.day),
      collaborations: Array.isArray(current.collaborations) ? current.collaborations : [],
      version: 5,
    });
  }
  if (s.version === 4) {
    const current = s as unknown as GameState;
    const base = current.rivals
      ? { ...sanitizeSavedCelebrityNameCollisions(current), version: 5 as const, characterMemories: normaliseCharacterMemories(current.characterMemories, current.day), collaborations: Array.isArray(current.collaborations) ? current.collaborations : [] }
      : { ...sanitizeSavedCelebrityNameCollisions(current), version: 5 as const, characterMemories: normaliseCharacterMemories(current.characterMemories, current.day), collaborations: Array.isArray(current.collaborations) ? current.collaborations : [], ...rivalDefaults() };
    return ensureBusinessState(base as GameState);
  }
  if (s.version === 3) {
    const o = s as unknown as GameState & { blackout?: unknown };
    delete o.blackout;
    const midDay = o.phase === 'shop';
    const upgraded = {
      ...o, version: 5 as const, characterMemories: {}, collaborations: [], outages: [],
      power: { gen: false, solar: 0 }, shouts: [], shoutSeq: 0, ...rivalDefaults(),
      ...(midDay ? { ...freshDay, phase: 'morning' as const, today: emptyLog(o.day) } : {}),
    } as unknown as GameState;
    return ensureBusinessState(sanitizeSavedCelebrityNameCollisions(upgraded));
  }
  if (s.version === 1) {
    const listing = s.tier === 0 ? KIOSK_LISTING : { ...cheapestListing(s.tier, week(s.day)), rent: TIERS[s.tier].rent, stars: 2 };
    const base = STARTER_FURNITURE.map((f) => ({ ...f, uid: newUid() }));
    const rails = Array.from({ length: Math.max(0, Math.ceil((TIERS[s.tier].slots - 12) / 8)) }, () => ({ uid: newUid(), id: 'chromeRail', x: 0, z: 0, rot: 0 as const, placed: true }));
    s = { ...s, version: 2, listing, furniture: autoPlace([...base, ...rails], listing) } as Old;
  }
  if (s.version !== 2) return null;
  const messages = (s.messages || []).map((m, i) => ({ ...m, id: (s.messages || []).length - i }));
  const { queue: _q, queueIndex: _qi, ...rest } = s;
  void _q; void _qi;
  const midDay = s.phase === 'shop';
  const upgraded = {
    ...(rest as unknown as GameState),
    version: 5 as const,
    characterMemories: {},
    collaborations: [],
    ...freshDay,
    ...rivalDefaults(),
    power: { gen: false, solar: 0 },
    shoutSeq: 0,
    phase: midDay ? 'morning' as const : s.phase,
    today: midDay ? emptyLog(s.day) : s.today,
    ledger: [],
    followers: 120,
    posts: [],
    messages,
    msgSeq: messages.length,
    read: Object.fromEntries(messages.map((m) => [m.from, messages.length])),
  } as GameState;
  return ensureBusinessState(sanitizeSavedCelebrityNameCollisions(upgraded));
}
/** The save on this device from before accounts existed. */
export const LEGACY_KEY = KEY;
/** Each signed-in account keeps its own copy on the device too. */
export const keyFor = (uid?: string | null) => (uid ? `${KEY}:${uid}` : KEY);

export function save(s: GameState, key = KEY): GameState {
  const stamped = { ...s, savedAt: Date.now() };
  try {
    localStorage.setItem(key, JSON.stringify(stamped));
  } catch {
    /* storage can be full or blocked; the backup button and the cloud still work */
  }
  return stamped;
}
export function load(key = KEY): GameState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return migrate(s);
  } catch {
    return null;
  }
}
export function clearSave(key = KEY) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
/** A save brought in from elsewhere (the cloud, a backup): checked and upgraded. */
export function fromData(raw: unknown): GameState | null {
  const s = raw as GameState;
  if (!s || typeof s.day !== 'number' || !Array.isArray(s.stock)) return null;
  return migrate(s);
}

/** Money sent by an admin. Applied once, shown in the bank and as a message. */
export function adminGrant(s: GameState, g: { id: string; kind: 'add' | 'set'; amount: number; reason: string }): GameState {
  if ((s.appliedGrants || []).includes(g.id)) return s;
  const delta = Math.round(g.kind === 'set' ? g.amount - s.cash : g.amount);
  let next: GameState = { ...s, appliedGrants: [...(s.appliedGrants || []), g.id].slice(-100) };
  if (delta) next = money(next, delta, g.reason ? `Admin: ${g.reason}` : delta > 0 ? 'Admin top-up' : 'Admin deduction');
  return msg(next, 'Asanwa HQ', delta >= 0 ? `${naira(delta)} has been added to your account.${g.reason ? ` Note: ${g.reason}` : ''}` : `${naira(-delta)} has been taken from your account.${g.reason ? ` Note: ${g.reason}` : ''}`, delta >= 0 ? 'good' : 'warn');
}
export function exportSave(s: GameState) {
  const blob = new Blob([JSON.stringify(s)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `asanwa-boutique-day${s.day}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function parseSave(text: string): GameState | null {
  try {
    const s = JSON.parse(text) as GameState;
    if (typeof s.day !== 'number' || !Array.isArray(s.stock)) return null;
    return migrate(s);
  } catch {
    return null;
  }
}

export { colourName, MARKUP, SERVICE_FEE, SUPPLIES_SHARE };

// ---------------------------------------------------------------------------
// Build mode helpers
// ---------------------------------------------------------------------------
/** Could this floor piece stand here? */
export const canPlaceAt = (s: GameState, p: Placed) => canPlace(s.furniture, s.listing, p);
/** The first free spot for a piece that is not out yet. */
export function spotFor(s: GameState, uid: string): Placed | null {
  const p = s.furniture.find((x) => x.uid === uid);
  if (!p) return null;
  return findSpot(s.furniture.filter((x) => x.uid !== uid), s.listing, { ...p, placed: false }) || null;
}
/** "Tidy up" for the busy banner. */
export function actionLabel(s: GameState, b: { uid: string; action: string }) {
  const names: Record<string, string> = { tidy: 'tidying up', restock: 'restocking', selfie: 'taking a selfie', sit: 'resting', drink: 'drinking water', genStart: 'starting the gen', refuel5: 'pouring fuel', refuel10: 'pouring fuel', refuelFull: 'filling the tank', tiktok: 'filming a TikTok', practiseMakeup: 'practising makeup', practiseHair: 'practising a style', countMoney: 'counting money' };
  return names[b.action] || 'busy';
}

// ---------------------------------------------------------------------------
// Trying a piece before buying it
// ---------------------------------------------------------------------------
export const PREVIEW_UID = '__preview';

/**
 * The shop as it would look with this piece in it, for build mode's
 * "Buy / Cancel" step. Paint and flooring show on the walls and floor;
 * floor pieces sit where they would go (x, z, rot), others in their spot.
 */
export function withPreview(s: GameState, id: string, at?: { x: number; z: number; rot: Rot; yardSide?: 'left' | 'right' }): { view: GameState; ok: boolean; why?: string; x: number; z: number; rot: Rot } {
  const f = furnitureById(id);
  const base = { uid: PREVIEW_UID, id, x: 0, z: 0, rot: 0 as Rot, placed: true };
  let furniture = s.furniture;
  let item: Placed = base;
  let ok = true;
  let why: string | undefined;
  if (f.mount === 'floor') {
    if (at) item = { ...base, ...at };
    else item = findSpot(furniture, s.listing, { ...base, placed: false }) || { ...base, placed: true };
    ok = canPlace(furniture, s.listing, { ...item, placed: true });
    if (!ok) why = "Can't go here";
    item = { ...item, placed: false };
  } else if (f.mount === 'finish') {
    furniture = furniture.filter((p) => { const o = furnitureById(p.id); return o.mount !== 'finish' || (f.paint ? !o.paint : !o.floorTiles); });
  } else if (f.mount === 'wall') {
    ok = wallUsed(furniture) + f.w <= wallCapacity(s.listing);
    item = { ...base, x: wallUsed(furniture), placed: ok };
    if (!ok) why = 'No wall space left';
  } else if (f.mount === 'ceiling') {
    ok = ceilingUsed(furniture) < ceilingCapacity(s.listing);
    item = { ...base, placed: ok };
    if (!ok) why = 'No ceiling space left';
  } else if (f.mount === 'yard') {
    ok = outdoorRoomFor(furniture, id, s.listing);
    item = { ...base, placed: ok, x: f.solar ? solarUsed(furniture) : yardUsed(furniture), yardSide: at?.yardSide || 'right' };
    if (!ok) why = f.solar ? `The solar rack is full (${solarRackCapacity(s.listing)} panels for this shop)` : 'The yard is full';
  }
  if (s.cash < f.price) { ok = false; why = `You need ${naira(f.price)}`; }
  if ((f.minTier || 0) > s.tier) { ok = false; why = `Needs a ${TIERS[f.minTier || 0].name}`; }
  return { view: { ...s, furniture: [...furniture, item] }, ok, why, x: item.x, z: item.z, rot: item.rot };
}

/** Buy the piece you were trying, where you put it. */
export function buyPreviewed(s: GameState, id: string, at?: { x: number; z: number; rot: Rot; yardSide?: 'left' | 'right' }): GameState {
  const before = new Set(s.furniture.map((p) => p.uid));
  let next = buyFurniture(s, id);
  if (next === s) return s;
  const fresh = next.furniture.find((p) => !before.has(p.uid));
  if (fresh && at && furnitureById(id).mount === 'floor') next = placeFurniture(next, fresh.uid, at.x, at.z, at.rot);
  if (fresh && at && furnitureById(id).mount === 'yard') next = { ...next, furniture: next.furniture.map((p) => p.uid === fresh.uid ? { ...p, yardSide: at.yardSide || (at.x < 0 ? 'left' : 'right') } : p) };
  return next;
}
