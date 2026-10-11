/**
 * Meeting the rivals face to face: style-offs at events, limited drops at Yaba
 * market, rivals walking into Divine's shop, Divine looking round theirs,
 * fights over the same shop listing, and Deborah's tips.
 */
import { zonedLayout } from './layouts';
import { CharacterConfig } from '../types/character';
import { generateRandomCustomer } from '../utils/randomizer';
import { MARKET, canBuy, isClothing, makeDesign, pieceCost } from './market';
import { NAMED_COLOURS } from './colours';
import { FURNITURE, Listing, Placed, autoPlace, newUid, shopStats } from './shop';
import { startConvo } from './convos';
import { GROUP, REPLIES, ladder, mainRivals, playerRank, rivalById } from './rivals';
import { Customer, Design, Drop, GameState, Message, ReplyChoice, Rival, ShowEvent } from './types';

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const chance = (p: number) => Math.random() < p;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const hash = (id: string) => Array.from(id).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function say(s: GameState, from: string, text: string, opts: Partial<Message> = {}): GameState {
  const id = (s.msgSeq || 0) + 1;
  const m: Message = { id, day: s.day, from, text, tone: 'info', t: s.phase === 'shop' ? Math.floor(s.clock) : undefined, ...opts };
  return { ...s, msgSeq: id, messages: [m, ...s.messages].slice(0, 160) };
}
const feel = (s: GameState, id: string, d: number): GameState => ({ ...s, rivals: s.rivals.map((r) => (r.id === id ? { ...r, feeling: clamp(r.feeling + d, -100, 100) } : r)) });
function gist(s: GameState, title: string, body: string, about?: string, hot = false): GameState {
  return { ...s, gist: [{ id: `g${s.day}-${Math.random().toString(36).slice(2, 7)}`, day: s.day, title, body, about, hot }, ...(s.gist || [])].slice(0, 40) };
}

// ---------------------------------------------------------------------------
// Style-offs
// ---------------------------------------------------------------------------
const HOSTS = [
  ['Owambe Queens Lagos', 'Owambe Queen Challenge'],
  ['Yaba Pop-up Market', 'Pop-up Style-off'],
  ['Naija Brides Expo', 'Bridal Look Battle'],
  ['Campus Fashion Night', 'Gen Z Style Battle'],
];
const PRIZE = [40_000, 90_000, 200_000, 450_000, 900_000];
const FOLLOW = [80, 200, 500, 1_200, 2_500];
const INVITE: ReplyChoice[] = [
  { id: 'accept', label: "I'm in" },
  { id: 'decline', label: 'Not this time' },
];

/** The rival just above Divine on the ladder (the one she most wants to beat). */
function rivalAbove(s: GameState): Rival {
  const rows = ladder(s);
  const me = rows.findIndex((r) => r.you);
  for (let i = me - 1; i >= 0; i--) {
    const r = rivalById(s, rows[i].id);
    if (r && r.main) return r;
  }
  return rivalById(s, 'tolani') || s.rivals[0];
}

