import { TestApp, config } from './test_app';

describe('LoginHistoryController', () => {
  let app: TestApp;
  let adminToken: string;

  const seedRows = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      user_id: 'user-1',
      user_name: 'John Doe',
      ip: ['192.168.1.100'],
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      client_id: 'liquio-portal',
      client_name: 'Liquio Portal',
      is_blocked: false,
      action_type: 'login',
      created_at: new Date('2026-05-20T10:00:00.000Z'),
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      user_id: 'user-2',
      user_name: 'Jane Smith',
      ip: ['192.168.1.101'],
      user_agent: 'Mozilla/5.0 (X11; Linux x86_64)',
      client_id: 'liquio-portal',
      client_name: 'Liquio Portal',
      is_blocked: false,
      action_type: 'login',
      created_at: new Date('2026-05-20T10:05:00.000Z'),
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      user_id: 'user-1',
      user_name: 'John Doe',
      ip: ['192.168.1.100'],
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      client_id: 'external-app',
      client_name: 'External App',
      is_blocked: false,
      action_type: 'login',
      created_at: new Date('2026-05-20T11:00:00.000Z'),
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      user_id: 'user-3',
      user_name: 'Admin User',
      ip: ['192.168.1.102'],
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      client_id: 'liquio-portal',
      client_name: 'Liquio Portal',
      is_blocked: true,
      action_type: 'login',
      created_at: new Date('2026-05-20T12:00:00.000Z'),
    },
  ];

  const authHeader = () => ({ Authorization: `Basic ${adminToken}` });

  const seedLoginHistory = async () => {
    await app.model('loginHistory').bulkCreate(seedRows as any[]);
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

    adminToken = config.oauth?.secret_key?.[0] || '';

    app = await TestApp.setup();
    await app.model('loginHistory').destroy({ where: {}, truncate: true, restartIdentity: true } as any);
    await seedLoginHistory();
  });

  afterEach(async () => {
    await app.destroy();
  });

  it('returns all login history with pagination when no filters applied', async () => {
    await app
      .request()
      .get('/login_history?offset=0&limit=10')
      .set(authHeader())
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toHaveLength(4);
        expect(body.meta.count).toBe(4);
        expect(body.meta.offset).toBe(0);
        expect(body.meta.limit).toBe(10);
      });
  });

  it('respects limit parameter for pagination', async () => {
    await app
      .request()
      .get('/login_history?offset=0&limit=2')
      .set(authHeader())
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toHaveLength(2);
        expect(body.meta.count).toBe(4);
        expect(body.meta.limit).toBe(2);
      });
  });

  it('respects offset parameter for pagination', async () => {
    await app
      .request()
      .get('/login_history?offset=2&limit=2')
      .set(authHeader())
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toHaveLength(2);
        expect(body.meta.offset).toBe(2);
      });
  });

  it('applies filter[user_id] from bracket notation query', async () => {
    await app
      .request()
      .get('/login_history?offset=0&limit=10&filter%5Buser_id%5D=user-1')
      .set(authHeader())
      .expect(200)
      .expect(({ body }) => {
        expect(body.meta.count).toBe(2);
        expect(body.data).toHaveLength(2);
        expect(body.data.every((row: any) => row.user_id === 'user-1')).toBe(true);
      });
  });

  it('applies filter[user_name] substring filter from bracket notation query', async () => {
    await app
      .request()
      .get('/login_history?offset=0&limit=10&filter%5Buser_name%5D=John')
      .set(authHeader())
      .expect(200)
      .expect(({ body }) => {
        expect(body.meta.count).toBe(2);
        expect(body.data).toHaveLength(2);
        expect(body.data.every((row: any) => row.user_name.includes('John'))).toBe(true);
      });
  });

  it('applies filter[action_type] from bracket notation query', async () => {
    await app
      .request()
      .get('/login_history?offset=0&limit=10&filter%5Baction_type%5D=login')
      .set(authHeader())
      .expect(200)
      .expect(({ body }) => {
        expect(body.meta.count).toBe(4);
        expect(body.data).toHaveLength(4);
        expect(body.data.every((row: any) => row.action_type === 'login')).toBe(true);
      });
  });

  it('applies filter[client_id] from bracket notation query', async () => {
    await app
      .request()
      .get('/login_history?offset=0&limit=10&filter%5Bclient_id%5D=liquio-portal')
      .set(authHeader())
      .expect(200)
      .expect(({ body }) => {
        expect(body.meta.count).toBe(3);
        expect(body.data).toHaveLength(3);
        expect(body.data.every((row: any) => row.client_id === 'liquio-portal')).toBe(true);
      });
  });

  it('applies filter[is_blocked] from bracket notation query', async () => {
    await app
      .request()
      .get('/login_history?offset=0&limit=10&filter%5Bis_blocked%5D=true')
      .set(authHeader())
      .expect(200)
      .expect(({ body }) => {
        expect(body.meta.count).toBe(1);
        expect(body.data).toHaveLength(1);
        expect(body.data[0].is_blocked).toBe(true);
        expect(body.data[0].user_id).toBe('user-3');
      });
  });

  it('applies created_at range filters from bracket notation query', async () => {
    await app
      .request()
      .get(
        '/login_history?offset=0&limit=10&filter%5Bcreated_at_from%5D=2026-05-20T10%3A30%3A00.000Z&filter%5Bcreated_at_to%5D=2026-05-20T11%3A30%3A00.000Z',
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
      .get('/login_history?offset=0&limit=10&filter%5Buser_id%5D=user-1&filter%5Bclient_id%5D=liquio-portal')
      .set(authHeader())
      .expect(200)
      .expect(({ body }) => {
        expect(body.meta.count).toBe(1);
        expect(body.data).toHaveLength(1);
        expect(body.data[0].id).toBe('11111111-1111-1111-1111-111111111111');
      });
  });

  describe('Invalid filter handling', () => {
    it('rejects filter[search] as invalid parameter (code 100011)', async () => {
      await app
        .request()
        .get('/login_history?offset=0&limit=10&filter%5Bsearch%5D=test')
        .set(authHeader())
        .expect(400)
        .expect(({ body }) => {
          expect(body.message).toBe('Validation error.');
          expect(body.code).toBe(100011);
          expect(body.details).toBeDefined();
          expect(body.details).toHaveLength(1);
          expect(body.details[0].path).toBe('filter');
          expect(body.details[0].msg).toContain('Invalid');
        });
    });

    it('rejects unknown filter parameters', async () => {
      await app
        .request()
        .get('/login_history?offset=0&limit=10&filter%5Bunknown_field%5D=value')
        .set(authHeader())
        .expect(400)
        .expect(({ body }) => {
          expect(body.message).toBe('Validation error.');
          expect(body.code).toBe(100011);
        });
    });

    it('accepts empty filter object gracefully', async () => {
      await app
        .request()
        .get('/login_history?offset=0&limit=10&filter=%7B%7D')
        .set(authHeader())
        .expect(200)
        .expect(({ body }) => {
          expect(body.data).toHaveLength(4);
          expect(body.meta.count).toBe(4);
        });
    });
  });

  describe('IP filter with array matching', () => {
    it('applies filter[ip] for IP address matching', async () => {
      await app
        .request()
        .get('/login_history?offset=0&limit=10&filter%5Bip%5D=192.168.1.100')
        .set(authHeader())
        .expect(200)
        .expect(({ body }) => {
          expect(body.meta.count).toBe(2);
          expect(body.data).toHaveLength(2);
          expect(body.data.every((row: any) => row.ip?.includes('192.168.1.100'))).toBe(true);
        });
    });
  });

  describe('User agent filter', () => {
    it('applies filter[user_agent] substring filter', async () => {
      await app
        .request()
        .get('/login_history?offset=0&limit=10&filter%5Buser_agent%5D=Windows')
        .set(authHeader())
        .expect(200)
        .expect(({ body }) => {
          expect(body.meta.count).toBe(2);
          expect(body.data).toHaveLength(2);
          expect(body.data.every((row: any) => row.user_agent?.includes('Windows'))).toBe(true);
        });
    });
  });

  describe('Client ID multiple values filter', () => {
    it('applies filter[client_id] with comma-separated multiple values', async () => {
      await app
        .request()
        .get('/login_history?offset=0&limit=10&filter%5Bclient_id%5D=liquio-portal%2Cexternal-app')
        .set(authHeader())
        .expect(200)
        .expect(({ body }) => {
          expect(body.meta.count).toBe(4);
          expect(body.data).toHaveLength(4);
        });
    });
  });

  describe('Authentication', () => {
    it('requires basic auth to access login history', async () => {
      await app
        .request()
        .get('/login_history?offset=0&limit=10')
        .expect(401);
    });
  });
});
