import React from 'react';
import { CharacterConfig, SkinPalette } from '../../types/character';
import { darken, lighten, mix } from './color';

/**
 * The head, ported path-for-path from divine.svg.
 * Everything here is drawn in divine.svg's own coordinate space (600 x 800, chin at y 488);
 * renderCharacter places it on the body with one transform.
 * Presets only nudge the reference paths (scale/rotate around each feature's centre),
 * so every variation keeps the reference's detail and shading.
 */

export interface HeadLook {
  skin: SkinPalette;
  isMale: boolean;
  isPlus: boolean;
  isPlain: boolean;
  blush: boolean;
  liner: boolean;
  fullLashes: boolean;
  lipColor: string;
  gloss: boolean;
  irisInner: string;
  irisOuter: string;
  browColor: string;
  facialHair: 'none' | 'stubble' | 'fullBeard';
  beardColor: string;
}

export const IRIS: Record<string, { inner: string; outer: string }> = {
  darkBrown: { inner: '#3E1F0F', outer: '#7A4A22' },
  warmAmber: { inner: '#5A2E0E', outer: '#B07A2E' },
  hazelGreen: { inner: '#3A3416', outer: '#7C8240' },
  espressoBlack: { inner: '#1E0F08', outer: '#4A2A16' },
  honeyBronze: { inner: '#4E2A0E', outer: '#A87038' },
};

// ---------------------------------------------------------------------------
// Face outlines (reference oval + nudged variants)
// ---------------------------------------------------------------------------
const FACE_OVAL =
  'M 300 206 C 362 206 403 252 404 322 C 405 376 392 420 366 450 C 345 474 322 487 300 488 C 278 487 255 474 234 450 C 208 420 195 376 196 322 C 197 252 238 206 300 206 Z';
const FACE_HEART =
  'M 300 206 C 364 206 405 252 405 320 C 405 372 389 414 362 446 C 341 471 321 485 300 487 C 279 485 259 471 238 446 C 211 414 195 372 195 320 C 195 252 236 206 300 206 Z';
const FACE_SQUARE =
  'M 300 206 C 364 206 406 252 407 322 C 408 380 400 424 378 452 C 356 478 326 488 300 489 C 274 488 244 478 222 452 C 200 424 192 380 193 322 C 194 252 236 206 300 206 Z';
const FACE_MALE =
  'M 300 204 C 366 204 408 252 409 322 C 410 386 403 430 384 458 C 362 484 330 494 300 494 C 270 494 238 484 216 458 C 197 430 190 386 191 322 C 192 252 234 204 300 204 Z';

export function faceOutline(config: CharacterConfig): string {
  if (config.body === 'male') return FACE_MALE;
  if (config.faceShape === 'heart') return FACE_HEART;
  if (config.faceShape === 'square') return FACE_SQUARE;
  return FACE_OVAL;
}

/** Plus-size faces are drawn a little fuller (wider cheeks and jaw). */
export const plusFaceTransform = 'translate(300 0) scale(1.06 1) translate(-300 0)';

// ---------------------------------------------------------------------------
// Feature transforms
// ---------------------------------------------------------------------------
const around = (cx: number, cy: number, t: string) =>
  `translate(${cx} ${cy}) ${t} translate(${-cx} ${-cy})`;

function eyeTransform(shape: string, side: 'L' | 'R', isMale: boolean): string {
  const cx = side === 'L' ? 250.5 : 349.5;
  const cy = 333;
  const parts: string[] = [];
  if (shape === 'upturned') parts.push(`rotate(${side === 'L' ? 7 : -7})`);
  if (shape === 'doe') parts.push('scale(1.02 1.2)');
  if (shape === 'hooded') parts.push('scale(1.02 0.86)');
  if (isMale) parts.push('scale(0.98 0.9)');
  return parts.length ? around(cx, cy, parts.join(' ')) : '';
}

function browTransform(preset: string, side: 'L' | 'R', isMale: boolean): string {
  const cx = side === 'L' ? 251 : 349;
  const cy = 302;
  const parts: string[] = [];
  if (preset === 'softNatural') parts.push('translate(0 2) scale(1 0.8)');
  if (preset === 'straightDefined') parts.push('translate(0 3) scale(1.02 0.72)');
  if (isMale) parts.push('translate(0 4) scale(1.06 1.3)');
  return parts.length ? around(cx, cy, parts.join(' ')) : '';
}