export function planEvents(s0: GameState): GameState {
  let s = s0;
  const open = (s.events || []).some((e) => e.status === 'invited' || e.status === 'accepted');
  if (!open && s.day % 7 === 2) {
    const [host, title] = pick(HOSTS);
    const r = rivalAbove(s);
    const e: ShowEvent = { id: `e${s.day}`, title, host, day: s.day + 2, rivalId: r.id, prize: PRIZE[s.tier], followers: FOLLOW[s.tier], status: 'invited' };
    s = { ...s, events: [...(s.events || []), e].slice(-12) };
    s = say(s, host, `Hello Divine! You're invited to our ${title} on day ${e.day}. You and ${r.owner} (${r.shop}) will each style a model; the judges pick the best look. Prize: ₦${e.prize.toLocaleString('en-NG')} and a shout-out to our followers. Are you in?`, { choices: INVITE, ctx: { kind: 'invite', eventId: e.id, rivalId: r.id } });
  }
  // Lagos Fashion Week: once a month, only for the top 10
  if (s.day % 28 === 21 && playerRank(s) <= 10 && !(s.events || []).some((e) => e.title === 'Lagos Fashion Week' && e.day > s.day)) {
    const r = rivalById(s, 'tolani')!;
    const e: ShowEvent = { id: `fw${s.day}`, title: 'Lagos Fashion Week', host: 'Lagos Fashion Week', day: s.day + 7, rivalId: r.id, prize: PRIZE[s.tier] * 5, followers: FOLLOW[s.tier] * 6, status: 'invited' };
    s = { ...s, events: [...(s.events || []), e].slice(-12) };
    s = say(s, 'Lagos Fashion Week', `Divine, congratulations: you made the Top 10. You're invited to show at Lagos Fashion Week on day ${e.day}, against ${r.shop}. Prize ₦${e.prize.toLocaleString('en-NG')} and the whole country watching.`, { choices: INVITE, ctx: { kind: 'invite', eventId: e.id, rivalId: r.id }, tone: 'good' });
  }
  // a missed show: the rival wins by default
  for (const e of s.events || []) {
    if (e.status === 'accepted' && e.day < s.day) {
      s = { ...s, events: s.events.map((x) => (x.id === e.id ? { ...x, status: 'missed' as const } : x)), rep: clamp(s.rep - 2, 0, 100) };
      const r = rivalById(s, e.rivalId);
      if (r) s = say(s, r.owner, `Divine didn't even show up for the ${e.title} 😂 I won by default.`, { chat: GROUP });
    }
  }
  return s;
}

export function answerInvite(s0: GameState, m: Message, choice: ReplyChoice['id']): GameState {
  let s: GameState = { ...s0, messages: s0.messages.map((x) => (x.id === m.id ? { ...x, answered: choice } : x)) };
  const e = (s.events || []).find((x) => x.id === m.ctx?.eventId);
  if (!e || e.status !== 'invited') return s;
  const yes = choice === 'accept';
  s = { ...s, events: s.events.map((x) => (x.id === e.id ? { ...x, status: yes ? ('accepted' as const) : ('declined' as const) } : x)) };
  s = say(s, 'You', yes ? "I'm in! See you there." : "Thank you, but I can't make it this time.", { chat: m.chat || m.from });
  if (yes) s = say(s, e.host, `Great! Your model will come to your shop around 11am on day ${e.day}. Style her like your life depends on it 😉`, { chat: m.chat || m.from });
  return s;
}

const OCC_FOR: Record<string, Customer['occasion']> = { 'Owambe Queen Challenge': 'owambe', 'Pop-up Style-off': 'party', 'Bridal Look Battle': 'wedding', 'Gen Z Style Battle': 'birthday', 'Lagos Fashion Week': 'redCarpet' };

/** On the day of an accepted show, the model arrives at 11am. */
export function contestModel(s: GameState): { at: number; c: Customer } | null {
  const e = (s.events || []).find((x) => x.status === 'accepted' && x.day === s.day);
  if (!e) return null;
  const r = rivalById(s, e.rivalId);
  if (!r) return null;
  let look: CharacterConfig = generateRandomCustomer('plain');
  for (let i = 0; i < 30 && look.body === 'male'; i++) look = generateRandomCustomer('plain');
  const rivalScore = Math.round(clamp(50 + r.skill * 22 + rand(-8, 8) + (r.tier - s.tier) * 1.5, 45, 96));
  const c: Customer = {
    id: `model-${e.id}`,
    name: pick(['Kiki', 'Nneka', 'Tiwa', 'Halima', 'Bimbo', 'Ada']),
    // the model is dressed from your own rails, so she matches your shop's level
    cls: s.tier >= 2 ? 'rich' : s.tier === 1 ? 'middle' : 'poor',
    occasion: OCC_FOR[e.title] || 'party',
    budget: 0,
    wants: [],
    taste: { favColor: '#C2262E', favName: 'red' },
    request: `I'm your model for the ${e.title}. ${r.owner} is styling the other model right now. The theme is "${OCC_FOR[e.title] === 'wedding' ? 'bridal' : OCC_FOR[e.title] === 'redCarpet' ? 'red carpet' : OCC_FOR[e.title]}". Make me win!`,
    look: { ...look, state: 'plain' },
    male: false,
    influencer: true,
    contest: { eventId: e.id, rivalId: r.id, rivalScore, prize: e.prize, title: e.title },
  };
  return { at: 180, c };
}

