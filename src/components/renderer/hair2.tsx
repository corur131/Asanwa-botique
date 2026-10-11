import React from 'react';
import { HairStyle } from '../../types/character';
import { darken, lighten, mix } from './color';
import { Pt, curveThrough } from './geometry';
import {
  CAP,
  CAP_STRANDS,
  BACK_LONG,
  BACK_STRANDS,
  BABY_SWIRLS,
} from './refPaths';
import {
  CORN_CAP,
  Grain,
  HairPalette,
  HairProps,
  MALE_CAP,
  MALE_HAIRLINE,
  SLICK_CAP,
  coils,
  recolor,
  seeded,
} from './hair';

/**
 * The second set of hairstyles (10 women's, 4 men's) plus the plain-state mess overlay.
 * All drawn in divine.svg's head space, like hair.tsx.
 * Each style supplies up to three layers: back (behind the body), side (in front of the
 * shoulders) and front (over the face).
 */

export type Layer = (p: HairProps) => React.ReactNode;
export interface StyleLayers {
  back?: Layer;
  side?: Layer;
  front?: Layer;
}

const MIRROR = 'translate(600 0) scale(-1 1)';
const f = (n: number) => n.toFixed(1);
export const toD = (pts: Pt[]) => `M ${f(pts[0][0])} ${f(pts[0][1])}${curveThrough(pts)}`;
export const shineOf = (p: HairProps) => (p.plain ? 0.35 : 1);

/** Points for a strand hanging from (x0, y0), swaying side to side. */
export function hang(x0: number, y0: number, len: number, sway: number, phase: number, drift = 0, n = 12): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return [x0 + Math.sin(t * Math.PI * 1.3 + phase) * sway * t + drift * t, y0 + len * t] as Pt;
  });
}

/** Points along a quadratic curve. */
export function quad(a: Pt, c: Pt, b: Pt, n = 12): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]] as Pt;
  });
}

/** Walk a polyline and call back every `step` units with position and unit tangent. */
export function along(pts: Pt[], step: number, cb: (x: number, y: number, ux: number, uy: number, i: number) => void) {
  let carry = 0;
  let k = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const ux = (x1 - x0) / len;
    const uy = (y1 - y0) / len;
    let d = carry;
    while (d < len) {
      cb(x0 + ux * d, y0 + uy * d, ux, uy, k++);
      d += step;
    }
    carry = d - len;
  }
}

/** One braid: outline, body, plait chevrons; optional gold cuffs or beads. */
export const Braid: React.FC<{ p: HairProps; pts: Pt[]; w: number; cuffs?: number[]; beads?: boolean }> = ({ p, pts, w, cuffs, beads }) => {
  const d = toD(pts);
  const chev: React.ReactElement[] = [];
  along(pts, w * 0.95, (x, y, ux, uy, i) => {
    const nx = -uy;
    const ny = ux;
    const h = w * 0.48;
    chev.push(
      <path key={i} d={`M ${f(x + nx * h)} ${f(y + ny * h)} L ${f(x + ux * w * 0.45)} ${f(y + uy * w * 0.45)} L ${f(x - nx * h)} ${f(y - ny * h)}`} fill="none" stroke={p.pal.strandHighlight} strokeWidth={Math.max(0.7, w * 0.11)} opacity={0.65 * shineOf(p)} />,
    );
  });
  const end = pts[pts.length - 1];
  const extras: React.ReactElement[] = [];
  (cuffs || []).forEach((t, i) => {
    const q = pts[Math.min(pts.length - 1, Math.round(t * (pts.length - 1)))];
    extras.push(<rect key={`c${i}`} x={q[0] - w * 0.62} y={q[1] - 3} width={w * 1.24} height="6" rx="2" fill={`url(#${p.id('gold')})`} />);
  });
  if (beads) {
    extras.push(<circle key="b1" cx={end[0]} cy={end[1] + 4} r={w * 0.55} fill={`url(#${p.id('gold')})`} />);
    extras.push(<circle key="b2" cx={end[0]} cy={end[1] + 4 + w * 1.1} r={w * 0.45} fill="#C2452D" />);
  }
  // a slim tapered tip past the last plait, like a real braid end
  const pre = pts[pts.length - 2];
  const len = Math.hypot(end[0] - pre[0], end[1] - pre[1]) || 1;
  const ux = (end[0] - pre[0]) / len;
  const uy = (end[1] - pre[1]) / len;
  const tip = `M ${f(end[0] - uy * w * 0.42)} ${f(end[1] + ux * w * 0.42)} L ${f(end[0] + ux * w * 1.6)} ${f(end[1] + uy * w * 1.6)} L ${f(end[0] + uy * w * 0.42)} ${f(end[1] - ux * w * 0.42)} Z`;
  return (
    <g>
      <path d={d} fill="none" stroke={p.pal.darkShadow} strokeWidth={w + 2.4} strokeLinecap="round" />
      <path d={d} fill="none" stroke={`url(#${p.id('hairLong')})`} strokeWidth={w} strokeLinecap="round" />
      {!beads && <path d={tip} fill={p.pal.mid} stroke={p.pal.darkShadow} strokeWidth="1" />}
      {chev}
      {extras}
    </g>
  );
};

