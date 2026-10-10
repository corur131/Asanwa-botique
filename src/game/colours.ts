/** Colour names customers use, and the colour maths behind "matches" and "clashes". */

export const NAMED_COLOURS: { name: string; color: string }[] = [
  { name: 'white', color: '#F6F1E8' },
  { name: 'cream', color: '#E9D8B8' },
  { name: 'gold', color: '#C9A163' },
  { name: 'yellow', color: '#E3B23C' },
  { name: 'orange', color: '#E86A2E' },
  { name: 'red', color: '#C2262E' },
  { name: 'wine', color: '#8E1F3A' },
  { name: 'pink', color: '#E46A9A' },
  { name: 'purple', color: '#7A3A8C' },
  { name: 'royal blue', color: '#2846A8' },
  { name: 'sky blue', color: '#1F6FB2' },
  { name: 'emerald green', color: '#1F7A5A' },
  { name: 'green', color: '#2F5D3A' },
  { name: 'lime', color: '#6B8E23' },
  { name: 'brown', color: '#5A3A28' },
  { name: 'black', color: '#1E1E24' },
];

/** Colours a customer might ask for (no neutrals: nobody begs for beige). */
export const WANTED_COLOURS = NAMED_COLOURS.filter((c) => !['white', 'cream', 'brown', 'black'].includes(c.name));

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function hsl(hex: string): [number, number, number] {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

/** Black, white, cream, beige, brown and gold go with anything. */
export function isNeutral(hex: string) {
  const [h, s, l] = hsl(hex);
  if (l < 0.18 || l > 0.86) return true;
  if (s < 0.22) return true;
  if (h >= 20 && h <= 45 && s < 0.5) return true; // browns, camel, gold
  return false;
}

export const hueDist = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** Close enough to count as "the colour she asked for". */
export function sameColour(a: string, b: string) {
  const [h1, s1, l1] = hsl(a);
  const [h2, s2, l2] = hsl(b);
  if (isNeutral(a) || isNeutral(b)) {
    return Math.abs(l1 - l2) < 0.12 && Math.abs(s1 - s2) < 0.25 && (s1 < 0.22 || hueDist(h1, h2) < 25);
  }
  return hueDist(h1, h2) < 22 && Math.abs(l1 - l2) < 0.25;
}

export const colourName = (hex: string) => {
  let best = NAMED_COLOURS[0];
  let bd = 1e9;
  const [h, s, l] = hsl(hex);
  for (const c of NAMED_COLOURS) {
    const [h2, s2, l2] = hsl(c.color);
    const d = hueDist(h, h2) / 180 + Math.abs(s - s2) + Math.abs(l - l2) * 1.5;
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return best.name;
};

/** 0..1: how well the colours of a look go together. */
export function harmony(colors: string[]): { value: number; note?: string } {
  const strong = colors.filter((c) => !isNeutral(c));
  const hues: number[] = [];
  for (const c of strong) {
    const h = hsl(c)[0];
    if (!hues.some((x) => hueDist(x, h) < 28)) hues.push(h);
  }
  if (hues.length <= 1) return { value: 1 };
  if (hues.length === 2) {
    const d = hueDist(hues[0], hues[1]);
    if (d < 60) return { value: 0.92 };              // analogous
    if (d > 150) return { value: 0.88 };             // complementary
    return { value: 0.7, note: 'The two main colours fight a little.' };
  }
  if (hues.length === 3) return { value: 0.5, note: 'Three loud colours at once is a lot.' };
  return { value: 0.2, note: 'Too many colours: the look clashes.' };
}