/** The judges decide. Called when Divine finishes the model's look. */
export function judge(s0: GameState, c: Customer, score: number): GameState {
  let s = s0;
  const k = c.contest!;
  const e = (s.events || []).find((x) => x.id === k.eventId);
  const r = rivalById(s, k.rivalId);
  const won = score > k.rivalScore;
  s = { ...s, events: (s.events || []).map((x) => (x.id === k.eventId ? { ...x, status: won ? ('won' as const) : ('lost' as const) } : x)) };
  if (won) {
    s = { ...s, cash: s.cash + k.prize, rep: clamp(s.rep + 3, 0, 100), followers: (s.followers || 0) + (e?.followers || 100), ledger: [{ day: s.day, t: Math.floor(s.clock), label: `${k.title} prize`, amount: k.prize }, ...(s.ledger || [])].slice(0, 150) };
    s = gist(s, `Divine beats ${r?.owner || 'her rival'} at the ${k.title}!`, `The judges scored Asanwa Boutique ${score} to ${k.rivalScore}. ${r?.owner.split(' ')[0]} left without taking pictures 👀`, 'you', true);
    if (r) {
      s = startConvo(s, { with: r.owner, rivalId: r.id, chat: GROUP, topic: 'lostShow', opener: pick(['The judges were paid. Everybody knows 🙄', 'Congrats I guess. Next time.', 'Hmm. Enjoy it while it lasts 😏', 'My model\'s shoes were wrong size, that\'s the only reason 😤', 'Beginner\'s luck. Let\'s see next month.']) });
      s = feel(s, r.id, -12);
    }
    s = say(s, 'Deborah', `SISSSS YOU WON!!! ₦${k.prize.toLocaleString('en-NG')}! 🎉🎉 I'm screaming!`, { tone: 'good' });
  } else {
    s = { ...s, rep: clamp(s.rep - 1, 0, 100) };
    s = gist(s, `${r?.shop || 'Rival'} wins the ${k.title}`, `${r?.owner} scored ${k.rivalScore}; Divine scored ${score}. Close one!`, r?.id);
    if (r) {
      s = startConvo(s, { with: r.owner, rivalId: r.id, chat: GROUP, topic: 'wonShow', opener: pick([`Thank you judges 🙏🏾 Better luck next time Divine 😘`, `Na so. Experience matters 😌`, `I told una 😂😂`, `Trophy number ${2 + Math.floor(Math.random() * 6)} 🏆 Divine, you tried sha`, `Some people need more practice before entering competitions 😌`]) });
      s = feel(s, r.id, 4);
    }
  }
  return s;
}

// ---------------------------------------------------------------------------
// Limited drops at Yaba market
// ---------------------------------------------------------------------------
const DROP_NAMES = ['viral "Ileke" Ankara print', 'Swiss voile lace (limited)', 'champagne sequin batch', 'adire "Ocean" batch', 'Instagram-famous corset gown', 'gold beaded lace'];

