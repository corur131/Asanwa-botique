/**
 * Gidigram: Lagos's Instagram. Divine, her rivals and @LagosFashionDaily post here.
 * - Wins (celebrities, rich clients, contracts, upgrades, style-offs, new collections)
 *   become brag posts Divine can share, which grow followers and stir up rivals.
 * - Rivals post their work and brag about their own wins.
 * - @LagosFashionDaily (replacing GistLagos) posts the day's industry news.
 * - A weekly trending colour and hashtags drive what people talk about.
 */
import { WANTED_COLOURS } from './colours';
import { TIERS } from './economy';
import { startConvo } from './convos';
import type { BragEvent, GameState, GramNote, Gist } from './types';

export const BLOG_HANDLE = 'lagosfashiondaily';
export const BLOG_NAME = 'Lagos Fashion Daily';
const GROUP = 'Lagos Fashion Babes';

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const chance = (p: number) => Math.random() < p;
const uid = (p: string, s: GameState) => `${p}${s.day}-${Math.random().toString(36).slice(2, 7)}`;

export function gramNote(s: GameState, text: string, kind: GramNote['kind'] = 'news'): GameState {
  const n: GramNote = { id: uid('n', s), day: s.day, text, kind };
  return { ...s, gramNotes: [n, ...(s.gramNotes || [])].slice(0, 120) };
}

/** A news post on @LagosFashionDaily. */
export function blogPost(s: GameState, title: string, body: string, about?: string, hot = false): GameState {
  const g: Gist = { id: uid('g', s), day: s.day, title, body, about, hot };
  return { ...s, gist: [g, ...(s.gist || [])].slice(0, 60) };
}

/** Record a win Divine can brag about (one of each kind per day). */
export function addBrag(s: GameState, kind: BragEvent['kind'], title: string, detail: string, weight: number): GameState {
  if ((s.brags || []).some((b) => b.kind === kind && b.day === s.day)) return s;
  const b: BragEvent = { id: uid('b', s), day: s.day, kind, title, detail, weight };
  return { ...s, brags: [b, ...(s.brags || [])].slice(0, 30) };
}

/** Wins from the last week that have not been shared yet. */
export const openBrags = (s: GameState) => (s.brags || []).filter((b) => !b.posted && b.day >= s.day - 7);

const CAPTIONS: Record<BragEvent['kind'], [string, string, string]> = {
  celebrity: ['Grateful for the trust 🙏🏾 Styled a very special client today ✨ #CelebrityStyle', 'When celebrities need a look, they know where to come 😌✨ #AsanwaBoutique', 'Pinch me 😭✨ A celebrity in OUR shop. Thank you Lagos! #CelebrityStyle'],
  richClient: ['Luxury client, luxury look ✨ #LagosLuxury', 'Big madam, big look, big tip 😌💸 #AsanwaBoutique', 'When the client says "spare no expense" 👑 #LagosLuxury'],
  contract: ['Official supplier, signed and delivered 📦🇳🇬 Thank you for trusting us', 'Government contract? Delivered on time 😌 #AsanwaBoutique', 'From a small shop in Yaba to official contracts. God did 🙏🏾'],
  upgrade: ['New shop, new chapter 🔑✨ Come and see us', 'We moved UP 😌🔑 The new shop is everything', 'From the container to this. Thank you for every customer 🙏🏾🔑'],
  styleOff: ['Style-off champions 🏆 The judges have spoken', 'Another trophy for the shelf 😌🏆 #StyleOff', 'Grateful for the win 🏆 Respect to every stylist that competed'],
  top20: ['We climbed the Top 20 this week 📈 Thank you Lagos!', 'Top 20 update: we\'re coming for number 1 😌📈', 'Moving up the Top 20 🙏🏾 Your support did this'],
  collection: ['New collection just landed 🛍✨ Come and shop before it\'s gone', 'Fresh stock, fresh colours 🔥 Shop is full of new pieces', 'Restocked and ready 😌 The new pieces are FIRE 🔥'],
};
export const bragCaptions = (b: BragEvent) => CAPTIONS[b.kind];

const JEALOUS_OPENERS: Record<BragEvent['kind'], string[]> = {
  celebrity: ['Celebrity this, celebrity that 🙄 Who paid who?', 'One celebrity and suddenly everybody is a stylist 😂'],
  richClient: ['Big madam bought one gown and Divine is posting like Dangote 😂'],
  contract: ['Government contract? Who is her uncle in the ministry? 🤔'],
  upgrade: ['Let us see how long she will last in that new shop 🙃', 'Rent there is not small o. Wish her luck 🙃'],
  styleOff: ['The judges were paid. Everybody knows 🙄'],
  top20: ['Top 20 is just numbers. Real customers know 😏'],
  collection: ['New collection? Same old styles with new filter 😂'],
};

