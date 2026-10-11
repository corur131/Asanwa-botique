import React from 'react';
import { HairStyle } from '../../types/character';
import { darken, lighten } from './color';
import { Pt, curveThrough } from './geometry';
import { CAP, CAP_STRANDS } from './refPaths';
import { Grain, HairProps, SLICK_CAP, coils, recolor, seeded } from './hair';
import { ScalpCap, StyleLayers, backBraids, braidCap, curlCloud, frontBraids, hairMass, hang, scalpRows, shineOf, toD } from './hair2';

/**
 * Wigs and the last braids/twists (11 styles). Drawn in divine.svg head space like the rest.
 * Straight and wavy wigs share one builder: a back mass, two curtains framing the face and
 * a cap with the parting; the options give each wig its own length, wave, volume and cut.
 */

const MIRROR = 'translate(600 0) scale(-1 1)';
const f = (n: number) => n.toFixed(1);

interface CurtainOpts {
  len: number;
  amp?: number;
  freq?: number;
  inX?: number;
  outX?: number;
  inSlope?: number;
  outSlope?: number;
  part?: number;
  bob?: boolean;
  flicks?: number;
}

/** Left curtain of hair: outer edge down, inner (face side) edge back up. */
function curtain(o: CurtainOpts): { d: string; inner: Pt[]; outer: Pt[] } {
  const part = o.part ?? 300;
  const inX = o.inX ?? 242;
  const outX = o.outX ?? 192;
  const n = Math.max(16, Math.round(o.len / 30));
  const k = Math.min(0.9, 126 / o.len);
  const inner: Pt[] = [];
  const outer: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = 192 + t * o.len;
    const wave = (o.amp ?? 0) * Math.sin(t * Math.PI * (o.len / (o.freq ?? 120))) * Math.min(1, t * 3);
    let xin: number;
    let xout: number;
    if (t < k) {
      const e = Math.sin(((t / k) * Math.PI) / 2);
      xin = part - (part - inX) * e;
      xout = part - (part - outX) * Math.sin(((Math.min(1, (t / k) * 1.6)) * Math.PI) / 2);
    } else {
      xin = inX - (t - k) * (o.inSlope ?? 30);
      xout = outX - (t - k) * (o.outSlope ?? 44);
    }
    if (o.bob && t > 0.7) {
      const u = (t - 0.7) / 0.3;
      xin += 16 * u * u;
      xout += 10 * u * u;
    }
    const flick = o.flicks && t > k ? o.flicks * Math.max(0, Math.sin(t * Math.PI * 5.5)) ** 6 : 0;
    inner.push([xin + wave, y]);
    outer.push([xout + wave - 8 - flick, y]);
  }
  const d = `M ${f(outer[0][0])} ${f(outer[0][1])}${curveThrough(outer)} L ${f(inner[n][0])} ${f(inner[n][1])}${curveThrough([...inner].reverse())} Z`;
  return { d, inner, outer };
}

/** Back mass from the crown down to `bottom`, `extra` wider than bone straight. */
const backMass = (bottom: number, extra = 0, tuck = 0) =>
  `M 300 164 C ${190 - extra} 164 ${148 - extra} 258 ${150 - extra} 360 L ${154 - extra + tuck} ${bottom} C ${210} ${bottom + 18} ${390} ${bottom + 18} ${446 + extra - tuck} ${bottom} L ${450 + extra} 360 C ${452 + extra} 258 ${410 + extra} 164 300 164 Z`;

interface WigOpts extends CurtainOpts {
  bottom: number;
  extra?: number;
  sidePart?: number;
  texture?: 'silky' | 'kinky' | 'wave';
}