export function planDrop(s: GameState): GameState {
  if (s.day < 3 || !chance(0.3)) return { ...s, drop: null };
  const opts = MARKET.filter((e) => isClothing(e.kind) && e.for !== 'm' && canBuy(e, s.tier) && e.price <= [6_000, 15_000, 40_000, 80_000, 150_000][s.tier]);
  if (!opts.length) return { ...s, drop: null };
  const e = pick(opts);
  const name = pick(DROP_NAMES);
  const fabric = name.includes('lace') ? 'lace' : name.includes('sequin') ? 'sequin' : name.includes('adire') ? 'adire' : name.includes('Ankara') ? 'ankara' : e.fabric || 'plain';
  const c = pick(NAMED_COLOURS);
  const total = Math.round(rand(6, 12));
  const drop: Drop = { day: s.day, kind: e.kind, itemId: e.id, label: `${e.label}: ${name}`, fabric, color: c.color, color2: pick(NAMED_COLOURS).color, pattern: Math.floor(rand(0, 10)), price: Math.round((pieceCost(e, fabric) * 1.6) / 100) * 100, left: total, total, buyers: [] };
  return say({ ...s, drop }, 'Yaba Mart', `🔥 HOT DROP: ${drop.label}. Only ${total} pieces in all of Yaba. Looks with it score higher for a week. Other boutiques are already asking…`, { tone: 'warn' });
}

/** Rivals snap up drop pieces through the day. */
export function dropStep(s0: GameState, minutes: number): GameState {
  let s = s0;
  const d = s.drop;
  if (!d || d.day !== s.day || d.left <= 0) return s;
  if (!chance(0.012 * minutes)) return s;
  const r = pick(s.rivals.filter((x) => Math.abs(x.tier - s.tier) <= 1) .concat(mainRivals(s)));
  const n = Math.min(d.left, Math.round(rand(1, 3)));
  const left = d.left - n;
  s = { ...s, drop: { ...d, left, buyers: d.buyers.includes(r.id) ? d.buyers : [...d.buyers, r.id] } };
  if (r.main && !d.buyers.includes(r.id)) s = say(s, r.owner, pick([`Just copped the ${d.label} 😌 Don't ask me where.`, `Me and my ${d.label} 💅🏾 who else got it?`, `Got ${n} of the new drop. Sorry o, early bird 🐦`]), { chat: GROUP });
  if (left <= 0) s = say(s, 'Yaba Mart', `The ${d.label} is SOLD OUT. ${r.shop} took the last ${n}.`, { tone: 'warn' });
  return s;
}

export function buyDrop(s: GameState, pieces: number): GameState {
  const d = s.drop;
  if (!d || d.day !== s.day || d.left < pieces || pieces <= 0) return s;
  const cost = d.price * pieces;
  if (s.cash < cost) return s;
  const e = MARKET.find((x) => x.kind === d.kind && x.id === d.itemId);
  if (!e) return s;
  const design: Design = { ...makeDesign(e, { fabric: d.fabric, color: d.color, color2: d.color2, pattern: d.pattern, pieces }), label: `${e.label} (trending)`, cost: d.price, trend: s.day + 7 };
  const shown = s.stock.filter((x) => x.displayed).length;
  const room = shopStats(s.furniture, s.tier, s.listing.stars).display;
  return {
    ...s,
    cash: s.cash - cost,
    stock: [...s.stock, { ...design, displayed: shown < room }],
    drop: { ...d, left: d.left - pieces, buyers: [...d.buyers, 'you'] },
    ledger: [{ day: s.day, t: s.phase === 'shop' ? Math.floor(s.clock) : -1, label: `Hot drop: ${d.label} ×${pieces}`, amount: -cost }, ...(s.ledger || [])].slice(0, 150),
  };
}

// ---------------------------------------------------------------------------
// Rivals walking into Divine's shop
// ---------------------------------------------------------------------------
const VISIT_LINES = {
  queen: ['Divine! I was passing and thought I should see what all the noise is about 😌', "Cute little place. Reminds me of where I started… ten years ago."],
  loud: ["Ehen! So this is the famous Asanwa Boutique? 😂 Where's the AC?", 'I just came to look o. Is this rail from Ladipo?'],
  oldschool: ['My daughter, I came to see your aso-oke. Is it the real one?', 'Good afternoon. I hear you have been taking my customers.'],
  shady: ['Hiii 👋🏾 just checking prices for a friend', "Wow, you sell this one for that much? Mine is half price o."],
  sweet: ['Sis! I brought you chin-chin 🥰 Your shop is so cute!', 'I was nearby so I said let me greet you ❤️'],
  pro: ['Good afternoon. Lovely shop.'],
};
const POACH = (name: string) => [`(whispering to ${name}) Come to my shop, I'll do it cheaper.`, `${name}, you're still waiting? Come with me, my shop is just down the road.`];

