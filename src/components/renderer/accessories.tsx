import React from 'react';
import { Accessories, SkinPalette } from '../../types/character';
import { darken, lighten, mix } from './color';
import { BodySpec } from './geometry';
import { fabricDefs } from './clothes';

/**
 * Accessories. Shoes, bags and watches are drawn in body space;
 * beads, glasses and headwear in divine.svg head space (inside the head transform).
 */

type Id = (n: string) => string;
const MIRROR = 'translate(600 0) scale(-1 1)';

// ---------------------------------------------------------------------------
// Shoes (body space). Plain customers always wear worn slippers.
// ---------------------------------------------------------------------------
export const Shoes: React.FC<{ spec: BodySpec; acc: Accessories; plain: boolean; skin: SkinPalette }> = ({ spec, acc, plain, skin }) => {
  const c = acc.shoesColor || (spec.female ? '#C9A163' : '#42281D');
  const s = spec.footScale;
  let shoe: React.ReactNode;
  if (plain) {
    shoe = (
      <>
        <path d="M -19 50 C -21 66 -13 88 0 88 C 13 88 21 66 19 50 C 10 46 -10 46 -19 50 Z" fill="#5A5A60" />
        <path d="M -19 50 C -21 66 -13 88 0 88 C 13 88 21 66 19 50" fill="none" stroke="#3A3A40" strokeWidth="2" />
        <path d="M 0 60 L -12 44 M 0 60 L 12 44" stroke="#7A2A2A" strokeWidth="3" strokeLinecap="round" />
        <path d="M -14 70 l 6 6 M 8 74 l 4 -5" stroke="#3A3A40" strokeWidth="1" opacity="0.6" />
      </>
    );
  } else if (acc.shoes === 'heels') {
    // pointed pump: toe box only, instep showing, stiletto behind
    shoe = (
      <>
        <path d="M 11 26 L 15 28 L 16 84 L 13 84 Z" fill={darken(c, 0.4)} />
        <path d="M -16 50 C -8 57 8 57 16 50 C 19 64 14 82 0 96 C -14 82 -19 64 -16 50 Z" fill={c} />
        <path d="M -16 50 C -8 57 8 57 16 50" fill="none" stroke={darken(c, 0.35)} strokeWidth="1.6" />
        <path d="M -8 62 C -9 72 -5 82 -1 88" fill="none" stroke={lighten(c, 0.5)} strokeWidth="2.2" opacity="0.6" />
        <path d="M 13 60 C 14 70 10 80 5 88" fill="none" stroke={darken(c, 0.35)} strokeWidth="2.4" opacity="0.45" />
      </>
    );
  } else if (acc.shoes === 'sandals') {
    shoe = (
      <>
        <path d="M 11 30 L 16 32 L 15 76 L 12 76 Z" fill={darken(c, 0.35)} />
        <path d="M -18 78 C -12 86 12 86 18 78" fill="none" stroke={darken(c, 0.3)} strokeWidth="4" strokeLinecap="round" />
        <path d="M -13 10 C -6 14 6 14 13 10" fill="none" stroke={c} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M -15 46 C -6 52 6 52 15 46" fill="none" stroke={c} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M -17 64 C -6 70 6 70 17 64" fill="none" stroke={c} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M -12 12 L -14 46 M 12 12 L 14 46" stroke={c} strokeWidth="2" />
        {[-9, -3, 3, 9].map((x) => (
          <ellipse key={x} cx={x} cy={78 - Math.abs(x) * 0.3} rx="2.6" ry="3.2" fill={lighten(skin.base, 0.25)} opacity="0.85" />
        ))}
      </>
    );
  } else if (acc.shoes === 'flats') {
    shoe = (
      <>
        <path d="M -18 48 C -20 64 -13 86 0 86 C 13 86 20 64 18 48 C 10 54 -10 54 -18 48 Z" fill={c} />
        <path d="M -18 48 C -10 54 10 54 18 48" fill="none" stroke={darken(c, 0.35)} strokeWidth="1.6" />
        <path d="M -5 56 q 5 5 10 0" fill="none" stroke={lighten(c, 0.4)} strokeWidth="2.4" />
        <path d="M -10 62 C -11 72 -7 80 -2 83" fill="none" stroke={lighten(c, 0.45)} strokeWidth="2.2" opacity="0.5" />
      </>
    );
  } else if (acc.shoes === 'sneakers') {
    shoe = (
      <>
        <path d="M -20 26 C -25 52 -25 76 -21 88 C -12 98 12 98 21 88 C 25 76 25 52 20 26 Z" fill="#F4F2EE" />
        <path d="M -22 78 C -12 88 12 88 22 78 L 22 88 C 12 98 -12 98 -22 88 Z" fill="#D8D4CC" />
        <path d="M -10 36 L 10 36 M -11 44 L 11 44 M -11 52 L 11 52" stroke="#B8B2A8" strokeWidth="1.6" />
        <path d="M -21 62 C -10 58 6 66 21 58" fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" />
        <path d="M -20 26 C -25 52 -25 76 -21 88" fill="none" stroke="#A8A29A" strokeWidth="1.4" />
      </>
    );
  } else {
    // loafers
    shoe = (
      <>
        <path d="M -17 22 C -21 46 -23 66 -19 80 C -12 90 12 90 19 80 C 23 66 21 46 17 22 Z" fill={c} />
        <path d="M -12 40 C -6 46 6 46 12 40" fill="none" stroke={darken(c, 0.4)} strokeWidth="2.2" />
        <path d="M -12 58 C -14 70 -10 80 -4 84" fill="none" stroke={lighten(c, 0.45)} strokeWidth="2.6" opacity="0.5" />
        <path d="M -19 80 C -12 90 12 90 19 80" fill="none" stroke={darken(c, 0.5)} strokeWidth="3" />
      </>
    );
  }
  const one = <g transform={`translate(${spec.ankle[0]} ${spec.ankle[1] - 6}) rotate(4) scale(${s})`}>{shoe}</g>;
  return (
    <g>
      {one}
      <g transform={MIRROR}>{one}</g>
    </g>
  );
};

