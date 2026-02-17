import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { ParsedSpec, ValidationResult, Drift } from './types.js';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function normalizePathToOpenAPI(expressPath: string): string {
  return expressPath.replace(/:([^/]+)/g, '{$1}');
}

export function validateResponse(
  spec: ParsedSpec,
  method: string,
  path: string,
  statusCode: number,
  body: unknown
): ValidationResult {
  const normalizedPath = normalizePathToOpenAPI(path);
  const key = `${method.toUpperCase()} ${normalizedPath}`;
  const route = spec.routes.get(key);

  if (!route) return { valid: true, drifts: [] };

  const responseSchema = route.responses[String(statusCode)];
  if (!responseSchema?.schema) return { valid: true, drifts: [] };

  const validate = ajv.compile(responseSchema.schema);
  const valid = validate(body);

  if (valid) return { valid: true, drifts: [] };

  const drifts: Drift[] = (validate.errors ?? []).map((err) => {
    const field = (err.instancePath || '').replace(/^\//, '').replace(/\//g, '.');
    return {
      type: 'type_mismatch' as const,
      field: field || 'root',
      expected: err.params?.['type'] ?? err.message,
      actual: body,
      severity: 'breaking' as const,
      message: `Validation error at "${field || 'root'}": ${err.message ?? 'unknown error'}`,
    };
  });

  return { valid: false, drifts };
}
