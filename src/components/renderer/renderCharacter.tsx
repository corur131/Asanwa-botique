import React from 'react';
import { CameraView, CharacterConfig } from '../../types/character';
import { SKIN_TONES } from '../../constants/skinTones';
import { mix } from './color';
import { BODY_SPECS, HEAD_TRANSFORM } from './geometry';
import { Ears, Face, HeadDefs, HeadLook, IRIS, Neck } from './head';
import { HAIR_PALETTES, HairBack, HairDefs, HairFront, HairSide } from './hair';
import {
  Arms,
  BodyDefs,
  Feet,
  FemaleBottom,
  FemaleShoes,
  FemaleTop,
  Hands,
  Legs,
  MaleBottom,
  MaleShoes,
  MaleSleeves,
  MaleTop,
  OutfitColors,
  Torso,
} from './body';

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
/** Tall styles (the afro puff) need extra headroom in the close-up cameras. */
const VIEWBOX_TALL: Record<CameraView, string> = {
  full: '0 -30 600 1530',
  portrait: '180 -14 240 288',
  bust: '110 -14 380 466',
};

/**
 * Full-body character at divine.svg quality.
 * The head and hair are divine.svg's own paths (see head.tsx, hair.tsx), placed on the body
 * with one transform. Every gradient, clip path and pattern id starts with idPrefix, so any
 * number of characters can share a page without taking each other's colours.
 *
 * Layer order, back to front: glow, back hair, legs, feet, torso, neck, shoes, bottoms, top,
 * arms, hands, sleeves, necklace, face, side hair, ears + earrings, front hair.
 */
export const CharacterSvg: React.FC<RenderCharacterProps> = ({
  config,
  idPrefix,
  camera = 'full',
  className = 'w-full h-auto',
}) => {
  const id = (n: string) => `${idPrefix}-${n}`;
  const skin = SKIN_TONES[config.skinTone];
  const spec = BODY_SPECS[config.body];
  const pal = HAIR_PALETTES[config.hairColor];
  const isMale = config.body === 'male';
  const isPlus = config.body === 'femalePlus';
  const isPlain = config.state === 'plain';

  // Men never pick up makeup or jewellery from a female config; plain state drops all styling.
  const styled = !isPlain && !isMale;
  const iris = IRIS[config.eyes.irisColor] || IRIS.darkBrown;
  const look: HeadLook = {
    skin,
    isMale,
    isPlus,
    isPlain,
    blush: styled && config.makeup.blush,
    liner: styled && config.makeup.liner,
    fullLashes: styled && config.makeup.lashes === 'full',
    lipColor: styled ? config.makeup.lipColor : skin.lipDefault,
    gloss: styled,
    irisInner: iris.inner,
    irisOuter: iris.outer,
    browColor: config.hairColor === 'honeyBlonde' ? mix(pal.mid, '#2A170E', 0.55) : mix(pal.darkShadow, '#2A170E', 0.5),
    facialHair: isMale ? config.maleOnly.facialHair : 'none',
    beardColor: mix(pal.base, '#120905', 0.3),
  };
  const earrings = styled ? config.earrings : 'none';
  const necklace = styled && config.necklace;

  const colors: OutfitColors = isPlain
    ? { top: isMale ? '#7E8085' : '#8A8780', bottom: isMale ? '#5E6066' : '#6C6A66', shoes: '#4A4A4E' }
    : {
        top: config.outfitColor?.top || (isMale ? '#233246' : '#F6F1E8'),
        bottom: config.outfitColor?.bottom || (isMale ? '#181B22' : '#DED4C5'),
        shoes: config.outfitColor?.shoes || (isMale ? '#42281D' : '#C9A163'),
      };

  const widen = isPlus ? 'translate(300 0) scale(1.06 1) translate(-300 0)' : undefined;
  const hairProps = { id, config, pal, skin, plain: isPlain, widen };
  const hideLeftEar = config.hair === 'longBraids' || config.hair === 'boneStraight';
  const hideRightEar = config.hair === 'boneStraight';

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={(config.hair === 'afroPuff' ? VIEWBOX_TALL : VIEWBOX)[camera]} className={className} preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id={id('glow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF6EE" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#F2D6D4" stopOpacity="0.2" />
          <stop offset="1" stopColor="#F2D6D4" stopOpacity="0" />
        </radialGradient>
        <HeadDefs id={id} look={look} config={config} />
        <HairDefs id={id} pal={pal} />
        <BodyDefs id={id} skin={skin} spec={spec} />
        <clipPath id={id('hideLeftEar')}>
          <rect x={hideLeftEar ? 201 : 0} y="0" width="600" height="800" />
        </clipPath>
      </defs>

      {/* 1. background glow */}
      <ellipse cx="300" cy="190" rx="230" ry="230" fill={`url(#${id('glow')})`} />

      {/* 2. back hair */}
      <g transform={HEAD_TRANSFORM}>
        <HairBack {...hairProps} />
      </g>

      {/* 3-5. body */}
      <Legs id={id} skin={skin} spec={spec} />
      <Feet id={id} skin={skin} spec={spec} />
      <Torso id={id} skin={skin} spec={spec} />
      <g transform={HEAD_TRANSFORM}>
        <Neck id={id} look={look} />
      </g>

      {/* 6. outfit (body parts), then arms and hands, then sleeves */}
      {isMale ? <MaleShoes spec={spec} colors={colors} /> : <FemaleShoes spec={spec} colors={colors} plain={isPlain} />}
      {isMale ? <MaleBottom id={id} spec={spec} colors={colors} plain={isPlain} /> : <FemaleBottom id={id} spec={spec} colors={colors} plain={isPlain} />}
      {isMale ? <MaleTop id={id} spec={spec} colors={colors} plain={isPlain} /> : <FemaleTop id={id} spec={spec} colors={colors} plain={isPlain} />}
      <Arms id={id} skin={skin} spec={spec} />
      <Hands id={id} skin={skin} spec={spec} nails={styled ? config.makeup.lipColor : undefined} />
      {isMale && <MaleSleeves id={id} spec={spec} colors={colors} plain={isPlain} />}

      {/* 7. head */}
      <g transform={HEAD_TRANSFORM}>
        {necklace && (
          <g transform={isPlus ? 'translate(300 0) scale(1.08 1) translate(-300 0)' : undefined}>
            <path d="M 268 524 C 276 578 290 602 300 606 C 310 602 324 578 332 524" fill="none" stroke={`url(#${id('gold')})`} strokeWidth="2" />
            <path d="M 268 524 C 276 578 290 602 300 606 C 310 602 324 578 332 524" fill="none" stroke="#FFF4C8" strokeWidth="0.7" strokeDasharray="2 3" opacity="0.9" />
            <circle cx="300" cy="612" r="5" fill={`url(#${id('gold')})`} />
            <circle cx="298.5" cy="610.5" r="1.6" fill="#FFF8DC" />
          </g>
        )}
        <Face id={id} look={look} config={config} />
        <HairSide {...hairProps} />
        {!(hideLeftEar && hideRightEar) && (
          <g clipPath={hideLeftEar ? `url(#${id('hideLeftEar')})` : undefined}>
            <Ears id={id} look={look} earrings={earrings} />
          </g>
        )}
        <HairFront {...hairProps} />
      </g>
    </svg>
  );
};

export function renderCharacter(config: CharacterConfig, idPrefix: string): React.ReactElement {
  return <CharacterSvg config={config} idPrefix={idPrefix} />;
}
