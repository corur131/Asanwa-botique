// Gidigram giveaways. Divine puts one piece from stock up as a prize; for two days people
// follow, like and tag friends to enter. Then she scrolls a shortlist of entrants and picks
// the winner herself. Who she picks matters: an influencer brings a crowd, a loyal regular
// brings love, a fake account brings backlash, and Deborah's friend looks rigged.
import { MARKUP } from './economy';
import { gramNote } from './gram';
import { giveawayChatter, rivalLosesFan } from './rivals';
import type { Design, EntrantKind, GameState, Giveaway, GiveawayEntrant } from './types';

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const int = (a: number, b: number) => Math.floor(rand(a, b + 1));
const k = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}k` : `${v}`);

export const GIVEAWAY_GAP = 14;
export const GIVEAWAY_DAYS = 2;
export const GIVEAWAY_MIN_FOLLOWERS = 300;

/** Filters on the entrant list. */
export const ENTRANT_FILTERS: { id: string; label: string; kinds?: EntrantKind[] }[] = [
  { id: 'all', label: 'All' },
  { id: 'regulars', label: 'Regulars', kinds: ['regular'] },
  { id: 'influencers', label: 'Influencers', kinds: ['influencer'] },
  { id: 'new', label: 'New accounts', kinds: ['fan', 'fake'] },
  { id: 'big', label: 'Big spenders', kinds: ['bigSpender'] },
];

const prizeValue = (d: Design) => Math.round((d.cost * MARKUP) / 500) * 500;
/** Giveaways in the last 60 days: each one makes the next a little less exciting. */
const recentGiveaways = (s: GameState) => (s.giveawayDays || []).filter((d) => d >= s.day - 60).length;
export const nextGiveawayDay = (s: GameState) => Math.max(s.day, (s.giveawayDays?.length ? Math.max(...s.giveawayDays) : -99) + GIVEAWAY_GAP);

export function canStartGiveaway(s: GameState): { ok: boolean; reason?: string } {
  if (s.giveaway && s.giveaway.status !== 'done') return { ok: false, reason: 'A giveaway is already running.' };
  if ((s.followers || 0) < GIVEAWAY_MIN_FOLLOWERS) return { ok: false, reason: `Reach ${GIVEAWAY_MIN_FOLLOWERS} followers first: nobody enters a giveaway from a tiny page.` };
  const next = nextGiveawayDay(s);
  if (next > s.day) return { ok: false, reason: `One giveaway every two weeks. The next one can start on day ${next}.` };
  return { ok: true };
}

/** Pieces that could be the prize. */
export const prizeOptions = (s: GameState) => s.stock.filter((d) => d.pieces > 0).sort((a, b) => b.cost - a.cost);

/** How many people would enter for this prize, roughly. */
export function expectedEntries(s: GameState, d: Design): number {
  const valueFactor = 0.8 + Math.min(0.7, prizeValue(d) / 80_000);
  const fatigue = 1 / (1 + 0.4 * recentGiveaways(s));
  return Math.round((60 + (s.followers || 0) * 0.28) * valueFactor * fatigue);
}

export function startGiveaway(s0: GameState, itemUid: string): GameState {
  const d = s0.stock.find((x) => x.uid === itemUid && x.pieces > 0);
  if (!d || !canStartGiveaway(s0).ok) return s0;
  const entries = Math.max(20, Math.round(expectedEntries(s0, d) * rand(0.85, 1.15)));
  const g: Giveaway = {
    id: `ga${s0.day}`, start: s0.day, end: s0.day + GIVEAWAY_DAYS, itemUid, label: d.label, color: d.color, value: prizeValue(d),
    entries, gain: Math.round(entries * rand(0.1, 0.16)), status: 'live',
  };
  // The prize is set aside from stock straight away.
  let s: GameState = {
    ...s0,
    stock: s0.stock.map((x) => (x.uid === d.uid ? { ...x, pieces: x.pieces - 1 } : x)),
    giveaway: g,
    giveawayDays: [...(s0.giveawayDays || []), s0.day].slice(-12),
    buzz: { until: g.end, mult: 1.05, why: 'giveaway' },
  };
  s = gramNote(s, `🎁 GIVEAWAY is live: win our ${d.label}! Follow, like and tag 3 friends. Entries close in ${GIVEAWAY_DAYS} days.`, 'like');
  return s;
}

/** Each evening while it runs: entries and new followers roll in. */
export function giveawayAtClose(s: GameState): GameState {
  const g = s.giveaway;
  if (!g || g.status !== 'live' || s.day >= g.end) return s;
  const half = Math.round(g.gain / GIVEAWAY_DAYS);
  return gramNote({ ...s, followers: (s.followers || 0) + half }, `Your giveaway is buzzing: ${Math.round(g.entries * (s.day - g.start + 1) / GIVEAWAY_DAYS)?.toLocaleString('en-NG')} entries so far, +${half} followers today.`, 'follow');
}

// ----- the entrants -----------------------------------------------------------
const FIRST = ['Adaeze', 'Funmi', 'Kemi', 'Ngozi', 'Halima', 'Tola', 'Bisi', 'Zainab', 'Ifeoma', 'Temi', 'Chiamaka', 'Yetunde', 'Ese', 'Uche', 'Bukola', 'Damilola', 'Amaka', 'Simi', 'Precious', 'Blessing', 'Fatima', 'Ruth', 'Toyin', 'Nneka', 'Mariam', 'Ivie', 'Obinna', 'Tunde', 'Seun', 'Kunle'];
const handleFor = (name: string) => `${name.toLowerCase()}${pick(['_xo', '.styles', '_ng', '01', '_lagos', '.k', '_official', 'xx', '_luxe', '.diaries', '_'])}`;

const COMMENTS: Record<EntrantKind, string[]> = {
  influencer: ['Would love to style this for my followers 💅🏾 Count me in!', 'Okay this is giving! If I win, full review on my page 😍', 'Tagged my girls 💕 This piece needs to be on my feed', 'Entered! My audience will love this brand ✨'],
  regular: ['I have bought from you since the beginning, this shop is my second home ❤️', 'Divine styled me for my sister\'s wedding and everybody asked 😍 Please let me win', 'My favourite boutique in Lagos!! Done all the steps 🙏🏾', 'Loyal customer reporting 🫡 I need this one'],
  fan: ['I have been watching your page from far, this would be my first designer piece 🥹', 'I can\'t afford your shop yet but I love everything you post 💕', 'First time entering any giveaway. God abeg 🙏🏾', 'Your work inspires me. Followed, liked, tagged 3 🤍'],
  student: ['Final year student here, I need this for my dinner night 😭🙏🏾', 'Tagged my roommates! If I win, the whole hostel will hear 😂', 'Student budget no fit this one. Please let me win 🙏🏾', 'Convocation outfit sorted if I win this 🎓'],
  bigSpender: ['My mum would love this for her birthday party 😍', 'If I win, my whole family will come and shop with you 💯', 'Lovely piece. My aunty buys asoebi for 50 people every year 👀', 'Entered! We have a big owambe next month'],
  rivalFan: ['I usually buy from another shop but this one sweet me 😍', 'Okay I might be switching boutiques 👀', 'Don\'t tell my usual stylist I entered this 🙈', 'Your finishing is cleaner than where I normally go o'],
  fake: ['Done ✅✅ tagged 3 🙏🏾 #giveaway #win', 'Me me me 🙌🏾🙌🏾 I win everything 😂', 'Done. Also I sell wholesale, DM me 📦', 'Pick me!! Follow back 🔁', 'Done ✅ check my page for cheap bags 👜'],
  friend: ['Deborah\'s babe here 😘 Na me go win am', 'Sis!! You know I love you 😂 Pick me abeg', 'Tell Deborah I entered o 🙈', 'We dey together since! I deserve this one 😘'],
};

function entrant(s: GameState, kind: EntrantKind, i: number): GiveawayEntrant {
  const name = pick(FIRST);
  const base = { id: `e${i}-${Math.random().toString(36).slice(2, 6)}`, name, handle: handleFor(name), kind, comment: pick(COMMENTS[kind]) };
  switch (kind) {
    case 'influencer': {
      const f = Math.round(Math.exp(rand(Math.log(5_000), Math.log(200_000))) / 100) * 100;
      return { ...base, followers: f, posts: int(300, 1800), tag: `Influencer · ${k(f)} followers` };
    }
    case 'regular': {
      const r = s.regulars.length ? pick(s.regulars) : undefined;
      const visits = r?.visits ?? int(3, 12);
      return { ...base, ...(r ? { name: r.name.split(' ')[0], handle: handleFor(r.name.split(' ')[0]), regularId: r.id } : {}), followers: int(200, 2_000), posts: int(40, 400), tag: `Regular customer · ${visits} visits` };
    }
    case 'fan': {
      const posts = int(5, 60);
      return { ...base, followers: int(30, 600), posts, tag: `New follower · ${posts} post${posts === 1 ? '' : 's'}` };
    }
    case 'student':
      return { ...base, followers: int(150, 1_500), posts: int(20, 300), tag: `Student · ${pick(['UNILAG', 'LASU', 'YabaTech', 'Covenant', 'Pan-Atlantic', 'Babcock'])}` };
    case 'bigSpender':
      return { ...base, followers: int(500, 5_000), posts: int(50, 500), tag: `${pick(['Daughter', 'Niece', 'Son'])} of ${pick(['Chief Mrs Adeyemi', 'Alhaja Bello', 'Dr. (Mrs) Okafor', 'Mama Tobi of Balogun', 'Senator Danjuma\'s wife'])}` };
    case 'rivalFan': {
      const mains = (s.rivals || []).filter((r) => r.main);
      const r = mains.length ? pick(mains) : undefined;
      return { ...base, rivalId: r?.id, followers: int(200, 3_000), posts: int(30, 500), tag: r ? `Follows ${r.handle} · tags ${r.shop} a lot` : 'Shops around Lagos' };
    }
    case 'fake': {
      const posts = int(0, 3);
      const f = int(0, 80);
      return { ...base, handle: `${pick(['giveaway_queen', 'win.it.all', 'luxury_deals', 'promo_babe', 'bag_plug', 'freebies'])}_${int(100, 9999)}`, followers: f, posts, tag: `New account · ${posts} post${posts === 1 ? '' : 's'} · ${f} follower${f === 1 ? '' : 's'}` };
    }
    case 'friend':
      return { ...base, followers: int(300, 2_500), posts: int(50, 600), tag: `Followed by deborah.d and ${int(3, 14)} others you know` };
  }
}

/** The shortlist: 28 to 40 entrants of every kind, shuffled. */
export function shortlist(s: GameState): GiveawayEntrant[] {
  const mains = (s.rivals || []).filter((r) => r.main).length;
  const counts: [EntrantKind, number][] = [
    ['influencer', int(3, 5)], ['regular', int(4, 6)], ['fan', int(6, 9)], ['student', int(4, 6)],
    ['bigSpender', int(2, 3)], ['rivalFan', mains ? int(2, 3) : 0], ['fake', int(4, 6)], ['friend', int(1, 2)],
  ];
  const out: GiveawayEntrant[] = [];
  for (const [kind, n] of counts) for (let i = 0; i < n; i++) out.push(entrant(s, kind, out.length));
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/** Morning: entries close and the shortlist is ready to pick from. */
export function closeGiveawayEntries(s: GameState): GameState {
  const g = s.giveaway;
  if (!g || g.status !== 'live' || s.day < g.end) return s;
  return gramNote({ ...s, giveaway: { ...g, status: 'pick', entrants: shortlist(s) } }, `🎁 Giveaway closed with ${g.entries?.toLocaleString('en-NG')} entries! Open Gidigram and pick your winner.`, 'like');
}

export const awaitingWinner = (s: GameState) => s.giveaway?.status === 'pick';

/** Divine picks the winner. What happens next depends on who she picked. */
export function pickWinner(s0: GameState, entrantId: string): GameState {
  const g = s0.giveaway;
  const w = g?.entrants?.find((e) => e.id === entrantId);
  if (!g || g.status !== 'pick' || !w) return s0;
  let s = s0;
  const fans = s.followers || 0;
  const addFans = (n: number) => { s = { ...s, followers: Math.max(0, (s.followers || 0) + Math.round(n)) }; };
  const addRep = (n: number) => { s = { ...s, rep: Math.max(0, Math.min(100, s.rep + n)) }; };
  const buzz = (mult: number, days: number, why: string) => { s = { ...s, buzz: { until: s.day + days, mult, why } }; };
  let outcome = '';
  switch (w.kind) {
    case 'influencer': {
      // Her fans come across, but a small page can only absorb so many at once.
      const gained = Math.round(Math.min(w.followers * rand(0.02, 0.05), fans * 0.35 + 200)) + 50;
      addFans(gained); addRep(1); buzz(1.12, 3, 'influencer');
      s = giveawayChatter(s, ['Divine is now doing influencer marketing 😂 Okay o', 'Hmm, nice move 👀', 'Who even is that influencer? 🙄'], 0.4, { title: `@${w.handle} wins Asanwa Boutique giveaway, shows it off to ${k(w.followers)} fans 🔥`, body: `The influencer posted an unboxing of her ${g.label}. Her followers are flooding Divine's page.` });
      outcome = `@${w.handle} posted the ${g.label} to her ${k(w.followers)} followers. +${gained} followers, and more walk-ins for 3 days.`;
      break;
    }
    case 'regular': {
      addRep(1.5); addFans(rand(20, 60)); buzz(1.05, 2, 'regular');
      if (w.regularId) s = { ...s, regulars: s.regulars.map((r) => (r.id === w.regularId ? { ...r, loyalty: r.loyalty + 2 } : r)) };
      s = gramNote(s, `@${w.handle}: "I have never won anything in my life 😭 Asanwa Boutique, I'm yours forever ❤️ Bringing my sister on Saturday!" ⭐⭐⭐⭐⭐`, 'mention');
      outcome = `${w.name} is over the moon. She'll spend more, bring a friend, and her review is glowing.`;
      break;
    }
    case 'fan': {
      const gained = rand(30, 120);
      addRep(2); addFans(gained);
      s = gramNote(s, `Your comments are full of love: "This is why I follow this page 🥹 A real person won!" Community love ❤️`, 'comment');
      outcome = `A first-time fan won and cried on her story. People loved it: reputation up and +${Math.round(gained)} followers.`;
      break;
    }
    case 'student': {
      const gained = rand(60, 200);
      addFans(gained); addRep(0.5); buzz(1.07, 2, 'student');
      outcome = `${w.name} told her whole campus. +${Math.round(gained)} followers, and her coursemates are coming to look around.`;
      break;
    }
    case 'bigSpender': {
      addFans(rand(20, 80));
      s = { ...s, vipGuestDay: s.phase === 'morning' ? s.day : s.day + 1 };
      outcome = `${w.name}'s mum saw the post. A rich client from the family is coming in ${s.vipGuestDay === s.day ? 'today' : 'tomorrow'}.`;
      break;
    }
    case 'rivalFan': {
      const r = (s.rivals || []).find((x) => x.id === w.rivalId);
      const moved = Math.round(Math.min((r?.followers || 0) * 0.01, rand(80, 300)));
      addFans(moved);
      if (r) {
        s = rivalLosesFan(s, r.id, moved);
        s = giveawayChatter(s, ['Divine is now poaching customers with free clothes 😤', 'Na wa o. Giveaway to steal people\'s customers? 🙄', 'Some of us build loyalty, some of us buy it 💅🏾'], 0.3, { title: `${r.shop}'s loyal customer switches to Asanwa Boutique 👀`, body: `A well-known ${r.shop} regular won Divine's giveaway and says she's "never going back". Group chat is on fire.`, hot: true }, r.id);
      }
      outcome = `${w.name} has switched to you${r ? ` from ${r.shop}` : ''}: +${moved} followers came with her. ${r ? `${r.owner} is NOT happy.` : ''}`;
      break;
    }
    case 'fake': {
      const lost = Math.round(fans * rand(0.02, 0.04));
      addFans(-lost); addRep(-2);
      s = gramNote(s, `Comments: "Na fake account win?? 😂 Scam giveaway" · "That account sells bags, check am 👀" · "Unfollowing" (-${lost} followers)`, 'comment');
      s = giveawayChatter(s, ['Divine\'s giveaway winner is a reseller 😂😂', 'Scam giveaway alert 🚨', 'Check the winner\'s page before you announce o 😂'], 0.5);
      outcome = `The winner was a fake reseller account. Your followers noticed: -${lost} followers and your reputation took a knock.`;
      break;
    }
    case 'friend': {
      const lost = Math.round(fans * rand(0.03, 0.05));
      addFans(-lost); addRep(-3);
      s = giveawayChatter(s, ['Rigged!! 😂 Her friend won', 'Family and friends giveaway 💀', 'Next time just give it to Deborah directly 😂'], 0.6, { title: 'Rigged? Asanwa Boutique giveaway winner is Deborah\'s close friend 👀', body: 'Followers spotted that the winner is close to Divine\'s best friend. "Na family giveaway," one commenter wrote.', hot: true });
      outcome = `People found out the winner is Deborah's friend. Rigging accusations everywhere: -${lost} followers and reputation down.`;
      break;
    }
  }
  return { ...s, giveaway: { ...g, status: 'done', winner: w, entrants: undefined, outcome } };
}
