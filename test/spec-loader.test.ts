import { describe, it, expect } from 'vitest';
import path from 'path';
import { loadSpec } from '../src/core/spec-loader.js';

const SPEC_PATH = path.join(__dirname, 'fixtures', 'petstore.yaml');

describe('spec-loader', () => {
  it('should load and parse a YAML spec', async () => {
    const spec = await loadSpec(SPEC_PATH);
    expect(spec.routes.size).toBeGreaterThan(0);
    expect(spec.raw).toBeDefined();
  });

  it('should build correct route keys', async () => {
    const spec = await loadSpec(SPEC_PATH);
    expect(spec.routes.has('GET /pets')).toBe(true);
    expect(spec.routes.has('POST /pets')).toBe(true);
    expect(spec.routes.has('GET /pets/{petId}')).toBe(true);
    expect(spec.routes.has('GET /users/{userId}')).toBe(true);
  });

  it('should resolve $ref pointers', async () => {
    const spec = await loadSpec(SPEC_PATH);
    const route = spec.routes.get('GET /pets/{petId}');
    const schema = route?.responses['200']?.schema;

    // $ref should be resolved — schema should have properties directly
    expect(schema).toBeDefined();
    expect(schema?.['properties']).toBeDefined();
    expect(schema?.['$ref']).toBeUndefined();
  });

  it('should resolve nested $ref in array items', async () => {
    const spec = await loadSpec(SPEC_PATH);
    const route = spec.routes.get('GET /pets');
    const schema = route?.responses['200']?.schema;

    expect(schema?.['type']).toBe('array');
    const items = schema?.['items'] as Record<string, unknown>;
    expect(items?.['properties']).toBeDefined();
    expect(items?.['$ref']).toBeUndefined();
  });

  it('should parse response schemas with status codes', async () => {
    const spec = await loadSpec(SPEC_PATH);
    const route = spec.routes.get('GET /pets/{petId}');

    expect(route?.responses['200']).toBeDefined();
    expect(route?.responses['404']).toBeDefined();
    expect(route?.responses['200'].statusCode).toBe('200');
    expect(route?.responses['404'].statusCode).toBe('404');
  });

  it('should throw for non-existent spec file', async () => {
    await expect(loadSpec('/nonexistent/spec.yaml')).rejects.toThrow();
  });
});
