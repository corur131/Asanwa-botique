import React from 'react';
import { FabricId, OutfitSpec } from '../../types/character';
import { darken, lighten, mix } from './color';
import { BodySpec, Pt, edgeXAt, mirrorPt, runs, torsoHalfAt } from './geometry';

/**
 * Clothes: fabrics as SVG patterns, cuts built from the body's own outline.
 * Every cut works on all four bodies because its edges are computed from the body spec,
 * never hand-placed per body.
 *
 * Layers: `under` is drawn before the arms (body pieces), `over` after the arms
 * (sleeves and over-garments like the bubu and agbada). Hands go on top of both.
 */

type Id = (n: string) => string;
const f = (n: number) => n.toFixed(1);
export const MIRROR = 'translate(600 0) scale(-1 1)';

export function seeded(n: number) {
  let x = (n * 9301 + 49297) % 233280;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

// ---------------------------------------------------------------------------
// Fabrics
// ---------------------------------------------------------------------------
export interface FabricPaint {
  base: string;
  pattern?: string; // pattern id to lay over the base
  kind: FabricId;
}

const ANKARA_TILES: ((c: string, c2: string, c3: string) => { w: number; h: number; body: React.ReactNode })[] = [
  // 0 rings
  (c, c2, c3) => ({ w: 40, h: 40, body: <><circle cx="20" cy="20" r="15" fill="none" stroke={c2} strokeWidth="5" /><circle cx="20" cy="20" r="7" fill={c3} />{[[0, 0], [40, 0], [0, 40], [40, 40]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill={c2} />)}</> }),
  // 1 diamonds
  (c, c2, c3) => ({ w: 36, h: 36, body: <><polygon points="18,1 35,18 18,35 1,18" fill={c2} /><polygon points="18,9 27,18 18,27 9,18" fill={c} /><circle cx="18" cy="18" r="3" fill={c3} /></> }),
  // 2 waves
  (c, c2, c3) => ({ w: 48, h: 26, body: <><path d="M0 9 Q 12 -3 24 9 T 48 9" fill="none" stroke={c2} strokeWidth="6" /><path d="M0 21 Q 12 13 24 21 T 48 21" fill="none" stroke={c3} strokeWidth="3" /></> }),
  // 3 leaves
  (c, c2, c3) => ({ w: 40, h: 40, body: <><path d="M20 3 C 31 11 31 29 20 37 C 9 29 9 11 20 3 Z" fill={c2} /><path d="M20 6 L20 34" stroke={c} strokeWidth="1.6" /><path d="M0 0 C 8 3 9 9 6 14 C 2 10 0 5 0 0 Z M40 40 C 32 37 31 31 34 26 C 38 30 40 35 40 40 Z" fill={c3} /></> }),
  // 4 chevron
  (c, c2, c3) => ({ w: 32, h: 24, body: <><path d="M0 9 L8 2 L16 9 L24 2 L32 9" fill="none" stroke={c2} strokeWidth="5" /><path d="M0 20 L8 13 L16 20 L24 13 L32 20" fill="none" stroke={c3} strokeWidth="2.6" /></> }),
  // 5 squares
  (c, c2, c3) => ({ w: 36, h: 36, body: <><rect x="4" y="4" width="28" height="28" fill={c2} /><rect x="10" y="10" width="16" height="16" fill={c} /><rect x="15" y="15" width="6" height="6" fill={c3} /></> }),
  // 6 sunburst
  (c, c2, c3) => ({
    w: 44,
    h: 44,
    body: (
      <>
        <circle cx="22" cy="22" r="10" fill={c2} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <path key={i} d={`M ${f(22 + Math.cos(a) * 12)} ${f(22 + Math.sin(a) * 12)} L ${f(22 + Math.cos(a) * 19)} ${f(22 + Math.sin(a) * 19)}`} stroke={c2} strokeWidth="2.2" />;
        })}
        <circle cx="22" cy="22" r="4" fill={c3} />
      </>
    ),
  }),
  // 7 shells
  (c, c2, c3) => ({ w: 40, h: 22, body: <><path d="M0 22 A 20 20 0 0 1 40 22 Z" fill={c2} stroke={c} strokeWidth="1.5" /><path d="M8 22 A 12 12 0 0 1 32 22" fill="none" stroke={c3} strokeWidth="2" /><path d="M-20 11 A 20 20 0 0 1 20 11 M20 11 A 20 20 0 0 1 60 11" fill="none" stroke={c} strokeWidth="1.5" /></> }),
  // 8 dots
  (c, c2, c3) => ({ w: 30, h: 30, body: <><circle cx="8" cy="8" r="6" fill={c2} /><circle cx="23" cy="23" r="6" fill={c2} /><circle cx="23" cy="8" r="2.6" fill={c3} /><circle cx="8" cy="23" r="2.6" fill={c3} /></> }),
  // 9 swirls
  (c, c2, c3) => ({ w: 40, h: 40, body: <><path d="M20 20 m -2 0 a 2 2 0 1 1 4 0 a 6 6 0 1 1 -12 0 a 10 10 0 1 1 20 0 a 14 14 0 1 1 -28 0" fill="none" stroke={c2} strokeWidth="3" /><circle cx="2" cy="2" r="3" fill={c3} /><circle cx="38" cy="38" r="3" fill={c3} /></> }),
];

function PatternTile({ id, w, h, children }: { id: string; w: number; h: number; children: React.ReactNode }) {
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width={w} height={h}>
      {children}
    </pattern>
  );
}

