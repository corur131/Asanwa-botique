import React from 'react';
import { Accessories, CameraView, CharacterConfig, OutfitSpec } from '../../types/character';
import { SKIN_TONES } from '../../constants/skinTones';
import { DEFAULT_ACCESSORIES, DEFAULT_OUTFIT, fitsBody } from '../../constants/catalog';
import { mix } from './color';
import { BODY_SPECS, HEAD_TRANSFORM } from './geometry';
import { Ears, Face, HeadDefs, HeadLook, IRIS, Neck, naturalLip } from './head';
import { HAIR_PALETTES, HairBack, HairDefs, HairFront, HairSide, dullPalette } from './hair';
import { HairMess } from './hair2';
import { Arms, BodyDefs, Feet, Hands, Legs, Torso } from './body';
import { ClothDefs, OutfitLayer } from './clothes';
import { Beads, Glasses, HandAccessories, Headwear, Shoes } from './accessories';

export interface RenderCharacterProps {
  config: CharacterConfig;
  idPrefix: string;
  camera?: CameraView;
  className?: string;
}

const VIEWBOX: Record<CameraView, string> = {
  full: '0 -30 600 1530',
  portrait: '195 36 210 252',
  bust: '120 24 360 440',
};
/** Tall looks (afro puff, high bun, gele) need extra headroom in the close-up cameras. */
const VIEWBOX_TALL: Record<CameraView, string> = {
  full: '0 -30 600 1530',
  portrait: '170 -20 260 300',
  bust: '100 -20 400 486',
};
const TALL = new Set(['afroPuff', 'highBun', 'highTopFade', 'afro', 'deepCurly']);

/**
 * Full-body character at divine.svg quality.
 * The head and hair are divine.svg's own paths, placed on the body with one transform.
 * Every gradient, clip path and pattern id starts with idPrefix, so any number of
 * characters can share a page without taking each other's colours.
 *
 * Layer order, back to front: glow, back hair, legs, feet, shoes, torso, neck, outfit (body
 * pieces), arms, outfit (sleeves and over-garments), hands, bag/watch, necklace, beads, face,
 * side hair, ears, front hair, plain-state mess, headwear, glasses.
 */
