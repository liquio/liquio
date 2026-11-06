import { TestApp, config } from './test_app';

describe('Confirmation code send rate limit (ID-20)', () => {
  let app: TestApp;
  const original = (config as any).confirmCode;
  const emails = Array.from({ length: 12 }, (_, i) => `limit-${i}@email.test`);
  const PHONE = '+380501112233';
  let next = 0;
  const unique = () => emails[next++];

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.redis.isEnabled = true;
    (config as any).testConfirmations = { codes: [{ emails, phones: [PHONE], confirmationCode: '123456' }] };
    app = await TestApp.setup();
  });

  afterAll(async () => {
    (config as any).confirmCode = original;
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(() => {
    (config as any).confirmCode = {
      ttlMinutes: 60,
      sendLimit: { recipientMax: 2, recipientWindowSeconds: 3600, sourceMax: 1000, sourceWindowSeconds: 3600 },
    };
  });

  const statuses = async (requests: () => any, count: number) => {
    const result: number[] = [];
    for (let i = 0; i < count; i++) result.push((await requests()).status);
    return result;
  };
  const countCodes = (where: Record<string, any>) => app.model('confirmCode').count({ where });

  it('limits GET /sign_up/confirmation/phone/send per phone and stores no code once limited', async () => {
    const phone = PHONE;
    const result = await statuses(() => app.request().get('/sign_up/confirmation/phone/send').query({ phone }), 4);

    expect(result.filter((s) => s === 429)).toHaveLength(2);
    expect(result.slice(0, 2)).not.toContain(429);
    expect(await countCodes({ phone })).toBeLessThanOrEqual(2);
  });

  it('limits GET /sign_up/confirmation/email/send per email, regardless of case', async () => {
    const email = unique();
    const result = [
      (await app.request().get('/sign_up/confirmation/email/send').query({ email })).status,
      (await app.request().get('/sign_up/confirmation/email/send').query({ email: email.toUpperCase() })).status,
      (await app.request().get('/sign_up/confirmation/email/send').query({ email })).status,
    ];

    expect(result).toEqual([200, 200, 429]);
  });

  it('limits GET /user/info/email/send per email', async () => {
    const email = unique();
    const result = await statuses(() => app.request().get('/user/info/email/send').query({ email }), 3);

    expect(result[2]).toBe(429);
    expect(result[0]).not.toBe(429);
  });

  it('does not block other recipients', async () => {
    const a = unique();
    const b = unique();
    await statuses(() => app.request().get('/sign_up/confirmation/email/send').query({ email: a }), 3);

    expect((await app.request().get('/sign_up/confirmation/email/send').query({ email: b })).status).toBe(200);
  });

  it('limits a source rotating recipients', async () => {
    (config as any).confirmCode.sendLimit.recipientMax = 1000;
    (config as any).confirmCode.sendLimit.sourceMax = 3;
    const result = await statuses(() => app.request().get('/sign_up/confirmation/email/send').query({ email: unique() }), 5);

    expect(result.filter((s) => s === 429).length).toBeGreaterThanOrEqual(2);
  });
});
