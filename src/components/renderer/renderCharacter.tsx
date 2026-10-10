import React from 'react';
import { CharacterConfig, CameraView } from '../../types/character';
import { SKIN_TONES } from '../../constants/skinTones';
import { BODY_GEOMETRIES } from './paths/bodyPaths';
import {
  getFaceOutline,
  getEyeGeometry,
  getBrowGeometry,
  getNoseGeometry,
  getLipGeometry,
  getFacialHairPaths,
} from './paths/facePaths';
import { HAIR_PALETTES, getHairRenderData } from './paths/hairPaths';
import { getOutfitGeometries } from './paths/outfitPaths';

export interface RenderCharacterProps {
  config: CharacterConfig;
  idPrefix: string;
  camera?: CameraView;
  className?: string;
}

/**
 * High-fidelity vector character renderer for Boutique Character Lab.
 * Conforms strictly to the layer hierarchy and quality bar of divine.svg.
 * All dynamic IDs are prefixed with `idPrefix` to ensure zero color collision in lineups.
 */
export const CharacterSvg: React.FC<RenderCharacterProps> = ({
  config,
  idPrefix,
  camera = 'full',
  className = 'w-full h-auto',
}) => {
  const skin = SKIN_TONES[config.skinTone];
  const bodyGeo = BODY_GEOMETRIES[config.body];
  const hairPalette = HAIR_PALETTES[config.hairColor];
  const isPlain = config.state === 'plain';
  const isMale = config.body === 'male';

  // Makeup states based on plain vs styled
  const effectiveMakeup = {
    blush: isPlain ? false : config.makeup.blush,
    liner: isPlain ? false : config.makeup.liner,
    lashes: isPlain ? ('natural' as const) : config.makeup.lashes,
    lipColor: isPlain ? skin.lipDefault : config.makeup.lipColor,
  };

  // Facial features geometry
  const faceOutline = getFaceOutline(config.faceShape, config.body);
  const eyeGeo = getEyeGeometry(config.eyes.shape, effectiveMakeup);
  const browGeo = getBrowGeometry(config.brows, isMale);
  const noseGeo = getNoseGeometry(config.nose);
  const lipGeo = getLipGeometry(config.lips.shape);
  const facialHair = getFacialHairPaths(isMale ? config.maleOnly.facialHair : 'none');

  // Hair and outfit geometry
  const hairData = getHairRenderData(config.hair, isPlain);
  const outfitGeo = getOutfitGeometries(config.body, config.state);

  // Outfit colors (plain state desaturates / fades clothing)
  const defaultTop = isMale ? '#233246' : '#f6f1e8';
  const defaultBottom = isMale ? '#181b22' : '#ded4c5';
  const defaultShoes = isMale ? '#42281d' : '#c9a163';

  const outfitTopColor = isPlain
    ? '#828489'
    : (config.outfitColor?.top || defaultTop);
  const outfitBottomColor = isPlain
    ? '#606268'
    : (config.outfitColor?.bottom || defaultBottom);
  const outfitShoesColor = isPlain
    ? '#494a4f'
    : (config.outfitColor?.shoes || defaultShoes);

  // Iris palette lookup
  const irisGradients: Record<string, { inner: string; outer: string }> = {
    darkBrown: { inner: '#683518', outer: '#271107' },
    warmAmber: { inner: '#c27d2c', outer: '#422108' },
    hazelGreen: { inner: '#69823c', outer: '#272d13' },
    espressoBlack: { inner: '#2d1e18', outer: '#0f0907' },
    honeyBronze: { inner: '#b87e35', outer: '#4c290d' },
  };
  const activeIris = irisGradients[config.eyes.irisColor] || irisGradients.darkBrown;

  // ViewBox according to camera zoom
  // Full body: 0 0 600 1500
  // Portrait (face/head close-up): 160 60 280 320
  // Bust (torso/jewellery/neckline): 120 70 360 480
  let viewBox = '0 0 600 1500';
  if (camera === 'portrait') {
    viewBox = '160 65 280 325';
  } else if (camera === 'bust') {
    viewBox = '120 75 360 490';
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* ClipPath for face shading clipped strictly inside the face outline */}
        <clipPath id={`${idPrefix}-face-clip`}>
          <path d={faceOutline} />
        </clipPath>

        {/* ClipPath for eyes sclera to keep iris strictly inside */}
        <clipPath id={`${idPrefix}-left-eye-clip`}>
          <path d={eyeGeo.leftSclera} />
        </clipPath>
        <clipPath id={`${idPrefix}-right-eye-clip`}>
          <path d={eyeGeo.rightSclera} />
        </clipPath>

        {/* Background glow radial gradient (divine.svg signature warm rose glow) */}
        <radialGradient id={`${idPrefix}-bg-glow`} cx="50%" cy="20%" r="55%">
          <stop offset="0%" stopColor="#fee4ec" stopOpacity="0.85" />
          <stop offset="45%" stopColor="#f8d4df" stopOpacity="0.45" />
          <stop offset="85%" stopColor="#eed0dc" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#eed0dc" stopOpacity="0" />
        </radialGradient>

        {/* Skin radial gradient for luminous glowing face & body */}
        <radialGradient id={`${idPrefix}-skin-face`} cx="50%" cy="38%" r="50%">
          <stop offset="0%" stopColor={skin.highlight} />
          <stop offset="35%" stopColor={skin.base} />
          <stop offset="80%" stopColor={skin.mid} />
          <stop offset="100%" stopColor={skin.shadow} />
        </radialGradient>

        {/* Skin body linear gradient */}
        <linearGradient id={`${idPrefix}-skin-body`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={skin.base} />
          <stop offset="40%" stopColor={skin.mid} />
          <stop offset="85%" stopColor={skin.shadow} />
          <stop offset="100%" stopColor={skin.contour} />
        </linearGradient>

        {/* Neck skin shading gradient */}
        <linearGradient id={`${idPrefix}-skin-neck`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={skin.shadow} />
          <stop offset="30%" stopColor={skin.mid} />
          <stop offset="75%" stopColor={skin.base} />
          <stop offset="100%" stopColor={skin.mid} />
        </linearGradient>

        {/* Hair solid mass linear/radial gradient */}
        <linearGradient id={`${idPrefix}-hair-grad`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={hairPalette.base} />
          <stop offset="50%" stopColor={hairPalette.mid} />
          <stop offset="100%" stopColor={hairPalette.darkShadow} />
        </linearGradient>

        {/* Sclera top shadow gradient */}
        <linearGradient id={`${idPrefix}-sclera-grad`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#dfd5cf" />
          <stop offset="30%" stopColor="#f5ece6" />
          <stop offset="100%" stopColor="#fdfaf8" />
        </linearGradient>

        {/* Iris radial gradient with rich glowing core */}
        <radialGradient id={`${idPrefix}-iris-grad`} cx="42%" cy="40%" r="55%">
          <stop offset="0%" stopColor={activeIris.inner} />
          <stop offset="65%" stopColor={activeIris.outer} />
          <stop offset="100%" stopColor="#080403" />
        </radialGradient>

        {/* Lips top and bottom separate gradients */}
        <linearGradient id={`${idPrefix}-lip-top`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={effectiveMakeup.lipColor} />
          <stop offset="100%" stopColor="#4a151d" />
        </linearGradient>
        <linearGradient id={`${idPrefix}-lip-bottom`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4a151d" />
          <stop offset="45%" stopColor={effectiveMakeup.lipColor} />
          <stop offset="100%" stopColor="#eed0d5" />
        </linearGradient>

        {/* Gold jewellery gradients */}
        <linearGradient id={`${idPrefix}-gold-chain`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#d49a1d" />
          <stop offset="50%" stopColor="#ffea9f" />
          <stop offset="100%" stopColor="#a3710a" />
        </linearGradient>
        <radialGradient id={`${idPrefix}-gold-bead`} cx="38%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#fffcee" />
          <stop offset="30%" stopColor="#fed360" />
          <stop offset="70%" stopColor="#c78e12" />
          <stop offset="100%" stopColor="#754b03" />
        </radialGradient>
      </defs>

      {/* ------------------------------------------------------------- */}
      {/* 1. BACKGROUND GLOW */}
      {/* ------------------------------------------------------------- */}
      <circle
        cx="300"
        cy="310"
        r="280"
        fill={`url(#${idPrefix}-bg-glow)`}
        filter="url(#global-blur-glow)"
      />

      {/* ------------------------------------------------------------- */}
      {/* 2. BACK HAIR */}
      {/* ------------------------------------------------------------- */}
      {hairData.backHairPath && (
        <path
          d={hairData.backHairPath}
          fill={`url(#${idPrefix}-hair-grad)`}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. BODY (Torso, Arms, Hands, Legs, Feet) */}
      {/* ------------------------------------------------------------- */}
      <g id={`${idPrefix}-body-layer`}>
        {/* Legs */}
        <path d={bodyGeo.legs} fill={`url(#${idPrefix}-skin-body)`} />
        {/* Feet */}
        <path d={bodyGeo.leftFoot} fill={skin.mid} />
        <path d={bodyGeo.rightFoot} fill={skin.mid} />

        {/* Torso */}
        <path d={bodyGeo.torso} fill={`url(#${idPrefix}-skin-body)`} />

        {/* Arms */}
        <path d={bodyGeo.leftArm} fill={`url(#${idPrefix}-skin-body)`} />
        <path d={bodyGeo.rightArm} fill={`url(#${idPrefix}-skin-body)`} />

        {/* Hands */}
        <path d={bodyGeo.leftHand} fill={skin.mid} />
        <path d={bodyGeo.rightHand} fill={skin.mid} />

        {/* Clavicle & chest contour shading */}
        <path
          d={bodyGeo.clavicles}
          stroke={skin.contour}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
          filter="url(#global-blur-xs)"
        />
        <path
          d={bodyGeo.clavicles}
          stroke={skin.highlight}
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
          transform="translate(0, 1.5)"
        />

        {/* Bust or male pectorals contour */}
        {bodyGeo.bustContour && (
          <path
            d={bodyGeo.bustContour}
            stroke={skin.shadow}
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.38"
            filter="url(#global-blur-sm)"
          />
        )}
        {bodyGeo.maleChestContour && (
          <path
            d={bodyGeo.maleChestContour}
            stroke={skin.contour}
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
            opacity="0.4"
            filter="url(#global-blur-sm)"
          />
        )}
      </g>

      {/* ------------------------------------------------------------- */}
      {/* 4. NECK */}
      {/* ------------------------------------------------------------- */}
      <g id={`${idPrefix}-neck-layer`}>
        <path d={bodyGeo.neck} fill={`url(#${idPrefix}-skin-neck)`} />
        {/* Sternocleidomastoid muscle soft shadows */}
        <path
          d="M 276 320 Q 284 355 292 390"
          stroke={skin.shadow}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.35"
          filter="url(#global-blur-xs)"
        />
        <path
          d="M 324 320 Q 316 355 308 390"
          stroke={skin.shadow}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.35"
          filter="url(#global-blur-xs)"
        />
        {/* Male Adam's apple */}
        {isMale && (
          <path
            d="M 296 345 Q 300 352 304 345"
            stroke={skin.contour}
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />
        )}
      </g>

      {/* ------------------------------------------------------------- */}
      {/* 5. OUTFIT (Top, Bottom, Shoes - fitted with zero gaps) */}
      {/* ------------------------------------------------------------- */}
      <g id={`${idPrefix}-outfit-layer`}>
        {/* Shoes */}
        <path d={outfitGeo.shoesLeft} fill={outfitShoesColor} />
        <path d={outfitGeo.shoesRight} fill={outfitShoesColor} />

        {/* Bottom (Skirt / Trousers) */}
        <path d={outfitGeo.bottom} fill={outfitBottomColor} />
        <path
          d={outfitGeo.bottomWaistband}
          fill="none"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="2"
        />

        {/* Top (Camisole / Shirt) */}
        <path d={outfitGeo.top} fill={outfitTopColor} />
        {outfitGeo.collar && (
          <path
            d={outfitGeo.collar}
            fill={outfitTopColor}
            stroke="rgba(0,0,0,0.18)"
            strokeWidth="1.5"
          />
        )}

        {/* Shirt buttons for male */}
        {outfitGeo.shirtButtons?.map((btn, i) => (
          <circle
            key={i}
            cx={btn.x}
            cy={btn.y}
            r="3"
            fill="#e2ded4"
            stroke="#5c5a54"
            strokeWidth="0.8"
          />
        ))}

        {/* Plain state relaxed fabric creases */}
        {outfitGeo.wrinkles?.map((w, i) => (
          <path
            key={i}
            d={w}
            stroke="rgba(0,0,0,0.22)"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </g>

      {/* ------------------------------------------------------------- */}
      {/* 6. NECKLACE (Matches divine.svg signature gold drop pendant) */}
      {/* ------------------------------------------------------------- */}
      {config.necklace && !isPlain && (
        <g id={`${idPrefix}-necklace-layer`}>
          {/* Gold chain drape */}
          <path
            d="M 268 370 Q 300 460 332 370"
            stroke={`url(#${idPrefix}-gold-chain)`}
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
          {/* Fine gold links sparkle */}
          <path
            d="M 272 385 Q 300 458 328 385"
            stroke="#ffffff"
            strokeWidth="0.8"
            strokeDasharray="2,3"
            fill="none"
            opacity="0.75"
          />
          {/* Spherical gold pendant drop bead */}
          <circle
            cx="300"
            cy="450"
            r="6.5"
            fill={`url(#${idPrefix}-gold-bead)`}
          />
          {/* Specular reflection ping */}
          <circle
            cx="298"
            cy="448"
            r="1.8"
            fill="#ffffff"
            opacity="0.95"
          />
        </g>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. FACE BASE */}
      {/* ------------------------------------------------------------- */}
      <path
        id={`${idPrefix}-face-base`}
        d={faceOutline}
        fill={`url(#${idPrefix}-skin-face)`}
      />

      {/* ------------------------------------------------------------- */}
      {/* 8. FACE SHADING (Clipped inside face) */}
      {/* ------------------------------------------------------------- */}
      <g clipPath={`url(#${idPrefix}-face-clip)`} id={`${idPrefix}-face-shading`}>
        {/* Forehead gentle top shadow */}
        <ellipse
          cx="300"
          cy="135"
          rx="75"
          ry="30"
          fill={skin.mid}
          opacity="0.4"
          filter="url(#global-blur-lg)"
        />

        {/* Forehead center radiant highlight */}
        <ellipse
          cx="300"
          cy="165"
          rx="45"
          ry="25"
          fill={skin.highlight}
          opacity="0.65"
          filter="url(#global-blur-md)"
        />

        {/* Left cheekbone contour */}
        <path
          d="M 230 220 C 224 250 240 280 260 295"
          stroke={skin.contour}
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
          opacity="0.45"
          filter="url(#global-blur-md)"
        />

        {/* Right cheekbone contour */}
        <path
          d="M 370 220 C 376 250 360 280 340 295"
          stroke={skin.contour}
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
          opacity="0.45"
          filter="url(#global-blur-md)"
        />

        {/* Jawline soft contour */}
        <path
          d="M 238 295 C 265 330 300 334 300 334 C 300 334 335 330 362 295"
          stroke={skin.shadow}
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          opacity="0.4"
          filter="url(#global-blur-md)"
        />

        {/* Chin soft radial highlight */}
        <circle
          cx="300"
          cy="312"
          r="16"
          fill={skin.highlight}
          opacity="0.75"
          filter="url(#global-blur-md)"
        />

        {/* Cheek blush (soft rosy warmth, divine.svg signature!) */}
        {effectiveMakeup.blush && (
          <>
            <ellipse
              cx="255"
              cy="248"
              rx="24"
              ry="16"
              fill={skin.blushDefault}
              opacity="0.5"
              filter="url(#global-blur-blush)"
            />
            <ellipse
              cx="345"
              cy="248"
              rx="24"
              ry="16"
              fill={skin.blushDefault}
              opacity="0.5"
              filter="url(#global-blur-blush)"
            />
          </>
        )}

        {/* Male stubble / beard within face outline */}
        {facialHair.stubblePaths.map((p, i) => (
          <path
            key={i}
            d={p}
            stroke={hairPalette.darkShadow}
            strokeWidth="1.2"
            opacity="0.5"
          />
        ))}
      </g>

      {/* Male full beard on top of chin */}
      {facialHair.beardOutline && (
        <g id={`${idPrefix}-full-beard`}>
          <path
            d={facialHair.beardOutline}
            fill={hairPalette.base}
            opacity="0.95"
          />
          {facialHair.hairs.map((h, i) => (
            <path
              key={i}
              d={h}
              stroke={hairPalette.strandHighlight}
              strokeWidth="0.9"
              fill="none"
              opacity="0.6"
            />
          ))}
        </g>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 9. EYES AND BROWS */}
      {/* ------------------------------------------------------------- */}
      <g id={`${idPrefix}-eyes-brows`}>
        {/* Eyebrows */}
        {/* Brow base wash */}
        <path d={browGeo.leftBase} fill={hairPalette.darkShadow} opacity="0.6" />
        <path d={browGeo.rightBase} fill={hairPalette.darkShadow} opacity="0.6" />
        {/* Fine individual brow hair strokes */}
        {browGeo.hairs.map((hair, i) => (
          <path
            key={i}
            d={hair}
            stroke={hairPalette.darkShadow}
            strokeWidth={isMale ? '1.4' : '1.1'}
            strokeLinecap="round"
            fill="none"
            opacity="0.85"
          />
        ))}

        {/* Eye Lid Creases with soft shadow */}
        <path
          d={eyeGeo.leftCrease}
          stroke={skin.contour}
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />
        <path
          d={eyeGeo.rightCrease}
          stroke={skin.contour}
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />

        {/* Sclera (Whites of the eyes) */}
        <path d={eyeGeo.leftSclera} fill={`url(#${idPrefix}-sclera-grad)`} />
        <path d={eyeGeo.rightSclera} fill={`url(#${idPrefix}-sclera-grad)`} />

        {/* Left Iris & Pupil (Clipped to left eye) */}
        <g clipPath={`url(#${idPrefix}-left-eye-clip)`}>
          <circle
            cx={eyeGeo.leftCenter.x}
            cy={eyeGeo.leftCenter.y}
            r="11.5"
            fill={`url(#${idPrefix}-iris-grad)`}
          />
          {/* Pupil */}
          <circle
            cx={eyeGeo.leftCenter.x}
            cy={eyeGeo.leftCenter.y}
            r="5.5"
            fill="#090504"
          />
          {/* TWO Catchlights (divine.svg requirement) */}
          {/* Primary crisp white catchlight */}
          <circle
            cx={eyeGeo.leftCenter.x + 3.8}
            cy={eyeGeo.leftCenter.y - 3.8}
            r="2.8"
            fill="#ffffff"
          />
          {/* Secondary softer catchlight */}
          <circle
            cx={eyeGeo.leftCenter.x - 3.2}
            cy={eyeGeo.leftCenter.y + 3.2}
            r="1.4"
            fill="#ffffff"
            opacity="0.65"
          />
        </g>

        {/* Right Iris & Pupil (Clipped to right eye) */}
        <g clipPath={`url(#${idPrefix}-right-eye-clip)`}>
          <circle
            cx={eyeGeo.rightCenter.x}
            cy={eyeGeo.rightCenter.y}
            r="11.5"
            fill={`url(#${idPrefix}-iris-grad)`}
          />
          {/* Pupil */}
          <circle
            cx={eyeGeo.rightCenter.x}
            cy={eyeGeo.rightCenter.y}
            r="5.5"
            fill="#090504"
          />
          {/* TWO Catchlights */}
          <circle
            cx={eyeGeo.rightCenter.x + 3.8}
            cy={eyeGeo.rightCenter.y - 3.8}
            r="2.8"
            fill="#ffffff"
          />
          <circle
            cx={eyeGeo.rightCenter.x - 3.2}
            cy={eyeGeo.rightCenter.y + 3.2}
            r="1.4"
            fill="#ffffff"
            opacity="0.65"
          />
        </g>

        {/* Eyeliner & Wings */}
        <path
          d={eyeGeo.leftUpperLid}
          stroke="#120a07"
          strokeWidth={effectiveMakeup.liner ? '3.2' : '2'}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={eyeGeo.rightUpperLid}
          stroke="#120a07"
          strokeWidth={effectiveMakeup.liner ? '3.2' : '2'}
          strokeLinecap="round"
          fill="none"
        />
        {effectiveMakeup.liner && (
          <>
            <path
              d={eyeGeo.leftWing}
              stroke="#120a07"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d={eyeGeo.rightWing}
              stroke="#120a07"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
          </>
        )}

        {/* Individual Lashes */}
        {eyeGeo.lashes.map((lash, i) => (
          <path
            key={i}
            d={lash.path}
            stroke="#120a07"
            strokeWidth={lash.isUpper ? (effectiveMakeup.lashes === 'full' ? '1.5' : '1.1') : '0.8'}
            strokeLinecap="round"
            fill="none"
            opacity={lash.isUpper ? 0.95 : 0.6}
          />
        ))}
      </g>

      {/* ------------------------------------------------------------- */}
      {/* 10. NOSE */}
      {/* ------------------------------------------------------------- */}
      <g id={`${idPrefix}-nose-layer`}>
        {/* Shaded bridge contour lines */}
        <path
          d={noseGeo.leftBridge}
          stroke={skin.contour}
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.45"
          filter="url(#global-blur-xs)"
        />
        <path
          d={noseGeo.rightBridge}
          stroke={skin.contour}
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.45"
          filter="url(#global-blur-xs)"
        />

        {/* Rounded nose tip highlight */}
        <circle
          cx={noseGeo.tipHighlight.x}
          cy={noseGeo.tipHighlight.y}
          r={noseGeo.tipHighlight.r}
          fill={skin.highlight}
          opacity="0.8"
          filter="url(#global-blur-xs)"
        />

        {/* Tip contour curve */}
        <path
          d={noseGeo.tipContour}
          stroke={skin.shadow}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />

        {/* Nostril wings */}
        <path
          d={noseGeo.leftNostrilWing}
          stroke={skin.shadow}
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.75"
        />
        <path
          d={noseGeo.rightNostrilWing}
          stroke={skin.shadow}
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.75"
        />

        {/* Nostril holes */}
        <path d={noseGeo.leftNostrilHole} fill="#1d0a06" opacity="0.85" />
        <path d={noseGeo.rightNostrilHole} fill="#1d0a06" opacity="0.85" />

        {/* Septum line */}
        <path
          d={noseGeo.septumLine}
          stroke={skin.shadow}
          strokeWidth="1.4"
          fill="none"
          opacity="0.4"
        />
      </g>

      {/* ------------------------------------------------------------- */}
      {/* 11. LIPS */}
      {/* ------------------------------------------------------------- */}
      <g id={`${idPrefix}-lips-layer`}>
        {/* Upper lip */}
        <path d={lipGeo.upperLip} fill={`url(#${idPrefix}-lip-top)`} />
        {/* Lower lip */}
        <path d={lipGeo.lowerLip} fill={`url(#${idPrefix}-lip-bottom)`} />

        {/* Lip line separating top and bottom */}
        <path
          d={lipGeo.lipLine}
          stroke="#3d0f17"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />

        {/* Corner shadows / commissures */}
        <circle cx={lipGeo.cornerLeft.x} cy={lipGeo.cornerLeft.y} r="1.6" fill="#2b0a10" />
        <circle cx={lipGeo.cornerRight.x} cy={lipGeo.cornerRight.y} r="1.6" fill="#2b0a10" />

        {/* Gloss Highlights (Styled state only) */}
        {!isPlain && (
          <>
            {/* Pillowy lower lip gloss reflection */}
            <path
              d={lipGeo.glossHighlightLower}
              fill="#ffffff"
              opacity="0.65"
              filter="url(#global-blur-xs)"
            />
            {/* Cupid's bow specular dots */}
            {lipGeo.cupidHighlights.map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r="1.4"
                fill="#ffffff"
                opacity="0.7"
              />
            ))}
          </>
        )}
      </g>

      {/* ------------------------------------------------------------- */}
      {/* 12. SIDE BRAIDS (Flowing over front of shoulders like divine.svg) */}
      {/* ------------------------------------------------------------- */}
      {hairData.sideBraidsLeft && (
        <g id={`${idPrefix}-side-braids-left`}>
          <path
            d={hairData.sideBraidsLeft.ribbon}
            fill={`url(#${idPrefix}-hair-grad)`}
          />
          {/* Braided plait lines */}
          {hairData.sideBraidsLeft.plaits.map((plait, i) => (
            <path
              key={i}
              d={plait}
              stroke={hairPalette.darkShadow}
              strokeWidth="2.2"
              fill="none"
              opacity="0.8"
            />
          ))}
          {/* Braided strand highlights */}
          {hairData.sideBraidsLeft.strands.map((s, i) => (
            <path
              key={i}
              d={s}
              stroke={hairPalette.strandHighlight}
              strokeWidth="1.4"
              fill="none"
              opacity="0.7"
            />
          ))}
        </g>
      )}

      {hairData.sideBraidsRight && (
        <g id={`${idPrefix}-side-braids-right`}>
          <path
            d={hairData.sideBraidsRight.ribbon}
            fill={`url(#${idPrefix}-hair-grad)`}
          />
          {hairData.sideBraidsRight.plaits.map((plait, i) => (
            <path
              key={i}
              d={plait}
              stroke={hairPalette.darkShadow}
              strokeWidth="2.2"
              fill="none"
              opacity="0.8"
            />
          ))}
          {hairData.sideBraidsRight.strands.map((s, i) => (
            <path
              key={i}
              d={s}
              stroke={hairPalette.strandHighlight}
              strokeWidth="1.4"
              fill="none"
              opacity="0.7"
            />
          ))}
        </g>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 13. EAR AND EARRINGS */}
      {/* ------------------------------------------------------------- */}
      <g id={`${idPrefix}-ears-layer`}>
        {/* Left ear */}
        <path
          d="M 224 220 C 214 235 214 260 226 272"
          stroke={skin.mid}
          strokeWidth="4"
          fill={skin.base}
        />
        {/* Right ear */}
        <path
          d="M 376 220 C 386 235 386 260 374 272"
          stroke={skin.mid}
          strokeWidth="4"
          fill={skin.base}
        />

        {/* Earrings (styled state only) */}
        {!isPlain && config.earrings === 'goldStuds' && (
          <g id={`${idPrefix}-earrings-studs`}>
            {/* Left stud */}
            <circle cx="224" cy="268" r="4.5" fill={`url(#${idPrefix}-gold-bead)`} />
            <circle cx="222.5" cy="266.5" r="1.3" fill="#ffffff" opacity="0.9" />
            {/* Right stud (signature divine.svg gold stud) */}
            <circle cx="376" cy="268" r="4.5" fill={`url(#${idPrefix}-gold-bead)`} />
            <circle cx="374.5" cy="266.5" r="1.3" fill="#ffffff" opacity="0.9" />
          </g>
        )}

        {!isPlain && config.earrings === 'goldHoops' && (
          <g id={`${idPrefix}-earrings-hoops`}>
            {/* Left hoop */}
            <circle
              cx="220"
              cy="278"
              r="12"
              stroke={`url(#${idPrefix}-gold-chain)`}
              strokeWidth="2.8"
              fill="none"
            />
            {/* Right hoop */}
            <circle
              cx="380"
              cy="278"
              r="12"
              stroke={`url(#${idPrefix}-gold-chain)`}
              strokeWidth="2.8"
              fill="none"
            />
          </g>
        )}
      </g>

      {/* ------------------------------------------------------------- */}
      {/* 14. FRONT HAIR */}
      {/* ------------------------------------------------------------- */}
      <g id={`${idPrefix}-front-hair-layer`}>
        {/* Front hair mass */}
        <path
          d={hairData.frontHairPath}
          fill={`url(#${idPrefix}-hair-grad)`}
        />

        {/* Fine procedural strand lines */}
        {hairData.strands.map((strand, i) => (
          <path
            key={i}
            d={strand}
            stroke={hairPalette.strandHighlight}
            strokeWidth="1.2"
            fill="none"
            opacity="0.65"
          />
        ))}

        {/* Male wave ripples */}
        {hairData.wavesLines?.map((wave, i) => (
          <path
            key={i}
            d={wave}
            stroke={hairPalette.strandHighlight}
            strokeWidth="2.4"
            fill="none"
            opacity="0.75"
          />
        ))}

        {/* Male dread locs */}
        {hairData.dreadLocs?.map((loc, i) => (
          <g key={i}>
            <path
              d={loc.path}
              stroke={hairPalette.darkShadow}
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d={loc.path}
              stroke={hairPalette.mid}
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            {loc.highlights.map((h, hi) => (
              <path
                key={hi}
                d={h}
                stroke={hairPalette.strandHighlight}
                strokeWidth="1.5"
                fill="none"
                opacity="0.7"
              />
            ))}
          </g>
        ))}

        {/* Swirling baby hairs / laid edges (divine.svg signature swirl on right temple) */}
        {hairData.babyHairs?.map((edge, i) => (
          <path
            key={i}
            d={edge}
            stroke={hairPalette.darkShadow}
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
            opacity="0.9"
          />
        ))}

        {/* Plain state frizzy flyaway hairs */}
        {hairData.flyaways?.map((frizz, i) => (
          <path
            key={i}
            d={frizz}
            stroke={hairPalette.strandHighlight}
            strokeWidth="0.9"
            fill="none"
            opacity="0.5"
          />
        ))}
      </g>
    </svg>
  );
};

/**
 * Functional string renderer or JSX helper export
 */
export function renderCharacter(config: CharacterConfig, idPrefix: string): React.ReactElement {
  return <CharacterSvg config={config} idPrefix={idPrefix} />;
}
