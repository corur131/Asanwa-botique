// Headless playtest: a bot runs the real game engine for N days.
// Plays the real game engine with a simple bot; used to check the economy after changes.
// Run: npx tsx tools/botplay.ts 60
import { DIVINE_CONFIG } from '../src/constants/presets';
import { MAKEUP_LOOKS } from '../src/constants/catalog';
import { TIERS, naira } from '../src/game/economy';
import { MARKET, canBuy, makeDesign } from '../src/game/market';
import { NAMED_COLOURS } from '../src/game/colours';
import { interact, energyOf, fuelOf, refuel, tankSize, busyNow, applyLook, buyDesign, displayedCount, displayCap, listingsNow, moveTo, buyFurniture, stats, newGame, nextMorning, openShop, settle, canHire, candidates, hire, train, restockAll, tick, startStyling, waiting, staffChoice, inBlackout, setGen, answerVisit, answerMessage } from '../src/game/engine';
import { lookCost, scoreLook } from '../src/game/scoring';
import { SHOP_MINUTES } from '../src/game/economy';
import { Customer, GameState, StyleChoice } from '../src/game/types';

const days = Number(process.argv[2] || 60);
const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

function restockBot(s: GameState): GameState {
  const t = TIERS[s.tier];
  s = restockAll(s, 3);
  let guard = 0;
  // buy display furniture when the rails are full but the shop has room
  for (let k = 0; k < 4 && stats(s).display < t.slots; k++) {
    const id = s.tier >= 1 ? 'chromeRail' : 'rustyRail';
    if (s.cash < s.listing.rent * 1.5 + 25_000) break;
    const before = stats(s).display;
    s = buyFurniture(s, id);
    if (stats(s).display === before) break;
  }
  while (displayedCount(s) < displayCap(s) && guard++ < 60) {
    const need = ['top', 'bottom', 'dress', 'shoes', 'shoes', 'dress', 'headwear', 'necklace', 'earrings', 'bag', 'outer'];
    const kind = need[guard % need.length];
    const opts = MARKET.filter((e) => e.kind === kind && canBuy(e, s.tier) && e.for !== 'm' && e.price < (s.tier >= 2 ? 90_000 : 25_000));
    if (!opts.length) continue;
    const e = pick(opts);
    const c = pick(NAMED_COLOURS);
    const d = makeDesign(e, { fabric: e.fabric, color: c.color, color2: pick(NAMED_COLOURS).color, pattern: Math.floor(Math.random() * 10) });
    if (s.cash - d.cost * d.pieces < s.listing.rent * 1.2) break;
    s = buyDesign(s, d);
  }
  return s;
}

// how fast the bot styles: minutes of shop time per full look (a real player: ~60-90 seconds)
const SPEED = Number(process.env.SPEED || 65);

function bestLook(s: GameState, c: Customer): StyleChoice {
  if (c.service) {
    let best: StyleChoice = {};
    let bs = -1;
    for (let i = 0; i < 12; i++) {
      const ch = staffChoice(s, c)!;
      if (!c.male && c.service !== 'hair') ch.makeup = { ...MAKEUP_LOOKS.find((l) => l.id === (c.wants.some((w) => w.kind === 'glam') ? 'owambe' : 'natural'))!.makeup };
      const sc = scoreLook(c, ch, s.stock).total;
      if (sc > bs) { bs = sc; best = ch; }
    }
    return best;
  }
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
    const sc = scoreLook(c, ch, s.stock).total - (!c.contest && f > c.budget * 1.05 ? 100 + (f - c.budget) / 1000 : 0);
    if (sc > bestScore) { bestScore = sc; best = ch; }
  }
  return best;
}

