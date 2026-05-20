import { TestApp, config } from './test_app';

describe('UserAdminActionController', () => {
  let app: TestApp;
  let adminToken: string;

  const seedRows = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      user_id: 'user-1',
      data: { reason: 'seed-1' },
      created_by: { userId: 'admin-1', ipn: '0001', name: 'Admin One' },
      created_at: new Date('2026-05-20T10:00:00.000Z'),
      action_type: 'block' as const,
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      user_id: 'user-1',
      data: { reason: 'seed-2' },
      created_by: { userId: 'admin-1', ipn: '0001', name: 'Admin One' },
      created_at: new Date('2026-05-20T10:05:00.000Z'),
      action_type: 'unblock' as const,
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      user_id: 'user-2',
      data: { reason: 'seed-3' },
      created_by: { userId: 'admin-2', ipn: '0002', name: 'Admin Two' },
      created_at: new Date('2026-05-20T11:00:00.000Z'),
      action_type: 'block' as const,
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      user_id: 'user-3',
      data: { reason: 'seed-4' },
      created_by: { userId: 'admin-2', ipn: '0002', name: 'Admin Two' },
      created_at: new Date('2026-05-20T12:00:00.000Z'),
      action_type: 'delete' as const,
    },
  ];

  const authHeader = () => ({ Authorization: `Basic ${adminToken}` });

  const seedActions = async () => {
    await app.model('userAdminAction').bulkCreate(seedRows as any[]);
  };

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

    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };
    adminToken = config.oauth?.secret_key?.[0] || '';

    app = await TestApp.setup();
    await app.model('userAdminAction').destroy({ where: {}, truncate: true, restartIdentity: true } as any);
    await seedActions();
  });

  afterEach(async () => {
    await app.destroy();
  });

  it('applies filter[action_type] from bracket notation query', async () => {
    await app
      .request()
      .get('/user_admin_actions?offset=0&limit=10&filter%5Baction_type%5D=block')
      .set(authHeader())
      .expect(200)
      .expect(({ body }) => {
        expect(body.meta.count).toBe(2);
        expect(body.data).toHaveLength(2);
        expect(body.data.map((row: any) => row.action_type)).toEqual(['block', 'block']);
      });
  });

  it('applies filter[user_id] from bracket notation query', async () => {
    await app
      .request()
      .get('/user_admin_actions?offset=0&limit=10&filter%5Buser_id%5D=user-1')
      .set(authHeader())
      .expect(200)
      .expect(({ body }) => {
        expect(body.meta.count).toBe(2);
        expect(body.data).toHaveLength(2);
        expect(body.data.every((row: any) => row.user_id === 'user-1')).toBe(true);
      });
  });

  it('applies filter[initiator_id] from bracket notation query', async () => {
    await app
      .request()
      .get('/user_admin_actions?offset=0&limit=10&filter%5Binitiator_id%5D=admin-2')
      .set(authHeader())
      .expect(200)
      .expect(({ body }) => {
        expect(body.meta.count).toBe(2);
        expect(body.data).toHaveLength(2);
        expect(body.data.every((row: any) => row.created_by?.userId === 'admin-2')).toBe(true);
      });
  });

  it('applies created_at range filters from bracket notation query', async () => {
    await app
      .request()
      .get(
        '/user_admin_actions?offset=0&limit=10&filter%5Bcreated_at_from%5D=2026-05-20T10%3A30%3A00.000Z&filter%5Bcreated_at_to%5D=2026-05-20T11%3A30%3A00.000Z',
      )
      .set(authHeader())
      .expect(200)
      .expect(({ body }) => {
        expect(body.meta.count).toBe(1);
        expect(body.data).toHaveLength(1);
        expect(body.data[0].id).toBe('33333333-3333-3333-3333-333333333333');
      });
  });

  it('applies combined filters from bracket notation query', async () => {
    await app
      .request()
      .get('/user_admin_actions?offset=0&limit=10&filter%5Baction_type%5D=block&filter%5Binitiator_id%5D=admin-1')
      .set(authHeader())
      .expect(200)
      .expect(({ body }) => {
        expect(body.meta.count).toBe(1);
        expect(body.data).toHaveLength(1);
        expect(body.data[0].id).toBe('11111111-1111-1111-1111-111111111111');
      });
  });
});
