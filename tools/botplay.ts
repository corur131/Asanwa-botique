// Headless playtest: a bot runs the real game engine for N days.
// Plays the real game engine with a simple bot; used to check the economy after changes.
// Run: npx tsx tools/botplay.ts 60
import { DIVINE_CONFIG } from '../src/constants/presets';
import { MAKEUP_LOOKS } from '../src/constants/catalog';
import { TIERS, naira } from '../src/game/economy';
import { MARKET, canBuy, makeDesign } from '../src/game/market';
import { NAMED_COLOURS } from '../src/game/colours';
import { applyLook, buyDesign, closeShop, displayedCount, landlordOffer, moveUp, newGame, nextMorning, openShop, settle, staffServe, canHire, candidates, hire, train, restockAll } from '../src/game/engine';
import { lookCost, scoreLook } from '../src/game/scoring';
import { Customer, GameState, StyleChoice } from '../src/game/types';

const days = Number(process.argv[2] || 60);
const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

function restockBot(s: GameState): GameState {
  const t = TIERS[s.tier];
  s = restockAll(s, 3);
  let guard = 0;
  while (displayedCount(s) < t.slots && guard++ < 60) {
    const need = ['top', 'bottom', 'dress', 'shoes', 'shoes', 'dress', 'headwear', 'necklace', 'earrings', 'bag', 'outer'];
    const kind = need[guard % need.length];
    const opts = MARKET.filter((e) => e.kind === kind && canBuy(e, s.tier) && e.for !== 'm' && e.price < (s.tier >= 2 ? 90_000 : 25_000));
    if (!opts.length) continue;
    const e = pick(opts);
    const c = pick(NAMED_COLOURS);
    const d = makeDesign(e, { fabric: e.fabric, color: c.color, color2: pick(NAMED_COLOURS).color, pattern: Math.floor(Math.random() * 10) });
    if (s.cash - d.cost * d.pieces < t.rent * 1.2) break;
    s = buyDesign(s, d);
  }
  return s;
}

function bestLook(s: GameState, c: Customer): StyleChoice {
  const shown = s.stock.filter((d) => d.displayed && d.pieces > 0);
  const by = (k: string) => shown.filter((d) => d.kind === k);
  let best: StyleChoice = {};
  let bestScore = -1;
  const lookName = c.occasion === 'casual' ? 'natural' : ['owambe', 'wedding', 'redCarpet'].includes(c.occasion) ? 'owambe' : 'softGlam';
  for (let i = 0; i < 60; i++) {
    const ch: StyleChoice = { hair: c.male ? 'lowCut' : pick(['bodyWave', 'knotlessBraids', 'sleekPonytail', 'bluntBob']) };
    if (!c.male) ch.makeup = { ...MAKEUP_LOOKS.find((l) => l.id === lookName)!.makeup };
    if (by('dress').length && Math.random() < 0.5) ch.dress = pick(by('dress')).uid;
    else if (by('top').length && by('bottom').length) { ch.top = pick(by('top')).uid; ch.bottom = pick(by('bottom')).uid; }
    if (by('shoes').length) ch.shoes = pick(by('shoes')).uid;
    if (by('headwear').length && Math.random() < 0.3) ch.headwear = pick(by('headwear')).uid;
    if (by('earrings').length && Math.random() < 0.6) ch.earrings = pick(by('earrings')).uid;
    if (by('necklace').length && Math.random() < 0.4) ch.necklace = pick(by('necklace')).uid;
    if (by('bag').length && Math.random() < 0.4) ch.bag = pick(by('bag')).uid;
    const f = lookCost(c, ch, s.stock).fair;
    const sc = scoreLook(c, ch, s.stock).total - (f > c.budget * 1.05 ? 100 + (f - c.budget) / 1000 : 0);
    if (sc > bestScore) { bestScore = sc; best = ch; }
  }
  return best;
}

let s = newGame(DIVINE_CONFIG);
const acct = { sales: 0, cogs: 0, n: 0, lostSales: 0, stockSpend: 0 };
const stockVal = (g: GameState) => g.stock.reduce((a, d) => a + d.cost * d.pieces, 0);
const scores: number[] = [];
for (let d = 0; d < days; d++) {
  { const c0 = s.cash; s = restockBot(s); acct.stockSpend += c0 - s.cash; }
  const next = s.tier + 1 < TIERS.length ? TIERS[s.tier + 1] : null;
  if (next && s.cash > next.moveIn + next.rent * 2 + next.slots * 2 * 9000 * 0.5) s = moveUp(s, landlordOffer());
  if (canHire(s) && s.cash > TIERS[s.tier].rent * 3) s = hire(s, candidates(s)[0]);
  for (const m of s.staff) if (m.level < 9 && s.cash > TIERS[s.tier].rent * 4) s = train(s, m.id);
  s = openShop(s);
  let mine = 0;
  while (s.queueIndex < s.queue.length) {
    const c = s.queue[s.queueIndex];
    if (mine >= 8) { s = staffServe(s, c).state; continue; }
    mine++;
    const ch = bestLook(s, c);
    const score = scoreLook(c, ch, s.stock);
    const cost = lookCost(c, ch, s.stock);
    const price = Math.min(cost.fair, Math.round(c.budget));
    const st = settle(c, score, price, cost.consumables);
    scores.push(score.total);
    if (process.env.DEBUG && d < 3) console.log(c.cls, c.occasion, c.wants.map((w) => w.kind).join(','), JSON.stringify({ ...score, notes: undefined }), score.notes.join(' | '), 'fair', cost.fair, 'budget', c.budget);
    if (st.outcome === 'paid' || st.outcome === 'bargained') { acct.sales += st.paid + st.tip; acct.cogs += st.cost; acct.n++; } else acct.lostSales++;
    s = applyLook(s, c, ch, st, score);
  }
  s = closeShop(s);
  if (s.day % 7 === 0 || s.day === days) {
    console.log(`day ${s.day} ${TIERS[s.tier].name.padEnd(12)} cash ${naira(s.cash).padStart(12)} rep ${s.rep.toFixed(0).padStart(3)} served ${s.today.served}/${s.queue.length} stock ${s.stock.length} staff ${s.staff.length} avgScore ${Math.round(scores.slice(-40).reduce((a, b) => a + b, 0) / Math.min(40, scores.length))} | wk sales ${acct.sales} cogs ${acct.cogs} n ${acct.n} lost ${acct.lostSales} stockSpend ${acct.stockSpend} stockVal ${stockVal(s)}`);
    Object.assign(acct, { sales: 0, cogs: 0, n: 0, lostSales: 0, stockSpend: 0 });
  }
  s = nextMorning(s);
}
console.log('messages:', s.messages.slice(0, 8).map((m) => `[${m.day}] ${m.from}: ${m.text}`).join('\n'));
if (process.env.SAVE) {
  const { writeFileSync } = await import('fs');
  writeFileSync(process.env.SAVE, JSON.stringify(s));
}
