import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeSensorPayload, decodeTestFormat, rawBytesToHex } from '../src/dataDecoder.js';

test('rawBytesToHex formats bytes', () => {
  assert.equal(rawBytesToHex(Buffer.from([1, 1, 0xf4, 0x5a, 0, 7])), '01 01 F4 5A 00 07');
});

test('decodeTestFormat decodes the practice packet', () => {
  const out = decodeTestFormat(Buffer.from('0101f45a0007', 'hex'));
  assert.deepEqual(out, {
    raw_hex: '01 01 f4 5a 00 07',
    packet_type: 1,
    water_level_mm: 500,
    battery_percent: 90,
    sensor_id: 7,
  });
});

test('decodeTestFormat rejects short packets', () => {
  assert.throws(() => decodeTestFormat(Buffer.from([1, 2, 3])), /6 bytes/);
});

test('decodeSensorPayload does not invent a mapping', () => {
  const out = decodeSensorPayload(Buffer.from([1, 2]));
  assert.equal(out.decoded, false);
  assert.equal(out.length_bytes, 2);
});