// ---------------------------------------------------------------------------
// Bag and watch (body space, drawn after the hands)
// ---------------------------------------------------------------------------
export const HandAccessories: React.FC<{ spec: BodySpec; acc: Accessories }> = ({ spec, acc }) => {
  const bc = acc.bagColor || '#7A2A2A';
  const [wx, wy] = spec.wrist;
  const s = spec.handScale;
  return (
    <g>
      {acc.watch && (
        <g>
          <rect x={wx - 13} y={wy - 18} width="26" height="10" rx="3" fill="#C9A24A" />
          <circle cx={wx - 2} cy={wy - 13} r="7" fill="#F4ECD8" stroke="#A9781E" strokeWidth="2" />
          <path d={`M ${wx - 2} ${wy - 13} l 0 -4 M ${wx - 2} ${wy - 13} l 3 1`} stroke="#3A2A1A" strokeWidth="0.9" />
        </g>
      )}
      {acc.bag === 'clutch' && (
        <g transform={`translate(${600 - wx} ${wy + 50 * s}) rotate(-8)`}>
          <rect x="-30" y="-16" width="60" height="32" rx="7" fill={bc} />
          <path d="M -30 -6 Q 0 10 30 -6" fill={darken(bc, 0.15)} />
          <path d="M -30 -6 Q 0 10 30 -6" fill="none" stroke={darken(bc, 0.4)} strokeWidth="1.2" />
          <circle cx="0" cy="4" r="3" fill="#E2B654" />
          <path d="M -24 -12 L 20 -12" stroke={lighten(bc, 0.35)} strokeWidth="2" opacity="0.6" />
        </g>
      )}
      {acc.bag === 'tote' && (
        <g>
          <path d={`M ${spec.elbow[0] - 4} ${spec.elbow[1] - 10} C ${spec.elbow[0] - 30} ${spec.elbow[1] - 70} ${spec.elbow[0] - 70} ${spec.elbow[1] - 40} ${spec.elbow[0] - 60} ${spec.elbow[1] + 30}`} fill="none" stroke={darken(bc, 0.3)} strokeWidth="5" />
          <path d={`M ${spec.elbow[0] - 88} ${spec.elbow[1] + 26} L ${spec.elbow[0] - 20} ${spec.elbow[1] + 26} L ${spec.elbow[0] - 12} ${spec.elbow[1] + 116} L ${spec.elbow[0] - 96} ${spec.elbow[1] + 116} Z`} fill={bc} />
          <path d={`M ${spec.elbow[0] - 88} ${spec.elbow[1] + 26} L ${spec.elbow[0] - 20} ${spec.elbow[1] + 26}`} stroke={darken(bc, 0.4)} strokeWidth="2" />
          <path d={`M ${spec.elbow[0] - 80} ${spec.elbow[1] + 40} L ${spec.elbow[0] - 84} ${spec.elbow[1] + 108}`} stroke={lighten(bc, 0.3)} strokeWidth="5" opacity="0.4" />
          <path d={`M ${spec.elbow[0] - 30} ${spec.elbow[1] + 40} L ${spec.elbow[0] - 24} ${spec.elbow[1] + 108}`} stroke={darken(bc, 0.3)} strokeWidth="6" opacity="0.4" />
        </g>
      )}
    </g>
  );
};

