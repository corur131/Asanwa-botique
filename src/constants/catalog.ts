import {
  Accessories,
  BlushPlacement,
  BodyType,
  BrowStyle,
  ContactLens,
  EarringStyle,
  FabricId,
  FacialHairPreset,
  FemaleCut,
  FemaleHairStyle,
  Garment,
  HairColorId,
  LashStyle,
  LinerStyle,
  LipFinish,
  Makeup,
  MaleCut,
  MaleHairStyle,
  NailFinish,
  OutfitSpec,
  ShadowStyle,
  Wardrobe,
} from '../types/character';

/**
 * Everything the character builder offers, with labels.
 * One list feeds the controls panel, the randomiser and the shop (price, class, occasions).
 * Prices are wholesale in naira (what Divine pays at the market), scaled to Lagos customer budgets.
 */

export interface Option<T extends string> {
  id: T;
  label: string;
  note?: string;
}

export const BODIES: Option<BodyType>[] = [
  { id: 'femaleSlim', label: 'Slim', note: 'Slender frame' },
  { id: 'femaleRegular', label: 'Curvy', note: "Divine's shape" },
  { id: 'femalePlus', label: 'Plus-size', note: 'Full hourglass' },
  { id: 'male', label: 'Male', note: 'Broad shoulders' },
];

export const isMaleBody = (b: BodyType) => b === 'male';

// ---------------------------------------------------------------------------
// Hair
// ---------------------------------------------------------------------------
export const FEMALE_HAIR: Option<FemaleHairStyle>[] = [
  { id: 'longBraids', label: 'Sleek Waves + Braids', note: "Divine's look" },
  { id: 'boneStraight', label: 'Bone Straight', note: 'wig' },
  { id: 'sidePartFrontal', label: 'Side-Part Frontal', note: 'wig' },
  { id: 'bodyWave', label: 'Body Wave', note: 'wig' },
  { id: 'waterWave', label: 'Water Wave', note: 'wig' },
  { id: 'butterflyLayers', label: 'Butterfly Layers', note: 'wig' },
  { id: 'kinkyStraight', label: 'Kinky Straight', note: 'wig' },
  { id: 'deepCurly', label: 'Deep Curly', note: 'wig' },
  { id: 'bluntBob', label: 'Blunt Bob', note: 'wig' },
  { id: 'curlyBob', label: 'Curly Bob', note: 'wig' },
  { id: 'pixie', label: 'Pixie Cut', note: 'wig' },
  { id: 'fingerWaves', label: 'Finger Waves', note: 'wig' },
  { id: 'afroWig', label: 'Big Afro', note: 'wig' },
  { id: 'knotlessBraids', label: 'Knotless Braids', note: 'braids' },
  { id: 'boxBraidBob', label: 'Box Braid Bob', note: 'braids' },
  { id: 'fulaniBraids', label: 'Fulani Braids', note: 'braids' },
  { id: 'ghanaWeaving', label: 'Ghana Weaving', note: 'braids' },
  { id: 'cornrows', label: 'Cornrows', note: 'braids' },
  { id: 'passionTwists', label: 'Passion Twists', note: 'twists' },
  { id: 'goddessLocs', label: 'Goddess Locs', note: 'locs' },
  { id: 'fauxLocs', label: 'Faux Locs', note: 'locs' },
  { id: 'bantuKnots', label: 'Bantu Knots', note: 'natural' },
  { id: 'afroPuff', label: 'Afro Puff', note: 'natural' },
  { id: 'shortNatural', label: 'Short Natural (TWA)', note: 'natural' },
  { id: 'highBun', label: 'High Bun', note: 'updo' },
  { id: 'sleekPonytail', label: 'Sleek Ponytail', note: 'updo' },
];

export const MALE_HAIR: Option<MaleHairStyle>[] = [
  { id: 'lowCut', label: 'Low Cut' },
  { id: 'waves', label: '360 Waves' },
  { id: 'highTopFade', label: 'High-Top Fade' },
  { id: 'afro', label: 'Afro' },
  { id: 'shortDreads', label: 'Short Twists' },
  { id: 'longLocs', label: 'Long Locs' },
  { id: 'bald', label: 'Clean Bald' },
];

export const HAIR_COLORS: Option<HairColorId>[] = [
  { id: 'black', label: 'Black' },
  { id: 'darkBrown', label: 'Dark Brown' },
  { id: 'burgundy', label: 'Burgundy' },
  { id: 'ginger', label: 'Ginger' },
  { id: 'honeyBlonde', label: 'Honey Blonde' },
  { id: 'platinum', label: 'Platinum' },
  { id: 'ombre', label: 'Ombré' },
];

export const BEARDS: Option<FacialHairPreset>[] = [
  { id: 'none', label: 'Clean Shaven' },
  { id: 'stubble', label: 'Stubble' },
  { id: 'moustache', label: 'Moustache' },
  { id: 'goatee', label: 'Goatee' },
  { id: 'circleBeard', label: 'Circle Beard' },
  { id: 'chinStrap', label: 'Chin Strap' },
  { id: 'shortBoxed', label: 'Short Boxed' },
  { id: 'fullBeard', label: 'Full Beard' },
];

// ---------------------------------------------------------------------------
// Makeup
// ---------------------------------------------------------------------------
export const LIP_SHADES = [
  { name: 'Nude', color: '#B9705F' },
  { name: 'Peach', color: '#E0846A' },
  { name: 'Caramel', color: '#9D583B' },
  { name: 'Mocha', color: '#7E4636' },
  { name: 'Brown', color: '#6E3328' },
  { name: 'Cocoa', color: '#4A221E' },
  { name: 'Coral', color: '#D9604F' },
  { name: 'Orange', color: '#E0502A' },
  { name: 'Pink', color: '#D6667F' },
  { name: 'Hot Pink', color: '#D8336E' },
  { name: 'Berry', color: '#A8405A' },
  { name: 'Red', color: '#C2262E' },
  { name: 'Wine', color: '#7A1C2E' },
  { name: 'Plum', color: '#6A2A4A' },
  { name: 'Mauve', color: '#9A5A6E' },
  { name: 'Black Cherry', color: '#3E1420' },
];

export const LIP_LINERS = [
  { name: 'None', color: 'none' },
  { name: 'Brown', color: '#4A2218' },
  { name: 'Dark Brown', color: '#2A120C' },
  { name: 'Wine', color: '#4A0E1C' },
  { name: 'Red', color: '#8A1A20' },
  { name: 'Nude', color: '#8A4E40' },
];

export const EYESHADOWS = [
  { name: 'None', color: 'none' },
  { name: 'Nude', color: '#B98266' },
  { name: 'Champagne', color: '#E6C9A0' },
  { name: 'Gold', color: '#D4A23A' },
  { name: 'Bronze', color: '#9A5A2A' },
  { name: 'Copper', color: '#B5602E' },
  { name: 'Rose', color: '#C46A78' },
  { name: 'Pink', color: '#E07AA4' },
  { name: 'Plum', color: '#6E2F5A' },
  { name: 'Purple', color: '#7A3AA8' },
  { name: 'Smoky', color: '#2E2420' },
  { name: 'Emerald', color: '#1F7A5A' },
  { name: 'Royal Blue', color: '#2846A8' },
  { name: 'Teal', color: '#1F8A8A' },
  { name: 'Red', color: '#A8202A' },
  { name: 'Silver', color: '#C8C8D0' },
];

export const SHADOW_STYLES: Option<ShadowStyle>[] = [
  { id: 'wash', label: 'Lid Wash' },
  { id: 'smoky', label: 'Smoky' },
  { id: 'cutCrease', label: 'Cut Crease' },
  { id: 'halo', label: 'Halo' },
  { id: 'glitter', label: 'Glitter' },
];

export const LINERS: Option<LinerStyle | 'none'>[] = [
  { id: 'none', label: 'None' },
  { id: 'tightline', label: 'Tightline' },
  { id: 'thin', label: 'Thin Line' },
  { id: 'wing', label: 'Classic Wing' },
  { id: 'cat', label: 'Cat Eye' },
  { id: 'doubleWing', label: 'Double Wing' },
  { id: 'smudged', label: 'Smudged' },
  { id: 'floatingCrease', label: 'Floating Crease' },
  { id: 'lowerOnly', label: 'Lower Only' },
];

export const LINER_COLORS = [
  { name: 'Black', color: '#120806' },
  { name: 'Brown', color: '#4A2A18' },
  { name: 'Navy', color: '#1A2A5A' },
  { name: 'Emerald', color: '#0E5A3E' },
  { name: 'Copper', color: '#A85A28' },
  { name: 'White', color: '#F4F0EA' },
];

export const LASHES: Option<LashStyle>[] = [
  { id: 'natural', label: 'Bare' },
  { id: 'mascara', label: 'Mascara' },
  { id: 'wispy', label: 'Wispy' },
  { id: 'full', label: 'Volume' },
  { id: 'dramatic', label: 'Dramatic Mink' },
];

export const LIP_FINISHES: Option<LipFinish>[] = [
  { id: 'gloss', label: 'Gloss' },
  { id: 'satin', label: 'Satin' },
  { id: 'matte', label: 'Matte' },
  { id: 'chrome', label: 'Chrome' },
];

export const BROW_STYLES: Option<BrowStyle>[] = [
  { id: 'natural', label: 'Natural' },
  { id: 'defined', label: 'Defined' },
  { id: 'laminated', label: 'Laminated' },
  { id: 'bold', label: 'Bold' },
];

export const BLUSH_SHADES = [
  { name: 'Peach', color: '#E88A6E' },
  { name: 'Coral', color: '#E8705A' },
  { name: 'Rose', color: '#D9667A' },
  { name: 'Berry', color: '#A8405A' },
  { name: 'Terracotta', color: '#B8553A' },
  { name: 'Brick', color: '#8E3A2A' },
];

