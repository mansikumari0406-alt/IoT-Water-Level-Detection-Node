// MQTT subscriber: prints every message received on the topic.
import { mqttSettings } from './mqttClient.js';

let mqtt;
try {
  const mod = await import('mqtt');
  mqtt = mod.default ?? mod;
} catch {
  console.error('MQTT library missing. Install dependencies with: npm install mqtt @stoprocent/noble');
  process.exit(1);
}

const s = mqttSettings();
const client = await mqtt.connectAsync(`mqtt://${s.host}:${s.port}`, {
  username: s.username,
  password: s.password,
});
console.log('Connected to broker:', s.host);
await client.subscribeAsync(s.topic);
console.log('Waiting for messages on', s.topic);

client.on('message', (topic, message) => {
  console.log(`\nReceived on ${topic}`);
  try {
    console.log(JSON.stringify(JSON.parse(message.toString()), null, 2));
  } catch {
    console.log(message.toString());
  }
});

process.on('SIGINT', async () => {
  await client.endAsync();
  process.exit(0);
});
