import React from 'react';
import { SkinPalette } from '../../types/character';
import { darken, lighten, mix } from './color';
import {
  BodySpec,
  Pt,
  armPath,
  curveThrough,
  edgeXAt,
  legPath,
  mirrorPt,
  runs,
  torsoPath,
} from './geometry';

type Id = (n: string) => string;
const MIRROR = 'translate(600 0) scale(-1 1)';

// ---------------------------------------------------------------------------
// Skin defs
// ---------------------------------------------------------------------------
export const BodyDefs: React.FC<{ id: Id; skin: SkinPalette; spec: BodySpec }> = ({ id, skin, spec }) => (
  <>
    <linearGradient id={id('limbG')} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor={skin.shadow} />
      <stop offset="0.24" stopColor={skin.base} />
      <stop offset="0.5" stopColor={mix(skin.base, skin.highlight, 0.55)} />
      <stop offset="0.76" stopColor={skin.base} />
      <stop offset="1" stopColor={skin.shadow} />
    </linearGradient>
    <radialGradient id={id('torsoG')} cx="0.5" cy="0.22" r="0.85">
      <stop offset="0" stopColor={mix(skin.base, skin.highlight, 0.6)} />
      <stop offset="0.45" stopColor={skin.base} />
      <stop offset="0.8" stopColor={skin.mid} />
      <stop offset="1" stopColor={skin.shadow} />
    </radialGradient>
    <radialGradient id={id('handG')} cx="0.45" cy="0.35" r="0.8">
      <stop offset="0" stopColor={mix(skin.base, skin.highlight, 0.5)} />
      <stop offset="0.6" stopColor={skin.base} />
      <stop offset="1" stopColor={skin.shadow} />
    </radialGradient>
    <clipPath id={id('skinClip')}>
      <path d={torsoPath(spec)} />
      <path d={legPath(spec)} />
      <path d={legPath(spec)} transform={MIRROR} />
      <path d={armPath(spec)} />
      <path d={armPath(spec)} transform={MIRROR} />
    </clipPath>
  </>
);

// ---------------------------------------------------------------------------
// Legs + feet (drawn first)
// ---------------------------------------------------------------------------
export const Legs: React.FC<{ id: Id; skin: SkinPalette; spec: BodySpec }> = ({ id, skin, spec }) => {
  const leg = (
    <g>
      <path d={legPath(spec)} fill={`url(#${id('limbG')})`} />
      <g clipPath={`url(#${id('skinClip')})`}>
        {/* inner thigh shadow */}
        <path d={`M ${spec.legInner[0][0] - 4} ${spec.legInner[0][1] + 20}${curveThrough(spec.legInner.slice(0, 5).map(([x, y]) => [x - 6, y] as Pt))}`} fill="none" stroke={skin.contour} strokeWidth="14" opacity="0.4" filter="url(#global-blur-md)" />
        {/* knee */}
        <ellipse cx={spec.knee[0]} cy={spec.knee[1] - 6} rx="15" ry="19" fill={skin.glow} opacity="0.32" filter="url(#global-blur-sm)" />
        <path d={`M ${spec.knee[0] - 16} ${spec.knee[1] + 22} Q ${spec.knee[0]} ${spec.knee[1] + 34} ${spec.knee[0] + 16} ${spec.knee[1] + 22}`} fill="none" stroke={skin.contour} strokeWidth="4" opacity="0.4" filter="url(#global-blur-xs)" />
        <path d={`M ${spec.knee[0] - 14} ${spec.knee[1] - 30} Q ${spec.knee[0]} ${spec.knee[1] - 38} ${spec.knee[0] + 14} ${spec.knee[1] - 30}`} fill="none" stroke={skin.contour} strokeWidth="3" opacity="0.25" filter="url(#global-blur-xs)" />
        {/* shin highlight */}
        <path d={`M ${spec.knee[0] + 2} ${spec.knee[1] + 50} C ${spec.knee[0] + 4} ${spec.knee[1] + 150} ${spec.ankle[0] - 2} ${spec.ankle[1] - 140} ${spec.ankle[0]} ${spec.ankle[1] - 30}`} fill="none" stroke={skin.glow} strokeWidth="6" opacity="0.32" filter="url(#global-blur-sm)" />
        {/* thigh highlight */}
        <path d={`M ${(spec.legOuter[2][0] + spec.legInner[2][0]) / 2 - 6} ${spec.legOuter[2][1]} C ${(spec.legOuter[3][0] + spec.legInner[3][0]) / 2 - 6} ${spec.legOuter[3][1]} ${spec.knee[0]} ${spec.knee[1] - 80} ${spec.knee[0]} ${spec.knee[1] - 40}`} fill="none" stroke={skin.glow} strokeWidth="12" opacity="0.22" filter="url(#global-blur-md)" />
        {/* ankle bone */}
        <ellipse cx={spec.ankle[0] - 10} cy={spec.ankle[1] - 6} rx="4" ry="6" fill={skin.glow} opacity="0.35" filter="url(#global-blur-xs)" />
      </g>
    </g>
  );
  return (
    <g>
      {leg}
      <g transform={MIRROR}>{leg}</g>
      <ellipse cx="300" cy={spec.crotch - 6} rx="12" ry="12" fill={skin.deep} opacity="0.4" filter="url(#global-blur-sm)" />
    </g>
  );
};

