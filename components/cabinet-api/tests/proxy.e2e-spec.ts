import type { Response as SupertestResponse } from 'supertest';

import { TestApp, TASK_URL } from './test-app';

describe('Main proxy', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll({
      override: {
        discovery: { customApis: [], mainProxy: TASK_URL, mainProxyAllowPaths: 'default', mainProxyDenyPaths: ['/blocked-by-config'] },
      },
    });
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  it('proxies an allowed path to task and returns its response', async () => {
    app
      .nock(TASK_URL)
      .get('/navigation-tree')
      .reply(200, { data: [{ id: 1 }] });

    await app
      .request()
      .get('/navigation-tree')
      .expect(200)
      .expect((response: SupertestResponse) => {
        expect(response.body).toEqual({ data: [{ id: 1 }] });
      });
  });

  it('forwards the query string, a JSON body and the trace headers', async () => {
    app
      .nock(TASK_URL)
      .post('/tasks', { workflowTemplateId: 7 })
      .query({ draft: 'true' })
      .matchHeader('x-trace-id', /.+/)
      .matchHeader('x-trace-service', /.+/)
      .reply(201, { data: { id: 'test-task' } });

    await app
      .request()
      .post('/tasks?draft=true')
      .send({ workflowTemplateId: 7 })
      .expect(201)
      .expect((response: SupertestResponse) => {
        expect(response.body).toEqual({ data: { id: 'test-task' } });
      });
  });

  it('drops client supplied User-Data and Allow-Tokens headers', async () => {
    let received: Record<string, unknown> = {};
    app
      .nock(TASK_URL)
      .get('/navigation-tree')
      .reply(200, function () {
        received = this.req.headers;
        return { data: [] };
      });

    await app.request().get('/navigation-tree').set('User-Data', 'ZmFrZQ==').set('allow-tokens', 'ZmFrZQ==').set('X-Custom', 'kept').expect(200);

    expect(received).not.toHaveProperty('user-data');
    expect(received).not.toHaveProperty('allow-tokens');
    expect(received['x-custom']).toBe('kept');
  });

  it('answers 404 without reaching task for an internal path', async () => {
    await app
      .request()
      .get('/external_services/anything')
      .expect(404)
      .expect((response: SupertestResponse) => {
        expect(response.body).toEqual({ error: { message: 'Not found' } });
      });
  });

  it('answers 404 for a path outside of the allow-list', async () => {
    await app.request().get('/some/unknown/path').expect(404);
  });

  it('answers 404 for a path denied by config', async () => {
    await app.request().get('/blocked-by-config').expect(404);
  });

  it('answers 404 for an allowed path with a method the front does not use', async () => {
    await app.request().delete('/navigation-tree').expect(404);
  });

  it('lets OPTIONS through for an allowed path (CORS preflight)', async () => {
    await app
      .request()
      .options('/navigation-tree')
      .set('Origin', 'http://front.test')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204)
      .expect((response: SupertestResponse) => {
        expect(response.headers['access-control-allow-methods']).toContain('GET');
      });
  });

  it('relays task errors unchanged', async () => {
    app
      .nock(TASK_URL)
      .get('/navigation-tree')
      .reply(403, { error: { message: 'Forbidden' } });

    await app.request().get('/navigation-tree').expect(403);
  });

  it('answers 500 "Proxy error" when the request to task fails', async () => {
    app.nock(TASK_URL).get('/navigation-tree').replyWithError('boom');

    await app
      .request()
      .get('/navigation-tree')
      .expect(500)
      .expect((response: SupertestResponse) => {
        expect(response.body).toEqual({ error: { message: 'Proxy error' } });
      });
  });
});
