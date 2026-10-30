import http from 'http';
import { AddressInfo } from 'net';

import express from 'express';

jest.mock('@liquio/back-core', () => ({ getTraceId: () => 'trace', asyncLocalStorageMiddleware: jest.fn() }));

import { errorHandler } from './router';
import { resetAppContext, setAppContext, getLog } from '../lib/context';

describe('Router errorHandler client response', () => {
  afterEach(() => {
    resetAppContext();
  });

  const sqlError = Object.assign(new Error('SequelizeDatabaseError: relation "users" does not exist'), {
    sql: 'SELECT * FROM users',
    stack: 'Error: boom\n    at /app/src/secret.ts:1:1',
  });

  const serve = async (error: any, contentType?: string) => {
    setAppContext({ log: { save: jest.fn() } });
    const app = express();
    app.get('/boom', (_req, res, next) => {
      if (contentType) res.type(contentType);
      next(error);
    });
    app.use(errorHandler);
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      http
        .get({ host: '127.0.0.1', port, path: '/boom' }, (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => resolve({ status: res.statusCode as number, body }));
        })
        .on('error', reject);
    });
    await new Promise((resolve) => server.close(resolve));
    return { ...response, save: getLog().save as jest.Mock };
  };

  it.each([undefined, 'text/plain', 'application/json'])('hides SQL, error text and stack on a forced 500 (content type %s)', async (contentType) => {
    const { status, body, save } = await serve(sqlError, contentType);

    expect(status).toBe(500);
    expect(JSON.parse(body)).toEqual({ error: { message: 'Internal server error', code: 500 }, traceId: 'trace' });
    expect(body).not.toMatch(/Sequelize|users|SELECT|secret\.ts|stack/);
    expect(save).toHaveBeenCalledWith('http-error', expect.objectContaining({ message: sqlError.message, stack: sqlError.stack, traceId: 'trace' }));
  });

  it('hides the message of a 5xx error that carries a status', async () => {
    const { status, body } = await serve(Object.assign(new Error('upstream db password=hunter2'), { status: 502 }));

    expect(status).toBe(502);
    expect(body).not.toContain('hunter2');
  });

  it('gives a non-public 4xx only the status text', async () => {
    const { status, body } = await serve(Object.assign(new Error('jwt malformed: secret detail'), { status: 401 }));

    expect(status).toBe(401);
    expect(JSON.parse(body).error.message).toBe('Unauthorized');
  });

  it('keeps the message of an intentional (expose) 4xx error', async () => {
    const { status, body } = await serve(Object.assign(new Error('request entity too large'), { status: 413, expose: true }));

    expect(status).toBe(413);
    expect(JSON.parse(body).error.message).toBe('request entity too large');
  });

  it('falls back to 500 for an invalid status', async () => {
    expect((await serve(Object.assign(new Error('x'), { status: 'nope' }))).status).toBe(500);
  });
});
