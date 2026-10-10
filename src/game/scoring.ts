import { CharacterConfig, Makeup, Wardrobe } from '../types/character';
import { DEFAULT_ACCESSORIES, FEMALE_HAIR, MAKEUP_LOOKS, Occasion, itemById } from '../constants/catalog';
import { HAIR_COST, MARKUP, SERVICE_FEE, SUPPLIES_SHARE } from './economy';
import { harmony, isNeutral, sameColour } from './colours';
import { entryFor } from './market';
import { Customer, Design, ScoreBreakdown, StyleChoice } from './types';

export const SLOTS = ['top', 'bottom', 'dress', 'outer', 'shoes', 'bag', 'headwear', 'necklace', 'wrist', 'glasses', 'earrings'] as const;
type Slot = (typeof SLOTS)[number];

export const hairGroup = (id: string) => {
  const h = FEMALE_HAIR.find((x) => x.id === id);
  if (!h) return 'male';
  if (h.id === 'longBraids') return 'braids';
  return h.note === 'twists' || h.note === 'locs' || h.note === 'wig' || h.note === 'braids' || h.note === 'natural' || h.note === 'updo' ? h.note : 'natural';
};

const HEELS = new Set(['heels', 'blockHeels', 'platforms', 'mules', 'ankleBoots', 'kneeBoots']);
const CASUAL_SHOES = new Set(['sneakers', 'slides', 'palmSlippers']);
const FITTED = new Set(['bodyconMini', 'mermaidGown', 'tubeMidi', 'corsetGown', 'offShoulderGown', 'slitGown', 'pencilSkirt', 'skinnyJeans', 'corsetTop', 'tubeTop', 'jumpsuit', 'slipDress', 'laceGown']);
const REVEALING = new Set(['cropTop', 'tubeTop', 'halterTop', 'cropTee', 'miniSkirt', 'shorts', 'bodyconMini', 'slipDress', 'slitGown', 'playsuit', 'mensShorts']);
const FORMAL: Occasion[] = ['owambe', 'wedding', 'redCarpet', 'party', 'dateNight'];
const NEAR: Partial<Record<Occasion, Occasion[]>> = {
  owambe: ['wedding', 'church'],
  wedding: ['owambe', 'redCarpet'],
  church: ['office', 'owambe', 'brunch'],
  office: ['church', 'brunch'],
  dateNight: ['party', 'birthday', 'brunch'],
  birthday: ['party', 'dateNight', 'brunch'],
  party: ['birthday', 'dateNight', 'redCarpet'],
  casual: ['brunch', 'birthday'],
  brunch: ['casual', 'birthday', 'dateNight'],
  redCarpet: ['party', 'wedding'],
};

/** 0..1 how much makeup is on the face. */
export function glamLevel(m?: Makeup): number {
  if (!m) return 0;
  let g = 0;
  if (m.foundation) g += 0.12;
  if (m.contour) g += 0.1;
  if (m.highlighter) g += 0.08;
  if (m.bronzer) g += 0.05;
  if (m.blush) g += 0.07;
  if (m.eyeshadow && m.eyeshadow !== 'none') g += m.shadowStyle === 'cutCrease' || m.shadowStyle === 'smoky' || m.shadowStyle === 'glitter' ? 0.16 : 0.1;
  if (m.liner) g += m.linerStyle === 'cat' || m.linerStyle === 'doubleWing' ? 0.12 : 0.07;
  g += ({ natural: 0, mascara: 0.04, wispy: 0.08, full: 0.1, dramatic: 0.14 } as Record<string, number>)[m.lashes] || 0;
  if (m.bottomLashes) g += 0.04;
  if (m.lipLiner && m.lipLiner !== 'none') g += 0.04;
  return Math.min(1, g);
}
const GLAM_WANTED: Record<Occasion, number> = { redCarpet: 0.85, owambe: 0.8, wedding: 0.8, party: 0.65, dateNight: 0.6, birthday: 0.6, church: 0.4, office: 0.35, brunch: 0.4, casual: 0.25 };

const CLASS_RANK = { poor: 0, middle: 1, rich: 2 } as const;

export function designsOf(choice: StyleChoice, stock: Design[]): Partial<Record<Slot, Design>> {
  const out: Partial<Record<Slot, Design>> = {};
  for (const s of SLOTS) {
    const uid = choice[s];
    if (!uid) continue;
    const d = stock.find((x) => x.uid === uid && x.pieces > 0);
    if (d) out[s] = d;
  }
  if (out.dress) {
    delete out.top;
    delete out.bottom;
  }
  return out;
}

