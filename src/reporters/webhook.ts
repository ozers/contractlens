import type { Reporter, DriftReport } from '../core/types.js';

export class WebhookReporter implements Reporter {
  name = 'webhook';
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async report(report: DriftReport): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[ContractLens] Webhook reporter failed: ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}
