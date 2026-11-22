// BLE payload decoding.
//
// decodeSensorPayload(): returns raw metadata only, because the official byte
// protocol of the real device has not been provided. Do not invent a mapping.
//
// decodeTestFormat(): decodes the TEST FORMAT used with the phone GATT test device.
// It is a layout defined for practice, NOT an official device specification:
//   byte 0      packet type            (1 byte, unsigned)
//   bytes 1-2   water level in mm      (2 bytes, big-endian)
//   byte 3      battery percent        (1 byte, unsigned)
//   bytes 4-5   sensor id              (2 bytes, big-endian)

export function rawBytesToHex(raw) {
  return Array.from(raw, (b) => b.toString(16).padStart(2, '0')).join(' ').toUpperCase();
}

export function decodeSensorPayload(raw) {
  return {
    raw_hex: rawBytesToHex(raw),
    length_bytes: raw.length,
    decoded: false,
    note: 'Byte mapping not implemented: obtain the official device protocol.',
  };
}

export function decodeTestFormat(raw) {
  const buf = Buffer.from(raw);
  if (buf.length < 6) {
    throw new Error(`Test format needs 6 bytes, got ${buf.length}.`);
  }
  return {
    raw_hex: rawBytesToHex(buf).toLowerCase(),
    packet_type: buf.readUInt8(0),
    water_level_mm: buf.readUInt16BE(1),
    battery_percent: buf.readUInt8(3),
    sensor_id: buf.readUInt16BE(4),
  };
}
