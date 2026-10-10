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
  FEMALE_CUTS,
  FEMALE_HAIR,
  HAIR_COLORS,
  LASHES,
  LINERS,
  LIP_FINISHES,
  LIP_SHADES,
  MALE_CUTS,
  MALE_HAIR,
} from '../constants/catalog';
import { SKIN_TONES } from '../constants/skinTones';

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
  const liner = pick(LINERS).id;
  const fabric = pick(FABRICS).id;
  const color = pick(FABRIC_COLORS);
  let color2 = pick(FABRIC_COLORS);
  if (color2 === color) color2 = '#1E1E24';

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
    makeup: {
      blush: styled && chance(0.7),
      blushColor: pick(BLUSH_SHADES).color,
      liner: styled && liner !== 'none',
      linerStyle: liner === 'none' ? 'thin' : liner,
      lashes: styled ? pick(LASHES).id : 'natural',
      lipColor: lip,
      lipFinish: pick(LIP_FINISHES).id,
      eyeshadow: styled && chance(0.6) ? pick(EYESHADOWS).color : 'none',
      highlighter: styled && chance(0.5),
      contour: styled && chance(0.4),
      browStyle: pick(BROW_STYLES).id,
    },
    maleOnly: { facialHair: isMale ? pick(BEARDS).id : 'none' },
    hair: isMale ? pick(MALE_HAIR).id : pick(FEMALE_HAIR).id,
    hairColor: chance(0.55) ? 'black' : pick(HAIR_COLORS).id,
    earrings: isMale ? 'none' : pick(EARRINGS).id,
    necklace: !isMale && chance(0.4),
    state,
    outfit: {
      cut: isMale ? pick(MALE_CUTS).id : pick(FEMALE_CUTS).id,
      fabric,
      color,
      color2,
      pattern: Math.floor(Math.random() * ANKARA_PRINTS.length),
    },
    accessories: {
      headwear: isMale ? (chance(0.2) ? 'fila' : 'none') : chance(0.15) ? 'gele' : chance(0.1) ? 'headwrap' : 'none',
      headwearColor: pick(FABRIC_COLORS),
      beads: chance(0.15),
      bag: isMale ? 'none' : pick(BAGS).id,
      bagColor: pick(FABRIC_COLORS),
      shoes: isMale ? (chance(0.5) ? 'loafers' : 'sneakers') : pick(['heels', 'sandals', 'flats', 'sneakers'] as const),
      shoesColor: pick(FABRIC_COLORS),
      glasses: chance(0.15) ? 'sunglasses' : chance(0.1) ? 'clear' : 'none',
      watch: chance(0.3),
    },
  };
}
