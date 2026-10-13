import { Occasion } from '../constants/catalog';
import { generateRandomCustomer } from '../utils/randomizer';
import { BUDGET, SERVICE_BUDGET, SERVICE_SHARE } from './economy';
import { WANTED_COLOURS } from './colours';
import { Customer, CustomerClass, GameState, Regular, Want } from './types';
import { shopStats } from './shop';

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const chance = (p: number) => Math.random() < p;

const WOMEN = ['Adaeze', 'Funmilayo', 'Chiamaka', 'Aisha', 'Temitope', 'Ngozi', 'Bisola', 'Kemi', 'Halima', 'Ifeoma', 'Yetunde', 'Zainab', 'Omotola', 'Chioma', 'Damilola', 'Uche', 'Bukola', 'Amaka', 'Fatima', 'Toyin', 'Ebere', 'Simi', 'Ronke', 'Nkechi', 'Hauwa', 'Folake', 'Sade', 'Ijeoma', 'Mercy', 'Blessing', 'Precious', 'Joy', 'Esther', 'Ruth', 'Tolu', 'Adunni', 'Oluchi', 'Aminat', 'Ese', 'Ivie'];
const MEN = ['Tunde', 'Chinedu', 'Emeka', 'Segun', 'Ibrahim', 'Femi', 'Obinna', 'Kunle', 'Musa', 'Dayo', 'Ikenna', 'Babatunde', 'Uchenna', 'Tobi', 'Yusuf', 'Kelechi', 'Wale', 'Ebuka', 'Gbenga', 'Osas'];

export const OCCASION_LABEL: Record<Occasion, string> = {
  owambe: 'Owambe party',
  wedding: 'Wedding',
  church: 'Church',
  office: 'Office',
  dateNight: 'Date night',
  birthday: 'Birthday',
  party: 'Night party',
  casual: 'Casual',
  brunch: 'Brunch',
  redCarpet: 'Red carpet',
};

const OCCASIONS: Record<CustomerClass, Occasion[]> = {
  poor: ['casual', 'church', 'owambe', 'birthday', 'office', 'casual', 'church'],
  middle: ['owambe', 'wedding', 'church', 'office', 'dateNight', 'birthday', 'party', 'brunch', 'casual'],
  rich: ['owambe', 'wedding', 'redCarpet', 'party', 'dateNight', 'birthday', 'wedding', 'owambe'],
};

const INTRO_F: Record<Occasion, string[]> = {
  owambe: ["My aunty's 60th birthday is this Saturday and the whole family will be there.", "We have owambe for my cousin's house-warming this weekend.", "My mum's friend is burying her father in style on Saturday. Big owambe."],
  wedding: ["My best friend's traditional wedding is next week and I'm in the aso-ebi crew.", "My brother is getting married on Saturday!", "I have a white wedding to attend in Ikoyi."],
  church: ["We have thanksgiving service on Sunday.", "It's our church anniversary this Sunday and I'm reading the Bible passage.", "Sunday service, but I want to look different this time."],
  office: ["I just got a new job at a bank in VI. First week is Monday.", "I have an interview with an oil company next week.", "My office has an end-of-month review and my oga will be there."],
  dateNight: ["My guy is taking me out on Friday night.", "First date with someone I met on Instagram. I'm nervous o.", "It's our anniversary dinner this weekend."],
  birthday: ["It's my birthday this weekend!", "My birthday shoot is on Saturday.", "My best friend's birthday dinner is tomorrow."],
  party: ["There's a big party on the Island this Friday.", "My friends are dragging me to a club in Lekki.", "Album listening party on Saturday."],
  casual: ["I just want something fine to wear around.", "I'm travelling to see my family and I want to look fresh.", "Just something for hangout with my friends."],
  brunch: ["Brunch with the girls in Lekki on Saturday.", "Sunday brunch at a new spot in VI.", "Girls' day out this weekend."],
  redCarpet: ["I'm walking the red carpet at an awards night.", "Movie premiere at Filmhouse IMAX. Cameras everywhere.", "I'm presenting at an awards show next week."],
};

