import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EQUIPMENT_WATTS, POWER, equipmentLoadKw, generatorFuelBurnForLoad,
  kwhForLoad, solarChargeMinutes, solarDrainMinutes, tariffFor,
} from './power';
import type { GameState } from './types';

test('powered equipment contributes its rated load; clothing stock contributes none', () => {
  assert.equal(EQUIPMENT_WATTS.ac, 1500);
  assert.equal(equipmentLoadKw([{ id: 'ac' }, { id: 'tubeLight' }]), 1.54);
  assert.equal(equipmentLoadKw([{ id: 'silkDress' }, { id: 'chromeRail' }]), 0);
  assert.equal(equipmentLoadKw([]), 0);
});

test('energy use is load multiplied by operating time', () => {
  assert.equal(kwhForLoad(2, 30), 1);
  assert.equal(kwhForLoad(0, 600), 0);
  assert.equal(kwhForLoad(-1, 60), 0);
  assert.equal(kwhForLoad(2, -30), 0);
});

test('legacy saves use the default tariff and players can select a supported tariff', () => {
  assert.equal(tariffFor({ power: { gen: false, solar: 0 } } as GameState), POWER.tariff);
  assert.equal(tariffFor({ power: { gen: false, solar: 0, tariff: 310 } } as GameState), 310);
  assert.deepEqual(Object.values(POWER.tariffs), [225, 310, 390]);
});

test('generator fuel use increases with electrical demand and is capped at rated load', () => {
  const idle = generatorFuelBurnForLoad('small', 0);
  const normal = generatorFuelBurnForLoad('small', 0.4);
  const overload = generatorFuelBurnForLoad('small', 2);
  assert.ok(idle > 0);
  assert.ok(normal > idle);
  assert.equal(overload, POWER.burn.small);
  assert.ok(generatorFuelBurnForLoad('industrial', 5) < generatorFuelBurnForLoad('industrial', 14));
});

test('solar batteries drain faster under heavier load and charge with available panels', () => {
  assert.equal(solarDrainMinutes(10, 0.2, 2), 10);
  assert.ok(solarDrainMinutes(10, 1.4, 2) > solarDrainMinutes(10, 0.2, 2));
  assert.equal(solarChargeMinutes(20, 10, 2), 29);
  assert.equal(solarChargeMinutes(20, -10, 2), 20);
});

test('generator and solar capacities make undersized installations distinguishable', () => {
  assert.equal(POWER.capacityKw.small, 0.8);
  assert.equal(POWER.capacityKw.big, 4.5);
  assert.equal(POWER.capacityKw.industrial, 14);
  assert.ok(1.5 > POWER.capacityKw.small);
  assert.ok(5 > POWER.capacityKw.big);
  assert.ok(5 < POWER.capacityKw.industrial);
});