/** Defs for one fabric. Returns the paint to use on pieces. */
export function fabricDefs(id: Id, key: string, fabric: FabricId, color: string, color2: string, pattern: number, plain: boolean): { defs: React.ReactNode; paint: FabricPaint } {
  const fade = (c: string) => (plain ? mix(c, '#A39C92', 0.42) : c);
  const c = fade(color);
  const c2 = fade(color2);
  const c3 = mix(c, c2, 0.5);
  const pid = id(`fab-${key}`);
  let defs: React.ReactNode = null;
  let hasPattern = true;
  switch (fabric) {
    case 'ankara': {
      const tile = ANKARA_TILES[((pattern % 10) + 10) % 10](c, c2, c3);
      defs = (
        <PatternTile id={pid} w={tile.w} h={tile.h}>
          {tile.body}
        </PatternTile>
      );
      break;
    }
    case 'lace':
      defs = (
        <PatternTile id={pid} w={26} h={26}>
          <circle cx="13" cy="13" r="4.5" fill="none" stroke={c2} strokeWidth="1.3" />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={13 + Math.cos((a * Math.PI) / 180) * 7.5} cy={13 + Math.sin((a * Math.PI) / 180) * 7.5} rx="3" ry="2" transform={`rotate(${a} ${13 + Math.cos((a * Math.PI) / 180) * 7.5} ${13 + Math.sin((a * Math.PI) / 180) * 7.5})`} fill="none" stroke={c2} strokeWidth="1" />
          ))}
          {[[0, 0], [26, 0], [0, 26], [26, 26], [13, 0], [0, 13], [26, 13], [13, 26]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="0.9" fill={c2} opacity="0.7" />
          ))}
        </PatternTile>
      );
      break;
    case 'sequin':
      defs = (
        <PatternTile id={pid} w={8} h={8}>
          <circle cx="2" cy="2" r="2.6" fill={lighten(c, 0.28)} />
          <circle cx="6" cy="6" r="2.6" fill={darken(c, 0.12)} />
          <circle cx="1.3" cy="1.3" r="0.8" fill="#FFFFFF" opacity="0.85" />
          <circle cx="5.4" cy="5.4" r="0.6" fill="#FFFFFF" opacity="0.5" />
        </PatternTile>
      );
      break;
    case 'denim':
      defs = (
        <PatternTile id={pid} w={6} h={6}>
          <path d="M0 6 L6 0 M-3 3 L3 -3 M3 9 L9 3" stroke={lighten(c, 0.2)} strokeWidth="1" opacity="0.55" />
          <path d="M0 3 L3 0 M3 6 L6 3" stroke={darken(c, 0.2)} strokeWidth="0.7" opacity="0.5" />
        </PatternTile>
      );
      break;
    case 'asoOke':
      defs = (
        <PatternTile id={pid} w={24} h={16}>
          <rect x="0" y="0" width="24" height="7" fill={c2} opacity="0.9" />
          <path d="M0 9.5 L24 9.5" stroke="#E2B654" strokeWidth="1" />
          <path d="M0 13 L24 13" stroke={c3} strokeWidth="2" />
          <path d="M0 3.5 L24 3.5" stroke="#F3D98A" strokeWidth="0.6" opacity="0.8" />
        </PatternTile>
      );
      break;
    case 'george':
      // embroidered George wrapper: big flowers outlined in gold with sequin dots
      defs = (
        <PatternTile id={pid} w={52} h={52}>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <ellipse key={a} cx={26 + Math.cos((a * Math.PI) / 180) * 9} cy={26 + Math.sin((a * Math.PI) / 180) * 9} rx="7" ry="4.4" transform={`rotate(${a} ${26 + Math.cos((a * Math.PI) / 180) * 9} ${26 + Math.sin((a * Math.PI) / 180) * 9})`} fill={c2} stroke="#E2B654" strokeWidth="1" />
          ))}
          <circle cx="26" cy="26" r="4" fill="#E2B654" />
          {[[0, 0], [52, 0], [0, 52], [52, 52]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="5" fill="none" stroke="#E2B654" strokeWidth="1.2" />
          ))}
          {[[13, 4], [39, 48], [4, 39], [48, 13]].map(([x, y], i) => (
            <circle key={`s${i}`} cx={x} cy={y} r="1.4" fill="#FFF4C8" />
          ))}
        </PatternTile>
      );
      break;
    case 'adire':
      // indigo tie-dye: soft resist rings and stitched lines
      defs = (
        <PatternTile id={pid} w={46} h={46}>
          <circle cx="23" cy="23" r="16" fill="none" stroke={c2} strokeWidth="3" opacity="0.55" />
          <circle cx="23" cy="23" r="9" fill="none" stroke={c2} strokeWidth="2" opacity="0.7" strokeDasharray="3 2" />
          <circle cx="23" cy="23" r="3" fill={c2} opacity="0.8" />
          <path d="M 0 0 L 46 46 M 46 0 L 0 46" stroke={c2} strokeWidth="1" opacity="0.25" strokeDasharray="2 3" />
        </PatternTile>
      );
      break;
    default:
      hasPattern = false;
  }
  return { defs, paint: { base: c, pattern: hasPattern ? pid : undefined, kind: fabric } };
}

/** Gradients shared by all pieces on one character. */
export const ClothDefs: React.FC<{ id: Id }> = ({ id }) => (
  <>
    <linearGradient id={id('shadeH')} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#000" stopOpacity="0.42" />
      <stop offset="0.16" stopColor="#000" stopOpacity="0.1" />
      <stop offset="0.45" stopColor="#FFF" stopOpacity="0.1" />
      <stop offset="0.62" stopColor="#FFF" stopOpacity="0.03" />
      <stop offset="0.86" stopColor="#000" stopOpacity="0.14" />
      <stop offset="1" stopColor="#000" stopOpacity="0.44" />
    </linearGradient>
    <linearGradient id={id('sheen')} x1="0" y1="0" x2="1" y2="0.7">
      <stop offset="0" stopColor="#FFF" stopOpacity="0" />
      <stop offset="0.22" stopColor="#FFF" stopOpacity="0" />
      <stop offset="0.36" stopColor="#FFF" stopOpacity="0.2" />
      <stop offset="0.5" stopColor="#FFF" stopOpacity="0" />
      <stop offset="0.6" stopColor="#FFF" stopOpacity="0" />
      <stop offset="0.7" stopColor="#FFF" stopOpacity="0.12" />
      <stop offset="0.8" stopColor="#FFF" stopOpacity="0" />
    </linearGradient>
  </>
);