// ---------------------------------------------------------------------------
// Head-space accessories
// ---------------------------------------------------------------------------
export const Beads: React.FC<{ id: Id }> = ({ id }) => {
  const strands = [
    { y: 548, n: 15, r: 5 },
    { y: 568, n: 17, r: 5.4 },
    { y: 590, n: 19, r: 5.8 },
  ];
  return (
    <g>
      {strands.map(({ y, n, r }, si) =>
        Array.from({ length: n }, (_, i) => {
          const t = i / (n - 1);
          const x = 248 + t * 104 + (si - 1) * 0;
          const yy = y - 26 + Math.sin(t * Math.PI) * (40 + si * 8);
          const gold = i % 5 === 2;
          return (
            <g key={`${si}-${i}`}>
              <circle cx={x} cy={yy} r={gold ? r * 0.7 : r} fill={gold ? `url(#${id('gold')})` : '#C2452D'} />
              {!gold && <circle cx={x - r * 0.35} cy={yy - r * 0.35} r={r * 0.3} fill="#FFD2C2" opacity="0.8" />}
            </g>
          );
        }),
      )}
    </g>
  );
};

export const Glasses: React.FC<{ kind: 'sunglasses' | 'clear' }> = ({ kind }) => {
  const sun = kind === 'sunglasses';
  const lens = (cx: number) => (
    <g key={cx}>
      <rect x={cx - 36} y="314" width="72" height="44" rx="18" fill={sun ? '#1A1414' : '#DCE8F0'} opacity={sun ? 0.92 : 0.14} stroke={sun ? '#0A0808' : '#2A2220'} strokeWidth={sun ? 3 : 2.4} />
      {sun && <path d={`M ${cx - 26} 322 L ${cx - 6} 348`} stroke="#FFFFFF" strokeWidth="5" opacity="0.2" />}
    </g>
  );
  return (
    <g>
      {lens(251)}
      {lens(349)}
      <path d="M 287 330 Q 300 322 313 330" fill="none" stroke={sun ? '#0A0808' : '#2A2220'} strokeWidth="3" />
      <path d="M 215 328 L 196 334 M 385 328 L 404 334" stroke={sun ? '#0A0808' : '#2A2220'} strokeWidth="3" />
    </g>
  );
};

const GELE_BASE = 'M 188 272 C 180 222 200 176 244 152 C 290 132 352 134 392 156 C 430 178 440 226 420 274 C 362 246 248 244 188 272 Z';
const GELE_FAN = 'M 232 166 C 236 96 300 36 384 28 C 446 24 492 56 502 104 C 470 112 440 132 420 176 C 380 150 300 146 232 166 Z';
const GELE_FAN2 = 'M 214 196 C 186 150 150 132 118 140 C 132 170 158 196 196 222 C 200 212 206 202 214 196 Z';
const WRAP = 'M 190 300 C 178 210 218 130 300 124 C 382 130 422 210 410 300 C 380 262 220 262 190 300 Z';
const FILA = 'M 200 254 C 196 204 230 160 300 150 C 362 146 420 160 442 200 C 448 222 424 238 398 238 C 380 240 360 234 350 242 C 330 248 240 248 200 254 Z';