export const VISIT_CHOICES = [
  { id: 'welcome', label: 'Welcome her, offer a drink' },
  { id: 'out', label: 'Politely show her out' },
  { id: 'clap', label: 'Clap back' },
] as const;
export type VisitChoice = (typeof VISIT_CHOICES)[number]['id'];

export function visitStep(s0: GameState, minutes: number): GameState {
  let s = s0;
  if (s.phase !== 'shop') return s;
  if (s.visit) {
    // ignored too long: she leaves, and takes the customer she was talking to
    if (s.clock - s.visit.at > 40) s = endVisit(s, true);
    return s;
  }
  if (s.day < 2 || s.clock > 680 || !chance(0.0032 * minutes)) return s;
  const pool = mainRivals(s).filter((r) => r.id !== 'tolani' || chance(0.45));
  if (!pool.length) return s;
  const r = pick(pool);
  const waitingNow = s.inShop.filter((v) => !v.by).sort((a, b) => (b.waited || 0) - (a.waited || 0));
  const target = waitingNow.length && chance(Math.min(0.92, 0.52 + r.aggression * 0.45)) ? pick(waitingNow.slice(0, Math.min(4, waitingNow.length))).c : undefined;
  const line = target ? pick(POACH(target.name)) : pick(VISIT_LINES[r.personality]);
  return { ...s, visit: { rivalId: r.id, at: s.clock, target: target?.id, line } };
}

function endVisit(s0: GameState, steal: boolean): GameState {
  let s = s0;
  const v = s.visit;
  if (!v) return s;
  const r = rivalById(s, v.rivalId);
  if (steal && v.target) {
    const t = s.inShop.find((x) => x.c.id === v.target && !x.by);
    if (t && r) {
      s = { ...s, inShop: s.inShop.filter((x) => x.c.id !== v.target), left: [...s.left, { key: `${t.c.id}-stolen`, id: t.c.id, look: t.c.look, bag: false }].slice(-10), today: { ...s.today, lost: s.today.lost + 1 } };
      s = startConvo(s, { with: r.owner, rivalId: r.id, chat: GROUP, topic: 'stole', opener: pick([`Thanks for the customer o 😂 ${t.c.name} said my shop is nicer.`, `${t.c.name} just paid me in full. Divine, abeg send more 😂`, `Your customer was waiting so long, I had to rescue her 🚑😂`]) });
    }
  }
  return { ...s, visit: null };
}

export function answerVisit(s0: GameState, choice: VisitChoice): GameState {
  let s = s0;
  const v = s.visit;
  if (!v) return s;
  const r = rivalById(s, v.rivalId);
  if (!r) return { ...s, visit: null };
  if (choice === 'welcome') {
    s = feel(s, r.id, 8);
    s = say(s, r.owner, r.personality === 'sweet' ? 'Thanks for the drink sis 🥰' : 'Thanks for the drink. Nice shop… for now 😌', {});
    return endVisit(s, !!v.target && chance(0.4));
  }
  if (choice === 'out') {
    s = feel(s, r.id, -10);
    s = { ...s, rep: clamp(s.rep - 0.3, 0, 100) };
    return endVisit(s, false);
  }
  // clap back in front of the customers
  s = feel(s, r.id, -20);
  if (chance(0.55)) {
    s = { ...s, followers: (s.followers || 0) + Math.round(rand(40, 160)), rep: clamp(s.rep + 0.5, 0, 100) };
    s = gist(s, `${r.owner} storms out of Asanwa Boutique 😂`, `Customers say Divine "finished her" with one sentence. The video is everywhere.`, 'you', true);
  } else {
    s = { ...s, rep: clamp(s.rep - 1.5, 0, 100) };
    s = gist(s, `Shouting match at Asanwa Boutique`, `${r.owner} and Divine argued in front of customers. Not a good look for either of them.`, 'you');
  }
  return endVisit(s, false);
}

