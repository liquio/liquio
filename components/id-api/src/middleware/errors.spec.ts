import { HttpError } from '../lib/http_error';
import { useErrorHandler } from './errors';

const mockSave = jest.fn();
let mockTraceId: string | undefined;
jest.mock('@liquio/back-core', () => ({
  Log: { getInstance: () => ({ save: mockSave }) },
  getTraceId: () => mockTraceId,
}));

const SQL = 'insert into "users" ("password") values (\'s3cret\') violates constraint "users_pkey"';

function run(error: any, contentType?: string) {
  let handler: any;
  useErrorHandler({ use: (h: any) => (handler = h) } as any);
  const res: any = { statusCode: 0, body: undefined, headers: {} as Record<string, string> };
  res.status = (code: number) => ((res.statusCode = code), res);
  res.send = (body: any) => ((res.body = body), res);
  res.set = (k: string, v: string) => ((res.headers[k] = v), res);
  handler(error, { get: () => contentType }, res, jest.fn());
  return res;
}

describe('useErrorHandler', () => {
  beforeEach(() => {
    mockSave.mockClear();
    mockTraceId = undefined;
  });

  it.each(['application/json', 'text/plain', undefined])('hides Sequelize error text for Content-Type %s', (contentType) => {
    const error = Object.assign(new Error(SQL), { name: 'SequelizeDatabaseError', sql: SQL });
    const res = run(error, contentType);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    expect(JSON.stringify(res.body)).not.toContain('users');
  });

  it('logs the full error with stack and trace id', () => {
    mockTraceId = 'trace-1';
    const error = new Error(SQL);
    const res = run(error, 'application/json');

    expect(mockSave).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({ error: error.toString(), stack: error.stack, status: 500, traceId: 'trace-1' }),
      'error',
    );
    expect(res.headers['X-Trace-Id']).toBe('trace-1');
    expect(res.body).toEqual({ error: 'Internal server error', traceId: 'trace-1' });
  });

  it('answers a non-HttpError 4xx with the status text only', () => {
    const res = run(Object.assign(new SyntaxError('Unexpected token } in JSON at position 5'), { status: 400 }), 'application/json');

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Bad Request' });
  });

  it('falls back to 500 for an invalid status', () => {
    expect(run(Object.assign(new Error('x'), { status: 'boom' })).statusCode).toBe(500);
  });

  it('keeps the message of an HttpError below 500', () => {
    const res = run(new HttpError(429, 'Too many attempts. Please try again later.'));

    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({ message: 'Too many attempts. Please try again later.' });
  });

  it('hides the message of an HttpError with a 5xx status', () => {
    const res = run(new HttpError(503, SQL));

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});
