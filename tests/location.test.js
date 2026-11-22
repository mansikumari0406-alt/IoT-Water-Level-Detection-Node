import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCoordinates } from '../src/gpsLocation.js';
import { createReading } from '../src/models.js';
import { getSimulatedWaterLevelMm, waterLevelFromDistance } from '../src/sensorProcessing.js';

test('valid coordinates pass', () => {
  assert.deepEqual(validateCoordinates('28.47', '77.50'), [28.47, 77.5]);
});

test('no coordinates gives nulls', () => {
  assert.deepEqual(validateCoordinates(undefined, undefined), [null, null]);
});

test('only one coordinate is rejected', () => {
  assert.throws(() => validateCoordinates('28.47', undefined), /both/);
});

test('out of range is rejected', () => {
  assert.throws(() => validateCoordinates('120', '10'), /Latitude/);
  assert.throws(() => validateCoordinates('10', '200'), /Longitude/);
});

test('non-numeric is rejected', () => {
  assert.throws(() => validateCoordinates('abc', '10'), /numbers/);
});

test('reading has the expected fields', () => {
  const r = createReading(500, 28.47, 77.5);
  assert.equal(r.water_level_mm, 500);
  assert.equal(r.source, 'simulation');
  assert.ok(!Number.isNaN(Date.parse(r.timestamp)));
});

test('simulated level is in range', () => {
  for (let i = 0; i < 50; i++) {
    const v = getSimulatedWaterLevelMm();
    assert.ok(v >= 50 && v <= 900);
  }
});

test('water level from distance', () => {
  assert.equal(waterLevelFromDistance(2000, 1500), 500);
});