export const BLUSH_PLACEMENTS: Option<BlushPlacement>[] = [
  { id: 'apples', label: 'Apples' },
  { id: 'cSculpt', label: 'C-Sculpt' },
  { id: 'draped', label: 'Draped' },
];

export const HIGHLIGHTS = [
  { name: 'Champagne', color: '#FFE9C8' },
  { name: 'Gold', color: '#F2C66A' },
  { name: 'Rose Gold', color: '#F2B0A0' },
  { name: 'Pearl', color: '#FFF6F0' },
  { name: 'Bronze', color: '#D89A5A' },
];

export const CONTACTS: Option<ContactLens>[] = [
  { id: 'none', label: 'Natural' },
  { id: 'lightBrown', label: 'Light Brown' },
  { id: 'honey', label: 'Honey' },
  { id: 'hazel', label: 'Hazel' },
  { id: 'green', label: 'Green' },
  { id: 'grey', label: 'Grey' },
  { id: 'blue', label: 'Blue' },
];

export const NAIL_COLORS = [
  { name: 'Bare', color: 'none' },
  { name: 'Nude', color: '#C99A84' },
  { name: 'Milky White', color: '#F2ECE6' },
  { name: 'Red', color: '#C2262E' },
  { name: 'Wine', color: '#6A1626' },
  { name: 'Pink', color: '#E07AA4' },
  { name: 'Orange', color: '#E86A2E' },
  { name: 'Black', color: '#16141A' },
  { name: 'Gold', color: '#D4A23A' },
  { name: 'Lilac', color: '#B49AD8' },
];

export const NAIL_FINISHES: Option<NailFinish>[] = [
  { id: 'gloss', label: 'Gloss' },
  { id: 'matte', label: 'Matte' },
  { id: 'chrome', label: 'Chrome' },
];

/** One-tap makeup looks. */
export const MAKEUP_LOOKS: { id: string; label: string; note: string; makeup: Makeup }[] = [
  {
    id: 'bare',
    label: 'No Makeup',
    note: 'Clean skin',
    makeup: { blush: false, liner: false, lashes: 'natural', lipColor: '#B9705F', lipFinish: 'satin', eyeshadow: 'none', nailColor: 'none' },
  },
  {
    id: 'natural',
    label: 'Natural',
    note: 'Skin, mascara, balm',
    makeup: { foundation: true, skinFinish: 'dewy', concealer: true, blush: true, blushColor: '#E88A6E', blushPlacement: 'apples', liner: true, linerStyle: 'tightline', lashes: 'mascara', lipColor: '#B9705F', lipFinish: 'gloss', eyeshadow: 'none', browStyle: 'laminated', nailColor: '#C99A84' },
  },
  {
    id: 'softGlam',
    label: 'Soft Glam',
    note: 'Everyday Lagos glam',
    makeup: { foundation: true, skinFinish: 'dewy', concealer: true, powder: true, bronzer: true, blush: true, blushColor: '#B8553A', blushPlacement: 'cSculpt', highlighter: true, highlightColor: '#FFE9C8', eyeshadow: '#B98266', shadowStyle: 'wash', liner: true, linerStyle: 'wing', lashes: 'wispy', browStyle: 'defined', lipColor: '#9D583B', lipLiner: '#4A2218', lipFinish: 'gloss', nailColor: '#C99A84' },
  },
  {
    id: 'owambe',
    label: 'Owambe Glam',
    note: 'Full face for the party',
    makeup: { foundation: true, skinFinish: 'matte', concealer: true, powder: true, bronzer: true, contour: true, blush: true, blushColor: '#A8405A', blushPlacement: 'draped', highlighter: true, highlightColor: '#F2C66A', eyeshadow: '#D4A23A', shadowStyle: 'cutCrease', liner: true, linerStyle: 'cat', lashes: 'dramatic', bottomLashes: true, browStyle: 'bold', lipColor: '#7A1C2E', lipLiner: '#2A120C', lipFinish: 'matte', nailColor: '#C2262E', nailFinish: 'chrome' },
  },
  {
    id: 'bridal',
    label: 'Bridal',
    note: 'Bright, soft and glowing',
    makeup: { foundation: true, skinFinish: 'dewy', concealer: true, powder: true, bronzer: true, contour: true, blush: true, blushColor: '#D9667A', blushPlacement: 'cSculpt', highlighter: true, highlightColor: '#FFF6F0', eyeshadow: '#E6C9A0', shadowStyle: 'glitter', liner: true, linerStyle: 'wing', lashes: 'full', browStyle: 'defined', lipColor: '#D6667F', lipLiner: '#8A4E40', lipFinish: 'satin', nailColor: '#F2ECE6' },
  },
  {
    id: 'baddie',
    label: 'Baddie',
    note: 'Dark liner, glossy lips',
    makeup: { foundation: true, skinFinish: 'matte', concealer: true, powder: true, contour: true, bronzer: true, blush: true, blushColor: '#B8553A', blushPlacement: 'cSculpt', highlighter: true, highlightColor: '#F2C66A', eyeshadow: '#9A5A2A', shadowStyle: 'smoky', liner: true, linerStyle: 'cat', lashes: 'dramatic', bottomLashes: true, browStyle: 'bold', lipColor: '#9D583B', lipLiner: '#2A120C', lipFinish: 'gloss', nailColor: '#16141A', nailFinish: 'chrome' },
  },
];

// ---------------------------------------------------------------------------
// Fabrics
// ---------------------------------------------------------------------------
export const FABRICS: Option<FabricId>[] = [
  { id: 'plain', label: 'Plain Cotton' },
  { id: 'ankara', label: 'Ankara' },
  { id: 'lace', label: 'Lace' },
  { id: 'asoOke', label: 'Aso-oke' },
  { id: 'adire', label: 'Adire' },
  { id: 'george', label: 'George' },
  { id: 'satin', label: 'Satin' },
  { id: 'velvet', label: 'Velvet' },
  { id: 'chiffon', label: 'Chiffon' },
  { id: 'sequin', label: 'Sequins' },
  { id: 'denim', label: 'Denim' },
  { id: 'leather', label: 'Leather' },
];

export const ANKARA_PRINTS = ['Rings', 'Diamonds', 'Waves', 'Leaves', 'Chevron', 'Squares', 'Sunburst', 'Shells', 'Dots', 'Swirls'];

export const FABRIC_COLORS = [
  '#F6F1E8', '#E9D8B8', '#C9A163', '#E3B23C', '#E86A2E', '#C2262E', '#8E1F3A', '#E46A9A',
  '#7A3A8C', '#2846A8', '#1F6FB2', '#1F7A5A', '#2F5D3A', '#6B8E23', '#5A3A28', '#1E1E24',
];

// ---------------------------------------------------------------------------
// Wardrobe items
// ---------------------------------------------------------------------------
export type Slot = 'top' | 'bottom' | 'dress' | 'outer';
export type Occasion = 'owambe' | 'wedding' | 'church' | 'office' | 'dateNight' | 'birthday' | 'party' | 'casual' | 'brunch' | 'redCarpet';
export type Class = 'poor' | 'middle' | 'rich';

export interface WardrobeItem {
  id: string;
  label: string;
  slot: Slot;
  /** Women's or men's item. */
  for: 'f' | 'm';
  native: boolean;
  occasions: Occasion[];
  /** Cheapest class it suits; rich customers can wear anything. */
  cls: Class;
  /** Starting price in naira (placeholder until the economy is simulated). */
  price: number;
  /** Fabric it usually comes in. */
  fabric: FabricId;
  /** Sub-heading in the wardrobe panel. */
  group: string;
  /** Reuses a carefully drawn SVG silhouette while retaining its own product identity and price. */
  renderId?: string;
  /** Shop tier at which this supplier item unlocks. */
  minTier?: number;
}

const W = (
  id: string, label: string, slot: Slot, group: string, native: boolean, occasions: Occasion[],
  cls: Class, price: number, fabric: FabricId, forWho: 'f' | 'm' = 'f',
  opts: { renderId?: string; minTier?: number } = {},
): WardrobeItem => ({
  id, label, slot, group, native, occasions, cls, price, fabric, for: forWho, ...opts,
});

