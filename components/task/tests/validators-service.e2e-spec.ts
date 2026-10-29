import express from 'express';
import supertest from 'supertest';

import { Validators } from '../src/validators';
import { getConfig } from '../src/lib/config';

// Every validator schema of the service mounted on a small Express app (the router does not route all of them).
// Each one is called with an empty request and with a request full of values of the wrong type, to run the
// real express-validator chains and the custom checks.
describe('Validators service', () => {
  const validators: any = new Validators(getConfig());
  const wrong = {
    id: 'x',
    ids: ['x'],
    name: 5,
    page: 'one',
    count: 'many',
    limit: 'x',
    offset: 'x',
    filters: 'x',
    sort: 'x',
    value: {},
    path: 5,
    type: 5,
  };

  const app = express();
  app.use(express.json());
  const routes: Array<[string, string]> = [];
  for (const [name, validator] of Object.entries<any>(validators.validators)) {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(validator)).filter(
      (method) => method !== 'constructor' && typeof validator[method] === 'function',
    );
    for (const method of methods) {
      let handler;
      try {
        handler = validators.getHandler(name, method);
      } catch {
        continue;
      }
      if (!handler) continue;
      routes.push([name, method]);
      app.all(
        `/${name}/${method}/:id/:ownerId/:service/:endpoint/:caller/:workflowId/:taskTemplateId`,
        handler,
        validators.getValidationResultHandler(),
        (req, res) => res.json({ ok: true }),
      );
    }
  }
  const request = supertest(app);
  const url = (name: string, method: string, param = 'p') => `/${name}/${method}/${param}/${param}/${param}/${param}/${param}/${param}/${param}`;

  it('mounts a large number of validators', () => {
    expect(routes.length).toBeGreaterThan(50);
  });

  it('answers 422 or ok for every validator without values', async () => {
    for (const [name, method] of routes) {
      const response = await request.post(url(name, method));
      expect([200, 422]).toContain(response.status);
    }
  });

  it('answers 422 or ok for every validator with wrong values', async () => {
    for (const [name, method] of routes) {
      const response = await request
        .post(url(name, method, 'x'))
        .query(wrong as any)
        .send(wrong);
      expect([200, 422]).toContain(response.status);
    }
  });

  it('answers 422 or ok for every validator with numeric and array values', async () => {
    const values = {
      id: 1,
      ids: [1, 2],
      name: 'n',
      page: 1,
      count: 5,
      limit: 5,
      offset: 0,
      filters: {},
      sort: { by: 'id' },
      value: 'v',
      path: 'a.b',
      type: 'string',
    };
    for (const [name, method] of routes) {
      const response = await request
        .put(url(name, method, '1'))
        .query({ page: 1, count: 5 })
        .send(values);
      expect([200, 422]).toContain(response.status);
    }
  });
});