/** One loc: ribbed rope with a highlight. */
export const LocRope: React.FC<{ p: HairProps; pts: Pt[]; w: number; cuff?: boolean }> = ({ p, pts, w, cuff }) => {
  const d = toD(pts);
  const ribs: React.ReactElement[] = [];
  along(pts, w * 0.7, (x, y, ux, uy, i) => {
    const nx = -uy;
    const ny = ux;
    ribs.push(<path key={i} d={`M ${f(x + nx * w * 0.45)} ${f(y + ny * w * 0.45)} Q ${f(x + ux * 2.5)} ${f(y + uy * 2.5)} ${f(x - nx * w * 0.45)} ${f(y - ny * w * 0.45)}`} fill="none" stroke={p.pal.darkShadow} strokeWidth="0.9" opacity="0.55" />);
  });
  const mid = pts[Math.floor(pts.length * 0.45)];
  return (
    <g>
      <path d={d} fill="none" stroke={p.pal.darkShadow} strokeWidth={w + 2.4} strokeLinecap="round" />
      <path d={d} fill="none" stroke={`url(#${p.id('hairLong')})`} strokeWidth={w} strokeLinecap="round" />
      <path d={d} transform={`translate(${-w * 0.2} 0)`} fill="none" stroke={p.pal.specular} strokeWidth={w * 0.18} strokeLinecap="round" opacity={0.35 * shineOf(p)} />
      {ribs}
      {cuff && <rect x={mid[0] - w * 0.65} y={mid[1] - 3.5} width={w * 1.3} height="7" rx="2" fill={`url(#${p.id('gold')})`} />}
    </g>
  );
};

/** Braided or twisted rows running back from the hairline over the scalp. */
export function scalpRows(p: HairProps, n: number, w: number, opts: { spread?: number; crownY?: number; part?: number; rope?: boolean; cap?: string } = {}) {
  const spread = opts.spread ?? 0.76;
  const crownY = opts.crownY ?? 168;
  const out: React.ReactElement[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (1.5 - spread / 2 + (spread * i) / (n - 1));
    const sx = 300 + Math.cos(a) * 104;
    const sy = 334 + Math.sin(a) * 104;
    const ex = (opts.part ?? 300) + (sx - 300) * 0.3;
    const pts = quad([sx, sy], [300 + (sx - 300) * 1.08, (sy + crownY) / 2 - 18], [ex, crownY], 10);
    out.push(opts.rope ? <LocRope key={i} p={p} pts={pts} w={w} /> : <Braid key={i} p={p} pts={pts} w={w} />);
  }
  const clip = p.id('rowClip');
  return (
    <>
      <clipPath id={clip}>
        <path d={opts.cap || CORN_CAP} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>{out}</g>
    </>
  );
}

/**
 * Scalp for box braids and locs: braids fan out from the parting and run down over the head,
 * clipped at the hairline so no braid ends sit on the forehead. Fine scalp lines mark the box parts.
 */
export function braidCap(p: HairProps, w: number, opts: { part?: number; rope?: boolean; cap?: string; n?: number } = {}) {
  const part = opts.part ?? 300;
  const cap = opts.cap || CORN_CAP;
  const n = Math.max(opts.n ?? 17, 24);
  const clip = p.id('braidCap');
  const strands: React.ReactElement[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.98 + (1.04 * i) / (n - 1));
    const ex = part + Math.cos(a) * 190;
    const ey = 170 - Math.sin(a) * 210 + 40;
    const pts = quad([part + Math.cos(a) * 8, 172], [part + Math.cos(a) * 110, 150 - Math.sin(a) * 40], [ex, ey], 10);
    strands.push(opts.rope ? <LocRope key={i} p={p} pts={pts} w={w} /> : <Braid key={i} p={p} pts={pts} w={w} />);
  }
  return (
    <>
      <clipPath id={clip}>
        <path d={cap} />
      </clipPath>
      <path d={cap} fill={p.pal.darkShadow} />
      <g clipPath={`url(#${clip})`}>
        {strands}
        <path d={`M ${part} 160 L ${part} 240`} stroke={lighten(scalpFill(p), 0.2)} strokeWidth="2" opacity="0.8" />
        <ellipse cx={part - 30} cy="196" rx="50" ry="16" fill={p.pal.specular} opacity={0.18 * shineOf(p)} filter="url(#global-blur-md)" />
      </g>
    </>
  );
}