export const WARDROBE: WardrobeItem[] = [
  // ---- women's tops ----
  W('camisole', 'Camisole', 'top', 'Tops', false, ['dateNight', 'office', 'brunch'], 'middle', 2000, 'satin'),
  W('cropTop', 'Crop Top', 'top', 'Tops', false, ['casual', 'birthday', 'party'], 'poor', 1500, 'plain'),
  W('tubeTop', 'Tube Top', 'top', 'Tops', false, ['party', 'birthday', 'casual'], 'poor', 1000, 'plain'),
  W('corsetTop', 'Corset Top', 'top', 'Tops', false, ['party', 'birthday', 'dateNight'], 'middle', 5000, 'satin'),
  W('offShoulderTop', 'Off-Shoulder Top', 'top', 'Tops', false, ['brunch', 'dateNight', 'casual'], 'middle', 3000, 'plain'),
  W('halterTop', 'Halter Top', 'top', 'Tops', false, ['party', 'birthday', 'dateNight'], 'middle', 2500, 'satin'),
  W('tshirt', 'T-Shirt', 'top', 'Tops', false, ['casual'], 'poor', 1000, 'plain'),
  W('cropTee', 'Crop Tee', 'top', 'Tops', false, ['casual', 'birthday'], 'poor', 1000, 'plain'),
  W('blouse', 'Button Blouse', 'top', 'Tops', false, ['office', 'church'], 'middle', 3000, 'chiffon'),
  W('peplumTop', 'Peplum Top', 'top', 'Tops', false, ['office', 'church', 'owambe'], 'middle', 3500, 'ankara'),
  W('wrapTop', 'Wrap Top', 'top', 'Tops', false, ['office', 'brunch', 'dateNight'], 'middle', 3000, 'satin'),
  W('buba', 'Buba', 'top', 'Native Tops', true, ['owambe', 'church', 'wedding'], 'poor', 3000, 'ankara'),
  W('laceBlouse', 'Lace Blouse', 'top', 'Native Tops', true, ['owambe', 'wedding', 'church'], 'middle', 9000, 'lace'),
  W('offShoulderBuba', 'Off-Shoulder Buba', 'top', 'Native Tops', true, ['owambe', 'wedding', 'party'], 'middle', 6500, 'lace'),
  W('puffBlouse', 'Puff-Sleeve Blouse', 'top', 'Tops', false, ['brunch', 'office', 'church', 'dateNight'], 'middle', 3500, 'chiffon'),
  // ---- women's bottoms ----
  W('pencilSkirt', 'Pencil Skirt', 'bottom', 'Skirts', false, ['office', 'dateNight', 'church'], 'middle', 2500, 'plain'),
  W('miniSkirt', 'Mini Skirt', 'bottom', 'Skirts', false, ['party', 'birthday', 'casual'], 'poor', 2000, 'denim'),
  W('aLineSkirt', 'A-Line Skirt', 'bottom', 'Skirts', false, ['church', 'office', 'brunch'], 'poor', 2000, 'plain'),
  W('pleatedMidi', 'Pleated Midi Skirt', 'bottom', 'Skirts', false, ['church', 'brunch', 'office'], 'middle', 3000, 'satin'),
  W('maxiSkirt', 'Maxi Skirt', 'bottom', 'Skirts', false, ['church', 'casual', 'brunch'], 'poor', 2500, 'chiffon'),
  W('denimMaxiSkirt', 'Denim Maxi Skirt', 'bottom', 'Skirts', false, ['casual', 'brunch', 'church'], 'poor', 3500, 'denim'),
  W('iro', 'Iro (Wrapper)', 'bottom', 'Native Wrappers', true, ['owambe', 'church', 'wedding'], 'poor', 3000, 'ankara'),
  W('georgeWrapper', 'George Wrapper', 'bottom', 'Native Wrappers', true, ['wedding', 'owambe', 'church'], 'rich', 22500, 'george'),
  W('skinnyJeans', 'Skinny Jeans', 'bottom', 'Trousers', false, ['casual', 'dateNight'], 'poor', 3000, 'denim'),
  W('baggyJeans', 'Baggy Jeans', 'bottom', 'Trousers', false, ['casual', 'birthday'], 'poor', 3000, 'denim'),
  W('wideLegTrousers', 'Wide-Leg Trousers', 'bottom', 'Trousers', false, ['office', 'brunch', 'church'], 'middle', 3500, 'plain'),
  W('cargoPants', 'Cargo Pants', 'bottom', 'Trousers', false, ['casual', 'birthday'], 'poor', 3000, 'plain'),
  W('shorts', 'Shorts', 'bottom', 'Trousers', false, ['casual'], 'poor', 1500, 'denim'),
  W('straightTrousers', 'Tailored Trousers', 'bottom', 'Trousers', false, ['office', 'church'], 'middle', 3000, 'plain'),
  // ---- women's dresses & gowns ----
  W('bodyconMini', 'Bodycon Mini Gown', 'dress', 'Dresses', false, ['party', 'birthday', 'dateNight'], 'poor', 3000, 'plain'),
  W('slipDress', 'Slip Dress', 'dress', 'Dresses', false, ['dateNight', 'party', 'brunch'], 'middle', 4000, 'satin'),
  W('wrapDress', 'Wrap Dress', 'dress', 'Dresses', false, ['office', 'brunch', 'church'], 'middle', 5000, 'plain'),
  W('shirtDress', 'Shirt Dress', 'dress', 'Dresses', false, ['office', 'casual', 'church'], 'middle', 4000, 'plain'),
  W('tubeMidi', 'Tube Midi Dress', 'dress', 'Dresses', false, ['party', 'birthday', 'dateNight'], 'middle', 4500, 'satin'),
  W('maxiDress', 'Maxi Dress', 'dress', 'Dresses', false, ['brunch', 'church', 'casual'], 'poor', 3500, 'chiffon'),
  W('ruffleMaxi', 'Tiered Ruffle Maxi', 'dress', 'Dresses', false, ['brunch', 'birthday', 'church', 'casual'], 'middle', 6000, 'chiffon'),
  W('fitFlare', 'Ankara Flare Dress', 'dress', 'Native Gowns', true, ['church', 'owambe', 'office'], 'poor', 4000, 'ankara'),
  W('mermaidGown', 'Mermaid Gown', 'dress', 'Native Gowns', true, ['owambe', 'wedding'], 'middle', 10500, 'ankara'),
  W('laceGown', 'Aso-ebi Lace Gown', 'dress', 'Native Gowns', true, ['wedding', 'owambe'], 'rich', 40000, 'lace'),
  W('bubu', 'Bubu Kaftan', 'dress', 'Native Gowns', true, ['church', 'casual', 'owambe'], 'poor', 5000, 'ankara'),
  W('adireMaxi', 'Adire Maxi Gown', 'dress', 'Native Gowns', true, ['casual', 'church', 'brunch'], 'middle', 7000, 'adire'),
  W('corsetGown', 'Corset Gown', 'dress', 'Evening Gowns', false, ['redCarpet', 'party', 'wedding'], 'rich', 45000, 'satin'),
  W('ballGown', 'Ball Gown', 'dress', 'Evening Gowns', false, ['redCarpet', 'wedding'], 'rich', 75000, 'satin'),
  W('offShoulderGown', 'Off-Shoulder Gown', 'dress', 'Evening Gowns', false, ['redCarpet', 'wedding', 'party'], 'rich', 42500, 'velvet'),
  W('slitGown', 'High-Slit Gown', 'dress', 'Evening Gowns', false, ['redCarpet', 'party'], 'rich', 47500, 'sequin'),
  W('capeGown', 'Cape-Sleeve Gown', 'dress', 'Evening Gowns', false, ['wedding', 'redCarpet', 'owambe'], 'rich', 55000, 'satin'),
  W('jumpsuit', 'Jumpsuit', 'dress', 'Jumpsuits', false, ['brunch', 'dateNight', 'office'], 'middle', 5000, 'satin'),
  W('playsuit', 'Playsuit', 'dress', 'Jumpsuits', false, ['casual', 'birthday', 'brunch'], 'poor', 3000, 'plain'),
  // ---- women's outerwear ----
  W('blazer', 'Blazer', 'outer', 'Outerwear', false, ['office', 'church', 'brunch'], 'middle', 6500, 'plain'),
  W('cropBlazer', 'Cropped Blazer', 'outer', 'Outerwear', false, ['party', 'brunch', 'dateNight'], 'middle', 5500, 'plain'),
  W('denimJacket', 'Denim Jacket', 'outer', 'Outerwear', false, ['casual', 'birthday'], 'poor', 4000, 'denim'),
  W('leatherJacket', 'Leather Jacket', 'outer', 'Outerwear', false, ['casual', 'party', 'dateNight'], 'middle', 9000, 'leather'),
  W('kimono', 'Kimono', 'outer', 'Outerwear', false, ['brunch', 'casual'], 'poor', 3000, 'chiffon'),
  W('trenchCoat', 'Trench Coat', 'outer', 'Outerwear', false, ['office', 'casual'], 'rich', 22500, 'plain'),
  W('laceShrug', 'Lace Shrug', 'outer', 'Outerwear', true, ['owambe', 'wedding', 'church'], 'middle', 4000, 'lace'),
  W('ankaraBlazer', 'Ankara Blazer', 'outer', 'Outerwear', true, ['office', 'church', 'owambe', 'brunch'], 'middle', 8000, 'ankara'),
  // ---- men's tops ----
  W('shirt', 'Shirt', 'top', 'Tops', false, ['office', 'church', 'dateNight'], 'middle', 3000, 'plain', 'm'),
  W('tee', 'T-Shirt', 'top', 'Tops', false, ['casual'], 'poor', 1000, 'plain', 'm'),
  W('polo', 'Polo', 'top', 'Tops', false, ['casual', 'office', 'brunch'], 'poor', 2000, 'plain', 'm'),
  W('hoodie', 'Hoodie', 'top', 'Tops', false, ['casual'], 'middle', 4000, 'plain', 'm'),
  W('dashiki', 'Dashiki', 'top', 'Native Tops', true, ['casual', 'owambe', 'church'], 'poor', 2500, 'ankara', 'm'),
  W('mensBuba', 'Buba', 'top', 'Native Tops', true, ['owambe', 'church', 'wedding'], 'poor', 3000, 'asoOke', 'm'),
  W('isiagu', 'Isiagu (Chieftaincy Top)', 'top', 'Native Tops', true, ['owambe', 'wedding', 'church'], 'middle', 12000, 'plain', 'm'),
  // ---- men's bottoms ----
  W('trousers', 'Trousers', 'bottom', 'Bottoms', false, ['office', 'church', 'dateNight'], 'middle', 3000, 'plain', 'm'),
  W('jeans', 'Jeans', 'bottom', 'Bottoms', false, ['casual', 'dateNight'], 'poor', 3000, 'denim', 'm'),
  W('chinos', 'Chinos', 'bottom', 'Bottoms', false, ['casual', 'brunch', 'office'], 'poor', 2500, 'plain', 'm'),
  W('mensCargo', 'Cargo Pants', 'bottom', 'Bottoms', false, ['casual'], 'poor', 3000, 'plain', 'm'),
  W('mensShorts', 'Shorts', 'bottom', 'Bottoms', false, ['casual'], 'poor', 1500, 'plain', 'm'),
  W('joggers', 'Joggers', 'bottom', 'Bottoms', false, ['casual', 'birthday'], 'poor', 3000, 'plain', 'm'),
  W('sokoto', 'Sokoto', 'bottom', 'Native Bottoms', true, ['owambe', 'church', 'wedding'], 'poor', 2000, 'asoOke', 'm'),
  // ---- men's native long sets ----
  W('senator', 'Senator Kaftan', 'dress', 'Native Sets', true, ['church', 'owambe', 'office'], 'middle', 9000, 'plain', 'm'),
  W('kaftan', 'Long Kaftan', 'dress', 'Native Sets', true, ['church', 'casual', 'owambe'], 'middle', 7500, 'plain', 'm'),
  W('agbada', 'Agbada', 'dress', 'Native Sets', true, ['wedding', 'owambe'], 'rich', 60000, 'asoOke', 'm'),
  // ---- men's outerwear ----
  W('mensBlazer', 'Blazer', 'outer', 'Outerwear', false, ['office', 'church', 'wedding'], 'middle', 9000, 'plain', 'm'),
  W('mensDenimJacket', 'Denim Jacket', 'outer', 'Outerwear', false, ['casual'], 'poor', 4000, 'denim', 'm'),
  W('mensLeatherJacket', 'Leather Jacket', 'outer', 'Outerwear', false, ['casual', 'party'], 'middle', 10500, 'leather', 'm'),
  W('bomberJacket', 'Bomber Jacket', 'outer', 'Outerwear', false, ['casual', 'party', 'birthday'], 'middle', 8000, 'satin', 'm'),

  // ---- designer womenswear: high, expensive, and couture price architecture ----
  W('silkAtelierBlouse', 'Atelier Silk Blouse', 'top', 'Designer Tops', false, ['office', 'brunch', 'dateNight'], 'middle', 38_000, 'satin', 'f', { renderId: 'silkAtelierBlouse', minTier: 1 }),
  W('handBeadedCorset', 'Hand-Beaded Corset Top', 'top', 'Designer Tops', false, ['party', 'wedding', 'redCarpet'], 'middle', 125_000, 'sequin', 'f', { renderId: 'handBeadedCorset', minTier: 2 }),
  W('asoOkeSculptedBodice', 'Sculpted Aso-Oke Bodice', 'top', 'Designer Native Tops', true, ['owambe', 'wedding'], 'rich', 185_000, 'asoOke', 'f', { renderId: 'asoOkeSculptedBodice', minTier: 2 }),
  W('coutureFeatherBlouse', 'Couture Statement Blouse', 'top', 'Couture Tops', false, ['party', 'redCarpet'], 'rich', 360_000, 'velvet', 'f', { renderId: 'coutureFeatherBlouse', minTier: 3 }),
  W('heirloomAsoOkeBodice', 'Heirloom Handwoven Bodice', 'top', 'Couture Native Tops', true, ['wedding', 'owambe', 'redCarpet'], 'rich', 780_000, 'asoOke', 'f', { renderId: 'heirloomAsoOkeBodice', minTier: 4 }),

  // ---- designer womenswear bottoms ----
  W('tailoredWoolTrousers', 'Tailored Wool Trousers', 'bottom', 'Designer Trousers', false, ['office', 'church', 'dateNight'], 'middle', 42_000, 'plain', 'f', { renderId: 'tailoredWoolTrousers', minTier: 1 }),
  W('silkPalazzoTrousers', 'Silk Palazzo Trousers', 'bottom', 'Designer Trousers', false, ['brunch', 'dateNight', 'party'], 'middle', 88_000, 'satin', 'f', { renderId: 'silkPalazzoTrousers', minTier: 2 }),
  W('coutureEveningSkirt', 'Couture Evening Skirt', 'bottom', 'Couture Skirts', false, ['wedding', 'redCarpet', 'party'], 'rich', 220_000, 'velvet', 'f', { renderId: 'coutureEveningSkirt', minTier: 3 }),
  W('embroideredGeorgeWrapper', 'Embroidered George Wrapper', 'bottom', 'Designer Native Wrappers', true, ['owambe', 'wedding'], 'rich', 265_000, 'george', 'f', { renderId: 'embroideredGeorgeWrapper', minTier: 3 }),
  W('royalLoomWrapper', 'Royal Handwoven Wrapper', 'bottom', 'Couture Native Wrappers', true, ['owambe', 'wedding', 'redCarpet'], 'rich', 850_000, 'asoOke', 'f', { renderId: 'royalLoomWrapper', minTier: 4 }),

  // ---- designer gowns, made-to-measure silhouettes, and bridal couture ----
  W('designerSatinSlip', 'Designer Satin Slip Dress', 'dress', 'Designer Dresses', false, ['dateNight', 'party', 'brunch'], 'middle', 55_000, 'satin', 'f', { renderId: 'designerSatinSlip', minTier: 1 }),
  W('atelierWrapDress', 'Atelier Wrap Dress', 'dress', 'Designer Dresses', false, ['office', 'brunch', 'wedding'], 'middle', 98_000, 'chiffon', 'f', { renderId: 'atelierWrapDress', minTier: 2 }),
  W('lagosRedCarpetGown', 'Lagos Red-Carpet Gown', 'dress', 'Designer Evening Gowns', false, ['redCarpet', 'wedding', 'party'], 'rich', 185_000, 'satin', 'f', { renderId: 'lagosRedCarpetGown', minTier: 2 }),
  W('crystalMermaidGown', 'Crystal-Embellished Mermaid Gown', 'dress', 'Couture Evening Gowns', false, ['redCarpet', 'wedding'], 'rich', 420_000, 'sequin', 'f', { renderId: 'crystalMermaidGown', minTier: 3 }),
  W('atelierBridalBallGown', 'Atelier Bridal Ball Gown', 'dress', 'Bridal Couture', false, ['wedding', 'redCarpet'], 'rich', 680_000, 'lace', 'f', { renderId: 'atelierBridalBallGown', minTier: 4 }),
  W('heirloomLaceAsoEbi', 'Heirloom Aso-Ebi Lace Gown', 'dress', 'Couture Native Gowns', true, ['owambe', 'wedding'], 'rich', 550_000, 'lace', 'f', { renderId: 'heirloomLaceAsoEbi', minTier: 4 }),
  W('goldThreadAdireGown', 'Gold-Thread Adire Gown', 'dress', 'Couture Native Gowns', true, ['owambe', 'wedding', 'redCarpet'], 'rich', 315_000, 'adire', 'f', { renderId: 'goldThreadAdireGown', minTier: 3 }),
  W('royalBridalCapeGown', 'Royal Cape Bridal Gown', 'dress', 'Bridal Couture', false, ['wedding', 'redCarpet'], 'rich', 1_250_000, 'lace', 'f', { renderId: 'royalBridalCapeGown', minTier: 4 }),
  W('beadedOwambeMermaid', 'Hand-Beaded Owambe Mermaid', 'dress', 'Couture Native Gowns', true, ['owambe', 'wedding'], 'rich', 890_000, 'george', 'f', { renderId: 'beadedOwambeMermaid', minTier: 4 }),

  // ---- designer womenswear outer layers ----
  W('tailoredWomensTuxedo', 'Tailored Women’s Tuxedo Jacket', 'outer', 'Designer Tailoring', false, ['office', 'redCarpet', 'dateNight'], 'middle', 145_000, 'velvet', 'f', { renderId: 'tailoredWomensTuxedo', minTier: 2 }),
  W('atelierTrench', 'Atelier Trench Coat', 'outer', 'Designer Outerwear', false, ['office', 'casual', 'brunch'], 'rich', 185_000, 'leather', 'f', { renderId: 'atelierTrench', minTier: 2 }),
  W('embroideredCapeJacket', 'Embroidered Cape Jacket', 'outer', 'Couture Outerwear', true, ['owambe', 'wedding', 'redCarpet'], 'rich', 285_000, 'asoOke', 'f', { renderId: 'embroideredCapeJacket', minTier: 3 }),
  W('runwayLeatherTrench', 'Runway Leather Trench', 'outer', 'Couture Outerwear', false, ['party', 'dateNight', 'redCarpet'], 'rich', 470_000, 'leather', 'f', { renderId: 'runwayLeatherTrench', minTier: 3 }),
  W('coutureVelvetCape', 'Couture Velvet Cape', 'outer', 'Couture Outerwear', false, ['wedding', 'redCarpet'], 'rich', 820_000, 'velvet', 'f', { renderId: 'coutureVelvetCape', minTier: 4 }),

  // ---- premium menswear and suit separates ----
  W('premiumCottonShirt', 'Premium Cotton Dress Shirt', 'top', 'Premium Menswear', false, ['office', 'church', 'dateNight'], 'middle', 22_000, 'plain', 'm', { renderId: 'premiumCottonShirt', minTier: 1 }),
  W('silkDinnerShirt', 'Silk Dinner Shirt', 'top', 'Designer Menswear', false, ['wedding', 'dateNight', 'redCarpet'], 'middle', 72_000, 'satin', 'm', { renderId: 'silkDinnerShirt', minTier: 2 }),
  W('embroideredDamaskDanshiki', 'Embroidered Damask Danshiki', 'top', 'Designer Native Menswear', true, ['owambe', 'wedding'], 'rich', 150_000, 'george', 'm', { renderId: 'embroideredDamaskDanshiki', minTier: 2 }),
  W('luxuryVelvetIsiagu', 'Luxury Velvet Isiagu', 'top', 'Couture Native Menswear', true, ['owambe', 'wedding', 'redCarpet'], 'rich', 330_000, 'velvet', 'm', { renderId: 'luxuryVelvetIsiagu', minTier: 3 }),
  W('heirloomAsoOkeMensTop', 'Heirloom Aso-Oke Ceremony Top', 'top', 'Couture Native Menswear', true, ['owambe', 'wedding'], 'rich', 720_000, 'asoOke', 'm', { renderId: 'heirloomAsoOkeMensTop', minTier: 4 }),
  W('premiumTailoredTrousers', 'Premium Tailored Trousers', 'bottom', 'Premium Menswear', false, ['office', 'church', 'dateNight'], 'middle', 28_000, 'plain', 'm', { renderId: 'premiumTailoredTrousers', minTier: 1 }),
  W('italianWoolSuitTrousers', 'Italian-Wool Suit Trousers', 'bottom', 'Designer Menswear', false, ['office', 'wedding', 'redCarpet'], 'middle', 68_000, 'plain', 'm', { renderId: 'italianWoolSuitTrousers', minTier: 2 }),
  W('tailoredTuxedoTrousers', 'Tailored Tuxedo Trousers', 'bottom', 'Couture Menswear', false, ['wedding', 'redCarpet'], 'rich', 165_000, 'velvet', 'm', { renderId: 'tailoredTuxedoTrousers', minTier: 3 }),
  W('embroideredSenatorSokoto', 'Embroidered Senator Sokoto', 'bottom', 'Designer Native Menswear', true, ['owambe', 'wedding'], 'rich', 185_000, 'asoOke', 'm', { renderId: 'embroideredSenatorSokoto', minTier: 3 }),
  W('royalHandwovenSokoto', 'Royal Handwoven Sokoto', 'bottom', 'Couture Native Menswear', true, ['owambe', 'wedding'], 'rich', 650_000, 'asoOke', 'm', { renderId: 'royalHandwovenSokoto', minTier: 4 }),
  W('designerSenatorSet', 'Designer Senator Two-Piece', 'dress', 'Designer Native Sets', true, ['owambe', 'wedding', 'church'], 'middle', 135_000, 'plain', 'm', { renderId: 'designerSenatorSet', minTier: 2 }),
  W('coutureVelvetAgbada', 'Couture Velvet Agbada', 'dress', 'Couture Native Sets', true, ['owambe', 'wedding'], 'rich', 620_000, 'velvet', 'm', { renderId: 'coutureVelvetAgbada', minTier: 4 }),
  W('royalAsoOkeAgbada', 'Royal Aso-Oke Agbada', 'dress', 'Couture Native Sets', true, ['owambe', 'wedding', 'redCarpet'], 'rich', 1_100_000, 'asoOke', 'm', { renderId: 'royalAsoOkeAgbada', minTier: 4 }),
  W('atelierSenatorKaftan', 'Atelier Senator Kaftan', 'dress', 'Designer Native Sets', true, ['office', 'church', 'owambe'], 'rich', 255_000, 'adire', 'm', { renderId: 'atelierSenatorKaftan', minTier: 3 }),
  W('silkMensKaftan', 'Silk Occasion Kaftan', 'dress', 'Designer Native Sets', true, ['wedding', 'owambe', 'dateNight'], 'rich', 185_000, 'satin', 'm', { renderId: 'silkMensKaftan', minTier: 3 }),
  W('bespokeMensBlazer', 'Bespoke Tuxedo Jacket', 'outer', 'Designer Suiting', false, ['office', 'wedding', 'redCarpet'], 'rich', 195_000, 'velvet', 'm', { renderId: 'bespokeMensBlazer', minTier: 2 }),
  W('italianWoolOvercoat', 'Italian-Wool Overcoat', 'outer', 'Designer Outerwear', false, ['office', 'dateNight', 'redCarpet'], 'rich', 295_000, 'plain', 'm', { renderId: 'italianWoolOvercoat', minTier: 3 }),
  W('luxuryLeatherBiker', 'Luxury Leather Biker Jacket', 'outer', 'Couture Outerwear', false, ['casual', 'party', 'redCarpet'], 'rich', 360_000, 'leather', 'm', { renderId: 'luxuryLeatherBiker', minTier: 3 }),
  W('monogramVelvetDinnerJacket', 'Velvet Dinner Jacket', 'outer', 'Couture Suiting', false, ['wedding', 'redCarpet'], 'rich', 780_000, 'velvet', 'm', { renderId: 'monogramVelvetDinnerJacket', minTier: 4 }),

  // ---- 30 new researched, renderer-backed Yaba Mart designs ----
  // Women's native collection: accessible everyday pieces through bespoke ceremony couture.
  W('ankaraPeplumWrapperGown', 'Ankara Peplum Wrapper Gown', 'dress', 'New Native Womenswear', true, ['owambe', 'church', 'brunch'], 'poor', 8_500, 'ankara', 'f', { renderId: 'ankaraPeplumWrapperGown', minTier: 0 }),
  W('adirePanelBubu', 'Adire Contrast-Panel Bubu', 'dress', 'New Native Womenswear', true, ['casual', 'church', 'brunch'], 'poor', 9_500, 'adire', 'f', { renderId: 'adirePanelBubu', minTier: 0 }),
  W('iroBubaOccasionSet', 'Iro-and-Buba Occasion Set', 'dress', 'New Native Womenswear', true, ['owambe', 'church', 'wedding'], 'middle', 18_000, 'ankara', 'f', { renderId: 'iroBubaOccasionSet', minTier: 1 }),
  W('twoToneAnkaraWrapDress', 'Two-Tone Ankara Wrap Dress', 'dress', 'New Native Womenswear', true, ['brunch', 'owambe', 'birthday'], 'middle', 24_000, 'ankara', 'f', { renderId: 'twoToneAnkaraWrapDress', minTier: 1 }),
  W('georgeWrapperBlouseSet', 'George Wrapper and Blouse Set', 'dress', 'New Native Womenswear', true, ['owambe', 'wedding'], 'middle', 45_000, 'george', 'f', { renderId: 'georgeWrapperBlouseSet', minTier: 2 }),
  W('lacePanelMermaidAsoEbi', 'Lace-Panel Mermaid Aso-Ebi', 'dress', 'New Native Womenswear', true, ['wedding', 'owambe'], 'middle', 95_000, 'lace', 'f', { renderId: 'lacePanelMermaidAsoEbi', minTier: 2 }),
  W('puffSleeveKabaGown', 'Puff-Sleeve Kaba Gown', 'dress', 'New Native Womenswear', true, ['church', 'owambe', 'wedding'], 'middle', 125_000, 'lace', 'f', { renderId: 'puffSleeveKabaGown', minTier: 2 }),
  W('sculptedAsoOkeWrapperSet', 'Sculpted Aso-Oke Wrapper Set', 'dress', 'New Native Womenswear', true, ['owambe', 'wedding', 'redCarpet'], 'rich', 185_000, 'asoOke', 'f', { renderId: 'sculptedAsoOkeWrapperSet', minTier: 3 }),
  W('goldEmbroideredAdireKaftan', 'Gold-Embroidered Adire Kaftan', 'dress', 'New Native Womenswear', true, ['owambe', 'wedding', 'redCarpet'], 'rich', 320_000, 'adire', 'f', { renderId: 'goldEmbroideredAdireKaftan', minTier: 3 }),
  W('coutureAsoOkeCapeCorsetGown', 'Couture Aso-Oke Corset Gown with Cape', 'dress', 'New Native Womenswear', true, ['wedding', 'owambe', 'redCarpet'], 'rich', 850_000, 'asoOke', 'f', { renderId: 'coutureAsoOkeCapeCorsetGown', minTier: 4 }),

  // Women's English-wear collection: everyday separates through red-carpet tailoring.
  W('contrastSeamBoxyTee', 'Contrast-Seam Boxy Cotton Tee', 'top', 'New English Womenswear', false, ['casual', 'brunch'], 'poor', 4_500, 'plain', 'f', { renderId: 'contrastSeamBoxyTee', minTier: 0 }),
  W('aLineShirtDress', 'A-Line Short-Sleeve Shirt Dress', 'dress', 'New English Womenswear', false, ['office', 'church', 'brunch'], 'poor', 9_000, 'plain', 'f', { renderId: 'aLineShirtDress', minTier: 0 }),
  W('tieWaistWrapBlouse', 'Tie-Waist Wrap Blouse', 'top', 'New English Womenswear', false, ['office', 'brunch', 'dateNight'], 'middle', 12_000, 'chiffon', 'f', { renderId: 'tieWaistWrapBlouse', minTier: 1 }),
  W('highRiseStraightTrousers', 'High-Rise Straight-Leg Trousers', 'bottom', 'New English Womenswear', false, ['office', 'church', 'brunch'], 'middle', 16_000, 'plain', 'f', { renderId: 'highRiseStraightTrousers', minTier: 1 }),
  W('deepPleatPalazzoTrousers', 'Deep-Pleat Palazzo Trousers', 'bottom', 'New English Womenswear', false, ['office', 'brunch', 'dateNight'], 'middle', 32_000, 'plain', 'f', { renderId: 'deepPleatPalazzoTrousers', minTier: 1 }),
  W('fitFlareMidiDress', 'Fit-and-Flare Midi Dress', 'dress', 'New English Womenswear', false, ['office', 'church', 'brunch'], 'middle', 58_000, 'satin', 'f', { renderId: 'fitFlareMidiDress', minTier: 2 }),
  W('doubleButtonTailoredBlazer', 'Double-Button Tailored Blazer', 'outer', 'New English Womenswear', false, ['office', 'dateNight', 'redCarpet'], 'middle', 95_000, 'plain', 'f', { renderId: 'doubleButtonTailoredBlazer', minTier: 2 }),
  W('biasCutSatinEveningGown', 'Bias-Cut Satin Evening Gown', 'dress', 'New English Womenswear', false, ['dateNight', 'wedding', 'redCarpet'], 'rich', 165_000, 'satin', 'f', { renderId: 'biasCutSatinEveningGown', minTier: 3 }),
  W('beltedTrenchShirtDress', 'Belted Trench Shirt Dress', 'dress', 'New English Womenswear', false, ['office', 'brunch', 'redCarpet'], 'rich', 220_000, 'plain', 'f', { renderId: 'beltedTrenchShirtDress', minTier: 3 }),
  W('architecturalColumnTrainGown', 'Architectural Column Gown with Train', 'dress', 'New English Womenswear', false, ['wedding', 'redCarpet'], 'rich', 680_000, 'satin', 'f', { renderId: 'architecturalColumnTrainGown', minTier: 4 }),

  // Men's native collection: dashiki, kaftan, senator tailoring, Isiagu and Agbada.
  W('geometricDashikiShirt', 'Geometric-Embroidered Dashiki Shirt', 'top', 'New Native Menswear', true, ['casual', 'church', 'owambe'], 'poor', 8_500, 'ankara', 'm', { renderId: 'geometricDashikiShirt', minTier: 0 }),
  W('contrastPanelNativeKaftan', 'Contrast-Panel Native Kaftan', 'dress', 'New Native Menswear', true, ['church', 'owambe', 'brunch'], 'middle', 24_000, 'adire', 'm', { renderId: 'contrastPanelNativeKaftan', minTier: 1 }),
  W('embroideredSenatorTwoPiece', 'Embroidered Senator Two-Piece', 'dress', 'New Native Menswear', true, ['church', 'owambe', 'wedding'], 'middle', 95_000, 'plain', 'm', { renderId: 'embroideredSenatorTwoPiece', minTier: 2 }),
  W('goldEmbroideredIsiaguTop', 'Gold-Embroidered Velvet Isiagu', 'top', 'New Native Menswear', true, ['owambe', 'wedding', 'redCarpet'], 'rich', 240_000, 'velvet', 'm', { renderId: 'goldEmbroideredIsiaguTop', minTier: 3 }),
  W('royalAsoOkeCeremonyAgbada', 'Royal Aso-Oke Ceremony Agbada', 'dress', 'New Native Menswear', true, ['owambe', 'wedding', 'redCarpet'], 'rich', 650_000, 'asoOke', 'm', { renderId: 'royalAsoOkeCeremonyAgbada', minTier: 4 }),

  // Men's English-wear collection: casual shirting, fitted officewear and formal suits.
  W('contrastPlacketCasualShirt', 'Contrast-Placket Casual Shirt', 'top', 'New English Menswear', false, ['casual', 'brunch', 'dateNight'], 'poor', 7_500, 'plain', 'm', { renderId: 'contrastPlacketCasualShirt', minTier: 0 }),
  W('slimFitDressShirt', 'Slim-Fit Formal Dress Shirt', 'top', 'New English Menswear', false, ['office', 'church', 'dateNight'], 'middle', 28_000, 'plain', 'm', { renderId: 'slimFitDressShirt', minTier: 1 }),
  W('unstructuredNotchLapelBlazer', 'Unstructured Notch-Lapel Blazer', 'outer', 'New English Menswear', false, ['office', 'dateNight', 'wedding'], 'middle', 85_000, 'plain', 'm', { renderId: 'unstructuredNotchLapelBlazer', minTier: 2 }),
  W('doubleBreastedEveningSuit', 'Double-Breasted Evening Suit', 'dress', 'New English Menswear', false, ['wedding', 'office', 'redCarpet'], 'rich', 210_000, 'plain', 'm', { renderId: 'doubleBreastedEveningSuit', minTier: 3 }),
  W('satinLapelTuxedoSet', 'Satin-Lapel Tuxedo Set', 'dress', 'New English Menswear', false, ['wedding', 'redCarpet'], 'rich', 550_000, 'plain', 'm', { renderId: 'satinLapelTuxedoSet', minTier: 4 }),

  // ---- Level 6: Maison private-client collection (tier index 5) ----
  // Entry pieces remain attainable for a top-budget regular; couture pieces serve celebrity/VIP orders.
  W('maisonSilkAtelierBlouse', 'Maison Private-Atelier Silk Blouse', 'top', 'Maison Private Atelier', false, ['office', 'brunch', 'dateNight'], 'rich', 85_000, 'satin', 'f', { renderId: 'silkAtelierBlouse', minTier: 5 }),
  W('maisonTailoredTrousers', 'Maison Tailored Trousers', 'bottom', 'Maison Private Atelier', false, ['office', 'brunch', 'dateNight'], 'rich', 90_000, 'plain', 'f', { renderId: 'tailoredWoolTrousers', minTier: 5 }),
  W('maisonPrivateColumnGown', 'Maison Private-Client Column Gown', 'dress', 'Maison Evening Couture', false, ['redCarpet', 'wedding', 'party'], 'rich', 1_100_000, 'satin', 'f', { renderId: 'architecturalColumnTrainGown', minTier: 5 }),
  W('maisonAsoOkeCapeGown', 'Maison Handwoven Aso-Oke Cape Gown', 'dress', 'Maison Native Couture', true, ['wedding', 'owambe', 'redCarpet'], 'rich', 1_280_000, 'asoOke', 'f', { renderId: 'coutureAsoOkeCapeCorsetGown', minTier: 5 }),
  W('maisonRoyalAgbada', 'Maison Royal Aso-Oke Agbada', 'dress', 'Maison Native Couture', true, ['owambe', 'wedding', 'redCarpet'], 'rich', 1_300_000, 'asoOke', 'm', { renderId: 'royalAsoOkeCeremonyAgbada', minTier: 5 }),
  W('maisonVelvetDinnerSuit', 'Maison Bespoke Velvet Dinner Suit', 'dress', 'Maison Bespoke Menswear', false, ['wedding', 'redCarpet'], 'rich', 1_250_000, 'plain', 'm', { renderId: 'satinLapelTuxedoSet', minTier: 5 }),

  // ---- Level 7: Fashion Empire House collection (tier index 6) ----
  W('empireSilkAtelierBlouse', 'Empire Atelier Silk Blouse', 'top', 'Empire Private Atelier', false, ['office', 'brunch', 'dateNight'], 'rich', 100_000, 'satin', 'f', { renderId: 'silkAtelierBlouse', minTier: 6 }),
  W('empireTailoredTrousers', 'Empire Tailored Trousers', 'bottom', 'Empire Private Atelier', false, ['office', 'brunch', 'dateNight'], 'rich', 105_000, 'plain', 'f', { renderId: 'tailoredWoolTrousers', minTier: 6 }),
  W('empireRedCarpetColumnGown', 'Empire Red-Carpet Column Gown', 'dress', 'Empire Red-Carpet Couture', false, ['redCarpet', 'wedding', 'party'], 'rich', 1_700_000, 'satin', 'f', { renderId: 'architecturalColumnTrainGown', minTier: 6 }),
  W('empireImperialCapeGown', 'Empire Imperial Aso-Oke Cape Gown', 'dress', 'Empire Native Couture', true, ['wedding', 'owambe', 'redCarpet'], 'rich', 2_050_000, 'asoOke', 'f', { renderId: 'coutureAsoOkeCapeCorsetGown', minTier: 6 }),
  W('empireRoyalAgbada', 'Empire Royal Aso-Oke Agbada', 'dress', 'Empire Native Couture', true, ['owambe', 'wedding', 'redCarpet'], 'rich', 2_200_000, 'asoOke', 'm', { renderId: 'royalAsoOkeCeremonyAgbada', minTier: 6 }),
  W('empireVelvetTuxedoSet', 'Empire Bespoke Velvet Tuxedo Set', 'dress', 'Empire Bespoke Menswear', false, ['wedding', 'redCarpet'], 'rich', 1_850_000, 'plain', 'm', { renderId: 'satinLapelTuxedoSet', minTier: 6 }),
];