function noseTransform(preset: string, isMale: boolean): string {
  const parts: string[] = [];
  if (preset === 'button') parts.push('scale(0.88)');
  if (preset === 'broadAfrican') parts.push('scale(1.3 1.05)');
  if (preset === 'softRegal') parts.push('scale(1.1 1.1)');
  if (isMale) parts.push('scale(1.14 1.08)');
  return parts.length ? around(300, 404, parts.join(' ')) : '';
}

function lipTransform(preset: string, isMale: boolean): string {
  const parts: string[] = [];
  if (preset === 'fullPout') parts.push('scale(1 1.12)');
  if (preset === 'widePillowy') parts.push('scale(1.14 1.12)');
  if (preset === 'subtleSoft') parts.push('scale(0.94 0.86)');
  if (isMale) parts.push('scale(1.04 0.84)');
  return parts.length ? around(300, 442, parts.join(' ')) : '';
}

// ---------------------------------------------------------------------------
// Defs
// ---------------------------------------------------------------------------
export const HeadDefs: React.FC<{ id: (n: string) => string; look: HeadLook; config: CharacterConfig }> = ({
  id,
  look,
  config,
}) => {
  const s = look.skin;
  const L = look.lipColor;
  return (
    <>
      <radialGradient id={id('skin')} cx="0.5" cy="0.4" r="0.7">
        <stop offset="0" stopColor={s.highlight} />
        <stop offset="0.6" stopColor={s.base} />
        <stop offset="1" stopColor={s.shadow} />
      </radialGradient>
      <linearGradient id={id('neckG')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={mix(s.shadow, s.contour, 0.4)} />
        <stop offset="0.35" stopColor={s.mid} />
        <stop offset="1" stopColor={s.base} />
      </linearGradient>
      <radialGradient id={id('blush')} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor={s.blushDefault} stopOpacity="0.45" />
        <stop offset="1" stopColor={s.blushDefault} stopOpacity="0" />
      </radialGradient>
      <radialGradient id={id('iris')} cx="0.5" cy="0.45" r="0.55">
        <stop offset="0" stopColor="#1A0C06" />
        <stop offset="0.45" stopColor={look.irisInner} />
        <stop offset="0.8" stopColor={look.irisOuter} />
        <stop offset="1" stopColor="#2A150A" />
      </radialGradient>
      <linearGradient id={id('lipT')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={darken(L, 0.16)} />
        <stop offset="1" stopColor={L} />
      </linearGradient>
      <linearGradient id={id('lipB')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={lighten(L, 0.1)} />
        <stop offset="1" stopColor={darken(L, 0.14)} />
      </linearGradient>
      <linearGradient id={id('gold')} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#FFF0B8" />
        <stop offset="0.45" stopColor="#E2B654" />
        <stop offset="1" stopColor="#A9781E" />
      </linearGradient>
      <clipPath id={id('eyeL')}>
        <path d="M 278 338 C 268 323 244 318 223 331 C 238 344 262 347 278 338 Z" />
      </clipPath>
      <clipPath id={id('eyeR')}>
        <path d="M 322 338 C 332 323 356 318 377 331 C 362 344 338 347 322 338 Z" />
      </clipPath>
      <clipPath id={id('faceClip')}>
        <path d={faceOutline(config)} transform={look.isPlus ? plusFaceTransform : undefined} />
      </clipPath>
    </>
  );
};

// ---------------------------------------------------------------------------
// Neck (drawn before the outfit so necklines sit over it)
// ---------------------------------------------------------------------------
export const Neck: React.FC<{ id: (n: string) => string; look: HeadLook }> = ({ id, look }) => {
  const s = look.skin;
  const neck = look.isMale
    ? 'M 252 452 C 254 490 254 530 246 584 C 280 598 320 598 354 584 C 346 530 346 490 348 452 Z'
    : look.isPlus
      ? 'M 258 452 C 260 488 260 524 252 580 C 282 594 318 594 348 580 C 340 524 340 488 342 452 Z'
      : 'M 262 452 C 264 485 264 520 256 578 C 283 592 317 592 344 578 C 336 520 336 485 338 452 Z';
  return (
    <g>
      <path d={neck} fill={`url(#${id('neckG')})`} />
      {/* shadow cast by the chin and jaw onto the neck */}
      <path
        d="M 266 470 C 285 505 315 505 334 470 L 334 520 C 315 540 285 540 266 520 Z"
        fill={s.contour}
        opacity="0.38"
        filter="url(#global-blur-md)"
      />
      {/* neck muscles */}
      <path d="M 272 486 C 278 520 286 548 292 572" fill="none" stroke={s.contour} strokeWidth="3" opacity="0.28" filter="url(#global-blur-xs)" />
      <path d="M 328 486 C 322 520 314 548 308 572" fill="none" stroke={s.contour} strokeWidth="3" opacity="0.28" filter="url(#global-blur-xs)" />
      {look.isMale && (
        <path d="M 294 532 C 298 540 302 540 306 532" fill="none" stroke={s.contour} strokeWidth="2.4" opacity="0.5" filter="url(#global-blur-xs)" />
      )}
    </g>
  );
};

// ---------------------------------------------------------------------------
// Ears (both drawn; long hair covers them where it should)
// ---------------------------------------------------------------------------
export const Ears: React.FC<{ id: (n: string) => string; look: HeadLook; earrings: string }> = ({
  id,
  look,
  earrings,
}) => {
  const s = look.skin;
  const dx = look.isMale ? 5 : look.isPlus ? 6 : 0;
  const earFill = mix(s.base, s.shadow, 0.5);
  return (
    <g>
      <g transform={`translate(${dx} 0)`}>
        <path d="M 402 338 C 416 334 420 352 416 372 C 413 388 406 394 400 392 Z" fill={earFill} />
        <path d="M 406 346 C 413 350 412 366 408 378" fill="none" stroke={s.contour} strokeWidth="1.6" opacity="0.7" />
      </g>
      <g transform={`translate(${-dx} 0)`}>
        <path d="M 198 338 C 184 334 180 352 184 372 C 187 388 194 394 200 392 Z" fill={earFill} />
        <path d="M 194 346 C 187 350 188 366 192 378" fill="none" stroke={s.contour} strokeWidth="1.6" opacity="0.7" />
      </g>
      {earrings === 'goldStuds' && (
        <>
          <circle cx={408 + dx} cy="388" r="4" fill={`url(#${id('gold')})`} />
          <circle cx={407 + dx} cy="387" r="1.3" fill="#FFF8DC" />
          <circle cx={192 - dx} cy="388" r="4" fill={`url(#${id('gold')})`} />
          <circle cx={191 - dx} cy="387" r="1.3" fill="#FFF8DC" />
        </>
      )}
      {earrings === 'goldHoops' && (
        <>
          <ellipse cx={410 + dx} cy="408" rx="12" ry="17" fill="none" stroke={`url(#${id('gold')})`} strokeWidth="3" />
          <ellipse cx={190 - dx} cy="408" rx="12" ry="17" fill="none" stroke={`url(#${id('gold')})`} strokeWidth="3" />
          <path d={`M ${400 + dx} 400 C ${402 + dx} 394 ${408 + dx} 391 ${413 + dx} 393`} fill="none" stroke="#FFF4C8" strokeWidth="1" opacity="0.9" />
        </>
      )}
    </g>
  );
};

// ---------------------------------------------------------------------------
// Face: base, shading, eyes, brows, nose, lips, facial hair
// ---------------------------------------------------------------------------
const LASHES_L = [
  'M 253.2 320.0 Q 251.5 317.8 249.2 317.0',
  'M 247.8 319.3 Q 245.6 316.5 242.8 315.6',
  'M 242.2 319.9 Q 239.7 316.6 236.3 315.5',
  'M 236.8 321.7 Q 233.7 317.8 229.9 316.5',
  'M 231.2 324.4 Q 227.8 320.0 223.4 318.5',
  'M 225.8 327.7 Q 221.9 322.8 216.9 321.1',
];
const LASHES_FULL_L = [
  'M 258.5 321.0 Q 257.6 316.0 254.6 313.6',
  'M 250.5 319.4 Q 248.6 313.2 244.4 310.8',
  'M 244.6 319.6 Q 241.8 312.6 236.8 310.2',
  'M 238.8 321.0 Q 234.8 313.8 229.0 311.8',
  'M 233.2 323.4 Q 228.4 316.4 222.2 315.0',
  'M 228.2 326.4 Q 222.6 320.0 215.6 319.2',
  'M 223.6 329.6 Q 217.2 324.4 210.4 324.6',
];
const LOWER_LASHES_L = [
  'M 236 341.5 l -1.6 3.2',
  'M 243 343.6 l -1 3.4',
  'M 250 344.6 l -0.4 3.4',
  'M 257 344.4 l 0.2 3.2',
];
const BROW_HAIRS_L = [
  'M 226.0 306.0 l 4 -3',
  'M 231.5 304.1 l 4 -3',
  'M 237.0 302.5 l 4 -3',
  'M 242.5 301.1 l 4 -3',
  'M 248.0 300.3 l 4 -3',
  'M 253.5 300.0 l 4 -3',
  'M 259.0 300.3 l 4 -3',
  'M 264.5 301.1 l 4 -3',
  'M 270.0 302.5 l 4 -3',
  'M 275.5 304.1 l 4 -3',
];
const BROW_HAIRS_MALE_L = [
  'M 222 309 l 5 -5', 'M 228 307 l 5 -5.5', 'M 234 305 l 5 -6', 'M 240 304 l 5 -6',
  'M 246 303 l 5 -6', 'M 252 302.5 l 5 -6', 'M 258 302.5 l 5 -6', 'M 264 303 l 5 -6',
  'M 270 304 l 5 -6', 'M 276 305.5 l 5 -5.5', 'M 281 307 l 4 -5',
];

/** Mirror a left-side path across x = 300 using a group transform. */
const MIRROR = 'translate(600 0) scale(-1 1)';

export const Face: React.FC<{ id: (n: string) => string; look: HeadLook; config: CharacterConfig }> = ({
  id,
  look,
  config,
}) => {
  const s = look.skin;
  const outline = faceOutline(config);
  const faceT = look.isPlus ? plusFaceTransform : undefined;
  const lidCrease = mix(s.contour, s.deep, 0.45);
  const waterline = mix(s.base, s.highlight, 0.3);
  const socket = mix(s.contour, s.deep, 0.3);

  const lidShapeL = look.liner
    ? 'M 278 338 C 268 323 244 318 223 331 L 209 320 L 227 327 C 245 314 268 320 278 337 Z'
    : 'M 278 338 C 268 323 244 318 223 331 C 244 320 268 322 278 337 Z';

  const lashesL = look.isMale ? LASHES_L.slice(1, 5) : look.fullLashes ? LASHES_FULL_L : LASHES_L;
  const lashW = look.isMale ? 0.8 : look.fullLashes ? 1.25 : 1.0;
  const browHairs = look.isMale ? BROW_HAIRS_MALE_L : BROW_HAIRS_L;

  const eye = (side: 'L' | 'R') => {
    const L = side === 'L';
    return (
      <g transform={eyeTransform(config.eyes.shape, side, look.isMale) || undefined}>
        {/* eye socket shadow */}
        <ellipse cx={L ? 251 : 349} cy="324" rx="27" ry="9" fill={socket} opacity="0.35" filter="url(#global-blur-xs)" />
        {/* sclera */}
        <path
          d={L ? 'M 278 338 C 268 323 244 318 223 331 C 238 344 262 347 278 338 Z' : 'M 322 338 C 332 323 356 318 377 331 C 362 344 338 347 322 338 Z'}
          fill="#F6EDE6"
        />
        <g clipPath={`url(#${id(L ? 'eyeL' : 'eyeR')})`}>
          {/* upper-lid shadow inside the eye */}
          <path
            d={L ? 'M 278 338 C 268 323 244 318 223 331 L 278 318 L 223 311 Z' : 'M 322 338 C 332 323 356 318 377 331 L 322 318 L 377 311 Z'}
            fill="#000"
          />
          <ellipse cx={L ? 250.5 : 349.5} cy="326" rx="30" ry="9" fill="#9C7C6A" opacity="0.45" />
          <circle cx={L ? 251 : 349} cy="335" r="11.5" fill={`url(#${id('iris')})`} />
          <circle cx={L ? 251 : 349} cy="335" r="5" fill="#0A0503" />
          <circle cx={L ? 247.5 : 353.5} cy="331" r="2.6" fill="#FFFFFF" opacity="0.95" />
          <circle cx={L ? 254 : 346} cy="339" r="1.2" fill="#FFFFFF" opacity="0.5" />
        </g>
        <g transform={L ? undefined : MIRROR}>
          {/* lower lid line and waterline */}
          <path d="M 226 333 C 239 343 262 346 278 338" fill="none" stroke={s.deep} strokeWidth="1.1" opacity="0.7" />
          <path d="M 231 340 C 243 347 264 350 276 343" fill="none" stroke={waterline} strokeWidth="2" opacity="0.6" filter="url(#global-blur-xs)" />
          {/* lid crease */}
          <path d="M 275 328 C 264 316 243 311 221 325" fill="none" stroke={lidCrease} strokeWidth="1.3" opacity="0.55" />
          {/* upper lid / liner */}
          <path d={lidShapeL} fill="#160A06" opacity={look.isMale ? 0.85 : 1} />
          {lashesL.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="#120806" strokeWidth={lashW - i * 0.04} strokeLinecap="round" />
          ))}
          {!look.isMale && look.fullLashes &&
            LOWER_LASHES_L.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="#120806" strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />
            ))}
        </g>
      </g>
    );
  };

  const brow = (side: 'L' | 'R') => (
    <g transform={browTransform(config.brows, side, look.isMale) || undefined}>
      <g transform={side === 'L' ? undefined : MIRROR}>
        <path
          d="M 218 310 C 230 297 252 290 270 293 C 278 295 284 298 284 304 C 282 307 278 306 272 304 C 254 300 236 302 220 312 Z"
          fill={look.browColor}
          opacity={look.isMale ? 0.92 : 1}
        />
        {browHairs.map((d, i) => (
          <path key={i} d={d} stroke={lighten(look.browColor, 0.12)} strokeWidth={look.isMale ? 1.1 : 0.8} opacity="0.6" />
        ))}
      </g>
    </g>
  );

  return (
    <g>
      {/* face base */}
      <path d={outline} transform={faceT} fill={`url(#${id('skin')})`} />

      {/* soft shading, clipped inside the face */}
      <g clipPath={`url(#${id('faceClip')})`}>
        <path d="M 196 300 C 200 400 230 460 300 488 C 240 470 205 410 200 330 Z" fill={s.contour} opacity="0.4" filter="url(#global-blur-lg)" />
        <path d="M 404 300 C 400 400 370 460 300 488 C 360 470 395 410 400 330 Z" fill={s.contour} opacity="0.4" filter="url(#global-blur-lg)" />
        {look.isMale && (
          <>
            <path d="M 200 360 C 210 430 250 476 300 490 C 250 480 214 440 206 380 Z" fill={s.contour} opacity="0.45" filter="url(#global-blur-md)" />
            <path d="M 400 360 C 390 430 350 476 300 490 C 350 480 386 440 394 380 Z" fill={s.contour} opacity="0.45" filter="url(#global-blur-md)" />
          </>
        )}
        <ellipse cx="300" cy="262" rx="46" ry="26" fill={s.glow} opacity="0.5" filter="url(#global-blur-lg)" />
        <ellipse cx="248" cy="376" rx="26" ry="14" fill={s.glow} opacity="0.45" filter="url(#global-blur-lg)" />
        <ellipse cx="352" cy="376" rx="26" ry="14" fill={s.glow} opacity="0.45" filter="url(#global-blur-lg)" />
        <ellipse cx="300" cy="472" rx="18" ry="8" fill={s.glow} opacity="0.4" filter="url(#global-blur-md)" />
        {look.blush && (
          <>
            <ellipse cx="243" cy="392" rx="34" ry="20" fill={`url(#${id('blush')})`} />
            <ellipse cx="357" cy="392" rx="34" ry="20" fill={`url(#${id('blush')})`} />
          </>
        )}
        <ellipse cx="252" cy="326" rx="32" ry="14" fill={s.contour} opacity="0.28" filter="url(#global-blur-md)" />
        <ellipse cx="348" cy="326" rx="32" ry="14" fill={s.contour} opacity="0.28" filter="url(#global-blur-md)" />
        <path d="M 288 340 C 286 370 282 392 280 404" fill="none" stroke={s.contour} strokeWidth="5" opacity="0.35" filter="url(#global-blur-xs)" />
        <path d="M 312 340 C 314 370 318 392 320 404" fill="none" stroke={s.contour} strokeWidth="4" opacity="0.25" filter="url(#global-blur-xs)" />

        {/* facial hair sits under the eyes/nose/lips layers */}
        {look.facialHair === 'stubble' && <Stubble color={look.beardColor} />}
      </g>

      {eye('L')}
      {eye('R')}
      {brow('L')}
      {brow('R')}

      {/* nose */}
      <g transform={noseTransform(config.nose, look.isMale) || undefined}>
        <path d="M 284 398 C 282 406 288 411 294 409" fill="none" stroke={mix(s.contour, s.deep, 0.5)} strokeWidth="1.4" opacity="0.55" />
        <path d="M 316 398 C 318 406 312 411 306 409" fill="none" stroke={mix(s.contour, s.deep, 0.5)} strokeWidth="1.4" opacity="0.55" />
        <ellipse cx="292" cy="408" rx="4" ry="2" fill={s.deep} opacity="0.5" filter="url(#global-blur-xs)" />
        <ellipse cx="308" cy="408" rx="4" ry="2" fill={s.deep} opacity="0.5" filter="url(#global-blur-xs)" />
        <path d="M 293 412 C 297 414 303 414 307 412" fill="none" stroke={s.contour} strokeWidth="2" opacity="0.4" filter="url(#global-blur-xs)" />
        <ellipse cx="300" cy="396" rx="8" ry="6" fill={s.glow} opacity="0.6" filter="url(#global-blur-xs)" />
        <path d="M 300 345 L 300 385" stroke={s.glow} strokeWidth="5" opacity="0.4" filter="url(#global-blur-xs)" />
      </g>
      <path d="M 296 414 L 295 428 M 304 414 L 305 428" stroke={s.shadow} strokeWidth="2" opacity="0.4" filter="url(#global-blur-xs)" />

      {/* full beard and moustache go under the lips */}
      {look.facialHair === 'fullBeard' && <FullBeard color={look.beardColor} clipId={id('beardClip')} />}

      {/* lips */}
      <g transform={lipTransform(config.lips.shape, look.isMale) || undefined}>
        <path d="M 266 436 C 279 431 289 424 300 429 C 311 424 321 431 334 436 C 320 441 309 442 300 442 C 291 442 280 441 266 436 Z" fill={`url(#${id('lipT')})`} />
        <path d="M 269 438 C 284 443 316 443 331 438 C 325 452 313 459 300 459 C 287 459 275 452 269 438 Z" fill={`url(#${id('lipB')})`} />
        <path d="M 263 431 C 277 442 292 443 300 443 C 308 443 323 442 337 431" fill="none" stroke={darken(look.lipColor, 0.42)} strokeWidth="1.6" strokeLinecap="round" />
        <ellipse cx="264" cy="437" rx="4" ry="3" fill={s.contour} opacity="0.45" filter="url(#global-blur-xs)" />
        <ellipse cx="336" cy="437" rx="4" ry="3" fill={s.contour} opacity="0.45" filter="url(#global-blur-xs)" />
        {look.gloss ? (
          <>
            <ellipse cx="292" cy="448" rx="10" ry="3.5" fill="#FFF1EA" opacity="0.75" filter="url(#global-blur-xs)" />
            <ellipse cx="310" cy="449" rx="5" ry="2" fill="#FFF1EA" opacity="0.55" filter="url(#global-blur-xs)" />
            <path d="M 290 430 C 294 428 297 429 299 431" fill="none" stroke={lighten(look.lipColor, 0.45)} strokeWidth="1.4" opacity="0.7" />
          </>
        ) : (
          <ellipse cx="296" cy="448" rx="9" ry="3" fill={lighten(look.lipColor, 0.35)} opacity="0.35" filter="url(#global-blur-xs)" />
        )}
      </g>
      <ellipse cx="300" cy="468" rx="12" ry="4" fill={s.contour} opacity="0.35" filter="url(#global-blur-xs)" />

      {look.facialHair === 'fullBeard' && <Moustache color={look.beardColor} />}
    </g>
  );
};

