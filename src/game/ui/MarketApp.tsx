import React, { useMemo, useState } from 'react';
import { CharacterSvg } from '../../components/renderer/renderCharacter';
import { ANKARA_PRINTS, DEFAULT_WARDROBE, FABRICS, FABRIC_COLORS } from '../../constants/catalog';
import { DIVINE_CONFIG, MALE_CONFIG } from '../../constants/presets';
import { CharacterConfig, FabricId } from '../../types/character';
import { MARKUP, TIERS, naira } from '../economy';
import { CartLine, cartLineCost, cartNewDesigns, cartTotal, displayCap, displayedCount } from '../engine';
import { HAIR_SWATCHES, MARKET, MARKET_CATEGORIES, MarketCategory, MarketEntry, canBuy, entryFor, inCategory, isClothing, minTierFor, pieceCost, priceBand, takesColour } from '../market';
import { colourName } from '../colours';
import { GameState } from '../types';
import { Swatch } from './kit';

const colourList = FABRIC_COLORS.map((c) => ({ name: colourName(c), color: c }));

export function mannequin(e: MarketEntry, fabric: FabricId, color: string, color2: string, pattern: number): CharacterConfig {
  const male = e.for === 'm';
  const base = male ? MALE_CONFIG : DIVINE_CONFIG;
  const renderId = e.renderId || e.id;
  const hairColour = e.kind === 'hair' ? HAIR_SWATCHES[((pattern % HAIR_SWATCHES.length) + HAIR_SWATCHES.length) % HAIR_SWATCHES.length].id : base.hairColor;
  const g = { style: renderId, fabric, color, color2, pattern };
  const w = { ...DEFAULT_WARDROBE[male ? 'male' : 'femaleRegular'] };
  if (e.kind === 'dress') Object.assign(w, { dress: g, top: undefined, bottom: undefined });
  if (e.kind === 'top') w.top = g;
  if (e.kind === 'bottom') w.bottom = g;
  if (e.kind === 'outer') w.outer = g;
  const acc = { ...(base.accessories || {}), headwear: 'none', bag: 'none', glasses: 'none', necklace: 'none', wrist: 'none', beads: false, watch: false } as NonNullable<CharacterConfig['accessories']>;
  if (e.kind === 'shoes') Object.assign(acc, { shoes: renderId, shoesColor: color });
  if (e.kind === 'bag') Object.assign(acc, { bag: renderId, bagColor: color });
  if (e.kind === 'headwear') Object.assign(acc, { headwear: renderId, headwearColor: color });
  if (e.kind === 'necklace') acc.necklace = renderId;
  if (e.kind === 'wrist') acc.wrist = renderId;
  if (e.kind === 'glasses') acc.glasses = renderId;
  return {
    ...base,
    ...(e.kind === 'hair' ? { hair: renderId as CharacterConfig['hair'], hairColor: hairColour as CharacterConfig['hairColor'] } : {}),
    wardrobe: w, outfit: undefined, accessories: acc,
    earrings: e.kind === 'earrings' ? (renderId as CharacterConfig['earrings']) : 'none', state: 'styled',
  };
}

const lineKey = (l: Omit<CartLine, 'key' | 'pieces'>) => [l.kind, l.itemId, l.fabric || '', l.color, l.color2, l.pattern].join('|');

const Stepper: React.FC<{ n: number; set: (n: number) => void; min?: number }> = ({ n, set, min = 0 }) => (
  <span className="inline-flex items-center rounded-full bg-white/10 text-white text-sm">
    <button className="w-8 h-8 rounded-full hover:bg-white/10 disabled:opacity-30" disabled={n <= min} onClick={() => set(n - 1)} aria-label="One less">−</button>
    <span className="w-6 text-center font-semibold">{n}</span>
    <button className="w-8 h-8 rounded-full hover:bg-white/10" onClick={() => set(n + 1)} aria-label="One more">+</button>
  </span>
);