export const scalpFill = (p: HairProps) => mix(p.skin.contour, p.pal.darkShadow, 0.62);

/** Partly-visible scalp under braids, locs and knots. */
export const ScalpCap: React.FC<{ p: HairProps; d?: string }> = ({ p, d = CORN_CAP }) => <path d={d} fill={scalpFill(p)} />;

// ---------------------------------------------------------------------------
// Women's styles
// ---------------------------------------------------------------------------
/**
 * A solid fall of hair behind a row of braids (ordered left to right), so the
 * background never shows through the gaps: real braids are a full, dense mass.
 */
export function hairMass(p: HairProps, rows: Pt[][], key = 'mass') {
  if (rows.length < 2) return null;
  const left = rows[0];
  const right = rows[rows.length - 1];
  const bottom = rows.map((r) => {
    const e = r[Math.max(1, r.length - 2)];
    return [e[0], e[1]] as Pt;
  });
  const pts: Pt[] = [...left, ...bottom.slice(1, -1), ...[...right].reverse()];
  const d = `M ${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L ')} Z`;
  return (
    <g key={key}>
      <path d={d} fill={p.pal.darkShadow} stroke={p.pal.darkShadow} strokeWidth="10" strokeLinejoin="round" />
      <path d={d} fill={`url(#${p.id('hairLong')})`} opacity="0.35" />
    </g>
  );
}

export function backBraids(p: HairProps, n: number, len: number, w: number, seed: number, rope = false, beads = false) {
  const rnd = seeded(seed);
  const rows: Pt[][] = [];
  const out: React.ReactElement[] = [];
  // two layers: an underlayer of braids filling in, then the top layer
  const total = Math.round(n * 1.5);
  for (let i = 0; i < total; i++) {
    const t = i / (total - 1);
    const x0 = 192 + t * 216;
    const y0 = 244 + Math.abs(t - 0.5) * 110;
    const spreadOut = (t - 0.5) * 190;
    const pts = hang(x0, y0, len * (0.93 + rnd() * 0.09), 8 + rnd() * 7, rnd() * 6, spreadOut, 14);
    rows.push(pts);
    out.push(rope ? <LocRope key={i} p={p} pts={pts} w={w} /> : <Braid key={i} p={p} pts={pts} w={w} beads={beads && i % 4 === 0} />);
  }
  // under layer first so the front layer overlaps it
  const under = out.filter((_, i) => i % 2 === 1);
  const over = out.filter((_, i) => i % 2 === 0);
  return [hairMass(p, rows), ...under, ...over];
}

export function frontBraids(p: HairProps, n: number, len: number, w: number, seed: number, rope = false, cuffs = false, beads = false) {
  const rnd = seeded(seed);
  const m = Math.max(n, Math.round(n * 1.6));
  const side = (mirror: boolean) => {
    const rows: Pt[][] = [];
    const braids = Array.from({ length: m }, (_, i) => {
      const x0 = 200 - i * (w * 0.62);
      const pts = hang(x0, 284 + i * 6, len * (0.9 + rnd() * 0.12), 5 + rnd() * 5, rnd() * 5, -22 - i * 3.2, 14);
      rows.push(pts);
      return rope ? <LocRope key={i} p={p} pts={pts} w={w} cuff={cuffs && i % 2 === 0} /> : <Braid key={i} p={p} pts={pts} w={w} cuffs={cuffs && i % 2 === 0 ? [0.35, 0.6] : undefined} beads={beads && i % 2 === 0} />;
    });
    return (
      <g transform={mirror ? MIRROR : undefined}>
        {hairMass(p, [...rows].reverse())}
        {braids.reverse()}
      </g>
    );
  };
  return (
    <>
      {side(false)}
      {side(true)}
    </>
  );
}

const knotlessBraids: StyleLayers = {
  back: (p) => <>{backBraids(p, 24, 760, 9, 11)}</>,
  side: (p) => <>{frontBraids(p, 5, 680, 9, 13)}</>,
  front: (p) => braidCap(p, 9),
};

