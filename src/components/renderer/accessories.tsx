import React from 'react';
import { Accessories, SkinPalette } from '../../types/character';
import { darken, lighten, mix } from './color';
import { BodySpec, edgeXAt } from './geometry';
import { fabricDefs } from './clothes';

/**
 * Accessories. Shoes, bags and wristwear are drawn in body space;
 * necklaces, glasses and headwear in divine.svg head space (inside the head transform).
 */

type Id = (n: string) => string;
const MIRROR = 'translate(600 0) scale(-1 1)';
const f = (n: number) => n.toFixed(1);

// ---------------------------------------------------------------------------
// Shoes (body space). Foot space: ankle at (0,0), toes at y ~ 80. Plain customers wear worn slippers.
// ---------------------------------------------------------------------------
function pump(c: string, o: { heel?: 'stiletto' | 'block' | 'platform' | 'none'; strap?: boolean; open?: boolean } = {}) {
  const heel = o.heel ?? 'stiletto';
  return (
    <>
      {heel === 'stiletto' && <path d="M 11 26 L 15 28 L 16 84 L 13 84 Z" fill={darken(c, 0.4)} />}
      {heel === 'block' && <path d="M 9 30 L 17 30 L 18 82 L 9 82 Z" fill={darken(c, 0.4)} />}
      {heel === 'platform' && (
        <>
          <path d="M 8 26 L 18 26 L 20 82 L 8 82 Z" fill={darken(c, 0.4)} />
          <path d="M -20 82 C -14 104 14 104 20 82 L 20 92 C 14 112 -14 112 -20 92 Z" fill={darken(c, 0.3)} />
        </>
      )}
      {o.open ? (
        <path d="M -17 56 C -8 62 8 62 17 56 C 19 66 14 82 0 96 C -14 82 -19 66 -17 56 Z" fill={c} />
      ) : (
        <path d="M -16 50 C -8 57 8 57 16 50 C 19 64 14 82 0 96 C -14 82 -19 64 -16 50 Z" fill={c} />
      )}
      <path d={o.open ? 'M -17 56 C -8 62 8 62 17 56' : 'M -16 50 C -8 57 8 57 16 50'} fill="none" stroke={darken(c, 0.35)} strokeWidth="1.6" />
      <path d="M -8 64 C -9 72 -5 82 -1 88" fill="none" stroke={lighten(c, 0.5)} strokeWidth="2.2" opacity="0.6" />
      {o.strap && <path d="M -13 12 C -6 17 6 17 13 12" fill="none" stroke={c} strokeWidth="3.6" strokeLinecap="round" />}
    </>
  );
}