export const itemById = (id?: string) => WARDROBE.find((w) => w.id === id);
export const itemsFor = (male: boolean, slot: Slot) => WARDROBE.filter((w) => w.for === (male ? 'm' : 'f') && w.slot === slot);

// ---------------------------------------------------------------------------
// Accessories
// ---------------------------------------------------------------------------
export interface AccessoryItem extends Option<string> {
  for: 'f' | 'm' | 'both';
  native?: boolean;
  price: number;
  /** Maps this priced catalogue variant to a detailed existing renderer model. */
  renderId?: string;
  minTier?: number;
}
const A = (
  id: string, label: string, forWho: 'f' | 'm' | 'both', price: number, native = false,
  opts: { renderId?: string; minTier?: number } = {},
): AccessoryItem => ({ id, label, for: forWho, price, native, ...opts });

export const SHOES: AccessoryItem[] = [
  A('heels', 'Stiletto Pumps', 'f', 4000),
  A('blockHeels', 'Block Heels', 'f', 3500),
  A('platforms', 'Platform Heels', 'f', 5000),
  A('sandals', 'Strappy Sandals', 'f', 3000),
  A('mules', 'Mules', 'f', 3000),
  A('flats', 'Ballet Flats', 'f', 2000),
  A('slides', 'Slides', 'both', 1500),
  A('sneakers', 'Sneakers', 'both', 5000),
  A('ankleBoots', 'Ankle Boots', 'f', 6500),
  A('kneeBoots', 'Knee Boots', 'f', 12500),
  A('loafers', 'Loafers', 'm', 5000),
  A('oxfords', 'Oxfords', 'm', 6500),
  A('palmSlippers', 'Palm Slippers', 'm', 3000, true),
  A('mensBoots', 'Chelsea Boots', 'm', 11000),
  A('premiumLeatherHeels', 'Premium Leather Heels', 'f', 32_000, false, { renderId: 'premiumLeatherHeels', minTier: 1 }),
  A('crystalEveningHeels', 'Crystal Evening Heels', 'f', 88_000, false, { renderId: 'crystalEveningHeels', minTier: 2 }),
  A('atelierSculptedMules', 'Atelier Sculpted Mules', 'f', 165_000, false, { renderId: 'atelierSculptedMules', minTier: 3 }),
  A('coutureGoldSlingbacks', 'Couture Gold Slingbacks', 'f', 390_000, false, { renderId: 'coutureGoldSlingbacks', minTier: 3 }),
  A('diamondRunwayPumps', 'Diamond-Detail Runway Pumps', 'f', 850_000, false, { renderId: 'diamondRunwayPumps', minTier: 4 }),
  A('premiumSuedeLoafers', 'Premium Suede Loafers', 'm', 38_000, false, { renderId: 'premiumSuedeLoafers', minTier: 1 }),
  A('italianLeatherOxfords', 'Italian Leather Oxfords', 'm', 92_000, false, { renderId: 'italianLeatherOxfords', minTier: 2 }),
  A('bespokeVelvetLoafers', 'Bespoke Velvet Loafers', 'm', 185_000, false, { renderId: 'bespokeVelvetLoafers', minTier: 3 }),
  A('goldHardwareDressShoes', 'Gold-Hardware Dress Shoes', 'm', 420_000, false, { renderId: 'goldHardwareDressShoes', minTier: 3 }),
  A('handFinishedOxfordCouture', 'Hand-Finished Oxford Couture', 'm', 780_000, false, { renderId: 'handFinishedOxfordCouture', minTier: 4 }),
  A('everydayCanvasSneakers', 'Everyday Canvas Sneakers', 'both', 7_500, false, { renderId: 'everydayCanvasSneakers', minTier: 0 }),
  A('atelierLeatherSneakers', 'Atelier Leather Sneakers', 'both', 65_000, false, { renderId: 'atelierLeatherSneakers', minTier: 2 }),
  A('maisonDiamondRunwayPumps', 'Maison Diamond-Detail Runway Pumps', 'f', 900_000, false, { renderId: 'diamondRunwayPumps', minTier: 5 }),
  A('empireDiamondRunwayPumps', 'Empire Diamond-Detail Runway Pumps', 'f', 1_650_000, false, { renderId: 'diamondRunwayPumps', minTier: 6 }),
];

