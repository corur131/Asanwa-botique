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
 * Prices are starting placeholders in naira; the economy simulation tunes them later.
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
}

const W = (id: string, label: string, slot: Slot, group: string, native: boolean, occasions: Occasion[], cls: Class, price: number, fabric: FabricId, forWho: 'f' | 'm' = 'f'): WardrobeItem => ({
  id, label, slot, group, native, occasions, cls, price, fabric, for: forWho,
});

export const WARDROBE: WardrobeItem[] = [
  // ---- women's tops ----
  W('camisole', 'Camisole', 'top', 'Tops', false, ['dateNight', 'office', 'brunch'], 'middle', 6000, 'satin'),
  W('cropTop', 'Crop Top', 'top', 'Tops', false, ['casual', 'birthday', 'party'], 'poor', 4000, 'plain'),
  W('tubeTop', 'Tube Top', 'top', 'Tops', false, ['party', 'birthday', 'casual'], 'poor', 3500, 'plain'),
  W('corsetTop', 'Corset Top', 'top', 'Tops', false, ['party', 'birthday', 'dateNight'], 'middle', 15000, 'satin'),
  W('offShoulderTop', 'Off-Shoulder Top', 'top', 'Tops', false, ['brunch', 'dateNight', 'casual'], 'middle', 8000, 'plain'),
  W('halterTop', 'Halter Top', 'top', 'Tops', false, ['party', 'birthday', 'dateNight'], 'middle', 7000, 'satin'),
  W('tshirt', 'T-Shirt', 'top', 'Tops', false, ['casual'], 'poor', 3000, 'plain'),
  W('cropTee', 'Crop Tee', 'top', 'Tops', false, ['casual', 'birthday'], 'poor', 3500, 'plain'),
  W('blouse', 'Button Blouse', 'top', 'Tops', false, ['office', 'church'], 'middle', 9000, 'chiffon'),
  W('peplumTop', 'Peplum Top', 'top', 'Tops', false, ['office', 'church', 'owambe'], 'middle', 10000, 'ankara'),
  W('wrapTop', 'Wrap Top', 'top', 'Tops', false, ['office', 'brunch', 'dateNight'], 'middle', 9000, 'satin'),
  W('buba', 'Buba', 'top', 'Native Tops', true, ['owambe', 'church', 'wedding'], 'poor', 8000, 'ankara'),
  W('laceBlouse', 'Lace Blouse', 'top', 'Native Tops', true, ['owambe', 'wedding', 'church'], 'middle', 25000, 'lace'),
  W('offShoulderBuba', 'Off-Shoulder Buba', 'top', 'Native Tops', true, ['owambe', 'wedding', 'party'], 'middle', 18000, 'lace'),
  // ---- women's bottoms ----
  W('pencilSkirt', 'Pencil Skirt', 'bottom', 'Skirts', false, ['office', 'dateNight', 'church'], 'middle', 7000, 'plain'),
  W('miniSkirt', 'Mini Skirt', 'bottom', 'Skirts', false, ['party', 'birthday', 'casual'], 'poor', 5000, 'denim'),
  W('aLineSkirt', 'A-Line Skirt', 'bottom', 'Skirts', false, ['church', 'office', 'brunch'], 'poor', 6000, 'plain'),
  W('pleatedMidi', 'Pleated Midi Skirt', 'bottom', 'Skirts', false, ['church', 'brunch', 'office'], 'middle', 9000, 'satin'),
  W('maxiSkirt', 'Maxi Skirt', 'bottom', 'Skirts', false, ['church', 'casual', 'brunch'], 'poor', 7000, 'chiffon'),
  W('iro', 'Iro (Wrapper)', 'bottom', 'Native Wrappers', true, ['owambe', 'church', 'wedding'], 'poor', 9000, 'ankara'),
  W('georgeWrapper', 'George Wrapper', 'bottom', 'Native Wrappers', true, ['wedding', 'owambe', 'church'], 'rich', 45000, 'george'),
  W('skinnyJeans', 'Skinny Jeans', 'bottom', 'Trousers', false, ['casual', 'dateNight'], 'poor', 8000, 'denim'),
  W('baggyJeans', 'Baggy Jeans', 'bottom', 'Trousers', false, ['casual', 'birthday'], 'poor', 9000, 'denim'),
  W('wideLegTrousers', 'Wide-Leg Trousers', 'bottom', 'Trousers', false, ['office', 'brunch', 'church'], 'middle', 10000, 'plain'),
  W('cargoPants', 'Cargo Pants', 'bottom', 'Trousers', false, ['casual', 'birthday'], 'poor', 9000, 'plain'),
  W('shorts', 'Shorts', 'bottom', 'Trousers', false, ['casual'], 'poor', 4000, 'denim'),
  W('straightTrousers', 'Tailored Trousers', 'bottom', 'Trousers', false, ['office', 'church'], 'middle', 9000, 'plain'),
  // ---- women's dresses & gowns ----
  W('bodyconMini', 'Bodycon Mini Gown', 'dress', 'Dresses', false, ['party', 'birthday', 'dateNight'], 'poor', 9000, 'plain'),
  W('slipDress', 'Slip Dress', 'dress', 'Dresses', false, ['dateNight', 'party', 'brunch'], 'middle', 12000, 'satin'),
  W('wrapDress', 'Wrap Dress', 'dress', 'Dresses', false, ['office', 'brunch', 'church'], 'middle', 14000, 'plain'),
  W('shirtDress', 'Shirt Dress', 'dress', 'Dresses', false, ['office', 'casual', 'church'], 'middle', 12000, 'plain'),
  W('tubeMidi', 'Tube Midi Dress', 'dress', 'Dresses', false, ['party', 'birthday', 'dateNight'], 'middle', 13000, 'satin'),
  W('maxiDress', 'Maxi Dress', 'dress', 'Dresses', false, ['brunch', 'church', 'casual'], 'poor', 10000, 'chiffon'),
  W('fitFlare', 'Ankara Flare Dress', 'dress', 'Native Gowns', true, ['church', 'owambe', 'office'], 'poor', 12000, 'ankara'),
  W('mermaidGown', 'Mermaid Gown', 'dress', 'Native Gowns', true, ['owambe', 'wedding'], 'middle', 30000, 'ankara'),
  W('laceGown', 'Aso-ebi Lace Gown', 'dress', 'Native Gowns', true, ['wedding', 'owambe'], 'rich', 80000, 'lace'),
  W('bubu', 'Bubu Kaftan', 'dress', 'Native Gowns', true, ['church', 'casual', 'owambe'], 'poor', 15000, 'ankara'),
  W('adireMaxi', 'Adire Maxi Gown', 'dress', 'Native Gowns', true, ['casual', 'church', 'brunch'], 'middle', 20000, 'adire'),
  W('corsetGown', 'Corset Gown', 'dress', 'Evening Gowns', false, ['redCarpet', 'party', 'wedding'], 'rich', 90000, 'satin'),
  W('ballGown', 'Ball Gown', 'dress', 'Evening Gowns', false, ['redCarpet', 'wedding'], 'rich', 150000, 'satin'),
  W('offShoulderGown', 'Off-Shoulder Gown', 'dress', 'Evening Gowns', false, ['redCarpet', 'wedding', 'party'], 'rich', 85000, 'velvet'),
  W('slitGown', 'High-Slit Gown', 'dress', 'Evening Gowns', false, ['redCarpet', 'party'], 'rich', 95000, 'sequin'),
  W('jumpsuit', 'Jumpsuit', 'dress', 'Jumpsuits', false, ['brunch', 'dateNight', 'office'], 'middle', 15000, 'satin'),
  W('playsuit', 'Playsuit', 'dress', 'Jumpsuits', false, ['casual', 'birthday', 'brunch'], 'poor', 9000, 'plain'),
  // ---- women's outerwear ----
  W('blazer', 'Blazer', 'outer', 'Outerwear', false, ['office', 'church', 'brunch'], 'middle', 18000, 'plain'),
  W('cropBlazer', 'Cropped Blazer', 'outer', 'Outerwear', false, ['party', 'brunch', 'dateNight'], 'middle', 16000, 'plain'),
  W('denimJacket', 'Denim Jacket', 'outer', 'Outerwear', false, ['casual', 'birthday'], 'poor', 12000, 'denim'),
  W('leatherJacket', 'Leather Jacket', 'outer', 'Outerwear', false, ['casual', 'party', 'dateNight'], 'middle', 25000, 'leather'),
  W('kimono', 'Kimono', 'outer', 'Outerwear', false, ['brunch', 'casual'], 'poor', 8000, 'chiffon'),
  W('trenchCoat', 'Trench Coat', 'outer', 'Outerwear', false, ['office', 'casual'], 'rich', 45000, 'plain'),
  W('laceShrug', 'Lace Shrug', 'outer', 'Outerwear', true, ['owambe', 'wedding', 'church'], 'middle', 12000, 'lace'),
  // ---- men's tops ----
  W('shirt', 'Shirt', 'top', 'Tops', false, ['office', 'church', 'dateNight'], 'middle', 8000, 'plain', 'm'),
  W('tee', 'T-Shirt', 'top', 'Tops', false, ['casual'], 'poor', 3000, 'plain', 'm'),
  W('polo', 'Polo', 'top', 'Tops', false, ['casual', 'office', 'brunch'], 'poor', 5000, 'plain', 'm'),
  W('hoodie', 'Hoodie', 'top', 'Tops', false, ['casual'], 'middle', 12000, 'plain', 'm'),
  W('dashiki', 'Dashiki', 'top', 'Native Tops', true, ['casual', 'owambe', 'church'], 'poor', 7000, 'ankara', 'm'),
  W('mensBuba', 'Buba', 'top', 'Native Tops', true, ['owambe', 'church', 'wedding'], 'poor', 9000, 'asoOke', 'm'),
  // ---- men's bottoms ----
  W('trousers', 'Trousers', 'bottom', 'Bottoms', false, ['office', 'church', 'dateNight'], 'middle', 8000, 'plain', 'm'),
  W('jeans', 'Jeans', 'bottom', 'Bottoms', false, ['casual', 'dateNight'], 'poor', 8000, 'denim', 'm'),
  W('chinos', 'Chinos', 'bottom', 'Bottoms', false, ['casual', 'brunch', 'office'], 'poor', 7000, 'plain', 'm'),
  W('mensCargo', 'Cargo Pants', 'bottom', 'Bottoms', false, ['casual'], 'poor', 8000, 'plain', 'm'),
  W('mensShorts', 'Shorts', 'bottom', 'Bottoms', false, ['casual'], 'poor', 4000, 'plain', 'm'),
  W('sokoto', 'Sokoto', 'bottom', 'Native Bottoms', true, ['owambe', 'church', 'wedding'], 'poor', 6000, 'asoOke', 'm'),
  // ---- men's native long sets ----
  W('senator', 'Senator Kaftan', 'dress', 'Native Sets', true, ['church', 'owambe', 'office'], 'middle', 25000, 'plain', 'm'),
  W('kaftan', 'Long Kaftan', 'dress', 'Native Sets', true, ['church', 'casual', 'owambe'], 'middle', 22000, 'plain', 'm'),
  W('agbada', 'Agbada', 'dress', 'Native Sets', true, ['wedding', 'owambe'], 'rich', 120000, 'asoOke', 'm'),
  // ---- men's outerwear ----
  W('mensBlazer', 'Blazer', 'outer', 'Outerwear', false, ['office', 'church', 'wedding'], 'middle', 25000, 'plain', 'm'),
  W('mensDenimJacket', 'Denim Jacket', 'outer', 'Outerwear', false, ['casual'], 'poor', 12000, 'denim', 'm'),
  W('mensLeatherJacket', 'Leather Jacket', 'outer', 'Outerwear', false, ['casual', 'party'], 'middle', 30000, 'leather', 'm'),
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
}
const A = (id: string, label: string, forWho: 'f' | 'm' | 'both', price: number, native = false): AccessoryItem => ({ id, label, for: forWho, price, native });

