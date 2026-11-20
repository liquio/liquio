import { TestApp } from './test-app';
import { prepareFixtures } from './fixtures';
import { routes } from '../src/services/router/routes';

// Table-driven pass over every route protected with the `individual` token auth:
// an authenticated user sends an invalid (empty) request and a request for unknown entities.
// The route must be wired (no 401/405) and answer a JSON envelope. Some routes answer 5xx here because their
// downstream service (register, filestorage, notification, external reader, Redis cache) is not mocked.
describe('Authenticated routes: validation and not-found paths', () => {
  let app: TestApp;

  const USER_ID = '61efddaa351d6219eee09043';
  const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await prepareFixtures(app);
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  const individualRoutes = Object.entries(routes as Record<string, any>)
    .filter(([, description]) => Array.isArray(description.auth) && description.auth.includes('individual'))
    .map(([key]) => key.split(' '))
    // Answers 401 to users who are not a head of the unit (covered separately below).
    .filter(([, path]) => path !== '/units/:id/as-head');

  const send = async (method: string, path: string, body?: object) => {
    const { jwt, payload } = app.generateUserToken(USER_ID);
    app.nockId.get('/user/info').query({ access_token: payload.authTokens.accessToken }).once().reply(200, {
      userId: USER_ID,
      role: 'individual',
      services: {},
    });
    const request = app.request()[method.toLowerCase()](path).set('token', jwt);
    return body ? request.send(body) : request;
  };

  it('has individual routes to check', () => {
    expect(individualRoutes.length).toBeGreaterThan(50);
  });

  it.each(individualRoutes)('%s %s with an empty request is routed and answers JSON for an authenticated user', async (method, path) => {
    const url = path.replace(/:[A-Za-z_]+/g, UNKNOWN_ID);
    const response = await send(method, url, ['POST', 'PUT', 'PATCH'].includes(method) ? {} : undefined);
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(405);
    expect(response.headers['content-type']).toMatch(/json/);
  });

  it('GET /units/:id/as-head answers 401 to a user who is not the head of the unit', async () => {
    const response = await send('GET', `/units/${UNKNOWN_ID}/as-head`);
    expect(response.status).toBe(401);
  });
});
