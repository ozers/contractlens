import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import path from 'path';
import { contractlens } from '../src/middleware/express.js';

const SPEC_PATH = path.join(__dirname, 'fixtures', 'petstore.yaml');

describe('contractlens middleware', () => {
  it('should pass through valid responses in warn mode', async () => {
    const app = express();
    app.use(contractlens({ spec: SPEC_PATH, mode: 'warn' }));
    app.get('/pets/:petId', (_req, res) => {
      res.json({ id: 1, name: 'Buddy', status: 'available' });
    });

    const res = await request(app).get('/pets/1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, name: 'Buddy', status: 'available' });
  });

  it('should return 500 on drift in strict mode', async () => {
    const app = express();
    app.use(contractlens({ spec: SPEC_PATH, mode: 'strict' }));
    app.get('/pets/:petId', (_req, res) => {
      // type mismatch: id should be integer, sending string
      res.json({ id: '1', name: 'Buddy', status: 'deleted' });
    });

    const res = await request(app).get('/pets/1');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Contract drift detected' });
  });

  it('should pass through valid responses in strict mode', async () => {
    const app = express();
    app.use(contractlens({ spec: SPEC_PATH, mode: 'strict' }));
    app.get('/pets/:petId', (_req, res) => {
      res.json({ id: 1, name: 'Buddy', status: 'available' });
    });

    const res = await request(app).get('/pets/1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, name: 'Buddy', status: 'available' });
  });

  it('should skip excluded paths', async () => {
    const app = express();
    app.use(contractlens({ spec: SPEC_PATH, mode: 'strict', exclude: ['/health'] }));
    app.get('/health', (_req, res) => {
      res.json({ ok: true });
    });

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('should skip excluded paths with wildcard', async () => {
    const app = express();
    app.use(contractlens({ spec: SPEC_PATH, mode: 'strict', exclude: ['/internal/*'] }));
    app.get('/internal/debug', (_req, res) => {
      res.json({ debug: true });
    });

    const res = await request(app).get('/internal/debug');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ debug: true });
  });

  it('should call custom reporter on drift in strict mode', async () => {
    const reports: unknown[] = [];
    const customReporter = {
      name: 'test',
      report(report: unknown) {
        reports.push(report);
      },
    };

    const app = express();
    app.use(contractlens({
      spec: SPEC_PATH,
      mode: 'strict',
      reporters: [customReporter],
    }));
    app.get('/pets/:petId', (_req, res) => {
      res.json({ id: '1', name: 'Buddy', status: 'deleted' });
    });

    await request(app).get('/pets/1');
    expect(reports.length).toBe(1);
  });
});
