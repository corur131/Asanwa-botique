import React, { useState } from 'react';
import { CharacterSvg } from '../../components/renderer/renderCharacter';
import { naira } from '../economy';
import { buildLook, lookCost } from '../scoring';
import { Customer, GameState, ScoreBreakdown, Settlement, StyleChoice } from '../types';
import { Bar, Btn, Modal, Pill } from './kit';

/** Divine names her price. The range is a hint; the customer's reaction is not. */
export const PriceModal: React.FC<{ state: GameState; c: Customer; choice: StyleChoice; onPrice: (price: number) => void; onBack: () => void }> = ({ state, c, choice, onPrice, onBack }) => {
  const cost = lookCost(c, choice, state.stock);
  const min = Math.max(1000, Math.round((Math.min(cost.fair * 0.6, c.budget * 0.8)) / 500) * 500);
  const max = Math.round((Math.max(cost.fair * 1.6, c.budget * 1.3)) / 500) * 500;
  const [price, setPrice] = useState(cost.fair);
  const profit = price - cost.goods - cost.consumables;
  const over = price > c.budget * 1.05;
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <Modal onClose={onBack}>
      <h2 className="font-serif text-2xl font-bold text-white mb-1">Name your price</h2>
      <p className="text-sm text-slate-400 mb-4">
        {c.name} said about <b className="text-amber-300">{naira(c.budget)}</b>. The fair price for this look is {naira(cost.low)}–{naira(cost.high)}.
      </p>
      <div className="text-center mb-3">
        <div className={`text-4xl font-bold ${over ? 'text-rose-300' : 'text-white'}`}>{naira(price)}</div>
        <div className={`text-xs mt-1 ${profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          Profit {naira(profit)} (goods {naira(cost.goods)}, supplies {naira(cost.consumables)})
        </div>
      </div>
      <input type="range" min={min} max={max} step={500} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full accent-amber-500" />
      <div className="relative h-3 mt-1 rounded-full bg-white/10">
        <div className="absolute inset-y-0 rounded-full bg-emerald-500/60" style={{ left: `${pct(cost.low)}%`, width: `${Math.max(1, pct(cost.high) - pct(cost.low))}%` }} />
        <div className="absolute -top-1 -bottom-1 w-1 rounded bg-amber-400" style={{ left: `calc(${Math.max(0, Math.min(100, pct(c.budget)))}% - 2px)` }} />
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 mt-1 mb-4">
        <span>{naira(min)}</span>
        <span><span className="text-emerald-400">■ fair range</span> · <span className="text-amber-400">▮ her budget</span></span>
        <span>{naira(max)}</span>
      </div>
      <ul className="text-xs text-slate-400 space-y-1 mb-5">
        <li>Below the fair range: she pays happily and comes back sooner.</li>
        <li>Over her budget: low-budget customers walk out, middle class bargain, rich clients pay only for a great look.</li>
      </ul>
      <div className="flex gap-2 justify-end">
        <Btn onClick={onBack}>Back to styling</Btn>
        <Btn tone="gold" onClick={() => onPrice(price)}>
          Tell her the price
        </Btn>
      </div>
    </Modal>
  );
};

const REACTION_EMOJI = { scream: 'Screams with joy', smile: 'Big smile', okay: 'Nods', frown: 'Frowns', cry: 'Upset' } as const;

export const Reveal: React.FC<{ state: GameState; c: Customer; choice: StyleChoice; stockBefore: GameState['stock']; score: ScoreBreakdown; st: Settlement; onNext: () => void }> = ({ c, choice, stockBefore, score, st, onNext }) => {
  const after = buildLook(c, choice, stockBefore);
  const sold = st.outcome === 'paid' || st.outcome === 'bargained';
  const tone = score.total >= 80 ? 'text-emerald-300' : score.total >= 62 ? 'text-amber-300' : 'text-rose-300';
  return (
    <div className="p-4 grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          ['Before', c.look],
          ['After', after],
        ].map(([label, cfg], i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-gradient-to-b from-[#1b1d27] to-[#101118] overflow-hidden">
            <div className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 pt-2">{label as string}</div>
            <CharacterSvg config={cfg as typeof after} idPrefix={`rev-${i}-${c.id}`} camera="full" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-white/10 bg-[#15171f] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">{c.name} looks in the mirror…</span>
            <Pill tone={score.total >= 80 ? 'green' : score.total >= 62 ? 'gold' : 'red'}>{REACTION_EMOJI[st.reaction]}</Pill>
          </div>
          <p className="text-lg text-white font-serif italic leading-snug">"{st.line}"</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#15171f] p-4 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300/90">Score</span>
            <span className={`text-4xl font-bold ${tone}`}>{score.total}</span>
          </div>
          <Bar label="Right for the occasion" value={score.occasion} max={35} />
          <Bar label="What she asked for" value={score.request} max={25} />
          <Bar label="Fits her class" value={score.cls} max={15} />
          <Bar label="Complete look" value={score.complete} max={15} />
          <Bar label="Colours work together" value={score.harmony} max={10} />
          {!!score.bonus && <div className="text-[11px] text-emerald-300">Your shop added +{score.bonus}: {score.bonusNotes?.join(', ')}</div>}
          {score.notes.length > 0 && (
            <ul className="pt-1 text-xs text-slate-300 space-y-0.5">
              {score.notes.slice(0, 5).map((n, i) => (
                <li key={i}>• {n}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-[#15171f] p-4 text-sm space-y-1">
          {sold ? (
            <>
              <div className="flex justify-between"><span className="text-slate-400">You asked</span><span>{naira(st.price)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">She paid</span><span className="font-semibold text-white">{naira(st.paid)}</span></div>
              {st.tip > 0 && <div className="flex justify-between"><span className="text-slate-400">Tip</span><span className="text-emerald-300">+{naira(st.tip)}</span></div>}
              <div className="flex justify-between"><span className="text-slate-400">Hair and makeup supplies</span><span className="text-rose-300">−{naira(st.cost)}</span></div>
            </>
          ) : (
            <div className="text-rose-300">{st.outcome === 'walked' ? 'She walked out without buying.' : 'She refused to buy. The clothes go back on the rail.'}</div>
          )}
          <div className="flex justify-between pt-1 border-t border-white/10">
            <span className="text-slate-400">Reputation</span>
            <span className={st.repDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
              {st.repDelta >= 0 ? '+' : ''}
              {st.repDelta.toFixed(1)}
            </span>
          </div>
          {st.becameRegular && <div className="text-emerald-300 text-xs pt-1">{c.name} loved it and will come back as a regular.</div>}
        </div>
        <Btn tone="gold" size="lg" className="w-full" onClick={onNext}>
          Next customer →
        </Btn>
      </div>
    </div>
  );
};