function capWithPart(p: HairProps, part: number) {
  if (part === 300) {
    return (
      <>
        <clipPath id={p.id('wigCap')}>
          <path d={CAP} />
        </clipPath>
        <path d={CAP} fill={`url(#${p.id('hairG')})`} />
        <g clipPath={`url(#${p.id('wigCap')})`}>
          {CAP_STRANDS.map((s, i) => (
            <path key={i} d={s.d} fill="none" stroke={recolor(s.stroke, p.pal)} strokeWidth={s.w} opacity={s.o * shineOf(p)} strokeLinecap="round" />
          ))}
          <path d="M 230 228 C 262 196 300 186 330 190" fill="none" stroke={p.pal.specular} strokeWidth="7" opacity={0.45 * shineOf(p)} filter="url(#global-blur-md)" />
        </g>
      </>
    );
  }
  const lines: React.ReactElement[] = [];
  for (let i = 0; i < 26; i++) {
    const a = Math.PI * (1.04 + (0.92 * i) / 25);
    const sx = 300 + Math.cos(a) * 106;
    const sy = 328 + Math.sin(a) * 106;
    lines.push(<path key={i} d={`M ${f(part)} 176 Q ${f(part + (sx - part) * 0.5)} ${f(Math.min(sy, 200) - 14)} ${f(sx)} ${f(sy)}`} fill="none" stroke={i % 4 === 0 ? p.pal.specular : p.pal.strandHighlight} strokeWidth="1.1" opacity={(i % 4 === 0 ? 0.4 : 0.5) * shineOf(p)} />);
  }
  return (
    <>
      <clipPath id={p.id('wigCap')}>
        <path d={SLICK_CAP} />
      </clipPath>
      <path d={SLICK_CAP} fill={`url(#${p.id('hairG')})`} />
      <g clipPath={`url(#${p.id('wigCap')})`}>
        {lines}
        <path d={`M ${part} 168 L ${part - 2} 214`} stroke={lighten(p.skin.contour, 0.1)} strokeWidth="1.8" opacity="0.8" />
        <ellipse cx={part + 50} cy="206" rx="46" ry="14" fill={p.pal.specular} opacity={0.4 * shineOf(p)} filter="url(#global-blur-md)" />
      </g>
    </>
  );
}

function curtainArt(p: HairProps, c: { d: string; inner: Pt[] }, key: string, texture: WigOpts['texture']) {
  const clip = p.id(`wc-${key}`);
  const kinky = texture === 'kinky';
  return (
    <g>
      <clipPath id={clip}>
        <path d={c.d} />
      </clipPath>
      <path d={c.d} fill={`url(#${p.id('hairLong')})`} />
      <g clipPath={`url(#${clip})`}>
        {Array.from({ length: 13 }, (_, i) => (
          <path key={i} d={toD(c.inner.map(([x, y]) => [x - 4 - i * 4.6, y] as Pt))} fill="none" stroke={i % 4 === 1 ? p.pal.specular : p.pal.strandHighlight} strokeWidth={kinky ? 1.6 : i % 4 === 1 ? 0.9 : 1.3} opacity={(kinky ? 0.4 : i % 4 === 1 ? 0.45 : 0.55) * shineOf(p)} strokeDasharray={kinky ? '3 2' : undefined} />
        ))}
        <path d="M 262 198 C 236 214 218 250 210 300" fill="none" stroke={p.pal.specular} strokeWidth="9" opacity={(kinky ? 0.15 : 0.4) * shineOf(p)} filter="url(#global-blur-sm)" />
        {texture === 'wave' &&
          c.inner.filter((_, i) => i % 2 === 0 && i > 3).map(([x, y], i) => <ellipse key={i} cx={x - 22} cy={y} rx="14" ry="6" fill={p.pal.specular} opacity={0.28 * shineOf(p)} filter="url(#global-blur-xs)" />)}
      </g>
      {kinky && <Grain clip={clip} color={p.pal.specular} opacity={0.3 * shineOf(p)} />}
    </g>
  );
}