export const CharacterSvg: React.FC<RenderCharacterProps> = ({ config, idPrefix, camera = 'full', className = 'w-full h-auto' }) => {
  const id = (n: string) => `${idPrefix}-${n}`;
  const skin = SKIN_TONES[config.skinTone];
  const spec = BODY_SPECS[config.body] || BODY_SPECS.femaleRegular;
  const isMale = config.body === 'male';
  const isPlus = config.body === 'femalePlus';
  const isPlain = config.state === 'plain';
  const basePal = HAIR_PALETTES[config.hairColor] || HAIR_PALETTES.black;
  const pal = isPlain ? dullPalette(basePal) : basePal;

  // Men never wear makeup or (from a female config) jewellery. Plain customers wear none.
  const styled = !isPlain && !isMale;
  const mk = config.makeup;
  const iris = IRIS[config.eyes.irisColor] || IRIS.darkBrown;
  const look: HeadLook = {
    skin,
    isMale,
    isPlus,
    isPlain,
    blush: styled && mk.blush,
    blushColor: mk.blushColor || skin.blushDefault,
    liner: styled && mk.liner ? mk.linerStyle || 'wing' : 'none',
    lashes: styled ? mk.lashes : 'natural',
    lipColor: styled ? mk.lipColor : naturalLip(skin, isMale),
    lipLook: styled ? mk.lipFinish || 'gloss' : 'natural',
    eyeshadow: styled && mk.eyeshadow && mk.eyeshadow !== 'none' ? mk.eyeshadow : null,
    highlighter: styled && !!mk.highlighter,
    contour: styled && !!mk.contour,
    browStyle: styled ? mk.browStyle || 'natural' : 'natural',
    irisInner: iris.inner,
    irisOuter: iris.outer,
    browColor: config.hairColor === 'honeyBlonde' || config.hairColor === 'platinum' || config.hairColor === 'ginger' ? mix(basePal.mid, '#2A170E', 0.55) : mix(basePal.darkShadow, '#2A170E', 0.5),
    facialHair: isMale ? config.maleOnly.facialHair : 'none',
    beardColor: mix(basePal.base, '#120905', 0.3),
  };
  const earrings = styled ? config.earrings : 'none';
  const necklace = styled && config.necklace;

  // Outfit: a cut that does not fit this body falls back to the body's default.
  const fallback = DEFAULT_OUTFIT[config.body] || DEFAULT_OUTFIT.femaleRegular;
  let outfit: OutfitSpec = config.outfit || {
    ...fallback,
    ...(config.outfitColor ? { color: config.outfitColor.bottom, color2: config.outfitColor.top } : {}),
  };
  if (!fitsBody(outfit.cut, config.body)) outfit = { ...fallback, color: outfit.color, color2: outfit.color2, fabric: outfit.fabric, pattern: outfit.pattern };
  const accDefault = DEFAULT_ACCESSORIES[isMale ? 'male' : 'female'];
  const acc: Accessories = {
    ...accDefault,
    ...(config.outfitColor ? { shoesColor: config.outfitColor.shoes } : {}),
    ...(config.accessories || {}),
  };
  if (isMale && (acc.shoes === 'heels' || acc.shoes === 'sandals' || acc.shoes === 'flats')) acc.shoes = 'loafers';
  if (isMale && (acc.headwear === 'gele' || acc.headwear === 'headwrap')) acc.headwear = 'none';
  if (!isMale && acc.headwear === 'fila') acc.headwear = 'none';
  if (isPlain) {
    acc.bag = 'none';
    acc.glasses = 'none';
    acc.watch = false;
    acc.beads = false;
    acc.headwear = 'none';
  }
  if (isMale) acc.bag = acc.bag === 'tote' ? 'tote' : 'none';

  // Hair is tucked away under a gele or head wrap.
  const hairHidden = acc.headwear === 'gele' || acc.headwear === 'headwrap';
  const widen = isPlus ? 'translate(300 0) scale(1.06 1) translate(-300 0)' : undefined;
  const hairProps = { id, config, pal, skin, plain: isPlain, widen };
  const hideLeftEar = !hairHidden && (config.hair === 'longBraids' || config.hair === 'boneStraight' || config.hair === 'bodyWave');
  const hideRightEar = !hairHidden && (config.hair === 'boneStraight' || config.hair === 'bodyWave');
  const tall = TALL.has(config.hair) || acc.headwear === 'gele';

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={(tall ? VIEWBOX_TALL : VIEWBOX)[camera]} className={className} preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id={id('glow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF6EE" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#F2D6D4" stopOpacity="0.2" />
          <stop offset="1" stopColor="#F2D6D4" stopOpacity="0" />
        </radialGradient>
        <HeadDefs id={id} look={look} config={config} />
        <HairDefs id={id} pal={pal} />
        <BodyDefs id={id} skin={skin} spec={spec} />
        <ClothDefs id={id} />
        <clipPath id={id('hideLeftEar')}>
          <rect x={hideLeftEar ? 201 : 0} y="0" width="600" height="800" />
        </clipPath>
      </defs>

      <ellipse cx="300" cy="190" rx="230" ry="230" fill={`url(#${id('glow')})`} />

      {!hairHidden && (
        <g transform={HEAD_TRANSFORM}>
          <HairBack {...hairProps} />
        </g>
      )}

      <Legs id={id} skin={skin} spec={spec} />
      <Feet id={id} skin={skin} spec={spec} />
      <Shoes spec={spec} acc={acc} plain={isPlain} skin={skin} />
      <Torso id={id} skin={skin} spec={spec} />
      <g transform={HEAD_TRANSFORM}>
        <Neck id={id} look={look} />
      </g>

      <OutfitLayer id={id} spec={spec} outfit={outfit} plain={isPlain} layer="under" />
      <Arms id={id} skin={skin} spec={spec} />
      <OutfitLayer id={id} spec={spec} outfit={outfit} plain={isPlain} layer="over" />
      <Hands id={id} skin={skin} spec={spec} nails={styled ? mk.lipColor : undefined} />
      <HandAccessories spec={spec} acc={acc} />

      <g transform={HEAD_TRANSFORM}>
        {necklace && (
          <g transform={isPlus ? 'translate(300 0) scale(1.08 1) translate(-300 0)' : undefined}>
            <path d="M 268 524 C 276 578 290 602 300 606 C 310 602 324 578 332 524" fill="none" stroke={`url(#${id('gold')})`} strokeWidth="2" />
            <path d="M 268 524 C 276 578 290 602 300 606 C 310 602 324 578 332 524" fill="none" stroke="#FFF4C8" strokeWidth="0.7" strokeDasharray="2 3" opacity="0.9" />
            <circle cx="300" cy="612" r="5" fill={`url(#${id('gold')})`} />
            <circle cx="298.5" cy="610.5" r="1.6" fill="#FFF8DC" />
          </g>
        )}
        {acc.beads && <Beads id={id} />}
        <Face id={id} look={look} config={config} />
        {!hairHidden && <HairSide {...hairProps} />}
        {!(hideLeftEar && hideRightEar) && (
          <g clipPath={hideLeftEar ? `url(#${id('hideLeftEar')})` : undefined}>
            <Ears id={id} look={look} earrings={earrings} />
          </g>
        )}
        {!hairHidden && <HairFront {...hairProps} />}
        {isPlain && !hairHidden && (
          <g transform={widen}>
            <HairMess p={hairProps} />
          </g>
        )}
        <Headwear id={id} acc={acc} plain={isPlain} />
        {acc.glasses !== 'none' && <Glasses kind={acc.glasses} />}
      </g>
    </svg>
  );
};

export function renderCharacter(config: CharacterConfig, idPrefix: string): React.ReactElement {
  return <CharacterSvg config={config} idPrefix={idPrefix} />;
}
