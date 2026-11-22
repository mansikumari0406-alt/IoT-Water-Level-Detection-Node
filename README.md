# IoT Water Level Detection – Node.js version

Node.js port of the Python starter project. Flow:

**BLE device → read bytes → decode → add latitude/longitude → MQTT broker**

## Requirements
- Node.js 20 or newer (check with `node --version`)
- Windows 10/11 with Bluetooth for BLE tests
- VS Code

## Setup
```powershell
npm install mqtt @stoprocent/noble
copy .env.example .env
```
Edit `.env` if you use a different MQTT broker or topic. Never commit real passwords.

`@stoprocent/noble` has a native Windows binding, so no USB Bluetooth dongle is needed. If `npm install` fails to build it, install the Visual Studio Build Tools (C++ workload) and run it again.

## Commands
| What | Command |
|---|---|
| Simulation (no hardware) | `node src/main.js --simulate --latitude 28.47 --longitude 77.50` |
| Scan BLE devices | `node src/main.js --scan-ble` |
| **Check if the device is connected** | `node src/main.js --check-connection --ble-name WLD` |
| Debug output (adapter state, devices found, connection state) | add `--debug` to any command |
| Read a characteristic by device name | `node src/main.js --ble-name WLD --characteristic-uuid 6e400003-b5a3-f393-e0a9-e50e24dcca9e` |
| Read + decode with the TEST format + location | `node src/main.js --ble-name WLD --characteristic-uuid 6e400003-b5a3-f393-e0a9-e50e24dcca9e --decode-test --latitude 28.47 --longitude 77.50` |
| Same, and publish to MQTT | add `--publish-mqtt` |
| MQTT subscriber (run in a second terminal first) | `npm run subscribe` |
| Unit tests | `npm test` |

The device is found by **name** because a phone's Bluetooth address changes between runs.

## Debugging and checking the connection
- `--check-connection --ble-name WLD` finds the device, connects, confirms the connection state, disconnects, and prints **CONNECTED** or **NOT CONNECTED** with the reason (exit code 0 or 1).
- `--debug` prints `[debug]` lines: adapter state changes, every device discovered, scan time, the connection state after connect and disconnect, bytes read, and the MQTT broker and topic.
- Typical causes of NOT CONNECTED: the phone app is not advertising, the phone screen is off, Bluetooth is off in Windows, or the device name differs (check with `--scan-ble`).

## Python → Node mapping
| Python | Node.js |
|---|---|
| `main.py` | `src/main.js` |
| `ble_connection.py` (bleak) | `src/bleConnection.js` (@stoprocent/noble) |
| `data_decoder.py` | `src/dataDecoder.js` |
| `gps_location.py` | `src/gpsLocation.js` |
| `models.py` | `src/models.js` |
| `sensor_processing.py` | `src/sensorProcessing.js` |
| `mqtt_client.py` (paho-mqtt) | `src/mqttClient.js` (MQTT.js) |
| `config.py` | `src/config.js` + `.env` |
| `mqtt_subscribe.py` | `src/mqttSubscribe.js` |

## Test byte format (not an official spec)
Used only with the phone GATT test device. The real device layout must come from the project team.

| Byte(s) | Meaning | Rule |
|---|---|---|
| 0 | Packet type | 1 byte |
| 1–2 | Water level (mm) | 2 bytes, big-endian |
| 3 | Battery % | 1 byte |
| 4–5 | Sensor ID | 2 bytes, big-endian |

Example: `01 01 F4 5A 00 07` gives type 1, 500 mm, 90 %, sensor 7.

## Notes
- `decodeSensorPayload()` returns raw metadata only. Do not invent a byte mapping for the real device.
- A laptop has no GPS; pass coordinates from an approved source.
- A public MQTT broker can be read by anyone: send only test data and rounded coordinates.
- See `documentation/HARDWARE_CHECKLIST.md` for what to request from the team.

## Test status of this port
- Tested on the laptop with the phone as the BLE device: simulation, BLE connect/read/decode, and MQTT publish/subscribe.
- Unit tests (`npm test`) cover the decoder, location checks, data model and the connection logic using a fake BLE device.
- Record your own results in `documentation/PROGRESS_LOG.md`.
