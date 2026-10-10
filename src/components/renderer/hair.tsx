import React from 'react';
import { CharacterConfig, HairColorId, SkinPalette } from '../../types/character';
import { darken, hexToRgb, lighten, mix } from './color';
import { NEW_STYLES } from './hair2';
import { WIG_STYLES } from './hair3';
import {
  BACK_LONG,
  BACK_STRANDS,
  BABY_SWIRLS,
  BABY_SWIRL_INNER,
  CAP,
  CAP_STRANDS,
  PART_FLICKS,
  RIB_L,
  RIB_L_STRANDS,
  RIB_R,
  RIB_R_STRANDS,
} from './refPaths';

/**
 * Hair, drawn in divine.svg's coordinate space (same transform as the head).
 * longBraids is divine.svg's own hair. Every other style uses the same technique:
 * a solid gradient mass, many fine strand lines, and soft blurred highlights.
 */

export interface HairPalette {
  base: string;
  darkShadow: string;
  mid: string;
  strandHighlight: string;
  specular: string;
  /** Colour at the ends for ombré hair. */
  ends?: string;
}

export const HAIR_PALETTES: Record<HairColorId, HairPalette> = {
  black: { base: '#1A0E09', mid: '#2A1810', darkShadow: '#120905', strandHighlight: '#4A2C1C', specular: '#8A5E44' },
  darkBrown: { base: '#2E1A10', mid: '#45281A', darkShadow: '#1C0F08', strandHighlight: '#6E4630', specular: '#A8785A' },
  burgundy: { base: '#3A0E18', mid: '#5A1626', darkShadow: '#22070D', strandHighlight: '#8A2A40', specular: '#C0566C' },
  honeyBlonde: { base: '#8A5A26', mid: '#A87436', darkShadow: '#5A3814', strandHighlight: '#D09A52', specular: '#F0C888' },
  ginger: { base: '#7A3414', mid: '#9C4A20', darkShadow: '#4E1E0A', strandHighlight: '#C46A34', specular: '#E89A5C' },
  platinum: { base: '#B9A27A', mid: '#D2BE96', darkShadow: '#7E6A48', strandHighlight: '#EBDDBE', specular: '#FFF6E2' },
  ombre: { base: '#2E1A10', mid: '#3A2214', darkShadow: '#1C0F08', strandHighlight: '#B8803E', specular: '#E8BC7A', ends: '#B98340' },
};

/** Dull, ashy version of a palette for the plain (unstyled) state. */
export function dullPalette(p: HairPalette): HairPalette {
  const ash = '#6B5D54';
  return {
    base: mix(p.base, ash, 0.22),
    mid: mix(p.mid, ash, 0.25),
    darkShadow: mix(p.darkShadow, ash, 0.15),
    strandHighlight: mix(p.strandHighlight, ash, 0.4),
    specular: mix(p.specular, ash, 0.55),
    ends: p.ends ? mix(p.ends, ash, 0.35) : undefined,
  };
}

export type Id = (n: string) => string;

