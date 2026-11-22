// MQTT publisher (MQTT.js).
import { DEFAULT_MQTT_PORT, DEFAULT_MQTT_TOPIC } from './config.js';

async function loadMqtt() {
  try {
    const mod = await import('mqtt');
    return mod.default ?? mod;
  } catch {
    throw new Error('MQTT library missing. Install dependencies with: npm install mqtt @stoprocent/noble');
  }
}

export function mqttSettings() {
  const host = process.env.MQTT_HOST;
  if (!host || host === 'YOUR_BROKER_HOST') {
    throw new Error('Set MQTT_HOST (in .env or the terminal) to your broker address first.');
  }
  return {
    host,
    port: Number(process.env.MQTT_PORT ?? DEFAULT_MQTT_PORT),
    topic: process.env.MQTT_TOPIC ?? DEFAULT_MQTT_TOPIC,
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
  };
}

export async function publishMessage(payload, topic) {
  const mqtt = await loadMqtt();
  const s = mqttSettings();
  const useTopic = topic ?? s.topic;
  if (process.env.WLD_DEBUG) console.log('[debug] MQTT broker:', `${s.host}:${s.port}`, 'topic:', useTopic);
  const client = await mqtt.connectAsync(`mqtt://${s.host}:${s.port}`, {
    username: s.username,
    password: s.password,
    keepalive: 30,
    connectTimeout: 10_000,
  });
  try {
    if (process.env.WLD_DEBUG) console.log('[debug] MQTT connected:', client.connected);
    await client.publishAsync(useTopic, JSON.stringify(payload), { qos: 1 });
    console.log(`Published to ${useTopic}`);
  } finally {
    await client.endAsync();
  }
}