const boxBraidBob: StyleLayers = {
  back: (p) => <>{backBraids(p, 20, 300, 11, 17)}</>,
  side: (p) => (
    <>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <Braid p={p} pts={hang(196 - i * 9, 286 + i * 8, 250 - i * 10, 5, i, -10)} w={11} />
          <g transform={MIRROR}>
            <Braid p={p} pts={hang(196 - i * 9, 286 + i * 8, 250 - i * 10, 5, i + 1, -10)} w={11} />
          </g>
        </g>
      ))}
    </>
  ),
  front: (p) => braidCap(p, 11, { part: 336, n: 14 }),
};

const fulaniBraids: StyleLayers = {
  back: (p) => <>{backBraids(p, 16, 720, 8, 19, false, true)}</>,
  side: (p) => <>{frontBraids(p, 2, 560, 8, 23, false, true, true)}</>,
  front: (p) => (
    <>
      <ScalpCap p={p} />
      <g>{scalpRows(p, 9, 9, { spread: 0.6 })}</g>
      {/* the signature centre braid and side braids curving toward the ears */}
      <g clipPath={`url(#${p.id('rowClip')})`}>
        <Braid p={p} pts={quad([300, 240], [300, 196], [300, 160], 8)} w={11} cuffs={[0.45]} />
        <Braid p={p} pts={quad([218, 236], [194, 290], [200, 360], 8)} w={9} />
        <g transform={MIRROR}>
          <Braid p={p} pts={quad([218, 236], [194, 290], [200, 360], 8)} w={9} />
        </g>
      </g>
    </>
  ),
};

const fauxLocs: StyleLayers = {
  back: (p) => <>{backBraids(p, 20, 780, 12, 29, true)}</>,
  side: (p) => <>{frontBraids(p, 4, 700, 12, 31, true, true)}</>,
  front: (p) => braidCap(p, 12, { part: 330, rope: true, n: 15 }),
};

const bantuKnots: StyleLayers = {
  front: (p) => {
    const knots: [number, number][] = [[300, 178], [244, 196], [356, 196], [212, 246], [388, 246], [270, 226], [330, 226], [204, 298], [396, 298]];
    return (
      <>
        <ScalpCap p={p} />
        {/* parting lines between sections */}
        <path d="M 300 166 L 300 228 M 230 214 L 290 228 M 370 214 L 310 228 M 210 270 L 260 240 M 390 270 L 340 240" stroke={lighten(scalpFill(p), 0.15)} strokeWidth="1.6" opacity="0.7" />
        {knots.map(([x, y], i) => (
          <g key={i}>
            <ellipse cx={x} cy={y + 8} rx="22" ry="10" fill="#000" opacity="0.3" filter="url(#global-blur-sm)" />
            <circle cx={x} cy={y} r="21" fill={`url(#${p.id('hairG')})`} stroke={p.pal.darkShadow} strokeWidth="1.5" />
            <path d={`M ${x} ${y} m -3 0 a 3 3 0 1 1 6 0 a 7 7 0 1 1 -13 0 a 11 11 0 1 1 22 0 a 15 15 0 1 1 -29 0`} fill="none" stroke={p.pal.strandHighlight} strokeWidth="1.3" opacity={0.75 * shineOf(p)} />
            <ellipse cx={x - 7} cy={y - 9} rx="7" ry="4" fill={p.pal.specular} opacity={0.35 * shineOf(p)} filter="url(#global-blur-xs)" />
          </g>
        ))}
      </>
    );
  },
};

/** Wavy curtain of hair framing one side of the face (left; mirror for right). */
function wavyCurtain(len: number, amp: number): { d: string; edge: Pt[] } {
  const inner: Pt[] = [];
  const outer: Pt[] = [];
  const n = 20;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = 196 + t * len;
    const wave = Math.sin(t * Math.PI * (len / 120)) * amp * Math.min(1, t * 3);
    const xin = t < 0.18 ? 300 - (t / 0.18) * 56 : 244 - (t - 0.18) * 30;
    const xout = t < 0.18 ? 300 - (t / 0.18) * 104 : 196 - (t - 0.18) * 44;
    inner.push([xin + wave, y]);
    outer.push([xout + wave - 8, y]);
  }
  const d = `M ${f(outer[0][0])} ${f(outer[0][1])}${curveThrough(outer)} L ${f(inner[n][0])} ${f(inner[n][1])}${curveThrough([...inner].reverse())} Z`;
  return { d, edge: inner };
}

