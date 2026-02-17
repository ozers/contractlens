import SwaggerParser from '@apidevtools/swagger-parser';
import type { ParsedSpec, RouteSchema, ResponseSchema } from './types.js';

const cache = new Map<string, ParsedSpec>();

export async function loadSpec(specPath: string): Promise<ParsedSpec> {
  const cached = cache.get(specPath);
  if (cached) return cached;

  const raw = (await SwaggerParser.dereference(specPath)) as Record<string, unknown>;
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
