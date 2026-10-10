import { CharacterConfig } from '../types/character';

export const DIVINE_CONFIG: CharacterConfig = {
  body: 'femaleRegular',
  skinTone: 'tone6', // Honey Amber
  faceShape: 'oval',
  eyes: {
    shape: 'almond',
    irisColor: 'darkBrown',
  },
  brows: 'featheredArch',
  nose: 'narrowDefined',
  lips: {
    shape: 'fullPout',
    color: '#ba5869', // Rich warm berry plum
  },
  makeup: {
    blush: true,
    liner: true,
    lashes: 'full',
    lipColor: '#ba5869',
  },
  maleOnly: {
    facialHair: 'none',
  },
  hair: 'longBraids',
  hairColor: 'black',
  earrings: 'goldStuds',
  necklace: true,
  state: 'styled',
  outfitColor: {
    top: '#f6f1e8', // Cream halter / fitted top
    bottom: '#ded4c5', // Matching neutral skirt
    shoes: '#c9a163', // Golden-caramel heels
  },
};

export const PLUS_FEMALE_CONFIG: CharacterConfig = {
  body: 'femalePlus',
  skinTone: 'tone2', // Rich Warm Ebony
  faceShape: 'heart',
  eyes: {
    shape: 'doe',
    irisColor: 'warmAmber',
  },
  brows: 'featheredArch',
  nose: 'broadAfrican',
  lips: {
    shape: 'widePillowy',
    color: '#9e3447', // Deep rose plum
  },
  makeup: {
    blush: true,
    liner: true,
    lashes: 'full',
    lipColor: '#9e3447',
  },
  maleOnly: {
    facialHair: 'none',
  },
  hair: 'afroPuff',
  hairColor: 'black',
  earrings: 'goldHoops',
  necklace: true,
  state: 'styled',
  outfitColor: {
    top: '#b85d38', // Terracotta ochre top
    bottom: '#29433b', // Deep emerald skirt
    shoes: '#1f1614',
  },
};

export const MALE_CONFIG: CharacterConfig = {
  body: 'male',
  skinTone: 'tone3', // Mahogany Bronze
  faceShape: 'square',
  eyes: {
    shape: 'almond',
    irisColor: 'espressoBlack',
  },
  brows: 'straightDefined',
  nose: 'broadAfrican',
  lips: {
    shape: 'subtleSoft',
    color: '#823e4b',
  },
  makeup: {
    blush: false,
    liner: false,
    lashes: 'natural',
    lipColor: '#823e4b',
  },
  maleOnly: {
    facialHair: 'stubble',
  },
  hair: 'waves',
  hairColor: 'black',
  earrings: 'none',
  necklace: false,
  state: 'styled',
  outfitColor: {
    top: '#233246', // Indigo tailored shirt
    bottom: '#181b22', // Charcoal tailored trousers
    shoes: '#42281d', // Rich leather shoes
  },
};

/**
 * Derives Deborah's config from Divine's face config live.
 * Requirements: Deborah reads Divine's exact face config live
 * (skin, face, eyes, brows, nose, lips) but has her own hair (bone straight),
 * makeup, and outfit.
 */
export function getDeborahConfig(divineConfig: CharacterConfig): CharacterConfig {
  return {
    ...divineConfig,
    hair: 'boneStraight',
    hairColor: 'burgundy',
    makeup: {
      blush: divineConfig.state === 'plain' ? false : true,
      liner: divineConfig.state === 'plain' ? false : true,
      lashes: divineConfig.state === 'plain' ? 'natural' : 'full',
      lipColor: divineConfig.state === 'plain' ? divineConfig.lips.color : '#8f2334', // Signature deep wine
    },
    earrings: divineConfig.state === 'plain' ? 'none' : 'goldHoops',
    necklace: divineConfig.state === 'plain' ? false : true,
    outfitColor: {
      top: divineConfig.state === 'plain' ? '#787a80' : '#1d4838', // Deep forest green or dull faded
      bottom: divineConfig.state === 'plain' ? '#5a5b61' : '#12261e',
      shoes: divineConfig.state === 'plain' ? '#44464c' : '#cca357',
    },
  };
}
