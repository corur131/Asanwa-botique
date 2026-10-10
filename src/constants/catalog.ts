import {
  Accessories,
  BodyType,
  BrowStyle,
  EarringStyle,
  FabricId,
  FacialHairPreset,
  FemaleCut,
  FemaleHairStyle,
  GlassesStyle,
  HairColorId,
  HeadwearStyle,
  LashStyle,
  LinerStyle,
  LipFinish,
  MaleCut,
  MaleHairStyle,
  OutfitSpec,
  ShoeStyle,
  BagStyle,
} from '../types/character';

/**
 * Every option the character builder offers, with its label.
 * One list feeds the controls panel, the randomiser and (later) the shop.
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

export const FEMALE_HAIR: Option<FemaleHairStyle>[] = [
  { id: 'longBraids', label: 'Sleek Waves + Braids', note: "Divine's look" },
  { id: 'knotlessBraids', label: 'Knotless Braids' },
  { id: 'boxBraidBob', label: 'Box Braid Bob' },
  { id: 'fulaniBraids', label: 'Fulani Braids' },
  { id: 'fauxLocs', label: 'Faux Locs' },
  { id: 'cornrows', label: 'Cornrows' },
  { id: 'bantuKnots', label: 'Bantu Knots' },
  { id: 'boneStraight', label: 'Bone Straight' },
  { id: 'bodyWave', label: 'Body Wave' },
  { id: 'deepCurly', label: 'Deep Curly' },
  { id: 'afroPuff', label: 'Afro Puff' },
  { id: 'highBun', label: 'High Bun' },
  { id: 'sleekPonytail', label: 'Sleek Ponytail' },
  { id: 'pixie', label: 'Pixie Cut' },
  { id: 'shortNatural', label: 'Short Natural (TWA)' },
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

// ---- makeup ---------------------------------------------------------------
export const LIP_SHADES = [
  { name: 'Nude', color: '#B9705F' },
  { name: 'Caramel', color: '#9D583B' },
  { name: 'Brown', color: '#6E3328' },
  { name: 'Coral', color: '#D9604F' },
  { name: 'Pink', color: '#D6667F' },
  { name: 'Berry', color: '#A8405A' },
  { name: 'Red', color: '#C2262E' },
  { name: 'Wine', color: '#7A1C2E' },
  { name: 'Plum', color: '#6A2A4A' },
  { name: 'Cocoa', color: '#4A221E' },
];

export const EYESHADOWS = [
  { name: 'None', color: 'none' },
  { name: 'Nude', color: '#B98266' },
  { name: 'Gold', color: '#D4A23A' },
  { name: 'Bronze', color: '#9A5A2A' },
  { name: 'Rose', color: '#C46A78' },
  { name: 'Plum', color: '#6E2F5A' },
  { name: 'Smoky', color: '#2E2420' },
  { name: 'Emerald', color: '#1F7A5A' },
  { name: 'Royal Blue', color: '#2846A8' },
];

export const BLUSH_SHADES = [
  { name: 'Peach', color: '#E88A6E' },
  { name: 'Rose', color: '#D9667A' },
  { name: 'Berry', color: '#A8405A' },
  { name: 'Terracotta', color: '#B8553A' },
];

export const LINERS: Option<LinerStyle | 'none'>[] = [
  { id: 'none', label: 'None' },
  { id: 'thin', label: 'Thin' },
  { id: 'wing', label: 'Wing' },
  { id: 'bold', label: 'Bold Cat' },
];

export const LASHES: Option<LashStyle>[] = [
  { id: 'natural', label: 'Natural' },
  { id: 'full', label: 'Full' },
  { id: 'dramatic', label: 'Dramatic' },
];

export const LIP_FINISHES: Option<LipFinish>[] = [
  { id: 'gloss', label: 'Gloss' },
  { id: 'satin', label: 'Satin' },
  { id: 'matte', label: 'Matte' },
];

export const BROW_STYLES: Option<BrowStyle>[] = [
  { id: 'natural', label: 'Natural' },
  { id: 'defined', label: 'Defined' },
  { id: 'laminated', label: 'Laminated' },
];

// ---- clothes ---------------------------------------------------------------
export const FEMALE_CUTS: Option<FemaleCut>[] = [
  { id: 'camiPencil', label: 'Cami & Pencil Skirt', note: 'office · date night' },
  { id: 'cropMini', label: 'Crop Top & Mini Skirt', note: 'Gen Z · birthday' },
  { id: 'miniGown', label: 'Mini Gown', note: 'Gen Z · party' },
  { id: 'cropBaggyJeans', label: 'Crop Top & Baggy Jeans', note: 'Gen Z · casual' },
  { id: 'jumpsuit', label: 'Jumpsuit', note: 'brunch · date night' },
  { id: 'corsetFlare', label: 'Corset & Flare Skirt', note: 'party · birthday' },
  { id: 'mermaidGown', label: 'Mermaid Gown', note: 'owambe · wedding' },
  { id: 'laceGown', label: 'Aso-ebi Lace Gown', note: 'wedding · owambe' },
  { id: 'iroBuba', label: 'Iro & Buba', note: 'owambe · church' },
  { id: 'bubu', label: 'Bubu Kaftan', note: 'church · casual' },
];

export const MALE_CUTS: Option<MaleCut>[] = [
  { id: 'shirtTrousers', label: 'Shirt & Trousers', note: 'office · church' },
  { id: 'teeJeans', label: 'T-shirt & Jeans', note: 'casual' },
  { id: 'senator', label: 'Senator Kaftan', note: 'church · owambe' },
  { id: 'agbada', label: 'Agbada', note: 'wedding · owambe' },
];

export const FABRICS: Option<FabricId>[] = [
  { id: 'plain', label: 'Plain Cotton' },
  { id: 'ankara', label: 'Ankara' },
  { id: 'lace', label: 'Lace' },
  { id: 'asoOke', label: 'Aso-oke' },
  { id: 'satin', label: 'Satin' },
  { id: 'sequin', label: 'Sequins' },
  { id: 'denim', label: 'Denim' },
];

export const ANKARA_PRINTS = [
  'Rings',
  'Diamonds',
  'Waves',
  'Leaves',
  'Chevron',
  'Squares',
  'Sunburst',
  'Shells',
  'Dots',
  'Swirls',
];

export const FABRIC_COLORS = [
  '#F6F1E8', '#E9D8B8', '#C9A163', '#E3B23C', '#E86A2E', '#C2262E', '#8E1F3A', '#E46A9A',
  '#7A3A8C', '#2846A8', '#1F6FB2', '#1F7A5A', '#2F5D3A', '#6B8E23', '#5A3A28', '#1E1E24',
];

export const HEADWEAR: Option<HeadwearStyle>[] = [
  { id: 'none', label: 'None' },
  { id: 'gele', label: 'Gele' },
  { id: 'headwrap', label: 'Head Wrap' },
  { id: 'fila', label: 'Fila Cap' },
];

export const SHOES: Option<ShoeStyle>[] = [
  { id: 'heels', label: 'Heels' },
  { id: 'sandals', label: 'Strappy Sandals' },
  { id: 'flats', label: 'Flats' },
  { id: 'sneakers', label: 'Sneakers' },
  { id: 'loafers', label: 'Loafers' },
];

export const BAGS: Option<BagStyle>[] = [
  { id: 'none', label: 'None' },
  { id: 'clutch', label: 'Clutch' },
  { id: 'tote', label: 'Tote' },
];

export const GLASSES: Option<GlassesStyle>[] = [
  { id: 'none', label: 'None' },
  { id: 'sunglasses', label: 'Sunglasses' },
  { id: 'clear', label: 'Clear Frames' },
];

export const EARRINGS: Option<EarringStyle>[] = [
  { id: 'none', label: 'None' },
  { id: 'goldStuds', label: 'Gold Studs' },
  { id: 'goldHoops', label: 'Gold Hoops' },
  { id: 'goldDrops', label: 'Gold Drops' },
  { id: 'pearls', label: 'Pearls' },
];

export const DEFAULT_OUTFIT: Record<BodyType, OutfitSpec> = {
  femaleSlim: { cut: 'camiPencil', fabric: 'plain', color: '#F6F1E8', color2: '#DED4C5' },
  femaleRegular: { cut: 'camiPencil', fabric: 'plain', color: '#F6F1E8', color2: '#DED4C5' },
  femalePlus: { cut: 'camiPencil', fabric: 'plain', color: '#E86A2E', color2: '#2F5D3A' },
  male: { cut: 'shirtTrousers', fabric: 'plain', color: '#233246', color2: '#181B22' },
};

export const DEFAULT_ACCESSORIES: Record<'female' | 'male', Accessories> = {
  female: { headwear: 'none', beads: false, bag: 'none', shoes: 'heels', shoesColor: '#C9A163', glasses: 'none', watch: false },
  male: { headwear: 'none', beads: false, bag: 'none', shoes: 'loafers', shoesColor: '#42281D', glasses: 'none', watch: false },
};

/** Cuts and styles that only make sense for one sex; used when switching bodies. */
export function fitsBody(cutOrHair: string, body: BodyType): boolean {
  const male = isMaleBody(body);
  const maleIds = new Set<string>([...MALE_CUTS.map((c) => c.id), ...MALE_HAIR.map((h) => h.id)]);
  return male ? maleIds.has(cutOrHair) : !maleIds.has(cutOrHair);
}