let s = newGame(DIVINE_CONFIG);
const acct = { sales: 0, cogs: 0, n: 0, lostSales: 0, stockSpend: 0 };
const stockVal = (g: GameState) => g.stock.reduce((a, d) => a + d.cost * d.pieces, 0);
const scores: number[] = [];
const energyLog = { rests: 0, minE: 100, bills: 0, fuel: 0 };
for (let d = 0; d < days; d++) {
  { const c0 = s.cash; s = restockBot(s); acct.stockSpend += c0 - s.cash; }
  const next = s.tier + 1 < TIERS.length ? TIERS[s.tier + 1] : null;
  const opt = listingsNow(s)[1];
  if (next && opt && s.cash > opt.moveIn + opt.rent * 2 + next.slots * 2 * 9000 * 0.5 + 60_000) s = moveTo(s, opt);
  if (!s.furniture.some((f) => f.id === 'fan') && s.cash > 90_000) s = buyFurniture(s, 'fan');
  if (!stats(s).gen && s.cash > 180_000) s = buyFurniture(s, 'smallGen');
  if (canHire(s) && s.cash > s.listing.rent * 3) s = hire(s, candidates(s)[0]);
  for (const m of s.staff) if (m.level < 9 && s.cash > s.listing.rent * 4) s = train(s, m.id);
  for (const m of s.messages.filter((x) => x.ctx?.kind === 'invite' && !x.answered)) s = answerMessage(s, m.id, 'accept');
  s = openShop(s);
  const arrivedToday = s.arrivals.length;
  let guard = 0;
  while (s.phase === 'shop' && guard++ < 5000) {
    const w = waiting(s).sort((a, b) => Number(!!b.c.contest) - Number(!!a.c.contest) || Number(b.c.cls === 'rich') - Number(a.c.cls === 'rich') || a.arrived - b.arrived);
    if (inBlackout(s) && !s.power.gen && stats(s).gen) s = setGen(s, true);
    if (s.visit) s = answerVisit(s, 'welcome');
    if (!w.length || s.clock >= SHOP_MINUTES) { s = tick(s, 1); continue; }
    if (stats(s).gen && fuelOf(s) < 3) s = refuel(s, 'full');
    if (busyNow(s)) { s = tick(s, 1); continue; }
    if (energyOf(s) < 15) {
      const seat = s.furniture.find((p) => p.placed && ['plasticChair', 'stool', 'bench', 'sofa', 'ottoman', 'velvetSofa'].includes(p.id));
      if (seat) { s = interact(s, seat.uid, 'sit').s; energyLog.rests++; continue; }
    }
    const c = w[0].c;
    s = startStyling(s, c.id);
    const ch = bestLook(s, c);
    const dur = (c.service ? SPEED * 0.5 : SPEED) * (0.75 + Math.random() * 0.5);
    for (let m = 0; m < dur; m++) { if (inBlackout(s) && !s.power.gen && stats(s).gen) s = setGen(s, true); s = tick(s, 1); }
    const score = scoreLook(c, ch, s.stock);
    const cost = lookCost(c, ch, s.stock);
    const price = Math.min(cost.fair, Math.round(c.budget));
    const st = settle(c, score, price, cost.consumables);
    scores.push(score.total);
    if (c.contest) console.log(`  style-off day ${s.day}: bot ${score.total} vs ${c.contest.rivalId} ${c.contest.rivalScore} (${c.cls}) notes: ${score.notes.slice(0, 3).join(' | ')}`);
    if (st.outcome === 'paid' || st.outcome === 'bargained') { acct.sales += st.paid + st.tip; acct.cogs += st.cost; acct.n++; } else acct.lostSales++;
    s = applyLook(s, c, ch, st, score);
    energyLog.minE = Math.min(energyLog.minE, energyOf(s));
    s = tick(s, 0);
  }
  (s as GameState & { _arr?: number })._arr = arrivedToday;
  if (s.day % 7 === 0 || s.day === days) {
    console.log(`day ${s.day} ${TIERS[s.tier].name.padEnd(12)} cash ${naira(s.cash).padStart(12)} rep ${s.rep.toFixed(0).padStart(3)} served ${s.today.served}/${(s as GameState & { _arr?: number })._arr} lost ${s.today.lost} stock ${s.stock.length} staff ${s.staff.length} avgScore ${Math.round(scores.slice(-40).reduce((a, b) => a + b, 0) / Math.min(40, scores.length))} | wk sales ${acct.sales} cogs ${acct.cogs} n ${acct.n} lost ${acct.lostSales} stockSpend ${acct.stockSpend} stockVal ${stockVal(s)}`);
    Object.assign(acct, { sales: 0, cogs: 0, n: 0, lostSales: 0, stockSpend: 0 });
  }
  s = nextMorning(s);
}
console.log('energy:', energyLog, 'ledger sample:', s.ledger.filter((l) => /NEPA|LAWMA|Fuel|Data|association/.test(l.label)).slice(0, 6).map((l) => `${l.label} ${l.amount}`).join('; '));
const { ladder } = await import('../src/game/rivals');
console.log('ladder:', ladder(s).map((r, i) => `${i + 1}.${r.id}${r.tier}`).join(' '));
console.log('events:', s.events.map((e) => `${e.title}@${e.day}:${e.status}`).join(', '));
console.log('save size KB', Math.round(JSON.stringify(s).length / 1024));
console.log('messages:', s.messages.slice(0, 8).map((m) => `[${m.day}] ${m.from}: ${m.text}`).join('\n'));
if (process.env.SAVE) {
  const { writeFileSync } = await import('fs');
  writeFileSync(process.env.SAVE, JSON.stringify(s));
}