function wig(o: WigOpts): StyleLayers {
  return {
    back: (p) => {
      const d = backMass(o.bottom, o.extra ?? 0, o.bob ? 14 : 0);
      const clip = p.id('wigBack');
      const strands: React.ReactElement[] = [];
      for (let i = 0; i <= 28; i++) {
        const x = 156 - (o.extra ?? 0) + i * (10.3 + (o.extra ?? 0) / 14);
        const top = 200 + Math.abs(x - 300) * 0.55;
        const w = o.amp ? `C ${x + o.amp} ${top + (o.bottom - top) * 0.33} ${x - o.amp} ${top + (o.bottom - top) * 0.66}` : `C ${x} ${top + 200} ${x} ${o.bottom - 200}`;
        strands.push(<path key={i} d={`M ${f(x)} ${f(top)} ${w} ${f(x)} ${o.bottom}`} fill="none" stroke={i % 3 === 0 ? p.pal.specular : p.pal.strandHighlight} strokeWidth={o.texture === 'kinky' ? 1.6 : i % 3 === 0 ? 0.9 : 1.3} opacity={(i % 3 === 0 ? 0.35 : 0.5) * shineOf(p)} />);
      }
      return (
        <>
          <clipPath id={clip}>
            <path d={d} />
          </clipPath>
          <path d={d} fill={`url(#${p.id('hairLong')})`} />
          <path d={`M 230 430 C 236 500 246 ${Math.min(o.bottom, 620) - 40} 256 ${Math.min(o.bottom, 620)} L 344 ${Math.min(o.bottom, 620)} C 354 ${Math.min(o.bottom, 620) - 40} 364 500 370 430 Z`} fill={darken(p.pal.darkShadow, 0.4)} opacity="0.8" filter="url(#global-blur-md)" />
          <g clipPath={`url(#${clip})`}>{strands}</g>
          {o.texture === 'kinky' && <Grain clip={clip} color={p.pal.specular} opacity={0.3 * shineOf(p)} />}
        </>
      );
    },
    side: (p) => {
      const part = o.sidePart ?? 300;
      const left = curtain({ ...o, part });
      const right = curtain({ ...o, part: 600 - part, inX: part === 300 ? o.inX : (o.inX ?? 242) - 14 });
      return (
        <>
          {curtainArt(p, left, 'L', o.texture)}
          <g transform={MIRROR}>{curtainArt(p, right, 'R', o.texture)}</g>
          {o.bob && (
            <>
              <path d={toD(left.outer.slice(-2))} stroke={p.pal.darkShadow} strokeWidth="2" />
            </>
          )}
        </>
      );
    },
    front: (p) => (
      <>
        {capWithPart(p, o.sidePart ?? 300)}
        {o.texture === 'kinky' && <Grain clip={p.id('wigCap')} color={p.pal.specular} opacity={0.3 * shineOf(p)} />}
      </>
    ),
  };
}

// ---------------------------------------------------------------------------
// Sculpted finger waves (short, close to the head)
// ---------------------------------------------------------------------------
const FW_CAP = 'M 190 352 C 178 250 214 168 300 160 C 386 168 422 250 410 352 C 404 312 398 284 386 264 C 362 236 330 228 300 230 C 268 232 240 244 226 270 C 214 292 206 318 202 344 Z';

const fingerWaves: StyleLayers = {
  front: (p) => {
    const clip = p.id('fwClip');
    const rows = Array.from({ length: 8 }, (_, i) => 176 + i * 22);
    return (
      <>
        <clipPath id={clip}>
          <path d={FW_CAP} />
        </clipPath>
        <path d={FW_CAP} fill={`url(#${p.id('hairG')})`} />
        <g clipPath={`url(#${clip})`}>
          {rows.map((y, i) => {
            const ph = i % 2 ? 0 : 22;
            const d = `M 170 ${y} C ${200 + ph} ${y - 20} ${236 + ph} ${y + 20} ${272 + ph} ${y} S ${344 + ph} ${y + 20} ${380 + ph} ${y} S ${452} ${y + 18} 470 ${y}`;
            return (
              <g key={i}>
                <path d={d} fill="none" stroke={p.pal.darkShadow} strokeWidth="5" opacity="0.7" filter="url(#global-blur-xs)" />
                <path d={d} transform="translate(0 -6)" fill="none" stroke={p.pal.specular} strokeWidth="3" opacity={0.45 * shineOf(p)} filter="url(#global-blur-xs)" />
              </g>
            );
          })}
        </g>
        {/* sculpted pin curl at the temple */}
        <path d="M 208 300 C 196 270 214 246 238 252 C 256 258 254 282 236 284 C 224 284 222 272 230 268" fill="none" stroke={p.pal.darkShadow} strokeWidth="9" strokeLinecap="round" />
        <path d="M 208 300 C 196 270 214 246 238 252 C 256 258 254 282 236 284" fill="none" stroke={p.pal.strandHighlight} strokeWidth="2.4" opacity={0.7 * shineOf(p)} />
      </>
    );
  },
};