function shoeShape(kind: string, c: string, skin: SkinPalette): React.ReactNode {
  const toes = [-9, -3, 3, 9].map((x) => <ellipse key={x} cx={x} cy={78 - Math.abs(x) * 0.3} rx="2.6" ry="3.2" fill={lighten(skin.base, 0.25)} opacity="0.85" />);
  switch (kind) {
    case 'heels':
      return pump(c);
    case 'blockHeels':
      return pump(c, { heel: 'block', strap: true });
    case 'platforms':
      return pump(c, { heel: 'platform', strap: true });
    case 'mules':
      return (
        <>
          <path d="M 9 34 L 16 34 L 16 80 L 10 80 Z" fill={darken(c, 0.4)} />
          <path d="M -18 40 C -8 34 8 34 18 40 C 21 60 16 76 0 82 C -16 76 -21 60 -18 40 Z" fill={c} />
          <path d="M -18 40 C -8 34 8 34 18 40" fill="none" stroke={darken(c, 0.35)} strokeWidth="1.8" />
          <path d="M -10 46 C -11 58 -7 70 -2 76" fill="none" stroke={lighten(c, 0.45)} strokeWidth="2.4" opacity="0.5" />
          {toes}
        </>
      );
    case 'sandals':
      return (
        <>
          <path d="M 11 30 L 16 32 L 15 76 L 12 76 Z" fill={darken(c, 0.35)} />
          <path d="M -18 78 C -12 86 12 86 18 78" fill="none" stroke={darken(c, 0.3)} strokeWidth="4" strokeLinecap="round" />
          <path d="M -13 10 C -6 14 6 14 13 10" fill="none" stroke={c} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M -15 46 C -6 52 6 52 15 46" fill="none" stroke={c} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M -17 64 C -6 70 6 70 17 64" fill="none" stroke={c} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M -12 12 L -14 46 M 12 12 L 14 46" stroke={c} strokeWidth="2" />
          {toes}
        </>
      );
    case 'slides':
      return (
        <>
          <path d="M -19 78 C -12 90 12 90 19 78 L 19 84 C 12 96 -12 96 -19 84 Z" fill={darken(c, 0.35)} />
          <path d="M -19 34 C -8 28 8 28 19 34 L 19 58 C 8 64 -8 64 -19 58 Z" fill={c} />
          <path d="M -12 42 L 12 42" stroke={lighten(c, 0.4)} strokeWidth="3" opacity="0.6" />
          {toes}
        </>
      );
    case 'flats':
      return (
        <>
          <path d="M -18 48 C -20 64 -13 86 0 86 C 13 86 20 64 18 48 C 10 54 -10 54 -18 48 Z" fill={c} />
          <path d="M -18 48 C -10 54 10 54 18 48" fill="none" stroke={darken(c, 0.35)} strokeWidth="1.6" />
          <path d="M -5 56 q 5 5 10 0" fill="none" stroke={lighten(c, 0.4)} strokeWidth="2.4" />
          <path d="M -10 62 C -11 72 -7 80 -2 83" fill="none" stroke={lighten(c, 0.45)} strokeWidth="2.2" opacity="0.5" />
        </>
      );
    case 'palmSlippers':
      return (
        <>
          <path d="M -20 80 C -12 92 12 92 20 80 L 20 86 C 12 98 -12 98 -20 86 Z" fill={darken(c, 0.4)} />
          <path d="M -19 44 C -10 36 10 36 19 44 L 17 60 C 6 54 -6 54 -17 60 Z" fill={c} />
          <path d="M -17 54 L 0 40 L 17 54" fill="none" stroke={lighten(c, 0.35)} strokeWidth="2" />
          {toes}
        </>
      );
    case 'sneakers':
      return (
        <>
          <path d="M -20 26 C -25 52 -25 76 -21 88 C -12 98 12 98 21 88 C 25 76 25 52 20 26 Z" fill="#F4F2EE" />
          <path d="M -22 78 C -12 88 12 88 22 78 L 22 88 C 12 98 -12 98 -22 88 Z" fill="#D8D4CC" />
          <path d="M -10 36 L 10 36 M -11 44 L 11 44 M -11 52 L 11 52" stroke="#B8B2A8" strokeWidth="1.6" />
          <path d="M -21 62 C -10 58 6 66 21 58" fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" />
          <path d="M -20 26 C -25 52 -25 76 -21 88" fill="none" stroke="#A8A29A" strokeWidth="1.4" />
        </>
      );
    case 'oxfords':
      return (
        <>
          <path d="M -17 22 C -21 46 -23 66 -19 80 C -12 90 12 90 19 80 C 23 66 21 46 17 22 Z" fill={c} />
          <path d="M -8 30 L 8 30 M -9 37 L 9 37 M -9 44 L 9 44" stroke={lighten(c, 0.35)} strokeWidth="1.4" />
          <path d="M -15 54 C -6 60 6 60 15 54" fill="none" stroke={darken(c, 0.45)} strokeWidth="1.6" />
          <path d="M -12 60 C -14 70 -10 80 -4 84" fill="none" stroke={lighten(c, 0.5)} strokeWidth="2.6" opacity="0.55" />
          <path d="M -19 80 C -12 90 12 90 19 80" fill="none" stroke={darken(c, 0.5)} strokeWidth="3" />
        </>
      );
    case 'ankleBoots':
    case 'kneeBoots':
    case 'mensBoots':
      return (
        <>
          {kind !== 'mensBoots' && <path d="M 9 30 L 17 30 L 18 84 L 9 84 Z" fill={darken(c, 0.45)} />}
          <path d="M -15 -10 L 15 -10 C 18 20 22 60 18 82 C 10 94 -10 94 -18 82 C -22 60 -18 20 -15 -10 Z" fill={c} />
          <path d="M -10 30 C -12 50 -8 72 -3 84" fill="none" stroke={lighten(c, 0.4)} strokeWidth="2.6" opacity="0.5" />
          {kind === 'mensBoots' && <path d="M -18 82 C -10 94 10 94 18 82" fill="none" stroke={darken(c, 0.5)} strokeWidth="3.4" />}
        </>
      );
    default:
      // loafers
      return (
        <>
          <path d="M -17 22 C -21 46 -23 66 -19 80 C -12 90 12 90 19 80 C 23 66 21 46 17 22 Z" fill={c} />
          <path d="M -12 40 C -6 46 6 46 12 40" fill="none" stroke={darken(c, 0.4)} strokeWidth="2.2" />
          <path d="M -12 58 C -14 70 -10 80 -4 84" fill="none" stroke={lighten(c, 0.45)} strokeWidth="2.6" opacity="0.5" />
          <path d="M -19 80 C -12 90 12 90 19 80" fill="none" stroke={darken(c, 0.5)} strokeWidth="3" />
        </>
      );
  }
}