export interface HairProps {
  id: Id;
  config: CharacterConfig;
  pal: HairPalette;
  skin: SkinPalette;
  plain: boolean;
  /** Plus-size heads are drawn 6% wider; hair follows. */
  widen?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const lum = (hex: string) => {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
};
const REF_DARK = lum('#1A0E09');
const REF_LIGHT = lum('#8A5E44');
/** Re-colour a strand colour from divine.svg's black-hair palette into any hair palette. */
export function recolor(refHex: string, pal: HairPalette): string {
  const k = Math.max(0, Math.min(1, (lum(refHex) - REF_DARK) / (REF_LIGHT - REF_DARK)));
  return k < 0.5 ? mix(pal.base, pal.strandHighlight, k * 2) : mix(pal.strandHighlight, pal.specular, (k - 0.5) * 2);
}

export function seeded(n: number) {
  let x = (n * 9301 + 49297) % 233280;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

const MIRROR = 'translate(600 0) scale(-1 1)';

const Gradient: React.FC<{ id: Id; pal: HairPalette }> = ({ id, pal }) => (
  <>
    <linearGradient id={id('hairG')} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor={pal.mid} />
      <stop offset="0.5" stopColor={pal.base} />
      <stop offset="1" stopColor={pal.ends || pal.darkShadow} />
    </linearGradient>
    <linearGradient id={id('hairV')} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={pal.mid} />
      <stop offset={pal.ends ? '0.35' : '0.6'} stopColor={pal.base} />
      <stop offset="1" stopColor={pal.ends || pal.darkShadow} />
    </linearGradient>
    {/* long hair gradient in head space: roots at the crown, ends near the waist */}
    <linearGradient id={id('hairLong')} gradientUnits="userSpaceOnUse" x1="0" y1="180" x2="0" y2="1060">
      <stop offset="0" stopColor={pal.mid} />
      <stop offset="0.3" stopColor={pal.base} />
      <stop offset="1" stopColor={pal.ends || pal.darkShadow} />
    </linearGradient>
  </>
);

/** Small coil marks scattered inside an ellipse: afro, TWA and puff texture. */
export function coils(seed: number, cx: number, cy: number, rx: number, ry: number, n: number, color: string, size = 3) {
  const rnd = seeded(seed);
  const out: React.ReactElement[] = [];
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd());
    const x = cx + Math.cos(a) * rx * r;
    const y = cy + Math.sin(a) * ry * r;
    const s = size * (0.7 + rnd() * 0.7);
    out.push(
      <path
        key={i}
        d={`M ${x.toFixed(1)} ${y.toFixed(1)} a ${s} ${s} 0 1 ${rnd() > 0.5 ? 1 : 0} ${(s * 1.4).toFixed(1)} ${(s * 0.6).toFixed(1)}`}
        fill="none"
        stroke={color}
        strokeWidth={0.9}
        opacity={0.35 + rnd() * 0.4}
      />,
    );
  }
  return out;
}

/** Frizzy flyaways around the top of the head for the plain (unstyled) state. */
export function flyaways(seed: number, color: string, rx = 132, ry = 140, cy = 312) {
  const rnd = seeded(seed);
  const out: React.ReactElement[] = [];
  for (let i = 0; i < 46; i++) {
    const a = Math.PI * (1.08 + rnd() * 0.84);
    const x = 300 + Math.cos(a) * rx * (0.92 + rnd() * 0.06);
    const y = cy + Math.sin(a) * ry * (0.92 + rnd() * 0.06);
    const len = 8 + rnd() * 18;
    const ox = Math.cos(a) * len;
    const oy = Math.sin(a) * len;
    out.push(
      <path
        key={i}
        d={`M ${x.toFixed(1)} ${y.toFixed(1)} q ${(ox * 0.5 + (rnd() - 0.5) * 10).toFixed(1)} ${(oy * 0.5 + (rnd() - 0.5) * 10).toFixed(1)} ${ox.toFixed(1)} ${oy.toFixed(1)}`}
        fill="none"
        stroke={color}
        strokeWidth={0.8}
        opacity={0.55}
      />,
    );
  }
  return out;
}

/** Grain overlay: speckled texture for short and coily hair. */
export const Grain: React.FC<{ clip: string; color: string; opacity?: number }> = ({ clip, color, opacity = 0.5 }) => (
  <g clipPath={`url(#${clip})`}>
    <rect x="150" y="80" width="300" height="320" fill={color} filter="url(#global-grain)" opacity={opacity} />
  </g>
);

// ---------------------------------------------------------------------------
// Shapes for the styles that are not in divine.svg
// ---------------------------------------------------------------------------
export const BS_BACK =
  'M 300 166 C 192 166 150 258 152 360 L 156 860 C 210 878 390 878 444 860 L 448 360 C 450 258 408 166 300 166 Z';
export const BS_CURTAIN =
  'M 300 182 C 248 184 212 222 200 290 C 192 340 188 420 186 520 C 184 620 180 740 176 868 C 194 878 216 878 234 868 C 232 740 232 620 234 520 C 236 420 238 350 248 300 C 260 248 280 216 300 202 Z';
export const BS_EDGE = 'M 300 186 C 251 188 215 224 203 291 C 195 340 191 420 189 520 C 187 620 183 740 179 868';

export const CORN_CAP =
  'M 192 352 C 182 254 218 170 300 164 C 382 170 418 254 408 352 C 404 318 398 290 386 268 C 368 238 336 226 300 226 C 264 226 232 238 214 268 C 202 290 196 318 192 352 Z';
export const SLICK_CAP =
  'M 194 340 C 186 250 220 172 300 166 C 380 172 414 250 406 340 C 402 300 394 270 376 250 C 354 230 328 222 300 222 C 272 222 246 230 224 250 C 206 270 198 300 194 340 Z';
