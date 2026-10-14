import React, { useState } from 'react';
import {
  Accessories,
  BrowPreset,
  CharacterConfig,
  EyeShapePreset,
  FaceShapePreset,
  IrisColorId,
  LipShapePreset,
  Makeup,
  NosePreset,
  Garment,
  SkinToneId,
  Wardrobe,
} from '../types/character';
import { SKIN_TONES } from '../constants/skinTones';
import {
  ANKARA_PRINTS,
  BAGS,
  BEARDS,
  BLUSH_PLACEMENTS,
  BLUSH_SHADES,
  BODIES,
  BROW_STYLES,
  CONTACTS,
  DEFAULT_ACCESSORIES,
  DEFAULT_OUTFIT,
  DEFAULT_WARDROBE,
  EARRINGS,
  EYESHADOWS,
  FABRICS,
  FABRIC_COLORS,
  FEMALE_HAIR,
  GLASSES,
  HAIR_COLORS,
  HEADWEAR,
  HIGHLIGHTS,
  LASHES,
  LINERS,
  LINER_COLORS,
  LIP_FINISHES,
  LIP_LINERS,
  LIP_SHADES,
  MAKEUP_LOOKS,
  MALE_HAIR,
  NAIL_COLORS,
  NAIL_FINISHES,
  NECKLACES,
  Option,
  SHADOW_STYLES,
  SHOES,
  Slot,
  WRIST,
  WardrobeItem,
  fitsBody,
  forBody,
  itemsFor,
  wardrobeFromOutfit,
} from '../constants/catalog';
import { HAIR_PALETTES } from './renderer/hair';
import { Sparkles, Eye, Scissors, Heart, Shirt, Gem, Check, Info } from 'lucide-react';

interface ControlsPanelProps {
  config: CharacterConfig;
  onChange: (newConfig: CharacterConfig) => void;
  /** 'divine': the game's opening screen. Women's bodies only, always styled. */
  mode?: 'lab' | 'divine';
}

type TabType = 'model' | 'face' | 'hair' | 'makeup' | 'outfit' | 'accessories';

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'model', label: 'Model', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'face', label: 'Face', icon: <Eye className="w-3.5 h-3.5" /> },
  { id: 'hair', label: 'Hair & Beard', icon: <Scissors className="w-3.5 h-3.5" /> },
  { id: 'makeup', label: 'Makeup', icon: <Heart className="w-3.5 h-3.5" /> },
  { id: 'outfit', label: 'Wardrobe', icon: <Shirt className="w-3.5 h-3.5" /> },
  { id: 'accessories', label: 'Accessories', icon: <Gem className="w-3.5 h-3.5" /> },
];

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------
const Section: React.FC<{ title: string; note?: string; children: React.ReactNode }> = ({ title, note, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">{title}</label>
    {note && <p className="text-[11px] text-slate-400 mb-2">{note}</p>}
    <div className={note ? '' : 'mt-2'}>{children}</div>
  </div>
);

function Chips<T extends string>({ options, value, onPick, cols = 3 }: { options: Option<T>[]; value: T | undefined; onPick: (v: T) => void; cols?: number }) {
  const grid = cols === 2 ? 'grid-cols-2' : cols === 4 ? 'grid-cols-4' : 'grid-cols-3';
  return (
    <div className={`grid ${grid} gap-2`}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onPick(o.id)}
          className={`p-2 rounded-lg border text-left transition-all ${value === o.id ? 'border-amber-500 bg-amber-500/15 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25'}`}
        >
          <div className="text-xs font-semibold leading-tight">{o.label}</div>
          {o.note && <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{o.note}</div>}
        </button>
      ))}
    </div>
  );
}