// ---------------------------------------------------------------------------
// Curly wigs
// ---------------------------------------------------------------------------
const curlyBob: StyleLayers = {
  back: (p) =>
    curlCloud(p, 'cbBack', [[300, 210, 100], [214, 270, 66], [386, 270, 66], [196, 350, 60], [404, 350, 60], [206, 430, 52], [394, 430, 52], [240, 470, 40], [360, 470, 40]], 101),
  front: (p) => curlCloud(p, 'cbFront', [[256, 214, 44], [324, 206, 46], [214, 254, 30], [386, 252, 32], [200, 300, 20], [400, 300, 20]], 103),
};

const afroWig: StyleLayers = {
  back: (p) =>
    curlCloud(p, 'awBack', [[300, 196, 156], [190, 270, 112], [410, 270, 112], [176, 370, 92], [424, 370, 92], [196, 450, 64], [404, 450, 64]], 107),
  front: (p) => curlCloud(p, 'awFront', [[262, 210, 50], [338, 210, 50], [214, 250, 34], [386, 250, 34], [198, 296, 20], [402, 296, 20]], 109),
};

// ---------------------------------------------------------------------------
// Braids and twists
// ---------------------------------------------------------------------------
/** Straight-back cornrows: tight rows over the scalp, finished in braids down the back. */
const cornrows: StyleLayers = {
  back: (p) => <>{backBraids(p, 10, 520, 10, 171)}</>,
  front: (p) => (
    <>
      <ScalpCap p={p} />
      {scalpRows(p, 12, 13, { spread: 0.98 })}
    </>
  ),
};

const ghanaWeaving: StyleLayers = {
  back: (p) => <>{backBraids(p, 12, 720, 11, 113)}</>,
  front: (p) => (
    <>
      <ScalpCap p={p} />
      {scalpRows(p, 11, 15, { spread: 0.98 })}
    </>
  ),
};

/** Two-strand twist with a spiral texture and curly ends (passion twists). */
const Twist: React.FC<{ p: HairProps; pts: Pt[]; w: number; seed: number }> = ({ p, pts, w, seed }) => {
  const d = toD(pts);
  const end = pts[pts.length - 1];
  return (
    <g>
      <path d={d} fill="none" stroke={p.pal.darkShadow} strokeWidth={w + 2.4} strokeLinecap="round" />
      <path d={d} fill="none" stroke={`url(#${p.id('hairLong')})`} strokeWidth={w} strokeLinecap="round" />
      <path d={d} fill="none" stroke={p.pal.strandHighlight} strokeWidth={w * 0.5} strokeDasharray={`${w * 0.7} ${w * 0.6}`} opacity={0.55 * shineOf(p)} />
      <path d={d} transform={`translate(${-w * 0.22} 0)`} fill="none" stroke={p.pal.specular} strokeWidth={w * 0.16} strokeLinecap="round" opacity={0.35 * shineOf(p)} />
      {coils(seed, end[0], end[1] + 6, w * 0.9, 10, 10, p.pal.strandHighlight, 2.6)}
    </g>
  );
};

