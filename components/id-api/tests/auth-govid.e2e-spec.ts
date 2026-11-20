import nock from 'nock';
import supertest from 'supertest';

import { TestApp, config } from './test_app';

const GOVID_URL = 'http://govid.example';

describe('AuthController - GovID - state binding', () => {
  let app: TestApp;
  let baseUrl: string;
  let tokenCalls: number;

  const mockProvider = () => {
    nock(GOVID_URL)
      .get('/get-access-token')
      .query(true)
      .reply(() => {
        tokenCalls++;
        return [200, { access_token: 'test-access', user_id: 'govid-user' }];
      })
      .persist();
    nock(GOVID_URL).get('/get-user-info').query(true).reply(200, { lastname: 'Test', givenname: 'User', drfocode: '1234567890' }).persist();
  };

  const start = async (agent: supertest.Agent, clientState?: string): Promise<string> => {
    const res = await agent
      .get('/authorise/govid/info')
      .query(clientState ? { state: clientState } : {})
      .expect(200);
    return new URL(res.body.totalAuthUrl).searchParams.get('state')!;
  };

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.auth_providers = config.auth_providers || {};
    config.auth_providers.govid = {
      authorizationUrl: GOVID_URL,
      clientId: 'test-client',
      clientSecret: 'test-secret',
      redirectUrl: 'http://localhost/authorise/govid',
    } as any;
    app = await TestApp.setup();
    baseUrl = `http://localhost:${config.port}`;
  });

  afterAll(async () => {
    delete (config.auth_providers as any).govid;
    if (app) {
      await app.destroy();
    }
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
    tokenCalls = 0;
    mockProvider();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('issues a random server-side state and ignores the client-supplied one', async () => {
    const agent = supertest.agent(baseUrl);
    const state = await start(agent, 'attacker-chosen');
    expect(state).not.toBe('attacker-chosen');
    expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await start(agent)).not.toBe(state);
  });

  it('rejects a callback without state and does not exchange the code', async () => {
    const agent = supertest.agent(baseUrl);
    await start(agent);
    await agent.post('/authorise/govid').send({ code: 'c' }).expect(400);
    expect(tokenCalls).toBe(0);
  });

  it('rejects a callback with a wrong state and does not exchange the code', async () => {
    const agent = supertest.agent(baseUrl);
    await start(agent);
    await agent.post('/authorise/govid').send({ code: 'c', state: 'wrong' }).expect(400);
    expect(tokenCalls).toBe(0);
  });

  it('rejects a callback from a browser that never started the login (login CSRF)', async () => {
    const victim = supertest.agent(baseUrl);
    const attacker = supertest.agent(baseUrl);
    const attackerState = await start(attacker);
    await victim.post('/authorise/govid').send({ code: 'attacker-code', state: attackerState }).expect(400);
    expect(tokenCalls).toBe(0);
  });

  it('rejects an expired state', async () => {
    const agent = supertest.agent(baseUrl);
    const state = await start(agent);
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 11 * 60 * 1000);
    try {
      await agent.post('/authorise/govid').send({ code: 'c', state }).expect(400);
    } finally {
      jest.restoreAllMocks();
    }
    expect(tokenCalls).toBe(0);
  });

  it('logs in with a matching state', async () => {
    const agent = supertest.agent(baseUrl);
    const state = await start(agent);
    const res = await agent.post('/authorise/govid').send({ code: 'c', state }).expect(200);
    expect(res.body).toEqual({ error: null, redirect: '/authorise/continue/' });
    expect(tokenCalls).toBe(1);
  });

  it('rejects a reused state without exchanging the code again', async () => {
    const agent = supertest.agent(baseUrl);
    const state = await start(agent);
    // The first attempt consumes the state even when the provider fails.
    nock.cleanAll();
    nock(GOVID_URL)
      .get('/get-access-token')
      .query(true)
      .reply(() => {
        tokenCalls++;
        return [500, {}];
      });
    await agent.post('/authorise/govid').send({ code: 'c', state });
    expect(tokenCalls).toBe(1);

    await agent.post('/authorise/govid').send({ code: 'c', state }).expect(400);
    expect(tokenCalls).toBe(1);
  });
});
