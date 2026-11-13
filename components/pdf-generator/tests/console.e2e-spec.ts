import { INestApplication } from '@nestjs/common';

import { createApp, postPdf } from './helpers/app';
import { captureLogs } from './helpers/log-capture';
import { expectPdf } from './helpers/pdf';

describe('Page console capture (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs at most consoleLogMaxMessages configured types and summarizes the dropped ones', async () => {
    const logs = captureLogs();
    try {
      const html =
        "<html><body><script>console.error('e2e-1');console.error('e2e-2');console.error('e2e-3');console.log('ignored')</script></body></html>";
      expectPdf(await postPdf(app, { html }));

      const consoleLines = logs.byType('pdf-generator|page-console');
      expect(consoleLines).toHaveLength(2);
      expect(consoleLines.every((line) => line.data.type === 'error')).toBe(true);
      expect(logs.raw()).not.toContain('ignored');
      const summary = logs.byType('pdf-generator|page-console-summary');
      expect(summary).toHaveLength(1);
      expect(summary[0].data.dropped).toBe(1);
    } finally {
      logs.restore();
    }
  });
});
