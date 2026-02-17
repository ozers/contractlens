import type { Drift, ParsedSpec } from './types.js';

export function detectDrift(
  spec: ParsedSpec,
  method: string,
  path: string,
  statusCode: number,
  body: unknown
): Drift[] {
  const key = `${method.toUpperCase()} ${path}`;
  const route = spec.routes.get(key);
  if (!route) return [];

  const responseSchema = route.responses[String(statusCode)];
  if (!responseSchema?.schema) return [];

  const drifts: Drift[] = [];
  walkObject(body, responseSchema.schema, '', drifts);
  return drifts;
}

function getJsonType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function matchesType(value: unknown, schemaType: string): boolean {
  const actualType = getJsonType(value);
  if (schemaType === 'integer') {
    return typeof value === 'number' && Number.isInteger(value);
  }
  if (schemaType === 'number') {
    return typeof value === 'number';
  }
  return actualType === schemaType;
}

function walkObject(
  actual: unknown,
  schema: Record<string, unknown>,
  path: string,
  drifts: Drift[]
): void {
  if (actual === null || actual === undefined || typeof actual !== 'object') return;

  const schemaType = schema['type'] as string | undefined;

  if (schemaType === 'array' && Array.isArray(actual)) {
    const itemsSchema = schema['items'] as Record<string, unknown> | undefined;
    if (itemsSchema) {
      for (let i = 0; i < actual.length; i++) {
        const itemPath = path ? `${path}[${i}]` : `[${i}]`;
        walkObject(actual[i], itemsSchema, itemPath, drifts);
      }
    }
    return;
  }

  if (schemaType !== 'object' && schemaType !== undefined) return;

  const properties = schema['properties'] as Record<string, Record<string, unknown>> | undefined;
  const required = schema['required'] as string[] | undefined;

  if (!properties) return;

  const actualObj = actual as Record<string, unknown>;

  // Check for extra fields
  for (const key of Object.keys(actualObj)) {
    if (!(key in properties)) {
      const fieldPath = path ? `${path}.${key}` : key;
      drifts.push({
        type: 'extra_field',
        field: fieldPath,
        actual: actualObj[key],
        severity: 'warning',
        message: `Field "${fieldPath}" is not defined in the API spec`,
      });
    }
  }

  // Check for missing required fields
  if (required) {
    for (const key of required) {
      if (!(key in actualObj)) {
        const fieldPath = path ? `${path}.${key}` : key;
        drifts.push({
          type: 'missing_field',
          field: fieldPath,
          expected: properties[key]?.['type'],
          severity: 'breaking',
          message: `Required field "${fieldPath}" is missing from the response`,
        });
      }
    }
  }

  // Check each property for type mismatches and enum violations
  for (const [key, propSchema] of Object.entries(properties)) {
    if (!(key in actualObj)) continue;

    const value = actualObj[key];
    const fieldPath = path ? `${path}.${key}` : key;
    const propType = propSchema['type'] as string | undefined;

    // Type mismatch check
    if (propType && value !== null && value !== undefined) {
      if (!matchesType(value, propType)) {
        drifts.push({
          type: 'type_mismatch',
          field: fieldPath,
          expected: propType,
          actual: getJsonType(value),
          severity: 'breaking',
          message: `Field "${fieldPath}" expected type "${propType}" but got "${getJsonType(value)}"`,
        });
        continue;
      }
    }

    // Enum violation check
    const enumValues = propSchema['enum'] as unknown[] | undefined;
    if (enumValues && value !== null && value !== undefined) {
      if (!enumValues.includes(value)) {
        drifts.push({
          type: 'enum_violation',
          field: fieldPath,
          expected: enumValues,
          actual: value,
          severity: 'breaking',
          message: `Field "${fieldPath}" value "${String(value)}" is not in allowed enum values: ${enumValues.join(', ')}`,
        });
      }
    }

    // Recurse into nested objects/arrays
    if (value !== null && value !== undefined && typeof value === 'object') {
      walkObject(value, propSchema, fieldPath, drifts);
    }
  }
}