// ---------------------------------------------------------------------------
// Facial hair
// ---------------------------------------------------------------------------
function seeded(n: number) {
  let x = n * 9301 + 49297;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

const Stubble: React.FC<{ color: string }> = ({ color }) => {
  const rnd = seeded(7);
  const dots: React.ReactElement[] = [];
  for (let i = 0; i < 1100; i++) {
    const x = 214 + rnd() * 172;
    const y = 404 + rnd() * 92;
    // keep to the jaw, chin and upper lip; skip cheeks above the jaw curve and the lips
    const dx = Math.abs(x - 300);
    const jawTop = 470 - Math.sqrt(Math.max(0, 86 * 86 - dx * dx)) * 0.9;
    const onLips = y > 426 && y < 462 && dx < 40;
    const upperLip = y > 414 && y < 430 && dx < 34;
    if ((y < jawTop && !upperLip) || onLips) continue;
    dots.push(<circle key={i} cx={x} cy={y} r={0.5} fill={color} opacity={0.18 + rnd() * 0.2} />);
  }
  return (
    <g>
      <path d="M 214 410 C 226 470 262 494 300 496 C 338 494 374 470 386 410 C 376 452 344 478 300 480 C 256 478 224 452 214 410 Z" fill={color} opacity="0.22" filter="url(#global-blur-sm)" />
      {dots}
    </g>
  );
};

const BEARD =
  'M 208 392 C 212 446 246 500 300 506 C 354 500 388 446 392 392 C 384 420 366 444 344 456 C 330 464 316 466 300 466 C 284 466 270 464 256 456 C 234 444 216 420 208 392 Z';

const FullBeard: React.FC<{ color: string; clipId: string }> = ({ color, clipId }) => {
  const rnd = seeded(13);
  const hairs: React.ReactElement[] = [];
  for (let i = 0; i < 140; i++) {
    const t = rnd();
    const x = 226 + t * 148;
    const dx = Math.abs(x - 300);
    const yTop = 470 - Math.sqrt(Math.max(0, 90 * 90 - dx * dx)) * 0.85 + rnd() * 10;
    const len = 6 + rnd() * 10;
    hairs.push(
      <path key={i} d={`M ${x} ${yTop} l ${(x - 300) * 0.03} ${len}`} stroke={lighten(color, 0.18)} strokeWidth="0.8" opacity="0.55" />,
    );
  }
  return (
    <g>
      <clipPath id={clipId}>
        <path d={BEARD} />
      </clipPath>
      <path d={BEARD} fill={color} />
      <g clipPath={`url(#${clipId})`}>
        <path d="M 220 420 C 240 470 270 494 300 498 C 330 494 360 470 380 420" fill="none" stroke={darken(color, 0.4)} strokeWidth="6" opacity="0.4" filter="url(#global-blur-sm)" />
        {hairs}
      </g>
    </g>
  );
};

const Moustache: React.FC<{ color: string }> = ({ color }) => (
  <g>
    <path d="M 264 432 C 274 418 290 416 300 422 C 310 416 326 418 336 432 C 324 426 312 427 300 430 C 288 427 276 426 264 432 Z" fill={color} />
    {[272, 280, 288, 296, 304, 312, 320, 328].map((x) => (
      <path key={x} d={`M ${x} ${424 + Math.abs(x - 300) * 0.08} l ${(x - 300) * 0.06} 6`} stroke={lighten(color, 0.2)} strokeWidth="0.7" opacity="0.5" />
    ))}
  </g>
);
