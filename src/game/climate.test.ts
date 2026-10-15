import assert from 'node:assert/strict';
import test from 'node:test';
import { dateLabel, dayRange, festive, outdoorTemp, seasonOf, weatherFor } from './climate';

test('the game year follows Lagos seasons and never snows', () => {
  assert.equal(seasonOf(1).id, 'harmattan');
  assert.equal(seasonOf(70).id, 'hotSeason');
  assert.equal(seasonOf(130).id, 'rains');
  assert.equal(seasonOf(215).id, 'augustBreak');
  assert.equal(seasonOf(250).id, 'lateRains');
  assert.equal(seasonOf(310).id, 'drySeason');
  assert.equal(seasonOf(340).id, 'harmattan');
  assert.equal(seasonOf(361).id, 'harmattan', 'the year wraps');
  assert.equal(dateLabel(1), '1 Jan');
  assert.equal(dateLabel(45), '15 Feb');
  assert.ok(festive(335) && !festive(300));
  const kinds = new Set(Array.from({ length: 720 }, (_, i) => weatherFor(i + 1, 1234)));
  assert.deepEqual([...kinds].sort(), ['cloudy', 'harmattan', 'rainy', 'storm', 'sunny']);
});

test('rainy months are mostly wet; harmattan months are mostly hazy', () => {
  const count = (from: number, to: number, pred: (w: string) => boolean) => {
    let n = 0;
    for (let d = from; d <= to; d++) if (pred(weatherFor(d, 99))) n++;
    return n / (to - from + 1);
  };
  assert.ok(count(121, 210, (w) => w === 'rainy' || w === 'storm') > 0.55);
  assert.ok(count(1, 60, (w) => w === 'harmattan') > 0.45);
  assert.ok(count(61, 120, (w) => w === 'sunny') > 0.5);
});

test('temperatures: hot season is hottest, harmattan mornings coldest, afternoons peak', () => {
  const avgHigh = (from: number, to: number) => { let s = 0; for (let d = from; d <= to; d++) s += dayRange(d, 7).high; return s / (to - from + 1); };
  const avgLow = (from: number, to: number) => { let s = 0; for (let d = from; d <= to; d++) s += dayRange(d, 7).low; return s / (to - from + 1); };
  assert.ok(avgHigh(61, 120) > avgHigh(121, 210), 'hot season beats the rains');
  assert.ok(avgLow(1, 60) < avgLow(61, 120) - 4, 'harmattan nights are much colder');
  const morning = outdoorTemp(80, 7, 0), afternoon = outdoorTemp(80, 7, 390), evening = outdoorTemp(80, 7, 720);
  assert.ok(afternoon > morning && afternoon > evening, `${morning} ${afternoon} ${evening}`);
  for (let d = 1; d <= 360; d++) { const r = dayRange(d, 3); assert.ok(r.low > 15 && r.high < 40 && r.high > r.low); }
});
