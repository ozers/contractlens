import type { Reporter, DriftReport } from '../core/types.js';

const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

export class ConsoleReporter implements Reporter {
  name = 'console';

  report(report: DriftReport): void {
    const { method, path, statusCode, drifts, summary } = report;

    console.log(
      `\n${BOLD}ContractLens Drift Detected${RESET} — ${method} ${path} (${statusCode})`
    );

    for (let i = 0; i < drifts.length; i++) {
      const drift = drifts[i];
      const isLast = i === drifts.length - 1;
      const prefix = isLast ? '└─' : '├─';
      const icon = drift.severity === 'breaking' ? '🔴' : '⚠️';
      const color = drift.severity === 'breaking' ? RED : YELLOW;

      console.log(
        `  ${prefix} ${icon} ${color}${drift.type}${RESET}: ${drift.message}`
      );
    }

    console.log(
      `  ${summary.total} issue(s): ${summary.breaking} breaking, ${summary.warnings} warning(s)\n`
    );
  }
}
