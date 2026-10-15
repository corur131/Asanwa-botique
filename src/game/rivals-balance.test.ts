import assert from 'node:assert/strict';
import test from 'node:test';
import { DIVINE_CONFIG } from '../constants/presets';
import { newGame } from './engine';
import { rivalScore, simulateRivals } from './rivals';
import type { GameState } from './types';

// Averaged over many runs so the check is stable. Before the balance pass Tolani led ~91% of
// weeks in days 60–120 and was ~35× richer than the next shop on day 60.
test('no rival runs away: Tolani can be caught and the wealth gap stays sane', () => {
  const runs = 20;
  let lateWeeks = 0, tolaniLate = 0, worthRatio60 = 0;
  for (let run = 0; run < runs; run++) {
    let s: GameState = newGame(DIVINE_CONFIG);
    for (let d = 1; d <= 120; d++) {
      s = simulateRivals({ ...s, day: d });
      if (d === 60) {
        const worth = s.rivals.map((r) => r.cash + (r.savings || 0) + (r.assetValue || 0)).sort((a, b) => b - a);
        worthRatio60 += worth[0] / Math.max(1, worth[1]) / runs;
      }
      if (d > 60 && d % 7 === 0) {
        lateWeeks++;
        const top = [...s.rivals].sort((a, b) => rivalScore(b) - rivalScore(a))[0];
        if (top.id === 'tolani') tolaniLate++;
      }
    }
  }
  assert.ok(worthRatio60 < 8, `day-60 top/second net worth ×${worthRatio60.toFixed(1)}`);
  assert.ok(tolaniLate / lateWeeks < 0.75, `Tolani led ${Math.round((tolaniLate / lateWeeks) * 100)}% of late weeks`);
});

test('skill drifts: a long-time leader loses her edge, and nobody exceeds the cap', () => {
  let s: GameState = newGame(DIVINE_CONFIG);
  s = { ...s, rivals: s.rivals.map((r) => (r.id === 'tolani' ? { ...r, skill: 1.28 } : r)) };
  for (let d = 1; d <= 70; d++) s = simulateRivals({ ...s, day: d });
  for (const r of s.rivals) assert.ok(r.skill <= 1.22 && r.skill >= 0.85, `${r.id} skill ${r.skill}`);
  assert.ok(s.rivals.find((r) => r.id === 'tolani')!.skill < 1.2);
});