const bodyWave: StyleLayers = {
  back: (p) => (
    <>
      <clipPath id={p.id('bwBack')}>
        <path d={BACK_LONG} transform="translate(300 168) scale(1.12 1.25) translate(-300 -168)" />
      </clipPath>
      <path d={BACK_LONG} transform="translate(300 168) scale(1.12 1.25) translate(-300 -168)" fill={`url(#${p.id('hairLong')})`} />
      <g clipPath={`url(#${p.id('bwBack')})`} transform="translate(300 168) scale(1.12 1.25) translate(-300 -168)">
        {BACK_STRANDS.map((s, i) => (
          <path key={i} d={s.d} fill="none" stroke={recolor(s.stroke, p.pal)} strokeWidth={s.w} strokeLinecap="round" opacity={s.o * shineOf(p)} />
        ))}
      </g>
    </>
  ),
  side: (p) => {
    const { d, edge } = wavyCurtain(700, 14);
    const curtain = (
      <g>
        <path d={d} fill={`url(#${p.id('hairLong')})`} />
        <g clipPath={`url(#${p.id('bwCurtain')})`}>
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d={toD(edge.map(([x, y]) => [x - 4 - i * 5, y] as Pt))} fill="none" stroke={i % 4 === 1 ? p.pal.specular : p.pal.strandHighlight} strokeWidth={i % 4 === 1 ? 0.9 : 1.3} opacity={(i % 4 === 1 ? 0.45 : 0.55) * shineOf(p)} />
          ))}
          <path d="M 262 198 C 236 214 218 250 210 300" fill="none" stroke={p.pal.specular} strokeWidth="9" opacity={0.4 * shineOf(p)} filter="url(#global-blur-sm)" />
        </g>
      </g>
    );
    return (
      <>
        <clipPath id={p.id('bwCurtain')}>
          <path d={d} />
        </clipPath>
        {curtain}
        <g transform={MIRROR}>{curtain}</g>
      </>
    );
  },
  front: (p) => (
    <>
      <clipPath id={p.id('bwCap')}>
        <path d={CAP} />
      </clipPath>
      <path d={CAP} fill={`url(#${p.id('hairG')})`} />
      <g clipPath={`url(#${p.id('bwCap')})`}>
        {CAP_STRANDS.map((s, i) => (
          <path key={i} d={s.d} fill="none" stroke={recolor(s.stroke, p.pal)} strokeWidth={s.w} opacity={s.o * shineOf(p)} strokeLinecap="round" />
        ))}
        <path d="M 230 228 C 262 196 300 186 330 190" fill="none" stroke={p.pal.specular} strokeWidth="7" opacity={0.45 * shineOf(p)} filter="url(#global-blur-md)" />
      </g>
    </>
  ),
};

/** A cloud of curls: many overlapping circles, clipped coils inside. */
export function curlCloud(p: HairProps, clipName: string, blobs: [number, number, number][], seed: number) {
  const clip = p.id(clipName);
  const minX = Math.min(...blobs.map(([x, , r]) => x - r));
  const maxX = Math.max(...blobs.map(([x, , r]) => x + r));
  const minY = Math.min(...blobs.map(([, y, r]) => y - r));
  const maxY = Math.max(...blobs.map(([, y, r]) => y + r));
  return (
    <>
      <clipPath id={clip}>
        {blobs.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} />
        ))}
      </clipPath>
      {blobs.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r + 1.5} fill={p.pal.darkShadow} />
      ))}
      <g clipPath={`url(#${clip})`}>
        <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} fill={`url(#${p.id('hairLong')})`} />
        {coils(seed, (minX + maxX) / 2, (minY + maxY) / 2, (maxX - minX) / 2, (maxY - minY) / 2, 900, p.pal.strandHighlight, 4.2)}
        {coils(seed + 1, (minX + maxX) / 2 - 30, minY + 70, (maxX - minX) / 3, 60, 220, p.pal.specular, 3.4)}
        <ellipse cx={(minX + maxX) / 2 - 40} cy={minY + 60} rx="70" ry="34" fill={p.pal.specular} opacity={0.22 * shineOf(p)} filter="url(#global-blur-lg)" />
      </g>
    </>
  );
}

const deepCurly: StyleLayers = {
  back: (p) =>
    curlCloud(
      p,
      'dcBack',
      [[300, 210, 110], [210, 270, 70], [390, 270, 70], [180, 360, 66], [420, 360, 66], [170, 450, 62], [430, 450, 62], [180, 540, 56], [420, 540, 56], [196, 610, 44], [404, 610, 44]],
      91,
    ),
  front: (p) => (
    <>
      {curlCloud(p, 'dcFront', [[258, 214, 46], [322, 206, 48], [218, 254, 32], [382, 252, 34], [204, 300, 22], [398, 300, 22]], 93)}
    </>
  ),
};