export const Headwear: React.FC<{ id: Id; acc: Accessories; plain: boolean }> = ({ id, acc, plain }) => {
  if (acc.headwear === 'none') return null;
  const c = acc.headwearColor || '#C9A163';
  const fabric = acc.headwear === 'headwrap' ? 'ankara' : 'asoOke';
  const { defs, paint } = fabricDefs(id, 'headwear', fabric, c, acc.headwear === 'headwrap' ? mix(c, '#1E1E24', 0.6) : lighten(c, 0.35), 3, plain);
  const fill = paint.pattern ? `url(#${paint.pattern})` : paint.base;
  const piece = (d: string, key: string) => (
    <g key={key}>
      <path d={d} fill={paint.base} />
      <path d={d} fill={fill} />
      <path d={d} fill="none" stroke={darken(paint.base, 0.4)} strokeWidth="2" opacity="0.6" />
    </g>
  );
  const pleats = (n: number, d: (i: number) => string) =>
    Array.from({ length: n }, (_, i) => <path key={i} d={d(i)} fill="none" stroke={darken(paint.base, 0.35)} strokeWidth="2.2" opacity="0.45" />);
  return (
    <g>
      <defs>{defs}</defs>
      {acc.headwear === 'gele' && (
        <>
          {piece(GELE_FAN2, 'f2')}
          {pleats(4, (i) => `M ${208 - i * 3} ${200 + i * 4} C ${180 - i * 8} ${168 + i * 4} ${150 - i * 4} ${154 + i * 4} ${126 + i * 2} ${148 + i * 3}`)}
          {piece(GELE_FAN, 'f1')}
          {pleats(9, (i) => `M ${246 + i * 18} ${162 - i * 1} C ${262 + i * 18} ${110 - i * 6} ${310 + i * 14} ${64 - i * 3} ${370 + i * 12} ${40 + i * 6}`)}
          {piece(GELE_BASE, 'b')}
          {pleats(6, (i) => `M ${200 + i * 3} ${258 - i * 17} C ${250} ${232 - i * 17} ${350} ${232 - i * 17} ${414 - i * 3} ${260 - i * 17}`)}
          <path d="M 384 28 C 446 24 492 56 502 104" fill="none" stroke={lighten(paint.base, 0.4)} strokeWidth="3" opacity={plain ? 0.2 : 0.6} />
          <ellipse cx="320" cy="90" rx="60" ry="22" fill="#FFF" opacity={plain ? 0.04 : 0.16} filter="url(#global-blur-md)" />
        </>
      )}
      {acc.headwear === 'headwrap' && (
        <>
          {piece(WRAP, 'w')}
          {pleats(5, (i) => `M ${200 + i * 6} ${284 - i * 22} C 250 ${250 - i * 22} 350 ${250 - i * 22} ${400 - i * 6} ${284 - i * 22}`)}
          <path d="M 270 190 C 280 150 320 150 330 190 C 320 214 280 214 270 190 Z" fill={darken(paint.base, 0.1)} />
          <path d="M 270 190 C 280 150 320 150 330 190 C 320 214 280 214 270 190 Z" fill={fill} opacity="0.8" />
          <path d="M 286 196 C 260 170 250 140 270 120 M 314 196 C 340 170 350 140 330 120" fill="none" stroke={darken(paint.base, 0.35)} strokeWidth="2.4" opacity="0.6" />
        </>
      )}
      {acc.headwear === 'fila' && (
        <>
          {piece(FILA, 'fila')}
          <path d="M 200 254 C 240 248 330 248 350 242" fill="none" stroke={darken(paint.base, 0.45)} strokeWidth="4" />
          <path d="M 300 152 C 360 150 410 166 430 196" fill="none" stroke={darken(paint.base, 0.3)} strokeWidth="2.2" opacity="0.5" />
        </>
      )}
    </g>
  );
};
