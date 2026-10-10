import React from 'react';
import { Garment, Wardrobe } from '../../types/character';
import { darken, lighten } from './color';
import { BodySpec, Pt, edgeXAt, mirrorPt, runs, torsoHalfAt } from './geometry';
import {
  CUTS,
  CutCtx,
  FabricPaint,
  JeansDetails,
  MIRROR,
  Piece,
  bodyHalf,
  box,
  crew,
  fabricDefs,
  leftEdge,
  pencilPiece,
  shoulderLeft,
  sleevePath,
  sleeves,
  straps,
  sweetheart,
  symmetric,
  trouserPiece,
  trousers,
  tunicPiece,
  shirtPiece,
  camiPiece,
} from './clothes';

/**
 * Wardrobe pieces by slot: top, bottom, dress (gowns, jumpsuits, long native sets) and outer.
 * Every piece is built from the body outline, so each one fits all four bodies.
 *
 * Draw order in `under` (before the arms): bottom, dress, top, outer body.
 * Draw order in `over` (after the arms): dress, top and outer sleeves or over-garments.
 */

type Id = (n: string) => string;
interface Ctx {
  id: Id;
  s: BodySpec;
  p: FabricPaint;
  /** Second colour as a plain fabric (trims, linings). */
  p2: FabricPaint;
  plain: boolean;
  /** Unique key for clip ids. */
  k: string;
  /** Style id of the bottom being worn (shirts tuck into trousers). */
  bottom?: string;
}
interface Build {
  under?: (c: Ctx) => React.ReactNode;
  over?: (c: Ctx) => React.ReactNode;
}

const gold = (c: Ctx) => `url(#${c.id('gold')})`;
const cut = (c: Ctx): CutCtx => ({ id: c.id, s: c.s, main: c.p, accent: c.p2, denim: c.p, plain: c.plain });

// ---------------------------------------------------------------------------
// Necklines and bodices
// ---------------------------------------------------------------------------
type Neck = 'sweetheart' | 'straight' | 'halter' | 'offShoulder' | 'crew' | 'scoop' | 'vneck' | 'deepV' | 'collar' | 'square' | 'oneShoulder';
const COVERED: Neck[] = ['crew', 'scoop', 'vneck', 'deepV', 'collar', 'square'];

const offY = (s: BodySpec) => s.shoulder[0] + 34;

/** Neck edge, running right to left. */
function neckRun(s: BodySpec, neck: Neck): Pt[] {
  const [ny, nh] = s.neck;
  const [sy, sh] = s.shoulder;
  switch (neck) {
    case 'sweetheart':
      return sweetheart(s);
    case 'straight': {
      const y = s.bust[0] - 30;
      const h = torsoHalfAt(s, y) + 3;
      return [[300 + h, y], [300, y + 4], [300 - h, y]];
    }
    case 'halter':
      return [[300 + s.pit[1] - 3, s.pit[0] + 10], [300 + nh + 8, ny + 8], [300, s.bust[0] - 4], [300 - nh - 8, ny + 8], [300 - s.pit[1] + 3, s.pit[0] + 10]];
    case 'offShoulder': {
      const y = offY(s);
      return [[300 + sh - 4, y], [300 + sh * 0.5, y + 8], [300, y + 12], [300 - sh * 0.5, y + 8], [300 - sh + 4, y]];
    }
    case 'oneShoulder':
      return [[300 + s.pit[1] - 3, s.pit[0] + 10], [300 + s.bust[1] * 0.4, s.bust[0] - 30], [300 - nh - 10, ny + 6]];
    case 'crew':
      return crew(s, 18, 6);
    case 'scoop':
      return crew(s, 56, 16);
    case 'square': {
      const w = nh + 18;
      return [[300 + w, ny + 4], [300 + w, s.bust[0] - 34], [300, s.bust[0] - 32], [300 - w, s.bust[0] - 34], [300 - w, ny + 4]];
    }
    case 'vneck':
      return [[300 + nh + 6, ny + 2], [300 + 12, s.bust[0] - 30], [300, s.bust[0] - 14], [300 - 12, s.bust[0] - 30], [300 - nh - 6, ny + 2]];
    case 'deepV':
      return [[300 + nh + 4, ny + 2], [300 + 14, s.bust[0] + 6], [300, s.under[0] + 4], [300 - 14, s.bust[0] + 6], [300 - nh - 4, ny + 2]];
    case 'collar':
      return [[300 + nh + 2, ny - 4], [300 + nh * 0.5, ny + 12], [300, ny + 22], [300 - nh * 0.5, ny + 12], [300 - nh - 2, ny - 4]];
  }
}

/** Left edge of a bodice, top to bottom, ending at hemY. */
function bodiceLeft(s: BodySpec, neck: Neck, hemY: number, ease = 3, hemEase = 0): Pt[] {
  const ez = (y: number, t: number) => ease + hemEase * t * t;
  if (COVERED.includes(neck)) {
    const sl = shoulderLeft(s, ease > 6 ? 3 : 0);
    if (neck === 'square') sl[0] = [300 - s.neck[1] - 18, s.neck[0] + 4];
    return [...sl, ...leftEdge(s, s.pit[0], hemY, ez)];
  }
  const y0 = neck === 'straight' ? s.bust[0] - 30 : neck === 'offShoulder' ? offY(s) : s.pit[0] + 10;
  return leftEdge(s, y0, hemY, ez);
}

function bodicePath(s: BodySpec, neck: Neck, hemY: number, ease = 3, hemEase = 0): string {
  const left = bodiceLeft(s, neck, hemY, ease, hemEase);
  if (neck === 'oneShoulder') {
    // asymmetric: right side strapless, left side up over the shoulder
    const right = [...leftEdge(s, s.pit[0] + 10, hemY, (y, t) => ease + hemEase * t * t)].reverse().map(mirrorPt);
    const sl = shoulderLeft(s);
    const leftSide = [sl[1], sl[2], ...leftEdge(s, s.pit[0], hemY, (y, t) => ease + hemEase * t * t)];
    return runs(leftSide, right, neckRun(s, neck));
  }
  return symmetric(left, neckRun(s, neck));
}

const bodiceFolds = (s: BodySpec, hemY: number) => [
  `M ${300 - s.pit[1] + 6} ${s.pit[0] + 20} Q ${300 - s.waist[1] + 8} ${s.under[0] + 30} ${300 - s.waist[1] * 0.6} ${hemY - 4}`,
  `M ${300 + s.pit[1] - 6} ${s.pit[0] + 20} Q ${300 + s.waist[1] - 8} ${s.under[0] + 30} ${300 + s.waist[1] * 0.6} ${hemY - 4}`,
];

