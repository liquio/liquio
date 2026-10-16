import { TestApp, config } from './test_app';

describe('Anonymous account-existence oracles (ID-25, GI-14, KS-34)', () => {
  const REGISTERED = 'registered-id25@email.test';
  const UNKNOWN = 'unknown-id25@email.test';
  const REGISTERED_PHONE = '+380509990001';
  const UNKNOWN_PHONE = '+380509990002';
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.redis.isEnabled = true;
    (config as any).testConfirmations = { codes: [{ emails: [UNKNOWN], phones: [UNKNOWN_PHONE], confirmationCode: '123456' }] };
    app = await TestApp.setup();
    await app.model('user').create({
      ipn: '#2500000001',
      provider: 'local',
      email: REGISTERED,
      phone: REGISTERED_PHONE,
      isActive: true,
      valid: { email: true, phone: true },
    });
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  const pair = async (call: (value: string) => Promise<any>, registered: string, unknown: string) => {
    const [a, b] = [await call(registered), await call(unknown)];
    return { a, b };
  };

  it('GET /sign_up/confirmation/email/exist answers the same for registered and unknown emails', async () => {
    const { a, b } = await pair((email) => app.request().get('/sign_up/confirmation/email/exist').query({ email }), REGISTERED, UNKNOWN);
    expect(a.status).toBe(b.status);
    expect(a.text).toBe(b.text);
    expect(a.text).toBe('null');
  });

  it('GET /sign_up/confirmation/phone/exist answers the same for registered and unknown phones', async () => {
    const { a, b } = await pair((phone) => app.request().get('/sign_up/confirmation/phone/exist').query({ phone }), REGISTERED_PHONE, UNKNOWN_PHONE);
    expect(a.status).toBe(200);
    expect(a.status).toBe(b.status);
    expect(a.text).toBe(b.text);
  });

  it('GET /sign_up/confirmation/phone/exist validates the phone parameter', async () => {
    await app.request().get('/sign_up/confirmation/phone/exist').expect(400);
  });

  it('GET /sign_up/confirmation/email/send answers the same, and stores a code only for the unknown email', async () => {
    const { a, b } = await pair((email) => app.request().get('/sign_up/confirmation/email/send').query({ email }), REGISTERED, UNKNOWN);
    expect(a.status).toBe(b.status);
    expect(a.text).toBe(b.text);
    expect(a.text).not.toBe('exist');
    expect(await app.model('confirmCode').count({ where: { email: REGISTERED } })).toBe(0);
    expect(await app.model('confirmCode').count({ where: { email: UNKNOWN } })).toBe(1);
  });

  it('GET /subscribe redirects the same for registered and unknown emails', async () => {
    const { a, b } = await pair((email) => app.request().get('/subscribe').query({ email }), REGISTERED, UNKNOWN);
    expect(a.status).toBe(b.status);
    expect(a.status).not.toBe(500);
    expect(String(a.headers.location).replace(REGISTERED, 'X')).toBe(String(b.headers.location).replace(UNKNOWN, 'X'));
  });
});
