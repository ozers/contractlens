export { contractlens } from './middleware/express.js';
export { loadSpec } from './core/spec-loader.js';
export { validateResponse } from './core/validator.js';
export { detectDrift } from './core/drift-detector.js';
export { ConsoleReporter } from './reporters/console.js';
export { WebhookReporter } from './reporters/webhook.js';

export type {
  ContractLensOptions,
  ContractLensMiddleware,
  Drift,
  DriftReport,
  DriftSeverity,
  DriftType,
  Reporter,
  ReporterConfig,
  ValidationResult,
} from './core/types.js';