/** Boot shaft in body space, following the leg from topY down to the ankle. */
function bootShaft(spec: BodySpec, topY: number, c: string) {
  const ys: number[] = [];
  for (let y = topY; y <= spec.ankle[1] + 4; y += 30) ys.push(y);
  ys.push(spec.ankle[1] + 4);
  const out = ys.map((y) => `${f(edgeXAt(spec.legOuter, y) - 4)} ${f(y)}`);
  const inn = [...ys].reverse().map((y) => `${f(Math.min(298, edgeXAt(spec.legInner, y) + 4))} ${f(y)}`);
  const d = `M ${out.join(' L ')} L ${inn.join(' L ')} Z`;
  return (
    <>
      <path d={d} fill={c} strokeLinejoin="round" stroke={c} strokeWidth="4" />
      <path d={`M ${f(edgeXAt(spec.legOuter, topY) - 4)} ${topY} L ${f(edgeXAt(spec.legInner, topY) + 4)} ${topY}`} stroke={darken(c, 0.4)} strokeWidth="3" />
      <path d={`M ${f(edgeXAt(spec.legOuter, topY + 20) + 8)} ${topY + 20} L ${f(edgeXAt(spec.legOuter, spec.ankle[1] - 30) + 10)} ${spec.ankle[1] - 30}`} stroke={lighten(c, 0.4)} strokeWidth="4" opacity="0.4" />
    </>
  );
}

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
  } else shoe = shoeShape(acc.shoes, c, skin);
  const shaftTop = !plain && acc.shoes === 'kneeBoots' ? spec.knee[1] + 10 : !plain && (acc.shoes === 'ankleBoots' || acc.shoes === 'mensBoots') ? spec.ankle[1] - 90 : 0;
  const one = (
    <g>
      {shaftTop > 0 && bootShaft(spec, shaftTop, c)}
      <g transform={`translate(${spec.ankle[0]} ${spec.ankle[1] - 6}) rotate(4) scale(${s})`}>{shoe}</g>
    </g>
  );
  return (
    <g>
      {one}
      <g transform={MIRROR}>{one}</g>
    </g>
  );
};

// ---------------------------------------------------------------------------
// Bags and wristwear (body space, drawn after the hands)
// ---------------------------------------------------------------------------
const hw = (c: string) => '#D9B25A';

function bagBody(kind: string, bc: string, id: Id): React.ReactNode {
  const hi = lighten(bc, 0.35);
  const lo = darken(bc, 0.4);
  switch (kind) {
    case 'clutch':
      return (
        <g transform="rotate(-8)">
          <rect x="-30" y="-16" width="60" height="32" rx="7" fill={bc} />
          <path d="M -30 -6 Q 0 10 30 -6" fill={darken(bc, 0.15)} />
          <path d="M -30 -6 Q 0 10 30 -6" fill="none" stroke={lo} strokeWidth="1.2" />
          <circle cx="0" cy="4" r="3" fill="#E2B654" />
          <path d="M -24 -12 L 20 -12" stroke={hi} strokeWidth="2" opacity="0.6" />
        </g>
      );
    case 'beadedBag':
      return (
        <g transform="rotate(-6)">
          <path d="M -12 -18 Q 0 -36 12 -18" fill="none" stroke={`url(#${id('gold')})`} strokeWidth="3" />
          <rect x="-26" y="-18" width="52" height="40" rx="6" fill={bc} />
          {Array.from({ length: 5 }, (_, r) => Array.from({ length: 7 }, (_, k) => (
            <circle key={`${r}-${k}`} cx={-21 + k * 7} cy={-12 + r * 7.5} r="2.6" fill={(r + k) % 3 === 0 ? '#F4E2B0' : (r + k) % 3 === 1 ? lighten(bc, 0.3) : darken(bc, 0.2)} />
          )))}
          <rect x="-26" y="-18" width="52" height="40" rx="6" fill="none" stroke={lo} strokeWidth="1.2" />
        </g>
      );
    case 'miniBag':
      return (
        <g>
          <path d="M -14 -14 C -14 -34 14 -34 14 -14" fill="none" stroke={lo} strokeWidth="3.4" />
          <path d="M -24 -14 L 24 -14 L 28 20 L -28 20 Z" fill={bc} />
          <path d="M -24 -14 L 24 -14 L 22 2 L -22 2 Z" fill={darken(bc, 0.12)} />
          <rect x="-5" y="-2" width="10" height="7" rx="1.5" fill={hw(bc)} />
          <path d="M -20 8 L -22 16" stroke={hi} strokeWidth="3" opacity="0.5" />
        </g>
      );
    case 'bucketBag':
      return (
        <g>
          <path d="M -10 -34 C -10 -50 10 -50 10 -34" fill="none" stroke={lo} strokeWidth="3.4" />
          <path d="M -24 -30 C -26 0 -28 26 -22 40 C -10 48 10 48 22 40 C 28 26 26 0 24 -30 Z" fill={bc} />
          <path d="M -24 -30 C -10 -24 10 -24 24 -30" fill="none" stroke={lo} strokeWidth="2" />
          <path d="M -18 -24 C -8 -20 8 -20 18 -24" fill="none" stroke={hw(bc)} strokeWidth="1.6" strokeDasharray="3 3" />
          <path d="M 4 -22 l 4 18 m -8 -18 l -6 16" stroke={darken(bc, 0.3)} strokeWidth="2" />
          <path d="M -16 -10 C -18 10 -16 28 -12 38" fill="none" stroke={hi} strokeWidth="4" opacity="0.35" />
        </g>
      );
    default:
      return null;
  }
}

