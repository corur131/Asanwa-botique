import React, { useMemo, useState } from 'react';
import { CharacterSvg } from '../../components/renderer/renderCharacter';
import { ANKARA_PRINTS, DEFAULT_WARDROBE, FABRICS, FABRIC_COLORS } from '../../constants/catalog';
import { DIVINE_CONFIG, MALE_CONFIG } from '../../constants/presets';
import { CharacterConfig, FabricId } from '../../types/character';
import { MARKUP, TIERS, naira } from '../economy';
import { MARKET, MARKET_CATEGORIES, MarketCategory, MarketEntry, canBuy, inCategory, isClothing, makeDesign, pieceCost, takesColour } from '../market';
import { colourName } from '../colours';
import { GameState } from '../types';
import { Btn, Chip, ColourDots, Pill, Swatch } from './kit';

const colourList = FABRIC_COLORS.map((c) => ({ name: colourName(c), color: c }));

function mannequin(e: MarketEntry, fabric: FabricId, color: string, color2: string, pattern: number): CharacterConfig {
  const male = e.for === 'm';
  const base = male ? MALE_CONFIG : DIVINE_CONFIG;
  const g = { style: e.id, fabric, color, color2, pattern };
  const w = { ...DEFAULT_WARDROBE[male ? 'male' : 'femaleRegular'] };
  if (e.kind === 'dress') Object.assign(w, { dress: g, top: undefined, bottom: undefined });
  if (e.kind === 'top') w.top = g;
  if (e.kind === 'bottom') w.bottom = g;
  if (e.kind === 'outer') w.outer = g;
  const acc = { ...(base.accessories || {}), headwear: 'none', bag: 'none', glasses: 'none', necklace: 'none', wrist: 'none', beads: false, watch: false } as NonNullable<CharacterConfig['accessories']>;
  if (e.kind === 'shoes') Object.assign(acc, { shoes: e.id, shoesColor: color });
  if (e.kind === 'bag') Object.assign(acc, { bag: e.id, bagColor: color });
  if (e.kind === 'headwear') Object.assign(acc, { headwear: e.id, headwearColor: color });
  if (e.kind === 'necklace') acc.necklace = e.id;
  if (e.kind === 'wrist') acc.wrist = e.id;
  if (e.kind === 'glasses') acc.glasses = e.id;
  return { ...base, wardrobe: w, outfit: undefined, accessories: acc, earrings: e.kind === 'earrings' ? (e.id as CharacterConfig['earrings']) : 'none', state: 'styled' };
}