function twists(p: HairProps, n: number, len: number, w: number, seed: number, sway: number) {
  const rnd = seeded(seed);
  const rows: Pt[][] = [];
  const out = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const pts = hang(194 + t * 212, 248 + Math.abs(t - 0.5) * 110, len * (0.9 + rnd() * 0.14), sway + rnd() * 8, rnd() * 6, (t - 0.5) * 180, 14);
    rows.push(pts);
    return <Twist key={i} p={p} pts={pts} w={w} seed={seed + i} />;
  });
  return [hairMass(p, rows), ...out];
}

const passionTwists: StyleLayers = {
  back: (p) => <>{twists(p, 22, 720, 11, 127, 16)}</>,
  side: (p) => (
    <>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <Twist p={p} pts={hang(194 - i * 8, 290 + i * 8, 600 - i * 20, 12, i * 1.3, -28 - i * 3, 14)} w={11} seed={131 + i} />
          <g transform={MIRROR}>
            <Twist p={p} pts={hang(194 - i * 8, 290 + i * 8, 600 - i * 24, 12, i * 1.7 + 1, -28 - i * 3, 14)} w={11} seed={141 + i} />
          </g>
        </g>
      ))}
    </>
  ),
  front: (p) => braidCap(p, 11, { rope: true, n: 15 }),
};

/** Goddess locs: locs with loose curly strands left out between them. */
function tendrils(p: HairProps, n: number, len: number, seed: number) {
  const rnd = seeded(seed);
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const x0 = 200 + t * 200;
    const y0 = 260 + Math.abs(t - 0.5) * 110;
    const L = len * (0.6 + rnd() * 0.4);
    const pts: Pt[] = Array.from({ length: 40 }, (_, k) => {
      const u = k / 39;
      return [x0 + (t - 0.5) * 130 * u + Math.sin(u * 40 + i) * 7, y0 + L * u] as Pt;
    });
    return <path key={i} d={toD(pts)} fill="none" stroke={p.pal.strandHighlight} strokeWidth="2" opacity={0.75 * shineOf(p)} />;
  });
}

const goddessLocs: StyleLayers = {
  back: (p) => (
    <>
      {backBraids(p, 18, 760, 12, 151, true)}
      {tendrils(p, 12, 700, 157)}
    </>
  ),
  side: (p) => (
    <>
      {frontBraids(p, 3, 680, 12, 161, true, true)}
      {[0, 1].map((m) => (
        <g key={m} transform={m ? MIRROR : undefined}>
          {[0, 1].map((i) => {
            const pts: Pt[] = Array.from({ length: 36 }, (_, k) => {
              const u = k / 35;
              return [186 - i * 10 - u * 30 + Math.sin(u * 34 + i) * 6, 300 + i * 10 + u * 560] as Pt;
            });
            return <path key={i} d={toD(pts)} fill="none" stroke={p.pal.strandHighlight} strokeWidth="2.2" opacity={0.8 * shineOf(p)} />;
          })}
        </g>
      ))}
    </>
  ),
  front: (p) => braidCap(p, 12, { rope: true, part: 270, n: 15 }),
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
export const WIG_STYLES: Partial<Record<HairStyle, StyleLayers>> = {
  bluntBob: wig({ len: 304, bottom: 500, bob: true, inX: 238, outX: 186, inSlope: 10, outSlope: 10 }),
  sidePartFrontal: wig({ len: 690, bottom: 880, sidePart: 252, inX: 238, outX: 190 }),
  kinkyStraight: wig({ len: 640, bottom: 840, extra: 18, inX: 236, outX: 178, outSlope: 70, texture: 'kinky' }),
  waterWave: wig({ len: 660, bottom: 860, amp: 14, freq: 56, inX: 238, outX: 184, outSlope: 60, texture: 'wave' }),
  butterflyLayers: wig({ len: 620, bottom: 820, extra: 10, inX: 232, outX: 184, outSlope: 70, flicks: 38 }),
  fingerWaves,
  curlyBob,
  afroWig,
  ghanaWeaving,
  cornrows,
  passionTwists,
  goddessLocs,
};

