import type { Request, Response, NextFunction } from 'express';
import type {
  ContractLensOptions,
  ContractLensMiddleware,
  ParsedSpec,
  Reporter,
  DriftReport,
} from '../core/types.js';
import { loadSpec } from '../core/spec-loader.js';
import { detectDrift } from '../core/drift-detector.js';
import { ConsoleReporter } from '../reporters/console.js';
import { WebhookReporter } from '../reporters/webhook.js';

function matchesExclude(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2);
      return path.startsWith(prefix);
    }
    return path === pattern;
  });
}

function normalizePathToOpenAPI(expressPath: string): string {
  return expressPath.replace(/:([^/]+)/g, '{$1}');
}

function buildReporters(options: ContractLensOptions): Reporter[] {
  const configs = options.reporters ?? ['console'];
  const reporters: Reporter[] = [];

  for (const config of configs) {
    if (config === 'console') {
      reporters.push(new ConsoleReporter());
    } else if (config === 'webhook') {
      if (options.webhookUrl) {
        reporters.push(new WebhookReporter(options.webhookUrl));
      }
    } else {
      reporters.push(config);
    }
  }

  return reporters;
}

export function contractlens(options: ContractLensOptions): ContractLensMiddleware {
  const mode = options.mode ?? 'warn';
  const sampleRate = options.sampleRate ?? 1.0;
  const exclude = options.exclude ?? [];
  const reporters = buildReporters(options);

  let specPromise: Promise<ParsedSpec> | undefined;

  function getSpec(): Promise<ParsedSpec> {
    if (!specPromise) {
      const specInput = options.spec;
      if (typeof specInput === 'string') {
        specPromise = loadSpec(specInput);
      } else {
        specPromise = Promise.resolve({
          routes: new Map(),
          raw: specInput,
        });
      }
    }
    return specPromise;
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    if (matchesExclude(req.path, exclude)) {
      next();
      return;
    }

    if (Math.random() >= sampleRate) {
      next();
      return;
    }

    const originalJson = res.json.bind(res);

    res.json = function interceptedJson(body: unknown): Response {
      const routePath = (req.route?.path as string | undefined) ?? req.path;
      const openApiPath = normalizePathToOpenAPI(routePath);
      const method = req.method.toUpperCase();
      const statusCode = res.statusCode;

      if (mode === 'strict') {
        getSpec()
          .then((spec) => {
            const drifts = detectDrift(spec, method, openApiPath, statusCode, body);
            if (drifts.length > 0) {
              const report = buildReport(method, routePath, req.originalUrl, statusCode, drifts);
              notifyReporters(reporters, report);
              res.status(500);
              return originalJson({ error: 'Contract drift detected' });
            }
            return originalJson(body);
          })
          .catch(() => originalJson(body));
      } else {
        const result = originalJson(body);
        const capturedBody = body;

        process.nextTick(() => {
          getSpec()
            .then((spec) => {
              const drifts = detectDrift(spec, method, openApiPath, statusCode, capturedBody);
              if (drifts.length > 0) {
                const report = buildReport(method, routePath, req.originalUrl, statusCode, drifts);
                notifyReporters(reporters, report);
              }
            })
            .catch(() => {
              // fail silently
            });
        });

        return result;
      }

      return res;
    };

    next();
  };
}

function buildReport(
  method: string,
  path: string,
  url: string,
  statusCode: number,
  drifts: import('../core/types.js').Drift[]
): DriftReport {
  const breaking = drifts.filter((d) => d.severity === 'breaking').length;
  return {
    timestamp: new Date().toISOString(),
    method,
    path,
    url,
    statusCode,
    drifts,
    summary: {
      total: drifts.length,
      breaking,
      warnings: drifts.length - breaking,
    },
  };
}

function notifyReporters(reporters: Reporter[], report: DriftReport): void {
  for (const reporter of reporters) {
    try {
      void reporter.report(report);
    } catch {
      // never crash the host app
    }
  }
}