export const BAGS: AccessoryItem[] = [
  A('none', 'None', 'both', 0),
  A('clutch', 'Clutch', 'f', 3000),
  A('miniBag', 'Mini Bag', 'f', 4000),
  A('shoulderBag', 'Shoulder Bag', 'f', 5000),
  A('crossbody', 'Crossbody', 'both', 3500),
  A('tote', 'Tote', 'f', 4000),
  A('bucketBag', 'Bucket Bag', 'f', 5000),
  A('backpack', 'Backpack', 'both', 4000),
  A('beadedBag', 'Beaded Bag', 'f', 10000, true),
  A('structuredWorkTote', 'Structured Work Tote', 'f', 22_000, false, { renderId: 'structuredWorkTote', minTier: 1 }),
  A('sculptedEveningClutch', 'Sculpted Evening Clutch', 'f', 68_000, false, { renderId: 'sculptedEveningClutch', minTier: 2 }),
  A('artisanAsoOkeBag', 'Artisan Aso-Oke Handbag', 'f', 82_000, true, { renderId: 'artisanAsoOkeBag', minTier: 2 }),
  A('premiumLeatherCrossbody', 'Premium Leather Crossbody', 'both', 120_000, false, { renderId: 'premiumLeatherCrossbody', minTier: 2 }),
  A('atelierTopHandleBag', 'Atelier Top-Handle Bag', 'f', 220_000, false, { renderId: 'atelierTopHandleBag', minTier: 3 }),
  A('handwovenCeremonyBag', 'Handwoven Ceremony Bag', 'both', 380_000, true, { renderId: 'handwovenCeremonyBag', minTier: 3 }),
  A('couturePearlEveningBag', 'Couture Pearl Evening Bag', 'f', 680_000, false, { renderId: 'couturePearlEveningBag', minTier: 4 }),
  A('heirloomLeatherWeekender', 'Heirloom Leather Weekender', 'm', 850_000, false, { renderId: 'heirloomLeatherWeekender', minTier: 4 }),
  A('maisonPearlEveningBag', 'Maison Couture Pearl Evening Bag', 'f', 1_050_000, false, { renderId: 'couturePearlEveningBag', minTier: 5 }),
  A('empirePearlEveningBag', 'Empire Couture Pearl Evening Bag', 'f', 1_800_000, false, { renderId: 'couturePearlEveningBag', minTier: 6 }),
];

