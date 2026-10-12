import React, { useMemo, useState } from 'react';
import { CharacterSvg } from '../../components/renderer/renderCharacter';
import { BEARDS, BLUSH_SHADES, EYESHADOWS, FEMALE_HAIR, HAIR_COLORS, LASHES, LINERS, LIP_FINISHES, LIP_SHADES, MAKEUP_LOOKS, MALE_HAIR, SHADOW_STYLES } from '../../constants/catalog';
import { HAIR_PALETTES } from '../../components/renderer/hair';
import { CameraView, Makeup } from '../../types/character';
import { HAIR_COST, MARKUP, naira } from '../economy';
import { entryFor } from '../market';
import { OCCASION_LABEL } from '../customers';
import { buildLook, designsOf, hairGroup, lookCost } from '../scoring';
import { productKey } from '../market';
import { Customer, Design, GameState, StyleChoice, Want } from '../types';
import { Btn, CLASS_LABEL, CLASS_TONE, Chip, ColourDots, Pill, Swatch } from './kit';

type Tab = 'outfit' | 'feet' | 'extras' | 'hair' | 'face';

const wantLabel = (w: Want) =>
  ({ color: `Colour: ${(w as { name?: string }).name}`, native: 'Native', english: 'English wear', gele: 'Gele', nails: 'Nails', noHeels: 'No heels', fitted: 'Show her shape', covered: 'Nothing short or open', jacket: 'Jacket', hair: `Hair: ${(w as { group?: string }).group}`, glam: 'Full glam', naturalFace: 'Light makeup' })[w.kind];

const SERVICE_LABEL = { hair: 'Hair only', makeup: 'Makeup only', both: 'Hair & makeup only' } as const;

export const RequestCard: React.FC<{ c: Customer; compact?: boolean }> = ({ c, compact }) => (
  <div className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-transparent p-4">
    <div className="flex flex-wrap items-center gap-2 mb-2">
      <span className="text-lg font-serif font-bold text-white">{c.name}</span>
      <Pill tone={CLASS_TONE[c.cls]}>{CLASS_LABEL[c.cls]}</Pill>
      <Pill tone="purple">{OCCASION_LABEL[c.occasion]}</Pill>
      {c.regularId && <Pill tone="green">Regular</Pill>}
      {c.service && <Pill tone="blue">{c.male ? 'Haircut only' : SERVICE_LABEL[c.service]}</Pill>}
      {c.influencer && <Pill tone="red">Influencer: posts about you</Pill>}
    </div>
    {!compact && <p className="text-sm text-slate-200 leading-relaxed italic">"{c.request}"</p>}
    <div className="flex flex-wrap gap-1.5 mt-2">
      {c.contest ? <Pill tone="red">Style-off: beat {c.contest.rivalScore >= 80 ? 'a strong' : 'your'} rival · prize {naira(c.contest.prize)}</Pill> : <Pill tone="gold">Budget about {naira(c.budget)}</Pill>}
      {c.wants.map((w, i) => (
        <Pill key={i}>{wantLabel(w)}</Pill>
      ))}
    </div>
  </div>
);

