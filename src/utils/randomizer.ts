import {
  CharacterConfig,
  BodyType,
  SkinToneId,
  FaceShapePreset,
  EyeShapePreset,
  IrisColorId,
  BrowPreset,
  NosePreset,
  LipShapePreset,
  FemaleHairStyle,
  MaleHairStyle,
  HairColorId,
  FacialHairPreset,
  EarringStyle,
} from '../types/character';
import { SKIN_TONES } from '../constants/skinTones';

const pickRandom = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

const LIP_COLORS = [
  '#ba5869', // Berry Plum
  '#882236', // Deep Wine
  '#ca7a6b', // Nude Peach
  '#b05943', // Warm Terracotta
  '#9d583b', // Glossy Caramel
  '#c4333d', // Red Ochre
  '#562725', // Dark Cocoa
];

/**
 * Generates a randomized boutique customer configuration.
 * Adheres strictly to the plain-state rule:
 * If the state is plain, it sets messy hair, no makeup, dull outfit,
 * but never compromises realistic anatomy, skin tone, or facial features.
 */
export function generateRandomCustomer(currentState: 'styled' | 'plain' = 'styled'): CharacterConfig {
  const bodies: BodyType[] = ['femaleRegular', 'femalePlus', 'male'];
  const skinTones: SkinToneId[] = ['tone1', 'tone2', 'tone3', 'tone4', 'tone5', 'tone6', 'tone7', 'tone8'];
  const faceShapes: FaceShapePreset[] = ['oval', 'heart', 'square'];
  const eyeShapes: EyeShapePreset[] = ['almond', 'upturned', 'doe', 'hooded'];
  const irisColors: IrisColorId[] = ['darkBrown', 'warmAmber', 'hazelGreen', 'espressoBlack', 'honeyBronze'];
  const brows: BrowPreset[] = ['featheredArch', 'softNatural', 'straightDefined'];
  const noses: NosePreset[] = ['narrowDefined', 'button', 'broadAfrican', 'softRegal'];
  const lipShapes: LipShapePreset[] = ['fullPout', 'definedCupid', 'widePillowy', 'subtleSoft'];
  const hairColors: HairColorId[] = ['black', 'darkBrown', 'burgundy', 'honeyBlonde'];
  const earringsList: EarringStyle[] = ['none', 'goldStuds', 'goldHoops'];
  const facialHairs: FacialHairPreset[] = ['none', 'stubble', 'fullBeard'];

  const femaleHairs: FemaleHairStyle[] = ['longBraids', 'boneStraight', 'cornrows', 'afroPuff', 'shortNatural'];
  const maleHairs: MaleHairStyle[] = ['lowCut', 'waves', 'shortDreads'];

  const body = pickRandom(bodies);
  const skinTone = pickRandom(skinTones);
  const skin = SKIN_TONES[skinTone];
  const hairColor = pickRandom(hairColors);
  const lipColor = pickRandom(LIP_COLORS);

  const isMale = body === 'male';
  const hair = isMale ? pickRandom(maleHairs) : pickRandom(femaleHairs);
  const facialHair = isMale ? pickRandom(facialHairs) : 'none';

  return {
    body,
    skinTone,
    faceShape: pickRandom(faceShapes),
    eyes: {
      shape: pickRandom(eyeShapes),
      irisColor: pickRandom(irisColors),
    },
    brows: pickRandom(brows),
    nose: pickRandom(noses),
    lips: {
      shape: pickRandom(lipShapes),
      color: lipColor,
    },
    makeup: {
      blush: currentState === 'plain' ? false : Math.random() > 0.3,
      liner: currentState === 'plain' ? false : Math.random() > 0.3,
      lashes: currentState === 'plain' ? 'natural' : Math.random() > 0.5 ? 'full' : 'natural',
      lipColor: currentState === 'plain' ? skin.lipDefault : lipColor,
    },
    maleOnly: {
      facialHair,
    },
    hair,
    hairColor,
    earrings: currentState === 'plain' ? 'none' : isMale ? 'none' : pickRandom(earringsList),
    necklace: currentState === 'plain' ? false : !isMale && Math.random() > 0.3,
    state: currentState,
  };
}