/** One garment piece: base colour, print, shading, folds, satin sheen, and plain-state wear. */
export const Piece: React.FC<{
  id: Id;
  name: string;
  d: string;
  paint: FabricPaint;
  folds?: string[];
  plain: boolean;
  box: [number, number, number, number];
  outline?: boolean;
}> = ({ id, name, d, paint, folds = [], plain, box, outline = true }) => {
  const clip = id(`clip-${name}`);
  const [x0, x1, y0, y1] = box;
  const rnd = seeded(name.length * 13 + Math.round(y0));
  const wrinkles = plain
    ? Array.from({ length: Math.round((y1 - y0) / 40) }, (_, i) => {
        const x = x0 + rnd() * (x1 - x0);
        const y = y0 + rnd() * (y1 - y0);
        const dx = (rnd() - 0.5) * 50;
        return <path key={i} d={`M ${f(x)} ${f(y)} q ${f(dx / 2)} ${f(10 + rnd() * 10)} ${f(dx)} ${f(26 + rnd() * 16)}`} fill="none" stroke="#000" strokeWidth="4" opacity="0.14" filter="url(#global-blur-sm)" />;
      })
    : null;
  const stains = plain
    ? [0, 1].map((i) => <ellipse key={i} cx={x0 + (x1 - x0) * (0.3 + rnd() * 0.4)} cy={y0 + (y1 - y0) * (0.25 + rnd() * 0.5)} rx={5 + rnd() * 6} ry={4 + rnd() * 5} fill="#5A4430" opacity="0.22" filter="url(#global-blur-xs)" />)
    : null;
  return (
    <g>
      <clipPath id={clip}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={paint.base} />
      {paint.pattern && <path d={d} fill={`url(#${paint.pattern})`} opacity={paint.kind === 'lace' ? 0.9 : 1} />}
      <g clipPath={`url(#${clip})`}>
        <path d={d} fill={`url(#${id('shadeH')})`} />
        {folds.map((fd, i) => (
          <g key={i}>
            <path d={fd} fill="none" stroke="#000" strokeWidth="5" opacity="0.22" filter="url(#global-blur-sm)" />
            <path d={fd} transform="translate(3 0)" fill="none" stroke="#FFF" strokeWidth="2" opacity="0.14" filter="url(#global-blur-xs)" />
          </g>
        ))}
        {(paint.kind === 'satin' || paint.kind === 'sequin' || paint.kind === 'leather' || paint.kind === 'chiffon') && !plain && <path d={d} fill={`url(#${id('sheen')})`} />}
        {paint.kind === 'velvet' && <path d={d} fill={`url(#${id('shadeH')})`} opacity="0.8" />}
        {paint.kind === 'leather' && !plain && <path d={d} fill={`url(#${id('sheen')})`} opacity="0.8" />}
        {wrinkles}
        {stains}
      </g>
      {outline && <path d={d} fill="none" stroke={darken(paint.base, 0.4)} strokeWidth="1" opacity="0.45" />}
    </g>
  );
};

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
export const legsHalf = (s: BodySpec, y: number) => 300 - edgeXAt(s.legOuter, y);
/** Half width of the body silhouette at y: torso to the hips, then the legs. */
export const bodyHalf = (s: BodySpec, y: number) =>
  y <= s.hip[0] ? Math.max(torsoHalfAt(s, y), y >= s.legOuter[0][1] ? legsHalf(s, y) : 0) : Math.max(legsHalf(s, y), 30);

/** Left edge sampled from y0 to y1, pushed out by ease(y, t). */
export function leftEdge(s: BodySpec, y0: number, y1: number, ease: (y: number, t: number) => number, step = 24): Pt[] {
  const n = Math.max(2, Math.round((y1 - y0) / step));
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const y = y0 + (y1 - y0) * t;
    return [300 - bodyHalf(s, y) - ease(y, t), y] as Pt;
  });
}

/** A symmetric piece from a left edge (top to bottom) and an optional top edge (right to left). */
export function symmetric(left: Pt[], top?: Pt[]): string {
  const right = [...left].reverse().map(mirrorPt);
  return top ? runs(left, right, top) : runs(left, right);
}

export const sweetheart = (s: BodySpec, ease = 3): Pt[] => {
  const [py, ph] = s.pit;
  const [by, bh] = s.bust;
  return [[300 + ph - ease, py + 10], [300 + bh * 0.5, by - 34], [300, by - 14], [300 - bh * 0.5, by - 34], [300 - ph + ease, py + 10]];
};
export const crew = (s: BodySpec, depth: number, widen = 6): Pt[] => {
  const [ny, nh] = s.neck;
  return [[300 + nh + widen, ny + 2], [300 + nh * 0.5, ny + depth * 0.8], [300, ny + depth], [300 - nh * 0.5, ny + depth * 0.8], [300 - nh - widen, ny + 2]];
};
/** Shoulder line from the neck to the shoulder tip, for garments that cover the shoulders. */
export const shoulderLeft = (s: BodySpec, ease = 0): Pt[] => {
  const [ny, nh] = s.neck;
  const [sy, sh] = s.shoulder;
  return [[300 - nh - 6, ny + 2], [300 - sh * 0.56, ny + 5], [300 - sh + 2 - ease, sy + 1]];
};

/** Sleeve over the left arm from the shoulder to endY, with optional bell flare. */
export function sleevePath(s: BodySpec, endY: number, flare = 0, ease = 4): string {
  const top = s.armOuter[s.armOuter.length - 1];
  const sy = top[1];
  const t = (y: number) => Math.max(0, Math.min(1, (y - sy) / (endY - sy)));
  const inner: Pt[] = [[top[0] + 5, top[1] - 2], ...s.armInner.filter(([, y]) => y < endY).map(([x, y]) => [x + ease + flare * 0.35 * t(y), y] as Pt), [edgeXAt(s.armInner, endY) + ease + flare * 0.35, endY]];
  const outerAll = s.armOuter;
  const outer: Pt[] = [
    [edgeXAt(outerAll.filter(([, y]) => y >= top[1] + 40), endY) - ease - flare, endY],
    ...outerAll.filter(([, y]) => y < endY).map(([x, y], i, arr) => [x - ease - flare * t(y), i >= arr.length - 3 ? y - 2 : y] as Pt),
  ];
  return runs(inner, outer);
}

/** Trouser legs from topY to hemY. */
export function trousers(s: BodySpec, topY: number, hemY: number, o: { ease?: number; easeIn?: number; flare?: number } = {}): string {
  const ease = o.ease ?? 8;
  const easeIn = o.easeIn ?? 4;
  const flare = o.flare ?? 0;
  const t = (y: number) => Math.max(0, (y - s.crotch) / (hemY - s.crotch));
  const outerL: Pt[] = [[300 - torsoHalfAt(s, topY) - 4, topY], [300 - s.hhip[1] - 7, s.hhip[0]], [300 - s.hip[1] - 9, s.hip[0]]];
  for (let y = 780; y < hemY; y += 110) outerL.push([edgeXAt(s.legOuter, y) - ease - flare * t(y), y]);
  outerL.push([edgeXAt(s.legOuter, hemY) - ease - flare, hemY]);
  const innerL: Pt[] = [[Math.min(296, edgeXAt(s.legInner, hemY) + easeIn - flare * 0.4), hemY]];
  for (let y = hemY - 120; y > s.crotch + 40; y -= 120) innerL.push([Math.min(296, edgeXAt(s.legInner, y) + easeIn - flare * 0.4 * t(y)), y]);
  innerL.push([300, s.crotch + 10]);
  const innerR = [...innerL].reverse().map(mirrorPt);
  const outerR = [...outerL].reverse().map(mirrorPt);
  return runs(outerL, [...innerL, ...innerR.slice(1)], outerR);
}

// ---------------------------------------------------------------------------
// Cuts
// ---------------------------------------------------------------------------
export interface CutCtx {
  id: Id;
  s: BodySpec;
  main: FabricPaint;
  accent: FabricPaint;
  denim: FabricPaint;
  plain: boolean;
}
export interface CutLayers {
  under: (c: CutCtx) => React.ReactNode;
  over?: (c: CutCtx) => React.ReactNode;
}