const INTRO_M: Partial<Record<Occasion, string[]>> = {
  owambe: ["My father's 70th is this Saturday.", "Owambe for my uncle's chieftaincy title."],
  wedding: ["I'm the best man at my friend's wedding.", "My sister's traditional wedding is on Saturday."],
  church: ["Thanksgiving on Sunday, my wife wants me to look sharp.", "I'm ushering in church this Sunday."],
  office: ["I have a big presentation at work on Monday.", "Job interview next week."],
  dateNight: ["I'm taking a babe out on Friday.", "Anniversary dinner with my wife."],
  birthday: ["My birthday dinner is on Saturday.", "My guy's birthday party is this weekend."],
  party: ["We're going out on the Island on Friday.", "Club night in Lekki."],
  casual: ["I just want to look clean.", "Something for the weekend."],
  redCarpet: ["I'm on the red carpet at an awards night."],
  brunch: ["Brunch with my people in VI."],
};

const BUDGET_LINE: Record<CustomerClass, string[]> = {
  poor: ['I no get plenty money o, about {b} is what I have.', 'Abeg manage me, my budget is around {b}.', 'I can spend about {b}, no more.'],
  middle: ['My budget is about {b}.', 'I can do around {b}.', "I'm working with about {b}."],
  rich: ["Money isn't the problem, but I'm thinking around {b}.", 'Spend around {b}, just make me shine.', 'Budget is about {b}. Make it worth it.'],
};

function wantLine(w: Want, male: boolean): string {
  switch (w.kind) {
    case 'color': return pick([`I want ${w.name}.`, `Something ${w.name}, abeg.`, `${w.name[0].toUpperCase() + w.name.slice(1)} is my colour.`]);
    case 'native': return pick(['I want native.', 'Make it native, I want to rep my culture.', 'Native wear, please.']);
    case 'english': return pick(['No native this time, I want English wear.', 'I want English, something modern.']);
    case 'gele': return pick(['I must tie gele.', "And gele! It's not complete without gele."]);
    case 'nails': return pick(['Please make my nails pop too.', 'Fresh nails to match the outfit, please.', 'I need a proper nail colour for this look.']);
    case 'noHeels': return pick(['Please no heels, my legs no fit.', 'Flat shoes only, I go dance well well.']);
    case 'fitted': return pick(['Make it show my shape.', 'I want something that hugs my body.']);
    case 'covered': return pick(['Nothing too short or open.', 'Keep it decent please, nothing short.']);
    case 'jacket': return male ? 'Add a jacket.' : pick(['Add a jacket on top.', 'I want a jacket or something on top.']);
    case 'hair': if (w.group === 'male') return 'Make the cut sharp.'; return { wig: 'Install a fine wig for me.', braids: 'Do braids for me.', natural: 'I want my natural hair, styled.', updo: 'Pack my hair up.', twists: 'I want twists.', locs: 'I want locs.' }[w.group] || 'Do something with my hair.';
    case 'glam': return pick(['Full glam, I want to slay.', 'Beat my face well well.']);
    case 'naturalFace': return pick(['Light makeup only.', "Soft makeup, I don't like heavy face."]);
  }
}

function wantsFor(occasion: Occasion, male: boolean, cls: CustomerClass, wigs: boolean): Want[] {
  const pool: Want[] = [];
  const colour = pick(WANTED_COLOURS);
  pool.push({ kind: 'color', color: colour.color, name: colour.name });
  if (occasion === 'owambe' || occasion === 'wedding') {
    pool.push({ kind: 'native' }, { kind: 'native' });
    if (!male) pool.push({ kind: 'gele' }, { kind: 'gele' });
  } else if (occasion !== 'redCarpet') {
    pool.push({ kind: 'native' }, { kind: 'english' });
  }
  if (occasion === 'church' && !male) pool.push({ kind: 'covered' });
  if (!male) {
    if (['party', 'dateNight', 'birthday', 'redCarpet'].includes(occasion)) pool.push({ kind: 'fitted' }, { kind: 'glam' }, { kind: 'nails' });
    if (['owambe', 'wedding'].includes(occasion)) pool.push({ kind: 'noHeels' }, { kind: 'glam' });
    if (['church', 'office', 'casual', 'brunch'].includes(occasion)) pool.push({ kind: 'naturalFace' });
    pool.push({ kind: 'hair', group: pick(wigs ? ['wig', 'braids', 'natural', 'updo'] : ['braids', 'natural', 'updo', 'twists']) });
  }
  if (['office', 'dateNight', 'casual'].includes(occasion)) pool.push({ kind: 'jacket' });
  const n = cls === 'poor' ? (chance(0.5) ? 1 : 0) : chance(0.6) ? 2 : 1;
  const out: Want[] = [];
  while (out.length < n && pool.length) {
    const w = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    if (out.some((o) => o.kind === w.kind)) continue;
    if ((w.kind === 'native' && out.some((o) => o.kind === 'english')) || (w.kind === 'english' && out.some((o) => o.kind === 'native'))) continue;
    if ((w.kind === 'glam' && out.some((o) => o.kind === 'naturalFace')) || (w.kind === 'naturalFace' && out.some((o) => o.kind === 'glam'))) continue;
    if (w.kind === 'gele' && out.some((o) => o.kind === 'english')) continue;
    out.push(w);
  }
  return out;
}