export const HEADWEAR: AccessoryItem[] = [
  A('none', 'None', 'both', 0),
  A('gele', 'Gele (Fan)', 'f', 5000, true),
  A('geleWrap', 'Gele (Wrap)', 'f', 4000, true),
  A('headwrap', 'Head Wrap', 'f', 2000, true),
  A('beret', 'Beret', 'both', 2000),
  A('cap', 'Baseball Cap', 'both', 1500),
  A('bucketHat', 'Bucket Hat', 'both', 2000),
  A('fascinator', 'Fascinator', 'f', 6500),
  A('fila', 'Fila Cap', 'm', 2000, true),
  A('embroideredCeremonyFila', 'Embroidered Ceremony Fila', 'm', 28_000, true, { renderId: 'embroideredCeremonyFila', minTier: 1 }),
  A('beadedStatementFascinator', 'Beaded Statement Fascinator', 'f', 48_000, false, { renderId: 'beadedStatementFascinator', minTier: 2 }),
  A('goldThreadAsoOkeGele', 'Gold-Thread Aso-Oke Gele', 'f', 125_000, true, { renderId: 'goldThreadAsoOkeGele', minTier: 3 }),
  A('coutureCrystalHeadpiece', 'Couture Crystal Headpiece', 'f', 340_000, false, { renderId: 'coutureCrystalHeadpiece', minTier: 3 }),
  A('royalFilaAsoOke', 'Royal Aso-Oke Fila', 'm', 250_000, true, { renderId: 'royalFilaAsoOke', minTier: 3 }),
  A('heirloomGoldGele', 'Heirloom Gold-Worked Gele', 'f', 720_000, true, { renderId: 'heirloomGoldGele', minTier: 4 }),
  A('maisonGoldWorkedGele', 'Maison Gold-Worked Aso-Oke Gele', 'f', 980_000, true, { renderId: 'heirloomGoldGele', minTier: 5 }),
  A('empireGoldWorkedGele', 'Empire Gold-Worked Aso-Oke Gele', 'f', 1_750_000, true, { renderId: 'heirloomGoldGele', minTier: 6 }),
];

