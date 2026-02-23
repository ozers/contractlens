import type { Request, Response, NextFunction } from 'express';

// ─── Configuration ────────────────────────────────────────

export interface ContractLensOptions {
  /**
   * Path to OpenAPI spec file (YAML or JSON) or inline spec object
   */
  spec: string | Record<string, unknown>;

  /**
   * Validation mode:
   * - 'warn': Log warnings, don't block response (default, for dev)
   * - 'strict': Throw error on contract drift (for CI/staging)
   * - 'log': Silent logging only via reporters (for production)
   */
  mode?: 'warn' | 'strict' | 'log';

  /**
   * Fraction of requests to validate (0.0 - 1.0)
   * Default: 1.0 (validate all requests)
   * Set to 0.01 for 1% sampling in production
   */
  sampleRate?: number;

  /**
   * Reporters to use for drift notifications
   * Default: ['console']
   */
  reporters?: ReporterConfig[];

  /**
   * Webhook URL for the webhook reporter
   */
  webhookUrl?: string;

  /**
   * Paths to exclude from validation (glob patterns)
   * e.g. ['/health', '/metrics', '/internal/*']
   */
  exclude?: string[];
}

export type ReporterConfig = 'console' | 'webhook' | Reporter;

// ─── Drift Detection ─────────────────────────────────────

export type DriftSeverity = 'warning' | 'breaking';

export type DriftType =
  | 'extra_field'       // Response has field not in spec
  | 'missing_field'     // Spec requires field, response doesn't have it
  | 'type_mismatch'     // Field type doesn't match spec
  | 'enum_violation'    // Value not in spec's enum list
  | 'format_mismatch'   // Value doesn't match spec's format (email, uri, etc.)
  | 'status_undocumented'; // Response status code not in spec

export interface Drift {
  /** Type of contract drift */
  type: DriftType;

  /** JSON path to the field (e.g. "user.address.zipCode") */
  field: string;

  /** What the spec says */
  expected?: unknown;

  /** What the response actually has */
  actual?: unknown;

  /** How bad is this drift */
  severity: DriftSeverity;

  /** Human-readable message */
  message: string;
}

export interface DriftReport {
  /** Timestamp of detection */
  timestamp: string;

  /** HTTP method */
  method: string;

  /** Route path (e.g. /users/:id) */
  path: string;

  /** Actual URL (e.g. /users/123) */
  url: string;

  /** Response status code */
  statusCode: number;

  /** List of detected drifts */
  drifts: Drift[];

  /** Summary counts */
  summary: {
    total: number;
    breaking: number;
    warnings: number;
  };
}

// ─── Validation ───────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  drifts: Drift[];
}

export interface RouteSchema {
  method: string;
  path: string;
  responses: Record<string, ResponseSchema>;
}

export interface ResponseSchema {
  statusCode: string;
  schema?: Record<string, unknown>;
  headers?: Record<string, unknown>;
}

// ─── Spec Loader ──────────────────────────────────────────

export interface ParsedSpec {
  /** Map of "METHOD /path" -> RouteSchema */
  routes: Map<string, RouteSchema>;

  /** Original spec for reference */
  raw: Record<string, unknown>;
}

// ─── Reporters ────────────────────────────────────────────

export interface Reporter {
  name: string;
  report(drift: DriftReport): void | Promise<void>;
}

// ─── Express Integration ──────────────────────────────────

export type ContractLensMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void;
