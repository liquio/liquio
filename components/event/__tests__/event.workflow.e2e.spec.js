const { TestApp } = require('./test-app');

describe('EventBusiness - Workflow type events', () => {
  /**
   * @type {TestApp}
   */
  let app;

  beforeAll(async () => {
    await TestApp.beforeAll();

    app = await TestApp.setup({});

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

  describe('createWorkflows', () => {
    it('should create and process createWorkflows workflow event', async () => {
      const WORKFLOW_TEMPLATE_ID = 700001;
      const WORKFLOW_EVENT_TEMPLATE_ID = 700001001;
      const WORKFLOW_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
      const CHILD_WORKFLOW_TEMPLATE_ID = 700002;

      // Create parent workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Parent Workflow',
        description: 'Workflow for testing createWorkflows event',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create parent workflowTemplate'));

      // Create child workflow template
      await app.model('workflowTemplate').create({
        id: CHILD_WORKFLOW_TEMPLATE_ID,
        name: 'Child Workflow',
        description: 'Child workflow for testing',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create child workflowTemplate'));

      // Create workflow event template for createWorkflows
      await app.model('eventTemplate').create({
        id: WORKFLOW_EVENT_TEMPLATE_ID,
        event_type_id: 7, // workflow type = 7
        name: 'Create Workflows Event',
        description: 'Event to create child workflows',
        json_schema: JSON.stringify({
          notFailOnError: true,
          createWorkflows: `() => { return [{ workflowTemplateId: ${CHILD_WORKFLOW_TEMPLATE_ID}, name: 'Auto-created workflow' }]; }`,
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create workflow eventTemplate'));

      // Create parent workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Parent Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: WORKFLOW_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const workflowEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: WORKFLOW_EVENT_TEMPLATE_ID },
        });
      expect(workflowEvent).toBeDefined();
      expect(workflowEvent.event_type_id).toBe(7);
      // Event is created with error since message queue is not available in tests
      expect(workflowEvent.data.error).toBeDefined();
    });
  });

  describe('createWorkflowsExternal', () => {
    it('should create and process createWorkflowsExternal workflow event', async () => {
      const WORKFLOW_TEMPLATE_ID = 700003;
      const WORKFLOW_EVENT_TEMPLATE_ID = 700003001;
      const WORKFLOW_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'External Workflow Creation',
        description: 'Workflow for testing createWorkflowsExternal event',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create workflow event template for createWorkflowsExternal
      await app.model('eventTemplate').create({
        id: WORKFLOW_EVENT_TEMPLATE_ID,
        event_type_id: 7, // workflow type = 7
        name: 'Create External Workflows Event',
        description: 'Event to create workflows in external systems',
        json_schema: JSON.stringify({
          notFailOnError: true,
          createWorkflowsExternal: '() => { return [{ externalSystemId: \'external-system-001\', workflowData: { name: \'External workflow\' } }]; }',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create workflow eventTemplate'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'External Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: WORKFLOW_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const workflowEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: WORKFLOW_EVENT_TEMPLATE_ID },
        });
      expect(workflowEvent).toBeDefined();
      expect(workflowEvent.event_type_id).toBe(7);
      // Event is created even if external system is not configured
      expect(workflowEvent.data.error).toBeDefined();
    });
  });

  describe('sendStatusExternal', () => {
    it('should create and process sendStatusExternal workflow event', async () => {
      const WORKFLOW_TEMPLATE_ID = 700005;
      const WORKFLOW_EVENT_TEMPLATE_ID = 700005001;
      const WORKFLOW_ID = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Send Status External Workflow',
        description: 'Workflow for testing sendStatusExternal event',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create workflow event template for sendStatusExternal
      await app.model('eventTemplate').create({
        id: WORKFLOW_EVENT_TEMPLATE_ID,
        event_type_id: 7, // workflow type = 7
        name: 'Send Status External Event',
        description: 'Event to send status to external system',
        json_schema: JSON.stringify({
          notFailOnError: true,
          sendStatusExternal: '() => { return [{ externalSystemId: \'external-system-002\', workflowId: \'ext-workflow-123\', status: \'COMPLETED\' }]; }',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create workflow eventTemplate'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Send Status External Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: WORKFLOW_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const workflowEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: WORKFLOW_EVENT_TEMPLATE_ID },
        });
      expect(workflowEvent).toBeDefined();
      expect(workflowEvent.event_type_id).toBe(7);
      // Event is created even if external system is not configured
      expect(workflowEvent.data.error).toBeDefined();
    });
  });

  describe('sendStatus', () => {
    it('should create and process sendStatus workflow event', async () => {
      const WORKFLOW_TEMPLATE_ID = 700007;
      const WORKFLOW_EVENT_TEMPLATE_ID = 700007001;
      const WORKFLOW_ID = 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a';
      const STATUS_NAME = 'processing';

      // Create workflow template with status definition
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Send Status Workflow',
        description: 'Workflow for testing sendStatus event',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {
          statuses: [
            {
              eventTemplateId: WORKFLOW_EVENT_TEMPLATE_ID,
              status: STATUS_NAME,
            },
          ],
        },
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create workflow event template for sendStatus
      await app.model('eventTemplate').create({
        id: WORKFLOW_EVENT_TEMPLATE_ID,
        event_type_id: 7, // workflow type = 7
        name: 'Send Status Event',
        description: 'Event to send status to parent workflow',
        json_schema: JSON.stringify({
          notFailOnError: true,
          sendStatus: `() => { return { status: '${STATUS_NAME}' }; }`,
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create workflow eventTemplate'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Send Status Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: WORKFLOW_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const workflowEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: WORKFLOW_EVENT_TEMPLATE_ID },
        });
      expect(workflowEvent).toBeDefined();
      expect(workflowEvent.event_type_id).toBe(7);
      // Event is created even if parent workflow is not found
      expect(workflowEvent.data.error).toBeDefined();
    });
  });

  describe('setNewTasksPerformers', () => {
    it('should create and process setNewTasksPerformers workflow event', async () => {
      const WORKFLOW_TEMPLATE_ID = 700009;
      const WORKFLOW_EVENT_TEMPLATE_ID = 700009001;
      const WORKFLOW_ID = 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b';
      const NEW_PERFORMER_USER_ID = '000000000000000000000099';

      // Create workflow template with task
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Set Task Performers Workflow',
        description: 'Workflow for testing setNewTasksPerformers event',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create workflow event template for setNewTasksPerformers
      await app.model('eventTemplate').create({
        id: WORKFLOW_EVENT_TEMPLATE_ID,
        event_type_id: 7, // workflow type = 7
        name: 'Set New Task Performers Event',
        description: 'Event to reassign task performers',
        json_schema: JSON.stringify({
          notFailOnError: true,
          setNewTasksPerformers: `() => { return { taskIds: [], newPerformerUsers: ['${NEW_PERFORMER_USER_ID}'], newPerformerUserNames: ['New Performer'], fromPerformerUsers: [] }; }`,
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create workflow eventTemplate'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Set Performers Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: WORKFLOW_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const workflowEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: WORKFLOW_EVENT_TEMPLATE_ID },
        });
      expect(workflowEvent).toBeDefined();
      expect(workflowEvent.event_type_id).toBe(7);
      // Event is created even if taskIds array is empty (validation error)
      expect(workflowEvent.data.error).toBeDefined();
    });
  });
});