export const box = (s: BodySpec, y0: number, y1: number, pad = 0): [number, number, number, number] => [300 - s.hip[1] - pad, 300 + s.hip[1] + pad, y0, y1];

export function straps(c: CutCtx, color: string, width = 3.4) {
  const { s } = c;
  const [by, bh] = s.bust;
  const d = `M ${300 - bh * 0.5} ${by - 32} C ${300 - bh * 0.5} ${s.pit[0] - 20} ${300 - s.shoulder[1] * 0.5} ${s.neck[0] + 20} ${300 - s.shoulder[1] * 0.42} ${s.neck[0] + 4}`;
  const one = (
    <g>
      <path d={d} fill="none" stroke="#000" strokeWidth={width + 1.6} opacity="0.25" filter="url(#global-blur-xs)" />
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" />
    </g>
  );
  return (
    <>
      {one}
      <g transform={MIRROR}>{one}</g>
    </>
  );
}

export function camiPiece(c: CutCtx, paint: FabricPaint, hemY: number, name: string) {
  const { s } = c;
  const [py] = s.pit;
  const left = leftEdge(s, py + 10, hemY, () => 3);
  const d = symmetric(left, sweetheart(s));
  const [by, bh] = s.bust;
  const [uy, uh] = s.under;
  const folds = [
    `M ${300 - bh + 8} ${uy - 10} C ${300 - bh + 26} ${uy + 6} ${330} ${uy + 6} ${306} ${uy - 4}`,
    `M ${300 + bh - 8} ${uy - 10} C ${300 + bh - 26} ${uy + 6} ${270} ${uy + 6} ${294} ${uy - 4}`,
    `M 300 ${by - 12} L 300 ${uy}`,
    `M ${300 - uh + 4} ${uy + 12} Q ${300 - uh + 18} ${uy + 34} ${300 - uh + 12} ${hemY - 6}`,
  ];
  return (
    <>
      {straps(c, paint.base)}
      <Piece id={c.id} name={name} d={d} paint={paint} folds={folds} plain={c.plain} box={box(c.s, py, hemY)} />
    </>
  );
}

export function pencilPiece(c: CutCtx, paint: FabricPaint, topY: number, hemY: number, name: string, flare = 0) {
  const { s } = c;
  const left = leftEdge(s, topY, hemY, (y, t) => 4 + flare * t * t);
  const d = symmetric(left);
  const folds = [
    `M ${300 - s.hip[1] + 10} ${s.hip[0] - 20} Q 250 ${s.hip[0] + 30} 282 ${s.crotch + 20}`,
    `M ${300 + s.hip[1] - 10} ${s.hip[0] - 20} Q 350 ${s.hip[0] + 30} 318 ${s.crotch + 20}`,
    `M 300 ${s.crotch} L 300 ${hemY}`,
  ];
  return (
    <>
      <ellipse cx="300" cy={hemY + 8} rx={s.hip[1] * 0.9} ry="10" fill="#000" opacity="0.16" filter="url(#global-blur-sm)" />
      <Piece id={c.id} name={name} d={d} paint={paint} folds={folds} plain={c.plain} box={box(s, topY, hemY)} />
      <path d={`M ${300 - torsoHalfAt(s, topY) - 6} ${topY + 14} L ${300 + torsoHalfAt(s, topY) + 6} ${topY + 14}`} stroke={darken(paint.base, 0.35)} strokeWidth="1.2" opacity="0.6" />
    </>
  );
}