const ItemList: React.FC<{ title: string; slot: keyof StyleChoice; items: Design[]; empty?: string; choice: StyleChoice; toggle: (slot: keyof StyleChoice, uid: string) => void }> = ({ title, slot, items, empty, choice, toggle }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const groups = useMemo(() => {
    const map = new Map<string, Design[]>();
    for (const d of items) {
      const key = productKey(d);
      map.set(key, [...(map.get(key) || []), d]);
    }
    return [...map.entries()].map(([key, variants]) => ({ key, variants }));
  }, [items]);
  return (
    <div className="mb-3">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{title}</div>
      {groups.length === 0 ? (
        <p className="text-xs text-slate-500 mb-3">{empty || 'Nothing on display. Buy some at the market tomorrow morning.'}</p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {groups.map(({ key, variants }) => {
            const selected = variants.find((d) => d.uid === choice[slot]);
            const on = !!selected;
            const open = expanded === key;
            const d = selected || variants[0];
            const e = entryFor(d.kind, d.itemId);
            const units = variants.reduce((sum, v) => sum + v.pieces, 0);
            const colors = [...new Set(variants.map((v) => v.color))].length;
            return (
              <div key={key} className={`rounded-lg border overflow-hidden ${on ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 bg-white/5'}`}>
                <button type="button" onClick={() => setExpanded(open ? null : key)} className="w-full flex items-center gap-2 p-2 text-left hover:bg-white/5">
                  <Swatch d={d} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-white leading-tight">{d.label}</span>
                    <span className="block text-[10px] text-slate-400">
                      {e?.native ? 'Native · ' : ''}{d.fabric !== 'plain' ? `${d.fabric} · ` : ''}{naira(d.cost * MARKUP)} · {units} left
                    </span>
                    <span className="block text-[10px] text-amber-200">{colors} colour{colors === 1 ? '' : 's'} · {open ? 'choose colour' : 'tap to choose'}</span>
                  </span>
                  <span className="text-slate-400 text-xs">{open ? '⌃' : '⌄'}</span>
                </button>
                {open && (
                  <div className="border-t border-white/10 p-2 bg-black/15">
                    <div className="text-[10px] text-slate-400 mb-1.5">Choose the colour to put on {slot === 'hairpiece' ? 'the hairpiece' : 'the look'}.</div>
                    <div className="flex flex-wrap gap-2">
                      {variants.map((v) => (
                        <button key={v.uid} type="button" title={`${v.color} · ${v.pieces} left`} onClick={() => toggle(slot, v.uid)} className={`relative w-9 h-9 rounded-full border-2 ${choice[slot] === v.uid ? 'border-amber-300 ring-2 ring-amber-400/40' : 'border-white/25'} `} style={{ background: v.color }}>
                          {v.pieces <= 0 && <span className="absolute inset-0 rounded-full bg-black/70 text-[9px] flex items-center justify-center text-rose-200">0</span>}
                          {choice[slot] === v.uid && <span className="absolute -right-1 -top-1 bg-amber-300 text-black w-4 h-4 rounded-full text-[10px] flex items-center justify-center">✓</span>}
                        </button>
                      ))}
                    </div>
                    {selected && <div className="mt-2 text-[10px] text-emerald-200">Selected: {selected.color} · {selected.pieces} in stock</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


export const Styling: React.FC<{
  state: GameState;
  customer: Customer;
  onFinish: (choice: StyleChoice) => void;
  onTurnAway: () => void;
  onSendToStaff: (() => void) | null;
  canWig?: boolean;
  /** Keeps work in progress if she steps back to the shop floor. */
  initial?: StyleChoice;
  onChange?: (choice: StyleChoice) => void;
}> = ({ state, customer: c, onFinish, onTurnAway, onSendToStaff, canWig = true, initial, onChange }) => {
  const [choice, setChoiceRaw] = useState<StyleChoice>(initial || {});
  const setChoice: typeof setChoiceRaw = (f) => setChoiceRaw((ch) => {
    const next = typeof f === 'function' ? f(ch) : f;
    onChange?.(next);
    return next;
  });
  const [tab, setTab] = useState<Tab>(c.service ? (c.service === 'makeup' ? 'face' : 'hair') : 'outfit');
  const [camera, setCamera] = useState<CameraView>('full');
  const [showBefore, setShowBefore] = useState(false);

  const shown = useMemo(() => state.stock.filter((d) => d.displayed && d.pieces > 0 && (() => {
    const e = entryFor(d.kind, d.itemId);
    return !!e && (e.for === 'both' || e.for === (c.male ? 'm' : 'f'));
  })()), [state.stock, c.male]);
  const kind = (k: Design['kind']) => shown.filter((d) => d.kind === k);

  const look = useMemo(() => buildLook(c, choice, state.stock), [c, choice, state.stock]);
  const preview = useMemo(() => <CharacterSvg config={showBefore ? c.look : look} idPrefix={`sty-${c.id}`} camera={camera} />, [showBefore, c, look, camera]);
  const cost = lookCost(c, choice, state.stock);
  const chosen = designsOf(choice, state.stock);

  const toggle = (slot: keyof StyleChoice, uid: string) => {
    setChoice((ch) => {
      const next = { ...ch, [slot]: ch[slot] === uid ? undefined : uid };
      if (slot === 'dress' && next.dress) { next.top = undefined; next.bottom = undefined; }
      if ((slot === 'top' || slot === 'bottom') && next[slot]) next.dress = undefined;
      return next;
    });
  };
  const setMakeup = (m: Partial<Makeup>) => setChoice((ch) => ({ ...ch, makeup: { ...(ch.makeup || MAKEUP_LOOKS[0].makeup), ...m } }));

  const hairList = c.male ? MALE_HAIR : FEMALE_HAIR;
  const hairColours = HAIR_COLORS.map((h) => ({ name: h.label, color: HAIR_PALETTES[h.id].ends || HAIR_PALETTES[h.id].strandHighlight, id: h.id }));
  const mk = choice.makeup;
  const serviceOnly = !!c.service;
  const tabs: [Tab, string][] = serviceOnly
    ? [...(c.service !== 'makeup' ? [['hair', c.male ? 'Hair & beard' : 'Hair'] as [Tab, string]] : []), ...(c.service !== 'hair' && !c.male ? [['face', 'Makeup'] as [Tab, string]] : [])]
    : [['outfit', 'Outfit'], ['feet', 'Shoes & bags'], ['extras', 'Jewellery & head'], ['hair', c.male ? 'Hair & beard' : 'Hair'], ...(c.male ? [] : [['face', 'Makeup'] as [Tab, string]])];
  const hasOutfit = !!(chosen.dress || chosen.top || chosen.bottom);
  const didService = !!choice.hair || !!choice.hairpiece || !!choice.makeup || !!choice.beard;
  const canFinish = serviceOnly ? didService : hasOutfit || didService;

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-4 p-4">
      {/* left: customer */}
      <div className="space-y-3 min-w-0">
        <RequestCard c={c} />
        <div className="relative rounded-xl border border-white/10 bg-gradient-to-b from-[#1b1d27] to-[#101118] overflow-hidden">
          <div className="absolute top-2 left-2 z-10 flex gap-1">
            {(['full', 'bust', 'portrait'] as CameraView[]).map((v) => (
              <Chip key={v} on={camera === v} onClick={() => setCamera(v)}>
                {v === 'full' ? 'Full' : v === 'bust' ? 'Bust' : 'Face'}
              </Chip>
            ))}
          </div>
          <div className="absolute top-2 right-2 z-10">
            <Chip on={showBefore} onClick={() => setShowBefore((b) => !b)}>
              {showBefore ? 'Showing: as she came' : 'Show before'}
            </Chip>
          </div>
          <div className="max-w-[420px] mx-auto">
            {preview}
          </div>
        </div>
      </div>

      {/* right: tools */}
      <div className="min-w-0 flex flex-col">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tabs.map(([id, label]) => (
            <Btn key={id} size="sm" tone={tab === id ? 'gold' : 'ghost'} onClick={() => setTab(id)}>
              {label}
            </Btn>
          ))}
        </div>

        {serviceOnly && <p className="text-xs text-sky-200 mb-2 rounded-lg border border-sky-500/30 bg-sky-500/10 p-2">{c.name} is not buying clothes today. Just do {c.male ? 'his' : 'her'} {c.service === 'makeup' ? 'face' : c.service === 'both' ? 'hair and face' : 'hair'}, then finish.</p>}
        <div className="flex-1 overflow-y-auto max-h-[56vh] pr-1">
          {tab === 'outfit' && (
            <>
              <ItemList title={c.male ? 'Native sets & kaftans' : 'Dresses & gowns'} choice={choice} toggle={toggle} slot="dress" items={kind('dress')} />
              <ItemList title="Tops" choice={choice} toggle={toggle} slot="top" items={kind('top')} />
              <ItemList title="Bottoms" choice={choice} toggle={toggle} slot="bottom" items={kind('bottom')} />
              <ItemList title="Outerwear" choice={choice} toggle={toggle} slot="outer" items={kind('outer')} empty="No jackets on display." />
            </>
          )}
          {tab === 'feet' && (
            <>
              <ItemList title="Shoes" choice={choice} toggle={toggle} slot="shoes" items={kind('shoes')} />
              <ItemList title="Bags" choice={choice} toggle={toggle} slot="bag" items={kind('bag')} empty="No bags on display." />
            </>
          )}
          {tab === 'extras' && (
            <>
              <ItemList title="Headwear" choice={choice} toggle={toggle} slot="headwear" items={kind('headwear')} empty="No headwear on display." />
              {!c.male && <ItemList title="Earrings" choice={choice} toggle={toggle} slot="earrings" items={kind('earrings')} empty="No earrings on display." />}
              <ItemList title="Necklaces" choice={choice} toggle={toggle} slot="necklace" items={kind('necklace')} empty="No necklaces on display." />
              <ItemList title="Wrist" choice={choice} toggle={toggle} slot="wrist" items={kind('wrist')} empty="No wristwear on display." />
              <ItemList title="Eyewear" choice={choice} toggle={toggle} slot="glasses" items={kind('glasses')} empty="No eyewear on display." />
            </>
          )}
          {tab === 'hair' && (
            <>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Install a style (attachments sold at markup)</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-3">
                {hairList.map((h) => {
                  const locked = !canWig && hairGroup(h.id) === 'wig';
                  return (
                    <Chip key={h.id} on={choice.hair === h.id} onClick={() => !locked && setChoice((ch) => ({ ...ch, hair: ch.hair === h.id ? undefined : h.id }))} title={locked ? 'Buy a hair station to install wigs' : undefined}>
                      <span className={`block font-semibold ${locked ? 'text-slate-500' : ''}`}>{h.label}</span>
                      <span className="block text-[10px] text-slate-400">{locked ? 'Needs a hair station' : naira((HAIR_COST[hairGroup(h.id)] || 500) * MARKUP)}</span>
                    </Chip>
                  );
                })}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Colour</div>
              <ColourDots colors={hairColours} value={hairColours.find((h) => h.id === (choice.hairColor || c.look.hairColor))?.color} onPick={(col) => setChoice((ch) => ({ ...ch, hairColor: hairColours.find((h) => h.color === col)?.id }))} />
              <div className="mt-4">
                <ItemList title="Wigs, braids & stocked hairpieces" choice={choice} toggle={toggle} slot="hairpiece" items={kind('hair')} empty="No wigs or braided-hair pieces on display. Stock some in Yaba Mart." />
              </div>
              {c.male && (
                <>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1.5">Beard</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {BEARDS.map((b) => (
                      <Chip key={b.id} on={(choice.beard || c.look.maleOnly.facialHair) === b.id} onClick={() => setChoice((ch) => ({ ...ch, beard: b.id }))}>
                        {b.label}
                      </Chip>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          {tab === 'face' && !c.male && (
            <>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">One-tap looks</div>
              <div className="grid grid-cols-3 gap-1.5 mb-4">
                {MAKEUP_LOOKS.map((l) => (
                  <Chip key={l.id} on={choice.makeupLook === l.id} onClick={() => setChoice((ch) => ({ ...ch, makeupLook: l.id, makeup: { ...l.makeup } }))}>
                    <span className="block font-semibold">{l.label}</span>
                    <span className="block text-[10px] text-slate-400">{l.note}</span>
                  </Chip>
                ))}
              </div>
              {mk && (
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Lips</div>
                    <ColourDots colors={LIP_SHADES} value={mk.lipColor} onPick={(lipColor) => setMakeup({ lipColor })} size={22} />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {LIP_FINISHES.map((f) => (
                        <Chip key={f.id} on={(mk.lipFinish || 'gloss') === f.id} onClick={() => setMakeup({ lipFinish: f.id })}>{f.label}</Chip>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Eyeshadow</div>
                    <ColourDots colors={EYESHADOWS} value={mk.eyeshadow || 'none'} onPick={(eyeshadow) => setMakeup({ eyeshadow })} size={22} />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {SHADOW_STYLES.map((f) => (
                        <Chip key={f.id} on={(mk.shadowStyle || 'wash') === f.id} onClick={() => setMakeup({ shadowStyle: f.id })}>{f.label}</Chip>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Liner and lashes</div>
                    <div className="flex flex-wrap gap-1.5">
                      {LINERS.map((f) => (
                        <Chip key={f.id} on={(mk.liner ? mk.linerStyle || 'wing' : 'none') === f.id} onClick={() => setMakeup(f.id === 'none' ? { liner: false } : { liner: true, linerStyle: f.id })}>{f.label}</Chip>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {LASHES.map((f) => (
                        <Chip key={f.id} on={mk.lashes === f.id} onClick={() => setMakeup({ lashes: f.id })}>{f.label}</Chip>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Blush</div>
                    <ColourDots colors={[{ name: 'None', color: 'none' }, ...BLUSH_SHADES]} value={mk.blush ? mk.blushColor : 'none'} onPick={(col) => setMakeup(col === 'none' ? { blush: false } : { blush: true, blushColor: col })} size={22} />
                  </div>
                  <p className="text-[11px] text-slate-500">The full kit (contour, highlighter, contacts, nails) lives in the Character Lab; the one-tap looks already use it.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* bottom bar */}
        <div className="mt-3 rounded-xl border border-white/10 bg-[#101219] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
            <span className="text-slate-400">
              Pieces used: <b className="text-slate-100">{Object.keys(chosen).length}</b> · Goods {naira(cost.goods)} · Hair {naira(cost.hair)}
            </span>
            {!canFinish ? (
              <span className="text-slate-500">{serviceOnly ? `Do the ${c.service === 'makeup' ? 'makeup' : 'hair'} to see the price` : 'Pick clothes from the rail to see the price'}</span>
            ) : (
              <span className={cost.fair > c.budget * 1.05 ? 'text-rose-300 font-semibold' : 'text-emerald-300 font-semibold'}>
                Fair price {naira(cost.low)}–{naira(cost.high)} {cost.fair > c.budget * 1.05 ? '· over her budget!' : ''}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Btn tone="ghost" size="sm" onClick={onTurnAway}>
              Turn away
            </Btn>
            {onSendToStaff && (
              <Btn tone="ghost" size="sm" onClick={onSendToStaff}>
                Send to staff
              </Btn>
            )}
            <Btn tone="gold" onClick={() => onFinish(serviceOnly ? { hair: choice.hair, hairColor: choice.hairColor, makeup: choice.makeup, makeupLook: choice.makeupLook, beard: choice.beard } : choice)} disabled={!canFinish}>
              Finish look →
            </Btn>
          </div>
          {!serviceOnly && !hasOutfit && didService && <p className="text-[11px] text-amber-300 mt-2">No clothes picked. {c.name} came for a full look, so the score will be low.</p>}
        </div>
      </div>
    </div>
  );
};
