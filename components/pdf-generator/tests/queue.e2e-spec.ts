import { INestApplication } from '@nestjs/common';

import { createApp, postPdf } from './helpers/app';

const slowHtml = '<html><body><script>var end=Date.now()+1500;while(Date.now()<end){}</script><p>slow</p></body></html>';

describe('Cluster queue (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp({ maxConcurrentJobs: 1, maxQueueSize: 1 });
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 429 with Retry-After when the queue overflows', async () => {
    const responses = await Promise.all([1, 2, 3, 4].map(() => postPdf(app, { html: slowHtml })));
    const statuses = responses.map((res) => res.status);

    expect(statuses.some((status) => status === 429)).toBe(true);
    expect(statuses.every((status) => status === 429 || status === 201)).toBe(true);
    expect(statuses.filter((status) => status === 201).length).toBeGreaterThan(0);
    const rejected = responses.find((res) => res.status === 429);
    expect(rejected?.headers['retry-after']).toBe('5');
  });
});