export const CUTS: Record<string, CutLayers> = {
  camiPencil: {
    under: (c) => (
      <>
        {pencilPiece(c, c.main, c.s.waist[0] + 8, c.s.knee[1] - 24, 'skirt')}
        {camiPiece(c, c.accent, c.s.waist[0] + 18, 'cami')}
      </>
    ),
  },
  cropMini: {
    under: (c) => (
      <>
        {pencilPiece(c, c.main, c.s.waist[0] + 16, c.s.crotch + 92, 'mini', 16)}
        {camiPiece(c, c.accent, c.s.under[0] + 22, 'crop')}
      </>
    ),
  },
  miniGown: {
    under: (c) => {
      const { s } = c;
      const hem = s.crotch + 118;
      const left = leftEdge(s, s.pit[0] + 10, hem, (y, t) => 3 + 6 * t * t);
      const d = symmetric(left, sweetheart(s));
      const folds = [`M ${300 - s.under[1]} ${s.under[0]} Q 286 ${s.waist[0]} 300 ${s.hip[0] - 10}`, `M ${300 + s.under[1]} ${s.under[0]} Q 314 ${s.waist[0]} 300 ${s.hip[0] - 10}`, `M 300 ${s.crotch} L 300 ${hem}`];
      return (
        <>
          {straps(c, c.main.base)}
          <ellipse cx="300" cy={hem + 8} rx={s.hip[1] * 0.85} ry="9" fill="#000" opacity="0.16" filter="url(#global-blur-sm)" />
          <Piece id={c.id} name="minigown" d={d} paint={c.main} folds={folds} plain={c.plain} box={box(s, s.pit[0], hem)} />
        </>
      );
    },
  },
  mermaidGown: {
    under: (c) => {
      const { s } = c;
      const hem = s.ankle[1] + 4;
      const flareStart = s.knee[1] - 60;
      const left = leftEdge(s, s.pit[0] + 10, hem, (y) => (y < flareStart ? 3 : 3 + ((y - flareStart) / (hem - flareStart)) ** 1.8 * 110), 22);
      const d = symmetric(left, sweetheart(s));
      const folds = [
        `M 300 ${s.crotch} L 300 ${flareStart}`,
        `M ${280} ${flareStart} Q 250 ${hem - 60} 236 ${hem}`,
        `M ${320} ${flareStart} Q 350 ${hem - 60} 364 ${hem}`,
        `M 300 ${flareStart + 20} L 300 ${hem}`,
      ];
      return (
        <>
          <Piece id={c.id} name="mermaid" d={d} paint={c.main} folds={folds} plain={c.plain} box={box(s, s.pit[0], hem, 60)} />
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M ${300 - bodyHalf(s, hem) - 70 + i * 4} ${hem - 6 - i * 10} Q 300 ${hem + 6 - i * 10} ${300 + bodyHalf(s, hem) + 70 - i * 4} ${hem - 6 - i * 10}`} fill="none" stroke={darken(c.main.base, 0.3)} strokeWidth="1.4" opacity="0.5" />
          ))}
        </>
      );
    },
  },
  laceGown: {
    under: (c) => {
      const { s } = c;
      const hem = s.ankle[1] + 2;
      const left = leftEdge(s, s.pit[0] + 10, hem, (y, t) => (y < s.hip[0] ? 3 : 3 + ((y - s.hip[0]) / (hem - s.hip[0])) * 34), 24);
      const d = symmetric(left, sweetheart(s));
      // sheer illusion yoke from the neck down to the sweetheart line
      const [ny, nh] = s.neck;
      const yoke = runs(
        [[300 - nh - 4, ny + 4], [300 - s.shoulder[1] * 0.6, ny + 12], [300 - s.pit[1] + 3, s.pit[0] + 10]],
        [[300 - s.bust[1] * 0.5, s.bust[0] - 34], [300, s.bust[0] - 14], [300 + s.bust[1] * 0.5, s.bust[0] - 34]],
        [[300 + s.pit[1] - 3, s.pit[0] + 10], [300 + s.shoulder[1] * 0.6, ny + 12], [300 + nh + 4, ny + 4]],
      );
      return (
        <>
          <path d={yoke} fill={c.main.pattern ? `url(#${c.main.pattern})` : c.main.base} opacity="0.85" />
          <path d={yoke} fill={c.main.base} opacity="0.18" />
          <Piece id={c.id} name="lacegown" d={d} paint={c.main} folds={[`M 300 ${s.crotch} L 300 ${hem}`, `M 270 ${s.knee[1]} L 256 ${hem}`, `M 330 ${s.knee[1]} L 344 ${hem}`]} plain={c.plain} box={box(s, s.pit[0], hem, 30)} />
        </>
      );
    },
    over: (c) => {
      const d = sleevePath(c.s, c.s.elbow[1] - 30, 0, 3);
      return (
        <>
          <path d={d} fill={c.main.pattern ? `url(#${c.main.pattern})` : c.main.base} opacity="0.85" />
          <path d={d} transform={MIRROR} fill={c.main.pattern ? `url(#${c.main.pattern})` : c.main.base} opacity="0.85" />
        </>
      );
    },
  },
  corsetFlare: {
    under: (c) => {
      const { s } = c;
      const hem = s.knee[1] + 50;
      const top = s.waist[0] + 4;
      const left = leftEdge(s, top, hem, (y, t) => 6 + t * 60);
      const skirt = symmetric(left);
      const corsetLeft = leftEdge(s, s.pit[0] + 10, s.waist[0] + 16, () => 2);
      const corset = symmetric(corsetLeft, sweetheart(s, 2));
      const bone = [0.25, 0.5, 0.75].flatMap((k) => {
        const x = s.under[1] * k;
        return [`M ${300 - x} ${s.bust[0] - 10} L ${300 - x * 0.8} ${s.waist[0] + 14}`, `M ${300 + x} ${s.bust[0] - 10} L ${300 + x * 0.8} ${s.waist[0] + 14}`];
      });
      return (
        <>
          <ellipse cx="300" cy={hem + 8} rx={s.hip[1] + 40} ry="10" fill="#000" opacity="0.16" filter="url(#global-blur-sm)" />
          <Piece id={c.id} name="flare" d={skirt} paint={c.main} folds={[-60, -30, 0, 30, 60].map((x) => `M ${300 + x * 0.4} ${top + 30} L ${300 + x * 1.2} ${hem}`)} plain={c.plain} box={box(s, top, hem, 60)} />
          <Piece id={c.id} name="corset" d={corset} paint={c.main} folds={bone} plain={c.plain} box={box(s, s.pit[0], s.waist[0])} />
          {bone.map((b, i) => (
            <path key={i} d={b} stroke={darken(c.main.base, 0.35)} strokeWidth="1" opacity="0.55" />
          ))}
        </>
      );
    },
  },
  iroBuba: {
    under: (c) => {
      const { s } = c;
      const hem = s.ankle[1] - 26;
      const top = s.waist[0] + 10;
      const left = leftEdge(s, top, hem, (y, t) => (y < s.hip[0] ? 8 : 8 + Math.max(0, s.hip[1] + 8 - bodyHalf(s, y) - 8) - t * 14));
      const iro = symmetric(left);
      const bubaHem = s.hip[0] + 24;
      const bubaLeft: Pt[] = [...shoulderLeft(s, 3), [300 - s.pit[1] - 14, s.pit[0]], [300 - s.bust[1] - 14, s.bust[0]], [300 - s.waist[1] - 18, s.waist[0]], [300 - s.hip[1] - 14, bubaHem]];
      const buba = symmetric(bubaLeft, crew(s, 26, 6));
      return (
        <>
          <Piece id={c.id} name="iro" d={iro} paint={c.main} folds={[`M ${300 - s.hip[1]} ${s.hip[0] + 10} L ${300 + s.hip[1] * 0.5} ${hem}`, `M 300 ${s.crotch} L 300 ${hem}`]} plain={c.plain} box={box(s, top, hem, 10)} />
          {/* wrapper overlap edge and the tucked knot at the waist */}
          <path d={`M ${300 - s.hip[1] * 0.2} ${top + 10} C ${300 - s.hip[1] * 0.1} ${s.crotch} ${300 + s.hip[1] * 0.25} ${s.knee[1]} ${300 + s.hip[1] * 0.35} ${hem}`} fill="none" stroke={darken(c.main.base, 0.45)} strokeWidth="1.8" opacity="0.7" />
          <path d={`M ${300 - s.waist[1] - 6} ${top + 4} l 18 6 l -6 22 Z`} fill={darken(c.main.base, 0.1)} stroke={darken(c.main.base, 0.4)} strokeWidth="1" />
          <Piece id={c.id} name="buba" d={buba} paint={c.main} folds={[`M ${300 - s.pit[1] - 6} ${s.pit[0] + 20} Q ${300 - s.waist[1]} ${s.waist[0]} ${300 - 30} ${bubaHem}`, `M ${300 + s.pit[1] + 6} ${s.pit[0] + 20} Q ${300 + s.waist[1]} ${s.waist[0]} ${300 + 30} ${bubaHem}`]} plain={c.plain} box={box(s, s.neck[0], bubaHem, 20)} />
          <path d={`M ${300 - s.neck[1] - 6} ${s.neck[0] + 4} Q 300 ${s.neck[0] + 32} ${300 + s.neck[1] + 6} ${s.neck[0] + 4}`} fill="none" stroke={`url(#${c.id('gold')})`} strokeWidth="2.4" opacity="0.8" />
        </>
      );
    },
    over: (c) => {
      const d = sleevePath(c.s, c.s.elbow[1] + 40, 26, 5);
      return (
        <>
          <Piece id={c.id} name="bubaSleeveL" d={d} paint={c.main} folds={[`M ${c.s.elbow[0] - 10} ${c.s.elbow[1] - 40} L ${c.s.elbow[0] - 24} ${c.s.elbow[1] + 30}`]} plain={c.plain} box={[100, 260, 300, 600]} />
          <g transform={MIRROR}>
            <Piece id={c.id} name="bubaSleeveR" d={d} paint={c.main} folds={[`M ${c.s.elbow[0] - 10} ${c.s.elbow[1] - 40} L ${c.s.elbow[0] - 24} ${c.s.elbow[1] + 30}`]} plain={c.plain} box={[100, 260, 300, 600]} />
          </g>
        </>
      );
    },
  },
  bubu: {
    under: () => null,
    over: (c) => {
      const { s } = c;
      const hem = s.ankle[1] - 14;
      const wing = s.wrist[0] - 26;
      const left: Pt[] = [
        ...shoulderLeft(s, 10),
        [300 - s.shoulder[1] - 40, s.shoulder[0] + 60],
        [wing, s.wrist[1] - 70],
        [wing + 6, s.wrist[1] - 6],
        [Math.min(wing + 40, 300 - s.hip[1] - 30), s.wrist[1] + 70],
        [300 - s.hip[1] - 34, s.knee[1]],
        [300 - s.hip[1] - 40, hem],
      ];
      const d = symmetric(left, crew(s, 30, 8));
      const folds = [
        `M ${300 - s.shoulder[1] * 0.6} ${s.shoulder[0] + 20} L ${wing + 30} ${s.wrist[1] - 40}`,
        `M ${300 + s.shoulder[1] * 0.6} ${s.shoulder[0] + 20} L ${600 - wing - 30} ${s.wrist[1] - 40}`,
        `M 260 ${s.hip[0]} L 250 ${hem}`,
        `M 340 ${s.hip[0]} L 350 ${hem}`,
        `M 300 ${s.bust[0] + 40} L 300 ${hem}`,
      ];
      return (
        <>
          <Piece id={c.id} name="bubu" d={d} paint={c.main} folds={folds} plain={c.plain} box={[wing, 600 - wing, s.neck[0], hem]} />
          <path d={`M ${300 - s.neck[1] - 8} ${s.neck[0] + 4} Q 300 ${s.neck[0] + 36} ${300 + s.neck[1] + 8} ${s.neck[0] + 4}`} fill="none" stroke={`url(#${c.id('gold')})`} strokeWidth="2.4" opacity="0.8" />
        </>
      );
    },
  },
  cropBaggyJeans: {
    under: (c) => {
      const { s } = c;
      const top = s.waist[0] + 18;
      const hem = s.ankle[1] + 38;
      const jeans = trousers(s, top, hem, { ease: 18, easeIn: 10, flare: 14 });
      return (
        <>
          <Piece id={c.id} name="jeans" d={jeans} paint={c.denim} folds={[`M 300 ${s.crotch} L 300 ${hem}`, `M ${300 - s.hip[1] * 0.55} ${s.knee[1] - 30} q 16 8 34 0`, `M ${300 + s.hip[1] * 0.55 - 34} ${s.knee[1] - 30} q 16 8 34 0`]} plain={c.plain} box={box(s, top, hem, 20)} />
          <JeansDetails s={s} top={top} paint={c.denim} />
          {camiPiece(c, c.main, s.under[0] + 22, 'crop2')}
        </>
      );
    },
  },
  jumpsuit: {
    under: (c) => {
      const { s } = c;
      const hem = s.ankle[1] + 30;
      const legs = trousers(s, s.waist[0], hem, { ease: 14, easeIn: 8, flare: 24 });
      const [ny, nh] = s.neck;
      const bodiceLeft = leftEdge(s, s.pit[0] + 10, s.waist[0] + 20, () => 3);
      const halter: Pt[] = [[300 + s.pit[1] - 3, s.pit[0] + 10], [300 + nh + 8, ny + 8], [300, s.bust[0] - 4], [300 - nh - 8, ny + 8], [300 - s.pit[1] + 3, s.pit[0] + 10]];
      const bodice = symmetric(bodiceLeft, halter);
      return (
        <>
          <Piece id={c.id} name="jsLegs" d={legs} paint={c.main} folds={[`M 300 ${s.crotch} L 300 ${hem}`, `M ${edgeXAt(s.legOuter, 800) + 20} 800 L ${edgeXAt(s.legOuter, hem) + 10} ${hem}`, `M ${600 - edgeXAt(s.legOuter, 800) - 20} 800 L ${600 - edgeXAt(s.legOuter, hem) - 10} ${hem}`]} plain={c.plain} box={box(s, s.waist[0], hem, 30)} />
          <Piece id={c.id} name="jsTop" d={bodice} paint={c.main} folds={[`M 300 ${s.bust[0] - 4} L 300 ${s.waist[0]}`]} plain={c.plain} box={box(s, s.pit[0], s.waist[0])} />
          <rect x={300 - s.waist[1] - 8} y={s.waist[0] + 6} width={(s.waist[1] + 8) * 2} height="12" fill={darken(c.main.base, 0.25)} />
          <rect x="292" y={s.waist[0] + 4} width="16" height="16" rx="2" fill="none" stroke={`url(#${c.id('gold')})`} strokeWidth="2.4" />
        </>
      );
    },
  },
  // ---- men ----------------------------------------------------------------
  shirtTrousers: {
    under: (c) => (
      <>
        {trouserPiece(c, c.accent, 'trousers')}
        {shirtPiece(c, c.main, true)}
      </>
    ),
    over: (c) => sleeves(c, c.main, c.s.wrist[1] - 12, true),
  },
  teeJeans: {
    under: (c) => {
      const { s } = c;
      const top = s.waist[0] + 10;
      const hem = s.ankle[1] - 6;
      const jeans = trousers(s, top, hem, { ease: 10, easeIn: 4 });
      const teeHem = s.waist[0] + 44;
      const left: Pt[] = [...shoulderLeft(s), [300 - s.pit[1] - 8, s.pit[0]], [300 - s.bust[1] - 8, s.bust[0]], [300 - s.waist[1] - 8, s.waist[0]], [300 - s.waist[1] - 10, teeHem]];
      const tee = symmetric(left, crew(s, 18));
      return (
        <>
          <Piece id={c.id} name="jeansM" d={jeans} paint={c.denim} folds={[`M 300 ${s.crotch} L 300 ${hem}`, `M ${edgeXAt(s.legOuter, hem) + 6} ${hem - 30} q 20 10 40 0`, `M ${600 - edgeXAt(s.legOuter, hem) - 46} ${hem - 30} q 20 10 40 0`]} plain={c.plain} box={box(s, top, hem, 20)} />
          <JeansDetails s={s} top={top} paint={c.denim} />
          <Piece id={c.id} name="tee" d={tee} paint={c.main} folds={[`M ${300 - s.pit[1]} ${s.pit[0] + 20} Q ${300 - s.waist[1] + 6} ${s.under[0] + 30} 262 ${teeHem}`, `M ${300 + s.pit[1]} ${s.pit[0] + 20} Q ${300 + s.waist[1] - 6} ${s.under[0] + 30} 338 ${teeHem}`]} plain={c.plain} box={box(s, s.neck[0], teeHem)} />
          <path d={`M ${300 - s.neck[1] - 6} ${s.neck[0] + 2} Q 300 ${s.neck[0] + 22} ${300 + s.neck[1] + 6} ${s.neck[0] + 2}`} fill="none" stroke={darken(c.main.base, 0.3)} strokeWidth="3" />
        </>
      );
    },
    over: (c) => sleeves(c, c.main, c.s.shoulder[0] + 96, false, 10),
  },
  senator: {
    under: (c) => (
      <>
        {trouserPiece(c, c.main, 'senTrousers')}
        {tunicPiece(c, c.main, c.s.knee[1] - 20, 'tunic')}
      </>
    ),
    over: (c) => sleeves(c, c.main, c.s.wrist[1] - 10, false),
  },
  agbada: {
    under: (c) => (
      <>
        {trouserPiece(c, c.accent, 'agTrousers')}
        {tunicPiece(c, c.accent, c.s.knee[1] + 40, 'agInner')}
      </>
    ),
    over: (c) => {
      const { s } = c;
      const hem = s.ankle[1] - 150;
      const [ny, nh] = s.neck;
      const [sy, sh] = s.shoulder;
      const left: Pt[] = [[300 - nh - 6, ny + 2], [300 - sh * 0.6, ny + 6], [300 - sh - 30, sy + 6], [300 - sh - 70, sy + 50], [300 - sh - 80, sy + 160], [300 - sh - 84, 760], [300 - sh - 80, hem]];
      const neck: Pt[] = [[300 + nh + 6, ny + 2], [300 + 22, s.bust[0] + 10], [300, s.bust[0] + 40], [300 - 22, s.bust[0] + 10], [300 - nh - 6, ny + 2]];
      const robe = symmetric(left, neck);
      const folds = [
        `M ${300 - sh * 0.7} ${sy + 10} L ${300 - sh - 60} ${sy + 120}`,
        `M ${300 + sh * 0.7} ${sy + 10} L ${300 + sh + 60} ${sy + 120}`,
        `M ${300 - sh - 40} ${sy + 160} L ${300 - sh - 50} ${hem}`,
        `M ${300 + sh + 40} ${sy + 160} L ${300 + sh + 50} ${hem}`,
        `M ${300 - 60} ${s.waist[0]} L ${300 - 70} ${hem}`,
        `M ${300 + 60} ${s.waist[0]} L ${300 + 70} ${hem}`,
      ];
      return (
        <>
          <Piece id={c.id} name="agbada" d={robe} paint={c.main} folds={folds} plain={c.plain} box={[300 - sh - 84, 300 + sh + 84, ny, hem]} />
          {/* embroidered chest panel */}
          <rect x="250" y={s.bust[0] + 50} width="100" height="90" rx="6" fill="none" stroke={`url(#${c.id('gold')})`} strokeWidth="2.6" opacity="0.85" />
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M ${270 + i * 30} ${s.bust[0] + 70} l 10 12 l -10 12 l -10 -12 Z`} fill="none" stroke={`url(#${c.id('gold')})`} strokeWidth="1.8" opacity="0.85" />
          ))}
          <path d={`M ${300 - 24} ${s.bust[0] + 8} L 300 ${s.bust[0] + 44} L ${300 + 24} ${s.bust[0] + 8}`} fill="none" stroke={`url(#${c.id('gold')})`} strokeWidth="2.2" opacity="0.85" />
        </>
      );
    },
  },
};