/** Neck trims drawn on top of a bodice. */
function neckTrim(c: Ctx, neck: Neck) {
  const { s, p } = c;
  const [ny, nh] = s.neck;
  if (neck === 'sweetheart' || neck === 'halter') return straps(cut(c), p.base, neck === 'halter' ? 0.001 : 3.4);
  if (neck === 'collar') {
    const collar = `M ${300 - nh - 4} ${ny - 10} L ${300 - 4} ${ny + 26} L ${300 - 26} ${ny + 32} L ${300 - nh - 14} ${ny + 8} Z`;
    return (
      <>
        <path d={collar} fill={lighten(p.base, 0.06)} stroke={darken(p.base, 0.3)} strokeWidth="1.2" />
        <path d={collar} transform={MIRROR} fill={lighten(p.base, 0.06)} stroke={darken(p.base, 0.3)} strokeWidth="1.2" />
      </>
    );
  }
  if (neck === 'crew') return <path d={`M ${300 - nh - 6} ${ny + 2} Q 300 ${ny + 22} ${300 + nh + 6} ${ny + 2}`} fill="none" stroke={darken(p.base, 0.3)} strokeWidth="3" />;
  return null;
}

// ---------------------------------------------------------------------------
// Sleeves
// ---------------------------------------------------------------------------
type SleeveLen = 'none' | 'cap' | 'short' | 'puff' | 'elbow' | 'threeQuarter' | 'long' | 'bell';

function sleeveEnd(s: BodySpec, len: SleeveLen): number {
  const sy = s.shoulder[0];
  switch (len) {
    case 'cap': return sy + 56;
    case 'short': return sy + 104;
    case 'puff': return sy + 92;
    case 'elbow': return s.elbow[1] + 6;
    case 'threeQuarter': return s.elbow[1] + 80;
    default: return s.wrist[1] - 12;
  }
}

/** Sleeves on both arms. `fromY` cuts the top off (off-shoulder bands). */
function sleeveSet(c: Ctx, len: SleeveLen, o: { flare?: number; ease?: number; fromY?: number; name?: string; paint?: FabricPaint; sheer?: boolean } = {}) {
  if (len === 'none') return null;
  const { s } = c;
  const paint = o.paint || c.p;
  const end = sleeveEnd(s, len);
  const flare = o.flare ?? (len === 'bell' ? 46 : len === 'puff' ? 16 : 0);
  const d = sleevePath(s, end, flare, o.ease ?? 4);
  const name = o.name || `sl-${c.k}`;
  const clip = c.id(`${name}-cut`);
  const folds = len === 'puff'
    ? [-18, -6, 6, 18].map((dx) => `M ${s.shoulder[1] < 100 ? 300 - s.shoulder[1] + 14 + dx : 300 - s.shoulder[1] + 18 + dx} ${s.shoulder[0] + 10} q -4 30 -8 70`)
    : [-14, 0, 12].map((dy) => `M ${s.elbow[0] - 18} ${s.elbow[1] + dy} q 16 ${6 + dy * 0.1} 34 -2`);
  const one = (side: string) => (
    <g clipPath={o.fromY ? `url(#${clip})` : undefined} opacity={o.sheer ? 0.88 : 1}>
      <Piece id={c.id} name={`${name}${side}`} d={d} paint={paint} folds={folds} plain={c.plain} box={[80, 280, 300, end]} />
      {len === 'puff' && <path d={`M ${edgeXAt(s.armOuter.slice(0, 6), end) - 16} ${end - 2} L ${edgeXAt(s.armInner, end) + 4} ${end - 2}`} stroke={darken(paint.base, 0.3)} strokeWidth="3" />}
    </g>
  );
  return (
    <>
      {o.fromY && (
        <clipPath id={clip}>
          <rect x="0" y={o.fromY} width="600" height="1500" />
        </clipPath>
      )}
      {one('L')}
      <g transform={MIRROR}>{one('R')}</g>
    </>
  );
}

// ---------------------------------------------------------------------------
// Skirts
// ---------------------------------------------------------------------------
/** A skirt that flares out from the hips; below the hips it no longer follows the legs. */
function skirtPath(s: BodySpec, topY: number, hemY: number, flare: number, pow = 1.4, ease = 6): string {
  const n = Math.max(3, Math.round((hemY - topY) / 26));
  const left: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const y = topY + ((hemY - topY) * i) / n;
    let w: number;
    if (y <= s.hip[0]) w = bodyHalf(s, y) + ease;
    else w = s.hip[1] + ease + flare * ((y - s.hip[0]) / Math.max(1, hemY - s.hip[0])) ** pow;
    left.push([300 - w, y]);
  }
  const wHem = 300 - left[left.length - 1][0];
  left.push([300 - wHem * 0.5, hemY + 8], [300, hemY + 10]);
  return symmetric(left);
}

function skirtPiece(c: Ctx, name: string, topY: number, hemY: number, flare: number, o: { pow?: number; pleats?: number; paint?: FabricPaint } = {}) {
  const { s } = c;
  const paint = o.paint || c.p;
  const d = skirtPath(s, topY, hemY, flare, o.pow);
  const wHem = s.hip[1] + 6 + flare;
  const n = o.pleats ?? 5;
  const folds = Array.from({ length: n }, (_, i) => {
    const k = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    return `M ${300 + k * s.hip[1] * 0.6} ${Math.max(topY + 20, s.hip[0] - 10)} L ${300 + k * wHem * 0.8} ${hemY}`;
  });
  return (
    <>
      <ellipse cx="300" cy={hemY + 10} rx={wHem * 0.9} ry="10" fill="#000" opacity="0.15" filter="url(#global-blur-sm)" />
      <Piece id={c.id} name={name} d={d} paint={paint} folds={folds} plain={c.plain} box={[300 - wHem, 300 + wHem, topY, hemY]} />
      {(o.pleats ?? 0) > 6 &&
        folds.map((fd, i) => <path key={i} d={fd} stroke={darken(paint.base, 0.3)} strokeWidth="1" opacity="0.5" />)}
    </>
  );
}

function waistband(c: Ctx, y: number, h = 12, color?: string) {
  const w = torsoHalfAt(c.s, y + h / 2) + 7;
  return <rect x={300 - w} y={y} width={w * 2} height={h} fill={color || darken(c.p.base, 0.18)} />;
}

function belt(c: Ctx, y: number) {
  const w = torsoHalfAt(c.s, y + 8) + 8;
  return (
    <>
      <rect x={300 - w} y={y} width={w * 2} height="15" fill="#2A1A12" />
      <rect x="289" y={y - 1} width="22" height="17" rx="2" fill="none" stroke="#D4B060" strokeWidth="2.4" />
    </>
  );
}

