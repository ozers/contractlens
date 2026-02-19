/**
 * Strict Mode — Fail on Drift
 *
 * Returns 500 when the response doesn't match the OpenAPI spec.
 * Use this in CI/staging to catch contract violations early.
 *
 * Run: npx ts-node examples/strict-mode.ts
 * Test: curl http://localhost:3000/pets/1
 */
import express from 'express';
import { contractlens } from 'contractlens';

const app = express();

app.use(contractlens({
  spec: './examples/petstore.yaml',
  mode: 'strict',
}));

// This will return 500 because "status" is required but missing,
// and "id" is a string instead of integer.
app.get('/pets/:petId', (_req, res) => {
  res.json({ id: '1', name: 'Buddy' });
});

// This matches the spec — returns normally.
app.post('/pets', express.json(), (_req, res) => {
  res.status(201).json({ id: 3, name: 'Luna', status: 'available' });
});

app.listen(3001, () => {
  console.log('Strict mode example running on http://localhost:3001');
  console.log('Try:');
  console.log('  curl http://localhost:3001/pets/1                                    # 500 — drift detected');
  console.log('  curl -X POST -H "Content-Type: application/json" -d \'{"name":"Luna"}\' http://localhost:3001/pets  # 201 — valid');
});