export const HandAccessories: React.FC<{ id: Id; spec: BodySpec; acc: Accessories }> = ({ id, spec, acc }) => {
  const bc = acc.bagColor || '#7A2A2A';
  const [wx, wy] = spec.wrist;
  const s = spec.handScale;
  const rx = 600 - wx; // the right hand (image right) carries hand-held bags
  const [sy, sh] = spec.shoulder;
  const bag = acc.bag;
  const held = ['clutch', 'beadedBag', 'miniBag', 'bucketBag'].includes(bag);
  return (
    <g>
      {acc.wrist === 'watch' && (
        <g>
          <rect x={wx - 13} y={wy - 18} width="26" height="10" rx="3" fill="#C9A24A" />
          <circle cx={wx - 2} cy={wy - 13} r="7" fill="#F4ECD8" stroke="#A9781E" strokeWidth="2" />
          <path d={`M ${wx - 2} ${wy - 13} l 0 -4 M ${wx - 2} ${wy - 13} l 3 1`} stroke="#3A2A1A" strokeWidth="0.9" />
        </g>
      )}
      {acc.wrist === 'cuff' && <rect x={wx - 14} y={wy - 26} width="28" height="18" rx="5" fill={`url(#${id('gold')})`} stroke="#A9781E" strokeWidth="1" />}
      {acc.wrist === 'bangles' &&
        [0, 1].map((m) => (
          <g key={m} transform={m ? MIRROR : undefined}>
            {[0, 6, 12].map((dy) => (
              <ellipse key={dy} cx={wx} cy={wy - 26 + dy} rx="14" ry="4" fill="none" stroke={`url(#${id('gold')})`} strokeWidth="2.6" />
            ))}
          </g>
        ))}
      {acc.wrist === 'coralBracelet' &&
        Array.from({ length: 7 }, (_, i) => <circle key={i} cx={wx - 12 + i * 4} cy={wy - 16 + Math.sin((i / 6) * Math.PI) * 4} r="3.2" fill="#C2452D" stroke="#8A2A1A" strokeWidth="0.5" />)}

      {held && <g transform={`translate(${rx} ${wy + (bag === 'clutch' || bag === 'beadedBag' ? 50 : 96) * s})`}>{bagBody(bag, bc, id)}</g>}

      {bag === 'tote' && (
        <g>
          <path d={`M ${spec.elbow[0] - 4} ${spec.elbow[1] - 10} C ${spec.elbow[0] - 30} ${spec.elbow[1] - 70} ${spec.elbow[0] - 70} ${spec.elbow[1] - 40} ${spec.elbow[0] - 60} ${spec.elbow[1] + 30}`} fill="none" stroke={darken(bc, 0.3)} strokeWidth="5" />
          <path d={`M ${spec.elbow[0] - 88} ${spec.elbow[1] + 26} L ${spec.elbow[0] - 20} ${spec.elbow[1] + 26} L ${spec.elbow[0] - 12} ${spec.elbow[1] + 116} L ${spec.elbow[0] - 96} ${spec.elbow[1] + 116} Z`} fill={bc} />
          <path d={`M ${spec.elbow[0] - 88} ${spec.elbow[1] + 26} L ${spec.elbow[0] - 20} ${spec.elbow[1] + 26}`} stroke={darken(bc, 0.4)} strokeWidth="2" />
          <path d={`M ${spec.elbow[0] - 80} ${spec.elbow[1] + 40} L ${spec.elbow[0] - 84} ${spec.elbow[1] + 108}`} stroke={lighten(bc, 0.3)} strokeWidth="5" opacity="0.4" />
        </g>
      )}

      {bag === 'shoulderBag' && (() => {
        const ox = spec.armOuter[2][0];
        const by = spec.waist[0] + 10;
        return (
          <g>
            <path d={`M ${300 - sh * 0.6} ${sy - 4} C ${300 - sh - 30} ${sy - 10} ${ox - 30} ${by - 120} ${ox - 24} ${by - 24}`} fill="none" stroke={darken(bc, 0.3)} strokeWidth="4" />
            <path d={`M ${ox - 66} ${by - 28} L ${ox + 10} ${by - 28} C ${ox + 16} ${by + 10} ${ox + 10} ${by + 40} ${ox - 4} ${by + 46} L ${ox - 54} ${by + 46} C ${ox - 68} ${by + 40} ${ox - 72} ${by + 10} ${ox - 66} ${by - 28} Z`} fill={bc} />
            <path d={`M ${ox - 66} ${by - 28} L ${ox + 10} ${by - 28} L ${ox + 6} ${by} L ${ox - 62} ${by} Z`} fill={darken(bc, 0.12)} />
            <rect x={ox - 34} y={by - 6} width="12" height="9" rx="2" fill={hw(bc)} />
            <path d={`M ${ox - 58} ${by + 8} L ${ox - 60} ${by + 36}`} stroke={lighten(bc, 0.35)} strokeWidth="4" opacity="0.4" />
          </g>
        );
      })()}

      {bag === 'crossbody' && (() => {
        const bx = 300 - spec.hip[1] + 18;
        const by = spec.hhip[0] - 6;
        return (
          <g>
            <path d={`M ${300 + sh * 0.55} ${sy - 4} L ${bx + 14} ${by - 22}`} stroke={darken(bc, 0.35)} strokeWidth="4.6" />
            <path d={`M ${300 + sh * 0.55} ${sy - 4} L ${bx + 14} ${by - 22}`} stroke={lighten(bc, 0.2)} strokeWidth="1" strokeDasharray="3 3" />
            <rect x={bx - 26} y={by - 24} width="54" height="40" rx="8" fill={bc} />
            <path d={`M ${bx - 26} ${by - 16} Q ${bx + 1} ${by + 4} ${bx + 28} ${by - 16} L ${bx + 28} ${by - 16} L ${bx + 28} ${by - 16}`} fill="none" stroke={darken(bc, 0.4)} strokeWidth="1.4" />
            <circle cx={bx + 1} cy={by - 4} r="3.4" fill={hw(bc)} />
          </g>
        );
      })()}

      {bag === 'backpack' &&
        [0, 1].map((m) => (
          <g key={m} transform={m ? MIRROR : undefined}>
            <path d={`M ${300 - sh * 0.62} ${sy - 6} C ${300 - sh * 0.75} ${spec.bust[0] - 40} ${300 - spec.pit[1] + 4} ${spec.bust[0]} ${300 - spec.pit[1] - 2} ${spec.under[0] + 30}`} fill="none" stroke={darken(bc, 0.25)} strokeWidth="11" strokeLinecap="round" />
            <path d={`M ${300 - sh * 0.62} ${sy - 6} C ${300 - sh * 0.75} ${spec.bust[0] - 40} ${300 - spec.pit[1] + 4} ${spec.bust[0]} ${300 - spec.pit[1] - 2} ${spec.under[0] + 30}`} fill="none" stroke={lighten(bc, 0.2)} strokeWidth="2" opacity="0.5" />
            <rect x={300 - sh * 0.7 - 6} y={spec.bust[0] - 30} width="12" height="9" rx="2" fill="#2A2A2E" />
          </g>
        ))}
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
          const x = 248 + t * 104;
          const yy = y - 26 + Math.sin(t * Math.PI) * (40 + si * 8);
          const g = i % 5 === 2;
          return (
            <g key={`${si}-${i}`}>
              <circle cx={x} cy={yy} r={g ? r * 0.7 : r} fill={g ? `url(#${id('gold')})` : '#C2452D'} />
              {!g && <circle cx={x - r * 0.35} cy={yy - r * 0.35} r={r * 0.3} fill="#FFD2C2" opacity="0.8" />}
            </g>
          );
        }),
      )}
    </g>
  );
};

