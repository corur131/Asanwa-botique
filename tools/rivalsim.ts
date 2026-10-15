// Rival balance check: runs the real rival engine for N days, M times.
// Run: npx tsx tools/rivalsim.ts 120 40
import { DIVINE_CONFIG } from '../src/constants/presets';
import { newGame } from '../src/game/engine';
import { rivalScore, simulateRivals } from '../src/game/rivals';
import { GameState } from '../src/game/types';

const days = Number(process.argv[2] || 120);
const runs = Number(process.argv[3] || 30);
const pct = (n: number) => `${Math.round(n * 100)}%`;
let ladder60 = 0, ladderEnd = 0, lateLead = 0, lateWeeks = 0, tolaniLead = 0, weeks = 0, changes = 0, ratio60 = 0, ratioEnd = 0, tolaniTierEnd = 0, othersTierEnd = 0;
const leaders = new Map<string, number>();
const cashEnd = new Map<string, number>();
for (let run = 0; run < runs; run++) {
  let s: GameState = newGame(DIVINE_CONFIG);
  let last = '';
  for (let d = 1; d <= days; d++) {
    s = simulateRivals({ ...s, day: d });
    if (d % 7 === 0) {
      const rows = s.rivals.map((r) => ({ id: r.id, score: rivalScore(r) })).sort((a, b) => b.score - a.score);
      weeks++;
      if (rows[0].id === 'tolani') tolaniLead++;
      if (d > days / 2) { lateWeeks++; if (rows[0].id === 'tolani') lateLead++; }
      leaders.set(rows[0].id, (leaders.get(rows[0].id) || 0) + 1);
      if (last && last !== rows[0].id) changes++;
      last = rows[0].id;
    }
    if (d === 60 || d === days) {
      const worth = s.rivals.map((r) => r.cash + (r.savings || 0) + (r.assetValue || 0)).sort((a, b) => b - a);
      const sc = s.rivals.map((r) => rivalScore(r)).sort((a, b) => b - a);
      if (d === 60) ladder60 += sc[0] / sc[1] / runs; else ladderEnd += sc[0] / sc[1] / runs;
      if (d === 60) ratio60 += worth[0] / Math.max(1, worth[1]); else ratioEnd += worth[0] / Math.max(1, worth[1]);
    }
  }
  for (const r of s.rivals) cashEnd.set(r.id, (cashEnd.get(r.id) || 0) + (r.cash + (r.savings || 0)) / runs);
  tolaniTierEnd += s.rivals.find((r) => r.id === 'tolani')!.tier / runs;
  othersTierEnd += s.rivals.filter((r) => r.main && r.id !== 'tolani').reduce((a, r) => a + r.tier, 0) / 4 / runs;
  if (run === runs - 1) console.log('last run day', days, s.rivals.filter((r) => r.main || r.tier >= 3).map((r) => `${r.id}: T${r.tier} skill ${r.skill.toFixed(2)} ₦${Math.round((r.cash + (r.savings || 0)) / 1e6)}m ${Math.round(r.followers / 1000)}k`).join(' | '));
}
console.log(`Tolani leads ${pct(tolaniLead / weeks)} of weeks (${pct(lateLead / lateWeeks)} in the second half) · leader changes per run ${(changes / runs).toFixed(1)}`);
console.log(`#1 vs #2 net worth: day 60 ×${(ratio60 / runs).toFixed(1)}, day ${days} ×${(ratioEnd / runs).toFixed(1)}`);
console.log(`#1 vs #2 ladder score: day 60 ×${ladder60.toFixed(2)}, end ×${ladderEnd.toFixed(2)}`);
console.log(`Avg end tier: Tolani ${tolaniTierEnd.toFixed(1)}, other main rivals ${othersTierEnd.toFixed(1)}`);
console.log('Weeks led:', [...leaders].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v / weeks)}`).join(', '));
console.log('Avg end cash (₦m):', [...cashEnd].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${Math.round(v / 1e6)}`).join(', '));
