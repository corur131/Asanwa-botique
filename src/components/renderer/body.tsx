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
export const Hands: React.FC<{ id: Id; skin: SkinPalette; spec: BodySpec; nails?: string }> = ({ id, skin, spec, nails }) => {
  const s = spec.handScale;
  const nailColor = nails || lighten(skin.base, 0.3);
  const hand = (
    <g transform={`translate(${spec.wrist[0]} ${spec.wrist[1] - 4}) rotate(4) scale(${s})`}>
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
      <ellipse cx="-6.5" cy="90" rx="2.3" ry="3.4" fill={nailColor} opacity="0.85" />
      <ellipse cx="0.8" cy="95.5" rx="2.4" ry="3.5" fill={nailColor} opacity="0.85" />
      <ellipse cx="7.4" cy="86" rx="2.2" ry="3.2" fill={nailColor} opacity="0.85" />
      {/* thumb, toward the body, in front */}
      <path d="M 10 22 C 18 32 21 48 18 62 C 16 70 10 70 9 63 C 8 52 7 42 3 34 Z" fill={mix(skin.base, skin.highlight, 0.25)} />
      <path d="M 10 22 C 18 32 21 48 18 62" fill="none" stroke={skin.shadow} strokeWidth="1.2" opacity="0.6" />
      <ellipse cx="14.5" cy="61" rx="2.1" ry="3" fill={nailColor} opacity="0.85" />
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

// ---------------------------------------------------------------------------
// Clothes
// ---------------------------------------------------------------------------
export interface OutfitColors {
  top: string;
  bottom: string;
  shoes: string;
}

function seeded(n: number) {
  let x = (n * 9301 + 49297) % 233280;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

/** Fabric gradient set for one colour. */
const FabricDefs: React.FC<{ id: Id; name: string; color: string }> = ({ id, name, color }) => (
  <>
    <linearGradient id={id(name + 'H')} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor={darken(color, 0.32)} />
      <stop offset="0.2" stopColor={darken(color, 0.08)} />
      <stop offset="0.45" stopColor={lighten(color, 0.1)} />
      <stop offset="0.8" stopColor={darken(color, 0.06)} />
      <stop offset="1" stopColor={darken(color, 0.34)} />
    </linearGradient>
  </>
);

function wrinkles(seed: number, x0: number, x1: number, y0: number, y1: number, color: string, n = 10) {
  const rnd = seeded(seed);
  return Array.from({ length: n }, (_, i) => {
    const x = x0 + rnd() * (x1 - x0);
    const y = y0 + rnd() * (y1 - y0);
    const dx = (rnd() - 0.5) * 50;
    return <path key={i} d={`M ${x.toFixed(1)} ${y.toFixed(1)} q ${(dx / 2).toFixed(1)} ${(10 + rnd() * 10).toFixed(1)} ${dx.toFixed(1)} ${(26 + rnd() * 16).toFixed(1)}`} fill="none" stroke={color} strokeWidth="3" opacity="0.28" filter="url(#global-blur-sm)" />;
  });
}

// ---- female ---------------------------------------------------------------
function camisolePath(s: BodySpec): { body: string; strapL: string; neckDip: number } {
  const [py, ph] = s.pit;
  const [by, bh] = s.bust;
  const [uy, uh] = s.under;
  const [wy, wh] = s.waist;
  const dip = by - 14;
  const left: Pt[] = [[300 - ph + 3, py + 10], [300 - bh - 3, by], [300 - uh - 3, uy], [300 - wh - 4, wy], [300 - wh - 5, wy + 18]];
  const right = [...left].reverse().map(mirrorPt);
  const neck: Pt[] = [[300 + ph - 3, py + 10], [300 + bh * 0.5, by - 34], [300, dip], [300 - bh * 0.5, by - 34], [300 - ph + 3, py + 10]];
  const body = runs(left, right, neck);
  const strapL = `M ${300 - bh * 0.5} ${by - 32} C ${300 - bh * 0.5} ${py - 20} ${300 - s.shoulder[1] * 0.5} ${s.neck[0] + 20} ${300 - s.shoulder[1] * 0.42} ${s.neck[0] + 4}`;
  return { body, strapL, neckDip: dip };
}

function skirtPath(s: BodySpec): { d: string; hemY: number } {
  const [wy, wh] = s.waist;
  const [hy, hh] = s.hhip;
  const [ipy, iph] = s.hip;
  const hemY = s.knee[1] - 24;
  const hemX = edgeXAt(s.legOuter, hemY) - 4;
  const left: Pt[] = [[300 - wh - 4, wy + 8], [300 - hh - 5, hy], [300 - iph - 6, ipy], [300 - iph - 2, ipy + 90], [hemX, hemY]];
  return { d: runs(left, [...left].reverse().map(mirrorPt)), hemY };
}

export const FemaleBottom: React.FC<{ id: Id; spec: BodySpec; colors: OutfitColors; plain: boolean }> = ({ id, spec, colors, plain }) => {
  const { d, hemY } = skirtPath(spec);
  const c = colors.bottom;
  const [wy, wh] = spec.waist;
  return (
    <g>
      <FabricDefs id={id} name="skirt" color={c} />
      <clipPath id={id('skirtClip')}>
        <path d={d} />
      </clipPath>
      {/* hem shadow on the legs */}
      <ellipse cx="300" cy={hemY + 8} rx={spec.hip[1] * 0.9} ry="10" fill="#000" opacity="0.18" filter="url(#global-blur-sm)" />
      <path d={d} fill={`url(#${id('skirtH')})`} />
      <g clipPath={`url(#${id('skirtClip')})`}>
        {/* waistband */}
        <rect x={300 - wh - 10} y={wy + 8} width={(wh + 10) * 2} height="16" fill={darken(c, 0.12)} />
        <path d={`M ${300 - wh - 10} ${wy + 24} L ${300 + wh + 10} ${wy + 24}`} stroke={darken(c, 0.35)} strokeWidth="1.2" opacity="0.6" />
        {/* tension folds from the hips */}
        {[-1, 1].map((side) => (
          <g key={side}>
            <path d={`M ${300 + side * (spec.hip[1] - 10)} ${spec.hip[0] - 20} Q ${300 + side * 50} ${spec.hip[0] + 30} ${300 + side * 18} ${spec.crotch + 20}`} fill="none" stroke={darken(c, 0.3)} strokeWidth="5" opacity="0.35" filter="url(#global-blur-sm)" />
            <path d={`M ${300 + side * (spec.hip[1] - 14)} ${spec.hip[0] - 10} Q ${300 + side * 56} ${spec.hip[0] + 34} ${300 + side * 24} ${spec.crotch + 30}`} fill="none" stroke={lighten(c, 0.2)} strokeWidth="2" opacity="0.4" filter="url(#global-blur-xs)" />
          </g>
        ))}
        {/* shadow between the legs */}
        <path d={`M 300 ${spec.crotch} L 300 ${hemY}`} stroke={darken(c, 0.4)} strokeWidth="10" opacity="0.4" filter="url(#global-blur-md)" />
        {/* hip highlights */}
        <ellipse cx={300 - spec.hip[1] * 0.55} cy={spec.hip[0]} rx="24" ry="40" fill={lighten(c, 0.25)} opacity="0.25" filter="url(#global-blur-md)" />
        <ellipse cx={300 + spec.hip[1] * 0.55} cy={spec.hip[0]} rx="24" ry="40" fill={lighten(c, 0.25)} opacity="0.2" filter="url(#global-blur-md)" />
        <path d={`M ${300 - spec.hip[1]} ${hemY - 2} L ${300 + spec.hip[1]} ${hemY - 2}`} stroke={darken(c, 0.3)} strokeWidth="3" opacity="0.4" />
        {plain && wrinkles(11, 240, 360, wy + 30, hemY - 40, darken(c, 0.4), 12)}
      </g>
    </g>
  );
};

export const FemaleTop: React.FC<{ id: Id; spec: BodySpec; colors: OutfitColors; plain: boolean }> = ({ id, spec, colors, plain }) => {
  const { body, strapL } = camisolePath(spec);
  const c = colors.top;
  const [by, bh] = spec.bust;
  const [uy, uh] = spec.under;
  const [wy] = spec.waist;
  const strap = (
    <g>
      <path d={strapL} fill="none" stroke={darken(c, 0.4)} strokeWidth="5" opacity="0.35" filter="url(#global-blur-xs)" />
      <path d={strapL} fill="none" stroke={darken(c, 0.05)} strokeWidth="3.4" strokeLinecap="round" />
    </g>
  );
  return (
    <g>
      <FabricDefs id={id} name="top" color={c} />
      <clipPath id={id('topClip')}>
        <path d={body} />
      </clipPath>
      {strap}
      <g transform={MIRROR}>{strap}</g>
      <path d={body} fill={`url(#${id('topH')})`} />
      <g clipPath={`url(#${id('topClip')})`}>
        {/* bust shaping */}
        {[-1, 1].map((side) => (
          <g key={side}>
            <ellipse cx={300 + side * bh * 0.48} cy={by - 4} rx={bh * 0.3} ry="22" fill={lighten(c, 0.3)} opacity="0.35" filter="url(#global-blur-md)" />
            <path d={`M ${300 + side * (bh - 8)} ${uy - 10} C ${300 + side * (bh - 26)} ${uy + 6} ${300 + side * 30} ${uy + 6} ${300 + side * 6} ${uy - 4}`} fill="none" stroke={darken(c, 0.35)} strokeWidth="5" opacity="0.4" filter="url(#global-blur-sm)" />
            <path d={`M ${300 + side * (uh - 4)} ${uy + 10} Q ${300 + side * (uh - 20)} ${uy + 34} ${300 + side * (uh - 14)} ${wy}`} fill="none" stroke={darken(c, 0.25)} strokeWidth="2" opacity="0.35" filter="url(#global-blur-xs)" />
          </g>
        ))}
        <path d={`M 300 ${by - 12} L 300 ${uy}`} stroke={darken(c, 0.3)} strokeWidth="5" opacity="0.35" filter="url(#global-blur-sm)" />
        {/* neckline edge and hem */}
        <path d={`M ${300 - spec.waist[1] - 8} ${wy + 16} L ${300 + spec.waist[1] + 8} ${wy + 16}`} stroke={darken(c, 0.35)} strokeWidth="3" opacity="0.4" />
        {plain && wrinkles(17, 240, 360, by, wy, darken(c, 0.4), 10)}
      </g>
      {/* trim along the neckline */}
      <path d={`M ${300 + spec.pit[1] - 3} ${spec.pit[0] + 10}${curveThrough([[300 + spec.pit[1] - 3, spec.pit[0] + 10], [300 + bh * 0.5, by - 34], [300, by - 14], [300 - bh * 0.5, by - 34], [300 - spec.pit[1] + 3, spec.pit[0] + 10]])}`} fill="none" stroke={darken(c, 0.25)} strokeWidth="1.6" opacity="0.6" />
    </g>
  );
};

export const FemaleShoes: React.FC<{ spec: BodySpec; colors: OutfitColors; plain: boolean }> = ({ spec, colors, plain }) => {
  const c = colors.shoes;
  const s = spec.footScale;
  const shoe = (
    <g transform={`translate(${spec.ankle[0]} ${spec.ankle[1] - 6}) rotate(4) scale(${s})`}>
      {plain ? (
        <>
          <path d="M -18 52 C -19 66 -12 84 0 84 C 12 84 19 66 18 52 C 10 48 -10 48 -18 52 Z" fill={c} />
          <path d="M -17 56 C -8 52 8 52 17 56" fill="none" stroke={darken(c, 0.3)} strokeWidth="2" opacity="0.6" />
        </>
      ) : (
        <>
          {/* heel peeking out at the back */}
          <path d="M 10 28 L 17 30 L 16 76 L 12 76 Z" fill={darken(c, 0.35)} />
          <path d="M -17 34 C -10 44 10 44 17 34 C 19 50 20 66 17 74 C 11 86 -11 86 -17 74 C -20 66 -19 50 -17 34 Z" fill={c} />
          <path d="M -17 34 C -10 44 10 44 17 34" fill="none" stroke={darken(c, 0.3)} strokeWidth="1.6" />
          <path d="M -9 50 C -10 62 -7 74 -3 80" fill="none" stroke={lighten(c, 0.5)} strokeWidth="2.4" opacity="0.6" />
          <path d="M 14 46 C 16 58 15 70 12 78" fill="none" stroke={darken(c, 0.35)} strokeWidth="3" opacity="0.5" />
        </>
      )}
    </g>
  );
  return (
    <g>
      {shoe}
      <g transform={MIRROR}>{shoe}</g>
    </g>
  );
};

// ---- male -----------------------------------------------------------------
function shirtPaths(s: BodySpec) {
  const [ny, nh] = s.neck;
  const [sy, sh] = s.shoulder;
  const [py, ph] = s.pit;
  const [by, bh] = s.bust;
  const [uy, uh] = s.under;
  const [wy, wh] = s.waist;
  const left: Pt[] = [
    [300 - nh - 2, ny - 4],
    [300 - sh * 0.56, ny + 5],
    [300 - sh + 2, sy + 1],
    [300 - ph - 6, py],
    [300 - bh - 6, by],
    [300 - uh - 6, uy],
    [300 - wh - 5, wy],
    [300 - wh - 3, wy + 34],
  ];
  const right = [...left].reverse().map(mirrorPt);
  const neck: Pt[] = [[300 + nh + 2, ny - 4], [300 + nh * 0.5, ny + 12], [300, ny + 22], [300 - nh * 0.5, ny + 12], [300 - nh - 2, ny - 4]];
  const body = runs(left, right, neck);

  // sleeve: arm outline grown a little, cut at the cuff
  const cuffY = s.wrist[1] - 12;
  const grow = (pts: Pt[], dx: number) => pts.filter(([, y]) => y < cuffY).map(([x, y]) => [x + dx, y] as Pt);
  const top = s.armOuter[s.armOuter.length - 1];
  const inner = [[top[0] + 5, top[1] - 2] as Pt, ...grow(s.armInner, 4), [edgeXAt(s.armInner, cuffY) + 4, cuffY] as Pt];
  const outerAll = s.armOuter;
  const grownOuter = grow(outerAll, -3).map(([x, y], i, arr) => (i >= arr.length - 3 ? ([x, y - 2] as Pt) : ([x, y] as Pt)));
  const outer = [[edgeXAt(outerAll.slice(0, 4), cuffY) - 3, cuffY] as Pt, ...grownOuter];
  const sleeve = runs(inner, outer);
  const collar = `M ${300 - nh - 4} ${ny - 10} L ${300 - 4} ${ny + 26} L ${300 - 28} ${ny + 34} L ${300 - nh - 14} ${ny + 8} Z`;
  return { body, sleeve, collar, cuffY, inner, outer };
}

function trouserPath(s: BodySpec) {
  const [wy, wh] = s.waist;
  const [hy, hh] = s.hhip;
  const [ipy, iph] = s.hip;
  const hemY = s.ankle[1] - 10;
  const lo = (y: number, d: number): Pt => [edgeXAt(s.legOuter, y) - d, y];
  const li = (y: number, d: number): Pt => [edgeXAt(s.legInner, y) + d, y];
  const outerL: Pt[] = [[300 - wh - 4, wy + 18], [300 - hh - 7, hy], [300 - iph - 9, ipy], lo(780, 10), lo(1000, 8), lo(1200, 10), lo(hemY, 12)];
  const innerL: Pt[] = [li(hemY, 3), li(1200, 4), li(1000, 4), li(820, 4), [300, s.crotch + 10]];
  const innerR = [...innerL].reverse().map(mirrorPt);
  const outerR = [...outerL].reverse().map(mirrorPt);
  return { d: runs(outerL, [...innerL, ...innerR.slice(1)], outerR), hemY };
}

export const MaleBottom: React.FC<{ id: Id; spec: BodySpec; colors: OutfitColors; plain: boolean }> = ({ id, spec, colors, plain }) => {
  const { d, hemY } = trouserPath(spec);
  const c = colors.bottom;
  const [wy, wh] = spec.waist;
  const legCenter = (spec.ankle[0] + edgeXAt(spec.legOuter, 760)) / 2;
  return (
    <g>
      <FabricDefs id={id} name="trouser" color={c} />
      <clipPath id={id('trouserClip')}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={`url(#${id('trouserH')})`} />
      <g clipPath={`url(#${id('trouserClip')})`}>
        {[-1, 1].map((side) => {
          const cx = side < 0 ? legCenter : 600 - legCenter;
          return (
            <g key={side}>
              {/* crease */}
              <path d={`M ${cx} 760 L ${side < 0 ? spec.ankle[0] : 600 - spec.ankle[0]} ${hemY}`} stroke={lighten(c, 0.22)} strokeWidth="1.6" opacity="0.6" />
              {/* knee and ankle folds */}
              <path d={`M ${cx - 20} ${spec.knee[1] + 10} q 18 8 38 -2`} fill="none" stroke={darken(c, 0.35)} strokeWidth="2.4" opacity="0.4" filter="url(#global-blur-xs)" />
              <path d={`M ${cx - 22} ${hemY - 30} q 20 10 42 0`} fill="none" stroke={darken(c, 0.35)} strokeWidth="3" opacity="0.45" filter="url(#global-blur-xs)" />
              <path d={`M ${cx - 20} ${hemY - 14} q 20 8 40 0`} fill="none" stroke={darken(c, 0.35)} strokeWidth="2.4" opacity="0.4" filter="url(#global-blur-xs)" />
            </g>
          );
        })}
        {/* inside-leg shadow and crotch folds */}
        <path d={`M 300 ${spec.crotch} L 300 ${hemY}`} stroke={darken(c, 0.5)} strokeWidth="16" opacity="0.5" filter="url(#global-blur-md)" />
        <path d={`M 286 ${spec.crotch - 4} q -20 14 -40 10 M 314 ${spec.crotch - 4} q 20 14 40 10`} fill="none" stroke={darken(c, 0.35)} strokeWidth="2.4" opacity="0.45" filter="url(#global-blur-xs)" />
        {/* fly */}
        <path d={`M 304 ${wy + 34} C 306 ${wy + 90} 306 ${spec.crotch - 50} 300 ${spec.crotch - 10}`} fill="none" stroke={darken(c, 0.35)} strokeWidth="1.6" opacity="0.6" />
        {/* belt */}
        <rect x={300 - wh - 10} y={wy + 16} width={(wh + 10) * 2} height="16" fill="#2A1A12" />
        <path d={`M ${300 - wh - 10} ${wy + 19} L ${300 + wh + 10} ${wy + 19}`} stroke="#5A3C2A" strokeWidth="1" opacity="0.7" />
        <rect x="288" y={wy + 15} width="24" height="18" rx="2" fill="none" stroke="#D4B060" strokeWidth="2.4" />
        {plain && wrinkles(23, 220, 380, 700, hemY - 40, darken(c, 0.4), 16)}
      </g>
    </g>
  );
};

export const MaleTop: React.FC<{ id: Id; spec: BodySpec; colors: OutfitColors; plain: boolean }> = ({ id, spec, colors, plain }) => {
  const { body, collar } = shirtPaths(spec);
  const c = colors.top;
  const [ny, nh] = spec.neck;
  const [py, ph] = spec.pit;
  const [uy] = spec.under;
  const [wy, wh] = spec.waist;
  return (
    <g>
      <FabricDefs id={id} name="shirt" color={c} />
      <clipPath id={id('shirtClip')}>
        <path d={body} />
      </clipPath>
      <path d={body} fill={`url(#${id('shirtH')})`} />
      <g clipPath={`url(#${id('shirtClip')})`}>
        {[-1, 1].map((side) => (
          <g key={side}>
            {/* folds from the armpit toward the waist */}
            <path d={`M ${300 + side * (ph - 4)} ${py + 14} Q ${300 + side * (wh - 10)} ${uy + 40} ${300 + side * 40} ${wy + 20}`} fill="none" stroke={darken(c, 0.35)} strokeWidth="3" opacity="0.35" filter="url(#global-blur-xs)" />
            <path d={`M ${300 + side * (ph - 10)} ${py + 30} Q ${300 + side * (wh - 18)} ${uy + 50} ${300 + side * 50} ${wy + 26}`} fill="none" stroke={lighten(c, 0.2)} strokeWidth="1.6" opacity="0.4" filter="url(#global-blur-xs)" />
            {/* chest highlight */}
            <ellipse cx={300 + side * spec.bust[1] * 0.48} cy={spec.bust[0] - 14} rx="34" ry="22" fill={lighten(c, 0.22)} opacity="0.3" filter="url(#global-blur-md)" />
            {/* pocket on the left chest */}
            {side < 0 && <path d={`M ${300 - 78} ${spec.bust[0] - 26} l 40 0 l 0 34 l -20 6 l -20 -6 Z`} fill="none" stroke={darken(c, 0.3)} strokeWidth="1.4" opacity="0.6" />}
          </g>
        ))}
        {/* tuck bunching at the belt */}
        {[-60, -36, -12, 14, 38, 62].map((x) => (
          <path key={x} d={`M ${300 + x} ${wy + 6} q 3 12 0 28`} fill="none" stroke={darken(c, 0.3)} strokeWidth="2" opacity="0.4" filter="url(#global-blur-xs)" />
        ))}
        {/* placket and buttons */}
        <path d={`M 300 ${ny + 22} L 300 ${wy + 34}`} stroke={darken(c, 0.25)} strokeWidth="1.4" opacity="0.7" />
        <path d={`M 306 ${ny + 22} L 306 ${wy + 34}`} stroke={darken(c, 0.25)} strokeWidth="1" opacity="0.5" />
        {Array.from({ length: 5 }, (_, i) => ny + 44 + i * ((wy - ny - 30) / 5)).map((y) => (
          <circle key={y} cx="303" cy={y} r="2.6" fill={lighten(c, 0.55)} stroke={darken(c, 0.4)} strokeWidth="0.6" />
        ))}
        {plain && wrinkles(29, 220, 380, py, wy, darken(c, 0.4), 14)}
      </g>
      {/* collar */}
      {[collar].map((d, i) => (
        <g key={i}>
          <path d={d} fill={lighten(c, 0.06)} stroke={darken(c, 0.3)} strokeWidth="1.2" />
          <path d={d} transform={MIRROR} fill={lighten(c, 0.06)} stroke={darken(c, 0.3)} strokeWidth="1.2" />
        </g>
      ))}
      <path d={`M ${300 - nh - 2} ${ny - 6} Q 300 ${ny + 6} ${300 + nh + 2} ${ny - 6}`} fill="none" stroke={darken(c, 0.4)} strokeWidth="2" opacity="0.5" />
    </g>
  );
};

export const MaleSleeves: React.FC<{ id: Id; spec: BodySpec; colors: OutfitColors; plain: boolean }> = ({ id, spec, colors, plain }) => {
  const { sleeve, cuffY } = shirtPaths(spec);
  const c = colors.top;
  const one = (
    <g>
      <path d={sleeve} fill={`url(#${id('shirtH')})`} />
      <g clipPath={`url(#${id('sleeveClip')})`}>
        {/* elbow folds */}
        {[-14, 0, 12].map((dy) => (
          <path key={dy} d={`M ${spec.elbow[0] - 18} ${spec.elbow[1] + dy} q 16 ${6 + dy * 0.1} 34 -2`} fill="none" stroke={darken(c, 0.35)} strokeWidth="2.2" opacity="0.4" filter="url(#global-blur-xs)" />
        ))}
        <path d={`M ${spec.armOuter[spec.armOuter.length - 3][0] + 14} ${spec.shoulder[0] + 20} q 4 30 0 60`} fill="none" stroke={lighten(c, 0.25)} strokeWidth="10" opacity="0.25" filter="url(#global-blur-md)" />
        {/* cuff */}
        <rect x={spec.wrist[0] - 40} y={cuffY - 22} width="80" height="22" fill={darken(c, 0.08)} />
        <path d={`M ${spec.wrist[0] - 40} ${cuffY - 22} L ${spec.wrist[0] + 40} ${cuffY - 22}`} stroke={darken(c, 0.35)} strokeWidth="1.4" opacity="0.6" />
        {plain && wrinkles(31, spec.elbow[0] - 20, spec.elbow[0] + 20, spec.shoulder[0] + 40, cuffY - 30, darken(c, 0.4), 6)}
      </g>
    </g>
  );
  return (
    <g>
      <clipPath id={id('sleeveClip')}>
        <path d={sleeve} />
      </clipPath>
      {one}
      <g transform={MIRROR}>{one}</g>
    </g>
  );
};

export const MaleShoes: React.FC<{ spec: BodySpec; colors: OutfitColors }> = ({ spec, colors }) => {
  const c = colors.shoes;
  const s = spec.footScale;
  const shoe = (
    <g transform={`translate(${spec.ankle[0]} ${spec.ankle[1] - 8}) rotate(4) scale(${s})`}>
      <path d="M -17 22 C -21 46 -23 66 -19 80 C -12 90 12 90 19 80 C 23 66 21 46 17 22 Z" fill={c} />
      <path d="M -10 34 L 10 34 M -10 42 L 10 42 M -9 50 L 9 50" stroke={lighten(c, 0.3)} strokeWidth="1.4" opacity="0.7" />
      <path d="M -12 58 C -14 70 -10 80 -4 84" fill="none" stroke={lighten(c, 0.45)} strokeWidth="2.6" opacity="0.5" />
      <path d="M -19 80 C -12 90 12 90 19 80" fill="none" stroke={darken(c, 0.5)} strokeWidth="3" />
    </g>
  );
  return (
    <g>
      {shoe}
      <g transform={MIRROR}>{shoe}</g>
    </g>
  );
};
