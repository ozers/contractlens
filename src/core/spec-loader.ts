import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import yaml from 'js-yaml';
import type { ParsedSpec, RouteSchema, ResponseSchema } from './types.js';

const cache = new Map<string, ParsedSpec>();

/**
 * Resolve all local `$ref` pointers (e.g. `#/components/schemas/Pet`)
 * by replacing them with the referenced object from the spec root.
 */
function resolveRefs(node: unknown, root: Record<string, unknown>): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => resolveRefs(item, root));
  }

  if (node !== null && typeof node === 'object') {
    const obj = node as Record<string, unknown>;

    if (typeof obj['$ref'] === 'string') {
      const ref = obj['$ref'];
      if (ref.startsWith('#/')) {
        const resolved = followRef(ref, root);
        return resolveRefs(resolved, root);
      }
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveRefs(value, root);
    }
    return result;
  }

  return node;
}

function followRef(ref: string, root: Record<string, unknown>): unknown {
  const parts = ref.slice(2).split('/'); // strip leading "#/"
  let current: unknown = root;
  for (const part of parts) {
    if (current === null || typeof current !== 'object') {
      throw new Error(`Cannot resolve $ref "${ref}": path segment "${part}" not found`);
    }
    current = (current as Record<string, unknown>)[part];
  }
  if (current === undefined) {
    throw new Error(`Cannot resolve $ref "${ref}": target not found`);
  }
  return current;
}

export async function loadSpec(specPath: string): Promise<ParsedSpec> {
  const cached = cache.get(specPath);
  if (cached) return cached;

  const content = await readFile(specPath, 'utf-8');
  const ext = extname(specPath).toLowerCase();

  let rawUnresolved: Record<string, unknown>;
  if (ext === '.json') {
    rawUnresolved = JSON.parse(content) as Record<string, unknown>;
  } else {
    rawUnresolved = yaml.load(content) as Record<string, unknown>;
  }

  const raw = resolveRefs(rawUnresolved, rawUnresolved) as Record<string, unknown>;
  const routes = new Map<string, RouteSchema>();

  const paths = raw['paths'] as Record<string, Record<string, unknown>> | undefined;
  if (paths) {
    for (const [pathPattern, pathItem] of Object.entries(paths)) {
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;
      for (const method of methods) {
        const operation = pathItem[method] as Record<string, unknown> | undefined;
        if (!operation) continue;

        const responses: Record<string, ResponseSchema> = {};
        const opResponses = operation['responses'] as Record<string, Record<string, unknown>> | undefined;

        if (opResponses) {
          for (const [statusCode, responseDef] of Object.entries(opResponses)) {
            const content = responseDef['content'] as Record<string, Record<string, unknown>> | undefined;
            const jsonContent = content?.['application/json'];
            const schema = jsonContent?.['schema'] as Record<string, unknown> | undefined;

            responses[statusCode] = {
              statusCode,
              schema,
              headers: responseDef['headers'] as Record<string, unknown> | undefined,
            };
          }
        }

        const key = `${method.toUpperCase()} ${pathPattern}`;
        routes.set(key, {
          method: method.toUpperCase(),
          path: pathPattern,
          responses,
        });
      }
    }
  }

  const parsed: ParsedSpec = { routes, raw };
  cache.set(specPath, parsed);
  return parsed;
}