/** The customer as Divine has styled them, for the renderer. */
export function buildLook(c: Customer, choice: StyleChoice, stock: Design[], state: 'plain' | 'styled' = 'styled'): CharacterConfig {
  const d = designsOf(choice, stock);
  const g = (x?: Design) => (x ? { style: x.itemId, fabric: x.fabric, color: x.color, color2: x.color2, pattern: x.pattern } : undefined);
  const wardrobe: Wardrobe = d.dress ? { dress: g(d.dress), outer: g(d.outer) } : { top: g(d.top), bottom: g(d.bottom), outer: g(d.outer) };
  const base = c.look;
  const hasClothes = !!(d.dress || d.top || d.bottom);
  const dflt = DEFAULT_ACCESSORIES[c.male ? 'male' : 'female'];
  return {
    ...base,
    state,
    wardrobe: hasClothes ? wardrobe : base.wardrobe,
    outfit: undefined,
    hair: (choice.hair as CharacterConfig['hair']) || base.hair,
    hairColor: (choice.hairColor as CharacterConfig['hairColor']) || base.hairColor,
    makeup: choice.makeup || { ...MAKEUP_LOOKS[0].makeup, lipColor: base.lips.color },
    maleOnly: { facialHair: (choice.beard as CharacterConfig['maleOnly']['facialHair']) || base.maleOnly.facialHair },
    earrings: (d.earrings?.itemId as CharacterConfig['earrings']) || 'none',
    necklace: false,
    accessories: {
      ...dflt,
      shoes: d.shoes?.itemId || (c.male ? 'slides' : 'flats'),
      shoesColor: d.shoes?.color || '#5A5A60',
      bag: d.bag?.itemId || 'none',
      bagColor: d.bag?.color,
      headwear: d.headwear?.itemId || 'none',
      headwearColor: d.headwear?.color,
      necklace: d.necklace?.itemId || 'none',
      wrist: d.wrist?.itemId || 'none',
      glasses: d.glasses?.itemId || 'none',
      beads: false,
      watch: false,
    },
  };
}

export function lookCost(c: Customer, choice: StyleChoice, stock: Design[]) {
  const d = designsOf(choice, stock);
  const goods = Object.values(d).reduce((s, x) => s + (x?.cost || 0), 0);
  const hair = choice.hair ? HAIR_COST[hairGroup(choice.hair)] || 1_000 : 0;
  const fee = SERVICE_FEE[c.cls];
  const wholesale = goods + hair + fee * SUPPLIES_SHARE;
  const fair = Math.round(((goods + hair) * MARKUP + fee) / 500) * 500;
  // goods are paid for at the market; a sale only uses up hair and makeup supplies
  const consumables = Math.round(hair + fee * SUPPLIES_SHARE);
  return { goods, hair, fee, wholesale, consumables, fair, low: Math.round((fair * 0.9) / 500) * 500, high: Math.round((fair * 1.1) / 500) * 500 };
}

const itemOcc = (d: Design) => {
  const w = itemById(d.itemId);
  return w ? w.occasions : [];
};
const occFit = (occ: Occasion[], target: Occasion) => (occ.includes(target) ? 1 : occ.some((o) => NEAR[target]?.includes(o)) ? 0.6 : 0.15);

/** Hair or makeup only: judged on what they asked for and how well it suits the occasion. */
function scoreService(c: Customer, choice: StyleChoice): ScoreBreakdown {
  const notes: string[] = [];
  const glam = glamLevel(choice.makeup);
  let hit = 0;
  for (const w of c.wants) {
    let ok = 0;
    if (w.kind === 'hair') ok = choice.hair && (w.group === 'male' || hairGroup(choice.hair) === w.group) ? 1 : 0;
    if (w.kind === 'glam') ok = glam >= 0.7 ? 1 : glam >= 0.5 ? 0.5 : 0;
    if (w.kind === 'naturalFace') ok = glam > 0.05 && glam <= 0.4 ? 1 : glam <= 0.55 ? 0.5 : 0;
    if (ok < 1) notes.push(missLine(w));
    hit += ok;
  }
  hit = c.wants.length ? hit / c.wants.length : 1;
  const wantsFace = c.service !== 'hair' && !c.male;
  const wantsHair = c.service !== 'makeup';
  let quality = 1;
  if (wantsHair && !choice.hair) { quality -= 0.5; notes.push(c.male ? 'You did not touch his hair.' : 'You did not do her hair.'); }
  if (wantsFace) {
    const fit = 1 - Math.min(1, Math.abs(glam - GLAM_WANTED[c.occasion]) * 1.6);
    quality = quality * 0.5 + fit * 0.5;
    if (glam < 0.02) notes.push('No makeup.');
  }
  const mood = Math.round((Math.random() - 0.5) * 4);
  const occasion = 35 * quality;
  const request = 25 * hit;
  const complete = 15 * hit;
  const total = Math.max(0, Math.min(100, Math.round(25 + occasion + 40 * hit + mood)));
  const said = c.male ? notes.map((n) => n.replace(/\bShe\b/g, 'He').replace(/\bshe\b/g, 'he').replace(/\bher\b/g, 'his')) : notes;
  return { total, occasion: Math.round(occasion), request: Math.round(request), cls: 15, complete: Math.round(complete), harmony: 10, notes: said };
}

