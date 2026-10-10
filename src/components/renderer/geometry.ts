import { BodyType } from '../../types/character';

/**
 * Body geometry in full-body space (viewBox 0 0 600 1500, centre line x = 300).
 * Outlines are hand-placed key points joined with smooth Catmull-Rom curves.
 * Arms and legs are given for the LEFT side of the image and mirrored.
 */

export type Pt = [number, number];

const f = (n: number) => n.toFixed(1);

/** Smooth cubic segments through pts, starting from pts[0] (which must already be the current point). */
export function curveThrough(pts: Pt[]): string {
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/** A closed, smooth outline through every point. */
export function closedCurve(pts: Pt[]): string {
  const n = pts.length;
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + ' Z';
}

/** Open path from several smooth runs joined by straight lines (for hems and seams). */
export function runs(...parts: Pt[][]): string {
  let d = '';
  parts.forEach((pts, i) => {
    d += `${i === 0 ? 'M' : ' L'} ${f(pts[0][0])} ${f(pts[0][1])}` + curveThrough(pts);
  });
  return d + ' Z';
}

export const mirrorPt = ([x, y]: Pt): Pt => [600 - x, y];
export const mirrorPts = (pts: Pt[]) => pts.map(mirrorPt);

export interface BodySpec {
  neck: [number, number]; // y, half width
  shoulder: [number, number];
  pit: [number, number];
  bust: [number, number];
  under: [number, number];
  waist: [number, number];
  hhip: [number, number];
  hip: [number, number];
  crotch: number;
  /** Left arm: inner edge top->bottom, outer edge bottom->top (wrist first). */
  armInner: Pt[];
  armOuter: Pt[];
  wrist: Pt;
  /** Left leg: outer edge top->bottom, inner edge top->bottom. */
  legOuter: Pt[];
  legInner: Pt[];
  ankle: Pt;
  knee: Pt;
  elbow: Pt;
  handScale: number;
  footScale: number;
  female: boolean;
}

export const BODY_SPECS: Record<BodyType, BodySpec> = {
  femaleRegular: {
    neck: [286, 26],
    shoulder: [304, 90],
    pit: [360, 80],
    bust: [420, 94],
    under: [452, 82],
    waist: [520, 70],
    hhip: [580, 92],
    hip: [640, 104],
    crotch: 722,
    armInner: [[230, 330], [228, 380], [224, 450], [218, 520], [214, 560], [210, 640], [206, 722]],
    armOuter: [[184, 722], [180, 650], [178, 590], [182, 530], [184, 470], [184, 400], [188, 342], [196, 318], [208, 308], [226, 304]],
    wrist: [195, 724],
    legOuter: [[196, 600], [194, 660], [198, 740], [208, 840], [220, 940], [224, 1010], [222, 1060], [226, 1140], [240, 1240], [256, 1340], [262, 1370]],
    legInner: [[300, 700], [292, 740], [288, 820], [284, 920], [282, 1000], [280, 1040], [282, 1120], [282, 1200], [282, 1300], [284, 1370]],
    ankle: [273, 1370],
    knee: [252, 1010],
    elbow: [200, 525],
    handScale: 1.2,
    footScale: 1.25,
    female: true,
  },
  femalePlus: {
    neck: [288, 30],
    shoulder: [306, 98],
    pit: [368, 92],
    bust: [432, 120],
    under: [472, 108],
    waist: [530, 104],
    hhip: [590, 124],
    hip: [650, 140],
    crotch: 730,
    armInner: [[212, 340], [210, 400], [206, 470], [198, 530], [194, 580], [190, 650], [182, 722]],
    armOuter: [[156, 722], [150, 650], [146, 580], [148, 520], [152, 460], [152, 400], [156, 346], [166, 320], [180, 310], [204, 306]],
    wrist: [169, 724],
    legOuter: [[160, 620], [158, 680], [162, 760], [176, 860], [196, 960], [206, 1012], [204, 1060], [208, 1140], [226, 1240], [246, 1340], [254, 1370]],
    legInner: [[300, 712], [292, 760], [288, 840], [286, 930], [282, 1004], [280, 1044], [282, 1120], [282, 1200], [282, 1300], [284, 1370]],
    ankle: [269, 1370],
    knee: [244, 1012],
    elbow: [174, 525],
    handScale: 1.28,
    footScale: 1.3,
    female: true,
  },
  male: {
    neck: [288, 36],
    shoulder: [312, 122],
    pit: [380, 112],
    bust: [420, 118],
    under: [456, 112],
    waist: [540, 100],
    hhip: [600, 102],
    hip: [650, 106],
    crotch: 728,
    armInner: [[192, 322], [194, 350], [194, 410], [190, 470], [186, 530], [182, 580], [182, 650], [182, 722]],
    armOuter: [[156, 722], [152, 650], [146, 590], [150, 530], [146, 470], [142, 400], [146, 348], [156, 332], [172, 320], [194, 313]],
    wrist: [169, 724],
    legOuter: [[192, 620], [190, 700], [196, 800], [206, 900], [214, 1000], [216, 1040], [220, 1120], [230, 1220], [246, 1330], [252, 1370]],
    legInner: [[300, 712], [294, 760], [290, 840], [286, 930], [284, 1000], [282, 1040], [284, 1120], [284, 1220], [284, 1320], [286, 1370]],
    ankle: [269, 1370],
    knee: [250, 1010],
    elbow: [168, 530],
    handScale: 1.42,
    footScale: 1.4,
    female: false,
  },
};

/** Torso outline (neck base to crotch), smooth all round. */
export function torsoPath(s: BodySpec): string {
  const L = (y: number, h: number): Pt => [300 - h, y];
  const left: Pt[] = [
    L(s.neck[0], s.neck[1]),
    L(s.neck[0] + 10, s.shoulder[1] * 0.55),
    L(s.shoulder[0] + 6, s.shoulder[1]),
    L(s.pit[0], s.pit[1]),
    L(s.bust[0], s.bust[1]),
    L(s.under[0], s.under[1]),
    L(s.waist[0], s.waist[1]),
    L(s.hhip[0], s.hhip[1]),
    L(s.hip[0], s.hip[1]),
    L(s.hip[0] + 50, s.hip[1] - 18),
    L(s.crotch - 8, 46),
    [300, s.crotch],
  ];
  const right = left.slice(0, -1).reverse().map(mirrorPt);
  return closedCurve([...left, ...right]);
}

/** Left leg outline (mirror for the right). */
export function legPath(s: BodySpec): string {
  const outer = s.legOuter;
  const inner = [...s.legInner].reverse();
  return runs(outer, inner);
}

/** Left arm outline (mirror for the right). */
export function armPath(s: BodySpec): string {
  return runs(s.armInner, s.armOuter);
}

/** Half width of the torso at a given y (linear between key points). */
export function torsoHalfAt(s: BodySpec, y: number): number {
  const keys: [number, number][] = [s.shoulder, s.pit, s.bust, s.under, s.waist, s.hhip, s.hip];
  if (y <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [y0, h0] = keys[i];
    const [y1, h1] = keys[i + 1];
    if (y >= y0 && y <= y1) return h0 + ((h1 - h0) * (y - y0)) / (y1 - y0);
  }
  return keys[keys.length - 1][1];
}

/** x of a polyline edge at a given y (linear). */
export function edgeXAt(pts: Pt[], y: number): number {
  const sorted = [...pts].sort((a, b) => a[1] - b[1]);
  if (y <= sorted[0][1]) return sorted[0][0];
  for (let i = 0; i < sorted.length - 1; i++) {
    const [x0, y0] = sorted[i];
    const [x1, y1] = sorted[i + 1];
    if (y >= y0 && y <= y1) return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0 || 1);
  }
  return sorted[sorted.length - 1][0];
}

/** Head placement: divine.svg space (chin y 488) -> body space (chin y 244), scale 0.6. */
export const HEAD_TRANSFORM = 'translate(300 244) scale(0.6) translate(-300 -488)';
