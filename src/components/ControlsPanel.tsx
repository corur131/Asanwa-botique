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
  OutfitSpec,
  SkinToneId,
} from '../types/character';
import { SKIN_TONES } from '../constants/skinTones';
import {
  ANKARA_PRINTS,
  BAGS,
  BEARDS,
  BLUSH_SHADES,
  BODIES,
  BROW_STYLES,
  DEFAULT_ACCESSORIES,
  DEFAULT_OUTFIT,
  EARRINGS,
  EYESHADOWS,
  FABRICS,
  FABRIC_COLORS,
  FEMALE_CUTS,
  FEMALE_HAIR,
  GLASSES,
  HAIR_COLORS,
  HEADWEAR,
  LASHES,
  LINERS,
  LIP_FINISHES,
  LIP_SHADES,
  MALE_CUTS,
  MALE_HAIR,
  Option,
  SHOES,
  fitsBody,
} from '../constants/catalog';
import { HAIR_PALETTES } from './renderer/hair';
import { Sparkles, Eye, Scissors, Heart, Shirt, Gem, Check, Info } from 'lucide-react';

interface ControlsPanelProps {
  config: CharacterConfig;
  onChange: (newConfig: CharacterConfig) => void;
}

type TabType = 'model' | 'face' | 'hair' | 'makeup' | 'outfit' | 'accessories';

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'model', label: 'Model', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'face', label: 'Face', icon: <Eye className="w-3.5 h-3.5" /> },
  { id: 'hair', label: 'Hair & Beard', icon: <Scissors className="w-3.5 h-3.5" /> },
  { id: 'makeup', label: 'Makeup', icon: <Heart className="w-3.5 h-3.5" /> },
  { id: 'outfit', label: 'Outfit', icon: <Shirt className="w-3.5 h-3.5" /> },
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

const colorSwatches = FABRIC_COLORS.map((c, i) => ({ name: `Colour ${i + 1}`, color: c }));