const CHAIN = (drop: number, w = 32) => `M ${300 - w} 524 C ${300 - w + 8} ${524 + drop * 0.7} ${290} ${524 + drop} 300 ${524 + drop + 4} C 310 ${524 + drop} ${300 + w - 8} ${524 + drop * 0.7} ${300 + w} 524`;

export const Necklace: React.FC<{ id: Id; kind: string; male: boolean }> = ({ id, kind, male }) => {
  const g = `url(#${id('gold')})`;
  const chain = (drop: number, w?: number, width = 2) => (
    <>
      <path d={CHAIN(drop, w)} fill="none" stroke={g} strokeWidth={width} />
      <path d={CHAIN(drop, w)} fill="none" stroke="#FFF4C8" strokeWidth={width * 0.35} strokeDasharray="2 3" opacity="0.9" />
    </>
  );
  const along = (drop: number, n: number, w = 32) =>
    Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      const x = 300 - w + t * w * 2;
      const y = 524 + Math.sin(t * Math.PI) * (drop + 2);
      return [x, y] as [number, number];
    });
  let body: React.ReactNode = null;
  switch (kind) {
    case 'chain':
      body = chain(male ? 70 : 46);
      break;
    case 'pendant':
      body = (
        <>
          {chain(82)}
          <circle cx="300" cy="612" r="5" fill={g} />
          <circle cx="298.5" cy="610.5" r="1.6" fill="#FFF8DC" />
        </>
      );
      break;
    case 'layered':
      body = (
        <>
          {chain(36, 30, 1.6)}
          {chain(70, 34, 1.8)}
          {chain(104, 38, 2)}
          <path d="M 300 632 l 6 8 l -6 10 l -6 -10 Z" fill={g} />
        </>
      );
      break;
    case 'pearls':
      body = along(60, 19).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" fill={`url(#${id('pearl')})`} stroke="#C8BFB0" strokeWidth="0.5" />);
      break;
    case 'choker':
      body = (
        <>
          <path d="M 262 508 Q 300 528 338 508" fill="none" stroke="#1A1416" strokeWidth="9" />
          <circle cx="300" cy="524" r="4" fill={g} />
        </>
      );
      break;
    case 'cuban':
      body = along(54, 15, 34).map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="5.5" ry="3.6" fill="none" stroke={g} strokeWidth="2.6" transform={`rotate(${(i - 7) * 8} ${x} ${y})`} />);
      break;
    case 'coral':
      return <g transform={male ? 'translate(300 0) scale(1.3 1) translate(-300 0)' : undefined}><Beads id={id} /></g>;
    default:
      return null;
  }
  return <g transform={male ? 'translate(300 0) scale(1.3 1) translate(-300 0)' : undefined}>{body}</g>;
};

