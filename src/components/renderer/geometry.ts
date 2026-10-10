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
  /** Degrees the arms are swung out (A-pose); hands and shoes follow it. */
  armAngle?: number;
  footScale: number;
  female: boolean;
}

export const BODY_SPECS: Record<BodyType, BodySpec> = {
  femaleSlim: {
    neck: [286, 25],
    shoulder: [304, 86],
    pit: [360, 76],
    bust: [420, 86],
    under: [450, 76],
    waist: [520, 64],
    hhip: [580, 84],
    hip: [640, 94],
    crotch: 720,
    armInner: [[232, 330], [230, 380], [226, 450], [220, 520], [216, 560], [212, 640], [208, 722]],
    armOuter: [[188, 722], [184, 650], [183, 590], [186, 530], [188, 470], [188, 400], [192, 342], [199, 318], [210, 308], [227, 304]],
    wrist: [198, 724],
    legOuter: [[206, 600], [204, 660], [208, 740], [216, 840], [226, 940], [229, 1010], [227, 1060], [230, 1140], [242, 1240], [258, 1340], [263, 1370]],
    legInner: [[300, 698], [293, 740], [289, 820], [285, 920], [283, 1000], [281, 1040], [283, 1120], [283, 1200], [283, 1300], [284, 1370]],
    ankle: [273, 1370],
    knee: [255, 1010],
    elbow: [204, 525],
    handScale: 1.16,
    footScale: 1.22,
    female: true,
  },
  femaleRegular: {
    neck: [286, 26],
    shoulder: [304, 86],
    pit: [360, 78],
    bust: [424, 104],
    under: [458, 82],
    waist: [522, 64],
    hhip: [578, 104],
    hip: [634, 126],
    crotch: 724,
    armInner: [[230, 330], [226, 380], [220, 450], [212, 520], [206, 560], [198, 640], [190, 722]],
    armOuter: [[166, 722], [163, 650], [164, 590], [170, 530], [176, 470], [182, 400], [190, 342], [198, 318], [210, 308], [227, 304]],
    wrist: [178, 724],
    legOuter: [[174, 600], [174, 640], [176, 700], [186, 800], [206, 900], [218, 1000], [220, 1040], [224, 1120], [238, 1230], [256, 1340], [262, 1370]],
    legInner: [[300, 702], [292, 744], [288, 820], [284, 920], [282, 1000], [280, 1040], [282, 1120], [282, 1200], [282, 1300], [284, 1370]],
    ankle: [273, 1370],
    knee: [249, 1010],
    elbow: [192, 525],
    handScale: 1.2,
    footScale: 1.25,
    female: true,
  },
  femalePlus: {
    neck: [288, 30],
    shoulder: [306, 94],
    pit: [368, 92],
    bust: [436, 126],
    under: [478, 110],
    waist: [534, 94],
    hhip: [584, 134],
    hip: [640, 158],
    crotch: 734,
    armInner: [[212, 340], [208, 400], [202, 470], [192, 530], [186, 580], [178, 650], [168, 722]],
    armOuter: [[142, 722], [136, 650], [132, 580], [136, 520], [142, 460], [148, 400], [156, 346], [166, 320], [180, 310], [204, 306]],
    wrist: [155, 724],
    legOuter: [[142, 620], [142, 660], [148, 740], [168, 860], [190, 960], [203, 1012], [201, 1060], [205, 1140], [224, 1240], [246, 1340], [254, 1370]],
    legInner: [[300, 716], [292, 760], [288, 840], [286, 930], [282, 1004], [280, 1044], [282, 1120], [282, 1200], [282, 1300], [284, 1370]],
    ankle: [269, 1370],
    knee: [242, 1012],
    elbow: [164, 525],
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

/**
 * A-pose: swing each arm out from the shoulder joint so the waist and hips are never
 * hidden behind the arms (the standard dress-up pose). Positive degrees move the hand
 * away from the body.
 */
function aPose(s: BodySpec, deg: number): BodySpec {
  const top = s.armOuter[s.armOuter.length - 1];
  const px = top[0] - 12;
  const py = top[1] + 16;
  const a = (deg * Math.PI) / 180;
  const r = ([x, y]: Pt): Pt => {
    const dx = x - px;
    const dy = y - py;
    return [px + dx * Math.cos(a) - dy * Math.sin(a), py + dx * Math.sin(a) + dy * Math.cos(a)];
  };
  return { ...s, armInner: s.armInner.map(r), armOuter: s.armOuter.map(r), wrist: r(s.wrist), elbow: r(s.elbow), armAngle: deg };
}

for (const k of Object.keys(BODY_SPECS) as BodyType[]) {
  BODY_SPECS[k] = aPose(BODY_SPECS[k], k === 'male' ? 6 : 9);
}

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