export const SHOES: AccessoryItem[] = [
  A('heels', 'Stiletto Pumps', 'f', 12000),
  A('blockHeels', 'Block Heels', 'f', 10000),
  A('platforms', 'Platform Heels', 'f', 15000),
  A('sandals', 'Strappy Sandals', 'f', 9000),
  A('mules', 'Mules', 'f', 8000),
  A('flats', 'Ballet Flats', 'f', 6000),
  A('slides', 'Slides', 'both', 4000),
  A('sneakers', 'Sneakers', 'both', 15000),
  A('ankleBoots', 'Ankle Boots', 'f', 18000),
  A('kneeBoots', 'Knee Boots', 'f', 25000),
  A('loafers', 'Loafers', 'm', 15000),
  A('oxfords', 'Oxfords', 'm', 18000),
  A('palmSlippers', 'Palm Slippers', 'm', 8000, true),
  A('mensBoots', 'Chelsea Boots', 'm', 22000),
];

export const BAGS: AccessoryItem[] = [
  A('none', 'None', 'both', 0),
  A('clutch', 'Clutch', 'f', 8000),
  A('miniBag', 'Mini Bag', 'f', 12000),
  A('shoulderBag', 'Shoulder Bag', 'f', 15000),
  A('crossbody', 'Crossbody', 'both', 10000),
  A('tote', 'Tote', 'f', 12000),
  A('bucketBag', 'Bucket Bag', 'f', 14000),
  A('backpack', 'Backpack', 'both', 12000),
  A('beadedBag', 'Beaded Bag', 'f', 20000, true),
];

