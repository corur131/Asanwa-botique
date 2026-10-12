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
  | 'bluntBob'
  | 'curlyBob'
  | 'waterWave'
  | 'kinkyStraight'
  | 'sidePartFrontal'
  | 'fingerWaves'
  | 'afroWig'
  | 'butterflyLayers'
  | 'ghanaWeaving'
  | 'passionTwists'
  | 'goddessLocs'
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

export type EarringStyle = 'none' | 'goldStuds' | 'goldHoops' | 'bigHoops' | 'goldDrops' | 'pearls' | 'chandelier' | 'coralDrops' | 'huggies' | 'pearlCascadeDrops' | 'goldFiligreeDrops' | 'diamondHaloStuds' | 'crystalBridalChandeliers' | 'heirloomCoralDrops' | 'diamondStatementHoops' | 'royalPearlChandeliers';

export type CharacterState = 'styled' | 'plain';

export type LinerStyle = 'tightline' | 'thin' | 'wing' | 'cat' | 'doubleWing' | 'smudged' | 'floatingCrease' | 'lowerOnly';
export type LashStyle = 'natural' | 'mascara' | 'wispy' | 'full' | 'dramatic';
export type LipFinish = 'gloss' | 'satin' | 'matte' | 'chrome';
export type BrowStyle = 'natural' | 'defined' | 'laminated' | 'bold';
export type ShadowStyle = 'wash' | 'smoky' | 'cutCrease' | 'halo' | 'glitter';
export type BlushPlacement = 'apples' | 'cSculpt' | 'draped';
export type ContactLens = 'none' | 'lightBrown' | 'honey' | 'hazel' | 'green' | 'grey' | 'blue';
export type NailFinish = 'gloss' | 'matte' | 'chrome';

export interface Makeup {
  // face
  foundation?: boolean;
  /** Dewy (glowy) or matte skin finish when foundation is on. */
  skinFinish?: 'dewy' | 'matte';
  concealer?: boolean;
  powder?: boolean;
  bronzer?: boolean;
  contour?: boolean;
  blush: boolean;
  blushColor?: string;
  blushPlacement?: BlushPlacement;
  highlighter?: boolean;
  /** Highlighter shade. */
  highlightColor?: string;
  freckles?: boolean;
  beautyMark?: boolean;
  // eyes
  /** Hex colour, or 'none'. */
  eyeshadow?: string;
  shadowStyle?: ShadowStyle;
  liner: boolean;
  linerStyle?: LinerStyle;
  linerColor?: string;
  lashes: LashStyle;
  bottomLashes?: boolean;
  browStyle?: BrowStyle;
  contacts?: ContactLens;
  // lips
  lipColor: string;
  lipFinish?: LipFinish;
  /** Lip liner colour, or 'none'. */
  lipLiner?: string;
  // nails
  nailColor?: string;
  nailFinish?: NailFinish;
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

export type FabricId = 'plain' | 'ankara' | 'lace' | 'satin' | 'sequin' | 'denim' | 'asoOke' | 'adire' | 'george' | 'velvet' | 'chiffon' | 'leather';

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

/** One piece of clothing in a wardrobe slot. `style` is an id from the catalogue. */
export interface Garment {
  style: string;
  fabric: FabricId;
  color: string;
  color2: string;
  pattern?: number;
}

/** A dress (or long native set) replaces top + bottom. */
export interface Wardrobe {
  top?: Garment;
  bottom?: Garment;
  dress?: Garment;
  outer?: Garment;
}

export type HeadwearStyle = string;
export type ShoeStyle = string;
export type BagStyle = string;
export type GlassesStyle = string;

export interface Accessories {
  headwear: HeadwearStyle;
  headwearColor?: string;
  bag: BagStyle;
  bagColor?: string;
  shoes: ShoeStyle;
  shoesColor?: string;
  /** Eyewear id ('none' for nothing). */
  glasses: GlassesStyle;
  /** Necklace id; overrides the old `necklace` and `beads` switches when set. */
  necklace?: string;
  /** Wrist id: watch, bangles, beads, cuff or none; overrides `watch` when set. */
  wrist?: string;
  beads: boolean;
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
  /** Separate pieces. Takes priority over the older `outfit`. */
  wardrobe?: Wardrobe;
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
