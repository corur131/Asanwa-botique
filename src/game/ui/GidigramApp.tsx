import React, { useMemo, useState } from 'react';
import { CharacterSvg } from '../../components/renderer/renderCharacter';
import type { CharacterConfig } from '../../types/character';
import { TIERS } from '../economy';
import * as E from '../engine';
import { BLOG_HANDLE, BLOG_NAME, bragCaptions, openBrags, postBrag, weeklyTrend } from '../gram';
import { ladder } from '../rivals';
import type { GameState, Rival } from '../types';

/**
 * Gidigram: a proper Instagram for Lagos fashion. Home feed with stories, Explore with
 * trending tags and top posts, a "+" to share your wins, Activity, and profiles for you,
 * every boutique and @lagosfashiondaily (the news blog that replaced GistLagos).
 */
type Up = (f: (g: GameState) => GameState) => void;
type Tab = 'home' | 'explore' | 'post' | 'activity' | 'me';

interface FeedItem {
  id: string;
  day: number;
  who: 'you' | 'rival' | 'blog';
  rival?: Rival;
  handle: string;
  look?: CharacterConfig;
  caption: string;
  likes: number;
  title?: string;
  brag?: boolean;
  shade?: boolean;
  hot?: boolean;
  aboutYou?: boolean;
  gained?: number;
}

const hash = (str: string) => Array.from(str).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const n = (v: number) => Math.max(0, Math.round(Number(v) || 0))?.toLocaleString('en-NG');
const FANS = ['tolu_xo', 'amaka.styles', 'lagosbabe_', 'kemi_oflagos', 'chi.chi', 'iam_bisola', 'yababoy', 'sade.k', 'ngozi_nails', 'fola.f', 'thisis_ada', 'mr_obinna', 'ivie.glam', 'hauwa_h', 'dami.dresses'];
const PRAISE = ['This is fire 🔥🔥', 'Where is this shop?? 😍', 'I need this for my sister wedding', 'Price please 🙏🏾', 'Omo! The finishing 💯', 'Booking you next week', 'She looks like money 💸', 'The colours 😩❤️', 'Clean!!', 'Lagos no dey carry last 😍'];
const BRAG_FANS = ['Congrats!! 🎉', 'You deserve it 🙌🏾', 'God did! 🙏🏾', 'Big moves 🔥', 'Proud of you sis ❤️', 'Next level unlocked 🔑'];
const BLOG_FANS = ['Omo 👀', 'Tea ☕☕', 'Lagos is hot this week 🔥', 'Somebody tag her 😂', 'I knew it!', 'Who else is following this? 👀'];

function commentsFor(item: FeedItem, s: GameState): { who: string; text: string }[] {
  const h = hash(item.id);
  const count = 1 + (h % 3);
  const out: { who: string; text: string }[] = [];
  const pool = item.who === 'blog' ? BLOG_FANS : item.brag ? BRAG_FANS : PRAISE;
  for (let k = 0; k < count; k++) out.push({ who: FANS[(h + k * 5) % FANS.length], text: pool[(h + k * 3) % pool.length] });
  if (item.who === 'you' && item.brag) {
    const mains = (s.rivals || []).filter((r) => r.main);
    const r = mains[h % Math.max(1, mains.length)];
    if (r) out.push({ who: r.handle.replace('@', ''), text: r.feeling < 0 ? ['Hmm. Congrats I guess 🙃', 'Let\'s see how long it lasts 😏', 'Filter is doing the work 📸'][h % 3] : ['Congrats babe ❤️', 'Well done sis 👏🏾', 'Love this for you 🥰'][h % 3] });
  }
  if (item.who === 'rival' && item.shade) out.push({ who: FANS[(h + 7) % FANS.length], text: 'Is this about Divine? 👀😂' });
  return out;
}

