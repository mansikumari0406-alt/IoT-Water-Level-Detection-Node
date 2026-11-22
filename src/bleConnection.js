// BLE scan/read helpers using @stoprocent/noble (native Windows binding, no dongle).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const normUuid = (u) => String(u).replace(/-/g, '').toLowerCase();
const debug = (...args) => {
  if (process.env.WLD_DEBUG) console.log('[debug]', ...args);
};

async function loadNoble() {
  try {
    const mod = await import('@stoprocent/noble');
    return mod.default ?? mod;
  } catch {
    throw new Error('BLE library missing. Install dependencies with: npm install mqtt @stoprocent/noble');
  }
}

// Wait until the adapter reports poweredOn. Windows can take a while to report it,
// so this checks the current state first and then waits for the stateChange event.
export function waitForPoweredOn(noble, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    debug('adapter state at start:', noble.state);
    if (noble.state === 'poweredOn') return resolve();
    const timer = setTimeout(() => {
      noble.removeListener('stateChange', onChange);
      reject(new Error(`Bluetooth did not report poweredOn within ${timeoutMs / 1000} s (state: ${noble.state}). Check that Bluetooth is on.`));
    }, timeoutMs);
    function onChange(state) {
      debug('adapter state changed to:', state);
      if (state === 'poweredOn') {
        clearTimeout(timer);
        noble.removeListener('stateChange', onChange);
        resolve();
      }
    }
    noble.on('stateChange', onChange);
  });
}

function describe(p) {
  const name = p.advertisement?.localName || '(unnamed)';
  return `Name: ${name} | Address: ${p.address || p.id} | RSSI: ${p.rssi}`;
}

export async function scanBleDevices(timeoutMs = 8000, { noble: injected } = {}) {
  const noble = injected ?? (await loadNoble());
  await waitForPoweredOn(noble);
  const seen = new Map();
  noble.on('discover', (p) => {
    if (!seen.has(p.id)) {
      seen.set(p.id, p);
      console.log(describe(p));
    }
  });
  await noble.startScanningAsync([], false);
  await sleep(timeoutMs);
  await noble.stopScanningAsync();
  if (seen.size === 0) console.log('No BLE devices found. Check Bluetooth and device power.');
  noble.stop();
  return [...seen.values()];
}

// Scan until a device with this advertised name (or id/address) shows up.
async function findPeripheral(noble, { name, id, scanTimeoutMs }) {
  const matches = (p) =>
    (name && p.advertisement?.localName === name) ||
    (id && [p.id, p.address].filter(Boolean).map((v) => v.toLowerCase()).includes(id.toLowerCase()));

  console.log(`Scanning for ${name || id} (${scanTimeoutMs / 1000} s)...`);
  const started = Date.now();
  const peripheral = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), scanTimeoutMs);
    noble.on('discover', (p) => {
      debug('discovered:', describe(p));
      if (matches(p)) {
        clearTimeout(timer);
        resolve(p);
      }
    });
    noble.startScanningAsync([], false).catch(() => resolve(null));
  });
  await noble.stopScanningAsync();
  debug(`scan finished after ${Date.now() - started} ms, found: ${Boolean(peripheral)}`);
  return peripheral;
}

// Quick "is it connected?" test: find the device, connect, confirm the state, disconnect.
export async function checkConnection({ name, id, scanTimeoutMs = 15000, noble: injected } = {}) {
  if (!name && !id) throw new Error('Provide a device name or id.');
  const noble = injected ?? (await loadNoble());
  await waitForPoweredOn(noble);
  const peripheral = await findPeripheral(noble, { name, id, scanTimeoutMs });
  if (!peripheral) {
    noble.stop();
    return { connected: false, reason: `${name || id} not found. Check that the phone app is advertising.` };
  }
  console.log('Found:', describe(peripheral));
  try {
    await peripheral.connectAsync();
    debug('peripheral.state after connect:', peripheral.state);
    const { services } = await peripheral.discoverAllServicesAndCharacteristicsAsync();
    return {
      connected: peripheral.state === 'connected',
      device: describe(peripheral),
      state: peripheral.state,
      services: services.map((s) => s.uuid),
    };
  } catch (err) {
    return { connected: false, reason: `Connection failed: ${err.message}` };
  } finally {
    try { await peripheral.disconnectAsync(); } catch { /* ignore */ }
    debug('peripheral.state after disconnect:', peripheral.state);
    noble.stop();
  }
}

// Find a device by advertised name (or id/address), connect, list services,
// read one characteristic and return its raw bytes.
// The device is found by NAME because phone BLE addresses change between runs.
export async function readCharacteristic({ name, id, characteristicUuid, scanTimeoutMs = 15000, noble: injected }) {
  if (!name && !id) throw new Error('Provide a device name or id.');
  const noble = injected ?? (await loadNoble());
  await waitForPoweredOn(noble);
  const peripheral = await findPeripheral(noble, { name, id, scanTimeoutMs });

  if (!peripheral) {
    noble.stop();
    throw new Error(`${name || id} not found. Check that the phone app is advertising.`);
  }

  console.log('Found:', describe(peripheral));
  try {
    await peripheral.connectAsync();
    console.log('Connected: true');
    debug('peripheral.state after connect:', peripheral.state);
    const { services, characteristics } = await peripheral.discoverAllServicesAndCharacteristicsAsync();
    for (const s of services) {
      console.log(`\nSERVICE ${s.uuid}`);
      for (const c of s.characteristics) {
        console.log(`  characteristic ${c.uuid} | properties: ${c.properties.join(', ')}`);
      }
    }
    // Two characteristics can share a UUID (as on the test phone); use the first readable one.
    const target = characteristics.find(
      (c) => normUuid(c.uuid) === normUuid(characteristicUuid) && c.properties.includes('read'),
    );
    if (!target) throw new Error(`Readable characteristic ${characteristicUuid} not found.`);
    const raw = await target.readAsync();
    debug(`read ${raw.length} bytes from ${target.uuid}`);
    return Buffer.from(raw);
  } finally {
    try { await peripheral.disconnectAsync(); } catch { /* ignore */ }
    debug('peripheral.state after disconnect:', peripheral.state);
    noble.stop();
  }
}
