// Import.
import { TestApp, config } from './test_app';

describe('LinkController', () => {
  let app: TestApp;
  const token = 'persist-link-link-token';

  beforeAll(async () => {
    await TestApp.beforeAll();
  });

  afterAll(async () => {
    if (app) {
      await app.destroy();
    }
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
    config.auth.tokens = [token];
    config.link_generator.secretKey = '12345678901234567890123456789012';
    config.link_generator.cryptIv = '1234567890123456';
  });

  afterEach(async () => {
    if (app) {
      await app.destroy();
    }
  });

  it('should reject /link create without token', async () => {
    app = await TestApp.setup();

    const response = await app.request().post('/link').send({}).expect(401);
    expect(response.body).toEqual({
      error: {
        message: 'Incorrect basic auth token.',
      },
    });
  });

  it('should reject /link create when provider type is unknown', async () => {
    app = await TestApp.setup();

    const response = await app
      .request()
      .post('/link')
      .set('token', token)
      .send({
        type: 'unknown_provider',
        options: {
          url: 'https://example.com',
        },
        small: true,
        definedHash: 'unknown-provider-hash',
      })
      .expect(400);

    expect(response.body).toEqual({
      error: {
        message: 'Provider not found for this type.',
      },
    });
  });

  it('should reject /link create when provider options are invalid', async () => {
    app = await TestApp.setup();

    const response = await app
      .request()
      .post('/link')
      .set('token', token)
      .send({
        type: 'simple',
        options: {
          notUrl: 'wrong-shape',
        },
        small: true,
        definedHash: 'invalid-options-hash',
      })
      .expect(400);

    expect(response.body).toEqual({
      error: {
        message: 'Invalid provider options.',
      },
    });
  });

  it('should create and open simple redirect link via /link/:hash and /:hash', async () => {
    app = await TestApp.setup();

    const definedHash = `simple-redirect-${Date.now()}`;
    const targetUrl = 'https://example.com';

    const createResponse = await app
      .request()
      .post('/link')
      .set('token', token)
      .send({
        type: 'simple',
        options: {
          url: targetUrl,
          redirect: true,
          method: 'GET',
        },
        small: true,
        definedHash,
      })
      .expect(200);

    expect(createResponse.body).toEqual({
      data: `${config.link_generator.linksPrefix}${definedHash}`,
    });

    await app.request().get(`/link/${definedHash}`).expect(302).expect('Location', targetUrl);
    await app.request().get(`/${definedHash}`).expect(302).expect('Location', targetUrl);
  });

  it('should reject duplicated definedHash on /link create', async () => {
    app = await TestApp.setup();

    const definedHash = `duplicate-hash-${Date.now()}`;

    await app
      .request()
      .post('/link')
      .set('token', token)
      .send({
        type: 'simple',
        options: {
          url: 'https://example.com',
          redirect: true,
        },
        small: true,
        definedHash,
      })
      .expect(200);

    const duplicateResponse = await app
      .request()
      .post('/link')
      .set('token', token)
      .send({
        type: 'simple',
        options: {
          url: 'https://example.com/second',
          redirect: true,
        },
        small: true,
        definedHash,
      })
      .expect(400);

    expect(duplicateResponse.body).toEqual({
      error: {
        message: 'Already exists.',
      },
    });
  });

  it('should return provider error for /:hash/template with simple provider', async () => {
    app = await TestApp.setup();

    const definedHash = `template-error-${Date.now()}`;

    await app
      .request()
      .post('/link')
      .set('token', token)
      .send({
        type: 'simple',
        options: {
          url: 'https://example.com',
          redirect: true,
        },
        small: true,
        definedHash,
      })
      .expect(200);

    const response = await app.request().get(`/${definedHash}/template`).expect(500);
    expect(response.body).toEqual({
      error: {
        message: 'Provider error.',
      },
    });
  });
});
