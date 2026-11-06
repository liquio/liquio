import axios from 'axios';

import { HttpClient } from './http_client';

jest.mock('axios', () => ({ __esModule: true, default: jest.fn(), AxiosError: class AxiosError extends Error {} }));

describe('HttpClient logging', () => {
  const headers = { Authorization: 'Bearer SECRET_TOKEN', 'X-Api-Key': 'SECRET_KEY', Cookie: 'sid=SECRET_COOKIE' };

  it('does not log credentials on request', async () => {
    (axios as any).mockResolvedValue({ status: 200, statusText: 'OK', data: {}, headers: {} });
    const logger = jest.fn();
    await new HttpClient({}, logger).request('http://x', { method: 'POST', headers, body: JSON.stringify({ password: 'SECRET_PWD', a: 1 }) });
    const logged = JSON.stringify(logger.mock.calls);
    expect(logged).not.toMatch(/SECRET_/);
    expect(logged).toContain('"a":1');
  });

  it('does not log credentials on error', async () => {
    (axios as any).mockRejectedValue(new Error('boom'));
    const logger = jest.fn();
    await expect(new HttpClient({}, logger).request('http://x', { method: 'POST', headers, body: { token: 'SECRET_TOK' } })).rejects.toThrow();
    const logged = JSON.stringify(logger.mock.calls);
    expect(logged).not.toMatch(/SECRET_/);
    expect(logged).toContain('http-client-request-error');
  });
});
