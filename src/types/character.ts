export type BodyType = 'femaleRegular' | 'femalePlus' | 'male';

export type SkinToneId = 'tone1' | 'tone2' | 'tone3' | 'tone4' | 'tone5' | 'tone6' | 'tone7' | 'tone8';

export interface SkinPalette {
  id: SkinToneId;
  name: string;
  description: string;
  base: string;
  mid: string;
  shadow: string;
  contour: string;
  highlight: string;
  blushDefault: string;
  lipDefault: string;
}

export type FaceShapePreset = 'oval' | 'heart' | 'square';

export type EyeShapePreset = 'almond' | 'upturned' | 'doe' | 'hooded';

export type IrisColorId = 'darkBrown' | 'warmAmber' | 'hazelGreen' | 'espressoBlack' | 'honeyBronze';

export type BrowPreset = 'featheredArch' | 'softNatural' | 'straightDefined';

export type NosePreset = 'narrowDefined' | 'button' | 'broadAfrican' | 'softRegal';

export type LipShapePreset = 'fullPout' | 'definedCupid' | 'widePillowy' | 'subtleSoft';

export type FemaleHairStyle = 'longBraids' | 'boneStraight' | 'cornrows' | 'afroPuff' | 'shortNatural';

export type MaleHairStyle = 'lowCut' | 'waves' | 'shortDreads';

export type HairStyle = FemaleHairStyle | MaleHairStyle;

export type HairColorId = 'black' | 'darkBrown' | 'burgundy' | 'honeyBlonde';

export type FacialHairPreset = 'none' | 'stubble' | 'fullBeard';

export type EarringStyle = 'none' | 'goldStuds' | 'goldHoops';

export type CharacterState = 'styled' | 'plain';

export interface CharacterConfig {
  body: BodyType;
  skinTone: SkinToneId;
  faceShape: FaceShapePreset;
  eyes: {
    shape: EyeShapePreset;
    irisColor: IrisColorId;
  };
  brows: BrowPreset;
  nose: NosePreset;
  lips: {
    shape: LipShapePreset;
    color: string;
  };
  makeup: {
    blush: boolean;
    liner: boolean;
    lashes: 'natural' | 'full';
    lipColor: string;
  };
  maleOnly: {
    facialHair: FacialHairPreset;
  };
  hair: HairStyle;
  hairColor: HairColorId;
  earrings: EarringStyle;
  necklace: boolean;
  state: CharacterState;
  outfitColor?: {
    top: string;
    bottom: string;
    shoes: string;
  };
}

export type CameraView = 'full' | 'portrait' | 'bust';
