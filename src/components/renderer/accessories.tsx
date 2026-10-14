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
    case 'premiumLeatherHeels':
      return <>{pump(c, { heel: 'stiletto', strap: true })}<path d="M -12 60 L 12 60" stroke="#E3C06D" strokeWidth="3.2" /><rect x="-4" y="54" width="8" height="8" rx="2" fill="#D7B254" /></>;
    case 'crystalEveningHeels':
      return <>{pump(c)}{[-9, -3, 3, 9].map((x) => <circle key={x} cx={x} cy={63 - Math.abs(x) * 0.3} r="2.3" fill="#F8FAFF" stroke="#B8C6D8" strokeWidth="0.6" />)}<path d="M -14 56 Q 0 49 14 56" fill="none" stroke="#F8FAFF" strokeWidth="2" /></>;
    case 'atelierSculptedMules':
      return <>{shoeShape('mules', c, skin)}<path d="M -15 43 Q 0 32 15 43 L 11 54 Q 0 60 -11 54 Z" fill={lighten(c, 0.18)} stroke={darken(c, 0.35)} strokeWidth="1.3" /><circle cx="0" cy="47" r="3" fill="#D9B25A" /></>;
    case 'coutureGoldSlingbacks':
      return <>{pump(c, { heel: 'stiletto', strap: true })}<path d="M -16 43 Q 0 52 16 43" fill="none" stroke="#D9B25A" strokeWidth="4.2" /><path d="M -4 42 l 4 3 l 4 -3 l -4 -3 Z" fill="#FFF0B8" stroke="#A9781E" strokeWidth="0.7" /></>;
    case 'diamondRunwayPumps':
      return <>{pump(c, { heel: 'stiletto' })}{Array.from({ length: 7 }, (_, i) => <path key={i} d={"M " + (-12 + i * 4) + " " + (55 - Math.sin(i / 6 * Math.PI) * 8) + " l 2.4 -3 l 2.4 3 l -2.4 3 Z"} fill="#F7FBFF" stroke="#BAC9D8" strokeWidth="0.65" />)}</>;
    case 'premiumSuedeLoafers':
      return <>{shoeShape('loafers', c, skin)}<path d="M -14 43 Q 0 53 14 43" fill="none" stroke={lighten(c, 0.38)} strokeWidth="2" /><path d="M -4 42 l 0 8 M 4 42 l 0 8" stroke={darken(c, 0.32)} strokeWidth="1.2" /></>;
    case 'italianLeatherOxfords':
      return <>{shoeShape('oxfords', c, skin)}<path d="M -14 48 Q 0 60 14 48 M -10 33 L 10 33 M -10 39 L 10 39" fill="none" stroke={lighten(c, 0.42)} strokeWidth="1.6" /></>;
    case 'bespokeVelvetLoafers':
      return <>{shoeShape('loafers', c, skin)}<path d="M -10 44 Q 0 36 10 44 L 7 50 L -7 50 Z" fill="#D7B254" stroke="#8D661B" strokeWidth="1" /><circle cx="0" cy="44" r="2" fill="#FFF0B8" /></>;
    case 'goldHardwareDressShoes':
      return <>{shoeShape('oxfords', c, skin)}<rect x="-8" y="43" width="16" height="6" rx="2" fill="#D6B45E" stroke="#8A661D" strokeWidth="0.8" /><path d="M -13 50 Q 0 58 13 50" fill="none" stroke="#F8E7AD" strokeWidth="2" /></>;
    case 'handFinishedOxfordCouture':
      return <>{shoeShape('oxfords', c, skin)}{[-10, -4, 4, 10].map((x) => <circle key={x} cx={x} cy="31" r="1.7" fill="#D9B25A" />)}<path d="M -14 57 Q 0 68 14 57" fill="none" stroke={lighten(c, 0.46)} strokeWidth="2.4" /></>;
    case 'everydayCanvasSneakers':
      return <>{shoeShape('sneakers', c, skin)}<path d="M -17 67 Q 0 73 17 67" fill="none" stroke="#55545A" strokeWidth="2.8" /><path d="M -9 35 L 9 35 M -9 42 L 9 42" stroke="#77747B" strokeWidth="1.6" /></>;
    case 'atelierLeatherSneakers':
      return <>{shoeShape('sneakers', c, skin)}<path d="M -20 58 L -3 51 L 4 62 L 20 55" fill="none" stroke={darken(c, 0.28)} strokeWidth="6" /><path d="M -20 58 L -3 51 L 4 62 L 20 55" fill="none" stroke={lighten(c, 0.3)} strokeWidth="1.4" /><rect x="-6" y="76" width="12" height="4" rx="1" fill="#D9B25A" /></>;
    // Original Level 6–7 silhouettes: each is drawn independently, not a recoloured shoe alias.
    case 'atelierGlassPetalHeel':
      return <><path d="M 10 26 L 15 28 L 13 83 L 9 83 Z" fill={darken(c, 0.5)} /><path d="M -19 47 C -17 58 -14 69 0 95 C 14 69 17 58 19 47 C 9 53 -8 53 -19 47 Z" fill={c} stroke={darken(c, 0.3)} strokeWidth="1.8" /><path d="M -17 47 Q -7 33 0 49 Q 7 33 17 47 Q 4 61 0 70 Q -4 61 -17 47 Z" fill={lighten(c, 0.25)} stroke={lighten(c, 0.42)} strokeWidth="1.2" /><path d="M -13 55 Q 0 65 13 55" fill="none" stroke="#E9F8FF" strokeWidth="2.4" /><path d="M -2 53 l 2 -4 l 2 4 l -2 4 Z" fill="#F7FCFF" stroke="#AFC4D7" strokeWidth="0.7" /></>;
    case 'atelierOrbitCagePump':
      return <><path d="M 12 28 L 17 30 L 16 84 L 12 84 Z" fill={darken(c, 0.48)} /><path d="M -17 48 C -11 57 -10 77 0 96 C 13 78 17 60 17 48 Q 0 39 -17 48 Z" fill={c} stroke={darken(c, 0.34)} strokeWidth="1.6" /><path d="M -15 47 L -9 63 L -1 69 L -12 78 M 15 47 L 9 63 L 1 69 L 12 78" fill="none" stroke={lighten(c, 0.5)} strokeWidth="2.4" /><path d="M -9 63 Q 0 54 9 63" fill="none" stroke="#D9B25A" strokeWidth="3.2" /><circle cx="0" cy="63" r="2.8" fill="#F6FAFF" stroke="#AAB8C8" strokeWidth="0.7" /></>;
    case 'atelierSculptedPearlMule':
      return <><path d="M 8 36 Q 14 34 16 42 L 14 79 L 8 79 Z" fill={darken(c, 0.38)} /><path d="M -19 44 Q -4 30 18 43 Q 18 63 3 82 L -10 84 Q -22 68 -19 44 Z" fill={c} stroke={darken(c, 0.34)} strokeWidth="1.5" /><path d="M -16 45 Q -1 32 14 45 Q 3 54 -8 65" fill="none" stroke={lighten(c, 0.44)} strokeWidth="3" /><path d="M -4 48 Q 0 42 5 48 Q 4 55 0 56 Q -5 55 -4 48 Z" fill="#F7F3EC" stroke="#C9BFB0" strokeWidth="0.8" /><circle cx="0" cy="49" r="2.1" fill="#FFFFFF" /></>;
    case 'atelierChromeArcSandal':
      return <><path d="M 11 29 L 16 31 L 14 79 L 10 79 Z" fill={darken(c, 0.44)} /><path d="M -18 78 Q 0 89 18 78 L 18 84 Q 0 95 -18 84 Z" fill={darken(c, 0.28)} /><path d="M -17 58 Q 0 45 17 58 M -14 40 Q 0 54 14 40 M -12 18 Q 0 28 12 18" fill="none" stroke={c} strokeWidth="4.5" strokeLinecap="round" /><path d="M -15 58 Q 0 44 15 58 M -11 39 Q 0 53 11 39" fill="none" stroke="#E6EDF4" strokeWidth="1.2" /><path d="M 0 42 L -8 28 M 0 42 L 8 28" fill="none" stroke={lighten(c, 0.48)} strokeWidth="2.2" /><circle cx="0" cy="43" r="2.6" fill="#D5E7F7" /></>;
    case 'empireLiquidSculptureBoot':
      return <><path d="M -14 -12 Q 0 -17 14 -12 L 17 73 Q 12 93 0 94 Q -13 92 -18 73 Z" fill={c} stroke={darken(c, 0.35)} strokeWidth="1.8" /><path d="M -9 -4 Q -18 26 -8 56 Q 1 75 12 83" fill="none" stroke={lighten(c, 0.4)} strokeWidth="3.4" /><path d="M -15 25 Q 0 15 16 28 L 10 43 Q 0 51 -12 43 Z" fill={lighten(c, 0.12)} stroke={darken(c, 0.25)} strokeWidth="1.2" /><path d="M 8 30 L 14 30 L 16 84 L 10 84 Z" fill={darken(c, 0.48)} /><path d="M -17 81 Q 0 91 17 81" fill="none" stroke="#D9B25A" strokeWidth="2.6" /></>;
    case 'atelierMonolithDerby':
      return <><path d="M -17 23 C -22 49 -23 66 -17 79 Q 0 91 18 79 L 20 66 Q 10 52 -2 44 L -3 29 Z" fill={c} stroke={darken(c, 0.4)} strokeWidth="1.7" /><path d="M -3 29 L 3 46 L -2 57 L 11 65" fill="none" stroke={lighten(c, 0.35)} strokeWidth="2.2" /><path d="M -9 38 L 8 38 M -10 45 L 8 45 M -11 52 L 6 52" stroke={darken(c, 0.35)} strokeWidth="1.4" /><path d="M -17 79 Q 0 87 18 79" fill="none" stroke={darken(c, 0.55)} strokeWidth="3.2" /><circle cx="1" cy="61" r="2.4" fill="#D9B25A" /></>;
    case 'atelierFoldedLeatherLoafer':
      return <><path d="M -18 25 Q -23 55 -18 78 Q -5 94 18 79 Q 22 61 15 29 Q 4 39 -2 50 Q -9 39 -18 25 Z" fill={c} stroke={darken(c, 0.38)} strokeWidth="1.6" /><path d="M -16 28 Q 0 50 17 28 L 11 61 Q 0 69 -11 61 Z" fill={lighten(c, 0.12)} stroke={darken(c, 0.25)} strokeWidth="1.3" /><path d="M -12 58 Q 0 47 12 58" fill="none" stroke="#D9B25A" strokeWidth="3.2" /><path d="M -15 78 Q 0 88 17 78" fill="none" stroke={darken(c, 0.5)} strokeWidth="3" /></>;
    case 'empireArchitecturalChelsea':
      return <><path d="M -13 -10 L 13 -10 Q 17 18 17 67 Q 23 82 15 91 L -15 91 Q -23 82 -17 67 Q -17 18 -13 -10 Z" fill={c} stroke={darken(c, 0.35)} strokeWidth="1.7" /><path d="M -12 4 Q -1 0 11 4 L 14 56 Q 3 67 -12 56 Z" fill={c === '#000000' ? '#25252A' : darken(c, 0.1)} /><path d="M -10 0 L -8 54 M 10 0 L 8 54" stroke={lighten(c, 0.45)} strokeWidth="2.1" /><path d="M -16 78 Q 0 88 16 78" fill="none" stroke="#D9B25A" strokeWidth="2.4" /></>;
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
  const shaftTop = !plain && acc.shoes === 'kneeBoots' ? spec.knee[1] + 10 : !plain && (acc.shoes === 'ankleBoots' || acc.shoes === 'mensBoots') ? spec.ankle[1] - 90 : !plain && acc.shoes === 'empireLiquidSculptureBoot' ? spec.knee[1] - 20 : 0;
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
    case 'sculptedEveningClutch':
      return <g transform="rotate(-10)"><path d="M -35 -10 Q -32 -24 0 -24 Q 32 -24 35 -10 L 30 16 L -30 16 Z" fill={bc} stroke={lo} strokeWidth="1.7" /><path d="M -35 -4 Q 0 8 35 -4" fill="none" stroke={hi} strokeWidth="3" /><path d="M -15 -18 L 0 -26 L 15 -18" fill="none" stroke="#D9B25A" strokeWidth="2.4" /><circle cx="0" cy="1" r="4" fill="#F8E8B8" stroke="#9B7625" strokeWidth="0.8" /></g>;
    case 'artisanAsoOkeBag':
      return <g transform="rotate(-6)"><path d="M -13 -20 Q -12 -40 12 -20" fill="none" stroke={hw(bc)} strokeWidth="3.2" /><path d="M -28 -18 L 28 -18 L 32 22 L -32 22 Z" fill={bc} stroke={lo} strokeWidth="1.3" />{Array.from({ length: 5 }, (_, i) => <path key={i} d={"M " + (-25 + i * 10) + " -14 L " + (-19 + i * 10) + " 18"} stroke={i % 2 ? hw(bc) : hi} strokeWidth="3" opacity="0.85" />)}<path d="M -26 0 L 26 0 M -26 9 L 26 9" stroke={hw(bc)} strokeWidth="2" /></g>;
    case 'atelierTopHandleBag':
      return <g><path d="M -15 -18 C -16 -42 16 -42 15 -18" fill="none" stroke={hw(bc)} strokeWidth="4" /><path d="M -27 -16 L 27 -16 L 31 20 L -31 20 Z" fill={bc} stroke={lo} strokeWidth="1.6" /><path d="M -27 -5 L 27 -5" stroke={hw(bc)} strokeWidth="2.2" /><rect x="-5" y="-1" width="10" height="10" rx="2" fill="#D9B25A" /><circle cx="0" cy="4" r="1.8" fill="#FFF4CC" /></g>;
    case 'handwovenCeremonyBag':
      return <g transform="rotate(-5)"><path d="M -14 -17 Q 0 -34 14 -17" fill="none" stroke={hw(bc)} strokeWidth="3" /><path d="M -29 -17 Q 0 -24 29 -17 L 25 20 Q 0 28 -25 20 Z" fill={bc} stroke={lo} strokeWidth="1.3" />{Array.from({ length: 6 }, (_, i) => <path key={i} d={"M -26 " + (-12 + i * 6) + " L 26 " + (-12 + i * 6)} stroke={i % 2 ? hi : hw(bc)} strokeWidth="2.2" />)}{Array.from({ length: 6 }, (_, i) => <circle key={i} cx={-20 + i * 8} cy="1" r="2.3" fill="#F7E7C4" />)}</g>;
    case 'couturePearlEveningBag':
      return <g><rect x="-32" y="-15" width="64" height="32" rx="8" fill={bc} stroke={hw(bc)} strokeWidth="2" /><path d="M -21 -15 Q 0 -35 21 -15" fill="none" stroke={hw(bc)} strokeWidth="2.8" />{Array.from({ length: 9 }, (_, i) => <circle key={i} cx={-24 + i * 6} cy="-3" r="2.6" fill="#FFF8E6" stroke="#C8BFB0" strokeWidth="0.6" />)}<circle cx="0" cy="9" r="3.2" fill="#D9B25A" /></g>;
    case 'heirloomLeatherWeekender':
      return <g><path d="M -36 -5 Q -34 -28 0 -28 Q 34 -28 36 -5 L 30 18 Q 0 30 -30 18 Z" fill={bc} stroke={lo} strokeWidth="1.7" /><path d="M -18 -21 Q -15 -38 0 -38 Q 15 -38 18 -21" fill="none" stroke={lo} strokeWidth="4" /><path d="M -33 0 L 33 0 M -27 15 L 27 15" stroke={hw(bc)} strokeWidth="2.1" /><rect x="-5" y="-3" width="10" height="9" rx="1.5" fill="#D9B25A" /></g>;
    // Original sculpted bags, with distinct architecture and hardware.
    case 'atelierOrbitTopHandle':
      return <g><path d="M -12 -20 C -19 -49 19 -49 12 -20" fill="none" stroke={hw(bc)} strokeWidth="4.2" /><path d="M -26 -15 L -18 -28 Q 0 -36 18 -28 L 26 -15 L 31 22 L -31 22 Z" fill={bc} stroke={lo} strokeWidth="1.7" /><path d="M -26 -15 Q 0 0 26 -15 L 20 3 Q 0 16 -20 3 Z" fill={hi} opacity="0.62" /><ellipse cx="0" cy="0" rx="12" ry="15" fill="none" stroke={hw(bc)} strokeWidth="2.5" /><circle cx="0" cy="0" r="4.2" fill="#F8F4EA" stroke={hw(bc)} strokeWidth="1.3" /><path d="M -28 17 L 28 17" stroke={hw(bc)} strokeWidth="2.2" /></g>;
    case 'atelierSculptedShellClutch':
      return <g transform="rotate(-8)"><path d="M -36 12 C -41 -8 -18 -28 0 -26 C 18 -28 41 -8 36 12 Q 0 36 -36 12 Z" fill={bc} stroke={lo} strokeWidth="1.8" /><path d="M -30 7 Q -16 -1 0 -4 Q 16 -1 30 7 M -22 17 Q -12 10 0 9 Q 12 10 22 17" fill="none" stroke={hi} strokeWidth="2.1" /><path d="M 0 -26 Q -4 -7 0 27" fill="none" stroke={hw(bc)} strokeWidth="2.4" /><circle cx="0" cy="-2" r="4" fill="#F5F0E8" stroke={hw(bc)} strokeWidth="1.4" /></g>;
    case 'atelierGlassCubeMiniBag':
      return <g><path d="M -15 -20 Q -14 -42 14 -28" fill="none" stroke={hw(bc)} strokeWidth="4" /><path d="M -27 -16 L 27 -16 L 31 20 L -31 20 Z" fill={bc} stroke={hi} strokeWidth="2" /><path d="M -20 -9 L 20 -9 L 23 12 L -23 12 Z" fill="none" stroke={lighten(bc,0.5)} strokeWidth="1.7" /><path d="M -27 -16 L -13 -3 L -13 19 M 27 -16 L 13 -3 L 13 19 M -13 -3 L 13 -3" fill="none" stroke={hi} strokeWidth="1.5" /><rect x="-6" y="-3" width="12" height="8" rx="1" fill={hw(bc)} /></g>;
    case 'atelierLiquidFoldedHobo':
      return <g><path d="M -19 -20 Q -20 -45 4 -33 Q 18 -26 18 -16" fill="none" stroke={hw(bc)} strokeWidth="4" /><path d="M -31 -14 Q -9 -30 9 -14 Q 30 4 25 19 Q 0 31 -29 18 Q -40 3 -31 -14 Z" fill={bc} stroke={lo} strokeWidth="1.7" /><path d="M -30 -12 Q -3 4 23 -13 M -24 1 Q -2 18 25 2" fill="none" stroke={hi} strokeWidth="2.6" /><path d="M -8 -20 Q 0 -1 8 18" fill="none" stroke={darken(bc,0.25)} strokeWidth="3" /><circle cx="0" cy="-2" r="3.5" fill={hw(bc)} /></g>;
    case 'empireWingedEveningBag':
      return <g><path d="M -24 -13 L -43 -29 L -38 5 L -29 16 M 24 -13 L 43 -29 L 38 5 L 29 16" fill={bc} stroke={hw(bc)} strokeWidth="1.7" /><path d="M -26 -15 Q 0 -30 26 -15 L 31 17 Q 0 27 -31 17 Z" fill={bc} stroke={lo} strokeWidth="1.8" /><path d="M -22 -6 Q 0 8 22 -6" fill="none" stroke={hi} strokeWidth="3.2" /><path d="M -12 -17 L 0 -26 L 12 -17" fill="none" stroke={hw(bc)} strokeWidth="3" /><circle cx="0" cy="3" r="5" fill="#F9F4E8" stroke={hw(bc)} strokeWidth="1.4" /></g>;
    case 'atelierMonolithBriefcase':
      return <g><path d="M -32 -14 L 32 -14 L 30 20 L -30 20 Z" fill={bc} stroke={lo} strokeWidth="1.8" /><path d="M -11 -14 Q -13 -30 0 -30 Q 13 -30 11 -14" fill="none" stroke={hw(bc)} strokeWidth="3.4" /><path d="M -32 -2 L 32 -2 M 0 -14 L 0 20" stroke={hi} strokeWidth="1.8" /><rect x="-8" y="-2" width="16" height="11" rx="2" fill={hw(bc)} stroke={lo} strokeWidth="1" /><path d="M -3 1 L 3 1 L 3 6 L -3 6 Z" fill="#F9EFD2" /></g>;
    case 'atelierFoldedWeekender':
      return <g><path d="M -18 -13 Q -18 -34 0 -34 Q 18 -34 18 -13" fill="none" stroke={hw(bc)} strokeWidth="4" /><path d="M -35 -12 Q 0 -28 35 -12 L 32 16 Q 0 28 -32 16 Z" fill={bc} stroke={lo} strokeWidth="1.8" /><path d="M -30 -5 Q -3 2 30 -5 L 24 9 Q 0 20 -24 9 Z" fill={hi} opacity="0.65" /><path d="M -32 12 Q 0 20 32 12" fill="none" stroke={hw(bc)} strokeWidth="2.6" /><rect x="-8" y="-1" width="16" height="8" rx="2" fill={lo} stroke={hw(bc)} strokeWidth="1.2" /></g>;
    case 'empireArchitecturalCrossbody':
      return <g><path d="M -18 -15 L 18 -15 L 27 14 L 0 27 L -27 14 Z" fill={bc} stroke={lo} strokeWidth="1.8" /><path d="M -27 14 L 0 0 L 27 14 M 0 0 L 0 27" fill="none" stroke={hw(bc)} strokeWidth="2.3" /><path d="M -22 -22 Q 0 -44 22 -22" fill="none" stroke={hi} strokeWidth="2.8" /><circle cx="0" cy="9" r="4" fill="#F5F0E8" stroke={hw(bc)} strokeWidth="1.1" /></g>;
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
  const held = ['clutch', 'beadedBag', 'miniBag', 'bucketBag', 'sculptedEveningClutch', 'artisanAsoOkeBag', 'atelierTopHandleBag', 'handwovenCeremonyBag', 'couturePearlEveningBag', 'heirloomLeatherWeekender', 'atelierOrbitTopHandle', 'atelierSculptedShellClutch', 'atelierGlassCubeMiniBag', 'atelierLiquidFoldedHobo', 'empireWingedEveningBag', 'atelierMonolithBriefcase', 'atelierFoldedWeekender', 'empireArchitecturalCrossbody'].includes(bag);
  return (
    <g>
      {!!acc.wrist && ['watch', 'premiumAutomaticWatch', 'designerSteelChronograph', 'diamondDialWatch', 'empireDiamondBarrelWatch', 'atelierMonolithChronograph'].includes(acc.wrist) && (
        <g>
          <rect x={wx - (acc.wrist === 'premiumAutomaticWatch' ? 14 : acc.wrist === 'empireDiamondBarrelWatch' ? 15 : 13)} y={wy - 18} width={acc.wrist === 'premiumAutomaticWatch' ? 28 : acc.wrist === 'empireDiamondBarrelWatch' ? 30 : 26} height="10" rx="3" fill={acc.wrist === 'designerSteelChronograph' || acc.wrist === 'atelierMonolithChronograph' ? '#9A9EA5' : acc.wrist === 'premiumAutomaticWatch' ? '#5A3825' : '#C9A24A'} />
          <circle cx={wx - 2} cy={wy - 13} r={acc.wrist === 'diamondDialWatch' || acc.wrist === 'empireDiamondBarrelWatch' ? 8.5 : acc.wrist === 'premiumAutomaticWatch' ? 8 : 7} fill="#F4ECD8" stroke={acc.wrist === 'designerSteelChronograph' || acc.wrist === 'atelierMonolithChronograph' ? '#555B65' : '#A9781E'} strokeWidth={acc.wrist === 'premiumAutomaticWatch' ? 2.8 : 2} />
          <path d={`M ${wx - 2} ${wy - 13} l 0 -4 M ${wx - 2} ${wy - 13} l 3 1`} stroke="#3A2A1A" strokeWidth="0.9" />
          {acc.wrist === 'premiumAutomaticWatch' && <>{[0,1,2,3,4,5,6,7].map((i) => <circle key={i} cx={wx - 2 + Math.cos(i * Math.PI / 4) * 6} cy={wy - 13 + Math.sin(i * Math.PI / 4) * 6} r="0.85" fill="#A9781E" />)}<path d={`M ${wx - 2} ${wy - 13} L ${wx + 2} ${wy - 15}`} stroke="#A9781E" strokeWidth="1" /></>}
          {acc.wrist === 'designerSteelChronograph' && <>{[-5, 2, 7].map((dx) => <circle key={dx} cx={wx + dx} cy={wy - 13} r="1.6" fill="#777C84" />)}<path d={`M ${wx - 8} ${wy - 13} L ${wx + 5} ${wy - 13}`} stroke="#777C84" strokeWidth="0.8" /></>}
          {acc.wrist === 'diamondDialWatch' && Array.from({ length: 8 }, (_, i) => <path key={i} d={`M ${wx - 2 + Math.cos(i * Math.PI / 4) * 6} ${wy - 13 + Math.sin(i * Math.PI / 4) * 6} l 1.5 1.5 l -1.5 1.5 l -1.5 -1.5 Z`} fill="#EEF7FF" stroke="#AEBED0" strokeWidth="0.4" />)}
          {acc.wrist === 'empireDiamondBarrelWatch' && <>{Array.from({ length: 12 }, (_, i) => <path key={i} d={`M ${wx - 2 + Math.cos(i * Math.PI / 6) * 7} ${wy - 13 + Math.sin(i * Math.PI / 6) * 7} l 1.1 1.6 l -1.1 1.6 l -1.1 -1.6 Z`} fill="#EEF7FF" stroke="#AEBED0" strokeWidth="0.35" />)}<path d={`M ${wx - 2} ${wy - 13} L ${wx + 2} ${wy - 16}`} stroke="#2B2D33" strokeWidth="0.9" /></>}
          {acc.wrist === 'atelierMonolithChronograph' && <>{[-4, 3, 7].map((dx) => <circle key={dx} cx={wx + dx} cy={wy - 13} r="1.5" fill="#535B64" />)}<path d={`M ${wx - 7} ${wy - 13} L ${wx + 4} ${wy - 13}`} stroke="#535B64" strokeWidth="0.9" /><path d={`M ${wx - 2} ${wy - 13} l -2 -3`} stroke="#292C31" strokeWidth="1" /></>}
        </g>
      )}
      {acc.wrist === 'cuff' && <rect x={wx - 14} y={wy - 26} width="28" height="18" rx="5" fill={`url(#${id('gold')})`} stroke="#A9781E" strokeWidth="1" />}
      {acc.wrist === 'empireArchitecturalCuff' && <g><path d={`M ${wx - 16} ${wy - 28} L ${wx - 10} ${wy - 18} L ${wx + 11} ${wy - 18} L ${wx + 16} ${wy - 28} L ${wx + 14} ${wy - 8} L ${wx - 14} ${wy - 8} Z`} fill={`url(#${id('gold')})`} stroke="#8A661D" strokeWidth="1.1" /><path d={`M ${wx - 10} ${wy - 24} L ${wx - 4} ${wy - 13} L ${wx + 4} ${wy - 13} L ${wx + 10} ${wy - 24}`} fill="none" stroke="#FFF0B8" strokeWidth="1.5" /></g>}
      {(acc.wrist === 'bangles' || acc.wrist === 'goldBangleStack') &&
        [0, 1].map((m) => (
          <g key={m} transform={m ? MIRROR : undefined}>
            {(acc.wrist === 'goldBangleStack' ? [0, 5, 10, 15, 20] : [0, 6, 12]).map((dy) => (
              <ellipse key={dy} cx={wx} cy={wy - (acc.wrist === 'goldBangleStack' ? 30 : 26) + dy} rx={acc.wrist === 'goldBangleStack' ? 15 : 14} ry={acc.wrist === 'goldBangleStack' ? 3.5 : 4} fill="none" stroke={`url(#${id('gold')})`} strokeWidth={acc.wrist === 'goldBangleStack' ? 2.1 : 2.6} />
            ))}
          </g>
        ))}
      {acc.wrist === 'coralBracelet' &&
        Array.from({ length: 7 }, (_, i) => <circle key={i} cx={wx - 12 + i * 4} cy={wy - 16 + Math.sin((i / 6) * Math.PI) * 4} r="3.2" fill="#C2452D" stroke="#8A2A1A" strokeWidth="0.5" />)}

      {held && <g transform={`translate(${rx} ${wy + (bag === 'clutch' || bag === 'beadedBag' ? 50 : 96) * s})`}>{bagBody(bag, bc, id)}</g>}

      {(bag === 'tote' || bag === 'structuredWorkTote') && (
        <g>
          <path d={`M ${spec.elbow[0] - 4} ${spec.elbow[1] - 10} C ${spec.elbow[0] - 30} ${spec.elbow[1] - 70} ${spec.elbow[0] - 70} ${spec.elbow[1] - 40} ${spec.elbow[0] - 60} ${spec.elbow[1] + 30}`} fill="none" stroke={darken(bc, 0.3)} strokeWidth="5" />
          <path d={`M ${spec.elbow[0] - 88} ${spec.elbow[1] + 26} L ${spec.elbow[0] - 20} ${spec.elbow[1] + 26} L ${spec.elbow[0] - 12} ${spec.elbow[1] + 116} L ${spec.elbow[0] - 96} ${spec.elbow[1] + 116} Z`} fill={bc} />
          <path d={`M ${spec.elbow[0] - 88} ${spec.elbow[1] + 26} L ${spec.elbow[0] - 20} ${spec.elbow[1] + 26}`} stroke={darken(bc, 0.4)} strokeWidth="2" />
          <path d={`M ${spec.elbow[0] - 80} ${spec.elbow[1] + 40} L ${spec.elbow[0] - 84} ${spec.elbow[1] + 108}`} stroke={lighten(bc, 0.3)} strokeWidth="5" opacity="0.4" />
          {bag === 'structuredWorkTote' && <>
            <path d={`M ${spec.elbow[0] - 80} ${spec.elbow[1] + 38} L ${spec.elbow[0] - 84} ${spec.elbow[1] + 108} L ${spec.elbow[0] - 22} ${spec.elbow[1] + 108}`} fill="none" stroke="#D9B25A" strokeWidth="2.1" />
            <path d={`M ${spec.elbow[0] - 74} ${spec.elbow[1] + 42} L ${spec.elbow[0] - 78} ${spec.elbow[1] + 98}`} fill="none" stroke={lighten(bc, 0.38)} strokeWidth="2.2" strokeDasharray="3 3" />
            <rect x={spec.elbow[0] - 55} y={spec.elbow[1] + 66} width="17" height="13" rx="2" fill="#D9B25A" stroke="#87631D" strokeWidth="1" />
          </>}
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

      {(bag === 'crossbody' || bag === 'premiumLeatherCrossbody') && (() => {
        const bx = 300 - spec.hip[1] + 18;
        const by = spec.hhip[0] - 6;
        return (
          <g>
            <path d={`M ${300 + sh * 0.55} ${sy - 4} L ${bx + 14} ${by - 22}`} stroke={darken(bc, 0.35)} strokeWidth="4.6" />
            <path d={`M ${300 + sh * 0.55} ${sy - 4} L ${bx + 14} ${by - 22}`} stroke={lighten(bc, 0.2)} strokeWidth="1" strokeDasharray="3 3" />
            <rect x={bx - 26} y={by - 24} width="54" height="40" rx="8" fill={bc} />
            <path d={`M ${bx - 26} ${by - 16} Q ${bx + 1} ${by + 4} ${bx + 28} ${by - 16} L ${bx + 28} ${by - 16} L ${bx + 28} ${by - 16}`} fill="none" stroke={darken(bc, 0.4)} strokeWidth="1.4" />
            <circle cx={bx + 1} cy={by - 4} r="3.4" fill={hw(bc)} />
            {bag === 'premiumLeatherCrossbody' && <>
              <path d={`M ${bx - 20} ${by - 13} Q ${bx + 1} ${by + 1} ${bx + 22} ${by - 13}`} fill="none" stroke={lighten(bc, 0.36)} strokeWidth="2" />
              <rect x={bx - 5} y={by - 8} width="12" height="8" rx="1.5" fill="#D9B25A" stroke="#8A661D" strokeWidth="0.8" />
              <path d={`M ${bx - 20} ${by + 9} L ${bx - 22} ${by + 12} M ${bx - 12} ${by + 11} L ${bx - 14} ${by + 14} M ${bx + 14} ${by + 11} L ${bx + 16} ${by + 14} M ${bx + 22} ${by + 9} L ${bx + 24} ${by + 12}`} stroke="#E4C16E" strokeWidth="1.1" />
            </>}
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
    case 'freshwaterPearlStrand':
      body = along(80, 29, 39).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={4.2 + (i % 3) * 0.3} fill={`url(#${id('pearl')})`} stroke="#C8BFB0" strokeWidth="0.6" />);
      break;
    case 'goldLayeredNecklace':
      body = <>{chain(30, 30, 2.8)}{chain(58, 35, 2.5)}{chain(90, 41, 2.2)}<path d="M 300 614 l 8 8 l -8 12 l -8 -12 Z" fill={g} stroke="#FFF3C9" strokeWidth="1" /></>;
      break;
    case 'handsetCoralNecklace':
      body = <>{along(60, 23, 37).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={4.1 + (i % 4) * 0.35} fill={i % 5 === 0 ? g : '#C2452D'} stroke={i % 5 === 0 ? '#FFF0B8' : '#8A2A1A'} strokeWidth="0.55" />)}<path d="M 300 610 l 6 7 l -6 10 l -6 -10 Z" fill={g} /></>;
      break;
    case 'sculptedGoldChoker':
      body = <><path d="M 260 508 Q 300 535 340 508" fill="none" stroke={g} strokeWidth="11" /><path d="M 262 509 Q 300 531 338 509" fill="none" stroke="#FFF0B8" strokeWidth="1.7" /><path d="M 300 518 l 8 7 l -8 10 l -8 -10 Z" fill={g} stroke="#FFF2BF" strokeWidth="1.2" /></>;
      break;
    case 'heirloomCoralSet':
      body = <>{along(58, 27, 40).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={4.2 + (i % 4) * 0.25} fill={i % 4 === 0 ? g : '#C2452D'} stroke={i % 4 === 0 ? '#FFF0B8' : '#8A2A1A'} strokeWidth="0.5" />)}{along(83, 19, 34).map(([x, y], i) => <circle key={'second-' + i} cx={x} cy={y} r="2.4" fill="#E8C77A" />)}<path d="M 300 608 l 10 12 l -10 15 l -10 -15 Z" fill={g} stroke="#FFF0B8" strokeWidth="1.2" /></>;
      break;
    case 'atelierSculptedArcChoker':
      body = <><path d="M 252 506 Q 300 548 348 506" fill="none" stroke={g} strokeWidth="10" strokeLinecap="round" /><path d="M 255 507 Q 300 540 345 507" fill="none" stroke="#FFF1C7" strokeWidth="1.8" /><path d="M 300 536 L 312 548 L 300 566 L 288 548 Z" fill={g} stroke="#FFF1C7" strokeWidth="1.2" /><path d="M 300 545 L 300 559" stroke="#475A71" strokeWidth="2.3" /></>;
      break;
    case 'empireLiquidGoldCascade':
      body = <>{chain(40, 35, 2.2)}{chain(66, 40, 2.8)}{chain(98, 44, 2.0)}<path d="M 300 614 C 292 626 289 639 300 653 C 311 639 308 626 300 614 Z" fill={g} stroke="#FFF0B8" strokeWidth="1.3" /><path d="M 300 619 Q 296 635 300 644" fill="none" stroke="#FFF9DE" strokeWidth="1.5" /></>;
      break;
    case 'atelierObsidianLinkNecklace':
      body = <>{along(74, 13, 42).map(([x, y], i) => <g key={i} transform={`rotate(${(i - 6) * 7} ${x} ${y})`}><ellipse cx={x} cy={y} rx="6.7" ry="4.6" fill="none" stroke={i % 2 ? '#A7ADB7' : '#20232A'} strokeWidth="3.4" /><ellipse cx={x - 1} cy={y - 1} rx="4.5" ry="2.7" fill="none" stroke="#E5E8ED" strokeWidth="0.8" /></g>)}<path d="M 300 603 L 310 614 L 300 630 L 290 614 Z" fill="#242934" stroke={g} strokeWidth="1.6" /></>;
      break;
    case 'atelierMonolithChainPendant':
      body = <>{chain(52, 37, 3.4)}<path d="M 300 580 L 311 592 L 308 630 L 300 643 L 292 630 L 289 592 Z" fill="#272A31" stroke={g} strokeWidth="1.8" /><path d="M 300 591 L 300 630" stroke="#E7EAF0" strokeWidth="1.5" /><circle cx="300" cy="605" r="2.3" fill="#E7EAF0" /></>;
      break;
    default:
      return null;
  }
  return <g transform={male ? 'translate(300 0) scale(1.3 1) translate(-300 0)' : undefined}>{body}</g>;
};

export const Glasses: React.FC<{ kind: string }> = ({ kind }) => {
  const clear = kind === 'clear';
  const frame = kind === 'atelierCathedralCatEye' ? '#261E2D'
    : kind === 'atelierPrismShield' ? '#A7B9C8'
    : kind === 'atelierRimlessOrbit' ? '#C4A66A'
    : kind === 'atelierButterflyArchitecture' ? '#13151E'
    : kind === 'empireLiquidWrapSunglasses' ? '#263642'
    : kind === 'atelierMonolithAviator' ? '#8E7A4C'
    : kind === 'atelierDoubleBridgeSquare' ? '#3D444C'
    : kind === 'empireArchitecturalSportFrame' ? '#33404F'
    : kind === 'acetateStatementFrames' ? '#593824' : kind === 'titaniumDesignerFrames' ? '#8D949D' : kind === 'goldTempleSunglasses' || kind === 'heirloomGoldSunglasses' ? '#C6A34D' : clear ? '#2A2220' : kind === 'aviators' ? '#B8913E' : '#0A0808';
  const lensFill = kind === 'atelierPrismShield' ? '#8FB6C9'
    : kind === 'atelierRimlessOrbit' ? '#DCE8F0'
    : kind === 'atelierButterflyArchitecture' ? '#1D2637'
    : kind === 'empireLiquidWrapSunglasses' ? '#243C48'
    : kind === 'atelierMonolithAviator' ? '#2B313B'
    : kind === 'atelierDoubleBridgeSquare' ? '#4D5A66'
    : kind === 'empireArchitecturalSportFrame' ? '#223544'
    : kind === 'titaniumDesignerFrames' || clear ? '#DCE8F0' : kind === 'aviators' || kind === 'goldTempleSunglasses' || kind === 'heirloomGoldSunglasses' ? '#3A2A1E' : '#1A1414';
  const lensOp = kind === 'atelierRimlessOrbit' || clear || kind === 'titaniumDesignerFrames' ? 0.2 : 0.9;
  const lens = (cx: number, flip: number) => {
    let d: string;
    if (kind === 'atelierCathedralCatEye') d = `M ${cx - 40 * flip} 320 L ${cx - 46 * flip} 301 Q ${cx - 6 * flip} 306 ${cx + 38 * flip} 309 L ${cx + 34 * flip} 342 Q ${cx + 19 * flip} 365 ${cx} 357 Q ${cx - 28 * flip} 353 ${cx - 40 * flip} 320 Z`;
    else if (kind === 'atelierPrismShield' || kind === 'empireArchitecturalSportFrame') d = `M ${cx - 41 * flip} 310 L ${cx + 35 * flip} 310 L ${cx + 42 * flip} 337 L ${cx + 16 * flip} 363 L ${cx - 15 * flip} 363 L ${cx - 42 * flip} 337 Z`;
    else if (kind === 'atelierRimlessOrbit') d = `M ${cx - 35} 334 C ${cx - 33} 309 ${cx - 9} 306 ${cx} 316 C ${cx + 18} 303 ${cx + 36} 318 ${cx + 34} 339 C ${cx + 31} 360 ${cx + 9} 365 ${cx} 351 C ${cx - 16} 364 ${cx - 37} 354 ${cx - 35} 334 Z`;
    else if (kind === 'atelierButterflyArchitecture') d = `M ${cx - 42 * flip} 317 Q ${cx - 10 * flip} 300 ${cx + 38 * flip} 309 L ${cx + 48 * flip} 302 L ${cx + 34 * flip} 342 Q ${cx + 18 * flip} 364 ${cx} 356 Q ${cx - 30 * flip} 356 ${cx - 42 * flip} 317 Z`;
    else if (kind === 'empireLiquidWrapSunglasses') d = `M ${cx - 42 * flip} 312 C ${cx - 5 * flip} 301 ${cx + 26 * flip} 307 ${cx + 43 * flip} 315 Q ${cx + 33 * flip} 352 ${cx + 12 * flip} 360 Q ${cx - 22 * flip} 360 ${cx - 42 * flip} 312 Z`;
    else if (kind === 'atelierMonolithAviator' || kind === 'aviators' || kind === 'goldTempleSunglasses' || kind === 'heirloomGoldSunglasses') d = `M ${cx - 36 * flip} 316 C ${cx - 10 * flip} 312 ${cx + 20 * flip} 312 ${cx + 38 * flip} 316 C ${cx + 40 * flip} 344 ${cx + 22 * flip} 366 ${cx + 4 * flip} 366 C ${cx - 20 * flip} 366 ${cx - 38 * flip} 344 ${cx - 36 * flip} 316 Z`;
    else if (kind === 'atelierDoubleBridgeSquare') d = `M ${cx - 37} 313 L ${cx + 32} 313 L ${cx + 37} 323 L ${cx + 32} 350 L ${cx + 19} 360 L ${cx - 24} 360 L ${cx - 37} 350 Z`;
    else if (kind === 'catEye' || kind === 'runwaySculptedShades') d = `M ${cx - 38 * flip} 316 C ${cx - 10 * flip} 310 ${cx + 30 * flip} 312 ${cx + 40 * flip} 306 C ${cx + 38 * flip} 336 ${cx + 22 * flip} 358 ${cx} 358 C ${cx - 24 * flip} 358 ${cx - 38 * flip} 340 ${cx - 38 * flip} 316 Z`;
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
      {(kind === 'aviators' || kind === 'goldTempleSunglasses' || kind === 'heirloomGoldSunglasses' || kind === 'atelierMonolithAviator') && <path d="M 290 316 L 310 316" stroke={frame} strokeWidth="2" />}
      {kind === 'atelierCathedralCatEye' && <path d="M 215 310 L 232 308 M 385 310 L 368 308" stroke="#D8C5A1" strokeWidth="4.2" strokeLinecap="round" />}
      {kind === 'atelierPrismShield' && <><path d="M 211 330 L 237 354 M 389 330 L 363 354" stroke="#E8F5FC" strokeWidth="2.1" /><path d="M 236 312 L 265 350 M 364 312 L 335 350" stroke="#E8F5FC" strokeWidth="1.4" opacity="0.65" /></>}
      {kind === 'atelierRimlessOrbit' && <><path d="M 218 334 L 277 334 M 323 334 L 382 334" stroke="#C4A66A" strokeWidth="1.4" /><circle cx="251" cy="334" r="3" fill="#D6DCE5" /><circle cx="349" cy="334" r="3" fill="#D6DCE5" /></>}
      {kind === 'atelierButterflyArchitecture' && <><path d="M 218 315 Q 250 296 279 316 M 382 315 Q 350 296 321 316" fill="none" stroke="#C9D6E8" strokeWidth="2" /><circle cx="234" cy="315" r="2.2" fill="#F4D69B" /><circle cx="366" cy="315" r="2.2" fill="#F4D69B" /></>}
      {kind === 'empireLiquidWrapSunglasses' && <><path d="M 207 320 Q 235 342 257 340 M 393 320 Q 365 342 343 340" fill="none" stroke="#9EC2D1" strokeWidth="2.5" /><path d="M 216 349 Q 250 369 276 351 M 384 349 Q 350 369 324 351" fill="none" stroke="#E9F7FC" strokeWidth="1.4" /></>}
      {kind === 'atelierMonolithAviator' && <path d="M 220 318 L 280 318 M 320 318 L 380 318" stroke="#E3D8BC" strokeWidth="1.6" />}
      {kind === 'atelierDoubleBridgeSquare' && <><path d="M 290 321 L 310 321 M 288 327 L 312 327" stroke="#A6B4C0" strokeWidth="1.7" /><path d="M 220 313 L 220 351 M 380 313 L 380 351" stroke="#98A6B5" strokeWidth="1.1" /></>}
      {kind === 'empireArchitecturalSportFrame' && <><path d="M 212 312 L 269 312 M 331 312 L 388 312" stroke="#9EC9D9" strokeWidth="2.4" /><path d="M 219 350 L 250 360 M 381 350 L 350 360" stroke="#A9C5D1" strokeWidth="2" /></>}
      <path d={`M ${kind === 'oversized' ? 207 : 215} 326 L 196 334 M ${kind === 'oversized' ? 393 : 385} 326 L 404 334`} stroke={frame} strokeWidth="3" />
      {kind === 'acetateStatementFrames' && <path d="M 215 309 L 240 306 M 385 309 L 360 306" stroke={frame} strokeWidth="5" strokeLinecap="round" />}
      {kind === 'titaniumDesignerFrames' && <path d="M 220 322 L 280 322 M 320 322 L 380 322" stroke="#C0C7CF" strokeWidth="1.2" />}
      {(kind === 'goldTempleSunglasses' || kind === 'heirloomGoldSunglasses') && <><path d="M 215 326 L 196 334 M 385 326 L 404 334" stroke="#F4D780" strokeWidth="5" strokeLinecap="round" /><circle cx="217" cy="325" r="3" fill="#FFF0B8" /><circle cx="383" cy="325" r="3" fill="#FFF0B8" /></>}
      {kind === 'heirloomGoldSunglasses' && <path d="M 233 344 Q 250 366 267 345 M 333 345 Q 350 366 367 344" fill="none" stroke="#D4B05A" strokeWidth="1.8" />}
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
  const baseKind: string = ({ embroideredCeremonyFila: 'fila', royalFilaAsoOke: 'fila', beadedStatementFascinator: 'fascinator', coutureCrystalHeadpiece: 'fascinator', goldThreadAsoOkeGele: 'gele', heirloomGoldGele: 'gele' } as Record<string, string>)[kind] || kind;
  if (baseKind === 'none') return null;
  const c = acc.headwearColor || '#C9A163';
  const native = baseKind === 'gele' || baseKind === 'geleWrap' || baseKind === 'headwrap' || baseKind === 'fila';
  const fabric = baseKind === 'headwrap' ? 'ankara' : native ? 'asoOke' : baseKind === 'beret' ? 'velvet' : 'plain';
  const { defs, paint } = fabricDefs(id, 'headwear', fabric, c, baseKind === 'headwrap' ? mix(c, '#1E1E24', 0.6) : lighten(c, 0.35), 3, plain);
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
      {baseKind === 'gele' && (
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
      {baseKind === 'geleWrap' && (
        <>
          {piece(GELE_WRAP, 'w')}
          {pleats(7, (i) => `M ${192 + i * 4} ${270 - i * 22} C ${250} ${244 - i * 24} ${360} ${240 - i * 24} ${416 - i * 4} ${270 - i * 22}`)}
          {piece(GELE_WRAP_TOP, 't')}
          {pleats(4, (i) => `M ${250 + i * 10} ${132 - i * 14} C ${290} ${100 - i * 10} ${360} ${100 - i * 10} ${400 - i * 6} ${140 - i * 14}`)}
          {shine(300, 170, 70, 26)}
        </>
      )}
      {baseKind === 'headwrap' && (
        <>
          {piece(WRAP, 'w')}
          {pleats(5, (i) => `M ${200 + i * 6} ${284 - i * 22} C 250 ${250 - i * 22} 350 ${250 - i * 22} ${400 - i * 6} ${284 - i * 22}`)}
          <path d="M 270 190 C 280 150 320 150 330 190 C 320 214 280 214 270 190 Z" fill={darken(paint.base, 0.1)} />
          <path d="M 270 190 C 280 150 320 150 330 190 C 320 214 280 214 270 190 Z" fill={fill} opacity="0.8" />
          <path d="M 286 196 C 260 170 250 140 270 120 M 314 196 C 340 170 350 140 330 120" fill="none" stroke={darken(paint.base, 0.35)} strokeWidth="2.4" opacity="0.6" />
        </>
      )}
      {baseKind === 'fila' && (
        <>
          {piece(FILA, 'fila')}
          <path d="M 200 254 C 240 248 330 248 350 242" fill="none" stroke={darken(paint.base, 0.45)} strokeWidth="4" />
          <path d="M 300 152 C 360 150 410 166 430 196" fill="none" stroke={darken(paint.base, 0.3)} strokeWidth="2.2" opacity="0.5" />
        </>
      )}
      {baseKind === 'beret' && (
        <>
          {piece('M 186 236 C 176 186 222 132 300 126 C 380 122 446 156 452 200 C 456 226 420 236 392 232 C 340 226 250 226 186 236 Z', 'b')}
          <path d="M 196 236 C 250 224 340 224 400 232" fill="none" stroke={lo} strokeWidth="5" />
          <path d="M 300 126 l 2 -12" stroke={lo} strokeWidth="4" strokeLinecap="round" />
          {shine(300, 164, 60, 18)}
        </>
      )}
      {baseKind === 'cap' && (
        <>
          {piece('M 200 248 C 194 180 238 128 300 124 C 362 128 406 180 400 248 C 340 236 260 236 200 248 Z', 'd')}
          {piece('M 196 248 C 260 232 340 232 404 248 C 410 264 380 276 300 272 C 220 276 190 264 196 248 Z', 'br')}
          <path d="M 300 124 L 300 242 M 248 136 C 236 170 232 210 236 240 M 352 136 C 364 170 368 210 364 240" fill="none" stroke={lo} strokeWidth="1.4" opacity="0.6" />
          <circle cx="300" cy="126" r="5" fill={darken(paint.base, 0.2)} />
          {shine(270, 168, 34, 22)}
        </>
      )}
      {baseKind === 'bucketHat' && (
        <>
          {piece('M 214 236 C 210 176 246 134 300 132 C 354 134 390 176 386 236 Z', 'd')}
          {piece('M 214 230 C 260 222 340 222 386 230 C 412 240 440 266 450 292 C 380 270 220 270 150 292 C 160 266 188 240 214 230 Z', 'br')}
          {[0, 1, 2].map((i) => <path key={i} d={`M ${170 + i * 4} ${282 - i * 8} C 240 ${262 - i * 8} 360 ${262 - i * 8} ${430 - i * 4} ${282 - i * 8}`} fill="none" stroke={lo} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />)}
          {shine(290, 172, 40, 18)}
        </>
      )}
      {baseKind === 'fascinator' && (
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
      {kind === 'embroideredCeremonyFila' && <>{[0,1,2,3,4,5,6].map((i) => <path key={i} d={`M ${228 + i * 20} 206 l 6 8 l -6 8 l -6 -8 Z`} fill="none" stroke={`url(#${id('gold')})`} strokeWidth="1.7" />)}<path d="M 207 245 Q 300 257 393 245" fill="none" stroke="#F4DA91" strokeWidth="3" /></>}
      {kind === 'royalFilaAsoOke' && <>{[0,1,2,3,4].map((i) => <path key={i} d={`M ${246 + i * 22} 178 l 6 8 l -6 8 l -6 -8 Z`} fill={`url(#${id('gold')})`} stroke="#FFF0B8" strokeWidth="0.8" />)}<path d="M 204 251 Q 300 264 396 251" fill="none" stroke="#D9B25A" strokeWidth="5" /></>}
      {kind === 'beadedStatementFascinator' && <>{[0,1,2,3,4,5,6].map((i) => <circle key={i} cx={345 + i * 15} cy={138 - i * 11} r="3.3" fill="#F8F0DA" stroke="#C8BFB0" strokeWidth="0.7" />)}<ellipse cx="350" cy="170" rx="62" ry="25" transform="rotate(-18 350 170)" fill="none" stroke="#F8F0DA" strokeWidth="2.5" /></>}
      {kind === 'coutureCrystalHeadpiece' && <>{[0,1,2,3,4,5,6,7].map((i) => <path key={i} d={`M ${350 + i * 13} ${140 - i * 9} l 4 -5 l 4 5 l -4 5 Z`} fill="#F2F8FF" stroke="#B9CADF" strokeWidth="0.8" />)}<path d="M 316 166 Q 350 184 390 160" fill="none" stroke="#D9B25A" strokeWidth="2.5" /></>}
      {kind === 'goldThreadAsoOkeGele' && <>{[0,1,2,3,4,5].map((i) => <path key={i} d={`M ${230 + i * 16} ${190 - i * 8} Q 300 ${164 - i * 10} ${390 + i * 3} ${190 - i * 8}`} fill="none" stroke={`url(#${id('gold')})`} strokeWidth="2" />)}</>}
      {kind === 'heirloomGoldGele' && <>{[0,1,2,3,4,5,6,7,8].map((i) => <circle key={i} cx={230 + i * 17} cy={211 - Math.sin(i * Math.PI / 8) * 24} r="3.1" fill="#FFF1BC" stroke={`url(#${id('gold')})`} strokeWidth="1" />)}<path d="M 200 248 Q 300 222 400 248" fill="none" stroke={`url(#${id('gold')})`} strokeWidth="4" /></>}
      {kind === 'atelierHaloDiscHat' && <>
        <ellipse cx="300" cy="178" rx="112" ry="20" fill={paint.base} stroke={lo} strokeWidth="2" />
        <ellipse cx="300" cy="174" rx="100" ry="13" fill={fill} opacity="0.88" />
        <path d="M 262 177 C 260 145 276 132 300 132 C 324 132 340 145 338 177 Z" fill={paint.base} stroke={lo} strokeWidth="1.6" />
        <ellipse cx="300" cy="175" rx="66" ry="7" fill={lighten(paint.base, 0.35)} opacity="0.7" />
        <path d="M 250 177 Q 300 187 350 177" fill="none" stroke={`url(#${id('gold')})`} strokeWidth="2.4" />
      </>}
      {kind === 'atelierSculptedPillbox' && <>
        <path d="M 224 205 C 220 172 246 144 300 142 C 354 144 380 172 376 205 Q 300 221 224 205 Z" fill={paint.base} stroke={lo} strokeWidth="2" />
        <path d="M 236 192 Q 300 171 364 192" fill="none" stroke={lighten(paint.base, 0.42)} strokeWidth="3.2" />
        <path d="M 260 152 Q 300 169 340 152" fill="none" stroke={`url(#${id('gold')})`} strokeWidth="2.8" />
        {Array.from({length:5},(_,i)=><circle key={i} cx={272+i*14} cy={165+Math.abs(i-2)*3} r="2.3" fill="#F7FBFF" stroke="#BAC9D8" strokeWidth="0.5" />)}
      </>}
      {kind === 'atelierFoldedFascinator' && <>
        <path d="M 257 202 Q 246 155 278 121 Q 309 96 344 116 Q 325 148 291 180 Z" fill={paint.base} stroke={lo} strokeWidth="1.8" />
        <path d="M 274 197 Q 295 151 330 122 M 284 199 Q 310 160 339 134" fill="none" stroke={lighten(paint.base, 0.42)} strokeWidth="2.1" />
        <ellipse cx="294" cy="193" rx="45" ry="15" transform="rotate(-14 294 193)" fill={fill} stroke={lo} strokeWidth="1.5" />
        <circle cx="294" cy="193" r="5" fill={`url(#${id('gold')})`} stroke="#FFF0B8" strokeWidth="1.2" />
      </>}
      {kind === 'atelierCrystalHeadband' && <>
        <path d="M 204 254 Q 218 143 300 136 Q 382 143 396 254" fill="none" stroke={`url(#${id('gold')})`} strokeWidth="7" />
        <path d="M 206 252 Q 220 151 300 145 Q 380 151 394 252" fill="none" stroke="#F6E7B5" strokeWidth="1.6" />
        {[0,1,2,3,4,5,6,7,8].map((i)=><path key={i} d={`M ${225+i*19} ${170+Math.abs(i-4)*6} l 4 -6 l 4 6 l -4 6 Z`} fill="#F6FBFF" stroke="#AFC5D9" strokeWidth="0.8" />)}
      </>}
      {kind === 'empireArcTiara' && <>
        <path d="M 202 260 Q 220 211 240 219 Q 257 234 274 196 Q 300 147 326 196 Q 343 234 360 219 Q 380 211 398 260" fill="none" stroke={`url(#${id('gold')})`} strokeWidth="5.6" />
        <path d="M 202 260 Q 300 280 398 260" fill="none" stroke={`url(#${id('gold')})`} strokeWidth="5.6" />
        {Array.from({length:9},(_,i)=><path key={i} d={`M ${230+i*17.5} ${228-Math.sin(i*Math.PI/8)*38} l 4 -7 l 4 7 l -4 7 Z`} fill="#F7FBFF" stroke="#BAC9D8" strokeWidth="0.8" />)}
        <circle cx="300" cy="189" r="8" fill="#E9F4FF" stroke={`url(#${id('gold')})`} strokeWidth="1.6" />
      </>}
      {kind === 'atelierMonolithFedora' && <>
        <path d="M 236 201 C 239 160 267 143 300 143 C 333 143 361 160 364 201 Q 300 214 236 201 Z" fill={paint.base} stroke={lo} strokeWidth="1.9" />
        <path d="M 200 201 Q 300 180 400 201 Q 406 222 300 228 Q 194 222 200 201 Z" fill={fill} stroke={lo} strokeWidth="2" />
        <path d="M 239 199 Q 300 215 361 199" fill="none" stroke={`url(#${id('gold')})`} strokeWidth="4" />
        <path d="M 292 144 L 291 195 M 308 144 L 309 195" stroke={lighten(paint.base, 0.35)} strokeWidth="1.4" />
      </>}
      {kind === 'atelierArchitecturalCap' && <>
        <path d="M 224 206 C 220 170 251 144 300 144 C 349 144 380 170 376 206 Z" fill={paint.base} stroke={lo} strokeWidth="1.7" />
        <path d="M 216 205 Q 300 190 384 205 Q 397 221 300 225 Q 203 221 216 205 Z" fill={fill} stroke={lo} strokeWidth="1.8" />
        <path d="M 300 145 L 300 202 M 262 151 L 276 201 M 338 151 L 324 201" stroke={lighten(paint.base, 0.34)} strokeWidth="1.5" />
        <rect x="292" y="151" width="16" height="16" rx="2" fill={`url(#${id('gold')})`} />
      </>}
      {kind === 'empireCashmereBeanie' && <>
        <path d="M 224 218 C 215 170 251 128 300 128 C 349 128 385 170 376 218 Q 300 238 224 218 Z" fill={paint.base} stroke={lo} strokeWidth="1.9" />
        <path d="M 223 202 Q 300 223 377 202 L 381 218 Q 300 240 219 218 Z" fill={fill} stroke={lo} strokeWidth="1.4" />
        {[0,1,2,3,4].map((i)=><path key={i} d={`M ${250+i*25} 151 Q ${244+i*25} 185 ${250+i*25} 215`} fill="none" stroke={lighten(paint.base,0.32)} strokeWidth="2" opacity="0.8" />)}
        <circle cx="300" cy="131" r="4.5" fill={`url(#${id('gold')})`} />
      </>}
    </g>
  );
};