function bow(c: Ctx, x: number, y: number) {
  const col = darken(c.p.base, 0.08);
  return (
    <g>
      <path d={`M ${x} ${y} c -18 -14 -30 -4 -22 8 c 6 6 16 2 22 -8 Z M ${x} ${y} c 18 -14 30 -4 22 8 c -6 6 -16 2 -22 -8 Z`} fill={col} stroke={darken(c.p.base, 0.4)} strokeWidth="1" />
      <path d={`M ${x - 3} ${y + 2} q -8 30 -16 60 M ${x + 3} ${y + 2} q 4 30 10 56`} stroke={col} strokeWidth="9" strokeLinecap="round" />
      <circle cx={x} cy={y} r="5" fill={darken(c.p.base, 0.2)} />
    </g>
  );
}

function trouserSet(c: Ctx, name: string, topY: number, hemY: number, o: { ease?: number; easeIn?: number; flare?: number; jeans?: boolean; cargo?: boolean; pleat?: boolean; paint?: FabricPaint } = {}) {
  const { s } = c;
  const paint = o.paint || c.p;
  const d = trousers(s, topY, hemY, o);
  const legC = (edgeXAt(s.legOuter, 780) + s.knee[0]) / 2;
  const folds = [`M 300 ${s.crotch} L 300 ${hemY}`, `M ${legC - 16} ${s.knee[1] - 10} q 16 8 34 0`, `M ${600 - legC - 18} ${s.knee[1] - 10} q 16 8 34 0`];
  if ((o.flare ?? 0) > 20) folds.push(`M ${legC} ${s.knee[1]} L ${legC - 24} ${hemY}`, `M ${600 - legC} ${s.knee[1]} L ${600 - legC + 24} ${hemY}`);
  return (
    <>
      <Piece id={c.id} name={name} d={d} paint={paint} folds={folds} plain={c.plain} box={box(s, topY, hemY, 30)} />
      {o.jeans && <JeansDetails s={s} top={topY} paint={paint} />}
      {o.pleat && (
        <>
          <path d={`M ${legC} ${topY + 20} L ${(edgeXAt(s.legOuter, hemY) + edgeXAt(s.legInner, hemY)) / 2} ${hemY}`} stroke={lighten(paint.base, 0.2)} strokeWidth="1.4" opacity="0.5" />
          <path d={`M ${600 - legC} ${topY + 20} L ${600 - (edgeXAt(s.legOuter, hemY) + edgeXAt(s.legInner, hemY)) / 2} ${hemY}`} stroke={lighten(paint.base, 0.2)} strokeWidth="1.4" opacity="0.5" />
        </>
      )}
      {o.cargo &&
        [0, 1].map((m) => (
          <g key={m} transform={m ? MIRROR : undefined}>
            <rect x={edgeXAt(s.legOuter, s.knee[1] - 120) - 2} y={s.knee[1] - 130} width="40" height="54" rx="4" fill={darken(paint.base, 0.06)} stroke={darken(paint.base, 0.35)} strokeWidth="1.4" />
            <path d={`M ${edgeXAt(s.legOuter, s.knee[1] - 120) - 2} ${s.knee[1] - 116} l 40 0`} stroke={darken(paint.base, 0.35)} strokeWidth="1.4" />
          </g>
        ))}
      {!o.jeans && waistband({ ...c, p: paint }, topY, 12)}
    </>
  );
}

// ---------------------------------------------------------------------------
// Tops (women)
// ---------------------------------------------------------------------------
function top(neck: Neck, hem: (s: BodySpec) => number, o: { sleeve?: SleeveLen; ease?: number; hemEase?: number; flare?: number; sheer?: boolean; extra?: (c: Ctx, hemY: number) => React.ReactNode; offBand?: boolean } = {}): Build {
  return {
    under: (c) => {
      const hemY = hem(c.s);
      const d = bodicePath(c.s, neck, hemY, o.ease ?? 3, o.hemEase ?? 0);
      return (
        <g opacity={o.sheer ? 0.92 : 1}>
          <Piece id={c.id} name={`top-${c.k}`} d={d} paint={c.p} folds={bodiceFolds(c.s, hemY)} plain={c.plain} box={box(c.s, c.s.neck[0], hemY, 20)} />
          {neckTrim(c, neck)}
          {o.extra?.(c, hemY)}
        </g>
      );
    },
    over: (c) => (
      <>
        {neck === 'offShoulder' && sleeveSet(c, o.sleeve && o.sleeve !== 'none' ? o.sleeve : 'cap', { fromY: offY(c.s), flare: o.flare, ease: 5 })}
        {neck !== 'offShoulder' && o.sleeve && sleeveSet(c, o.sleeve, { flare: o.flare, sheer: o.sheer })}
      </>
    ),
  };
}

const H = {
  crop: (s: BodySpec) => s.under[0] + 22,
  midCrop: (s: BodySpec) => s.under[0] + 46,
  waist: (s: BodySpec) => s.waist[0] + 30,
  hip: (s: BodySpec) => s.hip[0] - 10,
  long: (s: BodySpec) => s.hip[0] + 24,
};

function peplum(c: Ctx, hemY: number) {
  const { s } = c;
  const top = s.waist[0] + 6;
  const d = skirtPath(s, top, s.hip[0] + 4, 36, 1, 6);
  return (
    <>
      <Piece id={c.id} name={`peplum-${c.k}`} d={d} paint={c.p} folds={[-40, -14, 14, 40].map((x) => `M ${300 + x * 0.6} ${top + 10} L ${300 + x * 1.5} ${s.hip[0]}`)} plain={c.plain} box={box(s, top, s.hip[0], 40)} />
      <path d={`M ${300 - torsoHalfAt(s, top) - 4} ${top} L ${300 + torsoHalfAt(s, top) + 4} ${top}`} stroke={darken(c.p.base, 0.35)} strokeWidth="1.6" />
    </>
  );
}

function wrapLine(c: Ctx, hemY: number) {
  const { s } = c;
  return (
    <>
      <path d={`M ${300 + s.neck[1] + 4} ${s.neck[0] + 4} C ${300 + 10} ${s.bust[0]} ${300 - s.waist[1] * 0.5} ${s.under[0] + 20} ${300 - s.waist[1] - 2} ${s.waist[0] + 6}`} fill="none" stroke={darken(c.p.base, 0.4)} strokeWidth="1.8" opacity="0.75" />
      {bow(c, 300 - s.waist[1] + 4, s.waist[0] + 8)}
    </>
  );
}

