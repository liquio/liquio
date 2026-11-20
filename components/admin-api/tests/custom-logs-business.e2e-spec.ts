import { TestApp } from './test-app';
import { asAdmin, grantAllAdminUnits, nockIdUsers } from './fixtures/auth';

const USER = 'bbbbbbbbbbbbbbbbbbbbbb01';

describe('Custom logs', () => {
  let app: TestApp;

  const waitForLogs = async (count: number) => {
    for (let attempt = 0; attempt < 40; attempt++) {
      if ((await app.model('customLog').count()) >= count) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('Custom logs were not saved.');
  };

  const createUnit = async (id: number, name: string) => {
    nockIdUsers(app, [{ userId: USER, name: 'Tester', email: 'tester@example.com', ipn: '1000000001' }]);
    await asAdmin(app, 'post', '/units')
      .send({ id, name, description: 'Unit', members: [USER], heads: [], data: {}, menuConfig: {}, allowTokens: [], headsIpn: [], membersIpn: [] })
      .expect(200);
  };

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await grantAllAdminUnits(app);

    const templateModel = app.model('customLogTemplate');
    await templateModel.create({
      name: 'Unit created',
      operation_type: 'admin-create-unit',
      schema: "(entity) => ({ type: 'Unit created', custom: { unitName: { name: 'Unit name', value: entity.unitAfter.name } } })",
    });
    await templateModel.create({ name: 'Skipped', operation_type: 'admin-create-unit', schema: '(entity) => null' });

    await createUnit(7001, 'Logged unit one');
    await createUnit(7002, 'Logged unit two');
    await waitForLogs(2);
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

  it('requires authentication', async () => {
    await app.request().get('/custom-logs').expect(401);
  });

  it('saves a custom log per matching template and skips the template that returns null', async () => {
    const response = await asAdmin(app, 'get', '/custom-logs').expect(200);

    const logs = response.body.data.filter((log) => log.name === 'Unit created');
    expect(logs.length).toBe(2);
    expect(logs[0].type).toBe('Unit created');
    expect(logs[0].custom.unitName.name).toBe('Unit name');
    expect(response.body.data.some((log) => log.name === 'Skipped')).toBe(false);
  });

  it('filters and sorts the custom logs', async () => {
    const response = await asAdmin(app, 'get', '/custom-logs')
      .query({
        'filters[name]': 'Unit',
        'filters[type]': 'created',
        'filters[user_name]': '',
        'filters[from_created_at]': '2020-01-01T00:00:00.000Z',
        'filters[to_created_at]': '2100-01-01T00:00:00.000Z',
        'sort[name]': 'asc',
        'sort[custom][unitName]': { value: 'desc' },
      })
      .expect(200);

    expect(response.body.data.length).toBe(2);
  });

  it('filters by a lower or an upper creation date and an ip', async () => {
    await asAdmin(app, 'get', '/custom-logs').query({ 'filters[from_created_at]': '2020-01-01T00:00:00.000Z' }).expect(200);
    await asAdmin(app, 'get', '/custom-logs').query({ 'filters[to_created_at]': '2100-01-01T00:00:00.000Z' }).expect(200);
    const response = await asAdmin(app, 'get', '/custom-logs').query({ 'filters[ip]': '10.1.1.1' }).expect(200);

    expect(response.body.data).toEqual([]);
  });

  it('appends the custom fields to every log', async () => {
    const response = await asAdmin(app, 'get', '/custom-logs').query({ isAppendCustomFields: true }).expect(200);

    expect(response.body.customFieldNames).toEqual([{ key: 'unitName', name: 'Unit name' }]);
    expect(response.body.data[0].unitName).toEqual(expect.stringContaining('Logged unit'));
  });
});
