export type BodyType = 'femaleSlim' | 'femaleRegular' | 'femalePlus' | 'male';

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
  /** Darkest crease tone (lid crease, nostrils, lip corners). */
  deep: string;
  /** Soft sheen laid on forehead, nose bridge and cheekbones. */
  glow: string;
  blushDefault: string;
  lipDefault: string;
}

export type FaceShapePreset = 'oval' | 'heart' | 'square';
export type EyeShapePreset = 'almond' | 'upturned' | 'doe' | 'hooded';
export type IrisColorId = 'darkBrown' | 'warmAmber' | 'hazelGreen' | 'espressoBlack' | 'honeyBronze';
export type BrowPreset = 'featheredArch' | 'softNatural' | 'straightDefined';
export type NosePreset = 'narrowDefined' | 'button' | 'broadAfrican' | 'softRegal';
export type LipShapePreset = 'fullPout' | 'definedCupid' | 'widePillowy' | 'subtleSoft';

export type FemaleHairStyle =
  | 'longBraids'
  | 'boneStraight'
  | 'cornrows'
  | 'afroPuff'
  | 'shortNatural'
  | 'knotlessBraids'
  | 'boxBraidBob'
  | 'fulaniBraids'
  | 'bodyWave'
  | 'deepCurly'
  | 'pixie'
  | 'highBun'
  | 'sleekPonytail'
  | 'fauxLocs'
  | 'bantuKnots';

export type MaleHairStyle = 'lowCut' | 'waves' | 'shortDreads' | 'highTopFade' | 'afro' | 'longLocs' | 'bald';

export type HairStyle = FemaleHairStyle | MaleHairStyle;

export type HairColorId = 'black' | 'darkBrown' | 'burgundy' | 'honeyBlonde' | 'ginger' | 'ombre' | 'platinum';

export type FacialHairPreset =
  | 'none'
  | 'stubble'
  | 'shortBoxed'
  | 'fullBeard'
  | 'goatee'
  | 'circleBeard'
  | 'chinStrap'
  | 'moustache';

export type EarringStyle = 'none' | 'goldStuds' | 'goldHoops' | 'goldDrops' | 'pearls';

export type CharacterState = 'styled' | 'plain';

export type LinerStyle = 'thin' | 'wing' | 'bold';
export type LashStyle = 'natural' | 'full' | 'dramatic';
export type LipFinish = 'gloss' | 'satin' | 'matte';
export type BrowStyle = 'natural' | 'defined' | 'laminated';

export interface Makeup {
  blush: boolean;
  blushColor?: string;
  liner: boolean;
  linerStyle?: LinerStyle;
  lashes: LashStyle;
  lipColor: string;
  lipFinish?: LipFinish;
  /** Hex colour, or 'none'. */
  eyeshadow?: string;
  highlighter?: boolean;
  contour?: boolean;
  browStyle?: BrowStyle;
}

export type FemaleCut =
  | 'camiPencil'
  | 'cropMini'
  | 'miniGown'
  | 'mermaidGown'
  | 'iroBuba'
  | 'laceGown'
  | 'corsetFlare'
  | 'bubu'
  | 'cropBaggyJeans'
  | 'jumpsuit';

export type MaleCut = 'shirtTrousers' | 'senator' | 'agbada' | 'teeJeans';

export type OutfitCut = FemaleCut | MaleCut;

export type FabricId = 'plain' | 'ankara' | 'lace' | 'satin' | 'sequin' | 'denim' | 'asoOke';

export interface OutfitSpec {
  cut: OutfitCut;
  fabric: FabricId;
  /** Main colour of the fabric. */
  color: string;
  /** Pattern / second-piece colour. */
  color2: string;
  /** Which ankara print (0-9). */
  pattern?: number;
}

export type HeadwearStyle = 'none' | 'gele' | 'headwrap' | 'fila';
export type ShoeStyle = 'heels' | 'sandals' | 'sneakers' | 'loafers' | 'flats';
export type BagStyle = 'none' | 'clutch' | 'tote';
export type GlassesStyle = 'none' | 'sunglasses' | 'clear';

export interface Accessories {
  headwear: HeadwearStyle;
  headwearColor?: string;
  beads: boolean;
  bag: BagStyle;
  bagColor?: string;
  shoes: ShoeStyle;
  shoesColor?: string;
  glasses: GlassesStyle;
  watch: boolean;
}

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
  makeup: Makeup;
  maleOnly: {
    facialHair: FacialHairPreset;
  };
  hair: HairStyle;
  hairColor: HairColorId;
  earrings: EarringStyle;
  necklace: boolean;
  state: CharacterState;
  outfit?: OutfitSpec;
  accessories?: Accessories;
  /** Legacy colours from the first build; used only when `outfit` is missing. */
  outfitColor?: {
    top: string;
    bottom: string;
    shoes: string;
  };
}

export type CameraView = 'full' | 'portrait' | 'bust';
