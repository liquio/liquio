import { TestApp } from './test-app';

const AUTH_HEADER = 'Basic dGVzdDE6dGVzdA==';

describe('Containers Controller', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  describe('GET /containers', () => {
    it('should require auth', async () => {
      await app.request().get('/containers').expect(401);
    });

    it('should return the seeded default container', async () => {
      const response = await app.request().get('/containers').set('Authorization', AUTH_HEADER).expect(200);

      expect(response.body.data.some((container) => container.id === 1 && container.name === 'default')).toBe(true);
    });
  });

  describe('POST /containers', () => {
    it('should create a container', async () => {
      const response = await app
        .request()
        .post('/containers')
        .set('Authorization', AUTH_HEADER)
        .send({ name: 'test-container', description: 'A test container', meta: { foo: 'bar' } })
        .expect(200);

      expect(response.body.data).toMatchObject({ name: 'test-container', description: 'A test container' });
      expect(response.body.data.id).toBeDefined();
    });
  });

  describe('GET /containers/:id', () => {
    it('should return 404 for an unknown id', async () => {
      await app.request().get('/containers/999999').set('Authorization', AUTH_HEADER).expect(404);
    });

    it('should find a container by id', async () => {
      const {
        body: {
          data: { id },
        },
      } = await app.request().post('/containers').set('Authorization', AUTH_HEADER).send({ name: 'find-me' }).expect(200);

      const response = await app.request().get(`/containers/${id}`).set('Authorization', AUTH_HEADER).expect(200);

      expect(response.body.data).toMatchObject({ id, name: 'find-me' });
    });
  });

  describe('PUT /containers/:id', () => {
    it('should update a container', async () => {
      const {
        body: {
          data: { id },
        },
      } = await app.request().post('/containers').set('Authorization', AUTH_HEADER).send({ name: 'before-update' }).expect(200);

      const response = await app
        .request()
        .put(`/containers/${id}`)
        .set('Authorization', AUTH_HEADER)
        .send({ name: 'after-update' })
        .expect(200);

      expect(response.body.data).toMatchObject({ id, name: 'after-update' });
    });
  });

  describe('DELETE /containers/:id', () => {
    it('should delete a container', async () => {
      const {
        body: {
          data: { id },
        },
      } = await app.request().post('/containers').set('Authorization', AUTH_HEADER).send({ name: 'to-delete' }).expect(200);

      await app.request().delete(`/containers/${id}`).set('Authorization', AUTH_HEADER).expect(200);
      await app.request().get(`/containers/${id}`).set('Authorization', AUTH_HEADER).expect(404);
    });
  });
});
