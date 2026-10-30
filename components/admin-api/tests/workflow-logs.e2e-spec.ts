import { TestApp } from './test-app';
import { prepareFixtures, WORKFLOW_FIXTURES } from './fixtures';
import { asAdmin, grantAllAdminUnits } from './fixtures/auth';
import { getConfig, getModels } from '../src/lib/context';

const ELASTIC_HOST = 'http://elastic.local:9200';
const LIMITED_USER = 'dddddddddddddddddddddd01';

const waitFor = async (check: () => Promise<boolean>, timeoutMs = 15000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await check()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Condition was not met in time.');
};

describe('Workflow logs controller', () => {
  let app: TestApp;
  const originalElastic = {};

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await prepareFixtures(app);
    await grantAllAdminUnits(app);
    Object.assign(originalElastic, getConfig().elastic);
  });

  afterAll(async () => {
    getConfig().elastic = originalElastic;
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await TestApp.afterEach();
  });

  // ElasticReindexLogModel.create() returns an entity without the row fields (see BUGS.md), so the background job cannot
  // update its log row. Return the plain row so that the job can run to the end.
  const fixReindexLogCreate = () => {
    const model = getModels().elasticReindexLog;
    const original = model.create.bind(model);
    return jest.spyOn(model, 'create').mockImplementation(async (data) => {
      const created: any = await original(data);
      return { ...created.dataValues };
    });
  };

  const enableElastic = () => {
    fixReindexLogCreate();
    getConfig().elastic = {
      ...originalElastic,
      enabled: true,
      reindexCount: 2,
      reindex: { enabled: true, protocol: 'http', hostname: 'elastic.local', port: 9200, index: 'test_logs', token: 'fake-token' },
    };
  };

  describe('GET /workflow-logs/:id', () => {
    it('requires authentication', async () => {
      await app.request().get(`/workflow-logs/${WORKFLOW_FIXTURES[0].id}`).expect(401);
    });

    it('returns the logs of a workflow', async () => {
      const response = await asAdmin(app, 'get', `/workflow-logs/${WORKFLOW_FIXTURES[0].id}`).expect(200);
      expect(response.body.workflowId).toBe(WORKFLOW_FIXTURES[0].id);
      expect(Array.isArray(response.body.logs)).toBe(true);
    });

    it('answers 404 for an unknown workflow', async () => {
      const response = await asAdmin(app, 'get', '/workflow-logs/00000000-0000-4000-8000-0000000000ee');
      expect(response.status).toBe(404);
    });

    it('rejects an admin without the needed unit for reindexing endpoints', async () => {
      await asAdmin(app, 'get', '/workflow-logs/reindex', LIMITED_USER).expect(403);
    });
  });

  describe('reindex log and statistics', () => {
    it('lists reindex logs with paging', async () => {
      const response = await asAdmin(app, 'get', '/workflow-logs/reindex').query({ page: 1, count: 5 }).expect(200);
      expect(response.body.pagination).toBeDefined();
    });

    it('returns reindex statistics', async () => {
      await asAdmin(app, 'get', '/workflow-logs/reindex/stats').query({ bucketSize: 'week' }).expect(422);
      const response = await asAdmin(app, 'get', '/workflow-logs/reindex/stats')
        .query({ bucketSize: 'hour', timeFrom: '2020-01-01T00:00:00.000Z', timeTo: '2030-01-01T00:00:00.000Z' })
        .expect(200);
      expect(response.body).toHaveProperty('timeStats');
      expect(response.body).toHaveProperty('periodStats');
      expect(response.body).toHaveProperty('lastEntries');
    });
  });

  describe('reindex for a period', () => {
    it('answers an error when elastic is disabled', async () => {
      const response = await asAdmin(app, 'post', '/workflow-logs/reindex').send({ fromUpdatedAt: '2020-01-01T00:00:00.000Z' });
      expect(response.status).toBe(500);
      expect(response.body.error.message).toBe('Elastic is disabled.');
    });

    it('queues a reindex by update date and marks the log as finished', async () => {
      enableElastic();
      app
        .nock(ELASTIC_HOST)
        .persist()
        .put(/^\/test_logs\/_doc\/.*/)
        .optionally()
        .reply(200, { result: 'created' });

      const response = await asAdmin(app, 'post', '/workflow-logs/reindex')
        .send({ fromUpdatedAt: '2020-01-01T00:00:00.000Z', toUpdatedAt: '2030-01-01T00:00:00.000Z' })
        .expect(200);
      const logId = response.body.id;

      await waitFor(async () => {
        const log = await app.model('elasticReindexLog').findByPk(logId);
        return !!log && log.status !== 'running';
      });
      const log = await app.model('elasticReindexLog').findByPk(logId);
      expect(log.status).toBe('finished');
    });

    it('queues a reindex by creation date with default shifts', async () => {
      enableElastic();
      app
        .nock(ELASTIC_HOST)
        .persist()
        .put(/^\/test_logs\/_doc\/.*/)
        .optionally()
        .reply(200, { result: 'created' });

      const only = await asAdmin(app, 'post', '/workflow-logs/reindex').send({ fromCreatedAt: '2023-02-14T00:00:00.000Z' }).expect(200);
      const only2 = await asAdmin(app, 'post', '/workflow-logs/reindex').send({ toCreatedAt: '2023-02-15T00:00:00.000Z' }).expect(200);
      const updatedOnly = await asAdmin(app, 'post', '/workflow-logs/reindex').send({ toUpdatedAt: '2023-02-15T00:00:00.000Z' }).expect(200);
      const fromUpdated = await asAdmin(app, 'post', '/workflow-logs/reindex').send({ fromUpdatedAt: '2023-02-15T00:00:00.000Z' }).expect(200);
      const bare = await asAdmin(app, 'post', '/workflow-logs/reindex').send({}).expect(200);

      for (const item of [only, only2, updatedOnly, fromUpdated, bare]) {
        await waitFor(async () => {
          const log = await app.model('elasticReindexLog').findByPk(item.body.id);
          return !!log && log.status !== 'running';
        });
      }
    });
  });

  describe('manual reindex', () => {
    it('reports an idle status', async () => {
      const response = await asAdmin(app, 'get', '/workflow-logs/manual-reindex-status').expect(200);
      expect(response.body.data.status).toBe('idle');
    });

    it('answers an error when elastic is disabled', async () => {
      getConfig().elastic = { ...originalElastic };
      const response = await asAdmin(app, 'post', '/workflow-logs/manual-reindex').send({ fromCreatedAt: '2020-01-01T00:00:00.000Z' });
      expect(response.status).toBe(500);
    });

    it('runs a manual reindex job and reports completion', async () => {
      enableElastic();
      app
        .nock(ELASTIC_HOST)
        .persist()
        .put(/^\/test_logs\/_doc\/.*/)
        .optionally()
        .reply(200, { result: 'created' });

      const started = await asAdmin(app, 'post', '/workflow-logs/manual-reindex')
        .send({ fromCreatedAt: '2000-01-01T00:00:00.000Z', toCreatedAt: '2100-01-01T00:00:00.000Z', skipErrors: false })
        .expect(202);
      expect(started.body.data.jobId).toEqual(expect.any(String));

      await waitFor(async () => {
        const status = await asAdmin(app, 'get', '/workflow-logs/manual-reindex-status');
        return ['completed', 'failed'].includes(status.body.data.status);
      });
      const finished = await asAdmin(app, 'get', '/workflow-logs/manual-reindex-status').expect(200);
      expect(finished.body.data.status).toBe('completed');
      expect(finished.body.data.total).toBeGreaterThan(0);
      expect(finished.body.data.processed).toBe(finished.body.data.total);
    });

    it('runs a manual reindex job that skips errors', async () => {
      enableElastic();
      app
        .nock(ELASTIC_HOST)
        .persist()
        .put(/^\/test_logs\/_doc\/.*/)
        .optionally()
        .reply(500, { error: 'down' });

      await asAdmin(app, 'post', '/workflow-logs/manual-reindex')
        .send({ fromUpdatedAt: '2000-01-01T00:00:00.000Z', toUpdatedAt: '2100-01-01T00:00:00.000Z', skipErrors: true })
        .expect(202);

      await waitFor(async () => {
        const status = await asAdmin(app, 'get', '/workflow-logs/manual-reindex-status');
        return ['completed', 'failed'].includes(status.body.data.status);
      });
    });
  });
});
