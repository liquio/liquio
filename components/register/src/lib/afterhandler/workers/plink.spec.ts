import axios from 'axios';

import PLinkAfterhandlerWorker from './plink';

jest.mock('@liquio/back-core', () => ({ Log: { getInstance: () => ({ save: jest.fn() }) } }));
jest.mock('axios', () => {
  const fn: any = jest.fn(async () => ({ data: 'ok' }));
  fn.AxiosError = class AxiosError extends Error {};
  return { __esModule: true, default: fn, AxiosError: fn.AxiosError };
});

describe('PLinkAfterhandlerWorker.create', () => {
  const TOKEN = 'super-secret-plink-token';

  it('sends the token but never writes it to the request log', async () => {
    const worker: any = new PLinkAfterhandlerWorker({ url: 'http://plink', token: TOKEN }, {});
    worker.log = { save: jest.fn() };

    const result = await worker.create(1, 'record', 'rec-1', { data: { deepLink: { method: 'm', hash: 'h' } } });

    expect(result).toBe(true);
    expect((axios as any).mock.calls[0][0].headers.token).toBe(TOKEN);
    expect(JSON.stringify(worker.log.save.mock.calls)).not.toContain(TOKEN);
    const requestLog = worker.log.save.mock.calls.find(([name]) => name === 'plink-request')[1];
    expect(requestLog.headers.token).toBe('***');
  });
});
