// Import.
import { TestApp, config } from './test_app';

describe('TemplatesController', () => {
  let app: TestApp;
  const token = 'persist-link-template-token';

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
  });

  afterEach(async () => {
    if (app) {
      await app.destroy();
    }
  });

  it('should reject templates endpoints without token', async () => {
    app = await TestApp.setup();

    const response = await app.request().get('/templates').expect(401);
    expect(response.body).toEqual({
      error: {
        message: 'Incorrect basic auth token.',
      },
    });
  });

  it('should perform full templates CRUD flow', async () => {
    app = await TestApp.setup();

    const createPayload = {
      name: 'invoice-template',
      method: 'getRecord',
      html: '<h1>{{record.number}}</h1>',
      pdf: '<h1>PDF {{record.number}}</h1>',
      jsonMap: {
        number: 'number',
      },
      options: {
        pdfOptions: {
          format: 'A4',
        },
      },
    };

    // Create.
    const createResponse = await app.request().post('/templates').set('token', token).send(createPayload).expect(200);

    expect(createResponse.body).toEqual({
      data: {
        id: expect.any(Number),
        name: createPayload.name,
        method: createPayload.method,
        html: createPayload.html,
        pdf: createPayload.pdf,
        jsonMap: createPayload.jsonMap,
        options: createPayload.options,
      },
    });

    const templateId = createResponse.body.data.id;

    // Read all.
    const listResponse = await app.request().get('/templates').set('token', token).expect(200);
    expect(listResponse.body).toEqual({
      data: expect.arrayContaining([
        {
          id: templateId,
          name: createPayload.name,
          method: createPayload.method,
        },
      ]),
    });

    // Read by id.
    const getResponse = await app.request().get(`/templates/${templateId}`).set('token', token).expect(200);
    expect(getResponse.body).toEqual({
      data: {
        id: templateId,
        name: createPayload.name,
        method: createPayload.method,
        html: createPayload.html,
        pdf: createPayload.pdf,
        jsonMap: createPayload.jsonMap,
        options: createPayload.options,
      },
    });

    // Update.
    const updatePayload = {
      ...createPayload,
      name: 'invoice-template-updated',
      html: '<h1>UPDATED {{record.number}}</h1>',
    };

    const updateResponse = await app.request().put(`/templates/${templateId}`).set('token', token).send(updatePayload).expect(200);

    expect(updateResponse.body).toEqual({
      data: {
        id: templateId,
        name: updatePayload.name,
        method: updatePayload.method,
        html: updatePayload.html,
        pdf: updatePayload.pdf,
        jsonMap: updatePayload.jsonMap,
        options: updatePayload.options,
      },
    });

    // Delete.
    const deleteResponse = await app.request().delete(`/templates/${templateId}`).set('token', token).expect(200);
    expect(deleteResponse.body).toEqual({ data: {} });

    // Verify deletion.
    const getDeletedResponse = await app.request().get(`/templates/${templateId}`).set('token', token).expect(200);
    expect(getDeletedResponse.body).toEqual({ data: {} });
  });
});