function buttons(c: Ctx, y0: number, y1: number, n = 5) {
  return (
    <>
      <path d={`M 300 ${y0 - 8} L 300 ${y1}`} stroke={darken(c.p.base, 0.25)} strokeWidth="1.4" opacity="0.7" />
      {Array.from({ length: n }, (_, i) => y0 + ((y1 - y0) * i) / Math.max(1, n - 1)).map((y) => (
        <circle key={y} cx="304" cy={y} r="2.6" fill={lighten(c.p.base, 0.5)} stroke={darken(c.p.base, 0.4)} strokeWidth="0.6" />
      ))}
    </>
  );
}

function corsetBones(c: Ctx, y1: number) {
  const { s } = c;
  return [0.25, 0.5, 0.75].flatMap((k) => {
    const x = s.under[1] * k;
    return [`M ${300 - x} ${s.bust[0] - 6} L ${300 - x * 0.8} ${y1}`, `M ${300 + x} ${s.bust[0] - 6} L ${300 + x * 0.8} ${y1}`];
  }).map((d, i) => <path key={i} d={d} stroke={darken(c.p.base, 0.35)} strokeWidth="1" opacity="0.55" />);
}

function embroidery(c: Ctx, y: number, w = 30) {
  const { s } = c;
  const [ny, nh] = s.neck;
  return (
    <>
      <path d={`M ${300 - nh - 6} ${ny + 4} Q 300 ${y} ${300 + nh + 6} ${ny + 4}`} fill="none" stroke={gold(c)} strokeWidth="2.4" opacity="0.85" />
      {[-1, 0, 1].map((i) => (
        <path key={i} d={`M ${300 + i * w * 0.6} ${y + 6} l 6 8 l -6 8 l -6 -8 Z`} fill="none" stroke={gold(c)} strokeWidth="1.4" opacity="0.8" />
      ))}
    </>
  );
}

/** Loose buba (women's and men's): roomy body, crew neck, gold trim. */
function bubaBuild(hemFn: (s: BodySpec) => number, sleeve: SleeveLen, flare: number, ease = 14): Build {
  return {
    under: (c) => {
      const { s } = c;
      const hemY = hemFn(s);
      const left: Pt[] = [...shoulderLeft(s, 3), [300 - s.pit[1] - ease, s.pit[0]], [300 - s.bust[1] - ease, s.bust[0]], [300 - s.waist[1] - ease - 4, s.waist[0]], [300 - Math.max(s.hip[1], s.waist[1] + 10) - ease, hemY]];
      const d = symmetric(left, crew(s, 26, 6));
      return (
        <>
          <Piece id={c.id} name={`buba-${c.k}`} d={d} paint={c.p} folds={[`M ${300 - s.pit[1] - 6} ${s.pit[0] + 20} Q ${300 - s.waist[1]} ${s.waist[0]} 270 ${hemY}`, `M ${300 + s.pit[1] + 6} ${s.pit[0] + 20} Q ${300 + s.waist[1]} ${s.waist[0]} 330 ${hemY}`]} plain={c.plain} box={box(s, s.neck[0], hemY, 20)} />
          {embroidery(c, s.neck[0] + 30)}
        </>
      );
    },
    over: (c) => sleeveSet(c, sleeve, { flare, ease: 6 }),
  };
}

// ---------------------------------------------------------------------------
// Dresses
// ---------------------------------------------------------------------------
function dress(neck: Neck, o: { hem: (s: BodySpec) => number; flare: number; pow?: number; from?: 'waist' | 'hip'; fitted?: boolean; sleeve?: SleeveLen; sleeveFlare?: number; pleats?: number; slit?: boolean; extra?: (c: Ctx) => React.ReactNode; bodiceHem?: (s: BodySpec) => number }): Build {
  return {
    under: (c) => {
      const { s } = c;
      const hemY = o.hem(s);
      const bodiceHem = o.bodiceHem ? o.bodiceHem(s) : s.waist[0] + 20;
      const skirtTop = o.from === 'hip' ? s.hhip[0] : s.waist[0] + 6;
      let skirt: React.ReactNode;
      if (o.fitted) {
        const left = leftEdge(s, skirtTop, hemY, (y, t) => 4 + o.flare * t ** (o.pow ?? 2));
        skirt = <Piece id={c.id} name={`skirt-${c.k}`} d={symmetric(left)} paint={c.p} folds={[`M 300 ${s.crotch} L 300 ${hemY}`, `M ${300 - s.hip[1] + 12} ${s.hip[0]} Q 260 ${s.crotch + 40} 282 ${s.knee[1]}`, `M ${300 + s.hip[1] - 12} ${s.hip[0]} Q 340 ${s.crotch + 40} 318 ${s.knee[1]}`]} plain={c.plain} box={box(s, skirtTop, hemY, o.flare)} />;
      } else {
        skirt = skirtPiece(c, `skirt-${c.k}`, skirtTop, hemY, o.flare, { pow: o.pow, pleats: o.pleats });
      }
      const slitId = c.id(`slit-${c.k}`);
      const slitX = edgeXAt(s.legOuter, s.knee[1]) + 26;
      return (
        <>
          {o.slit && (
            <mask id={slitId} maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="1600">
              <rect x="0" y="0" width="600" height="1600" fill="#FFF" />
              <path d={`M ${slitX - 6} ${s.crotch + 70} C ${slitX - 22} ${s.knee[1]} ${slitX - 40} ${hemY - 100} ${slitX - 60} ${hemY + 20} L ${slitX + 34} ${hemY + 20} C ${slitX + 20} ${hemY - 140} ${slitX + 6} ${s.knee[1]} ${slitX - 6} ${s.crotch + 70} Z`} fill="#000" />
            </mask>
          )}
          <g mask={o.slit ? `url(#${slitId})` : undefined}>{skirt}</g>
          <Piece id={c.id} name={`bodice-${c.k}`} d={bodicePath(s, neck, bodiceHem)} paint={c.p} folds={bodiceFolds(s, bodiceHem)} plain={c.plain} box={box(s, s.neck[0], bodiceHem, 10)} />
          {neckTrim(c, neck)}
          {o.extra?.(c)}
        </>
      );
    },
    over: (c) => (
      <>
        {neck === 'offShoulder' && sleeveSet(c, o.sleeve && o.sleeve !== 'none' ? o.sleeve : 'cap', { fromY: offY(c.s), flare: o.sleeveFlare, ease: 5 })}
        {neck !== 'offShoulder' && o.sleeve && sleeveSet(c, o.sleeve, { flare: o.sleeveFlare })}
      </>
    ),
  };
}

