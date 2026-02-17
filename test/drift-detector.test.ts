import { describe, it, expect } from 'vitest';
import { detectDrift } from '../src/core/drift-detector.js';
import { loadSpec } from '../src/core/spec-loader.js';
import path from 'path';

const SPEC_PATH = path.join(__dirname, 'fixtures', 'petstore.yaml');

describe('drift-detector', () => {
  it('should detect no drift when response matches spec', async () => {
    const spec = await loadSpec(SPEC_PATH);
    const drifts = detectDrift(spec, 'GET', '/pets/{petId}', 200, {
      id: 1,
      name: 'Buddy',
      status: 'available',
    });
    expect(drifts).toHaveLength(0);
  });

  it('should detect extra fields not in spec', async () => {
    const spec = await loadSpec(SPEC_PATH);
    const drifts = detectDrift(spec, 'GET', '/pets/{petId}', 200, {
      id: 1,
      name: 'Buddy',
      status: 'available',
      internalCacheKey: 'abc123', // NOT in spec
    });
    const extra = drifts.find((d) => d.type === 'extra_field');
    expect(extra).toBeDefined();
    expect(extra?.field).toBe('internalCacheKey');
    expect(extra?.severity).toBe('warning');
  });

  it('should detect missing required fields', async () => {
    const spec = await loadSpec(SPEC_PATH);
    const drifts = detectDrift(spec, 'GET', '/users/{userId}', 200, {
      id: 1,
      name: 'Özer',
      // email is MISSING but required in spec
    });
    const missing = drifts.find((d) => d.type === 'missing_field');
    expect(missing).toBeDefined();
    expect(missing?.field).toBe('email');
    expect(missing?.severity).toBe('breaking');
  });

  it('should detect type mismatches', async () => {
    const spec = await loadSpec(SPEC_PATH);
    const drifts = detectDrift(spec, 'GET', '/pets/{petId}', 200, {
      id: '1', // Should be integer, got string
      name: 'Buddy',
      status: 'available',
    });
    const mismatch = drifts.find((d) => d.type === 'type_mismatch');
    expect(mismatch).toBeDefined();
    expect(mismatch?.field).toBe('id');
    expect(mismatch?.severity).toBe('breaking');
  });

  it('should detect enum violations', async () => {
    const spec = await loadSpec(SPEC_PATH);
    const drifts = detectDrift(spec, 'GET', '/pets/{petId}', 200, {
      id: 1,
      name: 'Buddy',
      status: 'deleted', // Not in enum: available, pending, sold
    });
    const violation = drifts.find((d) => d.type === 'enum_violation');
    expect(violation).toBeDefined();
    expect(violation?.field).toBe('status');
    expect(violation?.severity).toBe('breaking');
  });

  it('should return empty array for unknown routes', async () => {
    const spec = await loadSpec(SPEC_PATH);
    const drifts = detectDrift(spec, 'GET', '/unknown', 200, { foo: 'bar' });
    expect(drifts).toHaveLength(0);
  });
});
