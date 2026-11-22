import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { waitForPoweredOn, checkConnection, readCharacteristic } from '../src/bleConnection.js';

function fakeNoble({ withDevice = true, connectFails = false } = {}) {
  const characteristic = {
    uuid: '6e400003b5a3f393e0a9e50e24dcca9e',
    properties: ['read', 'notify'],
    readAsync: async () => Buffer.from('0101f45a0007', 'hex'),
  };
  const peripheral = {
    id: 'aa', address: 'aa:bb:cc:dd:ee:ff', rssi: -40,
    advertisement: { localName: 'WLD' }, state: 'disconnected',
    async connectAsync() { if (connectFails) throw new Error('boom'); this.state = 'connected'; },
    async discoverAllServicesAndCharacteristicsAsync() {
      return { services: [{ uuid: '6e400001b5a3f393e0a9e50e24dcca9e', characteristics: [characteristic] }], characteristics: [characteristic] };
    },
    async disconnectAsync() { this.state = 'disconnected'; },
  };
  const noble = Object.assign(new EventEmitter(), {
    state: 'poweredOn',
    async startScanningAsync() { if (withDevice) setTimeout(() => noble.emit('discover', peripheral), 10); },
    async stopScanningAsync() {},
    stop() {},
  });
  return { noble, peripheral };
}

test('resolves immediately when already poweredOn', async () => {
  await waitForPoweredOn(Object.assign(new EventEmitter(), { state: 'poweredOn' }), 100);
});

test('resolves when stateChange to poweredOn arrives later', async () => {
  const noble = Object.assign(new EventEmitter(), { state: 'unknown' });
  setTimeout(() => noble.emit('stateChange', 'poweredOn'), 20);
  await waitForPoweredOn(noble, 1000);
});

test('rejects on timeout', async () => {
  const noble = Object.assign(new EventEmitter(), { state: 'unknown' });
  await assert.rejects(waitForPoweredOn(noble, 50), /did not report poweredOn/);
});

test('checkConnection reports CONNECTED for a reachable device', async () => {
  const { noble, peripheral } = fakeNoble();
  const r = await checkConnection({ name: 'WLD', noble, scanTimeoutMs: 500 });
  assert.equal(r.connected, true);
  assert.equal(r.state, 'connected');
  assert.equal(peripheral.state, 'disconnected');
});

test('checkConnection reports NOT CONNECTED when the device is missing', async () => {
  const { noble } = fakeNoble({ withDevice: false });
  const r = await checkConnection({ name: 'WLD', noble, scanTimeoutMs: 100 });
  assert.equal(r.connected, false);
  assert.match(r.reason, /not found/);
});

test('checkConnection reports NOT CONNECTED when connect fails', async () => {
  const { noble } = fakeNoble({ connectFails: true });
  const r = await checkConnection({ name: 'WLD', noble, scanTimeoutMs: 500 });
  assert.equal(r.connected, false);
  assert.match(r.reason, /boom/);
});

test('readCharacteristic returns the raw bytes', async () => {
  const { noble } = fakeNoble();
  const raw = await readCharacteristic({ name: 'WLD', characteristicUuid: '6e400003-b5a3-f393-e0a9-e50e24dcca9e', noble, scanTimeoutMs: 500 });
  assert.equal(raw.toString('hex'), '0101f45a0007');
});