/** Premium hairpieces are merchandise colourways; the renderer reuses its detailed hair silhouettes. */
export const HAIR_PRODUCTS: AccessoryItem[] = [
  A('syntheticBobWig', 'Everyday Synthetic Bob Wig', 'f', 6_500, false, { renderId: 'bluntBob', minTier: 0 }),
  A('braidedPonytailExtension', 'Braided Ponytail Extension', 'f', 4_500, false, { renderId: 'longBraids', minTier: 0 }),
  A('classicMensHairpiece', 'Classic Men’s Hairpiece', 'm', 8_500, false, { renderId: 'lowCut', minTier: 0 }),
  A('silkyStraightBundle', 'Silky Straight Wig Bundle', 'f', 18_000, false, { renderId: 'boneStraight', minTier: 1 }),
  A('waterWaveFrontal', 'Water-Wave Frontal Wig', 'f', 38_000, false, { renderId: 'waterWave', minTier: 1 }),
  A('kinkyCoilyWig', 'Kinky-Coily Natural Wig', 'f', 28_000, false, { renderId: 'kinkyStraight', minTier: 1 }),
  A('knotlessBraidBundle', 'Knotless Braid Bundle', 'f', 22_000, false, { renderId: 'knotlessBraids', minTier: 1 }),
  A('fulaniBraidBundle', 'Fulani Braids Bundle', 'f', 35_000, true, { renderId: 'fulaniBraids', minTier: 1 }),
  A('deepWaveHDLace', 'Deep-Wave HD Lace Wig', 'f', 95_000, false, { renderId: 'deepCurly', minTier: 2 }),
  A('butterflyCutFrontal', 'Butterfly-Cut Frontal Wig', 'f', 125_000, false, { renderId: 'butterflyLayers', minTier: 2 }),
  A('gingerBodyWaveLuxe', 'Ginger Body-Wave Luxe Wig', 'f', 185_000, false, { renderId: 'bodyWave', minTier: 3 }),
  A('knotlessWaistLength', 'Waist-Length Knotless Braids', 'f', 145_000, false, { renderId: 'knotlessBraids', minTier: 3 }),
  A('handFinishedGoddessLocs', 'Hand-Finished Goddess Locs', 'f', 220_000, true, { renderId: 'goddessLocs', minTier: 3 }),
  A('platinumButterflyCouture', 'Platinum Butterfly Couture Wig', 'f', 420_000, false, { renderId: 'butterflyLayers', minTier: 3 }),
  A('virginHairWaterWave', 'Virgin-Hair Water-Wave Wig', 'f', 550_000, false, { renderId: 'waterWave', minTier: 4 }),
  A('rawHairHDFrontal', 'Raw-Hair HD Frontal', 'f', 780_000, false, { renderId: 'sidePartFrontal', minTier: 4 }),
  A('handcraftedBraidCrown', 'Handcrafted Braid Crown', 'f', 680_000, true, { renderId: 'fulaniBraids', minTier: 4 }),
  A('mensLocsCrownPiece', 'Men’s Locs Crown Piece', 'm', 85_000, false, { renderId: 'longLocs', minTier: 2 }),
  A('mensPremiumHairSystem', 'Premium Men’s Hair System', 'm', 260_000, false, { renderId: 'shortDreads', minTier: 3 }),
  A('maisonVirginHairLaceFront', 'Maison Virgin-Hair HD Lace Front', 'f', 1_100_000, false, { renderId: 'sidePartFrontal', minTier: 5 }),
  A('empireVirginHairLaceFront', 'Empire Virgin-Hair HD Lace Front', 'f', 1_850_000, false, { renderId: 'sidePartFrontal', minTier: 6 }),
];