export const Feet: React.FC<{ id: Id; skin: SkinPalette; spec: BodySpec }> = ({ id, skin, spec }) => {
  const s = spec.footScale;
  const foot = (
    <g transform={`translate(${spec.ankle[0]} ${spec.ankle[1] - 6}) rotate(4) scale(${s})`}>
      <path d="M -11 0 C -12 18 -15 38 -17 58 C -18 72 -10 80 0 80 C 10 80 18 72 17 58 C 15 38 12 18 11 0 Z" fill={`url(#${id('limbG')})`} />
      <path d="M -6 46 C -4 60 4 60 6 46" fill="none" stroke={skin.contour} strokeWidth="1.4" opacity="0.4" />
      <ellipse cx="-2" cy="30" rx="4" ry="12" fill={skin.glow} opacity="0.3" filter="url(#global-blur-xs)" />
    </g>
  );
  return (
    <g>
      {foot}
      <g transform={MIRROR}>{foot}</g>
    </g>
  );
};

// ---------------------------------------------------------------------------
// Torso
// ---------------------------------------------------------------------------
export const Torso: React.FC<{ id: Id; skin: SkinPalette; spec: BodySpec }> = ({ id, skin, spec }) => {
  const [ny, nh] = spec.neck;
  const [sy, sh] = spec.shoulder;
  const [py, ph] = spec.pit;
  const [by, bh] = spec.bust;
  const [uy, uh] = spec.under;
  const [wy, wh] = spec.waist;
  const [hy, hh] = spec.hhip;
  const [, hiph] = spec.hip;

  const half = (
    <g>
      {/* clavicle: a soft S from the throat out to the shoulder, shadow above and light below */}
      <path d={`M ${300 - 16} ${ny + 26} C ${300 - 34} ${ny + 30} ${300 - sh * 0.5} ${sy + 4} ${300 - sh + 24} ${sy + 6}`} fill="none" stroke={skin.contour} strokeWidth="2.6" opacity="0.32" filter="url(#global-blur-xs)" />
      <path d={`M ${300 - 18} ${ny + 30} C ${300 - 36} ${ny + 34} ${300 - sh * 0.5} ${sy + 8} ${300 - sh + 26} ${sy + 10}`} fill="none" stroke={skin.glow} strokeWidth="2" opacity="0.35" filter="url(#global-blur-xs)" />
      {/* hollow above the clavicle */}
      <ellipse cx={300 - sh * 0.45} cy={sy - 2} rx="14" ry="5" fill={skin.contour} opacity="0.2" filter="url(#global-blur-sm)" />
      {/* armpit */}
      <ellipse cx={300 - ph + 4} cy={py + 10} rx="10" ry="28" fill={skin.contour} opacity="0.5" filter="url(#global-blur-md)" />
      {/* ribcage side */}
      <path d={`M ${300 - ph + 8} ${py + 30} C ${300 - bh + 10} ${by + 40} ${300 - uh + 10} ${uy + 30} ${300 - wh + 10} ${wy}`} fill="none" stroke={skin.contour} strokeWidth="14" opacity="0.3" filter="url(#global-blur-md)" />
      {spec.female ? (
        <>
          {/* under-bust shadow and bust highlight */}
          <path d={`M ${300 - bh + 10} ${uy - 8} C ${300 - bh + 30} ${uy + 6} ${300 - 30} ${uy + 6} ${300 - 6} ${uy - 6}`} fill="none" stroke={skin.contour} strokeWidth="8" opacity="0.45" filter="url(#global-blur-sm)" />
          <ellipse cx={300 - bh * 0.5} cy={by - 16} rx={bh * 0.24} ry="14" fill={skin.glow} opacity="0.35" filter="url(#global-blur-md)" />
        </>
      ) : (
        <>
          {/* pectoral lower edge and highlight */}
          <path d={`M ${300 - bh + 12} ${uy - 6} C ${300 - bh + 40} ${uy + 8} ${300 - 30} ${uy + 6} ${300 - 6} ${uy - 2}`} fill="none" stroke={skin.contour} strokeWidth="6" opacity="0.5" filter="url(#global-blur-sm)" />
          <ellipse cx={300 - bh * 0.48} cy={by - 18} rx={bh * 0.3} ry="16" fill={skin.glow} opacity="0.3" filter="url(#global-blur-md)" />
          {/* abdominals */}
          {[uy + 34, uy + 66].map((y) => (
            <path key={y} d={`M ${300 - 36} ${y} Q ${300 - 18} ${y + 6} ${300 - 4} ${y}`} fill="none" stroke={skin.contour} strokeWidth="2.4" opacity="0.28" filter="url(#global-blur-xs)" />
          ))}
        </>
      )}
      {/* hip line towards the groin */}
      <path d={`M ${300 - hiph + 26} ${hy} C ${300 - hiph + 40} ${hy + 50} ${300 - 50} ${spec.crotch - 50} ${300 - 30} ${spec.crotch - 24}`} fill="none" stroke={skin.contour} strokeWidth="4" opacity="0.3" filter="url(#global-blur-sm)" />
      <ellipse cx={300 - hh + 18} cy={hy + 20} rx="10" ry="34" fill={skin.glow} opacity="0.2" filter="url(#global-blur-md)" />
    </g>
  );

  return (
    <g>
      <path d={torsoPath(spec)} fill={`url(#${id('torsoG')})`} />
      <g clipPath={`url(#${id('skinClip')})`}>
        {half}
        <g transform={MIRROR}>{half}</g>
        {/* sternum and abdomen glow */}
        <ellipse cx="300" cy={by - 34} rx="10" ry="30" fill={skin.glow} opacity="0.25" filter="url(#global-blur-md)" />
        <path d={`M 300 ${uy + 10} L 300 ${wy - 8}`} stroke={skin.contour} strokeWidth="3" opacity="0.22" filter="url(#global-blur-sm)" />
        <ellipse cx="300" cy={wy + 4} rx="34" ry="46" fill={skin.glow} opacity="0.16" filter="url(#global-blur-lg)" />
        {/* navel */}
        <ellipse cx="300" cy={wy + 30} rx="2.6" ry="4.4" fill={skin.deep} opacity="0.55" filter="url(#global-blur-xs)" />
        <path d={`M 297 ${wy + 35} Q 300 ${wy + 37} 303 ${wy + 35}`} fill="none" stroke={skin.glow} strokeWidth="1.2" opacity="0.5" />
      </g>
    </g>
  );
};

