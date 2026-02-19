/**
 * Custom Reporter
 *
 * Implement the Reporter interface to send drift reports anywhere:
 * a database, a logging service, a file, etc.
 *
 * Run: npx ts-node examples/custom-reporter.ts
 * Test: curl http://localhost:3000/pets/1
 */
import express from 'express';
import { contractlens } from 'contractlens';
import type { Reporter, DriftReport } from 'contractlens';

// Custom reporter that writes drift reports as structured JSON logs
const jsonLogger: Reporter = {
  name: 'json-logger',
  report(drift: DriftReport): void {
    const log = {
      level: drift.summary.breaking > 0 ? 'error' : 'warn',
      msg: 'contract_drift',
      method: drift.method,
      path: drift.path,
      statusCode: drift.statusCode,
      breaking: drift.summary.breaking,
      warnings: drift.summary.warnings,
      drifts: drift.drifts.map((d) => ({
        type: d.type,
        field: d.field,
        severity: d.severity,
      })),
      timestamp: drift.timestamp,
    };
    console.log(JSON.stringify(log));
  },
};

const app = express();

app.use(contractlens({
  spec: './examples/petstore.yaml',
  reporters: [jsonLogger],
}));

// Response with drift: "status" is missing (required) and "cached" is extra
app.get('/pets/:petId', (_req, res) => {
  res.json({ id: 1, name: 'Buddy', cached: true });
});

app.listen(3000, () => {
  console.log('Custom reporter example running on http://localhost:3000');
  console.log('Try: curl http://localhost:3000/pets/1');
  console.log('Watch for structured JSON drift logs in the console.');
});
