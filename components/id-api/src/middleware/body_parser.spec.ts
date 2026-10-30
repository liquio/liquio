import express from 'express';
import request from 'supertest';

import { Express } from '../types';
import { useBodyParser, withEmptyBodyDefault } from './body_parser';

describe('withEmptyBodyDefault', () => {
  it('should default req.body to an empty object when nothing was parsed', () => {
    const middleware = withEmptyBodyDefault((_req, _res, next) => next());
    const req: any = {};
    const next = jest.fn();

    middleware(req, {} as any, next);

    expect(req.body).toEqual({});
    expect(next).toHaveBeenCalledWith(undefined);
  });

  it('should keep parsed req.body untouched', () => {
    const middleware = withEmptyBodyDefault((req, _res, next) => {
      req.body = { a: 1 };
      next();
    });
    const req: any = {};
    const next = jest.fn();

    middleware(req, {} as any, next);

    expect(req.body).toEqual({ a: 1 });
    expect(next).toHaveBeenCalledWith(undefined);
  });

  it('should pass parser errors to next and still default req.body', () => {
    const parseError = new Error('invalid json');
    const middleware = withEmptyBodyDefault((_req, _res, next) => next(parseError));
    const req: any = {};
    const next = jest.fn();

    middleware(req, {} as any, next);

    expect(req.body).toEqual({});
    expect(next).toHaveBeenCalledWith(parseError);
  });
});

describe('useBodyParser', () => {
  const createApp = () => {
    const app = express() as unknown as Express;
    useBodyParser(app);
    app.all('/echo', (req, res) => {
      res.json({ type: typeof req.body, body: Buffer.isBuffer(req.body) ? req.body.toString() : req.body });
    });
    return app;
  };

  it('should expose an empty object body on a GET request without a body', async () => {
    const res = await request(createApp()).get('/echo');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ type: 'object', body: {} });
  });

  it('should expose an empty object body on a POST request with an unknown content type', async () => {
    const res = await request(createApp()).post('/echo').set('Content-Type', 'application/xml').send('<a/>');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ type: 'object', body: {} });
  });

  it('should parse a JSON body', async () => {
    const res = await request(createApp())
      .post('/echo')
      .send({ dns: ['cn=a,dc=example,dc=org'] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ type: 'object', body: { dns: ['cn=a,dc=example,dc=org'] } });
  });

  it('should parse an urlencoded body without nesting (extended: false)', async () => {
    const res = await request(createApp()).post('/echo').type('form').send('username=user&filter[a]=1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ type: 'object', body: { username: 'user', 'filter[a]': '1' } });
  });

  it('should parse a text/plain body as a string', async () => {
    const res = await request(createApp()).post('/echo').set('Content-Type', 'text/plain').send('hello');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ type: 'string', body: 'hello' });
  });

  it('should reject malformed JSON with 400', async () => {
    const res = await request(createApp()).post('/echo').set('Content-Type', 'application/json').send('{"broken"');

    expect(res.status).toBe(400);
  });
});