export const Market: React.FC<{ state: GameState; onBuy: (d: ReturnType<typeof makeDesign>) => void; onClose: () => void }> = ({ state, onBuy, onClose }) => {
  const [cat, setCat] = useState<MarketCategory>('dress');
  const [who, setWho] = useState<'f' | 'm'>('f');
  const [origin, setOrigin] = useState<'all' | 'native' | 'english'>('all');
  const [sel, setSel] = useState<MarketEntry | null>(null);
  const [fabric, setFabric] = useState<FabricId>('plain');
  const [color, setColor] = useState(FABRIC_COLORS[5]);
  const [color2, setColor2] = useState(FABRIC_COLORS[3]);
  const [pattern, setPattern] = useState(0);
  const [pieces, setPieces] = useState(2);
  const tier = TIERS[state.tier];

  const list = useMemo(
    () => MARKET.filter((e) => inCategory(e, cat) && (e.for === 'both' || e.for === who) && (origin === 'all' || e.native === (origin === 'native'))).sort((a, b) => a.price - b.price),
    [cat, who, origin],
  );
  const groups = useMemo(() => {
    const g: Record<string, MarketEntry[]> = {};
    list.forEach((e) => (g[e.group] = g[e.group] || []).push(e));
    return Object.entries(g);
  }, [list]);

  const choose = (e: MarketEntry) => {
    setSel(e);
    setFabric(e.fabric || 'plain');
  };
  const unit = sel ? pieceCost(sel, isClothing(sel.kind) ? fabric : undefined) : 0;
  const total = unit * pieces;
  const locked = sel ? !canBuy(sel, state.tier) : false;
  const displayed = state.stock.filter((d) => d.displayed).length;

  return (
    <div className="p-4 grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4">
      <div className="min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-serif text-2xl font-bold text-white">Yaba Market</h2>
            <p className="text-xs text-slate-400">Wholesale prices. Each design comes in pieces; every customer who buys it takes one piece home.</p>
          </div>
          <Btn onClick={onClose}>Back to shop</Btn>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {MARKET_CATEGORIES.map((c) => (
            <Btn key={c.id} size="sm" tone={cat === c.id ? 'gold' : 'ghost'} onClick={() => setCat(c.id)}>
              {c.label}
            </Btn>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Chip on={who === 'f'} onClick={() => setWho('f')}>Women</Chip>
          <Chip on={who === 'm'} onClick={() => setWho('m')}>Men</Chip>
          <span className="w-3" />
          {(['all', 'native', 'english'] as const).map((o) => (
            <Chip key={o} on={origin === o} onClick={() => setOrigin(o)}>
              {o === 'all' ? 'All' : o === 'native' ? 'Native' : 'English'}
            </Chip>
          ))}
        </div>
        <div className="max-h-[64vh] overflow-y-auto pr-1 space-y-3">
          {groups.length === 0 && <p className="text-sm text-slate-500">Nothing here for this filter.</p>}
          {groups.map(([g, items]) => (
            <div key={g}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{g}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {items.map((e) => {
                  const lock = !canBuy(e, state.tier);
                  return (
                    <button key={e.kind + e.id} onClick={() => choose(e)} className={`p-2 rounded-lg border text-left transition-all ${sel?.id === e.id && sel.kind === e.kind ? 'border-amber-500 bg-amber-500/15' : 'border-white/10 bg-white/5 hover:border-white/25'} ${lock ? 'opacity-50' : ''}`}>
                      <div className="text-xs font-semibold text-white leading-tight">{e.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {naira(e.price)} · sells ~{naira(e.price * MARKUP)}
                      </div>
                      <div className="flex gap-1 mt-1">
                        {e.native && <Pill tone="green">Native</Pill>}
                        {lock && <Pill tone="gold">Luxury: Boutique+</Pill>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="min-w-0">
        {!sel ? (
          <div className="h-full rounded-xl border border-dashed border-white/15 flex items-center justify-center text-sm text-slate-500 p-8 text-center">
            Pick an item to see it on the mannequin and choose its fabric and colour.
            <br />
            Display: {displayed}/{tier.slots} spaces used. New stock goes on display if there is space, otherwise to storage.
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#15171f] p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-serif text-xl font-bold text-white">{sel.label}</div>
                <div className="text-xs text-slate-400">{sel.group}{sel.native ? ' · Native' : ''}</div>
              </div>
              <Swatch d={{ color, color2, fabric }} size={34} />
            </div>
            <div className="grid grid-cols-[minmax(0,180px)_minmax(0,1fr)] gap-3">
              <div className="rounded-lg bg-gradient-to-b from-[#1b1d27] to-[#101118]">
                <CharacterSvg config={mannequin(sel, fabric, color, color2, pattern)} idPrefix="mkt" camera={['shoes'].includes(sel.kind) ? 'full' : isClothing(sel.kind) ? 'full' : 'bust'} />
              </div>
              <div className="space-y-3 min-w-0">
                {isClothing(sel.kind) && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Fabric</div>
                    <div className="flex flex-wrap gap-1">
                      {FABRICS.map((f) => (
                        <Chip key={f.id} on={fabric === f.id} onClick={() => setFabric(f.id)}>{f.label}</Chip>
                      ))}
                    </div>
                  </div>
                )}
                {fabric === 'ankara' && isClothing(sel.kind) && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Print</div>
                    <div className="flex flex-wrap gap-1">
                      {ANKARA_PRINTS.map((p, i) => (
                        <Chip key={p} on={pattern === i} onClick={() => setPattern(i)}>{p}</Chip>
                      ))}
                    </div>
                  </div>
                )}
                {takesColour(sel.kind) && (
                  <>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Colour</div>
                      <ColourDots colors={colourList} value={color} onPick={setColor} size={22} />
                    </div>
                    {isClothing(sel.kind) && (
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Second colour (print, lace, trim)</div>
                        <ColourDots colors={colourList} value={color2} onPick={setColor2} size={22} />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Pieces</div>
              <div className="flex gap-1.5">
                {[1, 2, 4, 6].map((n) => (
                  <Chip key={n} on={pieces === n} onClick={() => setPieces(n)}>{n}</Chip>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="text-sm">
                <div className="text-slate-400">{naira(unit)} each × {pieces}</div>
                <div className="text-xl font-bold text-white">{naira(total)}</div>
              </div>
              <Btn
                tone="gold"
                disabled={locked || state.cash < total}
                onClick={() => onBuy(makeDesign(sel, { fabric, color, color2, pattern, pieces }))}
              >
                {locked ? 'Needs a Boutique' : state.cash < total ? 'Not enough cash' : 'Buy'}
              </Btn>
            </div>
            <p className="text-[11px] text-slate-500">You have {naira(state.cash)}. Keep enough for rent: {naira(tier.rent)} every 7 days.</p>
          </div>
        )}
      </div>
    </div>
  );
};
