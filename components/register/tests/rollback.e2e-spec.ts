import { TestHarness } from './test-harness';

describe('RollbackController (SE-3930 RG-27)', () => {
  let testHarness: TestHarness;
  const validAuth = 'Basic dGVzdDp0ZXN0';
  const keyId = 2002;
  let savedAuth: any;
  let recordId: string;
  let historyId: string;

  const setMode = async (mode: string) => {
    await testHarness.getDb().query('UPDATE keys SET access_mode = :mode WHERE id = :id', { replacements: { id: keyId, mode } });
    await testHarness.clearRedisCache();
  };

  beforeAll(async () => {
    testHarness = new TestHarness();
    await testHarness.setup({ useDatabase: true, useRedis: true });
    await testHarness.setupFixtures();
    const created = await testHarness
      .request()
      .post('/records')
      .set('Authorization', validAuth)
      .send({ registerId: 200, keyId, data: { field1: 'rollback' } })
      .expect(200);
    recordId = created.body.data.id;
    const history = await testHarness.request().get(`/records/${recordId}/history`).set('Authorization', validAuth).expect(200);
    historyId = history.body.data[0].id;
  }, 30000);

  beforeEach(() => {
    savedAuth = { ...testHarness.getConfig().auth };
    testHarness.getConfig().auth.trustedCallers = ['test'];
  });

  afterEach(async () => {
    testHarness.getConfig().auth = savedAuth;
    await setMode('full');
  });

  afterAll(async () => {
    await testHarness.request().delete(`/records/${recordId}`).set('Authorization', validAuth);
    await testHarness.teardown();
  });

  it('rejects POST /rollback/start for a read_only key with 403', async () => {
    await setMode('read_only');
    await testHarness.request().post('/rollback/start').set('Authorization', validAuth).send({ keyId, timePoint: new Date().toJSON() }).expect(403);
  });

  it('rejects POST /rollback/record for a read_only key with 403 and changes nothing', async () => {
    await setMode('read_only');
    await testHarness.request().post('/rollback/record').set('Authorization', validAuth).send({ historyId, recordId, keyId }).expect(403);
    await testHarness.request().get(`/records/${recordId}`).set('Authorization', validAuth).expect(200);
  });

  it('still rolls back a record of a writable key', async () => {
    await testHarness.request().post('/rollback/record').set('Authorization', validAuth).send({ historyId, recordId, keyId }).expect(200);
  });

  it('starts a rollback of a writable key', async () => {
    await testHarness.request().post('/rollback/start').set('Authorization', validAuth).send({ keyId, timePoint: new Date().toJSON() }).expect(200);
  });
});
