// Entry point for the IoT Water Level Detection project (Node.js).
import { parseArgs } from 'node:util';
import './config.js';
import { decodeSensorPayload, decodeTestFormat, rawBytesToHex } from './dataDecoder.js';
import { validateCoordinates } from './gpsLocation.js';
import { createReading } from './models.js';
import { getSimulatedWaterLevelMm } from './sensorProcessing.js';

const HELP = `IoT water-level training project (Node.js)

Usage:
  node src/main.js --simulate [--latitude 28.47 --longitude 77.50] [--publish-mqtt]
  node src/main.js --scan-ble
  node src/main.js --check-connection --ble-name WLD [--debug]
  node src/main.js --ble-name WLD --characteristic-uuid <uuid> [--decode-test] [--latitude .. --longitude ..] [--publish-mqtt]

Options:
  --simulate               generate a fake sample reading
  --scan-ble               scan nearby BLE devices
  --ble-name <name>        advertised name of the BLE device (for example WLD)
  --ble-id <id>            device id/address instead of a name
  --characteristic-uuid    readable characteristic UUID
  --decode-test            decode bytes with the TEST format (not an official spec)
  --latitude / --longitude coordinates from an approved source
  --publish-mqtt           publish the result to the configured MQTT broker
  --check-connection       find the device by --ble-name, connect and report CONNECTED / NOT CONNECTED
  --debug                  print extra [debug] lines (adapter state, devices found, connection state)
`;

function parse() {
  return parseArgs({
    options: {
      simulate: { type: 'boolean' },
      'scan-ble': { type: 'boolean' },
      'ble-name': { type: 'string' },
      'ble-id': { type: 'string' },
      'characteristic-uuid': { type: 'string' },
      'decode-test': { type: 'boolean' },
      latitude: { type: 'string' },
      longitude: { type: 'string' },
      'publish-mqtt': { type: 'boolean' },
      'check-connection': { type: 'boolean' },
      debug: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  }).values;
}

async function main() {
  const args = parse();
  if (args.help) {
    console.log(HELP);
    return;
  }

  if (args.debug) process.env.WLD_DEBUG = '1';

  if (args['check-connection']) {
    if (!args['ble-name'] && !args['ble-id']) throw new Error('Provide --ble-name (or --ble-id).');
    const { checkConnection } = await import('./bleConnection.js');
    const result = await checkConnection({ name: args['ble-name'], id: args['ble-id'] });
    if (result.connected) {
      console.log('\nCONNECTED');
      console.log('Device  :', result.device);
      console.log('State   :', result.state);
      console.log('Services:', result.services.join(', '));
    } else {
      console.log('\nNOT CONNECTED');
      console.log('Reason  :', result.reason);
      process.exitCode = 1;
    }
    return;
  }

  if (args['scan-ble']) {
    const { scanBleDevices } = await import('./bleConnection.js');
    await scanBleDevices();
    return;
  }

  const [latitude, longitude] = validateCoordinates(args.latitude, args.longitude);

  if (args['ble-name'] || args['ble-id'] || args['characteristic-uuid']) {
    if (!(args['ble-name'] || args['ble-id']) || !args['characteristic-uuid']) {
      throw new Error('Provide --ble-name (or --ble-id) together with --characteristic-uuid.');
    }
    const { readCharacteristic } = await import('./bleConnection.js');
    const raw = await readCharacteristic({
      name: args['ble-name'],
      id: args['ble-id'],
      characteristicUuid: args['characteristic-uuid'],
    });
    console.log(`\nRaw bytes (hex): ${rawBytesToHex(raw)}`);

    let payload;
    if (args['decode-test']) {
      payload = {
        ...decodeTestFormat(raw),
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
        source: 'test-device (phone GATT app)',
      };
    } else {
      payload = decodeSensorPayload(raw);
    }
    console.log(JSON.stringify(payload, null, 2));
    if (args['publish-mqtt']) {
      const { publishMessage } = await import('./mqttClient.js');
      await publishMessage(payload);
    }
    return;
  }

  if (!args.simulate) {
    console.log(HELP);
    throw new Error('Choose --simulate, --scan-ble, or provide a BLE name and characteristic UUID.');
  }

  const reading = createReading(getSimulatedWaterLevelMm(), latitude, longitude);
  console.log('SIMULATED READING (not from physical sensor):');
  console.log(JSON.stringify(reading, null, 2));
  if (args['publish-mqtt']) {
    const { publishMessage } = await import('./mqttClient.js');
    await publishMessage(reading);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
