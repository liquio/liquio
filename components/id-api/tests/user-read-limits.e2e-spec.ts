import { TestApp, config } from './test_app';

describe('Basic user read routes are bounded (KS-25)', () => {
  let app: TestApp;
  let firstId: string;

  const basic = (name: string, secret: string) => `Basic ${Buffer.from(`${name}:${secret}`).toString('base64')}`;
  const LEGACY = `Basic ${config.oauth?.secret_key?.[0]}`;
  const READER = basic('reader', 'reader-s3cret');
  const FULL = basic('full-reader', 'full-s3cret');
  const NO_SCOPE = basic('no-scope', 'no-scope-s3cret');

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();

    config.basic_auth = {
      allowLegacySharedSecret: true,
      clients: [
        { name: 'reader', secret: 'reader-s3cret', scopes: ['user:read'] },
        { name: 'full-reader', secret: 'full-s3cret', scopes: ['user:read'] },
        { name: 'no-scope', secret: 'no-scope-s3cret', scopes: ['totp'] },
      ],
    };
    (config as any).users = { maxLimit: 5, maxBatch: 3, fullReadClients: ['full-reader'] };

    app = await TestApp.setup();

    const rows = [];
    for (let i = 0; i < 8; i++) {
      rows.push({
        ipn: `#ks25-${i}`,
        provider: 'local',
        email: `ks25-${i}@example.com`,
        last_name: 'Ks25',
        first_name: `N${i}`,
        password: 'secret-hash-value',
      });
    }
    const created = await app.model('user').bulkCreate(rows as any, { returning: true });
    firstId = created[0].dataValues.userId;
    await app.model('userServices').create({ userId: firstId, provider: 'local', provider_id: 'ks25-0@example.com', data: {} });
  });

  afterAll(async () => {
    delete (config as any).users;
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
  });

  it('clamps the list page size to the maximum', async () => {
    const { body, headers } = await app.request().get('/user').query({ limit: 100000, offset: 0 }).set('Authorization', LEGACY).expect(200);
    expect(body).toHaveLength(5);
    expect(Number(headers.total)).toBeGreaterThanOrEqual(8);
  });

  it('rejects a negative or non-numeric limit and offset', async () => {
    await app.request().get('/user').query({ limit: -1 }).set('Authorization', LEGACY).expect(400);
    await app.request().get('/user').query({ offset: -1 }).set('Authorization', LEGACY).expect(400);
    await app.request().get('/user').query({ limit: 'abc' }).set('Authorization', LEGACY).expect(400);
  });

  it('clamps the search page size', async () => {
    const { body } = await app
      .request()
      .post('/user/info/search')
      .set('Authorization', LEGACY)
      .send({ searchString: 'Ks25', limit: 100000 })
      .expect(200);
    expect(body).toHaveLength(5);
  });

  it('rejects a search without a search string', async () => {
    await app.request().post('/user/info/search').set('Authorization', LEGACY).send({}).expect(400);
  });

  it('rejects an oversized id, ipn and edrpou batch', async () => {
    const ids = ['a', 'b', 'c', 'd'].map((c) => c.repeat(24));
    await app.request().post('/user/info/id').set('Authorization', LEGACY).send({ id: ids }).expect(400);
    await app
      .request()
      .post('/user/info/ipn')
      .set('Authorization', LEGACY)
      .send({ ipn: ['1', '2', '3', '4'] })
      .expect(400);
    await app
      .request()
      .post('/user/info/edrpou')
      .set('Authorization', LEGACY)
      .send({ edrpou: ['1', '2', '3', '4'] })
      .expect(400);
    await app
      .request()
      .post('/user/info/id')
      .set('Authorization', LEGACY)
      .send({ id: ids.slice(0, 3) })
      .expect(200);
  });

  it('never returns the password hash on any read route', async () => {
    const lists = [
      (await app.request().get('/user').set('Authorization', LEGACY).expect(200)).body,
      (await app.request().post('/user/info/id').set('Authorization', LEGACY).send({ id: firstId }).expect(200)).body,
      (await app.request().post('/user/info/ipn').set('Authorization', LEGACY).send({ ipn: '#ks25-0' }).expect(200)).body,
      (await app.request().post('/user/info/search').set('Authorization', LEGACY).send({ searchString: 'Ks25' }).expect(200)).body,
    ];
    for (const list of lists) {
      expect(list.length).toBeGreaterThan(0);
      expect(JSON.stringify(list)).not.toContain('secret-hash-value');
      expect(list.every((user: any) => !('password' in user))).toBe(true);
    }
    const one = await app.request().get(`/user/${firstId}`).set('Authorization', LEGACY).expect(200);
    expect(one.body).not.toHaveProperty('password');
    expect(JSON.stringify(one.body)).not.toContain('secret-hash-value');
  });

  it('keeps services for the legacy secret', async () => {
    const { body } = await app.request().get(`/user/${firstId}`).set('Authorization', LEGACY).expect(200);
    expect(body.services.local.provider).toBe('local');
  });

  it('drops services for a named client without full read access', async () => {
    const one = await app.request().get(`/user/${firstId}`).set('Authorization', READER).expect(200);
    expect(one.body).not.toHaveProperty('services');
    const list = await app.request().get('/user').query({ email: 'ks25-0' }).set('Authorization', READER).expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).not.toHaveProperty('services');
    const byId = await app.request().post('/user/info/id').set('Authorization', READER).send({ id: firstId }).expect(200);
    expect(byId.body[0]).not.toHaveProperty('services');
  });

  it('keeps services for a named client listed in users.fullReadClients', async () => {
    const { body } = await app.request().get(`/user/${firstId}`).set('Authorization', FULL).expect(200);
    expect(body.services.local.provider).toBe('local');
  });

  it('rejects an unfiltered list for a named client without full read access', async () => {
    await app.request().get('/user').set('Authorization', READER).expect(403);
    await app.request().get('/user').query({ search: '  ' }).set('Authorization', READER).expect(403);
    await app.request().get('/user').set('Authorization', FULL).expect(200);
    await app.request().get('/user').set('Authorization', LEGACY).expect(200);
  });

  it('refuses a client without the user:read scope', async () => {
    await app.request().get('/user').query({ email: 'ks25' }).set('Authorization', NO_SCOPE).expect(403);
    await app.request().get(`/user/${firstId}`).set('Authorization', NO_SCOPE).expect(403);
  });
});