export const TWA_CAP =
  'M 184 346 C 170 242 212 150 300 144 C 388 150 430 242 416 346 C 410 304 402 274 384 252 C 360 230 330 222 300 222 C 270 222 240 230 216 252 C 198 274 190 304 184 346 Z';
export const MALE_CAP =
  'M 188 342 C 180 252 216 168 300 162 C 384 168 420 252 412 342 L 406 338 C 404 302 398 280 388 266 L 374 262 C 362 244 332 238 300 238 C 268 238 238 244 226 262 L 212 266 C 202 280 196 302 194 338 Z';
export const MALE_HAIRLINE =
  'M 194 338 C 196 302 202 280 212 266 L 226 262 C 238 244 268 238 300 238 C 332 238 362 244 374 262 L 388 266 C 398 280 404 302 406 338';

// ---------------------------------------------------------------------------
// BACK LAYER (behind the body)
// ---------------------------------------------------------------------------
export const HairBack: React.FC<HairProps> = (props) => {
  const { id, config, pal, plain, widen } = props;
  const shine = plain ? 0.35 : 1;
  const style = config.hair;
  const extra = NEW_STYLES[style] || WIG_STYLES[style];
  if (extra) return extra.back ? <g transform={widen}>{extra.back(props)}</g> : null;
  let body: React.ReactNode = null;

  if (style === 'longBraids') {
    body = (
      <>
        <clipPath id={id('backClip')}>
          <path d={BACK_LONG} />
        </clipPath>
        <path d={BACK_LONG} fill={`url(#${id('hairG')})`} />
        <path d="M 230 430 C 236 500 246 540 256 580 L 344 580 C 354 540 364 500 370 430 Z" fill={darken(pal.darkShadow, 0.4)} opacity="0.8" filter="url(#global-blur-md)" />
        <g clipPath={`url(#${id('backClip')})`}>
          {BACK_STRANDS.map((s, i) => (
            <path key={i} d={s.d} fill="none" stroke={recolor(s.stroke, pal)} strokeWidth={s.w} strokeLinecap="round" opacity={s.o * shine} />
          ))}
        </g>
      </>
    );
  } else if (style === 'boneStraight') {
    const strands: React.ReactElement[] = [];
    for (let i = 0; i <= 28; i++) {
      const x = 156 + i * 10.3;
      const top = 200 + Math.abs(x - 300) * 0.55;
      strands.push(
        <path key={i} d={`M ${x} ${top} C ${x - (x - 300) * 0.02} 500 ${x} 700 ${x + (x - 300) * 0.02} 870`} fill="none" stroke={i % 3 === 0 ? pal.specular : pal.strandHighlight} strokeWidth={i % 3 === 0 ? 0.9 : 1.3} opacity={(i % 3 === 0 ? 0.35 : 0.5) * shine} />,
      );
    }
    body = (
      <>
        <clipPath id={id('backClip')}>
          <path d={BS_BACK} />
        </clipPath>
        <path d={BS_BACK} fill={`url(#${id('hairV')})`} />
        <path d="M 230 430 C 236 500 246 560 256 620 L 344 620 C 354 560 364 500 370 430 Z" fill={darken(pal.darkShadow, 0.4)} opacity="0.8" filter="url(#global-blur-md)" />
        <g clipPath={`url(#${id('backClip')})`}>{strands}</g>
      </>
    );
  } else if (style === 'cornrows') {
    // two plaits hanging down the back, visible either side of the neck
    const braid = (
      <g>
        <path d="M 236 410 C 232 470 228 540 226 640 L 248 640 C 250 540 254 470 258 410 Z" fill={`url(#${id('hairV')})`} />
        {Array.from({ length: 12 }, (_, i) => {
          const y = 420 + i * 18;
          return <path key={i} d={`M ${229 - i * 0.25} ${y} q 8 9 18 0`} fill="none" stroke={pal.strandHighlight} strokeWidth="1.6" opacity={0.7 * shine} />;
        })}
      </g>
    );
    body = (
      <>
        {braid}
        <g transform={MIRROR}>{braid}</g>
      </>
    );
  } else if (style === 'afroPuff') {
    body = (
      <>
        <clipPath id={id('puffClip')}>
          <ellipse cx="300" cy="150" rx="118" ry="94" />
        </clipPath>
        <ellipse cx="300" cy="150" rx="118" ry="94" fill={`url(#${id('hairG')})`} />
        <g clipPath={`url(#${id('puffClip')})`}>
          <ellipse cx="300" cy="226" rx="110" ry="44" fill={pal.darkShadow} opacity="0.7" filter="url(#global-blur-lg)" />
          <ellipse cx="264" cy="98" rx="64" ry="32" fill={pal.specular} opacity={0.35 * shine} filter="url(#global-blur-lg)" />
          {coils(31, 300, 150, 116, 92, 480, pal.strandHighlight, 3.2)}
          {coils(37, 272, 110, 74, 40, 130, pal.specular, 2.6)}
        </g>
        <Grain clip={id('puffClip')} color={pal.specular} opacity={0.35 * shine} />
      </>
    );
  } else if (style === 'shortDreads') {
    // locs at the back and sides, behind the face
    const locs: React.ReactElement[] = [];
    const xs = [200, 214, 386, 400];
    xs.forEach((x, i) => {
      const end = 372 + (i % 2) * 16;
      const sway = x < 300 ? -4 : 4;
      locs.push(<Loc key={i} d={`M ${x} 230 C ${x + sway} 300 ${x + sway * 2} 350 ${x + sway} ${end}`} pal={pal} shine={shine} />);
    });
    body = <>{locs}</>;
  }

  if (!body) return null;
  return <g transform={widen}>{body}</g>;
};

