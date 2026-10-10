import {
  BodyType,
  BrowPreset,
  CharacterConfig,
  EyeShapePreset,
  FaceShapePreset,
  IrisColorId,
  LipShapePreset,
  NosePreset,
  SkinToneId,
} from '../types/character';
import {
  ANKARA_PRINTS,
  BAGS,
  BEARDS,
  BLUSH_SHADES,
  BROW_STYLES,
  EARRINGS,
  EYESHADOWS,
  FABRICS,
  FABRIC_COLORS,
  FEMALE_HAIR,
  GLASSES,
  HEADWEAR,
  MAKEUP_LOOKS,
  NECKLACES,
  SHOES,
  WRIST,
  forBody,
  itemsFor,
  HAIR_COLORS,
  LASHES,
  LINERS,
  LIP_FINISHES,
  LIP_SHADES,
  MALE_HAIR,
} from '../constants/catalog';
import { SKIN_TONES } from '../constants/skinTones';
import { FabricId, Garment, Makeup, Wardrobe } from '../types/character';

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const chance = (p: number) => Math.random() < p;

/**
 * A random customer.
 * Plain customers get messy hair, no makeup, faded and wrinkled clothes and old slippers.
 * Plainness never touches skin tone, body or facial features: those are random either way.
 */
export function generateRandomCustomer(state: 'styled' | 'plain' = 'styled'): CharacterConfig {
  // Women come in more often than men (about 3 in 4).
  const body: BodyType = chance(0.26) ? 'male' : pick(['femaleSlim', 'femaleRegular', 'femalePlus'] as BodyType[]);
  const isMale = body === 'male';
  const skinTone = pick(Object.keys(SKIN_TONES) as SkinToneId[]);
  const styled = state === 'styled' && !isMale;
  const lip = pick(LIP_SHADES).color;

  return {
    body,
    skinTone,
    faceShape: pick(['oval', 'heart', 'square'] as FaceShapePreset[]),
    eyes: {
      shape: pick(['almond', 'upturned', 'doe', 'hooded'] as EyeShapePreset[]),
      irisColor: pick(['darkBrown', 'warmAmber', 'hazelGreen', 'espressoBlack', 'honeyBronze'] as IrisColorId[]),
    },
    brows: pick(['featheredArch', 'softNatural', 'straightDefined'] as BrowPreset[]),
    nose: pick(['narrowDefined', 'button', 'broadAfrican', 'softRegal'] as NosePreset[]),
    lips: { shape: pick(['fullPout', 'definedCupid', 'widePillowy', 'subtleSoft'] as LipShapePreset[]), color: lip },
    makeup: styled ? randomMakeup(lip) : { blush: false, liner: false, lashes: 'natural', lipColor: lip },
    maleOnly: { facialHair: isMale ? pick(BEARDS).id : 'none' },
    hair: isMale ? pick(MALE_HAIR).id : pick(FEMALE_HAIR).id,
    hairColor: chance(0.55) ? 'black' : pick(HAIR_COLORS).id,
    earrings: isMale ? 'none' : pick(EARRINGS).id,
    necklace: !isMale && chance(0.4),
    state,
    wardrobe: randomWardrobe(isMale),
    accessories: {
      headwear: chance(isMale ? 0.2 : 0.25) ? pick(forBody(HEADWEAR, isMale).slice(1)).id : 'none',
      headwearColor: pick(FABRIC_COLORS),
      beads: false,
      bag: isMale ? (chance(0.15) ? pick(['crossbody', 'backpack']) : 'none') : pick(forBody(BAGS, false)).id,
      bagColor: pick(FABRIC_COLORS),
      shoes: pick(forBody(SHOES, isMale)).id,
      shoesColor: pick(FABRIC_COLORS),
      glasses: chance(0.25) ? pick(forBody(GLASSES, isMale).slice(1)).id : 'none',
      watch: false,
      necklace: chance(isMale ? 0.25 : 0.6) ? pick(forBody(NECKLACES, isMale).slice(1)).id : 'none',
      wrist: chance(0.45) ? pick(forBody(WRIST, isMale).slice(1)).id : 'none',
    },
  };
}

/** Start from one of the one-tap looks, then vary the shades. */
function randomMakeup(lip: string): Makeup {
  const base = pick(MAKEUP_LOOKS.slice(1)).makeup;
  const liner = pick(LINERS.slice(1)).id;
  return {
    ...base,
    lipColor: lip,
    lipFinish: pick(LIP_FINISHES).id,
    blushColor: pick(BLUSH_SHADES).color,
    eyeshadow: chance(0.65) ? pick(EYESHADOWS.slice(1)).color : 'none',
    linerStyle: liner === 'none' ? 'wing' : liner,
    lashes: pick(LASHES.slice(1)).id,
    browStyle: pick(BROW_STYLES).id,
    contacts: chance(0.12) ? pick(['honey', 'hazel', 'grey', 'lightBrown'] as const) : 'none',
    freckles: chance(0.08),
    beautyMark: chance(0.1),
  };
}

function garment(male: boolean, slot: 'top' | 'bottom' | 'dress' | 'outer'): Garment {
  const it = pick(itemsFor(male, slot));
  const color = pick(FABRIC_COLORS);
  let color2 = pick(FABRIC_COLORS);
  if (color2 === color) color2 = '#1E1E24';
  // most items come in their usual fabric; some in a random one
  const fabric: FabricId = chance(0.7) ? it.fabric : pick(FABRICS).id;
  return { style: it.id, fabric, color: fabric === 'denim' ? pick(['#3C5A8A', '#2A3A5A', '#5A7AAA', '#1E1E24']) : color, color2, pattern: Math.floor(Math.random() * ANKARA_PRINTS.length) };
}

function randomWardrobe(male: boolean): Wardrobe {
  const w: Wardrobe = chance(male ? 0.3 : 0.45) ? { dress: garment(male, 'dress') } : { top: garment(male, 'top'), bottom: garment(male, 'bottom') };
  if (chance(0.2)) w.outer = garment(male, 'outer');
  return w;
}
