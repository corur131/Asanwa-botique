import React, { useMemo, useState } from 'react';
import { naira, TIERS } from '../economy';
import * as E from '../engine';
import { initialBankState } from '../business';
import type { GameState, LedgerLine } from '../types';

/**
 * KoboBank — laid out like a real Nigerian banking app: balance card with hide/show,
 * quick actions, accounts strip, transactions grouped by day with receipts, and every
 * money movement going through a form → confirm → success flow.
 */

type Up = (f: (g: GameState) => GameState) => void;
type Tab = 'home' | 'save' | 'invest' | 'loans' | 'more';
type FlowKind =
  | 'toSavings' | 'fromSavings' | 'toVault' | 'fromVault' | 'payRent'
  | 'fd' | 'tbill' | 'bond' | 'loan' | 'repay';
interface Flow { kind: FlowKind; step: 'form' | 'confirm' | 'done' | 'failed'; amount: string; term: number; source: 'cash' | 'savings'; loanId?: string; premium?: boolean; ref?: string; receipt?: { title: string; rows: [string, string][] } }

const BRAND = '#0B5B45';
const cls = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');
const num = (v: string) => Math.max(0, Math.round(Number(String(v).replace(/[^0-9.]/g, '')) || 0));

/** Stable 10-digit account number for this save. */
function accountNumber(s: GameState) {
  let h = 2166136261;
  for (const ch of (s.listing?.id || 'asanwa') + 'Divine') h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ('20' + String(h >>> 0).padStart(10, '0')).slice(0, 10);
}

function txIcon(line: LedgerLine): { glyph: string; tone: string } {
  const l = line.label.toLowerCase();
  if (/rent|landlord/.test(l)) return { glyph: '🏠', tone: 'bg-amber-100 text-amber-700' };
  if (/loan|financ/.test(l)) return { glyph: '🏦', tone: 'bg-indigo-100 text-indigo-700' };
  if (/interest|coupon|treasury|bond|fixed deposit/.test(l)) return { glyph: '📈', tone: 'bg-emerald-100 text-emerald-700' };
  if (/savings|vault|transfer/.test(l)) return { glyph: '⇄', tone: 'bg-sky-100 text-sky-700' };
  if (/stock|cart|shopper|commission|market/.test(l)) return { glyph: '🛍', tone: 'bg-orange-100 text-orange-700' };
  if (/staff|wage|salary|guard/.test(l)) return { glyph: '👥', tone: 'bg-violet-100 text-violet-700' };
  if (/fuel|power|nepa|generator|bill|running/.test(l)) return { glyph: '⚡', tone: 'bg-yellow-100 text-yellow-700' };
  return line.amount >= 0 ? { glyph: '↓', tone: 'bg-emerald-100 text-emerald-700' } : { glyph: '↑', tone: 'bg-slate-100 text-slate-600' };
}

const Sheet: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/45" onClick={onClose}>
    <div className="max-h-[88%] overflow-y-auto rounded-t-3xl bg-white p-4 pb-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <button onClick={onClose} aria-label="Close" className="h-8 w-8 rounded-full bg-slate-100 text-slate-500">✕</button>
      </div>
      {children}
    </div>
  </div>
);

const Row: React.FC<{ k: string; v: React.ReactNode; strong?: boolean }> = ({ k, v, strong }) => (
  <div className="flex items-start justify-between gap-3 py-2 text-sm">
    <span className="text-slate-500">{k}</span>
    <span className={cls('text-right tabular-nums', strong ? 'font-bold text-slate-900' : 'font-medium text-slate-800')}>{v}</span>
  </div>
);

const Chips: React.FC<{ values: number[]; max?: number; set: (v: string) => void }> = ({ values, max, set }) => (
  <div className="mt-2 flex flex-wrap gap-1.5">
    {values.map((v) => <button key={v} type="button" onClick={() => set(String(v))} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">{naira(v)}</button>)}
    {max !== undefined && max > 0 && <button type="button" onClick={() => set(String(max))} className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: BRAND, color: BRAND }}>Max</button>}
  </div>
);

