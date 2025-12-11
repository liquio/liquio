const { TestApp } = require('./test-app');

describe('EventBusiness - Request type events', () => {
  /**
   * @type {TestApp}
   */
  let app;

  beforeAll(async () => {
    await TestApp.beforeAll();

    app = await TestApp.setup({
      requester: {
        externalService: {
          externalSystem: {
            providerType: 'standard',
            asyncTask: {
              url: 'http://external-system.local',
              authorization: 'Basic dGVzdC11c2VyOnRlc3QtcGFzcw==',
            },
          },
        },
      },
    });

    await app.init();
  });

  afterAll(async () => {
    await TestApp.afterAll(app);
  });

  afterEach(async () => {
    await TestApp.afterEach(app);
  });

  beforeEach(async () => {
    await TestApp.beforeEach(app);
  });

  describe('Request type events with external service', () => {
    it('should send request to external service and store result', async () => {
      // Mock external service API responses
      app
        .nock('http://external-system.local')
        .post('/', {
          workflowId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        })
        .matchHeader('Authorization', 'Basic dGVzdC11c2VyOnRlc3QtcGFzcw==')
        .reply(200, { isSuccess: true });

      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 900001;
      const SCHEDULE_EVENT_TEMPLATE_ID = 900001001;
      const RETRIEVE_EVENT_TEMPLATE_ID = 900001002;
      const SCHEDULE_DOCUMENT_TEMPLATE_ID = 900001001;
      const RETRIEVE_DOCUMENT_TEMPLATE_ID = 900001002;
      const WORKFLOW_ID = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'External System Request Workflow',
        description: 'Workflow for external system async task operations',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create event templates
      await app.model('eventTemplate').bulkCreate([
        {
          id: SCHEDULE_EVENT_TEMPLATE_ID,
          event_type_id: 3, // 'request' type
          name: 'Schedule External Task',
          description: 'Event to schedule external system task',
          json_schema: JSON.stringify({
            sendToExternalService: {
              providerName: 'externalSystem',
              service: 'asyncTask',
              method: 'schedule-async-task',
              taskName: '() => \'process_data\'',
              startDate: '() => \'2025-09-01T00:00:00.000Z\'',
              endDate: '() => \'2025-09-30T23:59:59.999Z\'',
              filters: '() => { return [{ key: \'status\', value: \'active\' }] }',
            },
          }),
          html_template: '',
        },
        {
          id: RETRIEVE_EVENT_TEMPLATE_ID,
          event_type_id: 3, // 'request' type
          name: 'Retrieve External Task Result',
          description: 'Event to retrieve external system task result',
          json_schema: JSON.stringify({
            sendToExternalService: {
              providerName: 'externalSystem',
              service: 'asyncTask',
              method: 'get-task-result',
              taskId: '() => \'task-uuid-1234-5678-90ab-cdef\'',
            },
          }),
          html_template: '',
        },
      ]).catch(TestApp.catch('Failed to create event templates'));

      // Create document templates
      await app.model('documentTemplate').bulkCreate([
        {
          id: SCHEDULE_DOCUMENT_TEMPLATE_ID,
          name: 'Schedule Task Request',
          json_schema: '{"title":"External Task Scheduling","pdfRequired":false}',
          html_template: '<!DOCTYPE html><html><body>Schedule Task</body></html>',
        },
        {
          id: RETRIEVE_DOCUMENT_TEMPLATE_ID,
          name: 'Retrieve Task Result',
          json_schema: '{"title":"External Task Result Retrieval","pdfRequired":false}',
          html_template: '<!DOCTYPE html><html><body>Retrieve Result</body></html>',
        },
      ]).catch(TestApp.catch('Failed to create document templates'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'External System Request Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      // Trigger scheduling event
      const scheduleResult = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: SCHEDULE_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(scheduleResult).toBe(true);

      // Verify scheduling event created correct event record
      {
        const [event] = await app.model('event').findAll({
          where: { event_template_id: SCHEDULE_EVENT_TEMPLATE_ID },
        });
        expect(event).toMatchObject({
          event_template_id: SCHEDULE_EVENT_TEMPLATE_ID,
          event_type_id: 3,
          workflow_id: WORKFLOW_ID,
          created_by: 'system',
          updated_by: 'system',
          data: {
            result: {
              sendToExternalService: {
                sendingResult: {
                  isSuccess: true,
                },
              },
            },
          },
        });
      }
    });

    it('should handle API error when sending request to external service', async () => {
      app.log.clear();
      // Mock external service API to return 400 error for invalid request
      app
        .nock('http://external-system.local')
        .post('/')
        .matchHeader('Authorization', 'Basic dGVzdC11c2VyOnRlc3QtcGFzcw==')
        .reply(400, {
          error: 'Bad Request',
          message: 'Invalid request parameters',
          details: 'taskName is required',
        });

      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 900002;
      const ERROR_EVENT_TEMPLATE_ID = 900002001;
      const ERROR_DOCUMENT_TEMPLATE_ID = 900002001;
      const WORKFLOW_ID = 'b2c3d4e5-f6a5-4b8c-9d0e-1f2a3b4c5d6e';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'External System Error Test Workflow',
        description: 'Workflow for testing external system API errors',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create event template with missing required parameter
      await app.model('eventTemplate').create({
        id: ERROR_EVENT_TEMPLATE_ID,
        event_type_id: 3, // 'request' type
        name: 'Schedule Task Error',
        description: 'Event to test external system API error handling',
        json_schema: JSON.stringify({
          sendToExternalService: {
            providerName: 'externalSystem',
            service: 'asyncTask',
            method: 'schedule-async-task',
            // Missing taskName - will cause 400 error
            startDate: '() => \'2025-09-01T00:00:00.000Z\'',
            endDate: '() => \'2025-09-30T23:59:59.999Z\'',
          },
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create event template'));

      // Create document template
      await app.model('documentTemplate').create({
        id: ERROR_DOCUMENT_TEMPLATE_ID,
        name: 'Error Task Request',
        json_schema: '{"title":"External Task Error Test","pdfRequired":false}',
        html_template: '<!DOCTYPE html><html><body>Error Test</body></html>',
      }).catch(TestApp.catch('Failed to create document template'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'External System Error Test Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      // Trigger scheduling event - this should succeed but no event is created due to error
      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: ERROR_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      // Verify the error was logged
      expect(app.log.logs.find((log) => log.type === 'external-service-error|send-error')).toBeDefined();

      // Verify no event was created due to the API error
      const events = await app.model('event').findAll({
        where: { event_template_id: ERROR_EVENT_TEMPLATE_ID },
      });

      expect(events.length).toBe(0);
    });

    it('should handle API error when retrieving non-existing task result', async () => {
      app.log.clear();
      // Mock external service API to return 404 error for non-existing task
      app
        .nock('http://external-system.local')
        .post('/')
        .matchHeader('Authorization', 'Basic dGVzdC11c2VyOnRlc3QtcGFzcw==')
        .reply(404, {
          error: 'Not Found',
          message: 'Task not found',
          details: 'The requested task ID does not exist or has expired',
        });

      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 900003;
      const RETRIEVE_ERROR_EVENT_TEMPLATE_ID = 900003001;
      const RETRIEVE_ERROR_DOCUMENT_TEMPLATE_ID = 900003001;
      const WORKFLOW_ID = 'c3d4e5f6-a5b8-4c9d-0e1f-2a3b4c5d6e7f';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'External System Retrieve Error Test Workflow',
        description: 'Workflow for testing external system retrieve API errors',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create event template for retrieving non-existing task
      await app.model('eventTemplate').create({
        id: RETRIEVE_ERROR_EVENT_TEMPLATE_ID,
        event_type_id: 3, // 'request' type
        name: 'Retrieve Task Error',
        description: 'Event to test external system retrieve API error handling',
        json_schema: JSON.stringify({
          sendToExternalService: {
            providerName: 'externalSystem',
            service: 'asyncTask',
            method: 'get-task-result',
            taskId: '() => \'non-existing-task-id\'',
          },
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create event template'));

      // Create document template
      await app.model('documentTemplate').create({
        id: RETRIEVE_ERROR_DOCUMENT_TEMPLATE_ID,
        name: 'Retrieve Error Task Result',
        json_schema: '{"title":"External Task Retrieve Error Test","pdfRequired":false}',
        html_template: '<!DOCTYPE html><html><body>Retrieve Error Test</body></html>',
      }).catch(TestApp.catch('Failed to create document template'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'External System Retrieve Error Test Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      // Trigger retrieve event - this should succeed but no event is created due to error
      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: RETRIEVE_ERROR_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      // Verify the error was logged
      expect(app.log.logs.find((log) => log.type === 'external-service-error|send-error')).toBeDefined();

      // Verify no event was created due to the API error
      const events = await app.model('event').findAll({
        where: { event_template_id: RETRIEVE_ERROR_EVENT_TEMPLATE_ID },
      });

      expect(events.length).toBe(0);
    });
  });
});