// ---------------------------------------------------------------------------
// SIDE LAYER (in front of the face and shoulders, behind the ears)
// ---------------------------------------------------------------------------
export const HairSide: React.FC<HairProps> = (props) => {
  const { id, config, pal, plain, widen } = props;
  const shine = plain ? 0.35 : 1;
  const style = config.hair;
  const extra = NEW_STYLES[style] || WIG_STYLES[style];
  if (extra) return extra.side ? <g transform={widen}>{extra.side(props)}</g> : null;

  if (style === 'longBraids') {
    const rib = (d: string, strands: typeof RIB_L_STRANDS, clip: string, shadows: [number, number, number][], curl: string) => (
      <g>
        <path d={d} fill={`url(#${id('hairG')})`} />
        <clipPath id={id(clip)}>
          <path d={d} />
        </clipPath>
        <g clipPath={`url(#${id(clip)})`}>
          {strands.map((s, i) => (
            <path key={i} d={s.d} fill="none" stroke={recolor(s.stroke, pal)} strokeWidth={s.w} opacity={s.o * shine + (plain ? 0 : 0)} strokeLinecap="round" />
          ))}
          {shadows.map(([cx, cy, rx], i) => (
            <ellipse key={i} cx={cx} cy={cy} rx={rx} ry="7" fill={pal.darkShadow} opacity="0.45" filter="url(#global-blur-sm)" />
          ))}
        </g>
        <path d={curl} fill="none" stroke={pal.mid} strokeWidth="3" strokeLinecap="round" />
      </g>
    );
    return (
      <g transform={widen}>
        {rib(RIB_L, RIB_L_STRANDS, 'ribL', [[193.5, 466, 16.4], [187.4, 562, 17.3], [181.3, 658, 18.2]], 'M 136.9 766.0 c -6 8 2 16 10 12')}
        {rib(RIB_R, RIB_R_STRANDS, 'ribR', [[444.6, 445.6, 11.3], [450.9, 537.6, 12.4], [457.3, 629.6, 13.6]], 'M 433.6 736.0 c -6 8 2 16 10 12')}
      </g>
    );
  }

  if (style === 'boneStraight') {
    const strands: React.ReactElement[] = [];
    for (let i = 0; i < 14; i++) {
      strands.push(
        <path key={i} d={BS_EDGE} transform={`translate(${i * 3.6} 0)`} fill="none" stroke={i % 4 === 1 ? pal.specular : pal.strandHighlight} strokeWidth={i % 4 === 1 ? 0.8 : 1.2} opacity={(i % 4 === 1 ? 0.4 : 0.55) * shine} />,
      );
    }
    const curtain = (
      <g>
        <path d={BS_CURTAIN} fill={`url(#${id('hairV')})`} />
        <g clipPath={`url(#${id('bsCurtain')})`}>
          {strands}
          {/* glossy sheen band */}
          <path d="M 262 196 C 236 214 218 250 210 300" fill="none" stroke={pal.specular} strokeWidth="9" opacity={0.45 * shine} filter="url(#global-blur-sm)" />
          <path d="M 196 520 C 194 600 192 700 190 860" fill="none" stroke={pal.darkShadow} strokeWidth="14" opacity="0.4" filter="url(#global-blur-sm)" />
        </g>
      </g>
    );
    return (
      <g transform={widen}>
        <clipPath id={id('bsCurtain')}>
          <path d={BS_CURTAIN} />
        </clipPath>
        {curtain}
        <g transform={MIRROR}>{curtain}</g>
        {plain && flyaways(53, pal.strandHighlight, 120, 128, 310)}
      </g>
    );
  }
  return null;
};