const PIXIE_CAP =
  'M 190 344 C 180 250 214 170 300 162 C 386 168 420 250 410 344 C 405 304 398 276 386 258 C 362 232 322 226 288 234 C 262 242 238 262 222 296 C 214 280 206 286 202 320 Z';
const PIXIE_FRINGE = 'M 392 262 C 356 224 288 222 246 262 C 226 282 214 304 216 330 C 232 296 262 272 300 262 C 334 254 366 254 392 270 Z';

const pixie: StyleLayers = {
  front: (p) => (
    <>
      <clipPath id={p.id('pxClip')}>
        <path d={PIXIE_CAP} />
        <path d={PIXIE_FRINGE} />
      </clipPath>
      <path d={PIXIE_CAP} fill={`url(#${p.id('hairG')})`} />
      <path d={PIXIE_FRINGE} fill={`url(#${p.id('hairG')})`} />
      <g clipPath={`url(#${p.id('pxClip')})`}>
        {Array.from({ length: 16 }, (_, i) => (
          <path key={i} d={`M ${392 - i * 2} ${262 + i * 1.5} C ${350 - i * 4} ${224 + i * 2} ${290 - i * 3} ${226 + i * 3} ${248 - i * 1.5} ${264 + i * 3}`} fill="none" stroke={i % 3 === 0 ? p.pal.specular : p.pal.strandHighlight} strokeWidth="1.1" opacity={0.55 * shineOf(p)} />
        ))}
        <path d="M 250 196 C 290 180 340 184 372 204" fill="none" stroke={p.pal.specular} strokeWidth="8" opacity={0.35 * shineOf(p)} filter="url(#global-blur-md)" />
      </g>
      <Grain clip={p.id('pxClip')} color={p.pal.specular} opacity={0.2 * shineOf(p)} />
    </>
  ),
};

export function slickFront(p: HairProps) {
  const lines: React.ReactElement[] = [];
  for (let i = 0; i < 22; i++) {
    const a = Math.PI * (1.08 + (0.84 * i) / 21);
    const sx = 300 + Math.cos(a) * 104;
    const sy = 330 + Math.sin(a) * 104;
    lines.push(<path key={i} d={`M ${f(sx)} ${f(sy)} Q ${f(300 + (sx - 300) * 0.9)} ${f((sy + 168) / 2)} ${f(300 + (sx - 300) * 0.3)} 170`} fill="none" stroke={p.pal.strandHighlight} strokeWidth="1.1" opacity={0.5 * shineOf(p)} />);
  }
  return (
    <>
      <clipPath id={p.id('slick2')}>
        <path d={SLICK_CAP} />
      </clipPath>
      <path d={SLICK_CAP} fill={`url(#${p.id('hairG')})`} />
      <g clipPath={`url(#${p.id('slick2')})`}>
        {lines}
        <ellipse cx="262" cy="212" rx="44" ry="15" fill={p.pal.specular} opacity={0.4 * shineOf(p)} filter="url(#global-blur-md)" />
      </g>
      {!p.plain && (
        <>
          {BABY_SWIRLS.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={darken(p.pal.base, 0.1)} strokeWidth="1.05" strokeLinecap="round" />
          ))}
          <g transform={MIRROR}>
            {BABY_SWIRLS.map((d, i) => (
              <path key={i} d={d} fill="none" stroke={darken(p.pal.base, 0.1)} strokeWidth="1.05" strokeLinecap="round" />
            ))}
          </g>
        </>
      )}
    </>
  );
}