export const Glasses: React.FC<{ kind: string }> = ({ kind }) => {
  const clear = kind === 'clear';
  const frame = clear ? '#2A2220' : kind === 'aviators' ? '#B8913E' : '#0A0808';
  const lensFill = clear ? '#DCE8F0' : kind === 'aviators' ? '#3A2A1E' : '#1A1414';
  const lensOp = clear ? 0.14 : 0.9;
  const lens = (cx: number, flip: number) => {
    let d: string;
    if (kind === 'catEye') d = `M ${cx - 38 * flip} 316 C ${cx - 10 * flip} 310 ${cx + 30 * flip} 312 ${cx + 40 * flip} 306 C ${cx + 38 * flip} 336 ${cx + 22 * flip} 358 ${cx} 358 C ${cx - 24 * flip} 358 ${cx - 38 * flip} 340 ${cx - 38 * flip} 316 Z`;
    else if (kind === 'aviators') d = `M ${cx - 36 * flip} 316 C ${cx - 10 * flip} 312 ${cx + 20 * flip} 312 ${cx + 38 * flip} 316 C ${cx + 40 * flip} 344 ${cx + 22 * flip} 366 ${cx + 4 * flip} 366 C ${cx - 20 * flip} 366 ${cx - 38 * flip} 344 ${cx - 36 * flip} 316 Z`;
    else if (kind === 'oversized') d = `M ${cx - 44} 306 L ${cx + 44} 306 C ${cx + 46} 340 ${cx + 40} 370 ${cx} 370 C ${cx - 40} 370 ${cx - 46} 340 ${cx - 44} 306 Z`;
    else d = `M ${cx - 36} 318 Q ${cx - 36} 314 ${cx - 18} 314 L ${cx + 18} 314 Q ${cx + 36} 314 ${cx + 36} 332 L ${cx + 36} 340 Q ${cx + 36} 358 ${cx + 18} 358 L ${cx - 18} 358 Q ${cx - 36} 358 ${cx - 36} 340 Z`;
    return (
      <g key={cx}>
        <path d={d} fill={lensFill} opacity={lensOp} />
        <path d={d} fill="none" stroke={frame} strokeWidth={kind === 'aviators' ? 2.2 : clear ? 2.4 : 3.2} />
        {!clear && <path d={`M ${cx - 24} 324 L ${cx - 6} 350`} stroke="#FFFFFF" strokeWidth="5" opacity="0.2" />}
      </g>
    );
  };
  return (
    <g>
      {lens(251, -1)}
      {lens(349, 1)}
      <path d="M 287 328 Q 300 320 313 328" fill="none" stroke={frame} strokeWidth="3" />
      {kind === 'aviators' && <path d="M 290 316 L 310 316" stroke={frame} strokeWidth="2" />}
      <path d={`M ${kind === 'oversized' ? 207 : 215} 326 L 196 334 M ${kind === 'oversized' ? 393 : 385} 326 L 404 334`} stroke={frame} strokeWidth="3" />
    </g>
  );
};