function classFor(state: GameState, mix: [number, number, number]): CustomerClass {
  const shift = (state.rep - 50) / 500;
  const r = Math.random();
  if (r < mix[0] - shift) return 'poor';
  if (r < mix[0] + mix[1] - shift / 2) return 'middle';
  return 'rich';
}

const roundBudget = (b: number) => (b >= 100_000 ? Math.round(b / 10_000) * 10_000 : Math.round(b / 1_000) * 1_000);

const SERVICE_INTRO = {
  hair: ["I didn't come for clothes today, just my hair.", 'Only my hair today, I already have my outfit.', "Abeg I just want to make my hair. I have clothes at home."],
  makeup: ['I just want makeup, my dress is ready.', "Only my face today. I'm wearing my own outfit.", 'Just makeup please, nothing else.'],
  both: ['Hair and makeup only, I have my outfit already.', "I'm not buying clothes today. Just do my hair and face."],
  male: ['Just a fresh cut, nothing else.', 'Only haircut and beard today, my guy.', "I just want to look clean. Cut only."],
};

function serviceWants(kind: NonNullable<Customer['service']>, occasion: Occasion, male: boolean, cls: CustomerClass, wigs: boolean): Want[] {
  if (male) return [{ kind: 'hair', group: 'male' }];
  const out: Want[] = [];
  if (kind !== 'makeup') out.push({ kind: 'hair', group: pick(cls === 'poor' || !wigs ? ['braids', 'natural', 'updo', 'twists', 'locs'] : ['wig', 'wig', 'braids', 'natural', 'updo', 'twists', 'locs']) });
  if (kind !== 'hair') out.push(['owambe', 'wedding', 'party', 'redCarpet', 'birthday', 'dateNight'].includes(occasion) ? { kind: 'glam' } : { kind: 'naturalFace' });
  return out;
}

export function buildRequest(c: Omit<Customer, 'request'>, regular?: Regular): string {
  const intro = pick((c.male ? INTRO_M[c.occasion] : null) || INTRO_F[c.occasion]);
  const parts = [regular ? pick([`Divine! It's me again, ${c.name}.`, `I'm back o! ${c.name}, remember me?`]) : '', intro];
  if (c.service) parts.push(pick(c.male ? SERVICE_INTRO.male : SERVICE_INTRO[c.service]));
  c.wants.forEach((w) => parts.push(wantLine(w, c.male)));
  if (regular?.tasteKnown && !c.service) parts.push(`You know I love ${c.taste.favName}.`);
  parts.push(pick(BUDGET_LINE[c.cls]).replace('{b}', `₦${c.budget.toLocaleString('en-NG')}`));
  return parts.filter(Boolean).join(' ');
}

