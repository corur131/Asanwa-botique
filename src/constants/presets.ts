import { CharacterConfig } from '../types/character';

/** Divine: the player. Curvy body, divine.svg's face, skin and lips. */
export const DIVINE_CONFIG: CharacterConfig = {
  body: 'femaleRegular',
  skinTone: 'tone6',
  faceShape: 'oval',
  eyes: { shape: 'almond', irisColor: 'darkBrown' },
  brows: 'featheredArch',
  nose: 'narrowDefined',
  lips: { shape: 'fullPout', color: '#C46E62' },
  makeup: {
    blush: true,
    blushColor: '#E7867A',
    liner: true,
    linerStyle: 'wing',
    lashes: 'full',
    lipColor: '#C46E62',
    lipFinish: 'gloss',
    eyeshadow: 'none',
    highlighter: false,
    contour: false,
    browStyle: 'natural',
  },
  maleOnly: { facialHair: 'none' },
  hair: 'longBraids',
  hairColor: 'black',
  earrings: 'goldStuds',
  necklace: true,
  state: 'styled',
  outfit: { cut: 'camiPencil', fabric: 'plain', color: '#DED4C5', color2: '#F6F1E8' },
  accessories: { headwear: 'none', beads: false, bag: 'none', shoes: 'heels', shoesColor: '#C9A163', glasses: 'none', watch: false },
};

export const PLUS_FEMALE_CONFIG: CharacterConfig = {
  body: 'femalePlus',
  skinTone: 'tone2',
  faceShape: 'heart',
  eyes: { shape: 'doe', irisColor: 'warmAmber' },
  brows: 'featheredArch',
  nose: 'broadAfrican',
  lips: { shape: 'widePillowy', color: '#A8405A' },
  makeup: {
    blush: true,
    blushColor: '#B8553A',
    liner: true,
    linerStyle: 'bold',
    lashes: 'dramatic',
    lipColor: '#A8405A',
    lipFinish: 'satin',
    eyeshadow: '#D4A23A',
    highlighter: true,
    contour: true,
    browStyle: 'defined',
  },
  maleOnly: { facialHair: 'none' },
  hair: 'afroPuff',
  hairColor: 'black',
  earrings: 'goldDrops',
  necklace: false,
  state: 'styled',
  outfit: { cut: 'iroBuba', fabric: 'ankara', color: '#E86A2E', color2: '#2F5D3A', pattern: 6 },
  accessories: { headwear: 'gele', headwearColor: '#E3B23C', beads: true, bag: 'clutch', bagColor: '#E3B23C', shoes: 'sandals', shoesColor: '#C9A163', glasses: 'none', watch: false },
};

export const MALE_CONFIG: CharacterConfig = {
  body: 'male',
  skinTone: 'tone3',
  faceShape: 'square',
  eyes: { shape: 'almond', irisColor: 'espressoBlack' },
  brows: 'straightDefined',
  nose: 'broadAfrican',
  lips: { shape: 'subtleSoft', color: '#823e4b' },
  makeup: { blush: false, liner: false, lashes: 'natural', lipColor: '#823e4b' },
  maleOnly: { facialHair: 'shortBoxed' },
  hair: 'waves',
  hairColor: 'black',
  earrings: 'none',
  necklace: false,
  state: 'styled',
  outfit: { cut: 'senator', fabric: 'plain', color: '#2F5D3A', color2: '#2F5D3A' },
  accessories: { headwear: 'none', beads: false, bag: 'none', shoes: 'loafers', shoesColor: '#42281D', glasses: 'none', watch: true },
};

/**
 * Deborah: Divine's twin. She reads Divine's exact face config live
 * (skin, face, eyes, brows, nose, lips, body) but has her own hair, makeup and outfit.
 */
export function getDeborahConfig(divine: CharacterConfig): CharacterConfig {
  const plain = divine.state === 'plain';
  return {
    ...divine,
    hair: 'boneStraight',
    hairColor: 'burgundy',
    makeup: {
      blush: !plain,
      blushColor: '#D9667A',
      liner: !plain,
      linerStyle: 'bold',
      lashes: plain ? 'natural' : 'dramatic',
      lipColor: '#7A1C2E',
      lipFinish: 'matte',
      eyeshadow: '#6E2F5A',
      highlighter: true,
      contour: true,
      browStyle: 'defined',
    },
    earrings: plain ? 'none' : 'goldHoops',
    necklace: !plain,
    outfit: { cut: 'corsetFlare', fabric: 'satin', color: '#1D4838', color2: '#1D4838' },
    accessories: { headwear: 'none', beads: false, bag: 'clutch', bagColor: '#C9A163', shoes: 'heels', shoesColor: '#CCA357', glasses: 'none', watch: false },
  };
}