const Chip: React.FC<{ on?: boolean; onClick: () => void; children: React.ReactNode }> = ({ on, onClick, children }) => (
  <button onClick={onClick} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border ${on ? 'bg-orange-500 border-orange-500 text-white' : 'border-white/15 text-slate-200 bg-white/5'}`}>{children}</button>
);

export const MarketApp: React.FC<{ s: GameState; cart: CartLine[]; setCart: (f: (c: CartLine[]) => CartLine[]) => void; onPay: () => void; onBuyDrop: (n: number) => void }> = ({ s, cart, setCart, onPay, onBuyDrop }) => {
  const [view, setView] = useState<'list' | 'item' | 'cart'>('list');
  const [cat, setCat] = useState<MarketCategory>('clothes');
  const [who, setWho] = useState<'f' | 'm'>('f');
  const [origin, setOrigin] = useState<'all' | 'native' | 'english'>('all');
  const [sel, setSel] = useState<MarketEntry | null>(null);
  const [fabric, setFabric] = useState<FabricId>('plain');
  const [color2, setColor2] = useState(FABRIC_COLORS[3]);
  const [pattern, setPattern] = useState(0);
  const [picks, setPicks] = useState<{ color: string; n: number }[]>([]);
  const [preview, setPreview] = useState(FABRIC_COLORS[5]);
  const [flash, setFlash] = useState('');
  const pieces = cart.reduce((a, l) => a + l.pieces, 0);

  const list = useMemo(
    () => MARKET.filter((e) => inCategory(e, cat) && (e.for === 'both' || e.for === who) && (origin === 'all' || e.native === (origin === 'native'))).sort((a, b) => a.price - b.price),
    [cat, who, origin],
  );

  const open = (e: MarketEntry) => {
    setSel(e);
    setFabric(e.fabric || 'plain');
    setPattern(0);
    const firstColour = e.kind === 'hair' ? HAIR_SWATCHES[0].color : FABRIC_COLORS[5];
    setPreview(firstColour);
    setColor2(FABRIC_COLORS[3]);
    setPicks(takesColour(e.kind) ? [] : [{ color: '#C9A163', n: 1 }]);
    setView('item');
  };

  const header = (title: string, back?: () => void) => (
    <div className="bg-gradient-to-r from-orange-500 to-rose-500 px-3 py-2.5 text-white flex items-center gap-2 shrink-0">
      {back && <button onClick={back} className="text-xl px-1" aria-label="Back">‹</button>}
      <div className="flex-1 min-w-0">
        <div className="font-semibold leading-tight truncate">{title}</div>
        <div className="text-[11px] opacity-80">Wholesale · you have {naira(s.cash)}</div>
      </div>
      <button onClick={() => setView('cart')} className="relative rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold" aria-label="Cart">
        🛒 {pieces > 0 && <span className="ml-0.5">{pieces}</span>}
      </button>
    </div>
  );

  if (view === 'cart') {
    const total = cartTotal(cart);
    const fresh = cartNewDesigns(s, cart);
    const free = Math.max(0, displayCap(s) - displayedCount(s));
    const toStorage = Math.max(0, fresh - free);
    return (
      <div className="flex-1 min-h-0 flex flex-col">
        {header('Your cart', () => setView(sel ? 'item' : 'list'))}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 && <p className="text-sm text-slate-400 text-center py-10">Your cart is empty.</p>}
          {cart.map((l) => {
            const e = entryFor(l.kind, l.itemId);
            return (
              <div key={l.key} className="flex items-center gap-2.5 rounded-xl bg-white/5 border border-white/10 p-2">
                <Swatch d={{ color: l.color, color2: l.color2, fabric: l.fabric || 'plain' }} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white truncate">{e?.label}</div>
                  <div className="text-[11px] text-slate-400 truncate">{takesColour(l.kind) ? colourName(l.color) : ''}{isClothing(l.kind) && l.fabric ? ` · ${l.fabric}` : ''} · {naira(cartLineCost(l))}</div>
                </div>
                <Stepper n={l.pieces} set={(n) => setCart((c) => (n <= 0 ? c.filter((x) => x.key !== l.key) : c.map((x) => (x.key === l.key ? { ...x, pieces: n } : x))))} />
              </div>
            );
          })}
        </div>
        {cart.length > 0 && (
          <div className="border-t border-white/10 p-3 space-y-1.5 bg-[#161616] shrink-0">
            <div className="flex justify-between text-sm text-slate-300"><span>{pieces} pieces · {cart.length} line{cart.length > 1 ? 's' : ''}</span><span className="text-white font-bold text-lg">{naira(total)}</span></div>
            <div className="flex justify-between text-xs text-slate-400"><span>Balance after</span><span className={s.cash - total < 0 ? 'text-rose-300' : ''}>{naira(s.cash - total)}</span></div>
            <div className="text-[11px] text-slate-400">
              {fresh} new design{fresh === 1 ? '' : 's'}, {free} free display space{free === 1 ? '' : 's'}.{toStorage > 0 ? ` ${toStorage} will go to storage until you buy more rails.` : ''}
            </div>
            <div className="flex gap-2 pt-1">
              <button className="rounded-full border border-white/20 text-slate-200 text-sm px-4 py-2.5" onClick={() => setCart(() => [])}>Clear</button>
              <button className="flex-1 rounded-full bg-orange-500 text-white font-bold py-2.5 disabled:opacity-40" disabled={s.cash < total} onClick={() => { onPay(); setFlash(`Paid ${naira(total)}. It's in the shop.`); setView('list'); setTimeout(() => setFlash(''), 2500); }}>
                {s.cash < total ? 'Not enough money' : `Pay ${naira(total)}`}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'item' && sel) {
    const clothing = isClothing(sel.kind);
    const unit = pieceCost(sel, clothing ? fabric : undefined);
    const n = picks.reduce((a, p) => a + p.n, 0);
    const locked = !canBuy(sel, s.tier);
    const requiredTier = minTierFor(sel);
    const itemColours = sel.kind === 'hair' ? HAIR_SWATCHES : colourList;
    const previewPattern = sel.kind === 'hair' ? Math.max(0, HAIR_SWATCHES.findIndex((h) => h.color === preview)) : pattern;
    const toggle = (color: string) => {
      setPreview(color);
      setPicks((ps) => (ps.some((p) => p.color === color) ? ps.filter((p) => p.color !== color) : [...ps, { color, n: 1 }]));
    };
    const add = () => {
      setCart((c) => {
        let next = [...c];
        for (const p of picks) {
          if (!p.n) continue;
          const base = { kind: sel.kind, itemId: sel.id, fabric: clothing ? fabric : undefined, color: p.color, color2: clothing ? color2 : p.color, pattern: sel.kind === 'hair' ? Math.max(0, HAIR_SWATCHES.findIndex((h) => h.color === p.color)) : clothing ? pattern : 0 };
          const key = lineKey(base);
          const have = next.find((x) => x.key === key);
          next = have ? next.map((x) => (x.key === key ? { ...x, pieces: x.pieces + p.n } : x)) : [...next, { ...base, key, pieces: p.n }];
        }
        return next;
      });
      setFlash(`Added ${n} to cart`);
      setPicks(takesColour(sel.kind) ? [] : [{ color: '#C9A163', n: 1 }]);
      setTimeout(() => setFlash(''), 1800);
    };
    return (
      <div className="flex-1 min-h-0 flex flex-col">
        {header(sel.label, () => setView('list'))}
        <div className="flex-1 overflow-y-auto">
          <div className="h-72 bg-gradient-to-b from-[#2a2320] to-[#141210] flex justify-center overflow-hidden py-1">
            <CharacterSvg config={mannequin(sel, fabric, picks.length ? preview : takesColour(sel.kind) ? preview : '#C9A163', color2, previewPattern)} idPrefix="mkapp" camera={clothing ? 'full' : sel.kind === 'shoes' ? 'feet' : sel.kind === 'bag' || sel.kind === 'wrist' ? 'accessory' : 'bust'} className="h-full w-auto" />
          </div>
          <div className="p-3 space-y-3">
            <div className="flex items-baseline justify-between">
              <div className="text-xs text-slate-400">{sel.group}{sel.native ? ' · Native' : ''}</div>
              <div className="text-sm text-white"><b>{naira(unit)}</b> <span className="text-slate-400 text-xs">each · sells ~{naira(unit * MARKUP)}</span></div>
            </div>
            {locked && <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2 text-xs text-amber-200">Available from {TIERS[requiredTier]?.name || 'a later shop tier'} onwards. Premium suppliers unlock as your boutique grows.</div>}
            {clothing && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Fabric</div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">{FABRICS.map((f) => <Chip key={f.id} on={fabric === f.id} onClick={() => setFabric(f.id)}>{f.label}</Chip>)}</div>
              </div>
            )}
            {clothing && fabric === 'ankara' && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Print</div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">{ANKARA_PRINTS.map((p, i) => <Chip key={p} on={pattern === i} onClick={() => setPattern(i)}>{p}</Chip>)}</div>
              </div>
            )}
            {takesColour(sel.kind) && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Colours <span className="normal-case font-normal text-slate-500">· tap as many as you want</span></div>
                <div className="flex flex-wrap gap-1.5">
                  {itemColours.map((c) => {
                    const on = picks.some((p) => p.color === c.color);
                    return <button key={c.color} title={'name' in c ? c.name : c.label} onClick={() => toggle(c.color)} className={`w-7 h-7 rounded-full border-2 ${on ? 'border-orange-400 scale-110 ring-2 ring-orange-400/40' : 'border-white/20'}`} style={{ background: c.color }} />;
                  })}
                </div>
              </div>
            )}
            {clothing && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Second colour (print, lace, trim)</div>
                <div className="flex flex-wrap gap-1.5">
                  {colourList.map((c) => <button key={c.color} title={c.name} onClick={() => setColor2(c.color)} className={`w-6 h-6 rounded-full border-2 ${color2 === c.color ? 'border-orange-400 scale-110' : 'border-white/20'}`} style={{ background: c.color }} />)}
                </div>
              </div>
            )}
            {picks.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">How many</div>
                {picks.map((p) => (
                  <div key={p.color} className="flex items-center gap-2 rounded-xl bg-white/5 p-1.5 pl-2">
                    {takesColour(sel.kind) && <button onClick={() => setPreview(p.color)} className="w-6 h-6 rounded-full border border-white/30" style={{ background: p.color }} />}
                    <span className="flex-1 text-sm text-white">{takesColour(sel.kind) ? (sel.kind === 'hair' ? HAIR_SWATCHES.find((h) => h.color === p.color)?.label || colourName(p.color) : colourName(p.color)) : 'Pieces'}</span>
                    <span className="text-xs text-slate-400">{naira(unit * p.n)}</span>
                    <Stepper n={p.n} set={(v) => setPicks((ps) => ps.map((x) => (x.color === p.color ? { ...x, n: v } : x)))} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-white/10 p-3 bg-[#161616] shrink-0">
          {flash && <div className="text-center text-xs text-emerald-300 mb-1.5">{flash}</div>}
          <button className="w-full rounded-full bg-orange-500 text-white font-bold py-2.5 disabled:opacity-40" disabled={locked || n === 0} onClick={add}>
            {locked ? 'Needs a Boutique' : n === 0 ? 'Pick at least one colour' : `Add ${n} to cart · ${naira(unit * n)}`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {header('Yaba Mart')}
      <div className="px-3 pt-2 space-y-2 shrink-0 bg-[#111]">
        <div className="flex gap-1.5 overflow-x-auto pb-1">{MARKET_CATEGORIES.map((c) => <Chip key={c.id} on={cat === c.id} onClick={() => setCat(c.id)}>{c.label}</Chip>)}</div>
        <div className="flex gap-1.5 overflow-x-auto pb-2">
          <Chip on={who === 'f'} onClick={() => setWho('f')}>Women</Chip>
          <Chip on={who === 'm'} onClick={() => setWho('m')}>Men</Chip>
          <span className="w-2 shrink-0" />
          {(['all', 'native', 'english'] as const).map((o) => <Chip key={o} on={origin === o} onClick={() => setOrigin(o)}>{o === 'all' ? 'All' : o === 'native' ? 'Native' : 'English'}</Chip>)}
        </div>
        <div className="flex items-center justify-between gap-2 pb-2 text-[10px] text-slate-400">
          <span>{list.length} styles · sorted low to high</span>
          <span>{who === 'm' && origin === 'english' ? 'Men’s English wear' : who === 'm' && origin === 'native' ? 'Men’s native wear' : who === 'f' && origin === 'english' ? 'Women’s English wear' : who === 'f' && origin === 'native' ? 'Women’s native wear' : 'Filter by gender and style'}</span>
        </div>
      </div>
      {flash && <div className="text-center text-xs text-emerald-300 py-1">{flash}</div>}
      {s.drop && s.drop.day === s.day && <DropCard s={s} onBuy={(n) => { onBuyDrop(n); setFlash(`Got ${n} of the hot drop!`); setTimeout(() => setFlash(''), 2500); }} />}
      <div className="flex-1 overflow-y-auto p-3 pt-1 grid grid-cols-2 gap-2 content-start">
        {list.length === 0 && <p className="col-span-2 text-sm text-slate-500 text-center py-8">Nothing here for this filter.</p>}
        {list.map((e) => {
          const lock = !canBuy(e, s.tier);
          const inCart = cart.filter((l) => l.kind === e.kind && l.itemId === e.id).reduce((a, l) => a + l.pieces, 0);
          const thumbCamera = isClothing(e.kind) ? 'full' : e.kind === 'shoes' ? 'feet' : e.kind === 'bag' || e.kind === 'wrist' ? 'accessory' : 'bust';
          const thumbColor = e.kind === 'hair' ? HAIR_SWATCHES[0].color : '#9A344D';
          const thumbColor2 = '#D9B25A';
          return (
            <button key={e.kind + e.id} onClick={() => open(e)} className={`text-left rounded-xl border border-white/10 bg-white/5 p-2.5 hover:border-orange-400/50 ${lock ? 'opacity-50' : ''}`}>
              <div className="h-28 rounded-lg bg-gradient-to-b from-[#29221f] to-[#151211] flex items-center justify-center overflow-hidden mb-2 border border-white/5">
                <CharacterSvg config={mannequin(e, e.fabric || 'plain', thumbColor, thumbColor2, 0)} idPrefix={`catalog-${e.kind}-${e.id}`} camera={thumbCamera} className="h-full w-auto max-w-full" />
              </div>
              <div className="text-[13px] font-semibold text-white leading-tight">{e.label}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{naira(e.price)} · sells ~{naira(e.price * MARKUP)}</div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                <span className="text-[10px] rounded-full bg-sky-500/15 text-sky-200 px-1.5">{priceBand(e.price)}</span>
                {e.native && <span className="text-[10px] rounded-full bg-emerald-500/20 text-emerald-200 px-1.5">Native</span>}
                {lock && <span className="text-[10px] rounded-full bg-amber-500/20 text-amber-200 px-1.5">{TIERS[minTierFor(e)]?.name || 'Premium'}+</span>}
                {inCart > 0 && <span className="text-[10px] rounded-full bg-orange-500/30 text-orange-100 px-1.5">{inCart} in cart</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const DropCard: React.FC<{ s: GameState; onBuy: (n: number) => void }> = ({ s, onBuy }) => {
  const d = s.drop!;
  const [n, setN] = useState(1);
  const gone = d.left <= 0;
  const takers = d.buyers.filter((b) => b !== 'you').map((b) => s.rivals.find((r) => r.id === b)?.shop).filter(Boolean);
  return (
    <div className="mx-3 mt-1 mb-1 rounded-xl border border-orange-400/60 bg-gradient-to-r from-orange-500/20 to-rose-500/20 p-2.5 flex gap-2.5 items-center">
      <Swatch d={{ color: d.color, color2: d.color2, fabric: d.fabric }} size={42} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-orange-300">🔥 Hot drop · {gone ? 'sold out' : `${d.left} of ${d.total} left`}</div>
        <div className="text-sm text-white font-semibold leading-tight truncate">{d.label}</div>
        <div className="text-[11px] text-slate-300">{naira(d.price)} each · looks with it +4 for a week{takers.length ? ` · bought by ${takers.slice(0, 2).join(', ')}` : ''}</div>
      </div>
      {!gone && (
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Stepper n={n} set={(v) => setN(Math.max(1, Math.min(d.left, v)))} min={1} />
          <button className="rounded-full bg-orange-500 text-white text-xs font-bold px-3 py-1.5 disabled:opacity-40" disabled={s.cash < d.price * n} onClick={() => { onBuy(n); setN(1); }}>Buy · {naira(d.price * n)}</button>
        </div>
      )}
    </div>
  );
};