// ---------------------------------------------------------------------------
// Arms + hands (drawn after the torso clothes, before sleeves)
// ---------------------------------------------------------------------------
export const Arms: React.FC<{ id: Id; skin: SkinPalette; spec: BodySpec }> = ({ id, skin, spec }) => {
  const outerTop = spec.armOuter[spec.armOuter.length - 3];
  const arm = (
    <g>
      <path d={armPath(spec)} fill={`url(#${id('limbG')})`} />
      <g clipPath={`url(#${id('skinClip')})`}>
        {/* inner arm shadow */}
        <path d={`M ${spec.armInner[0][0]} ${spec.armInner[0][1]}${curveThrough(spec.armInner.map(([x, y]) => [x - 4, y] as Pt))}`} fill="none" stroke={skin.contour} strokeWidth="8" opacity="0.38" filter="url(#global-blur-sm)" />
        {/* deltoid highlight */}
        <ellipse cx={outerTop[0] + 12} cy={outerTop[1] + 20} rx="12" ry="26" fill={skin.glow} opacity="0.35" filter="url(#global-blur-md)" />
        {/* elbow crease and highlight */}
        <path d={`M ${spec.elbow[0] - 8} ${spec.elbow[1]} q 8 4 16 0`} fill="none" stroke={skin.contour} strokeWidth="2.2" opacity="0.45" filter="url(#global-blur-xs)" />
        <ellipse cx={spec.elbow[0] - 8} cy={spec.elbow[1] + 4} rx="5" ry="10" fill={skin.glow} opacity="0.3" filter="url(#global-blur-xs)" />
        {/* forearm highlight */}
        <path d={`M ${spec.elbow[0] - 4} ${spec.elbow[1] + 40} C ${spec.elbow[0] - 6} ${spec.elbow[1] + 110} ${spec.wrist[0] - 4} ${spec.wrist[1] - 90} ${spec.wrist[0] - 2} ${spec.wrist[1] - 20}`} fill="none" stroke={skin.glow} strokeWidth="6" opacity="0.28" filter="url(#global-blur-sm)" />
      </g>
    </g>
  );
  return (
    <g>
      {arm}
      <g transform={MIRROR}>{arm}</g>
    </g>
  );
};

