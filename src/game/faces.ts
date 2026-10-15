/**
 * Profile pictures for everyone who messages Divine. Real people get their own face —
 * the one the game already knows (staff, rivals, regulars, customers in the shop) or a
 * face generated from their name, so it never changes between visits. Businesses get logos.
 */
import type { CharacterConfig } from '../types/character';
import { generateRandomCustomer } from '../utils/randomizer';
import { MEN, WOMEN } from './customers';
import type { GameState } from './types';

const BUSINESS = /\b(mart|bank|hq|bills|market|week|gidigram|daily|ltd|limited|enterprises|ventures|fashion|magazine|media|tv|nepa|disco|landlord association|contracts|office|ministry|agency|brand|store|plc|group|empire|club)\b/i;
const KNOWN_BUSINESSES = new Set(['Yaba Mart', 'KoboBank', 'Asanwa HQ', 'Bills', 'Gidigram', 'GistLagos', 'Lagos Fashion Week', 'Naija Fashion Market', 'Lagos Weather', 'IKEDC', 'EKEDC']);

export function isBusinessName(name: string): boolean {
  return KNOWN_BUSINESSES.has(name) || BUSINESS.test(name);
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Run fn with Math.random replaced by a seeded generator, so a name always yields the same face. */
function withSeed<T>(seed: number, fn: () => T): T {
  const original = Math.random;
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return fn(); } finally { Math.random = original; }
}

const MALE_TITLES = /^(mr|oga|alhaji|chief|baba|uncle|bros|brother|prince|sir|dr\.? [A-Z]?)\b/i;
const FEMALE_TITLES = /^(mrs|miss|ms|madam|mummy|mama|aunty|auntie|iya|princess|lady|sister)\b/i;
export function looksMale(name: string): boolean {
  const first = name.replace(/\(.*?\)/g, '').trim().split(/\s+/)[0] || '';
  if (MALE_TITLES.test(name)) return true;
  if (FEMALE_TITLES.test(name)) return false;
  if (MEN.includes(first)) return true;
  if (WOMEN.includes(first)) return false;
  return hash(first) % 4 === 0; // most of Divine's contacts are women
}

const cache = new Map<string, CharacterConfig>();
/** A stable, name-based face for a person the game has no stored look for. */
export function generatedFace(name: string): CharacterConfig {
  const key = name.trim();
  const hit = cache.get(key);
  if (hit) return hit;
  const male = looksMale(key);
  const face = withSeed(hash('face:' + key), () => {
    for (let i = 0; i < 40; i++) {
      const c = generateRandomCustomer('styled');
      if ((c.body === 'male') === male) return c;
    }
    return generateRandomCustomer('styled');
  });
  // Profile pictures: brown to deep skin tones for Lagos names, and no sunglasses hiding the face.
  const tones = ['tone1', 'tone2', 'tone3', 'tone4', 'tone5', 'tone6'] as const;
  const portrait: CharacterConfig = {
    ...face,
    state: 'styled',
    skinTone: tones[hash('tone:' + key) % tones.length] as CharacterConfig['skinTone'],
    accessories: { ...(face.accessories || {}), glasses: 'none' } as CharacterConfig['accessories'],
  };
  cache.set(key, portrait);
  return portrait;
}

/** The look the game already has for this person, if any. */
export function knownFace(name: string, s: GameState): CharacterConfig | undefined {
  const base = name.replace(/\s*\(.*?\)\s*$/, '').trim();
  const staff = (s.staff || []).find((m) => m.name === base);
  if (staff?.look) return staff.look;
  const rival = (s.rivals || []).find((r) => r.owner === base);
  if (rival?.look) return rival.look;
  const regular = (s.regulars || []).find((r) => r.name === base);
  if (regular?.look) return { ...regular.look, state: 'styled' };
  const visitor = (s.inShop || []).find((v) => v.c.name === base);
  if (visitor?.c.look) return visitor.c.look;
  return undefined;
}