export function scoreLook(c: Customer, choice: StyleChoice, stock: Design[]): ScoreBreakdown {
  if (c.service) return scoreService(c, choice);
  const d = designsOf(choice, stock);
  const notes: string[] = [];
  const main = [d.dress, d.top, d.bottom].filter(Boolean) as Design[];
  const worn = Object.values(d).filter(Boolean) as Design[];

  // --- occasion (35)
  let garments = 0;
  if (!main.length) notes.push('No new outfit: she is still in her own clothes.');
  else {
    const fits = main.map((x) => occFit(itemOcc(x), c.occasion));
    garments = fits.reduce((a, b) => a + b, 0) / fits.length;
    if (!d.dress && (!d.top || !d.bottom)) garments *= 0.5;
    if (d.outer) garments = garments * 0.8 + occFit(itemOcc(d.outer), c.occasion) * 0.2;
    if (garments < 0.5) notes.push(`The outfit is not right for ${c.occasion === 'redCarpet' ? 'a red carpet' : 'this occasion'}.`);
  }
  let shoes = 0.4;
  if (d.shoes) {
    const formal = FORMAL.includes(c.occasion);
    if (formal && CASUAL_SHOES.has(d.shoes.itemId)) { shoes = 0.3; notes.push('Sneakers or slides at a formal event? No.'); }
    else if (!formal && c.occasion !== 'church' && c.occasion !== 'office' && HEELS.has(d.shoes.itemId) && c.occasion === 'casual') shoes = 0.75;
    else shoes = 1;
  }
  const want = GLAM_WANTED[c.occasion];
  const glam = glamLevel(choice.makeup);
  const face = c.male ? 1 : 1 - Math.min(1, Math.abs(glam - want) * 1.6);
  if (!c.male && glam < want - 0.35) notes.push('The face needed more makeup for this occasion.');
  if (!c.male && glam > want + 0.4) notes.push('The makeup is too heavy for this occasion.');
  let head = 1;
  if (d.headwear && ['owambe', 'wedding'].includes(c.occasion) && ['gele', 'geleWrap', 'fila'].includes(d.headwear.itemId)) head = 1;
  else if (d.headwear && ['cap', 'bucketHat'].includes(d.headwear.itemId) && FORMAL.includes(c.occasion)) { head = 0.3; notes.push('A cap at a formal event lowers the look.'); }
  const occasion = 35 * (0.6 * garments + 0.15 * shoes + 0.15 * face + 0.1 * head);

  // --- what she asked for (25)
  let hit = 0;
  const wants = c.wants;
  for (const w of wants) {
    let ok = 0;
    switch (w.kind) {
      case 'color': ok = main.some((x) => sameColour(x.color, w.color)) ? 1 : [...main, ...worn].some((x) => sameColour(x.color2, w.color) || sameColour(x.color, w.color)) ? 0.6 : 0; break;
      case 'native': ok = main.length && main.every((x) => itemById(x.itemId)?.native) ? 1 : main.some((x) => itemById(x.itemId)?.native) ? 0.5 : 0; break;
      case 'english': ok = main.length && main.every((x) => !itemById(x.itemId)?.native) ? 1 : 0; break;
      case 'gele': ok = d.headwear && (d.headwear.itemId === 'gele' || d.headwear.itemId === 'geleWrap') ? 1 : 0; break;
      case 'noHeels': ok = d.shoes && !HEELS.has(d.shoes.itemId) ? 1 : 0; break;
      case 'fitted': ok = main.length && main.every((x) => FITTED.has(x.itemId)) ? 1 : main.some((x) => FITTED.has(x.itemId)) ? 0.5 : 0; break;
      case 'covered': ok = main.length && !main.some((x) => REVEALING.has(x.itemId)) ? 1 : 0; break;
      case 'jacket': ok = d.outer ? 1 : 0; break;
      case 'hair': ok = choice.hair && (w.group === 'male' || hairGroup(choice.hair) === w.group) ? 1 : 0; break;
      case 'glam': ok = glam >= 0.7 ? 1 : glam >= 0.5 ? 0.5 : 0; break;
      case 'naturalFace': ok = glam > 0.05 && glam <= 0.4 ? 1 : glam <= 0.55 ? 0.5 : 0; break;
    }
    if (ok < 1) notes.push(missLine(w));
    hit += ok;
  }
  let request = wants.length ? 25 * (hit / wants.length) : 25;
  if (main.some((x) => sameColour(x.color, c.taste.favColor))) request = Math.min(25, request + 3);

  // --- class fit (15)
  const ranked = worn.filter((x) => itemById(x.itemId) || entryFor(x.kind, x.itemId));
  let clsFit = 1;
  if (ranked.length) {
    const vals = ranked.map((x) => {
      const w = itemById(x.itemId);
      const rank = w ? CLASS_RANK[w.cls] : entryFor(x.kind, x.itemId)?.luxury ? 2 : x.cost >= 9_000 ? 1 : 0;
      if (c.cls === 'rich') return rank === 2 ? 1 : rank === 1 ? 0.6 : 0.25;
      if (c.cls === 'middle') return rank >= 1 ? 1 : 0.75;
      return 1;
    });
    clsFit = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (c.cls === 'rich' && clsFit < 0.6) notes.push('Too cheap for a rich client: she expected luxury pieces.');
  }
  const cls = 15 * clsFit;

  // --- complete look (15)
  let complete = 0;
  if (d.shoes) complete += 5; else notes.push('No shoes from the shop.');
  if (choice.hair) complete += 4; else notes.push(c.male ? 'Hair not touched.' : 'You did not do her hair.');
  if (c.male) complete += 3; else if (choice.makeup && glam > 0.02) complete += 3; else notes.push('No makeup.');
  const extras = [d.bag, d.necklace, d.earrings, d.headwear, d.wrist].filter(Boolean).length;
  if (!FORMAL.includes(c.occasion) && c.occasion !== 'church') complete += 3;
  else if (extras >= 1) complete += 3;
  else notes.push('Formal looks need at least one accessory.');

  // --- colour harmony (10)
  const colours = [...main, d.outer, d.shoes, d.bag, d.headwear].filter(Boolean).map((x) => (x as Design).color);
  const pattern = main.filter((x) => x.fabric === 'ankara' || x.fabric === 'adire').map((x) => x.color2);
  const h = harmony([...colours, ...pattern.filter((p) => !isNeutral(p)).slice(0, 1)]);
  if (h.note) notes.push(h.note);
  const harmonyScore = 10 * h.value;

  // a small mood swing so it never feels mechanical
  const mood = Math.round((Math.random() - 0.5) * 4);
  const total = Math.max(0, Math.min(100, Math.round(occasion + request + cls + complete + harmonyScore + mood)));
  const said = c.male ? notes.map((n) => n.replace(/\bShe\b/g, 'He').replace(/\bshe\b/g, 'he').replace(/\bher\b/g, 'his')) : notes;
  return { total, occasion: Math.round(occasion), request: Math.round(request), cls: Math.round(cls), complete: Math.round(complete), harmony: Math.round(harmonyScore), notes: said };
}

function missLine(w: Customer['wants'][number]): string {
  switch (w.kind) {
    case 'color': return `She asked for ${w.name}.`;
    case 'native': return 'She wanted native.';
    case 'english': return 'She wanted English wear, not native.';
    case 'gele': return 'She wanted gele.';
    case 'noHeels': return 'She said no heels.';
    case 'fitted': return 'She wanted something that shows her shape.';
    case 'covered': return 'Too short or open for what she asked.';
    case 'jacket': return 'No jacket.';
    case 'hair': if (w.group === 'male') return 'She wanted a fresh cut.'; return `She wanted ${w.group === 'wig' ? 'a wig' : w.group === 'natural' ? 'natural hair' : w.group}.`;
    case 'glam': return 'She wanted full glam.';
    case 'naturalFace': return 'She wanted light makeup.';
  }
}