/** A relaxed hanging hand seen from the side: thumb forward, fingers together and softly curled. */
export const Hands: React.FC<{ id: Id; skin: SkinPalette; spec: BodySpec; nails?: string; nailFinish?: string; plain?: boolean }> = ({ id, skin, spec, nails, nailFinish = 'gloss', plain }) => {
  const s = spec.handScale;
  const nailColor = nails || (plain ? mix(skin.base, '#9A8A7A', 0.3) : lighten(skin.base, 0.3));
  const polished = !!nails;
  const nail = (cx: number, cy: number, rx: number, ry: number) => (
    <g key={`${cx}`}>
      <ellipse cx={cx} cy={cy} rx={rx * (polished ? 1.1 : 1)} ry={ry * (polished ? 1.25 : 1)} fill={nailColor} opacity={polished ? 1 : 0.85} />
      {polished && nailFinish !== 'matte' && <ellipse cx={cx - rx * 0.35} cy={cy - ry * 0.3} rx={rx * 0.35} ry={ry * 0.6} fill="#FFF" opacity={nailFinish === 'chrome' ? 0.75 : 0.45} />}
      {polished && nailFinish === 'chrome' && <ellipse cx={cx + rx * 0.3} cy={cy + ry * 0.3} rx={rx * 0.3} ry={ry * 0.5} fill="#FFF" opacity="0.35" />}
    </g>
  );
  const hand = (
    <g transform={`translate(${spec.wrist[0]} ${spec.wrist[1] - 4}) rotate(${4 + (spec.armAngle || 0)}) scale(${s})`}>
      {/* back of hand + fingers */}
      <path d="M -12 0 C -14 14 -16 28 -16 44 C -16 60 -13 76 -10 90 C -8 98 -3 102 2 100 C 7 98 10 92 11 84 C 13 72 15 58 15 44 C 16 30 14 14 12 0 Z" fill={`url(#${id('handG')})`} />
      {/* finger separations */}
      <path d="M -8 52 C -8 68 -7 80 -6 92" fill="none" stroke={skin.contour} strokeWidth="1.2" opacity="0.55" />
      <path d="M -1 54 C -1 70 0 84 1 97" fill="none" stroke={skin.contour} strokeWidth="1.2" opacity="0.55" />
      <path d="M 6 52 C 7 66 7 78 7 88" fill="none" stroke={skin.contour} strokeWidth="1.2" opacity="0.5" />
      {/* knuckles */}
      {[-8, -1, 6].map((x) => (
        <ellipse key={x} cx={x + 2} cy="48" rx="2.8" ry="2" fill={skin.glow} opacity="0.45" filter="url(#global-blur-xs)" />
      ))}
      {/* nails */}
      {nail(-6.5, 90, 2.3, 3.4)}
      {nail(0.8, 95.5, 2.4, 3.5)}
      {nail(7.4, 86, 2.2, 3.2)}
      {/* thumb, toward the body, in front */}
      <path d="M 10 22 C 18 32 21 48 18 62 C 16 70 10 70 9 63 C 8 52 7 42 3 34 Z" fill={mix(skin.base, skin.highlight, 0.25)} />
      <path d="M 10 22 C 18 32 21 48 18 62" fill="none" stroke={skin.shadow} strokeWidth="1.2" opacity="0.6" />
      {nail(14.5, 61, 2.1, 3)}
      {/* wrist crease */}
      <path d="M -10 6 Q 0 9 10 6" fill="none" stroke={skin.contour} strokeWidth="1" opacity="0.35" />
    </g>
  );
  return (
    <g>
      {hand}
      <g transform={MIRROR}>{hand}</g>
    </g>
  );
};