// ---------------------------------------------------------------------------
// Divine looking round a rival's shop
// ---------------------------------------------------------------------------
/** A pretend game state so the shop scene can show a rival's shop. */
export function rivalShop(s: GameState, r: Rival): GameState {
  const listing: Listing = { id: `rv-${r.id}`, tier: r.tier, area: r.area, street: r.shop, stars: r.stars, rent: 0, moveIn: 0, landlord: '', grace: 0 };
  // furnished in zones to match what they sell; rearranged every few weeks
  const seed = hash(r.id);
  const furniture = zonedLayout(r, listing, s.day);
  const stock: Design[] = Array.from({ length: 40 }, (_, i) => ({ uid: `rv${i}`, kind: 'dress', itemId: 'bubu', label: '', fabric: 'plain', color: NAMED_COLOURS[(seed + i * 3) % NAMED_COLOURS.length].color, color2: '#fff', pattern: 0, cost: 0, pieces: 1, displayed: true }));
  return { ...s, tier: r.tier, listing, furniture, stock, staff: [], phase: 'morning', inShop: [], left: [], divine: r.look, outages: [], shouts: [], off: {}, busy: null, energy: 100, power: { gen: false, solar: 9999, fuel: 10 } };
}

export function noteVisit(s0: GameState, r: Rival): GameState {
  let s = s0;
  if (r.id !== 'tolani') return s;
  s = { ...s, spying: (s.spying || 0) + 1 };
  if (s.spying === 2) s = say(s, 'Deborah', "Sis, Tolani said she saw you looking round her shop 👀 Don't worry, I told her you were buying a gift.", {});
  if (s.spying === 4) s = say(s, 'Deborah', "Tolani is asking why you keep coming to her shop. Abeg reduce it, she's suspicious now.", { tone: 'warn' });
  return s;
}

// ---------------------------------------------------------------------------
// Fighting over a shop listing
// ---------------------------------------------------------------------------
export function contestFor(s: GameState, l: Listing): { rival: Rival; extra: number } | null {
  if (l.tier === 0 || hash(l.id) % 4 !== 1) return null;
  const pool = (s.rivals || []).filter((r) => r.tier === l.tier - 1 || r.tier === l.tier);
  if (!pool.length) return null;
  const rival = pool[hash(l.id) % pool.length];
  return { rival, extra: Math.round((l.moveIn * 0.15) / 5_000) * 5_000 };
}

export function wonListing(s0: GameState, l: Listing): GameState {
  const c = contestFor(s0, l);
  if (!c) return s0;
  let s = feel(s0, c.rival.id, -20);
  s = startConvo(s, { with: c.rival.owner, rivalId: c.rival.id, chat: GROUP, topic: 'snatch', opener: pick([`Who took ${l.street}??? I had already paid deposit 😤`, `Some people will outbid you for a shop they can't even fill 🙄`, `${l.street} landlord is a thief. Took the highest offer.`]) });
  return gist(s, `Divine snatches ${l.street} from ${c.rival.owner}!`, `The landlord took Divine's higher offer. ${c.rival.owner.split(' ')[0]} is NOT happy.`, 'you', true);
}

// ---------------------------------------------------------------------------
// Deborah's tips (she gets them from Tolani)
// ---------------------------------------------------------------------------
export function planTips(s0: GameState): GameState {
  let s = s0;
  if (s.day < 5 || s.celebDay && s.celebDay >= s.day) return s;
  if (!chance(0.06)) return s;
  const day = s.day + 2;
  s = { ...s, celebDay: day };
  return say(s, 'Deborah', pick([`Gist: Tolani said a celebrity is coming to ${s.listing.area} on day ${day} to shop for an event. Make sure your best pieces are out 👀`, `Sis, I heard from Tolani that a Nollywood actress is shopping around ${s.listing.area} on day ${day}. Be ready!`]), { tone: 'good' });
}
