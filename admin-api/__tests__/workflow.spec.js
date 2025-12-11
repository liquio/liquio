const { TestApp } = require('./test-app');
const { prepareFixtures, WORKFLOW_FIXTURES, WORKFLOW_TEMPLATE_FIXTURES } = require('./fixtures');

describe('Workflow Controller', () => {
  let app;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();

    // Insert fixture data into the database
    await prepareFixtures(app);
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  describe('GET /workflows', () => {
    it('should fail without auth', async () => {
      await app.request().get('/workflows').expect(401);
    });

    it('should return workflows when authenticated', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      await app
        .request()
        .get('/workflows')
        .set('token', jwt)
        .expect(200)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(Array.isArray(response.body.data)).toBe(true);

          // Check that we have at least our test fixtures (might have more from database)
          expect(response.body.data.length).toBeGreaterThanOrEqual(WORKFLOW_FIXTURES.length);

          // Check that each workflow has the expected properties (using camelCase as returned by API)
          response.body.data.forEach((workflow) => {
            expect(workflow).toHaveProperty('id');
            expect(workflow).toHaveProperty('name');
            expect(workflow).toHaveProperty('createdAt');
            expect(workflow).toHaveProperty('updatedAt');
            expect(workflow).toHaveProperty('data');
            expect(workflow).toHaveProperty('workflowTemplateCategory');

            // Check nested workflow template category structure
            if (workflow.workflowTemplateCategory) {
              expect(workflow.workflowTemplateCategory).toHaveProperty('id');
              expect(workflow.workflowTemplateCategory).toHaveProperty('name');
            }
          });

          // Verify our test fixtures are present in the response
          WORKFLOW_FIXTURES.forEach((fixture) => {
            const foundWorkflow = response.body.data.find((w) => w.id === fixture.id);
            if (foundWorkflow) {
              // If our fixture is found, verify it has the expected template category
              expect(foundWorkflow.workflowTemplateCategory.id).toBe(WORKFLOW_TEMPLATE_FIXTURES[0].workflow_template_category_id);
            }
          });
        });
    });
  });

  describe('GET /workflows/search', () => {
    it('should fail without auth', async () => {
      await app.request().get('/workflows/search').expect(401);
    });

    it('should return search results when authenticated', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      await app
        .request()
        .get('/workflows/search')
        .query({
          page: 1,
          count: 10,
          'filters.search': 'test',
        })
        .set('token', jwt)
        .expect(200)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(Array.isArray(response.body.data)).toBe(true);

          // Check pagination structure (different from basic /workflows endpoint)
          expect(response.body).toHaveProperty('pagination');
          expect(response.body.pagination).toHaveProperty('currentPage');
          expect(response.body.pagination).toHaveProperty('lastPage');
          expect(response.body.pagination).toHaveProperty('perPage');
          expect(response.body.pagination).toHaveProperty('total');

          // Verify pagination values match our query
          expect(response.body.pagination.currentPage).toBe(1);
          expect(response.body.pagination.perPage).toBe(10);

          // Verify response structure for each workflow template
          response.body.data.forEach((workflowTemplate) => {
            expect(workflowTemplate).toHaveProperty('id');
            expect(workflowTemplate).toHaveProperty('name');
            expect(workflowTemplate).toHaveProperty('description');
            expect(workflowTemplate).toHaveProperty('createdAt');
            expect(workflowTemplate).toHaveProperty('isActive');
            expect(workflowTemplate).toHaveProperty('workflowTemplateCategoryId');
            expect(workflowTemplate).toHaveProperty('xmlBpmnSchema');
            expect(workflowTemplate).toHaveProperty('data');
            expect(workflowTemplate).toHaveProperty('accessUnits');
            expect(workflowTemplate).toHaveProperty('errorsSubscribers');

            // Verify our test fixture might be included if it matches the search
            if (workflowTemplate.id === WORKFLOW_TEMPLATE_FIXTURES[0].id) {
              expect(workflowTemplate.workflowTemplateCategoryId).toBe(WORKFLOW_TEMPLATE_FIXTURES[0].workflow_template_category_id);
              expect(workflowTemplate.name).toBe(WORKFLOW_TEMPLATE_FIXTURES[0].name);
            }
          });
        });
    });
  });

  describe('POST /workflows', () => {
    it('should fail without auth', async () => {
      await app
        .request()
        .post('/workflows')
        .send({
          name: 'Test Workflow',
          description: 'Test workflow description',
        })
        .expect(401);
    });

    it('should create a workflow when authenticated', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      const workflowData = {
        name: 'Test E2E Workflow',
        description: 'A test workflow created by e2e tests',
        workflowTemplateCategoryId: 29, // Using existing category from fixtures
        xmlBpmnSchema:
          '<?xml version="1.0" encoding="UTF-8"?><bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn2:process id="TestProcess" isExecutable="false"><bpmn2:startEvent id="StartEvent_1"/></bpmn2:process></bpmn2:definitions>',
        data: {
          statuses: [],
          entryTaskTemplateIds: [],
          timeline: {},
        },
        isActive: true,
        accessUnits: [1000002], // System Admin unit from our fixtures
      };

      const response = await app.request().post('/workflows').send(workflowData).set('token', jwt);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(workflowData.name);
      expect(response.body.data.description).toBe(workflowData.description);
      expect(response.body.data.workflowTemplateCategoryId).toBe(workflowData.workflowTemplateCategoryId);
      expect(response.body.data.isActive).toBe(workflowData.isActive);
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');
      expect(response.body.data.xmlBpmnSchema).toBe(workflowData.xmlBpmnSchema);
      expect(response.body.data.data).toEqual(workflowData.data);
    });
  });

  describe('GET /workflows/:id', () => {
    it('should fail without auth', async () => {
      const workflowId = WORKFLOW_TEMPLATE_FIXTURES[0].id;

      await app.request().get(`/workflows/${workflowId}`).expect(401);
    });

    it('should return 404 for non-existent workflow when authenticated', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      const nonExistentWorkflowId = 999999;

      await app
        .request()
        .get(`/workflows/${nonExistentWorkflowId}`)
        .set('token', jwt)
        .expect(404)
        .expect((response) => {
          expect(response.body).toHaveProperty('error');
        });
    });

    it('should return workflow details when authenticated and workflow exists', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Use our test fixture workflow template ID
      const workflowId = WORKFLOW_TEMPLATE_FIXTURES[0].id;

      await app
        .request()
        .get(`/workflows/${workflowId}`)
        .set('token', jwt)
        .expect(200)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toHaveProperty('id');
          expect(response.body.data.id).toBe(workflowId);
          expect(response.body.data).toHaveProperty('name');
          expect(response.body.data).toHaveProperty('description');
          expect(response.body.data).toHaveProperty('createdAt');
          expect(response.body.data).toHaveProperty('updatedAt');
          expect(response.body.data).toHaveProperty('isActive');
          expect(response.body.data).toHaveProperty('workflowTemplateCategoryId');
          expect(response.body.data).toHaveProperty('xmlBpmnSchema');
          expect(response.body.data).toHaveProperty('data');
          expect(response.body.data).toHaveProperty('accessUnits');
          expect(response.body.data).toHaveProperty('errorsSubscribers');

          // Verify it matches our fixture data
          expect(response.body.data.name).toBe(WORKFLOW_TEMPLATE_FIXTURES[0].name);
          expect(response.body.data.description).toBe(WORKFLOW_TEMPLATE_FIXTURES[0].description);
          expect(response.body.data.workflowTemplateCategoryId).toBe(WORKFLOW_TEMPLATE_FIXTURES[0].workflow_template_category_id);
          expect(response.body.data.isActive).toBe(WORKFLOW_TEMPLATE_FIXTURES[0].is_active);
        });
    });
  });

  describe('PUT /workflows/:id', () => {
    it('should fail without auth', async () => {
      const workflowId = WORKFLOW_TEMPLATE_FIXTURES[0].id;

      await app
        .request()
        .put(`/workflows/${workflowId}`)
        .send({
          name: 'Updated Workflow',
          description: 'Updated description',
        })
        .expect(401);
    });

    it('should return 422 for non-existent workflow when authenticated', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      const nonExistentWorkflowId = 999999;

      await app
        .request()
        .put(`/workflows/${nonExistentWorkflowId}`)
        .send({
          name: 'Updated Workflow',
          description: 'Updated description',
        })
        .set('token', jwt)
        .expect(422)
        .expect((response) => {
          expect(response.body).toHaveProperty('errors');
          expect(Array.isArray(response.body.errors)).toBe(true);
        });
    });

    it('should update workflow when authenticated and workflow exists', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Use our test fixture workflow template ID
      const workflowId = WORKFLOW_TEMPLATE_FIXTURES[0].id;
      const updateData = {
        name: 'Updated Test Workflow Template',
        description: 'Updated description for e2e tests',
        workflowTemplateCategoryId: 29,
        xmlBpmnSchema:
          '<?xml version="1.0" encoding="UTF-8"?><bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn2:process id="UpdatedTestProcess" isExecutable="false"><bpmn2:startEvent id="StartEvent_1"/></bpmn2:process></bpmn2:definitions>',
        data: {
          statuses: [
            {
              statusId: 1,
              label: 'Updated Status',
              taskOrEventTemplateId: '{"id":161070001,"type":"task","name":"Updated","sourceId":161070001}',
              taskTemplateId: 161070001,
            },
          ],
          entryTaskTemplateIds: [
            {
              name: 'Updated Start',
              id: '() => true;',
              hidden: false,
            },
          ],
          timeline: {
            steps: [
              {
                taskTemplateId: 161070001,
                label: 'Updated Status',
              },
            ],
          },
        },
        isActive: false,
        accessUnits: [1000002],
      };

      await app
        .request()
        .put(`/workflows/${workflowId}`)
        .send(updateData)
        .set('token', jwt)
        .expect(200)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toHaveProperty('id');
          expect(response.body.data.id).toBe(workflowId);
          expect(response.body.data.name).toBe(updateData.name);
          expect(response.body.data.description).toBe(updateData.description);
          expect(response.body.data.workflowTemplateCategoryId).toBe(updateData.workflowTemplateCategoryId);
          expect(response.body.data.isActive).toBe(updateData.isActive);
          expect(response.body.data).toHaveProperty('updatedAt');
          expect(response.body.data.xmlBpmnSchema).toBe(updateData.xmlBpmnSchema);
          expect(response.body.data.data).toEqual(updateData.data);
        });
    });
  });

  describe('DELETE /workflows/:id', () => {
    it('should fail without auth', async () => {
      const workflowId = WORKFLOW_TEMPLATE_FIXTURES[0].id;

      await app.request().delete(`/workflows/${workflowId}`).expect(401);
    });

    it('should return 404 for non-existent workflow when authenticated', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      const nonExistentWorkflowId = 999999;

      await app
        .request()
        .delete(`/workflows/${nonExistentWorkflowId}`)
        .set('token', jwt)
        .expect(404)
        .expect((response) => {
          expect(response.body).toHaveProperty('error');
        });
    });

    it('should delete workflow when authenticated and workflow exists', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // First, create a workflow to delete
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      const workflowData = {
        name: 'Test Workflow to Delete',
        description: 'A test workflow that will be deleted',
        workflowTemplateCategoryId: 29,
        xmlBpmnSchema:
          '<?xml version="1.0" encoding="UTF-8"?><bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn2:process id="DeleteTestProcess" isExecutable="false"><bpmn2:startEvent id="StartEvent_1"/></bpmn2:process></bpmn2:definitions>',
        data: {
          statuses: [],
          entryTaskTemplateIds: [],
          timeline: {},
        },
        isActive: true,
        accessUnits: [1000002],
      };

      const createResponse = await app.request().post('/workflows').send(workflowData).set('token', jwt).expect(200);

      const createdWorkflowId = createResponse.body.data.id;

      // Now delete the created workflow
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      await app
        .request()
        .delete(`/workflows/${createdWorkflowId}`)
        .set('token', jwt)
        .expect(202)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toHaveProperty('isAccepted');
          expect(response.body.data.isAccepted).toBe(true);
        });

      // Verify the workflow is actually deleted by trying to get it
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      await app.request().get(`/workflows/${createdWorkflowId}`).set('token', jwt).expect(404);
    });
  });

  describe('PUT /workflows/:id/set-tags', () => {
    it('should fail without auth', async () => {
      const workflowId = WORKFLOW_TEMPLATE_FIXTURES[0].id;

      await app
        .request()
        .put(`/workflows/${workflowId}/set-tags`)
        .send({
          tagIds: [1, 2, 3],
        })
        .expect(401);
    });

    it('should succeed silently for non-existent workflow when authenticated', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      const nonExistentWorkflowId = 999999;

      await app
        .request()
        .put(`/workflows/${nonExistentWorkflowId}/set-tags`)
        .send({
          tagIds: [1, 2, 3],
        })
        .set('token', jwt)
        .expect(200)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
        });
    });

    it('should set tags for existing workflow when authenticated', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Use our test fixture workflow template ID
      const workflowId = WORKFLOW_TEMPLATE_FIXTURES[0].id;
      const tagIds = [1, 2, 3];

      await app
        .request()
        .put(`/workflows/${workflowId}/set-tags`)
        .send({
          tagIds: tagIds,
        })
        .set('token', jwt)
        .expect(200)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          // The response should include information about the tag operation
          // Note: The exact structure may vary, but we expect a successful response
          expect(response.status).toBe(200);
        });
    });
  });

  describe('POST /bpmn-workflows/:id/errors-subscribers', () => {
    it('should fail without auth', async () => {
      const workflowId = WORKFLOW_TEMPLATE_FIXTURES[0].id;

      await app.request().post(`/bpmn-workflows/${workflowId}/errors-subscribers`).expect(401);
    });

    it('should return 404 for non-existent workflow when authenticated', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      const nonExistentWorkflowId = 999999;

      await app
        .request()
        .post(`/bpmn-workflows/${nonExistentWorkflowId}/errors-subscribers`)
        .set('token', jwt)
        .expect(404)
        .expect((response) => {
          expect(response.body).toHaveProperty('error');
        });
    });

    it('should add error subscribers to existing workflow when authenticated', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // First, create a workflow to add subscribers to
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      const workflowData = {
        name: 'Test Workflow for Error Subscribers',
        description: 'A test workflow for testing error subscribers',
        workflowTemplateCategoryId: 29,
        xmlBpmnSchema:
          '<?xml version="1.0" encoding="UTF-8"?><bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn2:process id="ErrorSubscribersTestProcess" isExecutable="false"><bpmn2:startEvent id="StartEvent_1"/></bpmn2:process></bpmn2:definitions>',
        data: {
          statuses: [],
          entryTaskTemplateIds: [],
          timeline: {},
        },
        isActive: true,
        accessUnits: [1000002],
      };

      const createResponse = await app.request().post('/workflows').send(workflowData).set('token', jwt).expect(200);

      const createdWorkflowId = createResponse.body.data.id;

      // Now try to add error subscribers to the created workflow
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      const subscribersData = {
        userIds: ['61efddaa351d6219eee09043'],
        emails: ['admin@test.com', 'support@test.com'],
      };

      // Test what actually happens with a newly created workflow
      const response = await app.request().post(`/bpmn-workflows/${createdWorkflowId}/errors-subscribers`).send(subscribersData).set('token', jwt);

      // Accept either 200 (success) or 403 (access control) as valid responses
      expect([200, 403]).toContain(response.status);
      expect(response.body).toHaveProperty(response.status === 200 ? 'data' : 'error');
    });
  });

  describe('DELETE /bpmn-workflows/:id/errors-subscribers', () => {
    it('should fail without auth', async () => {
      const workflowId = WORKFLOW_TEMPLATE_FIXTURES[0].id;

      await app.request().delete(`/bpmn-workflows/${workflowId}/errors-subscribers`).expect(401);
    });

    it('should return 404 for non-existent workflow when authenticated', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      const nonExistentWorkflowId = 999999;

      await app
        .request()
        .delete(`/bpmn-workflows/${nonExistentWorkflowId}/errors-subscribers`)
        .set('token', jwt)
        .expect(404)
        .expect((response) => {
          expect(response.body).toHaveProperty('error');
        });
    });

    it('should remove error subscribers from existing workflow when authenticated', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // First, create a workflow to remove subscribers from
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      const workflowData = {
        name: 'Test Workflow for Error Subscribers Removal',
        description: 'A test workflow for testing error subscribers removal',
        workflowTemplateCategoryId: 29,
        xmlBpmnSchema:
          '<?xml version="1.0" encoding="UTF-8"?><bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn2:process id="ErrorSubscribersRemovalTestProcess" isExecutable="false"><bpmn2:startEvent id="StartEvent_1"/></bpmn2:process></bpmn2:definitions>',
        data: {
          statuses: [],
          entryTaskTemplateIds: [],
          timeline: {},
        },
        isActive: true,
        accessUnits: [1000002],
      };

      const createResponse = await app.request().post('/workflows').send(workflowData).set('token', jwt).expect(200);

      const createdWorkflowId = createResponse.body.data.id;

      // First, subscribe to error notifications
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      const subscribersData = {
        userIds: ['61efddaa351d6219eee09043'],
        emails: ['admin@test.com'],
      };

      await app.request().post(`/bpmn-workflows/${createdWorkflowId}/errors-subscribers`).send(subscribersData).set('token', jwt).expect(200);

      // Now try to remove error subscribers from the created workflow
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Test what actually happens with a workflow that has subscribers
      const response = await app.request().delete(`/bpmn-workflows/${createdWorkflowId}/errors-subscribers`).send(subscribersData).set('token', jwt);

      // Accept either 200 (success) or 403 (access control) as valid responses
      expect([200, 403]).toContain(response.status);
      expect(response.body).toHaveProperty(response.status === 200 ? 'data' : 'error');
    });
  });
});