const highBun: StyleLayers = {
  back: (p) => (
    <g>
      <ellipse cx="300" cy="140" rx="64" ry="48" fill={p.pal.darkShadow} />
      <ellipse cx="300" cy="138" rx="62" ry="46" fill={`url(#${p.id('hairG')})`} />
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M ${244 + i * 4} ${140 + i * 3} C ${262 + i * 6} ${100 + i * 4} ${338 - i * 6} ${100 + i * 4} ${356 - i * 4} ${140 + i * 3}`} fill="none" stroke={i % 2 ? p.pal.strandHighlight : p.pal.specular} strokeWidth="1.4" opacity={0.6 * shineOf(p)} />
      ))}
      <ellipse cx="282" cy="116" rx="22" ry="10" fill={p.pal.specular} opacity={0.35 * shineOf(p)} filter="url(#global-blur-sm)" />
    </g>
  ),
  front: (p) => (
    <>
      {slickFront(p)}
      <path d="M 256 180 C 280 170 320 170 344 180" fill="none" stroke={p.pal.darkShadow} strokeWidth="8" strokeLinecap="round" />
    </>
  ),
};

const sleekPonytail: StyleLayers = {
  back: (p) => {
    const outer: Pt[] = [[330, 164], [396, 196], [432, 290], [440, 420], [440, 580], [430, 760], [412, 900]];
    const inner: Pt[] = [[400, 880], [404, 740], [404, 580], [402, 430], [392, 300], [360, 210], [312, 180]];
    const d = `M ${outer[0][0]} ${outer[0][1]}${curveThrough(outer)} L ${inner[0][0]} ${inner[0][1]}${curveThrough(inner)} Z`;
    return (
      <g>
        <clipPath id={p.id('ptClip')}>
          <path d={d} />
        </clipPath>
        <path d={d} fill={`url(#${p.id('hairLong')})`} />
        <g clipPath={`url(#${p.id('ptClip')})`}>
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d={toD(outer.map(([x, y]) => [x - 4 - i * 3.2, y + i * 2] as Pt))} fill="none" stroke={i % 3 === 0 ? p.pal.specular : p.pal.strandHighlight} strokeWidth="1.2" opacity={0.5 * shineOf(p)} />
          ))}
        </g>
      </g>
    );
  },
  front: (p) => (
    <>
      {slickFront(p)}
      <ellipse cx="334" cy="172" rx="14" ry="8" fill={p.pal.darkShadow} />
    </>
  ),
};

// ---------------------------------------------------------------------------
// Men's styles
// ---------------------------------------------------------------------------
const highTopFade: StyleLayers = {
  front: (p) => {
    const top = 'M 222 252 L 216 128 C 240 110 360 110 384 128 L 378 252 C 350 240 250 240 222 252 Z';
    return (
      <>
        <clipPath id={p.id('htCap')}>
          <path d={MALE_CAP} />
        </clipPath>
        <path d={MALE_CAP} fill={`url(#${p.id('hairG')})`} opacity="0.6" />
        <Grain clip={p.id('htCap')} color={p.pal.specular} opacity={0.35 * shineOf(p)} />
        <clipPath id={p.id('htTop')}>
          <path d={top} />
        </clipPath>
        <path d={top} fill={`url(#${p.id('hairG')})`} />
        <g clipPath={`url(#${p.id('htTop')})`}>
          {coils(101, 300, 180, 84, 70, 480, p.pal.strandHighlight, 3)}
          <ellipse cx="270" cy="136" rx="50" ry="16" fill={p.pal.specular} opacity={0.3 * shineOf(p)} filter="url(#global-blur-md)" />
        </g>
        <Grain clip={p.id('htTop')} color={p.pal.specular} opacity={0.3 * shineOf(p)} />
        {!p.plain && <path d={MALE_HAIRLINE} fill="none" stroke={p.pal.darkShadow} strokeWidth="1.4" opacity="0.9" />}
      </>
    );
  },
};

const afro: StyleLayers = {
  back: (p) => curlCloud(p, 'afBack', [[300, 230, 146], [194, 290, 82], [406, 290, 82], [214, 220, 90], [386, 220, 90]], 111),
  front: (p) => (
    <>
      <clipPath id={p.id('afCap')}>
        <path d={MALE_CAP} />
      </clipPath>
      <path d={MALE_CAP} fill={`url(#${p.id('hairG')})`} />
      <g clipPath={`url(#${p.id('afCap')})`}>{coils(113, 300, 240, 110, 80, 360, p.pal.strandHighlight, 3.6)}</g>
    </>
  ),
};

const longLocs: StyleLayers = {
  back: (p) => <>{backBraids(p, 14, 330, 13, 121, true)}</>,
  side: (p) => (
    <>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <LocRope p={p} pts={hang(188 - i * 11, 284 + i * 8, 300 - i * 20, 6, i, -10)} w={13} />
          <g transform={MIRROR}>
            <LocRope p={p} pts={hang(188 - i * 11, 284 + i * 8, 300 - i * 20, 6, i + 2, -10)} w={13} />
          </g>
        </g>
      ))}
    </>
  ),
  front: (p) => braidCap(p, 13, { rope: true, cap: MALE_CAP, n: 14 }),
};

