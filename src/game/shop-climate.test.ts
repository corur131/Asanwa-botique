import assert from 'node:assert/strict';
import test from 'node:test';
import { DIVINE_CONFIG } from '../constants/presets';
import { newGame } from './engine';
import { coolRunning, drainRate, setThermostat, shopArea, shopClimate } from './power';
import type { Placed } from './shop';
import type { GameState, LagosWeather } from './types';

const piece = (id: string, i: number): Placed => ({ uid: `t-${id}-${i}`, id, x: i, z: 0, rot: 0, placed: true });

/** A shop of a given tier with only the listed cooling, on a given day, time and weather. */
function shop(tier: number, cooling: string[], day: number, clock: number, weather: LagosWeather): GameState {
  const s = newGame(DIVINE_CONFIG);
  return {
    ...s, seed: 4242, tier, phase: 'shop', day, clock, weather, outages: [], inShop: [], staff: [],
    listing: { ...s.listing, tier, stars: 1, signature: false },
    furniture: cooling.map(piece),
  };
}
// Day 80 is the hot season; 2:30pm is 390 minutes after opening; day 15 is harmattan.
const HOT_AFTERNOON = { day: 80, clock: 390, weather: 'sunny' as const };
const HARMATTAN_MORNING = { day: 15, clock: 0, weather: 'harmattan' as const };

test('a small AC cannot carry a big shop on a hot afternoon; the right-sized AC can', () => {
  const big = shop(4, ['ac'], HOT_AFTERNOON.day, HOT_AFTERNOON.clock, HOT_AFTERNOON.weather);
  const c = shopClimate(big);
  assert.ok(shopArea(big) >= 120);
  assert.ok(c.acStruggling, 'one split AC in a flagship struggles');
  assert.ok(c.indoor > 29, `flagship with one split AC is ${c.indoor}°C`);
  assert.ok(['warm', 'hot'].includes(c.status));

  const cooled = shop(4, ['industrialAc', 'standingAc'], HOT_AFTERNOON.day, HOT_AFTERNOON.clock, HOT_AFTERNOON.weather);
  const ok = shopClimate(cooled);
  assert.equal(ok.acStruggling, false);
  assert.ok(Math.abs(ok.indoor - 24) < 0.6, `right-sized AC holds the thermostat: ${ok.indoor}`);
  assert.equal(ok.status, 'comfy');
  assert.ok(coolRunning(cooled) > coolRunning(big));

  const kiosk = shop(0, ['ac'], HOT_AFTERNOON.day, HOT_AFTERNOON.clock, HOT_AFTERNOON.weather);
  assert.equal(shopClimate(kiosk).status, 'comfy', 'one split AC is plenty for a kiosk');
});

test('blasting the AC in harmattan makes customers cold and impatient', () => {
  const freezing = setThermostat(shop(2, ['standingAc', 'standingAc'], HARMATTAN_MORNING.day, HARMATTAN_MORNING.clock, HARMATTAN_MORNING.weather), 16);
  const c = shopClimate(freezing);
  assert.equal(c.status, 'cold', `feels ${c.feels}`);
  assert.ok(drainRate(freezing, 'rich') > 1);

  const gentle = setThermostat(freezing, 25);
  assert.notEqual(shopClimate(gentle).status, 'cold');
  // and with no cooling at all, a harmattan morning is pleasant
  const none = shop(2, [], HARMATTAN_MORNING.day, HARMATTAN_MORNING.clock, HARMATTAN_MORNING.weather);
  assert.ok(['comfy', 'cool'].includes(shopClimate(none).status));
});

test('ACs only cool when they have power; fans only make it feel cooler', () => {
  const s = shop(1, ['ac'], HOT_AFTERNOON.day, HOT_AFTERNOON.clock, HOT_AFTERNOON.weather);
  const blackout = { ...s, outages: [{ from: 0, to: 720 }] };
  assert.ok(shopClimate(blackout).indoor > shopClimate(s).indoor + 4);
  const switchedOff = { ...s, off: { [s.furniture[0].uid]: true } };
  assert.equal(shopClimate(switchedOff).acArea, 0);

  const fans = shop(1, ['fan', 'fan', 'ceilingFan'], HOT_AFTERNOON.day, HOT_AFTERNOON.clock, HOT_AFTERNOON.weather);
  const f = shopClimate(fans);
  assert.equal(f.indoor, shopClimate(shop(1, [], HOT_AFTERNOON.day, HOT_AFTERNOON.clock, HOT_AFTERNOON.weather)).indoor);
  assert.ok(f.feels < f.indoor);
});

test('a crowded shop runs warmer', () => {
  const quiet = shop(0, [], 200, 300, 'cloudy');
  const busy = { ...quiet, inShop: Array.from({ length: 6 }, () => quiet.inShop[0] ?? ({} as GameState['inShop'][number])) };
  assert.ok(shopClimate(busy).indoor > shopClimate(quiet).indoor);
});