export const HEADWEAR: AccessoryItem[] = [
  A('none', 'None', 'both', 0),
  A('gele', 'Gele (Fan)', 'f', 15000, true),
  A('geleWrap', 'Gele (Wrap)', 'f', 12000, true),
  A('headwrap', 'Head Wrap', 'f', 5000, true),
  A('beret', 'Beret', 'both', 6000),
  A('cap', 'Baseball Cap', 'both', 4000),
  A('bucketHat', 'Bucket Hat', 'both', 5000),
  A('fascinator', 'Fascinator', 'f', 18000),
  A('fila', 'Fila Cap', 'm', 6000, true),
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
  A('chain', 'Fine Chain', 'both', 8000),
  A('pendant', 'Pendant', 'f', 10000),
  A('pearls', 'Pearls', 'f', 15000),
  A('choker', 'Choker', 'f', 6000),
  A('layered', 'Layered Chains', 'f', 14000),
  A('coral', 'Coral Beads (Iyun)', 'both', 40000, true),
  A('cuban', 'Cuban Link', 'm', 20000),
];

export const WRIST: AccessoryItem[] = [
  A('none', 'None', 'both', 0),
  A('watch', 'Gold Watch', 'both', 20000),
  A('bangles', 'Gold Bangles', 'f', 10000),
  A('coralBracelet', 'Coral Beads', 'both', 15000, true),
  A('cuff', 'Cuff', 'f', 9000),
];

export const GLASSES: AccessoryItem[] = [
  A('none', 'None', 'both', 0),
  A('sunglasses', 'Classic Shades', 'both', 7000),
  A('catEye', 'Cat-Eye Shades', 'f', 9000),
  A('aviators', 'Aviators', 'both', 9000),
  A('oversized', 'Oversized Shades', 'f', 10000),
  A('clear', 'Clear Frames', 'both', 8000),
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
