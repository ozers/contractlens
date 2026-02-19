/**
 * Basic Usage — Warn Mode (default)
 *
 * Logs contract drift to the console without blocking responses.
 * Ideal for local development.
 *
 * Run: npx ts-node examples/basic-usage.ts
 * Test: curl http://localhost:3000/pets/1
 */
import express from 'express';
import { contractlens } from 'contractlens';

const app = express();

// One line — that's it.
app.use(contractlens({ spec: './examples/petstore.yaml' }));

// This response matches the spec perfectly — no drift.
app.get('/pets/:petId', (_req, res) => {
  res.json({ id: 1, name: 'Buddy', status: 'available' });
});

// This response has drift:
// - "internalId" is an extra field (warning)
// - "status" is missing (breaking)
app.get('/pets', (_req, res) => {
  res.json([
    { id: 1, name: 'Buddy', internalId: 'abc-123' },
    { id: 2, name: 'Max', status: 'available' },
  ]);
});

app.listen(3000, () => {
  console.log('Basic example running on http://localhost:3000');
  console.log('Try:');
  console.log('  curl http://localhost:3000/pets/1   # no drift');
  console.log('  curl http://localhost:3000/pets      # drift detected');
});