const GELE_BASE = 'M 188 272 C 180 222 200 176 244 152 C 290 132 352 134 392 156 C 430 178 440 226 420 274 C 362 246 248 244 188 272 Z';
const GELE_FAN = 'M 232 166 C 236 96 300 36 384 28 C 446 24 492 56 502 104 C 470 112 440 132 420 176 C 380 150 300 146 232 166 Z';
const GELE_FAN2 = 'M 214 196 C 186 150 150 132 118 140 C 132 170 158 196 196 222 C 200 212 206 202 214 196 Z';
const GELE_WRAP = 'M 186 280 C 170 220 190 150 250 116 C 300 92 370 98 410 136 C 446 172 446 236 418 280 C 360 252 246 252 186 280 Z';
const GELE_WRAP_TOP = 'M 238 140 C 250 84 310 58 360 70 C 402 82 420 118 408 150 C 380 120 290 112 238 140 Z';
const WRAP = 'M 190 300 C 178 210 218 130 300 124 C 382 130 422 210 410 300 C 380 262 220 262 190 300 Z';
const FILA = 'M 200 254 C 196 204 230 160 300 150 C 362 146 420 160 442 200 C 448 222 424 238 398 238 C 380 240 360 234 350 242 C 330 248 240 248 200 254 Z';

