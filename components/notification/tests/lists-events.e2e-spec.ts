import { TestApp, TEST_AUTH_HEADER } from './test-app';

describe('Lists Controller: events, transports and relations', () => {
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

  afterEach(async () => {
    await TestApp.afterEach();
  });

  const auth = (req: any) => req.set('Authorization', TEST_AUTH_HEADER);

  it('requires Basic auth on every management route', async () => {
    await app.request().get('/transport').expect(401);
    await app.request().post('/transport').send({}).expect(401);
    await app.request().delete('/transport').expect(401);
    await app.request().get('/event').expect(401);
    await app.request().post('/event').send({}).expect(401);
    await app.request().put('/event/1').send({}).expect(401);
    await app.request().delete('/event').expect(401);
    await app.request().put('/eventsAndTransports').send({}).expect(401);
    await app.request().delete('/eventsAndTransports').expect(401);
    await app.request().get('/event/1/users').expect(401);
  });

  describe('transports', () => {
    it('validates, creates, lists and removes a transport', async () => {
      await auth(app.request().post('/transport')).send({}).expect(400);
      await auth(app.request().delete('/transport')).expect(400);

      const created = await auth(app.request().post('/transport')).send({ name: 'e2e-sms', enable: true }).expect(200);
      const communicationId = created.body[0].communication_id;

      const list = await auth(app.request().get('/transport')).expect(200);
      expect(list.body.map((v: any) => v.communication_id)).toContain(communicationId);

      await auth(app.request().delete('/transport')).query({ communication_id: communicationId }).expect(200);
      const after = await auth(app.request().get('/transport')).expect(200);
      expect(after.body.map((v: any) => v.communication_id)).not.toContain(communicationId);
    });
  });

  describe('events, relations and subscribers', () => {
    it('manages an event with a transport relation and lists its subscribers', async () => {
      await auth(app.request().post('/event')).send({}).expect(400);
      await auth(app.request().put('/event/1')).send({}).expect(400);
      await auth(app.request().delete('/event')).expect(400);
      await auth(app.request().put('/eventsAndTransports')).send({}).expect(400);
      await auth(app.request().put('/eventsAndTransports')).send({ event_id: 1 }).expect(400);
      await auth(app.request().delete('/eventsAndTransports')).expect(400);

      const transport = await auth(app.request().post('/transport')).send({ name: 'e2e-email', enable: true }).expect(200);
      const communicationId = transport.body[0].communication_id;

      const event = await auth(app.request().post('/event'))
        .send({ name: 'e2e-event', description: 'd', out_event_id: 1, private: false, enable: true })
        .expect(200);
      const eventId = event.body[0].event_id;

      await auth(app.request().put(`/event/${eventId}`))
        .send({ name: 'e2e-event-renamed' })
        .expect(200);
      const events = await auth(app.request().get('/event')).expect(200);
      expect(events.body.find((v: any) => v.event_id === eventId).name).toBe('e2e-event-renamed');

      const relation = await auth(app.request().put('/eventsAndTransports'))
        .send({ event_id: eventId, transports: [{ communication_id: communicationId, enable: true }] })
        .expect(200);
      const settingId = relation.body[0].setting_id;
      expect(relation.body[0]).toMatchObject({ event_id: eventId, communication_id: communicationId, enable: true });

      const lists = await app.request().get('/eventsAndTransports').expect(200);
      expect(lists.body.find((v: any) => v.event_id === eventId).settings).toHaveLength(1);
      const all = await app.request().get('/eventsAndTransports').query({ show_all: 'true' }).expect(200);
      expect(all.body.length).toBeGreaterThan(0);

      const { UserSubscribesModel } = require('../src/models/user_subscribes');
      await new UserSubscribesModel().UserSubscribes.create({ user_id: 'e2e-subscriber', setting_id: settingId });

      // getUsersByEvent hands a Set to the id-api client, which ignores it, so no id-api call is made and the list is empty.
      const users = await auth(app.request().get(`/event/${eventId}/users`)).expect(200);
      expect(users.body).toEqual([]);

      await auth(app.request().delete('/eventsAndTransports')).query({ setting_id: settingId }).expect(200);
      await auth(app.request().delete('/event')).query({ event_id: eventId }).expect(200);
      await auth(app.request().delete('/transport')).query({ communication_id: communicationId }).expect(200);
    });
  });
});