const Swatches: React.FC<{ colors: { name: string; color: string }[]; value?: string; onPick: (c: string) => void }> = ({ colors, value, onPick }) => (
  <div className="flex flex-wrap gap-2">
    {colors.map((c) => (
      <button
        key={c.name + c.color}
        onClick={() => onPick(c.color)}
        title={c.name}
        className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${value === c.color ? 'border-amber-400 scale-110' : 'border-white/15 hover:border-white/40'}`}
        style={{ background: c.color === 'none' ? 'repeating-linear-gradient(45deg,#2a2d36,#2a2d36 4px,#3a3d46 4px,#3a3d46 8px)' : c.color }}
      >
        {value === c.color && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
      </button>
    ))}
  </div>
);

const Toggle: React.FC<{ label: string; on: boolean; onToggle: () => void }> = ({ label, on, onToggle }) => (
  <button
    onClick={onToggle}
    className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${on ? 'border-amber-500 bg-amber-500/15 text-white' : 'border-white/10 bg-white/5 text-slate-300'}`}
  >
    <span className="text-xs font-semibold">{label}</span>
    <span className={`w-9 h-5 rounded-full relative transition-colors ${on ? 'bg-amber-500' : 'bg-slate-600'}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'left-4' : 'left-0.5'}`} />
    </span>
  </button>
);

function SubTabs<T extends string>({ options, value, onPick, small }: { options: { id: T; label: string }[]; value: T; onPick: (v: T) => void; small?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onPick(o.id)}
          className={`${small ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'} rounded-full border font-medium transition-all ${value === o.id ? 'border-amber-500 bg-amber-500 text-black' : 'border-white/15 bg-white/5 text-slate-300 hover:border-white/30'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type MkTab = 'looks' | 'face' | 'eyes' | 'lips' | 'nails';
const MAKEUP_GROUPS: { id: MkTab; label: string }[] = [
  { id: 'looks', label: 'Looks' },
  { id: 'face', label: 'Face' },
  { id: 'eyes', label: 'Eyes' },
  { id: 'lips', label: 'Lips' },
  { id: 'nails', label: 'Nails' },
];
const SLOT_TABS: { id: Slot; label: string }[] = [
  { id: 'top', label: 'Tops' },
  { id: 'bottom', label: 'Bottoms' },
  { id: 'dress', label: 'Dresses & Gowns' },
  { id: 'outer', label: 'Outerwear' },
];
type AccTab = 'shoes' | 'bags' | 'head' | 'jewellery' | 'eyewear';
const ACC_TABS: { id: AccTab; label: string }[] = [
  { id: 'shoes', label: 'Shoes' },
  { id: 'bags', label: 'Bags' },
  { id: 'head', label: 'Headwear' },
  { id: 'jewellery', label: 'Jewellery' },
  { id: 'eyewear', label: 'Eyewear' },
];

const colorSwatches = FABRIC_COLORS.map((c, i) => ({ name: `Colour ${i + 1}`, color: c }));

// ---------------------------------------------------------------------------
export const ControlsPanel: React.FC<ControlsPanelProps> = ({ config, onChange, mode = 'lab' }) => {
  const divine = mode === 'divine';
  const [activeTab, setActiveTab] = useState<TabType>('model');
  const update = (partial: Partial<CharacterConfig>) => onChange({ ...config, ...partial });

  const isMale = config.body === 'male';
  const isPlain = config.state === 'plain';
  const [mkTab, setMkTab] = useState<MkTab>('looks');
  const [slot, setSlot] = useState<Slot>('top');
  const [origin, setOrigin] = useState<'all' | 'native' | 'english'>('all');
  const [accTab, setAccTab] = useState<AccTab>('shoes');
  const acc: Accessories = { ...DEFAULT_ACCESSORIES[isMale ? 'male' : 'female'], ...(config.accessories || {}) };
  if ((!acc.wrist || acc.wrist === 'none') && acc.watch) acc.wrist = 'watch';
  if ((!acc.necklace || acc.necklace === 'none') && acc.beads) acc.necklace = 'coral';
  const mk = config.makeup;
  const wardrobe: Wardrobe = config.wardrobe || wardrobeFromOutfit(config.outfit || DEFAULT_OUTFIT[config.body]);
  const current: Garment | undefined = wardrobe[slot];

  const setMakeup = (p: Partial<Makeup>) => update({ makeup: { ...mk, ...p } });
  const setAcc = (p: Partial<Accessories>) => update({ accessories: { ...acc, ...p } });
  const setWardrobe = (w: Wardrobe) => update({ wardrobe: w, outfit: undefined });
  const setGarment = (p: Partial<Garment>) => current && setWardrobe({ ...wardrobe, [slot]: { ...current, ...p } });

  /** A dress replaces the top and bottom; a top or bottom replaces the dress. */
  const pickItem = (it: WardrobeItem) => {
    const g: Garment = { style: it.id, fabric: it.fabric, color: current?.color || FABRIC_COLORS[5], color2: current?.color2 || FABRIC_COLORS[0], pattern: current?.pattern ?? 0 };
    const dflt = DEFAULT_WARDROBE[config.body];
    if (it.slot === 'dress') setWardrobe({ dress: g, outer: wardrobe.outer });
    else if (it.slot === 'outer') setWardrobe({ ...wardrobe, outer: g });
    else setWardrobe({ top: wardrobe.top || dflt.top, bottom: wardrobe.bottom || dflt.bottom, outer: wardrobe.outer, [it.slot]: g });
  };
  const items = itemsFor(isMale, slot).filter((it) => origin === 'all' || it.native === (origin === 'native'));
  const groups = Object.entries(
    items.reduce<Record<string, WardrobeItem[]>>((acc2, it) => {
      (acc2[it.group] = acc2[it.group] || []).push(it);
      return acc2;
    }, {}),
  );

  const switchBody = (body: CharacterConfig['body']) => {
    const male = body === 'male';
    const keep = (male === isMale);
    update({
      body,
      hair: fitsBody(config.hair, body) ? config.hair : male ? 'waves' : 'longBraids',
      wardrobe: keep ? wardrobe : { ...DEFAULT_WARDROBE[body] },
      outfit: undefined,
      accessories: keep ? acc : { ...DEFAULT_ACCESSORIES[male ? 'male' : 'female'] },
    });
  };

  const hairColorSwatches = HAIR_COLORS.map((h) => ({ name: h.label, color: HAIR_PALETTES[h.id].ends || HAIR_PALETTES[h.id].strandHighlight }));

  return (
    <div className="flex flex-col h-full bg-[#13151b] text-slate-100 border-l border-white/10 select-none">
      {isPlain && (
        <div className="bg-amber-950/60 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-200 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Plain customer:</strong> messy hair, no makeup, faded wrinkled clothes and slippers. Skin, body and features stay exactly the same.
          </span>
        </div>
      )}

      <div className="flex items-center border-b border-white/10 bg-[#0e1014] overflow-x-auto p-1.5 gap-1 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${activeTab === t.id ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            {t.icon}
            {divine && t.id === 'hair' ? 'Hair' : divine && t.id === 'model' ? 'Body & skin' : t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'model' && (
          <>
            <Section title="Body">
              <Chips options={divine ? BODIES.filter((b) => b.id !== 'male') : BODIES} value={config.body} onPick={switchBody} cols={divine ? 3 : 4} />
            </Section>
            {!divine && <Section title="State" note="Plain is how customers walk in. Styled is after Divine is done with them.">
              <Chips
                options={[
                  { id: 'styled', label: 'Styled', note: 'Hair done, makeup, outfit' },
                  { id: 'plain', label: 'Plain customer', note: 'Messy and unstyled' },
                ]}
                value={config.state}
                onPick={(state) => update({ state })}
                cols={2}
              />
            </Section>}
            <Section title="Skin tone">
              <div className="space-y-2">
                {(Object.keys(SKIN_TONES) as SkinToneId[]).map((k) => {
                  const tone = SKIN_TONES[k];
                  const sel = config.skinTone === k;
                  return (
                    <button
                      key={k}
                      onClick={() => update({ skinTone: k })}
                      className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${sel ? 'border-amber-500 bg-amber-500/15' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex rounded overflow-hidden border border-black/40 shrink-0">
                          {[tone.highlight, tone.base, tone.mid, tone.shadow, tone.contour].map((c, i) => (
                            <span key={i} className="w-3.5 h-6" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white">{tone.name}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">{tone.description}</div>
                        </div>
                      </div>
                      {sel && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </Section>
          </>
        )}

        {activeTab === 'face' && (
          <>
            <Section title="Face shape">
              <Chips<FaceShapePreset> options={[{ id: 'oval', label: 'Oval' }, { id: 'heart', label: 'Heart' }, { id: 'square', label: 'Square' }]} value={config.faceShape} onPick={(faceShape) => update({ faceShape })} />
            </Section>
            <Section title="Eyes">
              <Chips<EyeShapePreset>
                options={[{ id: 'almond', label: 'Almond' }, { id: 'upturned', label: 'Upturned' }, { id: 'doe', label: 'Doe' }, { id: 'hooded', label: 'Hooded' }]}
                value={config.eyes.shape}
                onPick={(shape) => update({ eyes: { ...config.eyes, shape } })}
                cols={4}
              />
            </Section>
            <Section title="Eye colour">
              <Swatches
                colors={[
                  { name: 'darkBrown', color: '#5c2a11' },
                  { name: 'warmAmber', color: '#b87425' },
                  { name: 'hazelGreen', color: '#5f7535' },
                  { name: 'espressoBlack', color: '#1c120e' },
                  { name: 'honeyBronze', color: '#ab722f' },
                ]}
                value={({ darkBrown: '#5c2a11', warmAmber: '#b87425', hazelGreen: '#5f7535', espressoBlack: '#1c120e', honeyBronze: '#ab722f' } as Record<string, string>)[config.eyes.irisColor]}
                onPick={(c) => {
                  const map: Record<string, IrisColorId> = { '#5c2a11': 'darkBrown', '#b87425': 'warmAmber', '#5f7535': 'hazelGreen', '#1c120e': 'espressoBlack', '#ab722f': 'honeyBronze' };
                  update({ eyes: { ...config.eyes, irisColor: map[c] } });
                }}
              />
            </Section>
            <Section title="Brow shape">
              <Chips<BrowPreset> options={[{ id: 'featheredArch', label: 'Arched' }, { id: 'softNatural', label: 'Soft' }, { id: 'straightDefined', label: 'Straight' }]} value={config.brows} onPick={(brows) => update({ brows })} />
            </Section>
            <Section title="Nose">
              <Chips<NosePreset>
                options={[{ id: 'narrowDefined', label: 'Narrow' }, { id: 'button', label: 'Button' }, { id: 'broadAfrican', label: 'Broad' }, { id: 'softRegal', label: 'Regal' }]}
                value={config.nose}
                onPick={(nose) => update({ nose })}
                cols={4}
              />
            </Section>
            <Section title="Lips">
              <Chips<LipShapePreset>
                options={[{ id: 'fullPout', label: 'Full' }, { id: 'definedCupid', label: 'Cupid' }, { id: 'widePillowy', label: 'Wide' }, { id: 'subtleSoft', label: 'Soft' }]}
                value={config.lips.shape}
                onPick={(shape) => update({ lips: { ...config.lips, shape } })}
                cols={4}
              />
            </Section>
          </>
        )}

        {activeTab === 'hair' && (
          <>
            <Section title={`Hairstyle (${isMale ? MALE_HAIR.length : FEMALE_HAIR.length})`}>
              {isMale ? (
                <Chips options={MALE_HAIR} value={config.hair as never} onPick={(hair) => update({ hair })} />
              ) : (
                <Chips options={FEMALE_HAIR} value={config.hair as never} onPick={(hair) => update({ hair })} />
              )}
            </Section>
            <Section title="Hair colour">
              <Swatches colors={hairColorSwatches} value={hairColorSwatches[HAIR_COLORS.findIndex((h) => h.id === config.hairColor)]?.color} onPick={(c) => update({ hairColor: HAIR_COLORS[hairColorSwatches.findIndex((s) => s.color === c)].id })} />
              <p className="text-[11px] text-slate-400 mt-2">{HAIR_COLORS.find((h) => h.id === config.hairColor)?.label}</p>
            </Section>
            {isMale && (
              <Section title="Beard">
                <Chips options={BEARDS} value={config.maleOnly.facialHair} onPick={(facialHair) => update({ maleOnly: { facialHair } })} cols={4} />
              </Section>
            )}
          </>
        )}

        {activeTab === 'makeup' &&
          (isMale ? (
            <p className="text-xs text-slate-400">Men in this game don't wear makeup. Style them with hair, beard, outfit and accessories.</p>
          ) : (
            <>
              {isPlain && <p className="text-xs text-amber-300">Makeup only shows in the styled state.</p>}
              <SubTabs options={MAKEUP_GROUPS} value={mkTab} onPick={setMkTab} />
              {mkTab === 'looks' && (
                <Section title="One-tap looks" note="Applies a full face. Tweak anything after.">
                  <div className="grid grid-cols-2 gap-2">
                    {MAKEUP_LOOKS.map((l) => (
                      <button key={l.id} onClick={() => update({ makeup: { ...l.makeup } })} className="p-2 rounded-lg border border-white/10 bg-white/5 text-left hover:border-amber-500">
                        <div className="text-xs font-semibold">{l.label}</div>
                        <div className="text-[10px] text-slate-400">{l.note}</div>
                      </button>
                    ))}
                  </div>
                </Section>
              )}
              {mkTab === 'face' && (
                <>
                  <Section title="Base">
                    <div className="grid grid-cols-2 gap-2">
                      <Toggle label="Foundation" on={!!mk.foundation} onToggle={() => setMakeup({ foundation: !mk.foundation })} />
                      <Toggle label="Concealer" on={!!mk.concealer} onToggle={() => setMakeup({ concealer: !mk.concealer })} />
                      <Toggle label="Setting powder" on={!!mk.powder} onToggle={() => setMakeup({ powder: !mk.powder })} />
                      <Toggle label="Bronzer" on={!!mk.bronzer} onToggle={() => setMakeup({ bronzer: !mk.bronzer })} />
                      <Toggle label="Contour" on={!!mk.contour} onToggle={() => setMakeup({ contour: !mk.contour })} />
                      <Toggle label="Highlighter" on={!!mk.highlighter} onToggle={() => setMakeup({ highlighter: !mk.highlighter })} />
                    </div>
                  </Section>
                  {mk.foundation && (
                    <Section title="Skin finish">
                      <Chips options={[{ id: 'dewy', label: 'Dewy' }, { id: 'matte', label: 'Matte' }]} value={mk.skinFinish || 'dewy'} onPick={(skinFinish) => setMakeup({ skinFinish })} cols={2} />
                    </Section>
                  )}
                  {mk.highlighter && (
                    <Section title="Highlighter shade">
                      <Swatches colors={HIGHLIGHTS} value={mk.highlightColor} onPick={(highlightColor) => setMakeup({ highlightColor })} />
                    </Section>
                  )}
                  <Section title="Blush">
                    <div className="space-y-2">
                      <Toggle label="Blush on" on={mk.blush} onToggle={() => setMakeup({ blush: !mk.blush })} />
                      {mk.blush && (
                        <>
                          <Swatches colors={BLUSH_SHADES} value={mk.blushColor} onPick={(blushColor) => setMakeup({ blushColor })} />
                          <Chips options={BLUSH_PLACEMENTS} value={mk.blushPlacement || 'apples'} onPick={(blushPlacement) => setMakeup({ blushPlacement })} />
                        </>
                      )}
                    </div>
                  </Section>
                  <Section title="Details">
                    <div className="grid grid-cols-2 gap-2">
                      <Toggle label="Faux freckles" on={!!mk.freckles} onToggle={() => setMakeup({ freckles: !mk.freckles })} />
                      <Toggle label="Beauty mark" on={!!mk.beautyMark} onToggle={() => setMakeup({ beautyMark: !mk.beautyMark })} />
                    </div>
                  </Section>
                </>
              )}
              {mkTab === 'eyes' && (
                <>
                  <Section title="Eyeshadow">
                    <Swatches colors={EYESHADOWS} value={mk.eyeshadow || 'none'} onPick={(eyeshadow) => setMakeup({ eyeshadow })} />
                    {mk.eyeshadow && mk.eyeshadow !== 'none' && (
                      <div className="mt-2">
                        <Chips options={SHADOW_STYLES} value={mk.shadowStyle || 'wash'} onPick={(shadowStyle) => setMakeup({ shadowStyle })} />
                      </div>
                    )}
                  </Section>
                  <Section title="Eyeliner">
                    <Chips options={LINERS} value={mk.liner ? mk.linerStyle || 'wing' : 'none'} onPick={(v) => setMakeup(v === 'none' ? { liner: false } : { liner: true, linerStyle: v })} />
                    {mk.liner && (
                      <div className="mt-2">
                        <Swatches colors={LINER_COLORS} value={mk.linerColor || '#120806'} onPick={(linerColor) => setMakeup({ linerColor })} />
                      </div>
                    )}
                  </Section>
                  <Section title="Lashes">
                    <Chips options={LASHES} value={mk.lashes} onPick={(lashes) => setMakeup({ lashes })} />
                    <div className="mt-2">
                      <Toggle label="Bottom lashes" on={!!mk.bottomLashes} onToggle={() => setMakeup({ bottomLashes: !mk.bottomLashes })} />
                    </div>
                  </Section>
                  <Section title="Brows">
                    <Chips options={BROW_STYLES} value={mk.browStyle || 'natural'} onPick={(browStyle) => setMakeup({ browStyle })} cols={4} />
                  </Section>
                  <Section title="Coloured contacts">
                    <Chips options={CONTACTS} value={mk.contacts || 'none'} onPick={(contacts) => setMakeup({ contacts })} cols={4} />
                  </Section>
                </>
              )}
              {mkTab === 'lips' && (
                <>
                  <Section title={`Lip colour (${LIP_SHADES.length})`}>
                    <Swatches colors={LIP_SHADES} value={mk.lipColor} onPick={(lipColor) => setMakeup({ lipColor })} />
                  </Section>
                  <Section title="Finish">
                    <Chips options={LIP_FINISHES} value={mk.lipFinish || 'gloss'} onPick={(lipFinish) => setMakeup({ lipFinish })} cols={4} />
                  </Section>
                  <Section title="Lip liner">
                    <Swatches colors={LIP_LINERS} value={mk.lipLiner || 'none'} onPick={(lipLiner) => setMakeup({ lipLiner })} />
                  </Section>
                </>
              )}
              {mkTab === 'nails' && (
                <>
                  <Section title="Polish">
                    <Swatches colors={NAIL_COLORS} value={mk.nailColor || 'none'} onPick={(nailColor) => setMakeup({ nailColor })} />
                  </Section>
                  <Section title="Finish">
                    <Chips options={NAIL_FINISHES} value={mk.nailFinish || 'gloss'} onPick={(nailFinish) => setMakeup({ nailFinish })} />
                  </Section>
                </>
              )}
            </>
          ))}

        {activeTab === 'outfit' && (
          <>
            <SubTabs options={SLOT_TABS} value={slot} onPick={setSlot} />
            <SubTabs options={[{ id: 'all', label: 'All' }, { id: 'native', label: 'Native' }, { id: 'english', label: 'English' }]} value={origin} onPick={setOrigin} small />
            {slot === 'outer' && (
              <button onClick={() => setWardrobe({ ...wardrobe, outer: undefined })} className={`w-full p-2 rounded-lg border text-xs ${!wardrobe.outer ? 'border-amber-500 bg-amber-500/15' : 'border-white/10 bg-white/5'}`}>
                No jacket
              </button>
            )}
            {groups.map(([group, items]) => (
              <Section key={group} title={group}>
                <div className="grid grid-cols-2 gap-2">
                  {items.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => pickItem(it)}
                      className={`p-2 rounded-lg border text-left transition-all ${current?.style === it.id ? 'border-amber-500 bg-amber-500/15 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25'}`}
                    >
                      <div className="text-xs font-semibold leading-tight">{it.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">₦{it.price?.toLocaleString()} · {it.native ? 'Native' : 'English'}</div>
                    </button>
                  ))}
                </div>
              </Section>
            ))}
            {current && (
              <>
                <Section title="Fabric">
                  <Chips options={FABRICS} value={current.fabric} onPick={(fabric) => setGarment({ fabric })} cols={4} />
                </Section>
                {current.fabric === 'ankara' && (
                  <Section title="Ankara print">
                    <Chips options={ANKARA_PRINTS.map((label, i) => ({ id: String(i), label }))} value={String(current.pattern ?? 0)} onPick={(v) => setGarment({ pattern: Number(v) })} cols={4} />
                  </Section>
                )}
                <Section title="Main colour">
                  <Swatches colors={colorSwatches} value={current.color} onPick={(color) => setGarment({ color })} />
                </Section>
                <Section title="Second colour" note="Print, lace, embroidery or trim colour.">
                  <Swatches colors={colorSwatches} value={current.color2} onPick={(color2) => setGarment({ color2 })} />
                </Section>
              </>
            )}
          </>
        )}

        {activeTab === 'accessories' && (
          <>
            <SubTabs options={ACC_TABS} value={accTab} onPick={setAccTab} />
            {accTab === 'shoes' && (
              <Section title="Shoes">
                <Chips options={forBody(SHOES, isMale)} value={acc.shoes} onPick={(shoes) => setAcc({ shoes })} />
                <div className="mt-2">
                  <Swatches colors={colorSwatches} value={acc.shoesColor} onPick={(shoesColor) => setAcc({ shoesColor })} />
                </div>
              </Section>
            )}
            {accTab === 'bags' && (
              <Section title="Bag">
                <Chips options={forBody(BAGS, isMale)} value={acc.bag} onPick={(bag) => setAcc({ bag })} />
                {acc.bag !== 'none' && (
                  <div className="mt-2">
                    <Swatches colors={colorSwatches} value={acc.bagColor} onPick={(bagColor) => setAcc({ bagColor })} />
                  </div>
                )}
              </Section>
            )}
            {accTab === 'head' && (
              <Section title="Headwear">
                <Chips options={forBody(HEADWEAR, isMale)} value={acc.headwear} onPick={(headwear) => setAcc({ headwear })} />
                {acc.headwear !== 'none' && (
                  <div className="mt-2">
                    <Swatches colors={colorSwatches} value={acc.headwearColor} onPick={(headwearColor) => setAcc({ headwearColor })} />
                  </div>
                )}
              </Section>
            )}
            {accTab === 'jewellery' && (
              <>
                {!isMale && (
                  <Section title="Earrings">
                    <Chips options={EARRINGS} value={config.earrings} onPick={(earrings) => update({ earrings })} />
                  </Section>
                )}
                <Section title="Necklace">
                  <Chips options={forBody(NECKLACES, isMale)} value={acc.necklace || 'none'} onPick={(necklace) => setAcc({ necklace, beads: false })} />
                </Section>
                <Section title="Wrist">
                  <Chips options={forBody(WRIST, isMale)} value={acc.wrist || 'none'} onPick={(wrist) => setAcc({ wrist, watch: false })} />
                </Section>
              </>
            )}
            {accTab === 'eyewear' && (
              <Section title="Eyewear">
                <Chips options={forBody(GLASSES, isMale)} value={acc.glasses} onPick={(glasses) => setAcc({ glasses })} />
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
};