const bald: StyleLayers = {
  back: (p) => (
    <g>
      <path d="M 194 332 C 186 240 222 166 300 162 C 378 166 414 240 406 332 Z" fill={`url(#${p.id('skin')})`} />
      <ellipse cx="282" cy="196" rx="44" ry="20" fill={p.skin.glow} opacity="0.55" filter="url(#global-blur-md)" />
      <ellipse cx="276" cy="190" rx="12" ry="5" fill="#FFFFFF" opacity="0.35" filter="url(#global-blur-xs)" />
      {p.plain && (
        <>
          <clipPath id={p.id('baldClip')}>
            <path d="M 194 332 C 186 240 222 166 300 162 C 378 166 414 240 406 332 Z" />
          </clipPath>
          <Grain clip={p.id('baldClip')} color={p.pal.base} opacity={0.6} />
        </>
      )}
    </g>
  ),
};

export const NEW_STYLES: Partial<Record<HairStyle, StyleLayers>> = {
  knotlessBraids,
  boxBraidBob,
  fulaniBraids,
  fauxLocs,
  bantuKnots,
  bodyWave,
  deepCurly,
  pixie,
  highBun,
  sleekPonytail,
  highTopFade,
  afro,
  longLocs,
  bald,
};

// ---------------------------------------------------------------------------
// Plain state: messy, frizzy, grown out
// ---------------------------------------------------------------------------
const HALO: Partial<Record<HairStyle, [number, number, number]>> = {
  afroPuff: [120, 150, 300],
  deepCurly: [170, 170, 300],
  afro: [160, 160, 280],
  highBun: [116, 160, 318],
  sleekPonytail: [116, 150, 318],
  lowCut: [116, 134, 322],
  waves: [116, 134, 322],
  highTopFade: [118, 196, 330],
  shortDreads: [124, 140, 318],
  bald: [0, 0, 0],
  afroWig: [190, 190, 290],
  curlyBob: [150, 150, 300],
  fingerWaves: [116, 150, 318],
};

/**
 * Messy-hair overlay for plain customers: a frizz halo, dozens of flyaways, stray strands
 * across the forehead and a fuzzy hairline. Only styling can fix it, never features.
 */
export const HairMess: React.FC<{ p: HairProps }> = ({ p }) => {
  const [rx, ry, cy] = HALO[p.config.hair] || [134, 146, 312];
  if (!rx) return null;
  const rnd = seeded(p.config.hair.length * 7 + 3);
  const color = p.pal.strandHighlight;
  const fly: React.ReactElement[] = [];
  for (let i = 0; i < 170; i++) {
    const a = Math.PI * (1.02 + rnd() * 0.96);
    const r = 0.9 + rnd() * 0.12;
    const x = 300 + Math.cos(a) * rx * r;
    const y = cy + Math.sin(a) * ry * r;
    const len = 6 + rnd() * 26;
    const ox = Math.cos(a) * len;
    const oy = Math.sin(a) * len;
    fly.push(<path key={i} d={`M ${f(x)} ${f(y)} q ${f(ox * 0.5 + (rnd() - 0.5) * 14)} ${f(oy * 0.5 + (rnd() - 0.5) * 14)} ${f(ox)} ${f(oy)}`} fill="none" stroke={rnd() > 0.6 ? p.pal.base : color} strokeWidth={0.6 + rnd() * 0.6} opacity={0.5 + rnd() * 0.3} />);
  }
  const strays: React.ReactElement[] = [];
  for (let i = 0; i < 6; i++) {
    const x = 240 + rnd() * 120;
    strays.push(<path key={i} d={`M ${f(x)} ${f(214 + rnd() * 12)} q ${f(rnd() * 30 - 15)} 30 ${f(rnd() * 24 - 12)} ${f(50 + rnd() * 40)}`} fill="none" stroke={p.pal.base} strokeWidth="1" opacity="0.75" />);
  }
  return (
    <g>
      {/* frizz halo */}
      <path d={`M ${300 - rx} ${cy} A ${rx} ${ry} 0 0 1 ${300 + rx} ${cy}`} fill="none" stroke={p.pal.base} strokeWidth="16" opacity="0.4" filter="url(#global-blur-sm)" />
      <path d={`M ${300 - rx * 1.02} ${cy} A ${rx * 1.02} ${ry * 1.02} 0 0 1 ${300 + rx * 1.02} ${cy}`} fill="none" stroke={color} strokeWidth="6" opacity="0.25" strokeDasharray="2 3" />
      {fly}
      {strays}
    </g>
  );
};