export function trouserPiece(c: CutCtx, paint: FabricPaint, name: string) {
  const { s } = c;
  const top = s.waist[0] + 18;
  const hem = s.ankle[1] - 10;
  const d = trousers(s, top, hem, { ease: 10, easeIn: 3 });
  const legC = (edgeXAt(s.legOuter, 760) + s.ankle[0]) / 2;
  return (
    <>
      <Piece
        id={c.id}
        name={name}
        d={d}
        paint={paint}
        folds={[`M 300 ${s.crotch} L 300 ${hem}`, `M ${legC - 20} ${s.knee[1] + 10} q 18 8 38 -2`, `M ${600 - legC - 18} ${s.knee[1] + 10} q 18 8 38 -2`, `M ${legC - 22} ${hem - 26} q 20 10 42 0`, `M ${600 - legC - 20} ${hem - 26} q 20 10 42 0`]}
        plain={c.plain}
        box={box(s, top, hem, 20)}
      />
      <path d={`M ${legC} 770 L ${s.ankle[0]} ${hem}`} stroke={lighten(paint.base, 0.2)} strokeWidth="1.4" opacity="0.5" />
      <path d={`M ${600 - legC} 770 L ${600 - s.ankle[0]} ${hem}`} stroke={lighten(paint.base, 0.2)} strokeWidth="1.4" opacity="0.5" />
    </>
  );
}

