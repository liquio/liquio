import { TestHarness } from './test-harness';

const restrictedToken = `Basic ${Buffer.from('reader:reader-secret').toString('base64')}`;
const fullToken = 'Basic dGVzdDp0ZXN0LXBhc3MtMTIzNA=='; // test:test-pass-1234, no permission entry.

describe('Service permissions (opt-in)', () => {
  let testHarness: TestHarness;

  beforeAll(async () => {
    testHarness = new TestHarness();
    await testHarness.setup({ useDatabase: true });
    const { auth } = testHarness.getConfig();
    auth.tokens.push(restrictedToken);
    auth.servicePermissions = { reader: { routes: ['GET /test/ping_with_auth', 'GET /registers'] } };
  }, 30000);

  afterAll(async () => {
    await testHarness.teardown();
  });

  it('lets a token without an entry keep full access', async () => {
    await testHarness.request().get('/test/ping_with_auth').set('Authorization', fullToken).expect(200);
    await testHarness.request().get('/registers').set('Authorization', fullToken).expect(200);
  });

  it('lets a token with an entry call its listed routes', async () => {
    await testHarness.request().get('/test/ping_with_auth').set('Authorization', restrictedToken).expect(200);
    await testHarness.request().get('/registers').set('Authorization', restrictedToken).expect(200);
  });

  it('denies unlisted routes with 403 for a token with an entry', async () => {
    await testHarness.request().get('/keys').set('Authorization', restrictedToken).expect(403);
    await testHarness.request().post('/rollback/start').set('Authorization', restrictedToken).send({}).expect(403);
  });
});