// ---------------------------------------------------------------------------
export const ControlsPanel: React.FC<ControlsPanelProps> = ({ config, onChange }) => {
  const [activeTab, setActiveTab] = useState<TabType>('model');
  const update = (partial: Partial<CharacterConfig>) => onChange({ ...config, ...partial });

  const isMale = config.body === 'male';
  const isPlain = config.state === 'plain';
  const outfit: OutfitSpec = config.outfit || DEFAULT_OUTFIT[config.body];
  const acc: Accessories = { ...DEFAULT_ACCESSORIES[isMale ? 'male' : 'female'], ...(config.accessories || {}) };
  const mk = config.makeup;

  const setMakeup = (p: Partial<Makeup>) => update({ makeup: { ...mk, ...p } });
  const setOutfit = (p: Partial<OutfitSpec>) => update({ outfit: { ...outfit, ...p } });
  const setAcc = (p: Partial<Accessories>) => update({ accessories: { ...acc, ...p } });

  const switchBody = (body: CharacterConfig['body']) => {
    const male = body === 'male';
    update({
      body,
      hair: fitsBody(config.hair, body) ? config.hair : male ? 'waves' : 'longBraids',
      outfit: fitsBody(outfit.cut, body) ? outfit : { ...DEFAULT_OUTFIT[body] },
      accessories: { ...DEFAULT_ACCESSORIES[male ? 'male' : 'female'], ...(config.accessories && fitsBody(outfit.cut, body) ? config.accessories : {}) },
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
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'model' && (
          <>
            <Section title="Body">
              <Chips options={BODIES} value={config.body} onPick={switchBody} cols={4} />
            </Section>
            <Section title="State" note="Plain is how customers walk in. Styled is after Divine is done with them.">
              <Chips
                options={[
                  { id: 'styled', label: 'Styled', note: 'Hair done, makeup, outfit' },
                  { id: 'plain', label: 'Plain customer', note: 'Messy and unstyled' },
                ]}
                value={config.state}
                onPick={(state) => update({ state })}
                cols={2}
              />
            </Section>
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
              <Section title="Eyeshadow">
                <Swatches colors={EYESHADOWS} value={mk.eyeshadow || 'none'} onPick={(eyeshadow) => setMakeup({ eyeshadow })} />
              </Section>
              <Section title="Eyeliner">
                <Chips options={LINERS} value={mk.liner ? mk.linerStyle || 'wing' : 'none'} onPick={(v) => setMakeup(v === 'none' ? { liner: false } : { liner: true, linerStyle: v })} cols={4} />
              </Section>
              <Section title="Lashes">
                <Chips options={LASHES} value={mk.lashes} onPick={(lashes) => setMakeup({ lashes })} />
              </Section>
              <Section title="Brows">
                <Chips options={BROW_STYLES} value={mk.browStyle || 'natural'} onPick={(browStyle) => setMakeup({ browStyle })} />
              </Section>
              <Section title="Lip colour">
                <Swatches colors={LIP_SHADES} value={mk.lipColor} onPick={(lipColor) => setMakeup({ lipColor })} />
              </Section>
              <Section title="Lip finish">
                <Chips options={LIP_FINISHES} value={mk.lipFinish || 'gloss'} onPick={(lipFinish) => setMakeup({ lipFinish })} />
              </Section>
              <Section title="Blush">
                <div className="space-y-2">
                  <Toggle label="Blush on" on={mk.blush} onToggle={() => setMakeup({ blush: !mk.blush })} />
                  {mk.blush && <Swatches colors={BLUSH_SHADES} value={mk.blushColor} onPick={(blushColor) => setMakeup({ blushColor })} />}
                </div>
              </Section>
              <Section title="Glow">
                <div className="grid grid-cols-2 gap-2">
                  <Toggle label="Highlighter" on={!!mk.highlighter} onToggle={() => setMakeup({ highlighter: !mk.highlighter })} />
                  <Toggle label="Contour" on={!!mk.contour} onToggle={() => setMakeup({ contour: !mk.contour })} />
                </div>
              </Section>
            </>
          ))}

        {activeTab === 'outfit' && (
          <>
            <Section title="Cut">
              {isMale ? (
                <Chips options={MALE_CUTS} value={outfit.cut as never} onPick={(cut) => setOutfit({ cut })} cols={2} />
              ) : (
                <Chips options={FEMALE_CUTS} value={outfit.cut as never} onPick={(cut) => setOutfit({ cut })} cols={2} />
              )}
            </Section>
            <Section title="Fabric">
              <Chips options={FABRICS} value={outfit.fabric} onPick={(fabric) => setOutfit({ fabric })} cols={4} />
            </Section>
            {outfit.fabric === 'ankara' && (
              <Section title="Ankara print">
                <Chips options={ANKARA_PRINTS.map((label, i) => ({ id: String(i), label }))} value={String(outfit.pattern ?? 0)} onPick={(v) => setOutfit({ pattern: Number(v) })} cols={4} />
              </Section>
            )}
            <Section title="Main colour">
              <Swatches colors={colorSwatches} value={outfit.color} onPick={(color) => setOutfit({ color })} />
            </Section>
            <Section title="Second colour" note="Print colour, or the second piece (top, trousers, jeans).">
              <Swatches colors={colorSwatches} value={outfit.color2} onPick={(color2) => setOutfit({ color2 })} />
            </Section>
          </>
        )}

        {activeTab === 'accessories' && (
          <>
            <Section title="Headwear">
              <Chips options={HEADWEAR.filter((h) => h.id === 'none' || (isMale ? h.id === 'fila' : h.id !== 'fila'))} value={acc.headwear} onPick={(headwear) => setAcc({ headwear })} />
              {acc.headwear !== 'none' && (
                <div className="mt-2">
                  <Swatches colors={colorSwatches} value={acc.headwearColor} onPick={(headwearColor) => setAcc({ headwearColor })} />
                </div>
              )}
            </Section>
            {!isMale && (
              <Section title="Earrings">
                <Chips options={EARRINGS} value={config.earrings} onPick={(earrings) => update({ earrings })} />
              </Section>
            )}
            <Section title="Neck">
              <div className="grid grid-cols-2 gap-2">
                {!isMale && <Toggle label="Gold chain" on={config.necklace} onToggle={() => update({ necklace: !config.necklace })} />}
                <Toggle label="Coral beads" on={acc.beads} onToggle={() => setAcc({ beads: !acc.beads })} />
              </div>
            </Section>
            <Section title="Shoes">
              <Chips options={SHOES.filter((s) => !isMale || s.id === 'loafers' || s.id === 'sneakers')} value={acc.shoes} onPick={(shoes) => setAcc({ shoes })} />
              <div className="mt-2">
                <Swatches colors={colorSwatches} value={acc.shoesColor} onPick={(shoesColor) => setAcc({ shoesColor })} />
              </div>
            </Section>
            {!isMale && (
              <Section title="Bag">
                <Chips options={BAGS} value={acc.bag} onPick={(bag) => setAcc({ bag })} />
                {acc.bag !== 'none' && (
                  <div className="mt-2">
                    <Swatches colors={colorSwatches} value={acc.bagColor} onPick={(bagColor) => setAcc({ bagColor })} />
                  </div>
                )}
              </Section>
            )}
            <Section title="Glasses">
              <Chips options={GLASSES} value={acc.glasses} onPick={(glasses) => setAcc({ glasses })} />
            </Section>
            <Toggle label="Wristwatch" on={acc.watch} onToggle={() => setAcc({ watch: !acc.watch })} />
          </>
        )}
      </div>
    </div>
  );
};