export const EARRINGS: Option<EarringStyle>[] = [
  { id: 'none', label: 'None' },
  { id: 'goldStuds', label: 'Studs' },
  { id: 'huggies', label: 'Huggies' },
  { id: 'goldHoops', label: 'Hoops' },
  { id: 'bigHoops', label: 'Big Hoops' },
  { id: 'goldDrops', label: 'Drops' },
  { id: 'pearls', label: 'Pearls' },
  { id: 'chandelier', label: 'Chandelier' },
  { id: 'coralDrops', label: 'Coral Drops' },
];

export const NECKLACES: AccessoryItem[] = [
  A('none', 'None', 'both', 0),
  A('chain', 'Fine Chain', 'both', 3000),
  A('pendant', 'Pendant', 'f', 3500),
  A('pearls', 'Pearls', 'f', 5000),
  A('choker', 'Choker', 'f', 2000),
  A('layered', 'Layered Chains', 'f', 5000),
  A('coral', 'Coral Beads (Iyun)', 'both', 20000, true),
  A('cuban', 'Cuban Link', 'm', 10000),
  A('freshwaterPearlStrand', 'Freshwater Pearl Strand', 'f', 42_000, false, { renderId: 'freshwaterPearlStrand', minTier: 1 }),
  A('goldLayeredNecklace', 'Gold Layered Necklace', 'both', 88_000, false, { renderId: 'goldLayeredNecklace', minTier: 2 }),
  A('handsetCoralNecklace', 'Hand-Set Coral Necklace', 'both', 180_000, true, { renderId: 'handsetCoralNecklace', minTier: 3 }),
  A('sculptedGoldChoker', 'Sculpted Gold Choker', 'f', 280_000, false, { renderId: 'sculptedGoldChoker', minTier: 3 }),
  A('heirloomCoralSet', 'Heirloom Coral Necklace', 'both', 650_000, true, { renderId: 'heirloomCoralSet', minTier: 4 }),
  A('maisonHeirloomCoralNecklace', 'Maison Heirloom Coral Necklace', 'both', 1_200_000, true, { renderId: 'heirloomCoralSet', minTier: 5 }),
  A('empireHeirloomCoralNecklace', 'Empire Heirloom Coral Necklace', 'both', 1_950_000, true, { renderId: 'heirloomCoralSet', minTier: 6 }),
];

export const WRIST: AccessoryItem[] = [
  A('none', 'None', 'both', 0),
  A('watch', 'Gold Watch', 'both', 10000),
  A('bangles', 'Gold Bangles', 'f', 3500),
  A('coralBracelet', 'Coral Beads', 'both', 5000, true),
  A('cuff', 'Cuff', 'f', 3000),
  A('premiumAutomaticWatch', 'Premium Automatic Watch', 'both', 45_000, false, { renderId: 'premiumAutomaticWatch', minTier: 1 }),
  A('goldBangleStack', 'Gold Bangle Stack', 'f', 72_000, false, { renderId: 'goldBangleStack', minTier: 2 }),
  A('designerSteelChronograph', 'Designer Steel Chronograph', 'both', 185_000, false, { renderId: 'designerSteelChronograph', minTier: 3 }),
  A('diamondDialWatch', 'Diamond-Dial Watch', 'both', 780_000, false, { renderId: 'diamondDialWatch', minTier: 4 }),
  A('maisonDiamondChronograph', 'Maison Diamond-Dial Chronograph', 'both', 1_250_000, false, { renderId: 'diamondDialWatch', minTier: 5 }),
  A('empireDiamondChronograph', 'Empire Diamond-Dial Chronograph', 'both', 2_150_000, false, { renderId: 'diamondDialWatch', minTier: 6 }),
];

export const GLASSES: AccessoryItem[] = [
  A('none', 'None', 'both', 0),
  A('sunglasses', 'Classic Shades', 'both', 2500),
  A('catEye', 'Cat-Eye Shades', 'f', 3000),
  A('aviators', 'Aviators', 'both', 3000),
  A('oversized', 'Oversized Shades', 'f', 3500),
  A('clear', 'Clear Frames', 'both', 3000),
  A('acetateStatementFrames', 'Acetate Statement Frames', 'both', 32_000, false, { renderId: 'acetateStatementFrames', minTier: 1 }),
  A('titaniumDesignerFrames', 'Titanium Designer Frames', 'both', 96_000, false, { renderId: 'titaniumDesignerFrames', minTier: 2 }),
  A('goldTempleSunglasses', 'Gold-Temple Sunglasses', 'both', 165_000, false, { renderId: 'goldTempleSunglasses', minTier: 3 }),
  A('runwaySculptedShades', 'Runway Sculpted Shades', 'both', 420_000, false, { renderId: 'runwaySculptedShades', minTier: 3 }),
  A('heirloomGoldSunglasses', 'Heirloom Gold Sunglasses', 'both', 750_000, false, { renderId: 'heirloomGoldSunglasses', minTier: 4 }),
  A('maisonGoldSunglasses', 'Maison Heirloom Gold Sunglasses', 'both', 1_150_000, false, { renderId: 'heirloomGoldSunglasses', minTier: 5 }),
  A('empireGoldSunglasses', 'Empire Heirloom Gold Sunglasses', 'both', 1_900_000, false, { renderId: 'heirloomGoldSunglasses', minTier: 6 }),
];

export const forBody = <T extends { for: 'f' | 'm' | 'both' }>(list: T[], male: boolean) => list.filter((i) => i.for === 'both' || i.for === (male ? 'm' : 'f'));

// ---------------------------------------------------------------------------
// Defaults and the old single-outfit format
// ---------------------------------------------------------------------------
const G = (style: string, fabric: FabricId, color: string, color2: string, pattern = 0): Garment => ({ style, fabric, color, color2, pattern });

export const DEFAULT_WARDROBE: Record<BodyType, Wardrobe> = {
  femaleSlim: { top: G('camisole', 'plain', '#F6F1E8', '#F6F1E8'), bottom: G('pencilSkirt', 'plain', '#DED4C5', '#DED4C5') },
  femaleRegular: { top: G('camisole', 'plain', '#F6F1E8', '#F6F1E8'), bottom: G('pencilSkirt', 'plain', '#DED4C5', '#DED4C5') },
  femalePlus: { top: G('camisole', 'plain', '#E86A2E', '#E86A2E'), bottom: G('pencilSkirt', 'plain', '#2F5D3A', '#2F5D3A') },
  male: { top: G('shirt', 'plain', '#233246', '#233246'), bottom: G('trousers', 'plain', '#181B22', '#181B22') },
};

/** Convert the first build's single-cut outfits into wardrobe pieces. */
export function wardrobeFromOutfit(o: OutfitSpec): Wardrobe {
  const main = (style: string): Garment => ({ style, fabric: o.fabric, color: o.color, color2: o.color2, pattern: o.pattern });
  const plain = (style: string, c = o.color2): Garment => ({ style, fabric: 'plain', color: c, color2: c });
  const denim = (style: string): Garment => ({ style, fabric: 'denim', color: o.color2, color2: o.color2 });
  switch (o.cut) {
    case 'camiPencil': return { top: plain('camisole'), bottom: main('pencilSkirt') };
    case 'cropMini': return { top: plain('cropTop'), bottom: main('miniSkirt') };
    case 'miniGown': return { dress: main('bodyconMini') };
    case 'cropBaggyJeans': return { top: main('cropTop'), bottom: denim('baggyJeans') };
    case 'jumpsuit': return { dress: main('jumpsuit') };
    case 'corsetFlare': return { top: main('corsetTop'), bottom: main('aLineSkirt') };
    case 'mermaidGown': return { dress: main('mermaidGown') };
    case 'laceGown': return { dress: main('laceGown') };
    case 'iroBuba': return { top: main('buba'), bottom: main('iro') };
    case 'bubu': return { dress: main('bubu') };
    case 'shirtTrousers': return { top: main('shirt'), bottom: plain('trousers') };
    case 'teeJeans': return { top: main('tee'), bottom: denim('jeans') };
    case 'senator': return { dress: main('senator') };
    case 'agbada': return { dress: main('agbada') };
    default: return {};
  }
}

export const DEFAULT_ACCESSORIES: Record<'female' | 'male', Accessories> = {
  female: { headwear: 'none', beads: false, bag: 'none', shoes: 'heels', shoesColor: '#C9A163', glasses: 'none', watch: false, necklace: 'none', wrist: 'none' },
  male: { headwear: 'none', beads: false, bag: 'none', shoes: 'loafers', shoesColor: '#42281D', glasses: 'none', watch: false, necklace: 'none', wrist: 'none' },
};

/** Hair styles, wardrobe items and accessories that only fit one sex. */
export function fitsBody(id: string, body: BodyType): boolean {
  const male = isMaleBody(body);
  if (MALE_HAIR.some((h) => h.id === id)) return male;
  if (FEMALE_HAIR.some((h) => h.id === id)) return !male;
  const item = itemById(id);
  if (item) return item.for === (male ? 'm' : 'f');
  return true;
}

// Legacy lists kept for older code paths.
export const FEMALE_CUTS: Option<FemaleCut>[] = [];
export const MALE_CUTS: Option<MaleCut>[] = [];
export const DEFAULT_OUTFIT: Record<BodyType, OutfitSpec> = {
  femaleSlim: { cut: 'camiPencil', fabric: 'plain', color: '#DED4C5', color2: '#F6F1E8' },
  femaleRegular: { cut: 'camiPencil', fabric: 'plain', color: '#DED4C5', color2: '#F6F1E8' },
  femalePlus: { cut: 'camiPencil', fabric: 'plain', color: '#2F5D3A', color2: '#E86A2E' },
  male: { cut: 'shirtTrousers', fabric: 'plain', color: '#233246', color2: '#181B22' },
};