const Ring: React.FC<{ look?: CharacterConfig; label: string; seen?: boolean; size?: number; blog?: boolean; onClick?: () => void; id: string }> = ({ look, label, seen, size = 60, blog, onClick, id }) => (
  <button onClick={onClick} className="flex shrink-0 flex-col items-center gap-1" style={{ width: size + 8 }}>
    <span className={`rounded-full p-[2.5px] ${seen ? 'bg-white/20' : 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600'}`} style={{ width: size, height: size }}>
      <span className="block h-full w-full overflow-hidden rounded-full border-2 border-black bg-[#2a1f2e]">
        {blog ? <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-rose-600 to-red-900 text-lg font-black text-white">LFD</span>
          : look ? <CharacterSvg config={look} idPrefix={`st-${id}`} camera="portrait" className="h-full w-full" /> : <span className="flex h-full w-full items-center justify-center font-serif text-xl font-bold text-white">D</span>}
      </span>
    </span>
    <span className="w-full truncate text-center text-[10px] text-slate-300">{label}</span>
  </button>
);

const Verified = () => <span className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-500 text-[8px] font-black text-white">✓</span>;

export const GidigramApp: React.FC<{ s: GameState; up: Up; profile: string | null; setProfile: (id: string | null) => void; onVisit: (id: string) => void }> = ({ s, up, profile, setProfile, onVisit }) => {
  const [tab, setTab] = useState<Tab>('home');
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [meView, setMeView] = useState<'grid' | 'feed'>('grid');
  const [posted, setPosted] = useState<string>('');
  const trend = weeklyTrend(s);
  const rivalsById = useMemo(() => new Map((s.rivals || []).map((r) => [r.id, r])), [s.rivals]);

  const feed: FeedItem[] = useMemo(() => {
    const mine: FeedItem[] = (s.posts || []).map((p) => ({ id: p.id, day: p.day, who: 'you', handle: 'divine.styles', look: p.look, caption: p.kind === 'brag' ? p.caption : `${p.caption} @${p.name.toLowerCase().replace(/\s+/g, '')}`, likes: p.likes, title: p.title, brag: p.kind === 'brag', gained: p.gained }));
    const theirs: FeedItem[] = (s.rivalPosts || []).map((p) => {
      const r = rivalsById.get(p.rivalId);
      return { id: p.id, day: p.day, who: 'rival', rival: r, handle: (r?.handle || '@boutique').replace('@', ''), look: p.look, caption: p.caption, likes: p.likes, brag: p.kind === 'brag', shade: p.shade };
    });
    const blog: FeedItem[] = (s.gist || []).map((g) => ({ id: g.id, day: g.day, who: 'blog', handle: BLOG_HANDLE, caption: g.body, title: g.title, likes: 300 + (hash(g.id) % 4000) + (g.hot ? 3000 : 0), hot: g.hot, aboutYou: g.about === 'you' }));
    return [...mine, ...theirs, ...blog].sort((a, b) => b.day - a.day || hash(b.id) % 7 - hash(a.id) % 7);
  }, [s.posts, s.rivalPosts, s.gist, rivalsById]);

  const openProfile = (item: FeedItem) => {
    if (item.who === 'rival' && item.rival) setProfile(item.rival.id);
    else if (item.who === 'blog') setProfile('blog');
    else { setProfile(null); setTab('me'); }
  };

  const Card: React.FC<{ item: FeedItem }> = ({ item }) => {
    const isLiked = liked.has(item.id);
    const comments = commentsFor(item, s);
    return (
      <article className="border-b border-white/10 pb-3">
        <button onClick={() => openProfile(item)} className="flex w-full items-center gap-2 px-3 py-2 text-left">
          <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
            <span className="block h-full w-full overflow-hidden rounded-full bg-[#111]">
              {item.who === 'blog' ? <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-rose-600 to-red-900 text-[9px] font-black text-white">LFD</span>
                : item.who === 'rival' && item.rival ? <CharacterSvg config={item.rival.look} idPrefix={`fa-${item.id}`} camera="portrait" className="h-full w-full" />
                  : <span className="flex h-full w-full items-center justify-center text-xs font-bold text-white">D</span>}
            </span>
          </span>
          <span className="min-w-0 leading-tight">
            <span className="flex items-center text-sm font-semibold text-white">{item.handle}{(item.who === 'blog' || (item.rival && item.rival.followers > 100_000)) && <Verified />}</span>
            <span className="block text-[10px] text-slate-500">{item.who === 'rival' && item.rival ? `${item.rival.shop} · ${item.rival.area}` : item.who === 'blog' ? 'Fashion news · Lagos' : `${s.listing.area}, Lagos`} · Day {item.day}</span>
          </span>
          {item.brag && <span className="ml-auto rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">🏆 Win</span>}
          {item.hot && <span className="ml-auto rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-300">🔥 Hot</span>}
        </button>
        {item.who === 'blog' ? (
          <div className={`mx-3 rounded-2xl p-4 ${item.aboutYou ? 'bg-gradient-to-br from-amber-500/25 to-rose-600/25' : 'bg-gradient-to-br from-rose-700/30 to-slate-800'}`}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-rose-200">{item.aboutYou ? 'About you' : 'Lagos Fashion Daily'}</div>
            <div className="mt-1 text-lg font-extrabold leading-snug text-white">{item.title}</div>
          </div>
        ) : (
          <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-[#2a1f2e] to-[#141018]">
            {item.look && <CharacterSvg config={item.look} idPrefix={`gg-${item.id}`} camera="full" />}
            {item.brag && item.title && <div className="absolute inset-x-3 bottom-3 rounded-xl bg-black/55 px-3 py-2 text-sm font-bold text-white backdrop-blur">🏆 {item.title}</div>}
          </div>
        )}
        <div className="px-3 pt-2 text-sm text-white">
          <div className="mb-1 flex gap-4 text-xl">
            <button aria-label="Like" onClick={() => setLiked((x) => { const y = new Set(x); if (y.has(item.id)) y.delete(item.id); else y.add(item.id); return y; })} className={isLiked ? 'text-rose-500' : 'text-white'}>{isLiked ? '♥' : '♡'}</button>
            <span>💬</span><span>➤</span>
          </div>
          <div className="font-semibold">{n(item.likes + (isLiked ? 1 : 0))} likes</div>
          <div><b>{item.handle}</b> {item.caption}</div>
          {comments.map((c, i) => <div key={i} className="text-[13px] text-slate-300"><b className="text-white">{c.who}</b> {c.text}</div>)}
          {item.who === 'you' && !!item.gained && <div className="mt-1 text-[11px] text-emerald-300">+{n(item.gained)} new followers from this post</div>}
        </div>
      </article>
    );
  };

  // ----- profiles -------------------------------------------------------------
  if (profile === 'blog') {
    const news = feed.filter((x) => x.who === 'blog');
    return (
      <Frame title={BLOG_HANDLE} back={() => setProfile(null)} tab={tab} setTab={(t) => { setProfile(null); setTab(t); }}>
        <div className="flex items-center gap-4 px-4 py-3">
          <Ring id="blog-big" label="" blog size={72} />
          <div className="grid flex-1 grid-cols-3 text-center text-white">
            <div><div className="font-bold">{news.length}</div><div className="text-[11px] text-slate-400">posts</div></div>
            <div><div className="font-bold">1.2M</div><div className="text-[11px] text-slate-400">followers</div></div>
            <div><div className="font-bold">48</div><div className="text-[11px] text-slate-400">following</div></div>
          </div>
        </div>
        <div className="px-4 pb-3 text-sm text-white"><div className="flex items-center font-semibold">{BLOG_NAME}<Verified /></div><div className="text-[13px] text-slate-300">Lagos fashion news, daily ☕ Celebrity sightings · Top 20 · Trends · Gist</div></div>
        {news.map((item) => <Card key={item.id} item={item} />)}
      </Frame>
    );
  }
  const rival = profile ? rivalsById.get(profile) : undefined;
  if (rival) {
    const posts = feed.filter((x) => x.rival?.id === rival.id);
    const rank = ladder(s).findIndex((x) => x.id === rival.id) + 1;
    const feeling = rival.feeling > 30 ? 'Friendly' : rival.feeling < -30 ? 'Enemy' : rival.feeling < 0 ? 'Cold' : 'Neutral';
    return (
      <Frame title={rival.handle.replace('@', '')} back={() => setProfile(null)} tab={tab} setTab={(t) => { setProfile(null); setTab(t); }}>
        <div className="flex items-center gap-4 px-4 py-3">
          <Ring id={`rv-${rival.id}`} label="" look={rival.look} size={72} />
          <div className="grid flex-1 grid-cols-3 text-center text-white">
            <div><div className="font-bold">{posts.length + 30}</div><div className="text-[11px] text-slate-400">posts</div></div>
            <div><div className="font-bold">{n(rival.followers)}</div><div className="text-[11px] text-slate-400">followers</div></div>
            <div><div className="font-bold">#{rank}</div><div className="text-[11px] text-slate-400">Top 20</div></div>
          </div>
        </div>
        <div className="px-4 pb-3 text-sm text-white">
          <div className="flex items-center font-semibold">{rival.owner} · {rival.shop}{rival.followers > 100_000 && <Verified />}</div>
          <div className="text-[13px] text-slate-300">{TIERS[rival.tier].name} in {rival.area} 📍</div>
          {rival.main && <div className="mt-1 text-[11px] text-slate-500">How she feels about you: <b className={rival.feeling < 0 ? 'text-rose-300' : 'text-emerald-300'}>{feeling}</b></div>}
          <button onClick={() => onVisit(rival.id)} className="mt-2 w-full rounded-lg border border-white/15 bg-white/10 py-1.5 text-sm font-semibold">Visit the shop</button>
        </div>
        {posts.length ? posts.map((item) => <Card key={item.id} item={item} />) : <p className="px-4 py-6 text-center text-sm text-slate-500">No posts this month.</p>}
      </Frame>
    );
  }

  // ----- tabs -----------------------------------------------------------------
  const storyAccounts = [
    ...((s.posts || []).some((p) => p.day >= s.day - 1) ? [{ id: 'you', label: 'Your story', look: s.divine as CharacterConfig | undefined, go: () => setTab('me') }] : []),
    ...((s.gist || []).some((g) => g.day >= s.day - 1) ? [{ id: 'blog', label: BLOG_HANDLE, look: undefined, go: () => setProfile('blog') }] : []),
    ...(s.rivals || []).filter((r) => (s.rivalPosts || []).some((p) => p.rivalId === r.id && p.day >= s.day - 2)).slice(0, 12).map((r) => ({ id: r.id, label: r.handle.replace('@', ''), look: r.look as CharacterConfig | undefined, go: () => setProfile(r.id) })),
  ];

  const Home = (
    <>
      <div className="flex gap-2 overflow-x-auto border-b border-white/10 px-2 py-3">
        {storyAccounts.length ? storyAccounts.map((a) => <Ring key={a.id} id={`s-${a.id}`} label={a.label} look={a.look} blog={a.id === 'blog'} onClick={a.go} />) : <span className="px-2 text-xs text-slate-500">No stories today.</span>}
      </div>
      {feed.length ? feed.slice(0, 40).map((item) => <Card key={item.id} item={item} />) : <p className="p-6 text-center text-sm text-slate-500">Your feed will fill up as Lagos gets busy.</p>}
    </>
  );

  const weekPosts = feed.filter((x) => x.day >= s.day - 7 && x.who !== 'blog').sort((a, b) => b.likes - a.likes).slice(0, 9);
  const Explore = (
    <div className="p-3">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-600/25 to-amber-500/10 p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-pink-200">Trending in Lagos · week {trend.week + 1}</div>
        <div className="mt-2 flex items-center gap-3">
          <span className="h-10 w-10 rounded-full ring-2 ring-white/40" style={{ background: trend.color }} />
          <div><div className="text-lg font-extrabold capitalize text-white">{trend.name}</div><div className="text-[11px] text-slate-300">Colour of the week · customers are asking for it</div></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">{trend.tags.map((t) => <span key={t} className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-sky-200">{t}</span>)}</div>
      </div>
      <div className="mb-2 mt-4 text-sm font-bold text-white">Top posts this week</div>
      <div className="grid grid-cols-3 gap-0.5">
        {weekPosts.map((p) => (
          <button key={p.id} onClick={() => openProfile(p)} className="relative aspect-square overflow-hidden bg-gradient-to-b from-[#2a1f2e] to-[#141018]">
            {p.look && <div className="absolute inset-x-0 -top-2"><CharacterSvg config={p.look} idPrefix={`ex-${p.id}`} camera="bust" /></div>}
            <span className="absolute bottom-1 left-1 text-[10px] font-semibold text-white drop-shadow">♥ {n(p.likes)}</span>
            {p.brag && <span className="absolute right-1 top-1 text-xs">🏆</span>}
          </button>
        ))}
      </div>
      <div className="mb-2 mt-4 text-sm font-bold text-white">Boutiques to watch</div>
      <div className="divide-y divide-white/5">
        <button onClick={() => setProfile('blog')} className="flex w-full items-center gap-3 py-2 text-left">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-600 to-red-900 text-xs font-black text-white">LFD</span>
          <span className="min-w-0 flex-1"><span className="flex items-center text-sm font-semibold text-white">{BLOG_HANDLE}<Verified /></span><span className="block text-[11px] text-slate-400">Fashion news, daily</span></span>
        </button>
        {[...(s.rivals || [])].sort((a, b) => b.followers - a.followers).map((r) => (
          <button key={r.id} onClick={() => setProfile(r.id)} className="flex w-full items-center gap-3 py-2 text-left">
            <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#2a1f2e] ring-2 ring-pink-500/60"><CharacterSvg config={r.look} idPrefix={`bw-${r.id}`} camera="portrait" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{r.handle} {r.main && <span className="text-[10px] text-pink-300">● rival</span>}</span><span className="block truncate text-[11px] text-slate-400">{r.shop} · {r.area}</span></span>
            <span className="shrink-0 text-[11px] text-slate-300">{n(r.followers)}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const brags = openBrags(s);
  const Post = (
    <div className="p-3">
      <div className="text-base font-bold text-white">Share a win</div>
      <p className="mt-1 text-xs text-slate-400">Celebrities, rich clients, contracts, trophies, a bigger shop or a new collection. Posting grows your followers, and the blog may pick it up. Rivals will notice.</p>
      {posted && <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">Posted! Check your profile for the likes.</div>}
      {brags.length === 0 && <div className="mt-4 rounded-xl bg-white/5 p-4 text-center text-sm text-slate-400">Nothing new to brag about yet. Serve a celebrity or rich client, deliver a contract, win a style-off or move up, and it will show here.</div>}
      {brags.map((b) => (
        <div key={b.id} className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center justify-between"><div className="font-semibold text-white">🏆 {b.title}</div><span className="text-[10px] text-slate-500">Day {b.day}</span></div>
          <div className="mt-1 text-xs text-slate-400">{b.detail}</div>
          <div className="mt-2 space-y-1.5">
            {bragCaptions(b).map((cap, i) => (
              <button key={i} onClick={() => { up((g) => postBrag(g, b.id, i)); setPosted(b.id); }} className="w-full rounded-xl border border-pink-400/30 bg-pink-500/10 px-3 py-2 text-left text-xs text-white">
                <span className="mr-1 text-[10px] font-bold text-pink-300">{['Humble', 'Flex', 'Grateful'][i]}</span> {cap}
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="mt-4 text-[11px] text-slate-500">Styled looks that score 70+ can be posted from the styling screen.</p>
    </div>
  );

  const notes = s.gramNotes || [];
  const Activity = (
    <div className="divide-y divide-white/5">
      {notes.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No activity yet.</p>}
      {notes.map((x) => (
        <div key={x.id} className="flex items-start gap-3 px-3 py-3">
          <span className="text-xl">{({ like: '♥', follow: '👤', comment: '💬', mention: '@', news: '📰', celebrity: '⭐' } as Record<string, string>)[x.kind]}</span>
          <span className="min-w-0 flex-1"><span className="block text-sm text-white">{x.text}</span><span className="text-[10px] text-slate-500">Day {x.day}</span></span>
        </div>
      ))}
    </div>
  );

  const myFeed = feed.filter((x) => x.who === 'you');
  const Me = (
    <>
      <div className="flex items-center gap-4 px-4 py-3">
        <Ring id="me" label="" look={s.divine} size={72} />
        <div className="grid flex-1 grid-cols-3 text-center text-white">
          <div><div className="font-bold">{myFeed.length}</div><div className="text-[11px] text-slate-400">posts</div></div>
          <div><div className="font-bold">{n(s.followers || 0)}</div><div className="text-[11px] text-slate-400">followers</div></div>
          <div><div className="font-bold">312</div><div className="text-[11px] text-slate-400">following</div></div>
        </div>
      </div>
      <div className="px-4 pb-3 text-sm text-white">
        <div className="font-semibold">Divine Styles · Asanwa Boutique</div>
        <div className="text-[13px] text-slate-300">Stylist 💇🏾‍♀️ Native & English wear 👗 {s.listing.area}, Lagos 📍</div>
        <div className="mt-1 text-[11px] text-slate-500">Your audience brings more customers (+{Math.round((E.followerTraffic(s.followers || 0) - 1) * 100)}% traffic now).</div>
        <div className="mt-2 rounded-xl border border-pink-400/20 bg-pink-500/5 p-2"><div className="text-[10px] uppercase tracking-wide text-pink-200">Unlocked by your audience</div><div className="mt-1 text-[11px] text-slate-300">{E.unlocksForFollowers(s.followers || 0).length ? E.unlocksForFollowers(s.followers || 0).join(' · ') : 'Reach 1,000 followers to attract your first sponsorships.'}</div></div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={() => setMeView(meView === 'grid' ? 'feed' : 'grid')} className="rounded-lg bg-white/10 py-1.5 text-xs font-semibold">{meView === 'grid' ? 'View as feed' : 'View as grid'}</button>
          <button onClick={() => setTab('post')} className="rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 py-1.5 text-xs font-semibold">Share a win {brags.length ? `(${brags.length})` : ''}</button>
        </div>
      </div>
      {myFeed.length === 0 ? <p className="px-4 py-8 text-center text-sm text-slate-500">No posts yet. Post a look that scores 70+, or share a win.</p>
        : meView === 'grid' ? (
          <div className="grid grid-cols-3 gap-0.5">
            {myFeed.map((p) => (
              <button key={p.id} onClick={() => setMeView('feed')} className="relative aspect-square overflow-hidden bg-gradient-to-b from-[#2a1f2e] to-[#141018]">
                {p.look && <div className="absolute inset-x-0 -top-2"><CharacterSvg config={p.look} idPrefix={`gt-${p.id}`} camera="bust" /></div>}
                <span className="absolute bottom-1 left-1 text-[10px] font-semibold text-white drop-shadow">♥ {n(p.likes)}</span>
                {p.brag && <span className="absolute right-1 top-1 text-xs">🏆</span>}
              </button>
            ))}
          </div>
        ) : myFeed.map((item) => <Card key={item.id} item={item} />)}
    </>
  );

  return (
    <Frame title="Gidigram" tab={tab} setTab={setTab} brags={brags.length}>
      {tab === 'home' && Home}
      {tab === 'explore' && Explore}
      {tab === 'post' && Post}
      {tab === 'activity' && Activity}
      {tab === 'me' && Me}
    </Frame>
  );
};

const Frame: React.FC<{ title: string; back?: () => void; tab: Tab; setTab: (t: Tab) => void; brags?: number; children: React.ReactNode }> = ({ title, back, tab, setTab, brags, children }) => (
  <div className="flex min-h-0 flex-1 flex-col bg-black text-white">
    <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2.5">
      {back && <button onClick={back} aria-label="Back" className="px-1 text-xl">‹</button>}
      <span className={back ? 'font-semibold' : 'font-serif text-2xl italic tracking-tight'}>{title}</span>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    <nav className="grid shrink-0 grid-cols-5 border-t border-white/10 bg-black">
      {([['home', '⌂'], ['explore', '🔍'], ['post', '＋'], ['activity', '♡'], ['me', '👤']] as const).map(([id, glyph]) => (
        <button key={id} onClick={() => setTab(id)} className={`relative py-2.5 text-xl ${tab === id && !back ? 'text-white' : 'text-slate-500'}`} aria-label={id}>
          {glyph}
          {id === 'post' && !!brags && <span className="absolute right-1/4 top-1 rounded-full bg-rose-500 px-1.5 text-[9px] font-bold text-white">{brags}</span>}
        </button>
      ))}
    </nav>
  </div>
);