export function shirtPiece(c: CutCtx, paint: FabricPaint, tucked: boolean) {
  const { s } = c;
  const [ny, nh] = s.neck;
  const hem = tucked ? s.waist[0] + 34 : s.waist[0] + 50;
  const left: Pt[] = [...shoulderLeft(s), [300 - s.pit[1] - 6, s.pit[0]], [300 - s.bust[1] - 6, s.bust[0]], [300 - s.under[1] - 6, s.under[0]], [300 - s.waist[1] - 5, s.waist[0]], [300 - s.waist[1] - 3, hem]];
  const neck: Pt[] = [[300 + nh + 2, ny - 4], [300 + nh * 0.5, ny + 12], [300, ny + 22], [300 - nh * 0.5, ny + 12], [300 - nh - 2, ny - 4]];
  const d = symmetric(left, neck);
  const collar = `M ${300 - nh - 4} ${ny - 10} L ${300 - 4} ${ny + 26} L ${300 - 28} ${ny + 34} L ${300 - nh - 14} ${ny + 8} Z`;
  return (
    <>
      <Piece
        id={c.id}
        name="shirt"
        d={d}
        paint={paint}
        folds={[`M ${300 - s.pit[1] + 4} ${s.pit[0] + 14} Q ${300 - s.waist[1] + 10} ${s.under[0] + 40} 260 ${s.waist[0] + 20}`, `M ${300 + s.pit[1] - 4} ${s.pit[0] + 14} Q ${300 + s.waist[1] - 10} ${s.under[0] + 40} 340 ${s.waist[0] + 20}`, ...(tucked ? [-48, -16, 16, 48].map((x) => `M ${300 + x} ${s.waist[0] + 6} q 3 12 0 26`) : [])]}
        plain={c.plain}
        box={box(s, ny, hem)}
      />
      <path d={`M 300 ${ny + 22} L 300 ${hem}`} stroke={darken(paint.base, 0.25)} strokeWidth="1.4" opacity="0.7" />
      {Array.from({ length: 5 }, (_, i) => ny + 44 + i * ((s.waist[0] - ny - 30) / 5)).map((y) => (
        <circle key={y} cx="303" cy={y} r="2.6" fill={lighten(paint.base, 0.55)} stroke={darken(paint.base, 0.4)} strokeWidth="0.6" />
      ))}
      <path d={collar} fill={lighten(paint.base, 0.06)} stroke={darken(paint.base, 0.3)} strokeWidth="1.2" />
      <path d={collar} transform={MIRROR} fill={lighten(paint.base, 0.06)} stroke={darken(paint.base, 0.3)} strokeWidth="1.2" />
      {tucked && (
        <>
          <rect x={300 - s.waist[1] - 10} y={s.waist[0] + 16} width={(s.waist[1] + 10) * 2} height="16" fill="#2A1A12" />
          <rect x="288" y={s.waist[0] + 15} width="24" height="18" rx="2" fill="none" stroke="#D4B060" strokeWidth="2.4" />
        </>
      )}
    </>
  );
}