/** Divine shares a win on Gidigram. */
export function postBrag(s0: GameState, bragId: string, captionIndex: number): GameState {
  const b = (s0.brags || []).find((x) => x.id === bragId && !x.posted);
  if (!b) return s0;
  const caption = bragCaptions(b)[Math.max(0, Math.min(2, captionIndex))];
  const fans = s0.followers || 0;
  const gained = Math.max(10, Math.round((25 + fans * 0.004) * b.weight * (0.75 + Math.random() * 0.5)));
  const likes = Math.round((fans + gained) * (0.05 + b.weight * 0.025) * (0.8 + Math.random() * 0.4));
  const post = { id: uid('p', s0), day: s0.day, look: s0.divine, name: 'divine.styles', caption, score: 0, likes, gained, kind: 'brag' as const, title: b.title };
  let s: GameState = {
    ...s0,
    followers: fans + gained,
    posts: [post, ...(s0.posts || [])].slice(0, 30),
    brags: (s0.brags || []).map((x) => (x.id === b.id ? { ...x, posted: true } : x)),
  };
  s = gramNote(s, `Your post "${b.title}" got ${likes?.toLocaleString('en-NG')} likes and +${gained?.toLocaleString('en-NG')} followers.`, 'like');
  // Big news gets picked up by the blog.
  if (b.weight >= 3) s = blogPost(s, `Asanwa Boutique: ${b.title}`, `${b.detail} Divine shared it on Gidigram and the comments are buzzing.`, 'you', b.weight >= 4);
  // A jealous rival may start something in the group.
  const rivals = (s.rivals || []).filter((r) => r.main && r.feeling < 20);
  if (rivals.length && chance(0.25 + b.weight * 0.08)) {
    const r = pick(rivals);
    s = startConvo(s, { with: r.owner, rivalId: r.id, chat: GROUP, topic: 'jealous', opener: pick(JEALOUS_OPENERS[b.kind]) });
  }
  return s;
}

const TREND_TAGS = ['#OwambeSzn', '#AsoEbiBella', '#LagosFashion', '#GeleGoals', '#NaijaBride', '#DettyDecember', '#SoftLife', '#AnkaraStyles', '#CorporateBaddie', '#SundayBest'];

/** The weekly trend: one colour customers lean towards, and the hashtags of the week. */
export function weeklyTrend(s: GameState): NonNullable<GameState['trend']> {
  const week = Math.floor((s.day - 1) / 7);
  if (s.trend && s.trend.week === week) return s.trend;
  let h = (s.seed || 7) * 31 + week * 977;
  const next = () => { h = (h * 1103515245 + 12345) >>> 0; return h; };
  const colour = WANTED_COLOURS[next() % WANTED_COLOURS.length];
  const tags = [`#${colour.name.split(/\s+/).map((w) => w[0].toUpperCase() + w.slice(1)).join('')}Season`];
  while (tags.length < 4) { const t = TREND_TAGS[next() % TREND_TAGS.length]; if (!tags.includes(t)) tags.push(t); }
  return { week, color: colour.color, name: colour.name, tags };
}

/** End of day: refresh the trend, and make sure the blog has today's news. */
export function closeGramDay(s0: GameState): GameState {
  let s = s0;
  const trend = weeklyTrend(s);
  if (!s.trend || s.trend.week !== trend.week) {
    s = { ...s, trend };
    s = blogPost(s, `Trend alert: ${trend.name} is the colour of the week 🎨`, `Stylists across Lagos are seeing requests for ${trend.name}. Trending: ${trend.tags.join(' ')}.`, undefined, true);
  }
  if (!(s.gist || []).some((g) => g.day === s.day)) {
    const rivals = s.rivals || [];
    const top = [...rivals].sort((a, b) => b.followers - a.followers)[0];
    const filler = [
      top ? [`${top.shop} is the most followed boutique in Lagos right now`, `${top.owner}'s page sits on ${top.followers?.toLocaleString('en-NG')} followers. Can anybody catch her?`] : null,
      ['Balogun prices this week', 'Lace and aso-oke traders report steady demand ahead of the weekend parties. Buy early, sisters.'],
      ['Customers are talking about service', 'Lagos shoppers say long waits are the number one reason they walk out of boutiques.'],
      [`What ${TIERS[Math.min(TIERS.length - 1, Math.max(0, s.tier))].name}s are selling`, `Native sets and statement shoes lead sales this week, with ${trend.name} pieces moving fastest.`],
    ].filter(Boolean) as [string, string][];
    const [title, body] = pick(filler);
    s = blogPost(s, title, body);
  }
  return s;
}