export const Headwear: React.FC<{ id: Id; acc: Accessories; plain: boolean }> = ({ id, acc, plain }) => {
  const kind = acc.headwear;
  if (kind === 'none') return null;
  const c = acc.headwearColor || '#C9A163';
  const native = kind === 'gele' || kind === 'geleWrap' || kind === 'headwrap' || kind === 'fila';
  const fabric = kind === 'headwrap' ? 'ankara' : native ? 'asoOke' : kind === 'beret' ? 'velvet' : 'plain';
  const { defs, paint } = fabricDefs(id, 'headwear', fabric, c, kind === 'headwrap' ? mix(c, '#1E1E24', 0.6) : lighten(c, 0.35), 3, plain);
  const fill = paint.pattern ? `url(#${paint.pattern})` : paint.base;
  const lo = darken(paint.base, 0.4);
  const piece = (d: string, key: string) => (
    <g key={key}>
      <path d={d} fill={paint.base} />
      <path d={d} fill={fill} />
      <path d={d} fill="none" stroke={lo} strokeWidth="2" opacity="0.6" />
    </g>
  );
  const pleats = (n: number, d: (i: number) => string) =>
    Array.from({ length: n }, (_, i) => <path key={i} d={d(i)} fill="none" stroke={darken(paint.base, 0.35)} strokeWidth="2.2" opacity="0.45" />);
  const shine = (cx: number, cy: number, rx: number, ry: number) => <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#FFF" opacity={plain ? 0.04 : 0.16} filter="url(#global-blur-md)" />;
  return (
    <g>
      <defs>{defs}</defs>
      {kind === 'gele' && (
        <>
          {piece(GELE_FAN2, 'f2')}
          {pleats(4, (i) => `M ${208 - i * 3} ${200 + i * 4} C ${180 - i * 8} ${168 + i * 4} ${150 - i * 4} ${154 + i * 4} ${126 + i * 2} ${148 + i * 3}`)}
          {piece(GELE_FAN, 'f1')}
          {pleats(9, (i) => `M ${246 + i * 18} ${162 - i * 1} C ${262 + i * 18} ${110 - i * 6} ${310 + i * 14} ${64 - i * 3} ${370 + i * 12} ${40 + i * 6}`)}
          {piece(GELE_BASE, 'b')}
          {pleats(6, (i) => `M ${200 + i * 3} ${258 - i * 17} C ${250} ${232 - i * 17} ${350} ${232 - i * 17} ${414 - i * 3} ${260 - i * 17}`)}
          <path d="M 384 28 C 446 24 492 56 502 104" fill="none" stroke={lighten(paint.base, 0.4)} strokeWidth="3" opacity={plain ? 0.2 : 0.6} />
          {shine(320, 90, 60, 22)}
        </>
      )}
      {kind === 'geleWrap' && (
        <>
          {piece(GELE_WRAP, 'w')}
          {pleats(7, (i) => `M ${192 + i * 4} ${270 - i * 22} C ${250} ${244 - i * 24} ${360} ${240 - i * 24} ${416 - i * 4} ${270 - i * 22}`)}
          {piece(GELE_WRAP_TOP, 't')}
          {pleats(4, (i) => `M ${250 + i * 10} ${132 - i * 14} C ${290} ${100 - i * 10} ${360} ${100 - i * 10} ${400 - i * 6} ${140 - i * 14}`)}
          {shine(300, 170, 70, 26)}
        </>
      )}
      {kind === 'headwrap' && (
        <>
          {piece(WRAP, 'w')}
          {pleats(5, (i) => `M ${200 + i * 6} ${284 - i * 22} C 250 ${250 - i * 22} 350 ${250 - i * 22} ${400 - i * 6} ${284 - i * 22}`)}
          <path d="M 270 190 C 280 150 320 150 330 190 C 320 214 280 214 270 190 Z" fill={darken(paint.base, 0.1)} />
          <path d="M 270 190 C 280 150 320 150 330 190 C 320 214 280 214 270 190 Z" fill={fill} opacity="0.8" />
          <path d="M 286 196 C 260 170 250 140 270 120 M 314 196 C 340 170 350 140 330 120" fill="none" stroke={darken(paint.base, 0.35)} strokeWidth="2.4" opacity="0.6" />
        </>
      )}
      {kind === 'fila' && (
        <>
          {piece(FILA, 'fila')}
          <path d="M 200 254 C 240 248 330 248 350 242" fill="none" stroke={darken(paint.base, 0.45)} strokeWidth="4" />
          <path d="M 300 152 C 360 150 410 166 430 196" fill="none" stroke={darken(paint.base, 0.3)} strokeWidth="2.2" opacity="0.5" />
        </>
      )}
      {kind === 'beret' && (
        <>
          {piece('M 186 236 C 176 186 222 132 300 126 C 380 122 446 156 452 200 C 456 226 420 236 392 232 C 340 226 250 226 186 236 Z', 'b')}
          <path d="M 196 236 C 250 224 340 224 400 232" fill="none" stroke={lo} strokeWidth="5" />
          <path d="M 300 126 l 2 -12" stroke={lo} strokeWidth="4" strokeLinecap="round" />
          {shine(300, 164, 60, 18)}
        </>
      )}
      {kind === 'cap' && (
        <>
          {piece('M 200 248 C 194 180 238 128 300 124 C 362 128 406 180 400 248 C 340 236 260 236 200 248 Z', 'd')}
          {piece('M 196 248 C 260 232 340 232 404 248 C 410 264 380 276 300 272 C 220 276 190 264 196 248 Z', 'br')}
          <path d="M 300 124 L 300 242 M 248 136 C 236 170 232 210 236 240 M 352 136 C 364 170 368 210 364 240" fill="none" stroke={lo} strokeWidth="1.4" opacity="0.6" />
          <circle cx="300" cy="126" r="5" fill={darken(paint.base, 0.2)} />
          {shine(270, 168, 34, 22)}
        </>
      )}
      {kind === 'bucketHat' && (
        <>
          {piece('M 214 236 C 210 176 246 134 300 132 C 354 134 390 176 386 236 Z', 'd')}
          {piece('M 214 230 C 260 222 340 222 386 230 C 412 240 440 266 450 292 C 380 270 220 270 150 292 C 160 266 188 240 214 230 Z', 'br')}
          {[0, 1, 2].map((i) => <path key={i} d={`M ${170 + i * 4} ${282 - i * 8} C 240 ${262 - i * 8} 360 ${262 - i * 8} ${430 - i * 4} ${282 - i * 8}`} fill="none" stroke={lo} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />)}
          {shine(290, 172, 40, 18)}
        </>
      )}
      {kind === 'fascinator' && (
        <>
          <path d="M 330 150 C 360 70 420 30 470 40 C 440 60 400 100 360 160 Z" fill={darken(paint.base, 0.1)} opacity="0.9" />
          <path d="M 330 150 C 360 70 420 30 470 40" fill="none" stroke={lo} strokeWidth="1.6" />
          {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M ${350 + i * 11} ${120 - i * 8} l -12 -10`} stroke={darken(paint.base, 0.25)} strokeWidth="1.4" />)}
          <ellipse cx="350" cy="170" rx="58" ry="22" transform="rotate(-18 350 170)" fill={paint.base} stroke={lo} strokeWidth="2" />
          <path d="M 300 150 C 330 200 400 210 420 170 L 400 150 Z" fill="none" stroke="#1A1416" strokeWidth="0.8" opacity="0.5" />
          {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M ${306 + i * 18} 150 L ${314 + i * 16} 200`} stroke="#1A1416" strokeWidth="0.6" opacity="0.4" />)}
          <circle cx="350" cy="170" r="6" fill={`url(#${id('gold')})`} />
        </>
      )}
    </g>
  );
};