const EVERYDAY = ['#5A3A28', '#1E1E24', '#2F5D3A', '#7A3A8C', '#1F6FB2', '#E9D8B8', '#8E1F3A', '#6B8E23'];
/** Plain customers walk in wearing simple everyday clothes, never a gown. */
function everydayWardrobe(male: boolean) {
  const c = () => pick(EVERYDAY);
  const g = (style: string, fabric: 'plain' | 'denim' | 'ankara' = 'plain') => ({ style, fabric, color: fabric === 'denim' ? '#3C5A8A' : c(), color2: c(), pattern: Math.floor(Math.random() * 10) });
  if (male) return pick([{ top: g('tee'), bottom: g('jeans', 'denim') }, { top: g('polo'), bottom: g('chinos') }, { top: g('mensBuba', 'plain'), bottom: g('sokoto') }]);
  // 20 additional everyday and occasion outfit combinations, using the existing garment catalogue.
  return pick([
    { top: g('tshirt'), bottom: g('skinnyJeans', 'denim') },
    { top: g('tshirt'), bottom: g('maxiSkirt') },
    { top: g('blouse'), bottom: g('aLineSkirt') },
    { top: g('buba', 'ankara'), bottom: g('iro', 'ankara') },
    { dress: g('bubu', 'ankara') },
    { top: g('cropTee'), bottom: g('baggyJeans', 'denim') },
    { top: g('camisole'), bottom: g('pencilSkirt') },
    { top: g('peplumTop', 'ankara'), bottom: g('iro', 'ankara') },
    { top: g('offShoulderTop'), bottom: g('denimMaxiSkirt', 'denim') },
    { top: g('wrapTop'), bottom: g('wideLegTrousers') },
    { top: g('puffBlouse'), bottom: g('pleatedMidi') },
    { top: g('laceBlouse', 'ankara'), bottom: g('georgeWrapper', 'ankara') },
    { top: g('offShoulderBuba', 'ankara'), bottom: g('iro', 'ankara') },
    { dress: g('bodyconMini') },
    { dress: g('slipDress') },
    { dress: g('wrapDress') },
    { dress: g('shirtDress') },
    { dress: g('tubeMidi') },
    { dress: g('maxiDress') },
    { dress: g('ruffleMaxi') },
    { dress: g('mermaidGown', 'ankara') },
    { dress: g('adireMaxi', 'ankara') },
    { dress: g('jumpsuit') },
    { dress: g('playsuit') },
    { top: g('blazer'), bottom: g('straightTrousers') },
    { top: g('kimono'), bottom: g('skinnyJeans', 'denim') },
  ]);
}

/** Real Nigerian entertainers are represented as fictional in-game guest events. */
const CELEBRITY_POOLS: { name: string; male: boolean; rank: string }[][] = [
  [
    { name: 'Mavo', male: true, rank: 'Rising star' },
    { name: 'FOLA', male: true, rank: 'Breakout artist' },
    { name: 'Kiekie', male: false, rank: 'Digital favourite' },
    { name: 'Broda Shaggi', male: true, rank: 'Comedy star' },
  ],
  [
    { name: 'Rema', male: true, rank: 'Hitmaker' },
    { name: 'Ayra Starr', male: false, rank: 'Afropop star' },
    { name: 'Bimbo Ademoye', male: false, rank: 'Nollywood favourite' },
    { name: 'Tobi Bakre', male: true, rank: 'Screen star' },
    { name: 'Sabinus', male: true, rank: 'Comedy star' },
  ],
  [
    { name: 'Asake', male: true, rank: 'Arena headliner' },
    { name: 'Tiwa Savage', male: false, rank: 'Afrobeats icon' },
    { name: 'Olamide', male: true, rank: 'Music mogul' },
    { name: 'Kizz Daniel', male: true, rank: 'Hitmaker' },
    { name: 'Ini Edo', male: false, rank: 'Nollywood star' },
  ],
  [
    { name: 'Don Jazzy', male: true, rank: 'Music executive' },
    { name: 'Funke Akindele', male: false, rank: 'Blockbuster filmmaker' },
    { name: 'Tems', male: false, rank: 'Global music star' },
    { name: 'Genevieve Nnaji', male: false, rank: 'Screen icon' },
    { name: 'Olamide', male: true, rank: 'Music mogul' },
  ],
  [
    { name: 'Davido', male: true, rank: 'SSS global superstar' },
    { name: 'Wizkid', male: true, rank: 'SSS global superstar' },
    { name: 'Burna Boy', male: true, rank: 'SSS global superstar' },
    { name: 'Don Jazzy', male: true, rank: 'Industry heavyweight' },
    { name: 'Funke Akindele', male: false, rank: 'Nollywood powerhouse' },
    { name: 'Tiwa Savage', male: false, rank: 'Global Afrobeats icon' },
  ],
];

