/**
 * Production Setup — Sampling + Webhook
 *
 * Validates only 5% of requests and sends drift reports to a webhook URL.
 * Zero performance impact on the majority of traffic.
 *
 * Run: npx ts-node examples/production-setup.ts
 * Test: curl http://localhost:3000/pets/1
 */
import express from 'express';
import { contractlens } from 'contractlens';

const app = express();

app.use(contractlens({
  spec: './examples/petstore.yaml',
  mode: 'log',
  sampleRate: 0.05,
  reporters: ['console', 'webhook'],
  webhookUrl: process.env['WEBHOOK_URL'] ?? 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
  exclude: ['/health', '/metrics', '/internal/*'],
}));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' }); // excluded from validation
});

app.get('/pets/:petId', (_req, res) => {
  res.json({ id: 1, name: 'Buddy', status: 'available' });
});

app.listen(3000, () => {
  console.log('Production example running on http://localhost:3000');
  console.log('Only ~5% of requests will be validated.');
  console.log('Set WEBHOOK_URL env var to receive drift alerts.');
});