const D = {
  mini: (s: BodySpec) => s.crotch + 110,
  aboveKnee: (s: BodySpec) => s.knee[1] - 40,
  knee: (s: BodySpec) => s.knee[1] + 20,
  midi: (s: BodySpec) => s.knee[1] + 130,
  maxi: (s: BodySpec) => s.ankle[1] - 10,
  floor: (s: BodySpec) => s.ankle[1] + 40,
};

function laceYoke(c: Ctx) {
  const { s } = c;
  const [ny, nh] = s.neck;
  const yoke = runs(
    [[300 - nh - 4, ny + 4], [300 - s.shoulder[1] * 0.6, ny + 12], [300 - s.pit[1] + 3, s.pit[0] + 10]],
    [[300 - s.bust[1] * 0.5, s.bust[0] - 34], [300, s.bust[0] - 14], [300 + s.bust[1] * 0.5, s.bust[0] - 34]],
    [[300 + s.pit[1] - 3, s.pit[0] + 10], [300 + s.shoulder[1] * 0.6, ny + 12], [300 + nh + 4, ny + 4]],
  );
  return (
    <>
      <path d={yoke} fill={c.p.pattern ? `url(#${c.p.pattern})` : c.p.base} opacity="0.85" />
      <path d={yoke} fill={c.p.base} opacity="0.18" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Jackets
// ---------------------------------------------------------------------------
function jacket(o: { hem: (s: BodySpec) => number; lapels?: boolean; collar?: 'notch' | 'shirt' | 'none'; ease?: number; sleeve?: SleeveLen; sleeveFlare?: number; sheer?: boolean; belt?: boolean; zip?: boolean; pockets?: boolean; opening?: number; flare?: number }): Build {
  return {
    under: (c) => {
      const { s, p } = c;
      const hemY = o.hem(s);
      const e = o.ease ?? 8;
      const [ny, nh] = s.neck;
      const open = o.opening ?? 30;
      const outer: Pt[] = [
        [300 - nh - 4, ny],
        [300 - s.shoulder[1] * 0.56, ny + 4],
        [300 - s.shoulder[1] - 4, s.shoulder[0]],
        [300 - s.pit[1] - e, s.pit[0]],
        ...leftEdge(s, s.bust[0], hemY, (y, t) => e + (o.flare ?? 0) * t * t, 40),
      ];
      const inner: Pt[] = [
        [300 - open + 4, hemY],
        [300 - open, s.waist[0]],
        [300 - open + 6, s.bust[0]],
        [300 - nh + 2, ny + 6],
      ];
      const d = runs(outer, inner);
      const panel = (side: string) => (
        <g opacity={o.sheer ? 0.88 : 1}>
          <Piece id={c.id} name={`jk-${c.k}${side}`} d={d} paint={p} folds={[`M ${300 - s.pit[1] + 2} ${s.pit[0] + 20} Q ${300 - s.waist[1] - 2} ${s.waist[0]} ${300 - s.waist[1] + 10} ${hemY}`]} plain={c.plain} box={[300 - s.hip[1] - 40, 300, ny, hemY]} />
          {o.lapels && <path d={`M ${300 - nh + 2} ${ny + 4} L ${300 - nh - 22} ${s.pit[0] + 20} L ${300 - open - 2} ${s.bust[0] + 20} L ${300 - open + 6} ${s.bust[0]} Z`} fill={darken(p.base, 0.12)} stroke={darken(p.base, 0.4)} strokeWidth="1.2" />}
          {o.collar === 'shirt' && <path d={`M ${300 - nh - 4} ${ny - 6} L ${300 - nh + 6} ${ny + 30} L ${300 - nh - 30} ${s.pit[0] - 10} L ${300 - nh - 20} ${ny + 4} Z`} fill={darken(p.base, 0.1)} stroke={darken(p.base, 0.4)} strokeWidth="1.2" />}
          {o.pockets && (
            <>
              <rect x={300 - s.bust[1] * 0.75} y={s.bust[0] - 20} width="34" height="30" rx="3" fill="none" stroke={darken(p.base, 0.4)} strokeWidth="1.4" />
              <path d={`M ${300 - s.bust[1] * 0.75} ${s.bust[0] - 10} l 34 0`} stroke={darken(p.base, 0.4)} strokeWidth="1.4" />
            </>
          )}
          {o.zip && <path d={`M ${300 - open + 3} ${s.bust[0] + 10} L ${300 - open + 6} ${hemY}`} stroke="#B8B8C0" strokeWidth="2" strokeDasharray="2 2" />}
        </g>
      );
      return (
        <>
          {panel('L')}
          <g transform={MIRROR}>{panel('R')}</g>
          {o.belt && (
            <>
              <rect x={300 - torsoHalfAt(s, s.waist[0]) - e} y={s.waist[0]} width={(torsoHalfAt(s, s.waist[0]) + e) * 2} height="16" fill={darken(p.base, 0.1)} stroke={darken(p.base, 0.4)} strokeWidth="1" />
              {bow(c, 300 - 20, s.waist[0] + 8)}
            </>
          )}
          {o.lapels && !o.belt && <circle cx={300 - open + 10} cy={s.waist[0] - 6} r="3.4" fill={darken(p.base, 0.4)} />}
        </>
      );
    },
    over: (c) => sleeveSet(c, o.sleeve || 'long', { flare: o.sleeveFlare, ease: 9, name: `jks-${c.k}`, sheer: o.sheer }),
  };
}

// ---------------------------------------------------------------------------
// Men
// ---------------------------------------------------------------------------
function mensTop(kind: 'tee' | 'polo' | 'hoodie' | 'dashiki' | 'shirt'): Build {
  return {
    under: (c) => {
      const { s, p } = c;
      if (kind === 'shirt') {
        const tucked = c.bottom === 'trousers' || c.bottom === 'chinos';
        return shirtPiece(cut(c), p, tucked);
      }
      const hemY = kind === 'hoodie' ? s.hip[0] - 4 : kind === 'dashiki' ? s.hip[0] + 20 : s.waist[0] + 44;
      const e = kind === 'dashiki' ? 16 : kind === 'hoodie' ? 12 : 8;
      const left: Pt[] = [...shoulderLeft(s), [300 - s.pit[1] - e, s.pit[0]], [300 - s.bust[1] - e, s.bust[0]], [300 - s.waist[1] - e, s.waist[0]], [300 - s.waist[1] - e - 2, hemY]];
      const neck = kind === 'dashiki' ? neckRun(s, 'vneck') : crew(s, kind === 'polo' ? 10 : 18);
      const d = symmetric(left, neck);
      const [ny, nh] = s.neck;
      return (
        <>
          <Piece id={c.id} name={`mt-${c.k}`} d={d} paint={p} folds={bodiceFolds(s, hemY)} plain={c.plain} box={box(s, ny, hemY)} />
          {kind === 'tee' && <path d={`M ${300 - nh - 6} ${ny + 2} Q 300 ${ny + 22} ${300 + nh + 6} ${ny + 2}`} fill="none" stroke={darken(p.base, 0.3)} strokeWidth="3" />}
          {kind === 'polo' && (
            <>
              {neckTrim(c, 'collar')}
              {buttons(c, ny + 26, ny + 60, 2)}
            </>
          )}
          {kind === 'hoodie' && (
            <>
              <path d={`M ${300 - nh - 28} ${ny + 20} C ${300 - nh - 30} ${ny - 18} ${300 - nh} ${ny - 26} ${300 - nh + 4} ${ny + 4} Q 300 ${ny + 30} ${300 + nh - 4} ${ny + 4} C ${300 + nh} ${ny - 26} ${300 + nh + 30} ${ny - 18} ${300 + nh + 28} ${ny + 20} Q 300 ${ny + 56} ${300 - nh - 28} ${ny + 20} Z`} fill={darken(p.base, 0.1)} stroke={darken(p.base, 0.4)} strokeWidth="1.2" />
              <path d={`M 290 ${ny + 34} l -4 70 M 310 ${ny + 34} l 4 70`} stroke={lighten(p.base, 0.5)} strokeWidth="2.4" strokeLinecap="round" />
              <path d={`M ${300 - s.waist[1] * 0.6} ${hemY - 10} L ${300 - s.waist[1] * 0.5} ${s.waist[0] - 30} L ${300 + s.waist[1] * 0.5} ${s.waist[0] - 30} L ${300 + s.waist[1] * 0.6} ${hemY - 10}`} fill="none" stroke={darken(p.base, 0.35)} strokeWidth="1.6" />
              <rect x={300 - s.waist[1] - e - 2} y={hemY - 14} width={(s.waist[1] + e + 2) * 2} height="14" fill={darken(p.base, 0.12)} />
            </>
          )}
          {kind === 'dashiki' && (
            <>
              <path d={`M ${300 - nh - 6} ${ny + 2} L 300 ${s.bust[0] - 14} L ${300 + nh + 6} ${ny + 2} L ${300 + nh + 34} ${ny + 8} Q 330 ${s.bust[0] + 40} 300 ${s.bust[0] + 46} Q 270 ${s.bust[0] + 40} ${300 - nh - 34} ${ny + 8} Z`} fill={c.p2.base} opacity="0.92" />
              <path d={`M ${300 - nh - 34} ${ny + 8} Q 270 ${s.bust[0] + 40} 300 ${s.bust[0] + 46} Q 330 ${s.bust[0] + 40} ${300 + nh + 34} ${ny + 8}`} fill="none" stroke={gold(c)} strokeWidth="3" />
              <path d={`M ${300 - nh - 6} ${ny + 2} L 300 ${s.bust[0] - 14} L ${300 + nh + 6} ${ny + 2}`} fill="none" stroke={gold(c)} strokeWidth="2.4" />
              <rect x={300 - s.waist[1] - e - 2} y={hemY - 20} width={(s.waist[1] + e + 2) * 2} height="12" fill={c.p2.base} opacity="0.9" />
            </>
          )}
        </>
      );
    },
    over: (c) => {
      if (kind === 'shirt') return sleeves(cut(c), c.p, c.s.wrist[1] - 12, true);
      if (kind === 'hoodie') return sleeveSet(c, 'long', { ease: 7 });
      if (kind === 'dashiki') return sleeveSet(c, 'short', { flare: 22, ease: 7 });
      return sleeveSet(c, 'short', { flare: 6 });
    },
  };
}

const cutBuild = (key: string, part: 'top' | 'all' = 'all'): Build => ({
  under: (c) => CUTS[key].under(cut(c)),
  over: (c) => CUTS[key].over?.(cut(c)) ?? null,
});

// ---------------------------------------------------------------------------
// The registry
// ---------------------------------------------------------------------------
export const GARMENTS: Record<string, Build> = {
  // ---- women's tops ----
  camisole: { under: (c) => camiPiece(cut(c), c.p, c.s.waist[0] + 18, `cami-${c.k}`) },
  cropTop: { under: (c) => camiPiece(cut(c), c.p, H.crop(c.s), `crop-${c.k}`) },
  tubeTop: top('straight', H.crop, { extra: (c, y) => <path d={`M ${300 - torsoHalfAt(c.s, c.s.bust[0] - 26) - 3} ${c.s.bust[0] - 26} Q 300 ${c.s.bust[0] - 20} ${300 + torsoHalfAt(c.s, c.s.bust[0] - 26) + 3} ${c.s.bust[0] - 26}`} fill="none" stroke={darken(c.p.base, 0.3)} strokeWidth="2" /> }),
  corsetTop: top('sweetheart', (s) => s.waist[0] + 24, { ease: 2, extra: (c, y) => corsetBones(c, y - 6) }),
  offShoulderTop: top('offShoulder', H.midCrop, { sleeve: 'elbow', flare: 14, ease: 4 }),
  halterTop: top('halter', H.crop, {}),
  tshirt: top('crew', H.hip, { sleeve: 'short', ease: 8 }),
  cropTee: top('crew', H.crop, { sleeve: 'short', ease: 5 }),
  blouse: top('collar', H.waist, { sleeve: 'long', ease: 6, extra: (c, y) => buttons(c, c.s.neck[0] + 40, y - 12) }),
  peplumTop: top('square', (s) => s.waist[0] + 10, { sleeve: 'cap', extra: (c, y) => peplum(c, y) }),
  wrapTop: top('vneck', H.waist, { sleeve: 'threeQuarter', ease: 4, extra: (c, y) => wrapLine(c, y) }),
  buba: bubaBuild((s) => s.hip[0] + 24, 'threeQuarter', 26),
  laceBlouse: top('scoop', (s) => s.hip[0] - 4, { sleeve: 'threeQuarter', flare: 10, ease: 6, sheer: true, extra: (c, y) => <path d={`M ${300 - torsoHalfAt(c.s, y)} ${y - 4} q 10 10 20 0 q 10 10 20 0 q 10 10 20 0 q 10 10 20 0 q 10 10 20 0 q 10 10 20 0 q 10 10 20 0 q 10 10 20 0 q 10 10 20 0 q 10 10 20 0 q 10 10 20 0`} fill="none" stroke={darken(c.p.base, 0.3)} strokeWidth="1.4" /> }),
  offShoulderBuba: top('offShoulder', (s) => s.hip[0] - 6, { sleeve: 'bell', flare: 50, ease: 10, hemEase: 8, extra: (c) => <path d={`M ${300 - c.s.shoulder[1] + 4} ${offY(c.s) + 6} Q 300 ${offY(c.s) + 20} ${300 + c.s.shoulder[1] - 4} ${offY(c.s) + 6}`} fill="none" stroke={gold(c)} strokeWidth="2.6" /> }),

  // ---- women's bottoms ----
  pencilSkirt: { under: (c) => pencilPiece(cut(c), c.p, c.s.waist[0] + 8, c.s.knee[1] - 24, `pencil-${c.k}`) },
  miniSkirt: { under: (c) => pencilPiece(cut(c), c.p, c.s.waist[0] + 16, c.s.crotch + 92, `mini-${c.k}`, 16) },
  aLineSkirt: { under: (c) => <>{skirtPiece(c, `aline-${c.k}`, c.s.waist[0] + 6, c.s.knee[1] - 10, 56, { pow: 1 })}{waistband(c, c.s.waist[0] + 6)}</> },
  pleatedMidi: { under: (c) => <>{skirtPiece(c, `pleat-${c.k}`, c.s.waist[0] + 6, D.midi(c.s), 70, { pow: 1, pleats: 13 })}{waistband(c, c.s.waist[0] + 6)}</> },
  maxiSkirt: { under: (c) => <>{skirtPiece(c, `maxi-${c.k}`, c.s.waist[0] + 6, D.maxi(c.s), 60, { pow: 1.2, pleats: 7 })}{waistband(c, c.s.waist[0] + 6, 16)}</> },
  iro: { under: (c) => iroPiece(c, false) },
  georgeWrapper: { under: (c) => iroPiece(c, true) },
  skinnyJeans: { under: (c) => trouserSet(c, `sj-${c.k}`, c.s.waist[0] + 14, c.s.ankle[1] - 20, { ease: 3, easeIn: 1, jeans: true }) },
  baggyJeans: { under: (c) => trouserSet(c, `bj-${c.k}`, c.s.waist[0] + 18, c.s.ankle[1] + 38, { ease: 18, easeIn: 10, flare: 14, jeans: true }) },
  wideLegTrousers: { under: (c) => trouserSet(c, `wl-${c.k}`, c.s.waist[0] + 4, c.s.ankle[1] + 36, { ease: 14, easeIn: 8, flare: 46, pleat: true }) },
  cargoPants: { under: (c) => trouserSet(c, `cg-${c.k}`, c.s.waist[0] + 18, c.s.ankle[1] + 20, { ease: 16, easeIn: 8, flare: 8, cargo: true }) },
  shorts: { under: (c) => trouserSet(c, `sh-${c.k}`, c.s.waist[0] + 14, c.s.crotch + 70, { ease: 10, easeIn: 6, jeans: true }) },
  straightTrousers: { under: (c) => trouserSet(c, `st-${c.k}`, c.s.waist[0] + 8, c.s.ankle[1] + 10, { ease: 10, easeIn: 4, flare: 6, pleat: true }) },

  // ---- women's dresses & gowns ----
  bodyconMini: cutBuild('miniGown'),
  slipDress: dress('sweetheart', { hem: D.midi, flare: 26, pow: 1.2, pleats: 3, bodiceHem: (s) => s.waist[0] + 20 }),
  wrapDress: dress('vneck', { hem: D.knee, flare: 48, pow: 1, sleeve: 'threeQuarter', extra: (c) => wrapLine(c, 0) }),
  shirtDress: dress('collar', { hem: D.knee, flare: 34, pow: 1, sleeve: 'elbow', extra: (c) => <>{buttons(c, c.s.neck[0] + 40, c.s.hip[0], 7)}{belt(c, c.s.waist[0] + 4)}</> }),
  tubeMidi: dress('straight', { hem: D.midi, flare: 6, fitted: true }),
  maxiDress: dress('sweetheart', { hem: D.maxi, flare: 70, pow: 1.1, pleats: 7 }),
  fitFlare: dress('scoop', { hem: D.knee, flare: 70, pow: 1, sleeve: 'cap', pleats: 7 }),
  mermaidGown: cutBuild('mermaidGown'),
  laceGown: cutBuild('laceGown'),
  bubu: cutBuild('bubu'),
  adireMaxi: dress('vneck', { hem: D.maxi, flare: 40, pow: 1, from: 'waist', sleeve: 'short', sleeveFlare: 20, bodiceHem: (s) => s.waist[0] + 20 }),
  corsetGown: dress('sweetheart', { hem: D.floor, flare: 90, pow: 1.2, pleats: 7, extra: (c) => corsetBones(c, c.s.waist[0] + 14), bodiceHem: (s) => s.waist[0] + 22 }),
  ballGown: dress('sweetheart', { hem: D.floor, flare: 210, pow: 0.55, pleats: 9, extra: (c) => corsetBones(c, c.s.waist[0] + 14), bodiceHem: (s) => s.waist[0] + 22 }),
  offShoulderGown: dress('offShoulder', { hem: D.floor, flare: 70, pow: 2.2, fitted: true, sleeve: 'cap' }),
  slitGown: dress('oneShoulder', { hem: D.floor, flare: 46, pow: 2, fitted: true, slit: true }),
  jumpsuit: cutBuild('jumpsuit'),
  playsuit: {
    under: (c) => (
      <>
        {trouserSet(c, `ps-${c.k}`, c.s.waist[0], c.s.crotch + 74, { ease: 14, easeIn: 8, flare: 10 })}
        <Piece id={c.id} name={`psTop-${c.k}`} d={bodicePath(c.s, 'sweetheart', c.s.waist[0] + 20)} paint={c.p} folds={bodiceFolds(c.s, c.s.waist[0] + 20)} plain={c.plain} box={box(c.s, c.s.pit[0], c.s.waist[0] + 20)} />
        {neckTrim(c, 'sweetheart')}
        {bow(c, 300, c.s.waist[0] + 10)}
      </>
    ),
  },

  // ---- women's outerwear ----
  blazer: jacket({ hem: (s) => s.hip[0] + 16, lapels: true, ease: 9 }),
  cropBlazer: jacket({ hem: (s) => s.waist[0] + 10, lapels: true, ease: 7 }),
  denimJacket: jacket({ hem: (s) => s.waist[0] + 30, collar: 'shirt', pockets: true, ease: 10 }),
  leatherJacket: jacket({ hem: (s) => s.waist[0] + 30, collar: 'shirt', zip: true, ease: 8, opening: 40 }),
  kimono: jacket({ hem: D.knee, ease: 14, sleeve: 'bell', sleeveFlare: 54, sheer: true, opening: 50, flare: 20 }),
  trenchCoat: jacket({ hem: (s) => s.knee[1] + 50, lapels: true, belt: true, ease: 14, flare: 40, opening: 20 }),
  laceShrug: jacket({ hem: (s) => s.under[0] + 10, ease: 5, sleeve: 'elbow', sleeveFlare: 10, sheer: true, opening: 60 }),

  // ---- men's tops ----
  shirt: mensTop('shirt'),
  tee: mensTop('tee'),
  polo: mensTop('polo'),
  hoodie: mensTop('hoodie'),
  dashiki: mensTop('dashiki'),
  mensBuba: bubaBuild((s) => s.hip[0] + 30, 'long', 18, 16),

  // ---- men's bottoms ----
  trousers: { under: (c) => trouserPiece(cut(c), c.p, `tr-${c.k}`) },
  jeans: { under: (c) => trouserSet(c, `mj-${c.k}`, c.s.waist[0] + 10, c.s.ankle[1] - 6, { ease: 10, easeIn: 4, jeans: true }) },
  chinos: { under: (c) => trouserSet(c, `ch-${c.k}`, c.s.waist[0] + 14, c.s.ankle[1] - 16, { ease: 8, easeIn: 3 }) },
  mensCargo: { under: (c) => trouserSet(c, `mc-${c.k}`, c.s.waist[0] + 14, c.s.ankle[1] + 4, { ease: 16, easeIn: 8, cargo: true }) },
  mensShorts: { under: (c) => trouserSet(c, `ms-${c.k}`, c.s.waist[0] + 14, c.s.knee[1] - 30, { ease: 14, easeIn: 8, flare: 6 }) },
  sokoto: { under: (c) => trouserSet(c, `sk-${c.k}`, c.s.waist[0] + 14, c.s.ankle[1] - 14, { ease: 16, easeIn: 8, flare: 4 }) },

  // ---- men's native sets ----
  senator: cutBuild('senator'),
  agbada: cutBuild('agbada'),
  kaftan: {
    under: (c) => (
      <>
        {trouserPiece(cut(c), c.p, `kt-${c.k}`)}
        {tunicPiece(cut(c), c.p, c.s.ankle[1] - 120, `kft-${c.k}`)}
      </>
    ),
    over: (c) => sleeves(cut(c), c.p, c.s.wrist[1] - 10, false, 10),
  },

  // ---- men's outerwear ----
  mensBlazer: jacket({ hem: (s) => s.hip[0] + 30, lapels: true, ease: 10, opening: 26 }),
  mensDenimJacket: jacket({ hem: (s) => s.waist[0] + 40, collar: 'shirt', pockets: true, ease: 12 }),
  mensLeatherJacket: jacket({ hem: (s) => s.waist[0] + 40, collar: 'shirt', zip: true, ease: 10, opening: 40 }),
};

function iroPiece(c: Ctx, george: boolean) {
  const { s } = c;
  const hem = s.ankle[1] - 26;
  const topY = s.waist[0] + 10;
  const left = leftEdge(s, topY, hem, (y, t) => (y < s.hip[0] ? 8 : 8 + Math.max(0, s.hip[1] + 8 - bodyHalf(s, y) - 8) - t * 14));
  const d = symmetric(left);
  return (
    <>
      <Piece id={c.id} name={`iro-${c.k}`} d={d} paint={c.p} folds={[`M ${300 - s.hip[1]} ${s.hip[0] + 10} L ${300 + s.hip[1] * 0.5} ${hem}`, `M 300 ${s.crotch} L 300 ${hem}`]} plain={c.plain} box={box(s, topY, hem, 10)} />
      <path d={`M ${300 - s.hip[1] * 0.2} ${topY + 10} C ${300 - s.hip[1] * 0.1} ${s.crotch} ${300 + s.hip[1] * 0.25} ${s.knee[1]} ${300 + s.hip[1] * 0.35} ${hem}`} fill="none" stroke={darken(c.p.base, 0.45)} strokeWidth="1.8" opacity="0.7" />
      <path d={`M ${300 - s.waist[1] - 6} ${topY + 4} l 18 6 l -6 22 Z`} fill={darken(c.p.base, 0.1)} stroke={darken(c.p.base, 0.4)} strokeWidth="1" />
      {george && (
        <>
          {/* second, shorter wrapper over the first, with a gold border */}
          <Piece id={c.id} name={`iro2-${c.k}`} d={symmetric(leftEdge(s, topY, s.knee[1] - 40, () => 12))} paint={c.p} folds={[`M ${300 - s.hip[1] * 0.4} ${s.hip[0]} L 300 ${s.knee[1] - 40}`]} plain={c.plain} box={box(s, topY, s.knee[1], 20)} />
          <path d={`M ${300 - bodyHalf(s, s.knee[1] - 44) - 12} ${s.knee[1] - 44} L ${300 + bodyHalf(s, s.knee[1] - 44) + 12} ${s.knee[1] - 44}`} stroke={gold(c)} strokeWidth="4" />
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
const SLOTS: (keyof Wardrobe)[] = ['bottom', 'dress', 'top', 'outer'];

export function WardrobeLayer({ id, spec, wardrobe, plain, layer }: { id: Id; spec: BodySpec; wardrobe: Wardrobe; plain: boolean; layer: 'under' | 'over' }) {
  const pieces: React.ReactNode[] = [];
  const defs: React.ReactNode[] = [];
  const order = layer === 'over' ? (['dress', 'top', 'outer'] as (keyof Wardrobe)[]) : SLOTS;
  for (const slot of order) {
    const g: Garment | undefined = wardrobe[slot];
    if (!g) continue;
    if (wardrobe.dress && (slot === 'top' || slot === 'bottom')) continue;
    const build = GARMENTS[g.style];
    if (!build) continue;
    const draw = layer === 'under' ? build.under : build.over;
    if (!draw) continue;
    const k = `${layer}-${slot}`;
    const main = fabricDefs(id, k, g.fabric, g.color, g.color2, g.pattern ?? 0, plain);
    const acc = fabricDefs(id, `${k}-2`, 'plain', g.color2, g.color2, 0, plain);
    defs.push(<React.Fragment key={`d-${slot}`}>{main.defs}</React.Fragment>);
    pieces.push(<g key={slot}>{draw({ id, s: spec, p: main.paint, p2: acc.paint, plain, k: slot, bottom: wardrobe.bottom?.style })}</g>);
  }
  return (
    <g>
      <defs>{defs}</defs>
      {pieces}
    </g>
  );
}