export function tunicPiece(c: CutCtx, paint: FabricPaint, hem: number, name: string) {
  const { s } = c;
  const [ny, nh] = s.neck;
  const left: Pt[] = [...shoulderLeft(s), [300 - s.pit[1] - 8, s.pit[0]], [300 - s.bust[1] - 8, s.bust[0]], [300 - s.waist[1] - 14, s.waist[0]], [300 - s.hip[1] - 14, s.hip[0]], [300 - s.hip[1] - 18, hem]];
  const d = symmetric(left, crew(s, 14, 4));
  return (
    <>
      <Piece id={c.id} name={name} d={d} paint={paint} folds={[`M 270 ${s.hip[0]} L 262 ${hem}`, `M 330 ${s.hip[0]} L 338 ${hem}`]} plain={c.plain} box={box(s, ny, hem, 20)} />
      {/* mandarin collar and embroidered placket */}
      <path d={`M ${300 - nh - 4} ${ny} Q 300 ${ny + 14} ${300 + nh + 4} ${ny}`} fill="none" stroke={darken(paint.base, 0.35)} strokeWidth="5" />
      <path d={`M 300 ${ny + 12} L 300 ${s.waist[0]}`} stroke={darken(paint.base, 0.3)} strokeWidth="1.4" opacity="0.7" />
      {Array.from({ length: 6 }, (_, i) => ny + 30 + i * 30).map((y) => (
        <path key={y} d={`M 300 ${y - 7} l 7 7 l -7 7 l -7 -7 Z`} fill="none" stroke={lighten(paint.base, 0.45)} strokeWidth="1.2" opacity="0.8" />
      ))}
      <path d={`M ${300 - s.hip[1] - 14} ${s.hip[0] + 10} l 0 40 M ${300 + s.hip[1] + 14} ${s.hip[0] + 10} l 0 40`} stroke={darken(paint.base, 0.4)} strokeWidth="1.4" opacity="0.6" />
    </>
  );
}

export function sleeves(c: CutCtx, paint: FabricPaint, endY: number, cuff: boolean, flare = 0) {
  const d = sleevePath(c.s, endY, flare, 4);
  const one = (name: string) => (
    <>
      <Piece
        id={c.id}
        name={name}
        d={d}
        paint={paint}
        folds={[-14, 0, 12].map((dy) => `M ${c.s.elbow[0] - 18} ${c.s.elbow[1] + dy} q 16 ${6 + dy * 0.1} 34 -2`)}
        plain={c.plain}
        box={[100, 260, 300, endY]}
      />
      {cuff && <rect x={c.s.wrist[0] - 22} y={endY - 22} width="44" height="22" fill={darken(paint.base, 0.1)} clipPath={`url(#${c.id(`clip-${name}`)})`} />}
    </>
  );
  return (
    <>
      {one('sleeveL')}
      <g transform={MIRROR}>{one('sleeveR')}</g>
    </>
  );
}

export const JeansDetails: React.FC<{ s: BodySpec; top: number; paint: FabricPaint }> = ({ s, top, paint }) => {
  const stitch = '#C9963E';
  const hw = torsoHalfAt(s, top) + 4;
  return (
    <g>
      <path d={`M ${300 - hw} ${top + 12} L ${300 + hw} ${top + 12}`} stroke={stitch} strokeWidth="1" strokeDasharray="3 2" opacity="0.8" />
      <path d={`M 304 ${top + 14} C 306 ${top + 60} 306 ${s.crotch - 50} 300 ${s.crotch - 8}`} fill="none" stroke={stitch} strokeWidth="1" strokeDasharray="3 2" opacity="0.8" />
      <path d={`M ${300 - hw + 6} ${top + 16} Q ${300 - hw + 30} ${top + 40} ${300 - hw + 52} ${top + 18}`} fill="none" stroke={darken(paint.base, 0.35)} strokeWidth="1.4" />
      <path d={`M ${300 + hw - 6} ${top + 16} Q ${300 + hw - 30} ${top + 40} ${300 + hw - 52} ${top + 18}`} fill="none" stroke={darken(paint.base, 0.35)} strokeWidth="1.4" />
      <circle cx="300" cy={top + 6} r="3" fill="#B08A4A" />
    </g>
  );
};

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
export function OutfitLayer({ id, spec, outfit, plain, layer }: { id: Id; spec: BodySpec; outfit: OutfitSpec; plain: boolean; layer: 'under' | 'over' }) {
  const cut = CUTS[outfit.cut] || CUTS[spec.female ? 'camiPencil' : 'shirtTrousers'];
  const draw = layer === 'under' ? cut.under : cut.over;
  if (!draw) return null;
  const main = fabricDefs(id, `${layer}-main`, outfit.fabric, outfit.color, outfit.color2, outfit.pattern ?? 0, plain);
  const accent = fabricDefs(id, `${layer}-accent`, 'plain', outfit.color2, outfit.color2, 0, plain);
  const denimColor = outfit.cut === 'cropBaggyJeans' || outfit.cut === 'teeJeans' ? outfit.color2 : '#3C5A8A';
  const denim = fabricDefs(id, `${layer}-denim`, 'denim', denimColor, denimColor, 0, plain);
  return (
    <g>
      <defs>
        {main.defs}
        {denim.defs}
      </defs>
      {draw({ id, s: spec, main: main.paint, accent: accent.paint, denim: denim.paint, plain })}
    </g>
  );
}