export function makeCelebrityCustomer(state: GameState, celebrityTier: number): Customer {
  // Celebrity tier is its own five-level scale; shop level only controls eligibility.
  const tier = Math.max(0, Math.min(4, Math.floor(Number.isFinite(celebrityTier) ? celebrityTier : 0)));
  const profile = pick(CELEBRITY_POOLS[tier]);
  let base = makeCustomer(state, [0, 0, 1]);
  // The visual avatar is randomly generated, while the public figure is a fictional guest-event portrayal.
  if (base.male !== profile.male) {
    const candidates = Array.from({ length: 12 }, () => generateRandomCustomer('plain')).find((c) => (c.body === 'male') === profile.male);
    if (candidates) base = { ...base, look: { ...candidates, state: 'plain' }, male: profile.male };
  }
  const spendFloor = [1_500_000, 2_500_000, 4_000_000, 7_500_000, 15_000_000][tier];
  const budget = [3_000_000, 5_000_000, 8_000_000, 15_000_000, 35_000_000][tier];
  const guest = {
    ...base,
    id: `vip-${state.day}-${Math.random().toString(36).slice(2, 8)}`,
    name: profile.name,
    cls: 'rich' as const,
    occasion: 'redCarpet' as Occasion,
    budget,
    male: profile.male,
    influencer: true,
    regularId: undefined,
    celebrity: { tier, rank: profile.rank, spendFloor },
  };
  return {
    ...guest,
    request: `A special Lagos celebrity guest has arrived: ${profile.name} · ${profile.rank}. I need a show-stopping luxury look. Money is not the issue, and my team is waiting outside. Please make this memorable. Budget: ₦${budget.toLocaleString('en-NG')}.`,
  };
}

export function makeCustomer(state: GameState, mix: [number, number, number]): Customer {
  // regulars come back
  const regular = state.regulars.length && chance(Math.min(0.35, 0.08 + state.regulars.length * 0.03)) ? pick(state.regulars) : undefined;
  const cls = state.listing.signature ? (chance(0.08) ? 'middle' : 'rich') : regular ? regular.cls : classFor(state, mix);
  const rolled = regular ? { ...regular.look, state: 'plain' as const } : { ...generateRandomCustomer('plain'), state: 'plain' as const };
  const male = rolled.body === 'male';
  const look = regular ? rolled : { ...rolled, wardrobe: everydayWardrobe(male), outfit: undefined, accessories: { ...(rolled.accessories || {}), headwear: 'none', shoes: male ? 'slides' : 'flats' } as typeof rolled.accessories };
  const occasion = pick(OCCASIONS[cls]);
  // nobody asks for a wig install before there's a hair station
  const wigs = shopStats(state.furniture, state.tier, state.listing.stars).wigs;
  const service: Customer['service'] = chance(male ? SERVICE_SHARE.male : SERVICE_SHARE.female) ? (male ? 'hair' : pick(['hair', 'hair', 'makeup', 'both'] as const)) : undefined;
  const [lo, hi] = (service ? SERVICE_BUDGET : BUDGET)[cls];
  const budget = roundBudget(lo + Math.random() * (hi - lo));
  const fav = regular ? { favColor: regular.favColor, favName: regular.favName } : (() => { const c = pick(WANTED_COLOURS); return { favColor: c.color, favName: c.name }; })();
  const base = {
    id: `c${state.day}-${Math.random().toString(36).slice(2, 8)}`,
    name: regular ? regular.name : pick(male ? MEN : WOMEN),
    cls,
    occasion,
    budget,
    wants: service ? serviceWants(service, occasion, male, cls, wigs) : wantsFor(occasion, male, cls, wigs),
    service,
    taste: fav,
    look,
    male,
    influencer: cls === 'rich' && chance(0.25),
    regularId: regular?.id,
  };
  return { ...base, request: buildRequest(base, regular) };
}