export const BankApp: React.FC<{ s: GameState; up: Up }> = ({ s, up }) => {
  const bank = s.bank || initialBankState();
  const [tab, setTab] = useState<Tab>('home');
  const [hidden, setHidden] = useState(false);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [receipt, setReceipt] = useState<LedgerLine | null>(null);
  const [filter, setFilter] = useState<'all' | 'in' | 'out' | 'interest'>('all');
  const [goalName, setGoalName] = useState(bank.savingsGoalName);
  const [goalAmount, setGoalAmount] = useState(String(bank.savingsGoalAmount));
  const lines = s.ledger || [];
  const show = (v: number) => (hidden ? '₦ ••••••' : naira(v));
  const fdTotal = bank.fixedDeposits.reduce((a, d) => a + d.amount, 0);
  const investTotal = E.investmentValue(s);
  const loanDebt = bank.loans.reduce((a, l) => a + l.balance, 0);
  const total = E.financialAssets(s);
  const market = E.bankMarket(s);
  const hour = s.phase === 'shop' ? 8 + Math.floor((s.clock || 0) / 60) : 8;
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const rentOwed = Math.max(0, (s.lateRent?.amount || 0) + Math.max(0, Math.round(s.listing.rent) - Math.max(0, s.rentPrepaid || 0)));

  const open = (kind: FlowKind, extra: Partial<Flow> = {}) => setFlow({
    kind, step: 'form', amount: '', source: 'cash',
    term: kind === 'fd' ? 28 : kind === 'tbill' ? 28 : kind === 'bond' ? 12 : kind === 'loan' ? 8 : 0,
    ...extra,
  });

  // ----- what each flow does -------------------------------------------------
  const plan = useMemo(() => {
    if (!flow) return null;
    const a = num(flow.amount);
    const f = flow;
    switch (f.kind) {
      case 'toSavings': return { title: 'Move to Savings', max: s.cash, rows: [['From', 'Current account'], ['To', `Savings · ${bank.savingsRatePct}% weekly`], ['Amount', naira(a)]], run: (g: GameState) => E.transferBank(g, 'savings', a), ok: a > 0 && a <= s.cash };
      case 'fromSavings': return { title: 'Withdraw from Savings', max: bank.savings, rows: [['From', 'Savings'], ['To', 'Current account'], ['Amount', naira(a)]], run: (g: GameState) => E.transferBank(g, 'current', a, 'savings'), ok: a > 0 && a <= bank.savings };
      case 'toVault': return { title: 'Move to Rent Vault', max: s.cash, rows: [['From', 'Current account'], ['To', 'Rent Vault'], ['Amount', naira(a)]], run: (g: GameState) => E.transferBank(g, 'rentVault', a), ok: a > 0 && a <= s.cash };
      case 'fromVault': return { title: 'Withdraw from Rent Vault', max: bank.rentVault, rows: [['From', 'Rent Vault'], ['To', 'Current account'], ['Amount', naira(a)]], run: (g: GameState) => E.transferBank(g, 'current', a, 'rentVault'), ok: a > 0 && a <= bank.rentVault };
      case 'payRent': return { title: `Pay ${s.listing.landlord}`, max: Math.min(s.cash, rentOwed), rows: [['Payee', `${s.listing.landlord} (landlord)`], ['Shop', `${s.listing.street}, ${s.listing.area}`], ['Amount', naira(a)], ['Note', s.lateRent ? 'Clears overdue rent first' : 'Credited to your next rent bill']], run: (g: GameState) => E.payRentEarly(g, a), ok: a > 0 && a <= s.cash && a <= rentOwed };
      case 'fd': {
        const avail = f.source === 'cash' ? s.cash : bank.savings;
        const rate = E.fixedDepositRate(a, f.term);
        return { title: 'Open fixed deposit', max: avail, rows: [['From', f.source === 'cash' ? 'Current account' : 'Savings'], ['Amount', naira(a)], ['Term', `${f.term} days · matures Day ${s.day + f.term}`], ['Return', `${rate}% (${(rate / (f.term / 7)).toFixed(2)}% a week)`], ['You get back', naira(Math.round(a * (1 + rate / 100)))], ['Paid into', 'Savings at maturity'], ['Break early', 'Principal back, interest lost']], run: (g: GameState) => E.createFixedDeposit(g, a, f.term, f.source), ok: a >= 1_000 && a <= avail };
      }
      case 'tbill': {
        const y = E.treasuryBillYield(s, f.term, a);
        const cost = Math.round(a / (1 + y / 100));
        return { title: 'Buy treasury bill', max: Math.floor(s.cash * (1 + y / 100)), rows: [['Face value', naira(a)], ['You pay today', naira(cost)], ['Tenor', `${f.term} days · matures Day ${s.day + f.term}`], ['Yield', `${y}% (this week's auction)`], ['Interest earned', naira(a - cost)], ['Paid into', 'Current account at maturity']], run: (g: GameState) => E.buyTreasuryBill(g, a, f.term), ok: a >= E.MIN_INVESTMENT && cost <= s.cash };
      }
      case 'bond': {
        const c = E.bondCoupon(f.term, a);
        return { title: 'Buy bond', max: s.cash, rows: [['Amount', naira(a)], ['Price', `${(market.bondPrice * 100).toFixed(2)} per 100`], ['Term', `${f.term} weeks · matures Day ${s.day + f.term * 7}`], ['Weekly coupon', `${c}% · about ${naira(Math.round(a / market.bondPrice * c / 100))} a week`], ['Paid into', 'Current account'], ['Sell early', 'At the market price that week']], run: (g: GameState) => E.buyBond(g, a, f.term), ok: a >= E.MIN_INVESTMENT && a <= s.cash };
      }
      case 'loan': {
        const score = E.creditProfile(s).score;
        const rate = Math.max(1.5, E.loanRateForScore(score) - (f.premium ? 0.4 : 0));
        const r = rate / 100;
        const weekly = Math.round(a * r * Math.pow(1 + r, f.term) / (Math.pow(1 + r, f.term) - 1));
        const fee = Math.round(a * E.LOAN_PROCESSING_FEE_RATE);
        return { title: f.premium ? 'Preferred growth loan' : 'Business loan', max: E.maximumLoan(s), rows: [['Amount', naira(a)], ['Processing fee (1%)', `− ${naira(fee)}`], ['You receive', naira(a - fee)], ['Interest', `${rate.toFixed(1)}% a week, built up daily`], ['Weekly repayment', naira(weekly)], ['Term', `${f.term} weeks`], ['Total repayable', naira(weekly * f.term)], ['Paying off early', "Balance + interest so far (at least one week's)"]], run: (g: GameState) => f.premium ? E.takePremiumBusinessLoan(g, a, f.term) : E.takeBusinessLoan(g, a, f.term), ok: a >= 10_000 && a <= E.maximumLoan(s) };
      }
      case 'repay': {
        const loan = bank.loans.find((l) => l.id === f.loanId);
        if (!loan) return null;
        const q = E.loanPayoffQuote(loan, s.day);
        const so = E.loanInterestToDate(loan, s.day);
        const clearing = a >= q.total;
        const interestPart = clearing ? q.interest : Math.min(a, so);
        return { title: 'Repay loan', max: Math.min(s.cash, q.total), rows: [['Loan balance', naira(loan.balance)], ['Interest so far', naira(so)], ...(q.interest > so ? [["Minimum interest (one week's)", naira(q.interest)]] as [string, string][] : []), ['Pay-off amount today', naira(q.total)], ['You pay', naira(clearing ? q.total : a)], ['Goes to interest', naira(interestPart)], ['Goes to balance', naira(clearing ? loan.balance : Math.max(0, a - interestPart))], ...(clearing ? [['Result', 'Loan fully cleared ✓']] as [string, string][] : [])], run: (g: GameState) => E.repayBusinessLoan(g, loan.id, clearing ? q.total : a), ok: a > 0 && Math.min(a, q.total) <= s.cash };
      }
    }
  }, [flow, s, bank, market, rentOwed]);

  const confirm = () => {
    if (!plan || !flow) return;
    const next = plan.run(s);
    const changed = next !== s;
    if (changed) up(() => next);
    setFlow({ ...flow, receipt: { title: plan.title, rows: plan.rows as [string, string][] }, step: changed ? 'done' : 'failed', ref: 'KB' + s.day + Math.random().toString(36).slice(2, 8).toUpperCase() });
  };

  // ----- transactions --------------------------------------------------------
  const filtered = lines.filter((l) => filter === 'all' || (filter === 'in' ? l.amount > 0 : filter === 'out' ? l.amount < 0 : /interest|coupon|treasury|fixed deposit|bond/i.test(l.label)));
  const groups = (rows: LedgerLine[], limit?: number) => {
    const list = typeof limit === 'number' ? rows.slice(0, limit) : rows;
    const byDay = new Map<number, LedgerLine[]>();
    for (const l of list) byDay.set(l.day, [...(byDay.get(l.day) || []), l]);
    return [...byDay.entries()].map(([day, items]) => (
      <div key={day}>
        <div className="px-1 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{day === s.day ? 'Today' : day === s.day - 1 ? 'Yesterday' : `Day ${day}`}</div>
        <div className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm">
          {items.map((l, i) => {
            const ic = txIcon(l);
            return (
              <button key={day + '-' + i} onClick={() => setReceipt(l)} className="flex w-full items-center gap-3 px-3 py-3 text-left">
                <span className={cls('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base', ic.tone)}>{ic.glyph}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">{l.label}</span>
                  <span className="block text-[11px] text-slate-400">{l.t >= 0 ? E.clockText(l.t) : 'Bank processing'}{l.amount === 0 ? ' · notice' : ''}</span>
                </span>
                <span className={cls('shrink-0 text-sm font-semibold tabular-nums', l.amount > 0 ? 'text-emerald-600' : l.amount < 0 ? 'text-slate-900' : 'text-slate-400')}>{hidden ? '••••' : (l.amount > 0 ? '+' : l.amount < 0 ? '−' : '') + naira(Math.abs(l.amount))}</span>
              </button>
            );
          })}
        </div>
      </div>
    ));
  };

  const section = (title: string, right?: React.ReactNode) => (
    <div className="mb-2 mt-5 flex items-center justify-between px-1"><h3 className="text-sm font-bold text-slate-900">{title}</h3>{right}</div>
  );
  const card = 'rounded-2xl bg-white p-4 shadow-sm';
  const primary = 'w-full rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-40';
  const toggle = (on: boolean) => cls('relative h-6 w-11 rounded-full transition', on ? 'bg-emerald-600' : 'bg-slate-300');

  // ----- screens -------------------------------------------------------------
  const Home = (
    <>
      <div className="relative overflow-hidden rounded-3xl p-5 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${BRAND}, #0E7C5E 55%, #134E4A)` }}>
        <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 right-10 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative flex items-center justify-between text-xs text-white/80">
          <span>Current account · {accountNumber(s)}</span>
          <button onClick={() => setHidden((h) => !h)} className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">{hidden ? '👁 Show' : '🙈 Hide'}</button>
        </div>
        <div className="relative mt-3 text-[11px] text-white/70">Available balance</div>
        <div className="relative text-3xl font-extrabold tracking-tight tabular-nums">{show(s.cash)}</div>
        <div className="relative mt-4 flex justify-between border-t border-white/15 pt-3 text-[11px]">
          <span className="text-white/70">Total across KoboBank<br /><b className="text-sm text-white tabular-nums">{show(total)}</b></span>
          {loanDebt > 0 && <span className="text-right text-white/70">Loans owed<br /><b className="text-sm text-rose-100 tabular-nums">{show(loanDebt)}</b></span>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-y-3 rounded-2xl bg-white px-1 py-3 shadow-sm">
        {([
          { label: 'Transfer', glyph: '⇄', go: () => open('toSavings') },
          { label: 'Save', glyph: '🐷', go: () => setTab('save') },
          { label: 'Invest', glyph: '📈', go: () => setTab('invest') },
          { label: 'Loans', glyph: '🏦', go: () => setTab('loans') },
          { label: 'Pay rent', glyph: '🏠', go: () => open('payRent', { amount: String(Math.min(rentOwed, Math.max(0, Math.floor(s.cash)))) }) },
          { label: 'Rent Vault', glyph: '🔒', go: () => setTab('save') },
          { label: 'Statement', glyph: '🧾', go: () => setTab('more') },
          { label: 'Goals', glyph: '🎯', go: () => setTab('more') },
        ]).map((a) => (
          <button key={a.label} onClick={a.go} className="flex flex-col items-center gap-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-lg">{a.glyph}</span>
            <span className="text-[11px] font-semibold text-slate-700">{a.label}</span>
          </button>
        ))}
      </div>

      {(s.lateRent || E.daysToRent(s.day) <= 2) && (
        <div className={cls('mt-4 flex items-center gap-3 rounded-2xl p-3', s.lateRent ? 'bg-rose-50 text-rose-900' : 'bg-amber-50 text-amber-900')}>
          <span className="text-xl">{s.lateRent ? '⚠️' : '🏠'}</span>
          <span className="min-w-0 flex-1 text-xs">{s.lateRent ? <><b>Overdue rent {naira(s.lateRent.amount)}.</b> Clear it by Day {s.lateRent.due}.</> : <><b>Rent {naira(s.listing.rent)}</b> due {E.daysToRent(s.day) === 0 ? 'tonight' : `in ${E.daysToRent(s.day)} days`}. Rent Vault covers {Math.min(100, Math.round(bank.rentVault / Math.max(1, s.listing.rent) * 100))}%.</>}</span>
          <button onClick={() => open('payRent', { amount: String(Math.min(rentOwed, Math.max(0, Math.floor(s.cash)))) })} className="rounded-full px-3 py-1.5 text-xs font-bold text-white" style={{ background: BRAND }}>Pay</button>
        </div>
      )}

      {section('My accounts')}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {([
          { name: 'Savings', v: bank.savings, sub: `${bank.savingsRatePct}% weekly`, go: () => setTab('save') },
          { name: 'Rent Vault', v: bank.rentVault, sub: `${bank.rentVaultRatePct}% weekly`, go: () => setTab('save') },
          { name: 'Fixed deposits', v: fdTotal, sub: `${bank.fixedDeposits.length} active`, go: () => setTab('save') },
          { name: 'Investments', v: investTotal, sub: `${(bank.treasuryBills || []).length + (bank.bonds || []).length} holdings`, go: () => setTab('invest') },
        ]).map((acc) => (
          <button key={acc.name} onClick={acc.go} className="min-w-[132px] rounded-2xl bg-white p-3 text-left shadow-sm">
            <div className="text-[11px] text-slate-500">{acc.name}</div>
            <div className="mt-1 text-base font-bold text-slate-900 tabular-nums">{show(acc.v)}</div>
            <div className="text-[10px] font-semibold text-emerald-600">{acc.sub}</div>
          </button>
        ))}
      </div>

      {section('Recent transactions', <button onClick={() => setTab('more')} className="text-xs font-semibold" style={{ color: BRAND }}>See all</button>)}
      {lines.length ? groups(lines, 8) : <div className={cls(card, 'text-center text-sm text-slate-400')}>No transactions yet.</div>}
    </>
  );

  const autoSaveOn = bank.autoSaveMode === 'automatic';
  const Save = (
    <>
      <div className={card}>
        <div className="flex items-start justify-between">
          <div><div className="text-xs text-slate-500">Savings</div><div className="text-2xl font-extrabold text-slate-900 tabular-nums">{show(bank.savings)}</div><div className="text-[11px] font-semibold text-emerald-600">{bank.savingsRatePct}% interest every week</div></div>
          <span className="text-3xl">🐷</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => open('toSavings')} className="rounded-xl py-2.5 text-sm font-bold text-white" style={{ background: BRAND }}>Add money</button>
          <button onClick={() => open('fromSavings')} className="rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-800">Withdraw</button>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <div><div className="text-sm font-semibold text-slate-900">AutoSave</div><div className="text-[11px] text-slate-500">Save a share of each day's profit automatically</div></div>
          <button aria-label="Toggle AutoSave" onClick={() => up((g) => E.setAutoSave(g, autoSaveOn ? 'manual' : 'automatic'))} className={toggle(autoSaveOn)}><span className={cls('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition', autoSaveOn ? 'left-[22px]' : 'left-0.5')} /></button>
        </div>
        {autoSaveOn && <div className="mt-2"><div className="flex justify-between text-xs"><span className="text-slate-500">Share of daily profit</span><b style={{ color: BRAND }}>{bank.autoSavePercent ?? 10}%</b></div><input aria-label="AutoSave percentage" type="range" min={0} max={Math.max(0, 100 - (bank.rentMode === 'automatic' ? bank.autoRentPercent : 0))} step={5} value={bank.autoSavePercent ?? 10} onChange={(e) => up((g) => E.setAutoSave(g, 'automatic', Number(e.target.value)))} className="mt-2 w-full accent-emerald-600" /></div>}
      </div>

      {section('Rent Vault')}
      <div className={card}>
        <div className="flex items-start justify-between">
          <div><div className="text-2xl font-extrabold text-slate-900 tabular-nums">{show(bank.rentVault)}</div><div className="text-[11px] text-slate-500">Next rent {naira(s.listing.rent)} · {bank.rentVaultRatePct}% weekly</div></div>
          <span className="text-3xl">🔒</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: Math.min(100, bank.rentVault / Math.max(1, s.listing.rent) * 100) + '%' }} /></div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => open('toVault')} className="rounded-xl py-2.5 text-sm font-bold text-white" style={{ background: BRAND }}>Add money</button>
          <button onClick={() => open('fromVault')} className="rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-800">Withdraw</button>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <div><div className="text-sm font-semibold text-slate-900">Auto rent saving</div><div className="text-[11px] text-slate-500">Rent is paid from here first</div></div>
          <button aria-label="Toggle auto rent saving" onClick={() => up((g) => E.setRentSaving(g, bank.rentMode === 'automatic' ? 'manual' : 'automatic'))} className={toggle(bank.rentMode === 'automatic')}><span className={cls('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition', bank.rentMode === 'automatic' ? 'left-[22px]' : 'left-0.5')} /></button>
        </div>
        {bank.rentMode === 'automatic' && <div className="mt-2"><div className="flex justify-between text-xs"><span className="text-slate-500">Share of daily profit</span><b style={{ color: BRAND }}>{bank.autoRentPercent}%</b></div><input aria-label="Rent saving percentage" type="range" min={0} max={80} step={5} value={bank.autoRentPercent} onChange={(e) => up((g) => E.setRentSaving(g, 'automatic', Number(e.target.value)))} className="mt-2 w-full accent-emerald-600" /></div>}
      </div>

      {section('Fixed deposits', <button onClick={() => open('fd')} className="text-xs font-semibold" style={{ color: BRAND }}>+ New</button>)}
      <div className={card}>
        <div className="grid grid-cols-3 gap-2 text-center">
          {E.FIXED_DEPOSIT_TERMS.map((t) => <button key={t} onClick={() => open('fd', { term: t })} className="rounded-xl bg-emerald-50 py-2"><div className="text-xs font-bold text-slate-900">{t} days</div><div className="text-[10px] font-semibold text-emerald-700">{E.fixedDepositRate(1_000_000, t)}%</div></button>)}
        </div>
        <div className="mt-2 text-[11px] text-slate-500">From your current account or Savings, any amount. Bigger deposits earn more. Break early and you keep your money but lose the interest.</div>
        {bank.fixedDeposits.map((fd) => (
          <div key={fd.id} className="mt-3 flex items-center justify-between rounded-xl border border-slate-100 p-3">
            <div><div className="text-sm font-bold text-slate-900 tabular-nums">{show(fd.amount)}</div><div className="text-[11px] text-slate-500">{fd.ratePct}% · matures Day {fd.maturityDay} ({Math.max(0, fd.maturityDay - s.day)} days)</div></div>
            <button onClick={() => { if (window.confirm(`Break this fixed deposit early? You get ${naira(fd.amount)} back in Savings and lose the interest.`)) up((g) => E.breakFixedDeposit(g, fd.id)); }} className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700">Break</button>
          </div>
        ))}
      </div>
    </>
  );

  const bills = bank.treasuryBills || [];
  const bonds = bank.bonds || [];
  const Invest = (
    <>
      <div className="rounded-3xl p-4 text-white shadow" style={{ background: 'linear-gradient(135deg,#1E3A8A,#0F766E)' }}>
        <div className="text-xs text-white/75">Investment portfolio</div>
        <div className="text-2xl font-extrabold tabular-nums">{show(investTotal)}</div>
        <div className="mt-2 flex gap-4 text-[11px] text-white/80"><span>This week's T-bill auction: <b className="text-white">{market.tbillFactor >= 1 ? '▲' : '▼'} {Math.round((market.tbillFactor - 1) * 100)}%</b></span><span>Bond price: <b className="text-white">{(market.bondPrice * 100).toFixed(2)}</b></span></div>
      </div>

      {section('Treasury bills')}
      <div className={card}>
        <p className="text-[11px] text-slate-500">Pay less today, get the full face value back at maturity. Any amount from {naira(E.MIN_INVESTMENT)}. Rates change with each weekly auction.</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {E.TBILL_TENORS.map((t) => <button key={t} onClick={() => open('tbill', { term: t })} className="rounded-xl bg-sky-50 py-2.5"><div className="text-xs font-bold text-slate-900">{t} days</div><div className="text-[10px] font-semibold text-sky-700">{E.treasuryBillYield(s, t)}% yield</div></button>)}
        </div>
        {bills.map((b) => (
          <div key={b.id} className="mt-3 flex items-center justify-between rounded-xl border border-slate-100 p-3">
            <div><div className="text-sm font-bold text-slate-900 tabular-nums">{show(b.face)} face</div><div className="text-[11px] text-slate-500">Paid {naira(b.cost)} · {b.yieldPct}% · Day {b.maturityDay}</div></div>
            <span className="text-[11px] font-semibold text-sky-700">{Math.max(0, b.maturityDay - s.day)} days left</span>
          </div>
        ))}
      </div>

      {section('Government bonds')}
      <div className={card}>
        <p className="text-[11px] text-slate-500">Earn interest every week, then your money back at the end. Sell any time at that week's market price.</p>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {E.BOND_TERMS.map((t) => <button key={t} onClick={() => open('bond', { term: t })} className="rounded-xl bg-indigo-50 py-2.5"><div className="text-xs font-bold text-slate-900">{t} wks</div><div className="text-[10px] font-semibold text-indigo-700">{E.bondCoupon(t)}%/wk</div></button>)}
        </div>
        {bonds.map((b) => {
          const value = Math.round(b.principal * market.bondPrice);
          const paid = Math.round(b.principal * b.boughtPrice);
          return (
            <div key={b.id} className="mt-3 rounded-xl border border-slate-100 p-3">
              <div className="flex items-center justify-between"><div className="text-sm font-bold text-slate-900 tabular-nums">{show(value)}</div><span className={cls('text-[11px] font-bold', value >= paid ? 'text-emerald-600' : 'text-rose-600')}>{value >= paid ? '▲' : '▼'} {naira(Math.abs(value - paid))}</span></div>
              <div className="text-[11px] text-slate-500">{b.couponPct}% weekly coupon · matures Day {b.maturityDay}</div>
              <button onClick={() => { if (window.confirm(`Sell this bond now for ${naira(value)}?`)) up((g) => E.sellBond(g, b.id)); }} className="mt-2 w-full rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-800">Sell now · {naira(value)}</button>
            </div>
          );
        })}
      </div>
    </>
  );

  const credit = E.creditProfile(s);
  const report = E.creditHistoryReport(s);
  const maxLoan = E.maximumLoan(s);
  const Loans = (
    <>
      <div className={card}>
        <div className="flex items-center justify-between">
          <div><div className="text-xs text-slate-500">Credit score</div><div className={cls('text-3xl font-extrabold tabular-nums', credit.score >= 750 ? 'text-emerald-600' : credit.score >= 550 ? 'text-amber-600' : 'text-rose-600')}>{credit.score}<span className="text-sm font-medium text-slate-400"> /850</span></div><div className="text-xs font-semibold text-slate-600">{E.creditRating(credit.score)} · {report.standing}</div></div>
          <div className="text-right"><div className="text-xs text-slate-500">You can borrow</div><div className="text-lg font-extrabold text-slate-900 tabular-nums">{naira(maxLoan)}</div><div className="text-[11px] font-semibold text-amber-600">{E.loanRateForScore(credit.score).toFixed(1)}% a week</div></div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500" style={{ width: Math.max(0, Math.min(100, (credit.score - 300) / 550 * 100)) + '%' }} /></div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]"><div className="rounded-lg bg-slate-50 p-2"><b className="block text-slate-900">{credit.onTimePayments}</b>on time</div><div className="rounded-lg bg-slate-50 p-2"><b className="block text-slate-900">{credit.latePayments}</b>late</div><div className="rounded-lg bg-slate-50 p-2"><b className="block text-slate-900">{report.loansTaken}</b>loans taken</div></div>
        <button disabled={maxLoan < 10_000} onClick={() => open('loan', { amount: String(Math.min(maxLoan, 1_000_000)) })} className={cls(primary, 'mt-3')} style={{ background: BRAND }}>Apply for a loan</button>
        {E.premiumLoanEligible(s) && <button onClick={() => open('loan', { premium: true, amount: String(Math.min(maxLoan, 1_000_000)) })} className="mt-2 w-full rounded-2xl border border-amber-300 bg-amber-50 py-3 text-sm font-bold text-amber-800">Preferred growth loan · 0.4% cheaper</button>}
        {maxLoan < 10_000 && <p className="mt-2 text-[11px] text-rose-600">{credit.score < 450 ? 'Score below 450: rebuild it by paying on time.' : bank.loans.some((l) => l.defaulted || (l.arrearsBalance || 0) > 0) ? 'Clear overdue or defaulted loans first.' : 'Your current loans use up your borrowing limit.'}</p>}
        <p className="mt-2 text-[10px] text-slate-400">1% processing fee on every loan. Interest builds up daily; paying off early costs the balance plus interest so far, at least one week's worth.</p>
      </div>

      {section('My loans', <span className="text-xs text-slate-400">{bank.loans.length} active</span>)}
      {bank.loans.length === 0 && <div className={cls(card, 'text-center text-sm text-slate-400')}>No loans. Nice.</div>}
      {bank.loans.map((loan) => {
        const q = E.loanPayoffQuote(loan, s.day);
        const status = loan.collectionsStarted || (loan.missedPayments || 0) >= 5 ? ['Collections', 'bg-orange-100 text-orange-700'] : loan.defaulted || (loan.missedPayments || 0) >= 3 ? ['Default', 'bg-rose-100 text-rose-700'] : (loan.arrearsBalance || 0) > 0 || loan.missedPayments ? ['Overdue', 'bg-amber-100 text-amber-700'] : ['On track', 'bg-emerald-100 text-emerald-700'];
        const paidShare = Math.max(0, Math.min(100, (1 - loan.balance / Math.max(1, loan.principal)) * 100));
        return (
          <div key={loan.id} className={cls(card, 'mb-2')}>
            <div className="flex items-start justify-between">
              <div><div className="text-[11px] text-slate-500">{loan.loanType === 'premium' ? 'Preferred growth loan' : 'Business loan'} · {naira(loan.principal)}</div><div className="text-xl font-extrabold text-slate-900 tabular-nums">{show(loan.balance)}</div><div className="text-[11px] text-slate-500">left · {loan.weeklyRatePct.toFixed(1)}% weekly</div></div>
              <span className={cls('rounded-full px-2 py-1 text-[10px] font-bold', status[1])}>{status[0]}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: paidShare + '%' }} /></div>
            <Row k="Next payment" v={`${naira(loan.weeklyPayment)} · Day ${loan.nextPaymentDay}`} />
            <Row k="Interest so far" v={naira(E.loanInterestToDate(loan, s.day))} />
            <Row k="Pay off today" v={naira(q.total)} strong />
            {(loan.arrearsBalance || 0) > 0 && <Row k="Overdue" v={<span className="text-rose-600">{naira(loan.arrearsBalance || 0)}</span>} />}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={() => open('repay', { loanId: loan.id, amount: String(Math.min(loan.weeklyPayment, Math.floor(s.cash))) })} className="rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-800">Part payment</button>
              <button disabled={s.cash < q.total} onClick={() => open('repay', { loanId: loan.id, amount: String(q.total) })} className="rounded-xl py-2.5 text-xs font-bold text-white disabled:opacity-40" style={{ background: BRAND }}>Pay off · {naira(q.total)}</button>
            </div>
            {!loan.renegotiationUsed && !loan.arrangementUsed && !loan.defaulted && !loan.collectionsStarted && (loan.missedPayments || 0) === 0 && <button onClick={() => up((g) => E.renegotiateBusinessLoan(g, loan.id))} className="mt-2 w-full text-[11px] font-semibold text-sky-700">Request one-time renegotiation (4 more weeks, +0.3% rate)</button>}
            {((loan.missedPayments || 0) > 0 || (loan.arrearsBalance || 0) > 0) && !loan.arrangementUsed && <button onClick={() => up((g) => E.arrangeBusinessLoanRepayment(g, loan.id))} className="mt-2 w-full text-[11px] font-semibold text-amber-700">Request one-time hardship plan</button>}
          </div>
        );
      })}
    </>
  );

  const reserved = Math.max(0, bank.savings) + Math.max(0, bank.rentVault);
  const goalPct = bank.savingsGoalAmount > 0 ? Math.min(100, Math.round(reserved / bank.savingsGoalAmount * 100)) : 100;
  const More = (
    <>
      <div className={card}>
        <div className="text-xs text-slate-500">Account holder</div>
        <div className="text-base font-bold text-slate-900">{'Divine'} · {TIERS[Math.max(0, Math.min(TIERS.length - 1, s.tier))]?.name}</div>
        <Row k="Account number" v={accountNumber(s)} />
        <Row k="Shop address" v={`${s.listing.street}, ${s.listing.area}`} />
        <Row k="Liabilities" v={naira(E.totalLiabilities(s))} />
        {(s.operatingPayables || 0) > 0 && <Row k="Unpaid running costs" v={<span className="text-amber-600">{naira(s.operatingPayables || 0)}</span>} />}
      </div>

      {section('Savings goal')}
      <div className={card}>
        <div className="flex justify-between text-sm"><b className="text-slate-900">{bank.savingsGoalName}</b><b style={{ color: BRAND }}>{goalPct}%</b></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: goalPct + '%' }} /></div>
        <div className="mt-1 text-[11px] text-slate-500">{naira(reserved)} of {naira(bank.savingsGoalAmount)} in Savings + Rent Vault</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input value={goalName} onChange={(e) => setGoalName(e.target.value)} maxLength={60} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" aria-label="Goal name" />
          <input value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} inputMode="numeric" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" aria-label="Goal amount" />
        </div>
        <button onClick={() => up((g) => E.setSavingsGoal(g, goalName, num(goalAmount)))} className="mt-2 w-full rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-800">Update goal</button>
      </div>

      {section('Statement', <span className="text-xs text-slate-400">{filtered.length} entries</span>)}
      <div className="flex gap-1.5 rounded-2xl bg-white p-1 shadow-sm">
        {([['all', 'All'], ['in', 'Money in'], ['out', 'Money out'], ['interest', 'Interest']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} className={cls('flex-1 rounded-xl py-2 text-[11px] font-bold', filter === id ? 'text-white' : 'text-slate-500')} style={filter === id ? { background: BRAND } : undefined}>{label}</button>
        ))}
      </div>
      {filtered.length ? groups(filtered, 120) : <div className={cls(card, 'mt-2 text-center text-sm text-slate-400')}>Nothing here yet.</div>}
    </>
  );

  // ----- flow sheet ----------------------------------------------------------
  const termOptions = flow?.kind === 'fd' ? [...E.FIXED_DEPOSIT_TERMS] : flow?.kind === 'tbill' ? [...E.TBILL_TENORS] : flow?.kind === 'bond' ? [...E.BOND_TERMS] : flow?.kind === 'loan' ? [4, 8, 12, 24] : [];
  const termUnit = flow?.kind === 'bond' || flow?.kind === 'loan' ? 'wks' : 'days';
  const amountLabel = flow?.kind === 'tbill' ? 'Face value (what you get back)' : 'Amount';
  const view = flow?.receipt && (flow.step === 'done' || flow.step === 'failed') ? { title: flow.receipt.title, rows: flow.receipt.rows, max: plan?.max ?? 0, ok: false, run: (g: GameState) => g } : plan;
  const FlowSheet = flow && view && (
    <Sheet title={flow.step === 'done' ? 'Successful' : flow.step === 'failed' ? 'Not completed' : view.title} onClose={() => setFlow(null)}>
      {flow.step === 'form' && (
        <>
          {flow.kind === 'toSavings' || flow.kind === 'fromSavings' || flow.kind === 'toVault' || flow.kind === 'fromVault' ? (
            <div className="mb-3 grid grid-cols-2 gap-1.5">
              {([['toSavings', 'To Savings'], ['fromSavings', 'From Savings'], ['toVault', 'To Rent Vault'], ['fromVault', 'From Rent Vault']] as const).map(([k, label]) => (
                <button key={k} onClick={() => setFlow({ ...flow, kind: k })} className={cls('rounded-xl py-2 text-xs font-bold', flow.kind === k ? 'text-white' : 'bg-slate-100 text-slate-700')} style={flow.kind === k ? { background: BRAND } : undefined}>{label}</button>
              ))}
            </div>
          ) : null}
          {flow.kind === 'fd' && (
            <div className="mb-3 grid grid-cols-2 gap-1.5">
              {([['cash', `Current · ${naira(s.cash)}`], ['savings', `Savings · ${naira(bank.savings)}`]] as const).map(([k, label]) => (
                <button key={k} onClick={() => setFlow({ ...flow, source: k })} className={cls('rounded-xl py-2 text-[11px] font-bold', flow.source === k ? 'text-white' : 'bg-slate-100 text-slate-700')} style={flow.source === k ? { background: BRAND } : undefined}>{label}</button>
              ))}
            </div>
          )}
          <label className="block text-xs font-semibold text-slate-500">{amountLabel}
            <div className="mt-1 flex items-center rounded-2xl border-2 border-slate-200 px-3 focus-within:border-emerald-600">
              <span className="text-xl font-bold text-slate-400">₦</span>
              <input autoFocus inputMode="numeric" value={flow.amount ? num(flow.amount)?.toLocaleString('en-NG') : ''} onChange={(e) => setFlow({ ...flow, amount: String(num(e.target.value)) })} placeholder="0" className="w-full bg-transparent px-2 py-3 text-2xl font-extrabold text-slate-900 outline-none" />
            </div>
          </label>
          <div className="mt-1 text-[11px] text-slate-400">Available: {naira(Math.max(0, view.max))}</div>
          <Chips values={[50_000, 500_000, 5_000_000].filter((v) => v <= Math.max(view.max, 0))} max={Math.max(0, Math.floor(view.max))} set={(v) => setFlow({ ...flow, amount: v })} />
          {termOptions.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-500">{flow.kind === 'loan' ? 'Repay over' : 'Term'}</div>
              <div className="mt-1 grid grid-cols-3 gap-1.5">
                {termOptions.map((t) => <button key={t} onClick={() => setFlow({ ...flow, term: t })} className={cls('rounded-xl py-2 text-xs font-bold', flow.term === t ? 'text-white' : 'bg-slate-100 text-slate-700')} style={flow.term === t ? { background: BRAND } : undefined}>{t} {termUnit}</button>)}
              </div>
            </div>
          )}
          <button disabled={!view.ok} onClick={() => setFlow({ ...flow, step: 'confirm' })} className={cls(primary, 'mt-5')} style={{ background: BRAND }}>Continue</button>
        </>
      )}
      {flow.step === 'confirm' && (
        <>
          <div className="divide-y divide-slate-100 rounded-2xl bg-slate-50 px-3">
            {view.rows.map(([k, v]) => <Row key={k} k={k} v={v} />)}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={() => setFlow({ ...flow, step: 'form' })} className="rounded-2xl bg-slate-100 py-3.5 text-sm font-bold text-slate-800">Back</button>
            <button onClick={confirm} className="rounded-2xl py-3.5 text-sm font-bold text-white" style={{ background: BRAND }}>Confirm</button>
          </div>
        </>
      )}
      {flow.step === 'done' && (
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">✓</div>
          <div className="mt-3 text-lg font-extrabold text-slate-900">{view.title} done</div>
          <div className="mt-1 text-xs text-slate-500">Reference {flow.ref} · Day {s.day}</div>
          <div className="mt-3 divide-y divide-slate-100 rounded-2xl bg-slate-50 px-3 text-left">{view.rows.filter(([k]) => !/balance|so far/i.test(k) || view.rows.length < 5).slice(0, 5).map(([k, v]) => <Row key={k} k={k} v={v} />)}</div>
          <button onClick={() => setFlow(null)} className={cls(primary, 'mt-4')} style={{ background: BRAND }}>Done</button>
        </div>
      )}
      {flow.step === 'failed' && (
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-3xl text-rose-600">!</div>
          <div className="mt-3 text-sm text-slate-600">KoboBank could not complete this. Check the amount, your available balance or limit, and try again. No money moved.</div>
          <button onClick={() => setFlow({ ...flow, step: 'form' })} className={cls(primary, 'mt-4')} style={{ background: BRAND }}>Try again</button>
        </div>
      )}
    </Sheet>
  );

  const ReceiptSheet = receipt && (
    <Sheet title="Transaction details" onClose={() => setReceipt(null)}>
      <div className="text-center">
        <span className={cls('mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl', txIcon(receipt).tone)}>{txIcon(receipt).glyph}</span>
        <div className={cls('mt-2 text-2xl font-extrabold tabular-nums', receipt.amount > 0 ? 'text-emerald-600' : 'text-slate-900')}>{receipt.amount > 0 ? '+' : receipt.amount < 0 ? '−' : ''}{naira(Math.abs(receipt.amount))}</div>
        <div className="text-xs font-semibold text-emerald-600">Successful</div>
      </div>
      <div className="mt-3 divide-y divide-slate-100 rounded-2xl bg-slate-50 px-3">
        <Row k="Description" v={receipt.label} />
        <Row k="Type" v={receipt.amount > 0 ? 'Credit' : receipt.amount < 0 ? 'Debit' : 'Notice'} />
        <Row k="Category" v={receipt.category ? receipt.category[0].toUpperCase() + receipt.category.slice(1) : 'Business'} />
        <Row k="Date" v={`Day ${receipt.day}${receipt.t >= 0 ? ' · ' + E.clockText(receipt.t) : ''}`} />
        <Row k="Account" v={accountNumber(s)} />
      </div>
    </Sheet>
  );

  const tabs: { id: Tab; label: string; glyph: string }[] = [
    { id: 'home', label: 'Home', glyph: '⌂' }, { id: 'save', label: 'Save', glyph: '🐷' },
    { id: 'invest', label: 'Invest', glyph: '📈' }, { id: 'loans', label: 'Loans', glyph: '🏦' }, { id: 'more', label: 'More', glyph: '☰' },
  ];

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[#F3F6F5] text-slate-900">
      <div className="flex shrink-0 items-center gap-3 bg-white px-4 py-3 shadow-sm">
        <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold text-white" style={{ background: BRAND }}>{'D'}</span>
        <div className="min-w-0 flex-1"><div className="text-[11px] text-slate-500">{greet},</div><div className="truncate text-sm font-bold">{'Divine'}</div></div>
        <span className="text-sm font-extrabold tracking-tight" style={{ color: BRAND }}>Kobo<span className="text-amber-500">Bank</span></span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-3">
        {tab === 'home' && Home}
        {tab === 'save' && Save}
        {tab === 'invest' && Invest}
        {tab === 'loans' && Loans}
        {tab === 'more' && More}
      </div>
      <nav className="grid shrink-0 grid-cols-5 border-t border-slate-200 bg-white">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className="flex flex-col items-center gap-0.5 py-2" style={{ color: tab === t.id ? BRAND : '#94A3B8' }}>
            <span className="text-lg leading-none">{t.glyph}</span>
            <span className="text-[10px] font-bold">{t.label}</span>
          </button>
        ))}
      </nav>
      {FlowSheet}
      {ReceiptSheet}
    </div>
  );
};
