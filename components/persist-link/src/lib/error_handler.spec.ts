import express from 'express';
import supertest from 'supertest';

const logSave = jest.fn();
jest.mock('./context', () => ({ getLog: () => ({ save: logSave }) }));

import { errorHandler } from './error_handler';
import { PublicError } from './public_error';

const SQL_ERROR_TEXT = 'SELECT "hash" FROM "links" WHERE "id" = 1: relation "links" does not exist';

const createApp = (thrower: () => never) => {
  const app = express();
  app.use((req: any, _res, next) => {
    req.traceId = 'trace-1';
    next();
  });
  app.use(express.json());
  app.get('/boom', () => thrower());
  app.get('/text', (_req, res, next) => {
    res.type('text/plain');
    next(Object.assign(new Error(SQL_ERROR_TEXT), { name: 'SequelizeDatabaseError', sql: 'SELECT 1' }));
  });
  app.post('/body', (_req, res) => res.send({}));
  app.use(errorHandler);
  return app;
};

describe('errorHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should not leak a Sequelize-like error and should log it with the trace id', async () => {
    const app = createApp(() => {
      throw Object.assign(new Error(SQL_ERROR_TEXT), { name: 'SequelizeDatabaseError', sql: 'SELECT 1' });
    });

    const res = await supertest(app).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { message: 'Internal server error', code: 500, traceId: 'trace-1' } });
    expect(res.text).not.toContain('SELECT');
    expect(res.text).not.toContain('at ');
    expect(logSave).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({ error: SQL_ERROR_TEXT, traceId: 'trace-1', stack: expect.any(String) }),
      'error',
    );
  });

  it('should answer with a generic JSON body even when the content type is not JSON', async () => {
    const res = await supertest(
      createApp(() => {
        throw new Error('x');
      }),
    ).get('/text');

    expect(res.status).toBe(500);
    expect(res.text).not.toContain('SELECT');
    expect(JSON.parse(res.text).error.message).toBe('Internal server error');
  });

  it('should answer a malformed JSON body with the status text only', async () => {
    const res = await supertest(
      createApp(() => {
        throw new Error('x');
      }),
    )
      .post('/body')
      .set('Content-Type', 'application/json')
      .send('{"a": SECRET_TOKEN_123');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(400);
    expect(res.text).not.toContain('SECRET_TOKEN_123');
    expect(res.text).not.toContain('JSON');
  });

  it('should keep the text of a public 4xx error', async () => {
    const res = await supertest(
      createApp(() => {
        throw Object.assign(new PublicError('Invalid jsonMap.'), { status: 400 });
      }),
    ).get('/boom');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Invalid jsonMap.');
  });
});