// ---------------------------------------------------------------------------
// FRONT LAYER (on top of everything on the head)
// ---------------------------------------------------------------------------
export const HairFront: React.FC<HairProps> = (props) => {
  const { id, config, pal, skin, plain, widen } = props;
  const shine = plain ? 0.35 : 1;
  const style = config.hair;
  const extra = NEW_STYLES[style] || WIG_STYLES[style];
  if (extra) return extra.front ? <g transform={widen}>{extra.front(props)}</g> : null;
  let body: React.ReactNode = null;

  if (style === 'longBraids') {
    body = (
      <>
        <clipPath id={id('capClip')}>
          <path d={CAP} />
        </clipPath>
        <path d={CAP} fill={`url(#${id('hairG')})`} />
        <path d="M 404 372 C 406 320 396 276 376 254 C 360 238 344 232 334 212" fill="none" stroke={pal.mid} strokeWidth="5" opacity="0.6" filter="url(#global-blur-xs)" />
        <path d="M 334 212 C 330 196 326 182 320 170" fill="none" stroke={mix(pal.strandHighlight, skin.shadow, 0.5)} strokeWidth="1.5" opacity="0.6" />
        <g clipPath={`url(#${id('capClip')})`}>
          {CAP_STRANDS.map((s, i) => (
            <path key={i} d={s.d} fill="none" stroke={recolor(s.stroke, pal)} strokeWidth={s.w} opacity={s.o * shine} strokeLinecap="round" />
          ))}
          <path d="M 230 228 C 262 196 300 186 330 190" fill="none" stroke={pal.specular} strokeWidth="7" opacity={0.45 * shine} filter="url(#global-blur-md)" />
          <path d="M 352 196 C 380 210 398 236 404 262" fill="none" stroke={pal.specular} strokeWidth="5" opacity={0.4 * shine} filter="url(#global-blur-md)" />
        </g>
        {!plain &&
          BABY_SWIRLS.map((d, i) => (
            <g key={i}>
              <path d={d} fill="none" stroke={darken(pal.base, 0.1)} strokeWidth="1.05" strokeLinecap="round" />
              <path d={BABY_SWIRL_INNER[i]} fill="none" stroke={pal.strandHighlight} strokeWidth="0.6" opacity="0.8" />
            </g>
          ))}
        {PART_FLICKS.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={pal.mid} strokeWidth="0.6" opacity="0.7" />
        ))}
        {plain && flyaways(41, pal.strandHighlight)}
      </>
    );
  } else if (style === 'boneStraight') {
    // centre part, visible scalp line
    body = <path d="M 300 176 L 300 204" stroke={skin.shadow} strokeWidth="2" opacity="0.6" />;
  } else if (style === 'cornrows') {
    const rows: React.ReactElement[] = [];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (1.12 + (0.76 * i) / (n - 1));
      const sx = 300 + Math.cos(a) * 104;
      const sy = 334 + Math.sin(a) * 104;
      const ex = 300 + (sx - 300) * 0.3;
      const ey = 170;
      const cx = 300 + (sx - 300) * 1.08;
      const cy = (sy + ey) / 2 - 18;
      const pts: React.ReactElement[] = [];
      for (let k = 0; k <= 12; k++) {
        const t = k / 12;
        const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex;
        const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey;
        const tx = 2 * (1 - t) * (cx - sx) + 2 * t * (ex - cx);
        const ty = 2 * (1 - t) * (cy - sy) + 2 * t * (ey - cy);
        const len = Math.hypot(tx, ty) || 1;
        const ux = tx / len;
        const uy = ty / len;
        const w = 4.4 * (1 - t * 0.35);
        pts.push(
          <path key={k} d={`M ${(x - uy * w).toFixed(1)} ${(y + ux * w).toFixed(1)} L ${(x + ux * 3).toFixed(1)} ${(y + uy * 3).toFixed(1)} L ${(x + uy * w).toFixed(1)} ${(y - ux * w).toFixed(1)}`} fill="none" stroke={pal.specular} strokeWidth="1" opacity={0.55 * shine} />,
        );
      }
      const d = `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey}`;
      rows.push(
        <g key={i}>
          <path d={d} fill="none" stroke={pal.darkShadow} strokeWidth="12.5" strokeLinecap="round" />
          <path d={d} fill="none" stroke={pal.base} strokeWidth="10" strokeLinecap="round" />
          <path d={d} fill="none" stroke={pal.mid} strokeWidth="4" strokeLinecap="round" opacity="0.8" />
          {pts}
        </g>,
      );
    }
    body = (
      <>
        <clipPath id={id('cornClip')}>
          <path d={CORN_CAP} />
        </clipPath>
        {/* scalp shows between the rows */}
        <path d={CORN_CAP} fill={mix(skin.contour, pal.darkShadow, 0.35)} />
        <g clipPath={`url(#${id('cornClip')})`}>
          {rows}
          <ellipse cx="270" cy="200" rx="60" ry="22" fill={pal.specular} opacity={0.25 * shine} filter="url(#global-blur-md)" />
        </g>
        {plain && flyaways(59, pal.strandHighlight, 112, 124, 318)}
      </>
    );
  } else if (style === 'afroPuff') {
    const brushed: React.ReactElement[] = [];
    for (let i = 0; i < 22; i++) {
      const a = Math.PI * (1.08 + (0.84 * i) / 21);
      const sx = 300 + Math.cos(a) * 104;
      const sy = 330 + Math.sin(a) * 104;
      brushed.push(<path key={i} d={`M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${(300 + (sx - 300) * 0.9).toFixed(1)} ${((sy + 176) / 2).toFixed(1)} ${(300 + (sx - 300) * 0.35).toFixed(1)} 178`} fill="none" stroke={pal.strandHighlight} strokeWidth="1.1" opacity={0.5 * shine} />);
    }
    body = (
      <>
        <clipPath id={id('slickClip')}>
          <path d={SLICK_CAP} />
        </clipPath>
        <path d={SLICK_CAP} fill={`url(#${id('hairG')})`} />
        <g clipPath={`url(#${id('slickClip')})`}>
          {brushed}
          <ellipse cx="262" cy="214" rx="40" ry="14" fill={pal.specular} opacity={0.35 * shine} filter="url(#global-blur-md)" />
        </g>
        {/* hair tie where the puff gathers */}
        <path d="M 246 186 C 276 172 324 172 354 186" fill="none" stroke={pal.darkShadow} strokeWidth="9" strokeLinecap="round" />
        <path d="M 250 183 C 278 171 322 171 350 183" fill="none" stroke={lighten(pal.darkShadow, 0.15)} strokeWidth="2" opacity="0.6" />
        {!plain && (
          <>
            {BABY_SWIRLS.map((d, i) => (
              <path key={i} d={d} fill="none" stroke={darken(pal.base, 0.1)} strokeWidth="1.05" strokeLinecap="round" />
            ))}
            <g transform={MIRROR}>
              {BABY_SWIRLS.map((d, i) => (
                <path key={i} d={d} fill="none" stroke={darken(pal.base, 0.1)} strokeWidth="1.05" strokeLinecap="round" />
              ))}
            </g>
          </>
        )}
        {plain && flyaways(61, pal.strandHighlight, 112, 120, 318)}
      </>
    );
  } else if (style === 'shortNatural') {
    body = (
      <>
        <clipPath id={id('twaClip')}>
          <path d={TWA_CAP} />
        </clipPath>
        <path d={TWA_CAP} fill={`url(#${id('hairG')})`} />
        <g clipPath={`url(#${id('twaClip')})`}>
          <ellipse cx="270" cy="176" rx="70" ry="30" fill={pal.specular} opacity={0.3 * shine} filter="url(#global-blur-lg)" />
          {coils(71, 300, 240, 120, 100, 520, pal.strandHighlight, 2.6)}
          {coils(73, 280, 180, 70, 30, 120, pal.specular, 2.2)}
        </g>
        <Grain clip={id('twaClip')} color={pal.specular} opacity={0.3 * shine} />
        {plain && flyaways(67, pal.strandHighlight, 122, 168, 318)}
      </>
    );
  } else if (style === 'lowCut' || style === 'waves' || style === 'shortDreads') {
    const waves: React.ReactElement[] = [];
    if (style === 'waves') {
      for (let r = 16; r <= 150; r += 9) {
        const pts: string[] = [];
        for (let k = 0; k <= 60; k++) {
          const a = Math.PI * (0.95 + (1.1 * k) / 60);
          const rr = r + 2.6 * Math.sin(a * 14 + r * 0.3);
          pts.push(`${(300 + Math.cos(a) * rr * 1.05).toFixed(1)} ${(196 - Math.sin(a) * -rr * 0.82).toFixed(1)}`);
        }
        const d = 'M ' + pts.join(' L ');
        waves.push(
          <g key={r}>
            <path d={d} fill="none" stroke={pal.darkShadow} strokeWidth="2.6" opacity="0.7" transform="translate(0 2)" />
            <path d={d} fill="none" stroke={pal.specular} strokeWidth="1.4" opacity={0.55 * shine} />
          </g>,
        );
      }
    }
    const locs: React.ReactElement[] = [];
    if (style === 'shortDreads') {
      // short twisted locs springing out from the scalp, two rows, drawn back row first
      const rnd = seeded(83);
      const rows: [number, number, number][] = [[0.4, 7, 14], [0.66, 11, 17], [0.9, 15, 19], [1.02, 17, 16]];
      rows.forEach(([rf, n, len], ri) => {
        for (let k = 0; k < n; k++) {
          const a = Math.PI * (1.1 + (0.8 * k) / (n - 1)) + (rnd() - 0.5) * 0.05;
          const bx = 300 + Math.cos(a) * 104 * rf;
          const by = 268 + Math.sin(a) * 98 * rf;
          const l = len * (0.85 + rnd() * 0.3);
          const tx = bx + Math.cos(a) * l;
          const ty = by + Math.sin(a) * l * 0.75 + l * 0.45;
          const bend = (rnd() - 0.5) * 8;
          locs.push(
            <Loc key={`${ri}-${k}`} d={`M ${bx.toFixed(1)} ${by.toFixed(1)} Q ${((bx + tx) / 2 + bend).toFixed(1)} ${((by + ty) / 2).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}`} pal={pal} shine={shine} />,
          );
        }
      });
    }
    body = (
      <>
        <clipPath id={id('maleClip')}>
          <path d={MALE_CAP} />
        </clipPath>
        <path d={MALE_CAP} fill={`url(#${id('hairG')})`} opacity={style === 'lowCut' ? 0.94 : 1} />
        <g clipPath={`url(#${id('maleClip')})`}>
          <ellipse cx="270" cy="196" rx="60" ry="20" fill={pal.specular} opacity={0.25 * shine} filter="url(#global-blur-md)" />
          {waves}
        </g>
        <Grain clip={id('maleClip')} color={pal.specular} opacity={0.45 * shine} />
        {/* crisp line-up */}
        <path d={MALE_HAIRLINE} fill="none" stroke={pal.darkShadow} strokeWidth="1.4" opacity={plain ? 0.4 : 0.9} />
        {locs}
        {plain && flyaways(79, pal.strandHighlight, 114, 130, 322)}
      </>
    );
  }

  if (!body) return null;
  return <g transform={widen}>{body}</g>;
};

export const Loc: React.FC<{ d: string; pal: HairPalette; shine: number }> = ({ d, pal, shine }) => (
  <g>
    <path d={d} fill="none" stroke={pal.darkShadow} strokeWidth="11" strokeLinecap="round" />
    <path d={d} fill="none" stroke={pal.base} strokeWidth="8.5" strokeLinecap="round" />
    <path d={d} fill="none" stroke={pal.strandHighlight} strokeWidth="8.5" strokeLinecap="round" strokeDasharray="1.6 5" opacity={0.8 * shine} />
    <path d={d} fill="none" stroke={pal.specular} strokeWidth="1.4" strokeLinecap="round" opacity={0.45 * shine} transform="translate(-2 0)" />
  </g>
);

/** Hair defs shared by every style. */
export const HairDefs: React.FC<{ id: Id; pal: HairPalette }> = ({ id, pal }) => <Gradient id={id} pal={pal} />;
